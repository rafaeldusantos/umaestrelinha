## 16 · [store] BUG-011 — [Loja · resumo do pedido] O checkout e a página do pedido põem o Frete antes dos descontos, fora da ordem do painel

**Status:** done

`BUG-011` — 92

**Objetivo.** O bug BUG-011 da rodada 1 da QA deixa de acontecer: o que a tela mostra passa a ser o que o critério de aceite de cada bug diz que é esperado.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines; `packages/core/CLAUDE.md` (inteiro); `apps/store/CLAUDE.md` › O bloco Compre Junto, O botão único leva o conjunto, Carrinho, chrome e checkout, A sacola v4 e a marca "acompanha", Minha conta e o detalhe do pedido; `.specs/LESSONS.md` › L-013, L-014, L-015. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** as tarefas 01–08 (`done`, commitadas) — o desconto do Compre Junto já está na árvore. Confira que existe antes de começar.

### Critérios de aceite

### BUG-011 — [Loja · resumo do pedido] O checkout e a página do pedido põem o Frete antes dos descontos, fora da ordem do painel

#### Resumo

Marina fecha o pedido com o desconto do Compre Junto. A conta fecha ao centavo, mas o resumo do checkout e o da página do pedido (que é também o detalhe de Minha conta) põem o Frete logo depois do Subtotal, antes dos descontos. A ordem decidida no Gate 1 é a do painel: descontos e PIX antes do Frete.

**Origem:** sessão CH-02 (também CH-03 e CH-08) · ambiente local

#### Impacto

- **Nível:** Cosmético. A conta fecha ao centavo em todas as telas, e a ordem das linhas não muda o que a cliente paga nem impede que ela conclua
- **Persona mais atingida:** PER-01 Marina. Outras: PER-04 Helena, PER-05 Sônia
- **Jornada e passo:** J-01, passos 5 a 7 (checkout, confirmação); J-03 (confirmação, Minha conta)
- **Frequência:** sempre, com ou sem o desconto do Compre Junto
- **Contorno:** nenhum necessário
- **Gravidade proposta na sessão:** medium. Aqui desce para low. A decisão Q-01 faz da ordem um bug, mas a severidade sai do impacto: para a cliente, que só vê a loja, a ordem não causa esforço nem dúvida. Quem compara com o painel é a dona, e isso está no BUG-010. A TC-JOURNEY-001, que é P0, falha por este bug e por isso decide o veredito da rodada

#### Ambiente

- **URL:** http://localhost:8082/checkout e /pedido/<id>
- **Tela:** checkout e página do pedido (confirmação e Minha conta) · **Componente:** resumo de valores
- **Branch / build:** `feature/92`, dev server Vite
- **Browser:** Chromium headless (Playwright MCP) · **Viewport:** 390 × 844 (também 1440 × 900)
- **Rede:** local · **Idioma:** pt-BR

#### Passos

1. Anônima, 390 × 844, sacola vazia, abrir `/produtos/qa-pingente-estrela`
2. Marcar "QA Berloque Coração" (Prata 925), tocar "Levar o conjunto" e "Finalizar Pedido"
3. No checkout, abrir "Resumo · N itens" e ler a ordem das linhas
4. Fechar o pedido com PIX e abrir `/pedido/:id`

#### Esperado

Subtotal · Desconto do Compre Junto · (Desconto progressivo · Desconto da oferta) · Cupom · Desconto PIX · Frete · Total.

**Fonte:** decisão Q-01 do Gate 1 (2026-11-04); charter CH-02 › Mudança; TC-JOURNEY-001, TC-FUNC-018, TC-FUNC-026, TC-FUNC-027, TC-JOURNEY-004

#### Observado

