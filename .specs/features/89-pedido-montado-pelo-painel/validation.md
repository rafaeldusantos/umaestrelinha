# 89 — Validation

**Spec**: `.specs/features/89-pedido-montado-pelo-painel/spec.md`
**Diff range**: working tree sobre `e5fd174c` (sem commit — arquivos `??` e `M` do `git status` de 2026-10-31)
**Verifier**: sub-agente independente (autor ≠ verificador). Nada de commit, nada de stash; cada mutante injetado no arquivo REAL, um por vez, restaurado com SHA-256 conferido byte a byte (os 77 conferiram).

---

## Rodada 1 — 2026-10-31 — **FAIL ❌** (cobertura; nenhum defeito de produto confirmado)

### Gate (re-medido aqui, só o que a feature toca)

| Conjunto | Resultado |
| --- | --- |
| core `src/proposals src/payment src/coupons src/hooks` | 515/515, exit 0 |
| functions `order-proposals checkout mercado-pago` | 444/444, exit 0 |
| store (página do link, `proposal-checkout`, `checkout`, `pageViewSemFragmento`, `proposalTokenComDonoUnico`) | 476/476, exit 0 |
| backoffice (`order-proposal`, as quatro páginas novas/alteradas) | 116/116, exit 0 |
| probe `probes/01-proposta.sql` contra o Postgres local (54442) | exit 0, 46 `ok —` |

As suítes inteiras, tipos, lint e `pnpm build` **não** foram remedidos nesta rodada; os números do fecho (T27) não foram contestados nem confirmados.

### Spec-anchored acceptance criteria

| AC | Valor da spec | Evidência (`file:line`) | Resultado |
| --- | --- | --- | --- |
| MON-01 | ação "Montar pedido" → `/admin/pedidos/montar` | `apps/backoffice/src/pages/admin/AdminOrdersPage.montados.test.tsx:114` | ✅ |
| MON-02 | nome/e-mail/telefone em `customer_directory`, convidada, padrão escolhido | `features/order-proposal/ui/__tests__/CustomerAddress.test.tsx:86,105,177`; `entities/customer/api/__tests__/useCustomerSearch.test.ts` | ✅ |
| MON-03 | e-mail existente (`lower(trim)`) oferece a ficha no lugar | `CustomerAddress.test.tsx:154,164`; probe "dedupe por grafia" | ✅ |
| MON-04 | CEP com `maskCep` completa; "Salvar no cadastro" | `CustomerAddress.test.tsx:194,210`; `AdminProposalBuilderPage.test.tsx:217` | ✅ |
| MON-05 | `ProductSearchField`, só variações ativas com estoque, teto de gravação | `PiecesAndDiscounts.test.tsx:116,123,136`; `order-proposals/__tests__/handlers.test.ts` (variant_required/inactive — F03/F04 mortos) | ✅ |
| MON-06 | "Pede material da cliente" | `PiecesAndDiscounts.test.tsx:123` | ✅ |
| MON-07 | `validateCoupon` com o e-mail, recusa com o texto da loja | `PiecesAndDiscounts.test.tsx:192,202,210`; servidor F05 morto | ✅ |
| MON-08 | R$/%, motivo obrigatório ≤ 120, % de **0,01 a 99,99** (A-12), frase "O desconto não pode zerar o pedido." | `PiecesAndDiscounts.test.tsx:236`; `core/proposals/__tests__/pricing.test.ts` (C05, C14, C17 mortos) | ⚠️ **lacuna de precisão**: o piso de 0,01 % não tem asserção (C07 sobrevive); o motivo com espaço no fim não tem caso (C06 sobrevive) |
| MON-09 | resumo por `resolveOrderPricing`, "no PIX: R$ …" | `PiecesAndDiscounts.test.tsx:288,307`; `core/payment/__tests__/manualDiscount.test.ts` (B05, C01–C04 mortos) | ✅ |
| MON-10 | prévia do frete, "A cliente escolhe a entrega no link", falha não bloqueia | `PiecesAndDiscounts.test.tsx:321,329,353,360,367` | ✅ |
| MON-11 | grava pela function, nunca PostgREST; abre a proposta | `AdminProposalBuilderPage.test.tsx:175` | ✅ |
| MON-12 | desabilitado com o motivo escrito; endereço opcional | `AdminProposalBuilderPage.test.tsx:156,167`; `draft.test.ts` (B03, B07 mortos) | ✅ |
| PRC-01 | servidor relê tudo e grava o travado | `order-proposals/__tests__/handlers.test.ts` (F03–F06, F10 mortos) | ✅ |
| PRC-02 | 409 com "Os preços mudaram enquanto você montava. Confira o resumo." e releitura | `handlers.test.ts` "save — criar > PRC-02" (F01); `AdminProposalBuilderPage.test.tsx:250` (B06) | ✅ |
| PRC-03 | `create-order` da proposta; `create-payment` cobra o travado | `checkout/__tests__/proposal.test.ts` (K09, K16 mortos); `mercado-pago/__tests__/proposalCharge.test.ts` (M01–M05 mortos) | ✅ |
| PRC-04 | avulso depois de promoção+cupom, antes do PIX, sem negativo | `core/payment/__tests__/manualDiscount.test.ts` (C01–C04 mortos) | ✅ |
| PRC-05 | cupom `free_shipping` zera o frete | `core/proposals/__tests__/pricing.test.ts`, `proposalParity.test.ts` (C09); `proposal.test.ts` (K09) | ✅ |
| PRC-06 | link == cobrado | `core/proposals/__tests__/proposalParity.test.ts` (C01, C09, C15 mortos) | ✅ |
| LNK-01 | link, Copiar, WhatsApp só com telefone válido; "Sem telefone — copie o link" | `AdminProposalPage.test.tsx:128,137` (B02) | ✅ |
| LNK-02 | mensagem literal | `core/proposals/__tests__/link.test.ts` (C13); `AdminProposalPage.test.tsx:147` | ✅ |
| LNK-03 | "Link enviado" com data e canal | `AdminProposalPage.test.tsx:147,162`; `handlers.test.ts` log-sent (F13) | ✅ |
| LNK-04 | colunas e cinco estados; Concluída com link | `AdminOrdersPage.montados.test.tsx:199,221`; `state.test.ts` (C11, C16) | ✅ |
| LNK-05 | editar (versão sobe), renovar (antigo morre, aviso), cancelar | `AdminProposalPage.test.tsx:207,279`; `handlers.test.ts` renew (F07, F08) | ✅ |
| LNK-06 | encerrada não edita; expirada oferece "Renovar" com preços relidos | `AdminProposalPage.test.tsx:226,240`; `state.test.ts` (C12); `handlers.test.ts` (F09) | ⚠️ F12 sobrevive (abaixo) |
| CON-01 | `get-proposal` com token; blocos de `/checkout` | `ProposalCheckoutPage.test.tsx:215,234` | ✅ |
| CON-02 | título, frase e prazo literais | `ProposalCheckoutPage.test.tsx:223` | ✅ |
| CON-03 | só leitura, "Desconto combinado" sem motivo | `ProposalCheckoutPage.test.tsx:234,247` (S06); `proposal.test.ts` (K10) | ✅ |
| CON-04 | blocos como `/checkout`; e-mail só leitura | `ProposalCheckoutPage.test.tsx:257`; `blocosDoPedidoMontado.test.tsx` (S04) | ✅ |
| CON-05 | `create-order` com `proposal_token`, `proposal_id`, PIX/cartão | `ProposalCheckoutPage.test.tsx:360,405`; probe | ⚠️ "e-mails" não tem asserção (os gatilhos de `orders` disparam pela RPC — inferido, não medido) |
| CON-06 | mesma transação; segundo `create-order` ⇒ mesmo pedido | probe (P06); `proposal.test.ts` (K06, K12); `ProposalCheckoutPage.test.tsx:442` | ✅ |
| CON-07 | concluída ⇒ `/pedido/:id` com acesso | `ProposalCheckoutPage.test.tsx:309` (S05); `proposal.test.ts` (K06) | ✅ |
| CON-08 | frase literal sem dado; WhatsApp da loja | `ProposalCheckoutPage.test.tsx:278,286`; `proposal.test.ts` (K13, K14); probe (P01) | ✅ |
| CON-09 | peça indisponível marcada, bloqueia; servidor recusa | `ProposalCheckoutPage.test.tsx:316,464` (S03); `proposal.test.ts` (K04, K15, K17) | ⚠️ K05 sobrevive: o saldo da peça sem variação contra a **quantidade** (só fixtura com quantidade 1) |
| CON-10 | versão velha recusada, frase, releitura | `ProposalCheckoutPage.test.tsx:330` (S07); `proposal.test.ts` (K03); probe (P04) | ✅ |
| CON-11 | "Vista" uma vez | `proposal.test.ts` (K02); probe (P02) | ✅ |
| CON-12 | com conta sem código; sem conta cria e adota | `proposal.test.ts` (K08, K11); probe (adoção) | ✅ (o probe não pega P03 — ver sobreviventes — mas o guarda de fonte sim) |
| SEG-01 | 32 bytes, só hash | `handlers.test.ts` (token casa com o hash; F02) | ✅ |
| SEG-02 | só do fragmento, `sessionStorage`, `replaceState`, nada no analytics | `proposalToken.test.tsx`, `ProposalCheckoutPage.test.tsx:215` (S01); `pageViewSemFragmento.test.tsx` (S02) | ✅ |
| SEG-03 | `noindex`, fora do sitemap | `ProposalCheckoutPage.test.tsx:223`; `core/routes`/`seo` tests | ✅ |
| SEG-04 | só o que a página desenha; **teto por IP no limitador compartilhado** | `proposal.test.ts` (K10, K01) | ❌ **a fiação do limitador não tem prova**: tirar `proposalLimiter` do `checkout/index.ts` deixa tudo verde (K18), e `getProposal` faz `limiter && …` — sem o limitador, **sem teto**. O número (30/5 min) é do design, não da spec (⚠️ precisão), e também sobrevive (K19) |
| SEG-05 | `requireAdmin` em toda ação; RLS sem policy | `handlers.test.ts` autorização (F11, 23 casos); `pedidoMontadoSchema.test.ts` | ✅ |
| HIS-01 | histórico com data e autor | `AdminProposalPage.test.tsx:308,324` | ✅ |
| HIS-02 | "Montado pelo painel · P-0001", desconto com motivo | `AdminOrderPage.origem.test.tsx:91,99` (B04) | ✅ |
| DUP-01 | mesmas peças e desconto, preços relidos | `AdminProposalBuilderPage.test.tsx:339` | ✅ |

