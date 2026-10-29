// Feature 86, T14 — o seletor do que entra no menu.
//
// ACs: `MNM-07` (as duas abas, caminho e "Inativa"), `MNM-10`/`MNM-25` (a usada aparece desabilitada
// com o motivo certo para raiz × submenu), `MNM-11` (a página entra com o nome sugerido, editável),
// `MNM-12` (o endereço recusado mostra o motivo de `core` e não chama `onPick`), `MNM-22` (o mesmo
// seletor serve o submenu) e o alvo de 44px por token exato.

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { internalMenuHrefRefusal, type MenuCategory } from '@estrelinha/core/menu'

/** Q03: a conferência da peça no banco — dublada aqui, provada em `activeProductBySlug`. */
const produto = vi.hoisted(() => ({ existe: vi.fn<(slug: string) => Promise<boolean | null>>() }))
vi.mock('@/entities/product', () => ({ activeProductExists: (slug: string) => produto.existe(slug) }))

import MenuTargetPicker from './MenuTargetPicker'
import { MOTIVO_PECA_NAO_CONFERIDA, MOTIVO_SEM_PAGINA, MOTIVO_SEM_PECA } from '../model/enderecoDaLoja'
import { PAGINAS_DA_LOJA } from '../model/paginasDaLoja'

const cat = (id: string, name: string, over: Partial<MenuCategory> = {}): MenuCategory => ({
  id,
  name,
  slug: id,
  parent_id: null,
  sort_order: 0,
  active: true,
  ...over,
})

const CATEGORIAS: MenuCategory[] = [
  cat('joias', 'Joias'),
  cat('aneis', 'Anéis', { parent_id: 'joias', sort_order: 1 }),
  cat('colares', 'Colares', { parent_id: 'joias', sort_order: 2 }),
  cat('velhos', 'Velhos', { parent_id: 'joias', sort_order: 3, active: false }),
  cat('chaveiros', 'Chaveiros', { sort_order: 1 }),
]

const onPick = vi.fn()
const onOpenChange = vi.fn()

const montar = (modo: 'raiz' | 'submenu' = 'raiz', usadas: string[] = [], hrefsUsados: string[] = []) =>
  render(
    <MenuTargetPicker
      open
      onOpenChange={onOpenChange}
      modo={modo}
      titulo="Adicionar item ao menu"
      categories={CATEGORIAS}
      usadas={new Set(usadas)}
      hrefsUsados={new Set(hrefsUsados)}
      onPick={onPick}
    />,
  )

const temToken = (el: Element, token: string) => el.className.split(/\s+/).includes(token)

beforeEach(() => {
  onPick.mockReset()
  onOpenChange.mockReset()
  produto.existe.mockReset()
  produto.existe.mockResolvedValue(true)
})

describe('MNM-07 — duas abas, e a aba Categoria com caminho e "Inativa"', () => {
  it('abre em Categoria, com as duas abas', () => {
    montar()
    const abas = within(screen.getByRole('tablist', { name: 'O que adicionar' })).getAllByRole('tab')
    expect(abas.map(a => a.textContent)).toEqual(['Categoria', 'Página da loja'])
    expect(screen.getByTestId('aba-categoria')).toHaveAttribute('aria-selected', 'true')
  })

  it('cada linha mostra o caminho da categoria', () => {
    montar()
    expect(screen.getByTestId('opcao-categoria-aneis')).toHaveTextContent('Joias › Anéis')
  })

  it('a inativa aparece, com o selo "Inativa"', () => {
    montar()
    expect(screen.getByTestId('opcao-categoria-velhos')).toHaveTextContent('Inativa')
    expect(screen.getByTestId('opcao-categoria-aneis')).not.toHaveTextContent('Inativa')
  })

  it('"anel" acha "Anéis" — a busca dobra acento e caixa', () => {
    montar()
    fireEvent.change(screen.getByTestId('busca-categoria'), { target: { value: 'ANEI' } })
    expect(screen.getByTestId('opcao-categoria-aneis')).toBeInTheDocument()
    expect(screen.queryByTestId('opcao-categoria-chaveiros')).toBeNull()
  })

  it('a busca casa também o CAMINHO: "joias" acha as filhas', () => {
    montar()
    fireEvent.change(screen.getByTestId('busca-categoria'), { target: { value: 'joias' } })
    expect(screen.getByTestId('opcao-categoria-colares')).toBeInTheDocument()
    expect(screen.queryByTestId('opcao-categoria-chaveiros')).toBeNull()
  })

  it('sem resultado diz isso em texto', () => {
    montar()
    fireEvent.change(screen.getByTestId('busca-categoria'), { target: { value: 'xyz' } })
    expect(screen.getByTestId('categorias-sem-resultado')).toHaveTextContent('Nenhuma categoria')
  })

  it('no menu principal, a raiz com filhas ativas diz quantas entram no submenu (a inativa não conta)', () => {
    montar('raiz')
    expect(screen.getByTestId('opcao-categoria-joias')).toHaveTextContent(
      '2 subcategorias entram no submenu',
    )
  })

  it('no submenu essa dica não aparece — filho não ganha submenu', () => {
    montar('submenu')
    expect(screen.getByTestId('opcao-categoria-joias')).not.toHaveTextContent('entram no submenu')
  })
})

