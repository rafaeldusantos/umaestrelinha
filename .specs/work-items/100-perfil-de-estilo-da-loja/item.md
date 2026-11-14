---
id: 100
titulo: Perfil de estilo da loja (Padrão e Black Friday), com a chave no painel
tipo: feature
entrada: prd
fase: done
criado: 2026-11-13
---
## Descrição
Pedido de 2026-11-13:

"Preciso personalziar a loja virtual para a Black Friday que já começou no mês de novembro. A ideia é criar um perfil de estilo para ajustar as cores da loja para as cores relacionadas a BlackFriday" · "Cria perfil para eslizar a Loja com cores do BlackFriday, com possibilidade de voltar ao default quando a gente quizer (Adicionar chave de escollha nas configuraçoes do Backoffice)" · "Criar no Claude Design a tela inicial da Loja modelo Desktop e Mobile (validar no código) com esse novo Stilo com cores da BlackFriday."

## Insumos
- PRD: `prd.md` (escrito nesta sessão)
- Protótipo: Claude Design, projeto "Uma Estrelinha - Black Friday" (`4abe021d-d77e-4fe7-affd-524180315fa3`), página **`Black Friday - Home.html`** (`bf.css` traz o perfil em `.palco[data-tema="bf"]`; o painel do protótipo alterna Padrão/Black Friday e Computador/Celular 390) — https://claude.ai/design/p/4abe021d-d77e-4fe7-affd-524180315fa3?file=Black+Friday+-+Home.html. O Claude Design avulso sai do ar até 2026-12-14.
- Protótipo do painel: **`Painel - Campanhas, faixa e perfil.html`**, tela **Configurações · perfil de estilo** (D-01: o card em "Dados da loja" com as duas opções e amostras, "Em uso", o aviso do cache de D-02, "Ver a loja com este perfil" e Salvar) — https://claude.ai/design/p/4abe021d-d77e-4fe7-affd-524180315fa3?file=Painel+-+Campanhas%2C+faixa+e+perfil.html (escolher a tela no painel do protótipo; `adm-faixa-perfil.jsx`)
- Cópia publicada das telas (o Claude Design avulso sai do ar até 2026-12-14): https://claude.ai/artifact/2yUJyqwYr6tipVWQEh8xdd — índice das páginas do projeto; as deste item são **Home com o perfil** (`home.html`) e **Painel · Configurações · perfil de estilo** (`painel.html`, escolher a tela no painel do protótipo).
- Os tokens de hoje: `packages/ui/src/tokens/estrelinha.ts` (`ESTRELINHA_COLORS`, valores hex), `apps/store/tailwind.config.ts`, `apps/store/src/app/App.css` (`--estrelinha-*`)
- Os guardas da paleta: `palette.test.ts`, `contrast.test.ts`, `accentText.test.ts`, `fieldBorder.test.ts`, `arbitraryTextColor.test.ts`, `importOrder.test.ts` (suíte da loja)
- O HTML servido: `apps/store/server/page.ts` (`readSettings`), `packages/core/src/page/head.ts` (`applyHead`)
- A configuração lida pela loja: `apps/store/src/app/RuntimeSettingsLoader.tsx`, `packages/core/src/hooks/useStoreSettings.ts`
- As seções de Configurações do painel: `apps/backoffice/src/shared/lib/settingsSections.ts` (4 seções, guardadas por `settingsSections.test.ts` e `panels.test.tsx`)

