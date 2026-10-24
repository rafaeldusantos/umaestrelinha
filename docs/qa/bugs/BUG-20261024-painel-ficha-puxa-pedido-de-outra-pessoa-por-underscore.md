# BUG-20261024-painel-ficha-puxa-pedido-de-outra-pessoa-por-underscore: No painel desktop, a ficha de uma cliente mostra o pedido de outra cujo e-mail só difere por um sublinhado

- **Status:** verified (retestado em navegador, 2026-10-24, rodada 2 — reports/2026-10-24-mobile-adm-clientes-reteste-1.md)
- **Impact (user-side):** Trust-Damage
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Adri no celular e no painel
- **Journey Step:** J-ver-uma-cliente, passo 3 (conferir a ficha contra o painel)
- **Scenarios:** MAD-cliente-email-com-underscore-nao-mistura
- **Found:** 2026-10-24 · **Report:** reports/2026-10-24-mobile-adm-clientes-achar-quem-me-escreveu.md

## Summary

A ficha do painel lista "Pedidos · 2", incluindo o `#P76-V02` de "P76 Valdete Rosa" (`P76VROSAXRJ@…`), e o resumo ao lado diz GASTOU R$ 150,00, que só conta o pedido dela: a mesma tela se contradiz. A ficha do app mostra "Pedidos · 1", correta. O conserto da `76` (`ilikeExact`) ficou só no app; o painel mantém `customer_email.ilike.<email cru>` em `useAdminCustomer.ts`, onde `_` e `%` são curingas. A spec (A10) já descreve a divergência; registrada aqui porque a Adri verá duas respostas para a mesma cliente conforme a superfície.

## Reproduction

- **Charter:** CH-clientes-achar-quem-me-escreveu · **Tour:** Paste Tour
- **Environment:** Chromium 390x844 móvel, build servido do worktree da `76` (`vite preview`), Supabase local :54441, sessão da admin do `seed.sql`; `*.supabase.co` abortado.

1. Subir o painel (`pnpm dev:backoffice`) contra o banco local com as fixturas da `76`.
2. Entrar como admin e abrir `/admin/clientes/10a34544-07e8-ebdc-8871-3cf972cd178d` ("P76 Valéria Rosa", `P76VROSA_RJ@exemplo.invalid`).
3. Abrir a mesma pessoa no app do ateliê: `/clientes/10a34544-07e8-ebdc-8871-3cf972cd178d`.

**Expected:** a mesma lista de pedidos nas duas superfícies (um pedido).
**Actual:** Painel: "Pedidos · 2" (V01 e V02) com GASTOU R$ 150,00; app: "Pedidos · 1".

## Evidence

- Roteiro Playwright da sessão (painel :8083 e app :4376); `apps/backoffice/src/entities/customer/api/useAdminCustomer.ts` linha 83.
- Leitura independente: `psql` mostra dois e-mails distintos (`P76VROSA_RJ` e `P76VROSAXRJ`).

## Fix

Fora do escopo declarado da `76` (a spec registra a divergência). Decisão humana: levar o painel a `ilikeExact` de `core/customers` (uma linha) agora, ou aceitar até a feature do painel. Recomendação: corrigir, é o mesmo dono já existente.

## Fix applied (2026-10-24, task B04)

`useAdminCustomer` chama `customerOrdersCondition(pessoa.id, pessoa.email)` (`core/customers`, o dono do vínculo): e-mail exato, escapado, entre aspas. Teste novo `useAdminCustomer.vinculo.test.ts`. A BUSCA do painel segue com `escapeSearchTerm` (BL-052, aberta).
