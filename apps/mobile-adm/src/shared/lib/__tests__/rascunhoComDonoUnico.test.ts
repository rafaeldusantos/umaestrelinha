import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * A chave do rascunho da montagem de um pedido tem **um** dono,
 * `features/order-proposal/model/rascunho.ts`.
 *
 * Molde de `apps/store/src/shared/lib/__tests__/visitanteComDonoUnico.test.ts`, com o escopo nos TRÊS
 * apps e TESTES INCLUSOS: um teste que escrevesse a chave por extenso seguiria verde no dia em que o
 * dono a trocasse — e mediria uma chave que o app já não lê. Os testes **importam** `RASCUNHO_KEY`.
 *
 * Uma segunda leitura à mão (a chave com um caractere trocado, outro armazenamento, um objeto gravado
 * com mais campos) seria um segundo dono do que fica no aparelho — e é por ele que dado da cliente
 * entraria, sem nada quebrar: o dono é o único lugar que monta e filtra a forma gravada.
 *
 * **Allowlist de UM além do dono: este arquivo**, que precisa carregar a forma proibida nos sensores.
 * O caso `um teste irmão SERIA acusado` prova que a exceção não vale para outro teste.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** Escrito literalmente: a régua não pode ser o objeto que ela mede. */
const ESCOPO = ['apps/store/src', 'apps/backoffice/src', 'apps/mobile-adm/src']

const CHAVE = 'estrelinha-montagem-rascunho'
const DONO = 'apps/mobile-adm/src/features/order-proposal/model/rascunho.ts'
const ESTE = 'apps/mobile-adm/src/shared/lib/__tests__/rascunhoComDonoUnico.test.ts'

/** Linha e bloco na MESMA varredura, com `[^\n\r]` fechando antes do `\r` (`BL-027`). */
const semComentario = (fonte: string): string => fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

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

/** Cita a chave em CÓDIGO (comentário não conta). */
const citaAChave = (fonte: string): boolean => semComentario(fonte).includes(CHAVE)

const citadores = (lista: Arquivo[]): string[] => lista.filter((a) => a.nome !== ESTE && citaAChave(a.fonte)).map((a) => a.nome)

const fonteDe = (nome: string): string => {
  const a = arquivos.find((x) => x.nome === nome)
  if (!a) throw new Error(`arquivo fora da varredura: ${nome}`)
  return a.fonte
}

/** Os testes que montam ou conferem o rascunho. */
const TESTES_DO_RASCUNHO = [
  'apps/mobile-adm/src/pages/__tests__/montarPedido.rascunho.test.tsx',
  'apps/mobile-adm/src/app/__tests__/trocaDeContaLimpaCache.test.tsx',
  'apps/mobile-adm/src/features/order-proposal/model/__tests__/rascunhoSemDadoDaCliente.test.ts',
]

describe('a chave do rascunho da montagem tem um dono só', () => {
  it('a varredura leu os três apps, TESTES INCLUSOS — âncora', () => {
    const nomes = arquivos.map((a) => a.nome)
    expect(arquivos.length).toBeGreaterThanOrEqual(1500)
    // Um arquivo de cada app (`L-035`).
    expect(nomes).toContain('apps/store/src/app/App.tsx')
    expect(nomes).toContain('apps/backoffice/src/app/App.tsx')
    expect(nomes).toContain('apps/mobile-adm/src/app/App.tsx')
    expect(nomes).toContain(DONO)
    for (const t of TESTES_DO_RASCUNHO) expect(nomes).toContain(t)
    expect(nomes).toContain(ESTE)
  })

  it('o dono declara a chave, em código', () => {
    expect(semComentario(fonteDe(DONO))).toContain(`'${CHAVE}'`)
  })

  it('só o dono cita a chave', () => {
    expect(citadores(arquivos)).toEqual([DONO])
  })

  it('os testes do rascunho IMPORTAM a chave do dono', () => {
    for (const teste of TESTES_DO_RASCUNHO) {
      expect(semComentario(fonteDe(teste))).toMatch(
        /import\s*\{[^}]*\bRASCUNHO_KEY\b[^}]*\}\s*from\s*['"](?:@\/features\/order-proposal\/model|\.\.)\/rascunho['"]/,
      )
    }
  })

  describe('sensores', () => {
    it('um teste irmão com a chave escrita por extenso SERIA acusado', () => {
      const irmao: Arquivo = {
        nome: 'apps/mobile-adm/src/shared/lib/__tests__/outroGuarda.test.ts',
        fonte: `localStorage.getItem('${CHAVE}')`,
      }
      expect(citadores([...arquivos, irmao])).toEqual([DONO, irmao.nome])
    })

    it('a chave é acusada em qualquer app, e em qualquer forma de aspas', () => {
      const loja: Arquivo = { nome: 'apps/store/src/widgets/x/ui/X.tsx', fonte: `const k = "${CHAVE}"` }
      const painel: Arquivo = { nome: 'apps/backoffice/src/x.ts', fonte: 'const k = `' + CHAVE + '`' }
      expect(citadores([loja, painel])).toEqual([loja.nome, painel.nome])
    })

    it('a prosa em comentário NÃO é acusada — com LF e com CRLF', () => {
      expect(citaAChave(`// a chave é ${CHAVE}\nconst x = 1`)).toBe(false)
      expect(citaAChave(`// a chave é ${CHAVE}\r\nconst x = 1`)).toBe(false)
      expect(citaAChave(`/* ${CHAVE} */\r\nconst x = 1`)).toBe(false)
    })

    it('um glob de dois asteriscos num comentário de linha não cega a régua (BL-027)', () => {
      expect(citaAChave(`// varre apps/**\nconst k = '${CHAVE}'\n/* um bloco qualquer */\nconst y = 2`)).toBe(true)
    })
  })
})
