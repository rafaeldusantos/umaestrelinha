import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { TABS } from '../model/tabs'

/**
 * `TABS` e as rotas guardadas do `App.tsx` são a MESMA lista, nos dois sentidos (feature 72,
 * `MAF-14`). Molde: `apps/backoffice/src/widgets/admin-layout/__tests__/navItems.test.ts`.
 *
 * Uma aba sem rota leva ao `*` e volta para a Início — o toque parece não fazer nada. Uma rota sem
 * aba é uma área que só se alcança digitando o endereço. Nenhum dos dois quebra build nem tipo.
 * O `*` (caminho desconhecido), o `/login` e os três passos da recuperação (`MAF-24`) não são abas.
 *
 * Feature `74` (`MAP-54`, A28): uma SUBROTA de aba (`/pedidos/:id`) é aceita — ela vive dentro da aba
 * e a deixa marcada —, mas só quando o primeiro segmento É uma aba. Uma subrota cujo pai não é aba
 * (`/estoque/:id`) continua acusada, e uma rota de primeiro nível sem aba (`/relatorios`) também: o
 * sentido "rota sem aba" não afrouxa.
 */

const NAO_SAO_ABAS = ['/login', '/recuperar', '/recuperar/codigo', '/recuperar/senha', '*']

const semComentarios = (t: string) => t.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

const todasAsRotas = (fonte: string) =>
  [...semComentarios(fonte).matchAll(/path="([^"]*)"/g)].map((m) => m[1]).filter((p) => !NAO_SAO_ABAS.includes(p))

/** Subrota: mais de um segmento (`/pedidos/:id`). A raiz e `/pedidos` são de primeiro nível. */
const ehSubrota = (p: string) => p.split('/').filter(Boolean).length > 1
const paiDe = (p: string) => `/${p.split('/').filter(Boolean)[0]}`

/** As rotas de PRIMEIRO nível — as que têm de ser, uma a uma, as abas. */
const rotasDoApp = (fonte: string) => todasAsRotas(fonte).filter((p) => !ehSubrota(p))
const subrotasDoApp = (fonte: string) => todasAsRotas(fonte).filter(ehSubrota)

const divergencias = (abas: string[], rotas: string[], subrotas: string[] = []) => ({
  abaSemRota: abas.filter((a) => !rotas.includes(a)),
  rotaSemAba: rotas.filter((r) => !abas.includes(r)),
  subrotaSemAba: subrotas.filter((s) => !abas.includes(paiDe(s))),
})

const fonte = readFileSync(resolve(__dirname, '../../../app/App.tsx'), 'utf8')

describe('TABS × rotas do App.tsx', () => {
  it('âncora — quatro abas, quatro rotas de aba e UMA subrota (`/pedidos/:id`)', () => {
    expect(TABS).toHaveLength(4)
    expect(rotasDoApp(fonte)).toHaveLength(4)
    expect(subrotasDoApp(fonte)).toEqual(['/pedidos/:id'])
  })

  it('as duas listas são a mesma, na mesma ordem — e toda subrota mora numa aba', () => {
    expect(rotasDoApp(fonte)).toEqual(TABS.map((t) => t.path))
    expect(divergencias(TABS.map((t) => t.path), rotasDoApp(fonte), subrotasDoApp(fonte))).toEqual({
      abaSemRota: [],
      rotaSemAba: [],
      subrotaSemAba: [],
    })
  })

  it('SENSOR — uma subrota cujo pai NÃO é aba é acusada (`/estoque/:id`)', () => {
    const doente = `${fonte}\n<Route path="/estoque/:id" element={<X />} />`
    const d = divergencias(TABS.map((t) => t.path), rotasDoApp(doente), subrotasDoApp(doente))
    expect(d.subrotaSemAba).toEqual(['/estoque/:id'])
    expect(d.rotaSemAba).toEqual([])
  })

  it('SENSOR — uma rota de primeiro nível sem aba continua acusada mesmo ao lado da subrota', () => {
    const doente = `${fonte}\n<Route path="/relatorios" element={<X />} />`
    const d = divergencias(TABS.map((t) => t.path), rotasDoApp(doente), subrotasDoApp(doente))
    expect(d.rotaSemAba).toEqual(['/relatorios'])
    expect(d.subrotaSemAba).toEqual([])
  })

  it('SENSOR — uma aba sem rota é acusada', () => {
    expect(divergencias(['/', '/pedidos', '/estoque'], ['/', '/pedidos']).abaSemRota).toEqual(['/estoque'])
  })

  it('SENSOR — uma rota sem aba é acusada', () => {
    const doente = `${fonte}\n<Route path="/relatorios" element={<X />} />`
    expect(divergencias(TABS.map((t) => t.path), rotasDoApp(doente)).rotaSemAba).toEqual(['/relatorios'])
  })

  it('SENSOR INVERSO — o login, o desconhecido e a prosa não são acusados', () => {
    const comProsa = `<Route path="/login" />\n<Route path="*" />\n// path="/fantasma"\n<Route path="/" />`
    expect(rotasDoApp(comProsa)).toEqual(['/'])
  })
})
