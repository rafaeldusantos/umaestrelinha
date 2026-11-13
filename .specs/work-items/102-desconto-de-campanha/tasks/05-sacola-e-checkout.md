## 05 · [packages/core · supabase · apps/store · apps/mobile-adm · apps/backoffice] Sacola e checkout — o caminho do dinheiro

**Status:** done

`UC-05 (sacola e checkout) · RN-04 · RN-05 · RN-09 · RN-16 · RN-17` — 102

**Objetivo.** A sacola, o checkout e o servidor dão o mesmo total com a campanha: a peça de campanha é cobrada pelo preço com desconto, fica fora do cupom, da promoção progressiva e do Compre Junto, e o pedido guarda a campanha que o servidor resolveu.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines · CI e deploy · Feature-Sliced Design / Alias de import; `apps/store/CLAUDE.md` › A listagem de categoria / os filtros · Carrinho, chrome e checkout · A sacola v4; `packages/core/CLAUDE.md` › Dinheiro · Pureza; `supabase/CLAUDE.md` › Migrations · RLS — o molde que os guardas cobram · Compre Junto; `apps/mobile-adm/CLAUDE.md` › Montar pedido (WI 94). Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · spec.md — Código; §7 · spec.md — Decisões (T1, T2, T3, T4, T7, T10, H-05, H-06).

**Depende de.** 01 — tabelas, `order_items.campaign_id`, `packages/core/src/campaigns/`. 04 — o preço efetivo no mapeador, `apps/store/src/entities/campaign/` e o selo em linha. Confira que existem antes de começar.
**Habilita.** 09: `resolveOrderPricing` com `campaign`, `couponRefusal` com o subtotal elegível e o nome da campanha, e `supabase/functions/_shared/campaigns.ts`.

### Critérios de aceite

### UC-05 · A peça na loja, durante a vigência
- Cartão: o selo, o preço com desconto e o preço cheio riscado ("De R$ 209,90" para leitor de tela).
- Página do produto: o selo em linha acima do nome, o preço com desconto, o cheio riscado, as parcelas e o PIX
  calculados sobre o preço com desconto.
- Sacola e checkout: o item com o preço com desconto e o cheio riscado; o Total igual ao que o servidor cobra.
- Fora da vigência, nada disso aparece, mesmo com a peça marcada.
- Se a campanha acabar enquanto a cliente está na sacola ou no checkout, a loja mostra o total novo e pede que ela
  confirme de novo; nunca é cobrado um valor maior que o mostrado. Se a campanha começar nesse meio-tempo, a sacola
  passa a mostrar o preço com desconto na próxima vez que for aberta.

- **RN-04 · Um dono do preço de campanha, em `core`.** A mesma função responde "quanto custa esta peça/variação
  agora" para o cartão, a página do produto, a sacola, o checkout, a function `checkout` (`unit_price`,
  `full_unit_price`), a function `mercado-pago` (que reprecifica pelo banco), o feed do Google e o JSON-LD. Uma tela
  calculando à parte daria um preço exibido e outro cobrado — o "defeito 01" no caminho do dinheiro. A função é
  alcançável pelo Deno (arquivo com `.ts` explícito, sem import de pacote). O pedido montado pela dona, no painel ou
  no app do ateliê, segue a mesma regra: durante a vigência, a peça marcada entra com o preço da campanha (a dona ainda
  pode dar um desconto combinado por cima), o cupom não vale para ela, e o preço fica travado na proposta como hoje.

- **RN-05 · O servidor cobra o desconto, e só em vigência.** O `mercado-pago` recalcula o preço pelo banco
  (`handlers.ts` ~578) e passa a aplicar a campanha pela função de RN-04, com o relógio dele. Pedido criado durante a
  vigência e pago depois do fim: vale o preço gravado no pedido (Decisão D-05); o `mercado-pago` não reprecifica um
  pedido já criado com campanha.

- **RN-06 · Desconto não soma com o "de/por".** Peça com `compare_price` maior que o preço: o preço cheio é o
  `compare_price`; o cobrado é o **menor** entre o preço de hoje e o cheio com o desconto da campanha. Nunca os dois
  descontos multiplicados. O preço com desconto é arredondado para o centavo mais próximo (meio centavo para cima), por unidade: 15%
  sobre R$ 199,90 é R$ 169,92. A loja, o servidor e o Google mostram o mesmo centavo.

