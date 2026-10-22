import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { OPT_OUT_PARAM } from '@estrelinha/core/visits'

/**
 * `VIS-42`/`VIS-43` (feature `71`) — o parâmetro que tira um navegador da contagem de visitas tem
 * **um** dono, `packages/core/src/visits/optOut.ts`: a loja o LÊ (`readOptOutParam`, no
 * `VisitCounter`) e o painel ESCREVE o link (`optOutHref`, no menu da conta).
 *
 * São dois apps que não se importam. Uma grafia à mão de um lado — um acento, um hífen a mais, um
 * `=true` no lugar de `=1` — produziria um link que a loja não reconhece, e a dona seguiria contada
 * achando que não é, **sem nada quebrar**.
 *
 * A régua procura o NOME do parâmetro como token (o caractere vizinho não pode ser letra, dígito nem
 * hífen). É isso que deixa passar a chave do armazenamento, que termina com o mesmo nome depois de
 * um hífen e tem dono próprio (`visitanteComDonoUnico.test.ts`).
 *
 * Testes ENTRAM na varredura. **Allowlist de três, escrita literalmente**: o dono; o teste do dono,
 * que precisa do literal para provar o contrato (derivá-lo da constante seria a régua medindo a si
 * mesma); e este guarda, que carrega as formas proibidas nos sensores.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** Escrito literalmente: a régua não pode ser o objeto que ela mede. */
const ESCOPO = [
  'apps/store/src',
  'apps/backoffice/src',
  'packages/core/src',
  'packages/supabase/src',
  'packages/ui/src',
  'packages/auth/src',
]

const DONO = 'packages/core/src/visits/optOut.ts'
const TESTE_DO_DONO = 'packages/core/src/visits/__tests__/optOut.test.ts'
const ESTE = 'apps/store/src/shared/lib/__tests__/parametroNaoContarComDonoUnico.test.ts'
const PERMITIDOS = [DONO, TESTE_DO_DONO, ESTE]

const CONTADOR = 'apps/store/src/app/VisitCounter.tsx'
const MENU = 'apps/backoffice/src/widgets/admin-layout/ui/AccountMenu.tsx'

/** O nome, montado em pedaços para este arquivo não ser o objeto da própria busca no disco. */
const NOME = ['nao', 'contar'].join('-')

/** Linha e bloco na MESMA varredura, com `[^\n\r]` fechando antes do `\r` (`BL-027`). */
const semComentario = (fonte: string): string =>
  fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

/** O nome como token: nem letra, nem dígito, nem hífen dos dois lados (`L-034`). */
const TOKEN = new RegExp(`(?<![\\w-])${NOME}(?![\\w-])`)

const citaOParametro = (fonte: string): boolean => TOKEN.test(semComentario(fonte))

type Arquivo = { nome: string; fonte: string }

