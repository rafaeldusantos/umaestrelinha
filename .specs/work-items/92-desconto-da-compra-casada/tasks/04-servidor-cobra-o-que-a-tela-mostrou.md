## 04 · [supabase · store · core (testes)] Pagamento — o servidor cobra o que a tela mostrou (e as duas telas de "o valor mudou")

**Status:** done

`UC-04 · CA-05.1 · CA-02.4 (paridade)` — 92

**Objetivo.** O pedido grava o preço cheio e o cobrado por linha e cada desconto por tipo; o `create-payment` recalcula o desconto casado pelo banco, recusa antes de cobrar quando o pedido ficou mais caro, e a loja mostra "o valor mudou" no checkout e no link.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy; `packages/core/CLAUDE.md` (inteiro); `apps/store/CLAUDE.md` › O bloco Compre Junto, O botão único leva o conjunto, Carrinho, chrome e checkout, A sacola v4 e a marca "acompanha", Minha conta e o detalhe do pedido; `supabase/CLAUDE.md` › Migrations, O Compre Junto, A marca "acompanha", O relatório de adesão, RLS, Edge functions, mercado-pago, checkout, send-notification; `.specs/LESSONS.md` › L-013, L-014, L-015. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (Checkout · o valor mudou; Link / Minha conta) e §4 — Código. É o rastreio da tarefa até a costura: quem executa abre esta seção quando precisa do contexto que a tarefa não repete.

**Depende de.** 02 — `bundleTotal` com o desconto; 03 — a entrada opcional e a saída `buyTogetherDiscount` de `resolveOrderPricing`, a regra do desconto casado e `core/pricing` sem `import type` de pacote. Confira que existe antes de começar.
**Habilita.** as colunas `orders.buy_together_discount`, `orders.order_bump_discount` e `order_items.full_unit_price`, com `unit_price` = preço cobrado — consumidas por 05, 07 e 08.

### Critérios de aceite

**UC-04 · O servidor cobra o que a tela mostrou**

- CA-04.1 A cobrança recalcula o desconto a partir da configuração do banco e do preço de catálogo, e não lê o desconto nem a marca vindos do navegador [pedido: Q-06; código: `mercado-pago/handlers.ts:428-559`, `marks.ts:8-10`]
- CA-04.2 Para o mesmo carrinho, a sacola, o checkout e a cobrança dão o mesmo total, ao centavo, nos dois meios de pagamento [código: `displayedEqualsCharged.test.ts`, `useCheckoutTotals.ts:1-5`]
- CA-04.3 O desconto casado mostrado é gravado no pedido numa coluna própria. Se, recalculado no pagamento, o pedido sair mais caro do que a tela mostrou (a dona baixou ou tirou o percentual), o pagamento é recusado antes de cobrar. Se sair igual ou mais barato — inclusive quando outro desconto passou a valer no lugar do casado —, o pagamento segue. Recusado o pagamento, no checkout a cliente vê o total novo e confirma a compra outra vez; pelo link do pedido ou por Minha conta, a página diz que o valor deste pedido mudou e mostra o contato da loja [gate: P-05, Q-10; PRD Tech Review r1; código: `mercado-pago/handlers.ts:668-701`]

**UC-05 · O pedido mostra o desconto**

- CA-05.1 Cada linha do pedido guarda o preço cheio e o preço cobrado daquela peça (com a oferta do checkout, promoção ou desconto casado) [gate: C-01; PRD Tech Review r1]

**UC-02 · A cliente vê o desconto no bloco da página do produto**

- CA-02.4 Sem promoção nem cupom valendo para essas peças, o total do bloco é o total da sacola com só a joia e as peças marcadas. Com promoção que dê preço menor que o desconto casado, ou com cupom, a sacola mostra o menor, e a diferença aparece só ali [código: RNF-04 do WI-01, revisada; PRD Tech Review r1]

**Requisitos não-funcionais**

- RNF-01 Exibido = cobrado, provado pela mesma função nas duas pontas, sem conta de desconto na tela [código: `useCartPromotion.ts:7-10`, `packages/core/CLAUDE.md:77-78`]

### Design — o que a tela faz

