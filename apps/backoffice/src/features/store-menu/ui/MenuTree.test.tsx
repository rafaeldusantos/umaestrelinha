// Feature 86, T17 — a lista do menu como a cliente vê.
//
// ACs: `MNM-01` (nome, tipo, destino, ícone, chaves, quantos no submenu), `MNM-02` (o submenu na
// ordem gravada), `MNM-03` (categoria fora do menu não tem linha — 37 categorias, 3 itens ⇒ 3
// linhas), `MNM-04` (o vazio), `MNM-06` (alvos ≥ 44 por token exato), `MNM-18`/`MNM-19` (arraste e
// "Mover…" desabilitado nas pontas), `MNM-23`, `MNM-24` (teto de 24), `MNM-28..30` (chaves e "Fora do
// menu"), `MNM-35`/`MNM-36` (inativa e apagada) — e o movimento com par `motion-reduce:`.

import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MenuCategory, MenuDocument, MenuNode, MenuRootNode } from '@estrelinha/core/menu'
import { RADIX_POINTER_DOWN, enableRadixSelectInJsdom } from '@/test/radix'
import MenuTree from './MenuTree'

const cat = (id: string, name: string, over: Partial<MenuCategory> = {}): MenuCategory => ({
  id,
  name,
  slug: id,
  parent_id: null,
  sort_order: 0,
  active: true,
  ...over,
})

/** 37 categorias, como o catálogo real — só três estão no menu. */
const CATEGORIAS: MenuCategory[] = [
  cat('joias', 'Joias'),
  cat('aneis', 'Anéis', { parent_id: 'joias' }),
  cat('colares', 'Colares', { parent_id: 'joias' }),
  cat('chaveiros', 'Chaveiros'),
  cat('velha', 'Coleção velha', { active: false }),
  ...Array.from({ length: 32 }, (_, i) => cat(`extra-${i}`, `Extra ${i}`)),
]

const no = (id: string, alvo: MenuNode['target'], over: Partial<MenuNode> = {}): MenuNode => ({
  id,
  target: alvo,
  label: null,
  desktop: true,
  mobile: true,
  ...over,
})

const raiz = (id: string, alvo: MenuNode['target'], over: Partial<MenuRootNode> = {}): MenuRootNode => ({
  ...no(id, alvo),
  icon: null,
  banners: null,
  children: [],
  ...over,
})

const DOC: MenuDocument = {
  version: 2,
  items: [
    raiz('n-joias', { kind: 'category', category_id: 'joias' }, {
      icon: 'corrente',
      children: [
        no('c-aneis', { kind: 'category', category_id: 'aneis' }),
        no('c-colares', { kind: 'category', category_id: 'colares' }, { mobile: false }),
      ],
    }),
    raiz('n-chaveiros', { kind: 'category', category_id: 'chaveiros' }, { label: 'Chaveiros afetivos' }),
    raiz('n-sobre', { kind: 'link', href: '/sobre' }, { label: 'Sobre', desktop: false, mobile: false }),
  ],
}

const props = {
  onAdd: vi.fn(),
  onAddChild: vi.fn(),
  onToggle: vi.fn(),
  onMove: vi.fn(),
  onEdit: vi.fn(),
  onRemoveRoot: vi.fn(),
  onRemoveChild: vi.fn(),
  onSelect: vi.fn(),
}

const montar = (document: MenuDocument = DOC) =>
  render(
    <MenuTree document={document} categories={CATEGORIAS} contagem={{ desktop: 2, mobile: 2 }} {...props} />,
  )

const abrirAcoes = (id: string) => fireEvent.pointerDown(screen.getByTestId(`acoes-${id}`), RADIX_POINTER_DOWN)
const token = (el: Element, t: string) => el.className.split(/\s+/).includes(t)

beforeAll(() => enableRadixSelectInJsdom())
beforeEach(() => {
  for (const fn of Object.values(props)) fn.mockReset()
})

