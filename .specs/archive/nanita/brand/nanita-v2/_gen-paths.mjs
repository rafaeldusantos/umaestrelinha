// Gera `shared/ui/brand/paths.ts` a partir dos SVGs canônicos da marca.
// Extrair em vez de transcrever: são 10KB de coordenadas, e um caractere
// trocado à mão não quebra nada visível — só deforma a letra.
import { readFileSync, writeFileSync } from 'node:fs'

const BRAND = '.specs/brand/nanita-v2/'
const paths = (file) =>
  [...readFileSync(BRAND + file, 'utf8').matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1])

const [wordmark] = paths('nanita-wordmark.svg')
const [wordmarkInLockup, descriptor] = paths('nanita-logo.svg')
const [monogram] = paths('nanita-monogram-n.svg')

if (wordmark !== wordmarkInLockup) {
  throw new Error('o wordmark do lockup divergiu do arquivo solto — a fonte da marca está inconsistente')
}

const header = `/**
 * Geometria da marca Nanita v2 — extraída de \`.specs/brand/nanita-v2/*.svg\`,
 * que é a fonte vetorizada e verificada (README daquele diretório: IoU de
 * 96,6% no wordmark e 91,0% no descritor contra o PNG de origem).
 *
 * **Cada constante é UM path com \`fill-rule="evenodd"\`, e isso é requisito,
 * não estilo.** Todos os contornos de uma cor são subpaths do MESMO path
 * porque \`fill-rule\` decide preenchimento dentro de um path — entre paths
 * separados ele não tem efeito nenhum. Quebrar estes valores em vários
 * elementos pinta o miolo do \`a\`, do \`P\`, do \`R\`, do \`O\`, do \`A\` e do \`D\`
 * por cima do corpo, na mesma cor, e as letras saem maciças.
 *
 * Foi exatamente o erro da primeira vetorização: a geometria estava certa —
 * os 34 contornos existiam, nas coordenadas certas — e as letras saíram
 * sólidas mesmo assim. A verificação de IoU não pegou porque rasterizava todos
 * os contornos juntos num único even-odd: media a geometria, não a estrutura
 * do arquivo. É o buraco que \`paths.test.ts\` cobre.
 *
 * Gerado por \`scratchpad/gen-paths.mjs\` — não editar à mão.
 */

`

const body = [
  '/** "Nanita" sozinho. viewBox `0 0 690.06 172.04`. */',
  `export const WORDMARK_D =\n  '${wordmark}'`,
  '',
  '/** "PERSONALIZADOS" — a fileira de baixo. viewBox do lockup: `0 0 690.06 237.8`. */',
  `export const DESCRIPTOR_D =\n  '${descriptor}'`,
  '',
  '/** O N sozinho. viewBox `0 0 126.87 160.18` — mesmo path do lockup, nada foi redesenhado. */',
  `export const MONOGRAM_D =\n  '${monogram}'`,
  '',
  '/** Proporção do wordmark: escolha a largura, a altura sai dela. */',
  'export const WORDMARK_RATIO = 690.06 / 172.04',
  '',
  '/** Proporção do lockup completo (wordmark + descritor). */',
  'export const LOCKUP_RATIO = 690.06 / 237.8',
  '',
  '/** Proporção do monograma. */',
  'export const MONOGRAM_RATIO = 126.87 / 160.18',
  '',
].join('\n')

writeFileSync('apps/store/src/shared/ui/brand/paths.ts', header + body)
console.log('paths.ts:', (header + body).length, 'bytes')
