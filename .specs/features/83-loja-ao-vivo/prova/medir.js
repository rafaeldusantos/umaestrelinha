// Feature 83 · T13 — a medição, rodada no navegador (Playwright, build servido por `vite preview`).
// Usada como corpo de page.evaluate: devolve um objeto com as medidas de layout da tela atual.
() => {
  const W = window.innerWidth
  const r = (el) => el.getBoundingClientRect()
  const sobre = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5
  const out = { W, scrollWidth: document.documentElement.scrollWidth, bodyScroll: document.body.scrollWidth }
  // alvos de toque
  const alvos = []
  const voltar = document.querySelector('[aria-label="Voltar"]')
  if (voltar) alvos.push(['voltar', r(voltar).width, r(voltar).height])
  document.querySelectorAll('button[aria-pressed]').forEach((b) => alvos.push(['periodo ' + b.textContent.trim(), r(b).width, r(b).height]))
  const cartaoInicio = [...document.querySelectorAll('a,button')].find((e) => /Visitas hoje/i.test(e.textContent || '') && /por horário/.test(e.textContent || ''))
  if (cartaoInicio) alvos.push(['cartao Visitas hoje', r(cartaoInicio).width, r(cartaoInicio).height])
  out.alvos = alvos
  out.alvosAbaixoDe44 = alvos.filter(([, w, h]) => w < 44 || h < 44)
  // cabeçalho
  const cab = document.querySelector('[data-testid="cabecalho-ao-vivo"]')
  if (cab) { const c = r(cab); out.cabecalho = { left: c.left, right: c.right, top: c.top + window.scrollY, width: c.width } }
  // cartões dos acessos
  const grade = document.querySelector('[data-testid="cartoes-dos-acessos"]')
  if (grade) {
    const g = r(grade)
    const filhos = [...grade.children].map((e) => { const b = r(e); return { texto: e.getAttribute('aria-label'), left: Math.round(b.left), top: Math.round(b.top), width: Math.round(b.width) } })
    out.cartoes = { gradeWidth: Math.round(g.width), filhos }
    out.umaColuna = filhos.every((f) => f.left === filhos[0].left)
    out.conversaoLarguraInteira = filhos.length === 3 && Math.abs(filhos[2].width - Math.round(g.width)) <= 1
    // números estourando o próprio cartão
    out.numeroEstoura = [...grade.children].some((e) => { const v = e.querySelector('.font-display'); return v && r(v).right > r(e).right + 0.5 })
  }
  // gráfico
  const ol = document.querySelector('[data-testid="colunas"]')
  if (ol) {
    const valores = [...ol.querySelectorAll('[data-testid="valor"]')]
    const colunas = [...ol.querySelectorAll('[data-testid="coluna"]')]
    let sobreposto = 0
    for (let i = 0; i < valores.length; i++) {
      for (let j = i + 1; j < valores.length; j++) if (sobre(r(valores[i]), r(valores[j]))) sobreposto++
      const vr = r(valores[i]), cr = r(colunas[i])
      if (vr.width > 0 && (vr.left < cr.left - 0.5 || vr.right > cr.right + 0.5)) sobreposto++
    }
    const cartao = document.querySelector('[data-testid="grafico"]')
    out.grafico = {
      valores: valores.map((v) => v.textContent.trim()),
      rotulos: [...ol.querySelectorAll('[data-testid="rotulo"]')].map((v) => v.textContent.trim()),
      sobreposicoes: sobreposto,
      olScroll: ol.scrollWidth, olClient: ol.clientWidth,
      rolaDentro: ol.scrollWidth > ol.clientWidth,
      olDentroDoCartao: r(ol).right <= r(cartao).right + 0.5 && r(ol).left >= r(cartao).left - 0.5,
    }
  }
  // qualquer elemento de folha com texto saindo da tela à direita
  out.textoForaDaTela = [...document.querySelectorAll('main *, header *')].filter((e) => e.children.length === 0 && (e.textContent || '').trim() && !e.closest('[data-testid="colunas"]') && r(e).right > W + 0.5).map((e) => e.textContent.trim().slice(0, 30))
  return out
}
