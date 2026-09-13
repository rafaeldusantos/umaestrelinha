// "Este e-mail serve?" e "qual é a forma canônica dele?" — as duas com um dono só.
//
// O padrão estava escrito duas vezes antes da feature `49`: em `core/checkout/blocks.ts` (a régua
// do bloco Contato) e em `packages/auth/src/AuthContext.tsx` (a recuperação de senha). A edge
// function `checkout` seria a terceira, e é a mais cara: ela decide se o pedido é gravado, então
// uma régua mais frouxa que a da tela deixaria passar o que a loja recusou, e uma mais estrita
// recusaria o que a loja aceitou — em silêncio, dos dois lados.
//
// ⚠️ Zero import relativo: este arquivo é resolvido por Deno por caminho, e lá todo especificador
// precisa de `.ts` explícito.

/**
 * A régua é deliberadamente permissiva: um caractere antes do `@`, um depois, e um ponto no
 * domínio. Não é RFC 5322, e não deve ser.
 *
 * Quem valida e-mail de verdade é o **código enviado para ele** — uma régua estrita aqui recusaria
 * endereços válidos e raros (`+`, subdomínio longo, TLD novo) na única tela onde a cliente não tem
 * como discutir. O custo de aceitar um endereço impossível é um e-mail que não chega; o de recusar
 * um possível é uma venda perdida.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test((email ?? '').trim())
}

/**
 * A forma canônica: sem espaço nas pontas, em caixa baixa.
 *
 * `lower()` é a mesma normalização que `handle_new_customer` e `customer_directory` já fazem em SQL
 * desde a feature `35` — o arquivo real da Nuvemshop traz e-mail em caixa alta, e comparar cru
 * deixaria a mesma pessoa como duas. Aqui ela existe para que a pergunta "tem conta?" feita pela
 * tela e a feita pelo servidor cheguem à MESMA chave.
 */
export function normalizeEmail(email: string): string {
  return (email ?? '').trim().toLowerCase()
}
