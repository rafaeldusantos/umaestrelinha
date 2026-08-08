// Documento do pagador: CPF **ou** CNPJ, num campo só — domínio puro.
// DOC-01: a máscara alterna sozinha no 12º dígito, para quem digita CNPJ não travar no 11º.
// DOC-02: 11 dígitos com DV de CPF ou 14 com DV de CNPJ; qualquer outro comprimento reprova.
import { isValidCpf, maskCpf } from './cpf'
import { isValidCnpj, maskCnpj } from './cnpj'

/** Remove tudo que não é dígito. Não trunca — é o comprimento que decide CPF vs CNPJ. */
export function stripDocument(value: string): string {
  return (value ?? '').replace(/\D/g, '')
}

/**
 * DOC-01: ≤11 dígitos ⇒ máscara de CPF; ≥12 ⇒ máscara de CNPJ. É esse limite que faz a máscara
 * alternar **durante** a digitação — `maskCpf` sozinho trunca em 11 e o 12º dígito não entraria.
 */
export function maskDocument(value: string): string {
  return stripDocument(value).length <= 11 ? maskCpf(value) : maskCnpj(value)
}

/** DOC-02: válido é CPF de 11 dígitos ou CNPJ de 14 — nada entre os dois, nada além. */
export function isValidDocument(value: string): boolean {
  return isValidCpf(value) || isValidCnpj(value)
}

/** Como chamar o documento na tela (linha colapsada, mensagem de erro), pelo comprimento. */
export function documentLabel(value: string): 'CPF' | 'CNPJ' {
  return stripDocument(value).length > 11 ? 'CNPJ' : 'CPF'
}
