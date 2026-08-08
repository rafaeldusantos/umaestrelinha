import { describe, expect, it } from 'vitest'
import { addressLines, type EmailOrder, escapeHtml, firstName, isValidFrom, storeLink } from '../layout.ts'
import {
  EMAIL_TYPES,
  renderEmail,
  renderOrderPaid,
  renderOrderReceived,
  renderOrderShipped,
} from '../templates.ts'

// Escape explícito, não o caractere literal: o ICU separa "R$" do número com NBSP (U+00A0), e um
// espaço comum invisível no source passaria por NBSP na leitura e falharia na execução.
const NBSP = ' '
const STORE = 'https://nanita.com.br'

function orderFixture(over: Partial<EmailOrder> = {}): EmailOrder {
  return {
    order_number: 'NP-ABC123',
    customer_name: 'Mariana Souza',
    customer_email: 'mariana@example.com',
    subtotal: 48,
    shipping_cost: 12.5,
    discount: 0,
    pix_discount: 0,
    total: 60.5,
    tracking_code: null,
    shipping_carrier: null,
    address_street: 'Rua das Flores',
    address_number: '42',
    address_complement: 'apto 7',
    address_neighborhood: 'Centro',
    address_city: 'São Paulo',
    address_state: 'SP',
    address_zip: '01001-000',
    order_items: [
      { product_name: 'Botton Naruto', size: 'M', finish: 'Fosco', quantity: 2, unit_price: 12 },
      { product_name: 'Botton Sailor Moon', size: null, finish: null, quantity: 1, unit_price: 24 },
    ],
    ...over,
  }
}

const shippedFixture = (over: Partial<EmailOrder> = {}) =>
  orderFixture({ tracking_code: 'NA123456789BR', shipping_carrier: 'Correios', ...over })

const ALL = [
  ['order_received', () => renderOrderReceived(orderFixture(), STORE)],
  ['order_paid', () => renderOrderPaid(orderFixture(), STORE)],
  ['order_shipped', () => renderOrderShipped(shippedFixture(), STORE)],
] as const

describe('TPL-01 — shape do retorno', () => {
  it.each(ALL)('%s devolve subject, html e text não vazios', (_type, render) => {
    const email = render()

    expect(email.subject.length).toBeGreaterThan(0)
    expect(email.html.length).toBeGreaterThan(0)
    expect(email.text.length).toBeGreaterThan(0)
  })

  it('EMAIL_TYPES é o allow-list dos três tipos, e renderEmail atende todos', () => {
    expect(EMAIL_TYPES).toEqual(['order_received', 'order_paid', 'order_shipped'])

    for (const type of EMAIL_TYPES) {
      expect(renderEmail(type, shippedFixture(), STORE).subject).toContain('NP-ABC123')
    }
  })
})

