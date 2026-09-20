// Feature 56 — o par `chave → componente` dos ícones de evento, nos DOIS sentidos.
//
// Molde de `menuIconCatalog.test.ts`. O `tsc` pega um sentido só (`Record<NotificationIconKey, …>`
// exige a chave); o outro — um componente importado e mapeado sob uma chave que `core` não conhece —
// não é erro de nada, e fica no bundle do painel sem ninguém alcançar.

import { describe, expect, it } from 'vitest'
import {
  NOTIFICATION_EVENTS,
  NOTIFICATION_EVENT_ICONS,
  NOTIFICATION_ICON_KEYS,
} from '@estrelinha/core/notifications'

import { EVENT_ICON_COMPONENTS } from '../eventIcons'

const chavesDoPainel = Object.keys(EVENT_ICON_COMPONENTS)

describe('EVENT_ICON_COMPONENTS — âncora', () => {
  it('os dois lados estão povoados, e com o mesmo tamanho', () => {
    // Sem isto, dois objetos vazios satisfariam todas as asserções abaixo.
    expect(NOTIFICATION_ICON_KEYS.length).toBe(15)
    expect(chavesDoPainel).toHaveLength(NOTIFICATION_ICON_KEYS.length)
  })
})

describe('EVENT_ICON_COMPONENTS — bidirecional', () => {
  it('toda chave do vocabulário de `core` tem componente no painel', () => {
    for (const chave of NOTIFICATION_ICON_KEYS) {
      expect(chavesDoPainel, `chave ${chave} sem componente`).toContain(chave)
    }
  })

  it('todo componente do painel corresponde a uma chave do vocabulário', () => {
    for (const chave of chavesDoPainel) {
      expect(NOTIFICATION_ICON_KEYS, `componente ${chave} sem chave em core`).toContain(chave)
    }
  })

  it('cada chave resolve para algo que o React aceita montar', () => {
    for (const chave of NOTIFICATION_ICON_KEYS) {
      const Icone = EVENT_ICON_COMPONENTS[chave]
      // Componente de função é `function`; um embrulhado em `forwardRef` (que é o caso dos ícones
      // do `lucide-react`) é `object`. Mesma régua de `panels.test.tsx`.
      expect(['function', 'object'], `ícone ${chave}`).toContain(typeof Icone)
      expect(Icone).not.toBeNull()
      expect(Icone).not.toBeUndefined()
    }
  })

  it('cada um dos 15 eventos alcança um componente de verdade — o caminho inteiro', () => {
    // As duas metades acima provam o par. Esta prova o PERCURSO que o card faz: evento → chave →
    // componente. Sem ela, os dois mapas podem estar coerentes entre si e um evento apontar para
    // uma chave que o card nunca consegue resolver.
    for (const event of NOTIFICATION_EVENTS) {
      expect(EVENT_ICON_COMPONENTS[NOTIFICATION_EVENT_ICONS[event]], `evento ${event}`).toBeTruthy()
    }
  })

  it('SENSOR: a régua reprova nos dois sentidos', () => {
    const divergem = (chaves: readonly string[], componentes: string[]) =>
      chaves.some((c) => !componentes.includes(c)) || componentes.some((c) => !chaves.includes(c))

    expect(divergem(NOTIFICATION_ICON_KEYS, chavesDoPainel)).toBe(false)
    expect(divergem([...NOTIFICATION_ICON_KEYS, 'gift'], chavesDoPainel)).toBe(true)
    expect(divergem(NOTIFICATION_ICON_KEYS, [...chavesDoPainel, 'gift'])).toBe(true)
  })
})
