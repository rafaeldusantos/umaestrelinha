// Gera os ícones do app do ateliê (`apps/mobile-adm/public/icons/`, feature 72) a partir do
// SÍMBOLO completo da marca, em negativo sobre `primary-strong`. Rode da RAIZ do repositório:
//
//     node .specs/brand/uma-estrelinha/_gen-atelie-icons.mjs
//
// Rasteriza com o Chrome headless (`CHROME`, default o Google Chrome do macOS) e normaliza com o
// ImageMagick (`magick`). O renderizador SVG interno do ImageMagick desta máquina devolve a placa
// VAZIA para o símbolo (medido em 2026-10-22: 512×512 de cor lisa, sem traço), e o `rsvg-convert`
// que ele delegaria não está instalado — por isso o Chrome desenha e o `magick` só tira metadado.
// Escreve os SVGs intermediários num diretório temporário e só os PNGs no app.
//
// Três ícones, os que o manifest declara (`MAF-01`):
//
//   icon-192.png            any       o desenho ocupa 80% do lado (quadrado sangrado)
//   icon-512.png            any       idem
//   icon-maskable-512.png   maskable  o desenho cabe INTEIRO no círculo da zona segura: o Android
//                                     recorta a máscara (círculo, squircle…) e só garante os 80%
//                                     centrais em diâmetro. O desenho vai de 4 a 96 nas duas
//                                     direções do viewBox de 100 — a meia-diagonal da caixa tem de
//                                     caber no raio de 40% ⇒ lado da arte ≤ 56% do ícone.
//
// O símbolo completo (com as fagulhas), e não o reduzido de 16px: a 192 e 512 o traço fino das
// fagulhas tem vários pixels, e o reduzido existe para a aba do navegador.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const SRC = '.specs/brand/uma-estrelinha/uma-estrelinha-simbolo.svg'
const OUT = 'apps/mobile-adm/public/icons'
const PLACA = '#283A4A' // estrelinha primary-strong — igual ao theme_color do manifest
const TRACO = '#F7F3EC' // estrelinha on-primary — o negativo

const svg = readFileSync(SRC, 'utf8')
const paths = [...svg.matchAll(/<path d="([^"]+)"[^>]*stroke-width="([\d.]+)"/g)].map((m) => ({
  d: m[1],
  width: Number(m[2]),
}))
if (paths.length !== 2) throw new Error(`esperava 2 <path> no símbolo, achei ${paths.length}`)

function icone(size, fracaoDaArte) {
  const arte = size * fracaoDaArte
  const escala = arte / 100
  const deslocamento = (size - arte) / 2
  const corpo = paths
    .map(
      (p) =>
        `<path d="${p.d}" fill="none" stroke="${TRACO}" stroke-width="${p.width}" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${PLACA}"/><g transform="translate(${deslocamento} ${deslocamento}) scale(${escala})">${corpo}</g></svg>`
}

const tmp = mkdtempSync(join(tmpdir(), 'atelie-icons-'))
for (const [nome, size, fracao] of [
  ['icon-192', 192, 0.8],
  ['icon-512', 512, 0.8],
  ['icon-maskable-512', 512, 0.56],
]) {
  const fonte = join(tmp, `${nome}.svg`)
  writeFileSync(fonte, icone(size, fracao))
  const pagina = join(tmp, `${nome}.html`)
  writeFileSync(pagina, `<html><body style="margin:0"><img src="${nome}.svg" width="${size}" height="${size}" style="display:block"></body></html>`)
  const bruto = join(tmp, `${nome}.png`)
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--window-size=${size},${size}`, `--screenshot=${bruto}`, `file://${pagina}`,
  ], { stdio: 'ignore' })
  execFileSync('magick', [bruto, '-strip', `PNG24:${join(OUT, `${nome}.png`)}`])
  console.log(`${OUT}/${nome}.png`)
}
