## 03 · [core · store] Loja — a sacola e o checkout com o desconto do Compre Junto

**Status:** done

`UC-03` — 92

**Objetivo.** A sacola e o checkout aplicam o desconto da compra casada pela mesma função que o servidor vai chamar, com a linha mista, a frase de quando a joia sai, e o resumo com Subtotal cheio e a linha "Desconto do Compre Junto".

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy; `packages/core/CLAUDE.md` (inteiro); `apps/store/CLAUDE.md` › O bloco Compre Junto, O botão único leva o conjunto, Carrinho, chrome e checkout, A sacola v4 e a marca "acompanha", Minha conta e o detalhe do pedido; `.specs/LESSONS.md` › L-013, L-014, L-015. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (Loja — Sacola; Checkout · resumo) e §4 — Código. É o rastreio da tarefa até a costura: quem executa abre esta seção quando precisa do contexto que a tarefa não repete.

**Depende de.** 01 — `AddonConfig.discountPercent`, a coluna e a função do preço com desconto. Confira que existe antes de começar.
**Habilita.** a entrada opcional do desconto casado em `resolveOrderPricing` e a saída `buyTogetherDiscount` + a alocação por unidades (consumidas pela 04, no servidor e no payload); a regra do desconto casado em `core/buy-together`; `AD-073`.

### Critérios de aceite

**UC-03 · O desconto na sacola e no checkout**

- CA-03.1 Com o principal e o adicional na sacola, a peça adicional sai com o percentual da dona sobre o preço da variação escolhida, arredondado a centavo por item [pedido: Q-04; código: `pricing.ts:239-249`]
- CA-03.2 Cada unidade de uma joia principal na sacola dá desconto a uma unidade de uma peça que ela oferece (sem contar a unidade da joia cuja variação esconde o adicional). Com mais de uma joia, as unidades somam, e o maior percentual vale primeiro; entre linhas da mesma peça, o desconto vai primeiro para a de maior preço. O que passar disso sai a preço cheio. Na sacola e no checkout, a linha mista diz quantas unidades saem com desconto ("1 com desconto, 1 a preço cheio"), e no pedido ela vira duas linhas da mesma peça [gate: Q-01; PRD Tech Review r1]
- CA-03.3 Tirar o principal da sacola tira o desconto da peça na hora, como já some a frase "acompanha"; quando a peça entrou pelo Compre Junto, a linha dela diz que o desconto volta com aquela joia na sacola [pedido: Q-06; PRD Tech Review r1; código: `cartStore.ts:136-148`]
- CA-03.4 A peça adicional acrescentada sozinha, por outro caminho (catálogo, busca), recebe o desconto se o principal estiver na sacola [pedido: Q-06]
- CA-03.5 Se a peça também tem promoção ou é o order bump, vale o menor preço da linha, e esses descontos não se somam [pedido: Q-05 do WI 91; código: `pricing.ts:345-351`]
- CA-03.6 Com cupom aplicado, o desconto casado continua valendo, e o cupom incide sobre o subtotal já com ele, como com o order bump. Quando o cupom concorre com uma promoção, a loja compara o que cada um desconta além do desconto casado, e diz qual ficou de fora só se ele de fato desconta alguma coisa [gate: Q-03; PRD Tech Review r1]
- CA-03.7 O desconto PIX incide sobre o valor depois do desconto casado [pedido: Q-05 do WI 91; código: `pricing.ts:379-382`]
- CA-03.8 A gaveta e o checkout mostram "de/por" na linha da peça e a linha "Desconto do Compre Junto − R$ X" no resumo, com o mesmo valor [gate: Q-06, P-06]
- CA-03.9 Duas joias na sacola que dão percentuais diferentes à mesma peça: vale o maior percentual. Dentro da mesma joia, se a peça é um adicional avulso e também está numa lista, vale o percentual do adicional que a página mostra: a peça avulsa vem antes da lista, e entre listas vale a ordem da dona [gate: P-04; PRD Tech Review r1]
- CA-03.10 No par recíproco vale o desconto da peça levada pelo bloco (a que tem a marca 'acompanha'). Sem marca em nenhuma das duas, só uma recebe o desconto, a de menor preço cheio [gate: Q-09; PRD Tech Review r1]
- CA-03.11 Um adicional que a variação escolhida do principal esconde, ou uma variação da peça que a dona não liberou, não recebe o desconto [gate: P-03; código: `compre-junto.sql:70-71`, `availability.ts:43-45`]
- CA-03.12 Com a sacola já montada, se a dona muda o percentual, a sacola relê a configuração e mostra o valor novo [gate: Q-10]

**Requisitos não-funcionais**

