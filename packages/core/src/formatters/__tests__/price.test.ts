import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { formatPrice } from '../price'

// O separador entre "R$" e o número NÃO é espaço comum: o ICU emite NBSP (U+00A0). O codepoint já
// variou entre versões de ICU (U+00A0 vs U+202F), e o ICU do Node (vitest) não é o mesmo build do
// ICU do Deno (edge function). Asseverar a string EXATA faz um drift virar teste vermelho em vez de
// glifo estranho dentro de um recibo enviado ao cliente.
const NBSP = ' '

describe('formatPrice — string BRL exata', () => {
  it.each([
    [0, `R$${NBSP}0,00`],
    [4.9, `R$${NBSP}4,90`],
    [48, `R$${NBSP}48,00`],
    [48.5, `R$${NBSP}48,50`],
    [1234.56, `R$${NBSP}1.234,56`],
  ])('formatPrice(%s) → %s', (value, expected) => {
    expect(formatPrice(value)).toBe(expected)
  })

  it('o separador é NBSP (U+00A0), não espaço comum — drift de ICU falha aqui', () => {
    expect(formatPrice(48).charCodeAt(2)).toBe(0x00a0)
    expect(formatPrice(48)).not.toBe('R$ 48,00')
  })
})

describe('price.ts é autocontido (pré-requisito de importabilidade pelo Deno)', () => {
  // Este é o motivo do split. Nenhum teste de comportamento pega a regressão: um `import` novo aqui
  // só quebra em runtime, dentro do edge runtime, com "Module not found" — longe do test runner.
  it('não tem nenhuma linha de import', () => {
    const source = readFileSync(new URL('../price.ts', import.meta.url), 'utf8')

    expect(source).not.toMatch(/^\s*import\s/m)
    expect(source).not.toMatch(/\bfrom\s+['"]/)
  })
})
