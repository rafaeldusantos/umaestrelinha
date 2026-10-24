const fs = require('node:fs')
const { lancar, BASE, psql, SHOTS, VIEWPORTS, novoContexto, entrar, fonte } = require('./lib.cjs')
const medir = require('./medir.cjs')
;(async () => {
  const browser = await lancar()
  const ids = {
    longa: psql("select id from customer_list where email like 'p76.endereco%'"),
    semNome: psql("select id from customer_list where email = 'p76.sem.nome@exemplo.invalid'"),
    telefone: psql("select id from customer_list where email = 'p76.telefone@exemplo.invalid'"),
  }
  console.log(JSON.stringify(ids))
  // sessão da admin, uma vez
  const c0 = await novoContexto(browser, VIEWPORTS[1])
  const p0 = await c0.newPage()
  await entrar(p0)
  await p0.waitForURL(BASE + '/')
  const estado = await c0.storageState()
  await c0.close()
  const resultado = []
  let reprovou = 0
  for (const vp of VIEWPORTS) for (const pct of [100, 130, 200]) {
    const ctx = await novoContexto(browser, vp, { storageState: estado })
    const page = await ctx.newPage()
    const erros = []
    page.on('pageerror', (e) => erros.push(String(e)))
    const telas = [
      ['lista', '/clientes', '[data-testid=linha-do-cliente]'],
      ['lista-em-aberto', '/clientes?recorte=em-aberto', '[data-testid=linha-do-cliente]'],
      ['ficha-longa', `/clientes/${ids.longa}`, '[data-testid=pedido-da-cliente]'],
      ['ficha-sem-nome', `/clientes/${ids.semNome}`, '[data-parte=email]'],
      ['ficha-telefone', `/clientes/${ids.telefone}`, 'a[data-parte=whatsapp]'],
    ]
    for (const [nome, caminho, espera] of telas) {
      await page.goto(BASE + caminho)
      await fonte(page, pct)
      await page.waitForSelector(espera, { timeout: 15000 })
      await page.waitForTimeout(400)
      let m = await page.evaluate(medir)
      if (nome === 'ficha-longa') {
        const antes = await page.locator('[data-testid=pedido-da-cliente]').count()
        const bt = page.getByRole('button', { name: 'Ver mais pedidos' })
        await bt.scrollIntoViewIfNeeded()
        await bt.click()
        await page.waitForFunction((n) => document.querySelectorAll('[data-testid=pedido-da-cliente]').length > n, antes, { timeout: 15000 })
        await page.waitForTimeout(300)
        m = await page.evaluate(medir)
        m.pedidosAntes = antes
        m.pedidosDepois = await page.locator('[data-testid=pedido-da-cliente]').count()
        m.verMaisDepois = await page.getByRole('button', { name: 'Ver mais pedidos' }).count()
      }
      if (nome === 'lista') {
        // rola até o fim de verdade (a sentinela) e confere as linhas sem id repetido
        for (let i = 0; i < 6; i++) { await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(500) }
        const hrefs = await page.$$eval('[data-testid=linha-do-cliente]', (as) => as.map((a) => a.getAttribute('href')))
        m.linhasAoFim = hrefs.length
        m.idsDistintos = new Set(hrefs).size
        m.contagem = await page.locator('[data-testid=contagem]').innerText().catch(() => null)
        m.semRolagemHorizontalAoFim = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
      }
      const item = { vp: vp.nome, fonte: pct, tela: nome, erros: erros.length, ...m }
      // reprovações
      const falhas = []
      if (!m.semRolagemHorizontal) falhas.push('rolagem horizontal')
      if (m.cortados.length) falhas.push('texto cortado: ' + m.cortados.join('|'))
      if (m.sobrepostos.length) falhas.push('sobreposição: ' + JSON.stringify(m.sobrepostos.slice(0, 3)))
      for (const [k, v] of Object.entries(m.alvos)) if (v && (v.h < 44 || (k !== 'busca' && k !== 'linhaDoCliente' && v.w < 44))) falhas.push(`alvo ${k} ${v.w}x${v.h}`)
      if (nome === 'lista' && (m.linhasAoFim !== m.idsDistintos || !m.semRolagemHorizontalAoFim)) falhas.push('lista: ids repetidos ou rolagem ao fim')
      if (m.numeros && pct === 200 && vp.w <= 412 && !m.numeros.empilhados) falhas.push('números não empilharam a 200%')
      if (m.chips && m.chips.rolaDentro && m.chips.afordanciaVisivel !== 'true' && nome.startsWith('lista')) falhas.push('chips rolam sem afordância')
      if (erros.length) falhas.push('pageerror ' + erros[0])
      item.falhas = falhas
      if (falhas.length) reprovou++
      resultado.push(item)
      console.log(`${vp.nome} ${pct}% ${nome}: ${falhas.length ? 'FALHA ' + falhas.join('; ') : 'ok'}`)
      if ((pct === 200 || pct === 130) && vp.nome === '390' || (nome === 'ficha-longa' && vp.nome === '360' && pct === 200)) {
        await page.screenshot({ path: `${SHOTS}/${vp.nome}-${nome}-fonte-${pct}.png`, fullPage: nome !== 'lista' })
      }
    }
    await ctx.close()
  }
  fs.writeFileSync(`${SHOTS}/matriz.json`, JSON.stringify(resultado, null, 1))
  console.log(`\n${resultado.length} medidas, ${reprovou} com falha`)
  await browser.close()
})().catch((e) => { console.error(e); process.exit(2) })
