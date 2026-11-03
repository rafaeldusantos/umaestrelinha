---
id: WI-01
titulo: Compre Junto na página do produto
tipo: feature
entrada: prd
fase: done
criado: 2026-11-02
---
## Descrição
91

(O pedido do `/feature start` foi apenas "91": retoma o trabalho já feito no checkout principal, em `.specs/work-items/91-compre-junto/` — descoberta, `prd.md` ratificado e PRD Tech Review r1. Esses três arquivos foram trazidos para esta pasta; o PRD é a fonte, e a entrada passa a `prd` porque a descoberta e a revisão já correram.)

## Insumos
- Claude Design, projeto "Uma Estrelinha - Backoffice" (`e3957c10-bd49-4f3d-9256-04d72a7d0f41`): https://claude.ai/design/p/e3957c10-bd49-4f3d-9256-04d72a7d0f41?file=Compre+Junto+-+Listas+e+ades%C3%A3o.html (listas e adesão) e https://claude.ai/design/p/e3957c10-bd49-4f3d-9256-04d72a7d0f41?file=Produto+-+Compre+Junto.html (a aba Compre junto do produto)
- Claude Design, projeto "Uma Estrelinha - Loja" (`69224d8a-17ae-4b1f-a251-a8105b41edc2`): https://claude.ai/design/p/69224d8a-17ae-4b1f-a251-a8105b41edc2?file=Produto+-+Compre+Junto.html (o bloco na página do produto e a sacola)
- `discovery.md` e `prd-review.md` desta pasta (evidência de código e Decisões `D-*`)
- Work Items vizinhos, fora deste escopo: 92 (desconto da compra casada), 93 (combinar o acabamento)

