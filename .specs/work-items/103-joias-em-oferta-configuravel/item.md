---
id: 103
titulo: Joias em oferta configurável — título, descrição, campanha e peças escolhidas no bloco da Home
tipo: improvement
entrada: descoberta
fase: done
criado: 2026-11-14
---
## Descrição
Pedido de 2026-11-14:

"no backoffice, construimos um novo sessào em HOme onde podemos configurar as "Joias em Ofetas" que vem das camapanhas. Adicionar a essa sessão a possibiidade de Adicionar Titulo e descrição para a sessão, escolher entre as campanhas ativas e selecionar entre os produtos da campanha.. Verifique o que precisa fazer para essa melhoria, e crie um novo WI."

## Insumos
- WI de origem do bloco: `.specs/work-items/102-desconto-de-campanha/` (`prd.md`, `spec.md` — D-04 bloco da Home; o editor sem campos foi decisão de lá)
- O editor de hoje: `apps/backoffice/src/features/home-composition/ui/CampaignOffersEditor.tsx`
- A regra do bloco: `packages/core/src/home/campaignOffers.ts`
- O bloco na loja: `apps/store/src/widgets/campaign-offers/ui/CampaignOffers.tsx`, `model/useCampaignOfferProducts.ts`
- A migration do tipo: `supabase/migrations/20261130140000_102-joias-em-oferta-na-home.sql`
- As campanhas: `supabase/migrations/20261130120000_102-campanhas.sql` (vigências não se cruzam entre ativas)
- Protótipo da WI 102: Claude Design `Black Friday - Home.html` (projeto `4abe021d-d77e-4fe7-affd-524180315fa3`), o bloco "Joias em oferta" — inacessível (MCP `claude-design` recusa o login)
- Protótipo desta WI (informado pelo humano em 2026-11-16, para validar): https://claude.ai/artifact/SQehnBNiiQmbnjkY3QQpbq — fonte de design (`link`, artifact do claude.ai)

