# QA Retest Report — 2026-10-31 — pedido montado pelo painel (feature 89), reteste

- **Scope:** reteste em navegador dos cinco bugs consertados pelas tasks T30..T34 da feature `89` (`.specs/features/89-pedido-montado-pelo-painel/tasks.md`, *Conserto do QA*). Relatório de origem: `2026-10-31-pedido-montado.md`. Ficam fora os dois bugs que esperam decisão (`BUG-20261031-ponto-final-depois-do-link-no-whatsapp`, `BUG-20261031-frete-antigo-depois-que-a-adri-atualiza`), que seguem `open`.
- **Cadence tier:** targeted (retest)
- **Build:** working tree sem commit sobre `e5fd174c`. Nenhum código de produto foi alterado nesta rodada.
- **Environment:** dev servers loja `:8082` e painel `:8083`, Supabase local `:54441`, functions por `supabase functions serve --env-file` com uma cópia do `.env` em que `RESEND_API_KEY` é inválida (nenhum e-mail saiu). `*.supabase.co` e `**/g/collect*` bloqueados por rota nos contextos do Playwright (Chromium 1228). A cotação de frete foi ao Melhor Envio de produção (só leitura) e o PIX ao Mercado Pago de teste, como no QA.
- **Ambiente, a troca temporária:** `order-proposals` e `mercado-pago` só sobem localmente com os `import type` de `packages/core/src/pricing/index.ts` e `grid.ts` trocados (o mesmo problema do QA). Os dois foram trocados durante a rodada e restaurados por cópia. SHA-256 conferidos depois: `eadce25c…` e `c726dc02…`, os mesmos de antes, e `git diff -- packages/core/src/pricing` vazio. Dev servers e `functions serve` parados no fim.
- **Started:** 2026-10-31T22:34Z · **Status:** closed

## Session Matrix & Results

| # | Bug | Persona | Viewport | Status | Notes |
|---|---|---|---|---|---|
| 1 | BUG-20261031-segundo-link-da-mesma-cliente-paga-o-pedido-anterior (High) | Cliente com conta pelo link | 390×844 | Pass | verified, nas duas abas: a nova e a original do QA |
| 2 | BUG-20261031-link-novo-na-mesma-aba-mostra-o-antigo (Medium) | Cliente de luto pelo link | 390×844 | Pass | verified |
| 3 | BUG-20261031-variacoes-da-peca-sao-cem-paradas-de-tab (Medium) | Adri montando uma venda | 1440, só teclado | Pass | verified; achado novo de foco em "Trocar variação" (Low, open) |
| 4 | BUG-20261031-sem-telefone-rola-de-lado-com-fonte-200 (Low) | Adri montando uma venda | 390, fonte 100/130/200 % | Pass | verified |
| 5 | BUG-20261031-foco-cai-no-body-ao-renovar-ou-cancelar-proposta (Low) | Adri montando uma venda | 1440, só teclado | Pass | verified (renovar e cancelar) |

Status legend: `Pending | Pass | Fixed | Skipped | Blocked (needs human verify) | Blocked (human decision)`

## Session Debriefs

### 1 — o segundo link da mesma cliente (High)

