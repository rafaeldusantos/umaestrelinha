import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cn } from '@estrelinha/ui/lib/utils'
import { TAP_44, TAP_ROW } from '../touchTarget'

/**
 * **O auxiliar de toque não pode roubar a posição do controle.**
 *
 * `TAP_44` e `TAP_ROW` começam com `relative`, e precisam começar — sem ele o pseudo-elemento de
 * 44px sobe para o ancestral posicionado mais próximo e o alvo aparece em outro lugar da tela
 * (`touchTarget.test.ts` assere isso de propósito). O problema é o que acontece quando o controle
 * **também** se posiciona, e ele depende da forma como as classes são juntadas:
 *
 * - **`cn(classes, TAP_44)`** — `cn` é `twMerge`, e `relative` e `absolute` disputam o mesmo grupo.
 *   O `absolute` é **apagado da saída**. Foi assim que as duas setas do Banner principal da Home
 *   desceram para o canto de baixo, empilhadas.
 * - **`` `${TAP_44} absolute …` ``** — aqui não há fusão nenhuma: as **duas** classes chegam ao
 *   DOM. Quem decide é a folha de estilo, e nela `.relative` vem **depois** de `.absolute` com a
 *   mesma especificidade — então o `relative` vence e o controle cai no fluxo do mesmo jeito. Foi
 *   assim que o coração e o "+" do `ProductCard` foram parar fora do card, e as cinco setas da
 *   `ProductGallery` junto.
 *
 * A segunda forma é a maioria no repositório, e é a que não tem conserto no ponto de uso: escrever
 * o par ambíguo já é o defeito, porque o call site não controla a ordem da folha de estilo.
 *
 * **Este guarda não confere a ordem no olho: ele CALCULA.** Para `cn()` ele chama o `cn` de
 * verdade e cobra que a classe de posição sobreviva; para o template literal ele cobra que o par
 * ambíguo não seja escrito. Conferir a ordem dos argumentos seria um proxy — e proxy é o que falha
 * quando a forma muda, que é exatamente o que aconteceu aqui.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
/** A raiz do monorepo: `apps/store/src/shared/lib/__tests__` sobe seis. */
const RAIZ = resolve(HERE, '../../../../../..')

/** As classes que disputam o grupo de posição com o `relative` dos auxiliares. */
const POSICOES = ['absolute', 'fixed', 'sticky'] as const

const AUXILIARES: Record<string, string> = { TAP_44, TAP_ROW }

// ───────────────────────────────────────────────────────────────────────────
// As réguas, como predicado — asserção e sensor chamam a MESMA função
// ───────────────────────────────────────────────────────────────────────────

/**
 * Remove comentário de linha e de bloco na MESMA varredura, preservando as quebras.
 *
 * Duas passadas separadas têm ponto cego conhecido (`BL-027`): um glob de dois asteriscos dentro de
 * um comentário de linha abre um bloco que engole o código de baixo. O `[^\n\r]` fecha antes do
 * `\r` para o CRLF do Windows não virar uma linha só.
 *
 * Aqui isso não é zelo: `HomeSectionRow.tsx`, `NavRail.tsx`, `VariantPicker.tsx`,
 * `MaterialSendTrigger.tsx` e `CategoryPage.tsx` **citam os auxiliares em comentário** para
 * explicar por que NÃO os usam. Uma régua que casasse menção acusaria os arquivos que estão certos.
 */
