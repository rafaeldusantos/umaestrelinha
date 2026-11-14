## 04 · [packages/core, supabase/functions, apps/store] O pedido montado com a região, conferido no servidor

**Status:** done

`UC-10 (pedido montado); RN-16; CA-21` — 99

**Objetivo.** No pedido montado (`/pedido-montado`), o servidor só zera o frete quando a faixa foi alcançada **e** o
CEP do endereço está numa região da campanha.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › "O defeito 01", "Alias de import" (Deno,
`.ts` explícito), "Os guardas — o que trava o quê" (`wiringResolve`); `packages/core/CLAUDE.md` › "Pureza", "Dinheiro",
"proposals"; `supabase/CLAUDE.md` › "Edge functions", "order-proposals e o pedido que nasce de uma proposta". Divergindo
desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · spec.md — Código (e §7 Decisões D-02, D-03).

**Depende de.** Tarefa 01: `freeShippingConfigOf` e `freeShippingState(config, subtotal, destinationCep)`. Confira que
existe antes de começar.

### Critérios de aceite

PRD 99 (verbatim):
- **RN-16 · O servidor aplica a mesma regra onde ele já decide o frete grátis.** O caminho do pedido montado
  (`checkout/proposal.ts:403`, `mercado-pago/handlers.ts:1368`) já chama a regra no servidor; passa a mandar o CEP do
  endereço. Nenhuma cópia da regra nas functions.
- **CA-21** Pedido montado pago com CEP fora da região e faixa alcançada: o servidor cobra o frete (provado no
  servidor, não só na tela).

PRD 99 (verbatim):
- **RN-19 · A base do valor da faixa não muda**: o valor das peças, já com o preço da campanha, antes do cupom e do
  desconto progressivo, como hoje em cada caminho (r1, PR-05).

(A chamada em `mercado-pago/handlers.ts` está em `:1436-1459`, não em `:1368` — PR-14.)

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `ProposalPricingInput.destinationCep` e `proposalPricing` (`packages/core/src/proposals/pricing.ts:259-291`) | VOCÊ ALTERA | `destinationCep?: string \| null` | o frete zerado só com `granted` |
| `supabase/functions/checkout/proposal.ts:397-409` | VOCÊ ALTERA | a linha crua de `shipping` e `body.address_zip` (normalizado em `:418`) | config por `freeShippingConfigOf(raw)` e `destinationCep` |
| `supabase/functions/mercado-pago/handlers.ts:1436-1459` | VOCÊ ALTERA | idem, com `order.address_zip` | idem |
| `apps/store/src/pages/ProposalCheckoutPage.tsx:249-255` | VOCÊ ALTERA | `address.cep` do rascunho do pedido montado | `destinationCep` |
| `freeShippingConfigOf`, `freeShippingState` | JÁ EXISTE (tarefa 01). Consuma; não altere. | | |

### Decisões já tomadas

- D-02: no servidor, CEP ausente ou desconhecido não concede quando as regiões são limitadas.
- D-03: a config é montada por `freeShippingConfigOf` nas duas functions, nunca copiando campo a campo.
- PR-11 fica fora: `proposalPricing` continua zerando a opção escolhida (seja qual for) quando concede; não mude isso.
- `order-proposals/handlers.ts` e o `ProposalSummary` do painel passam `freeShipping: null` e ficam como estão.

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| server passando config ao dono | `supabase/functions/checkout/proposal.ts:397-409` e `supabase/functions/checkout/__tests__/proposal.test.ts:416` |
| cobrança travada do pedido montado | `supabase/functions/mercado-pago/handlers.ts` › `lockedProposalCharge` e `supabase/functions/mercado-pago/__tests__/proposalCharge.test.ts` |

### Testes

- unidade (core): `proposalPricing` com Sul + Sudeste e faixa alcançada: CEP da BA cobra o frete; CEP de SP zera; sem
  CEP cobra; com as cinco regiões, sem CEP zera (igual a hoje).
- functions (handler com dublê): `create-order` do pedido montado com CEP da BA e faixa alcançada grava o
  `shipping_cost` cotado; com CEP de SP grava zero; a linha de settings sem `free_shipping_regions` concede como hoje.
- functions (handler com dublê): `create-payment` do pedido montado cobra o mesmo total do `create-order` para a BA
  (CA-21).
- unidade (store): `ProposalCheckoutPage` passa o CEP do endereço a `proposalPricing` (o Total muda ao trocar SP → BA
  com a faixa alcançada e Sul + Sudeste).

### Obrigações

- Os imports nas functions são relativos com `.ts` explícito; o `wiringResolve.test.ts`
  (`supabase/functions/_shared/__tests__`) continua verde.
- `packages/core/src/proposals/__tests__/purity.test.ts` continua verde.
- `packages/core/src/payment/**` intocado.

### Não faça

- Não mexa no pedido comum (`checkout/handlers.ts`): a conferência do frete no servidor no pedido comum está fora
  (Pergunta 2 da 99).
- Não mexa em `useFreeShipping`, `constants.ts`, tipos de `packages/supabase` (tarefa 03).
- Não faça deploy de function; a prova é por teste com dublê.

### Pronto quando

- [ ] o servidor do pedido montado cobra o frete com CEP fora e faixa alcançada, nos dois caminhos (`create-order` e `create-payment`)
- [ ] sem `free_shipping_regions` na linha, o comportamento é o de hoje
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
