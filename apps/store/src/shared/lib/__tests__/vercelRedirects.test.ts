import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LEGACY_REDIRECTS } from '@estrelinha/core/routes'

/**
 * `URL-02` — o guarda do `vercel.json`.
 *
 * O 301 das URLs legadas mora no **edge**, porque só o edge devolve status HTTP de verdade — é ele
 * que preserva o link equity e é ele que `curl -I` mede. O roteador da loja tem o espelho (para
 * `pnpm dev` e para o vitest, que não têm edge nenhum), mas o espelho não é o que o Google vê.
 *
 * Config sem verificação é código não provado, e este arquivo é o pior caso disso: um `source`
 * escrito errado **não quebra nada** — o build passa, os testes de componente passam, a loja sobe.
 * O que acontece é que a URL indexada cai no `rewrites` do SPA, a página monta, e a loja serve o
 * mesmo conteúdo em dois endereços sem canônica. Ninguém descobre até o relatório do Search Console.
 *
 * Por isso o teste lê `apps/store/vercel.json` **do disco**, por caminho literal, e compara com
 * `LEGACY_REDIRECTS` — a mesma lista que o `App.tsx` consome. As duas pontas não podem divergir.
 *
 * Não se testa aqui que `redirects` roda **antes** de `rewrites`: isso é comportamento documentado
 * da plataforma, não do repositório. O que é nosso — e está testado — é o que está escrito no
 * arquivo.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/**
 * O caminho escrito por extenso, e não derivado de uma constante do código medido. A régua nunca
 * pode ser o objeto medido: um caminho montado a partir do que se quer testar encolhe junto com ele.
 */
const VERCEL_JSON = join(ROOT, 'apps/store/vercel.json')

type Redirect = { source?: string; destination?: string; statusCode?: number; permanent?: boolean }
type VercelConfig = {
  framework?: string
  regions?: string[]
  trailingSlash?: boolean
  buildCommand?: string
  redirects?: Redirect[]
  rewrites?: { source?: string; destination?: string }[]
  headers?: { source?: string; headers?: { key?: string; value?: string }[] }[]
}

const RAW = readFileSync(VERCEL_JSON, 'utf8')
const CONFIG = JSON.parse(RAW) as VercelConfig

/**
 * Feature 69 (`AD-053`): o catch-all deixou de ser o `index.html` do SPA e passou a ser a função
 * `api/page`, que serve o `<head>` de cada rota (produto, categoria, página fixa, rota de app, 404).
 * Escrito por extenso — a régua nunca é o objeto medido.
 */
const CATCH_ALL = { source: '/:path*', destination: '/api/page?__path=/:path*' }

describe('vercel.json — âncora da leitura', () => {
  it('o arquivo lido tem conteúdo de verdade', () => {
    // Sem esta âncora, um caminho errado (ou um arquivo esvaziado) faria o resto da suíte comparar
    // listas vazias com listas vazias e passar em silêncio — a pior falha possível num guarda.
    expect(RAW.trim().length).toBeGreaterThan(100)
    // E é o arquivo CERTO: a configuração de host da loja, não outro JSON qualquer do repositório.
    expect(CONFIG.framework).toBe('vite')
  })

  it('encontra um redirect para cada forma legada', () => {
    // A segunda metade da âncora dupla: contou o que leu, e o número bate com a lista de origem.
    expect(CONFIG.redirects).toBeDefined()
    expect(CONFIG.redirects.length).toBe(LEGACY_REDIRECTS.length)

    // E o tamanho da própria régua está escrito aqui: esvaziar `LEGACY_REDIRECTS` tornaria a
    // comparação acima verdadeira contra um `redirects: []`, que é exatamente o defeito a evitar.
    // Três padrões de categoria/produto (feature 23) + o caminho fixo do guia (feature 31).
    expect(LEGACY_REDIRECTS.length).toBe(4)
  })
})

