import { describe, expect, it } from 'vitest'

import { createReport } from '../../report.ts'
import type { DbLike } from '../db.ts'
import { planFaqSeed, writeFaqs, type ExistingFaq, type FaqSeedProduct } from '../faqs.ts'

/**
 * `FAQ-20`, `FAQ-24`, `FAQ-25`, `FAQ-26` — a semente das perguntas frequentes.
 *
 * As descrições dos casos são recortes **reais** do catálogo: a diferença entre os dois arranjos de
 * HTML já é coberta em `@estrelinha/core/faq`, e aqui o que se mede é o plano — resposta padrão,
 * idempotência e preservação de curadoria.
 */

const descricao = (pares: Array<[string, string]>): string =>
  '<h2>Peça</h2><p>Texto.</p><h3>Perguntas frequentes</h3>' +
  pares.map(([p, r]) => `<p><strong>${p}</strong><br />${r}</p>`).join('') +
  '<h3>Observações importantes</h3><ul><li>Ilustrativa.</li></ul>'

const produto = (id: string, pares: Array<[string, string]>): FaqSeedProduct => ({
  id,
  description: descricao(pares),
})

const SEM_BIBLIOTECA: ExistingFaq[] = []
const SEM_VINCULO = new Set<string>()

// ---------------------------------------------------------------------------------------------
// A resposta padrão
// ---------------------------------------------------------------------------------------------

describe('planFaqSeed — a resposta padrão é a MAIS FREQUENTE', () => {
  it('escolhe a resposta que mais aparece, não a primeira', () => {
    const plano = planFaqSeed(
      [
        produto('p1', [['Quais materiais posso usar nessa joia?', 'Só cinzas.']]),
        produto('p2', [['Quais materiais posso usar nessa joia?', 'Leite materno ou cabelo.']]),
        produto('p3', [['Quais materiais posso usar nessa joia?', 'Leite materno ou cabelo.']]),
      ],
      SEM_BIBLIOTECA,
      SEM_VINCULO,
    )

    expect(plano.entradas).toHaveLength(1)
    expect(plano.entradas[0].answer).toBe('Leite materno ou cabelo.')
  })

  it('quem usa o padrão fica sem resposta própria; quem diverge recebe a dele', () => {
    const plano = planFaqSeed(
      [
        produto('p1', [['Quais materiais?', 'Só cinzas.']]),
        produto('p2', [['Quais materiais?', 'Leite ou cabelo.']]),
        produto('p3', [['Quais materiais?', 'Leite ou cabelo.']]),
      ],
      SEM_BIBLIOTECA,
      SEM_VINCULO,
    )

    const porProduto = new Map(plano.vinculos.map(v => [v.product_id, v.answer_override]))
    expect(porProduto.get('p1')).toBe('Só cinzas.')
    expect(porProduto.get('p2')).toBeNull()
    expect(porProduto.get('p3')).toBeNull()
  })

  // A ordem dos produtos que a API devolve não é estável entre execuções.
  it('o empate é resolvido pela resposta alfabeticamente menor, e não pela ordem de chegada', () => {
    const a = planFaqSeed(
      [produto('p1', [['P?', 'Zebra.']]), produto('p2', [['P?', 'Abacate.']])],
      SEM_BIBLIOTECA,
      SEM_VINCULO,
    )
    const b = planFaqSeed(
      [produto('p2', [['P?', 'Abacate.']]), produto('p1', [['P?', 'Zebra.']])],
      SEM_BIBLIOTECA,
      SEM_VINCULO,
    )

    expect(a.entradas[0].answer).toBe('Abacate.')
    expect(b.entradas[0].answer).toBe('Abacate.')
  })
})

// ---------------------------------------------------------------------------------------------
// Deduplicação e ordem
// ---------------------------------------------------------------------------------------------

describe('planFaqSeed — a biblioteca', () => {
  it('a mesma pergunta em grafias diferentes vira UMA entrada', () => {
    const plano = planFaqSeed(
      [
        produto('p1', [['As joias s&atilde;o realmente feitas &agrave; m&atilde;o?', 'Só a parte da resina.']]),
        produto('p2', [['As joias são realmente feitas à mão?', 'Só a parte da resina.']]),
      ],
      SEM_BIBLIOTECA,
      SEM_VINCULO,
    )

    expect(plano.entradas).toHaveLength(1)
    expect(plano.vinculos).toHaveLength(2)
  })

  it('a pergunta guardada vem decodificada, não com entidade', () => {
    const plano = planFaqSeed(
      [produto('p1', [['Quanto custa a m&atilde;o de obra?', 'Está no preço.']])],
      SEM_BIBLIOTECA,
      SEM_VINCULO,
    )

    expect(plano.entradas[0].question).toBe('Quanto custa a mão de obra?')
    expect(plano.entradas[0].question).not.toContain('&')
  })

  it('a ordem dos vínculos reproduz a ordem dos pares na descrição', () => {
    const plano = planFaqSeed(
      [produto('p1', [['Primeira?', 'Uma.'], ['Segunda?', 'Duas.'], ['Terceira?', 'Três.']])],
      SEM_BIBLIOTECA,
      SEM_VINCULO,
    )

    expect(plano.vinculos.map(v => v.position)).toEqual([0, 1, 2])
    expect(plano.entradas.map(e => e.question)).toEqual(['Primeira?', 'Segunda?', 'Terceira?'])
  })
})

