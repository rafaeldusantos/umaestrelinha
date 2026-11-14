import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { formatPrice } from '../../formatters/price.ts'
import {
  freeShippingConfigOf,
  freeShippingRefusal,
  freeShippingRuleText,
  freeShippingState,
  type FreeShippingConfig,
} from '../freeShipping.ts'
import { FREE_SHIPPING_REGIONS } from '../region.ts'

/**
 * `FRG-03` — o dono único da pergunta "esta loja pratica frete grátis, e falta quanto?".
 *
 * O que este arquivo protege não é aritmética: é a **invariante 1**, `active === false ⇒
 * reached === false`. Antes da feature 37, sete superfícies respondiam por conta própria e
 * discordavam no caso de borda — com a faixa em zero, três escondiam o texto e quatro **zeravam o
 * frete**. Um `reached` verdadeiro com a funcionalidade desligada devolve exatamente esse defeito, e
 * ele é invisível: o texto some da tela e o dinheiro continua saindo.
 *
 * Os três primeiros casos de `progresso` vieram de `drawerFacts.test.ts` (`freeShippingProgress`,
 * apagada nesta feature). É a migração de asserção prevista pelo `CLAUDE.md` — queda de contagem lá,
 * contrapartida aqui — e o terceiro deles teve o **veredito invertido de propósito**: a função
 * antiga tratava faixa zerada como "frete grátis sempre", que é a leitura que custava dinheiro.
 */

const ligado = (threshold: number): FreeShippingConfig => ({
  free_shipping_enabled: true,
  free_shipping_threshold: threshold,
})

const desligado = (threshold: number): FreeShippingConfig => ({
  free_shipping_enabled: false,
  free_shipping_threshold: threshold,
})

const SUL_E_SUDESTE = ['sul', 'sudeste']

const campanha = (threshold: number): FreeShippingConfig => ({
  free_shipping_enabled: true,
  free_shipping_threshold: threshold,
  free_shipping_regions: SUL_E_SUDESTE,
})

/** CEPs reais de cada lado da campanha Sul + Sudeste. */
const CEP_SP = '01310-100'
const CEP_RS = '90010-000'
const CEP_BA = '40010-000'

/** O estado inativo, com os campos de região — o mesmo objeto em todo caminho inativo. */
const INATIVO_ESPERADO = {
  active: false,
  threshold: 0,
  remaining: 0,
  percent: 0,
  reached: false,
  destination: 'unknown',
  granted: false,
  regions: [],
  regionLimited: false,
}

describe('freeShippingState — invariante 1: desligado nunca "atinge"', () => {
  it('subtotal MUITO acima da faixa guardada não libera nada', () => {
    // O caso que custava dinheiro. Com a implementação antiga (`subtotal >= threshold`), este
    // cenário zerava o frete no checkout enquanto a vitrine não prometia nada.
    const estado = freeShippingState(desligado(150), 10_000)
    expect(estado.reached).toBe(false)
    expect(estado.active).toBe(false)
    expect(estado.remaining).toBe(0)
  })

  it('subtotal exatamente na faixa guardada não libera nada', () => {
    expect(freeShippingState(desligado(150), 150).reached).toBe(false)
  })

  it('desligado com faixa zerada também não libera nada', () => {
    // A leitura antiga de `freeShippingProgress`: threshold 0 devolvia `reached: true`.
    expect(freeShippingState(desligado(0), 30).reached).toBe(false)
  })
})

describe('freeShippingState — invariante 2: ligado sem faixa é dado inválido, não "frete grátis sempre"', () => {
  it('faixa zerada com o interruptor ligado devolve inativo', () => {
    const estado = freeShippingState(ligado(0), 30)
    expect(estado.active).toBe(false)
    expect(estado.reached).toBe(false)
  })

  it('faixa negativa com o interruptor ligado devolve inativo', () => {
    expect(freeShippingState(ligado(-50), 30).active).toBe(false)
  })

  it('nem faixa zerada nem negativa produzem NaN ou Infinity em percent', () => {
    for (const config of [ligado(0), ligado(-50), desligado(0)]) {
      const { percent } = freeShippingState(config, 30)
      expect(Number.isFinite(percent)).toBe(true)
      expect(percent).toBe(0)
    }
  })
})

