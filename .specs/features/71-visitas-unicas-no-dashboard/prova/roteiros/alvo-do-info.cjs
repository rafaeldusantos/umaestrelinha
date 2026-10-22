const { chromium, contexto, esperar, PAINEL } = require('./comum.cjs')
;(async () => {
  const browser = await chromium.launch()
  const { ctx } = await contexto(browser, { mobile: process.argv[2] !== '1440' })
  const page = await ctx.newPage()
  await page.goto(PAINEL + '/admin/login'); await page.fill('#email','admin@umaestrelinha.dev'); await page.fill('#password','admin123')
  await page.getByRole('button', { name: /^Entrar$/ }).click(); await page.waitForURL(u => new URL(u).pathname === '/admin')
  await esperar(3000)
  const info = page.locator('[role="tabpanel"]:visible').getByRole('button', { name: 'O que conta como visita única' })
  const c = await info.boundingBox(); console.log('caixa', c)
  for (const [dx, dy, nome] of [[22,22,'centro'],[22,36,'baixo 36'],[22,32,'baixo 32'],[34,30,'diag inf dir'],[4,4,'canto 4,4'],[22,4,'topo meio'],[6,22,'esquerda meio'],[38,22,'direita meio'],[22,40,'baixo meio']]) {
    const quem = await page.evaluate(([x,y]) => { const e = document.elementFromPoint(x,y); return e ? e.tagName + (e.getAttribute('aria-label') ? '['+e.getAttribute('aria-label')+']' : '') + '.' + (e.className?.baseVal ?? e.className).toString().slice(0,60) : null }, [c.x+dx, c.y+dy])
    await (process.argv[2] === '1440' ? page.mouse.click(c.x+dx, c.y+dy) : page.touchscreen.tap(c.x+dx, c.y+dy)); await esperar(400)
    const exp = await info.getAttribute('aria-expanded')
    console.log(nome, '→ elementFromPoint:', quem, '| aria-expanded após toque:', exp)
    if (exp === 'true') { await page.keyboard.press('Escape'); await esperar(400) }
  }
  await browser.close()
})()