**Edge cases**

- [x] vence no meio (relógio do servidor) — probe P01, `proposal.test.ts` K13/K14, `state.test.ts` C11.
- [x] dois aparelhos ⇒ um pedido — K12, probe.
- [x] só retirada / cotação falhou — coberto pelo `DeliveryBlock` reaproveitado (não remedido aqui).
- [x] produto apagado legível e indisponível — `proposal.test.ts:192`.
- [x] sacola da loja intocada — `ProposalCheckoutPage.test.tsx:405` (cartão) e S08 (a chave própria). O PIX depende do recorte `orderId` do `OrderPaymentPage` (global ≠ instância) — inferido, sem caso que pague um pedido montado em `/pedido/:id/pagamento` com a sacola cheia.
- [x] duas propostas do mesmo e-mail — sem caso dedicado; nada as acopla no código.
- [x] cupom + avulso abaixo de R$ 1,00 — `core/proposals/__tests__/pricing.test.ts` (C05).
- [x] editar sem mudar ⇒ versão não sobe — probe.

### Discrimination sensor — 77 mutantes, 69 mortos, 8 sobreviventes (1 equivalente)

Mortos por **asserção** (nenhum por compilação); os de SQL, pelo probe (`PROBE FALHOU`).

| Lote | Arquivo | Mutantes | Resultado |
| --- | --- | --- | --- |
| C01–C17 | `core/payment/pricing.ts`, `core/proposals/{pricing,state,link}.ts` | base do PIX sem o avulso; sem piso; avulso sobre o subtotal cru; `%`/R$ trocados; piso A-12 → 0,01; motivo aparado; % mínimo → >0; frete grátis sem o avulso na base; cupom free_shipping ignorado; free_shipping sem ter vencido; `>`→`>=` no prazo; expirada sem renovar; pontuação do WhatsApp; qtd 99; avulso fora do `proposalPricing`; "vista" ignorada; 31 linhas | 15 mortos · **C06, C07 sobrevivem** (também contra functions e backoffice) |
| F01–F13 | `order-proposals/handlers.ts` | sem PRC-02; token no reused; variação pausada/obrigatória; 1ª compra; peça inativa; renew sem `status=open`; sem zerar `viewed_at`; renew sem conferir preço; gravação em variação que não grava; sem `requireAdmin`; renew sem comparar preço por linha; canal livre | 12 mortos · **F12 sobrevive** |
| K01–K19 | `checkout/proposal.ts`, `checkout/index.ts` | sem teto; marca vista sempre; sem versão; estoque da variação; saldo sem variação `> 0`; sem hash no reemitido; telefone sem recuo; conta invertida; frete do corpo; `...row` na pública; e-mail do corpo; corrida perdida; vencida aceita (get e create); peça inativa; total do corpo; 422 desligado; limitador desligado na fiação; teto 30 → 30000 | 15 mortos · **K05, K07, K18, K19 sobrevivem** |
| M01–M06 | `mercado-pago/handlers.ts` | vínculo, linhas, frete, ramo, avulso, status | 5 mortos · **M06 sobrevive (equivalente — ver abaixo)** |
| S01–S09 | loja (token, tracker, página, `ContactBlock`, resumo, store) | todos | 9 mortos |
| B01–B07 | painel | todos | 7 mortos |
| P01–P06 | migration (via probe) | vencida, vista uma vez, adoção sem `user_id is null`, versão, itens de outra proposta, status concluída | 5 mortos · **P03 sobrevive ao probe** e morre no guarda `pedidoMontadoSchema.test.ts` (2 casos) — não conta como sobrevivente |

**Sobreviventes, ranqueados**

