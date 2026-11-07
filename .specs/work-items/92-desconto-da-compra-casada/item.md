---
id: 92
titulo: Desconto da compra casada (Compre Junto)
tipo: feature
entrada: descoberta
fase: done
criado: 2026-11-02
---
## Descrição
Vamos planejar a próxima feature da loja, o Compre Junto. Esse Compre Junto servirá para oferecer aos clientes na tela do produto outras produtos para tentar fechar compras
  casadas na loja e dessa forma aumentar o ticket médio. A ideia é montar um compre junto parecido com o que já existe em outras lojas referencia no mercado. Porém aqui eu quero
  poder por exemplo.. Em um Pingente afetivo, conseguir da a opção de adicionar corrente em um dos produtos adicionais, e nesse corrente eu poder selecionar alguns produtos
  modelos de corrente por exemplo, para que o usuário consiga escolher qual das correntes ele quer.. Mesmo exemplo para adicionar pingente adicionais, onde pode selecionar um
  lisga de pringentes como adicional. Esse compre junto deve ser dinamico, possibilitar adicionar até 3 produtos adicionais ao produto Principal no compre junto, em um produto,
  dar a a opção adicionar uma lista de produtos referencia (exemplo da corrente) e suas variantes, possibilidade de ordenar esse produtos na lista. Opção de adicionar apenas 1
  produtos e suas váriantes. Possibilidade de descontos na compra casada. E pensar em outras lógicas especificas e funcionalidade que possam ser um  diferencial para o nosso
  compre junto. Quero organizar o planejamento dessa feature, e criar no Claude design Projeto "Uma Estrelinha - Backoffice" a parte admnistrativa e no Projeto Criar um novo
  Projeto para Loja, para desenhar a funcionalidade do usuário. Verificar se para o formato Spec é melhor separar em 1 ou 2 features esssa implementação.

Recorte deste Work Item (gate da descoberta do WI 91, 2026-11-02, Q-01): só o **desconto da compra casada** — o Compre Junto sem desconto é o WI 91, e este depende dele.
Já decidido no mesmo gate: Q-04 percentual por adicional, sobre o preço da peça adicional quando o principal está no mesmo pedido; Q-05 seguir `AD-015` (concorre por item com order bump e promoção — vence o menor preço —, com o cupom pelo menor total, e o PIX incide depois); Q-06 vale pela presença do principal e do adicional no mesmo pedido, decidida pelo servidor.

## Insumos
- `.specs/work-items/91-compre-junto/discovery.md` (diagnóstico do código de dinheiro: `pricing.ts`, `mercado-pago/handlers.ts`, `useCheckoutTotals`, `useCartPromotion`)
- `.specs/work-items/91-compre-junto/prd.md` › Fora (as decisões Q-04..Q-06)
- Claude Design: o desenho do WI 91, com o campo de desconto marcado "WI 92"
- Claude Design, projeto "Uma Estrelinha - Backoffice" (`e3957c10-bd49-4f3d-9256-04d72a7d0f41`): https://claude.ai/design/p/e3957c10-bd49-4f3d-9256-04d72a7d0f41?file=Produto+-+Compre+Junto.html (a aba Compre junto do produto — informado pelo usuário em 2026-11-03)
- Claude Design, projeto "Uma Estrelinha - Loja" (`69224d8a-17ae-4b1f-a251-a8105b41edc2`): https://claude.ai/design/p/69224d8a-17ae-4b1f-a251-a8105b41edc2?file=Produto+-+Compre+Junto.html — o usuário pediu, em 2026-11-03, para conferir o protótipo e acrescentar nele a UI do desconto na loja
- Claude Design, projeto "Uma Estrelinha - Loja": https://claude.ai/design/p/69224d8a-17ae-4b1f-a251-a8105b41edc2?file=Produto+-+Compre+Junto+com+desconto.html (o bloco e a sacola com o desconto) e https://claude.ai/design/p/69224d8a-17ae-4b1f-a251-a8105b41edc2?file=Pedido+-+Desconto+do+Compre+Junto.html (checkout, o valor mudou, confirmação, e-mail — desenhados depois do handoff, H-01)

