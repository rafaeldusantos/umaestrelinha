import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import type { PedidoVenda } from '../../csv/types.ts'
import {
  ORDER_STATUSES,
  STATUS_ENVIO,
  STATUS_PAGAMENTO,
  STATUS_PEDIDO,
  UnknownVocabularyError,
  describeTriple,
  mapCancelReason,
  mapOrderStatus,
  mapPaymentStatus,
} from '../orderStatus.ts'

/**
 * O de-para, exercido caso a caso.
 *
 * As 5 triplas nomeadas abaixo são as **medidas** nos 35 pedidos importados
 * (`.specs/features/35-clientes-e-pedidos-nuvemshop/medicao.md`). O produto cartesiano cobre as
 * outras 31 combinações que o vocabulário permite e o arquivo de hoje não traz — porque o
 * mapeamento tem de continuar certo numa reexportação.
 */

const pedido = (over: Partial<PedidoVenda> = {}): PedidoVenda => ({
  numero: 165, nuvemshopId: 1, email: 'x@exemplo.invalid', data: '2026-07-14T13:10:29-03:00',
  statusPedido: 'Aberto', statusPagamento: 'Confirmado', statusEnvio: 'Entregue',
  moeda: 'BRL', subtotal: 0, desconto: 0, frete: 0, total: 0,
  nomeComprador: 'Fulana', documento: null, telefone: null,
  endereco: null, numeroEndereco: null, complemento: null, bairro: null,
  cidade: null, cep: null, estado: null, pais: null,
  formaEntrega: null, formaPagamento: null, meioPagamento: null, cupom: null,
  anotacoesComprador: null, anotacoesVendedor: null,
  dataPagamento: null, dataEnvio: null, dataCancelamento: null,
  motivoCancelamento: null, vencimentoPagamento: null,
  rastreio: null, canal: null, parcelas: null, itens: [],
  ...over,
})

// -------------------------------------------------------------------------------------------

