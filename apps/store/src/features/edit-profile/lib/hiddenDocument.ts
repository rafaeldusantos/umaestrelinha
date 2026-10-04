// O documento travado de "Meus dados", com as pontas escondidas (feature 59, `DAD-05`).
//
// `•••.456.789-••` para CPF; `••.345.678/••••-••` para CNPJ. Mostra o miolo — o bastante para a
// cliente reconhecer que é o dela —, nunca o documento inteiro na tela de quem passa ao lado.
import { stripDocument } from '@estrelinha/core/validators'

export function hiddenDocument(value: string | null | undefined): string {
  const d = stripDocument(value ?? '')
  if (d.length === 14) return `••.${d.slice(2, 5)}.${d.slice(5, 8)}/••••-••`
  if (d.length === 11) return `•••.${d.slice(3, 6)}.${d.slice(6, 9)}-••`
  // Valor fora dos dois comprimentos (dado antigo, importado): nada dele aparece.
  return '•••.•••.•••-••'
}
