// Feature 23 — as regras de endereçamento da loja, como **dado puro**.
//
// Vive em `@estrelinha/core` porque três consumidores que não podem divergir leem daqui: o roteador
// da loja (`apps/store/src/app/App.tsx`), o `vercel.json` (os 301 do edge) e o cadastro de categoria
// do backoffice (a recusa de slug reservado). Módulo sem dependência **de propósito**: os guardas que
// leem `App.tsx` e `vercel.json` do disco precisam poder importar isto sem arrastar React nem
// Supabase para dentro de um teste de arquivo.
//
// `AD-018`: a loja adota o formato da loja em produção — produto em `/produtos/:slug`, categoria raiz
// na **raiz do domínio** (`/:slug`) e subcategoria em `/:pai/:filha`. A consequência que esta lista
// existe para conter é que **o namespace de rota e o de slug de categoria passam a ser o mesmo**: uma
// categoria chamada "sobre" encobriria `/sobre`, e uma rota `/ajuda` nova encobriria a categoria
// `ajuda` — em silêncio, e em produção.

/**
 * O primeiro segmento de **toda rota declarada em `App.tsx`**.
 *
 * Bidirecional com o arquivo (`URL-06`): rota nova que não entre aqui derruba o guarda, e entrada que
 * deixou de ser rota também. As duas direções importam — a lista serve para recusar slug de
 * categoria, e uma entrada morta recusaria um nome que já está livre.
 */
export const ROUTE_SLUGS: readonly string[] = [
  'produtos',
  'produto',
  'colecao',
  'categoria',
  'carrinho',
  'pedido',
  'busca',
  'sobre',
  'politicas',
  // Feature 22. Entra aqui **junto** com a rota no `App.tsx`, nunca depois: com categoria na raiz do
  // domínio, uma rota de um segmento que não seja reservada encobre em silêncio a categoria homônima.
  //
  // Feature 31: deixou de renderizar página e virou **301** para `como-enviar-seu-material-de-dna`.
  // Continua aqui — e continua reservada — porque continua sendo uma rota declarada no `App.tsx`, e
  // porque uma categoria que ocupasse este slug engoliria o redirect das URLs já compartilhadas.
  'como-enviar-o-material',
  // Feature 31 — o guia de material redesenhado (artboards `5MC-0` e `6AU-0`).
  'como-enviar-seu-material-de-dna',
  'conta',
  'favoritos',
  'entrar',
  'checkout',
]

/**
 * Segmentos que **não são rota** e por isso **não aparecem no `App.tsx`** — são do host e do build.
 *
 * `assets` é a pasta que o Vite emite no `dist`; `api` e `_vercel` são reservados pela Vercel. Nenhum
 * deles passa pelo React Router: uma categoria com um desses slugs seria servida como arquivo (ou
 * pela plataforma) e a página nunca montaria. Ficam fora da comparação com o `App.tsx` de propósito,
 * e o guarda declara isso em vez de a lista ficar "com três entradas a mais que ninguém explica".
 */
export const INFRA_SLUGS: readonly string[] = ['assets', 'api', '_vercel']

/** A união das duas — o que um slug de categoria **nunca** pode ser. */
export const RESERVED_SLUGS: readonly string[] = [...ROUTE_SLUGS, ...INFRA_SLUGS]

/** Caixa e espaço nas bordas não distinguem endereço: `/Sobre` e `/sobre` chegam na mesma rota. */
const normalize = (slug: string): string => (slug ?? '').trim().toLowerCase()

export const isReservedSlug = (slug: string): boolean => {
  const normalized = normalize(slug)
  return normalized !== '' && RESERVED_SLUGS.includes(normalized)
}

/**
 * O motivo da recusa, ou `null` quando o slug está livre.
 *
 * **`string | null`, e não união discriminada por literal booleano.** `tsconfig.base.json` tem
 * `strictNullChecks: false`, e nesse modo `{ ok: true } | { ok: false; reason: string }` **não
 * estreita**: ler `verdict.reason` no ramo do `else` é TS2339. Mesmo formato de `menuSlotRefusal`.
 *
 * A mensagem carrega a **lista inteira** porque a AC 5 pede "com a lista visível": quem está
 * cadastrando precisa saber qual outro nome escolher sem ir procurar no código.
 *
 * Slug vazio devolve `null` — campo obrigatório é cobrança do formulário, e devolver motivo aqui
 * faria a tela acusar "endereço reservado" para quem ainda não digitou nada.
 */
export const reservedSlugRefusal = (slug: string): string | null => {
  if (!isReservedSlug(slug)) return null
  return (
    `“${normalize(slug)}” é um endereço reservado da loja e encobriria a página que já vive nele. ` +
    `Escolha outro. Reservados: ${RESERVED_SLUGS.join(', ')}.`
  )
}

/** O caminho canônico do produto — o formato que a loja em produção publica e o Google indexou. */
export const productPath = (slug: string): string => `/produtos/${slug}`

/**
 * O caminho canônico da categoria: raiz na raiz do domínio, filha com o **pai imediato** na frente.
 *
 * No máximo dois segmentos. Quem sobe a cadeia de pais é `categoryHref` (`@estrelinha/core/menu`) —
 * aqui só se monta a string, para o módulo continuar sem dependência.
 */
