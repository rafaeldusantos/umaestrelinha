import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * `VIS-12` (feature `71`) — "o id SHALL NOT ir em nenhuma outra requisição". Conserto P1 da
 * verificação r1: até aqui isso era verdade só por leitura do código.
 *
 * O id do navegador sai do armazenamento por `ensureVisitorId` (ou `readMarker`) e entra na rede por
 * `postVisit`. Quem junta os dois é UM arquivo, `app/VisitCounter.tsx`. Um segundo consumidor — um
 * widget que lesse o id para "personalizar", um rastreador que o anexasse a outro `fetch` — passaria
 * em build, `tsc` e em todos os testes de componente, e o código que a política de privacidade
 * descreve como "só usado para contar visitas" viajaria para outro lugar.
 *
 * Três réguas:
 * 1. fora da pasta `shared/lib/visits`, só `app/VisitCounter.tsx` importa (ou reexporta)
 *    `ensureVisitorId`, `postVisit` ou `readMarker` — por import nomeado, de namespace, `export … from`
 *    ou `import()` dinâmico, pelo barril, pelo arquivo do módulo ou por caminho relativo;
 * 2. dentro da pasta, só `send.ts` faz rede (`fetch`, `sendBeacon`, `XMLHttpRequest`);
 * 3. o `VisitCounter` não faz rede própria — ele chama `postVisit`.
 *
 * O escopo é a PRODUÇÃO dos dois apps: os testes dublam e importam essas funções de propósito.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** Escrito literalmente: a régua não pode ser o objeto que ela mede. */
const ESCOPO = ['apps/store/src', 'apps/backoffice/src']
const PASTA = 'apps/store/src/shared/lib/visits/'
const DONO_DO_USO = 'apps/store/src/app/VisitCounter.tsx'
const DONO_DA_REDE = 'apps/store/src/shared/lib/visits/send.ts'
const NOMES_DO_ID = ['ensureVisitorId', 'postVisit', 'readMarker']

type Arquivo = { nome: string; fonte: string }

const ehTeste = (nome: string) => /\/__tests__\//.test(nome) || /\.test\.[cm]?[jt]sx?$/.test(nome)

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

const producao = arquivos.filter((a) => !ehTeste(a.nome))

/** CRLF normalizado, e linha e bloco na MESMA varredura (`BL-027`). */
const semComentario = (fonte: string): string =>
  fonte.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

/** O especificador aponta para a pasta do contador? Alias `@/` (só na loja) ou caminho relativo. */
const apontaParaAPasta = (especificador: string, nomeDoArquivo: string): boolean => {
  if (nomeDoArquivo.startsWith('apps/store/src/') && /^@\/shared\/lib\/visits(\/|$)/.test(especificador)) return true
  if (!especificador.startsWith('.')) return false
  const alvo = resolve(ROOT, dirname(nomeDoArquivo), especificador).replace(/\\/g, '/')
  const pasta = resolve(ROOT, PASTA).replace(/\\/g, '/')
  return alvo === pasta || alvo.startsWith(`${pasta}/`)
}

/**
 * Os nomes do id que o arquivo traz da pasta. `'*'` quando o arquivo traz o módulo inteiro (namespace,
 * `export *` ou `import()` dinâmico) — que alcança os três nomes sem escrevê-los.
 */
const nomesTrazidos = (arquivo: Arquivo): string[] => {
  const codigo = semComentario(arquivo.fonte)
  const saida = new Set<string>()
  const nomeados = /\b(?:import|export)\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g
  for (const m of codigo.matchAll(nomeados)) {
    if (!apontaParaAPasta(m[2], arquivo.nome)) continue
    for (const parte of m[1].split(',')) {
      const original = parte.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim()
      if (NOMES_DO_ID.includes(original)) saida.add(original)
    }
  }
  const inteiros = [
    /\bimport\s+\*\s+as\s+\w+\s+from\s*['"]([^'"]+)['"]/g,
    /\bexport\s+\*\s+(?:as\s+\w+\s+)?from\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]
  for (const re of inteiros) {
    for (const m of codigo.matchAll(re)) if (apontaParaAPasta(m[1], arquivo.nome)) saida.add('*')
  }
  return [...saida].sort()
}

