// Feature 72, T06 — o `vercel.json` do app do ateliê (`MAF-04`).
//
// Molde: o do Backoffice. Os dois acréscimos são do service worker: `sw.js` e o manifest NUNCA ficam
// presos em cache (um `sw.js` cacheado prende a dona numa versão velha até o cache vencer), e o
// rewrite da SPA não pode responder `index.html` no lugar deles.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

type Header = { key: string; value: string }
type VercelConfig = {
  installCommand: string
  buildCommand: string
  outputDirectory: string
  rewrites: { source: string; destination: string }[]
  headers: { source: string; headers: Header[] }[]
}

const ler = (app: string) =>
  JSON.parse(readFileSync(resolve(__dirname, `../../../../${app}/vercel.json`), 'utf8')) as VercelConfig
const atelie = ler('mobile-adm')
const painel = ler('backoffice')

const headersDe = (config: VercelConfig, source: string) =>
  Object.fromEntries((config.headers.find((h) => h.source === source)?.headers ?? []).map((h) => [h.key, h.value]))

/** O rewrite da SPA, como o Vercel o casa: o `source` é path-to-regexp com um grupo de regex. */
const reescreve = (config: VercelConfig, caminho: string) =>
  config.rewrites.some((r) => r.destination === '/index.html' && new RegExp(`^${r.source}$`).test(caminho))

describe('vercel.json do ateliê (MAF-04)', () => {
  it('instala e builda na raiz do monorepo, como o painel', () => {
    expect(atelie.installCommand).toBe(painel.installCommand)
    expect(atelie.buildCommand).toBe(painel.buildCommand)
    expect(atelie.outputDirectory).toBe('dist')
  })

  it('/assets/* é imutável por um ano', () => {
    expect(headersDe(atelie, '/assets/(.*)')['Cache-Control']).toBe('public, max-age=31536000, immutable')
  })

  it('sw.js sai com no-cache', () => {
    expect(headersDe(atelie, '/sw.js')['Cache-Control']).toBe('no-cache')
  })

  it('o manifest sai com no-cache e o tipo certo', () => {
    const h = headersDe(atelie, '/manifest.webmanifest')
    expect(h['Cache-Control']).toBe('no-cache')
    expect(h['Content-Type']).toBe('application/manifest+json')
  })

  it('toda resposta leva noindex, DENY, nosniff e o Referrer-Policy do painel', () => {
    const h = headersDe(atelie, '/(.*)')
    expect(h['X-Robots-Tag']).toBe('noindex, nofollow')
    expect(h['X-Frame-Options']).toBe('DENY')
    expect(h['X-Content-Type-Options']).toBe('nosniff')
    expect(h['Referrer-Policy']).toBe(headersDe(painel, '/(.*)')['Referrer-Policy'])
    expect(h).toEqual(headersDe(painel, '/(.*)'))
  })

  it('o rewrite da SPA leva as rotas do app ao index.html', () => {
    for (const rota of ['/', '/login', '/pedidos', '/clientes/abc']) expect(reescreve(atelie, rota)).toBe(true)
  })

  it('sw-avisos.js (feature `79`) sai com no-cache', () => {
    expect(headersDe(atelie, '/sw-avisos.js')['Cache-Control']).toBe('no-cache')
  })

  it('o rewrite NÃO captura o service worker nem o manifest', () => {
    for (const arquivo of ['/sw.js', '/sw-avisos.js', '/manifest.webmanifest', '/registerSW.js', '/workbox-9c191d2f.js']) {
      expect(reescreve(atelie, arquivo)).toBe(false)
    }
  })

  it('sensor: o rewrite do painel (captura tudo) reprovaria na mesma régua', () => {
    expect(reescreve(painel, '/sw.js')).toBe(true)
    expect(reescreve(painel, '/sw-avisos.js')).toBe(true)
  })
})