1. **K18 — o teto de `get-proposal` (SEG-04) some sem nada acusar.** `supabase/functions/checkout/index.ts:36` sem a linha `proposalLimiter:` ⇒ 341/341 verdes; `proposal.ts` faz `if (limiter && ip && !limiter.hit(ip))`, então a ausência é **fail-open**: a credencial de URL fica sem limite de tentativas. `wiringResolve` só confere nomes chamados, não a injeção. Fix: o caso do teto deve passar pelo `deps` montado pelo mesmo construtor do `index.ts` (ou extrair `buildDeps` para `handlers.ts` com teste), e/ou fazer `getProposal` recusar quando o limitador não veio. K19 (30 → 30000) é a mesma lacuna; o número é do design, não da spec.
2. **K05 — `CON-09` com quantidade > 1 na peça sem variação.** `proposal.ts` `Number(p.stock_total ?? 0) >= quantidade` → `> 0` passa: toda fixtura tem `quantity` 1. Uma peça com saldo 1 e quantidade 2 seria vendida. Fix: caso com saldo < quantidade e saldo == quantidade (e o mesmo para a variação, que K04 mata só pelo zero).
3. **K07 — telefone da proposta como recuo.** `nuloSeVazio(body?.customer_phone) ?? row.customer_phone ?? null` → sem o recuo passa: nenhuma fixtura manda o corpo sem telefone. O pedido nasceria sem o telefone que a Adri já tinha (e o lembrete do WhatsApp sem número). Fix: caso sem `customer_phone` no corpo asserindo o da proposta no `p_order`.
4. **C07 — o piso de 0,01 % (A-12/MON-08).** `value < MANUAL_PERCENT_MIN` → `value <= 0` passa em core, functions e painel; o `check` do banco segura (`between 0.01 and 99.99`), então o efeito é um 500 no lugar da frase. Fix: caso com 0,005 % recusado com "O desconto em percentual vai de 0,01% a 99,99%."
5. **C06 — o motivo contado com espaço no fim, e um comentário que afirma o contrário do banco.** `core/proposals/pricing.ts` diz "Contado sem aparar, como o `char_length` do banco", mas a migration conta `char_length(btrim(manual_discount_reason))` — o banco **apara**. As duas réguas divergem (core recusa 121 caracteres com espaço final que o banco aceitaria); aparar no core (o mutante) é exatamente a régua do banco, e nada distingue. Fix: decidir a régua (provavelmente aparar nos dois, ou gravar aparado), corrigir o comentário e asserir com espaço no fim — a lição da `64` (`categoryListRefusal`) repetida.
6. **F12 — `renew` cego a preço de linha que muda com o total igual.** Tirar a comparação por linha do `mudou` passa: duas linhas trocando preço sem mudar o total renovariam com os `unit_price` antigos gravados. Raro; fix: caso com duas linhas cujo preço muda e o total não.
7. **M06 — equivalente declarado.** `proposal.status !== "completed"` removido passa porque `order_id` só é preenchido pela RPC junto com `status = 'completed'` e nenhuma transição sai de concluída. Sem fix.

### Outras observações (não contam no veredito)

- **Dois donos de `PROPOSAL_PATH`**: `core/routes/routes.ts:187` e `core/proposals/link.ts:8` declaram a mesma constante; a T07 pediu que a T05 importasse. Hoje os dois testes cravam `'/pedido-montado'`, então divergir reprova — mas é o "defeito 01" com guarda acidental. `PROPOSAL_LINK_DAYS` repete `GUEST_ACCESS_DAYS` (A-03 diz "`GUEST_ACCESS_DAYS`") sem guarda de igualdade.
- **A-06 / `used_count`**: nenhum caminho (nem o de hoje) incrementa `used_count`; "como hoje" é verdade, mas a frase da spec sugere que conta. Precisão de spec, não defeito da 89.
- **P03**: o probe não tem fixtura de ficha **com conta** do mesmo e-mail; a adoção que roubaria a ficha de outra conta só é pega pelo guarda de fonte.

## Summary

**Overall**: ❌ Not Ready (rodada 1) — só cobertura; nenhum defeito de produto confirmado, mas K18 é fail-open numa credencial.
**Spec-anchored check**: 39/44 ACs ✅ · 4 ⚠️ (MON-08, LNK-06, CON-05, CON-09) · 1 ❌ (SEG-04)
**Sensor**: 77 injetados · 69 mortos (P03 pelo guarda de fonte) · 8 sobreviventes (M06 equivalente)
**Gate**: conjuntos tocados verdes; probe 46 `ok —`.

**Fix tasks**: (1) K18/K19 fiação do limitador; (2) K05 saldo × quantidade; (3) K07 recuo do telefone; (4) C07 piso 0,01 %; (5) C06 régua do motivo + comentário; (6) F12 preço por linha no renew.

---

## Fecho das lacunas da rodada 1 — 2026-10-31 (sem rodada 2)

Autor = quem consertou (não é verificação independente). Cada lacuna: teste que reprova antes (ou o mutante sobrevivente reinjetado como "antes"), conserto, e o mutante reinjetado no arquivo REAL, um por vez, restaurado com SHA-256 conferido. **15 mutantes, 15 mortos por asserção, 0 por compilação, SHA-256 conferido nos 15.**

| # | Lacuna | Conserto | Mutante reinjetado ⇒ quem mata |
| --- | --- | --- | --- |
| 1 | SEG-04 / K18, K19 — fiação do limitador fail-open | **produto**: as `Deps` reais nascem em `buildDeps(supabase, now)` (`checkout/handlers.ts`), o `index.ts` só lê env e chama isto; `getProposal` passou a ser **fail-closed** (sem balde ⇒ 503, sem ler nada). Testes: `checkout/__tests__/buildDeps.test.ts` (novo, 11: 30 passam/31ª 429, por IP, janela de 5 min, balde separado do `identify`, o número escrito por extenso; e a fonte do `index.ts` só por `buildDeps`, com sensores e o inverso do comentário) e +1 em `proposal.test.ts` (fail-closed) | K18 (linha do balde tirada de `buildDeps`) ⇒ 4 casos de `buildDeps`; K18b (o `limiter &&` de volta, sem o fail-closed) ⇒ o caso fail-closed; K19 (30 → 30000) ⇒ 3 casos. O número 30/5 min continua sendo do `design.md` (a spec diz só "teto por IP"): precisão declarada no comentário de `PROPOSAL_READ_MAX` |
| 2 | CON-09 / K05 — saldo × quantidade | só teste: +3 em `proposal.test.ts` (peça sem variação saldo 1 × qtd 2 ⇒ 422 posição 0; variação saldo 1 × qtd 2 ⇒ 422 posição 1; saldo == qtd vende, e `get-proposal` marca a indisponível) | K05 (`stock_total >= qtd` → `> 0`) ⇒ 2 casos; K05b (o mesmo na variação, que K04 só matava pelo zero) ⇒ 1 caso |
| 3 | create-order / K07 — recuo do telefone | só teste: +1 (corpo com telefone vazio e ausente ⇒ o da proposta; o digitado vence) | K07 (sem `?? row.customer_phone`) ⇒ o caso |
| 4 | MON-08 / A-12 / C07 — piso de 0,01 % | só teste: `core/proposals/__tests__/pricing.test.ts` (0,005 % e 0,0099 % recusados com a frase) e +1 em `order-proposals/__tests__/handlers.test.ts` (422 com a frase, nada gravado) | C07 (`< MIN` → `<= 0`) ⇒ morto em core **e** em functions. O painel lê o mesmo `manualDiscountRefusal` (não remedido por mutante; `ManualDiscountField` só chama o dono) |
| 5 | MON-08 / C06 — régua do motivo e comentário falso | **produto**: `manualDiscountRefusal` conta o motivo **aparado**, como o banco (`char_length(btrim(...))`) e como a function grava; o comentário falso saiu. Teste novo em functions (120 com espaço em volta passa e é gravado aparado; 121 ⇒ 422) **reprovou antes do conserto** (`expected 422 to be 200`), e +2 asserções em core. O `<Input maxLength={120}>` do painel continua contando cru — é mais estrito que o banco, nunca aceita o que ele recusa | C06 invertido (contar sem aparar, a régua de antes) ⇒ morto em core e em functions |
| 6 | LNK-06 / F12 — renew cego a preço de linha | só teste: +2 em `handlers.test.ts` (duas linhas trocando preço com o total igual ⇒ 409 `prices_changed`, nada gravado; confirmado ⇒ renova e trava os preços de hoje por linha) | F12 (tirar a comparação por linha do `mudou`) ⇒ 2 casos |
| 7a | CON-05 — "e-mails" sem asserção | só teste: +1 em `mercado-pago/__tests__/proposalCharge.test.ts` — o PIX do pedido montado com QR dispara `order_received` para o e-mail do pedido (claim + Resend), pelo motor real. O dublê de `orders` passou a distinguir a releitura do motor pelo `select` | — (precisão; não havia mutante) |
| 7b | P03 — probe sem ficha com conta do mesmo e-mail | probe: fixtura nova (ficha da conta A com o e-mail compartilhado; a conta B do mesmo e-mail ganha a dela, a de A fica com A). **47 `ok —`**, exit 0 | P03 (adoção sem `user_id is null`) ⇒ `PROBE FALHOU` no caso novo (antes só o guarda de fonte pegava) |
| 7c | `PROPOSAL_PATH` com dois donos | **produto**: `core/proposals/link.ts` importa de `core/routes/routes.ts` (folha sem import, alcançável pelo Deno) e reexporta; +3 em `link.test.ts` (fonte sem segunda declaração, âncora no dono, sensor) | PATH (a declaração local de volta) ⇒ 2 casos |
| 7d | `PROPOSAL_LINK_DAYS` repetia `GUEST_ACCESS_DAYS` | **produto**: `PROPOSAL_LINK_DAYS = GUEST_ACCESS_DAYS` (import de `checkout/guestAccess.ts`, folha sem import) | DAYS (o `7` literal de volta) ⇒ 1 caso |
| 7e | A-06 / `used_count` | **não consertado**: precisão de spec. Nenhum caminho (nem o de hoje) incrementa `used_count` no servidor; a frase "conta na conclusão" da A-06 promete o que a loja não faz em pedido nenhum. Decisão do usuário (fora da 89) | — |