describe('vercel.json — os 301 das URLs legadas (URL-02)', () => {
  const bySource = (source: string): Redirect =>
    CONFIG.redirects.find((entry) => entry.source === source)

  it('`/produto/:slug` → `/produtos/:slug` com 301 — o singular nunca foi canônico (AC 2)', () => {
    const entry = bySource('/produto/:slug')
    expect(entry).toBeDefined()
    expect(entry.destination).toBe('/produtos/:slug')
    expect(entry.statusCode).toBe(301)
  })

  it('`/colecao/:slug` → `/:slug` com 301 — a rota da loja nova deixa de ser canônica (AC 3c)', () => {
    const entry = bySource('/colecao/:slug')
    expect(entry).toBeDefined()
    expect(entry.destination).toBe('/:slug')
    expect(entry.statusCode).toBe(301)
  })

  it('`/categoria/:slug` → `/:slug` com 301 — forma que a Nuvemshop aceita e canonicaliza', () => {
    const entry = bySource('/categoria/:slug')
    expect(entry).toBeDefined()
    expect(entry.destination).toBe('/:slug')
    expect(entry.statusCode).toBe(301)
  })

  it('`/como-enviar-o-material` → o guia novo com 301 (feature 31)', () => {
    // Caminho INTEIRO, sem `:slug`: a feature 31 trocou o endereço do guia de material, e não há
    // nada de variável para casar. É a URL que está no rodapé de todo e-mail já enviado.
    const entry = bySource('/como-enviar-o-material')
    expect(entry).toBeDefined()
    expect(entry.destination).toBe('/como-enviar-seu-material-de-dna')
    expect(entry.statusCode).toBe(301)
  })

  it('o edge declara exatamente o mesmo conjunto que `LEGACY_REDIRECTS` — nas duas direções', () => {
    // Bidirecional: entrada nova na lista que não chegou ao arquivo quebra aqui, e entrada no
    // arquivo que ninguém declarou na lista também. Sem isso as duas pontas envelhecem separadas.
    const noArquivo = CONFIG.redirects.map((entry) => `${entry.source} → ${entry.destination}`).sort()
    const naLista = LEGACY_REDIRECTS.map((entry) => `${entry.from} → ${entry.to}`).sort()

    expect(noArquivo).toEqual(naLista)
  })

  it('nenhum redirect usa `permanent`', () => {
    // `permanent: true` produz **308**, e a AC 2 pede 301. Os dois campos também não podem coexistir
    // no mesmo objeto — a Vercel recusa a configuração. Assere-se a ausência da chave, não a
    // ausência do valor `true`: `permanent: false` produziria 307 e seria igualmente errado.
    for (const entry of CONFIG.redirects) {
      expect(Object.prototype.hasOwnProperty.call(entry, 'permanent')).toBe(false)
    }
  })
})

