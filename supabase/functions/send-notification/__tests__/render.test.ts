import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_NOTIFICATIONS,
  NOTIFICATION_EVENTS,
  type NotificationEvent,
} from '../../../../packages/core/src/notifications/index.ts'
import { addressLines, type EmailOrder, escapeHtml, firstName, isValidFrom, storeLink } from '../render/layout.ts'
import { renderEmail } from '../render/email.ts'
import { buildVars, carrierLabel } from '../render/vars.ts'
import { SAMPLE_ORDER } from '../render/sample.ts'

// Escape EXPLÍCITO, não o caractere literal: o ICU separa "R$" do número com NBSP (U+00A0), e um
// espaço comum invisível no source passaria por NBSP na leitura e falharia na execução — foi
// exatamente o que aconteceu ao reescrever este arquivo na T12, com 5 casos reprovando de uma vez.
const NBSP = ' '
const STORE = 'https://umaestrelinha.com.br'
const ADMIN = 'https://painel.umaestrelinha.com.br'
const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')

function orderFixture(over: Partial<EmailOrder> = {}): EmailOrder {
  return {
    id: 'a1b2c3d4-0000-4000-8000-000000000001',
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
      { product_name: 'Pingente Gota', size: 'M', finish: 'Fosco', quantity: 2, unit_price: 12 },
      { product_name: 'Colar Estrela', size: null, finish: null, quantity: 1, unit_price: 24 },
    ],
    ...over,
  }
}

/**
 * O renderizador com os textos PADRÃO — que é o que a loja envia até a dona editar. Assinatura
 * espelhando a do motor: evento, pedido, campos, variáveis.
 */
function render(event: NotificationEvent, order: EmailOrder = orderFixture(), storeUrl = STORE) {
  const fields = DEFAULT_NOTIFICATIONS.events[event].email.fields
  const vars = buildVars(event, order, {
    storeUrl,
    adminUrl: ADMIN,
    whatsapp: '(51) 99999-0000',
    enderecoAtelie: 'Rua do Ateliê, 10\nPorto Alegre - RS\n90000-000',
  })
  return renderEmail(event, order, fields, vars)
}

const shippedFixture = (over: Partial<EmailOrder> = {}) =>
  orderFixture({ tracking_code: 'NA123456789BR', shipping_carrier: 'Correios', ...over })

const materialFixture = (over: Partial<EmailOrder> = {}) =>
  orderFixture({ material_status: 'material_recebido', ...over })

/** Os quatro que a loja já enviava — os únicos que nascem ligados. */
const ALL = [
  ['order_received', () => render('order_received')],
  ['order_paid', () => render('order_paid')],
  ['order_shipped', () => render('order_shipped', shippedFixture())],
  ['material_received', () => render('material_received', materialFixture())],
] as const

// =================================================================================================
// A PROVA DA TROCA — os quatro legados, byte a byte
// =================================================================================================
//
// As fixtures em `__tests__/fixtures/legacy-*` foram geradas pelo `templates.ts` de ANTES da feature
// 42, com o pedido de `legacyOrder()` abaixo, e congeladas no commit da T12. Elas são a única prova
// de que trocar quatro funções em prosa por "texto da dona + estrutura do código" não mudou uma
// vírgula do que a cliente recebe. Se um destes falhar, o e-mail MUDOU — e mudar exige decisão, não
// refatoração.

const legacyOrder = (over: Partial<EmailOrder> = {}): EmailOrder =>
  orderFixture({ id: null, ...over })

const legacy = (event: string, ext: 'html' | 'txt' | 'subject.txt') =>
  readFileSync(join(FIXTURES, `legacy-${event}.${ext}`), 'utf8')

