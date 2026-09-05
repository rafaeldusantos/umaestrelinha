/**
 * Contraste WCAG 2.1 — luminância relativa, razão entre duas cores, e a mistura de um token
 * translúcido sobre o fundo em que ele é pintado.
 *
 * ---------------------------------------------------------------------------------------------
 * POR QUE MORA EM `core`, E NÃO NA LOJA
 * ---------------------------------------------------------------------------------------------
 * Nasceu em `apps/store/src/shared/lib/contrast.ts` na feature 19, para os pisos da paleta
 * papelaria, e por duas features teve um consumidor só. A feature 34 traz o segundo: o guarda dos
 * tokens `--estrelinha-admin-*` mede contraste no **backoffice**, e uma camada `shared` de um app
 * não é importável do outro.
 *
 * Pela consequência 1 do defeito 01 do repositório — dois consumidores lendo a mesma regra ⇒
 * `packages/core` —, a fórmula passa a ter um dono só. `apps/store/src/shared/lib/contrast.ts`
 * continua existindo e reexporta daqui: os dois guardas da loja que a consomem
 * (`contrast.test.ts` e `fieldBorder.test.ts`) não mudaram uma linha.
 *
 * **Sem dependência nenhuma, de propósito** — roda em vitest, em Deno e em Node.
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

/**
 * A cor OPACA que o olho vê quando `hex` é pintado com opacidade `alpha` sobre `background`.
 *
 * Existe porque o selo do material é `bg-<token>/10 text-<token>`: o texto não está sobre o card,
 * está sobre **o próprio token a 10% sobre o card**. Medir contra o card puro superestima — e foi
 * exatamente o que fez a prancha 34 declarar `#B45309` aprovado (5,02:1 sobre branco) quando o
 * fundo real do texto entrega 4,39:1.
 *
 * @param alpha 0 a 1. `/10` do Tailwind é `0.10`.
 */
export function mixOver(hex: string, background: string, alpha: number): string {
  const fg = parseHex(hex)
  const bg = parseHex(background)

  return (
    '#' +
    fg
      .map((channel, i) =>
        Math.round(channel * alpha + bg[i] * (1 - alpha))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  )
}
