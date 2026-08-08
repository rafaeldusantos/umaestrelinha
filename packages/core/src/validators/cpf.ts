// Validação de CPF — domínio puro (roda em Node, Deno e browser).
// PGD-01: máscara 000.000.000-00 no campo do pagador.
// PGD-02: 11 dígitos + dígito verificador; inválido mantém o CTA desabilitado.

/** Remove tudo que não é dígito. Não trunca: 12 dígitos continuam 12 (e reprovam em isValidCpf). */
export function stripCpf(value: string): string {
  return (value ?? '').replace(/\D/g, '')
}

/** Formata progressivamente no padrão 000.000.000-00, ignorando dígitos além do 11º. */
export function maskCpf(value: string): string {
  return stripCpf(value)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function checkDigit(digits: string, length: number): number {
  let sum = 0
  for (let i = 0; i < length; i++) {
    sum += Number(digits[i]) * (length + 1 - i)
  }
  const rest = (sum * 10) % 11
  return rest === 10 ? 0 : rest
}

/** Aceita com ou sem máscara. Rejeita comprimento ≠ 11, dígitos todos iguais e DV incorreto. */
export function isValidCpf(value: string): boolean {
  const digits = stripCpf(value)
  if (digits.length !== 11) return false
  // 111.111.111-11 e afins passam no DV por construção — reprovados explicitamente.
  if (/^(\d)\1{10}$/.test(digits)) return false

  return (
    checkDigit(digits, 9) === Number(digits[9]) &&
    checkDigit(digits, 10) === Number(digits[10])
  )
}
