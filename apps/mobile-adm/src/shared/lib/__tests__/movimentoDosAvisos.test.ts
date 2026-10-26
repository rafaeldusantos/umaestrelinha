// Feature `79` · T24 — `MAN-41`: com o sistema pedindo menos movimento, a tela "Avisos neste celular"
// e o menu da conta não se movem. Molde e régua: `movimentoDeClientes.test.ts` (`76`), com a régua
// estreita de lá — o par só conta quando ELE MESMO desliga movimento (`motion-reduce:transition-none`,
// `motion-reduce:animate-none`).
//
// Por que um guarda de fonte: jsdom não aplica CSS, então o par `motion-reduce:` é invisível a qualquer
// `render`.
//
// **Escopo LITERAL**: a página, o menu da conta (que ganhou a pergunta do "Sair") e `shared/ui/leitura.tsx`,
// de onde vem o `Traco` do esqueleto de `verificando`. Âncora de tokens e de pares MEDIDA com a própria
// régua no fecho da T24: o `transition-colors` do trilho e o `transition-transform` do polegar do
// interruptor, e o `animate-pulse` do esqueleto — os três com o par.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

const ARQUIVOS = ['pages/AvisosPage.tsx', 'widgets/account-menu/ui/AccountMenu.tsx', 'shared/ui/leitura.tsx'] as const

/** Comentário sai antes da varredura; CRLF primeiro (`L-031`), linha e bloco na MESMA passada (`BL-027`). */
const semComentarios = (texto: string): string => texto.replace(/\r\n?/g, '\n').replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')

/**
 * O token de movimento, com os variantes à frente, por token exato. Um variante é `nome:` ou
 * `nome-[…]:` (o de estado do Radix, `data-[state=open]:` — feature `75`).
 */
const CLASSE_QUE_MOVE = /(?<![-\w:\]])((?:[a-z][a-z0-9-]*(?:\[[^\]\s]*\])?:)*)(transition|animate)(?:-([a-z0-9]+(?:-[a-z0-9]+)*))?(?![-\w])/g
/** O variante de estado do movimento (`data-[state=open]:`), ou `''`. */
const estadoDe = (prefixo: string): string => /data-\[state=[a-z]+\]:/.exec(prefixo)?.[0] ?? ''

/** `animate-spin` é indicador de progresso, não enfeite: congelá-lo apagaria o único sinal de espera. */
const DISPENSADAS = ['transition-none', 'animate-none', 'animate-spin'] as const
/** O par que DESLIGA movimento — `motion-reduce:opacity-100` não desliga nada. */
const PARES = ['transition-none', 'animate-none'] as const

interface Achado {
  classe: string
  numero: number
  ehOPar: boolean
  /** O variante de estado (`data-[state=open]:`), ou `''`. */
  estado: string
}

const movimentoDe = (codigo: string): Achado[] =>
  codigo.split('\n').flatMap((linha, i) =>
    [...linha.matchAll(CLASSE_QUE_MOVE)].map((m) => {
      const classe = m[3] ? `${m[2]}-${m[3]}` : m[2]
      return {
        classe,
        numero: i + 1,
        ehOPar: (m[1] ?? '').includes('motion-reduce:') && PARES.includes(classe as (typeof PARES)[number]),
        estado: estadoDe(m[1] ?? ''),
      }
    }),
  )

const movimentoSemPar = (fonte: string): string[] => {
  const achados = movimentoDe(semComentarios(fonte))
  // Um par cobre a linha dele; o movimento sob `data-[state=X]:` só é coberto pelo par do MESMO estado.
  const pares = achados.filter((a) => a.ehOPar)
  const coberto = (a: Achado) => pares.some((p) => p.numero === a.numero && (a.estado === '' || p.estado === a.estado))
  return achados
    .filter((a) => !a.ehOPar)
    .filter((a) => !DISPENSADAS.includes(a.classe as (typeof DISPENSADAS)[number]))
    .filter((a) => !coberto(a))
    .map((a) => `${a.estado}${a.classe} (linha ${a.numero})`)
}