// ---------------------------------------------------------------------------------------------
// Idempotência e curadoria
// ---------------------------------------------------------------------------------------------

describe('planFaqSeed — não desfaz curadoria e não duplica', () => {
  it('produto que já tem vínculo é PULADO por inteiro', () => {
    const plano = planFaqSeed(
      [produto('p1', [['P?', 'R.']]), produto('p2', [['Q?', 'S.']])],
      SEM_BIBLIOTECA,
      new Set(['p1']),
    )

    expect(plano.produtosPulados).toBe(1)
    expect(plano.vinculos.map(v => v.product_id)).toEqual(['p2'])
    expect(plano.entradas.map(e => e.question)).toEqual(['Q?'])
  })

  it('entrada que já existe na biblioteca é reusada, e NÃO reescrita', () => {
    const plano = planFaqSeed(
      [produto('p1', [['P?', 'Resposta nova da origem.']])],
      [{ id: 'faq-existente', question_key: 'p' }],
      SEM_VINCULO,
    )

    expect(plano.entradas).toHaveLength(0)
    expect(plano.vinculos[0].faq_id).toBe('faq-existente')
  })

  it('o vínculo de entrada preexistente leva a resposta da origem como própria', () => {
    // A resposta padrão dela não é relida (para não reescrever nada), então o texto deste produto
    // vai como override. Se coincidir com o padrão, o banco guarda o texto igual — inofensivo, e
    // preferível a reescrever a curadoria da dona.
    const plano = planFaqSeed(
      [produto('p1', [['P?', 'Resposta da origem.']])],
      [{ id: 'faq-existente', question_key: 'p' }],
      SEM_VINCULO,
    )

    expect(plano.vinculos[0].answer_override).toBe('Resposta da origem.')
  })

  // A prova de idempotência sem tocar no banco: o estado depois da primeira execução é a entrada da
  // segunda, e a segunda tem de planejar zero.
  it('o segundo plano, sobre o estado que o primeiro produziu, é VAZIO', () => {
    const produtos = [
      produto('p1', [['P?', 'R.'], ['Q?', 'S.']]),
      produto('p2', [['P?', 'R.']]),
    ]

    const primeiro = planFaqSeed(produtos, SEM_BIBLIOTECA, SEM_VINCULO)
    expect(primeiro.entradas).toHaveLength(2)
    expect(primeiro.vinculos).toHaveLength(3)

    const bibliotecaDepois: ExistingFaq[] = primeiro.entradas.map((e, i) => ({
      id: `faq-${i}`,
      question_key: e.question_key,
    }))
    const comVinculoDepois = new Set(primeiro.vinculos.map(v => v.product_id))

    const segundo = planFaqSeed(produtos, bibliotecaDepois, comVinculoDepois)

    expect(segundo.entradas).toHaveLength(0)
    expect(segundo.vinculos).toHaveLength(0)
    expect(segundo.produtosPulados).toBe(2)
  })
})

/**
 * O defeito que só o dado real produziu: a primeira execução desta etapa contra o catálogo caiu com
 * `duplicate key value violates unique constraint "product_faqs_pkey"` **depois** de gravar 2.500
 * vínculos. Um produto — `Anel Afetivo Aliança com Coto Umbilical em Prata 925` — repete a mesma
 * pergunta na descrição, e a PK composta recusa o lote inteiro.
 */