describe('T12 — os quatro legados saem idênticos ao que templates.ts produzia', () => {
  const casos = [
    ['order_received', legacyOrder()],
    ['order_paid', legacyOrder()],
    ['order_shipped', legacyOrder({ tracking_code: 'AA123456789BR', shipping_carrier: 'PAC' })],
    ['material_received', legacyOrder({ material_status: 'material_recebido' })],
  ] as const

  it.each(casos)('%s — o ASSUNTO é idêntico', (event, pedido) => {
    expect(render(event as NotificationEvent, pedido).subject).toBe(legacy(event, 'subject.txt'))
  })

  it.each(casos)('%s — o HTML é idêntico, byte a byte', (event, pedido) => {
    expect(render(event as NotificationEvent, pedido).html).toBe(legacy(event, 'html'))
  })

  it.each([
    ['order_received', legacyOrder()],
    ['order_paid', legacyOrder()],
    ['material_received', legacyOrder({ material_status: 'material_recebido' })],
  ] as const)('%s — a versão TEXTO é idêntica, byte a byte', (event, pedido) => {
    expect(render(event as NotificationEvent, pedido).text).toBe(legacy(event, 'txt'))
  })

  it('order_shipped — a versão texto perde EXATAMENTE a linha "Transportadora:", e nada mais', () => {
    // A única divergência declarada dos quatro (design, Tech Decisions): em `templates.ts` a linha
    // era condicional ao `shipping_carrier`, e texto editável não tem ramo. O nome da transportadora
    // continua no lead — a linha era redundante.
    const atual = render('order_shipped', legacyOrder({ tracking_code: 'AA123456789BR', shipping_carrier: 'PAC' })).text
    const antigo = legacy('order_shipped', 'txt')

    expect(antigo.split('\n').filter((l) => !l.startsWith('Transportadora: ')).join('\n')).toBe(atual)
    expect(antigo).toContain('Transportadora: PAC')
    expect(atual).not.toContain('Transportadora:')
    expect(atual).toContain('Postamos seu pedido com PAC.')
  })
})

