// As regras puras da listagem de pedidos — o que se pode errar sem que nenhuma tela quebre.
//
// Cada bloco guarda uma decisão que a feature 34 tomou por escrito. Uma regra dessas trocada não
// derruba build, tipo nem render: ela só faz a tela responder a pergunta errada, com confiança.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it, vi } from 'vitest'
import {
  activeOrderFilterCount, clearFiltersLabel, buildOrderSearchCondition, emptyOrderFilters,
  ORDER_SEARCH_COLUMNS, QUEUE_TILES, queueSince, rowQueueAge, viewPredicate,
  type AdminOrderRow,
} from '@/entities/order/api/orderQuery'
import { buildOrderChips } from '../filterChips'
import { runMaterialBulk, bulkSummary, BULK_LIMIT } from '../bulkMaterial'
import { rowSummary } from '../rowSummary'
import { chargeMaterialText, chargeMaterialUrl, whatsappNumber } from '../chargeMaterial'

let seq = 0
const row = (over: Partial<AdminOrderRow> = {}): AdminOrderRow => ({
  id: `o${++seq}`,
  order_number: `10${seq}`,
  customer_id: 'c1',
  customer_name: 'Luciana Prado',
  customer_email: 'lu@example.com',
  status: 'paid',
  payment_status: 'approved',
  payment_method: 'pix',
  total: 100,
  tracking_code: null,
  material_tracking_code: null,
  material_status: 'aguardando_material',
  material_received_at: null,
  created_at: '2026-08-20T00:00:00Z',
  notes: null,
  purchase_ordinal: 1,
  customer_phone: null,
  ...over,
})

describe('activeOrderFilterCount — o defeito do "Limpar filtros" (PED-04)', () => {
  it('conta status e material, que o botão antigo ignorava', () => {
    const base = emptyOrderFilters()

    expect(activeOrderFilterCount(base)).toBe(0)
    expect(activeOrderFilterCount({ ...base, statuses: ['paid'] })).toBe(1)
    expect(activeOrderFilterCount({ ...base, materialStatuses: ['aguardando_material'] })).toBe(1)
  })

  it('conta a busca, que também esconde linhas', () => {
    expect(activeOrderFilterCount(emptyOrderFilters(), '  ')).toBe(0)
    expect(activeOrderFilterCount(emptyOrderFilters(), '1042')).toBe(1)
  })

  it('`Precisa de ação` e `Tudo` NÃO contam — as outras visões sim', () => {
    // As duas não são recorte: a padrão e a que não esconde nada. As outras quatro escondem linhas
    // e precisam entrar no "limpar", senão limpar deixaria a lista filtrada.
    const base = emptyOrderFilters()
    expect(activeOrderFilterCount({ ...base, view: 'precisa-acao' })).toBe(0)
    expect(activeOrderFilterCount({ ...base, view: 'tudo' })).toBe(0)
    expect(activeOrderFilterCount({ ...base, view: 'fila-material' })).toBe(1)
    expect(activeOrderFilterCount({ ...base, view: 'concluidos' })).toBe(1)
  })

  it('o rótulo do botão concorda em número', () => {
    expect(clearFiltersLabel(1)).toBe('Limpar 1 filtro')
    expect(clearFiltersLabel(3)).toBe('Limpar os 3')
  })
})

describe('a busca alcança as cinco colunas (PED-10)', () => {
  it('inclui e-mail e os DOIS rastreios', () => {
    // As três que faltavam são justamente as que se tem em mãos ao procurar alguém.
    expect([...ORDER_SEARCH_COLUMNS]).toEqual([
      'order_number', 'customer_name', 'customer_email', 'tracking_code', 'material_tracking_code',
    ])
  })

  it('monta um `or=` com as cinco', () => {
    const cond = buildOrderSearchCondition('1042')
    expect(cond).toBe(
      'order_number.ilike.%1042%,customer_name.ilike.%1042%,customer_email.ilike.%1042%,' +
        'tracking_code.ilike.%1042%,material_tracking_code.ilike.%1042%',
    )
  })

  it('termo vazio não vira condição', () => {
    expect(buildOrderSearchCondition('')).toBeNull()
    expect(buildOrderSearchCondition('   ')).toBeNull()
  })

  it('vírgula e parêntese são neutralizados — eles fecham o `or=()`', () => {
    // Sem escapar, buscar por `Maria, a de cinzas` viraria três condições quebradas.
    expect(buildOrderSearchCondition('Maria, (Lu)')).toContain('Maria   Lu')
  })
})

