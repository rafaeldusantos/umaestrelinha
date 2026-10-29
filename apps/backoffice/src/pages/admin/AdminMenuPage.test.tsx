// Feature 86, T19 — a tela onde a dona MONTA o menu, pela `AdminMenuPage` REAL.
//
// **Reescrita da suíte da 39/47/48/50.** A tela antiga listava a árvore inteira de categorias com
// uma chave por dispositivo e gravava em `categories` (`updateCategory`/`updateSortOrders`); a
// spec 86 remove exatamente isso. Os casos que mediam aquele comportamento (`NAV-01/02/03/05/06/07`,
// `NAV-37/38/39`, o painel dentro da linha da `48`, o editor em abas da `47`) saíram, e cada um tem
// o substituto declarado no `tasks.md` (T19). O bloco `FOCO-13` (altura de tela, lido do disco) ficou
// **verbatim**, e os de vista do celular, `Salvando…/Salvo` e identidade do `<iframe>` foram
// reescritos com a mesma régua sobre o hook novo.
//
// **Fiação, não composição.** Só o client do Supabase é dublado — `useStoreMenu`,
// `useAdminCategories`, `MenuTree`, os diálogos e o palco são os de verdade. O dublê REGISTRA tabela,
// método e argumentos e devolve só o que o `select` pediu: é o que torna auditáveis o filtro de
// `updated_at` (`MNM-37`) e a ausência de escrita em `categories` (`MNM-18`).

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MenuDocument, MenuRootNode } from '@estrelinha/core/menu'
import { RADIX_POINTER_DOWN, enableRadixSelectInJsdom } from '@/test/radix'

type Chamada = { tabela: string; metodo: string; args: unknown[] }

const db = vi.hoisted(() => ({
  chamadas: [] as Chamada[],
  categorias: [] as Record<string, unknown>[],
  linha: null as { value: unknown; updated_at: string } | null,
  erroLeitura: null as { message: string } | null,
  /** G04 — a leitura de `categories` falha. */
  erroCategorias: null as { message: string } | null,
  escrita: { data: null as unknown, error: null as { message: string; code?: string } | null },
  segurar: null as Promise<void> | null,
  /** Q03 — os slugs das peças à venda (o seletor confere `/produtos/<slug>` numa leitura). */
  produtos: [] as string[],
}))

vi.mock('@estrelinha/supabase/client', () => {
  const from = (tabela: string) => {
    const registro = (metodo: string, args: unknown[]) => db.chamadas.push({ tabela, metodo, args })
    let escreve = false
    let colunas = ''
    const resposta = async () => {
      if (tabela === 'categories') return db.erroCategorias ? { data: null, error: db.erroCategorias } : { data: db.categorias, error: null }
      if (tabela === 'category_product_counts') return { data: [], error: null }
      if (tabela === 'products') {
        const slug = db.chamadas.filter(c => c.tabela === 'products' && c.metodo === 'eq' && c.args[0] === 'slug').at(-1)?.args[1]
        return { data: db.produtos.includes(String(slug)) ? { slug } : null, error: null }
      }
      if (tabela === 'store_settings') {
        if (escreve) {
          if (db.segurar) await db.segurar
          return db.escrita
        }
        if (db.erroLeitura) return { data: null, error: db.erroLeitura }
        if (!db.linha) return { data: null, error: null }
        const row: Record<string, unknown> = {}
        for (const c of colunas.split(',').map(s => s.trim())) {
          row[c] = (db.linha as Record<string, unknown>)[c]
        }
        return { data: row, error: null }
      }
      return { data: [], error: null }
    }
    const builder: Record<string, unknown> = {}
    for (const metodo of ['eq', 'in', 'order', 'ilike', 'limit', 'range', 'or'] as const) {
      builder[metodo] = (...args: unknown[]) => {
        registro(metodo, args)
        return builder
      }
    }
    builder.select = (...args: unknown[]) => {
      registro('select', args)
      if (!escreve) colunas = String(args[0] ?? '')
      return builder
    }
    for (const metodo of ['update', 'insert', 'upsert', 'delete'] as const) {
      builder[metodo] = (...args: unknown[]) => {
        registro(metodo, args)
        escreve = true
        return builder
      }
    }
    builder.maybeSingle = () => {
      registro('maybeSingle', [])
      return resposta()
    }
    builder.then = (ok: (v: unknown) => unknown, erro: (e: unknown) => unknown) =>
      resposta().then(ok, erro)
    registro('from', [])
    return builder
  }
  return { supabase: { from, storage: { from: () => ({ upload: vi.fn() }) } } }
})

vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ toast: vi.fn() }))

/** `VITE_STORE_URL` fixada aqui, e não lida do ambiente (a lição do `storeOrigin.test.ts`). */
vi.mock('@/shared/lib/storeOrigin', () => ({
  STORE_URL: 'http://localhost:8082',
  storeOrigin: () => 'http://localhost:8082',
}))

import AdminMenuPage from './AdminMenuPage'
import { STORE_MENU_SAVE_UNKNOWN } from '@/features/store-menu'
import { toast } from '@estrelinha/ui/hooks/use-toast'

const cat = (id: string, name: string, over: Record<string, unknown> = {}) => ({
  id,
  name,
  slug: id,
  description: null,
  image_url: null,
  banner_url: null,
  color_accent: null,
  icon: null,
  active: true,
  sort_order: 0,
  parent_id: null,
  menu_desktop: false,
  menu_mobile: false,
  menu_banners: null,
  ...over,
})

/** O catálogo: muitas categorias, só três no menu. */
const CATALOGO = [
  cat('joias', 'Joias', { sort_order: 0 }),
  cat('aneis', 'Anéis', { parent_id: 'joias', sort_order: 1 }),
  cat('colares', 'Colares', { parent_id: 'joias', sort_order: 2 }),
  cat('pulseiras', 'Pulseiras', { parent_id: 'joias', sort_order: 3 }),
  cat('antiga', 'Antiga', { parent_id: 'joias', sort_order: 4, active: false }),
  cat('chaveiros', 'Chaveiros', { sort_order: 1 }),
  cat('presentes', 'Presentes', { sort_order: 2 }),
  ...Array.from({ length: 30 }, (_, i) => cat(`extra-${i}`, `Coleção extra ${i}`, { sort_order: 10 + i })),
]

const raiz = (id: string, target: MenuRootNode['target'], over: Partial<MenuRootNode> = {}): MenuRootNode => ({
  id,
  target,
  label: null,
  desktop: true,
  mobile: true,
  icon: null,
  banners: null,
  children: [],
  ...over,
})

const V2: MenuDocument = {
  version: 2,
  items: [
    raiz('n-chaveiros', { kind: 'category', category_id: 'chaveiros' }, { icon: 'corrente' }),
    raiz('n-presentes', { kind: 'category', category_id: 'presentes' }, {
      children: [
        { id: 'c-aneis', target: { kind: 'category', category_id: 'aneis' }, label: null, desktop: true, mobile: true },
        { id: 'c-colares', target: { kind: 'category', category_id: 'colares' }, label: null, desktop: true, mobile: true },
      ],
    }),
    raiz('n-sobre', { kind: 'link', href: '/sobre' }, { label: 'Sobre', mobile: false }),
  ],
}

const VISTO = '2026-10-28T12:00:00.000000+00:00'
const NOVO = '2026-10-28T12:00:05.000000+00:00'

const montar = async (opcoes: { esperar?: boolean } = {}) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const utils = render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AdminMenuPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  if (opcoes.esperar !== false) await screen.findByTestId('coluna-entradas')
  return utils
}

/** O `value` da última gravação em `store_settings`. */
const ultimoGravado = (): { version: number; items: MenuRootNode[] } => {
  const escrita = [...db.chamadas].reverse().find(c => c.tabela === 'store_settings' && c.metodo === 'update')
  expect(escrita, 'nenhuma gravação em store_settings').toBeTruthy()
  return (escrita!.args[0] as { value: { version: number; items: MenuRootNode[] } }).value
}

const escritasEm = (tabela: string) =>
  db.chamadas.filter(c => c.tabela === tabela && ['update', 'insert', 'upsert', 'delete'].includes(c.metodo))

const abrirAcoes = (id: string) => fireEvent.pointerDown(screen.getByTestId(`acoes-${id}`), RADIX_POINTER_DOWN)

const quadro = () => document.querySelector('iframe') as HTMLIFrameElement | null

