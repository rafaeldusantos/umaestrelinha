## 10 · [store] BUG-003, BUG-008 — Sacola, checkout e pedido · o preço "de/por" da linha da peça

**Status:** done

`BUG-003, BUG-008` — 92

**Objetivo.** Os bugs BUG-003, BUG-008 da rodada 1 da QA deixam de acontecer: o que a tela mostra passa a ser o que o critério de aceite de cada bug diz que é esperado.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines; `packages/core/CLAUDE.md` (inteiro); `apps/store/CLAUDE.md` › O bloco Compre Junto, O botão único leva o conjunto, Carrinho, chrome e checkout, A sacola v4 e a marca "acompanha", Minha conta e o detalhe do pedido; `.specs/LESSONS.md` › L-013, L-014, L-015. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** as tarefas 01–08 (`done`, commitadas) — o desconto do Compre Junto já está na árvore. Confira que existe antes de começar.

### Critérios de aceite

### BUG-003 — [Sacola e checkout] Quando a promoção ou a oferta vence o desconto casado, a linha da peça mostra um preço maior que o cobrado

#### Resumo

Helena levou o pingente com duas Correntes Cartier. Com duas unidades vale a promoção progressiva de 30 %, que dá um preço menor que o desconto casado de 10 %. A linha da Cartier na sacola e no checkout diz R$ 227,81, "1 com desconto, 1 a preço cheio". A peça é cobrada por R$ 167,86. As linhas não somam o Total, e a cliente lê que uma unidade vai a preço cheio, o que não é verdade. A mesma coisa acontece quando a oferta do checkout vence o casado: a linha mostra o preço cheio.

**Origem:** sessão CH-03 · ambiente local

#### Impacto

- **Nível:** Dano à confiança. A linha afirma um preço e uma unidade "a preço cheio" que não são o que se cobra, e a soma das linhas não fecha com o Total
- **Persona mais atingida:** PER-04 Helena. Outras: PER-01 Marina
- **Jornada e passo:** J-03a, passos 2 e 3 (sacola, checkout)
- **Frequência:** sempre que outro desconto vence o casado na linha (promoção: 3 de 3; oferta: 1 de 1)
- **Contorno:** nenhum. O Total está certo, mas as linhas não explicam como se chega a ele
- **Gravidade proposta na sessão:** medium. Aqui sobe para high: a frase falsa sobre preço está no caminho do dinheiro, e o plano classifica "o resumo não fecha" como dano à confiança

#### Ambiente

- **URL:** http://localhost:8082 (gaveta da sacola) e /checkout
- **Tela:** sacola (gaveta) e checkout · **Componente:** linha da peça (preço "de/por" e a frase da linha mista)
- **Branch / build:** `feature/92`, dev server Vite
- **Browser:** Chromium headless (Playwright MCP) · **Viewport:** 1440 × 900
- **Rede:** local · **Idioma:** pt-BR

#### Passos

1. Com a conta `cliente-loja`, em 1440 × 900 e com a sacola vazia, abrir `/produtos/qa-pingente-estrela`
2. Escolher Prata 925 · Não. Em "Ver os 3 modelos", escolher QA Corrente Cartier · 45 cm. Marcar "Levar junto: QA Correntes" e tocar "Levar o conjunto"
3. Na gaveta, tocar "Aumentar QA Corrente Cartier" (2 unidades ativam a promoção progressiva de 30 %)
4. Tocar "Finalizar Pedido" e ler a linha da Cartier no checkout

#### Esperado

A linha mostra o menor preço, 2 × R$ 83,93 = R$ 167,86. A diferença aparece só no rodapé, e a linha não diz que uma unidade vai a preço cheio. Quando a oferta do checkout vence, a linha mostra o preço da oferta.

**Fonte:** `prd.md` CA-02.4 ("a sacola mostra o menor") e CA-03.5 (vale o menor preço da linha); TC-FUNC-010, passo 2; TC-FUNC-016, passos 1 e 3. A confirmação do mesmo pedido mostra R$ 239,80 → R$ 167,86

#### Observado

