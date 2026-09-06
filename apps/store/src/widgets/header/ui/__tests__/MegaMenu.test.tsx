import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { MenuItem, ResolvedMenuBanner } from '@estrelinha/core/menu'
import { renditionSrcSet, renditionUrl } from '@estrelinha/core/media'
import MegaMenu from '../MegaMenu'

/**
 * A barra de departamentos e o painel — boards "Desktop Mega Menu Open - v3" e `DDR-0`.
 *
 * Feature 16: MENU-11 (hover abre com filhas), MENU-12 (teclado), MENU-14 (sem painel = link
 * direto), MENU-15 (sair fecha).
 * Feature 39: NAV-12 (link é link direto), NAV-17/18 (ícone, e sem ícone não reserva vaga),
 * NAV-22/24 (filhas curadas em colunas de até 8), NAV-25, NAV-26 ("ver tudo em X"), NAV-28/35
 * (banners, e sem banner o painel encolhe), NAV-11 (externo em nova aba).
 *
 * **Duas quedas declaradas nesta reescrita**, e as duas são superfícies que deixaram de existir:
 *
 * - os 3 casos de `MENU-13` (a faixa "Em destaque" de 3 produtos automáticos), removida por decisão
 *   do usuário — eram peças que a Adri não escolhia nem via;
 * - os 3 casos de `MENU-27/28` (o card `menu_promo`, um retângulo de cor sem imagem), substituído
 *   pelos banners com arte, que têm cobertura própria aqui e em `useMenuTargets.test.tsx`.
 */

const { bannersState, previewState } = vi.hoisted(() => ({
  bannersState: { lista: [] as ResolvedMenuBanner[] },
  previewState: { preview: false, draft: null as unknown, openId: null as string | null },
}))

// O painel resolve os banners por hook, e o que ele resolve tem teste próprio
// (`entities/menu/api/__tests__/useMenuTargets.test.tsx`). Aqui interessa o DESENHO.
vi.mock('@/entities/menu', () => ({
  useMenuBanners: () => bannersState.lista,
  useMenuPreview: () => previewState,
}))

const filha = (id: string, name: string) => ({ id, name, slug: id }) as never

const categoria = (over: Partial<MenuItem> & { id: string; name: string }): MenuItem =>
  ({
    kind: 'category',
    slug: over.id,
    // `AD-018`: o href da entrada é a canônica que `menuItems` monta — raiz, um segmento.
    href: `/${over.id}`,
    path: over.name,
    icon: null,
    sortOrder: 0,
    children: [],
    hasPanel: false,
    ...over,
  }) as MenuItem

const link = (over: Partial<MenuItem> & { id: string; name: string }): MenuItem =>
  ({
    kind: 'link',
    href: `/${over.id}`,
    icon: null,
    sortOrder: 0,
    external: false,
    ...over,
  }) as MenuItem

const banner = (over: Partial<ResolvedMenuBanner> = {}): ResolvedMenuBanner => ({
  badge: null,
  title: 'Árvore da Vida',
  subtitle: null,
  href: '/joias/arvore',
  external: false,
  image: null,
  imageReused: false,
  ...over,
})

const AFETIVAS = categoria({
  id: 'afetivas',
  name: 'Coleção Afetivas',
  children: [filha('cinzas', 'Cinzas de cremação'), filha('leite', 'Leite materno')],
  hasPanel: true,
})
const CORRENTES = categoria({ id: 'correntes', name: 'Correntes' })

const renderMenu = (items: MenuItem[] = [AFETIVAS, CORRENTES]) =>
  render(
    <MemoryRouter>
      <MegaMenu items={items} />
    </MemoryRouter>,
  )

/** O painel abre com espera de intenção — os timers precisam avançar. */
const hover = (name: string) => {
  fireEvent.pointerEnter(screen.getByRole('link', { name }))
  act(() => vi.advanceTimersByTime(200))
}

beforeEach(() => {
  vi.useFakeTimers()
  bannersState.lista = []
  previewState.preview = false
  previewState.draft = null
  previewState.openId = null
})

// Obrigatório: o `afterAll` de `src/test/setup.ts` espera 100ms **reais** (drenar os timers do
// `input-otp`). Com os fake timers ainda instalados, aquele `setTimeout` nunca dispara e o hook
// estoura em 10s — a suíte fica verde e o ARQUIVO falha.
afterEach(() => {
  vi.useRealTimers()
})