describe('MNM-01 / MNM-03 — só o que está no menu, na ordem gravada', () => {
  it('37 categorias e 3 itens ⇒ exatamente 3 linhas, na ordem do documento', () => {
    montar()
    const linhas = screen.getAllByTestId(/^item-/).map(l => l.getAttribute('data-testid'))
    expect(linhas).toEqual(['item-n-joias', 'item-n-chaveiros', 'item-n-sobre'])
    expect(screen.queryByText('Extra 1')).toBeNull()
    expect(screen.queryByText('Coleção velha')).toBeNull()
  })

  it('a linha mostra tipo, destino legível, submenu e "nome próprio"', () => {
    montar()
    expect(screen.getByTestId('meta-n-joias')).toHaveTextContent('Categoria · Joias · 2 no submenu')
    expect(screen.getByTestId('meta-n-joias')).not.toHaveTextContent('nome próprio')
    expect(screen.getByTestId('meta-n-chaveiros')).toHaveTextContent('Categoria · Chaveiros · sem submenu · nome próprio')
    expect(screen.getByTestId('meta-n-sobre')).toHaveTextContent('Link · /sobre · sem submenu')
  })

  it('o nome é o próprio, ou o da categoria quando não há', () => {
    montar()
    expect(within(screen.getByTestId('item-n-joias')).getByText('Joias')).toBeInTheDocument()
    expect(within(screen.getByTestId('item-n-chaveiros')).getByText('Chaveiros afetivos')).toBeInTheDocument()
  })

  it('o ícone é desenhado, e sem ícone diz "sem"', () => {
    montar()
    expect(screen.getByTestId('icone-n-joias').querySelector('svg')).not.toBeNull()
    expect(screen.getByTestId('icone-n-chaveiros')).toHaveTextContent('sem')
  })

  it('o subtítulo do card diz quantos a loja desenha por dispositivo', () => {
    montar()
    expect(screen.getByTestId('contador-itens')).toHaveTextContent('2 no computador · 2 no celular')
  })

  it('o destino de subcategoria é o caminho', () => {
    const doc: MenuDocument = { version: 2, items: [raiz('n', { kind: 'category', category_id: 'aneis' })] }
    montar(doc)
    expect(screen.getByTestId('meta-n')).toHaveTextContent('Joias › Anéis')
  })
})

describe('MNM-04 — o menu vazio', () => {
  it('mostra o vazio com "Adicionar item ao menu", sem nenhuma lista de categorias', () => {
    montar({ version: 2, items: [] })
    expect(screen.getByTestId('menu-vazio')).toHaveTextContent('O menu está vazio')
    expect(screen.queryAllByTestId(/^item-/)).toEqual([])
    fireEvent.click(screen.getByTestId('adicionar-primeiro'))
    expect(props.onAdd).toHaveBeenCalledTimes(1)
  })

  it('"+ Adicionar item" no cabeçalho também chama', () => {
    montar()
    fireEvent.click(screen.getByTestId('adicionar-item'))
    expect(props.onAdd).toHaveBeenCalledTimes(1)
  })
})

describe('MNM-28 / MNM-29 / MNM-30 — as chaves de dispositivo', () => {
  it('as chaves refletem o nó e chamam com o valor oposto', () => {
    montar()
    const pc = screen.getByTestId('chave-desktop-n-joias')
    expect(pc).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByTestId('chave-mobile-n-joias'))
    expect(props.onToggle).toHaveBeenCalledWith('n-joias', 'mobile', false)
  })

  it('desligado nos dois: esmaecido e com "Fora do menu"', () => {
    montar()
    expect(screen.getByTestId('selo-n-sobre')).toHaveTextContent('Fora do menu')
    expect(screen.queryByTestId('selo-n-joias')).toBeNull()
    // O esmaecimento, por token exato, no contêiner da linha (marcado por `data-testid`, sem subir o
    // DOM a partir do texto): fora do menu esmaece; ligado em um dispositivo, não.
    expect(token(screen.getByTestId('linha-n-sobre'), 'opacity-60')).toBe(true)
    expect(token(screen.getByTestId('linha-n-joias'), 'opacity-60')).toBe(false)
    expect(token(screen.getByTestId('linha-n-chaveiros'), 'opacity-60')).toBe(false)
  })

  it('filho desligado nos dois também esmaece; ligado em um, não', () => {
    const doc: MenuDocument = {
      ...DOC,
      items: DOC.items.map(i =>
        i.id === 'n-joias'
          ? { ...i, children: i.children.map(c => (c.id === 'c-aneis' ? { ...c, desktop: false, mobile: false } : c)) }
          : i,
      ),
    }
    montar(doc)
    fireEvent.click(screen.getByTestId('expandir-n-joias'))
    expect(token(screen.getByTestId('filho-c-aneis'), 'opacity-60')).toBe(true)
    expect(token(screen.getByTestId('filho-c-colares'), 'opacity-60')).toBe(false)
  })

  it('o filho também tem as chaves, só dele', () => {
    montar()
    fireEvent.click(screen.getByTestId('expandir-n-joias'))
    expect(screen.getByTestId('chave-mobile-c-colares')).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(screen.getByTestId('chave-mobile-c-colares'))
    expect(props.onToggle).toHaveBeenCalledWith('c-colares', 'mobile', true)
  })
})

