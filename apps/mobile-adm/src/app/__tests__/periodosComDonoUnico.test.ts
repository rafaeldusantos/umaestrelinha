// Feature `83` · T06 — `LAV-50`, `AD-033`: o vocabulário de período do app tem UM dono,
// `entities/stats/model/periodos.ts`. A faixa do Início (feature `73`), o cartão "Visitas hoje" e a
// seção Acessos desenham Hoje · Ontem · Semana; uma segunda lista no app (o rótulo ou a forma falada
// trocados num lado só) faria a faixa e a seção discordarem sem nada quebrar.
//
// A régua lê o FONTE de produção de `apps/mobile-adm/src` (testes fora: eles podem citar os rótulos
// como valor esperado), comentário fora (linha e bloco na MESMA passada, CRLF primeiro), e acusa:
//   (a) um objeto com `id: 'hoje'` acompanhado de `rotulo` ou `falado` — a forma de `PERIODOS`;
//   (b) um array literal com os três rótulos `'Hoje'`, `'Ontem'` e `'Semana'`.
// Allowlist de UM: o dono. Metade positiva: `movement-hero/model/numeros.ts` reexporta `PERIODOS` POR
// REFERÊNCIA (`toBe`) — os testes da `73` leem de lá.
//
// Mora em `app/__tests__` (e não em `shared/lib/__tests__`, como a task dizia) pelo mesmo motivo de
// `regrasDoPedidoNoCore` no painel: a metade positiva importa de `entities/` e de `widgets/`, e de
// `shared/` esses imports são fronteira FSD ao contrário (o lint do app é 0/0).
//
// **O que a régua NÃO alcança, declarado**: os rótulos montados em pedaços, ou espalhados em
// variáveis soltas. A fronteira é a forma que a lista tinha quando nasceu.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { PERIODOS } from '@/entities/stats'
import { PERIODOS as PERIODOS_DO_HERO } from '@/widgets/movement-hero'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const DONO = 'entities/stats/model/periodos.ts'

const todos = (dir: string): string[] =>
  readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return todos(caminho)
    return /\.(ts|tsx)$/.test(nome) ? [caminho] : []
  })

const semComentarios = (fonte: string): string =>
  fonte.replace(/\r\n?/g, '\n').replace(/(?<!:)\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (t) => t.replace(/[^\n]/g, ' '))

const FORMA_DE_OBJETO = /id:\s*['"`]hoje['"`][^}]*\b(rotulo|falado)\b/
const temOsTresRotulos = (fonte: string): boolean =>
  [...fonte.matchAll(/\[[^[\]]*\]/g)].some(([arr]) => ['Hoje', 'Ontem', 'Semana'].every((r) => new RegExp(`['"\`]${r}['"\`]`).test(arr)))

/** As declarações da lista de períodos num fonte (já sem comentário). */
const declaraPeriodos = (fonte: string): boolean => FORMA_DE_OBJETO.test(fonte) || temOsTresRotulos(fonte)

const PRODUCAO = todos(SRC)
  .map((c) => ({ rel: relative(SRC, c).split('\\').join('/'), fonte: readFileSync(c, 'utf8') }))
  .filter((a) => !/\.test\.tsx?$/.test(a.rel) && !/(^|\/)__tests__\//.test(a.rel) && !a.rel.startsWith('test/'))

const infratores = (arquivos: { rel: string; fonte: string }[]) =>
  arquivos.filter((a) => a.rel !== DONO && declaraPeriodos(semComentarios(a.fonte))).map((a) => a.rel)

describe('o vocabulário de período tem um dono (LAV-50)', () => {
  it('âncora — a varredura lê a produção do app e acha a declaração NO DONO', () => {
    expect(PRODUCAO.length).toBeGreaterThan(100)
    const dono = PRODUCAO.find((a) => a.rel === DONO)
    expect(dono).toBeDefined()
    expect(declaraPeriodos(semComentarios(dono!.fonte))).toBe(true)
    // o arquivo de onde a lista saiu continua sendo lido (a régua o alcança)
    expect(PRODUCAO.some((a) => a.rel === 'widgets/movement-hero/model/numeros.ts')).toBe(true)
  })

  it('nenhum outro arquivo de produção declara a lista', () => {
    expect(infratores(PRODUCAO)).toEqual([])
  })

  it('a faixa do Início reexporta `PERIODOS` POR REFERÊNCIA', () => {
    expect(PERIODOS_DO_HERO).toBe(PERIODOS)
  })

  it('SENSOR — uma segunda lista na forma de objeto é acusada (com CRLF também)', () => {
    const copia = "export const P = [\r\n  { id: 'hoje', rotulo: 'Hoje', falado: 'hoje' },\r\n]"
    expect(infratores([{ rel: 'widgets/x/model/p.ts', fonte: copia }])).toEqual(['widgets/x/model/p.ts'])
  })

  it('SENSOR — um array com os três rótulos é acusado', () => {
    const copia = "const ROTULOS = ['Semana', 'Hoje', 'Ontem']"
    expect(infratores([{ rel: 'widgets/x/ui/X.tsx', fonte: copia }])).toEqual(['widgets/x/ui/X.tsx'])
  })

  it('SENSOR — uma cópia com o MESMO valor não passa pela igualdade de referência', () => {
    const copia = PERIODOS.map((p) => ({ ...p }))
    expect(copia).toEqual(PERIODOS)
    expect(copia).not.toBe(PERIODOS)
  })

  it('INVERSO — o comentário que cita a forma e um rótulo solto não são acusados', () => {
    const prosa = "// { id: 'hoje', rotulo: 'Hoje' }\n/* ['Hoje', 'Ontem', 'Semana'] */\nconst t = 'Hoje'"
    expect(infratores([{ rel: 'widgets/x/ui/X.tsx', fonte: prosa }])).toEqual([])
  })
})