/** Faz rede em código? */
const fazRede = (fonte: string): boolean =>
  /\bfetch\s*\(|\bsendBeacon\s*\(|\bXMLHttpRequest\b/.test(semComentario(fonte))

const consumidoresDoId = (lista: Arquivo[]): string[] =>
  lista
    .filter((a) => !a.nome.startsWith(PASTA) && nomesTrazidos(a).length > 0)
    .map((a) => a.nome)
    .sort()

const fonteDe = (nome: string): string => {
  const a = arquivos.find((x) => x.nome === nome)
  if (!a) throw new Error(`arquivo fora da varredura: ${nome}`)
  return a.fonte
}

describe('VIS-12 — o id do navegador só viaja pela function `visit`', () => {
  it('âncora: a varredura leu os dois apps, e a produção sem os testes', () => {
    const nomes = arquivos.map((a) => a.nome)
    expect(arquivos.length).toBeGreaterThanOrEqual(900)
    expect(nomes).toContain('apps/store/src/app/App.tsx')
    expect(nomes).toContain('apps/backoffice/src/app/App.tsx')
    expect(producao.length).toBeGreaterThanOrEqual(400)
    expect(producao.some((a) => ehTeste(a.nome))).toBe(false)
    expect(producao.map((a) => a.nome)).toContain(DONO_DO_USO)
    expect(producao.map((a) => a.nome)).toContain(DONO_DA_REDE)
  })

  it('âncora: o colhedor enxerga o consumidor LEGÍTIMO de outro nome da pasta (`forgetVisitorId`)', () => {
    // Prova que o recorte por caminho funciona no arquivo real: ele aponta para a pasta, e não traz
    // nenhum dos três nomes.
    const nome = 'apps/store/src/entities/cookie-consent/model/cookieConsentStore.ts'
    expect(semComentario(fonteDe(nome))).toMatch(/from '@\/shared\/lib\/visits\/visitor'/)
    expect(nomesTrazidos({ nome, fonte: fonteDe(nome) })).toEqual([])
  })

  it('só `app/VisitCounter.tsx` traz `ensureVisitorId`, `postVisit` ou `readMarker` da pasta', () => {
    expect(consumidoresDoId(producao)).toEqual([DONO_DO_USO])
  })

  it('metade positiva: o `VisitCounter` traz os três — senão a ausência acima seria verdade sobre o nada', () => {
    expect(nomesTrazidos({ nome: DONO_DO_USO, fonte: fonteDe(DONO_DO_USO) })).toEqual(['ensureVisitorId', 'postVisit', 'readMarker'])
  })

  it('dentro da pasta, só `send.ts` faz rede', () => {
    const naPasta = producao.filter((a) => a.nome.startsWith(PASTA))
    expect(naPasta.length).toBeGreaterThanOrEqual(4)
    expect(naPasta.filter((a) => fazRede(a.fonte)).map((a) => a.nome)).toEqual([DONO_DA_REDE])
  })

  it('o `VisitCounter` não faz rede própria — a única saída é `postVisit`', () => {
    expect(fazRede(fonteDe(DONO_DO_USO))).toBe(false)
    expect(semComentario(fonteDe(DONO_DO_USO))).toMatch(/\bpostVisit\s*\(\s*id\s*\)/)
  })
})

describe('VIS-12 — sensores do colhedor', () => {
  const W = 'apps/store/src/widgets/qualquer/ui/Qualquer.tsx'
  const acusa = (fonte: string, nome = W) => consumidoresDoId([...producao, { nome, fonte }])

  it('um widget que importa `postVisit` pelo barril É acusado', () => {
    expect(acusa("import { postVisit } from '@/shared/lib/visits'\n")).toContain(W)
  })

  it('import em várias linhas, com `type` e alias, pelo arquivo do módulo — acusado', () => {
    const fonte = "import {\n  type VisitorMarker,\n  ensureVisitorId as pegar,\n} from '@/shared/lib/visits/visitor'\n"
    expect(nomesTrazidos({ nome: W, fonte })).toEqual(['ensureVisitorId'])
  })

  it('caminho RELATIVO até a pasta — acusado', () => {
    expect(nomesTrazidos({ nome: W, fonte: "import { readMarker } from '../../../shared/lib/visits/visitor'\n" })).toEqual(['readMarker'])
  })

  it('namespace, `export *` e `import()` dinâmico trazem o módulo inteiro — acusados', () => {
    expect(nomesTrazidos({ nome: W, fonte: "import * as v from '@/shared/lib/visits'\n" })).toEqual(['*'])
    expect(nomesTrazidos({ nome: W, fonte: "export * from '@/shared/lib/visits/send'\n" })).toEqual(['*'])
    expect(nomesTrazidos({ nome: W, fonte: "const m = await import('@/shared/lib/visits')\n" })).toEqual(['*'])
  })

  it('reexportar por outro barril (`export { postVisit } from`) — acusado', () => {
    expect(nomesTrazidos({ nome: W, fonte: "export { postVisit } from '@/shared/lib/visits'\n" })).toEqual(['postVisit'])
  })

  it('CRLF não cega o colhedor', () => {
    expect(nomesTrazidos({ nome: W, fonte: "import {\r\n  postVisit,\r\n} from '@/shared/lib/visits'\r\n" })).toEqual(['postVisit'])
  })

  it('inverso: comentário que cita o import NÃO é acusado (CRLF e LF)', () => {
    expect(nomesTrazidos({ nome: W, fonte: "// import { postVisit } from '@/shared/lib/visits'\n" })).toEqual([])
    expect(nomesTrazidos({ nome: W, fonte: "/* import { postVisit } from '@/shared/lib/visits' */\r\nexport {}\r\n" })).toEqual([])
  })

  it('inverso: `forgetVisitorId` e `visitRefusal` (sem o id) NÃO são acusados', () => {
    expect(nomesTrazidos({ nome: W, fonte: "import { forgetVisitorId, visitRefusal } from '@/shared/lib/visits'\n" })).toEqual([])
  })

  it('inverso: um `postVisit` de OUTRO módulo não é atribuído à pasta', () => {
    expect(nomesTrazidos({ nome: W, fonte: "import { postVisit } from '@/shared/lib/outra-coisa'\n" })).toEqual([])
  })

  it('o painel não tem o alias da loja: `@/shared/lib/visits` lá é OUTRA pasta', () => {
    const B = 'apps/backoffice/src/widgets/x/X.tsx'
    expect(nomesTrazidos({ nome: B, fonte: "import { postVisit } from '@/shared/lib/visits'\n" })).toEqual([])
  })

  it('sensor da rede: um `fetch` num segundo arquivo da pasta É acusado', () => {
    const extra = { nome: `${PASTA}espiao.ts`, fonte: "export const x = () => fetch('/outro', { body: id })\n" }
    const naPasta = [...producao, extra].filter((a) => a.nome.startsWith(PASTA))
    expect(naPasta.filter((a) => fazRede(a.fonte)).map((a) => a.nome).sort()).toEqual([extra.nome, DONO_DA_REDE].sort())
  })
})