export const semComentarios = (fonte: string): string =>
  fonte.replace(/\/\/[^\n\r]*|\/\*[\s\S]*?\*\//g, (trecho) => trecho.replace(/[^\n\r]/g, ' '))

/** Token exato: `\b` não fecha em hífen, então `absolute` casaria dentro de `absolute-foo`. */
const temToken = (classes: string, token: string): boolean => classes.split(/\s+/).includes(token)

const ehAuxiliar = (parte: string): boolean => Object.values(AUXILIARES).includes(parte)

/** Cada template literal do arquivo que interpola um auxiliar. */
export const templatesComAuxiliar = (fonte: string): { inicio: number; texto: string }[] =>
  [...fonte.matchAll(/`([^`]*)`/g)]
    .filter((m) => /\$\{\s*TAP_(?:44|ROW)\s*\}/.test(m[1]))
    .map((m) => ({ inicio: m.index ?? 0, texto: m[1] }))

/** Cada `cn(` … `)` balanceado do arquivo. */
export const blocosCn = (fonte: string): { inicio: number; texto: string }[] => {
  const blocos: { inicio: number; texto: string }[] = []
  let i = 0

  while ((i = fonte.indexOf('cn(', i)) !== -1) {
    const antes = i === 0 ? '' : fonte[i - 1]
    // `cn(` e não o fim de outro identificador (`fooCn(`).
    if (/[\w$.]/.test(antes)) {
      i += 3
      continue
    }

    let profundidade = 0
    let fim = -1
    for (let j = i + 2; j < fonte.length; j++) {
      if (fonte[j] === '(') profundidade++
      else if (fonte[j] === ')') {
        profundidade--
        if (profundidade === 0) {
          fim = j
          break
        }
      }
    }
    if (fim === -1) break

    blocos.push({ inicio: i, texto: fonte.slice(i, fim + 1) })
    i = fim
  }

  return blocos
}

/**
 * O veredito do **template literal**: o par ambíguo foi escrito?
 *
 * Não há fusão aqui, então as duas classes chegam ao DOM e a folha de estilo desempata. `null`
 * quando está tudo bem; o nome da classe de posição quando o par existe.
 */
export const parAmbiguoNoTemplate = (texto: string): string | null => {
  const nomes = [...texto.matchAll(/\$\{\s*(TAP_(?:44|ROW))\s*\}/g)].map((m) => m[1])
  if (!nomes.some((n) => temToken(AUXILIARES[n], 'relative'))) return null

  // As interpolações viram espaço: só o que o próprio literal escreve conta.
  const literal = texto.replace(/\$\{[^}]*\}/g, ' ')
  return POSICOES.find((p) => temToken(literal, p)) ?? null
}

/**
 * Os argumentos de um `cn()` que dá para avaliar, **na ordem do fonte**: literal de string e o nome
 * de um auxiliar. Tudo o mais (variável, ternário, template) é ignorado — o que sobra basta para a
 * pergunta deste guarda, e ignorar é conservador: some argumento, nunca inventa.
 */
export const literaisNaOrdem = (bloco: string): string[] => {
  const nomes = Object.keys(AUXILIARES).join('|')
  const re = new RegExp(`'([^'\\\\]*)'|"([^"\\\\]*)"|\\b(${nomes})\\b`, 'g')

  return [...bloco.matchAll(re)].map((m) => (m[3] ? AUXILIARES[m[3]] : (m[1] ?? m[2] ?? '')))
}

/**
 * O veredito do **`cn()`**, calculado pela fusão de verdade: `null` quando está tudo bem, e o nome
 * da classe perdida quando o auxiliar apagou a posição do controle.
 */
export const posicaoPerdida = (bloco: string): string | null => {
  const partes = literaisNaOrdem(bloco)
  if (!partes.some(ehAuxiliar)) return null

  const escritas = POSICOES.filter((p) => partes.some((parte) => temToken(parte, p)))
  if (escritas.length === 0) return null

  const fundido = cn(...partes)
  return escritas.find((p) => !temToken(fundido, p)) ?? null
}

/** As duas réguas juntas, sobre um arquivo inteiro. */
export const ofensoresDe = (fonte: string): { linha: number; motivo: string }[] => {
  const linhaDe = (i: number) => fonte.slice(0, i).split('\n').length

  return [
    ...templatesComAuxiliar(fonte).flatMap(({ inicio, texto }) => {
      const pos = parAmbiguoNoTemplate(texto)
      return pos
        ? [{ linha: linhaDe(inicio), motivo: `escreve \`${pos}\` e \`relative\` no mesmo literal` }]
        : []
    }),
    ...blocosCn(fonte).flatMap(({ inicio, texto }) => {
      const pos = posicaoPerdida(texto)
      return pos ? [{ linha: linhaDe(inicio), motivo: `a fusão apaga o \`${pos}\`` }] : []
    }),
  ]
}