describe('TPL-01 — shape do retorno', () => {
  it.each(ALL)('%s devolve subject, html e text não vazios', (_event, r) => {
    const email = r()

    expect(email.subject.length).toBeGreaterThan(0)
    expect(email.html.length).toBeGreaterThan(0)
    expect(email.text.length).toBeGreaterThan(0)
  })

  it('renderEmail atende TODOS os dezessete eventos do vocabulário', () => {
    // O allow-list deixou de ser uma lista de quatro dentro da function e passou a ser
    // `NOTIFICATION_EVENTS`, em `core` — a mesma que o `check` da migration copia.
    expect(NOTIFICATION_EVENTS).toHaveLength(17)

    for (const event of NOTIFICATION_EVENTS) {
      const email = render(event, shippedFixture({ material_status: 'material_enviado', material_tracking_code: 'BB1BR' }))
      expect(email.subject.length, `${event} sem assunto`).toBeGreaterThan(0)
      expect(email.html, `${event} sem corpo`).toContain('UMA ESTRELINHA')
    }
  })

  it('nenhum evento deixa placeholder cru no que a cliente lê', () => {
    for (const event of NOTIFICATION_EVENTS) {
      const email = render(event, shippedFixture({ material_status: 'material_enviado', material_tracking_code: 'BB1BR' }))
      expect(email.subject, event).not.toMatch(/\{\{/)
      expect(email.text, event).not.toMatch(/\{\{/)
      expect(email.html, event).not.toMatch(/\{\{/)
    }
  })
})

describe('TPL-02 — restrições de caixa de entrada', () => {
  it.each(ALL)('%s não tem <link>, <style>, @font-face nem background-image', (_event, r) => {
    const { html } = r()

    expect(html).not.toMatch(/<link\b/i)
    expect(html).not.toMatch(/<style\b/i)
    expect(html).not.toMatch(/@font-face/i)
    expect(html).not.toMatch(/background-image/i)
  })

  it.each(ALL)('%s não usa atributo class — todo estilo é inline', (_event, r) => {
    const { html } = r()

    expect(html).not.toMatch(/\sclass=/i)
    expect(html).toMatch(/style="/)
  })
})

describe('TPL-03 — escape de valores vindos de dados (injeção)', () => {
  it('nome de produto com < e & é escapado e não introduz tag nova', () => {
    const { html } = render(
      'order_paid',
      orderFixture({
        order_items: [{ product_name: 'Gota <3 & cia', size: null, finish: null, quantity: 1, unit_price: 10 }],
      }),
    )

    expect(html).toContain('Gota &lt;3 &amp; cia')
    expect(html).not.toContain('Gota <3')
  })

  it('nome de produto com <img onerror> não vira tag no HTML', () => {
    const { html } = render(
      'order_paid',
      orderFixture({
        order_items: [
          { product_name: '<img src=x onerror=alert(1)>', size: null, finish: null, quantity: 1, unit_price: 10 },
        ],
      }),
    )

    expect(html).not.toMatch(/<img\b/i)
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })

  it('código de rastreio é escapado na caixa de destaque', () => {
    const { html } = render('order_shipped', shippedFixture({ tracking_code: 'AB<1>CD' }))

    expect(html).toContain('AB&lt;1&gt;CD')
    expect(html).not.toContain('AB<1>CD')
  })

  it('nome do cliente é escapado no HTML mas NÃO na versão texto', () => {
    // O caractere perigoso tem de estar no PRIMEIRO token: o cumprimento usa só o primeiro nome,
    // então `'Tom & Jerry'` renderizaria apenas "Tom" e a asserção de escape seria vazia.
    const email = render('order_paid', orderFixture({ customer_name: 'Tom&<Jerry> Souza' }))

    expect(email.html).toContain('Oi, Tom&amp;&lt;Jerry&gt;!')
    expect(email.text).toContain('Oi, Tom&<Jerry>!')
    expect(email.text).not.toContain('&amp;')
  })

  it('transportadora é escapada no HTML mas NÃO na versão texto', () => {
    const email = render('order_shipped', shippedFixture({ shipping_carrier: 'Jadlog & Cia' }))

    expect(email.html).toContain('Jadlog &amp; Cia')
    expect(email.text).toContain('Postamos seu pedido com Jadlog & Cia')
    expect(email.text).not.toContain('&amp;')
  })

  it('escapeHtml cobre os cinco caracteres perigosos', () => {
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;')
  })
})

describe('TPL-04 / TPL-05 — dinheiro vem do formatPrice do core', () => {
  it('o total no HTML usa a string BRL exata do core, com NBSP', () => {
    expect(render('order_paid', orderFixture({ total: 60.5 })).html).toContain(`R$${NBSP}60,50`)
  })

  it('a linha do item multiplica quantidade × preço unitário', () => {
    // 2 × 12,00 = 24,00 — não 12,00
    expect(render('order_paid').html).toContain(`R$${NBSP}24,00`)
  })

  it('TPL-05: o texto contém o número do pedido e o total formatado', () => {
    const { text } = render('order_paid', orderFixture({ order_number: 'NP-XYZ999', total: 1234.56 }))

    expect(text).toContain('Pedido NP-XYZ999')
    expect(text).toContain(`Total: R$${NBSP}1.234,56`)
  })

  it('a variável {{total}} usa o MESMO formatPrice do corpo', () => {
    // `payment_refunded` é o evento que cita o valor dentro da frase.
    expect(render('payment_refunded', orderFixture({ total: 1234.56 })).text).toContain(`R$${NBSP}1.234,56`)
  })

  it('frete zero aparece como "Grátis", e frete ausente não gera linha de frete', () => {
    expect(render('order_paid', orderFixture({ shipping_cost: 0 })).text).toContain('Frete: Grátis')
    expect(render('order_paid', orderFixture({ shipping_cost: null })).text).not.toContain('Frete:')
  })

  it('desconto e desconto PIX só aparecem quando existem', () => {
    const comDesconto = render('order_paid', orderFixture({ discount: 5, pix_discount: 3 })).text
    expect(comDesconto).toContain(`Desconto: -R$${NBSP}5,00`)
    expect(comDesconto).toContain(`Desconto PIX: -R$${NBSP}3,00`)

    const sem = render('order_paid', orderFixture({ discount: 0, pix_discount: 0 })).text
    expect(sem).not.toContain('Desconto:')
    expect(sem).not.toContain('Desconto PIX:')
  })
})

describe('TPL-06 — CTA vai para /conta e sobrevive à barra final', () => {
  it.each(ALL)('%s aponta para <STORE_PUBLIC_URL>/conta, nunca /pedido/', (_event, r) => {
    const { html } = r()

    expect(html).toContain('href="https://umaestrelinha.com.br/conta"')
    expect(html).not.toContain('/pedido/')
  })

  it('STORE_PUBLIC_URL com e sem barra final produzem href idêntico', () => {
    const comBarra = render('order_paid', orderFixture(), 'https://umaestrelinha.com.br/').html
    const sem = render('order_paid', orderFixture(), 'https://umaestrelinha.com.br').html

    expect(comBarra).toBe(sem)
    expect(comBarra).not.toContain('.br//conta')
  })

  it('storeLink normaliza barras dos dois lados', () => {
    expect(storeLink('https://x.com///', '///conta')).toBe('https://x.com/conta')
    expect(storeLink('https://x.com', 'conta')).toBe('https://x.com/conta')
  })

  it('o alvo de toque declara altura mínima de 44px', () => {
    expect(render('order_paid').html).toContain('min-height:44px')
  })

  it('o texto também carrega o link', () => {
    expect(render('order_paid').text).toContain('https://umaestrelinha.com.br/conta')
  })

  it('os e-mails da DONA apontam para o painel, não para /conta da cliente', () => {
    // O destino não é editável, e depende da audiência: mandar a Adri para a área da cliente seria
    // um link que não abre o que ela precisa ver.
    for (const event of ['owner_order_paid', 'owner_material_incoming'] as const) {
      const { html } = render(event, orderFixture({ material_status: 'material_enviado', material_tracking_code: 'BB1BR' }))
      expect(html, event).toContain(`href="${ADMIN}/admin/pedidos/a1b2c3d4-0000-4000-8000-000000000001"`)
      expect(html, event).not.toContain(`href="${STORE}/conta"`)
    }
  })
})

describe('TPL-07 — e-mail autossuficiente', () => {
  it.each(ALL)('%s traz número, itens, total e endereço no corpo do HTML', (_event, r) => {
    const { html } = r()

    expect(html).toContain('Pingente Gota')
    expect(html).toContain('Colar Estrela')
    expect(html).toContain(`R$${NBSP}60,50`)
    expect(html).toContain('Rua das Flores, 42')
    expect(html).toContain('São Paulo - SP')
  })

  it('a variante só aparece quando existe — nunca "Tam. null"', () => {
    const { html } = render('order_paid')

    expect(html).toContain('Tam. M · Fosco')
    expect(html).not.toContain('null')
    expect(html).not.toContain('undefined')
  })

  it('endereço vazio não gera bloco de entrega', () => {
    const vazio = orderFixture({
      address_street: null,
      address_number: null,
      address_complement: null,
      address_neighborhood: null,
      address_city: null,
      address_state: null,
      address_zip: null,
    })

    expect(addressLines(vazio)).toEqual([])
    expect(render('order_paid', vazio).html).not.toContain('Entrega')
    expect(render('order_paid', vazio).text).not.toContain('Entrega:')
  })
})

describe('TPL-08 — identidade Uma Estrelinha', () => {
  it.each(ALL)('%s usa a paleta, o wordmark e o rodapé', (_event, r) => {
    const { html } = r()

    for (const hex of ['#23303A', '#54616B', '#34495E', '#283A4A', '#F7F3EC', '#FAF8F4', '#E6DFD4']) {
      expect(html).toContain(hex)
    }
    expect(html).toContain('>UMA ESTRELINHA<')
    expect(html).toContain('Uma Estrelinha — eternizando suas lembranças.')
  })

  it.each(ALL)('%s não usa o acento como TEXTO — ele mede 2,66:1 sobre claro', (_event, r) => {
    const { html } = r()

    // O acento #B8945F entra só como fio de 1px sob o wordmark. Qualquer `color:`
    // com ele seria texto ouro — reprovado em toda superfície clara da loja, e a
    // mesma classe de defeito que a `accentText.test.ts` guarda no lado da loja.
    expect(html).toContain('background:#B8945F')
    expect(html).not.toContain('color:#B8945F')
  })

  it.each(ALL)('%s não pede webfont nem recurso externo', (_event, r) => {
    const { html } = r()

    // Gmail e Outlook não carregam webfont: o que renderiza é a pilha de
    // fallback, e um <link>/@font-face aqui é peso morto que alguns clientes
    // ainda usam para rastrear abertura.
    expect(html).not.toContain('@font-face')
    expect(html).not.toContain('fonts.googleapis')
    expect(html).not.toContain('Libre Baskerville')
    expect(html).not.toContain('Outfit')
    expect(html).not.toMatch(/<link|<style|background-image/)
  })

  it('o card tem 560px e o raio de 20px do template de auth', () => {
    const { html } = render('order_paid')

    // Os dois envelopes chegam na MESMA caixa de entrada. Divergir de raio e
    // largura faria a loja falar com duas vozes sem nada quebrar.
    expect(html).toContain('max-width:560px')
    expect(html).toContain('border-radius:20px')
  })

  it('a ação é retângulo de 6px, não pílula — pílula virou forma de rótulo', () => {
    const { html } = render('order_paid')

    expect(html).toContain('border-radius:6px')
    expect(html).not.toContain('border-radius:999px')
  })
})

describe('order_received / order_shipped — regras próprias', () => {
  it('TRG-11: order_received informa os 30 minutos e não carrega código PIX nem QR', () => {
    const email = render('order_received')

    expect(email.text).toContain('30 minutos')
    expect(email.html).not.toMatch(/qr_?code/i)
    expect(email.html).not.toContain('data:image')
    expect(email.html).not.toMatch(/copia e cola/i)
  })

  it('order_shipped mostra o código como texto e não como link de transportadora', () => {
    const email = render('order_shipped', shippedFixture())

    expect(email.html).toContain('NA123456789BR')
    expect(email.text).toContain('Código de rastreio: NA123456789BR')
    // o único link do e-mail é o da loja
    expect(email.html.match(/href="/g)).toHaveLength(1)
  })

  it('sem transportadora informada, o lead diz "a transportadora" e continua gramatical', () => {
    const email = render('order_shipped', shippedFixture({ shipping_carrier: null }))

    expect(carrierLabel(null)).toBe('a transportadora')
    expect(carrierLabel('  ')).toBe('a transportadora')
    expect(carrierLabel(' Jadlog ')).toBe('Jadlog')
    expect(email.html).toContain('Postamos seu pedido com a transportadora.')
  })

  it('nome do cliente só com espaços não gera "Oi, !"', () => {
    expect(firstName('   ')).toBe('')
    expect(render('order_paid', orderFixture({ customer_name: '   ' })).text).not.toContain('Oi,')
  })
})

// =================================================================================================
// Os eventos NOVOS — o que a spec exige que cada um diga (ACs 5, 6, 7)
// =================================================================================================

describe('material_instructions — o que a cliente precisa fazer', () => {
  const pedido = () => orderFixture({ material_status: 'aguardando_material' })

  it('AC 7: traz o guia e o endereço do ateliê, e NÃO diz "fila de produção"', () => {
    const { text, html } = render('material_instructions', pedido())

    expect(text).toContain('https://umaestrelinha.com.br/como-enviar-o-material')
    expect(text).toContain('Rua do Ateliê, 10, Porto Alegre - RS, 90000-000')
    expect(text).not.toMatch(/fila de produção/i)
    expect(html).not.toMatch(/fila de produção/i)
  })

  it('AC 4: é evento de material — nenhuma exclamação, e a saudação sai com ponto', () => {
    const { subject, text } = render('material_instructions', pedido())

    expect(text).toContain('Oi, Mariana.')
    expect(text).not.toContain('!')
    expect(subject).not.toContain('!')
  })
})

describe('pix_expired — AC 5', () => {
  it('carrega o link do pedido para gerar um PIX novo', () => {
    const { text } = render('pix_expired', orderFixture({ payment_status: 'expired' } as Partial<EmailOrder>))

    expect(text).toContain('https://umaestrelinha.com.br/pedido/a1b2c3d4-0000-4000-8000-000000000001')
  })

  it('NÃO fabrica urgência: sem contagem regressiva, "últimas", "corra" ou prazo em minutos', () => {
    const { subject, text } = render('pix_expired')

    for (const proibido of [/corra/i, /últimas/i, /ultimas/i, /não perca/i, /nao perca/i, /\d+\s*minutos? restantes?/i]) {
      expect(subject, String(proibido)).not.toMatch(proibido)
      expect(text, String(proibido)).not.toMatch(proibido)
    }
  })
})

describe('order_cancelled — AC 6: o parágrafo da devolução é condicional', () => {
  it.each(['material_enviado', 'material_recebido'])(
    'com material %s, o e-mail explica que o material volta',
    (material) => {
      const email = render('order_cancelled', orderFixture({ status: 'cancelled', material_status: material } as Partial<EmailOrder>))

      expect(email.html).toMatch(/ele volta para você/i)
      expect(email.text).toMatch(/volta para você/i)
    },
  )

  it.each(['nao_aplicavel', 'aguardando_material', null])(
    'com material %s, NÃO fala em devolução — não há o que devolver',
    (material) => {
      const email = render('order_cancelled', orderFixture({ status: 'cancelled', material_status: material } as Partial<EmailOrder>))

      expect(email.html).not.toMatch(/volta para você/i)
      expect(email.text).not.toMatch(/volta para você/i)
    },
  )
})

describe('os dois eventos de material usam o rastreio DA CLIENTE, não o da loja', () => {
  it('material_tracking_registered mostra o código do envelope, não o da encomenda', () => {
    const email = render(
      'material_tracking_registered',
      orderFixture({
        material_status: 'material_enviado',
        material_tracking_code: 'BB987654321BR',
        tracking_code: 'AA111111111BR',
      }),
    )

    expect(email.text).toContain('BB987654321BR')
    expect(email.text).not.toContain('AA111111111BR')
  })

  it('owner_material_incoming também — é o mesmo envelope, visto do outro lado', () => {
    const email = render(
      'owner_material_incoming',
      orderFixture({
        material_status: 'material_enviado',
        material_tracking_code: 'BB987654321BR',
        tracking_code: 'AA111111111BR',
      }),
    )

    expect(email.text).toContain('BB987654321BR')
    expect(email.text).not.toContain('AA111111111BR')
  })

  it('order_shipped continua com o rastreio da LOJA', () => {
    const email = render(
      'order_shipped',
      shippedFixture({ tracking_code: 'AA111111111BR', material_tracking_code: 'BB987654321BR' }),
    )

    expect(email.text).toContain('AA111111111BR')
    expect(email.text).not.toContain('BB987654321BR')
  })
})

describe('render/sample.ts — o pedido de exemplo da prévia', () => {
  it('não carrega dado de cliente real: todo e-mail é @exemplo.invalid', () => {
    const fonte = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'render', 'sample.ts'), 'utf8')
    const enderecos = fonte.match(/[\w.+-]+@[\w.-]+/g) ?? []

    expect(enderecos.length).toBeGreaterThan(0)
    for (const e of enderecos) expect(e, `${e} não é de exemplo`).toMatch(/@exemplo\.invalid$/)
  })

  it('exercita todos os blocos: dois itens, frete, desconto PIX, endereço e os dois rastreios', () => {
    expect(SAMPLE_ORDER.order_items).toHaveLength(2)
    expect(SAMPLE_ORDER.shipping_cost).toBeGreaterThan(0)
    expect(SAMPLE_ORDER.pix_discount).toBeGreaterThan(0)
    expect(SAMPLE_ORDER.tracking_code).toBeTruthy()
    expect(SAMPLE_ORDER.material_tracking_code).toBeTruthy()
    expect(addressLines(SAMPLE_ORDER).length).toBeGreaterThan(2)
  })

  it('renderiza os quinze eventos sem buraco', () => {
    for (const event of NOTIFICATION_EVENTS) {
      const email = render(event, SAMPLE_ORDER)
      expect(email.text, event).not.toMatch(/\{\{|undefined|null/)
    }
  })
})

describe('CFG-03 — formato do RESEND_FROM', () => {
  it.each([
    'onboarding@resend.dev',
    'Uma Estrelinha <onboarding@resend.dev>',
    'Uma Estrelinha <loja@loja.umaestrelinha.com.br>',
    '"Loja, Uma Estrelinha" <loja@loja.umaestrelinha.com.br>',
  ])('aceita %s', (from) => {
    expect(isValidFrom(from)).toBe(true)
  })

  it.each([
    ['vazio', ''],
    ['sem arroba', 'umaestrelinha.com.br'],
    ['sem domínio', 'pedidos@'],
    ['sem TLD', 'Uma Estrelinha <loja@localhost>'],
    ['ângulo não fechado', 'Uma Estrelinha <loja@loja.umaestrelinha.com.br'],
    ['vírgula no display name sem aspas', 'Loja, Uma Estrelinha <loja@loja.umaestrelinha.com.br>'],
    ['ângulo vazio', 'Uma Estrelinha <>'],
  ])('rejeita %s', (_label, from) => {
    expect(isValidFrom(from)).toBe(false)
  })
})

// =================================================================================================
// MAT-09 — `material_received`, o e-mail mais delicado da loja
// =================================================================================================

describe('material_received — tom e conteúdo', () => {
  const rendered = () => render('material_received', materialFixture())

  it('está no vocabulário, e o vocabulário tem um dono só', () => {
    expect(NOTIFICATION_EVENTS).toContain('material_received')
    expect(NOTIFICATION_EVENTS).toHaveLength(17)
  })

  it('o assunto traz o número do pedido e diz o que aconteceu', () => {
    expect(rendered().subject).toContain('NP-ABC123')
    expect(rendered().subject).toMatch(/recebemos seu material/i)
  })

  it('NÃO comemora: sem exclamação no assunto, no título e no texto', () => {
    // Os outros e-mails abrem com "!". Este confirma o recebimento de cinzas de cremação, de leite
    // materno, do cacho de cabelo de quem morreu — e o tom é decisão de produto, não estilo.
    const { subject, html, text } = rendered()
    expect(subject).not.toContain('!')
    expect(text).not.toContain('!')
    expect(html).not.toMatch(/<[^>]*>[^<]*![^<]*<\/(h1|p)>/)
  })

  it('não usa emoji', () => {
    const { subject, html, text } = rendered()
    for (const parte of [subject, html, text]) {
      expect(parte).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u)
    }
  })

  it('diz que a produção começou e que o excedente volta', () => {
    // As duas informações que a operação de fato responde por WhatsApp hoje.
    const { text } = rendered()
    expect(text).toMatch(/produção/i)
    expect(text).toMatch(/excedente volta/i)
  })

  it('não empresta o destaque grande do rastreio — isto é confirmação, não anúncio', () => {
    expect(rendered().html).not.toContain('Código de rastreio')
  })

  it('continua autossuficiente: itens, totais e endereço no corpo', () => {
    const { html } = rendered()
    expect(html).toContain('Pingente Gota')
    expect(html).toContain(`R$${NBSP}60,50`)
    expect(html).toContain('Rua das Flores, 42')
  })
})