- **RN-09 · O pedido guarda o que foi cobrado.** `order_items.unit_price` (cobrado) e `full_unit_price` (cheio) já
  existem; a campanha e o percentual da linha são gravados junto. Campanha usada em pedido não é apagada.

- **RN-16 · Cupom não vale em peça de campanha** (Decisão D-03). Durante a vigência, a linha da sacola com peça
  marcada fica **fora da base do cupom**: o cupom de percentual ou de valor desconta só das outras linhas. Sacola só
  com peças de campanha ⇒ o cupom é recusado com o motivo ("Este cupom não vale para peças da Black Friday."; o nome
  vem da campanha). A regra mora em `resolveOrderPricing` (`packages/core/src/payment/pricing.ts`), que a loja e o
  `mercado-pago` chamam — é a primeira mudança desta campanha no código de dinheiro, e a suíte de `payment` ganha os
  casos sem perder nenhum. O que acompanha a regra (D-06):
  - o **PIX** continua valendo sobre o total, com peça de campanha ou não;
  - o **cupom de frete grátis** continua valendo: ele zera o frete, não desconta a peça;
  - o **valor mínimo** do cupom é conferido sobre as linhas que entram na base (sem as peças de campanha).
  - o **frete grátis por valor** conta a soma do que a cliente paga pelas peças, já com o desconto da campanha.

- **RN-17 · Promoção progressiva e Compre Junto também não descontam peça de campanha** (D-07). Durante a vigência,
  a peça marcada não conta para a faixa da promoção progressiva por quantidade (feature 17) e não recebe o desconto
  da compra casada (WI 92) — nem como principal, nem como adicional. As duas regras moram no mesmo código de preço
  (`resolveOrderPricing` e `core/buy-together`) e ganham o mesmo recorte do cupom. Na sacola, a frase da próxima faixa
  da promoção ("Falta 1 para…") e o desconto do conjunto passam a ignorar as peças de campanha, para a tela não
  prometer o que o servidor não dá. A oferta do checkout ("leve também") numa peça de campanha cobra o menor preço entre o da campanha e o da
  oferta, nunca os dois descontos somados.

- **CA-03** Marcar 20% numa peça de R$ 209,90, em vigência ⇒ cartão, página do produto, sacola e checkout mostram
  R$ 167,92 com R$ 209,90 riscado e o selo "BLACK FRIDAY · −20%"; o servidor cobra R$ 167,92 (antes de PIX, cupom e
  frete).

- **CA-04** A mesma peça antes do início e depois do fim: preço de sempre, sem selo, fora da vitrine — na loja e no
  servidor.

- **CA-07** Tirar da campanha (ou encerrar a campanha) devolve o preço de sempre em todas as superfícies, e
  `price`/`compare_price` no banco são os mesmos de antes.

- **CA-13** Um pedido feito com a peça marcada guarda o preço cobrado, o cheio, a campanha e o percentual; encerrar
  a campanha depois não muda o pedido.

- **CA-16** Sacola com uma peça de campanha (R$ 167,92) e uma peça comum (R$ 100,00), cupom de 10%: o cupom desconta
  R$ 10,00 (só da comum); a loja e o servidor dão o mesmo total. Sacola só com peças de campanha: o cupom é recusado
  com o motivo. Cupom de frete grátis continua zerando o frete. O PIX de 5% vale sobre o total.

- **CA-17** Promoção progressiva "3 peças da categoria por R$ X" com duas peças comuns e uma de campanha na sacola: a
  faixa não é alcançada (a de campanha não conta) e a sacola não promete o preço da faixa. Conjunto do Compre Junto
  com uma peça de campanha: o desconto do conjunto não vale para ela, na sacola e no servidor.

(Nesta tarefa: a sacola, o checkout e o servidor; o cartão e a página do produto são da tarefa 04.)

### Design — o que a tela faz