const FONTES = ARQUIVOS.map((caminho) => ({ caminho, fonte: readFileSync(resolve(SRC, caminho), 'utf8') }))

describe('o movimento da tela de avisos respeita `prefers-reduced-motion` (MAN-41)', () => {
  it('ÂNCORA: os 3 arquivos foram lidos, e a varredura achou o movimento do interruptor e do esqueleto com os pares', () => {
    expect(FONTES).toHaveLength(3)
    expect(FONTES.every((f) => f.fonte.length > 0)).toBe(true)
    const tokens = FONTES.flatMap((f) => movimentoDe(semComentarios(f.fonte)))
    const de = (rel: string) => movimentoDe(semComentarios(FONTES.find((f) => f.caminho === rel)!.fonte)).map((t) => t.classe)
    expect(tokens).toHaveLength(6)
    expect(tokens.filter((t) => t.ehOPar)).toHaveLength(3)
    expect(de('pages/AvisosPage.tsx')).toEqual(['transition-colors', 'transition-none', 'transition-transform', 'transition-none'])
    expect(de('shared/ui/leitura.tsx')).toEqual(['animate-pulse', 'animate-none'])
    expect(de('widgets/account-menu/ui/AccountMenu.tsx')).toEqual([])
  })

  it('nenhum arquivo em escopo declara movimento sem o par `motion-reduce:` na mesma linha', () => {
    const culpados = FONTES.flatMap((f) => movimentoSemPar(f.fonte).map((c) => `${f.caminho}: ${c}`))
    expect(culpados).toEqual([])
  })

  it('SENSOR: a classe sem par REPROVA, e a mesma COM par passa', () => {
    expect(movimentoSemPar('className="animate-pulse"')).toEqual(['animate-pulse (linha 1)'])
    expect(movimentoSemPar('className="animate-pulse motion-reduce:animate-none"')).toEqual([])
    expect(movimentoSemPar('className="transition-colors"')).toEqual(['transition-colors (linha 1)'])
    expect(movimentoSemPar('className="transition-opacity"')).toEqual(['transition-opacity (linha 1)'])
  })

  it('SENSOR: o par a três linhas de distância NÃO cobre, e variante na frente não desculpa', () => {
    expect(movimentoSemPar('<a className="transition-colors" />\n\n\n<b className="motion-reduce:transition-none" />')).toEqual([
      'transition-colors (linha 1)',
    ])
    expect(movimentoSemPar('className="hover:transition-colors"')).toEqual(['transition-colors (linha 1)'])
  })

  it('SENSOR: `motion-reduce:` que não desliga movimento NÃO é par', () => {
    expect(movimentoSemPar('className="transition-opacity motion-reduce:opacity-100"')).toEqual(['transition-opacity (linha 1)'])
  })

  it('SENSOR: token exato — `animate-spin` é dispensado, `animate-spinner` não', () => {
    expect(movimentoSemPar('className="animate-spin"')).toEqual([])
    expect(movimentoSemPar('className="animate-spinner"')).toEqual(['animate-spinner (linha 1)'])
  })

  it('SENSOR: a prosa não é acusada — com CRLF, com LF e com o glob de dois asteriscos', () => {
    expect(movimentoSemPar('// transition-colors precisa de par\r\nconst x = 1')).toEqual([])
    expect(movimentoSemPar('/* animate-pulse */\nconst x = 1')).toEqual([])
    expect(movimentoSemPar('// varre apps/**\nclassName="transition-colors"\n/* fim */')).toEqual(['transition-colors (linha 2)'])
  })

  it('a UI da feature 79 não ficou de fora do escopo: toda `.tsx` da pasta de avisos está na lista (hoje, nenhuma)', () => {
    const daPasta = ['features/push-notifications/ui']
      .filter((p) => existsSync(resolve(SRC, p)))
      .flatMap((p) => readdirSync(resolve(SRC, p)).filter((n) => n.endsWith('.tsx')).map((n) => `${p}/${n}`))
    expect(daPasta.filter((rel) => !(ARQUIVOS as readonly string[]).includes(rel))).toEqual([])
  })
})
