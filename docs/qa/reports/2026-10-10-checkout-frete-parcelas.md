# QA Run Report — 2026-10-10 — checkout-frete-parcelas

- **Scope:** os três ajustes da sessão de 2026-10-10, ainda sem commit sobre `7934ee8`:
  (1) a cotação de frete do checkout oferece só Correios PAC e SEDEX (`melhor-envio`, filtro por id
  de serviço 1 e 2, dono em `core/shipping/services.ts`); (2) com PIX selecionado, o card "Cartão de
  crédito" anuncia as parcelas sobre o total SEM o desconto PIX — cupom e promoção continuam
  descontados — e o número não muda ao trocar de método; (3) o `InstallmentPicker` mostra todas as
  parcelas (até 10x) abertas: as sem juros com selo primeiro, as com juros com o total ao lado.
- **Cadence tier:** targeted
- **Build:** `7934ee8` + working tree (sem commit) · **Environment:** `pnpm dev:store` em
  `http://localhost:8082`, Supabase local em `:54441` (catálogo real, 680 produtos ativos),
  Melhor Envio **produção** (`MELHOR_ENVIO_ENV=production`, só cotação — nada é comprado), Mercado
  Pago com a chave pública **de produção** (`APP_USR-…`) — só leitura de parcelas pelo BIN; **nenhum
  pagamento é enviado**.
- **Started:** 2026-10-10 · **Status:** closed

## Personas

| Persona | Base | Device / Network / Locale | Sessions |
|---|---|---|---|
| Mãe enlutada no celular | cliente nova, sem conta, compra uma joia afetiva pelo celular | 390×844, rede da casa, pt-BR | CH-frete-mobile, CH-cartao-pix-mobile, CH-parcelas-mobile, CH-bordas |
| Cliente no computador | mesma compra, no notebook | 1440×900, pt-BR | CH-frete-desktop, CH-cartao-pix-desktop, CH-parcelas-desktop |

## Flows in Scope

- `J-checkout-convidada` — da página do produto ao bloco Pagamento do checkout, sem conta, até a escolha de parcelas (sem pagar).

## Session Matrix & Results

| # | Charter | Journey / Scenario | Persona | Tour | Status | Issue | Fix commit |
|---|---|---|---|---|---|---|---|
| 1 | CH-frete-mobile | J-checkout-convidada / frete só PAC e SEDEX | Mãe enlutada no celular | Money | Pass | | |
| 2 | CH-frete-desktop | J-checkout-convidada / frete só PAC e SEDEX | Cliente no computador | Money | Pass | | |
| 3 | CH-cartao-pix-mobile | J-checkout-convidada / card do cartão sem desconto PIX | Mãe enlutada no celular | Money | Pass | | |
| 4 | CH-cartao-pix-desktop | J-checkout-convidada / card do cartão sem desconto PIX, com cupom | Cliente no computador | Money | Pass | | |
| 5 | CH-parcelas-mobile | J-checkout-convidada / todas as parcelas abertas | Mãe enlutada no celular | Money | Pass | | |
| 6 | CH-parcelas-desktop | J-checkout-convidada / todas as parcelas abertas | Cliente no computador | Money | Pass | | |
| 7 | CH-bordas | carrinho abaixo de 2 × parcela mínima · CEP genérico | Mãe enlutada no celular | Back-alley | Fixed | "Parcele em até 1x" | `512b565` |

Status legend: `Pending | Pass | Fixed | Skipped | Blocked (needs human verify) | Blocked (human decision)`

## Session Debriefs

Driver: `agent-browser` (Chromium) em todas as sessões. Evidência em
`../evidence/2026-10-10-checkout-frete-parcelas/` — **local**: `docs/qa/evidence/` é gitignored.

### CH-frete-mobile — Mãe enlutada no celular (390×844)

