# BUG-20261031-ponto-final-depois-do-link-no-whatsapp: o link da mensagem é seguido de ponto, e o link com o ponto não abre

- **Status:** open
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