/** A janela do iframe, dublada — o mesmo recurso de `MenuLivePreview.test.tsx`. */
const janelaDoQuadro = () => {
  const postMessage = vi.fn()
  Object.defineProperty(quadro()!, 'contentWindow', { value: { postMessage }, configurable: true })
  return postMessage
}

/** O último rascunho que a prévia recebeu. */
const ultimoRascunho = (postMessage: ReturnType<typeof vi.fn>) =>
  [...postMessage.mock.calls].reverse().find(([m]) => m.type === 'draft')?.[0].draft as
    | { document: MenuDocument }
    | undefined

beforeAll(() => enableRadixSelectInJsdom())

beforeEach(() => {
  db.chamadas = []
  db.categorias = CATALOGO
  db.linha = { value: V2, updated_at: VISTO }
  db.erroLeitura = null
  db.erroCategorias = null
  db.escrita = { data: [{ updated_at: NOVO }], error: null }
  db.segurar = null
  db.produtos = []
  vi.mocked(toast).mockClear()
})

afterEach(() => {
  // A promessa central da feature, cobrada em TODO caso desta suíte: a tela do menu não escreve na
  // árvore de categorias (`MNM-18`).
  expect(escritasEm('categories')).toEqual([])
})

// ---------------------------------------------------------------------------
describe('MNM-01..03 — a tela mostra só o que está no menu', () => {
  it('37 categorias, 3 itens no documento ⇒ 3 linhas, na ordem gravada', async () => {
    await montar()
    const linhas = screen.getAllByTestId(/^item-/).map(l => l.getAttribute('data-testid'))
    expect(linhas).toEqual(['item-n-chaveiros', 'item-n-presentes', 'item-n-sobre'])
    expect(screen.queryByText('Coleção extra 3')).toBeNull()
    expect(screen.queryByText('Joias')).toBeNull()
  })

  it('a contagem do card é a da porta da loja (`menuItems`), por dispositivo', async () => {
    await montar()
    expect(screen.getByTestId('contador-itens')).toHaveTextContent('3 no computador · 2 no celular')
  })

  it('a tela lê o documento por `key = menu`, com o `updated_at`', async () => {
    await montar()
    const leitura = db.chamadas.filter(c => c.tabela === 'store_settings')
    expect(leitura.find(c => c.metodo === 'select')?.args[0]).toBe('value, updated_at')
    expect(leitura.find(c => c.metodo === 'eq')?.args).toEqual(['key', 'menu'])
  })

  it('sem v2 gravado, a tela mostra o menu de hoje (o legado convertido)', async () => {
    db.categorias = CATALOGO.map(c =>
      c.id === 'joias' || c.id === 'aneis' ? { ...c, menu_desktop: true, menu_mobile: true } : c,
    )
    db.linha = { value: { links: [] }, updated_at: VISTO }
    await montar()
    expect(screen.getAllByTestId(/^item-/).map(l => l.getAttribute('data-testid'))).toEqual(['item-cat:joias'])
    expect(screen.getByTestId('meta-cat:joias')).toHaveTextContent('1 no submenu')
  })
})

describe('MNM-04 / MNM-05 — vazio e falha de leitura', () => {
  it('documento vazio: o vazio com "Adicionar item ao menu"', async () => {
    db.linha = { value: { version: 2, items: [] }, updated_at: VISTO }
    await montar()
    expect(screen.getByTestId('menu-vazio')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('adicionar-primeiro'))
    expect(await screen.findByTestId('seletor-do-menu')).toBeInTheDocument()
  })

  it('leitura falhou: faixa com "Tentar de novo" — NUNCA o vazio', async () => {
    db.erroLeitura = { message: 'permission denied for table store_settings' }
    await montar({ esperar: false })
    const faixa = await screen.findByTestId('menu-erro')
    // Q08: a frase da loja, em português — nunca o erro cru do banco ou do fetch.
    expect(faixa).toHaveTextContent('Não foi possível carregar o menu')
    expect(faixa).toHaveTextContent('Confira a internet e tente de novo.')
    expect(faixa).not.toHaveTextContent('permission denied')
    expect(screen.queryByTestId('menu-vazio')).toBeNull()
    expect(screen.queryByTestId('coluna-entradas')).toBeNull()

    db.erroLeitura = null
    fireEvent.click(within(faixa).getByRole('button', { name: /Tentar de novo/ }))
    expect(await screen.findByTestId('item-n-chaveiros')).toBeInTheDocument()
    expect(screen.queryByTestId('menu-erro')).toBeNull()
  })

  it('Q08 — sem internet, a faixa NÃO mostra "TypeError: Failed to fetch"', async () => {
    db.erroLeitura = { message: 'TypeError: Failed to fetch' }
    await montar({ esperar: false })
    const faixa = await screen.findByTestId('menu-erro')
    expect(faixa.textContent).not.toMatch(/TypeError|Failed to fetch/)
    expect(faixa).toHaveTextContent('Confira a internet e tente de novo.')
  })

  // G04 da verificação r2 (N38): a falha da ÁRVORE também é "não sei qual é o menu" (MNM-05).
  it('leitura das CATEGORIAS falhou: a mesma faixa com "Tentar de novo", sem erro cru e NUNCA o vazio', async () => {
    db.erroCategorias = { message: 'TypeError: Failed to fetch' }
    await montar({ esperar: false })
    const faixa = await screen.findByTestId('menu-erro')
    expect(faixa).toHaveTextContent('Não foi possível carregar o menu')
    expect(faixa).toHaveTextContent('Confira a internet e tente de novo.')
    expect(faixa.textContent).not.toMatch(/TypeError|Failed to fetch/)
    expect(screen.queryByTestId('menu-vazio')).toBeNull()
    expect(screen.queryByTestId('coluna-entradas')).toBeNull()

    db.erroCategorias = null
    fireEvent.click(within(faixa).getByRole('button', { name: /Tentar de novo/ }))
    expect(await screen.findByTestId('item-n-chaveiros')).toBeInTheDocument()
    expect(screen.queryByTestId('menu-erro')).toBeNull()
  })

  it('na primeira carga, o esqueleto', async () => {
    db.segurar = null
    await montar({ esperar: false })
    expect(screen.getAllByTestId('skeleton-row').length).toBeGreaterThan(0)
    await screen.findByTestId('coluna-entradas')
  })
})