- **Ran:** home → "Pingente Afetivo Barquinho com Cabelo" (R$ 209,90) → calcular frete na página → sacola → checkout como convidada → Entrega com CEP 01310-100.
- **Findings:** na página do produto e no bloco Entrega aparecem **exatamente dois** serviços — PAC R$ 25,95 e SEDEX R$ 39,64 (`frete-mobile-01-produto.png`, `frete-mobile-02-checkout.png`). Depois de escolher PAC e **recarregar**, o bloco Entrega continua "Correios PAC · R$ 25,95". A resposta da porta pública `melhor-envio?action=quote` também traz só os ids 1 e 2.
- **Scenarios settled:** frete só PAC e SEDEX → pass.
- **Paper cuts:** nenhuma forma de envio vem pré-selecionada (dull, anterior).

### CH-frete-desktop — Cliente no computador (1440×900)

- **Ran:** "Pingente Afetivo Bebê na Barriga com Cabelo" (R$ 279,90), CEP de Rio Branco/AC.
- **Findings:** com 69900-062 a página e o checkout mostram só PAC R$ 38,69 e SEDEX R$ 81,92 (`frete-desktop-01-checkout.png`).
- **Surprises:** o CEP genérico da cidade (69900-000) é recusado pelo próprio Melhor Envio (`cep_destino está invalido`); não é regressão.
- **Scenarios settled:** frete só PAC e SEDEX → pass.

### CH-cartao-pix-mobile — Mãe enlutada no celular

- **Ran:** Pagamento com PIX pré-selecionado → Cartão → PIX → Cartão; recarga da página.
- **Findings:** com PIX o card do cartão diz **"Até 4x de R$ 58,96 sem juros"** = (209,90 + 25,95) ÷ 4, sem o desconto PIX de 8%; o defeito antigo mostraria R$ 54,77 (219,06 ÷ 4). Com Cartão o texto é **idêntico**, CTA "Pagar R$ 235,85 no cartão", resumo R$ 235,85; de volta ao PIX, "Pagar R$ 219,06 com PIX". A recarga preserva o mesmo texto (`cartao-pix-mobile-01-pix-selecionado.png`).
- **Scenarios settled:** card do cartão sem desconto PIX → pass.

### CH-cartao-pix-desktop — Cliente no computador, com cupom

- **Ran:** PAC R$ 38,69, cupom `ACOLHER10` (10%) aplicado no bloco Pagamento.
- **Findings:** sem cupom o card diz "Até 4x de R$ 79,65" = 318,59 ÷ 4. Com o cupom e PIX ainda selecionado, **"Até 4x de R$ 72,65"** = (279,90 × 0,9 + 38,69) ÷ 4 = 290,60 ÷ 4 — **o cupom entra, o desconto PIX não**. Com Cartão: mesmo texto, CTA "Pagar R$ 290,60 no cartão", resumo R$ 290,60 (`cartao-pix-desktop-01-cupom-pix.png`).
- **Scenarios settled:** card do cartão sem desconto PIX, com cupom → pass.

### CH-parcelas-mobile — Mãe enlutada no celular

- **Ran:** número do cartão digitado no formulário do Mercado Pago; escolha de 3x.
- **Findings:** com o cartão de teste do MP (`5031 4332…`) a tabela não carrega — console: `no_payment_method_for_provided_bin`, porque a chave pública local é **de produção**. Limite do ambiente; a tela caiu no aviso de erro previsto, com o à vista. Repetido com o prefixo de um Mastercard real (só a consulta de parcelas): a lista abre **inteira, sem toque** — À vista R$ 235,85, a nota "Juros do Mercado Pago, já somados ao total de cada opção." e 2x…9x, cada uma com o total (`parcelas-mobile-01-lista.png`). Escolher 3x → CTA "Pagar 3x de R$ 87,45". Linhas de 56px; `scrollWidth` 390 = viewport.
- **Por que 9x e não 10x:** a parcela mínima do banco local é R$ 25 (produção: R$ 20) e 235,85 ÷ 25 = 9,4 — o corte de `min_installment_value`.
- **Scenarios settled:** todas as parcelas abertas → pass.
- **Paper cuts:** trocar para PIX e voltar ao cartão apaga o número digitado (dull — o formulário do MP desmonta; anterior).

