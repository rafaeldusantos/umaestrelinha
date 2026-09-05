import fs from 'node:fs'

import { describe, expect, it } from 'vitest'

import { lerVendas } from '../../csv/parse.ts'
import { aplicarRecorte } from '../../csv/recorte.ts'
import { type ProdutoLocal, type VariacaoLocal, buildIndex } from '../catalogMatch.ts'
import { emailDoPedido, mapOrder, mapPaymentMethod, materialDoPedido } from '../order.ts'

/**
 * O snapshot do pedido, sobre a fixture sintética.
 *
 * O catálogo de teste casa **dois** dos nomes da fixture de propósito: o resto fica órfão, que é o
 * caso majoritário do arquivo real (49,2% dos itens) e precisa de cobertura tanto quanto o casado.
 */

const P_JOIA: ProdutoLocal = {
  id: 'uuid-joia', name: 'Joia Afetiva de Teste', nuvemshop_id: 1,
  requires_material: true, material_kinds: ['cinzas'],
}
const P_CORRENTE: ProdutoLocal = {
  id: 'uuid-corrente', name: 'Corrente de Teste em Aço Inoxidável', nuvemshop_id: 2,
  requires_material: false, material_kinds: [],
}
const V_JOIA: VariacaoLocal = {
  id: 'uuid-var-joia', product_id: 'uuid-joia', sku: 'TESTE-01',
  option_values: { Material: 'Folheado a ouro (Prata 925)' },
}

const index = buildIndex([P_JOIA, P_CORRENTE], [V_JOIA])

const pedidos = aplicarRecorte(
  lerVendas(fs.readFileSync(new URL('../../__fixtures__/vendas.csv', import.meta.url))),
).dentro

const porNumero = (n: number) => {
  const p = pedidos.find(x => x.numero === n)
  if (!p) throw new Error(`fixture sem pedido ${n}`)
  return mapOrder(p, index)
}

describe('âncora', () => {
  it('mapeou os 7 pedidos do recorte da fixture', () => {
    expect(pedidos).toHaveLength(7)
    expect(pedidos.map(p => mapOrder(p, index).order.nuvemshop_id).filter(Boolean)).toHaveLength(7)
  })
})

describe('o snapshot vem da origem, não do catálogo de hoje', () => {
  const m = porNumero(135)

  it('`created_at` é a data do pedido, não a do import', () => {
    expect(m.order.created_at).toBe('2026-07-14T13:10:29-03:00')
  })

  it('o dinheiro é o da época e o total fecha com a origem', () => {
    expect(m.order.subtotal).toBe(359.8)
    expect(m.order.discount).toBe(31.98)
    expect(m.order.total).toBe(327.82)
  })

  it('a soma dos itens fecha com o subtotal', () => {
    const soma = m.items.reduce((a, i) => a + i.unit_price * i.quantity, 0)
    expect(Math.abs(soma - m.order.subtotal)).toBeLessThan(0.011)
  })

  it('`order_number` ganha o prefixo NS-, que não colide com o NP- da loja', () => {
    expect(m.order.order_number).toBe('NS-135')
  })

  it('o recado da CLIENTE vai para `orders.notes`', () => {
    expect(m.order.notes).toBe('Ela pediu: "com brilho"; sem corrente')
  })

  it('a proveniência guarda os três eixos crus, em português', () => {
    expect(m.order.nuvemshop_status).toBe('Aberto')
    expect(m.order.nuvemshop_payment_status).toBe('Confirmado')
    expect(m.order.nuvemshop_shipping_status).toBe('Não está embalado')
    expect(m.order.nuvemshop_id).toBe(2018794574)
  })

  it('o pedido nasce SEM `customer_id` — a pessoa é derivada pela view (AD-023)', () => {
    expect(m.order.customer_id).toBeNull()
  })

  it('o contato entra no próprio pedido', () => {
    expect(m.order.customer_phone).toBe('5551900000135')
    expect(m.order.customer_document).toBe('22222222222')
  })
})