describe('freeShippingState — invariante 3: inativo não vaza o número guardado', () => {
  it('threshold devolvido é zero quando desligado, mesmo com faixa configurada em 150', () => {
    // Uma superfície que renderize `state.threshold` não consegue anunciar "R$ 150" enquanto a
    // funcionalidade está desligada.
    expect(freeShippingState(desligado(150), 0).threshold).toBe(0)
  })

  it('o estado inativo é inteiramente neutro', () => {
    expect(freeShippingState(desligado(150), 90)).toEqual(INATIVO_ESPERADO)
  })

  it('o estado inativo é neutro também com CEP — inclusive um de dentro da campanha', () => {
    expect(freeShippingState(desligado(150), 90, CEP_SP)).toEqual(INATIVO_ESPERADO)
    expect(freeShippingState({ ...campanha(150), free_shipping_enabled: false }, 900, CEP_RS)).toEqual(
      INATIVO_ESPERADO,
    )
  })
})

describe('freeShippingState — progresso com o interruptor ligado', () => {
  // Os três casos abaixo migraram de `drawerFacts.test.ts`.
  it('mede quanto falta e a fração já percorrida', () => {
    const p = freeShippingState(ligado(150), 134.7)
    expect(p.remaining).toBeCloseTo(15.3, 2)
    expect(p.percent).toBeCloseTo(89.8, 2)
    expect(p.reached).toBe(false)
  })

  it('atingida a faixa, não falta nada e a barra para em 100', () => {
    const p = freeShippingState(ligado(150), 200)
    expect(p.reached).toBe(true)
    expect(p.remaining).toBe(0)
    expect(p.percent).toBe(100)
  })

  it('faixa zerada NÃO é mais "frete grátis sempre" — veredito invertido na feature 37', () => {
    // Este é o caso cuja resposta mudou. A função antiga devolvia `reached: true`, e era ela que
    // fazia zerar o campo no painel liberar frete grátis para todo mundo.
    const p = freeShippingState(ligado(0), 30)
    expect(p).toEqual(INATIVO_ESPERADO)
  })

  it('subtotal exatamente na faixa já atinge', () => {
    expect(freeShippingState(ligado(150), 150).reached).toBe(true)
  })

  it('carrinho vazio começa do zero, sem atingir', () => {
    const p = freeShippingState(ligado(150), 0)
    expect(p).toEqual({
      active: true,
      threshold: 150,
      remaining: 150,
      percent: 0,
      reached: false,
      destination: 'unknown',
      granted: false,
      regions: [...FREE_SHIPPING_REGIONS],
      regionLimited: false,
    })
  })

  it('acima da faixa, sem CEP e com as cinco regiões, o estado inteiro', () => {
    expect(freeShippingState(ligado(150), 200)).toEqual({
      active: true,
      threshold: 150,
      remaining: 0,
      percent: 100,
      reached: true,
      destination: 'unknown',
      granted: true,
      regions: [...FREE_SHIPPING_REGIONS],
      regionLimited: false,
    })
  })

  it('percent é limitado nas DUAS pontas — subtotal negativo não produz barra negativa', () => {
    expect(freeShippingState(ligado(150), -40).percent).toBe(0)
  })

  it('subtotal impossível (NaN) vira zero em vez de contaminar a barra', () => {
    const p = freeShippingState(ligado(150), Number.NaN)
    expect(p.percent).toBe(0)
    expect(p.remaining).toBe(150)
    expect(p.reached).toBe(false)
  })
})

describe('freeShippingState — o estado inativo continua congelado e compartilhado', () => {
  it('é o MESMO objeto em todo caminho inativo, e congelado', () => {
    const a = freeShippingState(desligado(150), 90)
    const b = freeShippingState(ligado(0), 30, CEP_SP)
    const c = freeShippingState({ ...campanha(150), free_shipping_regions: [] }, 900, CEP_RS)
    expect(a).toBe(b)
    expect(b).toBe(c)
    expect(Object.isFrozen(a)).toBe(true)
    expect(Object.isFrozen(a.regions)).toBe(true)
  })
})

