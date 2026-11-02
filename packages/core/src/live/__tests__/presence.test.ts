// A presença da Loja ao vivo: o funil exclusivo, as frases do cartão "Agora na loja" e o mini gráfico.
import { describe, expect, it } from 'vitest'

import { LIVE_WINDOW_MIN, funnelOf, funnelStage } from '../presence.ts'

describe('a janela da presença', () => {
  it('é de 5 minutos, numa constante só', () => {
    expect(LIVE_WINDOW_MIN).toBe(5)
  })
})

describe('o funil: olhando, com sacola e no checkout são exclusivos e somam o total', () => {
  it('quem está no checkout conta no checkout, mesmo com joia na sacola', () => {
    expect(funnelStage({ page: 'checkout', cart: 3 })).toBe('checkout')
    expect(funnelStage({ page: 'checkout', cart: 0 })).toBe('checkout')
  })

  it('com joia na sacola, fora do checkout, conta na sacola — em qualquer página', () => {
    expect(funnelStage({ page: 'joia', cart: 1 })).toBe('sacola')
    expect(funnelStage({ page: 'sacola', cart: 2 })).toBe('sacola')
    expect(funnelStage({ page: 'outra', cart: 1 })).toBe('sacola')
  })

  it('sem sacola e fora do checkout, olhando — inclusive na página da sacola vazia', () => {
    expect(funnelStage({ page: 'joia', cart: 0 })).toBe('olhando')
    expect(funnelStage({ page: 'sacola', cart: 0 })).toBe('olhando')
    expect(funnelStage({ page: 'guia', cart: 0 })).toBe('olhando')
  })

  it('as três faixas somam o total, e cada pessoa entra em uma só', () => {
    const pessoas = [
      { page: 'checkout', cart: 2 },
      { page: 'checkout', cart: 0 },
      { page: 'joia', cart: 1 },
      { page: 'lista', cart: 0 },
      { page: 'joia', cart: 0 },
      { page: 'guia', cart: 0 },
      { page: 'sacola', cart: 4 },
    ] as const
    const f = funnelOf(pessoas)
    expect(f).toEqual({ total: 7, olhando: 3, sacola: 2, checkout: 2 })
    expect(f.olhando + f.sacola + f.checkout).toBe(f.total)
  })

  it('ninguém na loja: tudo zero', () => {
    expect(funnelOf([])).toEqual({ total: 0, olhando: 0, sacola: 0, checkout: 0 })
  })
})

import {
  CHECKOUT_NOTE,
  LIVE_CARD_TITLE,
  NOBODY_IN_STORE,
  NOBODY_ON_JEWEL,
  liveCardFailedLabel,
  liveCardLabel,
  liveCardLine,
  liveCardLoadingLabel,
  liveCardNotMeasuredLabel,
  liveMiniBars,
  liveNotMeasuredLine,
  peopleCount,
  peopleWord,
} from '../presence.ts'