describe('MNM-02 / MNM-23 / MNM-24 — o submenu', () => {
  it('expandir mostra o submenu, na ordem gravada, com o contador N/24', () => {
    montar()
    const botao = screen.getByTestId('expandir-n-joias')
    expect(botao).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(botao)
    expect(botao).toHaveAttribute('aria-expanded', 'true')
    const submenu = screen.getByTestId('submenu-n-joias')
    expect(within(submenu).getAllByTestId(/^filho-/).map(f => f.getAttribute('data-testid'))).toEqual([
      'filho-c-aneis',
      'filho-c-colares',
    ])
    expect(screen.getByTestId('contador-submenu-n-joias')).toHaveTextContent('2/24')
    expect(props.onSelect).toHaveBeenCalledWith('n-joias')
  })

  it('sem submenu diz que o item é link direto', () => {
    montar()
    fireEvent.click(screen.getByTestId('expandir-n-chaveiros'))
    expect(screen.getByTestId('submenu-vazio-n-chaveiros')).toHaveTextContent(
      'Sem submenu: na loja, “Chaveiros afetivos” é um link direto.',
    )
  })

  it('"Mover" do filho: desabilitado nas pontas, e chama com a lista do pai', () => {
    montar()
    fireEvent.click(screen.getByTestId('expandir-n-joias'))
    expect(screen.getByTestId('subir-c-aneis')).toBeDisabled()
    expect(screen.getByTestId('descer-c-colares')).toBeDisabled()
    fireEvent.click(screen.getByTestId('descer-c-aneis'))
    expect(props.onMove).toHaveBeenCalledWith('n-joias', 0, 1)
  })

  it('tirar um filho chama direto, sem confirmação', () => {
    montar()
    fireEvent.click(screen.getByTestId('expandir-n-joias'))
    fireEvent.click(screen.getByTestId('tirar-c-aneis'))
    expect(props.onRemoveChild).toHaveBeenCalledWith('c-aneis')
    expect(props.onRemoveRoot).not.toHaveBeenCalled()
  })

  it('editar um filho', () => {
    montar()
    fireEvent.click(screen.getByTestId('expandir-n-joias'))
    fireEvent.click(screen.getByTestId('editar-c-aneis'))
    expect(props.onEdit).toHaveBeenCalledWith('c-aneis')
  })

  it('"Adicionar ao submenu" chama com o pai; com 24, desabilita com o motivo', () => {
    montar()
    fireEvent.click(screen.getByTestId('expandir-n-joias'))
    fireEvent.click(screen.getByTestId('adicionar-ao-submenu-n-joias'))
    expect(props.onAddChild).toHaveBeenCalledWith('n-joias')
    expect(screen.queryByTestId('submenu-cheio-n-joias')).toBeNull()
  })

  it('com 24 filhos o botão desabilita e diz "O submenu tem o máximo de 24 itens."', () => {
    const cheio: MenuDocument = {
      version: 2,
      items: [
        raiz('n', { kind: 'category', category_id: 'joias' }, {
          children: Array.from({ length: 24 }, (_, i) => no(`f${i}`, { kind: 'category', category_id: `extra-${i}` })),
        }),
      ],
    }
    montar(cheio)
    fireEvent.click(screen.getByTestId('expandir-n'))
    expect(screen.getByTestId('adicionar-ao-submenu-n')).toBeDisabled()
    expect(screen.getByTestId('submenu-cheio-n')).toHaveTextContent('O submenu tem o máximo de 24 itens.')
    expect(screen.getByTestId('contador-submenu-n')).toHaveTextContent('24/24')
  })
})

describe('MNM-18 / MNM-19 — reordenar o menu principal', () => {
  it('"Mover para cima" desabilitado no primeiro; "Mover para baixo" no último', () => {
    montar()
    abrirAcoes('n-joias')
    expect(screen.getByTestId('subir-n-joias')).toHaveAttribute('data-disabled')
    expect(screen.getByTestId('descer-n-joias')).not.toHaveAttribute('data-disabled')
  })

  it('no último, "Mover para baixo" desabilitado; "Mover para cima" chama a op', () => {
    montar()
    abrirAcoes('n-sobre')
    expect(screen.getByTestId('descer-n-sobre')).toHaveAttribute('data-disabled')
    fireEvent.click(screen.getByTestId('subir-n-sobre'))
    expect(props.onMove).toHaveBeenCalledWith(null, 2, 1)
  })

  it('soltar uma linha sobre outra move dentro do menu principal', () => {
    montar()
    fireEvent.drop(screen.getByTestId('item-n-joias'), {
      dataTransfer: { getData: () => 'raiz|2', setData: vi.fn() },
    })
    expect(props.onMove).toHaveBeenCalledWith(null, 2, 0)
  })

  it('soltar um FILHO no menu principal não move nada (troca de nível não é arraste)', () => {
    montar()
    fireEvent.drop(screen.getByTestId('item-n-chaveiros'), {
      dataTransfer: { getData: () => 'n-joias|0', setData: vi.fn() },
    })
    expect(props.onMove).not.toHaveBeenCalled()
  })

  it('editar e remover pelo menu ⋯', () => {
    montar()
    abrirAcoes('n-joias')
    fireEvent.click(screen.getByTestId('remover-n-joias'))
    expect(props.onRemoveRoot).toHaveBeenCalledWith('n-joias')
  })
})