- Checkout · o valor mudou: `role="alert"`, título "O valor do seu pedido mudou"; "Desde que você montou a sacola, o desconto do Compre Junto do **{peça}** mudou. Por isso o pagamento não seguiu. Nada foi cobrado."; dois cartões "Antes" (riscado) e "Agora"; "Confirmar com o novo total" (principal) e "Voltar à sacola".
- Link do pedido / Minha conta · o valor mudou: "Pedido #NNNN"; título "O valor deste pedido mudou"; "Depois que este pedido foi feito, o desconto de uma das peças mudou, e o pagamento não pode seguir pelo valor de antes. Nada foi cobrado." e "Fale comigo para combinarmos como seguir com o seu pedido."; "Falar pelo WhatsApp" e "Escrever por e-mail" (contato de `store_settings`, com o portão de `PolicyContact`).
- Protótipo: Claude Design, "Uma Estrelinha - Loja", `Pedido - Desconto do Compre Junto.html` › telas "Checkout · o valor mudou" e "Link / Minha conta · o valor mudou".

Este recorte é a fonte: não vá ao design buscar o que não está aqui. Detalhe visual que ele não menciona resolve-se pelo design system do repositório.

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| `orders.buy_together_discount`, `orders.order_bump_discount` (`numeric(10,2) not null default 0 check (>= 0)`), `order_items.full_unit_price` (`numeric(10,2) null check (>= 0)`) | VOCÊ CRIA (migration nova) | — | lidos por 05, 07, 08 |
| `COLUNAS_DO_PEDIDO` e `COLUNAS_DOS_ITENS` (`supabase/functions/checkout/handlers.ts`) | VOCÊ ALTERA (as colunas novas) | corpo de `create-order` | — |
| o 422 do teto com código próprio (ex.: `buy_together_price_changed`) no `create-payment` | VOCÊ CRIA | — | código + frase |
| `resolveOrderPricing` com a entrada do desconto casado (de 03) | JÁ EXISTE. Consuma; não altere. | — | — |
| `bundleTotal` (de 02): `bundleTotal({ mainPrice, mainQty, addons: { price, discountPercent? }[] })` em `packages/core/src/buy-together/total.ts`, pelo barrel | JÁ EXISTE. Consuma no teste de paridade. | a joia × quantidade e as peças com o preço cheio da variação e o percentual | `{ total, discount }`: o total já descontado e o desconto do conjunto |
| o tipo da linha do pedido e de `orders` (`packages/supabase/src/types/index.ts`) | VOCÊ ALTERA | — | — |

Só o que ESTA tarefa cria ou consome. `JÁ EXISTE` é afirmação a conferir no código.

### Decisões já tomadas

- D-01/D-17: cada linha guarda o preço cheio (`full_unit_price`) e o cobrado (`unit_price`); o pedido guarda `buy_together_discount` e `order_bump_discount` ao lado de `promotion_discount`. Quem grava o definitivo é o `create-payment` (recalculado); a loja manda os exibidos na criação, que viram o teto.
- D-02/D-18: a linha mista vira duas linhas no pedido; antes de recalcular, o servidor junta as linhas da mesma peça (`product_id`, `variant_id`, personalização) para o bump não valer duas vezes.
- D-03: a guarda compara a soma dos descontos por item exibidos (Compre Junto, promoção, oferta do checkout) com a soma recalculada; recusa só quando o pedido sai mais caro.
- D-11: no par recíproco o servidor só usa a marca que ele validou (`checkout/handlers.ts › linhaDoItem`); sem marca válida, a de menor preço cheio da unidade. A asserção `not.toMatch(/accompanies/)` de `supabase/functions/checkout/__tests__/createOrder.test.ts` (perto da linha 1231) é INVERTIDA com sensor — não afrouxada.
- D-13: a mensagem "Recarregue a sacola para ver o novo total" (`mercado-pago/handlers.ts`, na guarda) sai; no checkout a cliente vê o total novo e confirma outra vez; pelo link ou Minha conta, "o valor deste pedido mudou" e o contato.
- D-08: o `purchase` do GA4 (`mercado-pago/analytics.ts`) e o valor declarado da etiqueta leem o preço cobrado; o pin personalizado (o ramo que usa `unit_price` como preço de origem, `mercado-pago/handlers.ts` perto de `:479-486`) passa a ler `full_unit_price`, com recuo para `unit_price`.
- D-10: guarda irmão de `chavesDoItemDoPedido.test.ts` cruzando por igualdade as chaves do pedido da loja com `COLUNAS_DO_PEDIDO`.
- C-01 corrige também bump e promoção: `unit_price` passa a ser o cobrado para todo pedido novo; pedido antigo fica como está.
- Migration só no banco local (`supabase migration up --local`); aditiva; o prefixo é o maior existente em `supabase/migrations/` + 1 hora (nunca repetir prefixo — `version` é a chave de `schema_migrations`).
- Toda regra com dois leitores mora em `packages/core`; o desconto nunca é calculado na tela.
- Tom memorial (RNF-06): sem "economize", sem exclamação, sem urgência.

