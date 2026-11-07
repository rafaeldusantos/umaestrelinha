## 07 · [mobile-adm · supabase] App do ateliê — o detalhe do pedido com o desconto do Compre Junto

**Status:** done

`CA-05.3 (app)` — 92

**Objetivo.** No detalhe do pedido do app do ateliê a dona vê a peça com "de/por" e o resumo com a mesma composição da loja, e o total é `orders.total`.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy; `apps/mobile-adm/CLAUDE.md` › Pedidos (feature 74), Os guardas do app, Testes; `supabase/CLAUDE.md` › Migrations, O Compre Junto, A marca "acompanha", O relatório de adesão, RLS, Edge functions, mercado-pago, checkout, send-notification; `.specs/LESSONS.md` › L-013, L-014, L-015. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (App do ateliê) e §4 — Código. É o rastreio da tarefa até a costura: quem executa abre esta seção quando precisa do contexto que a tarefa não repete.

**Depende de.** 04 — as colunas novas do pedido; 05 — a regra única do resumo em `core/orders`. Confira que existe antes de começar.
**Habilita.** nada.

### Critérios de aceite

**UC-05 · O pedido mostra o desconto**

- CA-05.3 No painel do pedido e no app do ateliê, a dona vê que houve desconto da compra casada e quanto, com a mesma composição do resumo da loja [PRD Tech Review r1; código: `AdminOrderPage.tsx:729`, `apps/mobile-adm/src/widgets/order-detail/ui/BlocoValores.tsx:40-49`]

### Design — o que a tela faz

- Sem fonte de design; siga o padrão de `BlocoValores`/`BlocoItens` (H-01): "de/por" na linha do item e a linha mista partida em duas; no bloco de valores, Subtotal (cheio) e uma linha por desconto, Frete e Total. Hoje `BlocoValores` mostra "Promoção" ao lado de um subtotal já líquido (L-014) — corrigido pela regra de `core/orders`.

Este recorte é a fonte: não vá ao design buscar o que não está aqui. Detalhe visual que ele não menciona resolve-se pelo design system do repositório.

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| `order_list` recriada com as colunas novas de `orders` no FIM | VOCÊ CRIA (migration nova; `create or replace view` só aceita coluna no fim — `20261028120000_82-envelope-da-cliente.sql:82-104`) | — | — |
| `COLUNAS_DO_DETALHE`, `COLUNAS_DOS_ITENS`, `PedidoDoDetalhe`, `ItemDoPedido` (`apps/mobile-adm/src/entities/order/model/linha.ts`) | VOCÊ ALTERA | — | — |
| a regra única do resumo: `orderSummary(order)` em `packages/core/src/orders/summary.ts` (barrel `@estrelinha/core/orders`), de 05 — entra o pedido com `order_items` (`unit_price`, `full_unit_price`, `quantity`, `product_id`, `accompanies_product_ids`…) e `subtotal`, `shipping_cost`, `discount`, `coupon_code`, `pix_discount`, `total`, `buy_together_discount`, `promotion_discount`, `order_bump_discount`; sai `{ detailed, subtotal, shipping, discounts: { key, label, amount }[], total, rows: { charged, full, buyTogetherPercent, showsCompanion }[] }` (`rows` alinhado com `order_items`; `detailed: false` no pedido sem `full_unit_price`) | JÁ EXISTE. Consuma. | — | — |

Só o que ESTA tarefa cria ou consome. `JÁ EXISTE` é afirmação a conferir no código.

### Decisões já tomadas

- Nenhuma regra no app do ateliê: a composição vem de `core/orders`; o total é `orders.total` (`apps/mobile-adm/CLAUDE.md` › Pedidos).
- Migration só no banco local (`supabase migration up --local`); aditiva; o prefixo é o maior existente em `supabase/migrations/` + 1 hora (nunca repetir prefixo — `version` é a chave de `schema_migrations`).
- Toda regra com dois leitores mora em `packages/core`; o desconto nunca é calculado na tela.
- Tom memorial (RNF-06): sem "economize", sem exclamação, sem urgência.

### Siga a forma de

| O que você vai escrever | Imite |
| --- | --- |
| Recriar `order_list` | `supabase/migrations/20261028120000_82-envelope-da-cliente.sql:82-104` |
| Resumo do app | `apps/mobile-adm/src/widgets/order-detail/ui/BlocoValores.tsx` (`Linha` com `data-parte`) |

Abra o arquivo antes de escrever o seu.

### Testes

- página real (app): o pedido com desconto mostra "de/por", a linha partida e "Desconto do Compre Junto", e o total é o do pedido; pedido antigo igual.
- integração (Supabase local): `order_list` traz as colunas novas e a lista exata de chaves do app bate (o probe `.specs/features/74-mobile-adm-pedidos/probes/02-lista.ts` exige EXATAMENTE as chaves — atualizar o esperado).

Escrever estes testes é parte da tarefa.

### Obrigações

- Os guardas do app (`regraDePedidoSoNoCore.test.ts`, `leituraSoComPapel.test.ts`, `movimentoDosPedidos.test.ts`) seguem valendo.
- Prefixo da migration: o maior existente + 1 hora (a 04 e a 08 também criam migrations).

### Não faça

- Não mexa no painel (06) nem na Adesão (08).
- Não escreva composição de valores no app (é de `core/orders`).

### Pronto quando

- [ ] o detalhe do app mostra o resumo pela regra de `core/orders`
- [ ] `order_list` traz as colunas novas e o probe `02-lista` passa
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