## Gates
| gate | quando | resultado |
| ---- | ------ | --------- |
| descoberta | 2026-11-14 | ratificado · 8 premissas (1 recusada: P-07, mais de um bloco, um por campanha) · 9 perguntas + 1 opcional (X-01 → UC-06) → `prd.md` · Q-10 aberta numa página nova pelo choque Q-05 × Q-06, respondida (c), substitui a Q-05 · 0 abertos |
| prd-review r1 | 2026-11-14 | changes_requested_gaps · 9 aplicados ao `prd.md` · 5 em Decisões (F1, F2, F9, F10, F11) · 0 abertos · página com os 7 de negócio fechada pela recomendação por delegação do humano |
| handoff | 2026-11-16 | pass · 8 itens (D-01..D-08) → `spec.md` Decisões · 0 abertos · inline a pedido (delegação explícita do humano nesta conversa) · UC-06 provado no local |
| fila | 2026-11-16 | aprovada pela recomendação (delegação explícita do humano nesta conversa) · 01..04 · ONDAS: 01 \| 02 \| 03 \| 04 · pd-task-audit: a fila serve com correção · 3 corrigidos (D-01 completo na 03, CA-02.5/F1 na 03, exemplar FK na 02) + 1 lacuna de medição fechada (02 mantém o painel verde) · 0 ao humano |
| validation 1 | 2026-11-16 | PASS · core 6240 · store 7854 · backoffice 5538 · functions 1711, todos exit 0 · tipos 0/7/11 = baseline · lint 2/2 e 23/5 = baseline · build PASS (com `.env` do Supabase local; o worktree não tem `apps/store/.env`) · 35/35 critérios (RNF-04 por proxy, medida no QA) · 0 bugs abertos · `qa-report.md` |
| QA · Gate 1 — plano | 2026-11-16 | aprovado pela política delegada do humano · plano v1 (8 charters, 32 TC) · conferido contra o session-summary sem revisão: o contador "n/limite" (I-06) vai ao briefing como desvio declarado |
| QA · Gate 3 — veredito | 2026-11-17 | rodada 1 · fail · 21 pass, 7 fail, 1 blocked, 3 skip · 6 bugs novos open (BUG-001..003 high; BUG-004..006 medium, todos quebram critério do PRD ⇒ bloqueantes) · 0 transições · 0 descartes · 0 perguntas ao produto · confirmado por Têmis pela política do humano · `qa/qa-result.md` |
| fix tasks | 2026-11-17 | rodada 1 · 6 bugs open em 4 lotes · 05 (BUG-001, BUG-004 · barra do editor) · 06 (BUG-002, BUG-006 · linha do bloco) · 07 (BUG-003 · Home da loja) · 08 (BUG-005 · conferência das peças) · ONDAS: 05,07 \| 06 \| 08 · aprovado pelo orquestrador (delegação do humano) · `waves-fix.md` |
| validation 2 | 2026-11-17 | PASS · Re-Validation das fix tasks 05..08 (commits 65d16a85, f414a988, 845e8bfa, e09d6b71) · core 6240/258 · functions 1711/49 · backoffice 5557/312 · store 7855/417, todos exit 0 · tipos 0/7/11 = baseline · lint 2/2 e 23/5 = baseline · build store e backoffice PASS · bugs seguem open até o reteste · `qa-report.md` |
| QA · Gate 3 — veredito | 2026-11-17 | rodada 2 (confirmação) · pass · 30 pass, 1 fail (TC-CFR-001), 1 skip (TC-FUNC-007) · BUG-001..006 open → resolved · 1 bug novo open: BUG-007 medium, regressão do fix do BUG-004, quebra RNF-04 ⇒ bloqueante · 0 descartes · 0 perguntas · confirmado por Têmis pela política do humano · `qa/qa-result.md` |
| fix tasks | 2026-11-17 | rodada 2 · 1 bug open em 1 lote · 09 (BUG-007 · barra do editor, `FormPageHeader` gruda só enquanto cabe) · aprovado pelo orquestrador (delegação do humano) |
| validation 3 | 2026-11-17 | PASS · Re-Validation da fix task 09 (commit 656bb5ce) · backoffice 5566/312 exit 0 · tipos 7 = baseline · lint 23/5 = baseline · build backoffice PASS · BUG-007 segue open até o reteste · `qa-report.md` |
| QA · Gate 3 — veredito | 2026-11-17 | rodada 3 (confirmação) · pass · 31 pass, 0 fail, 0 blocked, 1 skip (TC-FUNC-007; CA-01.6 sem caso executado) · BUG-007 open → resolved · 0 bugs novos · 0 descartes · 0 perguntas · 4 achados pré-existentes medium (N-1..N-4) ao backlog · confirmado por Têmis pela política do humano · `qa/qa-result.md` |
| QA · perguntas do plano | 2026-11-17 | 10 premissas (P-01..P-10) · todas mantidas pela sugestão, a pedido do humano no chat, depois de a página expirar duas vezes · 0 viram bug · P-02/P-03 deixam a cobertura do TC-FUNC-007 no backlog · `qa/decisoes-produto.md` |

## Retomada (2026-11-14)
Pausado a pedido do humano durante o lookup (`fase: specify`, sem `spec.md`).
- **Delegação vigente:** o humano pediu o workflow inteiro até o fim do QA, com handoff, perguntas e decisões respondidas pela recomendação (ou por um segundo agente), sem esperar resposta.
- **Design lookup:** a fonte (Claude Design `Black Friday - Home.html`) está inacessível — `needs_design_scopes`, pede `/design-login`. Decidido pela recomendação: seguir sem ela; a referência do bloco na loja é o componente já construído e com QA na 102 (`apps/store/src/widgets/campaign-offers/`), e o editor do painel não tem protótipo (molde: "Produtos em destaque"). Registrar na seção Design do `spec.md`.
- **Code lookup:** interrompido no meio, sem relatório. Redisparar um `wi-code-lookup` no monorepo com o mesmo escopo (o `prd.md` r1, o `discovery.md`, as Decisões F1, F2, F3, F9, F10, F11 do `prd-review.md`).
- **Depois:** conferências → handoff (inline pela recomendação) → `spec.md` → fila + ondas → `wi-task-audit` → corrida → Validation → `wi-qa-validation`.