Gaveta: "QA Corrente Cartier R$ 239,80 / R$ 227,81 · Acompanha o QA Pingente Estrela · 10% a menos · 1 com desconto, 1 a preço cheio". Rodapé: Subtotal R$ 499,70 · Desconto do Compre Junto −R$ 11,99 · Desconto progressivo −R$ 59,95 · Total R$ 427,76. A conta das linhas, 259,90 + 227,81 = 487,71, não dá 427,76. O checkout mostra o mesmo. Com o pingente × 2, a linha diz R$ 215,82 e o Total é R$ 751,33.

#### Evidência

- `screenshots/CH-03-02-promo-vence-casado-1440.png`: a gaveta com a linha de R$ 227,81 e o Total de R$ 427,76
- `screenshots/CH-03-08-confirmacao-0362-1440.png`: o mesmo pedido gravado, com a linha de R$ 167,86

#### Ocorrências

| Sessão | Persona | Passo | Evidência |
| ------ | ------- | ----- | --------- |
| CH-03 | PER-04 | 02: gaveta, promoção vence (R$ 227,81 × cobrado R$ 167,86) | `screenshots/CH-03-02-promo-vence-casado-1440.png` |
| CH-03 | PER-04 | 03: checkout, mesma linha | — |
| CH-03 | PER-04 | 10: gaveta com o pingente × 2 (linha R$ 215,82) | — |
| CH-03 | PER-04 | 18–19: a Veneziana na sacola e a oferta do checkout vencendo o casado. A linha diz "R$ 89,90", sem "de/por" nem "Acompanha", e a peça é cobrada por R$ 71,92 | — |

#### Relacionados

- **TC:** TC-FUNC-010, TC-FUNC-016
- **Charter:** CH-03
- **Critério:** CA-02.4, CA-03.5
- **Bugs:** BUG-008 (o mesmo preço da linha, lido pelo leitor de tela); BUG-002

### BUG-008 — [Sacola, checkout e pedido] O preço com desconto da peça é lido como dois números soltos — para quem usa leitor de tela

#### Resumo

Sônia monta o conjunto pelo teclado. No bloco da página do produto, o preço do Berloque é anunciado como "de R$ 69,90 por R$ 59,42". Na gaveta da sacola, em "Seu pedido" do checkout e em `/pedido/:id`, a mesma peça vira "R$ 69,90 R$ 59,42": dois textos sem rótulo, e nada diz que o primeiro está riscado. Quem não vê o riscado não sabe qual dos dois preços vale.

**Origem:** sessão CH-08 · ambiente local

#### Impacto

- **Nível:** Fricção que sobe um degrau por estar na jornada J-01, que é P0 no plano. O resultado é high
- **Persona mais atingida:** PER-05 Sônia (tecnologia assistiva)
- **Jornada e passo:** J-01, passos 4 a 6 (conferir a sacola e o resumo); J-03 (pedido)
- **Frequência:** sempre (3 de 3: gaveta, checkout, `/pedido/:id`)
- **Contorno:** deduzir o preço pelo total
- **Gravidade proposta na sessão:** medium. Aqui sobe para high, pela regra de fricção em jornada P0

#### Ambiente

- **URL:** http://localhost:8082 (gaveta), /checkout e /pedido/<id>
- **Tela:** sacola (gaveta), checkout e página do pedido · **Componente:** linha da peça (preço "de/por")
- **Branch / build:** `feature/92`, dev server Vite
- **Browser:** Chromium (Playwright MCP), lido pela árvore de acessibilidade · **Viewport:** 1440 × 900 e 390 × 844
- **Rede:** local · **Idioma:** pt-BR

#### Passos

1. Anônima, sacola vazia, abrir `/produtos/qa-pingente-estrela`. Marcar "QA Berloque Coração" (Prata 925) e "Levar o conjunto"
2. Ler a linha do Berloque na gaveta pela árvore de acessibilidade
3. Ir ao checkout e ler "Seu pedido". Depois de fechar o pedido, ler `/pedido/:id`

#### Esperado

A linha anuncia o "de {cheio} por {junto}" como uma frase, como faz o bloco, onde os números visíveis ficam `aria-hidden` ao lado do texto "de R$ 69,90 por R$ 59,42".

**Fonte:** TC-CFR-002, variação "gaveta"; `prd.md` CA-03.8; `spec.md` › Design › Loja — Bloco

#### Observado

Gaveta: `generic "R$ 69,90"` e `generic "R$ 59,42"`, sem "de … por …" e sem indicação do riscado. O checkout faz o mesmo. Em `/pedido/:id`: `text: R$ 69,90 R$ 66,41`.

