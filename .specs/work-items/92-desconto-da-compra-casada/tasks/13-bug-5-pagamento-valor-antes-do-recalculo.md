## 13 · [store] BUG-005 — [Pagamento do pedido] Depois de o desconto subir, a tela de pagamento mostra o valor de antes do recálculo — para a cliente que paga depois

**Status:** done

`BUG-005` — 92

**Objetivo.** O bug BUG-005 da rodada 1 da QA deixa de acontecer: o que a tela mostra passa a ser o que o critério de aceite de cada bug diz que é esperado.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines; `packages/core/CLAUDE.md` (inteiro); `apps/store/CLAUDE.md` › O bloco Compre Junto, O botão único leva o conjunto, Carrinho, chrome e checkout, A sacola v4 e a marca "acompanha", Minha conta e o detalhe do pedido; `.specs/LESSONS.md` › L-013, L-014, L-015. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** as tarefas 01–08 (`done`, commitadas) — o desconto do Compre Junto já está na árvore. Confira que existe antes de começar.

### Critérios de aceite

### BUG-005 — [Pagamento do pedido] Depois de o desconto subir, a tela de pagamento mostra o valor de antes do recálculo — para a cliente que paga depois

#### Resumo

Helena voltou para pagar um pedido pendente. Antes disso, a dona tinha aumentado o desconto do Berloque, e o pagamento recalculou o pedido para um valor menor. A tela de pagamento mostra "R$ 310,37 · valor do pedido, ainda não cobrado" e diz que o pedido fica em Minha conta "com o mesmo valor". O pedido gravado, a página do pedido e o painel dizem R$ 307,11. Ela não paga a mais, mas a tela de pagamento mostra um valor que não é o do pedido.

**Origem:** sessão CH-04 · ambiente local

#### Impacto

- **Nível:** Dano à confiança. A tela de pagamento e a página do mesmo pedido mostram valores diferentes
- **Persona mais atingida:** PER-04 Helena
- **Jornada e passo:** J-04, ramo J-04c (pagar depois de o desconto subir)
- **Frequência:** sempre que o pedido é regravado mais barato (2 de 2). A tela fica sempre um recálculo atrás
- **Contorno:** nenhum na tela. A página do pedido mostra o valor certo
- **Gravidade proposta na sessão:** low. Aqui sobe para high: o valor mostrado na tela onde se paga não é o do pedido (RNF-01, exibido = cobrado), e a tela não se corrige sozinha. No ambiente local não deu para ver se o QR traria o valor certo

#### Ambiente

- **URL:** http://localhost:8082/pedido/<id>/pagamento e /pedido/<id>
- **Tela:** pagamento do pedido · **Componente:** valor do pedido ("valor do pedido, ainda não cobrado")
- **Branch / build:** `feature/92`, dev server Vite; painel :8083
- **Browser:** Chromium headless (Playwright MCP) · **Viewport:** 390 × 844
- **Rede:** local, Mercado Pago com chave inválida · **Idioma:** pt-BR

#### Passos

1. Com a conta `cliente-loja`, montar o pingente (QA Pingente Estrela) e o QA Berloque Coração pelo bloco e criar um pedido com PIX. Deixar o pedido pendente
2. No painel (`admin-painel`), abrir a aba Compre junto do QA Pingente Estrela, subir o percentual do Berloque (ex.: de 25 para 30 %) e salvar
3. Na loja, abrir `/pedido/<id>/pagamento` desse pedido
4. Abrir `/pedido/<id>`

#### Esperado

A tela de pagamento mostra o valor pelo qual o pedido vai ser cobrado, o recalculado, igual ou menor que o anterior, e o mesmo valor de `/pedido/<id>`.

**Fonte:** `prd.md` CA-04.3 ("Se sair igual ou mais barato … o pagamento segue"), CA-04.2 e RNF-01; TC-FUNC-025

#### Observado

`/pedido/<id>/pagamento` mostra "R$ 310,37 · valor do pedido, ainda não cobrado" e "Você também pode pagar depois: o pedido fica em Minha conta → Pedidos, com o mesmo valor.". `/pedido/<id>` e o painel mostram o pedido regravado por R$ 307,11. Na primeira vez, a tela mostrou R$ 323,37 com o pedido gravado em R$ 310,37. Na rede, `create-payment` não deu 422 (deu o 400 do Mercado Pago local).

#### Evidência

- `screenshots/CH-04-12-pagamento-valor-velho.png`: a tela de pagamento com R$ 310,37
- `screenshots/CH-04-15-pedido-0365-apos-apagar.png`: o mesmo pedido (#0365) em R$ 307,11

#### Ocorrências

| Sessão | Persona | Passo | Evidência |
| ------ | ------- | ----- | --------- |
| CH-04 | PER-04 | 10–11: a tela mostra 323,37, o pedido está gravado em 310,37 | — |
| CH-04 | PER-04 | 12: a tela mostra 310,37, o pedido está gravado em 307,11 | `screenshots/CH-04-12-pagamento-valor-velho.png` |

#### Relacionados

- **TC:** nenhum. TC-FUNC-025 passou: o pedido é gravado pelo valor recalculado
- **Charter:** CH-04
- **Critério:** CA-04.3, RNF-01
- **Bugs:** nenhum

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| `apps/store/src/features/order-payment/**` — onde o sintoma aparece (localizado pelo planejamento, não diagnosticado) | VOCÊ ALTERA, se a causa estiver aqui | — | — |
| `apps/store/src/pages/OrderPaymentPage.tsx` — onde o sintoma aparece (localizado pelo planejamento, não diagnosticado) | VOCÊ ALTERA, se a causa estiver aqui | — | — |

Só o que ESTA tarefa cria ou consome. `JÁ EXISTE` é afirmação a conferir no código. A causa é do seu diagnóstico: se ela morar fora destes arquivos, siga até ela e diga no retorno.

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-005 · [Pagamento do pedido] Depois de o desconto subir, a tela de pagamento mostra o valor de antes do recálculo — para a cliente que paga depois · high
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA

### Testes

- o comportamento esperado de BUG-005 (a reprodução do bug, que hoje dá o obtido, passa a dar o esperado) — escreva o teste antes do conserto e veja-o reprovar; no nível mais baixo que alcance o defeito (unidade em `core` quando a regra mora lá; componente ou página real quando o defeito é de fiação ou de tela)

### Não faça

- não mude o `status` nem o corpo dos arquivos de `qa/issues/` — reteste e fechamento são da QA
- não corrija outro bug da rodada que não esteja nesta tarefa (BUG-001..013 têm cada um a sua fix task)
- não toque na Adesão por causa da P-01 (`qa/decisoes-produto.md`): o destino é um WI novo
- não altere `packages/core/src/payment/**` sem que o diagnóstico mostre que a causa está lá; se estiver, diga no retorno

### Pronto quando

- [ ] a reprodução de BUG-005 dá o **Esperado** do bug, provado por um teste que reprovou antes do conserto
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