- RNF-01 Exibido = cobrado, provado pela mesma função nas duas pontas, sem conta de desconto na tela [código: `useCartPromotion.ts:7-10`, `packages/core/CLAUDE.md:77-78`]
- RNF-02 Sem a configuração nova, o cálculo de qualquer pedido fica idêntico ao de hoje, inclusive a forma do objeto de totais [código: `pricing.ts:27-45`]
- RNF-03 O módulo de regra alcançável pelo Deno: todo import relativo com `.ts`, `import type` incluso [código: `CLAUDE.md` raiz › "Alias de import"]
- RNF-05 Mobile primeiro: o "de/por" no bloco e a linha do desconto na sacola e no checkout em 390×844 sem rolagem horizontal e sem quebrar em pílula [código: `CLAUDE.md` raiz › "Mobile é o caso principal"]

### Design — o que a tela faz

- Sacola, linha da peça com desconto: o valor cheio riscado em cima e o cobrado embaixo, à direita; "Acompanha o {joia} · N% a menos"; com mais unidades que a joia, "1 com desconto, 1 a preço cheio".
- A joia sai: a peça volta ao preço cheio e, quando entrou pelo Compre Junto, "O desconto de N% volta com o {joia} na sacola."
- Rodapé da sacola: "Subtotal" (soma dos preços cheios), "Desconto do Compre Junto − R$ X", e o total; sem frase sobre promoção ou cupom (H-03).
- Checkout (`OrderSummary`): item com "de/por", "Acompanha o {joia} · N% a menos" e a linha mista; linhas Subtotal (cheio) · Frete · Desconto do Compre Junto · Desconto progressivo (se houver) · Cupom {CÓDIGO} · Desconto PIX (N%) · Total; nota "O desconto do Compre Junto vale enquanto a joia estiver no mesmo pedido."
- Protótipos: `Produto - Compre Junto com desconto.html` (sacola) e `Pedido - Desconto do Compre Junto.html` › "Checkout · resumo" (exemplo: 372,00 − 11,65 − 36,04 − 16,22 + 18,90 = 326,99). No protótipo da sacola o desconto segue a marca só por ser protótipo; vale a presença (CA-03.4).

Este recorte é a fonte: não vá ao design buscar o que não está aqui. Detalhe visual que ele não menciona resolve-se pelo design system do repositório.

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| entrada opcional do desconto casado em `CalculateOrderTotalsInput`/`OrderPricingInput` e `variant_id?` em `PricingItem` (`packages/core/src/payment/pricing.ts`) | VOCÊ CRIA | os adicionais dos principais com o percentual, as variações e a marca validada (só para o par recíproco) | — |
| `buyTogetherDiscount` e a alocação por linha (unidades com desconto) na saída de `resolveOrderPricing` | VOCÊ CRIA (só existe quando a entrada veio — RNF-02) | — | o valor do Compre Junto; por linha, as unidades com desconto e o preço delas |
| a regra do desconto casado (folha nova em `core/buy-together`) | VOCÊ CRIA | carrinho, configuração | por linha: percentual e unidades |
| a precedência "avulsa antes da lista, entre listas a ordem" | VOCÊ EXTRAI de `availability.ts:152-160` (`claimed`) para uma função pura que `resolveAddons` e a regra chamam | — | — |
| o hook da configuração dos adicionais pelos principais da sacola | VOCÊ CRIA em `apps/store/src/entities/cart` | ids dos principais na sacola | as linhas de `product_buy_together` (com `discount_percent`) e as peças das listas |
| a função do preço com desconto (de 01): `buyTogetherDiscountedPrice(unitPrice, percent)` em `packages/core/src/buy-together/discount.ts`, pelo barrel; `AddonConfig.discountPercent` é opcional (ausente = sem desconto) | JÁ EXISTE. Consuma; não altere. | — | — |

Só o que ESTA tarefa cria ou consome. `JÁ EXISTE` é afirmação a conferir no código.

### Decisões já tomadas

- D-02: no cálculo a linha da peça se parte em duas (com desconto / a preço cheio); o order bump continua decidindo pela linha da sacola. D-18: a partição acontece na saída; o cálculo roda sobre as linhas da sacola. D-19: desempate entre linhas de mesmo preço pela ordem (índice).
- CA-03.2 em regra: cada unidade de joia dá desconto a uma unidade de peça (sem contar a unidade cuja variação esconde o adicional); com mais de uma joia as unidades somam e o maior percentual vale primeiro; entre linhas da mesma peça, a de maior preço primeiro.
- D-05/D-21: dentro da mesma joia vale o percentual do adicional que a página mostra (avulsa antes da lista, entre listas a ordem); a precedência sai de `availability.ts` para uma função pura, sem estoque — um dono só.
- D-06: base dos dois caminhos = itens com min(oferta do checkout, casado); `promotionDiscount` = base − cobrado; `buyTogetherDiscount` = soma(com bump) − base; a promoção só conta como aplicada se vencer algum item; o descartado só é nomeado quando de fato desconta. Escreva o `AD-073` em `.specs/STATE.md` emendando o `AD-015`: o desconto casado empilha com o cupom por decisão do gate (Q-03). Confira que `AD-073` ainda está livre.
- D-11: no par recíproco vale o desconto da peça levada pelo bloco (a marca "acompanha"); sem marca em nenhuma, a de menor preço cheio da unidade. Na loja a marca é a da sacola; no servidor (04) é a validada.
- D-12: troque o `import type` de `@estrelinha/supabase/types` em `core/pricing/index.ts:19-25` e `core/pricing/grid.ts:6` por tipos locais (precedente de `PromotionDiscountKind` em `pricing.ts`).
- D-20: principal sem grade (`variant_id` nulo) — a regra de esconder não se aplica.
- A conta do preço com desconto é da função de 01: `pricing.ts` e a regra a chamam, sem conta própria.
- Migration só no banco local (`supabase migration up --local`); aditiva; o prefixo é o maior existente em `supabase/migrations/` + 1 hora (nunca repetir prefixo — `version` é a chave de `schema_migrations`).
- Toda regra com dois leitores mora em `packages/core`; o desconto nunca é calculado na tela.
- Tom memorial (RNF-06): sem "economize", sem exclamação, sem urgência.

