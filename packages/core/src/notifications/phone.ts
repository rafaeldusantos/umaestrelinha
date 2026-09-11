// Feature 42 — o telefone brasileiro normalizado, com UM dono (`PNL-07`).
//
// Vivia em `apps/backoffice/.../chargeMaterial.ts` como `whatsappNumber`, com um consumidor: o link
// `wa.me` da cobrança de material. O segundo consumidor é previsível — o canal WhatsApp da feature 43
// precisa do MESMO número no MESMO formato —, e duas cópias divergindo é o "defeito 01". Subiu antes
// de a segunda nascer.

/**
 * Só dígitos, com o `55` do Brasil na frente quando falta. `null` quando não há número que preste:
 * menos de 10 dígitos não é telefone (fixo tem 10 com DDD, celular 11).
 *
 * Aceita máscara, espaço e `+`: `(51) 99918-4227` → `5551999184227`. Um número que JÁ começa com 55
 * não ganha um segundo — o que faz `5551999184227` ser idempotente.
 */
export const normalizeBrPhone = (input: string | null | undefined): string | null => {
  const digitos = (input ?? '').replace(/\D/g, '')
  if (digitos.length < 10) return null
  return digitos.startsWith('55') ? digitos : `55${digitos}`
}
