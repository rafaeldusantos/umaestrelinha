---
id: 104
titulo: Ícones do sistema no seletor do Menu da loja
tipo: improvement
entrada: plano
fase: done
criado: 2026-11-17
---
## Descrição
No Backoffice, ediçao de "menu da loja" tem a opçao de adicionar Icones para o menu. Porem os icones estào bem limitados.. quero trazer alems dos icones personalizados, icones do sistema no mesmo estilo para serem incluidos. Como por exemplo icones de Tag, descontos entre outros.. Me ajude desse planejamento e aplicaçao

## Insumos
- Pedido complementar na conversa (2026-11-17), verbatim: "Adicionar também apcáo de colocar cor no texto do menu"

## Gates
| gate | quando | resultado |
| ---- | ------ | --------- |
| perguntas do plano | 2026-11-17 | 3 ratificadas · 1 respondida de outro jeito (P-03: cor livre hex por fundo, com seletor de cor) → `plan.md` · P-01 e P-06 técnicas pela recomendação |
| fila | 2026-11-17 | aprovada (2 tarefas, 01–02; fila da outra sessão copiada para o worktree a pedido do humano) · ONDAS: 01,02 · pd-task-audit: serve com correção — 1 corrigido (prova de gravação de C-05 na 01) · §6→§5 no Trecho da costura · 0 ao humano |
| validation 1 | 2026-11-17 | PASS · core 6282/6282 · backoffice 5589/5589 · store 7873/7873 (exit 0 com forks/2 workers; antes, exit 1 só por timeout de RPC do worker sob load 223) · tsc 0/7/11/0 e lint 2/2 · 23/5 iguais à baseline · build store e backoffice ✓ (env local inline; worktree sem `.env`) · C-01..C-07 cobertos → `qa-report.md` |
| QA · Gate 1 — plano | 2026-11-17 | aprovado · 19 TC · 5 charters · qa/test-plans/icones-e-cor-do-menu-test-plan.md (Ambiente da execução ajustado na execução: massa legada, perfil inicial Black Friday, itens A–D nomeados) |
| QA · Gate 3 — veredito | 2026-11-17 | fail · rodada 1 · 2 bugs novos (BUG-001 high, BUG-002 medium) · 0 transições · humano: "resolver todos os bugs" — os dois vão à correção · qa/qa-result-2026-11-17-r1.md |
| fix tasks | 2026-11-17 | 2 fix tasks da QA rodada 1 · 03 (BUG-001 high) · 04 (BUG-002 medium, a pedido do humano: "resolver todos os bugs") · lotes separados (mesmo editor, na dúvida separado) · ONDAS: 03 \| 04 → waves-fix.md · aprovadas pelo orquestrador (autorização do humano) |
| validation 2 | 2026-11-17 | PASS · depois das fix tasks 03 (BUG-001) e 04 (BUG-002) · backoffice 5603/5603 exit 0 · store 7873/7873 (exit 1 só por timeout de RPC do worker sob carga) · tsc 0/7/0/11 e lint 2/2 · 23/5 iguais · build store e backoffice ✓ → `qa-report.md` |
| QA · Gate 3 — veredito | 2026-11-17 | pass · rodada 2 (confirmação) · reteste: BUG-001 e BUG-002 resolved (open → resolved) · CH-01 TC-FUNC-004 pass · CH-02 TC-FUNC-006 pass · CH-03..05 não rodaram (TC pass na rodada 1) · 0 bugs novos · 1 sugestão de backlog · confirmado pelo árbitro do orquestrador · qa/qa-result.md (rodada 1 em qa/qa-result-2026-11-17-r1.md) |