### Siga a forma de

| O que você vai escrever | Imite |
| --- | --- |
| Servidor lendo configuração e decidindo em TS | `supabase/functions/mercado-pago/handlers.ts` — a leitura do bump e das promoções (perto de `:542-616`) |
| Guarda de teto 422 | `mercado-pago/handlers.ts` › `promotion_no_longer_valid` (perto de `:668-701`) |
| Coluna de desconto no pedido | `supabase/migrations/20260803130100_promotion-eligibility-and-order-columns.sql:92-101` (`promotion_discount`) |
| Guarda de chaves por igualdade | `apps/store/src/features/checkout/lib/__tests__/chavesDoItemDoPedido.test.ts` |
| Paridade exibido = cobrado | `packages/core/src/payment/__tests__/displayedEqualsCharged.test.ts` |
| `index.ts` só faz wiring (`AD-004`) | `supabase/functions/melhor-envio/handlers.ts` (lógica em `handlers.ts`, testável) |

Abra o arquivo antes de escrever o seu.

### Testes

- core: paridade bloco = sacola (CA-02.4) — `bundleTotal` e `resolveOrderPricing` dão o mesmo total para só a joia e as peças, sem promoção nem cupom.
- core: `displayedEqualsCharged.test.ts` estendido com desconto casado, bump, promoção e cupom (RNF-01, CA-04.2).
- functions: o pagamento ignora `unit_price` e marca forjados no corpo e recalcula pelo banco.
- functions: recusa (422, código novo) quando o pedido sai mais caro que o exibido; segue quando igual ou mais barato, inclusive quando outro desconto passou a valer no lugar do casado.
- functions: grava `unit_price` cobrado, `full_unit_price` e os descontos por tipo; a linha mista chega como duas linhas e o bump não vale duas vezes; o pin é cobrado pelo preço cheio numa segunda tentativa.
- functions: a criação guarda as colunas novas; o `purchase` leva o preço cobrado e soma o desconto casado.
- loja: o 422 no checkout mostra "O valor do seu pedido mudou" com antes/agora e "Confirmar com o novo total"; pelo link/Minha conta, "O valor deste pedido mudou" com o contato.
- guarda: as chaves do pedido da loja = `COLUNAS_DO_PEDIDO`, nos dois sentidos, com sensor.
- integração (Supabase local): o `create-payment` sobe no runtime local (depois de D-12) e dá o mesmo total da tela; 422 quando o percentual cai entre a criação e o pagamento (a chamada ao Mercado Pago com chave de teste ou valor inválido no `--env-file`, `supabase/CLAUDE.md` › mercado-pago); a criação grava as colunas novas (probe em `.specs/work-items/92-desconto-da-compra-casada/probes/`).

Escrever estes testes é parte da tarefa.

### Obrigações

- Ordem de publicação: migration → functions → bundles.
- `index.ts` só faz wiring; a lógica em `handlers.ts`.
- `AD-012`: gravação provada por probe HTTP no banco local; os testes que asserem o `update` dos itens com o preço de catálogo mudam com C-01 (reescritos com o comportamento novo, nunca afrouxados).
- Os guardas `chavesDoItemDoPedido.test.ts` (âncora de 14 colunas) e `pedidoComDonoUnico.test.ts` vão reprovar/precisar de atualização: atualize a âncora para o número medido.
- RNF-03 nos arquivos de `core` que as functions importam.

### Não faça

- Não mude a regra de cálculo em `pricing.ts` (é da 03) — só a consuma.
- Não toque nas telas da confirmação, Minha conta, e-mail (tarefa 05), painel do pedido (06), app do ateliê (07) nem no relatório (08).
- Não aplique o desconto casado no ramo do pedido montado (`proposal_id` sai antes do recálculo — Fora do PRD).
- Não aplique a migration no banco hospedado.

### Pronto quando

- [ ] o pedido grava o preço cheio e o cobrado por linha e os descontos por tipo (probe local)
- [ ] o 422 só quando o pedido sai mais caro, com as duas telas
- [ ] a paridade bloco = sacola e o `displayedEqualsCharged` estendido passam
- [ ] o `create-payment` sobe no runtime local
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