describe('TPL-02 — restrições de caixa de entrada', () => {
  it.each(ALL)('%s não tem <link>, <style>, @font-face nem background-image', (_type, render) => {
    const { html } = render()

    expect(html).not.toMatch(/<link\b/i)
    expect(html).not.toMatch(/<style\b/i)
    expect(html).not.toMatch(/@font-face/i)
    expect(html).not.toMatch(/background-image/i)
  })

  it.each(ALL)('%s não usa atributo class — todo estilo é inline', (_type, render) => {
    const { html } = render()

    expect(html).not.toMatch(/\sclass=/i)
    expect(html).toMatch(/style="/)
  })
})

describe('TPL-03 — escape de valores vindos de dados (injeção)', () => {
  it('nome de produto com < e & é escapado e não introduz tag nova', () => {
    const { html } = renderOrderPaid(
      orderFixture({
        order_items: [{ product_name: 'Naruto <3 & cia', size: null, finish: null, quantity: 1, unit_price: 10 }],
      }),
      STORE,
    )

    expect(html).toContain('Naruto &lt;3 &amp; cia')
    expect(html).not.toContain('Naruto <3')
  })

  it('nome de produto com <img onerror> não vira tag no HTML', () => {
    const { html } = renderOrderPaid(
      orderFixture({
        order_items: [
          { product_name: '<img src=x onerror=alert(1)>', size: null, finish: null, quantity: 1, unit_price: 10 },
        ],
      }),
      STORE,
    )

    expect(html).not.toMatch(/<img\b/i)
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })

  it('código de rastreio é escapado na caixa de destaque', () => {
    const { html } = renderOrderShipped(shippedFixture({ tracking_code: 'AB<1>CD' }), STORE)

    expect(html).toContain('AB&lt;1&gt;CD')
    expect(html).not.toContain('AB<1>CD')
  })

  it('nome do cliente é escapado no HTML mas NÃO na versão texto', () => {
    // O caractere perigoso tem de estar no PRIMEIRO token: o cumprimento usa só o primeiro nome,
    // então `'Tom & Jerry'` renderizaria apenas "Tom" e a asserção de escape seria vazia.
    const email = renderOrderPaid(orderFixture({ customer_name: 'Tom&<Jerry> Souza' }), STORE)

    expect(email.html).toContain('Oi, Tom&amp;&lt;Jerry&gt;!')
    expect(email.text).toContain('Oi, Tom&<Jerry>!')
    expect(email.text).not.toContain('&amp;')
  })

  it('transportadora é escapada no HTML mas NÃO na versão texto', () => {
    const email = renderOrderShipped(shippedFixture({ shipping_carrier: 'Jadlog & Cia' }), STORE)

    expect(email.html).toContain('Jadlog &amp; Cia')
    expect(email.text).toContain('Transportadora: Jadlog & Cia')
    expect(email.text).not.toContain('&amp;')
  })

  it('escapeHtml cobre os cinco caracteres perigosos', () => {
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;')
  })
})

describe('TPL-04 / TPL-05 — dinheiro vem do formatPrice do core', () => {
  it('o total no HTML usa a string BRL exata do core, com NBSP', () => {
    const { html } = renderOrderPaid(orderFixture({ total: 60.5 }), STORE)

    expect(html).toContain(`R$${NBSP}60,50`)
  })

  it('a linha do item multiplica quantidade × preço unitário', () => {
    // 2 × 12,00 = 24,00 — não 12,00
    const { html } = renderOrderPaid(orderFixture(), STORE)

    expect(html).toContain(`R$${NBSP}24,00`)
  })

  it('TPL-05: o texto contém o número do pedido e o total formatado', () => {
    const { text } = renderOrderPaid(orderFixture({ order_number: 'NP-XYZ999', total: 1234.56 }), STORE)

    expect(text).toContain('Pedido NP-XYZ999')
    expect(text).toContain(`Total: R$${NBSP}1.234,56`)
  })

  it('frete zero aparece como "Grátis", e frete ausente não gera linha de frete', () => {
    expect(renderOrderPaid(orderFixture({ shipping_cost: 0 }), STORE).text).toContain('Frete: Grátis')
    expect(renderOrderPaid(orderFixture({ shipping_cost: null }), STORE).text).not.toContain('Frete:')
  })

  it('desconto e desconto PIX só aparecem quando existem', () => {
    const withDiscounts = renderOrderPaid(orderFixture({ discount: 5, pix_discount: 3 }), STORE).text
    expect(withDiscounts).toContain(`Desconto: -R$${NBSP}5,00`)
    expect(withDiscounts).toContain(`Desconto PIX: -R$${NBSP}3,00`)

    const without = renderOrderPaid(orderFixture({ discount: 0, pix_discount: 0 }), STORE).text
    expect(without).not.toContain('Desconto:')
    expect(without).not.toContain('Desconto PIX:')
  })
})

describe('TPL-06 — CTA vai para /conta e sobrevive à barra final', () => {
  it.each(ALL)('%s aponta para <STORE_PUBLIC_URL>/conta, nunca /pedido/', (_type, render) => {
    const { html } = render()

    expect(html).toContain('href="https://nanita.com.br/conta"')
    expect(html).not.toContain('/pedido/')
  })

  it('STORE_PUBLIC_URL com e sem barra final produzem href idêntico', () => {
    const withSlash = renderOrderPaid(orderFixture(), 'https://nanita.com.br/').html
    const without = renderOrderPaid(orderFixture(), 'https://nanita.com.br').html

    expect(withSlash).toBe(without)
    expect(withSlash).not.toContain('.br//conta')
  })

  it('storeLink normaliza barras dos dois lados', () => {
    expect(storeLink('https://x.com///', '///conta')).toBe('https://x.com/conta')
    expect(storeLink('https://x.com', 'conta')).toBe('https://x.com/conta')
  })

  it('o alvo de toque declara altura mínima de 44px', () => {
    const { html } = renderOrderPaid(orderFixture(), STORE)

    expect(html).toContain('min-height:44px')
  })

  it('o texto também carrega o link', () => {
    expect(renderOrderPaid(orderFixture(), STORE).text).toContain('https://nanita.com.br/conta')
  })
})

describe('TPL-07 — e-mail autossuficiente', () => {
  it.each(ALL)('%s traz número, itens, total e endereço no corpo do HTML', (_type, render) => {
    const { html } = render()

    expect(html).toContain('Botton Naruto')
    expect(html).toContain('Botton Sailor Moon')
    expect(html).toContain(`R$${NBSP}60,50`)
    expect(html).toContain('Rua das Flores, 42')
    expect(html).toContain('São Paulo - SP')
  })

  it('a variante só aparece quando existe — nunca "Tam. null"', () => {
    const { html } = renderOrderPaid(orderFixture(), STORE)

    expect(html).toContain('Tam. M · Fosco')
    expect(html).not.toContain('null')
    expect(html).not.toContain('undefined')
  })

  it('endereço vazio não gera bloco de entrega', () => {
    const empty = orderFixture({
      address_street: null,
      address_number: null,
      address_complement: null,
      address_neighborhood: null,
      address_city: null,
      address_state: null,
      address_zip: null,
    })

    expect(addressLines(empty)).toEqual([])
    expect(renderOrderPaid(empty, STORE).html).not.toContain('Entrega')
    expect(renderOrderPaid(empty, STORE).text).not.toContain('Entrega:')
  })
})

describe('TPL-08 — identidade Nanita', () => {
  it.each(ALL)('%s usa a paleta, o wordmark e o rodapé', (_type, render) => {
    const { html } = render()

    for (const hex of ['#2B1622', '#FF86B5', '#B0176B', '#7A5C6B', '#FFEFF6', '#FFD7E7']) {
      expect(html).toContain(hex)
    }
    expect(html).toContain('>Nanita<')
    expect(html).toContain('Nanita — cole no peito, carrega no coração.')
  })

  it('o card tem 560px e o raio de 24px do template de auth', () => {
    const { html } = renderOrderPaid(orderFixture(), STORE)

    expect(html).toContain('max-width:560px')
    expect(html).toContain('border-radius:24px')
  })
})

describe('order_received / order_shipped — regras próprias', () => {
  it('TRG-11: order_received informa os 30 minutos e não carrega código PIX nem QR', () => {
    const email = renderOrderReceived(orderFixture(), STORE)

    expect(email.text).toContain('30 minutos')
    expect(email.html).not.toMatch(/qr_?code/i)
    expect(email.html).not.toContain('data:image')
    expect(email.html).not.toMatch(/copia e cola/i)
  })

  it('order_shipped mostra o código como texto e não como link de transportadora', () => {
    const email = renderOrderShipped(shippedFixture(), STORE)

    expect(email.html).toContain('NA123456789BR')
    expect(email.text).toContain('Código de rastreio: NA123456789BR')
    // o único link do e-mail é o da loja
    expect(email.html.match(/href="/g)).toHaveLength(1)
  })

  it('sem transportadora, o lead não cita transportadora e o texto não traz o rótulo', () => {
    const email = renderOrderShipped(shippedFixture({ shipping_carrier: null }), STORE)

    expect(email.html).toContain('Postamos seu pedido.')
    expect(email.text).not.toContain('Transportadora:')
  })

  it('nome do cliente só com espaços não gera "Oi, !"', () => {
    expect(firstName('   ')).toBe('')
    expect(renderOrderPaid(orderFixture({ customer_name: '   ' }), STORE).text).not.toContain('Oi,')
  })
})

describe('CFG-03 — formato do RESEND_FROM', () => {
  it.each([
    'onboarding@resend.dev',
    'Nanita <onboarding@resend.dev>',
    'Nanita <pedidos@nanita.com.br>',
    '"Loja, Nanita" <pedidos@nanita.com.br>',
  ])('aceita %s', (from) => {
    expect(isValidFrom(from)).toBe(true)
  })

  it.each([
    ['vazio', ''],
    ['sem arroba', 'nanita.com.br'],
    ['sem domínio', 'pedidos@'],
    ['sem TLD', 'Nanita <pedidos@localhost>'],
    ['ângulo não fechado', 'Nanita <pedidos@nanita.com.br'],
    ['vírgula no display name sem aspas', 'Loja, Nanita <pedidos@nanita.com.br>'],
    ['ângulo vazio', 'Nanita <>'],
  ])('rejeita %s', (_label, from) => {
    expect(isValidFrom(from)).toBe(false)
  })
})