describe('as frases do cartão "Agora na loja"', () => {
  it('o eyebrow e o estado vazio, sem ponto final no cartão', () => {
    expect(LIVE_CARD_TITLE).toBe('Agora na loja')
    expect(NOBODY_IN_STORE).toBe('Ninguém na loja agora')
    expect(NOBODY_ON_JEWEL).toBe('Ninguém olhando uma joia agora.')
  })

  it('"pessoa" só com um; o número em pt-BR', () => {
    expect(peopleWord(1)).toBe('pessoa')
    expect(peopleWord(0)).toBe('pessoas')
    expect(peopleWord(2)).toBe('pessoas')
    expect(peopleCount(1)).toBe('1 pessoa')
    expect(peopleCount(7)).toBe('7 pessoas')
    expect(peopleCount(1240)).toBe('1.240 pessoas')
  })

  it('o nome acessível diz quantas pessoas e o que o toque faz', () => {
    expect(liveCardLabel(1)).toBe('Agora na loja, 1 pessoa. Abrir loja ao vivo')
    expect(liveCardLabel(7)).toBe('Agora na loja, 7 pessoas. Abrir loja ao vivo')
    expect(liveCardLabel(0)).toBe('Agora na loja, 0 pessoas. Abrir loja ao vivo')
    expect(liveCardLoadingLabel).toBe('Agora na loja, carregando. Abrir loja ao vivo')
    expect(liveCardFailedLabel).toBe('Agora na loja: não consegui carregar. Tentar de novo')
  })

  it('a linha do funil: cada parte some no zero, e "joias" a partir de duas', () => {
    expect(liveCardLine({ sacola: 1, checkout: 1 })).toBe('1 com joia na sacola · 1 no checkout')
    expect(liveCardLine({ sacola: 2, checkout: 3 })).toBe('2 com joias na sacola · 3 no checkout')
    expect(liveCardLine({ sacola: 0, checkout: 2 })).toBe('2 no checkout')
    expect(liveCardLine({ sacola: 4, checkout: 0 })).toBe('4 com joias na sacola')
    expect(liveCardLine({ sacola: 0, checkout: 0 })).toBeNull()
  })

  it('a nota do checkout não cita prazo', () => {
    expect(CHECKOUT_NOTE).toBe(
      'Alguém está no checkout agora. Se a compra não fechar e o e-mail já tiver sido preenchido, a sacola fica em Carrinhos abandonados, no painel.',
    )
    expect(CHECKOUT_NOTE).not.toMatch(/\d|hora|minuto|dia/i)
  })
})

describe('a loja ainda não medida usa a frase de Acessos', () => {
  it('sem contagem e sem endereço: o contador parado', () => {
    const l = { contagem_desde: null, production_host: '  ' }
    expect(liveNotMeasuredLine(l)).toBe('O contador está parado: falta configurar o endereço de produção da loja.')
    expect(liveCardNotMeasuredLabel(l)).toBe(
      'Agora na loja. O contador está parado: falta configurar o endereço de produção da loja. Abrir loja ao vivo',
    )
  })

  it('sem contagem e com endereço: só conta naquele endereço', () => {
    expect(liveNotMeasuredLine({ contagem_desde: null, production_host: 'umaestrelinha.com.br' })).toBe(
      'Nenhuma visita registrada ainda. O contador só conta na loja em umaestrelinha.com.br.',
    )
  })

  it('com contagem: medida, nenhuma frase', () => {
    expect(liveNotMeasuredLine({ contagem_desde: '2026-10-20T12:00:00Z', production_host: 'x' })).toBeNull()
  })
})

describe('o mini gráfico do cartão: as últimas 15 das 30 barras', () => {
  const trinta = (ultimos: number[]) => [...Array(30 - ultimos.length).fill(0), ...ultimos]

  it('15 barras, só a última é a atual, e cada uma carrega o número dela', () => {
    const minutos = trinta([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20])
    const barras = liveMiniBars(minutos)
    expect(barras).toHaveLength(15)
    expect(barras.map((b) => b.n)).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20])
    expect(barras.filter((b) => b.atual)).toEqual([barras[14]])
  })

  it('a altura é relativa ao maior dos 30 minutos, não só dos 15 desenhados', () => {
    const minutos = trinta([20, ...Array(14).fill(0), 5])
    minutos[0] = 40
    const barras = liveMiniBars(minutos)
    // maior = 40 (fora das 15): a de 20 vale metade do teto, a de 5 um oitavo
    expect(barras[14].altura).toBe(5)
    expect(liveMiniBars(trinta([40])).at(-1)!.altura).toBe(40)
  })

  it('piso de 3 px (também com a loja vazia) e teto de 40', () => {
    expect(liveMiniBars(Array(30).fill(0)).every((b) => b.altura === 3)).toBe(true)
    const barras = liveMiniBars(trinta([1, 100]))
    expect(barras.at(-2)!.altura).toBe(3)
    expect(barras.at(-1)!.altura).toBe(40)
  })
})
