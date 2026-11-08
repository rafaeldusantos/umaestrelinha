// A conferência do que a leitura por IA devolveu de um texto colado (a function `customer-parse`).
//
// O modelo devolve texto; daqui sai só o que confere: e-mail que passa na régua da loja, telefone com
// 10 ou 11 dígitos, CPF com o dígito verificador certo, CEP com 8 dígitos, UF que existe. O que não
// passa vira vazio — nunca um valor "quase certo", porque a pessoa só confere o que vê preenchido.
//
// Folha alcançável pelo Deno: importa as folhas de `validators` por caminho, com `.ts` (o barril de
// `validators` não leva extensão e não serve ao Deno).

import { isValidCpf, maskCpf, stripCpf } from '../validators/cpf.ts'
import { isValidBrPhone, maskPhone, stripPhone } from '../validators/phone.ts'
import { isValidEmail, normalizeEmail } from '../validators/email.ts'
import { maskCep, stripCep } from '../validators/cep.ts'

/** O teto do texto colado: a folha corta na digitação, e a function recusa acima disto. */
export const CUSTOMER_PARSE_TEXT_MAX = 2000

/** `contact_and_address` em Cliente nova; `address` em "Outro endereço" de quem já tem ficha. */
export type CustomerParseMode = 'contact_and_address' | 'address'

export const CUSTOMER_PARSE_MODES: readonly CustomerParseMode[] = ['contact_and_address', 'address']

export interface ParsedContact {
  name: string
  email: string
  phone: string
  cpf: string
}

export interface ParsedAddress {
  cep: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
}

export interface ParsedCustomer {
  /** `null` no modo `address`: a leitura nunca troca dados de uma ficha que existe. */
  contact: ParsedContact | null
  address: ParsedAddress
}

export const CONTACT_FIELDS = ['name', 'email', 'phone', 'cpf'] as const
export const ADDRESS_FIELDS = ['cep', 'street', 'number', 'complement', 'neighborhood', 'city', 'state'] as const

const UFS = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
])

/** Teto por campo de texto livre — um nome ou uma rua não passam disto. */
const TEXT_FIELD_MAX: Record<string, number> = {
  name: 120,
  street: 160,
  number: 20,
  complement: 80,
  neighborhood: 80,
  city: 80,
}

/** O valor como texto de uma linha, aparado e com os espaços internos colapsados; senão `''`. */
const texto = (v: unknown): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '')

const livre = (v: unknown, campo: keyof typeof TEXT_FIELD_MAX): string => texto(v).slice(0, TEXT_FIELD_MAX[campo]).trim()

const email = (v: unknown): string => {
  const e = normalizeEmail(texto(v))
  return isValidEmail(e) ? e : ''
}

const telefone = (v: unknown): string => {
  let d = stripPhone(texto(v))
  // O DDI do Brasil na frente ("+55 51 …"): o telefone é guardado sem ele.
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) d = d.slice(2)
  return isValidBrPhone(d) ? maskPhone(d) : ''
}

const cpf = (v: unknown): string => {
  const d = stripCpf(texto(v))
  return isValidCpf(d) ? maskCpf(d) : ''
}

const cep = (v: unknown): string => {
  const d = stripCep(texto(v))
  return d.length === 8 ? maskCep(d) : ''
}

const uf = (v: unknown): string => {
  const s = texto(v).toUpperCase()
  return UFS.has(s) ? s : ''
}

/** Normaliza a saída crua do modelo. Saída que não é objeto vira tudo vazio. */
export function parseCustomerText(raw: unknown, mode: CustomerParseMode): ParsedCustomer {
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}

  const address: ParsedAddress = {
    cep: cep(r.cep),
    street: livre(r.street, 'street'),
    number: livre(r.number, 'number'),
    complement: livre(r.complement, 'complement'),
    neighborhood: livre(r.neighborhood, 'neighborhood'),
    city: livre(r.city, 'city'),
    state: uf(r.state),
  }

  if (mode === 'address') return { contact: null, address }

  return {
    contact: {
      name: livre(r.name, 'name'),
      email: email(r.email),
      phone: telefone(r.phone),
      cpf: cpf(r.cpf),
    },
    address,
  }
}

/** Quantos campos a leitura preencheu — o "Preenchi N de M campos". */
export function parsedFieldCount(p: ParsedCustomer): number {
  const valores = [...Object.values(p.address), ...(p.contact ? Object.values(p.contact) : [])]
  return valores.filter((v) => v !== '').length
}
