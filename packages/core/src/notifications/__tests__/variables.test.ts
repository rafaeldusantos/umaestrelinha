import { describe, expect, it } from 'vitest'

import { MATERIAL_EVENTS, NOTIFICATION_EVENTS } from '../events.ts'
import {
  NOTIFICATION_VARIABLES,
  greeting,
  interpolate,
  unknownVariables,
  usedVariables,
  variablesRefusal,
} from '../variables.ts'

/**
 * PNL-03 — o vocabulário fechado (spec, AC 3 do painel): as doze variáveis, a saudação que faz os
 * legados serem defaults byte a byte, a interpolação e a recusa que NOMEIA a variável.
 */

describe('NOTIFICATION_VARIABLES — as doze da spec', () => {
  it('são exatamente as doze, na ordem da AC', () => {
    expect([...NOTIFICATION_VARIABLES]).toEqual([
      'saudacao',
      'primeiro_nome',
      'numero_pedido',
      'rastreio',
      'transportadora',
      'link_conta',
      'link_pedido',
      'link_pedido_admin',
      'link_guia_material',
      'endereco_atelie',
      'whatsapp_atendimento',
      'total',
    ])
  })
})

describe('greeting — a regra de `greet`/`greetCalm` de templates.ts (AC 3)', () => {
  it('evento comum: "Oi, {nome}! " com exclamação e espaço no fim', () => {
    expect(greeting('Mariana', 'order_paid')).toBe('Oi, Mariana! ')
    expect(greeting('Mariana', 'order_received')).toBe('Oi, Mariana! ')
    expect(greeting('Mariana', 'order_shipped')).toBe('Oi, Mariana! ')
  })

  it.each(MATERIAL_EVENTS)('evento de material (%s): "Oi, {nome}. " — ponto, não exclamação', (event) => {
    expect(greeting('Mariana', event)).toBe('Oi, Mariana. ')
  })

  it('sem nome devolve string vazia — o texto começa direto, sem "Oi, !"', () => {
    for (const event of NOTIFICATION_EVENTS) {
      expect(greeting('', event)).toBe('')
      expect(greeting('   ', event)).toBe('')
    }
  })

  it('não recorta o nome — quem decide o primeiro nome é quem monta as variáveis', () => {
    expect(greeting('Ana Clara', 'order_paid')).toBe('Oi, Ana Clara! ')
  })
})

describe('interpolate — troca `{{variável}}` pelo valor', () => {
  it('variável presente vira o valor', () => {
    expect(interpolate('Pedido {{numero_pedido}} recebido', { numero_pedido: 'NP-1' })).toBe('Pedido NP-1 recebido')
  })

  it('variável conhecida sem valor vira vazio, não `undefined`', () => {
    expect(interpolate('Código: {{rastreio}}.', {})).toBe('Código: .')
    expect(interpolate('Código: {{rastreio}}.', { rastreio: undefined })).toBe('Código: .')
  })

  it('variável DESCONHECIDA é removida — `unknownVariables` acusa antes, isto é rede de segurança', () => {
    expect(interpolate('Oi {{nome_completo}}, tudo bem', {})).toBe('Oi , tudo bem')
  })

  it('aceita espaço por dentro das chaves e repete a mesma variável quantas vezes aparecer', () => {
    expect(interpolate('{{ numero_pedido }} / {{numero_pedido}}', { numero_pedido: 'NP-2' })).toBe('NP-2 / NP-2')
  })

  it('a saudação entra como qualquer outra — e produz o texto legado byte a byte', () => {
    expect(
      interpolate('{{saudacao}}Recebemos seu pagamento.', { saudacao: greeting('Mariana', 'order_paid') }),
    ).toBe('Oi, Mariana! Recebemos seu pagamento.')
    expect(interpolate('{{saudacao}}Recebemos seu pagamento.', { saudacao: greeting('', 'order_paid') })).toBe(
      'Recebemos seu pagamento.',
    )
  })

  it('NÃO escapa HTML — escapar é do layout, na composição', () => {
    expect(interpolate('{{primeiro_nome}} & cia', { primeiro_nome: 'Tom' })).toBe('Tom & cia')
    expect(interpolate('{{primeiro_nome}}', { primeiro_nome: '<b>Tom</b>' })).toBe('<b>Tom</b>')
  })

  it('texto sem variável sai intacto, chave solta inclusive', () => {
    expect(interpolate('Sem variável { aqui } nem }} lá', {})).toBe('Sem variável { aqui } nem }} lá')
  })
})

describe('unknownVariables / usedVariables', () => {
  it('lista o que está fora do vocabulário, sem repetir, na ordem', () => {
    expect(unknownVariables('{{nome}} {{numero_pedido}} {{Nome}} {{nome}}')).toEqual(['nome', 'Nome'])
  })

  it('texto só com variáveis conhecidas devolve lista vazia', () => {
    expect(unknownVariables('{{saudacao}}Pedido {{numero_pedido}}: {{total}}')).toEqual([])
  })

  it('a caixa importa — `{{Total}}` não é `{{total}}`', () => {
    expect(unknownVariables('{{Total}}')).toEqual(['Total'])
  })

  it('`usedVariables` lista as conhecidas que o texto usa', () => {
    expect(usedVariables('{{saudacao}}Pedido {{numero_pedido}}, {{numero_pedido}} {{xpto}}')).toEqual([
      'saudacao',
      'numero_pedido',
    ])
  })
})

describe('variablesRefusal — recusa ao salvar, nomeando a variável (AC 3)', () => {
  it('texto limpo → null', () => {
    expect(variablesRefusal('{{saudacao}}Seu pedido {{numero_pedido}} saiu.')).toBeNull()
    expect(variablesRefusal('Sem variável nenhuma.')).toBeNull()
  })

  it('uma desconhecida → a mensagem a nomeia entre chaves', () => {
    const recusa = variablesRefusal('Oi {{nome}}')
    expect(recusa).not.toBeNull()
    expect(recusa).toContain('{{nome}}')
    expect(recusa).toMatch(/^Variável desconhecida/)
  })

  it('várias desconhecidas → todas nomeadas', () => {
    const recusa = variablesRefusal('{{nome}} {{valor}}')
    expect(recusa).toContain('{{nome}}')
    expect(recusa).toContain('{{valor}}')
    expect(recusa).toMatch(/^Variáveis desconhecidas/)
  })

  it('a recusa lista as variáveis disponíveis, para a dona não precisar adivinhar', () => {
    const recusa = variablesRefusal('{{nome}}') ?? ''
    for (const v of NOTIFICATION_VARIABLES) expect(recusa).toContain(`{{${v}}}`)
  })
})
