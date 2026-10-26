// Feature 79, V04 (Verificador r1, lacuna 4) — "este destino é caminho do próprio app?" tem DUAS
// escritas: `destinoDepoisDoLogin` (o login que volta à origem) e `caminhoInterno` em
// `public/sw-avisos.js` (o toque no aviso). O worker é JS puro sem build e não importa do app, então
// a cópia é deliberada — e já divergiu uma vez (a do login não recusava a barra invertida). A régua
// roda AS DUAS sobre as mesmas entradas e exige a mesma resposta.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'
import { destinoDepoisDoLogin } from '../destinoDepoisDoLogin'

const FONTE = readFileSync(resolve(__dirname, '../../../../public/sw-avisos.js'), 'utf8')

const caminhoDoWorker = (fonte: string): ((url: unknown) => string) => {
  const ctx: Record<string, unknown> = { self: { addEventListener: () => {} }, clients: {}, Promise }
  vm.runInNewContext(fonte, ctx)
  const fn = ctx.caminhoInterno
  if (typeof fn !== 'function') throw new Error('caminhoInterno não foi achado em sw-avisos.js')
  return fn as (url: unknown) => string
}

const ENTRADAS: unknown[] = [
  '/', '/pedidos/x', '/pedidos?visao=todos', '/avisos#topo',
  '//host/x', '/\\host/x', 'https://outro.exemplo/x', 'pedidos', '', ' /pedidos', undefined, null, 42,
]

describe('caminho interno: o login e o worker dão a mesma resposta', () => {
  const doWorker = caminhoDoWorker(FONTE)

  it.each(ENTRADAS.map((e) => [JSON.stringify(e) ?? 'undefined', e]))('%s', (_nome, entrada) => {
    expect(destinoDepoisDoLogin({ from: entrada })).toBe(doWorker(entrada))
  })

  it('âncora: as duas aceitam um caminho e recusam o outro host (a régua não compara dois "/")', () => {
    expect(doWorker('/pedidos/x')).toBe('/pedidos/x')
    expect(doWorker('//host/x')).toBe('/')
  })

  it('sensor: um worker sem a recusa da barra invertida diverge do login', () => {
    const afrouxado = FONTE.replace(" && url.charAt(1) !== '\\\\'", '')
    expect(afrouxado).not.toBe(FONTE)
    expect(caminhoDoWorker(afrouxado)('/\\host/x')).not.toBe(destinoDepoisDoLogin({ from: '/\\host/x' }))
  })
})
