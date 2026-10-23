import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import {
  MATERIAL_NAO_SEGURA_LISTA,
  NEEDS_ACTION_BLOCKS,
  QUEUE_BLOCKS,
  needsActionOrFilter,
  needsActionRule,
  needsActionSqlPredicate,
  queueBlock,
  toPostgrestFilter,
  toSqlPredicate,
  type QueueBlockId,
  type QueueRule,
} from '../queue.ts'

/**
 * Feature `73` · `MAI-05`, `MAI-06` · `AD-057` — a regra da fila como dado, e os dois tradutores.
 *
 * O que cada bloco prova, e o mundo errado em que ele seria falso:
 * - **os dois tradutores, por bloco, por extenso**: o PostgREST e o SQL são comparados com a frase
 *   inteira, não com fragmentos — um `toContain('status.eq.paid')` passaria com o `in` do material
 *   trocado (`L-009`);
 * - **a paridade com a régua de antes do painel**: `PRECISA_ACAO_ANTES` e `BLOCOS_ANTES` são a
 *   transcrição LITERAL do que o painel fazia antes da `73` (`orderQuery.ts`, `PRECISA_ACAO_OR`, e
 *   `useAdminOrderList.ts`, `fetchTiles`, no commit `e9e68ed0`). Enquanto o painel carrega a régua
 *   antiga, o bloco "lido do disco" confere a transcrição contra o arquivo — é isso que prova que a
 *   transcrição não foi inventada.
 */

// A régua de ANTES, transcrita. Não derive de `QUEUE_BLOCKS`: derivar provaria que o tradutor é
// igual a si mesmo.
const NAO_SEGURA = 'nao_aplicavel,material_recebido,em_producao'
const PRECISA_ACAO_ANTES = [
  'material_status.eq.aguardando_material',
  `and(status.eq.paid,or(material_status.is.null,material_status.in.(${NAO_SEGURA})))`,
  'and(status.eq.shipped,tracking_code.is.null)',
].join(',')

/** As quatro cadeias de `fetchTiles`, condição a condição: [coluna, operador, valor]. */
const BLOCOS_ANTES: Record<QueueBlockId, [string, string, string | string[] | null][]> = {
  aguardando: [['material_status', 'eq', 'aguardando_material']],
  'a-separar': [
    ['status', 'eq', 'paid'],
    ['material_status', 'in', ['nao_aplicavel', 'material_recebido', 'em_producao']],
  ],
  'sem-rastreio': [
    ['status', 'eq', 'shipped'],
    ['tracking_code', 'is', null],
  ],
  'pix-aguardando': [
    ['payment_method', 'eq', 'pix'],
    ['payment_status', 'eq', 'pending'],
  ],
}

/** Os textos de `QUEUE_TILES` do painel, transcritos. */
const TEXTOS_ANTES: Record<QueueBlockId, { label: string; hint: string; accent: boolean }> = {
  aguardando: { label: 'Aguardando material', hint: 'Ninguém pode fazer nada até o envelope chegar', accent: true },
  'a-separar': { label: 'Pago, a separar', hint: 'Material já recebido ou não exigido', accent: false },
  'sem-rastreio': { label: 'Enviado sem rastreio', hint: 'A cliente não foi avisada da postagem', accent: false },
  'pix-aguardando': { label: 'Pix aguardando', hint: 'Expiram sozinhos — nada a fazer', accent: false },
}

/** Traduz uma condição de `QUEUE_BLOCKS` para a tripla de `BLOCOS_ANTES`. */
const tripla = (rule: QueueRule): [string, string, string | string[] | null][] =>
  rule.map((c) => {
    if ('any' in c) throw new Error('condição "ou" não existe na contagem de antes')
    if (c.op === 'eq') return [c.col, 'eq', c.value]
    if (c.op === 'in') return [c.col, 'in', [...c.value]]
    return [c.col, 'is', null]
  })