## Gates
| gate | quando | resultado |
| ---- | ------ | --------- |
| decisões do PRD (chat) | 2026-11-13 | pela recomendação: D-01 card em "Dados da loja" · D-02 demora do cache aceita e avisada · D-03 sem ligar com a campanha · 0 perguntas abertas |
| prd-review r1 | 2026-11-14 | changes_requested_blocking · 6 aplicados ao `prd.md` · 12 em Decisões · 0 abertos · inline a pedido (decidido pela recomendação) |
| handoff | 2026-11-14 | pass · 13 itens → `spec.md` Decisões (H1..H13) · inline a pedido (decidido pela recomendação) |
| fila | 2026-11-14 | aprovada na sessão pela recomendação (o usuário mandou orquestrar de ponta a ponta) · 01–07 · ondas 01,03 \| 02,04,05 \| 06,07 · auditoria: serve com correção, 1 corrigido (sombra do CookieNotice), 0 ao humano |
| execução | 2026-11-14 | 01 a 07, a fila inteira, autorizada pelo usuário na sessão |
| validation 1 | 2026-11-14 | PASS · testes core 6092/256 · store 7630/409 · backoffice 5422/308 · mobile-adm 2734/176 · functions 1705/49, exit 0 · build verde (com env de placeholder: o worktree não tem `apps/store/.env`) · tipos 0·7·0·0·core 11 e lint 25/7 iguais à baseline · 17/17 critérios cobertos; prova em navegador (RN-08) com a QA |
| QA · perguntas do plano | 2026-11-14 | 1 item · 1 respondido · Q-01: (A) a thread cria pelo checkout local um pedido PIX pendente da conta de teste, functions com chaves externas inválidas |
| QA · Gate 1 — plano | 2026-11-14 | aprovado (plano v2) · 5 personas · 4 jornadas · 8 charters em 5 lotes · 24 TC (P0 8 · P1 13 · P2 3) · 18/18 critérios · decidido por Têmis, pela política delegada do humano |
| QA · Gate 3 — veredito | 2026-11-14 | rodada 1 (exploração) · fail · TC pass 12 · fail 2 · blocked 3 · skip 7 · 5/18 critérios cobertos (13 parciais) · bugs novos 4: BUG-001 critical, BUG-002 medium, BUG-003 low, BUG-004 low (todos open) · sem transições · confirmado por Têmis, pela política delegada do humano |
| QA · Gate 3 — veredito | 2026-11-14 | rodada 2 (confirmação) · fail · TC pass 15 · fail 1 · blocked 1 · skip 7 · 6/18 critérios cobertos · bug novo 1: BUG-005 high (open) · BUG-001..004 open → resolved · qa/qa-result.md · confirmado por Têmis, pela política delegada do humano |
| QA · Gate 3 — veredito | 2026-11-14 | rodada 3 (confirmação) · partial · TC pass 17 · fail 0 · blocked 0 · skip 7 · 8/18 critérios cobertos · bugs novos 0 · BUG-005 open → resolved · qa/qa-result.md · confirmado por Têmis, pela política delegada do humano |
| fix tasks | 2026-11-14 | rodada 1 da QA · 08 (BUG-001, BUG-002 — card do perfil, carga e salvar) · 09 (BUG-003, BUG-004 — card do perfil, visual) · ondas 08 \| 09 · lotes aprovados pelo orquestrador (autorização delegada do humano) |
| validation 2 | 2026-11-14 | PASS · depois das fix tasks 08–09 · testes core 6098/256 · store 7630/409 · backoffice 5440/308 · mobile-adm 2734/176 · functions 1705/49, exit 0 (store remedida sozinha: 1ª volta só com timeout de worker) · tipos 0·7·0·0·core 11 e lint 25/7 iguais à baseline · build verde · bugs seguem open até o reteste |
| fix tasks | 2026-11-14 | rodada 2 da QA · 10 (BUG-005 — a prévia do perfil mostra a Home publicada) · lote de um · aprovada pelo orquestrador (autorização delegada do humano) |
| validation 3 | 2026-11-14 | PASS · depois da fix task 10 (BUG-005) · testes core 6104/256 · store 7638/409 · backoffice 5440/308 · mobile-adm 2734/176 · functions 1705/49, exit 0 (backoffice remedido: 1ª volta com 1 caso intermitente em arquivo não tocado) · tipos 0·7·0·core 11 e lint 25/7 iguais à baseline · build verde · BUG-005 segue open até o reteste |