## Gates
| gate | quando | resultado |
| ---- | ------ | --------- |
| descoberta | 2026-11-02 | ratificado (feito no checkout principal) · 5 premissas · 14 perguntas → `prd.md` · desconto cortado para o WI 92 |
| prd-review r1 | 2026-11-02 | changes_requested_blocking · 10 aplicados ao `prd.md` · 9 tech em Decisões (`prd-review.md`) · 0 abertos · combinar o acabamento → WI 93 |
| handoff | 2026-11-02 | pass · 9 itens → `prd.md` (CA-01.1, CA-03.14/03.15, CA-04.9, CA-05.1, CA-06.4/06.5, RNF-07, UC-09 novo) e `spec.md` Decisões · 0 abertos · 1 premissa a confirmar (forma do bloco global) |
| fila | 2026-11-02 | aprovada · tarefas 01–07 · ONDAS: 01 \| 02,03 \| 04,07 \| 05 \| 06 · auditoria: a fila serve com correção · 3 corrigidos (recusas do principal e do repetido na 01; GA4 de exibição e escolha na 03; fixture `cardSelect` na 03) · 0 ao humano · execução autorizada junto da aprovação |
| validation 1 | 2026-11-02 | PASS · 21534 testes, 0 falhas (6 workspaces) · tipos 0 (core 11 herdados) · lint no baseline 25/7 · build verde (com env local; worktree sem .env) · 59/59 critérios · commits incompletos de T01/T03/T06 corrigidos (67626a0c, 07fc6a29, 415af2b5) · layout em navegador fica para a QA |
| QA · perguntas do plano | 2026-11-02 | 2 itens · 2 respondidos (Q-01: A — massa M-08 gravada no banco local e apagada ao fim · Q-02: A — "cobrado" = valor do pedido gravado, sem exigir o QR) |
| QA · Gate 1 — plano | 2026-11-02 | aprovado (Têmis, pela política do humano) · 4 personas · 6 jornadas · 8 charters · 74 TC (P0 12 · P1 53 · P2 9) · 65/65 critérios · D-01, D-02 · ressalva: adicional incompleto vira achado de produto, não bug |
| QA · Gate 3 — veredito | 2026-11-02 | fail · 13 bugs novos (high 2 · medium 5 · low 6) · 0 transições · confirmado por Têmis (política do humano) · qa/qa-result.md |
| QA · perguntas ao produto | 2026-11-02 | 3 itens · 3 respondidos (P-01: só o completo → WI novo · P-02: segue e a dona resolve → nada · P-03: pendente) · qa/decisoes-produto.md |
| fix tasks | 2026-11-02 | BUG-001 → tarefa 08 (lote de um, aprovação e execução delegadas pelo orquestrador) |
| validation 2 | 2026-11-02 | PASS · fix task 08 (BUG-001) · store 6871/365 e backoffice 5043/280, exit 0 · tipos 0 · lint store 2/2 (baseline) · build da loja verde · revisão: serve |
| QA · reteste BUG-001 | 2026-11-02 | resolved (Gate 3 de um bug delegado pelo orquestrador) · fix task 08, commit 410fc8bd · qa/retest.md |
| fix tasks | 2026-11-02 | BUG-002 → tarefa 09 (lote de um, aprovação e execução delegadas pelo orquestrador) |
| validation 3 | 2026-11-02 | PASS · fix task 09 (BUG-002) · store 6876/366 e backoffice 5043/280, exit 0 · tipos 0 · lint store 2/2 (baseline) · build da loja verde · revisão: serve |
| QA · reteste BUG-002 | 2026-11-02 | resolved (Gate 3 de um bug delegado pelo orquestrador) · fix task 09, commit 6e0ded1f · qa/retest.md |
| fix tasks | 2026-11-02 | BUG-003 → tarefa 10 (lote de um, aprovação e execução delegadas pelo orquestrador) |
| validation 4 | 2026-11-02 | PASS · fix task 10 (BUG-003) · core 5311/213, store 6876/366 e backoffice 5043/280, exit 0 · tipos store 0, core 11 herdados · lint store 2/2 (baseline) · build da loja verde · revisão: serve |
| QA · reteste BUG-003 | 2026-11-02 | resolved (Gate 3 de um bug delegado pelo orquestrador) · fix task 10, commit 5919dbfa · qa/retest.md |
| fix tasks | 2026-11-02 | BUG-004 → tarefa 11 (lote de um, aprovação e execução delegadas pelo orquestrador) |
| validation 5 | 2026-11-02 | PASS · fix task 11 (BUG-004) · store 6881/366 e backoffice 5043/280, exit 0 · tipos 0 · lint store 2/2 (baseline) · build da loja verde · revisão: serve |
| QA · reteste BUG-004 | 2026-11-02 | resolved (Gate 3 de um bug delegado pelo orquestrador) · fix task 11, commit 14587057 · qa/retest.md · achado novo no entorno (N-1, anterior ao fix: gravação acima do limite também acende "Essa combinação está indisponível no momento." e o botão da coluna "Indisponível") fica para a triagem |
| fix tasks | 2026-11-02 | BUG-005 → tarefa 12 (lote de um, aprovação e execução delegadas pelo orquestrador) |
| validation 6 | 2026-11-02 | PASS · fix task 12 (BUG-005) · store 6888/366 e backoffice 5043/280, exit 0 · tipos 0 · lint store 2/2 (baseline) · build da loja verde · revisão: serve com correção (2 achados de convenção mantidos pelo protótipo, decisão registrada na tarefa 12) |
| QA · reteste BUG-005 | 2026-11-02 | resolved (Gate 3 de um bug delegado pelo orquestrador) · fix task 12, commit 20764d2d · qa/retest.md · observação não reproduzida (primeiro clique na caixa sem marcar, 1 vez em 7 cargas) fica para a triagem |
| fix tasks | 2026-11-02 | BUG-006 → tarefa 13 (lote de um, aprovação e execução delegadas pelo orquestrador) |
| validation 7 | 2026-11-02 | PASS · fix task 13 (BUG-006) · store 6893/366 e backoffice 5043/280, exit 0 · tipos 0 · lint store 2/2 (baseline) · build da loja verde · revisão: serve |
| QA · reteste BUG-006 | 2026-11-02 | resolved (Gate 3 de um bug delegado pelo orquestrador) · fix task 13, commit 636b5ad4 · qa/retest.md · observações (Esc que não fechou 1 vez com o painel aberto; "Esconder opções" atrás da folha em 390) ficam para a triagem |
| fix tasks | 2026-11-02 | BUG-007 → tarefa 14 (lote de um, aprovação e execução delegadas pelo orquestrador) |
| validation 8 | 2026-11-02 | PASS · fix task 14 (BUG-007) · store 6898/366 e backoffice 5043/280, exit 0 · tipos 0 · lint store 2/2 (baseline) · build da loja verde · revisão: serve |
| QA · reteste BUG-007 | 2026-11-02 | resolved (Gate 3 de um bug delegado pelo orquestrador) · fix task 14, commit 016252b5 · qa/retest.md |
| fix tasks | 2026-11-02 | BUG-008 → tarefa 15 (lote de um, aprovação e execução delegadas pelo orquestrador) |
| validation 9 | 2026-11-02 | PASS · fix task 15 (BUG-008) · store 6901/366 e backoffice 5043/280, exit 0 · tipos 0 · lint store 2/2 (baseline) · build da loja verde · revisão: serve |
| QA · reteste BUG-008 | 2026-11-02 | resolved (Gate 3 de um bug delegado pelo orquestrador) · fix task 15, commit b819d1b8 · qa/retest.md |
| fix tasks | 2026-11-02 | BUG-009 → tarefa 16 (lote de um, aprovação e execução delegadas pelo orquestrador) |
| validation 10 | 2026-11-02 | PASS · fix task 16 (BUG-009) · backoffice 5048/280 e store 6901/366, exit 0 · tipos 0 · lint backoffice 23/5 (baseline) · revisão: serve · commit ddacc7cf |
| QA · reteste BUG-009 | 2026-11-02 | resolved (Gate 3 de um bug delegado pelo orquestrador) · fix task 16, commit ddacc7cf · qa/retest.md |
| fix tasks | 2026-11-02 | BUG-010 → tarefa 17 (lote de um, aprovação e execução delegadas pelo orquestrador) |
| validation 11 | 2026-11-02 | PASS · fix task 17 (BUG-010) · core 5311/213, backoffice 5056/280 e store 6901/366, exit 0 · tipos backoffice 0, core 11 herdados · lint backoffice 23/5 (baseline) · revisão: serve |
| QA · reteste BUG-010 | 2026-11-02 | resolved (Gate 3 de um bug delegado pelo orquestrador) · fix task 17, commit 55c79954 · qa/retest.md |
| fix tasks | 2026-11-02 | BUG-011 → tarefa 18 (lote de um, aprovação e execução delegadas pelo orquestrador) |
| validation 12 | 2026-11-02 | PASS · fix task 18 (BUG-011) · backoffice 5074/280 e store 6901/366, exit 0 · tipos backoffice 0 · lint backoffice 23/5 (baseline) · revisão: serve · commit 543e98e8 |
| QA · reteste BUG-011 | 2026-11-02 | resolved (Gate 3 de um bug delegado pelo orquestrador) · fix task 18, commit 543e98e8 · qa/retest.md · achado novo no entorno (N-1, anterior ao fix: no editor de lista em 390 o nome de cada peça sai cortado em "QA ...") fica para a triagem |
| fix tasks | 2026-11-02 | BUG-012 → tarefa 19 (lote de um, aprovação e execução delegadas pelo orquestrador) |
| validation 13 | 2026-11-02 | PASS · fix task 19 (BUG-012) · backoffice 5081/280 e store 6901/366, exit 0 · tipos backoffice 0 · lint backoffice 23/5 (baseline) · revisão: serve |
| QA · reteste BUG-012 | 2026-11-02 | resolved (Gate 3 de um bug delegado pelo orquestrador) · fix task 19, commit eb83a7eb · qa/retest.md |
| fix tasks | 2026-11-02 | BUG-013 → tarefa 20 (lote de um, aprovação e execução delegadas pelo orquestrador) |
| validation 14 | 2026-11-03 | PASS · fix task 20 (BUG-013) · backoffice 5086/280 e store 6901/366, exit 0 · tipos backoffice 0 · eslint dos arquivos tocados limpo (baseline 23/5) · revisão: serve · commit f9167d9d |
| QA · reteste BUG-013 | 2026-11-03 | resolved (Gate 3 de um bug delegado pelo orquestrador) · fix task 20, commit f9167d9d · qa/retest.md · massa temporária gravada no banco local e apagada pelos ids ao fim |
| QA · Gate 3 — veredito (rodada 2, confirmação) | 2026-11-03 | pass · TC pass 10 · fail 0 · blocked 1 (TC-UI-006, P2, sem massa) · 42/65 critérios · 0 bugs novos · 0 transições (BUG-001..013 seguem resolved) · CH-01/02/03/07/08 · 3 sugestões de backlog · confirmado por Têmis (política do humano) · qa/qa-result.md |