Sacola (spec.md › Design › "Selo · em linha"): na linha do item, o valor com desconto com o cheio riscado ao lado; na fileira de chips, o selo em linha da campanha no lugar do chip de desconto. Campanha que acabou entre a sacola e o pagamento: a tela de "o valor mudou" que já existe para o 422 `promotion_no_longer_valid`.

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| `resolveOrderPricing` (`packages/core/src/payment/pricing.ts:673`) | VOCÊ MUDA | por linha, opcional, `campaign: { percent } \| null` | `campaignDiscount`; sem `campaign`, saída idêntica, inclusive a forma |
| `couponRefusal` (`packages/core/src/coupons/rules.ts`) | VOCÊ MUDA | contexto com subtotal elegível e nome da campanha | a recusa "Este cupom não vale para peças da {nome}." |
| migration: `order_items.campaign_percent`, `compare_unit_price`; `orders.campaign_discount`; `order_charge_locks.campaign_discount`; `order_list` recriada com `campaign_discount` no fim | VOCÊ CRIA | — | — |
| `supabase/functions/_shared/campaigns.ts` | VOCÊ CRIA | client e relógio injetados | a campanha em vigência e as marcações, decidida por `core/campaigns/live.ts` |
| `create-order` (`supabase/functions/checkout/handlers.ts`) | VOCÊ MUDA | o `campaign_percent` **exibido** por linha (só comparação) | grava a campanha que ele resolveu; 422 se a dele for menor |
| `create-payment` (`supabase/functions/mercado-pago/handlers.ts`) | VOCÊ MUDA | — | aplica a campanha gravada; teto com `campaign_discount`; `min_order` |
| preço efetivo e `entities/campaign` da loja | JÁ EXISTE (tarefa 04). Consuma; não altere. | `mapDbToProduct` com o embed `PRODUCT_CAMPAIGNS_EMBED` (nos dois `select`) | `Product.price`/`compare_price` e o `price`/`compare_price` de cada variação **já com a campanha** (efetivo e cheio); `Product.campaign` (`ProductCampaign`: `id`, `name`, `badge_text`, `band_color`, `accent_color`, `ends_at`, `percent`, `list_prices` — os preços de TABELA da peça e de cada variação, por id) ou `null`. Para passar preço cheio + campanha a `resolveOrderPricing`, leia `campaign.list_prices`; reaplicar a campanha sobre `price` daria desconto em dobro. Selo em linha: `CampaignBadgeInline` (`@/entities/campaign`, props `campaign`, `percent`). Campanha em vigência: `useLiveCampaign()` (`null` = nenhuma) |
| `core/campaigns` | JÁ EXISTE (tarefa 01). Consuma; não altere. | | |

### Decisões já tomadas

- T1 (verbatim): A sacola e o checkout passam a precificar cada linha pela função de preço de campanha (RN-04) sobre o catálogo **relido** (a mesma consulta da vitrine, com as marcações em vigência), e não pelo `unitPrice` congelado: o `unitPrice` persistido fica só como valor de exibição até a releitura chegar. A mesma releitura alimenta o frete grátis por faixa e o `insurance_value`. Sem migração de `version` do `persist`.
- T2 (verbatim): A entrada de `resolveOrderPricing` ganha, opcional, `campaign: { percent } | null` por linha (ausente ⇒ resultado idêntico); a saída ganha `campaignDiscount`, descontado explicitamente antes do resíduo do bump; `full_unit_price` continua sendo o preço de tabela; `order_items` ganha `campaign_id`, `campaign_percent` e `compare_unit_price`, gravados pelo recálculo do servidor em `regravarLinhas`, nunca copiados do corpo; `orders` ganha `campaign_discount`. O recálculo passa a ler `original_price`/`compare_price`.
- T3 (verbatim): A function `checkout` resolve, com o relógio dela, a campanha em vigência e a marcação de cada peça, e grava `campaign_id`/`campaign_percent` (fora de `COLUNAS_DOS_ITENS`, como a marca "acompanha"); o `mercado-pago` aplica a campanha **gravada na linha**, sem reavaliar a vigência. `chavesDoItemDoPedido.test.ts` e o teste de `linhaDoItem` provam que a campanha vinda do corpo é descartada.
- T4: a campanha entra na guarda de teto (recalculado menor que o exibido ⇒ 422 com o mesmo código e corpo do "Um desconto deste pedido mudou", antes de qualquer cobrança); a loja relê as marcações ao abrir o checkout e ao voltar o foco.
- T7: centavos inteiros por unidade, meio centavo para cima.
- T10 (verbatim): (1) a base do cupom sem as linhas de campanha em `resolveCouponDiscount`/`priceOnePath`; (2) a recusa com o nome da campanha e o mínimo sobre a mesma base em `couponRefusal`, que ganha no contexto o subtotal elegível e o nome da campanha, chamada pela loja também quando a sacola muda, por `order-proposals` e pelo `mercado-pago` (que passa a conferir `min_order`, com o cupom recusado virando `null`).
- H-05 (verbatim): A loja manda por linha o `campaign_percent` **exibido** (só para comparação, nunca gravado). O `create-order` resolve a campanha com o relógio dele: desconto de campanha do servidor **menor** que o exibido em alguma linha ⇒ 422 `promotion_no_longer_valid` com o mesmo corpo, nada gravado; **maior** (a campanha começou) ⇒ grava o do servidor. `orders.campaign_discount` é calculado pelo servidor. O `create-payment` aplica a campanha gravada (D-05) e a guarda de teto inclui `campaign_discount`.
- H-06: um leitor só para as functions, `supabase/functions/_shared/campaigns.ts`, com client e relógio injetados; a promoção progressiva não é tocada.
- H-01: `buyTogetherDiscountedPrice` não muda; a peça de campanha sai do casado.
- RN-17 / D-07: o "leve também" numa peça de campanha cobra o menor, nunca os dois descontos.
- H-12: Migration: só no banco local (`supabase migration up --local`, nunca `--linked`). Nome `supabase/migrations/<prefixo>_102-<slug>.sql`; o prefixo é o próximo livre **a partir de** `20261130130000` (spec.md › Decisões H-12) — apure na hora com `ls supabase/migrations`, e se o WI 101 já tiver um prefixo igual na árvore, use o seguinte.
- Ordem de publicação (T20): migration → functions (`checkout`, `mercado-pago`) → bundles.

