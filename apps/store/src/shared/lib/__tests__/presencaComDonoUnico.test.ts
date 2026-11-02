import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { PRESENCE_KEY, PRESENCE_SOURCE_KEY } from '@/shared/lib/presence/presence'

/**
 * A presença na loja tem UM dono para cada coisa que a política de privacidade promete:
 *
 * 1. as duas chaves de armazenamento (o id do dia e a faixa de origem) só aparecem em
 *    `shared/lib/presence/presence.ts` — em todo `apps/*\/src`, TESTES inclusos (eles importam as
 *    constantes). Uma segunda leitura à mão faria o id ou a origem durarem mais do que a política diz;
 * 2. fora da pasta, só `app/PresencePing.tsx` traz `ensurePresenceId` ou `postPresence`: o id da
 *    presença não viaja em outra requisição;
 * 3. dentro da pasta, só `send.ts` faz rede, e o `PresencePing` não faz rede própria.
 *
 * Molde de `visitanteComDonoUnico.test.ts` e `idDoVisitanteSoNoEnvio.test.ts`. Allowlist de UM nas
 * chaves: este arquivo, que precisa carregá-las nos sensores.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** Escrito literalmente: a régua não pode ser o objeto que ela mede. */
const ESCOPO = ['apps/store/src', 'apps/backoffice/src', 'apps/mobile-adm/src']
const PASTA = 'apps/store/src/shared/lib/presence/'
const DONO_DAS_CHAVES = 'apps/store/src/shared/lib/presence/presence.ts'
const DONO_DO_USO = 'apps/store/src/app/PresencePing.tsx'
const DONO_DA_REDE = 'apps/store/src/shared/lib/presence/send.ts'
const ESTE = 'apps/store/src/shared/lib/__tests__/presencaComDonoUnico.test.ts'
const CHAVE_RAIZ = 'estrelinha-presenca'
const NOMES_DO_ID = ['ensurePresenceId', 'postPresence']

type Arquivo = { nome: string; fonte: string }