describe('`Precisa de ação` é a união dos TRÊS acionáveis (D4)', () => {
  const predicado = viewPredicate('precisa-acao')!

  it('cobre o que espera material, o que está pago a separar, e o enviado sem rastreio', () => {
    expect(predicado.or).toContain('material_status.eq.aguardando_material')
    expect(predicado.or).toContain('status.eq.paid')
    expect(predicado.or).toContain('and(status.eq.shipped,tracking_code.is.null)')
  })

  it('NÃO inclui o Pix pendente — ele expira sozinho e não é fila', () => {
    // Somá-lo faria a Adri olhar 19 pendências e achar que deve algo a mais 7 pessoas.
    expect(predicado.or).not.toContain('payment_method.eq.pix')
    expect(predicado.or).not.toContain('payment_status.eq.pending')
  })

  it('`Tudo` não filtra nada', () => {
    expect(viewPredicate('tudo')).toBeNull()
  })

  it('`Concluídos` inclui cancelado — é fim de linha, não sucesso', () => {
    expect(viewPredicate('concluidos')!.in!.status).toEqual(['delivered', 'cancelled'])
  })
})

describe('os quatro tiles (PED-12)', () => {
  it('só o primeiro tem acento — um acento por tela', () => {
    expect(QUEUE_TILES.filter(t => t.accent)).toHaveLength(1)
    expect(QUEUE_TILES[0].id).toBe('aguardando')
  })

  it('o de Pix declara que NÃO é fila', () => {
    const pix = QUEUE_TILES.find(t => t.id === 'pix-aguardando')!
    expect(pix.hint).toBe('Expiram sozinhos — nada a fazer')
  })

  it('cada tile aplica um filtro que se desfaz', () => {
    const base = emptyOrderFilters()
    for (const tile of QUEUE_TILES) {
      const aplicado = tile.apply(base)
      expect(activeOrderFilterCount(aplicado)).toBeGreaterThan(0)
    }
  })
})

describe('queueSince — de quando o relógio corre', () => {
  it('antes de o envelope chegar, corre desde a compra', () => {
    expect(queueSince({ created_at: '2026-08-20T00:00:00Z', material_received_at: null })).toBe(
      '2026-08-20T00:00:00Z',
    )
  })

  it('depois que chega, corre desde o recebimento', () => {
    // Continuar contando desde a compra faria um pedido recém-recebido nascer vermelho.
    expect(
      queueSince({ created_at: '2026-08-01T00:00:00Z', material_received_at: '2026-08-27T00:00:00Z' }),
    ).toBe('2026-08-27T00:00:00Z')
  })

  it('pedido sem material não tem idade de fila', () => {
    expect(rowQueueAge(row({ material_status: 'nao_aplicavel' }))).toBeNull()
  })
})

describe('os chips dizem e desfazem cada filtro (PED-15)', () => {
  it('um chip por eixo ativo', () => {
    const chips = buildOrderChips(
      { ...emptyOrderFilters(), view: 'fila-material', statuses: ['paid'], semRastreio: true },
      'lu',
    )

    expect(chips.map(c => c.key).sort()).toEqual(['search', 'sem-rastreio', 'status', 'view'])
  })

  it('o `clear` do chip remove só o eixo dele', () => {
    const filtros = { ...emptyOrderFilters(), statuses: ['paid'], semRastreio: true }
    const chip = buildOrderChips(filtros).find(c => c.key === 'status')!

    const depois = chip.clear(filtros)
    expect(depois.statuses).toEqual([])
    expect(depois.semRastreio).toBe(true)
  })

  it('muitos estados de material viram um chip resumido, não seis', () => {
    const chips = buildOrderChips({
      ...emptyOrderFilters(),
      materialStatuses: ['aguardando_material', 'material_enviado', 'material_recebido', 'em_producao'],
    })

    expect(chips.find(c => c.key === 'material')!.label).toBe('Material: na fila (4 estados)')
  })

  it('o chip da busca devolve os filtros INTACTOS — a busca não mora neles', () => {
    const filtros = { ...emptyOrderFilters(), statuses: ['paid'] }
    const chip = buildOrderChips(filtros, 'lu').find(c => c.key === 'search')!

    expect(chip.clear(filtros)).toEqual(filtros)
  })

  it('sem filtro nenhum, nenhum chip', () => {
    expect(buildOrderChips(emptyOrderFilters(), '')).toEqual([])
  })
})

