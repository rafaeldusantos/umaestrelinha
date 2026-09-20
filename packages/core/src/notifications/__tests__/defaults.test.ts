import { describe, expect, it } from 'vitest'

import { DEFAULT_NOTIFICATIONS, LEGACY_ENABLED_EVENTS } from '../defaults.ts'
import { NOTIFICATION_EVENTS } from '../events.ts'
import { resolveAllEventSettings, resolveEventSettings } from '../settings.ts'
import { greeting, interpolate } from '../variables.ts'

/**
 * PNL-06 — os quatro e-mails que já saem nascem ligados com o texto de `templates.ts`, os onze
 * novos nascem desligados, e o banco anterior à migration cai nos defaults (edge case da spec).
 *
 * As fixtures abaixo foram copiadas de `supabase/functions/send-email/templates.ts` ANTES de a
 * feature apagá-lo (T12): são as strings literais dos `compose(...)`, com os trechos dinâmicos
 * (`greet(order)`, `order.order_number`, `carrier`, `tracking`) preenchidos por um pedido de exemplo.
 * Se `templates.ts` ainda existir quando isto rodar, a fonte é ele; se não, é esta cópia.
 */

const pedido = { order_number: 'NP-000123', customer_name: 'Mariana Souza', carrier: 'PAC', tracking: 'AA123456789BR' }
const nome = 'Mariana'

/** `templates.ts:renderOrderReceived`, com `greet(order)` = "Oi, Mariana! ". */
const LEGADO_ORDER_RECEIVED = {
  subject: `Pedido ${pedido.order_number} recebido — aguardando o PIX`,
  heading: 'Recebemos seu pedido!',
  lead: `Oi, ${nome}! Seu PIX foi gerado e o pedido está reservado por 30 minutos. Assim que o pagamento cair, a gente te avisa por aqui.`,
  extra: ['Status: aguardando pagamento do PIX (30 minutos)'],
}

/** `templates.ts:renderOrderPaid`. */
const LEGADO_ORDER_PAID = {
  subject: `Pagamento aprovado — pedido ${pedido.order_number}`,
  heading: 'Pagamento aprovado!',
  lead: `Oi, ${nome}! Recebemos seu pagamento. Agora é com a gente — seu pedido entra na fila de produção.`,
  extra: ['Status: pagamento aprovado'],
}

/** `templates.ts:renderOrderShipped`, no ramo COM transportadora. */
const LEGADO_ORDER_SHIPPED = {
  subject: `Pedido ${pedido.order_number} enviado — código de rastreio`,
  heading: 'Seu pedido saiu para entrega!',
  lead: `Oi, ${nome}! Postamos seu pedido com ${pedido.carrier}. Use o código abaixo para acompanhar.`,
  extraPrimeiraLinha: `Código de rastreio: ${pedido.tracking}`,
}

/** `templates.ts:renderMaterialReceived`, com `greetCalm(order)` = "Oi, Mariana. ". */
const LEGADO_MATERIAL_RECEIVED = {
  subject: `Recebemos seu material — pedido ${pedido.order_number}`,
  heading: 'Seu material chegou até nós',
  lead: `Oi, ${nome}. Seu material chegou em segurança ao ateliê e já está guardado com cuidado. A partir de agora, sua joia entra em produção — e a gente avisa assim que ela for postada.`,
  extra: [
    'Status: material recebido — em produção',
    'Usamos apenas a quantidade necessária, e todo o excedente volta junto com a sua joia.',
  ],
}

const resolvido = (event: (typeof NOTIFICATION_EVENTS)[number]) => {
  const vars = {
    saudacao: greeting(nome, event),
    numero_pedido: pedido.order_number,
    transportadora: pedido.carrier,
    rastreio: pedido.tracking,
  }
  const f = DEFAULT_NOTIFICATIONS.events[event].email.fields
  return {
    subject: interpolate(f.subject, vars),
    heading: interpolate(f.heading, vars),
    lead: interpolate(f.lead, vars),
    extra: f.extra.map((l) => interpolate(l, vars)),
  }
}

