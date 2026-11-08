/**
 * A loja, vista do app do ateliê — **um leitor só de `VITE_STORE_URL`** (molde de
 * `apps/backoffice/src/shared/lib/storeOrigin.ts`).
 *
 * O link do pedido montado é a origem da loja + o caminho de `core` + o token no fragmento
 * (`proposalLink`). Dois leitores da env divergiriam no dia em que um ganhasse normalização (barra
 * final, protocolo ausente) e o outro não, sem nada quebrar.
 *
 * A env é lida na CHAMADA, não no carregamento do módulo: o teste que a troca (`vi.stubEnv`) mede o
 * código, e não a máquina de quem roda a suíte.
 *
 * Devolve `null` — e não lança — quando a env falta ou não é URL: o app continua funcionando, e a tela
 * do pedido montado diz a frase `LINK_WITHOUT_STORE` (`core/proposals`) no lugar do link.
 */
export const origemDaLoja = (base: string | undefined = import.meta.env.VITE_STORE_URL): string | null => {
  const valor = (base ?? '').trim()
  if (!valor) return null
  try {
    return new URL(valor).origin
  } catch {
    return null
  }
}
