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
 */

const NAO_SAO_ABAS = ['/login', '/recuperar', '/recuperar/codigo', '/recuperar/senha', '*']

const semComentarios = (t: string) => t.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

const rotasDoApp = (fonte: string) =>
  [...semComentarios(fonte).matchAll(/path="([^"]*)"/g)].map((m) => m[1]).filter((p) => !NAO_SAO_ABAS.includes(p))

const divergencias = (abas: string[], rotas: string[]) => ({
  abaSemRota: abas.filter((a) => !rotas.includes(a)),
  rotaSemAba: rotas.filter((r) => !abas.includes(r)),
})

const fonte = readFileSync(resolve(__dirname, '../../../app/App.tsx'), 'utf8')

describe('TABS × rotas do App.tsx', () => {
  it('âncora — quatro abas e quatro rotas de aba', () => {
    expect(TABS).toHaveLength(4)
    expect(rotasDoApp(fonte)).toHaveLength(4)
  })

  it('as duas listas são a mesma, na mesma ordem', () => {
    expect(rotasDoApp(fonte)).toEqual(TABS.map((t) => t.path))
    expect(divergencias(TABS.map((t) => t.path), rotasDoApp(fonte))).toEqual({ abaSemRota: [], rotaSemAba: [] })
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
