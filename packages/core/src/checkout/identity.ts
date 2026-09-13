// Quem está fechando este pedido — a pergunta que a tela e o servidor fazem, com UMA resposta.
//
// `IDN-02` (a tela mostra o desafio de código) e `IDN-08` (o servidor recusa a gravação) são a
// MESMA pergunta. Escritas em dois lugares, elas divergem sem build, `tsc` ou teste de componente
// acusarem — é o "defeito 01" deste repositório, e desta vez no caminho do dinheiro: a tela
// deixaria seguir quem o servidor recusa, ou pior, o contrário. Os dois consumidores são apps
// diferentes (a loja e a edge function `checkout`), que é exatamente o critério do `AD-033` para
// `packages/core`.
//
// ⚠️ Este arquivo NÃO importa nada, de propósito. Ele é resolvido por Deno pelo caminho relativo
// (`../../../packages/core/src/checkout/identity.ts`), e lá TODO especificador relativo do grafo
// precisa de `.ts` explícito — `import type` incluso (medido na feature `33`). O barrel de
// `core/checkout` reexporta os vizinhos **sem extensão**, então o barrel NÃO é alcançável por Deno;
// zero import aqui é a forma de não ter como errar isso.
//
// ⚠️ **Este comentário não pode escrever a forma literal de um import sem extensão.** O bundler do
// `supabase start` varre dependências por texto e **não remove comentário**: com o exemplo por
// extenso, ele tenta montar um arquivo que não existe e o start inteiro morre com
// `failed to read file`. É o mesmo defeito que os guardas deste repositório combatem — casar
// **menção** em vez de **uso** —, desta vez dentro da ferramenta. Medido em 2026-09-13.

/**
 * O veredito. **União de literais de string**, e não de literais booleanos: com
 * `strictNullChecks: false` uma união discriminada por booleano não estreita, e ler o campo do ramo
 * errado é TS2339. É a mesma razão pela qual `MenuItem` discrimina por `kind`.
 */
export type CheckoutIdentity = 'session' | 'guest' | 'challenge'

/**
 * `session` — há sessão, e o pedido é da conta dela.
 * `guest`   — não há sessão e o e-mail não tem conta: segue como convidada.
 * `challenge` — não há sessão e o e-mail **tem** conta: precisa provar que é dela.
 *
 * **A sessão vence o e-mail**, e isso é requisito, não atalho: quem está logada e digita no campo
 * de contato o e-mail de outra pessoa (o do presenteado, por exemplo) não deve ser desafiada — o
 * e-mail digitado é o contato do pedido, e a identidade do pedido é a da conta. É a borda escrita
 * na spec, em *Edge Cases*.
 */
export function resolveCheckoutIdentity(input: {
  hasSession: boolean
  emailHasAccount: boolean
}): CheckoutIdentity {
  if (input?.hasSession) return 'session'
  return input?.emailHasAccount ? 'challenge' : 'guest'
}

/**
 * O motivo legível, ou `null` quando não há recusa.
 *
 * **`string | null`, nunca união discriminada por booleano** — é o formato de `menuTargetRefusal` e
 * de `reservedSlugRefusal`, e existe porque um `{ ok: false; reason }` não tem ramo que o
 * compilador obrigue a ler: com `strictNullChecks: false`, esquecer o motivo compila.
 *
 * O texto é o mesmo nas duas superfícies — o 409 do servidor e o aviso da tela —, e por isso mora
 * aqui junto com o veredito. Sem urgência, sem culpa: a pessoa não errou nada.
 */
export function checkoutIdentityRefusal(identity: CheckoutIdentity): string | null {
  if (identity !== 'challenge') return null
  return 'Este e-mail já tem cadastro na loja. Confirme o código que enviamos para continuar.'
}
