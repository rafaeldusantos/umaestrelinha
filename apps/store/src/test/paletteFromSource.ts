import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { STYLE_PROFILE_ATTRIBUTE, type StyleProfile } from '@estrelinha/core/appearance'

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
 *
 * ## Um bloco por perfil de estilo
 *
 * Desde o perfil de estilo da loja, o `App.css` declara a paleta em dois blocos:
 * `:root` com o Padrão e o seletor do atributo do perfil com o Black Friday, que
 * só traz o que muda. A leitura de um perfil reproduz a cascata do navegador: o
 * `:root`, e por cima o bloco do perfil. A do Padrão lê **só** o `:root` — um
 * valor do Black Friday nunca vaza para ela, porque recortar o arquivo inteiro
 * casaria as duas declarações e a segunda ganharia.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const APP_CSS = resolve(HERE, '../app/App.css')

/**
 * Quantos tokens `--estrelinha-*` de cor o `App.css` declara hoje, por perfil.
 *
 * Âncora de contagem, pelo mesmo motivo das varreduras: sem ela, um erro de
 * caminho ou uma mudança no formato da declaração faria a leitura devolver
 * `{}`, e todo teste que itera sobre a paleta passaria por **não ter nada para
 * reprovar** — a pior falha possível num guarda.
 */
const MINIMO_DE_TOKENS = 14

/**
 * Quantas declarações próprias o bloco do Black Friday tem, no mínimo. Sem esta
 * segunda âncora, um seletor com um erro de digitação faria a leitura do perfil
 * devolver o Padrão inteiro, e os pisos medidos "no Black Friday" seriam os do
 * Padrão de novo.
 */
const MINIMO_DO_BLOCO_DO_PERFIL = 9

export type PaletteToken = string

/** O seletor do bloco de cada perfil no `App.css`. */
export function seletorDoPerfil(perfil: StyleProfile): string {
  return perfil === 'padrao' ? ':root' : `html[${STYLE_PROFILE_ATTRIBUTE}="${perfil}"]`
}

export function lerAppCss(): string {
  return readFileSync(APP_CSS, 'utf8')
}

/**
 * O corpo do bloco do seletor, entre as chaves — ou lança. Os comentários saem
 * antes (prosa que cite o seletor ou uma chave não pode abrir nem fechar bloco),
 * e os blocos da paleta não têm chave aninhada, então o fecho é a primeira `}`
 * depois da abertura.
 */
export function blocoDoSeletor(cssCru: string, seletor: string): string {
  const css = cssCru.replace(/\/\*[\s\S]*?\*\//g, '')
  const abertura = css.indexOf(`${seletor} {`)
  if (abertura === -1) {
    throw new Error(`paletteFromSource: o bloco \`${seletor}\` não existe no CSS lido.`)
  }
  const inicio = abertura + seletor.length + 2
  const fim = css.indexOf('}', inicio)
  if (fim === -1) throw new Error(`paletteFromSource: o bloco \`${seletor}\` não fecha.`)
  return css.slice(inicio, fim)
}

/** Toda custom property declarada num bloco: nome sem `--` → valor cru. */
export function declaracoes(bloco: string): Record<string, string> {
  const semComentario = bloco.replace(/\/\*[\s\S]*?\*\//g, '')
  const found: Record<string, string> = {}
  for (const m of semComentario.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    found[m[1]] = m[2].trim()
  }
  return found
}

/**
 * As custom properties em vigor num perfil: o `:root`, e por cima o bloco do
 * perfil (a cascata). No Padrão, só o `:root`.
 */
export function variaveisDoPerfil(
  perfil: StyleProfile = 'padrao',
  css: string = lerAppCss(),
): Record<string, string> {
  const raiz = declaracoes(blocoDoSeletor(css, ':root'))
  if (perfil === 'padrao') return raiz
  const proprias = declaracoes(blocoDoSeletor(css, seletorDoPerfil(perfil)))
  if (Object.keys(proprias).length < MINIMO_DO_BLOCO_DO_PERFIL) {
    throw new Error(
      `paletteFromSource: o bloco do perfil "${perfil}" declara ` +
        `${Object.keys(proprias).length} variáveis, esperava pelo menos ` +
        `${MINIMO_DO_BLOCO_DO_PERFIL}.`,
    )
  }
  return { ...raiz, ...proprias }
}

/**
 * Lê os tokens de cor de `App.css` no perfil pedido (o Padrão, sem argumento).
 * Chaves sem o prefixo (`ground`, `ink-soft`, `field`…), valores em maiúscula
 * (`#FAF8F4`).
 *
 * Lança se encontrar menos que a âncora — um guarda que não achou a paleta tem
 * de falhar alto, nunca devolver vazio em silêncio.
 */
export function paletteFromSource(
  perfil: StyleProfile = 'padrao',
  css: string = lerAppCss(),
): Record<PaletteToken, string> {
  const found: Record<string, string> = {}

  for (const [nome, valor] of Object.entries(variaveisDoPerfil(perfil, css))) {
    const m = /^estrelinha-([a-z-]+)$/.exec(nome)
    if (m && /^#[0-9a-fA-F]{3,6}$/.test(valor)) found[m[1]] = valor.toUpperCase()
  }

  const total = Object.keys(found).length
  if (total < MINIMO_DE_TOKENS) {
    throw new Error(
      `paletteFromSource: li ${total} tokens do perfil "${perfil}" em ${APP_CSS}, ` +
        `esperava pelo menos ${MINIMO_DE_TOKENS}. Ou o caminho quebrou, ou a forma ` +
        `da declaração mudou — em qualquer dos casos os testes-guarda estariam ` +
        `medindo o vazio.`,
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
export function paletteToken(nome: PaletteToken, perfil: StyleProfile = 'padrao'): string {
  const paleta = paletteFromSource(perfil)
  const valor = paleta[nome]
  if (!valor) {
    throw new Error(
      `paletteFromSource: token "--estrelinha-${nome}" não existe em App.css (perfil "${perfil}"). ` +
        `Tokens disponíveis: ${Object.keys(paleta).sort().join(', ')}.`,
    )
  }
  return valor
}
