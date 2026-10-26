// Feature `75` (`MAA-18`, `MAA-19`, `MAA-28`, A18) — o lembrete do material no WhatsApp subiu do
// painel para `core`, BYTE A BYTE, para o app do ateliê e o painel montarem a mesma mensagem.
//
// Os textos abaixo são ESCRITOS POR EXTENSO, copiados do disco do painel na T01
// (`apps/backoffice/src/features/order-list/model/chargeMaterial.ts`, SHA-256 `8c1ba31e…` em
// `baseline.md`), e nunca lidos da implementação: comparar a função com ela mesma passaria com a
// frase trocada. A idade é calculada contra um `now` injetado, nunca o relógio da máquina.

import { describe, expect, it } from 'vitest'

import { MATERIAL_KIND_LABELS } from '../../material/material.ts'
import { URGENCY_TERMS } from '../../notifications/copy.ts'
import { chargeMaterialText, chargeMaterialUrl, type ChargeMaterialInput } from '../charge.ts'

const linha = (extra: Partial<ChargeMaterialInput> = {}): ChargeMaterialInput => ({
  material_status: 'aguardando_material',
  customer_name: 'Juliana Moraes',
  order_number: '0251',
  created_at: '2026-10-01T12:00:00Z',
  material_received_at: null,
  ...extra,
})

/** Dois dias depois da compra: `fresh`. */
const FRESCO = new Date('2026-10-03T12:00:00Z')
/** Vinte dias depois: `stale` (o degrau vira em 8, `aging.ts`). */
const ATRASADO = new Date('2026-10-21T12:00:00Z')

const AGUARDANDO_FRESCO =
  'Oi, Juliana! Aqui é a Adri, da Uma Estrelinha. ' +
  'Estou com o seu pedido #0251 guardado, esperando o material chegar para começar. ' +
  'Se precisar de ajuda para preparar ou postar, me conta que eu te explico com calma. ' +
  'Sem pressa nenhuma.'

const AGUARDANDO_ATRASADO =
  'Oi, Juliana! Aqui é a Adri, da Uma Estrelinha. ' +
  'Estou com o seu pedido #0251 guardado, esperando o material chegar para começar. ' +
  'Ele foi feito faz um tempinho, então queria saber se está tudo bem por aí. ' +
  'Se precisar de ajuda para preparar ou postar, me conta que eu te explico com calma. ' +
  'Sem pressa nenhuma.'

const JA_POSTOU =
  'Oi, Juliana! Aqui é a Adri, da Uma Estrelinha. ' +
  'Vi que você já postou o material do pedido #0251. ' +
  'Assim que ele chegar aqui eu te aviso e começo a peça. Qualquer dúvida, é só me chamar.'

describe('chargeMaterialText — o texto do painel, byte a byte (MAA-19, A18)', () => {
  it('aguardando, pedido recente: sem a frase do tempinho', () => {
    expect(chargeMaterialText(linha(), FRESCO)).toBe(AGUARDANDO_FRESCO)
  })

  it('aguardando, pedido parado (stale): com a frase do tempinho', () => {
    expect(chargeMaterialText(linha(), ATRASADO)).toBe(AGUARDANDO_ATRASADO)
  })

  it('a idade é contada contra o `now` recebido — o mesmo pedido muda de texto só pelo instante', () => {
    expect(chargeMaterialText(linha(), FRESCO)).not.toBe(chargeMaterialText(linha(), ATRASADO))
  })

  it('a idade corre desde o recebimento quando ele existe (`queueSince`)', () => {
    // Comprado há 20 dias, recebido há 2: a espera é de 2 dias, não de 20.
    const recebidoRecente = linha({ material_received_at: '2026-10-19T12:00:00Z' })
    expect(chargeMaterialText(recebidoRecente, ATRASADO)).toBe(AGUARDANDO_FRESCO)
  })

  it('quem já postou recebe outro texto, e não uma cobrança', () => {
    expect(chargeMaterialText(linha({ material_status: 'material_enviado' }), ATRASADO)).toBe(JA_POSTOU)
  })

  it('nome vazio, só espaço ou nulo: "Oi, Oi!" — o texto do painel, sem conserto de passagem', () => {
    const esperado = AGUARDANDO_FRESCO.replace('Oi, Juliana!', 'Oi, Oi!')
    expect(chargeMaterialText(linha({ customer_name: '' }), FRESCO)).toBe(esperado)
    expect(chargeMaterialText(linha({ customer_name: '   ' }), FRESCO)).toBe(esperado)
    expect(chargeMaterialText(linha({ customer_name: null }), FRESCO)).toBe(esperado)
  })

  it('usa só o primeiro nome, aparado', () => {
    expect(chargeMaterialText(linha({ customer_name: '  Luciana   Prado ' }), FRESCO)).toContain('Oi, Luciana!')
  })
})

describe('o lembrete não nomeia o material nem fabrica urgência (MAA-19, BL-015)', () => {
  const textos = [
    chargeMaterialText(linha(), FRESCO),
    chargeMaterialText(linha(), ATRASADO),
    chargeMaterialText(linha({ material_status: 'material_enviado' }), FRESCO),
  ]

  it.each(Object.values(MATERIAL_KIND_LABELS))('não nomeia "%s"', (rotulo) => {
    const palavra = new RegExp(`(?:^|[^\\p{L}])${rotulo}(?!\\p{L})`, 'iu')
    for (const texto of textos) expect(texto).not.toMatch(palavra)
  })

  it('nenhum termo de urgência da régua da loja', () => {
    for (const texto of textos) {
      for (const termo of URGENCY_TERMS) expect(texto.toLowerCase()).not.toContain(termo)
    }
  })

  it('sensor — a régua de material acusaria um texto que nomeasse as cinzas', () => {
    const palavra = new RegExp(`(?:^|[^\\p{L}])${MATERIAL_KIND_LABELS.cinzas}(?!\\p{L})`, 'iu')
    expect('esperando as cinzas chegarem').toMatch(palavra)
  })
})

describe('chargeMaterialUrl — o link do WhatsApp (MAA-18)', () => {
  it('com telefone: wa.me com o número normalizado e o texto codificado', () => {
    expect(chargeMaterialUrl(linha(), '(51) 99918-4227', FRESCO)).toBe(
      `https://wa.me/5551999184227?text=${encodeURIComponent(AGUARDANDO_FRESCO)}`,
    )
  })

  it('a idade chega à URL pelo `now` recebido', () => {
    expect(chargeMaterialUrl(linha(), '5551999184227', ATRASADO)).toBe(
      `https://wa.me/5551999184227?text=${encodeURIComponent(AGUARDANDO_ATRASADO)}`,
    )
  })

  it('sem telefone, ou com um número que não normaliza: wa.me SEM número (o ramo do painel sobe junto)', () => {
    const semNumero = `https://wa.me/?text=${encodeURIComponent(AGUARDANDO_FRESCO)}`
    expect(chargeMaterialUrl(linha(), null, FRESCO)).toBe(semNumero)
    expect(chargeMaterialUrl(linha(), undefined, FRESCO)).toBe(semNumero)
    expect(chargeMaterialUrl(linha(), '1234', FRESCO)).toBe(semNumero)
  })
})