describe('QUEUE_BLOCKS — os quatro blocos, na ordem do painel', () => {
  it('são exatamente os quatro, nesta ordem', () => {
    expect(QUEUE_BLOCKS.map((b) => b.id)).toEqual(['aguardando', 'a-separar', 'sem-rastreio', 'pix-aguardando'])
  })

  it('rótulo, frase e acento são os do painel, bloco a bloco', () => {
    for (const b of QUEUE_BLOCKS) {
      expect({ label: b.label, hint: b.hint, accent: b.accent }).toEqual(TEXTOS_ANTES[b.id])
    }
  })

  it('só o primeiro tem acento — um acento por tela', () => {
    expect(QUEUE_BLOCKS.filter((b) => b.accent).map((b) => b.id)).toEqual(['aguardando'])
  })

  it('cada contagem é a mesma cadeia de condições do `fetchTiles` de antes', () => {
    for (const b of QUEUE_BLOCKS) expect(tripla(b.rule)).toEqual(BLOCOS_ANTES[b.id])
  })

  it('a lista de material que não segura é a do painel', () => {
    expect(MATERIAL_NAO_SEGURA_LISTA.join(',')).toBe(NAO_SEGURA)
  })

  it('`queueBlock` acha pelo id e lança para id desconhecido', () => {
    expect(queueBlock('sem-rastreio').label).toBe('Enviado sem rastreio')
    expect(() => queueBlock('outro' as QueueBlockId)).toThrow('bloco da fila desconhecido: outro')
  })
})

describe('"Precisa de ação" é a UNIÃO dos três primeiros (MAI-06)', () => {
  it('os três primeiros, e o Pix fora', () => {
    expect(NEEDS_ACTION_BLOCKS).toEqual(['aguardando', 'a-separar', 'sem-rastreio'])
  })

  it('`needsActionOrFilter()` é, byte a byte, o `PRECISA_ACAO_OR` de antes', () => {
    expect(needsActionOrFilter()).toBe(PRECISA_ACAO_ANTES)
  })

  it('R1, PRESERVADO: o "a separar" entra na união aceitando material nulo, e a contagem dele não', () => {
    const aSeparar = queueBlock('a-separar')
    expect(toPostgrestFilter(needsActionRule(aSeparar))).toContain('material_status.is.null')
    expect(toPostgrestFilter(aSeparar.rule)).not.toContain('is.null')
  })

  it('sem `unionRule`, o bloco entra na união com a própria regra (`toBe`)', () => {
    const b = queueBlock('sem-rastreio')
    expect(needsActionRule(b)).toBe(b.rule)
  })
})

describe('toPostgrestFilter — a forma do `.or()`', () => {
  it.each([
    ['aguardando', 'material_status.eq.aguardando_material'],
    ['a-separar', `and(status.eq.paid,material_status.in.(${NAO_SEGURA}))`],
    ['sem-rastreio', 'and(status.eq.shipped,tracking_code.is.null)'],
    ['pix-aguardando', 'and(payment_method.eq.pix,payment_status.eq.pending)'],
  ] as const)('%s ⇒ %s', (id, esperado) => {
    expect(toPostgrestFilter(queueBlock(id).rule)).toBe(esperado)
  })

  it('o "ou" vira `or(…)` aninhado', () => {
    expect(
      toPostgrestFilter([{ any: [{ col: 'status', op: 'is_null' }, { col: 'status', op: 'eq', value: 'paid' }] }]),
    ).toBe('or(status.is.null,status.eq.paid)')
  })

  it('regra vazia lança — nunca um filtro que casa tudo', () => {
    expect(() => toPostgrestFilter([])).toThrow('regra da fila vazia')
  })
})