M06 continua equivalente declarado.

### Gate (remedido, um workspace por vez, `--testTimeout=20000` sem o `--`, exit fora de pipe)

| Workspace | Antes (T27) | Agora | Delta |
| --- | --- | --- | --- |
| core | 5126/202 | **5129/202** | +3 |
| functions | 1390/37 | **1411/38** | +21/+1 (`buildDeps.test.ts` 11; `proposal.test.ts` +5; `order-proposals` +4; `proposalCharge` +1) |
| store | 6475/347 | **6475/347** | 0 (os guardas que varrem os apps seguem verdes) |
| backoffice | 4888/268 | **4888/268** | 0 |

Os quatro exit 0. `tsc`: core 11 (herdados), backoffice 0, store 0. Mobile-adm e catalog-import não foram tocados nem remedidos. Lint e `pnpm build` não remedidos (nenhum app mudou de código; `supabase/` e `packages/` não passam por `pnpm lint`). A `migration` não mudou (só o probe).

**Não provado**: o `index.ts` da `checkout` servido (o guarda lê a fonte; o edge runtime local não foi subido).

---

## Rodada 2 — 2026-10-31 — **FAIL ❌** (cobertura; nenhum defeito de produto confirmado)

**Verifier**: sub-agente independente, sem o contexto de quem escreveu nem de quem fechou a r1. Árvore sobre `e5fd174c`, sem commit. Cada mutante foi injetado no arquivo REAL, um por vez, por um arnês (`run.py` no scratchpad da sessão) que **lança** quando o trecho alvo não aparece exatamente uma vez, roda só as suítes do assunto, classifica a morte (asserção × compilação: procura `Transform failed`/`SyntaxError` no log) e restaura com SHA-256 conferido byte a byte — **os 62 conferiram**. Nada de commit, nada de stash. `git status` antes e depois: os mesmos 94 caminhos.

### Gate (re-medido aqui)

| Conjunto | Resultado |
| --- | --- |
| core inteiro | **5129/202**, exit 0 |
| functions inteiro | **1411/38**, exit 0 |
| core `src/proposals src/payment src/coupons` + `useCoupons` (sensor) | 398, exit 0 |
| functions `order-proposals checkout mercado-pago` (sensor) | 465, exit 0 |
| store (página do link, `proposal-checkout`, `pageViewSemFragmento`, `blocosDoPedidoMontado`, `checkoutStoreInstancia`) (sensor) | 54, exit 0 |
| store guardas (`pedidoMontadoSchema`, `pedidoComDonoUnico`, `marcacaoSoPorAcao`, `proposalTokenComDonoUnico`) | 237, exit 0 |
| backoffice (`order-proposal`, as quatro páginas, `VariantPicker`, `entities/customer`) (sensor) | 153, exit 0 |
| probe `01-proposta.sql` contra o Postgres local (54442) | exit 0, **47** `ok —` |
| backoffice inteiro | **4888/268**, exit 0 |
| store inteiro | **6475/347**, exit 0 |

Batem com os números do fecho da r1 (core 5129/202, functions 1411/38).

### O fecho da r1 — re-derivado, não lido

Os sete sobreviventes da r1 que o fecho declarou mortos foram **reinjetados** nesta rodada, nas formas originais:

| Reteste | Mutante | Resultado |
| --- | --- | --- |
| V01 / K05 | saldo da peça sem variação `>= quantidade` → `> 0` | ✅ morto (2 casos) |
| V02 / K05b | o mesmo na variação | ✅ morto (1) |
| V03 / K07 | sem o recuo do telefone da proposta | ✅ morto (1) |
| V04 / C07 | piso `< 0,01 %` → `<= 0` | ✅ morto (1, core) |
| V05 / C06 | motivo contado sem aparar | ✅ morto (1, core) |
| V06 / F12 | `renew` sem a comparação por linha | ✅ morto (2) |
| V07 / K18 | o balde da proposta fora de `buildDeps` | ✅ morto (4) |
| V08 / K18b | `getProposal` de volta a fail-open (`limiter && …`) | ✅ morto (1) |
| V09 / K19 | teto 30 → 30000 | ✅ morto (3) |
| V10 / 7c | segunda declaração local de `PROPOSAL_PATH` | ✅ morto (2) |

**As lacunas da r1 estão fechadas.** O que a r2 acha abaixo é novo.

### Spec-anchored acceptance criteria

A tabela da r1 continua valendo (mesmos `file:line`); os literais da spec foram reconferidos por busca nos testes — os 17 (PRC-02, CON-02, CON-03, CON-08, CON-09, CON-10, LNK-01, LNK-02, LNK-04, MON-01, MON-06, MON-08, MON-09, MON-10, HIS-02) aparecem escritos por extenso em ao menos um arquivo de teste. Mudanças de resultado em relação à r1:

| AC | r1 | r2 | Por quê |
| --- | --- | --- | --- |
| MON-08 | ⚠️ | ✅ | C06/C07 fechados e retestados (V04, V05) |
| LNK-06 | ⚠️ | ✅ | F12 fechado (V06) |
| CON-05 | ⚠️ | ✅ | o e-mail `order_received` tem asserção (`proposalCharge.test.ts`, fecho 7a) |
| CON-09 | ⚠️ | ✅ | K05/K05b fechados (V01, V02) |
| SEG-04 | ❌ | ✅ | fail-closed e fiação por `buildDeps` (V07–V09). O número 30/5 min segue sendo do design (⚠️ precisão declarada no código) |
| PRC-03 | ✅ | ⚠️ | **R32**: a conferência "o pedido tem exatamente as linhas travadas" perde a checagem de tamanho sem nada acusar — ver sobreviventes |
| CON-12 | ✅ | ⚠️ | **R39**: "o pedido vai para a conta daquele e-mail" depende de a ficha **com conta** vencer o desempate em `save_order_proposal`; a ordem invertida passa no probe |
| create-order (contato) | — | ⚠️ | **R22**: o recuo do CPF da proposta não tem caso (irmão do K07 da r1) |

**Status**: 41/44 ✅ · 3 ⚠️ (PRC-03, CON-12, e o recuo do CPF que serve a CON-05/CSC-08) · 0 ❌.

### Discrimination sensor — 52 mutantes novos + 10 retestes = 62, 55 mortos, 7 sobreviventes (3 equivalentes de fato)

Todas as mortes foram **por asserção** (nenhuma por compilação); as de SQL, pelo probe (`PROBE FALHOU`).

