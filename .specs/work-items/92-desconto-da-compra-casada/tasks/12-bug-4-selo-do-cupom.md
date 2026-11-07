## 12 · [store] BUG-004 — [Sacola · selo do cupom] O selo mostra um valor de cupom diferente da linha do cupom quando há desconto do Compre Junto

**Status:** done

`BUG-004` — 92

**Objetivo.** O bug BUG-004 da rodada 1 da QA deixa de acontecer: o que a tela mostra passa a ser o que o critério de aceite de cada bug diz que é esperado.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines; `packages/core/CLAUDE.md` (inteiro); `apps/store/CLAUDE.md` › O bloco Compre Junto, O botão único leva o conjunto, Carrinho, chrome e checkout, A sacola v4 e a marca "acompanha", Minha conta e o detalhe do pedido; `.specs/LESSONS.md` › L-013, L-014, L-015. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** as tarefas 01–08 (`done`, commitadas) — o desconto do Compre Junto já está na árvore. Confira que existe antes de começar.

### Critérios de aceite

### BUG-004 — [Sacola · selo do cupom] O selo mostra um valor de cupom diferente da linha do cupom quando há desconto do Compre Junto

#### Resumo

Helena aplicou o cupom QA92CUPOM15 na gaveta, com o pingente e o Berloque levados pelo bloco. O selo diz "QA92CUPOM15 aplicado −R$ 49,47". A linha "Cupom QA92CUPOM15" do rodapé diz −R$ 47,90. São dois valores para o mesmo cupom, na mesma tela. Quando a sacola muda, a linha se recalcula e o selo continua com o valor antigo. Com duas joias, a diferença chega a R$ 35.

**Origem:** sessões CH-03 e CH-02 · ambiente local

#### Impacto

- **Nível:** Dano à confiança. A mesma tela mostra dois valores para o mesmo cupom
- **Persona mais atingida:** PER-04 Helena. Outras: PER-01 Marina
- **Jornada e passo:** J-03, passo 3 (aplicar o cupom); J-01, passo 4 (sacola)
- **Frequência:** sempre com desconto do Compre Junto e cupom juntos (2 de 2 já na aplicação). Também sempre que a sacola muda depois de aplicado o cupom (2 de 2)
- **Contorno:** nenhum. O Total está certo
- **Gravidade proposta na sessão:** low (CH-02 e CH-03). Aqui sobe para high: o cupom aparece com dois valores no mesmo instante, que é o caso de "dois valores na mesma tela" do guia de severidade

#### Ambiente

- **URL:** http://localhost:8082 (gaveta "Sua sacola")
- **Tela:** sacola (gaveta) · **Componente:** selo "… aplicado −R$ X" do cupom
- **Branch / build:** `feature/92`, dev server Vite
- **Browser:** Chromium headless (Playwright MCP) · **Viewport:** 390 × 844 e 1440 × 900
- **Rede:** local · **Idioma:** pt-BR

#### Passos

1. Com a conta `cliente-loja`, em 390 × 844 e com a sacola vazia, abrir `/produtos/qa-pingente-estrela`. Escolher Prata 925 · Não, marcar "QA Berloque Coração" (Prata 925) e tocar "Levar o conjunto"
2. Na gaveta, aplicar o cupom QA92CUPOM15
3. Comparar o selo do cupom com a linha "Cupom QA92CUPOM15" do rodapé
4. Mudar a sacola (ex.: acrescentar ou tirar uma peça) e comparar de novo

#### Esperado

Um único valor de cupom: 15 % do subtotal já com o desconto do Compre Junto (R$ 47,90), igual no selo e na linha, e acompanhando a sacola.

**Fonte:** `prd.md` CA-03.6 ("o cupom incide sobre o subtotal já com ele") e CA-03.8 (a gaveta mostra o mesmo valor do checkout); TC-FUNC-017, passo 1

#### Observado

Selo "QA92CUPOM15 aplicado −R$ 49,47" (15 % × 329,80, sem o casado), linha "Cupom QA92CUPOM15 −R$ 47,90", Total R$ 271,42. Com duas joias, o selo mostra −104,18 e a linha −100,36. Ao tirar uma joia, a linha vai para −69,51 e o selo continua em −104,18. Na CH-02, o selo ficou em −R$ 52,47, o valor da hora da aplicação, enquanto a linha dizia −R$ 100,37 e depois −R$ 91,46.

#### Evidência

- `screenshots/CH-02-31-gaveta-1440.png`: o selo e a linha do rodapé com valores diferentes
- `screenshots/CH-03-17-duas-joias-tres-berloques-1440.png`: a sacola de duas joias onde o selo de −R$ 104,18 foi lido, pelo snapshot

#### Ocorrências

| Sessão | Persona | Passo | Evidência |
| ------ | ------- | ----- | --------- |
| CH-02 | PER-01 | 25, 27: o selo congelado no valor da aplicação | `screenshots/CH-02-31-gaveta-1440.png` |
| CH-03 | PER-04 | 15–16: duas joias; o selo não desconta o casado e não acompanha a saída de uma joia | `screenshots/CH-03-17-duas-joias-tres-berloques-1440.png` |
| CH-03 | PER-04 | 22: em 390, já na aplicação, −49,47 × −47,90 | — |

#### Relacionados

- **TC:** nenhum. TC-FUNC-017 confere a linha, que está certa
- **Charter:** CH-02, CH-03
- **Critério:** CA-03.6, CA-03.8
- **Bugs:** nenhum

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| `apps/store/src/features/apply-coupon/ui/CouponInput.tsx` — onde o sintoma aparece (localizado pelo planejamento, não diagnosticado) | VOCÊ ALTERA, se a causa estiver aqui | — | — |
| `apps/store/src/widgets/cart-drawer/ui/CartDrawer.tsx` — onde o sintoma aparece (localizado pelo planejamento, não diagnosticado) | VOCÊ ALTERA, se a causa estiver aqui | — | — |
| `apps/store/src/entities/cart/model/useCartPromotion.ts` — onde o sintoma aparece (localizado pelo planejamento, não diagnosticado) | VOCÊ ALTERA, se a causa estiver aqui | — | — |

Só o que ESTA tarefa cria ou consome. `JÁ EXISTE` é afirmação a conferir no código. A causa é do seu diagnóstico: se ela morar fora destes arquivos, siga até ela e diga no retorno.

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-004 · [Sacola · selo do cupom] O selo mostra um valor de cupom diferente da linha do cupom quando há desconto do Compre Junto · high
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA

### Testes

- o comportamento esperado de BUG-004 (a reprodução do bug, que hoje dá o obtido, passa a dar o esperado) — escreva o teste antes do conserto e veja-o reprovar; no nível mais baixo que alcance o defeito (unidade em `core` quando a regra mora lá; componente ou página real quando o defeito é de fiação ou de tela)

### Não faça

- não mude o `status` nem o corpo dos arquivos de `qa/issues/` — reteste e fechamento são da QA
- não corrija outro bug da rodada que não esteja nesta tarefa (BUG-001..013 têm cada um a sua fix task)
- não toque na Adesão por causa da P-01 (`qa/decisoes-produto.md`): o destino é um WI novo
- não altere `packages/core/src/payment/**` sem que o diagnóstico mostre que a causa está lá; se estiver, diga no retorno

### Pronto quando

- [ ] a reprodução de BUG-004 dá o **Esperado** do bug, provado por um teste que reprovou antes do conserto
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