describe('toSqlPredicate — a forma que a migration carrega byte a byte', () => {
  it.each([
    ['aguardando', "o.material_status = 'aguardando_material'"],
    ['a-separar', "o.status = 'paid' and o.material_status in ('nao_aplicavel', 'material_recebido', 'em_producao')"],
    ['sem-rastreio', "o.status = 'shipped' and o.tracking_code is null"],
    ['pix-aguardando', "o.payment_method = 'pix' and o.payment_status = 'pending'"],
  ] as const)('%s ⇒ %s', (id, esperado) => {
    expect(toSqlPredicate(queueBlock(id).rule)).toBe(esperado)
  })

  it('a união em SQL: cada bloco entre parênteses, o "a separar" com o material nulo, unidos por `or`', () => {
    expect(needsActionSqlPredicate()).toBe(
      "(o.material_status = 'aguardando_material') or " +
        "(o.status = 'paid' and (o.material_status is null or o.material_status in ('nao_aplicavel', 'material_recebido', 'em_producao'))) or " +
        "(o.status = 'shipped' and o.tracking_code is null)",
    )
  })

  it('o alias é parâmetro', () => {
    expect(toSqlPredicate(queueBlock('aguardando').rule, 'x')).toBe("x.material_status = 'aguardando_material'")
  })

  it('alias que não é identificador lança — nada de SQL montado por concatenação livre', () => {
    expect(() => toSqlPredicate(queueBlock('aguardando').rule, 'o; drop')).toThrow('alias inválido')
  })

  it('aspa no valor é dobrada', () => {
    expect(toSqlPredicate([{ col: 'status', op: 'eq', value: "a'b" }])).toBe("o.status = 'a''b'")
  })

  it('regra vazia lança', () => {
    expect(() => toSqlPredicate([])).toThrow('regra da fila vazia')
  })
})