describe('vercel.json — barra final e o que já existia', () => {
  it('`trailingSlash: false` — a canônica é a forma sem barra', () => {
    // `undefined` está fora de questão: as duas formas serviriam o mesmo conteúdo sem canônica.
    // A URL indexada (`/produtos/x/`) paga UM salto 308 e chega na forma que o router serve.
    expect(CONFIG.trailingSlash).toBe(false)
  })

  /**
   * Feature 30 (`GSH-03`, `GSH-12`): esta asserção foi **reescrita porque a spec mudou o
   * comportamento**, e ela GANHOU vizinhas em vez de ser afrouxada. Até a `30` o array tinha um
   * elemento só; agora tem três, e o que precisa ser guardado deixou de ser a igualdade e passou a
   * ser a **ordem**.
   */
  /**
   * Feature 69: reescrita porque a spec mudou o comportamento — o catch-all aponta para a função, e
   * ganhou a vizinha que recusa a volta do `index.html` (que serviria o shell sem `<head>` de rota e
   * com 200 para qualquer URL inexistente).
   */
  it('o catch-all existe e aponta para a função `api/page` — sem ele nenhuma rota profunda responde no F5', () => {
    expect(CONFIG.rewrites).toContainEqual(CATCH_ALL)
  })

  it('nenhum rewrite volta a servir o `index.html` do SPA (feature 69)', () => {
    for (const r of CONFIG.rewrites) expect(r.destination, r.source).not.toBe('/index.html')
  })

  it('o catch-all é o ÚLTIMO — a Vercel avalia rewrites por ordem', () => {
    // Um catch-all na frente engoliria o feed e a página servida **sem erro nenhum**: as duas rotas
    // passariam a devolver o `index.html` do SPA, o Merchant Center leria HTML no lugar do RSS e a
    // landing page voltaria a não ter JSON-LD. Nada quebraria; só pararia de funcionar.
    const ultimo = CONFIG.rewrites[CONFIG.rewrites.length - 1]
    expect(ultimo).toEqual(CATCH_ALL)
    expect(CONFIG.rewrites.filter((r) => r.source === CATCH_ALL.source)).toHaveLength(1)
    // E a forma antiga não sobrevive ao lado da nova, em posição nenhuma.
    expect(CONFIG.rewrites.filter((r) => r.source === '/(.*)')).toHaveLength(0)
  })
})

