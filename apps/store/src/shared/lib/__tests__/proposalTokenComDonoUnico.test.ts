import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * `SEG-02` (feature `89`, T23) — a chave do token do link do pedido montado tem **um** dono,
 * `features/proposal-checkout/model/proposalToken.ts`.
 *
 * Molde de `visitanteComDonoUnico.test.ts`, com testes no escopo: o token é a única credencial do
 * link, e uma segunda leitura à mão (em `localStorage` no lugar de `sessionStorage`, ou sem apagar o
 * fragmento) faria o link durar mais que a aba — ou deixaria o token na barra — sem nada quebrar.
 * Os testes **importam** `PROPOSAL_TOKEN_KEY`.
 *
 * Allowlist de UM além do dono: este arquivo, que carrega a forma proibida nos sensores.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** Escrito literalmente: a régua não pode ser o objeto que ela mede. */
const ESCOPO = ['apps/store/src', 'apps/backoffice/src', 'apps/mobile-adm/src']

const CHAVE = 'estrelinha-proposal-token'
const DONO = 'apps/store/src/features/proposal-checkout/model/proposalToken.ts'
const ESTE = 'apps/store/src/shared/lib/__tests__/proposalTokenComDonoUnico.test.ts'

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

const citadores = (lista: Arquivo[]): string[] =>
  lista.filter((a) => a.nome !== ESTE && semComentario(a.fonte).includes(CHAVE)).map((a) => a.nome)

const fonteDe = (nome: string): string => {
  const a = arquivos.find((x) => x.nome === nome)
  if (!a) throw new Error(`arquivo fora da varredura: ${nome}`)
  return a.fonte
}

describe('SEG-02 — a chave do token do link tem um dono só', () => {
  it('a varredura leu os três apps, testes inclusos — âncora', () => {
    const nomes = arquivos.map((a) => a.nome)
    expect(arquivos.length).toBeGreaterThanOrEqual(1500)
    expect(nomes).toContain('apps/store/src/app/App.tsx')
    expect(nomes).toContain('apps/backoffice/src/app/App.tsx')
    expect(nomes).toContain('apps/mobile-adm/src/app/App.tsx')
    expect(nomes).toContain(DONO)
    expect(nomes).toContain(ESTE)
  })

  it('o dono declara a chave, em código, e guarda em sessionStorage', () => {
    const codigo = semComentario(fonteDe(DONO))
    expect(codigo).toContain(`'${CHAVE}'`)
    expect(codigo).toContain('sessionStorage.setItem(PROPOSAL_TOKEN_KEY')
    expect(codigo).not.toContain('localStorage')
    expect(codigo).toContain('history.replaceState(')
  })

  it('só o dono cita a chave', () => {
    expect(citadores(arquivos)).toEqual([DONO])
  })

  it('o teste do dono IMPORTA a constante', () => {
    expect(
      semComentario(fonteDe('apps/store/src/features/proposal-checkout/model/__tests__/proposalToken.test.tsx')),
    ).toMatch(/import\s*\{[^}]*\bPROPOSAL_TOKEN_KEY\b[^}]*\}\s*from\s*['"]\.\.\/proposalToken['"]/)
  })

  describe('sensores', () => {
    it('um teste irmão com a chave por extenso SERIA acusado', () => {
      const irmao = { nome: 'apps/store/src/pages/__tests__/X.test.tsx', fonte: `sessionStorage.getItem('${CHAVE}')` }
      expect(citadores([...arquivos, irmao])).toEqual([DONO, irmao.nome])
    })

    it('a chave citada só em comentário NÃO é acusada (CRLF e LF)', () => {
      const crlf = { nome: 'a.ts', fonte: `// fala de ${CHAVE}\r\nconst x = 1\r\n` }
      const bloco = { nome: 'b.ts', fonte: `/* ${CHAVE} */\nconst y = 2\n` }
      expect(citadores([crlf, bloco])).toEqual([])
    })

    it('um glob de dois asteriscos em comentário não cega o resto do arquivo (BL-027)', () => {
      const glob = { nome: 'c.ts', fonte: `// apps/**\nconst k = '${CHAVE}'\n/* fim */\n` }
      expect(citadores([glob])).toEqual(['c.ts'])
    })
  })
})
