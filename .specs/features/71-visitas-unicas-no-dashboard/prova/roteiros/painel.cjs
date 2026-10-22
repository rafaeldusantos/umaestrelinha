// Parte (b) da prova — o PAINEL. Dashboard real (vite dev na 8083) lendo o banco local.
const { chromium, sql, contexto, esperar, PAINEL, PROVA } = require('./comum.cjs')

const out = { falhas: [] }
const log = (k, v) => {
  out[k] = v
  console.log(k, JSON.stringify(v))
}
const confere = (o_que, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado)
  console.log(ok ? 'ok   ' : 'FALHA', o_que, JSON.stringify(obtido), ok ? '' : `(esperado ${JSON.stringify(esperado)})`)
  if (!ok) out.falhas.push(o_que)
}
const norm = s => (s ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()

const distintos = (de, ate) =>
  sql(`select count(distinct visitor_id) from public.store_visits where day between '${de}' and '${ate}'`)

async function entrar(page) {
  await page.goto(PAINEL + '/admin/login', { waitUntil: 'load' })
  await page.fill('#email', 'admin@umaestrelinha.dev')
  await page.fill('#password', 'admin123')
  await page.getByRole('button', { name: /^Entrar$/ }).click()
  await page.waitForURL(u => new URL(u).pathname === '/admin', { timeout: 20000 })
}

const secao = page => page.locator('section', { has: page.getByRole('heading', { name: 'Movimento da loja' }) })

/** Os quatro cards do painel de aba visível: rótulo e valor (o `textContent` do `<p>` do valor). */
async function cards(page) {
  return secao(page)
    .locator('[role="tabpanel"]:visible [data-grade="movimento"] > div')
    .evaluateAll(els =>
      els.map(el => {
        const ps = el.querySelectorAll('p')
        return { rotulo: ps[0]?.textContent, valor: ps[1]?.textContent, sub: ps[2]?.textContent ?? null }
      }),
    )
}

async function medidas(page) {
  return page.evaluate(() => {
    const sec = [...document.querySelectorAll('section')].find(s => s.querySelector('h2')?.textContent === 'Movimento da loja')
    const alvos = [...sec.querySelectorAll('button, [role="tab"]')]
      .filter(b => b.offsetParent !== null)
      .map(b => {
        const r = b.getBoundingClientRect()
        return { nome: b.getAttribute('aria-label') ?? b.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height) }
      })
    const grade = sec.querySelector('[role="tabpanel"]:not([hidden]) [data-grade="movimento"]')
    return {
      scroll: [document.documentElement.scrollWidth, document.body.scrollWidth, innerWidth],
      colunas: grade ? getComputedStyle(grade).gridTemplateColumns.split(' ').length : null,
      alvos,
    }
  })
}

async function percorrerAbas(page, tamanho, esperado) {
  for (const [aba, rotulo] of [['hoje', 'Hoje'], ['ontem', 'Ontem'], ['semana', 'Esta semana']]) {
    const tab = secao(page).getByRole('tab', { name: rotulo, exact: true })
    await tab.click()
    await esperar(400)
    confere(`${tamanho} aba ${rotulo} selecionada`, await tab.getAttribute('aria-selected'), 'true')
    const c = await cards(page)
    confere(
      `${tamanho} ${rotulo}: rótulos`,
      c.map(x => norm(x.rotulo)),
      ['Visitas únicas', 'Vendas', 'Faturamento', 'Ticket médio'],
    )
    confere(`${tamanho} ${rotulo}: valores`, c.map(x => norm(x.valor)), esperado[aba].valores)
    confere(`${tamanho} ${rotulo}: linha do período`, norm(await secao(page).locator('[role="tabpanel"]:visible > div > p').first().textContent()), esperado[aba].linha)
    log(`${tamanho}_${aba}_subtitulo_visitas`, norm(c[0].sub))
    log(`${tamanho}_${aba}_rodape`, await secao(page).locator('[role="tabpanel"]:visible .text-xs > p').allTextContents())
    const m = await medidas(page)
    log(`${tamanho}_${aba}_medidas`, m)
    confere(`${tamanho} ${rotulo}: sem rolagem horizontal`, m.scroll[0] === m.scroll[2] && m.scroll[1] === m.scroll[2], true)
    confere(`${tamanho} ${rotulo}: alvos ≥ 44`, m.alvos.filter(a => a.h < 44 || a.w < 44), [])
    await page.screenshot({ path: `${PROVA}/painel-${tamanho}-${aba}.png`, fullPage: false })
  }
}

