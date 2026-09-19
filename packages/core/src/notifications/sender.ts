// Feature 52 (T8) — o remetente dos transacionais, montado de DUAS partes.
//
// ## Por que deixou de ser um campo só
//
// Até aqui o remetente era uma env única, `RESEND_FROM`, em RFC 5322 (`Nome <e@x.com>`). Ao lado
// dela, o remetente do AUTH sempre foi **duas** chaves no `config.toml` (`sender_name` +
// `admin_email`), porque é assim que o GoTrue as pede. Duas formas para a mesma ideia, e o preço
// disso está medido: colar o valor de uma no campo da outra produz `"Nome" <Nome <e@x.com>>` —
// malformado, e **todo** envio de auth falha. É a causa raiz do `BUG-20260728`.
//
// Agora são `RESEND_SENDER_NAME` + `RESEND_SENDER_EMAIL`, espelhando o auth. **Os nomes são novos
// de propósito**: reusar `RESEND_FROM` com significado novo deixaria um valor antigo vivo em
// produção sendo lido como "só o nome", e o remetente montado sairia `Nome <e@x> <e@x>`. Nome novo
// faz a variável ausente ser ausente — falha nomeada em vez de remetente silenciosamente inválido.
//
// ## Onde esta função mora, e por quê
//
// Em `core`, e não no `index.ts` da edge function, porque a composição tem dois consumidores (o
// wiring e os testes) e uma regra que não é óbvia: **display name com caractere especial precisa de
// aspas** (RFC 5322). Escrita no wiring, a regra seria reimplementada no dia em que o painel
// precisasse mostrar o remetente — e as duas cópias divergiriam no primeiro nome com vírgula.
//
// Todo import deste módulo traz `.ts` explícito: a edge function o alcança por caminho relativo, e
// o Deno resolve o grafo inteiro.

/**
 * `local@dominio.tld` e nada mais — sem espaço, sem `<`, `>` ou vírgula. É a mesma forma que
 * `isValidFrom` exige do endereço depois de recortar os sinais de menor/maior.
 */
const ENDERECO_NU = /^[^\s@<>,]+@[^\s@<>,]+\.[^\s@<>,]+$/

/** Os `specials` do RFC 5322 que obrigam o display name a vir entre aspas. */
const EXIGE_ASPAS = /[",;:<>@[\]\\]/

/**
 * Monta o remetente a partir do nome de exibição e do endereço.
 *
 * Devolve **string vazia** quando não dá para montar um remetente válido — e isso é o desenho, não
 * um atalho: o motor já valida o resultado com `isValidFrom` antes de qualquer envio (`CFG-03`), e
 * vazio reprova lá com o motivo `invalid_from`. Lançar aqui derrubaria o módulo inteiro na partida,
 * e junto com ele a porta `config-check` — que é justamente quem um sensor consulta para descobrir
 * *por que* o envio parou. **O diagnóstico não pode morrer com o defeito que ele diagnostica.**
 *
 * O caso que mais importa é o terceiro: alguém cola o valor antigo, combinado, no campo do
 * endereço. `ENDERECO_NU` recusa (tem espaço e `<`), a composição devolve vazio, e o motor recusa
 * nomeando — em vez de montar `Nome <Nome <e@x>>` e receber 422 do Resend em todo e-mail.
 */
export function senderFrom(nome: string | null | undefined, email: string | null | undefined): string {
  const endereco = String(email ?? '').trim()
  if (!ENDERECO_NU.test(endereco)) return ''

  const exibicao = String(nome ?? '').trim()
  if (exibicao === '') return endereco

  if (!EXIGE_ASPAS.test(exibicao)) return `${exibicao} <${endereco}>`

  // Dentro de aspas, `"` e `\` são os únicos que precisam de escape.
  return `"${exibicao.replace(/(["\\])/g, '\\$1')}" <${endereco}>`
}

/**
 * O remetente que sai quando `RESEND_SENDER_EMAIL` está ausente ou inválida.
 *
 * `onboarding@resend.dev` é o remetente de caixa-de-areia do Resend: ele responde **200** e entrega
 * **só** para o dono da conta. Em produção é o pior desfecho possível — sucesso aparente e nenhuma
 * cliente recebendo —, e é por isso que o `Email check` tem um passo só para recusá-lo
 * (`from_is_default`).
 */
export const DEFAULT_SENDER_FROM = 'Uma Estrelinha <onboarding@resend.dev>'