// -------------------------------------------------------------------------------------------
// O painel lê a regra de `core` (lido do disco)
//
// Na T02 este bloco conferia a transcrição de antes (`PRECISA_ACAO_ANTES`, `BLOCOS_ANTES`,
// `TEXTOS_ANTES`) contra o arquivo do painel, que ainda carregava a régua antiga — e passou, com três
// mutantes reinjetados mortos. Na T03 o painel passou a ler daqui, e o bloco virou o que vale dali
// em diante: o painel não tem mais uma escrita própria da regra. A transcrição continua acima, e é
// ela que prende o comportamento de antes.
// -------------------------------------------------------------------------------------------

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../..')
const PAINEL = resolve(ROOT, 'apps/backoffice/src/entities/order/api')
/** Lido e sem comentário (linha e bloco na mesma varredura, CRLF antes — `L-031`). */
const ler = (nome: string): string =>
  readFileSync(resolve(PAINEL, nome), 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

describe('o painel lê a regra da fila de `core` (feature 73)', () => {
  const orderQuery = ler('orderQuery.ts')
  const lista = ler('useAdminOrderList.ts')

  it('âncora: os dois arquivos foram lidos e têm código', () => {
    expect(orderQuery).toContain('export const QUEUE_TILES')
    expect(lista).toContain('const fetchTiles')
  })

  it('a visão "Precisa de ação" é `needsActionOrFilter()`, e nenhuma lista de condições própria', () => {
    expect(orderQuery).toMatch(/const PRECISA_ACAO_OR = needsActionOrFilter\(\)\n/)
    expect(orderQuery).not.toMatch(/material_status\.eq\.aguardando_material/)
    expect(orderQuery).not.toMatch(/tracking_code\.is\.null/)
  })

  it('a lista de material não é declarada no painel', () => {
    expect(orderQuery).not.toMatch(/MATERIAL_NAO_SEGURA_LISTA\s*=/)
    expect(orderQuery).not.toMatch(/\[\s*'nao_aplicavel',\s*'material_recebido'/)
  })

  it('os rótulos dos blocos vêm de `QUEUE_BLOCKS`, e não são escritos no painel', () => {
    expect(orderQuery).toMatch(/QUEUE_TILES: QueueTile\[\] = QUEUE_BLOCKS\.map\(/)
    // O recorte do mapa de cliques até o fim de `QUEUE_TILES`: nenhum `label:`/`hint:` escrito ali.
    // (`MATERIAL_TILES`, logo abaixo, é outra tela e tem os textos dela.)
    const inicio = orderQuery.indexOf('const QUEUE_TILE_APPLY')
    const fim = orderQuery.indexOf('}))', orderQuery.indexOf('export const QUEUE_TILES'))
    expect(inicio).toBeGreaterThan(0)
    expect(fim).toBeGreaterThan(inicio)
    const recorte = orderQuery.slice(inicio, fim)
    expect(recorte).toContain('label: b.label')
    expect(recorte).not.toMatch(/label: '|hint: '/)
  })

  it('o `fetchTiles` conta cada bloco por `toPostgrestFilter(bloco.rule)`, sem cadeia escrita à mão', () => {
    expect(lista).toMatch(/QUEUE_BLOCKS\.map\([\s\S]*?q\.or\(toPostgrestFilter\(bloco\.rule\)\)/)
    expect(lista).not.toMatch(/contar\(q => q\.(eq|in|is)\(/)
  })

  // A idade do mais antigo é o segundo leitor do bloco "Aguardando material" no painel (conserto r1 da
  // verificação): o predicado escrito à mão ao lado de `QUEUE_BLOCKS` seria o segundo dono.
  // A régua recusa o VALOR da fila escrito à mão (`aguardando_material`, em qualquer forma) e a coluna
  // comparada com um LITERAL (`.eq('material_status', '…')`, `material_status.eq.…`). O filtro de
  // material escolhido pela Adri (`q.in('material_status', filters.materialStatuses)`) compara com o
  // que ela marcou na tela, não declara regra de fila, e passa — o sensor prova os dois lados.
  const VOCABULARIO_DA_FILA =
    /aguardando_material|\.(eq|neq|is|in)\(\s*['"`]material_status['"`]\s*,\s*['"`[]|material_status\.(eq|neq|is|in)\./
  const escreveAFilaAMao = (fonte: string) => VOCABULARIO_DA_FILA.test(fonte)

  it('âncora: a consulta da idade do mais antigo foi achada, e monta o filtro pelo bloco `aguardando` de `core`', () => {
    expect(lista).toContain(".select('created_at')")
    expect(lista).toMatch(/\.select\('created_at'\)\s*\.or\(toPostgrestFilter\(queueBlock\('aguardando'\)\.rule\)\)/)
  })

  it('`useAdminOrderList.ts` não escreve `material_status`/`aguardando_material` à mão (fora de comentário)', () => {
    expect(escreveAFilaAMao(lista)).toBe(false)
  })

  it('sensor: a forma antiga (`.eq` à mão) reprova na mesma régua; a prosa num comentário não', () => {
    const antiga = lista.replace(
      ".or(toPostgrestFilter(queueBlock('aguardando').rule))",
      ".eq('material_status', 'aguardando_material')",
    )
    expect(antiga).not.toBe(lista) // o alvo existe: a mutação mudou o texto
    expect(escreveAFilaAMao(antiga)).toBe(true)
    expect(escreveAFilaAMao(".or('material_status.eq.aguardando_material')")).toBe(true)
    expect(escreveAFilaAMao(".eq(\"aguardando_material\")")).toBe(true)
    expect(escreveAFilaAMao(".in('material_status', ['aguardando_material', 'material_enviado'])")).toBe(true)
    expect(escreveAFilaAMao(".neq('material_status', 'nao_aplicavel')")).toBe(true)
    expect(escreveAFilaAMao(".or(toPostgrestFilter(queueBlock('aguardando').rule))")).toBe(false)
    // O inverso: o filtro da tela (valor vindo da Adri) não é acusado — e ele está mesmo no arquivo.
    expect(lista).toContain("q.in('material_status', filters.materialStatuses)")
    expect(escreveAFilaAMao("q = q.in('material_status', filters.materialStatuses)")).toBe(false)
    // `ler()` remove comentário antes de medir: a prosa que explica a regra não é acusada.
    expect(lista).not.toContain('nunca o predicado escrito de novo')
  })
})