## Gates
| gate | quando | resultado |
| ---- | ------ | --------- |
| descoberta | 2026-11-03 | ratificado · 6 premissas (0 recusadas) · 11 perguntas → `prd.md` · Q-03 acumula com o cupom (substitui parte da Q-05 do WI 91) · Q-02 revisa a RNF-04 do WI-01 · C-01 entra no escopo · Q-07 (montagem pelo painel) e diferenciais (a)(b)(e) → Fora |
| prd-review r1 | 2026-11-03 | changes_requested_blocking · 12 aplicados ao `prd.md` (10 ratificados pelas sugestões a pedido do usuário, F4 e F7 respondidos na página) · 5 tech em Decisões (`prd-review.md`) · 0 abertos · F18 sem item |
| handoff | 2026-11-03 | pass · 3 itens de negócio na página (os técnicos ratificados pela recomendação, preferência do usuário) → `spec.md` Decisões · H-01 desenhar antes as telas da loja (feito no Claude Design) · H-02 desconto concedido = cheio − pago · H-03 um rótulo só, sem as duas frases · 0 abertos |
| fila | 2026-11-03 | aprovada (Têmis, pela política do humano, após 4 correções na G4) · tarefas 01–08 · ONDAS: 01 \| 02,03 \| 04 \| 05,08 \| 06,07 · auditoria: a fila serve com correção · 2 corrigidos (citações mortas em 01 e 06) · 0 ao humano · execução autorizada junto da aprovação |
| validation 1 | 2026-11-03 | PASS · 21296 testes, 0 falhas (core 5374/219, store 6976/371, backoffice 5115/282, mobile-adm 2371/149, functions 1460/40) · tipos store/server/mobile-adm 0, core 11 herdados, backoffice 7 anteriores ao WI (`ProposalStateBadge.test.tsx`, commit base `4c6e9a16`) · lint na baseline 25/7 · build verde (env local) · 38/38 critérios · probe `03-cobranca-no-runtime` executado aqui: 4 ok · complemento `4f563e5d` (AD-073 e o probe `02-lista`, fora dos commits das tarefas) · layout em navegador fica para a QA |
| QA · Gate 1 — plano | 2026-11-04 | aprovado (Têmis, decisão delegada pela política do humano, com o ajuste da régua da Q-01 à D-38: só a ordem, sem o de/por por unidade) · `qa/test-plans/desconto-compre-junto-test-plan.md` · personas 5 · jornadas 6 · charters 9 (7 exploratórios + CFR + design-check) · TC 60 (P0 24 · P1 31 · P2 5) · critérios 37/38 (RNF-07 sem TC: condição de ambiente, provada pela Validation) · 🔴 Q-01 → C (a ordem do painel vale; loja e app seguem), Q-02 → B (a faixa da lista é exigida) — D-38/D-39 · e2e 41 missing |
| qa-plan | 2026-11-03 | plano em `qa/` (60 TC) · Q-01 → C: a ordem do resumo do painel vale, loja e app que divergem são bug (D-38) · Q-02 → B: a faixa das peças da lista é exigida, a grade é bug (D-39) · 0 abertos |
| QA · Gate 3 — veredito | 2026-11-04 | confirmado (humano: "Siga") · rodada 1 (exploração) · veredito fail · TC pass 38 · fail 14 · blocked 4 · skip 1 · critérios 32/38 · bugs novos 13 (critical 1 · high 8 · medium 1 · low 3: BUG-001..013, `open`) · transições 0 · CH-09 not-run (Claude Design sem `/design-login`) · 1 pergunta ao produto (P-01, página) · 22 sugestões de backlog · `qa/qa-result.md` |
| QA · perguntas ao produto | 2026-11-04 | página · 2 itens (P-01 e P-01-destino), 2 respondidos · P-01 → só a unidade com desconto conta (corrigir a Adesão) · destino WI novo · `qa/decisoes-produto.md` |
| fix tasks | 2026-11-07 | rodada 1 da QA · 13 bugs em 10 fix tasks (09–18), lotes da QA confirmados no código · aprovação e "pode executar" delegados ao orquestrador · ONDAS: 09,10,11,14 \| 12,13,17,18 \| 15,16 (`waves-fix.md`) |
| validation 2 | 2026-11-07 | PASS · fix tasks 09–18 (rodada 1 da QA) · store 6997/373, backoffice 5117/282, mobile-adm 2375/149, functions 1461/40, exit 0 · tipos 0 (backoffice 7 alheios, os mesmos) · lint 25/7 · build verde · migration `20261107170000` só no local (aplicada por psql, sem registro em `schema_migrations`) · bugs seguem `open` até o reteste da QA |
| QA · Gate 3 — veredito | 2026-11-07 | confirmado (Têmis, decisão delegada pela política do humano, G12) · rodada 2 (confirmação) · veredito fail · TC acumulado pass 53 · fail 1 · blocked 2 · skip 1 (rodada 2: 15 · 1 · 2 · 0) · critérios 32/38 · bugs novos 1 (high: BUG-014, `open`) · transições: resolved 12 (BUG-001..005, 007..013) · still-open 1 (BUG-006) · CH-04 fora (todos pass na r1) · CH-09 rodado pelo MCP do Claude Design · 0 perguntas ao produto · 9 sugestões de backlog · `qa/qa-result.md` (r1 em `qa/qa-result-2026-11-04.md`) |
| QA · Gate 3 — veredito | 2026-11-07 | confirmado (Têmis, decisão delegada pela política do humano, G15) · rodada 3 (confirmação) · veredito partial · TC acumulado pass 55 · fail 0 · blocked 1 (TC-UI-005) · skip 1 (rodada 3: pass 2 · blocked 1) · critérios 33/38 · bugs novos 0 · transições: resolved 2 (BUG-006, BUG-014) · CH-09 not-run (Claude Design sem `/design-login`) · 0 perguntas ao produto · 1 sugestão de backlog · `qa/qa-result.md` (r2 em `qa/qa-result-2026-11-07.md`) |
| fix tasks | 2026-11-07 | rodada 2 da QA · 2 bugs em 2 fix tasks (19 BUG-014, 20 BUG-006 — reteste reprovado da 14), lotes L1/L2 da QA confirmados no código · aprovação e "pode executar" delegados ao orquestrador · ONDAS: 19,20 (`waves-fix.md`) |
| validation 3 | 2026-11-07 | PASS · fix tasks 19–20 (rodada 2 da QA) · functions 1462/40, backoffice 5118/282, store 6997/373, exit 0 · tipos store 0, backoffice 7 alheios (os mesmos) · lint 25/7 · build verde · sem migration nova · bugs seguem abertos até o reteste da QA |