describe('freeShippingState — com as cinco regiões, idêntico a hoje (CA-19)', () => {
  // As cinco, por campo ausente e por lista explícita, valem igual: nenhum CEP muda o veredito.
  const configs: Array<[string, FreeShippingConfig]> = [
    ['campo ausente', ligado(150)],
    ['as cinco explícitas', { ...ligado(150), free_shipping_regions: [...FREE_SHIPPING_REGIONS] }],
    ['as cinco fora de ordem', { ...ligado(150), free_shipping_regions: ['norte', 'sul', 'nordeste', 'sudeste', 'centro-oeste'] }],
  ]
  const ceps: Array<string | null | undefined> = [undefined, null, '', '0131', '00000-000', CEP_SP, CEP_RS, CEP_BA, '69900-000']
  const subtotais = [0, 134.7, 149.99, 150, 200]

  it.each(configs)('%s: os campos de hoje e `granted === reached`, com qualquer CEP e sem CEP', (_nome, config) => {
    for (const subtotal of subtotais) {
      // A regra de antes da região, escrita à parte: comparar com o próprio estado sem CEP seria
      // comparar a implementação nova com ela mesma.
      const remaining = Math.max(150 - subtotal, 0)
      const hoje = {
        active: true,
        threshold: 150,
        remaining,
        percent: Math.min(Math.max((subtotal / 150) * 100, 0), 100),
        reached: remaining <= 0,
      }
      for (const cep of ceps) {
        const estado = freeShippingState(config, subtotal, cep)
        expect(estado.active).toBe(hoje.active)
        expect(estado.threshold).toBe(hoje.threshold)
        expect(estado.remaining).toBe(hoje.remaining)
        expect(estado.percent).toBe(hoje.percent)
        expect(estado.reached).toBe(hoje.reached)
        expect(estado.granted).toBe(hoje.reached)
        expect(estado.regionLimited).toBe(false)
        expect(estado.regions).toEqual([...FREE_SHIPPING_REGIONS])
      }
    }
  })

  it('o destino é coerente com o CEP: válido ⇒ dentro; inválido ou ausente ⇒ desconhecido', () => {
    expect(freeShippingState(ligado(150), 10, CEP_BA).destination).toBe('inside')
    expect(freeShippingState(ligado(150), 10, CEP_SP).destination).toBe('inside')
    expect(freeShippingState(ligado(150), 10, '00000-000').destination).toBe('unknown')
    expect(freeShippingState(ligado(150), 10, '0131').destination).toBe('unknown')
    expect(freeShippingState(ligado(150), 10, null).destination).toBe('unknown')
  })
})

describe('freeShippingState — campanha Sul + Sudeste', () => {
  it('as regiões efetivas e o limite aparecem no estado', () => {
    const estado = freeShippingState(campanha(450), 100)
    expect(estado.regions).toEqual(['sul', 'sudeste'])
    expect(estado.regionLimited).toBe(true)
  })

  it('sem CEP, abaixo da faixa: diz quanto falta e não concede', () => {
    const estado = freeShippingState(campanha(450), 401.83)
    expect(estado.active).toBe(true)
    expect(estado.remaining).toBeCloseTo(48.17, 2)
    expect(estado.reached).toBe(false)
    expect(estado.granted).toBe(false)
    expect(estado.destination).toBe('unknown')
  })

  it('sem CEP, acima da faixa: `reached` e NÃO `granted`', () => {
    for (const cep of [undefined, null, '', '9001', '00500-000']) {
      const estado = freeShippingState(campanha(450), 500, cep)
      expect(estado.reached).toBe(true)
      expect(estado.granted).toBe(false)
      expect(estado.destination).toBe('unknown')
    }
  })

  it('CEP de SP e de RS acima da faixa: concedido, dentro', () => {
    for (const cep of [CEP_SP, CEP_RS, '01310100', '99999-999']) {
      const estado = freeShippingState(campanha(450), 450, cep)
      expect(estado.destination).toBe('inside')
      expect(estado.reached).toBe(true)
      expect(estado.granted).toBe(true)
    }
  })

  it('CEP de SP abaixo da faixa: dentro, e ainda não concedido', () => {
    const estado = freeShippingState(campanha(450), 100, CEP_SP)
    expect(estado.destination).toBe('inside')
    expect(estado.granted).toBe(false)
    expect(estado.remaining).toBe(350)
  })

  it('CEP da BA: fora, e nunca concedido — em qualquer subtotal', () => {
    for (const subtotal of [0, 100, 449.99, 450, 10_000]) {
      const estado = freeShippingState(campanha(450), subtotal, CEP_BA)
      expect(estado.destination).toBe('outside')
      expect(estado.granted).toBe(false)
    }
    // O valor continua sendo medido: `reached` é "o valor atingiu a faixa", não "concedido".
    expect(freeShippingState(campanha(450), 10_000, CEP_BA).reached).toBe(true)
  })

  it('lista vazia com o interruptor ligado: inativo, como a faixa zerada', () => {
    const estado = freeShippingState({ ...campanha(450), free_shipping_regions: [] }, 900, CEP_SP)
    expect(estado).toEqual(INATIVO_ESPERADO)
  })

  it('regiões ausentes valem as cinco: o CEP da BA é concedido acima da faixa', () => {
    const estado = freeShippingState(ligado(450), 500, CEP_BA)
    expect(estado.granted).toBe(true)
    expect(estado.regionLimited).toBe(false)
  })
})