### CH-parcelas-desktop — Cliente no computador

- **Findings:** com R$ 290,60 a lista vai do À vista a **10x de R$ 35,06 (Total R$ 350,61)** — o teto de 10x (`parcelas-desktop-01-lista.png`). O card passa a dizer "Parcele em até 10x" quando a tabela chega. Escolher 6x → "Pagar 6x de R$ 55,37". Sem rolagem horizontal.
- **Scenarios settled:** todas as parcelas abertas → pass.

### CH-bordas — Mãe enlutada no celular

- **Ran:** "Pingente Olho Grego Coleção Fragmentos" (R$ 7,90) + PAC = R$ 32,00; CEP genérico 69900-000 no checkout.
- **Findings:**
  - Carrinho barato: a lista tem **uma** linha, "À vista · R$ 32,00", e **nenhuma** nota de juros (`bordas-03-carrinho-barato.png`). **Mas o card do cartão diz "Parcele em até 1x"**, antes e depois do número do cartão — promete parcelamento a quem só pode pagar à vista. Anterior a esta sessão (texto de `useCardInstallmentHeadline`); escalado.
  - CEP genérico: "Não localizamos esse CEP…" e "Seguimos com o frete padrão da loja.", com "Correios Frete padrão · R$ 19,90" (`bordas-04-cep-generico.png`). **Confirmado pelo usuário como comportamento desejado** — com a cotação fora, o padrão é a saída. Não é achado.
- **Surprises:** a barra de compra do celular nasce fora da tela e só entra depois de rolar além da foto — previsto (commit `9d873d6`).
- **Scenarios settled:** CEP genérico → pass (comportamento confirmado); carrinho barato → fail, depois **fixed** (ver *What Was Fixed*).

## What Was Fixed

### "Parcele em até 1x" no card do cartão
- **Symptom:** com o carrinho de R$ 32 (parcela mínima R$ 25), o card "Cartão de crédito" anunciava "Parcele em até 1x" — parcelamento a quem só pode pagar à vista (`bordas-03-carrinho-barato.png`).
- **Root cause:** `PaymentBlock` montava o anúncio como `Parcele em até ${maxCount}x` sem tratar o teto 1, que acontece quando o total fica abaixo de 2 × `min_installment_value` ou quando o cartão só aceita à vista.
- **Fix:** `512b565` — com `maxCount` 1 o card diz `CARD_CASH_ONLY` — "À vista no cartão". Decisão autorizada pelo usuário ("se existir bug, corrija"), na opção recomendada.
- **Regression test:** `apps/store/src/features/checkout/ui/__tests__/PaymentBlock.test.tsx` — dois casos (total abaixo de 2 × a parcela mínima; tabela do MP de uma linha só). **Reprovam os dois** com o `PaymentBlock` de antes e passam com o novo.
- **Retested:** CH-bordas refeito do zero numa sessão nova (busca → produto → sacola → checkout como convidada), 390×844: o card diz "À vista no cartão" (`bordas-05-reteste-a-vista.png`). Os casos vizinhos (anúncio "Até Nx sem juros" e "Parcele em até 10x") seguem cobertos na mesma suíte, verdes.

## Paper Cuts

| Persona | Where (journey/step) | Felt | Sharpness | Outcome |
|---|---|---|---|---|
| Mãe enlutada no celular | Pagamento, carrinho de R$ 32 | "diz que parcela em até 1x — então parcela ou não?" | sharp | escalado (Decisions) |
| Mãe enlutada no celular | Pagamento | "fui ver o PIX, voltei e tive de digitar o cartão de novo" | dull | watching (anterior) |
| Mãe enlutada no celular | Entrega | "nenhum frete vem marcado, tenho que escolher" | dull | watching (anterior) |
| Cliente no computador | página do produto · frete | o CEP genérico da cidade dá "Erro ao calcular frete. Tente novamente." — tentar de novo não resolve | dull | watching (anterior) |

