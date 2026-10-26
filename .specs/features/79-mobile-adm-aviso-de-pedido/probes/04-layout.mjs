// T28 (metade de layout) — mede `/avisos` e o menu da conta no BUILD servido (vite preview).
// Uso: node 04-layout.mjs <baseURL> <pastaDeCapturas> <saida.json>   (FILTRO=estado1,estado2 opcional)
// Requer o pacote `playwright` 1.64 e o Chromium 1228: os dois caminhos abaixo são os desta máquina
// (o cache do npx e o do Playwright); ajuste-os ao rodar noutra.
import { createRequire } from 'node:module'
const require = createRequire('/Users/rafael.santos/.npm/_npx/e41f203b7505f1fb/node_modules/')
const { chromium } = require('playwright')
import { writeFileSync, mkdirSync } from 'node:fs'

const [BASE, CAPTURAS, SAIDA] = process.argv.slice(2)
mkdirSync(CAPTURAS, { recursive: true })

const OS_QUATRO = ['owner_order_received', 'owner_order_paid', 'owner_payment_rejected', 'owner_material_incoming']
const USUARIO = { id: 'u-p79', email: 'adri@exemplo.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }

const VIEWPORTS = [
  [360, 800],
  [390, 844],
  [412, 915],
  [1440, 900],
]
const FONTES = ['100%', '130%', '200%']

const F = {
  bloqueado: 'As notificações estão bloqueadas para o Ateliê.',
  semSuporte: 'Este navegador não recebe avisos.',
  naoAtivou: 'Não consegui ativar os avisos. Tente de novo.',
  naoConferiu: 'Não consegui conferir os avisos deste celular. Tente de novo.',
  naoGravou: 'Não consegui gravar esta escolha. Tente de novo.',
  naoParou: 'Não consegui parar os avisos deste celular.',
  testeNaoSaiu: 'O aviso de teste não saiu. Tente de novo.',
  testeAguarde: 'Aguarde alguns segundos para mandar outro aviso de teste.',
}

/**
 * Cada estado: o navegador (`nav`) e as respostas da porta, e o que fazer depois de abrir (`agir`)
 * para chegar ao estado; `espera` é a frase (ou o seletor) que prova que o estado chegou.
 */
const ESTADOS = {
  desligado: { nav: { permissao: 'default', inscrito: false }, porta: {}, espera: { botao: 'Avisar neste celular' } },
  ligado: { nav: { permissao: 'granted', inscrito: true }, porta: { status: [200, { subscribed: true, events: OS_QUATRO }] }, espera: { switches: 4 } },
  bloqueado: { nav: { permissao: 'denied', inscrito: false }, porta: {}, espera: { texto: F.bloqueado } },
  'sem-suporte': { nav: { semPushManager: true }, porta: {}, espera: { texto: F.semSuporte } },
  'erro-ativar': {
    nav: { permissao: 'default', inscrito: false, respostaDoPedido: 'granted' },
    porta: { config: [500, { error: 'db_error' }] },
    agir: async (p) => p.getByRole('button', { name: 'Avisar neste celular' }).click(),
    espera: { texto: F.naoAtivou },
  },
  'erro-ler': { nav: { permissao: 'granted', inscrito: true }, porta: { status: [500, { error: 'db_error' }] }, espera: { texto: F.naoConferiu } },
  'erro-interruptor': {
    nav: { permissao: 'granted', inscrito: true },
    porta: { status: [200, { subscribed: true, events: OS_QUATRO }], events: [500, { error: 'db_error' }] },
    agir: async (p) => p.getByRole('switch').nth(1).click({ force: true }),
    espera: { texto: F.naoGravou },
  },
  'erro-teste': {
    nav: { permissao: 'granted', inscrito: true },
    porta: { status: [200, { subscribed: true, events: OS_QUATRO }], test: [502, { error: 'push_failed' }] },
    agir: async (p) => p.getByRole('button', { name: 'Enviar um aviso de teste' }).click(),
    espera: { texto: F.testeNaoSaiu },
  },
  'teste-aguarde': {
    nav: { permissao: 'granted', inscrito: true },
    porta: { status: [200, { subscribed: true, events: OS_QUATRO }], test: [429, { error: 'cooldown' }] },
    agir: async (p) => p.getByRole('button', { name: 'Enviar um aviso de teste' }).click(),
    espera: { texto: F.testeAguarde },
  },
  'erro-parar': {
    nav: { permissao: 'granted', inscrito: true },
    porta: { status: [200, { subscribed: true, events: OS_QUATRO }], unsubscribe: [500, { error: 'db_error' }] },
    agir: async (p) => p.getByRole('button', { name: 'Parar avisos neste celular' }).click(),
    espera: { texto: F.naoParou },
  },
  'menu-aberto': {
    nav: { permissao: 'granted', inscrito: true },
    porta: { status: [200, { subscribed: true, events: OS_QUATRO }] },
    agir: async (p) => p.getByRole('button', { name: 'Sua conta' }).click(),
    espera: { seletor: '#menu-da-conta' },
    menu: true,
  },
  'menu-pergunta-MAN-30': {
    nav: { permissao: 'granted', inscrito: true },
    porta: { status: [200, { subscribed: true, events: OS_QUATRO }], unsubscribe: [500, { error: 'db_error' }] },
    agir: async (p) => {
      await p.getByRole('button', { name: 'Sua conta' }).click()
      await p.locator('#menu-da-conta').getByRole('button', { name: 'Sair' }).click()
    },
    espera: { botao: 'Sair mesmo assim' },
    menu: true,
  },
}

/** Os dublês do navegador, injetados antes de qualquer script da página. */
const dubles = ({ nav: { permissao = 'default', inscrito = false, respostaDoPedido = 'granted', semPushManager = false }, sessao }) => {
  localStorage.setItem('sb-127-auth-token', JSON.stringify(sessao))
  const b64 = (n) => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(n)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  let inscricao = null
  const criar = (endpoint) => {
    const i = {
      endpoint,
      expirationTime: null,
      toJSON: () => ({ endpoint, expirationTime: null, keys: { p256dh: 'B' + b64(64), auth: b64(16) } }),
      unsubscribe: async () => {
        inscricao = null
        return true
      },
    }
    return i
  }
  if (inscrito) inscricao = criar('https://fcm.googleapis.com/fcm/send/P79-layout')
  const pushManager = {
    getSubscription: async () => inscricao,
    subscribe: async () => (inscricao = inscricao ?? criar('https://fcm.googleapis.com/fcm/send/P79-novo')),
  }
  const registro = { pushManager, scope: '/', active: null, addEventListener() {}, update: async () => {}, unregister: async () => true }
  const container = {
    ready: Promise.resolve(registro),
    getRegistration: async () => registro,
    getRegistrations: async () => [registro],
    register: async () => registro,
    addEventListener() {},
    removeEventListener() {},
    controller: null,
  }
  Object.defineProperty(Navigator.prototype, 'serviceWorker', { configurable: true, get: () => container })
  let perm = permissao
  const N = function Notification() {}
  Object.defineProperty(N, 'permission', { get: () => perm })
  N.requestPermission = async () => (perm = respostaDoPedido)
  Object.defineProperty(window, 'Notification', { configurable: true, writable: true, value: N })
  if (semPushManager) delete window.PushManager
  else Object.defineProperty(window, 'PushManager', { configurable: true, writable: true, value: function PushManager() {} })
}

const medir = async (page, menu) =>
  page.evaluate((menu) => {
    const vis = (el) => {
      const r = el.getBoundingClientRect()
      const s = getComputedStyle(el)
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
    }
    const nome = (el) => (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)
    const escopo = menu ? [document.querySelector('#menu-da-conta')] : [document.querySelector('main')]
    const controles = []
    for (const raiz of escopo) {
      if (!raiz) continue
      for (const el of raiz.querySelectorAll('button, a[href], [role="switch"], input:not([type=hidden])')) {
        const alvo = el.getAttribute('role') === 'switch' ? el.closest('label') : el
        if (!alvo || !vis(alvo)) continue
        const r = alvo.getBoundingClientRect()
        controles.push({ nome: nome(alvo), altura: Math.round(r.height * 10) / 10, largura: Math.round(r.width * 10) / 10 })
      }
    }
    // O botão do menu (no cabeçalho) entra quando o menu é medido.
    if (menu) {
      const b = document.querySelector('[aria-controls="menu-da-conta"]')
      if (b) {
        const r = b.getBoundingClientRect()
        controles.push({ nome: 'Sua conta', altura: r.height, largura: r.width })
      }
    }
    // Rótulos dos interruptores: cortado (scrollWidth > clientWidth) ou por cima do trilho.
    const rotulos = []
    for (const linha of document.querySelectorAll('[data-testid="linha-do-interruptor"]')) {
      const texto = linha.querySelector('span')
      const trilho = linha.querySelector('span[aria-hidden="true"]')
      const a = texto.getBoundingClientRect()
      const b = trilho.getBoundingClientRect()
      // O retângulo do TEXTO de verdade (o `Range`), não o da caixa: uma palavra maior que a caixa
      // transborda para fora dela, e só o `Range` vê.
      const faixa = document.createRange()
      faixa.selectNodeContents(texto)
      const t = faixa.getBoundingClientRect()
      const sobrepoe = !(t.right <= b.left || b.right <= t.left || t.bottom <= b.top || b.bottom <= t.top) || !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top)
      const l = linha.getBoundingClientRect()
      rotulos.push({
        nome: texto.textContent,
        cortado: texto.scrollWidth > texto.clientWidth + 0.5 || texto.scrollHeight > texto.clientHeight + 0.5,
        medidas: { scrollW: texto.scrollWidth, clientW: texto.clientWidth, scrollH: texto.scrollHeight, clientH: texto.clientHeight, textoRight: Math.round(t.right), trilhoLeft: Math.round(b.left), textoBottom: Math.round(t.bottom), linhaBottom: Math.round(l.bottom) },
        sobrepoe,
        foraDaLinha: a.bottom > l.bottom + 0.5 || b.bottom > l.bottom + 0.5,
        linhas: Math.round(a.height / parseFloat(getComputedStyle(texto).lineHeight)),
      })
    }
    // Textos de bloco (frases e botões) cortados ou fora da janela.
    const fora = []
    const truncados = []
    const raizes = escopo.filter(Boolean)
    for (const raiz of raizes) {
      for (const el of raiz.querySelectorAll('p, h1, h2, button, a, label')) {
        if (!vis(el)) continue
        const r = el.getBoundingClientRect()
        // `truncate` (reticências) é corte DE PROPÓSITO (o e-mail no menu): registrado à parte.
        const reticencias = getComputedStyle(el).textOverflow === 'ellipsis'
        if (r.right > innerWidth + 0.5 || r.left < -0.5) fora.push(nome(el))
        else if (el.scrollWidth > el.clientWidth + 1) (reticencias ? truncados : fora).push(nome(el))
      }
    }
    // Sobreposição entre irmãos de bloco do conteúdo (frase × botão × lista).
    const sobre = []
    for (const raiz of raizes) {
      const blocos = [...raiz.querySelectorAll('p, h1, button, a, [data-testid="linha-do-interruptor"]')].filter(vis)
      for (let i = 0; i < blocos.length; i++)
        for (let j = i + 1; j < blocos.length; j++) {
          const x = blocos[i], y = blocos[j]
          if (x.contains(y) || y.contains(x)) continue
          const a = x.getBoundingClientRect(), b = y.getBoundingClientRect()
          const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left)
          const iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
          if (ix > 1 && iy > 1) sobre.push(`${nome(x)} × ${nome(y)}`)
        }
    }
    return {
      innerWidth,
      bodyScroll: document.body.scrollWidth,
      docScroll: document.documentElement.scrollWidth,
      controles,
      rotulos,
      fora,
      truncados,
      sobre,
    }
  }, menu)