describe('MNM-08 — escolher uma categoria entrega o alvo', () => {
  it('Adicionar fica desabilitado até escolher', () => {
    montar()
    expect(screen.getByTestId('seletor-adicionar')).toBeDisabled()
    fireEvent.click(screen.getByTestId('opcao-categoria-aneis'))
    expect(screen.getByTestId('opcao-categoria-aneis')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('seletor-adicionar')).toBeEnabled()
  })

  it('subcategoria também entra, sem rótulo próprio (usa o nome da categoria)', () => {
    montar()
    fireEvent.click(screen.getByTestId('opcao-categoria-aneis'))
    fireEvent.click(screen.getByTestId('seletor-adicionar'))
    expect(onPick).toHaveBeenCalledWith({ target: { kind: 'category', category_id: 'aneis' } })
  })
})

describe('MNM-10 / MNM-25 — a usada fica desabilitada, com o motivo certo', () => {
  it('no menu principal: "Já está no menu"', () => {
    montar('raiz', ['joias'])
    const linha = screen.getByTestId('opcao-categoria-joias')
    expect(linha).toBeDisabled()
    expect(screen.getByTestId('motivo-joias')).toHaveTextContent('Já está no menu')
  })

  it('no submenu: "Já está neste submenu"', () => {
    montar('submenu', ['aneis'])
    expect(screen.getByTestId('opcao-categoria-aneis')).toBeDisabled()
    expect(screen.getByTestId('motivo-aneis')).toHaveTextContent('Já está neste submenu')
  })

  it('clicar na usada não a escolhe nem entrega nada', () => {
    montar('raiz', ['joias'])
    fireEvent.click(screen.getByTestId('opcao-categoria-joias'))
    expect(screen.getByTestId('seletor-adicionar')).toBeDisabled()
    expect(onPick).not.toHaveBeenCalled()
  })

  it('a que não está em uso continua escolhível', () => {
    montar('raiz', ['joias'])
    expect(screen.getByTestId('opcao-categoria-chaveiros')).toBeEnabled()
    expect(screen.queryByTestId('motivo-chaveiros')).toBeNull()
  })
})

describe('MNM-11 — página da loja', () => {
  const irParaPaginas = () => fireEvent.click(screen.getByTestId('aba-pagina'))

  it('a lista vem do sitemap, sem a Home', () => {
    montar()
    irParaPaginas()
    expect(PAGINAS_DA_LOJA.length).toBeGreaterThan(3)
    expect(PAGINAS_DA_LOJA.some(p => p.path === '/')).toBe(false)
    for (const p of PAGINAS_DA_LOJA) {
      expect(screen.getByTestId(`opcao-pagina-${p.path}`)).toHaveTextContent(p.path)
    }
  })

  it('todo nome sugerido cabe no teto de 40 e passa na régua de endereço de core', () => {
    for (const p of PAGINAS_DA_LOJA) {
      expect(p.nomeSugerido.length).toBeLessThanOrEqual(40)
      expect(internalMenuHrefRefusal(p.path)).toBeNull()
    }
  })

  it('escolher "/sobre" preenche o nome sugerido, e o nome é editável', () => {
    montar()
    irParaPaginas()
    fireEvent.click(screen.getByTestId('opcao-pagina-/sobre'))
    expect(screen.getByTestId('nome-do-link')).toHaveValue('Sobre')
    expect(screen.getByTestId('contador-nome-link')).toHaveTextContent('5/40')

    fireEvent.change(screen.getByTestId('nome-do-link'), { target: { value: 'Quem faz' } })
    fireEvent.click(screen.getByTestId('seletor-adicionar'))
    expect(onPick).toHaveBeenCalledWith({ target: { kind: 'link', href: '/sobre' }, label: 'Quem faz' })
  })

  it('nome vazio é recusado com motivo', () => {
    montar()
    irParaPaginas()
    fireEvent.click(screen.getByTestId('opcao-pagina-/sobre'))
    fireEvent.change(screen.getByTestId('nome-do-link'), { target: { value: '   ' } })
    fireEvent.click(screen.getByTestId('seletor-adicionar'))
    expect(screen.getByTestId('seletor-recusa')).toHaveTextContent('Digite o nome do item no menu.')
    expect(onPick).not.toHaveBeenCalled()
  })

  it('nome com 41 caracteres é recusado pela régua de core', () => {
    montar()
    irParaPaginas()
    fireEvent.click(screen.getByTestId('opcao-pagina-/sobre'))
    fireEvent.change(screen.getByTestId('nome-do-link'), { target: { value: 'a'.repeat(41) } })
    fireEvent.click(screen.getByTestId('seletor-adicionar'))
    expect(screen.getByTestId('seletor-recusa')).toHaveTextContent('até 40 caracteres')
    expect(onPick).not.toHaveBeenCalled()
  })
})