;(async () => {
  const hoje = sql("select (now() at time zone 'America/Sao_Paulo')::date")
  if (hoje !== '2026-10-22') throw new Error('os esperados desta prova valem para 22/10 em Brasília; hoje é ' + hoje)
  const vHoje = distintos('2026-10-22', '2026-10-22')
  const vOntem = distintos('2026-10-21', '2026-10-21')
  const vSemana = distintos('2026-10-19', '2026-10-22')
  const somaDias = sql("select count(*) from public.store_visits where day between '2026-10-19' and '2026-10-22'")
  log('banco', { vHoje, vOntem, vSemana, somaDias })
  const esperado = {
    hoje: { valores: [vHoje, '0', 'R$ 0,00', '—sem vendas no período'], linha: 'Hoje, 22/10' },
    ontem: { valores: [vOntem, '2', 'R$ 120,00', 'R$ 60,00'], linha: 'Ontem, 21/10' },
    semana: { valores: [vSemana, '3', 'R$ 170,00', 'R$ 56,67'], linha: 'De 19/10 a 22/10' },
  }

  const browser = await chromium.launch()
  try {
    // ------------------------------------------------------------------------------ 390 × 844
    {
      const { ctx, rede } = await contexto(browser, { mobile: true })
      const page = await ctx.newPage()
      await entrar(page)
      await secao(page).getByRole('tab', { name: 'Hoje', exact: true }).waitFor()
      await secao(page).locator('[data-grade="movimento"] [data-skeleton]').first().waitFor({ state: 'detached', timeout: 15000 }).catch(() => {})
      await esperar(800)
      confere('390 sem os cards antigos "Pedidos Hoje"/"Fat. Hoje"', await page.getByText(/^(Pedidos Hoje|Fat\. Hoje)$/).count(), 0)
      await page.screenshot({ path: `${PROVA}/painel-390-pagina-inteira.png`, fullPage: true })
      await percorrerAbas(page, '390', esperado)

      // ⓘ por TOQUE: dentro do alvo de 44, fora do desenho de 16
      await secao(page).getByRole('tab', { name: 'Hoje', exact: true }).click()
      const info = secao(page).locator('[role="tabpanel"]:visible').getByRole('button', { name: 'O que conta como visita única' })
      const caixa = await info.boundingBox()
      log('390_info_caixa', caixa && { w: Math.round(caixa.width), h: Math.round(caixa.height) })
      await page.touchscreen.tap(caixa.x + 40, caixa.y + 22) // 6px da borda direita do alvo, onde o ícone do olho roubava o toque
      await esperar(400)
      const pop = page.locator('[data-radix-popper-content-wrapper]')
      confere('390 ⓘ abre por toque (aria-expanded)', await info.getAttribute('aria-expanded'), 'true')
      log('390_popover_texto', norm(await pop.textContent()))
      const pb = await pop.locator(':scope > *').first().boundingBox()
      log('390_popover_caixa', pb && { x: Math.round(pb.x), w: Math.round(pb.width), direita: Math.round(pb.x + pb.width) })
      confere('390 popover com 16px de folga dos dois lados', pb.x >= 16 && pb.x + pb.width <= 374, true)
      await page.screenshot({ path: `${PROVA}/painel-390-info.png` })
      await page.touchscreen.tap(195, 40)
      await esperar(400)
      confere('390 ⓘ fecha com toque fora', await info.getAttribute('aria-expanded'), 'false')
      log('390_rede', { ga: rede.ga, bloqueadas: rede.bloqueadas })
      await ctx.close()
    }

    // ------------------------------------------------------------------------------ 1440 × 900
    {
      const { ctx } = await contexto(browser, { mobile: false })
      const page = await ctx.newPage()
      await entrar(page)
      await secao(page).getByRole('tab', { name: 'Hoje', exact: true }).waitFor()
      await secao(page).locator('[data-grade="movimento"] [data-skeleton]').first().waitFor({ state: 'detached', timeout: 15000 }).catch(() => {})
      await esperar(800)
      confere('1440 sem os cards antigos', await page.getByText(/^(Pedidos Hoje|Fat\. Hoje)$/).count(), 0)
      await percorrerAbas(page, '1440', esperado)

      // ⓘ pelo TECLADO: Enter abre, Esc fecha e devolve o foco; Espaço abre
      await secao(page).getByRole('tab', { name: 'Hoje', exact: true }).click()
      const info = secao(page).locator('[role="tabpanel"]:visible').getByRole('button', { name: 'O que conta como visita única' })
      await info.focus()
      await page.keyboard.press('Enter')
      await esperar(300)
      confere('1440 ⓘ Enter abre', await info.getAttribute('aria-expanded'), 'true')
      await page.screenshot({ path: `${PROVA}/painel-1440-info-teclado.png` })
      await page.keyboard.press('Escape')
      await esperar(300)
      confere('1440 ⓘ Esc fecha', await info.getAttribute('aria-expanded'), 'false')
      confere('1440 foco volta ao ⓘ', await info.evaluate(el => document.activeElement === el), true)
      await page.keyboard.press(' ')
      await esperar(300)
      confere('1440 ⓘ Espaço abre', await info.getAttribute('aria-expanded'), 'true')
      await page.keyboard.press('Escape')
      // Tab percorre as abas pelo teclado (setas, padrão do Radix)
      await secao(page).getByRole('tab', { name: 'Hoje', exact: true }).focus()
      await page.keyboard.press('ArrowRight')
      await esperar(300)
      confere('1440 seta para a direita leva a Ontem', await secao(page).getByRole('tab', { name: 'Ontem', exact: true }).getAttribute('aria-selected'), 'true')
      await ctx.close()
    }

    // ------------------------------------------------------------------------------ estados: carregando e erro
    for (const [tamanho, mobile] of [['390', true], ['1440', false]]) {
      const { ctx } = await contexto(browser, { mobile })
      const page = await ctx.newPage()
      await entrar(page)
      await secao(page).getByRole('tab', { name: 'Hoje', exact: true }).waitFor()
      let modo = 'erro'
      await ctx.route('**/rest/v1/rpc/store_movement*', async route => {
        if (modo === 'erro') return route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"falha simulada"}' })
        if (modo === 'lento') {
          await esperar(4000)
          return route.continue()
        }
        return route.continue()
      })
      await page.reload({ waitUntil: 'load' })
      const msg = page.getByText('Não foi possível carregar os números do período.')
      await msg.waitFor({ timeout: 45000 })
      const botao = page.getByRole('button', { name: 'Tentar de novo' })
      const bb = await botao.boundingBox()
      log(`${tamanho}_erro_botao`, { w: Math.round(bb.width), h: Math.round(bb.height) })
      confere(`${tamanho} erro: nenhum card de valor`, await secao(page).locator('[data-grade="movimento"]').count(), 0)
      confere(`${tamanho} erro: "Tentar de novo" ≥ 44 de altura`, bb.height >= 44, true)
      const m = await page.evaluate(() => [document.documentElement.scrollWidth, document.body.scrollWidth, innerWidth])
      confere(`${tamanho} erro: sem rolagem horizontal`, m[0] === m[2] && m[1] === m[2], true)
      await page.screenshot({ path: `${PROVA}/painel-${tamanho}-erro.png` })
      modo = 'lento'
      await botao.click()
      await esperar(600)
      confere(`${tamanho} "Tentar de novo" → esqueleto nos 4 cards`, await secao(page).locator('[data-skeleton="valor"]').count(), 4)
      await page.screenshot({ path: `${PROVA}/painel-${tamanho}-carregando.png` })
      await secao(page).locator('[data-skeleton="valor"]').first().waitFor({ state: 'detached', timeout: 20000 })
      const c = await cards(page)
      confere(`${tamanho} depois do erro, os valores de Hoje`, c.map(x => norm(x.valor)), esperado.hoje.valores)
      await ctx.close()
    }
  } finally {
    await browser.close()
  }
  console.log('FALHAS:', out.falhas.length, out.falhas)
  process.exit(out.falhas.length ? 1 : 0)
})().catch(e => {
  console.error(e)
  process.exit(2)
})