const servido = async (browser) => {
  const p = await browser.newPage()
  await p.goto(BASE + '/login')
  const scripts = await p.$$eval('script[src]', (s) => s.map((x) => x.src))
  let achou = false
  for (const s of scripts) {
    const t = await (await p.request.get(s)).text()
    if (t.includes('Não consegui conferir os avisos deste celular')) achou = true
  }
  // Chunks lazy: o texto pode estar num chunk de página; procura nos módulos pré-carregados também.
  if (!achou) {
    const links = await p.$$eval('link[rel=modulepreload]', (s) => s.map((x) => x.href))
    for (const s of links) if ((await (await p.request.get(s)).text()).includes('Não consegui conferir os avisos deste celular')) achou = true
  }
  await p.close()
  return { scripts: scripts.length, achou }
}

const browser = await chromium.launch({ executablePath: '/Users/rafael.santos/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell' })
const prova = await servido(browser)
console.log('bundle servido contém a frase da tela:', JSON.stringify(prova))
const linhas = []
const ganchos = { collect: 0, rest: [], fn: [] }

for (const [estado, def] of Object.entries(ESTADOS).filter(([e]) => !process.env.FILTRO || process.env.FILTRO.split(',').includes(e))) {
  for (const [w, h] of VIEWPORTS) {
    for (const fonte of FONTES) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, serviceWorkers: 'block' })
      const agora = Math.floor(Date.now() / 1000)
      const sessao = { access_token: 'token-p79', refresh_token: 'r-p79', expires_at: agora + 36000, expires_in: 36000, token_type: 'bearer', user: USUARIO }
      await ctx.addInitScript(dubles, { nav: def.nav, sessao })
      await ctx.addInitScript((f) => {
        const aplicar = () => document.documentElement && (document.documentElement.style.fontSize = f)
        aplicar()
        document.addEventListener('DOMContentLoaded', aplicar)
      }, fonte)
      await ctx.route('**/g/collect*', (r) => {
        ganchos.collect++
        return r.fulfill({ status: 204 })
      })
      await ctx.route('**/auth/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...USUARIO }) }))
      await ctx.route('**/rest/v1/**', (r) => {
        const u = new URL(r.request().url())
        const t = u.pathname.replace('/rest/v1/', '')
        if (t === 'user_roles') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ role: 'admin' }]) })
        if (t === 'customers')
          return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'c', user_id: USUARIO.id, name: 'Adri Muniz', email: USUARIO.email, phone: null }]) })
        if (t === 'rpc/atelie_clock') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ lido_em: new Date().toISOString() }) })
        // RPC sem fixtura própria responde `null` ("ainda sem dado"), como a do client real responde.
        if (t.startsWith('rpc/')) return r.fulfill({ status: 200, contentType: 'application/json', body: 'null' })
        return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      })
      await ctx.route('**/functions/v1/**', (r) => {
        const u = new URL(r.request().url())
        const acao = u.searchParams.get('action')
        const resp = def.porta[acao] ?? (acao === 'config' ? [200, { applicationServerKey: 'B' + 'x'.repeat(86) }] : [200, { ok: true, events: OS_QUATRO }])
        return r.fulfill({ status: resp[0], contentType: 'application/json', body: JSON.stringify(resp[1]) })
      })
      const page = await ctx.newPage()
      const erros = []
      page.on('console', (m) => m.type() === 'error' && erros.push(m.text().slice(0, 300)))
      page.on('pageerror', (e) => erros.push(String(e).slice(0, 300)))
      await page.goto(BASE + '/avisos')
      const esp = def.espera
      const chegar = async () => {
        if (esp.botao) await page.getByRole('button', { name: esp.botao }).waitFor({ timeout: 10000 })
        if (esp.texto) await page.getByText(esp.texto).first().waitFor({ timeout: 10000 })
        if (esp.switches) await page.waitForFunction((n) => document.querySelectorAll('[role=switch]').length === n, esp.switches, { timeout: 10000 })
        if (esp.seletor) await page.locator(esp.seletor).waitFor({ timeout: 10000 })
      }
      if (def.agir) {
        // Primeiro o estado de base (o botão ou os interruptores), depois o toque.
        await page.waitForFunction(() => document.querySelector('main button, main [role=switch]'), null, { timeout: 10000 })
        await page.waitForTimeout(150)
        await def.agir(page)
      }
      try {
        await chegar()
      } catch (e) {
        console.log('FALHOU A CHEGAR', estado, w, fonte, page.url(), JSON.stringify(erros), (await page.textContent('body')).slice(0, 400))
        throw e
      }
      await page.waitForTimeout(250)
      const m = await medir(page, !!def.menu)
      const pequenos = m.controles.filter((c) => c.altura < 44)
      const ruins = m.rotulos.filter((r) => r.cortado || r.sobrepoe || r.foraDaLinha)
      const ok = m.bodyScroll <= m.innerWidth && m.docScroll <= m.innerWidth && pequenos.length === 0 && ruins.length === 0 && m.fora.length === 0 && m.sobre.length === 0
      linhas.push({ estado, w, h, fonte, ok, ...m, pequenos, ruins })
      const nomeArq = `${estado}-${w}-${fonte.replace('%', '')}.png`
      if (fonte !== '130%' || w === 390) await page.screenshot({ path: `${CAPTURAS}/${nomeArq}`, fullPage: true })
      console.log(`${ok ? 'ok ' : 'XX '} ${estado} ${w}x${h} ${fonte} body ${m.bodyScroll}/${m.innerWidth} controles ${m.controles.length} (min ${Math.min(...m.controles.map((c) => c.altura))}) rótulos ${m.rotulos.length}${pequenos.length ? ' PEQUENOS ' + JSON.stringify(pequenos) : ''}${ruins.length ? ' RÓTULOS ' + JSON.stringify(ruins) : ''}${m.fora.length ? ' FORA ' + JSON.stringify(m.fora) : ''}${m.sobre.length ? ' SOBRE ' + JSON.stringify(m.sobre) : ''}`)
      await ctx.close()
    }
  }
}
await browser.close()
writeFileSync(SAIDA, JSON.stringify({ prova, ganchos, linhas }, null, 2))
console.log(`FIM: ${linhas.filter((l) => l.ok).length}/${linhas.length} ok; g/collect interceptados: ${ganchos.collect}`)
