import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ChunkErrorBoundary from '../ChunkErrorBoundary'

/**
 * `PRF-10`, edge case da spec: **um chunk que falha ao baixar mostra estado legível, nunca tela
 * branca**.
 *
 * Com as rotas em `React.lazy`, abrir uma página passou a depender de uma requisição. O caso comum
 * não é rede ruim — é **deploy novo com a aba aberta**: os arquivos têm hash no nome, o chunk que a
 * página antiga pede deixou de existir, o `import()` rejeita e o React desmonta a árvore. Sem um
 * limite de erro, o resultado é branco: sem mensagem, sem caminho de volta, e sem nada no que clicar.
 */

const Explode = (): never => {
  throw new Error('Failed to fetch dynamically imported module')
}

let erroDoConsole: ReturnType<typeof vi.spyOn>
let recarregar: ReturnType<typeof vi.fn>

beforeEach(() => {
  // O React sempre repassa o erro ao console; sem o silêncio o relatório do vitest fica ilegível.
  erroDoConsole = vi.spyOn(console, 'error').mockImplementation(() => {})
  recarregar = vi.fn()
  Object.defineProperty(window, 'location', {
    writable: true,
    configurable: true,
    value: { ...window.location, reload: recarregar },
  })
})

afterEach(() => {
  erroDoConsole.mockRestore()
})

describe('ChunkErrorBoundary — caminho normal', () => {
  it('sem falha nenhuma, os filhos passam intactos', () => {
    render(
      <ChunkErrorBoundary>
        <p>a loja</p>
      </ChunkErrorBoundary>,
    )

    expect(screen.getByText('a loja')).toBeInTheDocument()
  })

  it('o limite não desenha nada por conta própria enquanto está tudo bem', () => {
    render(
      <ChunkErrorBoundary>
        <p>a loja</p>
      </ChunkErrorBoundary>,
    )

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('ChunkErrorBoundary — o chunk que não baixa (PRF-10)', () => {
  it('NÃO fica em branco: a cliente lê o que aconteceu', () => {
    render(
      <ChunkErrorBoundary>
        <Explode />
      </ChunkErrorBoundary>,
    )

    expect(
      screen.getByRole('heading', { name: 'Não conseguimos carregar esta página' }),
    ).toBeInTheDocument()
  })

  it('o bloco se anuncia como aviso — quem usa leitor de tela também é avisada', () => {
    render(
      <ChunkErrorBoundary>
        <Explode />
      </ChunkErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('a mensagem diz que o carrinho não se perde, sem urgência fabricada', () => {
    render(
      <ChunkErrorBoundary>
        <Explode />
      </ChunkErrorBoundary>,
    )

    expect(
      screen.getByText(/Recarregar costuma resolver, e nada do seu carrinho se perde\./),
    ).toBeInTheDocument()
  })

  it('o caminho de volta é RECARREGAR, e não repetir o mesmo import morto', () => {
    // Recarregar busca o `index.html` novo, com os hashes novos. Um "tentar de novo" repetiria o
    // `import()` do chunk que já não existe no servidor, e falharia para sempre.
    render(
      <ChunkErrorBoundary>
        <Explode />
      </ChunkErrorBoundary>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Recarregar a página' }))

    expect(recarregar).toHaveBeenCalledTimes(1)
  })

  it('o erro é registrado no console — é o que a dona consegue ler ao reproduzir', () => {
    render(
      <ChunkErrorBoundary>
        <Explode />
      </ChunkErrorBoundary>,
    )

    expect(
      erroDoConsole.mock.calls.some(
        ([primeiro]) => primeiro === 'Falha ao carregar um pedaço da loja',
      ),
    ).toBe(true)
  })
})