- **Steps:** contexto anônimo novo, 390×844. No painel, criei P-0010 para uma cliente nova, "Helena Reteste QA" (`helena.reteste.qa89@exemplo.invalid`), com "Anel Afetivo Aliança com Coto Umbilical" (`Prata 925 · Não · 14`). Na loja, Helena concluiu P-0010: WhatsApp, CEP 90010-000, número 500, SEDEX, PIX e CPF de teste. Resultado: `/pedido/bf9d…/pagamento` com o pedido **#0268** de **R$ 722,08**. No painel, criei P-0011 para a mesma ficha ("Anel Afetivo Coração com Cabelo", aço natural). Na **mesma aba**, saindo da tela de PIX, a cliente abriu o link de P-0011.
- **Observed:** antes de abrir, o rascunho guardava `orderId` = #0268, `scope` = P-0010 e o `clientRequestId` da 1ª compra. Ao abrir P-0011, `orderId` ficou nulo, `scope` passou a ser o id de P-0011 e `clientRequestId` nulo. "Pagar R$ 191,82 com PIX" chamou `create-order` com o `proposal_token` e um `client_request_id` **novo**, depois `get-order` e `create-payment` do pedido novo. A tela mostrou "PEDIDO #0269 · AGUARDANDO PAGAMENTO". Banco: P-0010 `completed` → #0268, R$ 722,08; P-0011 `completed` → #0269, R$ 191,82.
- **A aba original do QA:** a aba da Marta (contexto `cliente1`), com P-0008 aberta e a sessão da conclusão de #0264. Depois de recarregada, "Pagar R$ 191,82 com PIX" criou o pedido **#0270** (R$ 191,82), com `create-order`, `get-order` e `create-payment`. P-0008 ficou `completed` → #0270.
- **Canário (o F5 da mesma proposta):** em P-0012, alterei o número para 777 e recarreguei. O número continua 777 na tela e no rascunho, com `scope` igual e `orderId` nulo.
- **Evidence:** `evidence/2026-10-31-pedido-montado/r1-segundo-link-pix-do-pedido-novo.png`.

### 2 — o link novo na mesma aba (Medium)

- **Steps:** contexto anônimo, 390×844. Abri `/pedido-montado#<token inventado>` e depois, na mesma aba e sem recarregar, `/pedido-montado#<token de P-0010>`. Essa troca é só de fragmento, o mesmo que colar o link na barra.
- **Observed:** o primeiro mostrou "Este link não está mais disponível. Fale comigo pelo WhatsApp que eu mando um novo." O segundo mostrou o pedido (peça, Resumo e Contato) sem F5. A barra ficou `/pedido-montado`, sem o fragmento, e `sessionStorage['estrelinha-proposal-token']` passou a ser o token novo. Rede: `get-proposal` 404 para o inventado e 200 para o novo. Também confirmei o caminho inverso: com P-0012 cancelada no painel e o link aberto na loja, "Pagar" levou a "não está mais disponível".
- **Evidence:** `evidence/2026-10-31-pedido-montado/r2-antes-link-invalido.png`, `r2-link-novo-mesma-aba.png`.
- **Not repeated:** o roteiro exato de renovar com o link antigo aberto e então abrir o novo. O mecanismo é o mesmo (link sem efeito → link válido por troca de fragmento), e a renovação foi exercida na sessão 5.

### 3 — as variações pelo teclado (Medium)

- **Steps:** 1440, só teclado, `/admin/pedidos/montar`. Foco em "Acrescentar peça", digitei "Aliança com Coto", Tab, Enter. Entrou a mesma peça do QA, com 108 variações.
- **Observed:**
  - `[role=radio]` = 108, num `radiogroup`, e só uma com `tabIndex 0` (a 1ª, sem escolha). A partir do botão da peça, um Tab entra no grupo e o Tab seguinte já sai para o campo seguinte: **uma parada**.
  - As setas moveram 0→1→2→1 (Down, Down, Up) e Right/Left fizeram o mesmo. End foi à 108ª. ArrowDown na última voltou à 1ª, ArrowUp na 1ª foi à última e Home voltou à 1ª. Nenhuma seta escolheu: 0 marcadas, como a T32 declara (*SPEC_DEVIATION* do padrão de grupo de rádio).
  - Enter na 6ª escolheu "Prata 925 · Não · 14". A lista recolheu, o foco ficou na escolhida e "Trocar variação (108 opções)" apareceu. Reaberta, a parada de Tab estava na escolhida.
