# QA Run Report — 2026-10-24 — mobile-adm-pedidos (reteste, rodada 3)

- **Scope:** reteste do `BUG-20261024-falha-de-aviso-diz-enviado` (B03) e regressão da aba Pedidos. Canary: Início.
- **Build:** working tree sem commit (`feat/74-mobile-adm-pedidos`), `pnpm --filter @estrelinha/mobile-adm build` + `vite preview --port 4378`
- **Environment:** http://localhost:4378, 390×844 depois 1440×900, Supabase local (API :54441), `adri.qa@exemplo.invalid` (admin) e `cliente.qa@exemplo.invalid` (sem papel); `**/*.supabase.co/**` abortado e `**/g/collect*` interceptado por rota.
- **Fixturas:** as da rodada 2 (61 pedidos `P74-*`), ainda carregadas.
- **Status:** closed

## Session Matrix & Results

| # | Charter | Journey / Scenario | Persona | Tour | Status | Issue |
|---|---|---|---|---|---|---|
| 1 | CH-pedidos-achar-o-pedido-da-cliente | J-ver-um-pedido / histórico com falha de aviso | Adri no celular | Paste | Fixed | BUG-20261024-falha-de-aviso-diz-enviado |
| 2 | CH-pedidos-numero-da-inicio-bate | J-achar-um-pedido / blocos, visões, selo | Adri no celular | Money | Pass | |
| 3 | CH-pedidos-voltar-do-android | J-ver-um-pedido / voltar com busca | Adri no celular | Back-Button | Pass | |
| 4 | CH-pedidos-com-leitor-de-tela-e-fonte-grande | fonte 130/200 %, 390 e 1440 | Equipe com TalkBack | Feature | Pass | |
| 5 | CH-pedidos-conta-sem-acesso | conta sem papel | Cliente com conta da loja | Garbage | Pass | |

## Session Debriefs

### Reteste — BUG-20261024-falha-de-aviso-diz-enviado (390×844)

Bundle servido conferido antes de medir (`dist/assets/index--7cMtgla.js` contém "Falha ao enviar o aviso").
`#P74-01` → Histórico: "Falha ao enviar o aviso: Pagamento aprovado (E-mail)" logo acima de "A cliente NÃO foi
avisada". Nenhum "enviado" na linha da falha. **Fixed.** O painel não foi servido; ele lê o mesmo `buildHistory`
(suíte do backoffice verde, com as duas asserções reescritas).
Evidence: `evidence/2026-10-24-mobile-adm-pedidos/r3-390-historico-falha-de-aviso.png`.

### Regressão — Início, blocos, visões, selo

Início "Precisa de você": 31 · 16 · 5 · 10. `?bloco=aguardando/a-separar/sem-rastreio/pix-aguardando` ⇒ 31 · 16
· 5 · 10. Aba Pedidos abre em "52 pedidos precisam de você"; selo "Pedidos, 52 precisam de você". Pass.

### Regressão — voltar com busca

Tudo → "Prova 2" (11 pedidos) → rolar a 600 → abrir o 4º → voltar do navegador ⇒ "Prova 2", 11 pedidos,
`scrollY` 600. Pass.

### Regressão — fonte e largura

Detalhe `P74-01` em 390 e 1440 × fonte 100/130/200 %: `scrollWidth == innerWidth` nas seis, nenhum controle
abaixo de 44 px. Evidence: `r3-390-historico-fonte-200.png`. Pass.

### Regressão — conta sem papel

Sair → `cliente.qa` ⇒ "Esta conta não tem acesso ao painel."; `/pedidos?visao=tudo` ⇒ `/login`, nenhum `P74-`
no HTML, REST só `user_roles` e `customers`. Sair → admin entra de novo ⇒ Início. Pass.

## What Was Fixed (verificado nesta rodada)

- `BUG-20261024-falha-de-aviso-diz-enviado` — `buildHistory` usa `NOTIFICATION_EVENT_NAMES` na linha de falha.

## Paper Cuts

Nenhum novo.

## Decisions for a Human

Nenhuma. (A frase nova também muda a linha de falha no painel `/admin/pedidos/:id` — decisão já registrada em B03.)

## Final Status

- **Release readiness:** pronto. **0 bugs abertos** da `74` (os três registrados no ciclo estão fixed e retestados).
- **Exit gate (um workspace por vez, exit fora de pipe, `--testTimeout=20000`):** core exit 0, **4016 em 158** ·
  mobile-adm exit 0, **811 em 61** · backoffice exit 0, **3671 em 210**. Store não remedido nesta rodada (não
  tocado pelo B03; 5852/319 no gate do B03).
- **Fora desta rodada:** aparelho Android real; o painel servido.
- **Limpeza:** rodar `.specs/features/74-mobile-adm-pedidos/prova/limpa.sql` ao fim do ciclo.