// ───────────────────────────────────────────────────────────────────────────
// A varredura
// ───────────────────────────────────────────────────────────────────────────

const IGNORADOS = new Set(['node_modules', 'dist', '.turbo', '__tests__'])

function arquivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name)
    if (e.isDirectory()) return IGNORADOS.has(e.name) ? [] : arquivos(full)
    return e.isFile() && /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [full] : []
  })
}

const ESCOPO = ['apps/store/src', 'apps/backoffice/src', 'packages/ui/src']

const varridos = ESCOPO.flatMap((raiz) =>
  arquivos(join(RAIZ, raiz)).map((caminho) => ({
    rel: relative(RAIZ, caminho).split(/[\\/]/).join('/'),
    fonte: semComentarios(readFileSync(caminho, 'utf8')),
  })),
)

// ───────────────────────────────────────────────────────────────────────────
// As âncoras — sem elas, um caminho errado varre zero e aprova em silêncio
// ───────────────────────────────────────────────────────────────────────────

describe('o alvo de toque não rouba a posição — as âncoras', () => {
  it('a varredura alcança os três pacotes de UI do repositório', () => {
    expect(varridos.length).toBeGreaterThan(400)
    for (const raiz of ESCOPO) {
      expect(
        varridos.some((a) => a.rel.startsWith(raiz)),
        raiz,
      ).toBe(true)
    }
  })

  it('a varredura encontra AS DUAS formas de juntar classe, e não só uma', () => {
    // Âncora no objeto medido, e dupla de propósito: a primeira escrita deste guarda só olhava
    // `cn()` — e 7 dos 9 pontos quebrados eram template literal. Uma régua que perdesse a forma
    // majoritária passaria vazia e pareceria saudável.
    const templates = varridos.flatMap((a) => templatesComAuxiliar(a.fonte))
    const cns = varridos.flatMap((a) => blocosCn(a.fonte).filter((b) => /\bTAP_/.test(b.texto)))

    expect(templates.length).toBeGreaterThan(25)
    expect(cns.length).toBeGreaterThan(5)
  })

  it('os dois auxiliares continuam disputando o grupo de posição', () => {
    // A premissa inteira do guarda. Se um dia `TAP_44` deixar de trazer `relative`, este arquivo
    // vira decoração — e é melhor ele reprovar do que seguir verde sem guardar nada.
    expect(temToken(TAP_44, 'relative')).toBe(true)
    expect(temToken(TAP_ROW, 'relative')).toBe(true)
  })
})

// ───────────────────────────────────────────────────────────────────────────
// Os sensores — a régua reprova mesmo?
// ───────────────────────────────────────────────────────────────────────────

