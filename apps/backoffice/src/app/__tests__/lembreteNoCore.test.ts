// Feature `75` (`MAA-28`, A18) — o lembrete do material no WhatsApp SUBIU para
// `@estrelinha/core/orders`, e o painel o REEXPORTA. A régua é `toBe` (identidade), nunca `toEqual`:
// uma cópia colada com o mesmo comportamento passaria por igualdade e seria exatamente o segundo dono
// que a subida existe para impedir (o defeito 01). Molde: `regrasDoPedidoNoCore.test.ts`.
//
// Mora em `app/__tests__` pelo mesmo motivo do molde: lê `features/order-list`, e `app` é a camada
// que pode.
//
// A lista é LITERAL (um símbolo por linha, pelos caminhos que os chamadores do painel usam).
import { describe, expect, it } from 'vitest'

import * as core from '@estrelinha/core/orders'
import { normalizeBrPhone } from '@estrelinha/core/notifications'

import * as listaModel from '@/features/order-list/model/chargeMaterial'
import * as listaFeature from '@/features/order-list'

const PARES: [string, unknown, unknown][] = [
  ['order-list/model/chargeMaterial.chargeMaterialText', listaModel.chargeMaterialText, core.chargeMaterialText],
  ['order-list/model/chargeMaterial.chargeMaterialUrl', listaModel.chargeMaterialUrl, core.chargeMaterialUrl],
  ['order-list.chargeMaterialText', listaFeature.chargeMaterialText, core.chargeMaterialText],
  ['order-list.chargeMaterialUrl', listaFeature.chargeMaterialUrl, core.chargeMaterialUrl],
  // `whatsappNumber` continua: é o nome antigo de `normalizeBrPhone`, e também por referência.
  ['order-list/model/chargeMaterial.whatsappNumber', listaModel.whatsappNumber, normalizeBrPhone],
  ['order-list.whatsappNumber', listaFeature.whatsappNumber, normalizeBrPhone],
]

/** A régua das asserções, em função: o sensor chama a MESMA. */
const mesmaReferencia = (painel: unknown, dono: unknown): boolean => painel === dono

describe('o painel reexporta o lembrete do material de core — identidade, não cópia (MAA-28)', () => {
  it('âncora: os 6 caminhos, nenhum valor ausente', () => {
    expect(PARES).toHaveLength(6)
    for (const [nome, painel, dono] of PARES) {
      expect(painel, `${nome} existe no painel`).toBeDefined()
      expect(dono, `${nome} existe em core`).toBeDefined()
    }
  })

  it.each(PARES)('%s é a mesma referência de core', (_nome, painel, dono) => {
    expect(mesmaReferencia(painel, dono)).toBe(true)
    expect(painel).toBe(dono)
  })

  it('sensor — uma cópia com o MESMO comportamento reprova na mesma régua', () => {
    const copia = (row: Parameters<typeof core.chargeMaterialText>[0], now?: Date): string =>
      core.chargeMaterialText(row, now)
    const linha = {
      material_status: 'aguardando_material',
      customer_name: 'Juliana',
      order_number: '0251',
      created_at: '2026-10-01T12:00:00Z',
      material_received_at: null,
    }
    const agora = new Date('2026-10-03T12:00:00Z')
    // Igualdade de valor: a cópia diz exatamente o mesmo...
    expect(copia(linha, agora)).toBe(core.chargeMaterialText(linha, agora))
    // ...e mesmo assim a régua a recusa.
    expect(mesmaReferencia(copia, core.chargeMaterialText)).toBe(false)
  })
})
