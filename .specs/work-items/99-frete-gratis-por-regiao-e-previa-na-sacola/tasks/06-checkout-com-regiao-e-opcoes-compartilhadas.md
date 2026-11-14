## 06 · [apps/store] Checkout › Entrega e Resumo com a região, e as opções compartilhadas

**Status:** done

`UC-10; CA-16, CA-17, CA-18 (checkout); RN-02, RN-03, RN-09 (97)` — 99

**Objetivo.** O checkout aplica a regra com o CEP do endereço (só zera a mais barata quando a faixa foi alcançada **e** o
destino está numa região da campanha), e a lista de opções e o cartão viram peças que a gaveta (tarefa 09) reaproveita.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › "O defeito 01", "Convenções que valem em
todo o repositório", "Os guardas — o que trava o quê", "Feature-Sliced Design"; `apps/store/CLAUDE.md` › "Carrinho,
chrome e checkout", "Frete grátis — um interruptor e um dono só (feature 37)", "Retirada no escritório", "Mobile — o que
quebra e não grita". Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no
retorno.

**Trecho da costura.** §4 · spec.md — Código (e §7 Decisões D-01, D-12, D-13, D-14).

**Depende de.** Tarefa 01 (estado com `granted`/`destination`) e 03 (`useFreeShipping(subtotal, cep)`). Confira que
existem antes de começar.
**Habilita.** `deliveryOptions` e `ShippingOptionCard` (exportados por `features/checkout/index.ts`) e `cepOrigin`/
`setCepOrigin` no rascunho, consumidos pelas tarefas 09 e 10.

### Critérios de aceite

PRD 99 (verbatim):
- **UC-10 · O checkout**
  - O bloco Entrega aplica a mesma regra com o CEP do endereço: só zera a mais barata quando a faixa foi alcançada **e**
    o CEP está numa região da campanha.
  - O resumo do pedido (`OrderSummary`) e a linha do frete grátis do checkout seguem a mesma resposta.
  - Trocar o CEP no checkout recalcula na hora (Sul → Nordeste: a opção deixa de ser grátis e o Total sobe).
- **CA-16** CEP 01310-100 (SP) ou 90010-000 (RS), sacola acima da faixa: "Frete grátis liberado", a mais barata
  "Grátis" com o valor riscado, Total sem frete — na gaveta e no checkout, com o mesmo Total. *(Aqui: a metade do
  checkout.)*
- **CA-17** CEP 40020-000 (BA), sacola acima da faixa: "Frete grátis só para Sul e Sudeste", sem barra, frete da
  cotação somado ao Total — na gaveta e no checkout. *(Aqui: a metade do checkout; a frase vale para a faixa do
  `OrderSummary`.)*
- **CA-18** Trocar o CEP de SP para BA no checkout com a sacola acima da faixa: a opção deixa de ser grátis e o Total
  sobe, sem recarregar a página.

PRD 97 (verbatim):
- **RN-02 · As mesmas opções e os mesmos prazos.** Só opções com preço > 0, o prazo com os `handling_days` somados
  (`quoteToEstimate`, `formatEstimate`, `SHP-09`), na mesma ordem e com os mesmos nomes do bloco Entrega. Se a gaveta e
  o checkout mostrarem prazos diferentes para o mesmo CEP, é defeito (foi o que a página do produto já teve).
- **RN-03 · Frete grátis pela regra de hoje.** Quem decide é `freeShippingState` (`useFreeShipping`): com o interruptor
  desligado, nada fica grátis; com a faixa alcançada, **só a opção mais barata** sai "Grátis", com o valor riscado
  (`DeliveryBlock.tsx:312`). O cupom de frete grátis zera o frete dentro de `resolveOrderPricing`, nunca na tela.
  `freeShippingSingleOwner.test.ts` continua valendo: a gaveta não lê `free_shipping_threshold`.
- **RN-09 · Trocar o CEP desfaz a escolha.** Na gaveta e no checkout, como já é no bloco Entrega.

PRD 99 (verbatim):
- **RN-17 · Tom.** "Frete grátis só para Sul e Sudeste" é informação, não recusa: sem exclamação, sem "infelizmente".
  O ⓘ explica em uma ou duas frases.
- **RN-19 · A base do valor da faixa não muda**: o valor das peças, já com o preço da campanha, antes do cupom e do
  desconto progressivo, como hoje em cada caminho (r1, PR-05).
- **RN-18 · Cupom de frete grátis vale em qualquer região**, como hoje. Com ele aplicado, a faixa da
região some (r1, PR-04).

### Design — o que a tela faz