### Siga a forma de

| O que você vai escrever | Imite |
| --- | --- |
| campo opcional no cálculo | `packages/core/src/payment/pricing.ts:65 manualDiscount`, `:74 buyTogether` |
| marca gravada pelo servidor | `supabase/functions/checkout/handlers.ts:276-301 — COLUNAS_DA_MARCA, linhaDoItem` |
| guarda de teto e 422 | `supabase/functions/mercado-pago/handlers.ts:798-846` |
| cobrança travada | `mercado-pago/handlers.ts:478-509 — lockedFirstCharge`; `20261115120000_98-preco-travado.sql:25-39` |
| recriar view acrescentando no fim | `supabase/migrations/20261110160000_pedido-montado-desconto-na-lista-de-pedidos.sql` — a `order_list` vigente; copie a lista dela sem reordenar e acrescente `campaign_discount` depois de `manual_discount` |
| leitor com client injetado | `packages/core/src/order-actions` (client e notificador injetados) |
| resumo de descontos | `packages/core/src/orders/summary.ts:55,94` |

### Testes

- Unidade (`payment`): sem `campaign`, saída idêntica (a suíte de `payment` só ganha casos); CA-03 (R$ 167,92 antes de PIX, cupom e frete); CA-16 inteiro (cupom de 10% desconta R$ 10,00 só da comum; sacola só de campanha recusa com "Este cupom não vale para peças da Black Friday."; frete grátis zera o frete; PIX de 5% sobre o total; mínimo só nas comuns); CA-17 (a faixa não alcançada com a peça de campanha; o casado não desconta a peça de campanha como principal nem como adicional); o bump numa peça de campanha cobra o menor; `campaignDiscount` fora do resíduo do bump.
- Handlers (`checkout`): grava a campanha que resolveu e descarta `campaign_*` do corpo; 422 quando a exibida acabou; antes e depois da vigência, nada.
- Handlers (`mercado-pago`): aplica a campanha gravada depois do fim (D-05); teto com `campaign_discount`; `min_order` não atingido vira `null`; a linha partida em `regravarLinhas` preserva a campanha; pagar de novo com o `campaign_discount` travado.
- Guarda: `chavesDoItemDoPedido.test.ts`; `wiringResolve.test.ts`; `denoReach` do que as functions importam; guarda de schema da migration (uma régua por comando).
- Página real (jsdom): a sacola com uma peça posta antes do início mostra o preço de campanha depois da releitura; o checkout relê ao voltar o foco e o 422 mostra o total novo; a frase da próxima faixa da promoção ignora a peça de campanha; o resumo do pedido com a linha da campanha (loja, painel e app).
- Probe HTTP local: `create-order` → `create-payment` dentro e fora da vigência e com corpo forjado (functions servidas com `supabase functions serve --env-file` com chaves externas inválidas).