| Id | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| R01 | `core/payment/pricing.ts` | sem o `return` da forma antiga (todo objeto ganha `manualDiscount`) | ✅ 4 |
| R02 | idem `resolveManualDiscount` | avulso negativo não é cortado em zero | ✅ 1 |
| R03 | `core/proposals/pricing.ts` | cupom de frete grátis descartado pela promoção ainda zera o frete | ✅ 1 |
| R04 | idem | quantidade 0 aceita | ✅ 2 |
| R05 | `core/proposals/state.ts` | expirada pode cancelar | ✅ 1 |
| R06 | idem | cancelada deixa de ser `cancelled` | ✅ 1 |
| R07 | `core/coupons/rules.ts` | primeira compra recusa quando não perguntado | ✅ 4 |
| R08 | idem | esgotado `>=` → `>` | ✅ 3 |
| R09 | `core/proposals/pricing.ts` | recusa do avulso ignorada no `priceProposalDraft` | ✅ 1 |
| R10 | `core/proposals/link.ts` | dd/mm do WhatsApp em UTC | ✅ 2 |
| R11 | idem | nome inteiro no lugar do primeiro | ✅ 2 |
| R12 | `proposalPricing` | faixa de frete grátis sobre o subtotal cheio (A-11) | ✅ 1 |
| R13 | `order-proposals/handlers.ts` `cancel` | update sem `.eq('status','open')` | ✅ 1 |
| R14 | idem `log-sent` | recusa a proposta "vista" | ✅ 2 |
| R15 | idem `precificar` | 1ª compra só com 2 pedidos | ✅ 1 |
| R16 | idem | variação de outra peça sem a conferência do `product_id` | ❌ sobrevive — **equivalente de efeito** (ver abaixo) |
| R17 | idem `save` | duplo clique devolve um token que não foi gravado | ✅ 1 |
| R18 | idem `conteudoDoSave` | `items_total` gravado = subtotal | ✅ 2 |
| R19 | idem `renew` | `mudou` cego ao cupom | ❌ sobrevive — **equivalente de efeito** |
| R20 | idem `cancel` | sem `requireAdmin` | ✅ 3 |
| R21 | `checkout/proposal.ts` `get-proposal` | cancelada mostra os dados | ✅ 1 |
| R22 | idem `create-order` | sem o recuo do CPF da proposta | ❌ **sobrevive** |
| R23 | idem | `proposal_changed` da RPC vira 404 | ✅ 1 |
| R24 | idem | corrida do 2º aparelho devolve o token não gravado | ✅ 1 |
| R25 | idem `disponibilidade` | variação de outra peça conta como disponível | ❌ sobrevive — **equivalente de efeito** |
| R26 | idem | peça sem variação com `backorder` passa a esgotar | ✅ 1 |
| R27 | idem `publica` | `available: true` sempre | ✅ 6 |
| R28 | idem | o frete escolhido sai do total | ✅ 3 |
| R29 | `checkout/handlers.ts` | `create-order` nunca entra no ramo da proposta | ✅ 24 |
| R30 | `checkout/proposal.ts` | sem exigir `client_request_id` | ✅ 1 |
| R31 | `mercado-pago/handlers.ts` `lineKey` | preço fora da chave da linha | ✅ 1 |
| R32 | idem `lockedProposalCharge` | sem `travadas.length !== doPedido.length` | ❌ **sobrevive** |
| R33 | idem | `pix_discount` não persistido | ✅ 3 |
| R34 | idem | frete do pedido fora da cobrança | ✅ 4 |
| R35 | migration `create_order_from_proposal` | cancelada conclui | ✅ probe |
| R36 | migration `mark_order_proposal_viewed` | marca vista fora de `status = 'open'` | ✅ probe |
| R37 | migration `save_order_proposal` | edita proposta não aberta | ✅ probe |
| R38 | idem | ficha de outro e-mail aceita (`A-07`) | ✅ probe |
| R39 | idem | desempate `(c.user_id is null)` invertido | ❌ **sobrevive ao probe** |
| R40 | migration `create_order_from_proposal` | `order_id` não gravado na proposta | ✅ probe |
| R41 | `ProposalCheckoutPage.tsx` | concluída navega sem guardar o acesso | ✅ 1 |
| R42 | idem | versão nova sem reler | ✅ 1 |
| R43 | idem | "Pagar" liberado com peça indisponível | ✅ 2 |
| R44 | `proposal-checkout/ui/ProposalSummary.tsx` | frete zerado mostra "R$ 0,00" em vez de "Grátis" | ❌ sobrevive — cosmético |
| R45 | `ProposalCheckoutPage.tsx` | `proposal_version: 1` fixo | ✅ 2 |
| R46 | idem | PIX vai a `/pedido/:id` em vez da rota de pagamento | ✅ 3 |
| R47 | painel `model/draft.ts` | "Criar link" sem a variação escolhida | ✅ 1 |
| R48 | idem | `expected_total` = subtotal | ✅ 2 |
| R49 | painel `ui/ProposalOrigin.tsx` | o motivo some do pedido (`HIS-02`) | ✅ 1 |
| R50 | painel `ui/ProposalLinkCard.tsx` | WhatsApp não registra o envio (`LNK-03`) | ✅ 1 |
| R51 | `AdminProposalPage.tsx` | concluída sem o link para o pedido | ✅ 1 |
| R52 | painel `model/draft.ts` | "Criar link" sem e-mail válido | ✅ 1 |
| V01–V10 | (retestes da r1, acima) | | ✅ 10/10 |

**Sobreviventes, ranqueados**

1. **R32 — PRC-03: a checagem de TAMANHO da conferência das linhas no `create-payment` não tem prova.** `mercado-pago/handlers.ts` `lockedProposalCharge` compara as chaves ordenadas com `travadas.some((k, i) => k !== doPedido[i])`, que só itera as travadas: uma linha **a mais** no pedido que ordene por último só é recusada por `travadas.length !== doPedido.length`. Tirar essa metade deixa 465/465 verdes, porque o caso "uma linha a mais no pedido: 422" (`proposalCharge.test.ts:293`) acrescenta `PRODUCT_A` com quantidade 1, cuja chave (`…||1|0.01`) ordena **antes** das travadas e é pega pelo índice. O comentário `SPEC_DEVIATION` da própria função diz que ela existe para recusar exatamente isto (uma cliente logada acrescentar linha ao pedido montado com as policies de `INSERT` abertas, `BL-030`) — e o código de hoje está **certo**; o que falta é a prova. **Fix**: caso com o intruso ordenando por último (ex.: um `product_id` `ff…`, ou o mesmo `PRODUCT_B` com outra variação maior) ⇒ 422 sem `fetch` ao MP.
2. **R39 — CON-12/A-08: "a ficha com conta vence" não é medida.** `save_order_proposal` escolhe a ficha por `order by (c.user_id is null), c.created_at nulls last, c.id`; com `is not null` o probe segue com 47 `ok —`, porque nenhuma fixtura tem, para o mesmo e-mail e sem `customer_id` no corpo, uma ficha **com** conta e outra **sem**. `checkout/proposal.ts:463` comenta que "o pedido já está na ficha dela (a ficha com conta vence em `save_order_proposal`)" — afirmação sem medida. Com a ordem invertida, o pedido montado de uma cliente com conta iria para a ficha órfã e não apareceria em `/conta`. **Fix**: fixtura no probe com as duas fichas do mesmo e-mail (a sem conta mais antiga, para o `created_at` não decidir por acaso) ⇒ `customer_id` = a com conta.
3. **R22 — o recuo do CPF da proposta no `create-order`.** `texto(body?.customer_document).replace(/\D/g,'') || row.customer_document || null` sem o recuo passa: toda fixtura manda o CPF no corpo. É o irmão, na linha de baixo, do K07 (telefone) que a r1 achou e o fecho consertou só para o telefone. Sem o recuo, um pedido concluído com o CPF vazio no corpo nasce sem o documento que a Adri já tinha, e o PIX depende dele (`missing_payer_cpf`). **Fix**: o caso do K07 estendido ao CPF (vazio e ausente ⇒ o da proposta; o digitado vence).
4. **R44 — "Grátis" no resumo do link.** `ProposalSummary.tsx` mostra "Grátis" quando o frete foi zerado; trocar a condição por `false` (mostra "R$ 0,00") passa. A spec (PRC-05) pede o frete **zerado** — e o valor zerado é provado —, não a palavra: ⚠️ precisão de spec, cosmético. Sem fix obrigatório; se a palavra é a de `/checkout`, merece a asserção.
5. **R16, R19, R25 — equivalentes de efeito, declarados.**
   - R16: sem a conferência do `product_id` da variação em `precificar`, a recusa continua acontecendo — por `variant_not_found` quando a outra peça não está na proposta (a leitura de variações é `.in('product_id', ids)`) e por `price_not_resolvable` de `resolveItemPrice` quando está. Só o texto da recusa muda no segundo caso.
   - R19: com o avulso em reais ou em %, uma mudança de `coupon_discount` sempre muda `items_total` ou uma linha (cupom descartado ⇒ preço da promoção na linha), que o `mudou` já compara.
   - R25: `disponibilidade` relê uma linha já gravada por `save`, que recusou a variação de outra peça (R16). Só um `update` manual de `product_variants.product_id` chegaria lá.

