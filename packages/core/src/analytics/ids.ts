// Feature 61 · ANL-03 — o ID de medição do GA4.
//
// Dois consumidores hoje (o painel, que recusa a gravação, e a loja, que só carrega o gtag com ID
// válido) e um terceiro previsível (a edge function `mercado-pago`, que não envia `purchase` para
// um ID malformado). Escrita duas vezes, a régua divergiria sem nada quebrar: o painel aceitaria um
// ID que a loja depois ignoraria em silêncio — a dona veria "Ligado" e o GA4 ficaria vazio.
//
// ⚠️ Este arquivo NÃO importa nada. A edge function o alcança por caminho relativo, e lá todo
// especificador relativo do grafo precisa de extensão explícita — inclusive os de tipo. Zero import
// é a forma de não ter como errar isso.

/** A frase que o painel mostra junto ao campo (`ANL-03`). Escrita UMA vez. */
export const MEASUREMENT_ID_REFUSAL = 'O ID começa com G-, seguido de letras e números.'

/** A forma do ID do GA4 depois de normalizado. `UA-…` (Universal) e `GTM-…` (contêiner) não são. */
const FORMA = /^G-[A-Z0-9]{6,12}$/

/** Apara espaços e passa para maiúsculas — é o que o painel grava. */
export function normalizeMeasurementId(raw: string | null | undefined): string {
  return typeof raw === 'string' ? raw.trim().toUpperCase() : ''
}

/**
 * Por que este ID não serve — ou `null` quando serve.
 *
 * Devolve `string | null`, nunca uma união discriminada por booleano: com `strictNullChecks: false`
 * aquela forma não estreita, e ler o motivo no ramo da recusa seria erro de compilação.
 */
export function measurementIdRefusal(raw: string | null | undefined): string | null {
  return FORMA.test(normalizeMeasurementId(raw)) ? null : MEASUREMENT_ID_REFUSAL
}
