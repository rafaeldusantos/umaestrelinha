// Interpretação do texto colado no campo de valores de um eixo (PFM-07 AC 3).
//
// A armadilha está no próprio exemplo da spec: colar `3,5 cm, 4,5 cm, 5,5 cm` deve virar **três**
// chips. Split ingênuo por vírgula produz seis (`3` · `5 cm` · `4` · `5 cm` · `5` · `5 cm`), porque a
// vírgula decimal do pt-BR é o mesmo caractere do separador de lista.
//
// A regra: vírgula separa **só quando seguida de espaço**; `;` e quebra de linha sempre separam.
// `3,5` não tem espaço depois da vírgula, então sobrevive inteiro.

const SEPARATOR = /[;\n\r]+|,\s+/

/**
 * @param raw Texto digitado ou colado.
 * @param existing Valores já presentes no eixo — duplicata não entra duas vezes.
 */
export const parseOptionValues = (raw: string, existing: readonly string[] = []): string[] => {
  const seen = new Set(existing.map(v => v.trim()))
  const out: string[] = []
  for (const piece of raw.split(SEPARATOR)) {
    const value = piece.trim()
    if (value === '' || seen.has(value)) continue
    seen.add(value)
    out.push(value)
  }
  return out
}