describe('MNM-35 / MNM-36 — o que deixou de existir', () => {
  const doc: MenuDocument = {
    version: 2,
    items: [
      raiz('n-velha', { kind: 'category', category_id: 'velha' }),
      raiz('n-sumiu', { kind: 'category', category_id: 'nao-existe' }),
    ],
  }

  it('inativa: selo "Categoria inativa — não aparece na loja", e continua editável', () => {
    montar(doc)
    expect(screen.getByTestId('selo-n-velha')).toHaveTextContent('Categoria inativa — não aparece na loja')
    expect(screen.getByTestId('chave-desktop-n-velha')).toBeInTheDocument()
  })

  it('apagada: "Categoria apagada", sem chaves nem submenu, e a única ação é "Remover do menu"', () => {
    montar(doc)
    expect(screen.getByTestId('selo-n-sumiu')).toHaveTextContent('Categoria apagada')
    expect(screen.queryByTestId('chave-desktop-n-sumiu')).toBeNull()
    expect(screen.queryByTestId('expandir-n-sumiu')).toBeNull()
    abrirAcoes('n-sumiu')
    const itens = screen.getAllByRole('menuitem').map(i => i.textContent)
    expect(itens).toEqual(['Remover do menu'])
  })
})

describe('MNM-06 — alvos e movimento', () => {
  it('chaves, expandir, ações, mover, editar e tirar medem ≥ 44px (token exato)', () => {
    montar()
    fireEvent.click(screen.getByTestId('expandir-n-joias'))
    const alvos = [
      ...screen.getAllByTestId(/^chave-/),
      ...screen.getAllByTestId(/^expandir-/),
      ...screen.getAllByTestId(/^acoes-/),
      ...screen.getAllByTestId(/^(subir|descer|editar|tirar)-c-/),
    ]
    expect(alvos.length).toBeGreaterThan(12)
    for (const alvo of alvos) {
      expect(token(alvo, 'min-h-11') || token(alvo, 'h-11')).toBe(true)
    }
    expect(token(screen.getByTestId('adicionar-item'), 'min-h-11')).toBe(true)
  })

  it('a seta e as chaves declaram transição COM o par `motion-reduce:`', () => {
    montar()
    const seta = screen.getByTestId('expandir-n-joias').querySelector('svg')!
    expect(seta.getAttribute('class')!.split(/\s+/)).toEqual(
      expect.arrayContaining(['transition-transform', 'motion-reduce:transition-none']),
    )
    const chave = screen.getByTestId('chave-desktop-n-joias')
    expect(token(chave, 'transition-colors')).toBe(true)
    expect(token(chave, 'motion-reduce:transition-none')).toBe(true)
  })
})

