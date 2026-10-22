import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * `VIS-22` (feature `71`) — o contador de visitas NÃO depende do GA4.
 *
 * A decisão de contar não pode ler o interruptor da medição, o ID de medição nem a resposta do GA4
 * sobre "posso medir?". Desligar o GA4 no painel zeraria as visitas, e o usuário escolheu um
 * contador independente. Nada quebraria: o contador simplesmente pararia de contar junto.
 *
 * A régua lê o CÓDIGO (comentário removido) dos arquivos de produção do contador — o segmento
 * `shared/lib/visits` e o componente que o monta, `app/VisitCounter.tsx`. Os testes ficam fora do
 * escopo: a fixture obrigatória da spec (`VIS-22`) liga o GA4 DESLIGADO de propósito, e precisa
 * escrever os nomes.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** Escritos literalmente: a régua não pode ser o objeto que ela mede. */
const PASTA = 'apps/store/src/shared/lib/visits'
const MONTADOR = 'apps/store/src/app/VisitCounter.tsx'
const ANALYTICS = 'apps/store/src/shared/lib/analytics/index.ts'

/** Os três nomes do GA4 que a decisão de contar não pode ler. */
const PROIBIDOS = /\b(?:enabled|measurement_id|canMeasure)\b/

/** Linha e bloco na MESMA varredura, com `[^\n\r]` fechando antes do `\r` (`BL-027`). */
const semComentario = (fonte: string): string =>
  fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

type Arquivo = { nome: string; fonte: string }

const ler = (relativo: string): Arquivo => ({
  nome: relativo,
  fonte: readFileSync(resolve(ROOT, relativo), 'utf8'),
})

const daPasta = (relativo: string): Arquivo[] => {
  const saida: Arquivo[] = []
  const andar = (dir: string) => {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const caminho = join(dir, entrada.name)
      if (entrada.isDirectory()) {
        if (entrada.name === '__tests__' || entrada.name === 'node_modules') continue
        andar(caminho)
        continue
      }
      if (!/\.[cm]?[jt]sx?$/.test(entrada.name) || /\.test\.[jt]sx?$/.test(entrada.name)) continue
      saida.push(ler(join(relativo, caminho.slice(dir.length + 1)).replace(/\\/g, '/')))
    }
  }
  andar(resolve(ROOT, relativo))
  return saida
}

const arquivos: Arquivo[] = [...daPasta(PASTA), ler(MONTADOR)]

/** Cita algum dos três nomes em CÓDIGO. */
const leOGa = (fonte: string): boolean => PROIBIDOS.test(semComentario(fonte))

const acusados = (lista: Arquivo[]): string[] => lista.filter((a) => leOGa(a.fonte)).map((a) => a.nome)

describe('VIS-22 — o contador não lê o GA4', () => {
  it('a varredura leu o segmento do contador e o montador — âncora', () => {
    const nomes = arquivos.map((a) => a.nome)
    expect(nomes).toEqual(
      expect.arrayContaining([
        `${PASTA}/refusal.ts`,
        `${PASTA}/visitor.ts`,
        `${PASTA}/send.ts`,
        MONTADOR,
      ]),
    )
    // A decisão existe, e é ela que o montador chama.
    expect(semComentario(arquivos.find((a) => a.nome === `${PASTA}/refusal.ts`)!.fonte)).toMatch(
      /export function visitRefusal\(/,
    )
    expect(semComentario(arquivos.find((a) => a.nome === MONTADOR)!.fonte)).toMatch(/visitRefusal\(/)
  })

  it('nenhum arquivo do contador lê o interruptor, o ID de medição ou canMeasure', () => {
    expect(acusados(arquivos)).toEqual([])
  })

  describe('sensores', () => {
    it('o módulo de medição do GA4 SERIA acusado pela mesma régua', () => {
      expect(acusados([ler(ANALYTICS)])).toEqual([ANALYTICS])
    })

    it('cada um dos três nomes, sozinho, é acusado', () => {
      expect(leOGa('if (settings.enabled) contar()')).toBe(true)
      expect(leOGa("const id = s['measurement_id']")).toBe(true)
      expect(leOGa('if (!canMeasure()) return')).toBe(true)
    })

    it('a prosa em comentário NÃO é acusada — com LF e com CRLF', () => {
      expect(leOGa('// não lê enabled nem canMeasure\nconst x = 1')).toBe(false)
      expect(leOGa('// não lê measurement_id\r\nconst x = 1')).toBe(false)
      expect(leOGa('/* enabled */\r\nconst x = 1')).toBe(false)
    })

    it('um glob de dois asteriscos num comentário de linha não cega a régua (BL-027)', () => {
      expect(leOGa('// varre apps/**\nconst ok = s.enabled\n/* bloco */\nconst y = 2')).toBe(true)
    })

    it('nome parecido não é acusado (token exato)', () => {
      expect(leOGa('const isEnabledFoo = 1; const measurement_idx = 2; canMeasureX()')).toBe(false)
    })
  })
})
