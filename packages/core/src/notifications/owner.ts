// Feature 57 — "qual é o endereço que recebe os avisos internos?", com UM dono.
//
// ## Por que isto é uma função, e não uma leitura de campo
//
// Até a `57` a resposta era `general.email`, e três lugares a liam direto. Com um campo próprio para
// os avisos — que cai no de contato quando vazio (`AVD-08`) —, a resposta virou uma **regra**, e uma
// regra lida em três lugares é o "defeito 01" esperando acontecer:
//
// | Quem pergunta | Onde | O que faz com a resposta |
// | --- | --- | --- |
// | o motor, ao escolher o destino | `dispatch.ts` → `recipientFor` | envia, ou pula com `no_owner_contact` |
// | o motor, ao conferir a pré-condição | `dispatch.ts` → `preconditionFailure({ ownerEmail })` | recusa antes do claim |
// | o painel, ao avisar a dona | `NotificationsTab` → `warningsFor` | mostra "nenhum e-mail cadastrado" |
//
// Escrito três vezes, o fallback diverge — e a forma da divergência é a pior possível, porque nenhum
// dos lados quebra: **o painel avisando que falta e-mail enquanto o motor manda alegremente para o
// de contato**, ou o inverso (o painel silencioso e o aviso nunca saindo). As duas telas continuam
// verdes, e quem descobre é a Adri, pelo aviso que não chegou.
//
// Todo import relativo deste módulo traz `.ts` explícito: a edge function `send-notification` o
// importa por caminho relativo e o Deno resolve o grafo inteiro, inclusive o de tipos.

/**
 * O recorte de `store_settings.general` que esta regra lê.
 *
 * Os dois campos são opcionais porque a origem é uma linha de `jsonb`: num banco que ainda não
 * recebeu a migration da `57`, `notifications_email` simplesmente não existe na chave — e o
 * fallback é exatamente o que faz esse caso funcionar sem tratamento especial.
 */
export interface OwnerContact {
  /** O e-mail PÚBLICO da loja. Aparece nas páginas de política, via `PolicyContact`. */
  email?: string | null
  /** O endereço interno. Vazio significa "use o de contato" — é regra, não dado faltando. */
  notifications_email?: string | null
}

/**
 * O endereço que recebe os avisos `owner_*`, ou `''` quando não há nenhum.
 *
 * Devolve `string` e nunca `null`: quem chama pergunta "para onde mando?" e trata o vazio como
 * "não mando". Um `null` a mais no caminho só criaria um segundo jeito de escrever a mesma ausência.
 */
export function resolveOwnerEmail(general: OwnerContact | null | undefined): string {
  const interno = String(general?.notifications_email ?? '').trim()
  if (interno !== '') return interno

  return String(general?.email ?? '').trim()
}

/**
 * `true` quando não há para onde mandar aviso interno nenhum.
 *
 * Existe para o painel não ter de repetir a comparação com string vazia — que é pequena, e é
 * exatamente o tamanho de regra que costuma divergir.
 */
export const ownerContactMissing = (general: OwnerContact | null | undefined): boolean =>
  resolveOwnerEmail(general) === ''
