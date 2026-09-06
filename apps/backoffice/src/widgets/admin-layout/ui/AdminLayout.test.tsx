import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminLayout from './AdminLayout'
import { STORAGE_KEY } from '@/widgets/admin-layout/model/navCollapse'

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: { auth: { signOut: vi.fn().mockResolvedValue({ error: null }) } },
}))

const renderEm = (pathname: string) =>
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/admin/*" element={<p>conteúdo</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

/** A lista de grupos que rola — o `<nav>` da sidebar de desktop (a do Sheet só existe aberto). */
const sidebar = () => screen.getAllByRole('navigation')[0]

/** A coluna inteira: a lista de grupos MAIS o rodapé, que é irmão dela e não filho. */
const coluna = () => document.querySelector('aside')!

const cabecalho = (label: string) => within(sidebar()).getByRole('button', { name: new RegExp(label, 'i') })

beforeEach(() => {
  window.localStorage.clear()
})

describe('AdminLayout — os grupos colapsam', () => {
  it('na primeira visita todos os grupos estão abertos', () => {
    // A direção do default, medida na tela e não só no modelo: storage vazio ⇒ tudo visível, que é
    // o comportamento que a sidebar sempre teve.
    renderEm('/admin')

    for (const destino of ['Pedidos', 'Cupons', 'Produtos', 'Home']) {
      expect(within(sidebar()).getByRole('link', { name: destino })).toBeInTheDocument()
    }
    for (const label of ['Vendas', 'Descontos', 'Catálogo', 'Loja']) {
      expect(cabecalho(label)).toHaveAttribute('aria-expanded', 'true')
    }
  })

  it('clicar no cabeçalho esconde os itens daquele grupo, e só deles', () => {
    renderEm('/admin')
    fireEvent.click(cabecalho('Catálogo'))

    expect(within(sidebar()).queryByRole('link', { name: 'Produtos' })).not.toBeInTheDocument()
    expect(within(sidebar()).queryByRole('link', { name: 'Categorias' })).not.toBeInTheDocument()
    expect(cabecalho('Catálogo')).toHaveAttribute('aria-expanded', 'false')

    // Os vizinhos ficam onde estavam.
    expect(within(sidebar()).getByRole('link', { name: 'Pedidos' })).toBeInTheDocument()
    expect(within(sidebar()).getByRole('link', { name: 'Home' })).toBeInTheDocument()
  })

  it('clicar de novo devolve os itens', () => {
    renderEm('/admin')
    fireEvent.click(cabecalho('Loja'))
    expect(within(sidebar()).queryByRole('link', { name: 'Home' })).not.toBeInTheDocument()

    fireEvent.click(cabecalho('Loja'))
    expect(within(sidebar()).getByRole('link', { name: 'Home' })).toBeInTheDocument()
  })

  it('o Dashboard NÃO tem cabeçalho para colapsar', () => {
    renderEm('/admin')
    // Se o grupo sem rótulo virasse colapsável, haveria um quinto botão de disclosure — e o único
    // destino que é sempre o ponto de partida poderia ser escondido sem volta.
    const disclosures = within(sidebar())
      .getAllByRole('button')
      .filter(botao => botao.getAttribute('aria-expanded') !== null)

    expect(disclosures).toHaveLength(4)
    expect(within(sidebar()).getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('o estado sobrevive à remontagem, pelo `localStorage`', () => {
    const { unmount } = renderEm('/admin')
    fireEvent.click(cabecalho('Descontos'))
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toEqual(['Descontos'])
    unmount()

    renderEm('/admin')
    expect(cabecalho('Descontos')).toHaveAttribute('aria-expanded', 'false')
    expect(within(sidebar()).queryByRole('link', { name: 'Cupons' })).not.toBeInTheDocument()
  })

  it('o cabeçalho colapsado AVISA quando a tela atual está lá dentro', () => {
    // Sem o aviso, colapsar `Catálogo` e depois abrir um produto (por um link de dentro do pedido)
    // deixaria a sidebar sem nenhum item marcado — e navegação que não responde "onde estou" lê
    // como quebrada. A alternativa (abrir à força) foi recusada: desfaz a escolha de quem colapsou.
    renderEm('/admin/produtos/abc/editar')
    fireEvent.click(cabecalho('Catálogo'))

    expect(within(cabecalho('Catálogo')).getByText(/a tela atual está neste grupo/i)).toBeInTheDocument()
    // E o aviso não se espalha para quem não tem a tela.
    expect(within(cabecalho('Loja')).queryByText(/a tela atual está neste grupo/i)).not.toBeInTheDocument()
  })

  it('o aviso é TEXTO, e o ponto colorido fica escondido do leitor de tela', () => {
    // Cor sozinha não é informação: o ponto é decoração (`aria-hidden`) e quem carrega a frase é o
    // texto. Sem isso, quem usa leitor de tela ouviria só "Vendas, recolhido".
    renderEm('/admin/pedidos')
    fireEvent.click(cabecalho('Vendas'))

    const header = cabecalho('Vendas')
    expect(header.querySelector('[aria-hidden="true"].rounded-full')).toBeInTheDocument()
    expect(within(header).getByText(/a tela atual está neste grupo/i).className).toContain('sr-only')
  })

  it('grupo ABERTO não recebe o aviso — quem se marca é o item', () => {
    renderEm('/admin/produtos')

    expect(within(cabecalho('Catálogo')).queryByText(/a tela atual está neste grupo/i)).not.toBeInTheDocument()
    // O item ativo é marcado por classe (a borda violeta), não por `aria-current`.
    expect(within(sidebar()).getByRole('link', { name: 'Produtos' }).className).toContain(
      'border-estrelinha-admin-violet',
    )
  })
})

describe('AdminLayout — o rodapé', () => {
  it('Configurações, Ver Loja e Sair estão na coluna', () => {
    renderEm('/admin/produtos')
    expect(within(coluna()).getByRole('link', { name: 'Configurações' })).toBeInTheDocument()
    expect(within(coluna()).getByRole('link', { name: 'Ver Loja' })).toBeInTheDocument()
    expect(within(coluna()).getByRole('button', { name: 'Sair' })).toBeInTheDocument()
  })

  it('o rodapé fica FORA do `<nav>` que rola', () => {
    // É a forma estrutural do conserto: o que rola é a lista de grupos, e o rodapé é irmão dela.
    // Se `Configurações` estivesse dentro do `<nav>`, colapsar grupos deixaria de garantir que ele
    // está à vista — voltaria a depender do quanto a lista cresceu.
    renderEm('/admin')
    expect(within(sidebar()).queryByRole('link', { name: 'Configurações' })).not.toBeInTheDocument()
    expect(within(coluna()).getByRole('link', { name: 'Configurações' })).toBeInTheDocument()
  })
})

/**
 * O que o jsdom NÃO mede.
 *
 * O defeito consertado aqui é de layout: `aside` era um filho de flex sem altura, então esticava
 * até a altura do **documento** — numa listagem de 680 produtos o rodapé ia para o fim da página e
 * "desaparecia". jsdom devolve 0 para toda medida de layout, então nenhum teste de componente
 * encosta nisso. O que dá para travar é a **declaração**, lida do disco.
 */
describe('AdminLayout — a sidebar fixa, lida do fonte', () => {
  const HERE = dirname(fileURLToPath(import.meta.url))
  const fonte = readFileSync(resolve(HERE, 'AdminLayout.tsx'), 'utf8')

  const classesDe = (tag: string): string => {
    const match = fonte.match(new RegExp(`<${tag}\\b[^>]*className="([^"]*)"`))
    return match?.[1] ?? ''
  }

  it('ÂNCORA: a varredura acha os três elementos que ela mede', () => {
    // Sem a âncora, renomear `aside` para outro elemento faria as asserções abaixo passarem sobre
    // string vazia — que é a pior falha possível num teste que lê fonte.
    expect(classesDe('aside')).not.toBe('')
    expect(classesDe('header')).not.toBe('')
    expect(classesDe('nav')).not.toBe('')
  })

  it('o `aside` está preso na viewport e tem altura de uma tela', () => {
    const aside = classesDe('aside')
    expect(aside).toContain('sticky')
    expect(aside).toContain('top-0')
    expect(aside).toContain('h-screen')
    // `self-start`: sem ele o `align-items: stretch` do flex desfaz o `h-screen` e a sidebar volta
    // a acompanhar a altura do documento — que é exatamente o defeito.
    expect(aside).toContain('self-start')
  })

  it('a lista de grupos rola DENTRO da sidebar, e o `min-h-0` é o que faz isso valer', () => {
    const nav = classesDe('nav')
    expect(nav).toContain('overflow-y-auto')
    expect(nav).toContain('flex-1')
    // Sem `min-h-0`, um filho de flex não encolhe abaixo do próprio conteúdo: a lista empurraria o
    // rodapé para fora da coluna em vez de rolar, e o `overflow` nunca dispararia.
    expect(nav).toContain('min-h-0')
  })

  it('a raiz NÃO trava a rolagem do documento', () => {
    // Decisão declarada: `h-screen overflow-hidden` na raiz também prenderia a sidebar, mas
    // trocaria a rolagem do body pela do `main` — e `100vh` com a barra do navegador do celular é
    // o defeito seguinte. `sticky` prende a sidebar sem mexer no modelo de rolagem.
    const raiz = (fonte.match(/<div className="(min-h-screen[^"]*)"/)?.[1] ?? '').split(/\s+/)
    expect(raiz).not.toEqual([''])
    expect(raiz).toContain('min-h-screen')
    // Por token, não por `includes`: a string `min-h-screen` **contém** `h-screen`, e a asserção
    // ingênua reprovaria a própria forma correta.
    expect(raiz).not.toContain('h-screen')
    expect(raiz).not.toContain('overflow-hidden')
  })

  it('a barra do celular também não sai da tela', () => {
    // No celular a sidebar É o botão do menu: se ele rola para fora, navegar exige voltar ao topo
    // de uma listagem de 680 linhas.
    const header = classesDe('header')
    expect(header).toContain('sticky')
    expect(header).toContain('top-0')
    expect(header).toContain('md:hidden')
    expect(header).toMatch(/z-\d+/)
  })

  it('SENSOR: a régua reprova a declaração ANTIGA', () => {
    // A forma que estava no arquivo antes do conserto — `aside` sem altura e sem `sticky`. Se as
    // asserções acima passassem também por ela, não estariam medindo nada.
    const antigo = 'w-60 bg-white border-r border-estrelinha-admin-border shrink-0 hidden md:block'
    expect(antigo).not.toContain('sticky')
    expect(antigo).not.toContain('h-screen')
    expect(antigo).not.toContain('self-start')
  })
})