#### Evidência

- `screenshots/CH-08-02-foco-berloque-1440.png`: o bloco, onde o par é lido certo
- `screenshots/CH-01-10-gaveta-sacola-390.png`: a linha da gaveta com os dois preços
- `screenshots/CH-08-10-pedido-390-200.png`: `/pedido/:id` com a linha da peça

#### Ocorrências

| Sessão | Persona | Passo | Evidência |
| ------ | ------- | ----- | --------- |
| CH-08 | PER-05 | 04: gaveta | — |
| CH-08 | PER-05 | 05: "Seu pedido" do checkout | — |
| CH-08 | PER-05 | 11: `/pedido/:id` | `screenshots/CH-08-10-pedido-390-200.png` |

#### Relacionados

- **TC:** TC-CFR-002
- **Charter:** CH-08
- **Critério:** CA-03.8, CA-05.2
- **Bugs:** BUG-003 (o mesmo preço da linha)

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| `apps/store/src/widgets/cart-drawer/ui/CartDrawerRow.tsx` — onde o sintoma aparece (localizado pelo planejamento, não diagnosticado) | VOCÊ ALTERA, se a causa estiver aqui | — | — |
| `apps/store/src/features/checkout/ui/OrderSummary.tsx (linha da peça)` — onde o sintoma aparece (localizado pelo planejamento, não diagnosticado) | VOCÊ ALTERA, se a causa estiver aqui | — | — |
| `apps/store/src/entities/order/ui/OrderItemsSummary.tsx (linha da peça)` — onde o sintoma aparece (localizado pelo planejamento, não diagnosticado) | VOCÊ ALTERA, se a causa estiver aqui | — | — |
| `apps/store/src/entities/cart/lib/buyTogetherPricing.ts` — onde o sintoma aparece (localizado pelo planejamento, não diagnosticado) | VOCÊ ALTERA, se a causa estiver aqui | — | — |

Só o que ESTA tarefa cria ou consome. `JÁ EXISTE` é afirmação a conferir no código. A causa é do seu diagnóstico: se ela morar fora destes arquivos, siga até ela e diga no retorno.

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-003 · [Sacola e checkout] Quando a promoção ou a oferta vence o desconto casado, a linha da peça mostra um preço maior que o cobrado · high
- **Bug**: BUG-008 · [Sacola, checkout e pedido] O preço com desconto da peça é lido como dois números soltos — para quem usa leitor de tela · high
- **Lote**: mesmo trecho nas mesmas telas: o preço exibido e o anunciado da linha da peça — `apps/store/src/widgets/cart-drawer/ui/CartDrawerRow.tsx`, `apps/store/src/features/checkout/ui/OrderSummary.tsx`, `apps/store/src/entities/order/ui/OrderItemsSummary.tsx`
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA

### Testes

- o comportamento esperado de BUG-003 (a reprodução do bug, que hoje dá o obtido, passa a dar o esperado) — escreva o teste antes do conserto e veja-o reprovar; no nível mais baixo que alcance o defeito (unidade em `core` quando a regra mora lá; componente ou página real quando o defeito é de fiação ou de tela)
- o comportamento esperado de BUG-008 (a reprodução do bug, que hoje dá o obtido, passa a dar o esperado) — escreva o teste antes do conserto e veja-o reprovar; no nível mais baixo que alcance o defeito (unidade em `core` quando a regra mora lá; componente ou página real quando o defeito é de fiação ou de tela)

### Não faça

- não mude o `status` nem o corpo dos arquivos de `qa/issues/` — reteste e fechamento são da QA
- não corrija outro bug da rodada que não esteja nesta tarefa (BUG-001..013 têm cada um a sua fix task)
- não toque na Adesão por causa da P-01 (`qa/decisoes-produto.md`): o destino é um WI novo
- não altere `packages/core/src/payment/**` sem que o diagnóstico mostre que a causa está lá; se estiver, diga no retorno

### Pronto quando

- [ ] a reprodução de BUG-003 dá o **Esperado** do bug, provado por um teste que reprovou antes do conserto
- [ ] a reprodução de BUG-008 dá o **Esperado** do bug, provado por um teste que reprovou antes do conserto
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
