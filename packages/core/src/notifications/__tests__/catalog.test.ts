// Feature 56 — o guarda do catálogo de apresentação (`LEG-01`..`LEG-03`).
//
// A **pureza** do módulo (nada de React, nada de alias, `.ts` em todo import relativo) já é medida
// por `purity.test.ts`, ao lado: `catalog.ts` entra na varredura dele por construção, porque ela
// lista o diretório do disco. Repetir aqui seria a segunda régua da mesma regra — e a que fica para
// trás quando a primeira mudar.
//
// O que este arquivo mede é o que só ele pode medir: que os três mapas dizem coisas verdadeiras e
// **distintas** do que os mapas vizinhos já diziam.

import { describe, expect, it } from 'vitest'

import { NOTIFICATION_EVENTS, NOTIFICATION_EVENT_LABELS } from '../events.ts'
import {
  NOTIFICATION_EVENT_DESCRIPTIONS,
  NOTIFICATION_EVENT_ICONS,
  NOTIFICATION_EVENT_NAMES,
  NOTIFICATION_ICON_KEYS,
} from '../catalog.ts'

/** Sem isto, uma lista vazia satisfaria todo `for` abaixo — a falha mais silenciosa possível. */
describe('catálogo de apresentação — âncora', () => {
  it('os dezessete eventos estão na varredura', () => {
    // 15 na feature 56; a 57 acrescentou `owner_order_received` e `owner_payment_rejected`.
    expect(NOTIFICATION_EVENTS).toHaveLength(17)
  })

  it('os três mapas cobrem exatamente os quinze, sem chave a mais', () => {
    // O `tsc` pega o sentido "faltando" (o `Record` não compila). Ele **não** pega o outro: uma
    // chave a mais, escrita por engano com o nome de um evento que foi renomeado, é só uma
    // propriedade extra em tempo de execução.
    const esperado = [...NOTIFICATION_EVENTS].sort()
    for (const [nome, mapa] of [
      ['NOTIFICATION_EVENT_NAMES', NOTIFICATION_EVENT_NAMES],
      ['NOTIFICATION_EVENT_DESCRIPTIONS', NOTIFICATION_EVENT_DESCRIPTIONS],
      ['NOTIFICATION_EVENT_ICONS', NOTIFICATION_EVENT_ICONS],
    ] as const) {
      expect(Object.keys(mapa).sort(), nome).toEqual(esperado)
    }
  })
})

describe('LEG-01 — o nome não é o rótulo do histórico', () => {
  it('nenhum dos quinze nomes é igual ao rótulo de histórico do mesmo evento', () => {
    // A regra que impede o defeito de voltar. Os dois mapas respondem perguntas diferentes (ver o
    // cabeçalho de `catalog.ts`); no dia em que alguém achar que são cópias e colar um no outro, a
    // tela de configuração volta a intitular cada card no PASSADO — "Confirmação do pedido enviada"
    // acima de um interruptor desligado — e nada mais acusaria.
    const iguais = NOTIFICATION_EVENTS.filter(
      (e) => NOTIFICATION_EVENT_NAMES[e] === NOTIFICATION_EVENT_LABELS[e],
    )

    expect(iguais).toEqual([])
  })

  it('SENSOR: a régua acusaria a cópia, se houvesse', () => {
    // Sem isto, um erro de digitação na comparação acima faria a asserção passar por vacuidade.
    const envenenado: Record<string, string> = {
      ...NOTIFICATION_EVENT_NAMES,
      order_received: NOTIFICATION_EVENT_LABELS.order_received,
    }
    const iguais = NOTIFICATION_EVENTS.filter((e) => envenenado[e] === NOTIFICATION_EVENT_LABELS[e])

    expect(iguais).toEqual(['order_received'])
  })

  it('os nomes são únicos, não vazios e curtos o bastante para caber ao lado do interruptor', () => {
    const nomes = NOTIFICATION_EVENTS.map((e) => NOTIFICATION_EVENT_NAMES[e])

    expect(new Set(nomes).size).toBe(nomes.length)
    for (const nome of nomes) {
      expect(nome.trim(), nome).not.toBe('')
      // 40 caracteres é o que cabe em 390px ao lado de um ícone de 34 e um interruptor de 44 sem
      // embrulhar em três linhas. Não é estética: é a única medida de layout que jsdom permite
      // ancorar — o comprimento do texto.
      expect(nome.length, nome).toBeLessThanOrEqual(40)
    }
  })

  it('nenhum nome está no passado com a forma do histórico ("… enviada", "… enviado")', () => {
    // A cópia manual não precisa ser literal para trazer o defeito de volta: basta escrever no
    // mesmo tempo verbal. Esta régua pega a família, não só a igualdade.
    const passado = NOTIFICATION_EVENTS.filter((e) => /\benviad[oa]s?\b/i.test(NOTIFICATION_EVENT_NAMES[e]))

    expect(passado).toEqual([])
  })
})

describe('LEG-02 — a descrição diz QUANDO o evento dispara', () => {
  it('as descrições são únicas, não vazias e cabem em uma linha', () => {
    const descricoes = NOTIFICATION_EVENTS.map((e) => NOTIFICATION_EVENT_DESCRIPTIONS[e])

    expect(new Set(descricoes).size).toBe(descricoes.length)
    for (const d of descricoes) {
      expect(d.trim(), d).not.toBe('')
      expect(d.length, d).toBeLessThanOrEqual(90)
    }
  })

  it('toda descrição começa por "Enviado" — ela responde QUANDO, nunca O QUE', () => {
    // O modo de falha que isto prende é a descrição virar um segundo rótulo ("Aviso de pagamento"),
    // que repetiria o nome logo acima dela em vez de acrescentar a única informação que a tela não
    // tinha.
    const fora = NOTIFICATION_EVENTS.filter((e) => !NOTIFICATION_EVENT_DESCRIPTIONS[e].startsWith('Enviado'))

    expect(fora).toEqual([])
  })

  it('nenhuma descrição leva exclamação — é a mesma régua de tom do texto dos e-mails', () => {
    const animadas = NOTIFICATION_EVENTS.filter((e) => NOTIFICATION_EVENT_DESCRIPTIONS[e].includes('!'))

    expect(animadas).toEqual([])
  })
})

describe('LEG-03 — a chave de ícone é de um vocabulário fechado', () => {
  it('toda chave usada existe no vocabulário', () => {
    const fora = NOTIFICATION_EVENTS.filter(
      (e) => !(NOTIFICATION_ICON_KEYS as readonly string[]).includes(NOTIFICATION_EVENT_ICONS[e]),
    )

    expect(fora).toEqual([])
  })

  it('toda chave do vocabulário é usada por algum evento — sem chave órfã', () => {
    // O sentido que o `tsc` não pega. Chave que ninguém usa vira um componente no bundle do painel
    // sem ninguém alcançar, exatamente como um painel sem seção.
    const usadas = new Set<string>(NOTIFICATION_EVENTS.map((e) => NOTIFICATION_EVENT_ICONS[e]))
    const orfas = NOTIFICATION_ICON_KEYS.filter((k) => !usadas.has(k))

    expect(orfas).toEqual([])
  })

  it('cada evento tem um ícone DISTINTO', () => {
    // No card recolhido o ícone é metade do que distingue uma linha da outra — o resto é o nome.
    // Dois eventos com o mesmo desenho apagariam essa metade.
    const chaves = NOTIFICATION_EVENTS.map((e) => NOTIFICATION_EVENT_ICONS[e])

    expect(new Set(chaves).size).toBe(chaves.length)
    expect(NOTIFICATION_ICON_KEYS).toHaveLength(17)
  })
})