const arquivos: Arquivo[] = ESCOPO.flatMap((relativo) => {
  const saida: Arquivo[] = []
  const andar = (dir: string) => {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const caminho = join(dir, entrada.name)
      if (entrada.isDirectory()) {
        if (entrada.name === 'node_modules' || entrada.name === 'dist') continue
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
  lista.filter((a) => !PERMITIDOS.includes(a.nome) && citaOParametro(a.fonte)).map((a) => a.nome)

const fonteDe = (nome: string): string => {
  const a = arquivos.find((x) => x.nome === nome)
  if (!a) throw new Error(`arquivo fora da varredura: ${nome}`)
  return a.fonte
}

/** `nome(` em código — chamada, não menção nem import. */
const chama = (fonte: string, nome: string): boolean =>
  new RegExp(`(?<![\\w.])${nome}\\(`).test(semComentario(fonte).replace(/import[\s\S]*?from\s*['"][^'"]+['"]/g, ''))

describe('VIS-42 — o parâmetro de "não contar" tem um dono só', () => {
  it('a varredura leu os dois apps e os pacotes, testes inclusos — âncora', () => {
    const nomes = arquivos.map((a) => a.nome)
    expect(arquivos.length).toBeGreaterThanOrEqual(1200)
    // Um arquivo de cada app e de `core` (`L-035`).
    expect(nomes).toContain('apps/store/src/app/App.tsx')
    expect(nomes).toContain('apps/backoffice/src/app/App.tsx')
    expect(nomes).toContain(DONO)
    expect(nomes).toContain(TESTE_DO_DONO)
    expect(nomes).toContain(CONTADOR)
    expect(nomes).toContain(MENU)
  })

  it('o dono declara o nome, em código, e é o mesmo que a constante exportada', () => {
    expect(semComentario(fonteDe(DONO))).toContain(`OPT_OUT_PARAM = '${NOME}'`)
    expect(OPT_OUT_PARAM).toBe(NOME)
  })

  it('fora do dono (e do teste dele), NINGUÉM escreve o nome do parâmetro', () => {
    expect(citadores(arquivos)).toEqual([])
  })

  describe('metade positiva — os dois consumidores chamam o dono', () => {
    it('a loja lê o parâmetro por `readOptOutParam`', () => {
      expect(chama(fonteDe(CONTADOR), 'readOptOutParam')).toBe(true)
    })

    it('o painel monta o link por `optOutHref`', () => {
      expect(chama(fonteDe(MENU), 'optOutHref')).toBe(true)
    })
  })

  describe('sensores', () => {
    it('as três formas do literal SERIAM acusadas, em qualquer app', () => {
      const formas: Arquivo[] = [
        { nome: 'apps/store/src/x/A.tsx', fonte: `params.get('${NOME}')` },
        { nome: 'apps/backoffice/src/x/B.tsx', fonte: `const href = origem + '/?${NOME}=1'` },
        { nome: 'packages/core/src/x/c.ts', fonte: 'const q = `' + `${NOME}=` + '${valor}`' },
        { nome: 'apps/store/src/x/D.test.tsx', fonte: `render(<App initialEntries={['/?${NOME}=1']} />)` },
      ]
      expect(citadores(formas)).toEqual(formas.map((f) => f.nome))
    })

    it('a chave do ARMAZENAMENTO, que termina com o mesmo nome depois de um hífen, NÃO é acusada', () => {
      const chave: Arquivo = { nome: 'apps/store/src/x/E.ts', fonte: `localStorage.getItem('estrelinha-${NOME}')` }
      expect(citadores([chave])).toEqual([])
      // E o dono da chave, no disco, também não — é ele que a escreve.
      expect(citaOParametro(fonteDe('apps/store/src/shared/lib/visits/visitor.ts'))).toBe(false)
    })

    it('a prosa em comentário NÃO é acusada — com LF e com CRLF', () => {
      expect(citaOParametro(`// abre a loja com ?${NOME}=1\nconst x = 1`)).toBe(false)
      expect(citaOParametro(`// abre a loja com ?${NOME}=1\r\nconst x = 1`)).toBe(false)
      expect(citaOParametro(`/* ${NOME} */\r\nconst x = 1`)).toBe(false)
    })

    it('um glob de dois asteriscos num comentário de linha não cega a régua (BL-027)', () => {
      expect(citaOParametro(`// varre apps/**\nconst k = '${NOME}'\n/* outro bloco */\nconst y = 2`)).toBe(true)
    })

    it('um teste fora da allowlist SERIA acusado — a exceção vale só para o teste do dono', () => {
      const irmao: Arquivo = { nome: 'packages/core/src/visits/__tests__/outro.test.ts', fonte: `expect(x).toBe('${NOME}')` }
      expect(citadores([irmao])).toEqual([irmao.nome])
    })

    it('a metade positiva distingue CHAMAR de IMPORTAR ou citar', () => {
      expect(chama(`import { optOutHref } from '@estrelinha/core/visits'\nconst x = 1`, 'optOutHref')).toBe(false)
      expect(chama(`// optOutHref(origem, true)\nconst x = 1`, 'optOutHref')).toBe(false)
      expect(chama(`const href = optOutHref(origem, true)`, 'optOutHref')).toBe(true)
    })
  })
})