const arquivos: Arquivo[] = ESCOPO.flatMap((relativo) => {
  const saida: Arquivo[] = []
  const andar = (dir: string) => {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const caminho = join(dir, entrada.name)
      if (entrada.isDirectory()) {
        if (entrada.name !== 'node_modules') andar(caminho)
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

const ehTeste = (nome: string) => /\/__tests__\//.test(nome) || /\.test\.[cm]?[jt]sx?$/.test(nome)
const producao = arquivos.filter((a) => !ehTeste(a.nome))

/** CRLF normalizado, e linha e bloco na MESMA varredura (`BL-027`). */
const semComentario = (fonte: string): string =>
  fonte.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

const citaAChave = (fonte: string) => semComentario(fonte).includes(CHAVE_RAIZ)
const citadores = (lista: Arquivo[]) => lista.filter((a) => a.nome !== ESTE && citaAChave(a.fonte)).map((a) => a.nome)

const apontaParaAPasta = (especificador: string, nome: string): boolean => {
  if (nome.startsWith('apps/store/src/') && /^@\/shared\/lib\/presence(\/|$)/.test(especificador)) return true
  if (!especificador.startsWith('.')) return false
  const alvo = resolve(ROOT, dirname(nome), especificador).replace(/\\/g, '/')
  const pasta = resolve(ROOT, PASTA).replace(/\\/g, '/')
  return alvo === pasta || alvo.startsWith(`${pasta}/`)
}

const nomesTrazidos = (a: Arquivo): string[] => {
  const codigo = semComentario(a.fonte)
  const saida = new Set<string>()
  for (const m of codigo.matchAll(/\b(?:import|export)\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    if (!apontaParaAPasta(m[2], a.nome)) continue
    for (const parte of m[1].split(',')) {
      const original = parte.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim()
      if (NOMES_DO_ID.includes(original)) saida.add(original)
    }
  }
  for (const re of [
    /\bimport\s+\*\s+as\s+\w+\s+from\s*['"]([^'"]+)['"]/g,
    /\bexport\s+\*\s+(?:as\s+\w+\s+)?from\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]) {
    for (const m of codigo.matchAll(re)) if (apontaParaAPasta(m[1], a.nome)) saida.add('*')
  }
  return [...saida].sort()
}

const consumidores = (lista: Arquivo[]) =>
  lista.filter((a) => !a.nome.startsWith(PASTA) && nomesTrazidos(a).length > 0).map((a) => a.nome).sort()

const fazRede = (fonte: string) => /\bfetch\s*\(|\bsendBeacon\s*\(|\bXMLHttpRequest\b/.test(semComentario(fonte))

const fonteDe = (nome: string) => {
  const a = arquivos.find((x) => x.nome === nome)
  if (!a) throw new Error(`arquivo fora da varredura: ${nome}`)
  return a.fonte
}

describe('a presença na loja — um dono para as chaves, o id e a rede', () => {
  it('âncora: a varredura leu os três apps, testes inclusos, e os donos', () => {
    const nomes = arquivos.map((a) => a.nome)
    expect(arquivos.length).toBeGreaterThanOrEqual(900)
    for (const n of ['apps/store/src/app/App.tsx', 'apps/backoffice/src/app/App.tsx', 'apps/mobile-adm/src/app/App.tsx']) {
      expect(nomes).toContain(n)
    }
    for (const n of [DONO_DAS_CHAVES, DONO_DO_USO, DONO_DA_REDE]) expect(nomes).toContain(n)
    expect(PRESENCE_KEY.startsWith(CHAVE_RAIZ)).toBe(true)
    expect(PRESENCE_SOURCE_KEY.startsWith(CHAVE_RAIZ)).toBe(true)
  })

  it('as chaves só aparecem no dono — testes inclusos', () => {
    expect(citadores(arquivos)).toEqual([DONO_DAS_CHAVES])
  })

  it('fora da pasta, só o `PresencePing` traz o id ou o envio da presença', () => {
    expect(consumidores(producao)).toEqual([DONO_DO_USO])
    expect(nomesTrazidos({ nome: DONO_DO_USO, fonte: fonteDe(DONO_DO_USO) })).toEqual(['ensurePresenceId', 'postPresence'])
  })

  it('dentro da pasta só `send.ts` faz rede, e o `PresencePing` não faz rede própria', () => {
    const naPasta = producao.filter((a) => a.nome.startsWith(PASTA))
    expect(naPasta.length).toBeGreaterThanOrEqual(3)
    expect(naPasta.filter((a) => fazRede(a.fonte)).map((a) => a.nome)).toEqual([DONO_DA_REDE])
    expect(fazRede(fonteDe(DONO_DO_USO))).toBe(false)
    expect(semComentario(fonteDe(DONO_DO_USO))).toMatch(/\bpostPresence\s*\(/)
  })
})

describe('sensores', () => {
  const W = 'apps/store/src/widgets/qualquer/Qualquer.tsx'

  it('um teste irmão que escreve a chave À MÃO seria acusado', () => {
    const irmao = { nome: 'apps/store/src/app/__tests__/Outro.test.tsx', fonte: `localStorage.getItem('${CHAVE_RAIZ}')` }
    expect(citadores([...arquivos, irmao]).sort()).toEqual([DONO_DAS_CHAVES, irmao.nome].sort())
  })

  it('a chave citada só em comentário não é acusada (LF e CRLF)', () => {
    expect(citaAChave(`// a chave ${CHAVE_RAIZ}\nexport {}`)).toBe(false)
    expect(citaAChave(`/* ${CHAVE_RAIZ} */\r\nexport {}`)).toBe(false)
  })

  it('um widget que traz `postPresence` pelo barril, ou o módulo inteiro, é acusado', () => {
    expect(consumidores([...producao, { nome: W, fonte: "import { postPresence } from '@/shared/lib/presence'\n" }])).toContain(W)
    expect(nomesTrazidos({ nome: W, fonte: "import * as p from '@/shared/lib/presence/presence'\n" })).toEqual(['*'])
    expect(nomesTrazidos({ nome: W, fonte: "import { ensurePresenceId as x } from '../../shared/lib/presence/presence'\n" })).toEqual(['ensurePresenceId'])
  })

  it('inverso: `forgetPresence` (a recusa) não é acusado', () => {
    expect(nomesTrazidos({ nome: W, fonte: "import { forgetPresence } from '@/shared/lib/presence/presence'\n" })).toEqual([])
  })

  it('um `fetch` num segundo arquivo da pasta seria acusado', () => {
    const extra = { nome: `${PASTA}espiao.ts`, fonte: "export const x = () => fetch('/outro')\n" }
    const naPasta = [...producao, extra].filter((a) => a.nome.startsWith(PASTA))
    expect(naPasta.filter((a) => fazRede(a.fonte)).map((a) => a.nome).sort()).toEqual([extra.nome, DONO_DA_REDE].sort())
  })
})