### Obrigações

- `packages/core/src/payment/**` muda: `displayedEqualsCharged.test.ts` e a suíte de `payment` sem perder caso.
- `.ts` explícito em tudo que as functions importam de `core`, `import type` incluso.
- `pedidoComDonoUnico`, `pedidoGravadoSoPeloDono`, `orderNumberSchema`, `situacaoComDonoUnico` verdes.
- `quotePayload.test.ts`: o seguro com o preço relido, por unidade.
- Nesta onda, só esta tarefa edita `packages/supabase/src/types/` dos pedidos e cria migration com hora `13`.

### Não faça

- O cartão e a página do produto (tarefa 04); a vitrine (06); o bloco da Home (07); o feed (08); `order-proposals` e o pedido montado (tarefa 09); mudar a promoção progressiva, o cupom ou o Compre Junto fora das peças de campanha (Fora do PRD); o frete grátis no servidor (Não resolvido, H-07); `apps/store/CLAUDE.md` (nesta onda é da tarefa 06).

### Pronto quando

- [ ] CA-03, CA-04 e CA-07 na sacola, no checkout e no servidor; CA-13, CA-16 e CA-17 provados por teste e pelo probe HTTP
- [ ] a migration aplicada no banco local
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório

---

### Confira cada citação desta tarefa quando for usá-la

Todo `caminho:linha` daqui — `Siga a forma de`, `Contrato`, `Obrigações`, `Design` — foi
escrito antes de qualquer tarefa rodar, e as tarefas anteriores mexeram na mesma árvore. Abra
cada um no momento em que ele é usado — o exemplar antes de escrever o artefato, o contrato
quando a fatia o consome —, e nenhuma linha se escreve apoiada em citação não conferida: a
linha deslocou, relocalize pelo alvo que a citação nomeia e siga, registrando no retorno; o
arquivo não está mais lá, é `citação morta` — a regra abaixo manda concluir e propagar sempre
que dê para concluir, e o histórico do Git ainda serve de exemplar.

### Se algo aqui não bater com o repositório

A rota `JÁ EXISTE` não está lá, o exemplar sumiu, a tabela tem outra forma. Dá para concluir
mesmo assim: siga, feche e propague. Não dá: pare e relate até onde chegou. Não conserte
contrato por conta, não improvise, não crie o que era de outra tarefa.

**Propagar** é corrigir, nos arquivos seguintes de `tasks/`, cada afirmação que a sua descoberta
tornou falsa — só a afirmação, e nada mais do arquivo. Feito isso, a divergência está resolvida:
ela vai no seu retorno como registro, não como pendência para alguém decidir.

**Propagar é só para frente.** Afirmação de tarefa de número MENOR, já fechada, que a sua
mudança tornou falsa **não se reescreve**: reescrever o `Pronto quando` de tarefa encerrada
apaga o registro do que de fato foi verificado quando ela fechou. Registre a caducidade na
linha `Caducou` do seu retorno — a tarefa, a afirmação e o que a tornou falsa — e siga.

### Se a verificação não fechar

Leia o erro, corrija, rode de novo. Continuando sem passar, não declare pronto: relate o que
falha, com a saída. Nunca desative teste, marque skip, afrouxe asserção, ignore lint ou
silencie erro de tipo.

### O que devolver no fim

```
Tarefa: <nn>
Caso: fechou limpo | fechou com divergência | parou
Instruções lidas: <os caminhos, raiz e módulos>
Testes escritos: <um por comportamento do bloco `Testes`, com o arquivo; o que ficou sem
  cobertura, e por quê>
Verificações: <o que rodou, e o resultado>
Árvore de trabalho: <o que você alterou; nada é commitado por você>
Citações conferidas: <quantas você abriu ao usá-las; a que deslocou, e a que estava morta>
Propagado: <a tarefa, e o que você corrigiu no arquivo dela>   (só se houve divergência)
Caducou: <tarefa já fechada · a afirmação dela que ficou falsa · o que a tornou falsa>
                                                               (só se houve; não se reescreve)
Bloqueio: <motivo · até onde você chegou>                      (só se parou)
```
