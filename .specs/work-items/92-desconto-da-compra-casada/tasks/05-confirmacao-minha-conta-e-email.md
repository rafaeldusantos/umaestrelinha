## 05 · [core · store · functions] Loja — confirmação do pedido, Minha conta e o e-mail do pedido

**Status:** done

`CA-05.2 · CA-05.4` — 92

**Objetivo.** A confirmação, Minha conta e o e-mail mostram a peça com "de/por", a linha mista partida em duas e o resumo com Subtotal cheio e uma linha por desconto, pela mesma regra em `core/orders`, e o total fecha.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy; `packages/core/CLAUDE.md` (inteiro); `apps/store/CLAUDE.md` › O bloco Compre Junto, O botão único leva o conjunto, Carrinho, chrome e checkout, A sacola v4 e a marca "acompanha", Minha conta e o detalhe do pedido; `supabase/CLAUDE.md` › Migrations, O Compre Junto, A marca "acompanha", O relatório de adesão, RLS, Edge functions, mercado-pago, checkout, send-notification; `.specs/LESSONS.md` › L-013, L-014, L-015. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (Confirmação e Minha conta; E-mail do pedido) e §4 — Código. É o rastreio da tarefa até a costura: quem executa abre esta seção quando precisa do contexto que a tarefa não repete.

**Depende de.** 04 — `orders.buy_together_discount`, `orders.order_bump_discount`, `order_items.full_unit_price` e `unit_price` = cobrado. Confira que existe antes de começar.
**Habilita.** a regra única do resumo do pedido em `core/orders` — consumida pelo painel (06) e pelo app do ateliê (07).

### Critérios de aceite

**UC-05 · O pedido mostra o desconto**

- CA-05.2 Na confirmação, em Minha conta e no e-mail do pedido, a peça com desconto mostra "de/por". O resumo mostra o Subtotal pela soma dos preços cheios, uma linha para cada desconto que houve ("Desconto do Compre Junto", "Desconto progressivo", o da oferta do checkout, o cupom e o PIX) e o Total cobrado, e a conta fecha: Subtotal − descontos + frete = Total. Pedido feito antes deste WI continua como está [gate: Q-06, C-01; PRD Tech Review r1]
- CA-05.4 Mudar ou apagar o desconto do adicional depois não muda pedido já feito [código: o snapshot é a regra de `20261106120000_compre-junto-no-pedido.sql:5-7`]

**Requisitos não-funcionais**

- RNF-03 O módulo de regra alcançável pelo Deno: todo import relativo com `.ts`, `import type` incluso [código: `CLAUDE.md` raiz › "Alias de import"]
- RNF-05 Mobile primeiro: o "de/por" no bloco e a linha do desconto na sacola e no checkout em 390×844 sem rolagem horizontal e sem quebrar em pílula [código: `CLAUDE.md` raiz › "Mobile é o caso principal"]
- RNF-06 Tom memorial: sem "economize!", sem exclamação, sem urgência nem contagem [código: `CLAUDE.md` raiz, `tomDoCompreJunto.test.ts`]

### Design — o que a tela faz

- "Itens do pedido": a linha mista partida em duas — uma com "Acompanha o {joia} · N% a menos" e "de/por", outra a preço cheio —, cada uma com "{variação} · N unidade(s)".
- Resumo: Subtotal (soma dos preços cheios) · Frete · Desconto do Compre Junto · Desconto progressivo · o da oferta do checkout · Cupom {CÓDIGO} · Desconto PIX · Total; a conta fecha.
- E-mail: "N× {nome}", a variação, "Compre Junto · N% a menos" na linha com desconto; o valor com o cheio riscado acima do cobrado; totais Subtotal · Frete · Desconto do Compre Junto · Cupom · Desconto PIX · Total.
- Pedido antigo (sem `full_unit_price`) fica como hoje.
- Protótipo: `Pedido - Desconto do Compre Junto.html` › "Confirmação · Minha conta" e "E-mail do pedido".

Este recorte é a fonte: não vá ao design buscar o que não está aqui. Detalhe visual que ele não menciona resolve-se pelo design system do repositório.

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| a regra única do resumo (folha nova em `packages/core/src/orders/`) | VOCÊ CRIA | o pedido e as linhas | Subtotal cheio, uma linha por desconto (rótulo e valor), Total = `orders.total`; recuo para pedido antigo |
| as colunas novas do pedido | JÁ EXISTE (04). Consuma. | — | — |
| os selects explícitos do e-mail (`send-notification/handlers.ts`, `dispatch.ts`) | VOCÊ ALTERA | — | — |

Só o que ESTA tarefa cria ou consome. `JÁ EXISTE` é afirmação a conferir no código.

### Decisões já tomadas

- D-01: o resumo parte do preço cheio; L-014 — nunca mostrar a linha do desconto abaixo de um subtotal já líquido.
- D-16 (H-03): o rótulo é "Desconto do Compre Junto".
- A regra do resumo é o dono único: confirmação, Minha conta, e-mail (aqui), painel (06) e app (07) a chamam.
- Migration só no banco local (`supabase migration up --local`); aditiva; o prefixo é o maior existente em `supabase/migrations/` + 1 hora (nunca repetir prefixo — `version` é a chave de `schema_migrations`).
- Toda regra com dois leitores mora em `packages/core`; o desconto nunca é calculado na tela.
- Tom memorial (RNF-06): sem "economize", sem exclamação, sem urgência.

### Siga a forma de

| O que você vai escrever | Imite |
| --- | --- |
| Folha de `core` alcançável pelo Deno | `packages/core/src/buy-together/marks.ts` |
| Resumo na loja | `apps/store/src/entities/order/ui/OrderItemsSummary.tsx` (`Linha`) |
| Totais do e-mail | `supabase/functions/send-notification/render/layout.ts › totalsTable`, `› itemsTable` |

Abra o arquivo antes de escrever o seu.

### Testes

- unidade (`core`): o resumo fecha (Subtotal − descontos + frete = Total) com Compre Junto, bump, promoção, cupom e PIX; pedido sem `full_unit_price` cai no formato de antes.
- componente (loja): a confirmação mostra "de/por", a linha partida e as linhas de desconto; pedido antigo igual ao de hoje.
- functions: o e-mail mostra "de/por" e uma linha por desconto, e a conta fecha; a prévia (`render/sample.ts`) com desconto.
- guarda de alcance Deno da folha nova (molde de `denoReach.test.ts`).

Escrever estes testes é parte da tarefa.

### Obrigações

- RNF-03: a folha de `core/orders` só com imports relativos `.ts`; o e-mail a importa por caminho relativo.
- O guarda `numeroDoPedidoComDonoUnico.test.ts` e `situacaoComDonoUnico.test.ts` seguem valendo nas telas tocadas.
- Ordem de publicação: functions → bundles.

### Não faça

- Não altere o painel do pedido (tarefa 06) nem o app do ateliê (tarefa 07).
- Não amplie o guarda de tom (tarefa 06).
- Não mude o `create-payment` nem as colunas (tarefa 04).

### Pronto quando

- [ ] confirmação, Minha conta e e-mail mostram o resumo novo pela regra de `core/orders`
- [ ] pedido antigo continua igual
- [ ] a folha nova é alcançável pelo Deno
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
