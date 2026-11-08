---
id: 94
titulo: Montar pedido no app do ateliê, com a leitura dos dados da cliente por IA
tipo: feature
entrada: prd
fase: done
criado: 2026-11-02
---
## Descrição
Planejar a implementação da Montagem de pedido que fizemos na feature 89 no Mobile adm. incluir funcionalidade de criar um pedido manual pelo APP e incluir uma funcionalidade com opção de gerar o registro do cliente e do endereço informando um Bloco de texto, onde um agente de IA com modelo Haiku faz a leitira desse texto e preenche os campos com dados do Cliente e Endereço de entrega, resto do cadastro se mantem. Vamos criar o prototipo no Claude Desing no projeto em uma nova página no projeto "Uma Estrelinha - Mobile Admin" com base no já existe hoje, manter mesmo design. Não implementar nada, apenas planejamento de Prototipo com comportamentos

Decidido pelo usuário na mesma sessão (2026-11-02), já refletido no PRD:
- "isso aqui não precisa 3. O texto da conversa vai para a Anthropic. A Política de Privacidade precisa de um parágrafo sobre isso, aprovado pela Adri antes de publicar."
- "4 - Sim, implementamos no Backoffice depois." (o "Colar texto" no Backoffice fica para um Work Item seguinte)
- "Na revisão de pedido, assim com na seleção dos produtos.. devem mostrar as imagens dos produtos para a Adro conferir visualmente esses protusoduto"

## Insumos
- PRD: Claude Design, projeto "Uma Estrelinha - Mobile Admin" (`a780eec8-8aba-4d6e-8b4c-2c485e2750c7`), arquivo `prompts/PRD - Montar pedido no app.md` (copiado em `prd.md`)
- Protótipo: https://claude.ai/design/p/a780eec8-8aba-4d6e-8b4c-2c485e2750c7?file=Montar+Pedido.dc.html (`Montar Pedido.dc.html` + `montado-dados.js`), no desenho do `Ateliê Admin.dc.html` do mesmo projeto
- A montagem no painel, já implementada: `.specs/features/89-pedido-montado-pelo-painel/spec.md` (`AD-070`, `AD-071`) e o desenho `Pedido - Montar.html` do projeto "Uma Estrelinha - Backoffice" (`e3957c10-bd49-4f3d-9256-04d72a7d0f41`)
- A sugestão por IA já implementada, molde da function nova: `.specs/features/84-seo-do-produto-com-ia/` (`AD-067`, `_shared/claude*.ts`, `seo-suggest`)

## Gates
| gate | quando | resultado |
| ---- | ------ | --------- |
| prd-review r1 | 2026-11-07 | changes_requested_blocking · 10 aplicados ao `prd.md` · 15 em Decisões · 0 abertos · 2 páginas |
| handoff | 2026-11-07 | pass · 13 itens → `spec.md` Decisões (D-17..D-29) · 0 travados |
| fila | 2026-11-07 | aprovada · 01–10 · auditoria `a fila serve com correção` (1 corrigido: critério da 09; 1 ao humano: conflito D-17 × D-28 → opção A, árbitro G5) |
| execução | 2026-11-07 | autorizada: 01–10 (árbitro, com a aprovação da fila) |
| validation 1 | 2026-11-08 | PASS · 5 workspaces verdes (21.005 testes) · build 3/3 com as envs locais · lint sem regressão · 10/10 UCs · 2 correções na própria rodada (`35d427e5` lint do app; `09b5b575` promoção vigente na folha e na sacola, UC-06) · D-31..D-42 na costura |
| qa-plano | 2026-11-08 | 58 casos (24 P0) · 1 pergunta 🔴 respondida na página (Q-01 → voltar leva a Montados, montagem fora do histórico; D-43) |
| QA · perguntas do plano | 2026-11-08 | 1 item (Q-01) · 1 respondido · voltar depois de "Criar link" → Montados, montagem fora do histórico |
| QA · Gate 1 — plano | 2026-11-08 | aprovado pelo árbitro (política do humano) · 6 personas · 9 charters · 58 TC (P0 24 · P1 29 · P2 5) · UC-01..UC-10 cobertos |
| QA · Gate 3 — veredito | 2026-11-08 | confirmado pelo árbitro (política do humano) · rodada 1 (exploração) · veredito fail · TC pass 33 · fail 13 · blocked 3 · skip 9 · 20 bugs novos (high 4 · medium 4 · low 12) · 0 transições · 0 perguntas ao produto · 22 sugestões de backlog |
| fix tasks | 2026-11-08 | 13 tarefas (11–23) para BUG-001..BUG-020, nos 13 lotes sugeridos pelo `qa-result.md`, todos em `apps/mobile-adm` · aprovadas pelo orquestrador · ondas em `waves-fix.md`: 11,12,15,16 \| 14,17,21 \| 13,19 \| 18,22 \| 23 \| 20 |
| validation 2 | 2026-11-08 | PASS · Re-Validation das fix tasks T11–T23 (BUG-001..BUG-020), só `apps/mobile-adm` tocado · tipos 0 · lint 0/0 · mobile-adm 2713/174 · store 7091/378 · build do app verde |
| QA · Gate 3 — veredito | 2026-11-08 | confirmado pelo árbitro (política do humano) · rodada 2 (confirmação) · veredito partial (só ambiente: TC-INT-003 sem Mercado Pago, TC-UI-002 sem peça sem foto na massa) · TC pass 47 · fail 0 · blocked 2 · skip 9 · 0 bugs novos · 20 transições open → resolved (BUG-001..BUG-020) · 0 perguntas ao produto · 10 sugestões de backlog |