describe('MNM-07..09 / MNM-13 — adicionar uma categoria com filhas', () => {
  it('entra no FIM, com as filhas ATIVAS no submenu, e a prévia recebe o documento novo', async () => {
    await montar()
    const postMessage = janelaDoQuadro()

    fireEvent.click(screen.getByTestId('adicionar-item'))
    fireEvent.click(await screen.findByTestId('opcao-categoria-joias'))
    expect(screen.getByTestId('opcao-categoria-joias')).toHaveTextContent('3 subcategorias entram no submenu')
    fireEvent.click(screen.getByTestId('seletor-adicionar'))

    await waitFor(() => expect(screen.getAllByTestId(/^item-/)).toHaveLength(4))
    const gravado = ultimoGravado()
    expect(gravado.version).toBe(2)
    const novo = gravado.items.at(-1)!
    expect(novo).toMatchObject({ target: { kind: 'category', category_id: 'joias' }, label: null, icon: null, desktop: true, mobile: true })
    expect(novo.children.map(c => (c.target as { category_id: string }).category_id)).toEqual([
      'aneis',
      'colares',
      'pulseiras',
    ])

    // O aviso diz onde entrou e quantos vieram junto.
    expect(vi.mocked(toast).mock.calls.at(-1)![0].description).toBe(
      '“Joias” entrou no fim do menu com 3 itens no submenu.',
    )

    // `MNM-13`: a prévia recebe o rascunho com o item novo, sem recarregar o iframe.
    await waitFor(() => expect(ultimoRascunho(postMessage)?.document.items).toHaveLength(4))
    // E o `open` aponta para o item novo.
    const aberto = [...postMessage.mock.calls].reverse().find(([m]) => m.type === 'open')?.[0].itemId
    expect(aberto).toBe(novo.id)
  })

  it('categoria com 30 filhas ativas: entram as 24 primeiras, e o aviso diz quantas ficaram de fora (MNM-09 × MNM-24)', async () => {
    db.categorias = [
      ...CATALOGO,
      cat('grande', 'Grande', { sort_order: 90 }),
      ...Array.from({ length: 30 }, (_, i) =>
        cat(`g${String(i).padStart(2, '0')}`, `Filha ${i}`, { parent_id: 'grande', sort_order: i }),
      ),
    ]
    await montar()
    fireEvent.click(screen.getByTestId('adicionar-item'))
    fireEvent.click(await screen.findByTestId('opcao-categoria-grande'))
    expect(screen.getByTestId('opcao-categoria-grande')).toHaveTextContent('24 das 30 subcategorias entram no submenu')
    fireEvent.click(screen.getByTestId('seletor-adicionar'))

    await waitFor(() => expect(escritasEm('store_settings')).toHaveLength(1))
    const novo = ultimoGravado().items.at(-1)!
    expect(novo.children.map(c => (c.target as { category_id: string }).category_id)).toEqual(
      Array.from({ length: 24 }, (_, i) => `g${String(i).padStart(2, '0')}`),
    )
    expect(vi.mocked(toast).mock.calls.at(-1)![0].description).toBe(
      '“Grande” entrou no fim do menu com 24 itens no submenu. ' +
        'As outras 6 subcategorias não entraram: o submenu tem o máximo de 24 itens.',
    )
  })

  it('submenu de 30 (já acima do teto): tirar um grava, e "Adicionar ao submenu" fica desabilitado (MNM-24)', async () => {
    const trinta = Array.from({ length: 30 }, (_, i) => ({
      id: `x${i}`,
      target: { kind: 'category' as const, category_id: `extra-${i}` },
      label: null,
      desktop: true,
      mobile: true,
    }))
    db.linha = {
      value: { version: 2, items: V2.items.map(i => (i.id === 'n-presentes' ? { ...i, children: trinta } : i)) },
      updated_at: VISTO,
    }
    await montar()
    fireEvent.click(screen.getByTestId('expandir-n-presentes'))
    expect(screen.getByTestId('adicionar-ao-submenu-n-presentes')).toBeDisabled()
    fireEvent.click(screen.getByTestId('tirar-x0'))
    await waitFor(() => expect(escritasEm('store_settings')).toHaveLength(1))
    expect(ultimoGravado().items[1].children).toHaveLength(29)
    expect(vi.mocked(toast)).not.toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }))
  })

  it('a gravação filtra por `key` E pelo `updated_at` visto (`MNM-37`)', async () => {
    await montar()
    fireEvent.click(screen.getByTestId('adicionar-item'))
    fireEvent.click(await screen.findByTestId('opcao-categoria-joias'))
    fireEvent.click(screen.getByTestId('seletor-adicionar'))
    await waitFor(() => expect(escritasEm('store_settings')).toHaveLength(1))

    const i = db.chamadas.findIndex(c => c.tabela === 'store_settings' && c.metodo === 'update')
    const filtros = db.chamadas.slice(i + 1).filter(c => c.metodo === 'eq').map(c => c.args)
    expect(filtros).toEqual([
      ['key', 'menu'],
      ['updated_at', VISTO],
    ])
  })

  it('categoria que já está no menu aparece como "Já está no menu" (`MNM-10`)', async () => {
    await montar()
    fireEvent.click(screen.getByTestId('adicionar-item'))
    expect(await screen.findByTestId('motivo-chaveiros')).toHaveTextContent('Já está no menu')
    expect(screen.getByTestId('opcao-categoria-chaveiros')).toBeDisabled()
  })

  it('uma página da loja entra com o nome sugerido', async () => {
    await montar()
    fireEvent.click(screen.getByTestId('adicionar-item'))
    fireEvent.click(await screen.findByTestId('aba-pagina'))
    fireEvent.click(screen.getByTestId('opcao-pagina-/perguntas-frequentes'))
    fireEvent.click(screen.getByTestId('seletor-adicionar'))
    await waitFor(() => expect(escritasEm('store_settings')).toHaveLength(1))
    expect(ultimoGravado().items.at(-1)).toMatchObject({
      target: { kind: 'link', href: '/perguntas-frequentes' },
      label: 'Perguntas frequentes',
    })
  })

  it('endereço externo é recusado no seletor e nada vai à rede (`MNM-12`)', async () => {
    await montar()
    fireEvent.click(screen.getByTestId('adicionar-item'))
    fireEvent.click(await screen.findByTestId('aba-pagina'))
    fireEvent.click(screen.getByTestId('opcao-pagina-outro'))
    fireEvent.change(screen.getByTestId('outro-endereco'), { target: { value: 'https://exemplo.com' } })
    fireEvent.change(screen.getByTestId('nome-do-link'), { target: { value: 'Fora' } })
    fireEvent.click(screen.getByTestId('seletor-adicionar'))
    expect(screen.getByTestId('seletor-recusa')).toHaveTextContent('O menu leva só a páginas da loja')
    expect(escritasEm('store_settings')).toEqual([])
  })

  /** Q03 — pela página real: o que vai ao documento é só endereço que existe, e uma vez só. */
  const outroEndereco = async (href: string) => {
    fireEvent.click(screen.getByTestId('adicionar-item'))
    fireEvent.click(await screen.findByTestId('aba-pagina'))
    fireEvent.click(screen.getByTestId('opcao-pagina-outro'))
    fireEvent.change(screen.getByTestId('outro-endereco'), { target: { value: href } })
    fireEvent.change(screen.getByTestId('nome-do-link'), { target: { value: 'TESTE' } })
    fireEvent.click(screen.getByTestId('seletor-adicionar'))
  }

  it('Q03 — /produtos/<peça que não existe> é recusado e nada é gravado', async () => {
    await montar()
    await outroEndereco('/produtos/inexistente')
    expect(await screen.findByTestId('seletor-recusa')).toHaveTextContent('Não há peça à venda')
    expect(db.chamadas.some(c => c.tabela === 'products' && c.metodo === 'eq' && c.args[1] === 'inexistente')).toBe(true)
    expect(escritasEm('store_settings')).toEqual([])
  })

  it('Q03 — /produtos/<peça à venda> entra no menu', async () => {
    db.produtos = ['colar-leite']
    await montar()
    await outroEndereco('/produtos/colar-leite')
    await waitFor(() => expect(escritasEm('store_settings')).toHaveLength(1))
    expect(ultimoGravado().items.at(-1)).toMatchObject({ target: { kind: 'link', href: '/produtos/colar-leite' } })
  })

  // R01 (QA r2) — o caminho de uma coleção ATIVA passava no seletor e a gravação o recusava, com a
  // lista de 19 endereços, sem PATCH. Pela página real: colar o endereço da coleção GRAVA.
  it.each([
    ['coleção raiz', '/presentes', '/presentes'],
    ['coleção filha', '/joias/aneis', '/joias/aneis'],
    ['coleção filha, grafia da barra do navegador', '/Joias/Aneis/', '/joias/aneis'],
  ])('R01 — %s (%s) colada em "Outro endereço" é gravada', async (_n, digitado, gravado) => {
    await montar()
    await outroEndereco(digitado)
    await waitFor(() => expect(escritasEm('store_settings')).toHaveLength(1))
    expect(ultimoGravado().items.at(-1)).toMatchObject({ target: { kind: 'link', href: gravado }, label: 'TESTE' })
    expect(screen.queryByTestId('seletor-recusa')).toBeNull()
    const avisos = vi.mocked(toast).mock.calls.map(c => JSON.stringify(c[0]))
    expect(avisos.some(a => /Endereços aceitos|Não foi possível salvar/.test(a))).toBe(false)
  })

  // S01 (QA r3) — a forma de UM segmento de uma subcategoria ativa (a loja a abre, `AD-018`) era
  // recusada com "Não há página da loja". Pela página real: grava a canônica, de dois segmentos.
  it.each(['/aneis', '/ANEIS/'])('S01 — %s (filha num segmento) grava /joias/aneis', async digitado => {
    await montar()
    await outroEndereco(digitado)
    await waitFor(() => expect(escritasEm('store_settings')).toHaveLength(1))
    expect(ultimoGravado().items.at(-1)).toMatchObject({ target: { kind: 'link', href: '/joias/aneis' }, label: 'TESTE' })
    expect(screen.queryByTestId('seletor-recusa')).toBeNull()
  })

  it('S01 — a filha INATIVA num segmento continua recusada, dizendo que está fora do ar', async () => {
    await montar()
    await outroEndereco('/antiga')
    const recusa = await screen.findByTestId('seletor-recusa')
    expect(recusa).toHaveTextContent('fora do ar')
    expect(recusa).not.toHaveTextContent('Não há página')
    expect(escritasEm('store_settings')).toEqual([])
  })

  it('Q03 — "/SOBRE/" quando "/sobre" já está no menu é recusado como repetido', async () => {
    await montar()
    await outroEndereco('/SOBRE/')
    expect(await screen.findByTestId('seletor-recusa')).toHaveTextContent('Já está no menu')
    expect(escritasEm('store_settings')).toEqual([])
  })
})

