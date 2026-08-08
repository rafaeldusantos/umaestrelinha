// Gera `apps/store/public/favicon.svg` a partir do símbolo reduzido da marca.
// Rode da RAIZ do repositório:
//
//     node .specs/brand/uma-estrelinha/_gen-favicon.mjs
//
// ── Por que o ícone é quase um quadrado, e não o squircle da marca anterior ──
//
// Lá o desenho era o monograma N: um glifo VERTICAL, cujos extremos ficam nos
// eixos. Arredondar o canto não custava nada e a base mais reta dava a haste
// mais grossa (2,1px no disco → 2,5px no squircle → 2,6px no quadrado).
//
// Aqui o extremo do desenho é a **ponta da estrela, na DIAGONAL** — exatamente
// onde um canto arredondado come área. Medido neste arquivo (maior escala que
// cabe sem cortar a ponta, e o traço que sobra a 16px):
//
//   disco  (r 50%)   escala 0,724   →  0,93px de traço
//   squircle (r 28%) escala 0,856   →  1,10px
//   canto 6%         escala 1,000   →  1,28px   ← a aba
//   quadrado         escala 1,000   →  1,28px   ← o apple-touch-icon
//
// A prancha `734-0` do Paper calibrou a redução para *"render pelo menos 1,3px
// de linha a 16px"*. Só a base quase reta entrega isso — o squircle custaria
// 15% do traço. **A variável continua sendo quem faz o recorte**: canto próprio
// na aba, porque o navegador não arredonda favicon; sangrado no iOS, porque lá
// o sistema aplica a própria máscara e arte pré-arredondada deixa sobra.
import { readFileSync, writeFileSync } from 'node:fs'

const SRC = '.specs/brand/uma-estrelinha/uma-estrelinha-simbolo-16.svg'
const svg = readFileSync(SRC, 'utf8')
const d = svg.match(/<path d="([^"]+)"/)[1]
const width = Number(svg.match(/stroke-width="([\d.]+)"/)[1])

const PLACA = '#283A4A' // --estrelinha-primary-strong — a base do avatar no board
const TRACO = '#F7F3EC' // --estrelinha-on-primary — o negativo

/**
 * @param size lado do ícone
 * @param cornerPct canto em fração do lado; `null` = sangrado
 */
function icone({ size, cornerPct, nota }) {
  const escala = size / 100
  const base =
    cornerPct === null
      ? `<rect width="${size}" height="${size}" fill="${PLACA}"/>`
      : `<rect width="${size}" height="${size}" rx="${Math.round(size * cornerPct * 100) / 100}" fill="${PLACA}"/>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="Uma Estrelinha">
  <title>Uma Estrelinha</title>
${nota}
  ${base}
  <g transform="scale(${escala})">
    <path d="${d}" fill="none" stroke="${TRACO}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
`
}

const NOTA_ABA = `  <!--
    A ABA — canto de 6% do lado.

    O navegador NÃO recorta o favicon, então o ícone precisa do próprio canto
    para não encostar na aba vizinha. Mas o canto aqui é pequeno de propósito:
    o extremo deste desenho é a ponta da estrela, na diagonal, e um canto de
    28% (o squircle da marca anterior) obrigaria a encolher a arte para 0,856 —
    1,10px de traço a 16px, contra 1,28px assim.

    O desenho é a REDUÇÃO da prancha 734-0, não o símbolo grande encolhido:
    traço 8,0 em vez de 2,46, "quase 3x o traço do símbolo grande, e é
    proposital". Abaixo de 32px o símbolo completo vira mancha.

    Gerado por .specs/brand/uma-estrelinha/_gen-favicon.mjs.
  -->`

const NOTA_IOS = `  <!--
    O ATALHO DO iOS — sangrado, sem canto nenhum.

    O iOS aplica a PRÓPRIA máscara ao ícone; arte pré-arredondada deixa uma
    sobra entre o desenho e o corte. Quem decide o raio ali é o sistema.

    Gerado por .specs/brand/uma-estrelinha/_gen-favicon.mjs.
  -->`

writeFileSync('apps/store/public/favicon.svg', icone({ size: 64, cornerPct: 0.06, nota: NOTA_ABA }))
writeFileSync('apps/store/public/icon-maskable.svg', icone({ size: 180, cornerPct: null, nota: NOTA_IOS }))

console.log('favicon.svg (canto 6%, 64) e icon-maskable.svg (sangrado, 180) escritos')