describe('freeShippingConfigOf — a configuração a partir do objeto cru', () => {
  it('o objeto completo', () => {
    expect(
      freeShippingConfigOf({
        free_shipping_enabled: true,
        free_shipping_threshold: 450,
        free_shipping_regions: ['sudeste', 'sul'],
        pickup_enabled: true,
      }),
    ).toEqual({
      free_shipping_enabled: true,
      free_shipping_threshold: 450,
      free_shipping_regions: ['sul', 'sudeste'],
    })
  })

  it('sem `free_shipping_regions` ⇒ as cinco', () => {
    expect(freeShippingConfigOf({ free_shipping_enabled: true, free_shipping_threshold: 150 })).toEqual({
      free_shipping_enabled: true,
      free_shipping_threshold: 150,
      free_shipping_regions: [...FREE_SHIPPING_REGIONS],
    })
  })

  it('lista inválida: o que não é lista vale as cinco; o slug desconhecido é descartado', () => {
    expect(
      freeShippingConfigOf({ free_shipping_enabled: true, free_shipping_threshold: 150, free_shipping_regions: 'sul' })
        .free_shipping_regions,
    ).toEqual([...FREE_SHIPPING_REGIONS])
    expect(
      freeShippingConfigOf({
        free_shipping_enabled: true,
        free_shipping_threshold: 150,
        free_shipping_regions: ['sul', 'xyz', 7, 'sul'],
      }).free_shipping_regions,
    ).toEqual(['sul'])
  })

  it('valores inválidos de interruptor e faixa são descartados', () => {
    expect(
      freeShippingConfigOf({ free_shipping_enabled: 'sim', free_shipping_threshold: Number.NaN }),
    ).toEqual({
      free_shipping_enabled: false,
      free_shipping_threshold: 0,
      free_shipping_regions: [...FREE_SHIPPING_REGIONS],
    })
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['objeto vazio', {}],
  ])('%s ⇒ desligado, faixa zero, as cinco', (_nome, cru) => {
    expect(freeShippingConfigOf(cru)).toEqual({
      free_shipping_enabled: false,
      free_shipping_threshold: 0,
      free_shipping_regions: [...FREE_SHIPPING_REGIONS],
    })
  })

  it('o que ela devolve alimenta o estado sem adaptador', () => {
    const config = freeShippingConfigOf({
      free_shipping_enabled: true,
      free_shipping_threshold: 450,
      free_shipping_regions: SUL_E_SUDESTE,
    })
    expect(freeShippingState(config, 500, CEP_BA).destination).toBe('outside')
  })
})

describe('freeShippingRuleText — a frase da regra do ⓘ', () => {
  it('com Sul + Sudeste, a regra com as regiões e os estados', () => {
    expect(freeShippingRuleText(campanha(450))).toBe(
      `Compras a partir de ${formatPrice(450)} têm frete grátis para entregas no Sul (PR, SC, RS) e no Sudeste (SP, RJ, MG, ES). A região é conferida pelo CEP.`,
    )
  })

  it('com as cinco regiões, a regra sem região', () => {
    expect(freeShippingRuleText(ligado(450))).toBe(
      `Compras a partir de ${formatPrice(450)} têm frete grátis.`,
    )
  })

  it('inativo ⇒ nenhuma frase', () => {
    expect(freeShippingRuleText(desligado(450))).toBeNull()
    expect(freeShippingRuleText(ligado(0))).toBeNull()
    expect(freeShippingRuleText({ ...campanha(450), free_shipping_regions: [] })).toBeNull()
  })

  it('sem exclamação', () => {
    expect(freeShippingRuleText(campanha(450))).not.toMatch(/!/)
  })
})

