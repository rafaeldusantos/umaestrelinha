// Gera os SVGs de ícone a partir do monograma canônico da marca.
//
// A escala sai da medição da prancha 19b, não de olho. A haste esquerda do N
// ocupa 31,59 de 126,87 unidades do viewBox — 24,9% da largura. Então, para uma
// haste de H px numa aba de 16px:
//
//     largura do N = H / 0,249     e     escala = largura / 126,87
//
//   disco    → 2,1px de haste → N com 52,0% do ícone (é o favicon antigo)
//   squircle → 2,5px          → N com 62,8%
//   quadrado → 2,6px          → N com 65,3%
import { readFileSync, writeFileSync } from 'node:fs'

const MONO = '.specs/brand/nanita-v2/nanita-monogram-n.svg'
const [, d] = readFileSync(MONO, 'utf8').match(/<path[^>]*\sd="([^"]+)"/)

const VB_W = 126.87
const VB_H = 160.18
const STEM_FRACTION = 31.59 / VB_W // 0,249 — a haste esquerda do N

const round = (n) => Math.round(n * 100) / 100

/** @param size lado do ícone · @param stemAt16 haste alvo, medida a 16px */
function icon({ size, stemAt16, rx, note }) {
  const scale = (stemAt16 / STEM_FRACTION / 16) * (size / VB_W)
  const w = VB_W * scale
  const h = VB_H * scale
  const x = round((size - w) / 2)
  const y = round((size - h) / 2)

  const base =
    rx === null
      ? `<rect width="${size}" height="${size}" fill="#F1678D"/>`
      : `<rect width="${size}" height="${size}" rx="${rx}" fill="#F1678D"/>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="Nanita">
  <title>Nanita</title>
${note}
  ${base}
  <g transform="translate(${x} ${y}) scale(${round(scale * 1000) / 1000})" fill="#2E2028">
    <path fill-rule="evenodd" d="${d}"/>
  </g>
</svg>
`
}

const SQUIRCLE_NOTE = `  <!--
    Base B · SQUIRCLE — a recomendação medida da prancha 19b do Paper.

    O achado é de uma linha: a base só ganha haste ficando mais reta. Disco,
    botton, adesivo e losango gastam área desenhando a própria borda, e quem
    paga é o N. A 16px, com o piso de 2px (abaixo disso a haste sai cinza de
    antialias, não Grafite):

      A · disco             2,1px de haste    78% do quadrado pintado
      B · squircle          2,5px             93%   ← esta arte
      C · quadrado sangrado 2,6px            100%   ← apple-touch-icon
      F · losango           1,4px             50%

    Squircle na ABA porque ninguém recorta o favicon: ele precisa do próprio
    canto para não encostar na aba vizinha.

    O N é o MESMO path do lockup — nada foi redesenhado para caber em 16px.
    Carimbo sobre Grafite lê a 5,22:1. Gerado por scratchpad/gen-favicon.mjs.
  -->`

const SQUARE_NOTE = `  <!--
    Base C · QUADRADO SANGRADO — para o atalho da tela inicial do iOS.

    Sem canto de propósito. O iOS aplica a PRÓPRIA máscara ao ícone, e arte
    pré-arredondada deixa uma sobra entre o desenho e o corte: quem decide o
    raio ali é o sistema, não a arte. É também a base com a haste mais grossa
    que existe (2,6px a 16px, 100% do quadrado pintado).

    Duas bases para o mesmo N não é inconsistência — a variável é quem faz o
    recorte. Gerado por scratchpad/gen-favicon.mjs.
  -->`

writeFileSync(
  'apps/store/public/favicon.svg',
  icon({ size: 64, stemAt16: 2.5, rx: 18, note: SQUIRCLE_NOTE }),
)
writeFileSync(
  'apps/store/public/icon-maskable.svg',
  icon({ size: 180, stemAt16: 2.6, rx: null, note: SQUARE_NOTE }),
)

console.log('favicon.svg (squircle 64) e icon-maskable.svg (quadrado 180) escritos')
