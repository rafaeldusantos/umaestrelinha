// Feature 61 (`EVT-15`, `CMP-09`) — a medição do GA4 tem UM dono no navegador, e a compra não é dele.
//
// ## O que este guarda prende
//
// 1. **Só `shared/lib/analytics/index.ts` fala com o Google.** A chamada à função global do gtag e
//    a fila global dele, em qualquer outro arquivo de produção de `apps/**`, é um segundo emissor: ele
//    não passa pelas cinco condições de `canMeasure` (ligado, ID válido, sem recusa, fora da prévia,
//    fora de dev), e a cliente que recusou continuaria sendo medida por ele. Build, `tsc` e teste de
//    componente passam — quem descobre é a aba Rede.
// 2. **O evento de compra não é montado em `apps/**`.** A compra é do servidor (`AD-047`): um
//    segundo emissor no navegador é exatamente a compra em dobro, e o F5 em `/pedido/:id` a triplica.
//    A régua casa o NOME EXATO do evento entre aspas — nunca a substring: o painel tem
//    `ga_purchase_status`, `useLastPurchaseSend`, `purchase_ordinal`, e a loja tem
//    `useProductPurchase`, e nenhum deles é o evento. Recusa também o builder do corpo do servidor.
// 3. **O coração tem uma porta.** Nenhum arquivo fora de `entities/wishlist` alterna o favorito pela
//    store crua — sem passar por `toggleWishlist`, favoritar deixaria de medir `add_to_wishlist`.
// 4. **A metade POSITIVA**: os pontos de chamada de `EVT-02..12` CHAMAM a porta. Sem ela, apagar os
//    eventos de uma tela deixaria as três réguas de ausência acima verdadeiras e vazias.
// 5. **A categoria de exibição tem um dono** (`item_category`, correção da 61). A régua de ordenação
//    — menor `sort_order`, desempate por `position` — mora em `core/product/displayCategory.ts`, e
//    nenhum arquivo de produção de `apps/**` **nem de `supabase/functions/**`** a declara de novo. A
//    primeira entrega tinha duas, e elas divergiam: a loja mandava a coluna legada (vazia), o servidor
//    mandava o nome. A régua acusa as duas formas que existiram — a subtração direta das duas
//    `sort_order` e o desempate por `position` num arquivo que fala de `sort_order` (a cópia do
//    servidor renomeava os campos antes de comparar).
//
// A prosa deste arquivo cita as formas proibidas; por isso a régua lê código SEM comentário, e os
// sensores provam o removedor com CRLF, LF e o glob de dois asteriscos (`BL-027`).

import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** Escopo literal: os dois apps. Nunca derivado do código medido. */
const ESCOPO = ['apps']

const IGNORADOS = new Set(['node_modules', 'dist', '.turbo', '.temp', 'coverage', '.git'])
const EXTENSOES = ['.ts', '.tsx']

const arquivos = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (IGNORADOS.has(entry.name)) return []
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return arquivos(full)
    return entry.isFile() && EXTENSOES.some(ext => entry.name.endsWith(ext)) ? [full] : []
  })

/** Linha e bloco na MESMA varredura, CRLF normalizado antes, numeração preservada. */
export const semComentarios = (fonte: string): string[] =>
  fonte
    .replace(/\r\n/g, '\n')
    .replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, t => t.replace(/[^\n]/g, ' '))
    .split('\n')

const eTeste = (rel: string) =>
  rel.includes('__tests__/') || rel.endsWith('.test.ts') || rel.endsWith('.test.tsx')

interface Arquivo {
  rel: string
  linhas: string[]
}

const varridos: Arquivo[] = ESCOPO.flatMap(d => arquivos(join(ROOT, d))).map(caminho => ({
  rel: relative(ROOT, caminho).split('\\').join('/'),
  linhas: semComentarios(readFileSync(caminho, 'utf8')),
}))

const producao = varridos.filter(a => !eTeste(a.rel))