describe('MNM-14..17 — editar nome e ícone', () => {
  it('nome próprio pelo editor grava o `label` no nó', async () => {
    await montar()
    abrirAcoes('n-chaveiros')
    fireEvent.click(screen.getByTestId('editar-n-chaveiros'))
    fireEvent.click(await screen.findByTestId('usar-nome-da-categoria'))
    fireEvent.change(screen.getByTestId('nome-do-item'), { target: { value: 'Chaveiros afetivos' } })
    fireEvent.click(screen.getByTestId('editor-salvar'))

    await waitFor(() => expect(escritasEm('store_settings')).toHaveLength(1))
    expect(ultimoGravado().items[0]).toMatchObject({ id: 'n-chaveiros', label: 'Chaveiros afetivos', icon: 'corrente' })
    await waitFor(() => expect(screen.queryByTestId('editor-do-item')).toBeNull())
    expect(within(screen.getByTestId('item-n-chaveiros')).getByText('Chaveiros afetivos')).toBeInTheDocument()
  })

  it('trocar o ícone grava a chave no nó', async () => {
    await montar()
    abrirAcoes('n-presentes')
    fireEvent.click(screen.getByTestId('editar-n-presentes'))
    fireEvent.click(await screen.findByTestId('icone-opcao-gota-afetiva'))
    fireEvent.click(screen.getByTestId('editor-salvar'))
    await waitFor(() => expect(escritasEm('store_settings')).toHaveLength(1))
    expect(ultimoGravado().items[1]).toMatchObject({ id: 'n-presentes', icon: 'gota-afetiva', label: null })
  })

  it('nome vazio é recusado no editor, sem rede (`MNM-16`)', async () => {
    await montar()
    abrirAcoes('n-sobre')
    fireEvent.click(screen.getByTestId('editar-n-sobre'))
    fireEvent.change(await screen.findByTestId('nome-do-item'), { target: { value: '  ' } })
    fireEvent.click(screen.getByTestId('editor-salvar'))
    expect(await screen.findByTestId('editor-recusa')).toHaveTextContent('Digite o nome do item no menu.')
    expect(escritasEm('store_settings')).toEqual([])
  })

  it('banners salvos pelo editor vão para o NÓ (`MNM-33`)', async () => {
    await montar()
    abrirAcoes('n-sobre')
    fireEvent.click(screen.getByTestId('editar-n-sobre'))
    fireEvent.click(await screen.findByTestId('editar-banners'))
    fireEvent.click(screen.getByTestId('adicionar-banner'))
    fireEvent.click(screen.getByText('Salvar banners'))
    await waitFor(() => expect(escritasEm('store_settings')).toHaveLength(1))
    const sobre = ultimoGravado().items.find(i => i.id === 'n-sobre')!
    expect(sobre.banners?.desktop).toHaveLength(1)
  })
})

describe('MNM-18 / MNM-19 — reordenar muda só o documento', () => {
  it('"Mover para baixo" troca a ordem no documento', async () => {
    await montar()
    abrirAcoes('n-chaveiros')
    fireEvent.click(screen.getByTestId('descer-n-chaveiros'))
    await waitFor(() => expect(escritasEm('store_settings')).toHaveLength(1))
    expect(ultimoGravado().items.map(i => i.id)).toEqual(['n-presentes', 'n-chaveiros', 'n-sobre'])
    expect(screen.getAllByTestId(/^item-/).map(l => l.getAttribute('data-testid'))).toEqual([
      'item-n-presentes',
      'item-n-chaveiros',
      'item-n-sobre',
    ])
  })

  it('arrastar também — e reordenar não remonta a prévia (VIV-03)', async () => {
    await montar()
    const antes = quadro()
    fireEvent.drop(screen.getByTestId('item-n-chaveiros'), {
      dataTransfer: { getData: () => 'raiz|2', setData: vi.fn() },
    })
    await waitFor(() => expect(escritasEm('store_settings')).toHaveLength(1))
    expect(ultimoGravado().items.map(i => i.id)).toEqual(['n-sobre', 'n-chaveiros', 'n-presentes'])
    expect(quadro()).toBe(antes)
  })

  it('o submenu se reordena pelos botões ↑ ↓', async () => {
    await montar()
    fireEvent.click(screen.getByTestId('expandir-n-presentes'))
    fireEvent.click(screen.getByTestId('descer-c-aneis'))
    await waitFor(() => expect(escritasEm('store_settings')).toHaveLength(1))
    expect(ultimoGravado().items[1].children.map(c => c.id)).toEqual(['c-colares', 'c-aneis'])
  })
})

/**
 * Q04 do QA da `86` (`BUG-20261028-toque-duplo-em-mover-anda-duas-posicoes`) — no celular a dona
 * reordena pelo ⋯ ou pelas setas, e um toque duplo (o celular demorando a responder) andava o item
 * DUAS casas, com as duas gravações indo ao banco. Enquanto um "Mover" grava, os controles de mover
 * ficam desabilitados, e o segundo toque não faz nada.
 */
describe('Q04 — toque duplo em Mover anda uma casa só', () => {
  const comTresNoSubmenu = () => {
    const f = (id: string, cat: string) => ({
      id,
      target: { kind: 'category' as const, category_id: cat },
      label: null,
      desktop: true,
      mobile: true,
    })
    db.linha = {
      value: {
        version: 2,
        items: [
          V2.items[0],
          { ...V2.items[1], children: [f('c-aneis', 'aneis'), f('c-colares', 'colares'), f('c-pulseiras', 'pulseiras')] },
          V2.items[2],
        ],
      },
      updated_at: VISTO,
    }
  }

  it('setas do submenu: dois toques com a gravação no ar ⇒ UMA gravação, uma casa', async () => {
    comTresNoSubmenu()
    let soltar: () => void = () => {}
    db.segurar = new Promise<void>(r => (soltar = r))
    await montar()
    fireEvent.click(screen.getByTestId('expandir-n-presentes'))
    fireEvent.click(screen.getByTestId('descer-c-aneis'))
    fireEvent.click(screen.getByTestId('descer-c-aneis'))
    await waitFor(() => expect(screen.getByTestId('salvando')).toBeInTheDocument())
    // Enquanto grava, as setas do submenu estão desabilitadas.
    expect(screen.getByTestId('descer-c-aneis')).toBeDisabled()
    expect(screen.getByTestId('subir-c-pulseiras')).toBeDisabled()
    await act(async () => {
      soltar()
    })
    await screen.findByTestId('salvo')
    expect(escritasEm('store_settings')).toHaveLength(1)
    expect(ultimoGravado().items[1].children.map(c => c.id)).toEqual(['c-colares', 'c-aneis', 'c-pulseiras'])
    // Gravou: as setas voltam.
    expect(screen.getByTestId('descer-c-aneis')).not.toBeDisabled()
  })

  it('pelo ⋯: com a gravação do Mover no ar, "Mover para cima/baixo" ficam desabilitados', async () => {
    let soltar: () => void = () => {}
    db.segurar = new Promise<void>(r => (soltar = r))
    await montar()
    abrirAcoes('n-chaveiros')
    fireEvent.click(screen.getByTestId('descer-n-chaveiros'))
    await waitFor(() => expect(screen.getByTestId('salvando')).toBeInTheDocument())
    abrirAcoes('n-chaveiros')
    expect(await screen.findByTestId('descer-n-chaveiros')).toHaveAttribute('data-disabled')
    expect(screen.getByTestId('subir-n-chaveiros')).toHaveAttribute('data-disabled')
    fireEvent.click(screen.getByTestId('descer-n-chaveiros'))
    await act(async () => {
      soltar()
    })
    await screen.findByTestId('salvo')
    expect(escritasEm('store_settings')).toHaveLength(1)
    expect(ultimoGravado().items.map(i => i.id)).toEqual(['n-presentes', 'n-chaveiros', 'n-sobre'])
  })
})

/**
 * Q07 do QA da `86` (`BUG-20261028-foco-cai-no-body-ao-fechar-dialogos-do-menu`) — só pelo teclado
 * (ou com o TalkBack), em cinco momentos o foco caía no `<body>` e o leitor voltava ao início da
 * página. O foco volta a quem abriu, ou ao vizinho do que saiu.
 */
