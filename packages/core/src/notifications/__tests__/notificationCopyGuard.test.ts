import { describe, expect, it } from 'vitest'

import { limitsRefusal, notificationCopyRefusal } from '../copy.ts'
import { DEFAULT_NOTIFICATIONS } from '../defaults.ts'
import { NOTIFICATION_EVENTS } from '../events.ts'
import { variablesRefusal } from '../variables.ts'

/**
 * PNL-04 como GUARDA: todo default passa nas três réguas que o painel aplica à dona. Um default
 * que a régua recusaria seria a loja violando a própria regra antes de ela escrever uma linha — e
 * a aba abriria já com um campo em vermelho que ninguém digitou.
 *
 * Com SENSOR, porque uma varredura que aprova tudo é indistinguível de uma que não olha nada.
 */

const campos = (event: (typeof NOTIFICATION_EVENTS)[number]) => {
  const f = DEFAULT_NOTIFICATIONS.events[event].email.fields
  return { f, textos: [f.subject, f.heading, f.lead, f.cta_label, ...f.extra] }
}

describe('todo default passa na régua de tom', () => {
  it.each(NOTIFICATION_EVENTS)('%s', (event) => {
    const { textos } = campos(event)
    expect(textos.length).toBeGreaterThanOrEqual(5)
    for (const texto of textos) {
      expect(notificationCopyRefusal(texto, { event, channel: 'email' }), `"${texto}"`).toBeNull()
    }
  })
})

describe('todo default passa nos limites', () => {
  it.each(NOTIFICATION_EVENTS)('%s', (event) => {
    expect(limitsRefusal(campos(event).f, 'email')).toBeNull()
  })
})

describe('todo default usa só variáveis do vocabulário', () => {
  it.each(NOTIFICATION_EVENTS)('%s', (event) => {
    for (const texto of campos(event).textos) expect(variablesRefusal(texto), `"${texto}"`).toBeNull()
  })
})

describe('SENSOR — a varredura discrimina', () => {
  it('o lead de `order_paid` com "corra" reprova na mesma régua', () => {
    const { f } = campos('order_paid')
    const mutado = `${f.lead} Corra.`
    expect(notificationCopyRefusal(f.lead, { event: 'order_paid', channel: 'email' })).toBeNull()
    expect(notificationCopyRefusal(mutado, { event: 'order_paid', channel: 'email' })).not.toBeNull()
  })

  it('o lead de `material_received` com `!` reprova — e o mesmo `!` em `order_paid` passa', () => {
    const { f } = campos('material_received')
    const mutado = f.lead.replace('guardado com cuidado.', 'guardado com cuidado!')
    expect(mutado).not.toBe(f.lead)
    expect(notificationCopyRefusal(mutado, { event: 'material_received', channel: 'email' })).not.toBeNull()
    expect(notificationCopyRefusal(mutado, { event: 'order_paid', channel: 'email' })).toBeNull()
  })

  it('um lead acima de 600 reprova nos limites', () => {
    const { f } = campos('order_paid')
    expect(limitsRefusal({ ...f, lead: f.lead.padEnd(601, '.') }, 'email')).not.toBeNull()
  })

  it('uma variável fora do vocabulário reprova', () => {
    expect(variablesRefusal(`${campos('order_paid').f.lead} {{cupom}}`)).not.toBeNull()
  })
})