describe('DEFAULT_NOTIFICATIONS — forma', () => {
  it('tem um bloco por evento, e só por evento', () => {
    expect(Object.keys(DEFAULT_NOTIFICATIONS.events).sort()).toEqual([...NOTIFICATION_EVENTS].sort())
  })

  it('todo evento tem o canal e-mail com os cinco campos editáveis (PNL-02) — e nenhum campo a mais', () => {
    for (const event of NOTIFICATION_EVENTS) {
      const bloco = DEFAULT_NOTIFICATIONS.events[event]
      expect(Object.keys(bloco)).toEqual(['email'])
      expect(typeof bloco.email.enabled).toBe('boolean')
      expect(Object.keys(bloco.email.fields).sort()).toEqual(['cta_label', 'extra', 'heading', 'lead', 'subject'])
      expect(Array.isArray(bloco.email.fields.extra)).toBe(true)
    }
  })

  it('post_delivery_days nasce em 7 (P3)', () => {
    expect(DEFAULT_NOTIFICATIONS.post_delivery_days).toBe(7)
  })
})

describe('os interruptores (PNL-06, AC 7)', () => {
  it('os quatro legados nascem LIGADOS', () => {
    expect([...LEGACY_ENABLED_EVENTS]).toEqual(['order_received', 'order_paid', 'order_shipped', 'material_received'])
    for (const event of LEGACY_ENABLED_EVENTS) {
      expect(DEFAULT_NOTIFICATIONS.events[event].email.enabled, `${event} nasceu desligado`).toBe(true)
    }
  })

  it('os treze novos nascem DESLIGADOS', () => {
    const novos = NOTIFICATION_EVENTS.filter((e) => !LEGACY_ENABLED_EVENTS.includes(e))
    // 11 na feature 42; a 57 acrescentou dois avisos internos, e eles nascem desligados pela mesma
    // decisão (`PNL-06`): a Adri lê o texto antes de a primeira cliente disparar o gatilho.
    expect(novos).toHaveLength(13)
    for (const event of novos) {
      expect(DEFAULT_NOTIFICATIONS.events[event].email.enabled, `${event} nasceu ligado`).toBe(false)
    }
  })
})

describe('os quatro textos legados são os de templates.ts, byte a byte', () => {
  it('order_received', () => {
    expect(resolvido('order_received')).toEqual(LEGADO_ORDER_RECEIVED)
  })

  it('order_paid', () => {
    expect(resolvido('order_paid')).toEqual(LEGADO_ORDER_PAID)
  })

  it('order_shipped — subject, heading, lead com transportadora e a primeira linha do extra', () => {
    const r = resolvido('order_shipped')
    expect(r.subject).toBe(LEGADO_ORDER_SHIPPED.subject)
    expect(r.heading).toBe(LEGADO_ORDER_SHIPPED.heading)
    expect(r.lead).toBe(LEGADO_ORDER_SHIPPED.lead)
    expect(r.extra[0]).toBe(LEGADO_ORDER_SHIPPED.extraPrimeiraLinha)
  })

  it('material_received — com a saudação CALMA (ponto, não exclamação)', () => {
    expect(resolvido('material_received')).toEqual(LEGADO_MATERIAL_RECEIVED)
  })

  it('o rótulo do botão dos quatro é o de templates.ts', () => {
    for (const event of LEGACY_ENABLED_EVENTS) {
      expect(DEFAULT_NOTIFICATIONS.events[event].email.fields.cta_label).toBe('Acompanhar em Minha conta')
    }
  })

  it('sem nome, a saudação some e o texto começa direto — como `greet` fazia', () => {
    const f = DEFAULT_NOTIFICATIONS.events.order_paid.email.fields
    expect(interpolate(f.lead, { saudacao: greeting('', 'order_paid') })).toBe(
      'Recebemos seu pagamento. Agora é com a gente — seu pedido entra na fila de produção.',
    )
  })
})

