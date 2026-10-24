# BUG-20261024-whatsapp-da-ficha-nao-avisa-nova-aba: "Conversar no WhatsApp" abre outra aba sem avisar quem usa leitor de tela

- **Status:** verified (retestado em navegador, 2026-10-24, rodada 2 — reports/2026-10-24-mobile-adm-clientes-reteste-1.md)
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Equipe com TalkBack
- **Journey Step:** J-ver-uma-cliente, passo "falar com a cliente"
- **Scenarios:** MAD-cliente-com-leitor-de-tela; MAD-cliente-whatsapp-em-branco
- **Found:** 2026-10-24 · **Report:** reports/2026-10-24-mobile-adm-clientes-leitor-de-tela.md

## Summary

O link da ficha é `<a target="_blank" rel="noopener noreferrer">` com o texto "Conversar no WhatsApp" e
mais nada: nome acessível sem "abre em outra aba" nem "WhatsApp". O charter e o cenário pedem esse
anúncio. Quem usa TalkBack é jogada para outro app/aba sem aviso e, ao voltar, não sabe se o app recarregou.
O mesmo vale para o link "WhatsApp" do bloco Cliente do pedido (`74`), que é o outro consumidor de
`whatsappChatUrl`.

## Reproduction

- **Charter:** CH-clientes-com-leitor-de-tela · **Tour:** Feature Tour
- **Environment:** Chromium 390×844, build servido

1. Abrir a ficha de uma cliente com telefone válido (fixtura `P76 Marina…`).
2. Ler a árvore de acessibilidade do link.

**Expected:** nome acessível ou descrição que diz que abre em outra aba.
**Actual:** `link "Conversar no WhatsApp"` com `/url: https://wa.me/5551998124471`, sem aviso.

## Evidence

- `<a href="https://wa.me/…" target="_blank" rel="noopener noreferrer" data-parte="whatsapp">Conversar no WhatsApp</a>` (`ContatoDaCliente.tsx`)

## Fix

Sugestão: texto só para leitor de tela (`sr-only`: "(abre em outra aba)") ou `aria-describedby`, num único dono usado
pela ficha e pelo `BlocoCliente`.

## Fix applied (2026-10-24, task B11)

`shared/config/novaAba.ts` (`nomeDoLinkExterno`): os TRÊS links de aba nova do app (contato da ficha, bloco Cliente do pedido e lembrete do envio) levam `aria-label` "<rótulo> (abre em outra aba)". Guarda `novaAbaAvisada.test.ts`. Dois testes antigos (74 e 75) tiveram o nome esperado atualizado para o novo nome.
