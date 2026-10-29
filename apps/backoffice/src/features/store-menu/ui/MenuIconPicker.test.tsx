// Feature 39 — o seletor de ícone (`NAV-16`, `NAV-17`, `NAV-18`) e a busca por nome (`NAV-48`).
//
// O que se prova aqui: que o conjunto oferecido é o **mesmo** que a loja desenha (a chave vem de
// `@estrelinha/core/menu`, o desenho de `@estrelinha/ui/icons` — e o painel não importa de
// `apps/store`), que "sem ícone" limpa, e que a busca acha sem acento e sem caixa.

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MENU_ICON_KEYS, MENU_ICON_LABELS } from '@estrelinha/core/menu'
import MenuIconPicker from './MenuIconPicker'

const montar = (value: string | null = null, onChange = vi.fn()) => {
  render(<MenuIconPicker itemName="Joias afetivas" value={value} onChange={onChange} />)
  return onChange
}

const buscar = (texto: string) =>
  fireEvent.change(screen.getByTestId('busca-icone'), { target: { value: texto } })

const oferecidos = () => screen.getAllByTestId(/^icone-opcao-/).map(no => no.getAttribute('data-testid'))

describe('NAV-16 — o conjunto é fechado e é o mesmo da loja', () => {
  it('oferece TODA chave do catálogo, com o nome ao lado do desenho', () => {
    montar()
    expect(oferecidos()).toHaveLength(MENU_ICON_KEYS.length)
    // O rótulo é AC: uma grade de glifos sem nome obriga a dona a adivinhar, e dois deles são
    // parecidos de propósito (mecha de cabelo × mecha amarrada).
    expect(screen.getByText(MENU_ICON_LABELS.gravacao)).toBeInTheDocument()
    expect(screen.getByTestId('contador-icones')).toHaveTextContent(
      `${MENU_ICON_KEYS.length} no conjunto`,
    )
  })

  it('não há upload — nenhum campo de arquivo na tela', () => {
    const { container } = render(
      <MenuIconPicker itemName="Joias" value={null} onChange={vi.fn()} />,
    )
    expect(container.querySelector('input[type="file"]')).toBeNull()
  })
})

