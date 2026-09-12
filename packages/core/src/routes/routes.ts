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
  // Feature 45 — as duas políticas obrigatórias, cada uma em página própria.
  //
  // **Os slugs são LITERAIS do site em produção**, lidos do `sitemap.xml` de `umaestrelinha.com.br`
  // em 2026-09-12, e a divergência entre o plural do primeiro e o singular do segundo é **do site**,
  // não erro de digitação. Padronizá-los seria mudança de endereço disfarçada de arrumação — a mesma
  // armadilha que `AD-018` existe para recusar, e o mesmo motivo pelo qual a feature 31 adotou
  // `como-enviar-seu-material-de-dna` em vez de um slug mais curto.
  //
  // `politicas` (o ÍNDICE que apontava para as duas) foi REMOVIDO — não apenas do rodapé, a rota
  // inteira saiu do `App.tsx`. Ele nunca teve seção própria, só apontava para as duas abaixo, e o
  // conteúdo que não tinha outra casa (Envio, Pagamento) saiu de circulação junto. Comparação de
  // `ROUTE_SLUGS` continua sendo de **segmento inteiro**, então isto nunca reservou as duas entradas
  // abaixo por prefixo.
  'politicas-de-trocas-e-devolucoes',
  'politica-de-privacidade',
  // Cuidados com sua joia afetiva. Mesma régua: slug LITERAL do site em produção
  // (`umaestrelinha.com.br/cuidados-com-sua-joia-afetiva/`, lido em 2026-09-12), sem a barra final —
  // `trailingSlash: false` já resolve isso no `vercel.json`.
  'cuidados-com-sua-joia-afetiva',
  // Feature 46 — a página de perguntas frequentes da loja.
  //
  // **Este slug NÃO é literal de produção**, e a diferença importa: as três entradas acima foram
  // lidas do `sitemap.xml` do site porque já estavam indexadas, e mudá-las seria trocar endereço
  // disfarçado de arrumação. Esta página não existe lá, então não há URL a preservar — e por isso
  // ela também não entra em `LEGACY_REDIRECTS`. Se um endereço de FAQ já tiver sido divulgado por
  // WhatsApp ou Instagram, é ali que ele entra, e não aqui.
  'perguntas-frequentes',
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
 * estreita**: ler `verdict.reason` no ramo do `else` é TS2339. Mesmo formato de `menuTargetRefusal`.
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
 * As duas políticas com página própria (feature 45).
 *
 * Moram aqui **pela mesma razão que `MATERIAL_GUIDE_PATH`**, e o caso é ainda mais claro: quem linka
 * para elas não é quem as renderiza. O rodapé é um `widget` e o índice é outra `page` — nenhum dos
 * dois pode importar da página que desenha a política (o rodapé porque `widgets` não importa de
 * `pages`; o índice porque importar o módulo irmão para pegar uma string **arrasta o chunk inteiro
 * da outra política para dentro do chunk do índice**, desfazendo o `PRF-16` sem que
 * `routeSplitting.test.ts` — cujo escopo é o `App.tsx` — tenha como ver).
 *
 * Os valores são **literais do site em produção**, lidos do `sitemap.xml` dele em 2026-09-12: plural
 * no primeiro, singular no segundo. A assimetria é do site.
 */
export const RETURNS_POLICY_PATH = '/politicas-de-trocas-e-devolucoes'
export const PRIVACY_POLICY_PATH = '/politica-de-privacidade'

/**
 * Cuidados com sua joia afetiva — o guia de conservação da peça.
 *
 * Mora aqui pela mesma razão das duas acima: quem linka (o rodapé) não é quem renderiza, e o valor é
 * **literal** do site em produção (`/cuidados-com-sua-joia-afetiva/`, lido em 2026-09-12), sem a
 * barra final.
 */
export const JEWELRY_CARE_PATH = '/cuidados-com-sua-joia-afetiva'

/**
 * A página de perguntas frequentes da loja (feature 46).
 *
 * Mora aqui pela razão de sempre, e ela vale em três pontas desta vez: **quem linka não é quem
 * renderiza**. O rodapé é um `widget` e não pode importar de `pages`; o painel aponta "Ver na loja"
 * para cá e vive em **outro app**; e o sitemap precisa da string sem arrastar React para dentro do
 * teste que lê o `App.tsx` do disco.
 */
export const FAQ_PATH = '/perguntas-frequentes'

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
 * As rotas FIXAS que entram no sitemap (feature 33, `SMP-04`).
 *
 * São as únicas rotas de caminho fixo do `App.tsx` que servem conteúdo público e estável. Produto e
 * categoria não estão aqui de propósito — eles vêm do catálogo, e quem monta a URL deles é
 * `productPath`/`categoryHref`.
 *
 * `MATERIAL_GUIDE_PATH` é reaproveitado em vez de reescrito: o endereço do guia já mudou uma vez
 * (feature 31), e uma segunda escrita dele aqui sairia do lugar sem quebrar nada.
 */
export const SITEMAP_STATIC_PATHS: readonly string[] = [
  '/',
  '/sobre',
  // Feature 45. As duas políticas são conteúdo público e estável, e entram aqui pelo motivo que
  // `NON_INDEXABLE_PATHS` explica ao contrário: sem anúncio no sitemap, a descoberta delas volta a
  // depender de o rastreador executar o JavaScript da vitrine. São também as URLs que o Google
  // Merchant Center e o meio de pagamento pedem por escrito. O índice `/politicas` que as anunciava
  // foi removido — a rota não existe mais, e uma entrada dele aqui seria uma URL do sitemap
  // apontando para 404.
  //
  // Pelas constantes, e não por literal repetido: mesma regra do `MATERIAL_GUIDE_PATH` logo acima.
  RETURNS_POLICY_PATH,
  PRIVACY_POLICY_PATH,
  JEWELRY_CARE_PATH,
  MATERIAL_GUIDE_PATH,
  // Feature 46. É a página que mais tem motivo para ser encontrada por busca — ela responde a dúvida
  // de quem ainda não decidiu comprar, e boa parte dessas perguntas chega como busca.
  FAQ_PATH,
]

/**
 * As rotas declaradas que ficam **deliberadamente fora** do sitemap, cada uma com o motivo.
 *
 * Esta lista não existe para ser lida em runtime — existe para que a classificação seja
 * **obrigatória**. `sitemapRoutes.test.ts` lê o `App.tsx` do disco e exige que toda rota esteja em
 * exatamente um de quatro conjuntos: aqui, em `SITEMAP_STATIC_PATHS`, entre as dinâmicas, ou em
 * `LEGACY_REDIRECTS`. Sem isso a próxima página pública nasceria fora do sitemap por esquecimento —
 * e ninguém descobriria, porque nada quebra.
 *
 * O `reason` é parte do dado, não comentário: uma entrada sem motivo escrito é uma exclusão que
 * ninguém pode revisar depois.
 */
export const NON_INDEXABLE_PATHS: readonly { path: string; reason: string }[] = [
  { path: '/carrinho', reason: 'estado do navegador, não conteúdo — muda a cada visitante' },
  { path: '/checkout', reason: 'transacional; nada a indexar e tudo a não expor' },
  { path: '/pedido/:id', reason: 'privado — é o pedido de uma pessoa' },
  { path: '/conta', reason: 'privado, atrás de autenticação' },
  { path: '/favoritos', reason: 'privado, por navegador' },
  { path: '/entrar', reason: 'autenticação' },
  { path: '/busca', reason: 'espaço de rastreio infinito: uma URL por combinação de parâmetro' },
]

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
