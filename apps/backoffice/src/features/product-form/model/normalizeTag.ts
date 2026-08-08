// Chave de comparação de tags (PFM-06 AC 9).
//
// O problema real do catálogo: `Naruto`, `naruto` e `naruto ` viraram três tags diferentes, e os
// filtros da vitrine passaram a mostrar três coisas que são uma só.
//
// A decisão que define este módulo: normalizar é para **comparar**, nunca para substituir. `Naruto`
// e `naruto` podem ser intencionais — é o nome próprio contra o gênero. Quem decide é quem cadastra;
// o sistema sugere (`Usar a existente` / `Manter`) e não escolhe sozinho.

/**
 * `Naruto ` → `naruto` · `Anos 90` → `anos 90` · `Ação` → `acao`.
 *
 * Acento sai porque `Ação` e `Acao` são a mesma tag digitada por teclados diferentes; espaço
 * interno é colapsado porque `anos  90` é erro de digitação, não outra tag.
 */
export const normalizeTag = (tag: string): string =>
  tag
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')

/** Duas tags são "a mesma coisa escrita diferente"? */
export const isSameTag = (a: string, b: string): boolean => normalizeTag(a) === normalizeTag(b)

/**
 * A tag já existente que colide com `candidate` só por acento/caixa/espaço — ou `null`.
 *
 * Igualdade EXATA não conta: `naruto` digitado quando `naruto` já existe é duplicata pura, tratada
 * pelo dedupe, não pelo aviso. O aviso é para a diferença **sutil**, que é a que passa batido.
 */
export const findSimilarTag = (
  candidate: string,
  existing: readonly string[],
): string | null =>
  existing.find(tag => tag !== candidate && isSameTag(tag, candidate)) ?? null

/**
 * Interpreta o texto colado num campo de tags (AC 7).
 *
 * Aqui a vírgula separa **sempre**, ao contrário dos valores de eixo: tag não tem número decimal, e
 * `naruto,shonen` sem espaço é colagem legítima de planilha.
 */
export const parseTags = (raw: string): string[] => {
  const out: string[] = []
  for (const piece of raw.split(/[,;\n\r\t]+/)) {
    const tag = piece.trim().replace(/\s+/g, ' ')
    if (tag !== '' && !out.some(t => t === tag)) out.push(tag)
  }
  return out
}