describe('o conteúdo exigido dos textos novos (spec, ACs 5, 7, 8 dos eventos)', () => {
  const campos = (event: (typeof NOTIFICATION_EVENTS)[number]) => {
    const f = DEFAULT_NOTIFICATIONS.events[event].email.fields
    return [f.subject, f.heading, f.lead, ...f.extra].join('\n')
  }

  it('pix_expired traz {{link_pedido}} e não fala em minutos, "últimas" ou contagem', () => {
    const texto = campos('pix_expired')
    expect(texto).toContain('{{link_pedido}}')
    expect(texto).not.toMatch(/minuto|últimas|corra|contagem/i)
  })

  it('material_instructions traz o guia e o endereço do ateliê, e não fala em "fila de produção"', () => {
    const texto = campos('material_instructions')
    expect(texto).toContain('{{link_guia_material}}')
    expect(texto).toContain('{{endereco_atelie}}')
    expect(texto).not.toMatch(/fila de produção/i)
  })

  it('os dois da dona trazem número, primeiro nome e o link do painel; o de pedido pago traz o total', () => {
    for (const event of ['owner_order_paid', 'owner_material_incoming'] as const) {
      const texto = campos(event)
      expect(texto).toContain('{{numero_pedido}}')
      expect(texto).toContain('{{primeiro_nome}}')
      expect(texto).toContain('{{link_pedido_admin}}')
    }
    expect(campos('owner_order_paid')).toContain('{{total}}')
    expect(campos('owner_material_incoming')).toContain('{{rastreio}}')
  })

  it('nenhum texto da cliente carrega o link do painel, e nenhum da dona carrega a saudação da cliente', () => {
    for (const event of NOTIFICATION_EVENTS) {
      const texto = campos(event)
      if (event.startsWith('owner_')) expect(texto).not.toContain('{{saudacao}}')
      else expect(texto).not.toContain('{{link_pedido_admin}}')
    }
  })
})

describe('resolveEventSettings — o recuo para o default (edge case: banco anterior à migration)', () => {
  it('sem settings, devolve o default do evento — os quatro continuam saindo', () => {
    for (const event of LEGACY_ENABLED_EVENTS) {
      const r = resolveEventSettings(undefined, event, 'email')
      expect(r.enabled).toBe(true)
      expect(r.fields).toEqual(DEFAULT_NOTIFICATIONS.events[event].email.fields)
    }
    expect(resolveEventSettings(null, 'pix_expired', 'email').enabled).toBe(false)
  })

  it('o que a dona gravou vence: interruptor e campo a campo', () => {
    const r = resolveEventSettings(
      { events: { order_paid: { email: { enabled: false, fields: { lead: 'Meu texto.' } } } } } as never,
      'order_paid',
      'email',
    )
    expect(r.enabled).toBe(false)
    expect(r.fields.lead).toBe('Meu texto.')
    // O que ela não escreveu vem do default — o campo novo que a tela antiga não conhecia.
    expect(r.fields.subject).toBe(DEFAULT_NOTIFICATIONS.events.order_paid.email.fields.subject)
  })

  it('evento gravado sem `enabled` herda o interruptor do default; outros eventos não são afetados', () => {
    const settings = { events: { pix_expired: { email: { fields: { lead: 'x' } } } } } as never
    expect(resolveEventSettings(settings, 'pix_expired', 'email').enabled).toBe(false)
    expect(resolveEventSettings(settings, 'order_paid', 'email').enabled).toBe(true)
  })

  it('o default devolvido é uma cópia — mexer nele não altera DEFAULT_NOTIFICATIONS', () => {
    const r = resolveEventSettings(undefined, 'order_paid', 'email')
    r.fields.extra.push('linha intrusa')
    expect(DEFAULT_NOTIFICATIONS.events.order_paid.email.fields.extra).toEqual(['Status: pagamento aprovado'])
  })

  it('resolveAllEventSettings devolve os quinze, na ordem da jornada', () => {
    expect(Object.keys(resolveAllEventSettings(undefined, 'email'))).toEqual([...NOTIFICATION_EVENTS])
  })
})