## Runtime Errors Observed

- `failed to get installments … no_payment_method_for_provided_bin` (404) — só com o cartão de **teste** do MP contra a chave de **produção**; explicado pelo ambiente, tratado pela tela como erro previsto.
- Nenhum outro erro de console além dos avisos de *future flag* do React Router.

## Human Verifications Needed

- [ ] **Configurar o Mercado Pago e rever a lista com cartão real.** No painel do MP, ligar "Oferecer parcelamento sem juros" até 4x; depois, em `/checkout` com um cartão de verdade, 2x–4x devem aparecer com o selo "Sem juros" e sem "Total", e 5x–10x com juros. Hoje a conta cobra juros desde 2x. (linhas 5–6)
- [ ] **Um pagamento de ponta a ponta no cartão** não foi feito (só a consulta de parcelas): confirmar que a parcela escolhida é a cobrada.

## Decisions for a Human

### "Até 4x sem juros" anunciado enquanto a conta cobra juros desde 2x (Trust-Damage, operação)
- What's broken: antes de digitar o cartão, o card e a vitrine prometem 4x sem juros; com o cartão digitado, a tabela do MP mostra 4x com juros (4 × R$ 65,66 = R$ 262,64 contra R$ 235,85).
- Why not auto-fixed: configuração da conta do Mercado Pago, não código — já decidido pelo usuário.
- Recommendation: configurar o MP até 4x sem juros, igual a "Parcelas sem juros" do painel da loja.

## Learnings

- Com a chave pública **de produção** no `.env` local, o cartão de teste do MP não tem tabela de parcelas; a prova exige o prefixo de um cartão real (só consulta) ou uma chave de sandbox.
- `find role button --name` pega o **primeiro** match: na página do produto é o botão do desktop (0×0 no celular), e no checkout "Alterar" é o do bloco Contato. Usar ref de snapshot ou seletor escopado.
- A barra de compra do celular só entra depois da foto — sessão de mobile precisa rolar antes de comprar.

## Final Status

- **Exit gate (full automated suite):**
  - `pnpm --filter @estrelinha/store test --testTimeout=20000` → `Test Files 271 passed (271) · Tests 4605 passed (4605)`, exit 0 (depois da correção do "1x"; antes dela, 4603/271).
  - `pnpm --filter @estrelinha/core test` → `Test Files 112 passed (112) · Tests 2704 passed (2704)`, exit 0.
  - `pnpm --filter @estrelinha/functions test` → `Test Files 19 passed (19) · Tests 923 passed (923)`, exit 0.
  - Os dois commits (`142c17f`, `512b565`) também foram conferidos **isolados** num worktree, sem o trabalho em andamento da feature 62: `tsc` do store 0 e as suítes de checkout e `core/shipping` verdes.
  - Backoffice e catalog-import não foram tocados e não foram remedidos.
- **Issues by user impact:** Blocks-Completion 0 · Data-Loss 0 · Trust-Damage 1 (operação: "4x sem juros" sem a conta do MP configurada — decisão do usuário já tomada) · Friction 0 · Cosmetic 0. Um paper cut sharp ("Parcele em até 1x") foi **corrigido** nesta rodada.
- **Coverage:** 1/1 jornada em escopo, 7/7 charters caminhados, em 390×844 e 1440×900. Paridade: Melhor Envio e Mercado Pago com credenciais de **produção** (só leitura); a tabela de parcelas foi provada com o prefixo de um cartão real, porque o cartão de teste não é reconhecido pela chave de produção; nenhum pagamento foi enviado.
- **Verdict:** ready with blocked items — os três ajustes funcionam como pedido; as parcelas "sem juros" só aparecem depois de configurar o parcelamento sem juros no painel do Mercado Pago, e um pagamento real no cartão continua a ser conferido por uma pessoa.
