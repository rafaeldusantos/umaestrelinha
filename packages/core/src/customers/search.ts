// Feature `76` · `MAC-06`, `MAC-23`, `MAC-25`, `A14` — a busca de clientes, subida do painel BYTE A BYTE
// (`CLI-01`) e estendida com as opções do app do ateliê. Sem `opts`, a saída é a de hoje do painel,
// caractere a caractere: `customerQuery.test.ts` passa sem asserção tocada e um caso compara a saída
// com uma cópia literal da função antiga.
import { escapeSearchTerm } from '../paging/pageMath.ts'
import { ilikeContains } from './like.ts'

/** `CLI-01` — a busca alcança as quatro coisas que se tem em mãos ao procurar alguém. */
export const CUSTOMER_SEARCH_COLUMNS = ['name', 'email', 'phone', 'cpf'] as const

export const CUSTOMER_SEARCH_DEBOUNCE_MS = 300

export interface CustomerSearchOptions {
  columns?: readonly string[]
  /** Valor entre aspas, com `\` `%` `_` escapados (`like.ts`). Sem isto: o comportamento de hoje do painel. */
  literal?: boolean
  /** Termo "com cara de telefone" ⇒ acrescenta `phone` por dígitos. */
  phoneDigits?: boolean
}

const COM_CARA_DE_TELEFONE = /^[\d\s().+-]+$/

/** Os dígitos do termo quando ele tem cara de telefone (e ao menos um dígito); senão `null`. */
const digitosDoTelefone = (termo: string): string[] | null => {
  if (!COM_CARA_DE_TELEFONE.test(termo)) return null
  const digitos = termo.replace(/\D/g, '')
  if (digitos === '') return null
  // O telefone é gravado sem o DDI (ADR-05): "+55 51 …" busca pelos dois.
  return digitos.startsWith('55') && digitos.length >= 12 ? [digitos, digitos.slice(2)] : [digitos]
}

export const buildCustomerSearchCondition = (search: string, opts?: CustomerSearchOptions): string | null => {
  const columns = opts?.columns ?? CUSTOMER_SEARCH_COLUMNS
  if (!opts?.literal) {
    const term = escapeSearchTerm(search)
    if (term === '') return null
    return columns.map((c) => `${c}.ilike.%${term}%`).join(',')
  }
  const termo = (search ?? '').trim()
  if (termo === '') return null
  const condicoes = columns.map((c) => `${c}.ilike.${ilikeContains(termo)}`)
  if (opts.phoneDigits) {
    for (const d of digitosDoTelefone(termo) ?? []) {
      const extra = `phone.ilike.${ilikeContains(d)}`
      if (!condicoes.includes(extra)) condicoes.push(extra)
    }
  }
  return condicoes.join(',')
}

const INVISIVEIS = /[\u200B-\u200D\u2060\uFEFF]/g
// `usuário@domínio`, sem espaço, sinal de envelope (`< > " ,` `;` parênteses) nem barra.
const TOKEN_DE_EMAIL = /[^\s<>"',;()[\]]+@[^\s<>"',;()[\]]+/
const PONTUACAO_FINAL = /[.:;!?)\]>]+$/
// Um rótulo de telefone conhecido, de cabeça de termo: `Cel:`, `Tel (…`, `WhatsApp …`. Lista fechada de
// propósito: "Telma Souza" e "Marina 2" são NOMES, e perder o começo deles esconderia a cliente.
const ROTULO_DE_TELEFONE = /^(?:celular|cel|telefone|tel|fone|whats\s?app|whats|zap|wpp)\b\.?\s*[:\-]?\s*/i

/**
 * O que se COLA de uma conversa ou de um cabeçalho de e-mail chega sujo (`BUG-20261024-busca-nao-acha-*`):
 * o espaço não separável do WhatsApp Web, dois espaços, o caractere de largura zero, `Nome <e-mail>`,
 * `mailto:` e o ponto que fecha a frase, `Cel: 51 …`. Devolve o termo que a pessoa QUIS dizer. Só o app
 * chama (`buildAppCustomerSearch`); o painel, sem opções, segue como sempre.
 *
 * Os espaços do meio viram UM (o `\s` do JavaScript inclui U+00A0). Havendo um e-mail no meio, o termo é
 * ele, sem os sinais em volta; um pedaço sem usuário ou sem domínio ("maria@") não é e-mail e fica.
 * O rótulo de telefone só cai quando o resto TEM cara de telefone.
 */
export const limparTermoColado = (termo: string): string => {
  const limpo = (termo ?? '').replace(INVISIVEIS, '').replace(/\s+/g, ' ').trim()
  const email = limpo.match(TOKEN_DE_EMAIL)
  if (email) return email[0].replace(/^mailto:/i, '').replace(PONTUACAO_FINAL, '')
  const semRotulo = limpo.replace(ROTULO_DE_TELEFONE, '')
  if (semRotulo !== limpo && COM_CARA_DE_TELEFONE.test(semRotulo) && /\d/.test(semRotulo)) return semRotulo
  return limpo
}

/** A busca do app: nome, e-mail e telefone (sem CPF — a lista não o mostra), literal, com telefone por dígitos. */
export const APP_CUSTOMER_SEARCH: CustomerSearchOptions = {
  columns: ['name', 'email', 'phone'],
  literal: true,
  phoneDigits: true,
}

export const buildAppCustomerSearch = (search: string): string | null =>
  buildCustomerSearchCondition(limparTermoColado(search), APP_CUSTOMER_SEARCH)