describe('Q07 — o foco volta ao lugar ao fechar e ao remover', () => {
  const focado = () => (window.document.activeElement as HTMLElement | null)?.getAttribute('data-testid')
  const esc = () => fireEvent.keyDown(window.document.activeElement ?? window.document.body, { key: 'Escape' })

  it('Esc no seletor "Adicionar item ao menu" devolve o foco a "Adicionar item"', async () => {
    await montar()
    screen.getByTestId('adicionar-item').focus()
    fireEvent.click(screen.getByTestId('adicionar-item'))
    await screen.findByTestId('seletor-do-menu')
    esc()
    await waitFor(() => expect(screen.queryByTestId('seletor-do-menu')).toBeNull())
    await waitFor(() => expect(focado()).toBe('adicionar-item'))
  })

  it('"Cancelar" no seletor do submenu devolve o foco a "Adicionar ao submenu"', async () => {
    await montar()
    fireEvent.click(screen.getByTestId('expandir-n-presentes'))
    fireEvent.click(screen.getByTestId('adicionar-ao-submenu-n-presentes'))
    const seletor = await screen.findByTestId('seletor-do-menu')
    fireEvent.click(within(seletor).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(focado()).toBe('adicionar-ao-submenu-n-presentes'))
  })

  it('Esc no editor do item devolve o foco ao ⋯ do item', async () => {
    await montar()
    abrirAcoes('n-sobre')
    fireEvent.click(screen.getByTestId('editar-n-sobre'))
    await screen.findByTestId('editor-do-item')
    esc()
    await waitFor(() => expect(screen.queryByTestId('editor-do-item')).toBeNull())
    await waitFor(() => expect(focado()).toBe('acoes-n-sobre'))
  })

  it('o editor de um FILHO devolve o foco ao lápis dele', async () => {
    await montar()
    fireEvent.click(screen.getByTestId('expandir-n-presentes'))
    fireEvent.click(screen.getByTestId('editar-c-colares'))
    await screen.findByTestId('editor-do-item')
    esc()
    await waitFor(() => expect(focado()).toBe('editar-c-colares'))
  })

  it('Cancelar na confirmação de remover devolve o foco ao ⋯', async () => {
    await montar()
    abrirAcoes('n-presentes')
    fireEvent.click(screen.getByTestId('remover-n-presentes'))
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByTestId('confirmar-remocao')).toBeNull())
    await waitFor(() => expect(focado()).toBe('acoes-n-presentes'))
  })

  it('confirmar a remoção leva o foco ao ⋯ do item SEGUINTE', async () => {
    await montar()
    abrirAcoes('n-chaveiros')
    fireEvent.click(screen.getByTestId('remover-n-chaveiros'))
    fireEvent.click(await screen.findByTestId('confirmar-remover'))
    await waitFor(() => expect(screen.queryByTestId('item-n-chaveiros')).toBeNull())
    await waitFor(() => expect(focado()).toBe('acoes-n-presentes'))
  })

  // G03 da verificação r2 (N35): no primeiro item "seguinte ?? anterior" e "anterior ?? seguinte"
  // dão a mesma resposta. Só o do MEIO separa as duas.
  it('remover o item do MEIO leva o foco ao ⋯ do SEGUINTE, nunca ao do anterior', async () => {
    await montar()
    abrirAcoes('n-presentes')
    fireEvent.click(screen.getByTestId('remover-n-presentes'))
    fireEvent.click(await screen.findByTestId('confirmar-remover'))
    await waitFor(() => expect(screen.queryByTestId('item-n-presentes')).toBeNull())
    await waitFor(() => expect(focado()).toBe('acoes-n-sobre'))
  })

  it('tirar o filho do MEIO do submenu leva o foco ao "Tirar" do filho SEGUINTE', async () => {
    const tres = [
      ...(V2.items[1].children ?? []),
      { id: 'c-pulseiras', target: { kind: 'category' as const, category_id: 'pulseiras' }, label: null, desktop: true, mobile: true },
    ]
    db.linha = {
      value: { version: 2, items: V2.items.map(i => (i.id === 'n-presentes' ? { ...i, children: tres } : i)) },
      updated_at: VISTO,
    }
    await montar()
    fireEvent.click(screen.getByTestId('expandir-n-presentes'))
    expect(tres.map(c => c.id)).toEqual(['c-aneis', 'c-colares', 'c-pulseiras'])
    screen.getByTestId('tirar-c-colares').focus()
    fireEvent.click(screen.getByTestId('tirar-c-colares'))
    await waitFor(() => expect(screen.queryByTestId('filho-c-colares')).toBeNull())
    await waitFor(() => expect(focado()).toBe('tirar-c-pulseiras'))
  })

  it('remover o ÚLTIMO leva o foco ao ⋯ do anterior', async () => {
    await montar()
    abrirAcoes('n-sobre')
    fireEvent.click(screen.getByTestId('remover-n-sobre'))
    fireEvent.click(await screen.findByTestId('confirmar-remover'))
    await waitFor(() => expect(screen.queryByTestId('item-n-sobre')).toBeNull())
    await waitFor(() => expect(focado()).toBe('acoes-n-presentes'))
  })

  it('remover o ÚNICO leva o foco ao "Adicionar item ao menu" do vazio', async () => {
    db.linha = { value: { version: 2, items: [V2.items[0]] }, updated_at: VISTO }
    await montar()
    abrirAcoes('n-chaveiros')
    fireEvent.click(screen.getByTestId('remover-n-chaveiros'))
    fireEvent.click(await screen.findByTestId('confirmar-remover'))
    await screen.findByTestId('menu-vazio')
    await waitFor(() => expect(focado()).toBe('adicionar-primeiro'))
  })

  it('tirar um filho do submenu leva o foco ao "Tirar" do filho seguinte; o último, ao anterior; sem filhos, a "Adicionar ao submenu"', async () => {
    await montar()
    fireEvent.click(screen.getByTestId('expandir-n-presentes'))
    screen.getByTestId('tirar-c-aneis').focus()
    fireEvent.click(screen.getByTestId('tirar-c-aneis'))
    await waitFor(() => expect(screen.queryByTestId('filho-c-aneis')).toBeNull())
    await waitFor(() => expect(focado()).toBe('tirar-c-colares'))

    fireEvent.click(screen.getByTestId('tirar-c-colares'))
    await waitFor(() => expect(screen.queryByTestId('filho-c-colares')).toBeNull())
    await waitFor(() => expect(focado()).toBe('adicionar-ao-submenu-n-presentes'))
  })
})

describe('MNM-20..23 — remover', () => {
  it('item principal: confirmação com o nome e o submenu, e só então remove', async () => {
    await montar()
    abrirAcoes('n-presentes')
    fireEvent.click(screen.getByTestId('remover-n-presentes'))
    const dialogo = await screen.findByTestId('confirmar-remocao')
    expect(dialogo).toHaveTextContent('Remover “Presentes” do menu?')
    expect(dialogo).toHaveTextContent('Os 2 itens do submenu saem junto.')
    expect(dialogo).toHaveTextContent('A categoria continua existindo na loja')
    expect(escritasEm('store_settings')).toEqual([])

    fireEvent.click(screen.getByTestId('confirmar-remover'))
    await waitFor(() => expect(escritasEm('store_settings')).toHaveLength(1))
    expect(ultimoGravado().items.map(i => i.id)).toEqual(['n-chaveiros', 'n-sobre'])
  })

  it('"Cancelar" na confirmação não grava nada', async () => {
    await montar()
    abrirAcoes('n-presentes')
    fireEvent.click(screen.getByTestId('remover-n-presentes'))
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByTestId('confirmar-remocao')).toBeNull())
    expect(escritasEm('store_settings')).toEqual([])
  })

  it('removido, a categoria volta a ser escolhível no seletor (`MNM-21`)', async () => {
    await montar()
    abrirAcoes('n-chaveiros')
    fireEvent.click(screen.getByTestId('remover-n-chaveiros'))
    fireEvent.click(await screen.findByTestId('confirmar-remover'))
    await waitFor(() => expect(screen.queryByTestId('item-n-chaveiros')).toBeNull())
    fireEvent.click(screen.getByTestId('adicionar-item'))
    expect(await screen.findByTestId('opcao-categoria-chaveiros')).toBeEnabled()
  })

  it('item de submenu sai direto, sem confirmação', async () => {
    await montar()
    fireEvent.click(screen.getByTestId('expandir-n-presentes'))
    fireEvent.click(screen.getByTestId('tirar-c-aneis'))
    await waitFor(() => expect(escritasEm('store_settings')).toHaveLength(1))
    expect(screen.queryByTestId('confirmar-remocao')).toBeNull()
    expect(ultimoGravado().items[1].children.map(c => c.id)).toEqual(['c-colares'])
  })

  it('"Adicionar ao submenu" usa o mesmo seletor, com "Já está neste submenu" (`MNM-22`, `MNM-25`)', async () => {
    await montar()
    fireEvent.click(screen.getByTestId('expandir-n-presentes'))
    fireEvent.click(screen.getByTestId('adicionar-ao-submenu-n-presentes'))
    expect(await screen.findByText('Adicionar ao submenu de “Presentes”')).toBeInTheDocument()
    expect(screen.getByTestId('motivo-aneis')).toHaveTextContent('Já está neste submenu')
    // Chaveiros está no menu principal, mas não NESTE submenu: pode entrar.
    fireEvent.click(screen.getByTestId('opcao-categoria-chaveiros'))
    fireEvent.click(screen.getByTestId('seletor-adicionar'))
    await waitFor(() => expect(escritasEm('store_settings')).toHaveLength(1))
    expect(ultimoGravado().items[1].children.map(c => (c.target as { category_id: string }).category_id)).toEqual([
      'aneis',
      'colares',
      'chaveiros',
    ])
  })
})