describe('o lote de material não aborta (PED-17, D5)', () => {
  it('uma RPC por linha — não existe RPC de lote', () => {
    // Inventar uma seria uma segunda máquina de estado, que divergiria da guarda do `where`.
    const transition = vi.fn().mockResolvedValue({ ok: true, reason: null })
    return runMaterialBulk([row(), row(), row()], 'material_recebido', transition).then(() => {
      expect(transition).toHaveBeenCalledTimes(3)
    })
  })

  it('separa RECUSA de FALHA — são coisas diferentes', async () => {
    const transition = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, reason: null })
      .mockResolvedValueOnce({ ok: false, reason: 'invalid_transition' })
      .mockResolvedValueOnce({ ok: false, reason: 'rpc_failed' })

    const r = await runMaterialBulk([row(), row(), row()], 'material_recebido', transition)

    expect(r).toMatchObject({ changed: 1, refused: 1, failed: 1 })
  })

  it('uma exceção não encerra o laço', async () => {
    const transition = vi
      .fn()
      .mockRejectedValueOnce(new Error('rede caiu'))
      .mockResolvedValue({ ok: true, reason: null })

    const r = await runMaterialBulk([row(), row(), row()], 'material_recebido', transition)

    expect(transition).toHaveBeenCalledTimes(3)
    expect(r.changed).toBe(2)
    expect(r.failed).toBe(1)
  })

  it('nomeia os pedidos que não passaram — "2 não passaram" não é acionável', async () => {
    const transition = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, reason: 'invalid_transition' })
      .mockResolvedValue({ ok: true, reason: null })

    const r = await runMaterialBulk([row({ order_number: '999' }), row()], 'material_recebido', transition)

    expect(r.refusedOrders).toEqual(['999'])
  })

  it('respeita o teto de 50 por lote', async () => {
    const transition = vi.fn().mockResolvedValue({ ok: true, reason: null })
    const muitos = Array.from({ length: 80 }, () => row())

    await runMaterialBulk(muitos, 'material_recebido', transition)

    expect(transition).toHaveBeenCalledTimes(BULK_LIMIT)
  })
})

describe('bulkSummary — o resumo omite o que é zero', () => {
  it('"7 marcadas · 2 não estavam em estado que permite"', () => {
    expect(
      bulkSummary({ changed: 7, refused: 2, failed: 0, refusedOrders: [], failedOrders: [] }),
    ).toBe('7 marcadas · 2 não estavam em estado que permite')
  })

  it('não escreve "0 recusadas" — faz procurar problema que não existe', () => {
    expect(
      bulkSummary({ changed: 7, refused: 0, failed: 0, refusedOrders: [], failedOrders: [] }),
    ).toBe('7 marcadas')
  })

  it('singular e plural concordam', () => {
    expect(
      bulkSummary({ changed: 1, refused: 1, failed: 0, refusedOrders: [], failedOrders: [] }),
    ).toBe('1 marcada · 1 não estava em estado que permite')
  })

  it('lote sem efeito diz isso, e não uma string vazia', () => {
    expect(
      bulkSummary({ changed: 0, refused: 0, failed: 0, refusedOrders: [], failedOrders: [] }),
    ).toBe('Nada mudou')
  })
})

