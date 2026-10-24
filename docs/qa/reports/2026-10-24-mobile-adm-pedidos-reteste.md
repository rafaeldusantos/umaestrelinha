# QA Run Report — 2026-10-24 — mobile-adm-pedidos (reteste, rodada 2)

- **Scope:** reteste dos dois bugs da rodada 1 (`reports/2026-10-24-mobile-adm-pedidos.md`), consertados na
  working tree, mais regressão da aba Pedidos (blocos, visões, selo, busca, detalhe, fonte grande, 1440, conta
  sem papel). Canary: Início.
- **Cadence tier:** targeted (rodada 2)
- **Build:** working tree sem commit (`feat/74-mobile-adm-pedidos`, sobre `775e407e`),
  `pnpm --filter @estrelinha/mobile-adm build` + `vite preview --port 4377`
  · **Environment:** http://localhost:4377, Supabase local (API :54441), `adri.qa@exemplo.invalid` (admin) e
  `cliente.qa@exemplo.invalid` (sem papel); `**/*.supabase.co/**` abortado (0 pedidos) e `**/g/collect*`
  interceptado (0 hits).
- **Fixturas:** `.specs/features/74-mobile-adm-pedidos/prova/fixturas.sql` + `evidence/2026-10-24-mobile-adm-pedidos/fixturas-extras-qa.sql`
  (61 pedidos `P74-*`; sem o `P74-62` da rodada 1, por isso "Tudo" = 115).
- **Status:** closed

## Session Matrix & Results

| # | Charter | Journey / Scenario | Persona | Tour | Status | Issue | Fix commit |
|---|---|---|---|---|---|---|---|
| 1 | CH-pedidos-numero-da-inicio-bate | J-achar-um-pedido / blocos, visões, selo (regressão) | Adri no celular | Money | Pass | | |
| 2 | CH-pedidos-achar-o-pedido-da-cliente | J-ver-um-pedido / detalhe, meio de pagamento | Adri no celular | Paste | Fixed (cartão) · novo achado aberto | BUG-20261024-pagamento-por-cartao-aparece-como-card (fixed); BUG-20261024-falha-de-aviso-diz-enviado (open) | working tree |
| 3 | CH-pedidos-voltar-do-android | J-ver-um-pedido / voltar com busca | Adri no celular | Back-Button | Fixed | BUG-20261024-voltar-do-pedido-buscado-perde-a-busca | working tree |
| 4 | CH-pedidos-com-leitor-de-tela-e-fonte-grande | J-achar-um-pedido / fonte, largura (regressão) | Equipe com TalkBack | Feature | Pass | | |
| 5 | CH-pedidos-conta-sem-acesso | J-achar-um-pedido / conta sem papel, troca de conta (regressão) | Cliente com conta da loja | Garbage | Pass | | |
| 6 | CH-pedidos-com-rede-ruim | — | — | — | Skipped | sem mudança nos caminhos de falha desde a r1 (Pass) | |
| 7 | CH-pedidos-ao-vivo-com-o-painel | — | — | — | Skipped | sem mudança no Realtime desde a r1 (Pass) | |

## Session Debriefs

### Reteste — BUG-20261024-voltar-do-pedido-buscado-perde-a-busca (390×844)

Tudo → `Prova 2` ("11 pedidos") → rolar até `scrollY` 779 → abrir `P74-26` → "Voltar" ⇒ campo "Prova 2",
"11 pedidos", 11 linhas, `scrollY` 779, sem esqueleto. Voltar do navegador ⇒ idem. Trocar de chip com o termo
⇒ o termo segue (Concluídos, 2). Entrada nova pela aba Pedidos ⇒ sem termo, "Precisa de ação" (52). Voltar
duas vezes até a entrada buscada ⇒ o termo volta. F5 ⇒ sem termo (36 em Concluídos). Termo apagado, abrir e
voltar ⇒ vazio. `history.state` sem o termo (A13 respeitada). **Fixed.**
Evidence: `evidence/2026-10-24-mobile-adm-pedidos/r2-390-voltar-mantem-busca.png`.

### Reteste — BUG-20261024-pagamento-por-cartao-aparece-como-card (390×844)

`#0174` ⇒ "Total R$ 277,25 / Cartão de crédito / Recusado". `#P74-03` (`payment_method = 'cartao'`, fora do
mapa) ⇒ "Outra forma de pagamento", nunca o valor cru. `#P74-01` ⇒ "PIX". **Fixed.** O painel não foi servido;
ele lê o mesmo mapa de `core` (suíte do backoffice verde).
Evidence: `evidence/2026-10-24-mobile-adm-pedidos/r2-390-detalhe-0174-cartao.png`.

