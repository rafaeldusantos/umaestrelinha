import { describe, expect, it } from 'vitest'
import { buildPickSlipHtml, type PickSlipOrder } from '../lib/pickSlip'

/**
 * `PED-30` — a folha de separação como documento próprio.
 *
 * O conteúdo é testado separado do `window.open` de propósito: o que precisa estar certo é **o que
 * vai para o papel**, e isso é uma string.
 */
const pedido = (over: Partial<PickSlipOrder> = {}): PickSlipOrder =>
  ({
    id: 'o1',
    order_number: '1042',
    customer_name: 'Luciana Prado',
    customer_email: 'lu@example.com',
    status: 'paid',
    payment_status: 'approved',
    payment_method: 'pix',
    total: 389,
    tracking_code: null,
    material_tracking_code: 'BR44 9182 3',
    material_status: 'material_recebido',
    material_received_at: null,
    created_at: '2026-08-20T14:32:00Z',
    notes: null,
    customer_id: 'c1',
    address_street: 'Rua Marcelo Gama',
    address_number: '1120',
    address_complement: 'apto 302',
    address_neighborhood: 'São João',
    address_city: 'Porto Alegre',
    address_state: 'RS',
    address_zip: '90540-041',
    items: [
      {
        product_name: 'Pingente Gota',
        quantity: 1,
        variant_label: 'Prata 925 · 18mm',
        engraving_text: 'Sempre comigo, pai.',
        material_kinds: ['cinzas'],
      },
    ],
    ...over,
  }) as PickSlipOrder

describe('a folha carrega o que a bancada precisa', () => {
  const html = buildPickSlipHtml([pedido()])

  it('o número do pedido, os itens e a gravação', () => {
    expect(html).toContain('Pedido #1042')
    expect(html).toContain('Pingente Gota')
    // A gravação é o que não dá para desfazer depois de gravado.
    expect(html).toContain('Gravação: “Sempre comigo, pai.”')
  })

  it('o material esperado e o rastreio DO ENVELOPE', () => {
    expect(html).toContain('Material esperado')
    expect(html).toContain('envelope BR44 9182 3')
  })

  it('o endereço de entrega', () => {
    expect(html).toContain('Rua Marcelo Gama, 1120')
    expect(html).toContain('90540-041')
  })

  it('o recado da cliente entra na folha — a bancada é onde ele importa', () => {
    const comRecado = buildPickSlipHtml([pedido({ notes: 'Embale com cuidado' })])
    expect(comRecado).toContain('Recado da cliente')
    expect(comRecado).toContain('Embale com cuidado')
  })

  it('sem recado, o bloco não aparece vazio', () => {
    expect(html).not.toContain('Recado da cliente')
  })
})

describe('o documento é próprio, e não um print da tela', () => {
  const html = buildPickSlipHtml([pedido()])

  it('não carrega nada do painel — nem sidebar, nem filtros, nem token', () => {
    // `window.print()` imprimia a tela inteira. E um token `--estrelinha-admin-violet` numa laser
    // vira cinza claro, então a folha é preto no branco de propósito.
    expect(html).not.toContain('estrelinha-admin')
    expect(html).not.toContain('Dashboard')
    expect(html).toContain('color: #111')
  })

  it('é um HTML completo, com título e charset', () => {
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('<meta charset="utf-8">')
    expect(html).toContain('lang="pt-BR"')
  })
})

describe('lote gera uma folha por pedido, no mesmo documento', () => {
  it('duas folhas, separadas por quebra de página', () => {
    const html = buildPickSlipHtml([
      pedido({ order_number: '1042' }),
      pedido({ order_number: '1041' }),
    ])

    expect(html).toContain('Pedido #1042')
    expect(html).toContain('Pedido #1041')
    expect(html.match(/class="folha"/g)).toHaveLength(2)
    expect(html).toContain('page-break-after: always')
  })
})

describe('o conteúdo é escapado — o nome vem do que a cliente digitou', () => {
  it('HTML no nome não vira marcação', () => {
    const html = buildPickSlipHtml([pedido({ customer_name: '<script>alert(1)</script>' })])

    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('aspas e & no recado também', () => {
    const html = buildPickSlipHtml([pedido({ notes: 'Cuidado & "frágil"' })])
    expect(html).toContain('Cuidado &amp; &quot;frágil&quot;')
  })
})

describe('degradação sem dado', () => {
  it('pedido sem itens carregados diz isso, e não uma tabela vazia', () => {
    const html = buildPickSlipHtml([pedido({ items: [] })])
    expect(html).toContain('Sem itens carregados')
  })

  it('pedido sem endereço não imprime linhas vazias', () => {
    const html = buildPickSlipHtml([
      pedido({
        address_street: null, address_number: null, address_neighborhood: null,
        address_city: null, address_state: null, address_zip: null, address_complement: null,
      }),
    ])
    expect(html).toContain('<p>—</p>')
  })
})