describe('MNM-12 — outro endereço: o motivo vem de core, e nada é entregue', () => {
  const outro = (href: string) => {
    montar()
    fireEvent.click(screen.getByTestId('aba-pagina'))
    fireEvent.click(screen.getByTestId('opcao-pagina-outro'))
    fireEvent.change(screen.getByTestId('outro-endereco'), { target: { value: href } })
    fireEvent.change(screen.getByTestId('nome-do-link'), { target: { value: 'Algo' } })
    fireEvent.click(screen.getByTestId('seletor-adicionar'))
  }

  it.each(['https://exemplo.com', 'http://exemplo.com/x', '//exemplo.com', ''])(
    'recusa %j com o motivo de internalMenuHrefRefusal',
    href => {
      outro(href)
      const motivo = internalMenuHrefRefusal(href)
      expect(motivo).not.toBeNull()
      expect(screen.getByTestId('seletor-recusa')).toHaveTextContent(motivo!)
      expect(onPick).not.toHaveBeenCalled()
    },
  )

  it('aceita um caminho da loja e entrega o link', async () => {
    outro('/perguntas-frequentes')
    await waitFor(() =>
      expect(onPick).toHaveBeenCalledWith({
        target: { kind: 'link', href: '/perguntas-frequentes' },
        label: 'Algo',
      }),
    )
    expect(screen.queryByTestId('seletor-recusa')).toBeNull()
  })
})

/**
 * Q03 do QA da `86` (`BUG-20261028-outro-endereco-aceita-pagina-que-nao-existe`) — o campo aceitava
 * `/produtos/inexistente` (404 na loja) e gravava `/sobre/` e `/SOBRE` como páginas distintas.
 */
