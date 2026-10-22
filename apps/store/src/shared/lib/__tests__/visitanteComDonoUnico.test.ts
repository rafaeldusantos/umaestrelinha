import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * `VIS-12` (feature `71`) — as duas chaves de armazenamento do contador de visitas têm **um** dono,
 * `shared/lib/visits/visitor.ts`.
 *
 * Molde de `orderAccessSingleOwner.test.ts`, com o escopo AMPLIADO a testes: um teste que escreve a
 * chave por extenso para montar o marcador seguiria verde no dia em que o dono a trocasse — e
 * mediria uma chave que a loja já não lê. Os testes **importam** `VISITOR_KEY` e `OPT_OUT_KEY`.
 *
 * Uma segunda leitura à mão (um caractere trocado, `sessionStorage` no lugar de `localStorage`, um
 * `JSON.parse` sem `try`) faria cada página contar como uma visita nova **sem nada quebrar**.
 *
 * **Allowlist de UM além do dono: este arquivo**, que precisa carregar as formas proibidas nos
 * sensores. O caso `um teste irmão SERIA acusado` prova que a exceção não vale para outro teste.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** Escrito literalmente: a régua não pode ser o objeto que ela mede. */
const ESCOPO = ['apps/store/src', 'apps/backoffice/src']

const CHAVES = ['estrelinha-visitor', 'estrelinha-nao-contar']
const DONO = 'apps/store/src/shared/lib/visits/visitor.ts'
const ESTE = 'apps/store/src/shared/lib/__tests__/visitanteComDonoUnico.test.ts'

/** Linha e bloco na MESMA varredura, com `[^\n\r]` fechando antes do `\r` (`BL-027`). */
const semComentario = (fonte: string): string =>
  fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

type Arquivo = { nome: string; fonte: string }

const arquivos: Arquivo[] = ESCOPO.flatMap((relativo) => {
  const saida: Arquivo[] = []
  const andar = (dir: string) => {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const caminho = join(dir, entrada.name)
      if (entrada.isDirectory()) {
        if (entrada.name === 'node_modules') continue
        andar(caminho)
        continue
      }
      if (!/\.[cm]?[jt]sx?$/.test(entrada.name)) continue
      saida.push({
        nome: caminho.replace(/\\/g, '/').slice(ROOT.replace(/\\/g, '/').length + 1),
        fonte: readFileSync(caminho, 'utf8'),
      })
    }
  }
  andar(resolve(ROOT, relativo))
  return saida
})

/** Cita alguma das duas chaves em CÓDIGO (comentário não conta). */
const citaAChave = (fonte: string): boolean => {
  const codigo = semComentario(fonte)
  return CHAVES.some((c) => codigo.includes(c))
}

const citadores = (lista: Arquivo[]): string[] =>
  lista.filter((a) => a.nome !== ESTE && citaAChave(a.fonte)).map((a) => a.nome)

const fonteDe = (nome: string): string => {
  const a = arquivos.find((x) => x.nome === nome)
  if (!a) throw new Error(`arquivo fora da varredura: ${nome}`)
  return a.fonte
}

describe('VIS-12 — as chaves do contador têm um dono só', () => {
  it('a varredura leu os dois apps, TESTES INCLUSOS — âncora', () => {
    const nomes = arquivos.map((a) => a.nome)
    expect(arquivos.length).toBeGreaterThanOrEqual(900)
    // Um arquivo de cada app (`L-035`).
    expect(nomes).toContain('apps/store/src/app/App.tsx')
    expect(nomes).toContain('apps/backoffice/src/app/App.tsx')
    // Os testes entram: sem eles a régua não alcançaria a forma que ela mais existe para recusar.
    expect(nomes).toContain('apps/store/src/shared/lib/visits/__tests__/visitor.test.ts')
    expect(nomes).toContain(ESTE)
  })

  it('o dono declara as duas chaves, em código', () => {
    const codigo = semComentario(fonteDe(DONO))
    for (const chave of CHAVES) expect(codigo).toContain(`'${chave}'`)
  })

  it('só o dono cita as chaves', () => {
    expect(citadores(arquivos)).toEqual([DONO])
  })

  it('os testes do contador IMPORTAM as constantes do dono', () => {
    for (const teste of [
      'apps/store/src/shared/lib/visits/__tests__/visitor.test.ts',
      'apps/store/src/shared/lib/visits/__tests__/marker.test.ts',
    ]) {
      expect(semComentario(fonteDe(teste))).toMatch(
        /import\s*\{[^}]*\bVISITOR_KEY\b[^}]*\}\s*from\s*['"]\.\.\/visitor['"]/,
      )
    }
  })

  describe('sensores', () => {
    it('um teste irmão com a chave escrita por extenso SERIA acusado', () => {
      const irmao: Arquivo = {
        nome: 'apps/store/src/shared/lib/__tests__/outroGuarda.test.ts',
        fonte: `localStorage.setItem('${CHAVES[0]}', '{}')`,
      }
      expect(citadores([...arquivos, irmao])).toEqual([DONO, irmao.nome])
    })

    it('a segunda chave também é acusada, em qualquer app', () => {
      const painel: Arquivo = {
        nome: 'apps/backoffice/src/widgets/x/ui/X.tsx',
        fonte: `const k = "${CHAVES[1]}"`,
      }
      expect(citadores([painel])).toEqual([painel.nome])
    })

    it('a prosa em comentário NÃO é acusada — com LF e com CRLF', () => {
      expect(citaAChave(`// a chave é ${CHAVES[0]}\nconst x = 1`)).toBe(false)
      expect(citaAChave(`// a chave é ${CHAVES[0]}\r\nconst x = 1`)).toBe(false)
      expect(citaAChave(`/* ${CHAVES[1]} */\r\nconst x = 1`)).toBe(false)
    })

    it('um glob de dois asteriscos num comentário de linha não cega a régua (BL-027)', () => {
      const fonte = `// varre apps/**\nconst k = '${CHAVES[0]}'\n/* um bloco qualquer */\nconst y = 2`
      expect(citaAChave(fonte)).toBe(true)
    })
  })
})
