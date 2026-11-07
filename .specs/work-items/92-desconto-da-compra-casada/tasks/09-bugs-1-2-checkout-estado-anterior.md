## 09 · [store] BUG-001, BUG-002 — Checkout · o que sobra do checkout anterior na mesma aba

**Status:** done

`BUG-001, BUG-002` — 92

**Objetivo.** Os bugs BUG-001, BUG-002 da rodada 1 da QA deixam de acontecer: o que a tela mostra passa a ser o que o critério de aceite de cada bug diz que é esperado.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines; `packages/core/CLAUDE.md` (inteiro); `apps/store/CLAUDE.md` › O bloco Compre Junto, O botão único leva o conjunto, Carrinho, chrome e checkout, A sacola v4 e a marca "acompanha", Minha conta e o detalhe do pedido; `.specs/LESSONS.md` › L-013, L-014, L-015. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** as tarefas 01–08 (`done`, commitadas) — o desconto do Compre Junto já está na árvore. Confira que existe antes de começar.

### Critérios de aceite

### BUG-001 — [Checkout] Com um pedido PIX pendente na mesma aba, pagar uma sacola nova abre o pedido antigo, com outras peças e outro valor

#### Resumo

Marina fechou um pedido com PIX e não pagou na hora. Na mesma aba ela trocou as peças da sacola, voltou ao checkout e tocou "Pagar R$ 296,42 com PIX". A loja não criou o pedido novo. Abriu a tela de pagamento do pedido anterior, #0360, que tem outras peças e custa R$ 381,87. Ela esperava pagar a sacola que estava vendo, pelo valor do botão.

**Origem:** sessão CH-02 · ambiente local

#### Impacto

- **Nível:** Bloqueia a conclusão. A sacola nova nunca vira pedido, e a única tela de pagamento que aparece cobraria outro valor, por outras peças
- **Persona mais atingida:** PER-01 Marina. Outras: qualquer cliente que deixa um PIX pendente e volta a comprar na mesma aba
- **Jornada e passo:** J-01, passo 6 (confirmar o pagamento)
- **Frequência:** sempre, depois de um pedido PIX pendente na mesma sessão do checkout (2 de 2)
- **Contorno:** só abrir um contexto de navegador novo, e a cliente não tem como saber disso
- **Gravidade proposta na sessão:** critical. Mantida. A sessão não sabe se o defeito é anterior ao WI. Mesmo que seja, ele é `critical` e por isso entra como bug: o valor exibido não é o cobrado (RNF-01)

#### Ambiente

- **URL:** http://localhost:8082/checkout → `/pedido/<id do #0360>/pagamento`
- **Tela:** checkout · **Componente:** botão "Pagar … com PIX"
- **Branch / build:** `feature/92` (worktree `store__feature-92`), dev server Vite
- **Browser:** Chromium headless (Playwright MCP) · **Viewport:** 390 × 844
- **Rede:** local, Mercado Pago com chave inválida · **Idioma:** pt-BR

#### Passos

1. Anônima, em 390 × 844 e com a sacola vazia, abrir `/produtos/qa-pingente-estrela`. Marcar "QA Berloque Coração" (Prata 925) e tocar "Levar o conjunto"
2. Ir ao checkout como convidada (`@exemplo.invalid`), escolher o frete padrão, informar o CPF e tocar "Pagar R$ X com PIX". A loja cria o pedido A e abre a tela de pagamento dele, que fica aguardando pagamento
3. Na mesma aba, tirar todas as peças da sacola e pôr outras: "QA Joia Sem Compre Junto", "QA Medalha Afetiva" e o cupom QA92CUPOM15. Tocar "Finalizar Pedido"
4. No checkout, com contato e entrega já preenchidos, conferir o botão "Pagar R$ 296,42 com PIX" e tocar nele

#### Esperado

Um pedido novo, com as peças e o total do checkout, e a tela `/pedido/<novo>/pagamento` mostrando R$ 296,42.