describe('Q03 — outro endereço: só o que existe, na grafia da loja', () => {
  const digitar = (href: string, hrefsUsados: string[] = [], modo: 'raiz' | 'submenu' = 'raiz') => {
    montar(modo, [], hrefsUsados)
    fireEvent.click(screen.getByTestId('aba-pagina'))
    fireEvent.click(screen.getByTestId('opcao-pagina-outro'))
    fireEvent.change(screen.getByTestId('outro-endereco'), { target: { value: href } })
    fireEvent.change(screen.getByTestId('nome-do-link'), { target: { value: 'Algo' } })
    fireEvent.click(screen.getByTestId('seletor-adicionar'))
  }

  it('/produtos/<peça que não existe> recusa com motivo, depois de UMA consulta pelo slug', async () => {
    produto.existe.mockResolvedValue(false)
    digitar('/produtos/inexistente')
    expect(await screen.findByTestId('seletor-recusa')).toHaveTextContent(MOTIVO_SEM_PECA('/produtos/inexistente'))
    expect(produto.existe).toHaveBeenCalledTimes(1)
    expect(produto.existe).toHaveBeenCalledWith('inexistente')
    expect(onPick).not.toHaveBeenCalled()
  })

  it('/produtos/<peça à venda> entra, normalizado', async () => {
    digitar('/produtos/Colar-Leite/')
    await waitFor(() =>
      expect(onPick).toHaveBeenCalledWith({ target: { kind: 'link', href: '/produtos/colar-leite' }, label: 'Algo' }),
    )
    expect(produto.existe).toHaveBeenCalledWith('colar-leite')
  })

  it('a conferência da peça falhou ⇒ diz que não deu para conferir, e não entrega', async () => {
    produto.existe.mockResolvedValue(null)
    digitar('/produtos/colar')
    expect(await screen.findByTestId('seletor-recusa')).toHaveTextContent(MOTIVO_PECA_NAO_CONFERIDA)
    expect(onPick).not.toHaveBeenCalled()
  })

  it('/sobre/ e /SOBRE entram como /sobre', async () => {
    digitar('/SOBRE/')
    await waitFor(() =>
      expect(onPick).toHaveBeenCalledWith({ target: { kind: 'link', href: '/sobre' }, label: 'Algo' }),
    )
  })

  it('caminho de categoria ativa entra; caminho inventado recusa citando o digitado', async () => {
    digitar('/chaveiros')
    await waitFor(() =>
      expect(onPick).toHaveBeenCalledWith({ target: { kind: 'link', href: '/chaveiros' }, label: 'Algo' }),
    )
  })

  it('caminho que não é página recusa, sem consultar o banco', async () => {
    digitar('/rota-que-nao-existe-aqui')
    expect(await screen.findByTestId('seletor-recusa')).toHaveTextContent(MOTIVO_SEM_PAGINA('/rota-que-nao-existe-aqui'))
    expect(produto.existe).not.toHaveBeenCalled()
    expect(onPick).not.toHaveBeenCalled()
  })

  it('a página que JÁ está no menu: digitada em outra grafia, recusa como repetida', async () => {
    digitar('/Perguntas-Frequentes/', ['/perguntas-frequentes'])
    expect(await screen.findByTestId('seletor-recusa')).toHaveTextContent('Já está no menu')
    expect(onPick).not.toHaveBeenCalled()
  })

  it('a página que JÁ está no menu aparece na lista desabilitada, com o motivo (como a categoria)', () => {
    montar('submenu', [], ['/sobre'])
    fireEvent.click(screen.getByTestId('aba-pagina'))
    expect(screen.getByTestId('opcao-pagina-/sobre')).toBeDisabled()
    expect(screen.getByTestId('opcao-pagina-/sobre')).toHaveTextContent('Já está neste submenu')
    expect(screen.getByTestId(`opcao-pagina-${PAGINAS_DA_LOJA.find(p => p.path !== '/sobre')!.path}`)).not.toBeDisabled()
  })
})

describe('MNM-06 — celular: folha de baixo e alvos de 44px', () => {
  it('abaixo de `sm` o diálogo encosta embaixo (folha de baixo)', () => {
    montar()
    const folha = screen.getByTestId('seletor-do-menu')
    for (const token of ['max-sm:bottom-0', 'max-sm:top-auto', 'max-sm:translate-y-0', 'max-sm:rounded-t-2xl']) {
      expect(temToken(folha, token)).toBe(true)
    }
  })

  it('abas, linhas de categoria, linhas de página e botões medem ≥ 44px (token exato)', () => {
    montar()
    const alvos = [
      ...screen.getAllByRole('tab'),
      ...screen.getAllByTestId(/^opcao-categoria-/),
      screen.getByTestId('seletor-adicionar'),
      screen.getByRole('button', { name: 'Cancelar' }),
    ]
    fireEvent.click(screen.getByTestId('aba-pagina'))
    alvos.push(...screen.getAllByTestId(/^opcao-pagina-/))
    expect(alvos.length).toBeGreaterThan(8)
    for (const alvo of alvos) expect(temToken(alvo, 'min-h-11')).toBe(true)
  })

  it('SENSOR: a régua é de token — `min-h-110` não passaria', () => {
    const falso = document.createElement('button')
    falso.className = 'min-h-110 px-2'
    expect(temToken(falso, 'min-h-11')).toBe(false)
  })
})

/**
 * Q06b do QA da `86` — a 200 % em 390 a lista do seletor ficava com ~40 px entre o cabeçalho e o
 * rodapé (1 px em 360): a folha tinha 90 % da altura, a descrição ocupava três linhas e o rodapé
 * empilhava os dois botões. No celular a folha passa a ter a altura da tela, a descrição fica só para
 * o leitor de tela, o rodapé põe os dois botões lado a lado e a lista rola por dentro. Régua de
 * token exato; a altura medida em navegador está no bug.
 */