describe('rowSummary — a ação primária de cada estado (D8)', () => {
  it('o material vem antes do status: pago há duas semanas ainda espera o envelope', () => {
    const r = rowSummary(row({ status: 'paid', material_status: 'aguardando_material' }))
    expect(r.action).toBe('registrar-recebimento')
    expect(r.blocker).toBe('Esperando o envelope da cliente')
  })

  it('enviado sem código é FALHA, não espera', () => {
    const r = rowSummary(row({ status: 'shipped', material_status: 'nao_aplicavel', tracking_code: null }))
    expect(r.action).toBe('salvar-rastreio')
    expect(r.blocker).toBe('Sem código — a cliente não foi avisada')
  })

  it('Pix pendente NÃO oferece ação — ele expira sozinho', () => {
    const r = rowSummary(row({ status: 'pending', payment_method: 'pix', material_status: 'nao_aplicavel' }))
    expect(r.action).toBe('nenhuma')
    expect(r.actionLabel).toBe('')
    expect(r.blocker).toBe('Pix aguardando — expira sozinho')
  })

  it('pago com material na bancada vai para a separação', () => {
    const r = rowSummary(row({ status: 'paid', material_status: 'material_recebido' }))
    expect(r.action).toBe('separar')
  })
})

describe('cobrar material — o rascunho, nunca o envio (Out of Scope)', () => {
  it('sem urgência fabricada e sem contagem regressiva', () => {
    const texto = chargeMaterialText(row())

    for (const proibido of ['última chance', 'urgente', 'prazo final', 'expira em']) {
      expect(texto.toLowerCase()).not.toContain(proibido)
    }
    expect(texto).toContain('Sem pressa nenhuma.')
  })

  it('não NOMEIA o material — `material_kinds` diz menos que a descrição (BL-015)', () => {
    const texto = chargeMaterialText(row())
    expect(texto).not.toMatch(/cinzas|leite|cabelo|dente/i)
    expect(texto).toContain('o material')
  })

  it('quem já postou recebe outro texto, e não uma cobrança', () => {
    const texto = chargeMaterialText(row({ material_status: 'material_enviado' }))
    expect(texto).toContain('já postou')
    expect(texto).not.toContain('esperando o material chegar para começar')
  })

  it('usa o primeiro nome', () => {
    expect(chargeMaterialText(row({ customer_name: 'Luciana Prado' }))).toContain('Oi, Luciana!')
  })

  it('o número ganha o 55 quando falta, e é recusado quando é curto demais', () => {
    expect(whatsappNumber('(51) 99918-4227')).toBe('5551999184227')
    expect(whatsappNumber('5551999184227')).toBe('5551999184227')
    expect(whatsappNumber('1234')).toBeNull()
    expect(whatsappNumber(null)).toBeNull()
  })
})

describe('a cobrança por WhatsApp usa o telefone DO PEDIDO (ESP-24)', () => {
  it('pedido com telefone gera link COM número', () => {
    const url = chargeMaterialUrl(row({ customer_phone: '5551993913065' }), '5551993913065')
    expect(url).toMatch(/^https:\/\/wa\.me\/5551993913065\?text=/)
  })

  it('pedido sem telefone continua caindo no wa.me sem número', () => {
    // Não é defeito: é o caminho de quem comprou antes de a coluna existir. O botão segue útil —
    // abre o app com o texto pronto para a conversa que a Adri escolher.
    expect(chargeMaterialUrl(row({ customer_phone: null }), null)).toMatch(/^https:\/\/wa\.me\/\?text=/)
  })

  it('GUARDA: nenhum chamador esquece de passar o telefone', () => {
    // O defeito que este teste existe para impedir foi encontrado em NAVEGADOR, não em teste: a
    // coluna estava gravada, o teste da coluna passava, e os três `chargeMaterialUrl(o)` da tela
    // ignoravam o telefone — todo link saía sem número, em silêncio.
    // `process.cwd()` e não `import.meta.url`: sob jsdom a URL do módulo não é `file:`, e
    // `readFileSync` recusa. O vitest do backoffice roda a partir de `apps/backoffice`.
    const fonte = readFileSync(
      resolve(process.cwd(), 'src/pages/admin/AdminOrdersPage.tsx'),
      'utf8',
    )
    // Âncora: caminho errado leria string vazia e o `for` não executaria — passando em verde.
    expect(fonte.length).toBeGreaterThan(1000)
    const chamadas = fonte.match(/chargeMaterialUrl\([^)]*\)/g) ?? []
    expect(chamadas.length).toBeGreaterThanOrEqual(3)
    for (const chamada of chamadas) expect(chamada).toMatch(/customer_phone/)
  })
})