describe('vercel.json — as duas rotas do Google Shopping (feature 30)', () => {
  const porSource = (source: string) => CONFIG.rewrites.find((r) => r.source === source)

  it('o feed é exposto sob o domínio da loja', () => {
    const feed = porSource('/feeds/google-shopping.xml')
    expect(feed).toBeDefined()
    expect(feed.destination).toMatch(/\/functions\/v1\/google-feed$/)
  })

  /**
   * Feature 69 (`AD-053`): a página do produto deixou de ser um `rewrite` para a edge function
   * `product-page` e passou a sair da função `api/page`, no mesmo deploy, pelo catch-all. A asserção
   * antiga ("passa pela function") foi INVERTIDA, e a positiva mora no bloco da feature 69 abaixo.
   */
  it('a página do produto NÃO tem mais rewrite próprio — sai do catch-all, pela função da loja', () => {
    expect(porSource('/produtos/:slug')).toBeUndefined()
    for (const r of CONFIG.rewrites) expect(r.destination, r.source).not.toMatch(/product-page/)
  })

  it('o feed vem ANTES do catch-all', () => {
    const i = (source: string) => CONFIG.rewrites.findIndex((r) => r.source === source)
    expect(i('/feeds/google-shopping.xml')).toBeGreaterThanOrEqual(0)
    expect(i('/feeds/google-shopping.xml')).toBeLessThan(i(CATCH_ALL.source))
  })

  it('feed e sitemap apontam para o MESMO host — meia configuração é pior que nenhuma', () => {
    const host = (source: string) => new URL(porSource(source).destination).host
    expect(host('/feeds/google-shopping.xml')).toBe(host('/sitemap.xml'))
  })

  it('o host é um projeto Supabase', () => {
    for (const source of ['/feeds/google-shopping.xml', '/sitemap.xml']) {
      expect(new URL(porSource(source).destination).host).toMatch(/\.supabase\.co$/)
    }
  })

  /**
   * **Não há projeto Supabase hospedado da Uma Estrelinha** (`C-08`), então o host das duas rotas é
   * um marcador. Um marcador que ninguém rastreia é uma armadilha com prazo indeterminado — o mesmo
   * defeito que a lista de slugs reservados existe para conter. Este teste transforma a pendência em
   * item rastreado: enquanto o marcador estiver no arquivo, ele **precisa** estar declarado no
   * backlog. Substituído pelo ref real, o teste sai de cena sozinho.
   */
  it('enquanto o host for marcador, a pendência está declarada no BACKLOG', () => {
    const host = new URL(porSource('/feeds/google-shopping.xml').destination).host
    const ehMarcador = /[A-Z]/.test(host)
    if (!ehMarcador) return
    const backlog = readFileSync(join(ROOT, '.specs/BACKLOG.md'), 'utf8')
    expect(backlog).toContain('BL-016')
    expect(backlog).toContain(host)
  })

  /**
   * `BUG-20260829` — o gateway `*.supabase.co` reescreve `text/html` para `text/plain`, e até a
   * feature 69 o `vercel.json` reimpunha o tipo em `/produtos/:slug`. Com a página saindo da função
   * da própria loja o tipo é NOSSO (`servePage` declara `text/html; charset=utf-8`), e o override
   * deixou de ter carga (`AD-053`). A asserção antiga foi invertida, e a regra que sobra é a de
   * sempre: override de `Content-Type` só onde há um gateway de terceiro reescrevendo — hoje, só o
   * sitemap. A prova da entrega continua sendo o `curl` contra o deploy, nunca o arquivo.
   */
  it('não reimpõe Content-Type em /produtos/:slug — o tipo vem da função da loja (feature 69)', () => {
    expect(CONFIG.headers.find((entry) => entry.source === '/produtos/:slug')).toBeUndefined()
  })

  it('o único override de Content-Type é o do sitemap', () => {
    const comTipo = CONFIG.headers
      .filter((entry) => entry.headers.some((h) => h.key.toLowerCase() === 'content-type'))
      .map((entry) => entry.source)
    expect(comTipo).toEqual(['/sitemap.xml'])
  })

  it('os headers existentes ficam intactos', () => {
    // Âncora de contagem: sem ela, uma entrada some por edição e as duas buscas abaixo seguem
    // achando o que procuram, com o arquivo já pela metade.
    // Feature 33: subiu de 3 para 4 com o `Content-Type` de `/sitemap.xml`.
    // Feature 38: subiu de 4 para 5 com o `immutable` de `/fonts/(.*)`.
    // Feature 60: subiu de 5 para 6 com o `immutable` de `/email/(.*)`.
    // Feature 69: desceu de 6 para 5 — saiu o `Content-Type` de `/produtos/:slug` (asserção
    // invertida acima, com a positiva de que só o sitemap reimpõe tipo).
    expect(CONFIG.headers).toHaveLength(5)

    const assets = CONFIG.headers.find((entry) => entry.source === '/assets/(.*)')
    expect(assets).toBeDefined()
    expect(assets.headers).toEqual([
      { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
    ])

    const seguranca = CONFIG.headers.find((entry) => entry.source === '/(.*)')
    expect(seguranca).toBeDefined()
    expect(seguranca.headers.map((header) => header.key)).toEqual([
      'X-Content-Type-Options',
      'Referrer-Policy',
      'Content-Security-Policy',
    ])
  })
})

/**
 * Feature 38 (`PRF-14`) — as fontes próprias, e o cabeçalho que as torna gratuitas na revisita.
 *
 * A conferência que originou esta regra foi feita no build, não assumida: `public/` é copiado para
 * a **raiz** do `dist`, então os `woff2` são servidos em `/fonts/…` e a regra de `/assets/(.*)`
 * **não os alcança**. Sem esta entrada, três arquivos que nunca mudam seriam rebaixados a cada
 * visita sob o cache padrão da Vercel — e a economia de tirar o Google do caminho crítico
 * apareceria só na primeira visita.
 *
 * A regressão aqui é a de sempre nesta classe: apagar a entrada não quebra nada. A loja continua
 * servindo a fonte, com a cara certa, só que de novo.
 */
describe('vercel.json — as fontes próprias (feature 38)', () => {
  const CSS = readFileSync(join(ROOT, 'apps/store/src/app/App.css'), 'utf8')
  const SERVIDOS = [...CSS.matchAll(/url\(["']?(\/fonts\/[^"')]+)/g)].map((m) => m[1])

  it('a leitura encontrou os caminhos servidos — âncora', () => {
    // Sem ela, as asserções abaixo iterariam lista vazia se o `@font-face` mudasse de forma.
    expect(SERVIDOS.length).toBeGreaterThanOrEqual(3)
  })

  it('`/fonts/(.*)` é servido com um ano de cache `immutable`', () => {
    const fontes = CONFIG.headers.find((entry) => entry.source === '/fonts/(.*)')
    expect(fontes).toBeDefined()
    expect(fontes.headers).toEqual([
      { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
    ])
  })

  it('SENSOR: a regra de `/assets` NÃO alcançaria o caminho servido', () => {
    // É a razão inteira de a entrada existir, escrita como asserção. Os arquivos de `public/` não
    // ganham hash no nome nem entram em `assets/` — conferido no `dist` de um build real.
    for (const caminho of SERVIDOS) {
      expect(caminho.startsWith('/fonts/')).toBe(true)
      expect(caminho.startsWith('/assets/')).toBe(false)
    }
  })

  it('o nome do arquivo carrega a versão — `immutable` não tem como ser invalidado', () => {
    // Um ano de cache sobre um nome estável é um ano sem conserto possível. A versão no nome é o
    // que transforma "trocar a fonte" em "publicar outra URL".
    for (const caminho of SERVIDOS) expect(caminho).toMatch(/-v\d+-/)
  })
})

/**
 * Feature 60 (`LOGO-15`) — a marca dos e-mails.
 *
 * Os e-mails apontam para `/email/assinatura-v1@3x.png` por URL absoluta, e e-mail entregue não se
 * atualiza: o arquivo é imutável (`AD-045`), então um ano de cache `immutable` é o certo. A versão
 * mora no nome (`-v1@`), pela mesma razão das fontes acima.
 *
 * A ENTREGA (`Content-Type: image/png`, e não o shell do SPA) só se prova no domínio publicado — a
 * Vercel serve `public/` antes dos rewrites, e é o `curl` do checklist pós-deploy que confere isso.
 * Daqui o que se prova é que nenhum rewrite reivindica o caminho.
 */
describe('vercel.json — a marca dos e-mails (feature 60)', () => {
  it('`/email/(.*)` é servido com um ano de cache `immutable`', () => {
    const email = CONFIG.headers.find((entry) => entry.source === '/email/(.*)')
    expect(email).toBeDefined()
    expect(email.headers).toEqual([
      { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
    ])
  })

  it('nenhum rewrite reivindica `/email`', () => {
    for (const rewrite of CONFIG.rewrites) {
      expect(rewrite.source.startsWith('/email'), rewrite.source).toBe(false)
    }
  })
})

/**
 * Feature 33 (`SMP-01`, `SMP-26`) — o sitemap.
 *
 * As asserções desta seção **ganharam vizinhas**; nenhuma existente foi afrouxada. A âncora de
 * `headers` subiu de 3 para 4 e a de `rewrites` passou a ser conferida, que é o oposto de afrouxar.
 */
describe('vercel.json — o sitemap (feature 33)', () => {
  const porSource = (source: string) => CONFIG.rewrites.find((r) => r.source === source)

  it('`/sitemap.xml` é exposto sob o domínio da loja', () => {
    // Hoje a rota cai no catch-all e devolve **200 com o HTML da SPA** — medido em 2026-08-29:
    // `Content-Type: text/html`, 3.945 bytes abrindo em `<!doctype html>`. Um rastreador que pede o
    // sitemap recebe a home, e nenhuma checagem de status code acusa.
    const sitemap = porSource('/sitemap.xml')
    expect(sitemap).toBeDefined()
    expect(sitemap.destination).toMatch(/\/functions\/v1\/sitemap$/)
  })

  it('vem ANTES do catch-all', () => {
    const i = (source: string) => CONFIG.rewrites.findIndex((r) => r.source === source)
    expect(i('/sitemap.xml')).toBeGreaterThanOrEqual(0)
    expect(i('/sitemap.xml')).toBeLessThan(i(CATCH_ALL.source))
  })

  it('aponta para o MESMO host do feed', () => {
    const host = (source: string) => new URL(porSource(source).destination).host
    expect(host('/sitemap.xml')).toBe(host('/feeds/google-shopping.xml'))
  })

  it('âncora de contagem dos rewrites: são 3, e o último é o catch-all', () => {
    // Sem a âncora, uma entrada removida por edição deixaria as buscas acima achando o que procuram
    // num arquivo já pela metade. Feature 69: desceu de 4 para 3 — saiu o `/produtos/:slug`.
    expect(CONFIG.rewrites).toHaveLength(3)
    expect(CONFIG.rewrites[2]).toEqual(CATCH_ALL)
  })

  /**
   * **Este header é CARGA, não zelo — e agora está medido.**
   *
   * Em 2026-08-29, contra o projeto hospedado, a function respondeu
   * `Content-Type: application/xml; charset=utf-8` e o gateway `*.supabase.co` entregou
   * **`text/plain`**, com `nosniff` acrescentado e o `Cache-Control` intacto. É a **mesma
   * assinatura** do `BUG-20260829`, que trocou `text/html` por `text/plain`: os headers da function
   * são respeitados, e só o tipo é reescrito.
   *
   * A pergunta que a `AD-021` deixou aberta — *"`application/xml` atravessa?"* — está respondida:
   * **não atravessa**. Sem esta linha, `/sitemap.xml` responde 200 com XML correto no corpo e
   * `text/plain` na entrega, que é a forma de quebrar que este projeto mais paga caro.
   */
  it('reimpõe application/xml em /sitemap.xml — a Supabase troca por text/plain (medido)', () => {
    const rota = CONFIG.headers.find((entry) => entry.source === '/sitemap.xml')
    expect(rota).toBeDefined()
    expect(rota.headers).toEqual([
      { key: 'Content-Type', value: 'application/xml; charset=utf-8' },
    ])
  })
})

/**
 * `BL-013` — a loja autoriza ser embutida **pelo painel**, e só por ele.
 *
 * A prévia real de `/admin/home` (feature `25`) carrega a loja num `<iframe>`. Em dev funciona sem
 * nada, porque o Vite não manda header nenhum; em produção quem decide é o edge. Enquanto a loja
 * mandou `X-Frame-Options: SAMEORIGIN`, a prévia em produção era **quadro branco sem erro** — a
 * recusa é do navegador, não da aplicação, e não aparece em log nenhum.
 *
 * O header foi **substituído**, não acompanhado: `X-Frame-Options` não tem sintaxe para autorizar
 * outra origem (`ALLOW-FROM` foi removido de todos os navegadores modernos e é ignorado em
 * silêncio). Manter os dois deixaria uma política com **dois donos** e um caminho de falha em que o
 * mais fraco vence — exatamente o quadro branco que este item existe para eliminar.
 */
describe('vercel.json — a loja autoriza ser embutida pelo painel (BL-013)', () => {
  const seguranca = CONFIG.headers.find((entry) => entry.source === '/(.*)')
  const csp = seguranca.headers.find((header) => header.key === 'Content-Security-Policy')

  /**
   * A origem escrita por extenso, e não lida de env nem derivada do próprio arquivo: a régua nunca
   * pode ser o objeto medido. Trocar o domínio do painel no `vercel.json` sem passar por aqui é
   * precisamente o erro que este teste existe para pegar.
   */
  const PAINEL = 'https://umaestrelinha-backoffice.vercel.app'

  it('declara `frame-ancestors` com a origem do painel', () => {
    expect(csp).toBeDefined()
    expect(csp.value).toContain('frame-ancestors')
    expect(csp.value).toContain(PAINEL)
  })

  it('`X-Frame-Options` não coexiste — o enquadramento tem UM dono', () => {
    const chaves = seguranca.headers.map((header) => header.key)
    expect(chaves).not.toContain('X-Frame-Options')
  })

  it('a autorização é por origem EXATA, nunca curinga', () => {
    // `https://*.vercel.app` seria a "correção" tentadora para fazer os deploys de preview do painel
    // enquadrarem a loja. Ela liberaria **qualquer** projeto hospedado em vercel.app a embutir a
    // loja — inclusive o de um terceiro —, que é um vetor de clickjacking sobre o checkout.
    expect(csp.value).not.toContain('*')
  })
})

/**
 * Feature 69 (`AD-053`, SSV-02/03/04) — o HTML servido sai da função `api/page`, no deploy da loja.
 *
 * O que se prova aqui é o que está ESCRITO: a região, o catch-all e quem mais sai para fora do
 * deploy. Que a Vercel detecta a função, entrega `__path` e `?variant=`, roda em `pdx1` e cacheia
 * com `HIT` só um `curl` contra o preview prova — e é a T14 que faz isso.
 */
describe('vercel.json — a página servida pela função da loja (feature 69)', () => {
  const STORE = join(ROOT, 'apps/store')

  it('a função roda em `pdx1` — a região do banco (us-west-2), não a borda do Brasil', () => {
    expect(CONFIG.regions).toEqual(['pdx1'])
  })

  it('o catch-all entrega o caminho original em `__path` — o mesmo parâmetro que a função lê', () => {
    // Lido do disco e não importado: o `server/` tem tipos de Node e fica fora do `tsconfig.app.json`.
    const fonte = readFileSync(join(STORE, 'server/page.ts'), 'utf8')
    const PATH_PARAM = fonte.match(/export const PATH_PARAM = '([^']+)'/)?.[1]
    expect(PATH_PARAM).toBe('__path')
    expect(CATCH_ALL.destination).toBe(`/api/page?${PATH_PARAM}=/:path*`)
    expect(CONFIG.rewrites[CONFIG.rewrites.length - 1]).toEqual(CATCH_ALL)
  })

  it('só o sitemap e o feed saem para fora do deploy — nenhum outro rewrite para `*.supabase.co`', () => {
    const externos = CONFIG.rewrites.filter((r) => /^https?:\/\//.test(r.destination))
    expect(externos.map((r) => r.source).sort()).toEqual(['/feeds/google-shopping.xml', '/sitemap.xml'])
    const supabase = CONFIG.rewrites.filter((r) => /\.supabase\.co/.test(r.destination))
    expect(supabase).toHaveLength(2)
  })

  it('nenhum rewrite reivindica `/api` — a função é endereçada pelo filesystem, não por rewrite', () => {
    for (const r of CONFIG.rewrites) expect(r.source.startsWith('/api'), r.source).toBe(false)
  })

  it('a entrada `api/page.mjs` existe e reexporta o bundle que o build gera', () => {
    const entrada = readFileSync(join(STORE, 'api/page.mjs'), 'utf8')
    expect(entrada).toMatch(/export\s*\{\s*default\s*\}\s*from\s*'\.\.\/\.server\/page\.mjs'/)
    const script = readFileSync(join(STORE, 'scripts/build-server.mjs'), 'utf8')
    expect(script).toContain("'.server/page.mjs'")
    expect(script).toContain("'server/page.ts'")
    expect(script).toContain("'dist/index.html'")
    expect(script).toContain('__SHELL__')
  })

  it('o `build` da loja empacota a função DEPOIS do `vite build`', () => {
    const pkg = JSON.parse(readFileSync(join(STORE, 'package.json'), 'utf8')) as { scripts: Record<string, string> }
    expect(pkg.scripts.build).toBe('vite build && node scripts/build-server.mjs')
    expect(CONFIG.buildCommand).toBe('pnpm build')
  })

  it('o bundle gerado não é versionado', () => {
    const ignorados = readFileSync(join(STORE, '.gitignore'), 'utf8').split(/\r?\n/)
    expect(ignorados).toContain('.server')
  })
})