### Siga a forma de

| O que você vai escrever | Imite |
| --- | --- |
| Entrada opcional com saída idêntica | `packages/core/src/payment/pricing.ts › manualDiscount` (o comentário e o campo só existindo quando a entrada veio) |
| Desconto por item, menor vence | `pricing.ts › perItemMin`, `› resolveChargedItems` |
| Regra pura do Compre Junto | `packages/core/src/buy-together/marks.ts`, `availability.ts › resolveAddons` |
| Leitura de configuração na loja | `apps/store/src/entities/product/api/useBuyTogetherData.ts` |
| Linha de desconto no resumo | `apps/store/src/features/checkout/ui/OrderSummary.tsx` (a linha "Desconto progressivo" com `data-testid`) |

Abra o arquivo antes de escrever o seu.

### Testes

- unidade (`core`): sem a entrada nova, `resolveOrderPricing` é idêntico ao de hoje, comparado como objeto inteiro (RNF-02).
- unidade (`core`): joia + corrente 10% → 71,10 por item; PIX depois.
- unidade (`core`): 1 joia × 2 correntes → 1 com desconto, 1 cheia; duas joias somam unidades; maior percentual primeiro; linha de maior preço primeiro; desempate pela ordem.
- unidade (`core`): promoção que dá preço menor vence sem somar; bump vence; cupom acumula e incide sobre o subtotal já descontado; o descartado só é nomeado quando desconta.
- unidade (`core`): duas joias com percentuais diferentes → o maior; dentro da mesma joia, a avulsa antes da lista; par recíproco com e sem marca; variação escondida e não liberada sem desconto; principal sem grade.
- unidade (`core`): o desconto sai em `buyTogetherDiscount`, nunca em `promotionDiscount`.
- componente/página (loja): a gaveta e o checkout mostram a linha mista, a frase da volta, "Desconto do Compre Junto" e o mesmo valor nas duas; tirar a joia tira o desconto; peça pelo catálogo com a joia na sacola ganha o desconto; mudar o percentual (nova leitura) muda a sacola.

Escrever estes testes é parte da tarefa.

### Obrigações

- `payment/**` muda por declaração: RNF-02 provada por valor (objeto inteiro) nos testes existentes de `pricing.test.ts`, `orderBump.test.ts`, `progressive.test.ts` — eles não podem ser afrouxados.
- RNF-03: a folha nova e tudo o que `pricing.ts` importar com especificador relativo `.ts`, sem pacote; atualizar `packages/core/src/buy-together/__tests__/purity.test.ts` (lista exata e contagem) — você é o dono do barrel e desse teste nesta onda.
- "Defeito 01": a gaveta e o checkout chamam a mesma `resolveOrderPricing` com a mesma entrada; nenhuma conta na tela.
- O hook novo mora em `entities/` (uma camada abaixo de `widgets` e `features`, FSD).
- `packages/core` não tem lint (`BL-002`): os tipos (`npx tsc --noEmit -p packages/core/tsconfig.json`, 11 herdados) e os testes são o gate.

### Não faça

- Não grave nada no pedido nem mude `buildOrderPayload.ts`, a function `checkout` ou o `create-payment` (tarefa 04).
- Não mexa no bloco da página do produto nem em `bundleTotal` (tarefa 02).
- Não aplique o desconto no pedido montado pelo painel (`core/proposals` fica sem a entrada — Fora do PRD).
- Não faça a sacola guardar o percentual do momento em que a peça entrou (Fora do PRD).

### Pronto quando

- [ ] RNF-02: os testes existentes de `pricing` passam sem uma asserção tocada
- [ ] a gaveta e o checkout mostram o mesmo desconto, pela mesma função
- [ ] `pricing.ts` e a regra chamam a função de 01, sem conta própria
- [ ] `AD-073` escrito em `.specs/STATE.md`
- [ ] `core/pricing` sem `import type` de pacote
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório (`CLAUDE.md` › Comandos e `.specs/project/PROJECT.md` › Comandos de verificação)

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
