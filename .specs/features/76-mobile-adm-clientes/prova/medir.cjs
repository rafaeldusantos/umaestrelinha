// função injetada no navegador: mede o que jsdom não alcança
module.exports = () => {
  const de = document.documentElement
  const out = { scrollW: de.scrollWidth, innerW: innerWidth, bodyW: document.body.scrollWidth }
  out.semRolagemHorizontal = de.scrollWidth <= innerWidth && document.body.scrollWidth <= innerWidth
  const textoProprio = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
  const cortados = []
  for (const el of document.body.querySelectorAll('*')) {
    if (!textoProprio(el)) continue
    const rr = el.getBoundingClientRect()
    if (rr.width <= 1 && rr.height <= 1) continue // sr-only: texto só para leitor de tela
    const cs = getComputedStyle(el)
    const corta = cs.textOverflow === 'ellipsis' || ((cs.overflowX === 'hidden' || cs.overflowX === 'clip') && el.scrollWidth > el.clientWidth + 1)
    const clamp = cs.webkitLineClamp && cs.webkitLineClamp !== 'none'
    const vertical = (cs.overflowY === 'hidden' || cs.overflowY === 'clip') && el.scrollHeight > el.clientHeight + 1
    if (corta || clamp || vertical) cortados.push(el.textContent.trim().slice(0, 40))
  }
  out.cortados = cortados
  const min = (sel, filtro) => {
    const els = [...document.querySelectorAll(sel)].filter(filtro || (() => true))
    if (!els.length) return null
    const hs = els.map((e) => Math.round(e.getBoundingClientRect().height)), ws = els.map((e) => Math.round(e.getBoundingClientRect().width))
    return { n: els.length, h: Math.min(...hs), w: Math.min(...ws) }
  }
  out.alvos = {
    linhaDoCliente: min('[data-testid=linha-do-cliente]'),
    chips: min('[data-testid=faixa-de-chips] button'),
    whatsapp: min('a[data-parte=whatsapp]'),
    verMais: min('button', (b) => b.textContent.trim() === 'Ver mais pedidos'),
    verCliente: min('button', (b) => /^(Ver cliente|Abrindo…)$/.test(b.textContent.trim())),
    pedidoDaCliente: min('[data-testid=pedido-da-cliente]'),
    busca: min('input[type=search]'),
    abas: min('nav a'),
  }
  const faixa = document.querySelector('[data-testid=faixa-de-chips]')
  if (faixa) {
    const af = document.querySelector('[data-testid=afordancia-dos-chips]')
    out.chips = { scrollW: faixa.scrollWidth, clientW: faixa.clientWidth, rolaDentro: faixa.scrollWidth > faixa.clientWidth, overflowX: getComputedStyle(faixa).overflowX, afordanciaVisivel: af?.dataset.visivel }
  }
  const inter = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
  const sobrepostos = []
  for (const linha of document.querySelectorAll('[data-testid=linha-do-cliente], [data-testid=pedido-da-cliente], [data-numero]')) {
    const folhas = [...linha.querySelectorAll('*')].filter((e) => textoProprio(e))
    for (let i = 0; i < folhas.length; i++) for (let j = i + 1; j < folhas.length; j++) {
      const a = folhas[i].getBoundingClientRect(), b = folhas[j].getBoundingClientRect()
      if (a.width && b.width && inter(a, b)) sobrepostos.push([folhas[i].textContent.trim().slice(0, 25), folhas[j].textContent.trim().slice(0, 25)])
    }
    const lr = linha.getBoundingClientRect()
    for (const f of folhas) { const r = f.getBoundingClientRect(); if (r.right > lr.right + 1 || r.left < lr.left - 1) sobrepostos.push(['fora da caixa', f.textContent.trim().slice(0, 25)]) }
  }
  out.sobrepostos = sobrepostos
  const nums = [...document.querySelectorAll('[data-numero]')].map((e) => { const r = e.getBoundingClientRect(); return { n: e.dataset.numero, top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width) } })
  if (nums.length) out.numeros = { itens: nums, empilhados: new Set(nums.map((n) => n.top)).size === nums.length, lado: new Set(nums.map((n) => n.top)).size === 1 }
  const aba = document.querySelector('nav[aria-label], nav')
  return out
}