// Achado na prova em navegador da 86 (T23): em 390 a linha de cada item cabia sem estourar, mas o
// NOME encolhia a 29px — "Joi…", "Pe…" — espremido entre a alça, o ícone e cinco controles (PC,
// Celular, submenu, ⋯). jsdom devolve 0 para layout, então a régua é de classe por token exato: a
// linha embrulha, o nome reserva uma base de 10rem (os controles vão para a segunda linha quando não
// cabem ao lado dela) e os controles se alinham à direita. Medido depois em navegador.
describe('a linha em 390: o nome não é espremido pelos controles', () => {
  it('a linha embrulha, o nome tem base própria e os controles formam um bloco à direita', () => {
    montar()
    const item = screen.getByTestId('item-n-joias')
    const linha = item.firstElementChild!
    expect(token(linha, 'flex-wrap')).toBe(true)

    const nome = within(item).getByRole('button', { name: /^Joias Categoria/ })
    expect(token(nome, 'basis-40')).toBe(true)
    expect(token(nome, 'flex-1')).toBe(true)

    const controles = screen.getByTestId('controles-n-joias')
    expect(token(controles, 'ml-auto')).toBe(true)
    expect(controles.contains(screen.getByTestId('chave-desktop-n-joias'))).toBe(true)
    expect(controles.contains(screen.getByTestId('expandir-n-joias'))).toBe(true)
    expect(controles.contains(screen.getByTestId('acoes-n-joias'))).toBe(true)
  })

  it('no submenu também: o nome do filho tem base própria, e os controles dele descem juntos', () => {
    montar()
    fireEvent.click(screen.getByTestId('expandir-n-joias'))
    const filho = screen.getByTestId('filho-c-aneis')
    expect(token(filho, 'flex-wrap')).toBe(true)
    const nome = filho.querySelector('[data-testid="nome-c-aneis"]')!
    // 7rem e não 10rem: no computador a linha do filho (alça + nome + PC/Celular + 4 botões) cabe
    // inteira numa coluna de 440 só com a base menor — medido, 1 linha em 1440 e 2 em 390.
    expect(token(nome, 'basis-28')).toBe(true)
    expect(token(nome, 'flex-1')).toBe(true)
    const controles = screen.getByTestId('controles-c-aneis')
    expect(token(controles, 'ml-auto')).toBe(true)
    expect(controles.contains(screen.getByTestId('tirar-c-aneis'))).toBe(true)
    expect(controles.contains(screen.getByTestId('chave-desktop-c-aneis'))).toBe(true)
  })
})

/**
 * Q06 do QA da `86` (`BUG-20261028-controles-do-menu-saem-da-tela-com-fonte-grande`) — com a letra
 * do celular a 130 % e 200 %, os alvos de 44 viram 57 e 88 px (são `rem`), e o bloco de controles,
 * que era `shrink-0`, ficava com a largura da linha inteira: o "Tirar" saía em x = 456 e a página
 * rolava de lado. E os nomes viravam reticências. A régua é de token exato (jsdom não mede), e a
 * medida de verdade está no bug, em navegador a 130 % e 200 %.
 */
describe('Q06 — com a fonte grande, controles e nomes embrulham dentro da largura', () => {
  const embrulha = (el: Element) => {
    expect(token(el, 'flex-wrap')).toBe(true)
    expect(token(el, 'min-w-0')).toBe(true)
    expect(token(el, 'max-w-full')).toBe(true)
    // `shrink-0` num bloco que embrulha faz a largura dele ser a de uma linha só (max-content).
    expect(token(el, 'shrink-0')).toBe(false)
  }

  it('o bloco de controles do item principal embrulha e não passa da largura', () => {
    montar()
    embrulha(screen.getByTestId('controles-n-joias'))
  })

  it('o bloco de controles do filho também', () => {
    montar()
    fireEvent.click(screen.getByTestId('expandir-n-joias'))
    embrulha(screen.getByTestId('controles-c-aneis'))
  })

  it('o nome e o destino quebram linha em vez de reticências (item e filho)', () => {
    montar()
    fireEvent.click(screen.getByTestId('expandir-n-joias'))
    const nomes = [
      within(screen.getByTestId('linha-n-joias')).getByText('Joias'),
      screen.getByTestId('meta-n-joias'),
      within(screen.getByTestId('nome-c-aneis')).getByText('Anéis'),
      within(screen.getByTestId('nome-c-aneis')).getByText('Joias › Anéis'),
    ]
    for (const el of nomes) {
      expect(token(el, 'truncate')).toBe(false)
      expect(token(el, 'break-words')).toBe(true)
    }
  })

  // Medido em navegador (390 a 200 %): o `Button` do design system é `whitespace-nowrap`, e
  // "Adicionar ao submenu" ia até x = 493 (e "Adicionar item" até 400) — o body rolava de lado.
  it('"Adicionar item" e "Adicionar ao submenu" quebram linha e não passam da largura', () => {
    montar()
    fireEvent.click(screen.getByTestId('expandir-n-joias'))
    for (const id of ['adicionar-item', 'adicionar-ao-submenu-n-joias']) {
      const b = screen.getByTestId(id)
      expect(token(b, 'whitespace-normal'), id).toBe(true)
      expect(token(b, 'h-auto'), id).toBe(true)
      expect(token(b, 'max-w-full'), id).toBe(true)
      expect(token(b, 'min-h-11'), id).toBe(true)
    }
  })

  it('SENSOR: a régua acusa a forma antiga (`shrink-0` + `truncate`)', () => {
    const antigo = window.document.createElement('span')
    antigo.className = 'ml-auto flex shrink-0 flex-wrap items-center gap-1.5'
    expect(token(antigo, 'shrink-0')).toBe(true)
    expect(token(antigo, 'min-w-0')).toBe(false)
  })
})
