// Como se ESCREVE o número de um pedido — a pergunta com um dono só.
//
// O `#` é **apresentação**, nunca dado: `orders.order_number` guarda só o valor (`0244`, `NS-169`),
// e quem o mostra prefixa. Escrito à mão em cada tela, o prefixo diverge sem nada quebrar — foi o
// que já acontecia antes desta feature: a loja mostrava `PEDIDO 0244` sem `#`, a conta mostrava
// `#0244`, o painel `#0244` em quatro telas e o e-mail `Pedido 0244`. Nenhuma das quatro formas
// derruba build, `tsc` ou teste de componente; o que elas produzem é a cliente lendo um número no
// e-mail e não o reconhecendo na tela.
//
// São três consumidores em contextos diferentes — a loja, o painel e a edge function
// `send-notification` (Deno) —, que é exatamente o critério do `AD-033` para `packages/core`.
//
// ⚠️ Este arquivo NÃO importa nada, de propósito. A edge function o alcança por caminho relativo,
// e lá TODO especificador relativo do grafo precisa de extensão explícita — inclusive os de tipo.
// Zero import aqui é a forma de não ter como errar isso.
//
// ⚠️ **Este comentário não escreve a forma proibida por extenso.** O bundler do `supabase start`
// varre dependências por texto e não remove comentário: com um exemplo literal de especificador
// sem extensão, ele tenta montar um arquivo que não existe e o start inteiro morre com
// `failed to read file`. Medido em 2026-09-13, no merge da `48` com a `49`.

/** O prefixo, escrito UMA vez. */
const PREFIXO = '#'

/**
 * O número **sem** o prefixo — a operação inversa, e o outro lado da mesma regra.
 *
 * Dois consumidores: este arquivo (o formatador recorta antes de prefixar, e é o que faz `##0244`
 * sair com um `#` só) e a **busca de pedidos do painel**, que precisa achar `0244` quando a Adri
 * cola `#0244` do WhatsApp. Escrito duas vezes, o dia em que o prefixo mudar quebra a busca sem
 * quebrar a exibição — e ninguém descobre, porque a tela continua certa e só a busca deixa de
 * achar.
 *
 * Espaço em volta some junto: `'# 0244'` vira `'0244'`.
 */
export function stripOrderNumberPrefix(value: string | null | undefined): string {
  if (typeof value !== 'string') return ''
  const cru = value.trim()
  let i = 0
  while (i < cru.length && cru[i] === PREFIXO) i++
  return cru.slice(i).trim()
}

/**
 * O número do pedido como ele se lê — `#0244`, `#NS-169`, `#NP-MUBBLKLYGOMR`.
 *
 * Três decisões que parecem detalhe e não são:
 *
 * - **Vazio devolve vazio, nunca `#` sozinho.** Um pedido sem número é dado faltando, e um `#`
 *   pelado na tela se lê como defeito de renderização — pior que a ausência, porque parece que o
 *   número existia e se perdeu.
 * - **Valor que já traz `#` não ganha o segundo.** É o que torna a adoção segura enquanto alguma
 *   superfície ainda não migrou: chamar o formatador sobre um valor já prefixado não piora nada.
 *   Vale para qualquer quantidade de `#` na frente — `PIX-P4-04` fala em "sem ganhar um segundo".
 * - **O legado passa inalterado.** `NS-169` (importado da Nuvemshop) e `NP-…` (os dois pedidos
 *   anteriores à sequência) continuam legíveis. Esta função **não** normaliza, não completa zeros
 *   e não recorta prefixo: quem decide a forma do valor gravado é o banco, e quem pergunta "com
 *   quantos dígitos?" está perguntando outra coisa.
 *
 * Espaço em branco em volta é aparado, e valor só de espaço conta como ausente — o mesmo recorte
 * de `surfaceArt`, pela mesma razão: um valor chegado por SQL, por importação ou de um campo limpo
 * com a barra de espaço tem de contar como vazio, senão a tela mostra `#` e um branco.
 */
export function formatOrderNumber(value: string | null | undefined): string {
  // Recorta os `#` da frente antes de prefixar uma vez. Recortar e recolocar (em vez de "já tem?
  // então devolve") é o que faz `##0244` sair com um `#` só.
  const numero = stripOrderNumberPrefix(value)
  if (numero === '') return ''

  return `${PREFIXO}${numero}`
}
