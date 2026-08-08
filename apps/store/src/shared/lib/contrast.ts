/**
 * Contraste WCAG 2.1 — luminância relativa e razão entre duas cores.
 *
 * Existe porque a paleta papelaria (feature 19) tem pisos de contraste que são
 * **requisito de aceite**, não zelo: Carmim precisa de 4,5 para ser texto,
 * Papelão de 3 para ser borda de campo (WCAG 1.4.11), e Mata-borrão precisa
 * ficar acima de 1,15 sobre Papel — senão a faixa de seção continua no CSS e
 * simplesmente não aparece, que foi o defeito de 1,00:1 que a prancha 18 pegou.
 *
 * Fórmula: WCAG 2.1, §"Relative luminance" e §"Contrast ratio".
 */

/** `#RGB` ou `#RRGGBB` → `[r, g, b]` em 0–255. Lança se o formato não bater. */
export function parseHex(hex: string): [number, number, number] {
  const clean = hex.trim().replace(/^#/, '')
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean

  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`Hex inválido: "${hex}"`)
  }

  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

/** Luminância relativa (WCAG 2.1). 0 = preto, 1 = branco. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((channel) => {
    const s = channel / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Razão de contraste entre duas cores, de 1 (idênticas) a 21 (preto × branco).
 * A ordem dos argumentos não importa — a fórmula é simétrica.
 */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const lighter = Math.max(la, lb)
  const darker = Math.min(la, lb)

  return (lighter + 0.05) / (darker + 0.05)
}
