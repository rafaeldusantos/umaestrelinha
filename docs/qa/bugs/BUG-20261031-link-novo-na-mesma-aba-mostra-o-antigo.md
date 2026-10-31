# BUG-20261031-link-novo-na-mesma-aba-mostra-o-antigo: o link novo aberto na mesma aba continua dizendo que o link não está disponível

- **Status:** verified
- **Impact (user-side):** Trust-Damage
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Cliente de luto pelo link
- **Journey Step:** J-concluir-pedido-montado, step "Abre o link" (depois de renovar)
- **Scenarios:** LOJA-montado-link-morto-ou-mudou; LOJA-montado-token-fora-de-tudo
- **Found:** 2026-10-31 · **Report:** reports/2026-10-31-pedido-montado.md

## Summary

A cliente está com o link antigo aberto (a Adri renovou o prazo). Ela vê "Este link não está mais
disponível. Fale comigo pelo WhatsApp que eu mando um novo." A Adri manda o link novo e ela o abre na
mesma aba (colando na barra, ou um navegador que reaproveita a aba): a página continua dizendo que o
link não está disponível, e o token novo fica visível na barra de endereço. Só recarregar resolve.

## Reproduction

- **Charter:** CH-montado-link-que-mudou-ou-morreu · **Tour:** Multi-Tab Tour
- **Environment:** 390×844, Chromium, local

1. Abrir `/pedido-montado#<token antigo>` (ou qualquer token inválido).
2. Sem recarregar, navegar para `/pedido-montado#<token novo válido>` na mesma aba.

**Expected:** a página lê o token novo e mostra o pedido.
**Actual:** continua "não está mais disponível"; `sessionStorage` segue com o token antigo; `#<token novo>` fica na barra. F5 mostra o pedido.

## Evidence

- Reproduzido duas vezes (token com ponto final → token certo; link renovado P-0004 → link novo).

## Fix

- **Fix:** T31: ouvinte de `hashchange` que lê o token novo; o checkout remonta por `key={token}`.
- **Regression test:** `ProposalCheckoutPage.test.tsx` (+1).

## Verification

- **Retested:** 2026-10-31, em navegador (Chromium, loja :8082 e painel :8083 locais, functions servidas) · **Report:** reports/2026-10-31-pedido-montado-reteste.md
- **Result:** 390×844, contexto anônimo. `/pedido-montado#<token inventado>` ⇒ "Este link não está mais disponível…". Na mesma aba, sem recarregar, navegar para `/pedido-montado#<token de P-0010>` ⇒ a página mostrou o pedido (peça, Resumo, Contato), a barra ficou `/pedido-montado` sem o fragmento, e `sessionStorage['estrelinha-proposal-token']` passou a ser o token novo. Rede: `get-proposal` 404 (o inventado) e 200 (o novo), sem F5.