describe('planFaqSeed — a mesma pergunta repetida no mesmo produto', () => {
  it('gera UM vínculo, não dois', () => {
    const plano = planFaqSeed(
      [produto('p1', [
        ['As joias são realmente feitas à mão?', 'Só a parte da resina.'],
        ['Quanto tempo leva?', '25 dias.'],
        ['As joias são realmente feitas à mão?', 'Só a parte da resina.'],
      ])],
      SEM_BIBLIOTECA,
      SEM_VINCULO,
    )

    expect(plano.vinculos).toHaveLength(2)
    expect(plano.duplicadasNoProduto).toBe(1)
  })

  it('vence a PRIMEIRA aparição, e a `position` fica contígua', () => {
    const plano = planFaqSeed(
      [produto('p1', [
        ['P?', 'Primeira resposta.'],
        ['Q?', 'Outra.'],
        ['P?', 'Segunda resposta, ignorada.'],
      ])],
      SEM_BIBLIOTECA,
      SEM_VINCULO,
    )

    expect(plano.vinculos.map(v => v.position)).toEqual([0, 1])
    expect(plano.vinculos[0].answer_override).toBeNull()
    expect(plano.entradas.find(e => e.question === 'P?')!.answer).toBe('Primeira resposta.')
  })

  it('a repetição vale por grafia: entidade e pontuação não fazem duas perguntas', () => {
    const plano = planFaqSeed(
      [produto('p1', [
        ['As joias s&atilde;o realmente feitas &agrave; m&atilde;o?', 'Só a resina.'],
        ['As joias são realmente feitas à mão', 'Só a resina.'],
      ])],
      SEM_BIBLIOTECA,
      SEM_VINCULO,
    )

    expect(plano.vinculos).toHaveLength(1)
    expect(plano.duplicadasNoProduto).toBe(1)
  })

  it('nenhum par `(product_id, faq_id)` se repete no plano inteiro', () => {
    const plano = planFaqSeed(
      [
        produto('p1', [['P?', 'R.'], ['P?', 'R.'], ['Q?', 'S.']]),
        produto('p2', [['P?', 'R.'], ['P?', 'Outra.']]),
      ],
      SEM_BIBLIOTECA,
      SEM_VINCULO,
    )

    const chaves = plano.vinculos.map(v => `${v.product_id}|${v.question_key}`)
    expect(new Set(chaves).size).toBe(chaves.length)
  })
})

describe('planFaqSeed — bordas', () => {
  it('produto sem bloco de FAQ entra na contagem própria, sem vínculo', () => {
    const plano = planFaqSeed(
      [
        { id: 'p1', description: '<h2>Peça</h2><p>Sem perguntas.</p>' },
        { id: 'p2', description: null },
      ],
      SEM_BIBLIOTECA,
      SEM_VINCULO,
    )

    expect(plano.produtosSemBloco).toBe(2)
    expect(plano.vinculos).toHaveLength(0)
  })

  it('lista de produtos vazia devolve plano vazio', () => {
    const plano = planFaqSeed([], SEM_BIBLIOTECA, SEM_VINCULO)

    expect(plano).toEqual({
      entradas: [],
      vinculos: [],
      produtosPulados: 0,
      produtosSemBloco: 0,
      duplicadasNoProduto: 0,
    })
  })
})

// ---------------------------------------------------------------------------------------------
// A escrita
// ---------------------------------------------------------------------------------------------

interface Operacao {
  tipo: 'select' | 'selectRange' | 'insert' | 'insertMany'
  tabela: string
  payload?: unknown
  faixa?: [number, number]
}

const fakeDb = (existentes: Record<string, Array<Record<string, unknown>>> = {}) => {
  const ops: Operacao[] = []
  let proximoId = 1

  const db: DbLike = {
    from: (tabela: string) => ({
      select: async () => {
        ops.push({ tipo: 'select', tabela })
        return { data: (existentes[tabela] ?? []) as never, error: null }
      },
      selectRange: async (_c: string, from: number, to: number) => {
        ops.push({ tipo: 'selectRange', tabela, faixa: [from, to] })
        return { data: (existentes[tabela] ?? []).slice(from, to + 1) as never, error: null }
      },
      insert: (values: unknown) => {
        ops.push({ tipo: 'insert', tabela, payload: values })
        const id = `uuid-${proximoId++}`
        return {
          select: () => ({
            single: async () => ({
              data: { id, question_key: (values as { question_key: string }).question_key } as never,
              error: null,
            }),
          }),
        }
      },
      insertMany: async (values: readonly unknown[]) => {
        ops.push({ tipo: 'insertMany', tabela, payload: values })
        return { data: null, error: null }
      },
      update: () => ({ eq: async () => ({ data: null, error: null }), in: async () => ({ data: null, error: null }) }),
      delete: () => ({ eq: async () => ({ data: null, error: null }), in: async () => ({ data: null, error: null }) }),
    }),
  }

  return { db, ops }
}