### Novo achado no detalhe (histórico)

`#P74-01`, bloco Histórico: "Falha ao enviar aviso de pagamento aprovado **enviado** (E-mail)" logo acima de
"A cliente NÃO foi avisada". A frase afirma e nega o envio. Herdada do painel (a `74` a moveu para
`core/orders/history.ts` byte a byte, e duas asserções a cravam); estava só como observação O2 da
`prova-navegador.md`, nunca no registro ⇒ `BUG-20261024-falha-de-aviso-diz-enviado` (Trust-Damage, Low, P3).

### Regressão — blocos, visões, selo

`?bloco=aguardando/a-separar/sem-rastreio/pix-aguardando` ⇒ 31 · 16 · 5 · 10, iguais aos números de "Precisa de
você" da Início no mesmo instante (31 · 16 · 5 · 10). Visões: Tudo 115 · Fila de material 35 · A separar 43 ·
Em trânsito 13 · Concluídos 36; `?visao=xyz` ⇒ "52 pedidos precisam de você". Selo da aba "Pedidos, 52 precisam
de você". Pass.

### Regressão — fonte e largura

390×844 e 1440×900 × fonte 100/130/200 % × (lista "Tudo" buscada, detalhe `P74-01` com nome longo e histórico,
detalhe `P74-13` com descontos) = 18 medições: `scrollWidth == innerWidth` em todas, nenhum controle abaixo de
44 px. Evidence: `r2-390-lista-busca-fonte-130.png`, `r2-390-detalhe-p01-fonte-200.png`. Pass.

### Regressão — conta sem papel e troca de conta

Admin com busca "Prova 2" → Sair → `cliente.qa` ⇒ "Esta conta não tem acesso ao painel."; `/pedidos?visao=tudo`
⇒ volta ao login, nenhum `P74-` no HTML, leituras REST só `user_roles` e `customers`; o voltar não traz a busca da
conta anterior. Admin entra de novo ⇒ Início. Pass.

## What Was Fixed (verificado nesta rodada)

- `BUG-20261024-pagamento-por-cartao-aparece-como-card` — `card` e a queda "Outra forma de pagamento" em
  `core/orders/labels.ts`; a loja parte do mapa de `core`.
- `BUG-20261024-voltar-do-pedido-buscado-perde-a-busca` — `useTermoDaEntrada` (termo por `location.key`, em
  memória, esquecido na troca de conta).

## Paper Cuts

| Persona | Where | Felt | Sharpness | Outcome |
|---|---|---|---|---|
| Adri no celular | detalhe de pedido de fixtura | "Total R$ 103,00" com subtotal 103 + frete 19,90 | low | dado de fixtura (`total = 100+n`), não código |

## Decisions for a Human

### BUG-20261024-falha-de-aviso-diz-enviado
- Opções: (1) na falha, usar `NOTIFICATION_EVENT_NAMES` (o nome do evento) em vez do rótulo de histórico —
  "Falha ao enviar o aviso de pagamento aprovado (E-mail)" —, atualizando as duas asserções que cravam a frase
  (muda o texto do painel também); (2) deixar fora da `74` (herdado) e abrir no backlog. **Recomendação: 1** —
  é uma linha em `core`, as duas telas ganham, e a regra "o painel não muda" cede a conserto de texto quebrado.

## Final Status

- **Release readiness:** os dois bugs da rodada 1 estão **fixed e retestados**; **1 bug aberto** (novo
  registro de um defeito herdado): Trust-Damage 1 (Low/P3). 0 Blocks-Completion, 0 Data-Loss, 0 Friction.
- **Exit gate (um workspace por vez, exit fora de pipe, `--testTimeout=20000`):**
  mobile-adm exit 0, **811 em 61** · core exit 0, **3998 em 158** · backoffice exit 0, **3671 em 210** ·
  store exit 0, **5852 em 319**.
- **Fora desta rodada:** aparelho Android real (TalkBack, voltar na raiz); o painel servido conferindo
  "Cartão de crédito".
- **Limpeza:** rodar `.specs/features/74-mobile-adm-pedidos/prova/limpa.sql` ao fim do ciclo (as fixturas
  ficaram carregadas no banco local para o próximo reteste).
