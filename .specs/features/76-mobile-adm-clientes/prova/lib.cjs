const { chromium } = require('/Users/rafael.santos/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core')
const { execSync } = require('node:child_process')
const BASE = 'http://localhost:4376'
const DB = 'postgresql://postgres:postgres@127.0.0.1:54442/postgres'
const psql = (sql) => execSync(`psql "${DB}" -At -c "${sql}"`, { encoding: 'utf8' }).trim()
const SHOTS = '/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store-76-mobile-adm-clientes/.specs/features/76-mobile-adm-clientes/prova'
const VIEWPORTS = [
  { nome: '360', w: 360, h: 800, mobile: true },
  { nome: '390', w: 390, h: 844, mobile: true },
  { nome: '412', w: 412, h: 915, mobile: true },
  { nome: '1440', w: 1440, h: 900, mobile: false },
]
const novoContexto = async (browser, vp, extra = {}) => {
  const ctx = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    isMobile: vp.mobile, hasTouch: vp.mobile, deviceScaleFactor: vp.mobile ? 2 : 1,
    serviceWorkers: 'block',
    ...extra,
  })
  const hosts = new Set()
  await ctx.route('**/*', (route) => {
    const u = new URL(route.request().url())
    hosts.add(u.host)
    if (u.host.endsWith('.supabase.co') || u.pathname.includes('/g/collect')) return route.abort()
    return route.continue()
  })
  ctx.hosts = hosts
  return ctx
}
const entrar = async (page, email = 'admin@umaestrelinha.dev', senha = 'admin123') => {
  await page.goto(BASE + '/login')
  await page.fill('#login-email', email)
  await page.fill('#login-senha', senha)
  await page.click('button[type=submit]')
}
const fonte = (page, pct) => page.addStyleTag({ content: `html{font-size:${16 * pct / 100}px !important}` })
const lancar = () => chromium.launch({ executablePath: '/Users/rafael.santos/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell' })
module.exports = { lancar, chromium, BASE, psql, SHOTS, VIEWPORTS, novoContexto, entrar, fonte }
