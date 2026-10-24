// Feature 72, T09 — as quatro abas, pela árvore REAL (`<App />` com sessão admin) — `MAF-14`,
// `MAF-15`, `MAF-17`, `MAF-18` e o rodapé do Backoffice.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { House, ShoppingBag, Tag, Users } from 'lucide-react'
import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fake } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'
import { TABS } from '../model/tabs'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

beforeEach(() => {
  fake.reset()
  fake.comSessao('adri@exemplo.invalid', { admin: true })
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

const temToken = (el: Element, token: string) => el.getAttribute('class')!.split(/\s+/).includes(token)

/** O desenho (o miolo do `<svg>`) do componente de ícone declarado, renderizado à parte. */
const desenhoDe = (Icon: (typeof TABS)[number]['icon']) => {
  const caixa = document.createElement('div')
  caixa.innerHTML = renderToStaticMarkup(createElement(Icon))
  const svg = caixa.querySelector('svg')
  if (!svg) throw new Error('o ícone declarado não desenhou svg')
  return svg.innerHTML
}

const barra = async () => within(await screen.findByRole('navigation', { name: 'Áreas do ateliê' }))

describe('a barra das abas (MAF-14)', () => {
  it('as quatro abas, na ordem de TABS, com o rótulo VISÍVEL', async () => {
    await montarApp('/')
    const links = (await barra()).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual(['Início', 'Pedidos', 'Clientes', 'Descontos'])
    expect(links.map((l) => l.getAttribute('href'))).toEqual(TABS.map((t) => t.path))
    // O rótulo é texto do link, não `sr-only` nem só `aria-label`.
    for (const l of links) expect(l.querySelector('.sr-only')).toBeNull()
  })

  it('aria-current="page" só na aba atual — e a raiz não fica marcada nas outras', async () => {
    await montarApp('/clientes')
    const links = (await barra()).getAllByRole('link')
    expect(links.map((l) => l.getAttribute('aria-current'))).toEqual([null, null, 'page', null])
  })

  it('cada aba desenha O SEU ícone — casa, sacola, pessoas, etiqueta —, decorativo (aria-hidden)', async () => {
    // O par aba → ícone vem do design (`design.md`, linha "Ícones"), escrito por extenso: derivar a
    // expectativa de TABS deixaria passar a troca de dois ícones DENTRO de TABS.
    const esperado: Record<string, (typeof TABS)[number]['icon']> = { Início: House, Pedidos: ShoppingBag, Clientes: Users, Descontos: Tag }
    expect(TABS.map((t) => t.label)).toEqual(Object.keys(esperado))
    const declarados = TABS.map((t) => desenhoDe(esperado[t.label]))
    // Âncora: os quatro desenhos são distintos; sem isso, trocar dois ícones iguais seria invisível.
    expect(new Set(declarados).size).toBe(TABS.length)
    await montarApp('/')
    const links = (await barra()).getAllByRole('link')
    expect(links).toHaveLength(TABS.length)
    links.forEach((link, i) => {
      const svgs = link.querySelectorAll('svg')
      expect(svgs).toHaveLength(1)
      expect(svgs[0]).toHaveAttribute('aria-hidden', 'true')
      expect(svgs[0].innerHTML).toBe(declarados[i])
    })
  })

  it('cada aba tem alvo de 48 px (min-h-12, token exato)', async () => {
    await montarApp('/')
    for (const l of (await barra()).getAllByRole('link')) expect(temToken(l, 'min-h-12')).toBe(true)
  })

  it('tocar numa aba navega, marca a nova e empilha no histórico — o voltar do Android é o do navegador (MAF-17)', async () => {
    await montarApp('/')
    fireEvent.click((await barra()).getByRole('link', { name: 'Pedidos' }))
    expect(window.location.pathname).toBe('/pedidos')
    expect(screen.getByRole('heading', { level: 1, name: 'Pedidos' })).toBeInTheDocument()
    expect((await barra()).getByRole('link', { name: 'Pedidos' })).toHaveAttribute('aria-current', 'page')
    await act(async () => {
      window.history.back()
      await vi.advanceTimersByTimeAsync(50)
    })
    expect(window.location.pathname).toBe('/')
  })
})

describe('a barra e a área do sistema (MAF-15)', () => {
  it('a barra é fixa no rodapé e respeita o inset inferior', async () => {
    await montarApp('/')
    const nav = screen.getByRole('navigation', { name: 'Áreas do ateliê' })
    for (const t of ['fixed', 'bottom-0', 'pb-[env(safe-area-inset-bottom)]']) expect(temToken(nav, t)).toBe(true)
  })

  it('a reserva da barra vem DEPOIS do rodapé do Backoffice, com a altura da barra mais o inset', async () => {
    await montarApp('/')
    const rodape = screen.getByTestId('rodape-backoffice')
    const reserva = screen.getByTestId('reserva-da-barra')
    expect(rodape.compareDocumentPosition(reserva) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // A barra mede h-16 (4rem); a reserva é 4rem + o inset, a mesma soma.
    expect(temToken(screen.getByRole('navigation', { name: 'Áreas do ateliê' }).querySelector('ul')!, 'h-16')).toBe(true)
    expect(temToken(reserva, 'h-[calc(4rem+env(safe-area-inset-bottom))]')).toBe(true)
    // Borda somaria 1 px à barra e a reserva ficaria curta (medido em navegador na T15).
    const nav = screen.getByRole('navigation', { name: 'Áreas do ateliê' })
    expect(nav.getAttribute('class')!.split(/\s+/).some((c) => /^border(-[tb])?$|^border-[tb]-?\d*$/.test(c))).toBe(false)
  })
})

describe('as abas nesta feature (MAF-18)', () => {
  // MUDANÇA DE ASSERÇÃO DECLARADA (feature `73`, T18): a Início saiu do "em construção" — ela agora
  // lê `store_movement` e `store_overview` (provado em `pages/__tests__/InicioPage.test.tsx`). Saem
  // daqui SÓ o `/` e a régua `leiturasDeDado()` dele. As outras três abas continuam com a régua
  // inteira, e a vizinha abaixo escreve as três por extenso: derivar de TABS deixaria uma quarta aba
  // nova (ou a saída de uma delas) passar calada.
  //
  // MUDANÇA DE ASSERÇÃO DECLARADA (feature `74`, T21): Pedidos saiu do "em construção" — a lista lê
  // `order_list` com a confirmação de papel (provado em `pages/__tests__/PedidosPage.test.tsx`). Sai
  // daqui SÓ o `/pedidos`, pelo mesmo molde da Início; Clientes e Descontos seguem com a régua inteira.
  const EM_CONSTRUCAO = TABS.filter((t) => t.path !== '/' && t.path !== '/pedidos')

  it('as abas que seguem em construção são exatamente Clientes e Descontos', () => {
    expect(EM_CONSTRUCAO.map((t) => [t.path, t.label])).toEqual([
      ['/clientes', 'Clientes'],
      ['/descontos', 'Descontos'],
    ])
  })

  it('a Início NÃO é mais "em construção"', async () => {
    await montarApp('/')
    expect(screen.getByRole('main').textContent).not.toContain('Esta parte do app chega em breve.')
  })

  it('Pedidos NÃO é mais "em construção" (feature `74`)', async () => {
    await montarApp('/pedidos')
    const main = screen.getByRole('main')
    expect(within(main).getByRole('heading', { level: 1 })).toHaveTextContent('Pedidos')
    expect(main.textContent).not.toContain('Esta parte do app chega em breve.')
  })

  it.each(EM_CONSTRUCAO.map((t) => [t.path, t.label]))('%s mostra o título "%s" e o estado em construção, sem dado nenhum', async (caminho, titulo) => {
    await montarApp(caminho)
    const main = screen.getByRole('main')
    expect(within(main).getByRole('heading', { level: 1 })).toHaveTextContent(titulo)
    expect(main.textContent).toBe(`${titulo}Esta parte do app chega em breve.`)
    // Nenhum número (valor, contagem, pedido) e nenhuma leitura de dado da loja além do resumo que o
    // SELO da aba Pedidos lê em qualquer aba (feature `74`, `MAP-31`): a página em si não lê nada.
    expect(main.textContent).not.toMatch(/\d/)
    expect(fake.leiturasDeDado()).toEqual(['rpc:store_overview'])
  })
})

describe('o rodapé do Backoffice', () => {
  it('com VITE_BACKOFFICE_URL, a frase e o link para o painel', async () => {
    vi.stubEnv('VITE_BACKOFFICE_URL', 'https://painel.exemplo.invalid')
    await montarApp('/')
    const rodape = screen.getByTestId('rodape-backoffice')
    expect(rodape).toHaveTextContent('Produtos, vitrine e configurações da loja seguem no Backoffice.')
    expect(within(rodape).getByRole('link', { name: 'Abrir o Backoffice' })).toHaveAttribute('href', 'https://painel.exemplo.invalid')
  })

  it('SEM a env, a frase fica e o link não é desenhado', async () => {
    vi.stubEnv('VITE_BACKOFFICE_URL', '')
    await montarApp('/')
    const rodape = screen.getByTestId('rodape-backoffice')
    expect(rodape).toHaveTextContent('Produtos, vitrine e configurações da loja seguem no Backoffice.')
    expect(within(rodape).queryByRole('link')).toBeNull()
    // Pelo TEXTO e pela tag, não só pelo papel: um `<a>` sem `href` não tem papel de link e passaria
    // pela linha acima desenhando "Abrir o Backoffice" sem destino (mutante N9 da verificação r2).
    expect(within(rodape).queryByText('Abrir o Backoffice')).toBeNull()
    expect(rodape.querySelector('a')).toBeNull()
  })

  it('SEM a env, o rodapé é só a frase: nenhum controle, com qualquer texto', async () => {
    // H1 da verificação r3: a régua pelo texto "Abrir o Backoffice" deixaria passar um controle com
    // OUTRO texto. Sem a env não há destino, então não há o que tocar.
    vi.stubEnv('VITE_BACKOFFICE_URL', '')
    await montarApp('/')
    const rodape = screen.getByTestId('rodape-backoffice')
    expect(rodape.querySelectorAll('a, button, [role="link"], [role="button"], [tabindex]')).toHaveLength(0)
    expect(rodape.textContent?.trim()).toBe('Produtos, vitrine e configurações da loja seguem no Backoffice.')
  })

  it('a env só com espaços conta como ausente', async () => {
    vi.stubEnv('VITE_BACKOFFICE_URL', '   ')
    await montarApp('/')
    const rodape = screen.getByTestId('rodape-backoffice')
    expect(rodape).toHaveTextContent('Produtos, vitrine e configurações da loja seguem no Backoffice.')
    expect(within(rodape).queryByText('Abrir o Backoffice')).toBeNull()
    expect(rodape.querySelector('a')).toBeNull()
  })
})