describe('MNM-31 — o link externo já gravado: editável, não criável', () => {
  const COM_EXTERNO: MenuDocument = {
    version: 2,
    items: [
      ...V2.items,
      raiz('n-insta', { kind: 'link', href: 'https://instagram.com/umaestrelinha' }, { label: 'Instagram' }),
    ],
  }

  it('editar o nome do externo legado grava, com o endereço intacto', async () => {
    db.linha = { value: COM_EXTERNO, updated_at: VISTO }
    await montar()
    abrirAcoes('n-insta')
    fireEvent.click(screen.getByTestId('editar-n-insta'))
    fireEvent.change(await screen.findByTestId('nome-do-item'), { target: { value: 'Nosso Instagram' } })
    fireEvent.click(screen.getByTestId('editor-salvar'))
    await waitFor(() => expect(escritasEm('store_settings')).toHaveLength(1))
    expect(ultimoGravado().items.find(i => i.id === 'n-insta')).toMatchObject({
      label: 'Nosso Instagram',
      target: { kind: 'link', href: 'https://instagram.com/umaestrelinha' },
    })
  })

  it('reordenar com o externo legado no documento grava', async () => {
    db.linha = { value: COM_EXTERNO, updated_at: VISTO }
    await montar()
    abrirAcoes('n-insta')
    fireEvent.click(screen.getByTestId('subir-n-insta'))
    await waitFor(() => expect(escritasEm('store_settings')).toHaveLength(1))
    expect(ultimoGravado().items.map(i => i.id)).toEqual(['n-chaveiros', 'n-presentes', 'n-insta', 'n-sobre'])
  })

  it('o seletor não cria outro externo: "Outro endereço" recusa `https://`, sem rede', async () => {
    db.linha = { value: COM_EXTERNO, updated_at: VISTO }
    await montar()
    fireEvent.click(screen.getByTestId('adicionar-item'))
    fireEvent.click(await screen.findByTestId('aba-pagina'))
    // A lista de páginas só tem caminhos da loja.
    const paginas = screen.getAllByTestId(/^opcao-pagina-/).map(b => b.getAttribute('data-testid'))
    expect(paginas.some(t => /https?:|\/\//.test(t!.replace('opcao-pagina-', '')))).toBe(false)
    fireEvent.click(screen.getByTestId('opcao-pagina-outro'))
    fireEvent.change(screen.getByTestId('outro-endereco'), { target: { value: 'https://instagram.com/outro' } })
    fireEvent.change(screen.getByTestId('nome-do-link'), { target: { value: 'Outro' } })
    fireEvent.click(screen.getByTestId('seletor-adicionar'))
    expect(screen.getByTestId('seletor-recusa')).toHaveTextContent('O menu leva só a páginas da loja')
    expect(escritasEm('store_settings')).toEqual([])
  })
})

describe('MNM-28 / MNM-32 — dispositivos', () => {
  it('desligar "Celular" grava só `mobile: false` no nó', async () => {
    await montar()
    fireEvent.click(screen.getByTestId('chave-mobile-n-chaveiros'))
    await waitFor(() => expect(escritasEm('store_settings')).toHaveLength(1))
    expect(ultimoGravado().items[0]).toMatchObject({ id: 'n-chaveiros', desktop: true, mobile: false })
  })

  it('o alternador troca SÓ a prévia: a lista e a contagem continuam as mesmas', async () => {
    await montar()
    expect(quadro()).toHaveAttribute('width', '1024')
    const linhas = screen.getAllByTestId(/^item-/).length
    fireEvent.click(screen.getByTestId('superficie-mobile'))
    expect(quadro()).toHaveAttribute('width', '390')
    expect(screen.getAllByTestId(/^item-/)).toHaveLength(linhas)
    expect(screen.getByTestId('contador-itens')).toHaveTextContent('3 no computador · 2 no celular')
    // O alternador mora ao lado da prévia, na coluna dela.
    expect(within(screen.getByTestId('coluna-previa-menu')).getByTestId('superficie-mobile')).toBeInTheDocument()
  })
})

describe('MNM-37 / MNM-38 — conflito e falha', () => {
  it('conflito (zero linhas): toast com a frase, faixa de recarregar, o documento volta, sem "Salvo"', async () => {
    db.escrita = { data: [], error: null }
    await montar()
    abrirAcoes('n-chaveiros')
    fireEvent.click(screen.getByTestId('descer-n-chaveiros'))

    await waitFor(() => expect(toast).toHaveBeenCalled())
    expect(vi.mocked(toast).mock.calls.at(-1)![0]).toMatchObject({
      description: 'O menu mudou em outra janela — recarregue.',
      variant: 'destructive',
    })
    expect(await screen.findByTestId('menu-conflito')).toBeInTheDocument()
    expect(screen.getAllByTestId(/^item-/)[0]).toHaveAttribute('data-testid', 'item-n-chaveiros')
    expect(screen.queryByTestId('salvo')).toBeNull()
  })

  it('"Recarregar" na faixa sai do conflito: a faixa some e a próxima ação grava com o `updated_at` relido', async () => {
    db.escrita = { data: [], error: null }
    await montar()
    abrirAcoes('n-chaveiros')
    fireEvent.click(screen.getByTestId('descer-n-chaveiros'))
    const faixa = await screen.findByTestId('menu-conflito')

    // A outra janela gravou: o banco tem outra versão. Daqui em diante a escrita dá certo.
    const OUTRA = '2026-10-28T12:00:03.000000+00:00'
    db.linha = { value: V2, updated_at: OUTRA }
    db.escrita = { data: [{ updated_at: NOVO }], error: null }
    fireEvent.click(within(faixa).getByRole('button', { name: 'Recarregar' }))
    await waitFor(() => expect(screen.queryByTestId('menu-conflito')).toBeNull())

    const antes = db.chamadas.length
    fireEvent.click(screen.getByTestId('chave-mobile-n-chaveiros'))
    await waitFor(() => expect(screen.getByTestId('salvo')).toBeInTheDocument())
    const depois = db.chamadas.slice(antes)
    const i = depois.findIndex(c => c.tabela === 'store_settings' && c.metodo === 'update')
    expect(i).toBeGreaterThanOrEqual(0)
    expect(depois.slice(i + 1).filter(c => c.metodo === 'eq').map(c => c.args)).toEqual([
      ['key', 'menu'],
      ['updated_at', OUTRA],
    ])
    expect(screen.queryByTestId('menu-conflito')).toBeNull()
  })

  it('falha de rede: "Não salvou", o documento volta, sem "Salvo"', async () => {
    db.escrita = { data: null, error: { message: 'fetch failed' } }
    await montar()
    fireEvent.click(screen.getByTestId('chave-mobile-n-chaveiros'))
    await waitFor(() => expect(toast).toHaveBeenCalled())
    expect(vi.mocked(toast).mock.calls.at(-1)![0]).toMatchObject({ title: 'Não salvou', variant: 'destructive' })
    expect(screen.getByTestId('chave-mobile-n-chaveiros')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByTestId('salvo')).toBeNull()
  })

  // R02 (QA r2) — a resposta se perdeu E a releitura também: a tela não sabe se gravou. O título não
  // pode dizer "Não salvou" (no QA o banco TINHA gravado), e o aviso não é de erro.
  it('R02 — sem saber se gravou: título neutro, nunca "Não salvou", e o texto da incerteza', async () => {
    await montar()
    db.escrita = { data: null, error: { message: 'TypeError: Failed to fetch' } }
    db.erroLeitura = { message: 'TypeError: Failed to fetch' }
    fireEvent.click(screen.getByTestId('chave-mobile-n-chaveiros'))
    await waitFor(() => expect(toast).toHaveBeenCalled())
    const aviso = vi.mocked(toast).mock.calls.at(-1)![0] as { title: string; description: string; variant?: string }
    expect(aviso.description).toBe(STORE_MENU_SAVE_UNKNOWN)
    expect(aviso.title).toBe('Não deu para confirmar')
    expect(aviso.title).not.toMatch(/Não salvou/)
    expect(aviso.variant).not.toBe('destructive')
  })

  // S03 (QA r3) — o resíduo do R02: depois da incerteza, a chave seguia mostrando o valor de ANTES
  // do envio até a próxima ação, com o banco já gravado. Agora a tela relê sozinha quando a rede
  // responde e mostra o que o banco tem (e o selo `Salvo`), sem toque nenhum e sem conflito.
  it('S03 — a rede volta: sem tocar em nada, a chave mostra o gravado e aparece Salvo', async () => {
    await montar()
    const chave = () => screen.getByTestId('chave-mobile-n-chaveiros')
    expect(chave()).toHaveAttribute('aria-pressed', 'true')
    db.escrita = { data: null, error: { message: 'TypeError: Failed to fetch' } }
    db.erroLeitura = { message: 'TypeError: Failed to fetch' }
    fireEvent.click(chave())
    await waitFor(() => expect(toast).toHaveBeenCalled())
    expect(chave()).toHaveAttribute('aria-pressed', 'true') // ainda não sabe; mostra o confirmado

    // O PATCH tinha chegado ao banco: ele tem exatamente o que foi enviado, com versão nova.
    const enviado = (escritasEm('store_settings')[0].args[0] as { value: unknown }).value
    db.linha = { value: enviado, updated_at: '2026-10-29T10:00:00.000001+00:00' }
    db.erroLeitura = null
    const escritasAntes = escritasEm('store_settings').length

    await waitFor(() => expect(chave()).toHaveAttribute('aria-pressed', 'false'), { timeout: 4000 })
    expect(await screen.findByTestId('salvo')).toBeInTheDocument()
    expect(screen.queryByTestId('menu-conflito')).toBeNull()
    expect(escritasEm('store_settings')).toHaveLength(escritasAntes)
  })
})

describe('VIV-03 / VIV-04 — gravar não remonta a prévia, e `Salvando…` vira `Salvo`', () => {
  it('a gravação mantém o MESMO nó `<iframe>` e não volta ao esqueleto', async () => {
    await montar()
    const antes = quadro()
    fireEvent.click(screen.getByTestId('chave-mobile-n-chaveiros'))
    await waitFor(() => expect(escritasEm('store_settings')).toHaveLength(1))
    expect(quadro()).toBe(antes)
    expect(screen.queryByTestId('skeleton-row')).toBeNull()
  })

  it('`Salvando…` no cabeçalho durante a gravação, `Salvo` depois, com o par `motion-reduce:`', async () => {
    let soltar: () => void = () => {}
    db.segurar = new Promise<void>(r => {
      soltar = r
    })
    await montar()
    fireEvent.click(screen.getByTestId('chave-mobile-n-chaveiros'))

    const emCurso = await screen.findByTestId('salvando')
    expect(emCurso).toHaveTextContent('Salvando…')
    expect(emCurso.className.split(/\s+/)).toEqual(
      expect.arrayContaining(['transition-opacity', 'motion-reduce:transition-none']),
    )
    expect(screen.queryByTestId('salvo')).toBeNull()
    // Otimista: a chave já mostra o novo estado enquanto grava.
    expect(screen.getByTestId('chave-mobile-n-chaveiros')).toHaveAttribute('aria-pressed', 'false')

    await act(async () => {
      soltar()
    })
    const pronto = await screen.findByTestId('salvo')
    expect(pronto.parentElement).toBe(emCurso.parentElement ?? pronto.parentElement)
    expect(screen.queryByTestId('salvando')).toBeNull()
    expect(pronto.className.split(/\s+/)).toContain('motion-reduce:transition-none')
  })
})

describe('Itens | Prévia abaixo de `lg` (FOCO-35..37)', () => {
  const vistaAba = (qual: 'entradas' | 'previa') => screen.getByTestId(`vista-${qual}`)

  it('o alternador existe, com as duas vistas, e some a partir de `lg`', async () => {
    await montar()
    const abas = within(screen.getByTestId('abas-vista')).getAllByRole('tab')
    expect(abas.map(a => a.textContent)).toEqual(['Itens do menu', 'Prévia'])
    expect(screen.getByTestId('abas-vista').className).toContain('lg:hidden')
  })

  it('abre nos itens; escolher Prévia troca a coluna, e voltar desfaz', async () => {
    await montar()
    expect(vistaAba('entradas')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('coluna-previa-menu').className).toContain('hidden lg:flex')
    fireEvent.click(vistaAba('previa'))
    expect(screen.getByTestId('coluna-previa-menu').className).not.toContain('hidden')
    expect(screen.getByTestId('coluna-entradas').className).toContain('hidden lg:flex')
    fireEvent.click(vistaAba('entradas'))
    expect(screen.getByTestId('coluna-entradas').className).not.toContain('hidden')
  })

  it('os alvos das abas e do alternador da prévia medem ≥ 44px (token exato)', async () => {
    await montar()
    const alvos = [
      ...within(screen.getByTestId('abas-vista')).getAllByRole('tab'),
      screen.getByTestId('superficie-desktop'),
      screen.getByTestId('superficie-mobile'),
    ]
    for (const alvo of alvos) expect(alvo.className).toMatch(/(?:^|\s)min-h-11(?![-\w])/)
  })

  const ehPilulaSegmentada = (classe: string): boolean =>
    /(?:^|\s)bg-muted(?![-\w])/.test(classe) && /rounded/.test(classe)
  const ehBarraSublinhada = (classe: string): boolean =>
    /border-b/.test(classe) && !/(?:^|\s)bg-muted(?![-\w])/.test(classe)

  it('o de DISPOSITIVO é pílula; o de VISTA é barra sublinhada — e o sensor', async () => {
    await montar()
    const dispositivo = screen.getByRole('group', { name: 'Dispositivo da prévia' }).className
    const vista = screen.getByTestId('abas-vista').className
    expect(ehPilulaSegmentada(dispositivo)).toBe(true)
    expect(ehBarraSublinhada(vista)).toBe(true)
    expect(ehPilulaSegmentada(vista)).toBe(false)
    // SENSOR: a forma que FOCO-37 recusa (duas pílulas) reprova na mesma régua.
    expect(ehBarraSublinhada('mb-4 flex gap-1 rounded-xl bg-muted p-1 lg:hidden')).toBe(false)
  })
})

describe('a prévia é a LOJA (previaUnica)', () => {
  it('o palco é um iframe da loja em modo prévia', async () => {
    await montar()
    expect(screen.getByTestId('palco-previa-menu')).toBeInTheDocument()
    expect(quadro()).toHaveAttribute('src', 'http://localhost:8082/?preview=1')
  })

  it('SENSOR do `afterEach`: o registro do dublê enxerga escrita em `categories`', async () => {
    const { supabase } = await import('@estrelinha/supabase/client')
    ;(supabase.from('categories') as unknown as { update: (v: unknown) => unknown }).update({ x: 1 })
    expect(escritasEm('categories')).toHaveLength(1)
    // Desfaz para o `afterEach` medir só a tela.
    db.chamadas = []
  })
})

/**
 * A altura de tela — FOCO-13, feature 47.
 *
 * O corpo desta tela não tinha altura, então a prévia rolava junto com os três editores e saía da
 * vista justamente enquanto se edita olhando para ela. O molde é o de `/admin/home`, **literalmente**
 * — e é por isso que a régua lê as DUAS páginas do disco e as compara: se uma mudar a altura e a
 * outra não, a régua reprova antes de as duas telas divergirem em silêncio.
 */
describe('AdminMenuPage — o corpo tem altura de tela (FOCO-13)', () => {
  const AQUI = dirname(fileURLToPath(import.meta.url))

  /**
   * O removedor de comentário — linha e bloco na MESMA varredura.
   *
   * As duas páginas CITAM a altura antiga em prosa, para explicar por que ela saiu. Sem isto,
   * `alturaDe` extrai a citação em vez da declaração e acusa o arquivo que está certo — a régua que
   * mede MENÇÃO em vez de USO, que este repositório já pagou duas vezes na feature 47.
   */
  const semComentarios = (texto: string): string =>
    texto.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

  const fonteMenu = semComentarios(readFileSync(resolve(AQUI, 'AdminMenuPage.tsx'), 'utf8'))
  const fonteHome = semComentarios(readFileSync(resolve(AQUI, 'AdminHomePage.tsx'), 'utf8'))

  const alturaDe = (fonte: string) => fonte.match(/lg:h-\[calc\(100vh-[^\]]*\)\]/)?.[0] ?? ''

  it('ÂNCORA: a varredura achou a declaração de altura nas DUAS páginas', () => {
    expect(alturaDe(fonteHome)).not.toBe('')
    expect(alturaDe(fonteMenu)).not.toBe('')
  })

  it('a altura do menu é a MESMA da Home — mesmo molde, um número só', () => {
    expect(alturaDe(fonteMenu)).toBe(alturaDe(fonteHome))
  })

  it('a altura desconta só o `p-6` do `<main>`, e mora na RAIZ das duas telas', () => {
    // O `11rem` de antes era desconto de cabeçalho ADIVINHADO, e o comentário desta tela registrava
    // isso como dívida: os dois `PageHeader` têm subtítulos de comprimentos diferentes, e o desta
    // é o mais longo do painel. Com a altura na raiz e a grade em `flex-1`, o cabeçalho toma o que
    // ele mede — não o que alguém supôs que ele mediria.
    expect(alturaDe(fonteHome)).toBe('lg:h-[calc(100vh-3rem)]')

    for (const fonte of [fonteHome, fonteMenu]) {
      expect(fonte).toContain('lg:flex lg:h-[calc(100vh-3rem)] lg:flex-col')
      expect(fonte).not.toContain('100vh-11rem')
    }
  })

  it('a coluna de edição é 560 nas DUAS telas — mesmo molde, um número só', () => {
    // `FOCO-13` diz que esta tela é o molde literal de `/admin/home`. Duas larguras diferentes
    // seriam o defeito 01 aplicado a layout: nada quebra, e as duas divergem na próxima mexida.
    const larguraDe = (fonte: string) =>
      fonte.match(/lg:grid-cols-\[(\d+)px_minmax\(0,1fr\)\]/)?.[1] ?? ''

    expect(larguraDe(fonteHome)).toBe('560')
    expect(larguraDe(fonteMenu)).toBe(larguraDe(fonteHome))
    // SENSOR: a declaração da `47` reprova na MESMA régua — o extrator acha, e o número é outro.
    expect(larguraDe('<div className="grid gap-6 lg:grid-cols-[440px_minmax(0,1fr)]">')).toBe('440')
  })

  it('a grade toma o que sobra, nas duas telas', () => {
    // `min-h-0` é o que permite à grade encolher abaixo do próprio conteúdo; sem ele ela empurra a
    // raiz para além da janela e as colunas voltam a rolar com o documento.
    const gradeDe = (fonte: string) => fonte.match(/className="grid[^"]*lg:grid-cols-\[[^"]*"/)?.[0] ?? ''

    for (const fonte of [fonteHome, fonteMenu]) {
      const grade = gradeDe(fonte)
      expect(grade).not.toBe('')
      expect(grade).toContain('lg:flex-1')
      expect(grade).toContain('lg:min-h-0')
      // A altura não pode voltar para cá: somada à da raiz, ela descontaria o cabeçalho duas vezes.
      expect(grade).not.toContain('lg:h-[calc(')
    }
  })

  it('a coluna da esquerda rola dentro de si, e o `min-h-0` é o que faz isso valer', () => {
    // Lê as DUAS formas de declarar classe — `className="literal"` e `className={cn('literal', …)}`.
    // A coluna passou à segunda quando ganhou o `hidden lg:flex` das abas de vista (`FOCO-35`), e a
    // âncora abaixo é quem transformou isso em suíte vermelha em vez de régua medindo string vazia.
    const trecho = fonteMenu.match(/data-testid="coluna-entradas"[\s\S]{0,300}?>/)?.[0] ?? ''
    const coluna = [...trecho.matchAll(/'([^']*)'|className="([^"]*)"/g)]
      .map(captura => captura[1] ?? captura[2])
      .join(' ')

    expect(coluna).not.toBe('')
    expect(coluna).toContain('lg:overflow-y-auto')
    // Sem `min-h-0`, um filho de flex/grid não encolhe abaixo do próprio conteúdo: a coluna
    // empurraria a grade em vez de rolar, e o `overflow` nunca dispararia.
    expect(coluna).toContain('min-h-0')
    expect(coluna).toContain('min-w-0')
  })

  it('SENSOR: o removedor de comentário — a régua mede USO, nunca menção', () => {
    expect(alturaDe(semComentarios('// era lg:h-[calc(100vh-11rem)]\nconst x = 1'))).toBe('')
    expect(alturaDe(semComentarios('/* lg:h-[calc(100vh-11rem)] */\nconst x = 1'))).toBe('')
    // Com CRLF, e sem comer a linha seguinte: a declaração de verdade CONTINUA sendo lida.
    expect(alturaDe(semComentarios('// nota\r\n<div className="lg:h-[calc(100vh-3rem)]">'))).toBe(
      'lg:h-[calc(100vh-3rem)]',
    )
  })

  it('SENSOR: a declaração original — grade SEM altura — reprova na mesma régua', () => {
    const antiga = '<div className="grid gap-6 lg:grid-cols-[440px_minmax(0,1fr)]">'
    expect(alturaDe(antiga)).toBe('')
    expect(antiga).not.toContain('lg:overflow-y-auto')
  })

  it('SENSOR: a forma da feature 47 — altura na grade, com o `11rem` — reprova nas mesmas réguas', () => {
    // O sensor passa pelo **extrator**, não compara literais escritos aqui: é o que garante que ele
    // mede a mesma régua da asserção, e não uma parecida.
    const daQuarentaESete = `  return (
    <div>
      <div className="grid gap-6 lg:h-[calc(100vh-11rem)] lg:grid-cols-[440px_minmax(0,1fr)]">`

    expect(alturaDe(daQuarentaESete)).toBe('lg:h-[calc(100vh-11rem)]')
    expect(alturaDe(daQuarentaESete)).not.toBe('lg:h-[calc(100vh-3rem)]')
    expect(daQuarentaESete).not.toContain('lg:flex-col')
  })
})

// Achado na prova em navegador da 86 (T23): "Ver na loja" era `<a href="/">`, e no painel `/` é a
// raiz do PAINEL — o botão abria uma aba nova do próprio backoffice. Mesmo defeito que o "Ver Loja"
// da sidebar já teve (`AccountMenu`). O destino é a origem da loja, de `storeOrigin()`.
describe('"Ver na loja" leva à loja, não à raiz do painel', () => {
  it('o link aponta para a origem da loja, em nova aba', async () => {
    await montar()
    const link = screen.getByRole('link', { name: /ver na loja/i })
    expect(link.getAttribute('href')).toBe('http://localhost:8082/')
    expect(link.getAttribute('target')).toBe('_blank')
  })
})

/** Fidelidade ao protótipo (2026-10-29): o cabeçalho e o selo `Salvo`. */
describe('cabeçalho no desenho do protótipo', () => {
  it('"Salvo" é verde, com o ponto', async () => {
    await montar()
    fireEvent.click(screen.getByTestId('chave-mobile-n-chaveiros'))
    const pronto = await screen.findByTestId('salvo')
    expect(pronto.className.split(/\s+/)).toContain('text-estrelinha-admin-emerald')
    expect(pronto.querySelector('[aria-hidden].rounded-full')).not.toBeNull()
  })

  it('"Ver na loja" é o botão violeta sem contorno, sem o hover rosa', async () => {
    await montar()
    const ver = screen.getByRole('link', { name: /Ver na loja/ })
    const t = ver.className.split(/\s+/)
    expect(t).toContain('text-estrelinha-admin-violet')
    expect(t).not.toContain('hover:bg-accent')
    expect(t).not.toContain('border-input')
  })
})
