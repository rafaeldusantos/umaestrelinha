import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  freeShippingRefusal,
  freeShippingState,
  type FreeShippingConfig,
} from '../freeShipping.ts'

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
    expect(freeShippingState(desligado(150), 90)).toEqual({
      active: false,
      threshold: 0,
      remaining: 0,
      percent: 0,
      reached: false,
    })
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
    expect(p).toEqual({ active: false, threshold: 0, remaining: 0, percent: 0, reached: false })
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

describe('freeShippingRefusal — o painel não grava configuração impossível (FRG-12)', () => {
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