const procurar = (padrao: RegExp, alvo: Arquivo[] = producao): string[] => {
  const achados: string[] = []
  for (const { rel, linhas } of alvo) {
    linhas.forEach((texto, i) => {
      if (padrao.test(texto)) achados.push(`${rel}:${i + 1} → ${texto.trim()}`)
    })
  }
  return achados
}

/** O dono — allowlist de UM, escrito literalmente. */
const DONO = 'apps/store/src/shared/lib/analytics/index.ts'

/** A função global do gtag sendo CHAMADA, ou a fila global sendo tocada. */
export const FALA_COM_O_GOOGLE = /\bgtag\s*\(|\bdataLayer\b/

/** O evento de compra pelo NOME EXATO entre aspas, ou o builder do corpo do servidor. */
export const MONTA_A_COMPRA = /(['"`])purchase\1|\bbuildPurchaseBody\b/

/** A store crua do coração sendo alternada. */
export const ALTERNA_FAVORITO_CRU = /\btoggleItem\b/

describe('medição — âncoras', () => {
  it('a varredura enxerga os dois apps', () => {
    expect(varridos.length).toBeGreaterThan(400)
    expect(producao.some(a => a.rel.startsWith('apps/store/src/'))).toBe(true)
    expect(producao.some(a => a.rel.startsWith('apps/backoffice/src/'))).toBe(true)
  })

  it('o dono existe e de fato fala com o Google — senão a ausência abaixo mede o nada', () => {
    const dono = producao.find(a => a.rel === DONO)
    expect(dono, DONO).toBeDefined()
    expect(procurar(FALA_COM_O_GOOGLE, [dono!]).length).toBeGreaterThanOrEqual(3)
  })
})

describe('EVT-15 — só o dono fala com o gtag', () => {
  it('nenhum outro arquivo de produção chama o gtag nem toca a fila', () => {
    const fora = procurar(FALA_COM_O_GOOGLE).filter(o => !o.startsWith(`${DONO}:`))
    expect(fora).toEqual([])
  })
})

describe('CMP-09 — a compra não é montada em apps/**', () => {
  it('nenhum arquivo de produção nomeia o evento de compra nem o corpo do servidor', () => {
    expect(procurar(MONTA_A_COMPRA)).toEqual([])
  })
})

describe('EVT-08 — o coração passa por toggleWishlist', () => {
  it('fora de entities/wishlist ninguém alterna o favorito pela store crua', () => {
    const fora = procurar(ALTERNA_FAVORITO_CRU).filter(
      o => !o.startsWith('apps/store/src/entities/wishlist/'),
    )
    expect(fora).toEqual([])
  })

  it('e os cinco corações chamam a porta', () => {
    for (const rel of [
      'apps/store/src/entities/product/ui/ProductCard.tsx',
      'apps/store/src/entities/product/ui/ProductInfo.tsx',
      'apps/store/src/pages/ProductPage.tsx',
      'apps/store/src/widgets/product-buy-bar/ui/ProductBuyBar.tsx',
      'apps/store/src/widgets/cart-drawer/ui/CartDrawerRow.tsx',
    ]) {
      const a = producao.find(x => x.rel === rel)
      expect(a, rel).toBeDefined()
      expect(procurar(/\btoggleWishlist\s*\(/, [a!]).length, rel).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('EVT-02..12 e 16..17 — a metade POSITIVA: cada ponto de chamada chama a porta', () => {
  const PONTOS: [string, RegExp][] = [
    ['apps/store/src/pages/CategoryPage.tsx', /\buseTrackList\s*\(/],
    ['apps/store/src/pages/SearchPage.tsx', /\buseTrackList\s*\(/],
    ['apps/store/src/pages/WishlistPage.tsx', /\buseTrackList\s*\(/],
    ['apps/store/src/widgets/related-products/ui/RelatedProducts.tsx', /\buseTrackList\s*\(/],
    ['apps/store/src/widgets/product-carousel/ui/ProductCarousel.tsx', /\buseTrackList\s*\(/],
    ['apps/store/src/shared/lib/analytics/useTrackList.ts', /\btrack\s*\(/],
    ['apps/store/src/entities/product/ui/ProductCard.tsx', /\btrack\s*\(/],
    ['apps/store/src/pages/ProductPage.tsx', /\btrack\s*\(/],
    ['apps/store/src/entities/product/model/useProductPurchase.tsx', /\btrack\s*\(/],
    ['apps/store/src/widgets/cart-drawer/ui/CrossSell.tsx', /\btrack\s*\(/],
    ['apps/store/src/widgets/cart-drawer/ui/CartDrawerRow.tsx', /\btrack\s*\(/],
    ['apps/store/src/widgets/cart-drawer/ui/CartDrawer.tsx', /\btrack\s*\(/],
    ['apps/store/src/entities/wishlist/model/toggleWishlist.ts', /\btrack\s*\(/],
    ['apps/store/src/features/search/model/trackSearch.ts', /\btrack\s*\(/],
    ['apps/store/src/features/search/ui/SearchDropdown.tsx', /\btrackSearch\s*\(/],
    ['apps/store/src/features/search/ui/SearchOverlay.tsx', /\btrackSearch\s*\(/],
    ['apps/store/src/pages/SearchPage.tsx', /\btrackSearch\s*\(/],
    ['apps/store/src/pages/CheckoutPage.tsx', /\buseBeginCheckout\s*\(/],
    ['apps/store/src/features/checkout/model/checkoutAnalytics.ts', /\btrack\s*\(/],
    ['apps/store/src/features/checkout/ui/DeliveryBlock.tsx', /\btrackShippingInfo\s*\(/],
    ['apps/store/src/features/checkout/ui/PaymentBlock.tsx', /\btrackPaymentInfo\s*\(/],
    ['apps/store/src/app/PageViewTracker.tsx', /\btrack\s*\(/],
    // EVT-16/17 (P2)
    ['apps/store/src/features/auth/model/authAnalytics.ts', /\btrack\s*\(/],
    ['apps/store/src/features/auth/model/useAuthFlow.ts', /\btrackSignUp\s*\(/],
    ['apps/store/src/features/auth/model/useAuthFlow.ts', /\btrackLogin\s*\(/],
    ['apps/store/src/widgets/header/ui/Header.tsx', /\buseGoogleLoginReturn\s*\(/],
    ['apps/store/src/pages/CheckoutPage.tsx', /\buseGoogleLoginReturn\s*\(/],
  ]

  it.each(PONTOS)('%s chama a porta', (rel, chamada) => {
    const a = producao.find(x => x.rel === rel)
    expect(a, rel).toBeDefined()
    expect(procurar(chamada, [a!]).length).toBeGreaterThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------------------------
// 5. A categoria de exibição — um dono, em `core`, alcançado pelos dois lados.
// ---------------------------------------------------------------------------------------------

/** Escopo literal, mais largo que o da medição: o servidor também é consumidor da régua. */
const ESCOPO_DA_CATEGORIA = ['apps', 'supabase/functions']

/** O dono, lido do disco — fora do escopo, e é a âncora de que a régua enxerga a forma real. */
const DONO_DA_CATEGORIA = 'packages/core/src/product/displayCategory.ts'

const varridosDaCategoria: Arquivo[] = ESCOPO_DA_CATEGORIA.flatMap(d => arquivos(join(ROOT, d)))
  .map(caminho => ({
    rel: relative(ROOT, caminho).split('\\').join('/'),
    linhas: semComentarios(readFileSync(caminho, 'utf8')),
  }))
  .filter(a => !eTeste(a.rel))

/** Duas `sort_order` subtraídas — o comparador da ordem editorial, em qualquer quebra de linha. */
export const SUBTRAI_SORT_ORDER = /\bsort_order\b[\s)\]]*-\s*[\w.?!()[\]]*?\bsort_order\b/

/** Duas `position` subtraídas — o desempate. Só conta num arquivo que também fala de `sort_order`. */
export const SUBTRAI_POSITION = /\b(?:position|posicao)\b[\s)\]]*-\s*[\w.?!()[\]]*?\b(?:position|posicao)\b/

/** O arquivo (já sem comentário) declara a régua de ordenação da categoria? */
export const declaraARegua = (linhas: string[]): boolean => {
  const codigo = linhas.join('\n')
  if (SUBTRAI_SORT_ORDER.test(codigo)) return true
  return /\bsort_order\b/.test(codigo) && SUBTRAI_POSITION.test(codigo)
}

describe('item_category — a régua de ordenação da categoria tem UM dono (correção da 61)', () => {
  it('âncora: a varredura enxerga os dois apps E as edge functions', () => {
    expect(varridosDaCategoria.length).toBeGreaterThan(400)
    expect(varridosDaCategoria.some(a => a.rel === 'supabase/functions/mercado-pago/analytics.ts')).toBe(true)
    expect(varridosDaCategoria.some(a => a.rel.startsWith('apps/backoffice/src/'))).toBe(true)
  })

  it('âncora: o DONO é acusado pela régua — ela enxerga a forma real, e não o nada', () => {
    const dono = semComentarios(readFileSync(join(ROOT, DONO_DA_CATEGORIA), 'utf8'))
    expect(declaraARegua(dono)).toBe(true)
  })

  it('nenhum arquivo de produção de apps/** ou supabase/functions/** declara a régua de novo', () => {
    expect(varridosDaCategoria.filter(a => declaraARegua(a.linhas)).map(a => a.rel)).toEqual([])
  })

  it('a metade POSITIVA: a loja e o servidor CHAMAM o dono', () => {
    for (const [rel, chamada] of [
      ['apps/store/src/entities/product/lib/displayCategory.ts', /\bpickDisplayCategory\s*\(/],
      ['apps/store/src/shared/lib/analytics/items.ts', /\bdisplayCategorySlug\s*\(/],
      ['supabase/functions/mercado-pago/analytics.ts', /\bdisplayCategorySlug\s*\(/],
    ] as [string, RegExp][]) {
      const a = varridosDaCategoria.find(x => x.rel === rel)
      expect(a, rel).toBeDefined()
      expect(procurar(chamada, [a!]).length, rel).toBeGreaterThanOrEqual(1)
    }
  })

  it('o item da loja não lê a coluna LEGADA — `category_slug` é nula nos 691 produtos', () => {
    const itens = varridosDaCategoria.find(x => x.rel === 'apps/store/src/shared/lib/analytics/items.ts')!
    expect(procurar(/\bcategory_slug\b/, [itens])).toEqual([])
  })
})

describe('SENSORES', () => {
  it('categoria: a cópia antiga da LOJA (subtração direta, quebrada em linhas) é acusada', () => {
    const copia = [
      'candidates.sort(',
      '  (a, b) =>',
      '    a.category.sort_order - b.category.sort_order ||',
      '    a.link.position - b.link.position ||',
      '    a.link.category_id.localeCompare(b.link.category_id),',
      ')',
    ]
    expect(declaraARegua(copia)).toBe(true)
  })

  it('categoria: a cópia antiga do SERVIDOR (campos renomeados antes de comparar) é acusada', () => {
    const copia = [
      '  .map((l) => ({ ordem: numero(l.categories.sort_order), posicao: numero(l.position) }))',
      'candidatos.sort((a, b) => a.ordem - b.ordem || a.posicao - b.posicao || a.id.localeCompare(b.id))',
    ]
    expect(declaraARegua(copia)).toBe(true)
  })

  it('categoria — INVERSO: ordenar variação por position, sem sort_order no arquivo, não é a régua', () => {
    expect(declaraARegua(['const ordered = [...options].sort((a, b) => a.position - b.position)'])).toBe(false)
  })

  it('categoria — INVERSO: chamar o dono, ou ler sort_order sem comparar, não é a régua', () => {
    expect(
      declaraARegua([
        'const escolhida = pickDisplayCategory(links)',
        "  .select('id, sort_order, product_categories(category_id, position)')",
      ]),
    ).toBe(false)
  })

  it('categoria: a prosa que explica a régua não é acusada (comentário sai antes)', () => {
    const regra = ['a.sort_order', 'b.sort_order'].join(' - ')
    for (const quebra of ['\r\n', '\n']) {
      const linhas = semComentarios([`// nunca escreva ${regra}`, `/* nem ${regra} */`, 'const x = 1'].join(quebra))
      expect(declaraARegua(linhas)).toBe(false)
    }
  })

  it('a régua do gtag acusa as formas de chamar e de tocar a fila', () => {
    expect(FALA_COM_O_GOOGLE.test("window.gtag('event', 'x')")).toBe(true)
    expect(FALA_COM_O_GOOGLE.test("gtag('event', 'x')")).toBe(true)
    expect(FALA_COM_O_GOOGLE.test('window.dataLayer.push({ event: "x" })')).toBe(true)
  })

  it('INVERSO: track(...) e o nome do evento NÃO são acusados pela régua do gtag', () => {
    expect(FALA_COM_O_GOOGLE.test("track(viewItemEvent({ item }))")).toBe(false)
    expect(FALA_COM_O_GOOGLE.test("track('view_item', params)")).toBe(false)
  })

  it('a régua da compra acusa o nome exato, nas três aspas, e o builder do servidor', () => {
    expect(MONTA_A_COMPRA.test("track({ name: 'purchase', params })")).toBe(true)
    expect(MONTA_A_COMPRA.test('gtag("event", "purchase")')).toBe(true)
    expect(MONTA_A_COMPRA.test('const n = `purchase`')).toBe(true)
    expect(MONTA_A_COMPRA.test("import { buildPurchaseBody } from '@estrelinha/core/analytics'")).toBe(true)
  })

  it('INVERSO: os identificadores que CONTÊM a palavra não são o evento', () => {
    for (const legitimo of [
      ".select('ga_purchase_status, ga_purchase_at')",
      "const { data } = useLastPurchaseSend()",
      '<LastPurchaseCard />',
      "order('purchase_ordinal')",
      "const purchase = useProductPurchase(product)",
      "ga_purchase_status: 'sent'",
    ]) {
      expect(MONTA_A_COMPRA.test(legitimo), legitimo).toBe(false)
    }
  })

  it('INVERSO: toggleWishlist(product) não é a store crua', () => {
    expect(ALTERNA_FAVORITO_CRU.test('toggleWishlist(product)')).toBe(false)
    expect(ALTERNA_FAVORITO_CRU.test('const t = useWishlistStore(s => s.toggleItem)')).toBe(true)
  })

  it('comentário sai, com CRLF e com LF — a prosa que explica a regra não é acusada', () => {
    const proibido = ['window', 'gtag'].join('.') + "('event')"
    for (const quebra of ['\r\n', '\n']) {
      const linhas = semComentarios(
        ['const antes = 1', `// nunca chame ${proibido}`, `/* nem ${proibido} */`, 'const depois = 3'].join(quebra),
      )
      expect(linhas.some(l => FALA_COM_O_GOOGLE.test(l))).toBe(false)
      expect(linhas.some(l => l.includes('const antes = 1'))).toBe(true)
      expect(linhas.some(l => l.includes('const depois = 3'))).toBe(true)
    }
  })

  it('comentário de linha com glob de dois asteriscos não cega o código abaixo (BL-027)', () => {
    const linhas = semComentarios(
      ['// varre apps/**', "window.gtag('event', 'x')", '/* bloco */', 'const y = 2'].join('\n'),
    )
    expect(linhas.some(l => FALA_COM_O_GOOGLE.test(l))).toBe(true)
    expect(linhas.some(l => l.includes('const y = 2'))).toBe(true)
  })
})
