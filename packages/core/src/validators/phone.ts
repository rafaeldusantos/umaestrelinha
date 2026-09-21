// Máscara e normalização de telefone brasileiro — domínio puro.
// Irmão de `cep.ts`: o campo WhatsApp do checkout era o único da loja que aceitava qualquer coisa.
//
// **Não é a mesma função que `normalizeBrPhone`** (`core/notifications/phone.ts`), e as duas não
// devem ser fundidas. Aquela responde *"para que número o `wa.me` aponta?"* — prefixa o `55` do
// Brasil e devolve `null` quando não há número que preste. Esta responde *"como se escreve isto
// enquanto a pessoa digita?"* e nunca recusa: máscara que recusa entrada parcial não deixa
// ninguém chegar ao número inteiro. Elas compartilham um passo (só dígitos) e divergem no que
// fazem depois, do mesmo jeito que `dobrarTexto` e `slugify` no painel.
//
// Ligar uma à outra custaria uma dependência `core/notifications -> core/validators`, e o grafo de
// `notifications` é resolvido pelo Deno na edge function `send-notification` — onde todo
// especificador relativo precisa de `.ts` explícito, o que o barrel de `validators` não tem.

/**
 * Remove tudo que não é dígito. **Não trunca**, pelo mesmo motivo que `stripCep` não trunca: quem
 * corta em 11 aqui faz `isValidBrPhone` aprovar um número de 12 dígitos em vez de reprová-lo.
 * O teto vive em `maskPhone`, que é quem desenha o campo.
 */
export function stripPhone(value: string): string {
  return (value ?? '').replace(/\D/g, '')
}

/**
 * Formata progressivamente: `(11) 9999-9999` com 10 dígitos, `(11) 99999-9999` com 11.
 *
 * O ramo de 10 e o de 11 têm de conviver **durante** a digitação, pela mesma razão que
 * `maskDocument` alterna CPF/CNPJ: formatar sempre como celular põe o hífen depois do 5º dígito e
 * um telefone fixo sairia `(11) 99999-999`. Por isso o hífen só anda para a direita quando o 11º
 * dígito chega — abaixo disso o número segue a forma de fixo.
 */
export function maskPhone(value: string): string {
  const d = stripPhone(value).slice(0, 11)
  if (d.length <= 2) return d
  const ddd = `(${d.slice(0, 2)}) `
  if (d.length <= 6) return ddd + d.slice(2)
  if (d.length <= 10) return `${ddd}${d.slice(2, 6)}-${d.slice(6)}`
  return `${ddd}${d.slice(2, 7)}-${d.slice(7)}`
}

/**
 * Fixo tem 10 dígitos com DDD, celular 11 — o mesmo portão que `isContactComplete` já aplicava a
 * mão em `core/checkout/blocks.ts`.
 */
export function isValidBrPhone(value: string): boolean {
  const d = stripPhone(value)
  return d.length === 10 || d.length === 11
}