**Fonte:** `prd.md` CA-04.2 e RNF-01 (exibido = cobrado); TC-FUNC-024

#### Observado

A tela abre em `/pedido/7f8cdd3a-…/pagamento` com "PEDIDO #0360 · AGUARDANDO PAGAMENTO … R$ 381,87", que é o pedido do passo 2, com o pingente e dois Berloques. A rede não registra `checkout?action=create-order`. Registra `checkout?action=get-order → 200` e `mercado-pago?action=create-payment` para o #0360. A sacola continua com as peças novas. Num contexto de navegador novo, a mesma sacola cria o pedido certo (#0361, R$ 296,42).

#### Evidência

- `screenshots/CH-02-12-pagamento-0360-390.png`: o pedido A (#0360, R$ 381,87) logo depois de criado
- `screenshots/CH-02-26-checkout-29642-390.png`: o checkout com as peças novas e "Pagar R$ 296,42 com PIX"
- `screenshots/CH-02-27-pagar-29642-abre-0360-390.png`: o toque no botão abre o #0360, de R$ 381,87

#### Relacionados

- **TC:** TC-FUNC-024
- **Charter:** CH-02
- **Critério:** CA-04.2, RNF-01
- **Bugs:** BUG-002 (outro estado do checkout anterior que sobra na mesma aba)

### BUG-002 — [Checkout] A oferta do checkout volta marcada no checkout seguinte e soma ao total uma peça que a cliente não escolheu

#### Resumo

Helena marcou a oferta do checkout (QA Corrente Veneziana a R$ 71,92) num pedido e o fechou. Na mesma aba, montou outra sacola e abriu o checkout de novo. A oferta já estava marcada, e o total incluía R$ 71,92 de uma peça que ela não escolheu nessa compra e que não aparece em "Seu pedido".

**Origem:** sessão CH-03 · ambiente local

#### Impacto

- **Nível:** Dano à confiança. A cliente pode pagar por uma peça que não escolheu, e a lista do pedido não a mostra
- **Persona mais atingida:** PER-04 Helena. Outras: qualquer cliente que compra duas vezes na mesma aba
- **Jornada e passo:** J-03, passo 3 (checkout)
- **Frequência:** 1 de 1. O estado fica marcado de forma determinística (`aria-checked="true"`, visível na captura)
- **Contorno:** desmarcar o cartão da oferta, se ela perceber
- **Gravidade proposta na sessão:** medium, que a sessão deu ao achado inteiro. Aqui sobe para high. A parte "volta marcada" acrescenta ao total uma peça não escolhida, e isso abala a confiança no caminho do dinheiro. Pode ser anterior ao WI. Mesmo assim entra como bug, por ser `high`

#### Ambiente

- **URL:** http://localhost:8082/checkout
- **Tela:** checkout · **Componente:** cartão da oferta do checkout ("Leva junto com 20% de desconto?")
- **Branch / build:** `feature/92`, dev server Vite
- **Browser:** Chromium headless (Playwright MCP) · **Viewport:** 1440 × 900
- **Rede:** local · **Idioma:** pt-BR

#### Passos

1. Com a conta `cliente-loja`, em 1440 × 900, abrir `/produtos/qa-pingente-estrela` com a sacola vazia. Levar o pingente com a QA Corrente Cartier pelo bloco e tocar "Finalizar Pedido"
2. Marcar "Leva junto com 20% de desconto? QA Corrente Veneziana R$ 71,92" e fechar o pedido com PIX
3. Na mesma aba, montar outra sacola (ex.: pingente + QA Berloque Coração) e abrir o checkout

#### Esperado

Num checkout novo, a oferta aparece desmarcada. O total é o das peças da sacola.

**Fonte:** `prd.md` CA-04.2 (sacola, checkout e cobrança dão o mesmo total); TC-FUNC-016, passo 3 (a oferta é escolha da cliente no checkout)

#### Observado

O cartão da oferta já aparece marcado (`aria-checked="true"`). O checkout diz "5 ITENS", mas "Seu pedido" lista 3 linhas. O Subtotal é R$ 546,52 para uma sacola de R$ 474,60 (R$ 474,60 + R$ 71,92), e o botão diz "Pagar R$ 497,82 com PIX". A sessão registrou 5 ou 6 erros de console nesse checkout e não os leu.

#### Evidência

- `screenshots/CH-03-21-oferta-herdada-checkout-1440.png`: o cartão da oferta marcado no checkout seguinte
- `screenshots/CH-03-21-checkout-subtotal-com-oferta-oculta-1440.png`: o Subtotal de R$ 546,52 com 3 linhas listadas

#### Relacionados

- **TC:** nenhum
- **Charter:** CH-03
- **Critério:** CA-04.2
- **Bugs:** BUG-001 (o pedido anterior que sobra na mesma aba); BUG-003 (a linha da peça quando a oferta vence o casado)

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| `apps/store/src/pages/CheckoutPage.tsx` — onde o sintoma aparece (localizado pelo planejamento, não diagnosticado) | VOCÊ ALTERA, se a causa estiver aqui | — | — |
| `apps/store/src/features/checkout/model/checkoutStore.ts` — onde o sintoma aparece (localizado pelo planejamento, não diagnosticado) | VOCÊ ALTERA, se a causa estiver aqui | — | — |
| `apps/store/src/features/checkout/ui/OrderBump.tsx` — onde o sintoma aparece (localizado pelo planejamento, não diagnosticado) | VOCÊ ALTERA, se a causa estiver aqui | — | — |

Só o que ESTA tarefa cria ou consome. `JÁ EXISTE` é afirmação a conferir no código. A causa é do seu diagnóstico: se ela morar fora destes arquivos, siga até ela e diga no retorno.

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-001 · [Checkout] Com um pedido PIX pendente na mesma aba, pagar uma sacola nova abre o pedido antigo, com outras peças e outro valor · critical
- **Bug**: BUG-002 · [Checkout] A oferta do checkout volta marcada no checkout seguinte e soma ao total uma peça que a cliente não escolheu · high
- **Lote**: mesma tela `/checkout`; os dois vêm do estado do checkout anterior guardado na sessão (o pedido pendente e a oferta marcada) — `apps/store/src/pages/CheckoutPage.tsx`, `apps/store/src/features/checkout/model/checkoutStore.ts`, `apps/store/src/features/checkout/ui/OrderBump.tsx`
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA

### Testes

- o comportamento esperado de BUG-001 (a reprodução do bug, que hoje dá o obtido, passa a dar o esperado) — escreva o teste antes do conserto e veja-o reprovar; no nível mais baixo que alcance o defeito (unidade em `core` quando a regra mora lá; componente ou página real quando o defeito é de fiação ou de tela)
- o comportamento esperado de BUG-002 (a reprodução do bug, que hoje dá o obtido, passa a dar o esperado) — escreva o teste antes do conserto e veja-o reprovar; no nível mais baixo que alcance o defeito (unidade em `core` quando a regra mora lá; componente ou página real quando o defeito é de fiação ou de tela)

### Não faça

- não mude o `status` nem o corpo dos arquivos de `qa/issues/` — reteste e fechamento são da QA
- não corrija outro bug da rodada que não esteja nesta tarefa (BUG-001..013 têm cada um a sua fix task)
- não toque na Adesão por causa da P-01 (`qa/decisoes-produto.md`): o destino é um WI novo
- não altere `packages/core/src/payment/**` sem que o diagnóstico mostre que a causa está lá; se estiver, diga no retorno

### Pronto quando

- [ ] a reprodução de BUG-001 dá o **Esperado** do bug, provado por um teste que reprovou antes do conserto
- [ ] a reprodução de BUG-002 dá o **Esperado** do bug, provado por um teste que reprovou antes do conserto
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