### Outras observações (não contam no veredito)

- **Frases com dois donos**: "Este link não está mais disponível…" e "A Adri atualizou seu pedido…" existem em `checkout/proposal.ts` **e** em `apps/store/src/features/proposal-checkout/model/copy.ts`. A página desenha a cópia dela; a da function vai no corpo do erro. Cada lado tem teste com o literal, então divergir reprova um deles — mas é o "defeito 01" com guarda por acaso, como o `PROPOSAL_PATH` da r1.
- **A-06 / `used_count`**: continua como a r1 deixou (precisão de spec, decisão do usuário).
- **Não provado nesta rodada**: o `index.ts` da `checkout` servido; o boot local da `order-proposals` (o `import type` de pacote em `core/pricing`, registrado na T27).

## Summary (rodada 2)

**Overall**: ❌ Not Ready — só cobertura; nenhum defeito de produto confirmado (o código de hoje faz o certo nos três pontos; falta a prova).
**Spec-anchored check**: 41/44 ✅ · 3 ⚠️ (PRC-03 via R32, CON-12 via R39, o recuo do CPF via R22) · 0 ❌. As 5 lacunas da r1 (MON-08, LNK-06, CON-05, CON-09, SEG-04) fechadas e retestadas.
**Sensor**: 62 injetados (52 novos + 10 retestes) · 55 mortos por asserção · 7 sobreviventes (3 equivalentes de efeito, 1 cosmético, **3 a fechar**).
**Fix tasks**: (1) R32 — intruso ordenando por último; (2) R39 — fixtura com as duas fichas do mesmo e-mail; (3) R22 — recuo do CPF. Opcional: R44.
**Lições**: L-088 (conferência por índice ordenado), L-089 (desempate de dono em SQL), e a evidência r2 em L-086.

---

## Fecho das lacunas da rodada 2 — 2026-10-31 (sem rodada 3)

Autor = quem consertou (não é verificação independente). Os quatro sobreviventes a fechar (R32, R39, R22 e o opcional R44) foram reinjetados no arquivo REAL, um por vez, por um arnês que lança quando o trecho alvo não aparece exatamente uma vez e restaura com SHA-256 conferido. **4 mutantes, 4 mortos por asserção, 0 por compilação, SHA-256 conferido nos 4.** Nenhum código de produto mudou: o código de hoje fazia o certo nos quatro pontos; faltava a prova.

| # | Lacuna | Conserto (só teste/probe) | Mutante reinjetado ⇒ quem mata |
| --- | --- | --- | --- |
| 1 | R32 — PRC-03, a checagem de tamanho de `lockedProposalCharge` | +1 em `mercado-pago/__tests__/proposalCharge.test.ts`: linha a mais com `product_id` `ffffffff-…`, que ordena DEPOIS das travadas (o caso asserta a ordenação antes) ⇒ 422, nenhum `fetch` ao MP, nenhum update | R32 (sem `travadas.length !== doPedido.length`) ⇒ o caso novo (1 de 20) |
| 2 | R39 — CON-12/A-08, "a ficha com conta vence" | probe `01-proposta.sql`: fixtura com o mesmo e-mail em duas fichas, a sem conta 30 dias mais antiga (conferida), e `save_order_proposal` sem `customer_id` ⇒ `customer_id` = a ficha com conta, no retorno e na linha gravada. **49 `ok —`**, exit 0; `01-proposta.saida.txt` regravado | R39 (`(c.user_id is null)` → `is not null`) ⇒ `PROBE FALHOU` no caso novo (os 48 anteriores passam) |
| 3 | R22 — o recuo do CPF da proposta no `create-order` | +1 em `checkout/__tests__/proposal.test.ts`: CPF vazio, só pontuação e ausente ⇒ `12345678909` da proposta; um CPF digitado diferente, com máscara, vence e vai só com dígitos | R22 (sem `|| row.customer_document`) ⇒ o caso novo (1 de 49) |
| 4 | R44 — "Grátis" no resumo do link (opcional) | +1 em `pages/__tests__/ProposalCheckoutPage.test.tsx` (página real): proposta com `coupon_free_shipping` ⇒ o resumo diz "Grátis" (a palavra do `OrderSummary` de `/checkout`), não "R$ 0,00", e o total é 237,50 | R44 (a condição → `false`) ⇒ o caso novo (1 de 17) |

R16, R19 e R25 continuam equivalentes de efeito declarados, sem conserto (a análise da r2 vale).

### Gate (um workspace por vez, `--testTimeout=20000` sem o `--`, exit fora de pipe)

| Workspace | Antes (fecho r1) | Agora | Delta |
| --- | --- | --- | --- |
| functions | 1411/38 | **1413/38** | +2 |
| store | 6475/347 | **6476/347** | +1 |

Os dois exit 0. `tsc` store 0; eslint no arquivo de teste do store limpo. Core e backoffice não foram tocados nem remedidos (nenhum arquivo deles mudou). Migration intocada (SHA-256 `90e5db0b…` antes e depois da mutação).

---

## Rodada 3 — 2026-10-31 — **FAIL ❌** (cobertura; nenhum defeito de produto confirmado)

**Verifier**: sub-agente independente, sem o contexto de quem escreveu nem de quem fechou a r1/r2. Árvore sobre `e5fd174c`, sem commit. Arnês próprio (`scratchpad/r3/run.py`): cada mutante injetado no arquivo REAL, um por vez, recusado quando o trecho alvo não aparece exatamente uma vez, só as suítes do assunto, morte classificada (asserção × compilação: `Transform failed`/`SyntaxError`/`Failed to parse`; para SQL, `PROBE FALHOU`), restauração com SHA-256 conferido byte a byte — **os 65 conferiram**. Nada de commit, nada de stash. `git status --porcelain`: 94 caminhos antes e depois.

### Gate (re-medido aqui)

| Conjunto | Resultado |
| --- | --- |
| core `proposals payment coupons hooks notifications routes checkout` | 1190/1190 (47 arquivos), exit 0 |
| functions `order-proposals checkout mercado-pago _shared` | 648/648 (21), exit 0 |
| store (página do link, `proposal-checkout`, `features/checkout`, `app/__tests__`, `entities/order`, `entities/address`, guardas `pedidoMontadoSchema`/`proposalTokenComDonoUnico`/`pedidoComDonoUnico`) | 1096/1096 (64), exit 0 |
| backoffice (`order-proposal`, as quatro páginas, `entities/product`, `entities/customer`, `order-list`, `RecordPageHeader`) | 446/446 (26), exit 0 |
| probe `01-proposta.sql` (Postgres local 54442, reaplica a migration do disco) | exit 0, **49** `ok —` |

Suítes inteiras, tipos, lint e build não remedidos (nenhum arquivo mudou desde o fecho da r2 além do que a r2 mediu).

### O fecho da r2 — re-derivado