describe('itens', () => {
  const m = porNumero(135)

  it('o item que casa aponta para o produto e para a variação', () => {
    const casado = m.items[0]
    expect(casado.product_id).toBe('uuid-joia')
    expect(casado.variant_id).toBe('uuid-var-joia')
    expect(casado.price_source).toBe('variant')
    expect(casado.variant_label).toBe('Folheado a ouro (Prata 925)')
    expect(casado.variant_options).toEqual({ Material: 'Folheado a ouro (Prata 925)' })
  })

  it('o item que casa herda a curadoria de material do produto', () => {
    expect(m.items[0].requires_material).toBe(true)
    expect(m.items[0].material_kinds).toEqual(['cinzas'])
  })

  it('o item preserva nome, preço e quantidade da época', () => {
    expect(m.items[0].product_name).toBe('Joia Afetiva de Teste (Folheado a ouro (Prata 925))')
    expect(m.items[0].unit_price).toBe(179.9)
    expect(m.items[0].quantity).toBe(1)
  })

  it('item ÓRFÃO preserva o snapshot e não inventa vínculo', () => {
    const orfao = porNumero(136).items[0]
    expect(orfao.product_id).toBe('nuvemshop:anel de teste com cinzas (prata 925)')
    expect(orfao.variant_id).toBeNull()
    expect(orfao.price_source).toBe('base')
    expect(orfao.product_name).toBe('Anel de Teste com Cinzas (Prata 925)')
    expect(orfao.unit_price).toBe(469.9)
    expect(orfao.requires_material).toBe(false)
  })

  it('os órfãos são REPORTADOS, não descartados em silêncio', () => {
    expect(porNumero(136).orfaos).toEqual([{ nome: 'Anel de Teste com Cinzas (Prata 925)', sugestao: null }])
    expect(porNumero(135).orfaos).toEqual([])
  })

  it('quantidade maior que 1 sobrevive', () => {
    expect(porNumero(139).items[0].quantity).toBe(2)
  })

  it('todo item carrega o id do pedido na origem, para o --reimportar-itens', () => {
    for (const item of m.items) expect(item.nuvemshop_order_id).toBe(2018794574)
  })
})

describe('material — os DOIS cortes', () => {
  it('pago, em aberto e com item que exige material → entra na fila', () => {
    expect(porNumero(135).order.material_status).toBe('aguardando_material')
  })

  it('corte 1 (terminal): entregue NÃO entra na fila, mesmo exigindo material', () => {
    // Sem este corte o pedido ficaria em `aguardando_material` para sempre: a máquina de estado do
    // material não tem estado final.
    expect(materialDoPedido('delivered', 'approved', [
      { requires_material: true, material_kinds: ['cinzas'] },
    ])).toBe('nao_aplicavel')
    expect(materialDoPedido('shipped', 'approved', [
      { requires_material: true, material_kinds: [] },
    ])).toBe('nao_aplicavel')
    expect(materialDoPedido('cancelled', 'approved', [
      { requires_material: true, material_kinds: [] },
    ])).toBe('nao_aplicavel')
  })

  it('corte 2 (pagamento): PIX expirado NÃO entra na fila', () => {
    // Cobrar material de quem não pagou é fila falsa.
    expect(materialDoPedido('pending', 'expired', [
      { requires_material: true, material_kinds: ['cinzas'] },
    ])).toBe('nao_aplicavel')
    expect(porNumero(136).order.material_status).toBe('nao_aplicavel')
  })

  it('SENSOR: sem o corte de pagamento, o pedido expirado ENTRARIA na fila', () => {
    // Prova que o corte 2 é o que decide, e não a ausência de item que exige material. No arquivo
    // real é a diferença entre uma fila de 8 e uma de 4.
    const expirado = porNumero(136)
    expect(expirado.order.payment_status).toBe('expired')
    const semOCorte = materialDoPedido('pending', 'approved', [
      { requires_material: true, material_kinds: ['cinzas'] },
    ])
    expect(semOCorte).toBe('aguardando_material')
  })

  it('sem item que exija material, não entra na fila', () => {
    expect(materialDoPedido('paid', 'approved', [
      { requires_material: false, material_kinds: [] },
    ])).toBe('nao_aplicavel')
  })

  it('material inferido produz nota declarando a inferência', () => {
    const notas = porNumero(135).notes.map(n => n.note)
    expect(notas.some(n => n.includes('INFERIDA'))).toBe(true)
  })

  it('pedido fora da fila não ganha a nota de inferência', () => {
    expect(porNumero(136).notes.some(n => n.note.includes('INFERIDA'))).toBe(false)
  })
})