describe('o vocabulário do destino não pode divergir do banco', () => {
  it('`ORDER_STATUSES` é igual ao CHECK da migration, lido do disco', () => {
    // Cópia deliberada COM guarda: o importador roda em Node e não pode perguntar ao banco durante
    // o mapeamento, então a lista é copiada — e comparada com a fonte, item a item. Sem isto, um
    // estado novo no CHECK deixaria o de-para produzindo valor recusado pelo banco (AD-012).
    const sql = readFileSync(
      new URL('../../../../../supabase/migrations/20260829120000_34-painel-de-vendas.sql', import.meta.url),
      'utf8',
    )
    const m = sql.match(/CHECK \(status IN \(([^)]+)\)\)/)
    expect(m).not.toBeNull()
    const doBanco = (m as RegExpMatchArray)[1].split(',').map(s => s.trim().replace(/'/g, ''))
    expect([...ORDER_STATUSES]).toEqual(doBanco)
  })
})

describe('as 5 triplas medidas nos 35 pedidos importados', () => {
  const casos: Array<[StatusTriple, string, string]> = [
    [['Aberto', 'Confirmado', 'Entregue'], 'delivered', 'approved'],
    [['Aberto', 'Confirmado', 'Não está embalado'], 'paid', 'approved'],
    [['Aberto', 'Confirmado', 'Enviado'], 'shipped', 'approved'],
    [['Arquivado', 'Recusado', 'Não está embalado'], 'pending', 'expired'],
    [['Arquivado', 'Confirmado', 'Entregue'], 'delivered', 'approved'],
  ]

  for (const [[sp, spg, se], status, pagamento] of casos) {
    it(`${sp} | ${spg} | ${se} → status=${status} payment=${pagamento}`, () => {
      // O `Recusado` medido é sempre PIX vencido: vencimento preenchido, pagamento vazio.
      const p = pedido({
        statusPedido: sp, statusPagamento: spg, statusEnvio: se,
        vencimentoPagamento: spg === 'Recusado' ? '2026-05-28T08:28:20-03:00' : null,
        dataPagamento: spg === 'Confirmado' ? '2026-05-28T00:00:00-03:00' : null,
      })
      expect(mapOrderStatus(p)).toBe(status)
      expect(mapPaymentStatus(p)).toBe(pagamento)
    })
  }
})

describe('pagamento', () => {
  it('Confirmado → approved', () => {
    expect(mapPaymentStatus(pedido({ statusPagamento: 'Confirmado' }))).toBe('approved')
  })

  it('Pendente → pending', () => {
    expect(mapPaymentStatus(pedido({ statusPagamento: 'Pendente' }))).toBe('pending')
  })

  it('Recusado com vencimento e SEM pagamento → expired (PIX que venceu)', () => {
    expect(mapPaymentStatus(pedido({
      statusPagamento: 'Recusado',
      vencimentoPagamento: '2026-05-28T08:28:20-03:00',
      dataPagamento: null,
    }))).toBe('expired')
  })

  it('Recusado SEM vencimento → rejected (cartão negado)', () => {
    // Não ocorre no recorte de hoje — os 2 do arquivo estão na faixa da loja anterior. O ramo existe
    // porque o mapeamento tem de continuar certo numa reexportação.
    expect(mapPaymentStatus(pedido({
      statusPagamento: 'Recusado',
      vencimentoPagamento: null,
      parcelas: 3,
    }))).toBe('rejected')
  })

  it('Recusado com vencimento E com pagamento → rejected, não expired', () => {
    // Se o dinheiro entrou e depois foi recusado, não foi o relógio que matou o pedido.
    expect(mapPaymentStatus(pedido({
      statusPagamento: 'Recusado',
      vencimentoPagamento: '2026-05-28T08:28:20-03:00',
      dataPagamento: '2026-05-28T00:00:00-03:00',
    }))).toBe('rejected')
  })
})

describe('faixa de operação', () => {
  it('Cancelado vence os outros dois eixos', () => {
    for (const envio of STATUS_ENVIO) {
      for (const pag of STATUS_PAGAMENTO) {
        expect(mapOrderStatus(pedido({
          statusPedido: 'Cancelado', statusEnvio: envio, statusPagamento: pag,
          vencimentoPagamento: '2026-01-01T00:00:00-03:00',
        }))).toBe('cancelled')
      }
    }
  })

  it('Entregue e Enviado decidem sozinhos, mesmo sem pagamento confirmado', () => {
    expect(mapOrderStatus(pedido({ statusEnvio: 'Entregue', statusPagamento: 'Pendente' }))).toBe('delivered')
    expect(mapOrderStatus(pedido({ statusEnvio: 'Enviado', statusPagamento: 'Pendente' }))).toBe('shipped')
  })

  it('`Pronto para enviar` NÃO vira `shipped` — a peça não saiu', () => {
    expect(mapOrderStatus(pedido({ statusEnvio: 'Pronto para enviar', statusPagamento: 'Confirmado' }))).toBe('paid')
  })

  it('sem envio resolvido, quem decide é o pagamento', () => {
    expect(mapOrderStatus(pedido({ statusEnvio: 'Não está embalado', statusPagamento: 'Confirmado' }))).toBe('paid')
    expect(mapOrderStatus(pedido({ statusEnvio: 'Não está embalado', statusPagamento: 'Pendente' }))).toBe('pending')
  })
})

describe('`separating` nunca é produzido — o produto cartesiano inteiro', () => {
  it('nenhuma das 36 combinações do vocabulário produz `separating`', () => {
    // A origem não tem estado que signifique "estou montando agora". Produzi-lo poria histórico
    // morto na visão "A separar" do painel.
    const produzidos = new Set<string>()
    let combinacoes = 0
    for (const sp of STATUS_PEDIDO) {
      for (const spg of STATUS_PAGAMENTO) {
        for (const se of STATUS_ENVIO) {
          for (const vencido of [true, false]) {
            combinacoes += 1
            produzidos.add(mapOrderStatus(pedido({
              statusPedido: sp, statusPagamento: spg, statusEnvio: se,
              vencimentoPagamento: vencido ? '2026-01-01T00:00:00-03:00' : null,
            })))
          }
        }
      }
    }
    expect(combinacoes).toBe(72)
    expect(produzidos.has('separating')).toBe(false)
    expect([...produzidos].sort()).toEqual(['cancelled', 'delivered', 'paid', 'pending', 'shipped'])
  })
})

describe('valor fora do vocabulário ABORTA', () => {
  it('SENSOR: um `Status do Envio` inventado derruba, nomeando valor e pedido', () => {
    const p = pedido({ statusEnvio: 'Teletransportado' as never, numero: 168 })
    expect(() => mapOrderStatus(p)).toThrow(UnknownVocabularyError)
    expect(() => mapOrderStatus(p)).toThrow(/pedido 168.*"Status do Envio".*"Teletransportado"/s)
  })

  it('um `Status do Pagamento` inventado derruba', () => {
    expect(() => mapPaymentStatus(pedido({ statusPagamento: 'Estornado' as never })))
      .toThrow(/"Status do Pagamento" trouxe "Estornado"/)
  })

  it('um `Status do Pedido` inventado derruba', () => {
    expect(() => mapOrderStatus(pedido({ statusPedido: 'Rascunho' as never })))
      .toThrow(/"Status do Pedido" trouxe "Rascunho"/)
  })

  it('a mensagem lista o vocabulário conhecido, para quem lê saber o que era esperado', () => {
    expect(() => mapOrderStatus(pedido({ statusEnvio: 'x' as never })))
      .toThrow(/Não está embalado, Pronto para enviar, Enviado, Entregue/)
  })
})

describe('auditoria', () => {
  it('`describeTriple` devolve a tripla crua, como veio', () => {
    expect(describeTriple(pedido({
      statusPedido: 'Arquivado', statusPagamento: 'Recusado', statusEnvio: 'Não está embalado',
    }))).toBe('Arquivado | Recusado | Não está embalado')
  })

  it('`mapCancelReason` só devolve motivo quando o pedido está cancelado', () => {
    expect(mapCancelReason(pedido({ statusPedido: 'Cancelado', motivoCancelamento: 'Venda de teste' })))
      .toBe('Venda de teste')
    expect(mapCancelReason(pedido({ statusPedido: 'Aberto', motivoCancelamento: 'Venda de teste' })))
      .toBeNull()
  })
})

type StatusTriple = [
  (typeof STATUS_PEDIDO)[number],
  (typeof STATUS_PAGAMENTO)[number],
  (typeof STATUS_ENVIO)[number],
]