describe('Q06b — com a fonte grande, a lista do seletor tem altura útil', () => {
  it('no celular a folha ocupa a altura da tela, com respiro compacto', () => {
    montar()
    const folha = screen.getByTestId('seletor-do-menu')
    for (const t of ['max-sm:h-[calc(100dvh-8px)]', 'max-sm:max-h-[calc(100dvh-8px)]', 'max-sm:gap-2', 'max-sm:p-3']) {
      expect(temToken(folha, t), t).toBe(true)
    }
  })

  it('a descrição fica para o leitor de tela no celular, e o título não corre sob o X', () => {
    montar()
    const descricao = screen.getByText(/Escolha uma categoria ou uma página da loja/)
    expect(temToken(descricao, 'max-sm:sr-only')).toBe(true)
    const titulo = screen.getByRole('heading', { name: 'Adicionar item ao menu' })
    expect(temToken(titulo, 'pr-8')).toBe(true)
    expect(temToken(titulo, 'break-words')).toBe(true)
  })

  it('a lista é a parte que rola, e ocupa o que sobra', () => {
    montar()
    const lista = screen.getByTestId('lista-do-seletor')
    for (const t of ['min-h-0', 'flex-1', 'overflow-y-auto']) expect(temToken(lista, t), t).toBe(true)
  })

  it('o rodapé põe Cancelar e Adicionar lado a lado, e o texto deles quebra linha', () => {
    montar()
    const adicionar = screen.getByTestId('seletor-adicionar')
    expect(temToken(adicionar.parentElement!, 'flex-row')).toBe(true)
    // Medido a 200 % em 360–412: lado a lado sem embrulhar, o "Adicionar" ia até x = 423.
    expect(temToken(adicionar.parentElement!, 'flex-wrap')).toBe(true)
    for (const b of [adicionar, screen.getByRole('button', { name: 'Cancelar' })]) {
      for (const t of ['flex-1', 'whitespace-normal', 'h-auto', 'min-h-11']) expect(temToken(b, t), t).toBe(true)
    }
  })

  it('SENSOR: a régua acusa a folha de antes (90 % da altura, rodapé empilhado)', () => {
    const antiga = document.createElement('div')
    antiga.className = 'flex max-h-[90vh] flex-col gap-4 overflow-hidden max-sm:bottom-0'
    expect(temToken(antiga, 'max-sm:h-[calc(100dvh-8px)]')).toBe(false)
    const rodape = document.createElement('div')
    rodape.className = 'flex flex-col-reverse sm:flex-row sm:justify-end gap-2'
    expect(temToken(rodape, 'flex-row')).toBe(false)
  })
})

// R04 (paper cut do reteste da 86) — o seletor abria com o foco na ABA "Categoria", e quem chega por
// teclado ou leitor de tela tinha de andar até a busca. Abre com o foco na busca.
describe('R04 — o seletor abre com o foco na busca da aba Categoria', () => {
  it('ao abrir, document.activeElement é a busca, não a aba', async () => {
    montar()
    await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('busca-categoria')))
    expect(document.activeElement).not.toBe(screen.getByTestId('aba-categoria'))
  })
})

// S02 (QA r3, `BUG-20261029-seletor-reaberto-depois-da-aba-pagina-foca-a-aba`) — fechado na aba
// "Página da loja", o seletor reabria com o foco na ABA "Categoria": no primeiro quadro aberto o
// estado ainda era o da aba Página, a busca não existia, e o Radix punha o foco na primeira aba.
describe('S02 — reaberto depois da aba Página, volta à aba Categoria com o foco na busca', () => {
  const props = (open: boolean) => (
    <MenuTargetPicker
      open={open}
      onOpenChange={onOpenChange}
      modo="raiz"
      titulo="Adicionar item ao menu"
      categories={CATEGORIAS}
      usadas={new Set()}
      onPick={onPick}
    />
  )

  it.each([
    ['fechado na aba Página', false],
    ['fechado depois de uma recusa no "Outro endereço"', true],
  ])('%s ⇒ na reabertura, aba Categoria e foco na busca', async (_n, comRecusa) => {
    const { rerender } = render(props(true))
    await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('busca-categoria')))
    fireEvent.click(screen.getByTestId('aba-pagina'))
    if (comRecusa) {
      fireEvent.click(screen.getByTestId('opcao-pagina-outro'))
      fireEvent.change(screen.getByTestId('outro-endereco'), { target: { value: '/inventada' } })
      fireEvent.change(screen.getByTestId('nome-do-link'), { target: { value: 'X' } })
      fireEvent.click(screen.getByTestId('seletor-adicionar'))
      expect(await screen.findByTestId('seletor-recusa')).toBeInTheDocument()
    }
    expect(screen.getByTestId('aba-pagina')).toHaveAttribute('aria-selected', 'true')

    rerender(props(false))
    await waitFor(() => expect(screen.queryByTestId('seletor-do-menu')).toBeNull())
    rerender(props(true))

    await waitFor(() => expect(screen.getByTestId('aba-categoria')).toHaveAttribute('aria-selected', 'true'))
    await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('busca-categoria')))
    expect(document.activeElement).not.toBe(screen.getByTestId('aba-categoria'))
    expect(screen.queryByTestId('seletor-recusa')).toBeNull()
  })
})

