// Validação de CNPJ — domínio puro (roda em Node, Deno e browser).
// DOC-01: máscara 00.000.000/0000-00 no campo do pagador.
// DOC-02: 14 dígitos + os dois dígitos verificadores; inválido mantém o bloco incompleto.

/** Remove tudo que não é dígito. Não trunca: 15 dígitos continuam 15 (e reprovam em isValidCnpj). */
export function stripCnpj(value: string): string {
  return (value ?? '').replace(/\D/g, '')
}

/** Formata progressivamente no padrão 00.000.000/0000-00, ignorando dígitos além do 14º. */
export function maskCnpj(value: string): string {
  return stripCnpj(value)
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

/**
 * Dígito verificador do CNPJ: pesos decrescentes de 9 a 2 reiniciando em 9, o que dá
 * 5432987654 32 para o 1º DV (12 dígitos) e 65432987654 32 para o 2º (13 dígitos).
 */
function checkDigit(digits: string, length: number): number {
  let sum = 0
  for (let i = 0; i < length; i++) {
    // 2 é o peso do último dígito; a cada casa à esquerda sobe 1, voltando a 9 depois do 9.
    sum += Number(digits[i]) * (((length - 1 - i) % 8) + 2)
  }
  const rest = sum % 11
  return rest < 2 ? 0 : 11 - rest
}

/** Aceita com ou sem máscara. Rejeita comprimento ≠ 14, dígitos todos iguais e DV incorreto. */
export function isValidCnpj(value: string): boolean {
  const digits = stripCnpj(value)
  if (digits.length !== 14) return false
  // 11.111.111/1111-11 e afins passam no DV por construção — reprovados explicitamente.
  if (/^(\d)\1{13}$/.test(digits)) return false

  return (
    checkDigit(digits, 12) === Number(digits[12]) &&
    checkDigit(digits, 13) === Number(digits[13])
  )
}
