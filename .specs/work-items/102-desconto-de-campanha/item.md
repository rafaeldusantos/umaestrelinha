---
id: 102
titulo: Campanhas de desconto — cadastro no painel, percentual por produto, a vitrine e o selo da campanha
tipo: feature
entrada: prd
fase: done
criado: 2026-11-13
---
## Descrição
Pedido de 2026-11-13:

"e também descontos que vamos dar em produtos de 10, 20 e 30%.." — e, na mesma sessão, a regra:

"Sobre a 102, descontos de camapanha.. Vamos adicionar por produto nos cadastro a opção de selecionar 10, 15 e 20%.. se o produto estiver setado com esse desconto entra automaticamente na categoria BrackFriday e mostra uma badge de BlackFriday na Loja (Desenhar esse Badge no Claude Design)"

"Gostei da opçào B, porem com a aplicação do backgroung dourado no valor percentual igual a opção A. E precisamos prever como fica o selo nos produtos que mostram as variantes no card" — feito no protótipo `Black Friday - Selo v2.html`.

Decisão sobre a campanha (2026-11-13), que tornou o item dinâmico em vez de "Black Friday" fixo:

"no backoffice na sessão Desconto vamos criar um menu CAMPANHAS - Ativar Campanha - Essa opçao deve ter nome da campanha (Black Friday no nosso caso), data de vigencia, cadastro de percentuais (nosso caso 10, 15 e 20). Esse cadastro ativa os percentuais para serem selecionados no cadastro do Produto. Dessa forma deixamos a ativaçào de campanhas dinamico ao invés de BackFriday fixo. Talvez precisaremos rever o PRD para faer alguns ajustes para cumprir essa funcionalidade.. incluindo os selos que aparecem na Loja"

## Insumos
- PRD: `prd.md` (escrito nesta sessão; revisto em 2026-11-13 para a campanha dinâmica)
- Protótipo: Claude Design, projeto "Uma Estrelinha - Black Friday" (`4abe021d-d77e-4fe7-affd-524180315fa3`):
  - **`Black Friday - Selo v2.html`** — o selo escolhido (faixa no pé da foto, percentual em bloco dourado), no cartão de 173 e 220 px, com e sem miniaturas de cor, na página do produto, na sacola e no topo da vitrine — https://claude.ai/design/p/4abe021d-d77e-4fe7-affd-524180315fa3?file=Black+Friday+-+Selo+v2.html (`SeloFaixa`, `SeloLinha`, `Cores`, `Cartao` em `bf-loja.jsx`; `bf-selo-v2.css`). Nesta página o texto e as cores do selo estão fixos (preto e ouro); o selo com o texto e as cores da campanha está na vitrine, abaixo.
  - **`Black Friday - Vitrine ofertas.html`** — a vitrine `/ofertas` (UC-06) no computador e no celular 390, com a troca de campanha (Black Friday, Dia das Mães, nenhuma): título, percentuais, data, chips de filtro com contagem, selo com o texto e as cores da campanha (RN-11, RN-12) e o estado "Não há ofertas agora" — https://claude.ai/design/p/4abe021d-d77e-4fe7-affd-524180315fa3?file=Black+Friday+-+Vitrine+ofertas.html (`bf-vitrine.jsx`, `bf-vitrine.css`)
  - **`Painel - Campanhas, faixa e perfil.html`** — as telas do painel (casco do Backoffice): **Campanhas · lista** (UC-01), **Campanha · editar** e **Campanha · nova** (UC-01, UC-02: identificação com o texto do selo, vigência, percentuais com contagem de uso, cores do selo com a medida de contraste e combinações prontas, interruptor, prévia do selo; cenários de recusa: cores sem contraste, tirar % em uso, vigência cruzando) e **Produto · campo da campanha** (UC-03, em vigência e agendada) — https://claude.ai/design/p/4abe021d-d77e-4fe7-affd-524180315fa3?file=Painel+-+Campanhas%2C+faixa+e+perfil.html (a tela e o cenário se escolhem no painel do protótipo; `adm-campanhas.jsx`, `adm-bf-base.jsx`, `adm-bf.css`)
  - `Black Friday - Selo.html` — as três opções comparadas (A, B, C)
  - `Black Friday - Home.html` — o bloco "Joias em oferta" com os cartões 10/15/20% e as peças com o selo
  - O Claude Design avulso sai do ar até 2026-12-14.