// R05 (paper cut do reteste da 86) — a 200 % o seletor cortava caminhos e nomes com reticências
// ("Joias afetivas › Linha Dente de L…"). As linhas embrulham. Régua por token EXATO
// (`truncate` não pode aparecer; `break-words` sim — e `'break-words'.includes('words')` não engana).
describe('R05 — as linhas do seletor embrulham em vez de cortar', () => {
  const comToken = (raiz: Element, token: string) =>
    Array.from(raiz.querySelectorAll('[class]')).filter(el =>
      (el.getAttribute('class') ?? '').split(/\s+/).includes(token),
    )

  it('aba Categoria: nenhum `truncate`; nome e caminho com `break-words`', () => {
    montar()
    const lista = screen.getByTestId('lista-do-seletor')
    expect(comToken(lista, 'truncate')).toEqual([])
    const opcao = screen.getByTestId('opcao-categoria-aneis')
    expect(within(opcao).getByText('Anéis').className.split(/\s+/)).toContain('break-words')
    const caminho = Array.from(opcao.querySelectorAll('span')).find(s => s.textContent?.includes('›'))!
    expect(temToken(caminho, 'break-words')).toBe(true)
  })

  it('aba Página da loja: nenhum `truncate`; título e caminho com `break-words`', () => {
    montar()
    fireEvent.click(screen.getByTestId('aba-pagina'))
    const lista = screen.getByTestId('lista-do-seletor')
    expect(comToken(lista, 'truncate')).toEqual([])
    const p = PAGINAS_DA_LOJA[0]
    const opcao = screen.getByTestId(`opcao-pagina-${p.path}`)
    const spans = Array.from(opcao.querySelectorAll('span'))
    expect(temToken(spans.find(s => s.textContent === p.titulo)!, 'break-words')).toBe(true)
    expect(temToken(spans.find(s => s.textContent === p.path)!, 'break-words')).toBe(true)
  })
})

/** Fidelidade ao protótipo (2026-10-29): abas em pílula, CTA em gradiente, sem o hover rosa. */
describe('o seletor no desenho do protótipo', () => {
  it('as abas são pílula segmentada; a escolhida é o cartão branco', () => {
    montar()
    const lista = screen.getByRole('tablist', { name: 'O que adicionar' })
    expect(temToken(lista, 'bg-estrelinha-admin-elevated')).toBe(true)
    expect(temToken(lista, 'rounded-xl')).toBe(true)
    expect(temToken(screen.getByTestId('aba-categoria'), 'bg-estrelinha-admin-card')).toBe(true)
    expect(temToken(screen.getByTestId('aba-categoria'), 'border-b-2')).toBe(false)
    expect(temToken(screen.getByTestId('aba-pagina'), 'bg-estrelinha-admin-card')).toBe(false)
  })

  it('Adicionar é o CTA; Cancelar é contorno sem o rosa no hover', () => {
    montar()
    expect(temToken(screen.getByTestId('seletor-adicionar'), 'gradient-cta')).toBe(true)
    const cancelar = screen.getByRole('button', { name: 'Cancelar' })
    expect(temToken(cancelar, 'hover:bg-accent')).toBe(false)
    expect(temToken(cancelar, 'hover:bg-estrelinha-admin-card-hover')).toBe(true)
  })

  it('a opção escolhida ganha borda violeta e anel; a livre, hover de borda violeta', () => {
    montar()
    const [primeira] = screen.getAllByTestId(/^opcao-categoria-/).filter(b => !(b as HTMLButtonElement).disabled)
    expect(temToken(primeira, 'hover:border-estrelinha-admin-violet')).toBe(true)
    fireEvent.click(primeira)
    expect(temToken(primeira, 'border-estrelinha-admin-violet')).toBe(true)
    expect(temToken(primeira, 'ring-2')).toBe(true)
  })
})
