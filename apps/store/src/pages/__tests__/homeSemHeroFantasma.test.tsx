import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DEFAULT_HOME_COMPOSITION } from '@estrelinha/core/home'
import HomePage from '../HomePage'

/**
 * **A Home não mostra bloco desligado, nem por um quadro.**
 *
 * O defeito que este arquivo prende: com a "Chamada principal" (`hero`) DESLIGADA no painel e o
 * "Banner principal" (`hero_carousel`) LIGADO, a cliente via a chamada aparecer por ~1s, animar a
 * entrada, e só então ser trocada pelo carrossel.
 *
 * **O bloco fantasma nunca veio do banco.** A policy pública (`public read active home sections`)
 * devolve só `active = true`, então a linha desligada não trafega. Ele vinha de
 * `DEFAULT_HOME_COMPOSITION`, pintada por um `placeholderData` em `useHomeSections` — e o
 * `placeholderData` volta como `data` com `status: 'success'` em TODA carga fria, porque o cache é
 * só em memória.
 *
 * A premissa que sustentava aquele piso era do banco, e caiu: a feature `24` criou
 * `guard_hero_home_section`, que tornava o hero indelével; a `41` o derrubou (`AD-029`) justamente
 * para a dona poder pôr a campanha no topo. `defaults.ts` nunca foi revisitado, e a loja ficou
 * **afirmando uma composição que ela não sabe ser verdadeira**.
 *
 * **Monta a `HomePage` de verdade**, e não uma árvore escrita aqui: a fiação é metade do defeito, e
 * um teste que monta a própria composição passa com o conserto apagado.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const { respostaDeSecoes } = vi.hoisted(() => ({
  respostaDeSecoes: { atual: null as null | (() => Promise<unknown>) },
}))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: {
    from: (tabela: string) => ({
      select: () =>
        tabela === 'home_sections'
          ? respostaDeSecoes.atual!()
          : Promise.resolve({ data: [], error: null }),
    }),
  },
}))

vi.mock('@/entities/category/api/useCategories', () => ({
  useCategories: () => ({ data: [] }),
  useCategoryBySlug: () => ({ data: null }),
}))

vi.mock('@/entities/product/api/useProducts', () => ({ useProducts: () => ({ data: [] }) }))

vi.mock('@/entities/product/ui/ProductCard', () => ({
  default: ({ product }: any) => <div data-testid="produto">{product.name}</div>,
}))

/** O conteúdo do hero semeado, colhido do DONO — nunca digitado aqui. */
const CONFIG_DO_HERO = DEFAULT_HOME_COMPOSITION.find(s => s.type === 'hero')!.config as Record<
  string,
  unknown
>

/**
 * As frases do hero. O recorte por comprimento tira `cta_href` (`/busca`), que é endereço e não
 * copy — e endereço aparece em `href` de link legítimo de outras seções.
 */
const FRASES_DO_HERO = Object.values(CONFIG_DO_HERO).filter(
  (v): v is string => typeof v === 'string' && v.length > 8,
)

const nuncaResolve = () => new Promise<unknown>(() => {})
const resolveCom = (linhas: unknown[]) => () => Promise.resolve({ data: linhas, error: null })

const linhaDoCarrossel = () => ({
  id: 'sec-carrossel',
  type: 'hero_carousel',
  position: 1,
  active: true,
  config: {},
  items: [
    {
      id: 'slide-1',
      section_id: 'sec-carrossel',
      position: 0,
      category_id: null,
      product_id: null,
      href: '/busca',
      image_url: 'https://cdn.test/campanha.webp',
      image_mobile_url: 'https://cdn.test/campanha-celular.webp',
      alt: 'Campanha de setembro',
    },
  ],
})

const renderHome = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )

const esqueleto = () =>
  document.querySelector('[aria-busy="true"][aria-label="Carregando a página inicial"]')

beforeEach(() => {
  respostaDeSecoes.atual = nuncaResolve
})

describe('a Home enquanto não sabe qual é a Home', () => {
  it('âncora: as frases do hero semeado existem, e incluem a que o defeito mostrava', () => {
    // Sem esta âncora, um `DEFAULT_HOME_COMPOSITION` esvaziado faria os casos abaixo passarem por
    // VACUIDADE — eles varrem uma lista, e lista vazia nunca acha nada.
    expect(FRASES_DO_HERO.length).toBeGreaterThanOrEqual(5)
    expect(FRASES_DO_HERO).toContain('eternizado em joia.')
    expect(FRASES_DO_HERO).toContain('Explorar coleções')
  })

  it('com a leitura em curso, NENHUMA frase da composição semeada está na tela', () => {
    // O defeito, direto: é esta asserção que reprova com o `placeholderData` de volta.
    renderHome()

    for (const frase of FRASES_DO_HERO) {
      expect(screen.queryByText(frase), `a Home mostrou "${frase}" antes de saber a composição`).
        toBeNull()
    }
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
  })

  it('o que aparece no lugar é o esqueleto — nunca página em branco', () => {
    // A metade POSITIVA. Sem ela, apagar o ramo de carregamento inteiro deixaria o caso acima verde
    // com a Home vazia, que é o estado que `HOME-07` existe para tornar impossível.
    renderHome()

    expect(esqueleto()).not.toBeNull()
  })
})

describe('HOME-07 continua de pé — o piso é para leitura que FALHA', () => {
  it('resposta vazia cai na composição semeada', async () => {
    respostaDeSecoes.atual = resolveCom([])

    renderHome()

    expect(await screen.findByText('eternizado em joia.')).toBeInTheDocument()
    expect(esqueleto()).toBeNull()
  })

  it('erro de leitura cai na mesma composição', async () => {
    respostaDeSecoes.atual = () =>
      Promise.resolve({ data: null, error: { message: 'permission denied' } })

    renderHome()

    expect(await screen.findByText('eternizado em joia.')).toBeInTheDocument()
  })
})

describe('o cenário relatado: "Chamada principal" desligada, "Banner principal" ligado', () => {
  it('a chamada desligada não aparece em quadro nenhum, e o banner é o que abre a Home', async () => {
    respostaDeSecoes.atual = resolveCom([linhaDoCarrossel()])

    renderHome()

    // Antes da resposta.
    for (const frase of FRASES_DO_HERO) expect(screen.queryByText(frase)).toBeNull()

    // Depois dela.
    expect(await screen.findByTestId('hero-carousel')).toBeInTheDocument()
    for (const frase of FRASES_DO_HERO) {
      expect(screen.queryByText(frase), `a chamada desligada sobreviveu: "${frase}"`).toBeNull()
    }
  })
})
