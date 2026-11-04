import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * A observação do pedido é só de quem administra, e NADA que serve a cliente a nomeia.
 *
 * O banco já recusa a leitura (RLS + `revoke` do anon, guardados por
 * `observacaoDoPedidoSchema.test.ts`). Este guarda fecha a outra metade: a loja e as edge functions
 * não podem nem PEDIR — uma edge function roda com a chave de serviço, que ignora a RLS, e um embed da
 * tabela no `get-order` da `checkout` ou no render de um e-mail entregaria a observação à cliente sem
 * erro nenhum.
 *
 * Varre SÓ produção: os testes ficam fora, porque é num teste que se assere que uma resposta NÃO traz
 * o campo — e a asserção precisa escrevê-lo.
 *
 * **Allowlist literal de UMA pasta**: `supabase/functions/order-proposals`, a function do painel
 * (`requireAdmin` em toda ação), que guarda a observação da proposta antes de ela virar pedido.
 *
 * **Âncora dupla**: cada escopo tem arquivos e o total passa de um piso; e o nome É achado onde ele
 * deve estar (o dono da escrita em `core`), senão a régua poderia estar cega ao token.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** Os escopos, por extenso: a régua nunca é o objeto medido. */
const ESCOPOS = ['apps/store/src', 'apps/store/server', 'apps/store/api', 'supabase/functions'] as const

const PASTAS_PERMITIDAS = ['supabase/functions/order-proposals/'] as const

const eTeste = (rel: string): boolean =>
  /(?:^|\/)__tests__\//.test(rel) || /\.test\.tsx?$/.test(rel) || /(?:^|\/)src\/test\//.test(rel)

const arquivos = (dir: string): string[] =>
  readdirSync(dir).flatMap(nome => {
    const caminho = join(dir, nome)
    if (nome === 'node_modules' || nome.startsWith('.')) return []
    if (statSync(caminho).isDirectory()) return arquivos(caminho)
    return /\.(ts|tsx|mjs|js)$/.test(nome) ? [caminho] : []
  })

/** A tabela e o campo como token — `order_admin_notes`, `admin_note(s)` —, nunca pedaço de palavra. */
const NOME = /(?<![\w-])(?:order_)?admin_notes?(?![\w-])/

const ocorrencias = (rel: string, texto: string): string[] =>
  texto
    .replace(/\r\n/g, '\n')
    .split('\n')
    .flatMap((linha, i) => (NOME.test(linha) ? [`${rel}:${i + 1}`] : []))

const rel = (abs: string): string => relative(ROOT, abs).split('\\').join('/')

const LIDOS = ESCOPOS.map(e => ({ escopo: e, arquivos: arquivos(join(ROOT, e)).filter(a => !eTeste(rel(a))) }))

describe('observacaoForaDaLoja — âncora', () => {
  it('cada escopo tem arquivos de produção, e o total passa do piso', () => {
    for (const { escopo, arquivos: lista } of LIDOS) expect(lista.length, escopo).toBeGreaterThan(0)
    expect(LIDOS.reduce((n, l) => n + l.arquivos.length, 0)).toBeGreaterThan(300)
  })

  it('o que serve a cliente está no alcance: a `checkout` (get-order) e o motor de e-mail', () => {
    const lidos = LIDOS.flatMap(l => l.arquivos).map(rel)
    expect(lidos).toContain('supabase/functions/checkout/handlers.ts')
    expect(lidos.some(r => r.startsWith('supabase/functions/send-notification/render/'))).toBe(true)
  })

  it('os testes ficam fora da varredura', () => {
    const lidos = LIDOS.flatMap(l => l.arquivos).map(rel)
    expect(lidos.filter(eTeste)).toEqual([])
  })

  it('a régua enxerga o nome onde ele existe de fato (o dono da escrita)', () => {
    const dono = 'packages/core/src/order-actions/adminNote.ts'
    expect(ocorrencias(dono, readFileSync(join(ROOT, dono), 'utf8')).length).toBeGreaterThan(0)
  })
})

describe('nada que serve a cliente nomeia a observação do pedido', () => {
  it('zero ocorrência fora da allowlist', () => {
    const achados = LIDOS.flatMap(({ arquivos: lista }) =>
      lista.flatMap(abs => {
        const r = rel(abs)
        return PASTAS_PERMITIDAS.some(p => r.startsWith(p)) ? [] : ocorrencias(r, readFileSync(abs, 'utf8'))
      }),
    )
    expect(achados, 'a observação é só de quem administra').toEqual([])
  })

  it('sensor: o embed no select, a tabela no from e o campo em string são acusados', () => {
    expect(ocorrencias('x.ts', "select('*, order_admin_notes(note)')")).toEqual(['x.ts:1'])
    expect(ocorrencias('x.ts', "const a = 1\r\nsupabase.from('order_admin_notes')")).toEqual(['x.ts:2'])
    expect(ocorrencias('x.ts', 'const COLUNAS = "id, admin_note"')).toEqual(['x.ts:1'])
  })

  it('sensor inverso: palavra que só CONTÉM o nome não é acusada', () => {
    expect(ocorrencias('x.ts', 'const myAdminNote = 0 // admin_notesss, order-admin-note')).toEqual([])
  })
})
