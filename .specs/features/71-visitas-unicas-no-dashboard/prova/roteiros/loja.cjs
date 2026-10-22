// Parte (b) da prova — a LOJA. Build de produção servido na 8082 (o contador só chama com PROD).
const { chromium, sql, contexto, irPeloRouter, esperar, LOJA, PROVA } = require('./comum.cjs')

const A = '7100e2e0-0000-4000-8000-00000000000a'
const ROTAS = ['/sobre', '/perguntas-frequentes', '/politica-de-privacidade', '/politicas-de-trocas-e-devolucoes', '/como-enviar-seu-material-de-dna']
const out = {}
const log = (k, v) => {
  out[k] = v
  console.log(k, JSON.stringify(v))
}
const hoje = "(now() at time zone 'America/Sao_Paulo')::date"

;(async () => {
  const browser = await chromium.launch()
  try {
    log('linhas_hoje_entrada', sql(`select count(*) from public.store_visits where day = ${hoje}`))

    // ---------------------------------------------------------------- S0 — o robô sem neutralização
    {
      const { ctx, rede } = await contexto(browser, { neutralizar: false })
      const p = await ctx.newPage()
      await p.goto(LOJA + '/', { waitUntil: 'load' })
      for (const r of ROTAS.slice(0, 3)) {
        await irPeloRouter(p, r)
        await esperar(800)
      }
      await esperar(5000)
      log('S0_webdriver', await p.evaluate(() => navigator.webdriver))
      log('S0_posts', rede.visitas.length)
      await ctx.close()
    }

    // ---------------------------------------------------------------- S1 — ponta a ponta em 390×844
    // O marcador é semeado com o id A (o mesmo navegador das fixturas de seg/ter/qua): a visita de
    // HOJE deste navegador tem de virar UMA linha, e "Esta semana" tem de contá-lo uma vez só.
    {
      const { ctx, rede } = await contexto(browser)
      await ctx.addInitScript(id => {
        try {
          if (!localStorage.getItem('estrelinha-visitor')) {
            localStorage.setItem('estrelinha-visitor', JSON.stringify({ v: 1, id, ate: null, em: null }))
          }
        } catch {}
      }, A)
      const p = await ctx.newPage()
      await p.goto(LOJA + '/', { waitUntil: 'load' })
      await esperar(3000)
      log('S1_webdriver', await p.evaluate(() => navigator.webdriver))
      for (const r of ROTAS) {
        await irPeloRouter(p, r)
        await esperar(1200)
      }
      await esperar(3000)
      log('S1_posts_apos_6_paginas', rede.visitas.length)
      await p.reload({ waitUntil: 'load' })
      await esperar(5000)
      await irPeloRouter(p, '/')
      await esperar(3000)
      log('S1_posts_apos_reload_e_mais_1_pagina', rede.visitas.length)
      log('S1_requisicoes', rede.visitas.map(v => ({
        corpo: v.corpo,
        status: v.status,
        resposta: v.resposta,
        authorization: v.headers.authorization ?? null,
        apikey_publicavel: (v.headers.apikey ?? '').startsWith('sb_publishable_'),
      })))
      log('S1_marcador', await p.evaluate(() => JSON.parse(localStorage.getItem('estrelinha-visitor'))))
      log('S1_linhas_de_A_hoje', sql(`select count(*) from public.store_visits where visitor_id = '${A}' and day = ${hoje}`))
      log('S1_linhas_hoje_total', sql(`select count(*) from public.store_visits where day = ${hoje}`))
      log('S1_scrollWidth', await p.evaluate(() => [document.documentElement.scrollWidth, document.body.scrollWidth, innerWidth]))
      await p.screenshot({ path: `${PROVA}/loja-390-contada.png` })
      log('S1_rede', { ga: rede.ga, bloqueadas: rede.bloqueadas })
      await ctx.close()
    }

    // ---------------------------------------------------------------- S2 — recusa no aviso de cookies
    {
      const { ctx, rede } = await contexto(browser)
      const p = await ctx.newPage()
      await p.goto(LOJA + '/', { waitUntil: 'load' })
      await esperar(5000)
      const antes = await p.evaluate(() => JSON.parse(localStorage.getItem('estrelinha-visitor')))
      log('S2_marcador_antes', antes)
      log('S2_posts_antes', rede.visitas.length)
      log('S2_resposta_antes', rede.visitas.map(v => v.resposta?.desfecho))
      const idNovo = antes?.id
      log('S2_linha_do_id_novo_hoje', sql(`select count(*) from public.store_visits where visitor_id = '${idNovo}' and day = ${hoje}`))

      const aviso = p.getByRole('region', { name: 'Aviso de cookies' }).or(p.getByLabel('Aviso de cookies'))
      await aviso.first().waitFor({ timeout: 10000 })
      await p.screenshot({ path: `${PROVA}/loja-390-aviso.png` })
      await p.getByRole('button', { name: 'Preferências', exact: true }).click()
      const chave = p.getByRole('switch', { name: /Estatísticas/ })
      await chave.waitFor()
      log('S2_switch_inicial', await chave.getAttribute('aria-checked'))
      await chave.click()
      log('S2_switch_depois', await chave.getAttribute('aria-checked'))
      await p.screenshot({ path: `${PROVA}/loja-390-preferencias-recusa.png` })
      await p.getByRole('button', { name: 'Salvar escolhas' }).click()
      await esperar(1000)
      log('S2_marcador_depois_da_recusa', await p.evaluate(() => JSON.parse(localStorage.getItem('estrelinha-visitor'))))
      // O prazo vencido à mão: sem a recusa, isto faria a próxima navegação chamar o servidor.
      await p.evaluate(() => {
        const m = JSON.parse(localStorage.getItem('estrelinha-visitor')) ?? { v: 1, id: null }
        localStorage.setItem('estrelinha-visitor', JSON.stringify({ ...m, ate: 1, em: 0 }))
      })
      for (const r of ROTAS.slice(0, 3)) {
        await irPeloRouter(p, r)
        await esperar(1200)
      }
      await p.reload({ waitUntil: 'load' })
      await esperar(5000)
      log('S2_posts_depois_da_recusa', rede.visitas.length)
      log('S2_marcador_final', await p.evaluate(() => JSON.parse(localStorage.getItem('estrelinha-visitor'))))
      await ctx.close()
    }

    // ---------------------------------------------------------------- S3 — ?preview=1 dentro de iframe
    {
      const { ctx, rede } = await contexto(browser)
      const p = await ctx.newPage()
      // Uma página do PAINEL (outra origem) com a loja em iframe, como a prévia de /admin/home.
      await p.goto('http://localhost:8083/admin/login', { waitUntil: 'load' })
      await p.evaluate(src => {
        document.body.innerHTML = ''
        const f = document.createElement('iframe')
        f.src = src
        f.width = '390'
        f.height = '844'
        document.body.appendChild(f)
      }, LOJA + '/?preview=1')
      await esperar(9000)
      const frame = p.frames().find(f => f.url().startsWith(LOJA))
      log('S3_frame', frame?.url())
      log('S3_frame_tem_conteudo', frame ? await frame.evaluate(() => document.body.innerText.length > 50) : false)
      log('S3_marcador_no_frame', frame ? await frame.evaluate(() => localStorage.getItem('estrelinha-visitor')) : 'sem frame')
      log('S3_posts', rede.visitas.length)
      await ctx.close()
    }

    log('linhas_hoje_saida', sql(`select count(*) from public.store_visits where day = ${hoje}`))
    log('contador', sql(`select started_at || ' | ' || last_recorded_at from public.store_visit_counter`))
  } finally {
    await browser.close()
  }
})().catch(e => {
  console.error(e)
  process.exit(1)
})
