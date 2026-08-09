import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * A paleta lida **do disco**, de `src/app/App.css` — a fonte única para todo
 * teste-guarda que precise de um valor de cor.
 *
 * ## Por que este módulo existe
 *
 * O Verifier da feature 20 encontrou o defeito que ele previne, e ele é o
 * defeito desta feature aplicado a si mesmo. Havia **quatro** declarações da
 * paleta: `App.css`, `tailwind.config.ts`, a constante canônica de
 * `palette.test.ts` e uma cópia própria dentro de `contrast.test.ts`. A
 * paridade cobria as três primeiras; a quarta não era conferida por nada.
 *
 * O mutante: trocar `--estrelinha-ink-soft` de `#54616B` para `#B0B8BE` nas
 * **três** declarações — o que é exatamente o que alguém faria ao mudar a
 * paleta de propósito — deixava os guardas **83/83 verdes**, com o token de
 * texto secundário, que é o piso de legibilidade da loja, medindo **1,90:1**
 * contra os 4,5:1 que a `IDN-02` exige. O `contrast.test.ts` continuava
 * medindo a cor velha, que já não estava em lugar nenhum da loja.
 *
 * O comentário daquele arquivo dizia "a paridade com App.css/Tailwind é
 * `palette.test.ts`" — e essa premissa era falsa: o `palette.test.ts` compara
 * os dois arquivos contra a constante **dele**, e nunca olhou para a cópia do
 * vizinho.
 *
 * ## A regra que fica
 *
 * **Teste-guarda não declara cor.** Quem precisa de um valor de cor chama
 * `paletteFromSource()`. A única constante de cor que sobrevive no repositório
 * é a `PALETA` de `palette.test.ts`, e ela tem função oposta: é o valor que a
 * spec define, escrito à mão de propósito, contra o qual os arquivos são
 * comparados. Uma é a afirmação, a outra é a leitura — e o teste é a diferença.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const APP_CSS = resolve(HERE, '../app/App.css')

/**
 * Quantos tokens `--estrelinha-*` de cor o `App.css` declara hoje.
 *
 * Âncora de contagem, pelo mesmo motivo das varreduras: sem ela, um erro de
 * caminho ou uma mudança no formato da declaração faria a leitura devolver
 * `{}`, e todo teste que itera sobre a paleta passaria por **não ter nada para
 * reprovar** — a pior falha possível num guarda.
 */
const MINIMO_DE_TOKENS = 14

export type PaletteToken = string

/**
 * Lê os tokens de cor de `App.css`. Chaves sem o prefixo (`ground`, `ink-soft`,
 * `field`…), valores em maiúscula (`#FAF8F4`).
 *
 * Lança se encontrar menos que a âncora — um guarda que não achou a paleta tem
 * de falhar alto, nunca devolver vazio em silêncio.
 */
export function paletteFromSource(): Record<PaletteToken, string> {
  const css = readFileSync(APP_CSS, 'utf8')
  const found: Record<string, string> = {}

  for (const match of css.matchAll(/--estrelinha-([a-z-]+):\s*(#[0-9a-fA-F]{3,6})\s*;/g)) {
    found[match[1]] = match[2].toUpperCase()
  }

  const total = Object.keys(found).length
  if (total < MINIMO_DE_TOKENS) {
    throw new Error(
      `paletteFromSource: li ${total} tokens de ${APP_CSS}, esperava pelo menos ` +
        `${MINIMO_DE_TOKENS}. Ou o caminho quebrou, ou a forma da declaração mudou — ` +
        `em qualquer dos casos os testes-guarda estariam medindo o vazio.`,
    )
  }

  return found
}

/**
 * O mesmo mapa, mas falhando alto em token inexistente.
 *
 * `paletteFromSource().inexistente` devolveria `undefined`, e `contrastRatio`
 * receberia `undefined` — que é como um erro de digitação num nome de token
 * viraria um teste verde sem sentido.
 */
export function paletteToken(nome: PaletteToken): string {
  const valor = paletteFromSource()[nome]
  if (!valor) {
    throw new Error(
      `paletteFromSource: token "--estrelinha-${nome}" não existe em App.css. ` +
        `Tokens disponíveis: ${Object.keys(paletteFromSource()).sort().join(', ')}.`,
    )
  }
  return valor
}