describe('MENU-11 — hover abre o painel', () => {
  it('mostra as subcategorias curadas e o "ver tudo em X" (NAV-22, NAV-26)', () => {
    renderMenu()
    expect(screen.queryByTestId('mega-menu-painel')).toBeNull()

    hover('Coleção Afetivas')
    const painel = screen.getByTestId('mega-menu-painel')
    expect(painel).toHaveTextContent('Cinzas de cremação')
    expect(painel).toHaveTextContent('Leite materno')
    // O rótulo nomeia o destino: "ver tudo" sozinho não diz para onde vai.
    expect(screen.getByRole('link', { name: 'ver tudo em Coleção Afetivas' })).toHaveAttribute(
      'href',
      '/afetivas',
    )
  })

  it('as subcategorias levam à própria página de coleção, com o pai na frente (AD-018)', () => {
    // A canônica de uma subcategoria tem DOIS segmentos, e o pai é a própria entrada do painel.
    // Com um segmento só o link resolveria, mas apontaria para a forma secundária.
    renderMenu()
    hover('Coleção Afetivas')
    expect(screen.getByRole('link', { name: 'Cinzas de cremação' })).toHaveAttribute(
      'href',
      '/afetivas/cinzas',
    )
  })

  it('não abre no primeiro pixel: a espera de intenção evita um painel por item ao atravessar', () => {
    renderMenu()
    fireEvent.pointerEnter(screen.getByRole('link', { name: 'Coleção Afetivas' }))
    expect(screen.queryByTestId('mega-menu-painel')).toBeNull()
    act(() => vi.advanceTimersByTime(200))
    expect(screen.getByTestId('mega-menu-painel')).toBeInTheDocument()
  })
})