Checkout: "Subtotal R$ 399,70 · Frete · Correios Frete padrão R$ 19,90 · Desconto do Compre Junto −R$ 10,48 · Desconto PIX (7%) −R$ 27,25 · Total R$ 381,87". Antes de informar o CEP, "Frete a calcular" fica na mesma posição. `/pedido/:id`: "Subtotal · Frete · Desconto do Compre Junto · Desconto PIX · Total". Sem o desconto casado (#0361) a ordem é a mesma: "Subtotal · Frete · Cupom · Desconto PIX · Total".

#### Evidência

- `screenshots/CH-02-08-checkout-resumo-ordem-390.png`: o resumo do checkout com o Frete em 2º
- `screenshots/CH-02-14-confirmacao-0360-390.png`: a confirmação do #0360 na mesma ordem
- `screenshots/CH-02-30-confirmacao-reg001-390.png`: o #0361 (cupom) com o Frete antes do cupom
- `screenshots/CH-03-31-confirmacao-cupom-casado-390.png`: o #0363 (Compre Junto + cupom)
- `screenshots/CH-03-33-painel-0363-1440.png`: o painel do #0363, a régua da ordem

#### Ocorrências

| Sessão | Persona | Passo | Evidência |
| ------ | ------- | ----- | --------- |
| CH-02 | PER-01 | 08–09: checkout do #0360 | `screenshots/CH-02-08-checkout-resumo-ordem-390.png` |
| CH-02 | PER-01 | 13: `/pedido/:id` do #0360 | `screenshots/CH-02-14-confirmacao-0360-390.png` |
| CH-02 | PER-01 | 24: #0361, só com cupom | `screenshots/CH-02-30-confirmacao-reg001-390.png` |
| CH-03 | PER-04 | 03, 08, 24: checkout e confirmação do #0362 e do #0363 | `screenshots/CH-03-31-confirmacao-cupom-casado-390.png` |
| CH-08 | PER-05 | 11: `/pedido/:id` do #0368 | — |

#### Relacionados

- **TC:** TC-JOURNEY-001, TC-JOURNEY-004, TC-FUNC-018, TC-FUNC-026, TC-FUNC-027
- **Charter:** CH-02, CH-03, CH-08
- **Critério:** CA-05.2, CA-05.3 (a ordem é a da decisão Q-01)
- **Bugs:** BUG-010 (app) e BUG-012 (e-mail), com o mesmo padrão

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| `apps/store/src/features/checkout/ui/OrderSummary.tsx (resumo de valores)` — onde o sintoma aparece (localizado pelo planejamento, não diagnosticado) | VOCÊ ALTERA, se a causa estiver aqui | — | — |
| `apps/store/src/entities/order/ui/OrderItemsSummary.tsx (resumo de valores)` — onde o sintoma aparece (localizado pelo planejamento, não diagnosticado) | VOCÊ ALTERA, se a causa estiver aqui | — | — |

Só o que ESTA tarefa cria ou consome. `JÁ EXISTE` é afirmação a conferir no código. A causa é do seu diagnóstico: se ela morar fora destes arquivos, siga até ela e diga no retorno.

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-011 · [Loja · resumo do pedido] O checkout e a página do pedido põem o Frete antes dos descontos, fora da ordem do painel · low
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA
- **D-38** (spec.md, Decisões): A ordem do resumo nas três pontas — a ordem do painel do pedido (descontos e PIX antes do Frete) vale; a loja (confirmação, Minha conta, e-mail) e o app passam a segui-la — revisa D-36; a diferença é bug da loja e do app. O preço por item (unidade × total da linha) não muda

### Testes

- o comportamento esperado de BUG-011 (a reprodução do bug, que hoje dá o obtido, passa a dar o esperado) — escreva o teste antes do conserto e veja-o reprovar; no nível mais baixo que alcance o defeito (unidade em `core` quando a regra mora lá; componente ou página real quando o defeito é de fiação ou de tela)

### Não faça

- não mude o `status` nem o corpo dos arquivos de `qa/issues/` — reteste e fechamento são da QA
- não corrija outro bug da rodada que não esteja nesta tarefa (BUG-001..013 têm cada um a sua fix task)
- não toque na Adesão por causa da P-01 (`qa/decisoes-produto.md`): o destino é um WI novo
- não altere `packages/core/src/payment/**` sem que o diagnóstico mostre que a causa está lá; se estiver, diga no retorno

### Pronto quando

- [ ] a reprodução de BUG-011 dá o **Esperado** do bug, provado por um teste que reprovou antes do conserto
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