describe('freeShippingRefusal — o painel não grava configuração impossível (FRG-12)', () => {
  it('ligado sem região é recusado, com o motivo da spec', () => {
    expect(freeShippingRefusal({ ...campanha(450), free_shipping_regions: [] })).toBe(
      'Escolha ao menos uma região para o frete grátis, ou desligue o frete grátis.',
    )
  })

  it('desligado sem região passa', () => {
    expect(freeShippingRefusal({ ...desligado(450), free_shipping_regions: [] })).toBeNull()
  })

  it('ligado com regiões, ou sem o campo, passa', () => {
    expect(freeShippingRefusal(campanha(450))).toBeNull()
    expect(freeShippingRefusal(ligado(450))).toBeNull()
  })

  it('a recusa da faixa vem antes da de região', () => {
    expect(freeShippingRefusal({ ...ligado(0), free_shipping_regions: [] })).toMatch(/valor/i)
  })

  it('desligado é sempre gravável, qualquer que seja a faixa guardada', () => {
    expect(freeShippingRefusal(desligado(0))).toBeNull()
    expect(freeShippingRefusal(desligado(150))).toBeNull()
  })

  it('ligado com faixa válida é gravável', () => {
    expect(freeShippingRefusal(ligado(150))).toBeNull()
    expect(freeShippingRefusal(ligado(0.01))).toBeNull()
  })

  it('ligado com faixa zerada é recusado, com motivo legível', () => {
    const motivo = freeShippingRefusal(ligado(0))
    expect(motivo).toBeTypeOf('string')
    expect(motivo).toMatch(/valor/i)
  })

  it('ligado com faixa negativa é recusado', () => {
    expect(freeShippingRefusal(ligado(-1))).toBeTypeOf('string')
  })

  it('o motivo não usa linguagem festiva nem urgência fabricada', () => {
    // O negócio é memorial: nada de exclamação comemorativa nem de pressa inventada, nem no erro
    // de formulário. Mesma régua de `storeSettingsDefaults`.
    const motivo = freeShippingRefusal(ligado(0)) as string
    expect(motivo).not.toMatch(/🎉|🥳|✨|💖|agora|corra|últim/i)
  })
})

describe('freeShipping.ts é módulo puro e alcançável fora do Vite (AC 20)', () => {
  const FONTE = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '..', 'freeShipping.ts'),
    'utf8',
  )

  /** Especificadores de import, nunca o texto do arquivo — comentário não é import. */
  const especificadores = (fonte: string): string[] => {
    const saida: string[] = []
    const re = /(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g
    let m: RegExpExecArray | null
    while ((m = re.exec(fonte)) !== null) saida.push(m[1])
    return saida
  }

  it('a varredura leu o arquivo — âncora', () => {
    // Sem ela, um caminho errado leria string vazia e todas as asserções abaixo passariam por
    // vacuidade, que é a pior falha possível num teste que lê disco.
    expect(FONTE).toContain('freeShippingState')
    expect(FONTE.length).toBeGreaterThan(500)
  })

  it.each(['react', '@supabase/supabase-js', '@estrelinha/supabase/client'])(
    'não importa %s',
    (dependencia) => {
      expect(especificadores(FONTE)).not.toContain(dependencia)
    },
  )

  it('não toca o DOM', () => {
    const codigo = FONTE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
    expect(/\b(document|window|localStorage|Deno)\s*\.\w/.test(codigo)).toBe(false)
  })

  it('todo import relativo traz a extensão .ts explícita', () => {
    const semExtensao = especificadores(FONTE).filter(
      (s) => s.startsWith('.') && !s.endsWith('.ts'),
    )
    expect(semExtensao).toEqual([])
  })
})