describe('MENU-12 — teclado', () => {
  it('foco abre o painel', () => {
    renderMenu()
    fireEvent.focus(screen.getByRole('link', { name: 'Coleção Afetivas' }))
    expect(screen.getByTestId('mega-menu-painel')).toBeInTheDocument()
  })

  it('Esc fecha E devolve o foco à entrada', () => {
    renderMenu()
    const trigger = screen.getByRole('link', { name: 'Coleção Afetivas' })
    fireEvent.focus(trigger)
    fireEvent.keyDown(trigger, { key: 'Escape' })

    expect(screen.queryByTestId('mega-menu-painel')).toBeNull()
    // Sem devolver o foco, o teclado voltaria ao começo do documento a cada painel fechado.
    expect(document.activeElement).toBe(trigger)
  })

  it('a trava do foco é de UM evento: o Tab seguinte volta a abrir', () => {
    // Sem a trava o `.focus()` de dentro do handler dispara o `onFocus` da entrada, o painel reabre
    // no mesmo tique e o `Esc` fica inútil no teclado. Este garante que a trava não fica presa.
    renderMenu()
    const trigger = screen.getByRole('link', { name: 'Coleção Afetivas' })
    fireEvent.focus(trigger)
    fireEvent.keyDown(trigger, { key: 'Escape' })
    expect(screen.queryByTestId('mega-menu-painel')).toBeNull()

    fireEvent.focus(trigger)
    expect(screen.getByTestId('mega-menu-painel')).toBeInTheDocument()
  })

  it('aria-expanded acompanha o painel', () => {
    renderMenu()
    const trigger = screen.getByRole('link', { name: 'Coleção Afetivas' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.focus(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })
})

describe('NAV-25 — entrada sem painel é link direto', () => {
  it('sem filha curada e sem banner, o hover não abre nada', () => {
    renderMenu()
    hover('Correntes')
    expect(screen.queryByTestId('mega-menu-painel')).toBeNull()
  })

  it('e a entrada não anuncia painel nenhum para o leitor de tela', () => {
    renderMenu()
    const trigger = screen.getByRole('link', { name: 'Correntes' })
    expect(trigger).not.toHaveAttribute('aria-expanded')
    expect(trigger).toHaveAttribute('href', '/correntes')
  })

  it('só com banner (sem filha) o painel ABRE — o anúncio é conteúdo suficiente', () => {
    bannersState.lista = [banner()]
    renderMenu([categoria({ id: 'joias', name: 'Joias', hasPanel: true })])
    hover('Joias')
    expect(screen.getByTestId('mega-menu-painel')).toBeInTheDocument()
    // Sem filha, não há coluna de subcategorias nem "ver tudo em X".
    expect(screen.queryByRole('link', { name: /^ver tudo em/ })).toBeNull()
    expect(screen.getByTestId('mega-menu-banners')).toBeInTheDocument()
  })
})

describe('MENU-15 — sair fecha', () => {
  it('pointerleave do conjunto fecha o painel', () => {
    const { container } = renderMenu()
    hover('Coleção Afetivas')
    fireEvent.pointerLeave(container.firstChild!)
    act(() => vi.advanceTimersByTime(300))
    expect(screen.queryByTestId('mega-menu-painel')).toBeNull()
  })

  it('entrar no painel cancela o fechamento — o salto de 1px não pode fechá-lo', () => {
    const { container } = renderMenu()
    hover('Coleção Afetivas')
    fireEvent.pointerLeave(container.firstChild!)
    fireEvent.pointerEnter(screen.getByTestId('mega-menu-painel'))
    act(() => vi.advanceTimersByTime(300))
    expect(screen.getByTestId('mega-menu-painel')).toBeInTheDocument()
  })
})

/**
 * A classe traz **exatamente** este token — nunca um que comece com ele.
 *
 * `toContain('text-estrelinha-accent')` casa `text-estrelinha-accent-strong`, e os dois são tons
 * diferentes para fundos diferentes (`accent` na faixa escura, `accent-strong` na folha branca). Um
 * `\b` no fim não resolve: `-` não é caractere de palavra, então `\b` casaria antes do hífen. O que
 * fecha a régua é recusar hífen e caractere de palavra logo depois do token.
 */
const temToken = (classe: string | null, token: string): boolean =>
  new RegExp(`(?:^|\\s)${token}(?![-\\w])`).test(classe ?? '')

describe('NAV-17 / NAV-18 — o ícone da entrada', () => {
  it('o item com ícone desenha o glifo do catálogo à esquerda do nome', () => {
    const { container } = renderMenu([categoria({ id: 'correntes', name: 'Correntes', icon: 'corrente' })])
    const entrada = screen.getByRole('link', { name: 'Correntes' })

    const svg = entrada.querySelector('svg')!
    expect(svg).toBeTruthy()
    // O ícone vem de `@estrelinha/ui/icons`, o MESMO conjunto que o seletor do painel desenha:
    // grade 0 0 24 24, contorno em `currentColor`.
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24')
    expect(container.querySelector('svg')!.querySelector('path')!.getAttribute('stroke')).toBe(
      'currentColor',
    )
  })

  it('o ícone sai em `accent` — e NÃO em `accent-strong` (NAV-20)', () => {
    // Ouro como TEXTO ali mediria 3,26:1 e reprovaria os 4,5:1; como objeto gráfico a régua é 3:1, e
    // `accent` passa. `accent-strong` é o tom da folha BRANCA do celular — sobre a faixa escura ele
    // mede menos, e a AC opõe os dois de propósito. Por isso a régua é de token exato: um
    // `toContain('text-estrelinha-accent')` casa `text-estrelinha-accent-strong` também, e o mutante
    // que troca um pelo outro passaria batido.
    renderMenu([categoria({ id: 'correntes', name: 'Correntes', icon: 'corrente' })])
    const svg = screen.getByRole('link', { name: 'Correntes' }).querySelector('svg')!

    expect(temToken(svg.getAttribute('class'), 'text-estrelinha-accent')).toBe(true)
    expect(temToken(svg.getAttribute('class'), 'text-estrelinha-accent-strong')).toBe(false)
  })

  it('o RÓTULO continua em `on-primary` — a outra metade da NAV-20', () => {
    // **A metade que não tinha asserção nenhuma, e cujo mutante sobreviveu**: tirar
    // `text-estrelinha-on-primary` de `NAV_ITEM` deixava os 2182 testes da loja verdes. O rótulo
    // passaria a herdar cor sobre a faixa `primary` escura, e nenhum outro guarda pega — `contrast`
    // mede tokens, não o uso do token aqui, e `accentText` mede quem pinta ouro.
    renderMenu([categoria({ id: 'correntes', name: 'Correntes', icon: 'corrente' })])
    const entrada = screen.getByRole('link', { name: 'Correntes' })

    expect(temToken(entrada.getAttribute('class'), 'text-estrelinha-on-primary')).toBe(true)
    // E o ouro NÃO é o rótulo: as duas pistas do item são o ícone e a régua de 2px, nunca a cor do
    // texto. Ouro como texto sobre `primary` mede 3,26:1 e reprova os 4,5:1.
    expect(temToken(entrada.getAttribute('class'), 'text-estrelinha-accent')).toBe(false)
  })

  it('SENSOR: a régua de token distingue `accent` de `accent-strong`', () => {
    // Sem este par, as duas asserções acima poderiam estar medindo com um `toContain` disfarçado —
    // que é exatamente o defeito que elas existem para consertar.
    expect(temToken('h-4 w-4 text-estrelinha-accent-strong', 'text-estrelinha-accent')).toBe(false)
    expect(temToken('h-4 w-4 text-estrelinha-accent', 'text-estrelinha-accent')).toBe(true)
    expect(temToken('text-estrelinha-accent', 'text-estrelinha-accent')).toBe(true)
    expect(temToken(null, 'text-estrelinha-accent')).toBe(false)
  })

  it('item SEM ícone não reserva vaga vazia', () => {
    renderMenu([categoria({ id: 'correntes', name: 'Correntes' })])
    expect(screen.getByRole('link', { name: 'Correntes' }).querySelector('svg')).toBeNull()
  })

  it('chave de ícone que o catálogo não conhece já chegou como `null` — a barra não quebra', () => {
    // `menuIconKey` degrada em silêncio dentro de `menuItems` (`NAV-19`), então o que chega aqui é
    // sempre desenhável. Este caso prova que o componente não tenta desenhar o indesenhável.
    renderMenu([categoria({ id: 'correntes', name: 'Correntes', icon: null })])
    expect(screen.getByRole('link', { name: 'Correntes' }).querySelector('svg')).toBeNull()
  })

  it('a seta só aparece em quem abre painel', () => {
    renderMenu()
    // "Coleção Afetivas" tem painel: leva ícone de seta (um `svg` de chevron).
    expect(screen.getByRole('link', { name: 'Coleção Afetivas' }).querySelectorAll('svg')).toHaveLength(1)
    // "Correntes" não tem: nenhum `svg` — nem ícone, nem seta.
    expect(screen.getByRole('link', { name: 'Correntes' }).querySelectorAll('svg')).toHaveLength(0)
  })
})

describe('NAV-12 — item de link é link direto', () => {
  it('interno vira `<a href>` de rota, sem painel, sem seta e sem aria-expanded', () => {
    renderMenu([link({ id: 'sobre', name: 'Sobre' })])
    const item = screen.getByRole('link', { name: 'Sobre' })

    expect(item).toHaveAttribute('href', '/sobre')
    expect(item).not.toHaveAttribute('aria-expanded')
    expect(item.querySelectorAll('svg')).toHaveLength(0)

    hover('Sobre')
    expect(screen.queryByTestId('mega-menu-painel')).toBeNull()
  })

  it('externo abre em nova aba com `noopener noreferrer` (NAV-11)', () => {
    renderMenu([
      link({ id: 'blog', name: 'Blog', href: 'https://exemplo.com/blog', external: true }),
    ])
    const item = screen.getByRole('link', { name: 'Blog' })

    expect(item).toHaveAttribute('href', 'https://exemplo.com/blog')
    expect(item).toHaveAttribute('target', '_blank')
    expect(item).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('o link também pode ter ícone — é o mesmo conjunto da categoria (NAV-17)', () => {
    renderMenu([link({ id: 'sobre', name: 'Sobre', icon: 'estrela' })])
    expect(screen.getByRole('link', { name: 'Sobre' }).querySelector('svg')).toBeTruthy()
  })
})

describe('NAV-24 — as colunas do painel', () => {
  const muitas = (quantas: number) =>
    Array.from({ length: quantas }, (_, i) => filha(`f${i}`, `Filha ${i}`))

  it('até 8 filhas cabem numa coluna só', () => {
    renderMenu([categoria({ id: 'joias', name: 'Joias', children: muitas(8), hasPanel: true })])
    hover('Joias')
    expect(screen.getByTestId('mega-menu-painel').querySelectorAll('.w-\\[220px\\]')).toHaveLength(1)
  })

  it('a nona abre a segunda coluna, e a ordem da árvore é preservada', () => {
    renderMenu([categoria({ id: 'joias', name: 'Joias', children: muitas(9), hasPanel: true })])
    hover('Joias')
    const colunas = screen.getByTestId('mega-menu-painel').querySelectorAll('.w-\\[220px\\]')

    expect(colunas).toHaveLength(2)
    // Enche a primeira antes de abrir a segunda: distribuir "equilibrado" faria a nona filha mudar
    // a décima de coluna sem nada ter mudado nela.
    expect(colunas[0].textContent).toContain('Filha 7')
    expect(colunas[1].textContent).toBe('Filha 8')
  })
})

describe('NAV-28 / NAV-35 — os banners do painel', () => {
  it('renderiza selo, título, texto e leva ao destino', () => {
    bannersState.lista = [
      banner({
        badge: 'NOVIDADE',
        title: 'Árvore da Vida',
        subtitle: 'Com cinzas, mecha ou leite.',
        href: '/joias/arvore',
      }),
    ]
    renderMenu()
    hover('Coleção Afetivas')

    const card = screen.getByRole('link', { name: /Árvore da Vida/ })
    expect(card).toHaveAttribute('href', '/joias/arvore')
    expect(card).toHaveTextContent('NOVIDADE')
    expect(card).toHaveTextContent('Com cinzas, mecha ou leite.')
  })

  it('desenha os DOIS quando há dois', () => {
    bannersState.lista = [banner({ title: 'Um' }), banner({ title: 'Dois', href: '/dois' })]
    renderMenu()
    hover('Coleção Afetivas')
    expect(screen.getByTestId('mega-menu-banners').children).toHaveLength(2)
  })

  it('com arte, sai um `<img>` preguiçoso; sem arte, nenhum quadro vazio (NAV-32)', () => {
    bannersState.lista = [banner({ image: 'https://cdn.test/arvore.webp' })]
    renderMenu()
    hover('Coleção Afetivas')
    const img = screen.getByTestId('mega-menu-banners').querySelector('img')!
    expect(img).toHaveAttribute('src', 'https://cdn.test/arvore.webp')
    expect(img).toHaveAttribute('loading', 'lazy')
    // `alt` vazio: o card inteiro é o link e o título já o nomeia.
    expect(img).toHaveAttribute('alt', '')
  })

  it('a arte é pedida NO TAMANHO DA VAGA — 320px, e o `srcset` com as duas larguras', () => {
    // A vaga do banner do computador tem 320px fixos. Servir o original de 1024 aqui era o que a
    // feature 38 chamou de "pedir a foto grande para desenhar a pequena" — e são até DOIS por
    // painel. A URL de rendição vem de `@estrelinha/core/media`, que só existia na `master` quando
    // a 39 foi escrita: o merge das duas é o que tornou esta linha possível.
    const arte =
      'https://proj.supabase.co/storage/v1/object/public/menu-images/banners/arvore.webp'
    bannersState.lista = [banner({ image: arte })]
    renderMenu()
    hover('Coleção Afetivas')

    const img = screen.getByTestId('mega-menu-banners').querySelector('img')!
    // `src` no dobro da vaga: é o candidato de DPR 2, e o que um navegador sem `srcset` usa.
    expect(img.getAttribute('src')).toBe(renditionUrl(arte, 640))
    expect(img.getAttribute('src')).toContain('/render/image/public/')
    expect(img.getAttribute('srcset')).toBe(renditionSrcSet(arte, [320, 640]))
    expect(img.getAttribute('sizes')).toBe('320px')
    // E o original NÃO sai mais como está: sem esta asserção, um `renditionUrl` que devolvesse a
    // entrada intacta passaria nas três acima.
    expect(img.getAttribute('src')).not.toBe(arte)
  })

  it('arte de fora do Storage sai INALTERADA, e sem `srcset` inventado', () => {
    // O par do caso acima. Banner de campanha hospedado em terceiro não tem `render/image`:
    // reescrever a URL dele seria apontar para um endpoint que não existe, e o card ficaria sem
    // foto — em silêncio, porque o `<img>` continua na árvore.
    bannersState.lista = [banner({ image: 'https://cdn.test/arvore.webp' })]
    renderMenu()
    hover('Coleção Afetivas')

    const img = screen.getByTestId('mega-menu-banners').querySelector('img')!
    expect(img).toHaveAttribute('src', 'https://cdn.test/arvore.webp')
    expect(img.getAttribute('srcset')).toBeNull()
  })

  it('sem arte o card fica só com o texto', () => {
    bannersState.lista = [banner({ image: null })]
    renderMenu()
    hover('Coleção Afetivas')
    expect(screen.getByTestId('mega-menu-banners').querySelector('img')).toBeNull()
    expect(screen.getByTestId('mega-menu-banners')).toHaveTextContent('Árvore da Vida')
  })

  it('banner externo sai com `target` e `rel` (NAV-11)', () => {
    bannersState.lista = [
      banner({ href: 'https://exemplo.com/campanha', external: true, title: 'Campanha' }),
    ]
    renderMenu()
    hover('Coleção Afetivas')

    const card = screen.getByRole('link', { name: /Campanha/ })
    expect(card).toHaveAttribute('target', '_blank')
    expect(card).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('sem banner nenhum, o painel ENCOLHE — nenhum nó reservado (NAV-35)', () => {
    bannersState.lista = []
    renderMenu()
    hover('Coleção Afetivas')
    expect(screen.queryByTestId('mega-menu-banners')).toBeNull()
    // …e o painel continua útil, com as colunas.
    expect(screen.getByTestId('mega-menu-painel')).toHaveTextContent('Cinzas de cremação')
  })

  it('selo ausente não renderiza pílula vazia', () => {
    bannersState.lista = [banner({ badge: null })]
    renderMenu()
    hover('Coleção Afetivas')
    expect(screen.getByTestId('mega-menu-banners').textContent).toBe('Árvore da Vida')
  })
})

describe('barra vazia', () => {
  it('sem item nenhum não renderiza nada — nem o contêiner vazio (NAV-15)', () => {
    const { container } = renderMenu([])
    expect(container).toBeEmptyDOMElement()
  })
})

describe('NAV-04 — a forma que produz a rolagem', () => {
  it('a fila de itens é `min-w-max` e NUNCA `flex-wrap`', () => {
    // jsdom não mede largura, então o que se prova é a forma: `min-w-max` impede a fila de encolher
    // dentro do `overflow-x-auto` do `<nav>`, e `flex-wrap` esconderia o estouro em duas linhas.
    const { container } = renderMenu()
    const fila = container.firstElementChild!

    expect(fila.className).toContain('min-w-max')
    expect(fila.className).not.toContain('flex-wrap')
  })
})

describe('NAV-43 — na prévia, o palco diz qual painel abrir', () => {
  it('o painel da entrada pedida já está aberto, SEM hover nenhum', () => {
    // É o que a AC pede: a Adri está com o mouse no editor, fora do iframe, e o mega menu só abre
    // por hover. Sem esta ponte ela teria de entrar na prévia a cada mudança para conferi-la.
    previewState.preview = true
    previewState.openId = 'afetivas'
    renderMenu()

    expect(screen.getByTestId('mega-menu-painel')).toHaveTextContent('Cinzas de cremação')
  })

  it('`null` fecha o que estava aberto', () => {
    previewState.preview = true
    previewState.openId = 'afetivas'
    const { rerender } = renderMenu()
    expect(screen.getByTestId('mega-menu-painel')).toBeInTheDocument()

    previewState.openId = null
    rerender(
      <MemoryRouter>
        <MegaMenu items={[AFETIVAS, CORRENTES]} />
      </MemoryRouter>,
    )

    expect(screen.queryByTestId('mega-menu-painel')).toBeNull()
  })

  it('FORA do modo prévia o pedido é ignorado — a barra da cliente não abre sozinha', () => {
    // A trava é `preview`, não a presença do id: sem ela, uma mensagem alheia que chegasse numa aba
    // comum abriria o mega menu na cara da cliente.
    previewState.preview = false
    previewState.openId = 'afetivas'
    renderMenu()

    expect(screen.queryByTestId('mega-menu-painel')).toBeNull()
  })
})