describe('o alvo de toque não rouba a posição — os sensores', () => {
  it('a forma que quebrou as setas da Home REPROVA', () => {
    const bloco = "cn('absolute left-3 top-1/2 -translate-y-1/2 md:flex', TAP_44)"

    expect(posicaoPerdida(bloco)).toBe('absolute')
  })

  it('a forma que quebrou o card e a galeria REPROVA', () => {
    expect(parAmbiguoNoTemplate('${TAP_44} absolute right-3.5 top-3.5 z-10 flex')).toBe('absolute')
  })

  it('as duas formas corretas PASSAM — os sensores inversos', () => {
    expect(posicaoPerdida("cn(TAP_44, 'absolute left-3 top-1/2 -translate-y-1/2 md:flex')")).toBeNull()
    expect(parAmbiguoNoTemplate('${TAP_44} flex h-9 w-9 items-center rounded-full')).toBeNull()
  })

  it('`fixed` e `sticky` também são acusados, não só `absolute`', () => {
    expect(posicaoPerdida("cn('fixed bottom-4 right-4', TAP_44)")).toBe('fixed')
    expect(parAmbiguoNoTemplate('${TAP_ROW} sticky top-0 flex')).toBe('sticky')
  })

  it('controle em fluxo, sem classe de posição, NÃO é acusado', () => {
    // A bolinha do carrossel e o link do rodapé são exatamente isto, e são a maioria dos
    // consumidores. Acusá-los transformaria o guarda em ruído — e guarda ruidoso é guarda que
    // alguém desliga.
    expect(posicaoPerdida("cn('h-2 w-2 rounded-full', TAP_44)")).toBeNull()
    expect(parAmbiguoNoTemplate('${TAP_ROW} text-sm text-estrelinha-ink')).toBeNull()
  })

  it('expressão sem auxiliar nenhum NÃO é acusada', () => {
    // `cn('relative', x && 'absolute')` é decisão de quem escreveu; o escopo deste guarda é o
    // auxiliar de toque, e alargá-lo por conta própria produziria acusação sem regra por trás.
    expect(posicaoPerdida("cn('absolute inset-0', 'relative')")).toBeNull()
    expect(parAmbiguoNoTemplate('${algumaCoisa} absolute inset-0')).toBeNull()
  })

  it('a posição escrita por OUTRA interpolação não é atribuída ao literal', () => {
    // `${TAP_44} flex ${ativo ? 'absolute' : ''}` é ambíguo por outro motivo e tem outro dono. A
    // régua do literal mede o que o literal escreve, senão ela acusa o ternário do vizinho.
    expect(parAmbiguoNoTemplate("${TAP_44} flex ${ativo ? 'absolute' : ''}")).toBeNull()
  })

  it('o removedor apaga menção em comentário — de linha, de bloco, com CRLF e com LF', () => {
    expect(semComentarios("// cn('absolute', TAP_44)\nconst a = 1\n")).not.toContain('TAP_44')
    expect(semComentarios("// cn('absolute', TAP_44)\r\nconst a = 1\r\n")).not.toContain('TAP_44')
    expect(semComentarios("/* cn('absolute', TAP_44)\nem bloco */\nconst a = 1\n")).not.toContain(
      'TAP_44',
    )
  })

  it('o glob de dois asteriscos num comentário de linha não engole o código de baixo', () => {
    // `BL-027`. Sem isto, um arquivo que cite `apps/**` numa linha de comentário some inteiro da
    // varredura — e um guarda de ausência aprova em silêncio.
    const limpo = semComentarios("// varre apps/**/*.tsx\nconst c = cn('absolute', TAP_44)\n")

    expect(limpo).toContain('TAP_44')
    expect(posicaoPerdida(blocosCn(limpo)[0].texto)).toBe('absolute')
  })

  it('a régua de arquivo inteiro acha as duas formas juntas, com a linha certa', () => {
    const fonte = [
      "const a = <button className={`${TAP_44} absolute left-3 flex`} />",
      "const b = <button className={cn('fixed bottom-4', TAP_44)} />",
      "const c = <button className={cn(TAP_44, 'absolute right-3')} />",
    ].join('\n')

    expect(ofensoresDe(fonte)).toEqual([
      { linha: 1, motivo: 'escreve `absolute` e `relative` no mesmo literal' },
      { linha: 2, motivo: 'a fusão apaga o `fixed`' },
    ])
  })
})

// ───────────────────────────────────────────────────────────────────────────
// A regra
// ───────────────────────────────────────────────────────────────────────────

describe('o alvo de toque não rouba a posição', () => {
  it('nenhum controle da loja, do painel ou do `ui` perde a posição para o auxiliar', () => {
    const ofensores = varridos.flatMap(({ rel, fonte }) =>
      ofensoresDe(fonte).map(({ linha, motivo }) => `${rel}:${linha} ${motivo}`),
    )

    expect(ofensores).toEqual([])
  })
})
