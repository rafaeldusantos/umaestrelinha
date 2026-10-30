# BUG-20261030-lista-diz-nada-esperando-enquanto-carrega: Ao abrir Pedidos, a página afirma "Nada esperando você agora" e zera os cartões enquanto ainda está carregando

- **Status:** verified (2026-10-30, reteste em navegador; working tree, sem commit)
- **Impact (user-side):** Trust-Damage
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Adri despachando pedidos
- **Journey Step:** J-avancar-pedidos-em-lote, passo 'Lista: esqueleto'
- **Scenarios:** PNL-carregar-esqueleto
- **Found:** 2026-10-30 · **Report:** reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos.md
- **AC:** CRG-13 (vizinho); regra de tom da loja: a tela não afirma o que não sabe

## Summary

Com a rede lenta, a lista mostra o esqueleto das linhas (CRG-13 passa), mas o subtítulo diz "Nada esperando você agora" e os cartões AGUARDANDO MATERIAL / PAGO, A SEPARAR mostram 0 por ~2–4 s, até virar "25 esperando alguma coisa sua" e 18. Para quem abre a lista para ver o que falta, a primeira frase é uma afirmação falsa. Provavelmente anterior à 88 (os cartões e o subtítulo não fazem parte de CRG-13), mas está na tela que a 88 tratou.

## Reproduction

- **Charter:** CH-aviso-rede-lenta-e-falhas · **Tour:** Network Tour
- **Environment:** Chromium 390×844; respostas do Supabase local atrasadas 2 s

1. Atrasar as respostas do Supabase local (Slow 3G ou 2 s por requisição).
2. Abrir /admin/pedidos e ler a página a cada 300 ms.

**Expected:** Enquanto as contagens não chegam, subtítulo e cartões em esqueleto (ou sem número), nunca '0' e 'Nada esperando'.
**Actual:** 2,1 s: 'Nada esperando você agora' + 'AGUARDANDO MATERIAL 0'; 6,1 s: '25 esperando alguma coisa sua' + 18.

## Evidence

- evidence/2026-10-30-aviso-opcional/04-lista-carregando-zeros-390.png

## Fix (2026-10-30)

`useAdminOrderList` expõe `contando` (verdadeiro até a primeira leitura das contagens). Enquanto
isso o subtítulo diz "Contando o que espera por você…", os cartões da fila mostram um esqueleto no
lugar do número (`aria-busy` no grupo) e as abas não mostram contagem — nunca "Nada esperando você
agora" nem 0.

- Arquivos: `entities/order/api/useAdminOrderList.ts`, `features/order-list/ui/QueueTiles.tsx`,
  `pages/admin/AdminOrdersPage.tsx`.
- Teste (vermelho antes): `AdminOrdersPage.aviso.test.tsx`, "conserto do QA — a lista não afirma o
  que ainda não contou". Mutantes Q2/Q2b mortos por asserção.

## Verification

- **Retested:** 2026-10-30, Adri despachando pedidos, Chromium 390×844, toda resposta de `/rest/v1/` atrasada 2 s · **Report:** reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos-reteste.md
- **Result:** lida a cada 700 ms por 16 s: de 2,1 s a 7,8 s o subtítulo diz "Contando o que espera por você…", os quatro cartões da fila aparecem sem número (grupo "O que precisa de ação" com `aria-busy=true`) e as abas sem contagem; às 8,5 s vira "25 esperando alguma coisa sua" com 18/6/1/0 e as abas com número. "Nada esperando você agora" e "0" nunca apareceram. Evidência `evidence/2026-10-30-aviso-opcional-reteste/r2-lista-carregando-390.png`, `evidence/2026-10-30-aviso-opcional-reteste/r2-lista-carregada-390.png`.