describe('writeFaqs', () => {
  it('grava as entradas e depois os vínculos, com o uuid recém-criado', async () => {
    const { db, ops } = fakeDb()
    const report = createReport()

    const resultado = await writeFaqs([produto('p1', [['P?', 'R.']])], { supabase: db, report })

    expect(resultado.entradasCriadas).toBe(1)
    expect(resultado.vinculosCriados).toBe(1)

    const lote = ops.find(o => o.tipo === 'insertMany')!
    expect(lote.tabela).toBe('product_faqs')
    expect((lote.payload as Array<Record<string, unknown>>)[0]).toEqual({
      product_id: 'p1',
      faq_id: 'uuid-1',
      position: 0,
      answer_override: null,
    })
  })

  // ⚠️ `product_faqs` chega a 3.476 linhas no catálogo real, e `select` simples é truncado em 1.000
  // pelo PostgREST — foi assim que a idempotência do primeiro import real quebrou.
  it('lê o existente com `selectAll` (paginado), nunca com `select` simples', async () => {
    const { db, ops } = fakeDb()
    const report = createReport()

    await writeFaqs([produto('p1', [['P?', 'R.']])], { supabase: db, report })

    const leituras = ops.filter(o => o.tipo === 'select' || o.tipo === 'selectRange')
    expect(leituras.every(o => o.tipo === 'selectRange')).toBe(true)
    expect(leituras.map(o => o.tabela)).toContain('faqs')
    expect(leituras.map(o => o.tabela)).toContain('product_faqs')
  })

  it('todos os objetos do lote têm as MESMAS chaves (PGRST102)', async () => {
    const { db, ops } = fakeDb()
    const report = createReport()

    await writeFaqs(
      [produto('p1', [['P?', 'R.'], ['Q?', 'S.']]), produto('p2', [['P?', 'Outra resposta.']])],
      { supabase: db, report },
    )

    const lote = ops.find(o => o.tipo === 'insertMany')!.payload as Array<Record<string, unknown>>
    const chaves = lote.map(l => Object.keys(l).sort().join(','))

    expect(new Set(chaves).size).toBe(1)
    expect(chaves[0]).toBe('answer_override,faq_id,position,product_id')
  })

  it('`--dry-run` conta o que faria e não grava nada', async () => {
    const { db, ops } = fakeDb()
    const report = createReport()

    const resultado = await writeFaqs([produto('p1', [['P?', 'R.']])], {
      supabase: db,
      report,
      dryRun: true,
    })

    expect(resultado.entradasCriadas).toBe(1)
    expect(resultado.vinculosCriados).toBe(1)
    expect(ops.some(o => o.tipo === 'insert' || o.tipo === 'insertMany')).toBe(false)
  })

  it('produto que já tem vínculo no banco é pulado', async () => {
    const { db } = fakeDb({ product_faqs: [{ product_id: 'p1' }] })
    const report = createReport()

    const resultado = await writeFaqs(
      [produto('p1', [['P?', 'R.']]), produto('p2', [['Q?', 'S.']])],
      { supabase: db, report },
    )

    expect(resultado.produtosPulados).toBe(1)
    expect(resultado.vinculosCriados).toBe(1)
  })

  it('erro de banco vira exceção, e não `data: null` silencioso', async () => {
    const db: DbLike = {
      from: () => ({
        select: async () => ({ data: null, error: { message: 'boom' } }),
        selectRange: async () => ({ data: null, error: { message: 'boom' } }),
        insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
        insertMany: async () => ({ data: null, error: null }),
        update: () => ({ eq: async () => ({ data: null, error: null }), in: async () => ({ data: null, error: null }) }),
        delete: () => ({ eq: async () => ({ data: null, error: null }), in: async () => ({ data: null, error: null }) }),
      }),
    }

    await expect(writeFaqs([produto('p1', [['P?', 'R.']])], { supabase: db, report: createReport() }))
      .rejects.toThrow(/ler perguntas existentes: boom/)
  })
})

describe('writeFaqs — o relatório', () => {
  it('registra os cinco números da etapa', async () => {
    const { db } = fakeDb()
    const report = createReport()

    await writeFaqs(
      [
        produto('p1', [['P?', 'R.'], ['Q?', 'Padrão.']]),
        produto('p2', [['Q?', 'Diferente.']]),
        { id: 'p3', description: '<p>Sem bloco.</p>' },
      ],
      { supabase: db, report },
    )

    expect(report.data().faq).toEqual({
      entradasCriadas: 2,
      vinculosCriados: 3,
      vinculosComRespostaPropria: 1,
      produtosPulados: 0,
      produtosSemBloco: 1,
      duplicadasNoProduto: 0,
    })
  })

  it('os números aparecem no relatório em texto', async () => {
    const { db } = fakeDb()
    const report = createReport()

    await writeFaqs([produto('p1', [['P?', 'R.']])], { supabase: db, report })
    const texto = report.toText()

    expect(texto).toContain('perguntas frequentes:')
    expect(texto).toMatch(/entradas criadas na biblioteca \.+ 1/)
    expect(texto).toMatch(/vínculos criados \.+ 1/)
  })

  // Uma etapa que grava zero de propósito não pode derrubar o código de saída.
  it('a etapa não afeta o `exitCode`', async () => {
    const { db } = fakeDb({ product_faqs: [{ product_id: 'p1' }] })
    const report = createReport()

    await writeFaqs([produto('p1', [['P?', 'R.']])], { supabase: db, report })

    expect(report.exitCode()).toBe(0)
  })
})