| Reteste | Mutante | Resultado |
| --- | --- | --- |
| V11 / R32 | `lockedProposalCharge` sem `travadas.length !== doPedido.length` | ✅ morto (1, functions) |
| V12 / R39 | `save_order_proposal` com `order by (c.user_id is not null)` | ✅ `PROBE FALHOU` |
| V13 / R22 | `create-order` sem `\|\| row.customer_document` | ✅ morto (1) |
| V14 / R44 | "Grátis" → `false ? (` em `ProposalSummary.tsx` | ✅ morto (1, store) |

**As lacunas da r2 estão fechadas.** Os literais da spec foram reconferidos por busca: os 20 textos de `CON-02/03/08/09/10`, `LNK-01/02/03/04`, `MON-06/08/10`, `PRC-02`, `HIS-01/02` e o aviso de `LNK-05` (`RENEW_WARNING`) aparecem por extenso em ao menos um arquivo de teste.

### Spec-anchored — mudanças em relação à r2

A tabela da r1 (com as mudanças da r2) continua valendo. Mudanças:

| AC | r2 | r3 | Por quê |
| --- | --- | --- | --- |
| PRC-03 | ⚠️ (R32) | ⚠️ | R32 fechado; **P07** novo: a RPC copia `order_items.unit_price` da linha da proposta e o probe não distingue `unit_price` de `list_price` |
| CON-12 | ⚠️ (R39) | ✅ | R39 fechado (V12) |
| CON-04 | ✅ | ⚠️ | **K23**, **K30**: a function ignora o endereço editado no corpo / devolve a proposta pública sem o e-mail, com tudo verde |
| A-11 / PRC-06 | ✅ | ⚠️ | **K25** (function) e **S13** (página): o frete grátis por faixa no link não tem prova com o interruptor **desligado** nem com a faixa **alcançada** na página |
| A-05 / PRC-01 | ✅ | ⚠️ | **F15**: promoção **inativa** entra no preço travado da proposta |
| MON-05 | ✅ | ⚠️ | **B09**: com duas variações oferecíveis, a linha escolhe a primeira sozinha |
| PRC-02 | ✅ | ⚠️ | **F24**: a tolerância de "mesmo valor" (meio centavo) pode subir a 50 centavos |
| CON-08 / falha de leitura | — | ⚠️ | **K20**: falha ao ler a proposta vira "Este link não está mais disponível" (404) em vez de 502 |
| (recuo do CPF) | ⚠️ (R22) | ✅ | V13 |

**Status**: 37/44 ✅ · 7 ⚠️ (PRC-03, CON-04, A-11/PRC-06, A-05/PRC-01, MON-05, PRC-02, e a leitura que falha em `get-proposal`) · 0 ❌.

### Discrimination sensor — 61 mutantes novos + 4 retestes = 65 (1 alvo inválido, N05, refeito como N05b)

Todas as mortes por **asserção** (nenhuma por compilação); as de SQL por `PROBE FALHOU` (P13 por erro de constraint no probe — o duplo clique viraria duas propostas, exit 3).

| Id | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| N01 | `core/proposals/pricing.ts` | avulso em reais `<= 0` → `< 0` (zero aceito) | ✅ 1 |
| N02 | idem | % `> 99,99` → `>= 99,99` | ✅ 2 |
| N03 | idem `proposalPricing` | avulso travado aplicado como `percent` | ✅ core 9 · fn 8 |
| N04 | idem | método sempre `card` (sem PIX) | ✅ core 4 · fn 2 |
| N05b | idem `priceProposalDraft` | sem a segunda conta (frete R$ 1) quando o total zera | ❌ sobrevive — **baixo** (números do resumo de uma montagem já recusada) |
| N06 | `core/coupons/rules.ts` | pedido mínimo `<` → `<=` | ✅ 2 |
| N07 | idem | expirado `<` → `<=` | ✅ 1 |
| N08 | `core/proposals/state.ts` | Duplicar só em aberta | ✅ core 3 · bo 3 |
| N09 | `core/proposals/link.ts` | origem com barra final não aparada | ✅ core 1 |
| N10 | idem | ano trocado (`dd/mm` × `dd/mm/aaaa`) | ✅ core 3 · store 1 |
| N11 | `core/notifications/phone.ts` | `?text=` sem `encodeURIComponent` | ✅ core 2 · bo 1 |
| N12 | idem | `?text=` sempre (sem texto) | ✅ 3 |
| N13 | `proposalPricing` | faixa de frete grátis sobre o subtotal cheio | ✅ core 1 · fn 2 |
| K20 | `checkout/proposal.ts` `getProposal` | leitura da proposta falha ⇒ 404 "indisponível" (no lugar de 502) | ❌ **sobrevive** |
| K21 | idem `disponibilidade` | catálogo ilegível ⇒ tudo disponível | ✅ 1 |
| K22 | idem `createOrderFromProposal` | nome do corpo ignorado | ✅ 1 |
| K23 | idem | número da casa do corpo ignorado (o da proposta) | ❌ **sobrevive** |
| K24 | idem | `pix_discount_percent` da loja ignorado | ✅ 1 |
| K25 | idem | `free_shipping_enabled` forçado `true` | ❌ **sobrevive** |
| K26 | idem | `material_status` sem as linhas | ✅ 1 |
| K27 | idem | pedido sem `customer_id` da ficha adotada | ✅ 1 |
| K28 | idem | sem `persistirConveniencias` | ✅ 1 |
| K29 | idem | meio de pagamento livre | ✅ 1 |
| K30 | idem `publica` | `customer_email` vazio na proposta pública | ❌ **sobrevive** |
| K31 | idem | sem a recusa da retirada forjada | ✅ 1 |
| K32 | idem | frete do corpo zerado | ✅ 3 |
| F14 | `order-proposals/handlers.ts` `promocoesVigentes` | promoção vencida entra | ✅ 1 |
| F15 | idem | promoção **inativa** entra | ❌ **sobrevive** |
| F16 | idem `save` | CPF gravado com máscara | ✅ 1 |
| F17 | idem | e-mail sem `normalizeEmail` | ✅ 1 |
| F18 | idem `list` | estado sempre `open` | ✅ 1 |
| F19 | idem `list` | sem número do pedido | ✅ 1 |
| F20 | idem `get` | `actor_email` = uuid cru (`HIS-01`) | ✅ 1 |
| F21 | idem `get` | `actions` sempre de `open` | ❌ sobrevive — **equivalente de efeito**: o painel tipa `actions: unknown` e calcula as ações pelo `state` (`proposalsApi.ts:122`); campo morto na resposta |
| F22 | idem `save` | sem exigir `idempotency_key` | ✅ 1 |
| F23 | idem `cancel` | update de zero linhas responde "cancelada" | ✅ 1 |
| F24 | idem `mesmoValor` | tolerância 0,005 → 0,5 | ❌ **sobrevive** |
| P07 | migration `create_order_from_proposal` | `order_items.unit_price` ← `i.list_price` | ❌ **sobrevive ao probe** |
| P08 | idem | `orders.manual_discount` ← 0 | ✅ probe |
| P09 | idem | `orders.discount` ← 0 | ✅ probe |
| P10 | idem | sem o evento `completed` | ✅ probe |
| P11 | idem | gravação não copiada para `order_items` | ✅ probe |
| P12 | `save_order_proposal` | sem `version_conflict` | ✅ probe |
| P13 | idem | idempotência desligada (`where false`) | ✅ probe (erro de constraint) |
| P14 | idem | evento `created`/`edited` trocados | ✅ probe |
| P15 | `create_order_from_proposal` | nome do `p_order` ignorado | ✅ probe |
| S10 | `ProposalCheckoutPage.tsx` `semear` | telefone não semeado | ✅ 6 |
| S11 | idem | endereço não semeado | ✅ 8 |
| S12 | idem | CPF não semeado | ✅ 4 |
| S13 | idem | `freeShipping: null` (a página ignora a faixa) | ❌ **sobrevive** |
| S14 | idem | número da casa fora do `create-order` | ✅ 1 |
| S15 | `proposalToken.ts` | sem recuo ao `sessionStorage` (F5) | ✅ 1 |
| S16 | `ProposalCheckoutPage.tsx` | `indisponivel` sempre `false` | ✅ 2 |
| B08 | painel `entities/product/lib/estoque.ts` | sem "Sem estoque" | ✅ 2 |
| B09 | `order-proposal/model/lines.ts` | escolhe sozinho com `>= 1` variação oferecível | ❌ **sobrevive** |
| B10 | idem | oferecível sem `disponivel` | ✅ 1 |
| B11 | idem | `requires_material` sempre `false` (`MON-06`) | ✅ 1 |
| B12 | `model/draft.ts` | sem a recusa da gravação no "Criar link" | ✅ 1 |
| B13 | idem `toSavePayload` | gravação sem `normalizeEngraving` | ❌ sobrevive — **equivalente de efeito**: `order-proposals/handlers.ts:387` normaliza no servidor antes de gravar e de recusar |
| B14 | idem | sem a recusa do nome vazio | ✅ 1 |
| B15 | idem `draftFromProposal` | motivo do avulso perdido ao editar/duplicar | ✅ 4 |
| V11–V14 | (retestes da r2) | | ✅ 4/4 |

