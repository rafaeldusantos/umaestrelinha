import { describe, expect, it } from 'vitest'
import { NOTIFICATION_EVENTS, type NotificationEvent } from '@estrelinha/core/notifications'

import { NOTIFICATION_SECTIONS, SECTION_LABELS, groupedEvents, sectionFor } from '../sections'

/**
 * ABN-01 — os 17 eventos agrupados em três seções DERIVADAS, cada um em exatamente uma, com a
 * ordem de `NOTIFICATION_EVENTS` preservada dentro de cada seção.
 */

describe('SECTION_LABELS', () => {
  it('os três rótulos são os do design', () => {
    expect(SECTION_LABELS).toEqual({
      customer: 'Pedido e pagamento',
      material: 'Material',
      owner: 'Avisos para você',
    })
  })
})

describe('sectionFor', () => {
  it('os dois eventos de audiência `owner` caem em "Avisos para você"', () => {
    expect(sectionFor('owner_order_received')).toBe('owner')
    expect(sectionFor('owner_order_paid')).toBe('owner')
    expect(sectionFor('owner_payment_rejected')).toBe('owner')
    expect(sectionFor('owner_material_incoming')).toBe('owner')
  })

  it('os quatro eventos de MATERIAL_EVENTS caem em "Material"', () => {
    expect(sectionFor('material_instructions')).toBe('material')
    expect(sectionFor('material_tracking_registered')).toBe('material')
    expect(sectionFor('material_received')).toBe('material')
    expect(sectionFor('in_production')).toBe('material')
  })

  it('o resto cai em "Pedido e pagamento"', () => {
    const resto: NotificationEvent[] = [
      'order_received',
      'order_paid',
      'payment_rejected',
      'pix_expired',
      'order_cancelled',
      'payment_refunded',
      'order_shipped',
      'order_delivered',
      'post_delivery_care',
    ]
    for (const event of resto) expect(sectionFor(event)).toBe('customer')
  })
})

describe('groupedEvents — âncora de contagem e ordem preservada', () => {
  const grupos = groupedEvents()

  it('os 17 eventos estão distribuídos nas três seções, sem repetição e sem sobra', () => {
    const total = grupos.customer.length + grupos.material.length + grupos.owner.length
    expect(total).toBe(17)
    expect(total).toBe(NOTIFICATION_EVENTS.length)

    const achatado = [...grupos.customer, ...grupos.material, ...grupos.owner]
    expect(new Set(achatado).size).toBe(17)
    for (const event of NOTIFICATION_EVENTS) expect(achatado).toContain(event)
  })

  it('cada evento aparece em EXATAMENTE uma seção', () => {
    for (const event of NOTIFICATION_EVENTS) {
      const presencas = NOTIFICATION_SECTIONS.filter((secao) => grupos[secao].includes(event))
      expect(presencas).toHaveLength(1)
    }
  })

  it('dentro de cada seção, a ordem é a de NOTIFICATION_EVENTS (prova por índice)', () => {
    for (const secao of NOTIFICATION_SECTIONS) {
      const indices = grupos[secao].map((event) => NOTIFICATION_EVENTS.indexOf(event))
      const ordenado = [...indices].sort((a, b) => a - b)
      expect(indices).toEqual(ordenado)
    }
  })

  it('"Material" tem exatamente os 4 eventos de MATERIAL_EVENTS, na ordem da jornada', () => {
    expect(grupos.material).toEqual([
      'material_instructions',
      'material_tracking_registered',
      'material_received',
      'in_production',
    ])
  })

  it('"Avisos para você" tem exatamente os 4 eventos de audiência owner', () => {
    // A feature 57 acrescentou o primeiro e o terceiro, na ordem da jornada deles.
    expect(grupos.owner).toEqual([
      'owner_order_received',
      'owner_order_paid',
      'owner_payment_rejected',
      'owner_material_incoming',
    ])
  })
})

describe('SENSOR — um evento de material classificado só por audiência perderia a seção', () => {
  // Molde da matriz de cobertura (tasks.md): trocar `isMaterialEvent` por `EVENT_AUDIENCE==='owner'`
  // só faria `material_instructions` cair na seção errada — mede a régua real, não uma simulação.
  it('material_instructions não tem audiência owner, e ainda assim cai em "material" — prova que a régua NÃO depende só da audiência', () => {
    const grupos = groupedEvents()
    expect(grupos.customer).not.toContain('material_instructions')
    expect(grupos.material).toContain('material_instructions')
  })
})
