import { supabase } from '@estrelinha/supabase/client'
import { parseCustomerText, parsedFieldCount, type CustomerParseMode, type ParsedCustomer } from '@estrelinha/core/customers'

import { invocar, traduzir, type LeitorDoErro, type RespostaDaPorta } from '@/shared/api/traduzir'

/**
 * A porta da leitura de um texto colado: o app fala com a edge function `customer-parse` SÓ por aqui,
 * com o nome LITERAL `'customer-parse'` (a function tem uma ação só) — o molde de `portaDePropostas.ts`.
 *
 * - **A tradução é a das portas** (`shared/api/traduzir.ts`): 401/403 ⇒ `conferirPapel`, e só o
 *   `42501` dele LANÇA a recusa da `72`; rede, prazo e 5xx (`upstream`, `not_configured`) são falha,
 *   nunca recusa.
 * - **O erro da function é `{ reason: '<slug>' }`** (429 `limited`, 422 `refusal`/`truncated`/`invalid`,
 *   413 `too_long`, 400 `bad_request`): o slug sai em `erro`, e a tela escolhe a frase.
 * - **O que volta passa de novo pela conferência de `core`** (`parseCustomerText`): a leitura nunca
 *   entrega à tela um campo fora da forma (o que não confere vira vazio), e `encontrados` é a mesma
 *   contagem do servidor.
 * - **Nada fica**: o texto vai no corpo e em mais nenhum lugar; esta porta não grava nada.
 */
export interface TextoLido extends ParsedCustomer {
  /** Quantos campos a leitura preencheu — zero é "texto sem dados". */
  encontrados: number
}

export type RespostaDaLeitura = RespostaDaPorta<TextoLido>

const lerErro: LeitorDoErro<object> = (corpo) =>
  typeof corpo.reason === 'string' && corpo.reason !== '' ? { slug: corpo.reason } : null

const comoObjeto = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

/** Lê contato e endereço (`contact_and_address`) ou só o endereço (`address`) do texto colado. */
export const lerTextoDaConversa = async (texto: string, modo: CustomerParseMode): Promise<RespostaDaLeitura> => {
  const r = await traduzir<unknown, object>(
    await invocar(() => supabase.functions.invoke('customer-parse', { body: { text: texto, mode: modo } })),
    lerErro,
  )
  if (r.tipo !== 'ok') return r
  const dado = comoObjeto(r.dado)
  const lido = parseCustomerText({ ...comoObjeto(dado.address), ...(modo === 'address' ? {} : comoObjeto(dado.contact)) }, modo)
  return { tipo: 'ok', dado: { ...lido, encontrados: parsedFieldCount(lido) } }
}