- O menu do painel: `apps/backoffice/src/widgets/admin-layout/model/navItems.ts` (grupo "Descontos": Cupons, Promoções)
- O cartão de hoje: `apps/store/src/entities/product/ui/ProductCard.tsx` (`CardBadge`, `hasDiscount`), `ColorPreview.tsx` (miniaturas a 14 px do canto, 40/45 px)
- O preço no servidor: `supabase/functions/mercado-pago/handlers.ts` (reprecifica pelo banco, ~linha 578), `supabase/functions/checkout/handlers.ts` (`unit_price`, `full_unit_price`)
- A regra de preço: `packages/core/src/payment/pricing.ts` (`resolveOrderPricing`); o "de/por" do feed: `packages/core/src/shopping/pricing.ts` (`offerPricing`)
- A promoção progressiva de hoje (outra coisa, por quantidade, com `valid_from`/`valid_until`): `packages/supabase/src/types/promotion.ts`
- O fuso da loja: `packages/core/src/time/zone.ts` (`STORE_TIME_ZONE`)
- Edição em massa no painel: `apps/backoffice/src/features/bulk-edit`

## Gates
| gate | quando | resultado |
| ---- | ------ | --------- |
| decisões do PRD (chat) | 2026-11-13 | D-01 vitrine em `/ofertas` · D-02 cores do selo por campanha · D-03 cupom não vale em peça de campanha · D-04 bloco da Home entra · D-05 vale o preço gravado no pedido · 1 pergunta aberta (promoção progressiva e Compre Junto) · 3 premissas de RN-16 a confirmar no review |
| decisões do PRD (chat) r2 | 2026-11-13 | pela recomendação: D-06 PIX, cupom de frete grátis e valor mínimo · D-07 promoção progressiva e Compre Junto fora das peças de campanha · 0 perguntas abertas |
| prd-review r1 | 2026-11-13 | changes_requested_gaps · 12 aplicados ao `prd.md` · 14 em Decisões · 0 abertos · inline a pedido · pela recomendação |
| handoff | 2026-11-13 | pass · 12 itens (H-01..H-12) → `spec.md` Decisões · 0 travados · inline a pedido · pela recomendação |
| fila | 2026-11-13 | aprovada · tarefas 01–09 · 4 ondas · auditoria: a fila serve com correção — 3 achados corrigidos (order_list vigente, caminho de lerComPapel, âncora do denoReach de seo) + selo do painel na posse da 01 |
| validation 1 | 2026-11-13 | PASS · testes sem reprovação por asserção (store 7374/7374, backoffice 5354/5355 com o lote de 60 por timeout de 45 s e 48/48 isolado, core, functions e mobile-adm verdes) · tipos e lint sem regressão (0·0·0, backoffice 7 e core 11 herdados; lint 2/2 · 23/5 · 0/0) · build PASS com as variáveis do local · probe 05 com 0 falhas depois da correção do script · 17/17 critérios, CA-11 e CA-15 pela forma (layout com a QA) |
| QA · Gate 1 — plano | 2026-11-13 | aprovado (delegado ao árbitro, com as duas recomendações) · 4 personas · 6 jornadas · 8 charters em 7 lotes (CH-02 sozinho no L2) · 33 TC (P0 9 · P1 21 · P2 3) · 25/25 critérios cobertos · Q-01 (A): o Desfazer da edição em massa devolve as marcações de campanha · "Ver todas" da Home esperado também no celular |
| QA · Gate 3 — veredito | 2026-11-13 | confirmado (delegado ao árbitro) · rodada 1 (exploração) · fail · TC pass 16 · fail 7 · skip 10 · critérios 15/25 · bugs novos 6 (critical 1 · high 3 · medium 2): BUG-001…BUG-006 · sem transições · CH-07 not-run (Claude Design sem escopo: precisa de `/design-login`) · pergunta ao produto P-01 pela página |
| QA · perguntas ao produto | 2026-11-13 | 1 item, 1 respondido · inline por delegação do humano (decidido pela recomendação do QA) · P-01: basta como está; a mensagem explicativa vai a WI novo · `qa/decisoes-produto.md` |
| QA · Gate 3 — veredito (rodada 2) | 2026-11-13 | confirmado (delegado ao árbitro) · rodada 2 (confirmação) · fail · TC pass 26 · fail 3 · skip 4 · critérios 22/25 (0 missing) · bugs novos 3 (high): BUG-007, BUG-008, BUG-009 · transições: BUG-001, 003, 004, 005, 006 → resolved; BUG-002 → still-open · CH-07 not-run (precisa de `/design-login`) · sem pergunta ao produto |
| QA · Gate 3 — veredito (rodada 3) | 2026-11-13 | confirmado (humano, pela recomendação) · rodada 3 (confirmação) · partial · TC pass 29 · fail 2 · skip 2 · critérios 24/25 · bugs novos 0 · transições: BUG-002 still-open → resolved (o pedido no painel com R$ 349,90 riscado vai a backlog), BUG-007, BUG-008, BUG-009 open → resolved · TC-FUNC-020 e TC-UI-004 fail sem bug (backlog) · CH-07 not-run (precisa de `/design-login`) · sem pergunta ao produto |
| fix tasks | 2026-11-13 | 6 fix tasks da QA rodada 1 (10–15), um bug por lote como o QA sugeriu: 10 BUG-001 · 11 BUG-002 · 12 BUG-003 · 13 BUG-004 · 14 BUG-005 · 15 BUG-006 · aprovadas sob a autorização do orquestrador · ondas em `waves-fix.md` (10,11,13,14 → 12,15) |
| validation 2 | 2026-11-13 | PASS · Re-Validation das fix tasks 10–15 · core 5865/5865 · functions 1703/1703 · store 7387/7387 (exit 1 pelo timeout do worker, contenção) · backoffice 5356/5357 (`AdminCampaignFormPage` por contenção, 20/20 isolado ×2) · build PASS · tipos 0·0·0, backoffice 7 e core 11 herdados · lint 2/2 · 23/5 · BUG-001…006 aguardando reteste da QA |
| fix tasks (rodada 2) | 2026-11-13 | 4 fix tasks da QA rodada 2 (16–19), um bug por lote como o QA sugeriu: 16 BUG-008 · 17 BUG-002 (nova sobre a 11 `done`, reteste reprovou o "De" do pedido) · 18 BUG-009 (confere antes na `master` se é anterior ao WI — ressalva do árbitro) · 19 BUG-007 · aprovadas sob a autorização do orquestrador · ondas em `waves-fix.md` (16 → 17,19 → 18) |
| escopo BUG-009 | 2026-11-13 | inline por delegação do humano (pela recomendação): o defeito é anterior ao WI (a `master` já montava as linhas do resumo do mesmo jeito), mas a correção fica neste WI — o resumo do pedido é superfície que o WI alterou, o defeito é de exibição de dinheiro e o conserto é pequeno · T18 reescrita sem o "pare e relate", que a fazia abortar a cada retomada |
| validation 3 | 2026-11-13 | PASS · Re-Validation das fix tasks 16–19 · core 5873/5873 · functions 1705/1705 · store 7394/7394 · backoffice 5360/5360 · mobile-adm 2734/2734 (exit 0 os cinco) · build PASS · tipos 0·0·0, backoffice 7 e core 11 herdados · lint 2/2 · 23/5 · 0/0 · BUG-002, 007, 008, 009 aguardando reteste da QA |
