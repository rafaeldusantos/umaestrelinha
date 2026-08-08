// Gera `apps/store/src/shared/ui/brand/paths.ts` a partir dos SVGs canônicos
// deste diretório. Rode da RAIZ do repositório:
//
//     node .specs/brand/uma-estrelinha/_gen-paths.mjs
//
// Extrair em vez de transcrever: são ~10KB de coordenada, e um caractere
// trocado à mão não quebra nada visível — só deforma a letra. `paths.test.ts`
// compara o gerado com o SVG caractere a caractere, então o script não é a
// prova: ele é só o caminho mais curto até ela.
import { readFileSync, writeFileSync } from 'node:fs'

const BRAND = '.specs/brand/uma-estrelinha/'

/**
 * Lê um SVG canônico. Cada `<path>` é um PAPEL de traço, precedido do
 * comentário que o nomeia — o formato que a normalização da T24 produziu.
 */
function ler(file) {
  const svg = readFileSync(BRAND + file, 'utf8')
  const viewBox = svg.match(/viewBox="([^"]+)"/)[1]
  const [, , w, h] = viewBox.split(/\s+/).map(Number)

  const strokes = [
    ...svg.matchAll(/<!-- ([^·]+)·[^>]*-->\s*<path d="([^"]+)"[^>]*stroke-width="([\d.]+)"/g),
  ].map((m) => ({ role: m[1].trim(), d: m[2], width: Number(m[3]) }))

  if (strokes.length === 0) throw new Error(`${file}: nenhum papel de traço encontrado`)

  const larguras = new Set(strokes.map((s) => s.width))
  if (larguras.size !== strokes.length) {
    throw new Error(`${file}: dois papéis com a mesma espessura — a consolidação da T24 se desfez`)
  }

  return { file, viewBox, w, h, strokes }
}

const round = (n) => Math.round(n * 1e6) / 1e6

function bloco(nome, doc, art) {
  const strokes = art.strokes
    .map(
      (s) =>
        `    // ${s.role} — ${s.width} em ${art.w} de largura (${round((s.width / art.w) * 1000) / 10}%)\n` +
        `    { role: '${s.role}', width: ${s.width}, d: '${s.d}' },`,
    )
    .join('\n')

  return `/**
${doc}
 *
 * Fonte: \`.specs/brand/uma-estrelinha/${art.file}\`.
 */
export const ${nome}: BrandArt = {
  viewBox: '${art.viewBox}',
  ratio: ${art.w} / ${art.h},
  strokes: [
${strokes}
  ],
}`
}

const lockup = ler('uma-estrelinha-lockup.svg')
const signature = ler('uma-estrelinha-assinatura.svg')
const symbol = ler('uma-estrelinha-simbolo.svg')
const symbolTiny = ler('uma-estrelinha-simbolo-16.svg')

const header = `/**
 * Geometria da marca Uma Estrelinha — extraída de \`.specs/brand/uma-estrelinha/*.svg\`,
 * que é a fonte exportada da prancha \`78R-0\` do Paper (ver o README de lá).
 *
 * **Esta marca é MONOLINE: todo desenho é traço, nenhum é preenchimento.**
 * Não existe contador de letra para vazar, então \`fill-rule\` — a regra
 * estrutural da marca anterior — não tem efeito nenhum aqui e não é usada. O
 * que a substitui é a espessura: **um \`<path>\` por PAPEL DE TRAÇO**, porque
 * espessura é geometria e fundir dois papéis muda o desenho. Papéis com a mesma
 * espessura já vêm fundidos do arquivo-fonte.
 *
 * Reduzir esta marca não borra a letra — **apaga a linha**. O traço é uma fração
 * fixa da largura, então cada componente tem um piso abaixo do qual o traço mais
 * fino não ocupa um pixel inteiro e vira o cinza do antialias. Os pisos vivem
 * nos componentes, com a conta escrita.
 *
 * Gerado por \`.specs/brand/uma-estrelinha/_gen-paths.mjs\` — não editar à mão.
 */

/** Um papel de traço: o que desenha, com que espessura. */
export interface BrandStroke {
  readonly role: string
  readonly width: number
  readonly d: string
}

/** Um degrau da marca: o quadro, a proporção e os traços, na ordem de desenho. */
export interface BrandArt {
  readonly viewBox: string
  /** largura / altura — a altura sai da largura, nunca o contrário. */
  readonly ratio: number
  readonly strokes: readonly BrandStroke[]
}
`

const body = [
  bloco(
    'LOCKUP',
    ` * Degrau 1 — o logotipo completo: marca + tipografia + assinatura.\n` +
      ` * Prancha \`78R-0\`, "FORMATO 3 DO MANUAL".`,
    lockup,
  ),
  bloco(
    'SIGNATURE',
    ` * Degrau 2 — a assinatura visual: marca + tipografia, sem a linha\n` +
      ` * "ETERNIZANDO SUAS LEMBRANÇAS". Prancha \`734-0\`, "01 · LOGO COMPLETO".`,
    signature,
  ),
  bloco(
    'SYMBOL',
    ` * Degrau 3 — o símbolo: lua, estrela e duas fagulhas. Prancha \`734-0\`,\n` +
      ` * "02 · SÍMBOLO" — cuja nota diz, medida: "Use de 48px para cima".`,
    symbol,
  ),
  bloco(
    'SYMBOL_TINY',
    ` * O símbolo REDESENHADO para tamanho pequeno — só lua e estrela, traço 8,0.\n` +
      ` * Prancha \`734-0\`, "03 · FAVICON": *"abaixo de 32px o símbolo completo vira\n` +
      ` * mancha: as pétalas e as fagulhas fecham"*, e a redução *"usa traço 8,0,\n` +
      ` * calibrado para render pelo menos 1,3px de linha a 16px"*.`,
    symbolTiny,
  ),
].join('\n\n')

const out = `${header}\n${body}\n`
writeFileSync('apps/store/src/shared/ui/brand/paths.ts', out)
console.log('paths.ts:', out.length, 'bytes ·', [lockup, signature, symbol, symbolTiny].map((a) => `${a.file.replace('uma-estrelinha-', '').replace('.svg', '')}=${a.strokes.length}`).join(' '))