describe('histórico — só transições DATADAS', () => {
  it('pedido enviado tem criação, pagamento e envio, em ordem', () => {
    const h = porNumero(138).history
    expect(h.map(x => x.to_status)).toEqual(['pending', 'paid', 'shipped'])
    expect(h[0].from_status).toBeNull()
    expect(h[1].from_status).toBe('pending')
    expect(h[2].from_status).toBe('paid')
  })

  it('NÃO sintetiza `delivered` — a origem não data a entrega', () => {
    // Datar a entrega por `Data de envío` seria datar um evento por coluna que não é dele.
    const entregue = porNumero(139)
    expect(entregue.order.status).toBe('delivered')
    expect(entregue.history.map(h => h.to_status)).not.toContain('delivered')
  })

  it('pedido cancelado ganha a linha de cancelamento', () => {
    const h = porNumero(140).history
    expect(h.map(x => x.to_status)).toContain('cancelled')
    expect(h[h.length - 1].to_status).toBe('cancelled')
  })

  it('pedido NÃO cancelado nunca ganha linha de cancelamento', () => {
    for (const n of [135, 138, 139]) {
      expect(porNumero(n).history.map(h => h.to_status)).not.toContain('cancelled')
    }
  })

  it('toda linha declara a origem', () => {
    for (const h of porNumero(138).history) expect(h.note).toBe('Importado da Nuvemshop')
  })

  it('as linhas saem ordenadas por tempo, e nunca retrocedem', () => {
    const datas = porNumero(138).history.map(h => h.created_at)
    expect([...datas].sort()).toEqual(datas)
  })

  it('data SEM HORA não faz o pagamento preceder a criação do pedido', () => {
    // `#138` foi criado às 22:16 e pago no mesmo dia; `Data de pagamento` vem sem hora, então vira
    // meia-noite. Ordenar por timestamp cru poria "pago" ANTES de "recebido" no painel, que funde
    // os três fios por tempo. A linha de pagamento é empurrada para o instante da criação.
    const h = porNumero(138).history
    expect(h[0].created_at).toBe('2026-08-08T22:16:18-03:00')
    expect(h[1].to_status).toBe('paid')
    expect(h[1].created_at).toBe('2026-08-08T22:16:18-03:00')
    expect(h[2].created_at).toBe('2026-08-10T00:00:00-03:00')
  })
})

describe('campos derivados', () => {
  it('o meio de pagamento vira o vocabulário do painel', () => {
    expect(porNumero(135).order.payment_method).toBe('pix')
    expect(porNumero(138).order.payment_method).toBe('credit_card')
    expect(porNumero(140).order.payment_method).toBe('manual')
  })

  it('meio desconhecido cai em `manual`, não em string crua', () => {
    expect(mapPaymentMethod({ meioPagamento: 'A combinar' } as never)).toBe('manual')
    expect(mapPaymentMethod({ meioPagamento: null } as never)).toBe('manual')
  })

  it('o rastreio chega desescapado', () => {
    expect(porNumero(138).order.tracking_code).toBe('AD000000000BR')
    expect(porNumero(135).order.tracking_code).toBeNull()
  })

  it('`cancel_reason` só existe em pedido cancelado', () => {
    expect(porNumero(140).order.cancel_reason).toBe('Venda de teste')
    expect(porNumero(135).order.cancel_reason).toBeNull()
  })

  it('cupom entra como texto e `coupon_id` não é inventado', () => {
    expect(porNumero(135).order.coupon_code).toBe('CUPOMTESTE')
  })

  it('e-mail ausente vira marcador com o id da origem', () => {
    expect(emailDoPedido({ email: '  ', nuvemshopId: 42 } as never))
      .toBe('sem-email+42@importado.invalid')
  })

  it('a tripla observada sai crua para o relatório', () => {
    expect(porNumero(136).observed).toBe('Arquivado | Recusado | Não está embalado')
  })
})

describe('a distribuição do recorte da fixture', () => {
  it('os 7 pedidos produzem os destinos esperados', () => {
    const destinos = pedidos.map(p => mapOrder(p, index).order)
    expect(destinos.map(o => o.status).sort()).toEqual(
      ['cancelled', 'delivered', 'delivered', 'paid', 'pending', 'pending', 'shipped'],
    )
    expect(destinos.map(o => o.payment_status).sort()).toEqual(
      ['approved', 'approved', 'approved', 'approved', 'approved', 'expired', 'rejected'].sort(),
    )
  })

  it('nenhum pedido recebe `separating`', () => {
    expect(pedidos.map(p => mapOrder(p, index).order.status)).not.toContain('separating')
  })
})