**Sensor**: 65 injetados · 53 mortos por asserção · 12 sobreviventes (2 equivalentes de efeito — F21, B13; 1 baixo — N05b; **9 a fechar**).

### Sobreviventes, ranqueados

1. **P07 — PRC-03: `create_order_from_proposal` copia o preço da linha sem prova.** Trocar `i.unit_price` por `i.list_price` no `insert into order_items` passa o probe (49 `ok —`): toda fixtura do probe tem `list_price = unit_price`. Consequência real: numa proposta com promoção travada, o pedido nasce com os itens a preço cheio, o painel e os e-mails mostram outro valor que o cobrado, e o `create-payment` (que confere as linhas por `lineKey` com o preço, R31) **recusa com 422** — a cliente não consegue pagar. **Fix**: fixtura do probe com `unit_price < list_price` numa linha e asserção de `order_items.unit_price` = o travado.
2. **K25 + S13 — A-11/PRC-06: o frete grátis por faixa no link.** Na function, forçar `free_shipping_enabled: true` passa (nenhuma fixtura de `create-order` tem faixa configurada com o interruptor desligado e subtotal acima dela); na página, passar `freeShipping: null` passa (nenhum caso tem a faixa alcançada). As duas metades da paridade "o total do link = o do pedido = o cobrado" ficam sem prova justamente no ramo em que a loja decide por configuração — com o interruptor desligado e a faixa preenchida (o estado de produção, `AD-027`), a function zeraria o frete que a página cobra. **Fix**: em `proposal.test.ts`, `store_settings.shipping` com `free_shipping_enabled: false` e faixa abaixo do subtotal ⇒ `p_order.shipping_cost` = o cotado; e o par ligado ⇒ 0. Na página real, `useShippingSettings` com a faixa alcançada ⇒ "Grátis" e o total sem frete.
3. **F15 — A-05/PRC-01: promoção inativa entra no preço travado.** Tirar `if (p.active !== true) return false` de `promocoesVigentes` passa: as fixturas de promoção são todas ativas (só a vencida tem caso, F14). A proposta travaria um desconto que a loja não oferece. **Fix**: caso com `promo({ active: false })` vigente ⇒ preço cheio na linha.
4. **K23 — CON-04: o endereço editado no link.** Trocar `nuloSeVazio(body?.address_number)` por `row.address_number` passa: as fixturas mandam no corpo o mesmo endereço da proposta. É o "Independent Test" da spec ("trocar o número da casa") — a página manda o número novo (S14 morre), mas a function poderia descartá-lo. **Fix**: corpo com número diferente do gravado ⇒ `p_order.address_number` = o do corpo (e o mesmo para pelo menos CEP e rua).
5. **K30 — CON-04/A-07: o e-mail na proposta pública.** `publica()` com `customer_email: ''` passa: os testes de `get-proposal` não asserem o e-mail (a página prova o campo a partir de um payload dublado). **Fix**: `expect(body.proposal.customer_email).toBe(<o da proposta>)`.
6. **K20 — falha de leitura vira "link indisponível".** Com o `select` da proposta falhando, devolver 404 `unavailable` no lugar de 502 passa. A loja trata 404 como CON-08 (frase final, sem "Tentar de novo"): um soluço do banco diria à cliente que o link morreu. O próprio `proposalApi.ts` da loja declara "falha de leitura lança — nunca vira indisponível"; falta a ponta do servidor. **Fix**: caso com erro na leitura de `order_proposals` ⇒ 502, sem `code: 'unavailable'`.
7. **B09 — MON-05: a variação escolhida sozinha.** `oferecivel.length === 1` → `>= 1` passa: nenhum caso de `acertoDaLinha` tem duas variações oferecíveis sem escolha. A peça com grade entraria com a primeira variação sem a Adri pedir. **Fix**: peça com duas variações disponíveis ⇒ `needsVariant: true`, `variant_id: null`.
8. **F24 — PRC-02: a tolerância de "o mesmo total".** `< 0.005` → `< 0.5` passa: os casos de `prices_changed` usam diferenças grandes. **Fix**: diferença de R$ 0,01 ⇒ 409.
9. **N05b — baixo.** Sem a segunda conta (frete R$ 1,00), o resumo de uma montagem recusada por A-12 mostra zeros no lugar dos números; a recusa continua. Fix opcional: asserção dos números do resumo no caso de A-12.

F21 e B13: equivalentes de efeito, sem fix (F21 sugere apagar o campo morto `actions` da resposta de `get`).

### Edge cases (re-derivados)

- [x] vence no meio, dois aparelhos, produto apagado, cupom + avulso < R$ 1,00, editar sem mudar — como a r1/r2 (P01, K12, `proposal.test.ts:192`, C05, probe).
- [~] sacola intocada no **PIX**: segue inferida (o `OrderPaymentPage` limpa a sacola só quando o `orderId` do rascunho **global** é o do pedido; a página do link usa o store por instância). Nenhum caso paga um pedido montado em `/pedido/:id/pagamento` com a sacola cheia — precisão, não sobrevivente.
- [~] só retirada / cotação falhou: coberto pelo `DeliveryBlock` reaproveitado, não remedido.

## Summary (rodada 3)

**Overall**: ❌ Not Ready — só cobertura; nenhum defeito de produto confirmado (o código de hoje faz o certo nos nove pontos). Esta é a **3ª rodada**: pelo limite da skill, as lacunas restantes vão ao usuário em vez de a uma rodada 4.
**Spec-anchored check**: 37/44 ✅ · 7 ⚠️ · 0 ❌. As lacunas da r2 (R32, R39, R22, R44) fechadas e retestadas.
**Sensor**: 65 injetados (61 novos + 4 retestes) · 53 mortos por asserção, 0 por compilação · 12 sobreviventes (2 equivalentes, 1 baixo, **9 a fechar**). SHA-256 conferido nos 65.
**Fix tasks**: (1) P07 fixtura com promoção travada no probe; (2) K25+S13 frete grátis por faixa nos dois lados, com o interruptor desligado e ligado; (3) F15 promoção inativa; (4) K23 endereço editado no `create-order`; (5) K30 e-mail na proposta pública; (6) K20 falha de leitura ⇒ 502; (7) B09 duas variações oferecíveis; (8) F24 diferença de um centavo. Opcional: N05b.
**Lições**: L-090 (fixtura com as duas colunas iguais), L-091 (interruptor de elegibilidade só no estado "ligado"), evidência r3 em L-086 (K23).