O cartão de opção (o mesmo na gaveta e no checkout): botão `role="radio"`, altura mínima 52px (no checkout 56px, padding
10px 12px), borda 2px `line`, raio md, fundo branco; escolhido borda `ink` e fundo `ground`; rádio de 20px (borda
`field`; ligado borda `ink` e ponto `ink` de 10px); "PAC · Correios" (14/18, 600) e "Chega entre 24 e 28 de novembro"
(12,5/16, `ink-soft`); à direita o valor (display 15px, 700, `primary`), ou "Grátis" com o preço cheio riscado embaixo
(12px, `ink-soft`); a retirada: "Escritório - Uma Estrelinha - [rua], [bairro], Porto Alegre/RS" (quebra em qualquer
ponto), "Pronta para retirada a partir de …", "Grátis" sem riscado. Transições de 150ms com par `motion-reduce:`.

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `apps/store/src/features/checkout/lib/deliveryOptions.ts` | VOCÊ CRIA | as cotações, o estado do frete grátis (`granted`), a opção escolhida, se o fallback "Frete padrão" é permitido | a lista de opções (id, nome, transportadora, prazo formatado, preço cheio, preço aplicado, `free`), o id da mais barata, e o custo atualizado da opção escolhida (D-13) |
| `apps/store/src/features/checkout/ui/ShippingOptionCard.tsx` | VOCÊ CRIA | uma opção, escolhida?, ao escolher, variante (gaveta/checkout) | o cartão |
| `features/checkout/index.ts` | VOCÊ ALTERA | — | exporta os dois acima |
| `DeliveryBlock.tsx` (`:208`, `:285-338`, `:396-501`) | VOCÊ ALTERA | — | usa `useFreeShipping(subtotal, address.cep)`, `deliveryOptions` e `ShippingOptionCard`; ressincroniza o custo escolhido (D-13) |
| `OrderSummary.tsx` (`:70`, `:90-105`, `:437`) | VOCÊ ALTERA | — | `useFreeShipping(subtotal, address.cep)` do rascunho; a faixa do resumo nos estados de região |
| `checkoutStore.ts` | VOCÊ ALTERA | — | `cepOrigin: 'sacola' \| null` e `setCepOrigin`, fora de `draft()`, no `partialize`, zerado por `reset()`; `setAddress` com CEP digitado no checkout zera `cepOrigin` |
| `useShippingQuote`, `quoteToEstimate`, `formatEstimate`, `cheapestQuoteId`, `usePickupOptionState` | JÁ EXISTE. Consuma; não altere. | | |

### Decisões já tomadas

- D-01: quem zera a mais barata e quem diz "liberado" lê `granted`; `destination === 'outside'` escolhe o desenho "só
  para Sul e Sudeste" na faixa do resumo.
- D-12: trocar SP → BA desfaz a escolha (RN-09); a mais barata deixa de sair "Grátis" e, escolhida, o Total soma o
  frete, sem recarregar.
- D-13: o custo gravado em `shipping` acompanha a opção escolhida a cada cotação ou estado novo do frete grátis (o
  `free` muda quando o subtotal cruza a faixa ou o CEP muda de região).
- D-14: `cepOrigin` — o nome e as regras acima.
- Os textos da faixa do resumo seguem os da gaveta (tarefa 08 é a dona da faixa da gaveta; aqui é a do resumo):
  "Faltam R$ X para o frete grátis", "Frete grátis liberado", "Frete grátis para Sul e Sudeste" (alcançada, sem CEP,
  regiões limitadas), "Frete grátis só para Sul e Sudeste" (fora); o rótulo das regiões vem de `region.ts`; sem "!".
- Com cupom de frete grátis aplicado, a faixa da região some (RN-18).

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| cartão de opção | `DeliveryBlock.tsx:413-458` (domicílio) e `:466-497` (retirada) |
| campo fora do rascunho | `checkoutStore.ts` › `scope` (`:116`, `:177`, `:239`, `:277`) |
| cálculo das opções | `DeliveryBlock.tsx:285-356` |

### Testes

- unidade: `deliveryOptions` — só a mais barata `free` com `granted`; nenhuma sem `granted`; o fallback "Frete padrão"
  só quando permitido; o custo da escolhida acompanha a cotação nova e o `free`.
- componente: bloco Entrega com Sul + Sudeste e faixa alcançada — CEP de SP: a mais barata "Grátis" riscada; CEP da BA:
  nenhuma grátis.
- componente: trocar SP → BA desfaz a escolha, a mais barata deixa de ser grátis e, escolhida, o Total soma o frete
  (CA-18).
- componente: `OrderSummary` mostra os estados da faixa (liberado com SP; "só para Sul e Sudeste" com BA; "para Sul e
  Sudeste" sem CEP acima) e some com cupom de frete grátis.
- componente: com as cinco regiões, o checkout é o de hoje (os testes existentes continuam verdes).
- unidade: `cepOrigin` persiste, sai no `reset()` e zera ao digitar o CEP no checkout; `isOrderStale` não muda.

### Obrigações

- `freeShippingSingleOwner.test.ts`: nada lê `free_shipping_threshold` nem `free_shipping_regions` (só pelos hooks).
- `touchTarget`, `accentText`, `contrast`, `fieldBorder` verdes; transições com par `motion-reduce:`.
- Tom: sem "!", sem "infelizmente".
- `packages/core/src/payment/**` intocado.

### Não faça

- Não mexa na gaveta (`widgets/cart-drawer/**`, tarefas 08/09) nem em `useCartPromotion`.
- Não implemente "Trazido da sua sacola", o foco no Número nem a regra endereço salvo × CEP da gaveta (tarefa 10).
- Não mexa em `pages/__tests__/CheckoutPage*.test.tsx` a não ser que reprovem por esta tarefa (registre no retorno).

### Pronto quando

- [ ] o bloco Entrega e o resumo seguem `granted` com o CEP do endereço
- [ ] CA-18 provado no componente
- [ ] `deliveryOptions`, `ShippingOptionCard` e `cepOrigin` prontos e exportados
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