export const categoryPath = (slug: string, parentSlug?: string | null): string => {
  const parent = typeof parentSlug === 'string' ? parentSlug.trim() : ''
  return parent === '' ? `/${slug}` : `/${parent}/${slug}`
}

/**
 * O guia de envio de material (feature 31).
 *
 * Mora aqui, e não no slice que o desenha, porque **quem linka para ele não é quem o renderiza**: o
 * aviso de material da página do produto e o bloco do pedido são `entities`/`widgets` que, pela regra
 * de camadas do FSD, não podem importar de outro widget. Com o endereço em `core/routes` as três
 * pontas leem a mesma string — e quando ele mudar de novo, muda em um lugar.
 */
export const MATERIAL_GUIDE_PATH = '/como-enviar-seu-material-de-dna'

/**
 * `/como-enviar-seu-material-de-dna#cinzas` — o guia, opcionalmente já no material da cliente.
 *
 * A âncora vem de `materialAnchor` (`@estrelinha/core/material`), que não é importado aqui de
 * propósito: este módulo é sem dependência para que os guardas que leem `App.tsx` e `vercel.json` do
 * disco possam consumi-lo dentro de um teste de arquivo.
 */
export const materialGuideHref = (anchor?: string | null): string => {
  const alvo = typeof anchor === 'string' ? anchor.trim() : ''
  return alvo === '' ? MATERIAL_GUIDE_PATH : `${MATERIAL_GUIDE_PATH}#${alvo}`
}

/**
 * As formas legadas que continuam resolvendo, **em dado**.
 *
 * Duas pontas leem esta mesma lista: o `vercel.json` (301 no edge, que é o que preserva link equity e
 * o que `curl -I` mede) e o roteador da loja (o espelho para `pnpm dev` e para o vitest, que não têm
 * edge nenhum — sem ele a rota legada só quebraria no dia do cutover).
 *
 * **O destino de categoria é UM segmento, não dois**: o edge não conhece a árvore e não tem como
 * saber de que pai a filha pende. A forma de um segmento resolve com 200 e declara canonical para a
 * de dois (`AD-018`), então o legado chega ao conteúdo certo em um salto só.
 *
 * **Há duas formas de entrada, e a diferença é `:slug`.** As três primeiras são *padrões* — um
 * prefixo com um slug variável atrás. A quarta é um caminho **inteiro e fixo**: a feature 31 trocou
 * o endereço do guia de material, e não há nada de variável para casar. `legacyRedirectTo` distingue
 * as duas pela presença do `:slug`, e a Vercel aceita as duas no mesmo array.
 */
export const LEGACY_REDIRECTS: readonly { from: string; to: string }[] = [
  { from: '/produto/:slug', to: '/produtos/:slug' },
  { from: '/colecao/:slug', to: '/:slug' },
  { from: '/categoria/:slug', to: '/:slug' },
  // Feature 31. O guia da 22 vivia aqui e foi redesenhado a partir dos artboards; o endereço mudou
  // junto. O 301 existe porque a URL antiga está no rodapé de todo e-mail já enviado e no link que a
  // Adri manda por WhatsApp desde a feature 22 — quebrá-la manda a cliente para um 404 no momento em
  // que ela foi procurar como não estragar o material.
  { from: '/como-enviar-o-material', to: '/como-enviar-seu-material-de-dna' },
]

/**
 * Para onde uma URL legada vai — ou `null` quando o caminho não é legado.
 *
 * É a **única** implementação do espelho: o roteador da loja chama esta função nas três rotas
 * legadas, e o `vercel.json` declara as mesmas entradas para o edge. Duas leituras da mesma lista, e
 * nenhuma segunda cópia da regra de substituição.
 *
 * SPEC_DEVIATION: o `design.md` da feature 23 lista em `core/routes` só o dado (`LEGACY_REDIRECTS`)
 * e deixa a substituição implícita em cada consumidor.
 * Reason: os consumidores são três (as duas páginas em modo legado e o roteador). Escrever
 * `.replace(':slug', …)` em cada um seria a mesma regra em três lugares — o "defeito 01" do
 * projeto —, e a primeira forma legada nova divergiria num deles em silêncio.
 */
export const legacyRedirectTo = (pathname: string): string | null => {
  // Caminho fixo primeiro: `/como-enviar-o-material` também tem um "prefixo", e cair na busca por
  // padrão faria a entrada de caminho inteiro nunca ser alcançada — ou, pior, casar por engano com
  // `/como-enviar-o-material/qualquer-coisa` e produzir um destino com `:slug` literal na URL.
  const exata = LEGACY_REDIRECTS.find(r => !r.from.includes(':slug') && r.from === pathname)
  if (exata) return exata.to

  const [, prefix, slug] = pathname.split('/')
  if (!prefix || !slug) return null

  const entry = LEGACY_REDIRECTS.find(r => r.from.includes(':slug') && r.from.split('/')[1] === prefix)
  return entry ? entry.to.replace(':slug', slug) : null
}