- **New finding (Low):** acionar "Trocar variação" com Enter deixa o foco no `<body>`, porque o botão some e a lista abre ⇒ `BUG-20261031-trocar-variacao-solta-o-foco`. A observação secundária do bug original (depois de acrescentar a peça, o foco fica no botão da lista de resultados) continua, como a T32 declara.
- **Evidence:** `evidence/2026-10-31-pedido-montado/r3-variacao-escolhida-teclado.png`.

### 4 — "Sem telefone — copie o link" a 390/200 % (Low)

- **Steps:** P-0010 (cliente sem telefone), `/admin/pedidos/montados/:id` a 390×844, com `html { font-size }` a 100, 130 e 200 %.
- **Observed:** `scrollWidth` foi 390 nos três tamanhos, sem nenhum elemento além da borda. O botão tem `white-space: normal` e mede 216×44 (100 %), 263×75 (130 %) e 196×194 (200 %); a 200 % o texto quebra em quatro linhas. Antes, eram 526 px a 200 %.
- **Observação, fora do bug:** a 200 %, a marca "Uma Estrelinha Admin" do topo do painel quebra em três linhas e passa por cima do conteúdo logo abaixo. É o cabeçalho do painel, anterior à 89, e não causa rolagem lateral.
- **Evidence:** `evidence/2026-10-31-pedido-montado/r4-sem-telefone-390-200.png`.

### 5 — foco e anúncio ao renovar ou cancelar (Low)

- **Steps:** 1440, só teclado. Em P-0010, foco em "Renovar o prazo", Enter e confirmação ("Renovar gera um link novo. O link antigo para de funcionar na hora."). Em P-0012, foco em "Cancelar proposta", Enter e confirmação.
- **Observed:**
  - Renovar: o foco foi para o parágrafo do link novo (`tabIndex -1`, à vista, com contorno), e a região `aria-live="polite"` disse "Link novo gerado. O link antigo parou de funcionar." O link mudou.
  - Cancelar: o foco foi para o `h1` "Pedido montado P-0012", a região viva disse "Proposta cancelada." e o selo virou "Cancelada".
- **Not tested:** o ramo de falha (o foco voltando ao botão) e um leitor de tela real. Os diálogos continuam `window.confirm` nativos, um incômodo já registrado.
- **Evidence:** `evidence/2026-10-31-pedido-montado/r5-renovado-foco.png`, `r5-cancelado-foco.png`.

## Findings

| Bug | Impact | Status |
|---|---|---|
| BUG-20261031-segundo-link-da-mesma-cliente-paga-o-pedido-anterior | Blocks-Completion · High | verified |
| BUG-20261031-link-novo-na-mesma-aba-mostra-o-antigo | Trust-Damage · Medium | verified |
| BUG-20261031-variacoes-da-peca-sao-cem-paradas-de-tab | Friction · Medium | verified |
| BUG-20261031-sem-telefone-rola-de-lado-com-fonte-200 | Friction · Low | verified |
| BUG-20261031-foco-cai-no-body-ao-renovar-ou-cancelar-proposta | Friction · Low | verified |
| **BUG-20261031-trocar-variacao-solta-o-foco** (novo) | Friction · Low | open |
| BUG-20261031-ponto-final-depois-do-link-no-whatsapp | Medium | open — espera decisão, fora deste reteste |
| BUG-20261031-frete-antigo-depois-que-a-adri-atualiza | Medium | open — espera decisão, fora deste reteste |

Nada foi consertado nesta rodada, por instrução.

## Decisions for a Human

- As duas decisões do QA continuam abertas, sem mudança: o ponto colado no link do WhatsApp e o frete antigo depois de "A Adri atualizou seu pedido". As opções e a recomendação estão em `2026-10-31-pedido-montado.md`.
- O novo bug Low (o foco em "Trocar variação") é conserto pequeno, do mesmo dono `shared/lib/foco.ts`. Não é decisão, mas fica para quem implementa.

## Data left in the local database

