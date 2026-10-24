const fs = require('node:fs')
const { lancar, BASE, psql, SHOTS, VIEWPORTS, novoContexto, entrar } = require('./lib.cjs')
const vp = VIEWPORTS[1]
const out = []
const log = (ok, t, d) => { out.push({ ok, t, d }); console.log(`${ok ? 'ok' : 'FALHOU'} — ${t}${d !== undefined ? ' :: ' + JSON.stringify(d) : ''}`) }
const SENSIVEL = ['Marina Albuquerque', 'albuquerque', 'p76.endereco', 'p76.telefone', 'p76.sem.nome', '98124', '51998124471', 'Valéria', 'valeria', 'VROSA', 'Rosa', 'Telefone Teste', '88776655', 'rosa', 'Clarice', 'probe76', 'Sem Papel', 'P76 ', 'p76', 'rafael@', 'aproximma']
const FAKE_VV = () => {
  const vv = new EventTarget()
  Object.defineProperties(vv, { height: { get: () => innerHeight - (window.__teclado || 0) }, width: { get: () => innerWidth }, offsetTop: { value: 0 }, offsetLeft: { value: 0 }, scale: { value: 1 }, pageTop: { value: 0 }, pageLeft: { value: 0 } })
  Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true })
  window.__setTeclado = (h) => { window.__teclado = h; vv.dispatchEvent(new Event('resize')) }
}
const dormir = (p, ms = 500) => p.waitForTimeout(ms)
;(async () => {
  const browser = await lancar()
  const ctx = await novoContexto(browser, vp)
  await ctx.addInitScript(FAKE_VV)
  const page = await ctx.newPage()
  const consoleMsgs = [], urls = [], titulos = []
  page.on('console', (m) => consoleMsgs.push(`${m.type()}: ${m.text()}`))
  page.on('pageerror', (e) => consoleMsgs.push('pageerror: ' + e))
  page.on('request', (r) => urls.push(r.url()))
  const privacidade = async (passo) => {
    const s = await page.evaluate(async () => {
      const dump = (st) => { const o = {}; for (let i = 0; i < st.length; i++) o[st.key(i)] = st.getItem(st.key(i)); return o }
      const dbs = (await indexedDB.databases?.()) ?? []
      const idb = []
      for (const d of dbs) {
        await new Promise((res) => { const rq = indexedDB.open(d.name); rq.onsuccess = async () => { const db = rq.result; for (const n of db.objectStoreNames) { await new Promise((r2) => { const g = db.transaction(n).objectStore(n).getAll(); g.onsuccess = () => { idb.push({ db: d.name, store: n, dados: JSON.stringify(g.result) }); r2() }; g.onerror = r2 }) } db.close(); res() }; rq.onerror = res })
      }
      return { href: location.href, state: JSON.stringify(history.state), titulo: document.title, ls: dump(localStorage), ss: dump(sessionStorage), idb }
    })
    titulos.push(s.titulo)
    const campos = { href: s.href, 'history.state': s.state, titulo: s.titulo, localStorage: JSON.stringify(s.ls), sessionStorage: JSON.stringify(s.ss), indexedDB: JSON.stringify(s.idb) }
    const achados = []
    for (const [k, v] of Object.entries(campos)) {
      // o `sb-…-auth-token` do supabase-js guarda o e-mail DA ADMIN (quem entrou), não de cliente: tirado da leitura
      const texto = k === 'localStorage' ? JSON.stringify(Object.fromEntries(Object.entries(s.ls).filter(([c]) => !/auth-token/.test(c)))) : v
      for (const t of SENSIVEL) if (texto.toLowerCase().includes(t.toLowerCase())) { if (!(k === 'titulo' && /^p76/i.test(t))) achados.push(`${k}:${t}`) }
    }
    log(achados.length === 0, `privacidade em "${passo}" (url ${new URL(s.href).pathname}${new URL(s.href).search}, título "${s.titulo}", chaves de storage: ${Object.keys(s.ls).join(',') || '—'} / ${Object.keys(s.ss).join(',') || '—'})`, achados.length ? achados : undefined)
    return s
  }

  await entrar(page); await page.waitForURL(BASE + '/'); await dormir(page)
  await privacidade('Início')

  // ---------- 1. o percurso Início → Pedidos → pedido → Ver cliente → ficha → pedido dela → voltar ----------
  await page.locator('nav a[href="/pedidos"]').click(); await page.waitForURL(/\/pedidos/)
  await page.getByRole('searchbox').fill('Albuquerque'); await dormir(page, 1500)
  if (!(await page.locator('[data-testid=linha-do-pedido]').count())) { await page.getByRole('button', { name: /Tudo|Todos/ }).first().click().catch(() => {}); await dormir(page, 1200) }
  const linhasP = await page.locator('[data-testid=linha-do-pedido]').count()
  log(linhasP > 0, 'Pedidos: a busca por nome acha a convidada de prova', linhasP)
  await privacidade('Pedidos com busca por nome')
  await page.locator('[data-testid=linha-do-pedido]').first().click(); await page.waitForURL(/\/pedidos\/[0-9a-f-]{36}/); await dormir(page, 800)
  const urlPedido = page.url()
  await privacidade('detalhe do pedido')
  await page.getByRole('button', { name: 'Ver cliente' }).click()
  await page.waitForURL(/\/clientes\/[0-9a-f-]{36}/, { timeout: 10000 })
  await page.waitForSelector('[data-parte=email]'); await dormir(page, 600)
  const idLonga = psql("select id from customer_list where email like 'p76.endereco%'")
  log(page.url() === `${BASE}/clientes/${idLonga}`, '"Ver cliente" abre a ficha da pessoa certa (id da view)', page.url())
  await privacidade('ficha aberta pelo Ver cliente')
  await page.locator('[data-testid=pedido-da-cliente]').first().click(); await page.waitForURL(/\/pedidos\/[0-9a-f-]{36}/); await dormir(page, 600)
  log(true, 'ficha → um pedido dela', new URL(page.url()).pathname)
  await page.getByRole('button', { name: 'Voltar' }).click(); await page.waitForURL(/\/clientes\/[0-9a-f-]{36}/); await dormir(page, 500)
  log(page.url() === `${BASE}/clientes/${idLonga}`, 'Voltar do pedido: de volta à ficha')
  await page.getByRole('button', { name: 'Voltar' }).click(); await page.waitForURL(/\/pedidos\/[0-9a-f-]{36}/); await dormir(page, 500)
  log(page.url() === urlPedido, 'Voltar da ficha: de volta ao pedido de onde veio')

  // ---------- 2. voltar traz o mesmo recorte, busca e posição ----------
  await page.locator('nav a[href="/clientes"]').click(); await page.waitForSelector('[data-testid=linha-do-cliente]')
  await page.getByRole('button', { name: 'Com pedido em aberto' }).click(); await dormir(page, 800)
  log(page.url().endsWith('/clientes?recorte=em-aberto'), 'o chip troca o endereço (só o recorte)', page.url())
  await page.getByRole('button', { name: 'Todas' }).click(); await dormir(page, 800)
  for (let i = 0; i < 3; i++) { await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await dormir(page, 500) }
  await page.evaluate(() => window.scrollTo(0, 1500)); await dormir(page, 400)
  const y0 = await page.evaluate(() => Math.round(scrollY))
  const nomeLinha = await page.locator('[data-testid=linha-do-cliente]').nth(12).getAttribute('href')
  await page.locator('[data-testid=linha-do-cliente]').nth(12).scrollIntoViewIfNeeded()
  const y1 = await page.evaluate(() => Math.round(scrollY))
  const linhasAntes = await page.locator('[data-testid=linha-do-cliente]').count()
  await page.locator('[data-testid=linha-do-cliente]').nth(12).click(); await page.waitForURL(/\/clientes\/[0-9a-f-]{36}/); await dormir(page, 800)
  await privacidade('ficha aberta pela linha da lista')
  await page.getByRole('button', { name: 'Voltar' }).click(); await page.waitForURL(BASE + '/clientes'); await dormir(page, 1200)
  const y2 = await page.evaluate(() => Math.round(scrollY))
  const linhasDepois = await page.locator('[data-testid=linha-do-cliente]').count()
  log(Math.abs(y2 - y1) <= 4 && linhasDepois >= linhasAntes, 'Voltar da ficha traz a MESMA posição e as mesmas linhas', { antes: y1, depois: y2, linhasAntes, linhasDepois })
  // recorte + busca
  await page.getByRole('button', { name: 'Compraram mais de uma vez' }).click(); await dormir(page, 800)
  await page.getByRole('searchbox').fill('rosa'); await dormir(page, 1500)
  const porBusca = await page.locator('[data-testid=linha-do-cliente]').count()
  log(page.url().endsWith('?recorte=recorrentes') && !page.url().includes('rosa'), 'a busca NÃO vai ao endereço (só o recorte)', page.url())
  await page.getByRole('button', { name: 'Todas' }).click(); await dormir(page, 1000)
  const rosas = await page.locator('[data-testid=linha-do-cliente]').count()
  const rosasSql = Number(psql("select count(*) from customer_list where name ilike '%rosa%' or email ilike '%rosa%' or phone ilike '%rosa%'"))
  log(rosas === rosasSql && rosas >= 2, 'busca "rosa" em Todas acha as mesmas pessoas que o psql (as duas de prova, VROSA_RJ e VROSAXRJ, mais quem já tinha Rosa no nome)', { app: rosas, sql: rosasSql })
  await privacidade('busca por nome na lista')
  await page.locator('[data-testid=linha-do-cliente]').first().click(); await page.waitForURL(/\/clientes\/[0-9a-f-]{36}/); await dormir(page, 800)
  await page.getByRole('button', { name: 'Voltar' }).click(); await page.waitForURL(BASE + '/clientes'); await dormir(page, 1200)
  const termo = await page.getByRole('searchbox').inputValue()
  const linhasVolta = await page.locator('[data-testid=linha-do-cliente]').count()
  const pressionado = await page.locator('[data-recorte][aria-pressed=true]').getAttribute('data-recorte')
  log(termo === 'rosa' && linhasVolta === rosasSql && pressionado === 'todas', 'Voltar traz o mesmo recorte E a mesma busca', { termo, linhasVolta, pressionado })
  // busca por telefone
  await page.getByRole('searchbox').fill('(51) 98877-6655'); await dormir(page, 1500)
  const porTel = await page.locator('[data-testid=linha-do-cliente]').count()
  log(porTel === 1, 'busca por telefone com máscara acha a pessoa pelos dígitos', porTel)
  await privacidade('busca por telefone')
  await page.getByRole('searchbox').fill(''); await dormir(page, 800)

  // ---------- 3. teclado virtual (emulado) ----------
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.getByRole('searchbox').focus()
  await page.evaluate(() => window.__setTeclado(338)); await dormir(page, 500)
  for (let i = 0; i < 3; i++) { await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await dormir(page, 500) }
  const ult = await page.evaluate(() => { const a = [...document.querySelectorAll('[data-testid=linha-do-cliente]')]; const r = a[a.length - 1].getBoundingClientRect(); return { fundo: Math.round(r.bottom), visivelAte: innerHeight - 338 } })
  log(ult.fundo <= ult.visivelAte, 'com o teclado de 338 px, o último resultado fica acima dele', ult)
  await page.evaluate(() => window.scrollTo(0, 0)); await dormir(page, 300)
  const campo = await page.evaluate(() => { const r = document.querySelector('input[type=search]').getBoundingClientRect(); return { topo: Math.round(r.top), fundo: Math.round(r.bottom), visivelAte: innerHeight - 338 } })
  log(campo.topo >= 0 && campo.fundo <= campo.visivelAte, 'o campo de busca visível com o teclado aberto', campo)
  await page.keyboard.press('Enter'); await dormir(page, 300)
  log(await page.evaluate(() => document.activeElement?.tagName !== 'INPUT'), 'Enter tira o foco do campo (fecha o teclado)')
  await page.evaluate(() => window.__setTeclado(0))
  await page.getByRole('searchbox').focus()
  await page.evaluate(() => window.__setTeclado(338)); await dormir(page, 300)
  await page.evaluate(() => history.back()); await dormir(page, 1000)
  const aposVoltar = await page.evaluate(() => ({ path: location.pathname, h1: document.querySelector('h1')?.textContent }))
  log(!!aposVoltar.h1 && aposVoltar.path !== '/clientes', 'history.back() com o campo focado sai da aba e a tela seguinte desenha', aposVoltar)
  await page.evaluate(() => window.__setTeclado(0))

  // ---------- 4. a requisição: hosts e console ----------
  const hosts = [...ctx.hosts]
  log(hosts.every((h) => /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(h)), 'nenhuma requisição fora do Supabase local e do próprio app', hosts)
  const foraDoLocal = urls.filter((u) => /supabase\.co|google-analytics|googletagmanager/.test(u))
  log(foraDoLocal.length === 0, 'nada para *.supabase.co nem GA', foraDoLocal.slice(0, 3))
  const comDado = consoleMsgs.filter((m) => SENSIVEL.some((t) => m.toLowerCase().includes(t.toLowerCase())))
  log(comDado.length === 0, `o console (${consoleMsgs.length} mensagens) não carrega nome, e-mail nem telefone`, comDado.slice(0, 3))
  log(consoleMsgs.filter((m) => m.startsWith('pageerror')).length === 0, 'nenhum erro de página', consoleMsgs.filter((m) => /error/.test(m)).slice(0, 3))
  const PESSOAL = SENSIVEL.filter((t) => !/^p76/i.test(t))
  const titulosUnicos = [...new Set(titulos)]
  log(titulosUnicos.every((t) => !PESSOAL.some((s) => t.toLowerCase().includes(s.toLowerCase()))), 'os títulos do documento nunca carregam dado de cliente', titulosUnicos)
  await ctx.close()

  // ---------- 5. menos movimento ----------
  const estados = {}
  for (const rm of ['reduce', 'no-preference']) {
    const c = await novoContexto(browser, vp, { reducedMotion: rm })
    const p = await c.newPage()
    await entrar(p); await p.waitForURL(BASE + '/')
    await p.locator('nav a[href="/clientes"]').click(); await p.waitForSelector('[data-testid=linha-do-cliente]')
    await p.getByRole('button', { name: 'Compraram mais de uma vez' }).click(); await p.waitForTimeout(1200)
    const e = await p.evaluate(() => ({ h1: document.querySelector('h1').textContent, contagem: document.querySelector('[data-testid=contagem]')?.textContent, linhas: document.querySelectorAll('[data-testid=linha-do-cliente]').length, pressionado: document.querySelector('[data-recorte][aria-pressed=true]').dataset.recorte, reduz: matchMedia('(prefers-reduced-motion: reduce)').matches }))
    const anim = await p.evaluate(() => { const b = document.querySelector('[data-recorte]'); return getComputedStyle(b).transitionProperty })
    estados[rm] = { ...e, transitionDuration: anim }
    await c.close()
  }
  const { reduz: r1, transitionDuration: t1, ...a } = estados.reduce, { reduz: r2, transitionDuration: t2, ...b } = estados['no-preference']
  log(JSON.stringify(a) === JSON.stringify(b) && r1 && !r2, 'menos movimento ligado e desligado mostram os MESMOS estados', { a, b })
  log(t1 === 'none' && t2 !== 'none', 'só a transição do chip muda: nenhuma propriedade com menos movimento, cores sem ele', { ligado: t1, desligado: t2 })

  // ---------- 6. a conta sem papel ----------
  const c6 = await novoContexto(browser, vp)
  const p6 = await c6.newPage()
  const visto = []
  p6.on('response', async (r) => { if (/customer_list|order_list|atelie_clock/.test(r.url())) visto.push(`${r.status()} ${new URL(r.url()).pathname.split('/').pop()}`) })
  const textos = []
  await entrar(p6, 'probe76-cliente@exemplo.invalid', 'probe76senha')
  for (let i = 0; i < 20; i++) { await p6.waitForTimeout(250); textos.push(await p6.evaluate(() => document.body.innerText)) }
  const recusa = textos[textos.length - 1].includes('Esta conta não tem acesso ao painel.')
  log(recusa, 'a conta de cliente SEM papel recebe a recusa no login', { path: new URL(p6.url()).pathname })
  await p6.goto(BASE + '/clientes'); const t6 = []
  for (let i = 0; i < 16; i++) { await p6.waitForTimeout(250); t6.push(await p6.evaluate(() => document.body.innerText)) }
  log(!t6.some((t) => /Sem Papel|probe76/i.test(t)) && !new URL(p6.url()).pathname.startsWith('/clientes'), 'direto em /clientes: nenhum texto dela em instante nenhum, e o app a leva ao login', { path: new URL(p6.url()).pathname, respostas: visto })
  await c6.close()

  fs.writeFileSync(`${SHOTS}/percurso.json`, JSON.stringify(out, null, 1))
  console.log(`\n${out.filter((x) => !x.ok).length} falha(s) em ${out.length} verificações`)
  await browser.close()
})().catch((e) => { console.error(e); process.exit(2) })
