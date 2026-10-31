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