- Propostas P-0010 (`completed` → #0268), P-0011 (`completed` → #0269) e P-0012 (`cancelled`), da cliente `helena.reteste.qa89@exemplo.invalid`, cuja ficha ganhou o endereço "Casa · Padrão".
- P-0008, do QA, passou a `completed` → #0270.
- Os pedidos #0268, #0269 e #0270 estão em PIX `pending`, criados no Mercado Pago de teste.

## Exit gate — suítes completas, depois de restaurar o código

Rodadas uma por vez, com o exit code lido fora de pipe:

- store `--testTimeout=20000`: **6479 passed / 347 files**, exit 0
- backoffice `--testTimeout=20000`: **4896 passed / 268 files**, exit 0
- core: **5129 passed / 202 files**, exit 0
- functions: **1413 passed / 38 files**, exit 0

Store e backoffice batem com o fecho das tasks T30..T34 (6479/347, 4896/268). Core e functions são os mesmos números do fim do QA.

## Final Status

**Os cinco bugs consertados estão verified em navegador.** O High (o segundo link pagando o pedido anterior) passou nos dois caminhos: numa aba nova e na aba original do QA, que trazia a sessão gravada pelo código de antes. Sobra um bug novo, Low (foco em "Trocar variação"). Continuam abertos os dois Medium que esperam decisão humana (o ponto no link do WhatsApp e o frete antigo depois da atualização).

Totais em aberto na feature 89: **High 0 · Medium 2 (decisão) · Low 1**. A suíte está verde nos quatro workspaces. **Pronta, com ressalvas:** as duas decisões de produto antes do deploy. Ainda falta testar o cartão, o WhatsApp e o Android reais e o `noindex` servido pela `api/page`, como no QA.

## Adendo — 2026-11-01: as duas decisões, consertadas e retestadas; "Trocar variação" retestado

As duas decisões da seção "Decisions for a Human" do QA foram **confirmadas pelo usuário em 2026-10-31** e implementadas: o ponto depois do link, opção (c) — as duas; o frete depois de "A Adri atualizou", opção (a) — a entrega volta a "não escolhida". Detalhe de cada conserto (arquivos, testes vermelhos antes, mutantes) nos arquivos dos bugs.

- **Environment:** dev servers loja `:8082` e painel `:8083`, Supabase local `:54441`, `supabase functions serve --env-file` com `RESEND_API_KEY` inválida (nenhum e-mail saiu). `*.supabase.co`, `*.google-analytics.com`, `*.googletagmanager.com` e `**/g/collect*` bloqueados por rota; `**/functions/v1/mercado-pago**` também bloqueado (nenhum PIX criado no Mercado Pago). `navigator.webdriver` neutralizado. Chromium 1228. A cotação foi ao Melhor Envio de produção (só leitura), como no QA.
- **A troca temporária do ambiente:** os `import type` de `packages/core/src/pricing/index.ts` e `grid.ts` trocados por aliases locais para a `order-proposals` subir, e restaurados por cópia ao fim — SHA-256 `eadce25c…` e `c726dc02…` conferidos (`shasum -c`), `git diff -- packages/core/src/pricing` vazio. Dev servers e `functions serve` parados no fim (só os processos desta rodada).
- **A proposta** foi criada e editada pela `order-proposals?action=save` local (a mesma porta que o botão Salvar do painel chama), com o admin do `seed.sql`.

| # | Bug | Persona | Viewport | Status | Notes |
|---|---|---|---|---|---|
| 6 | BUG-20261031-ponto-final-depois-do-link-no-whatsapp (Medium) | Cliente de luto pelo link | 390×844 | Pass | verified; o WhatsApp real segue não medido |
| 7 | BUG-20261031-frete-antigo-depois-que-a-adri-atualiza (Medium) | Cliente de luto pelo link | 390×844 | Pass | verified, até o pedido gravado |
| 8 | BUG-20261031-trocar-variacao-solta-o-foco (Low) | Adri montando uma venda | 1440, só teclado | Pass | verified |

### 6 — o link com o ponto final colado

- **Steps:** P-0013 criada (cliente "Rosa Prova Bugs", `rosa.prova.bugs89@exemplo.invalid`, "Anel Afetivo Coração com Cabelo" ×1, R$ 189,90). Aberto `/pedido-montado#<token>.` — com o ponto.
- **Observed:** "Seu pedido" com a peça e o Resumo; nenhum "não está mais disponível". O `get-proposal` levou `{"token":"<token>"}` **sem** o ponto; `sessionStorage['estrelinha-proposal-token']` é o token limpo; a barra ficou `/pedido-montado`, sem fragmento; `scrollWidth` 390.
- **A mensagem:** o texto do "Enviar pelo WhatsApp" agora põe o link sozinho numa linha (provado pela página real do painel em `AdminProposalPage.test.tsx`, não em navegador).
- **Evidence:** `evidence/2026-10-31-pedido-montado/a1-link-com-ponto-abre.png`.

### 7 — o frete depois de "A Adri atualizou"

- **Steps:** na mesma aba, CEP 01310-100 semeado, PAC escolhido a R$ 25,75 (Resumo "Frete · Correios PAC", "Pagar R$ 202,36 com PIX"). A proposta editada para quantidade 2 (versão 2). "Pagar".
- **Observed:** "A Adri atualizou seu pedido. Confira de novo antes de concluir."; o rascunho com `shipping` nulo; o Resumo com "Frete a calcular"; nenhum "Frete · Correios" na tela e nenhuma opção marcada; o bloco Entrega aberto com PAC **R$ 27,65** e SEDEX R$ 41,34 (a cotação do pacote novo); "Pagar R$ 353,21 com PIX" desabilitado; `scrollWidth` 390. Escolhido o PAC de novo: "Pagar R$ 380,86 com PIX" ⇒ `/pedido/<id>/pagamento`. Os dois `create-order`: `{v:1, frete:25.75}` (409) e `{v:2, frete:27.65}`. Banco: pedido **#0280**, `shipping_cost 27.65`, `total 380.86`; P-0013 `completed`.
- **Evidence:** `a2-pac-escolhido.png`, `a3-entrega-desfeita.png`, `a4-pac-recotado.png`.

### 8 — "Trocar variação" pelo teclado

- **Steps:** 1440, só teclado, `/admin/pedidos/montar`: "Aliança com Coto", Tab, Enter ⇒ 108 variações; setas até a 6ª, Enter; foco em "Trocar variação (108 opções)", Enter.
- **Observed:** 400 ms depois do Enter, `document.activeElement` é a variação escolhida (`role=radio`, `aria-checked=true`, `tabindex=0`, "Prata 925 · Não · 14") — antes era `BODY`. O botão saiu, a lista tem 108 opções, e o Tab seguinte sai do grupo para o campo seguinte.
- **Evidence:** `a5-trocar-variacao-foco.png`.

### Data left in the local database

- P-0013 (`completed` → #0280, `shipping_cost 27.65`), a ficha e a conta de convidada `rosa.prova.bugs89@exemplo.invalid`. #0280 em PIX `pending`, sem cobrança criada (o `mercado-pago` estava bloqueado).

### Exit gate — suítes completas, depois de restaurar o código

Uma por vez, `--testTimeout=20000`, exit lido fora de pipe: **functions 1417/38 · core 5130/202 (+1) · backoffice 4897/268 · store 6501/347 (+21)**, os quatro exit 0. `tsc` store 0, backoffice 0, core 11 (herdados). ESLint store 2/2, backoffice 23/5.

### Final Status (adendo)

**Os três estão verified em navegador.** Totais em aberto na feature 89: **High 0 · Medium 0 · Low 0**. Falta, como antes: o cartão, o WhatsApp de Android e iOS e o Android reais, e o `noindex` servido pela `api/page`.
