// Máscara e normalização de CEP — domínio puro.
// Movido de apps/store/src/features/checkout/ui/AddressStep.tsx:11 (implementação preservada).

/** Remove tudo que não é dígito. Não trunca: o chamador decide o que fazer com != 8. */
export function stripCep(value: string): string {
  return (value ?? '').replace(/\D/g, '')
}

/** Formata progressivamente no padrão 00000-000. */
export function maskCep(value: string): string {
  return stripCep(value)
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 9)
}
