# BUG-20261030-recebi-o-material-sem-o-pedido-no-nome: Os botões "Recebi o material" dos cartões do celular têm todos o mesmo nome para o leitor de tela

- **Status:** verified (2026-10-30, reteste em navegador; working tree, sem commit)
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri despachando pedidos
- **Journey Step:** J-avancar-pedidos-em-lote, passo 'Celular: cartão'
- **Scenarios:** PNL-lote-cartao-do-celular;PNL-aviso-teclado-e-leitor
- **Found:** 2026-10-30 · **Report:** reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos.md
- **AC:** AVS-21 (o gesto); acessibilidade

## Summary

Na Fila de material em 390, cada cartão tem um botão "Recebi o material" sem o pedido no nome acessível (os vizinhos "Cobrar material de <cliente>" têm). Numa lista de botões, o leitor lê cinco "Recebi o material" iguais. Mesmo defeito do BUG-20261024-botao-do-cartao-sem-o-pedido-no-nome, no painel.

## Reproduction

- **Charter:** CH-aviso-fonte-grande-e-leitor · **Tour:** Feature Tour
- **Environment:** Chromium 390×844, árvore de acessibilidade

1. Abrir /admin/pedidos?visao=fila-material em 390.
2. Listar os botões pela árvore de acessibilidade.

**Expected:** "Recebi o material do pedido #<n>" (ou aria-describedby com o pedido).
**Actual:** Cinco botões chamados "Recebi o material".

## Evidence

- Sessão 3 do relatório

## Fix (2026-10-30)

O botão do cartão tem `aria-label` "<ação> — pedido #<n>, <cliente>" (com "Registrando…" no lugar
da ação durante a gravação). O texto visível não muda.

- Arquivo: `pages/admin/AdminOrdersPage.tsx`.
- Teste (vermelho antes): `AdminOrdersPage.aviso.test.tsx`, "o botão do cartão diz de qual pedido é".
  Mutante Q6 morto por asserção.

## Verification

- **Retested:** 2026-10-30, Adri despachando pedidos, Chromium 390×844, árvore de acessibilidade (`ariaSnapshot`) · **Report:** reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos-reteste.md
- **Result:** /admin/pedidos?visao=fila-material: os 24 botões dos cartões têm o pedido no nome ("Recebi o material — pedido #QA88R-31, QA88R Cliente 31" … -35); 0 sem "pedido #"; o texto visível continua "Recebi o material". Depois de registrar, o botão do mesmo cartão vira "Iniciar separação — pedido #QA88R-31, QA88R Cliente 31". Evidência `evidence/2026-10-30-aviso-opcional-reteste/r6-cartoes-390.png`.