describe('NAV-18 — "sem ícone" é o estado inicial e o caminho de volta', () => {
  it('sem valor, "Sem ícone" está marcada', () => {
    montar(null)
    expect(screen.getByTestId('icone-nenhum')).toHaveAttribute('aria-pressed', 'true')
  })

  it('escolher grava a chave; voltar para "Sem ícone" limpa', () => {
    const onChange = montar('gravacao')
    expect(screen.getByTestId('icone-opcao-gravacao')).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByTestId('icone-nenhum'))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('chave fora do catálogo lê como "sem ícone", sem deixar a grade sem marcação (NAV-19)', () => {
    // O valor vem de `categories.icon`, que guardou emoji do catálogo anterior e não tem `check` em
    // SQL. Degradar é a resposta certa: ícone não é dinheiro nem segurança.
    montar('🎀')
    expect(screen.getByTestId('icone-nenhum')).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('NAV-48 — a busca acha sem acento e sem caixa', () => {
  it('"gravacao" acha "Gravação"', () => {
    montar()
    buscar('gravacao')
    expect(oferecidos()).toEqual(['icone-opcao-gravacao'])
  })

  it('"PLÁSTICO" e "plastico" acham o mesmo — caixa e acento não contam', () => {
    montar()
    buscar('PLÁSTICO')
    const comAcento = oferecidos()
    buscar('plastico')
    expect(oferecidos()).toEqual(comAcento)
    expect(comAcento).toContain('icone-opcao-plastico-filme')
  })

  it('acha pela CHAVE também — é o que está gravado no banco', () => {
    // Quem confere um valor gravado procura por `gota-afetiva`, não por "Gota afetiva". Casar só o
    // rótulo faria a busca falhar justamente na conferência.
    montar()
    buscar('gota-afetiva')
    expect(oferecidos()).toEqual(['icone-opcao-gota-afetiva'])
  })

  it('termo parcial devolve mais de um, e o contador diz quantos de quantos', () => {
    montar()
    buscar('mecha')
    expect(oferecidos()).toEqual(['icone-opcao-mecha-amarrada', 'icone-opcao-mecha-cabelo'])
    expect(screen.getByTestId('contador-icones')).toHaveTextContent(`2 de ${MENU_ICON_KEYS.length}`)
  })

  it('"Sem ícone" NÃO é filtrada — ela é a saída, não um resultado', () => {
    // Escondê-la porque o termo não casa "sem ícone" tiraria da dona o único jeito de limpar a
    // escolha, e o caminho de volta seria apagar o que ela acabou de digitar.
    montar('gravacao')
    buscar('unha')
    expect(screen.getByTestId('icone-nenhum')).toBeInTheDocument()
  })

  it('busca sem resultado DIZ isso, em vez de deixar a grade quase vazia', () => {
    montar()
    buscar('zzzz')
    expect(oferecidos.bind(null)).toThrow() // nenhuma cela de ícone sobrou
    expect(screen.getByTestId('icones-sem-resultado')).toHaveTextContent('Nenhum ícone com esse nome')
  })

  it('apagar a busca devolve o conjunto inteiro', () => {
    montar()
    buscar('unha')
    expect(oferecidos()).toHaveLength(1)

    buscar('')
    expect(oferecidos()).toHaveLength(MENU_ICON_KEYS.length)
    expect(screen.getByTestId('contador-icones')).toHaveTextContent('no conjunto')
  })

  it('espaço em volta não conta — colar de um documento não pode zerar a busca', () => {
    montar()
    buscar('  unha  ')
    expect(oferecidos()).toEqual(['icone-opcao-unha'])
  })
})

/**
 * Q06b do QA da `86` (`BUG-20261028-controles-do-menu-saem-da-tela-com-fonte-grande`) — com a letra
 * do celular a 200 % o contador "N no conjunto" ia até x = 438 numa janela de 390 e o diálogo do
 * editor rolava de lado; a busca media 36 px a 100 %. jsdom não mede: a régua é de token exato, e a
 * medida de verdade está no bug.
 */
describe('Q06b — com a fonte grande, o seletor de ícone cabe na largura', () => {
  const tem = (el: Element, t: string) => el.className.split(/\s+/).includes(t)

  it('o cabeçalho embrulha: o título quebra linha e o contador desce em vez de passar da borda', () => {
    montar()
    const linha = screen.getByTestId('contador-icones').parentElement!
    expect(tem(linha, 'flex-wrap')).toBe(true)
    const titulo = screen.getByRole('heading', { name: /Ícone de/ })
    expect(tem(titulo, 'min-w-0')).toBe(true)
    expect(tem(titulo, 'break-words')).toBe(true)
  })

  it('a busca tem 44 px (h-11), não 36 (h-9)', () => {
    montar()
    const busca = screen.getByTestId('busca-icone')
    expect(tem(busca, 'h-11')).toBe(true)
    expect(tem(busca, 'h-9')).toBe(false)
  })

  it('a cela cresce com o rótulo (altura mínima), em vez de cortar o texto numa altura fixa', () => {
    montar()
    for (const cela of [screen.getByTestId('icone-nenhum'), ...screen.getAllByTestId(/^icone-opcao-/)]) {
      expect(tem(cela, 'min-h-[76px]')).toBe(true)
      expect(tem(cela, 'h-[76px]')).toBe(false)
    }
  })

  it('SENSOR: a régua acusa a forma antiga', () => {
    const antiga = document.createElement('input')
    antiga.className = 'h-9 w-full rounded-lg'
    expect(tem(antiga, 'h-11')).toBe(false)
    const cela = document.createElement('button')
    cela.className = 'flex h-[76px] w-[100px]'
    expect(tem(cela, 'min-h-[76px]')).toBe(false)
  })
})
