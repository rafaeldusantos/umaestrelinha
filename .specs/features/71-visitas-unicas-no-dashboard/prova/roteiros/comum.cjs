// Comum aos roteiros da prova da feature 71 (fora do repositório).
const { chromium } = require('/Users/rafael.santos/Projetos/Jogos/Numbuz/node_modules/playwright-core')
const { execFileSync } = require('child_process')

const DB = 'postgresql://postgres:postgres@127.0.0.1:54442/postgres'
const LOJA = 'http://localhost:8082'
const PAINEL = 'http://localhost:8083'
const PROVA = '/Users/rafael.santos/Projetos/uma-estrelinha/store/.specs/features/71-visitas-unicas-no-dashboard/prova'
const UA_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36'
const UA_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'

const sql = q => execFileSync('psql', [DB, '-X', '-At', '-c', q], { encoding: 'utf8' }).trim()

const LOCAIS = new Set(['localhost:8082', 'localhost:8083', '127.0.0.1:54441'])

/**
 * Contexto com a rede cercada: GA interceptado POR CAMINHO (`/g/collect`, `/gtag/js`) e respondido
 * vazio; qualquer outro host que não seja a loja, o painel ou o Supabase local é ABORTADO e contado.
 * Assim nenhum hit chega à propriedade real, nem por `analytics.google.com` (a lição da `68`).
 */
async function contexto(browser, { neutralizar = true, mobile = true, extra = {} } = {}) {
  const ctx = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    deviceScaleFactor: mobile ? 3 : 1,
    isMobile: mobile,
    hasTouch: mobile,
    userAgent: mobile ? UA_ANDROID : UA_MAC,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    ...extra,
  })
  const rede = { ga: [], bloqueadas: {}, visitas: [] }
  await ctx.route('**/*', async route => {
    const u = new URL(route.request().url())
    if (u.pathname.includes('/g/collect') || u.pathname.includes('/gtag/js')) {
      rede.ga.push(u.pathname)
      return route.fulfill({ status: 204, body: '' })
    }
    if (u.protocol === 'data:' || u.protocol === 'blob:' || LOCAIS.has(u.host)) return route.continue()
    rede.bloqueadas[u.host] = (rede.bloqueadas[u.host] ?? 0) + 1
    return route.abort()
  })
  if (neutralizar) {
    await ctx.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false })
    })
  }
  ctx.on('request', req => {
    if (req.url().includes('/functions/v1/visit') && req.method() === 'POST') {
      const item = { corpo: req.postData(), headers: req.headers(), frame: req.frame()?.url() ?? null }
      rede.visitas.push(item)
      req.response().then(async r => {
        item.status = r?.status()
        try {
          item.resposta = await r?.json()
        } catch {
          item.resposta = null
        }
      })
    }
  })
  return { ctx, rede }
}

/** Navegação pelo router (pushState + popstate), sem recarregar o documento. */
const irPeloRouter = (page, caminho) =>
  page.evaluate(c => {
    window.history.pushState({}, '', c)
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }))
  }, caminho)

const esperar = ms => new Promise(r => setTimeout(r, ms))

module.exports = { chromium, sql, contexto, irPeloRouter, esperar, LOJA, PAINEL, PROVA, DB }
