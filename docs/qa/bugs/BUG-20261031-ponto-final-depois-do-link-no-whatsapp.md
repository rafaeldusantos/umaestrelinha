# BUG-20261031-ponto-final-depois-do-link-no-whatsapp: o link da mensagem é seguido de ponto, e o link com o ponto não abre

- **Status:** verified (2026-11-01, navegador 390×844 local; o WhatsApp real de Android/iOS segue não medido)
- **Impact (user-side):** Blocks-Completion
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Cliente de luto pelo link
- **Journey Step:** J-montar-pedido-para-a-cliente, step "WhatsApp" → J-concluir-pedido-montado, step "Abre o link"
- **Scenarios:** PNL-montado-copiar-e-whatsapp; LOJA-montado-link-morto-ou-mudou
- **Found:** 2026-10-31 · **Report:** reports/2026-10-31-pedido-montado.md

## Summary

A mensagem pronta do WhatsApp termina o link com um ponto: "…escolher a entrega e o pagamento:
http://…/pedido-montado#<token>. O link vale até 07/11." Se o ponto entrar no link (seleção manual,
cópia do trecho, ou um leitor de link que o inclua), a cliente cai em "Este link não está mais
disponível" — para um pedido válido. O token (base64url) nunca contém ponto.

## Reproduction

- **Charter:** CH-montado-da-conversa-ao-pix · **Tour:** Money Tour
- **Environment:** 390×844, local

1. Tocar "Enviar pelo WhatsApp" numa proposta aberta e ler o `text=` do `wa.me`.
2. Abrir `/pedido-montado#<token>.` (com o ponto).

**Expected:** o link abre o pedido (ou a mensagem não cola pontuação no link).
**Actual:** "Este link não está mais disponível."

## Evidence

- `text=` decodificado: "…pagamento: http://localhost:8082/pedido-montado#ASii…DHmA. O link vale até 07/11."
- Precisa decisão e verificação humana: se o WhatsApp de Android e iOS inclui o ponto ao tornar o texto clicável não dá para medir no navegador.

## Decision

- **Confirmada pelo usuário em 2026-10-31:** opção (c), as duas — (b) a mensagem põe o link sozinho numa linha, sem pontuação colada; (a) a loja apara a pontuação no fim do fragmento antes de ler o token.

## Fix

- **(b) A mensagem:** `packages/core/src/proposals/link.ts` (`proposalWhatsappText`). O link vai numa linha própria, entre linhas em branco, sem os dois-pontos nem o ponto final colados: "Oi, Ana! Montei seu pedido aqui na loja. É só conferir seus dados, escolher a entrega e o pagamento:" / (linha em branco) / "{link}" / (linha em branco) / "O link vale até 07/11." Mesmo texto, mesma primeira pessoa da Adri, sem urgência nem emoji. `LNK-02` emendada na `spec.md` da 89.
- **(a) A loja:** `apps/store/src/features/proposal-checkout/model/proposalToken.ts` (`tokenDoFragmento`) apara, depois de decodificar, tudo o que sobra no fim e não é do alfabeto base64url (`/[^A-Za-z0-9_-]+$/`): ponto, vírgula, `;:!?`, parênteses, colchetes, aspas, reticências, `%2E`. Hífen e sublinhado (que o token pode ter) ficam. Fragmento só de pontuação não vira token e cai no guardado. O dono da chave `estrelinha-proposal-token` continua um só (`proposalTokenComDonoUnico.test.ts` verde, sem mudança).
- **Regression tests (vermelhos antes do conserto):**
  - `packages/core/src/proposals/__tests__/link.test.ts`: o literal da mensagem reescrito pelo valor novo (sem afrouxar) e +1 "o link ocupa uma linha inteira, sem pontuação colada".
  - `apps/backoffice/src/pages/admin/AdminProposalPage.test.tsx`: o `text=` do `wa.me` pela página real, pelo valor novo.
  - `apps/store/src/features/proposal-checkout/model/__tests__/proposalToken.test.tsx`: +17 sufixos (`.` `,` `;` `:` `!` `?` `)` `]` `}` `>` `"` `'` `…` `...` `.)` `%2E` `).`), +1 hífen/sublinhado preservados, +1 fragmento só de pontuação.
  - `apps/store/src/pages/__tests__/ProposalCheckoutPage.test.tsx`: +1 pela página real — `/pedido-montado#<token>.` pede `get-proposal` com o token limpo e não mostra "não está mais disponível".
- **Mutantes (reinjetados no arquivo real, SHA-256 conferido na restauração, mortos por asserção):** o `replace` da pontuação apagado (19 casos caem, inclusive o da página); a régua alargada para aparar `-`/`_` (cai o caso do hífen); a mensagem de volta a `pagamento: {link}. O link…` (caem o literal e o da linha); o ponto colado depois do link na linha própria (caem os dois).

## Verification

- **Retested (2026-11-01, Chromium, 390×844, loja :8082 e functions locais):** P-0013 criada pela `order-proposals` local; aberto `/pedido-montado#<token>.` ⇒ "Seu pedido" com a peça, nada de "não está mais disponível"; o `get-proposal` levou o token **sem** o ponto; `sessionStorage['estrelinha-proposal-token']` = o token limpo; a barra ficou `/pedido-montado` sem fragmento; `scrollWidth` 390. Evidência: `evidence/2026-10-31-pedido-montado/a1-link-com-ponto-abre.png`. Relatório: `reports/2026-10-31-pedido-montado-reteste.md` (adendo).
- **Não medido:** o WhatsApp real de Android e iOS (como o app torna o link clicável). Com o link sozinho na linha e a loja aparando a pontuação, os dois caminhos estão cobertos.
