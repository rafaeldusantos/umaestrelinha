// Como se escreve o número de uma proposta — `P-0001` (A-13). Separado do número do pedido, que é
// da sequência de `orders` e só existe na conclusão. Folha sem import.

const PREFIXO = 'P-'

/**
 * `1` ⇒ `P-0001`; `12345` ⇒ `P-12345` (nunca corta dígito). Um valor que já chega escrito
 * (`'P-0007'`, a coluna `number` do banco) passa aparado. Vazio, nulo ou número inválido ⇒ `''` —
 * um `P-` pelado se leria como defeito de renderização.
 */
export function formatProposalNumber(value: number | string | null | undefined): string {
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 1) return ''
    return `${PREFIXO}${String(value).padStart(4, '0')}`
  }
  if (typeof value !== 'string') return ''
  const cru = value.trim()
  if (cru === '') return ''
  if (/^\d+$/.test(cru)) return formatProposalNumber(Number(cru))
  return cru
}
