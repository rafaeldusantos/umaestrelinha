## 18 · [store] BUG-013 — [Página do produto · Compre junto] As peças de uma lista aparecem em grade, e não na faixa que rola dentro do bloco

**Status:** done

`BUG-013` — 92

**Objetivo.** O bug BUG-013 da rodada 1 da QA deixa de acontecer: o que a tela mostra passa a ser o que o critério de aceite de cada bug diz que é esperado.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines; `packages/core/CLAUDE.md` (inteiro); `apps/store/CLAUDE.md` › O bloco Compre Junto, O botão único leva o conjunto, Carrinho, chrome e checkout, A sacola v4 e a marca "acompanha", Minha conta e o detalhe do pedido; `.specs/LESSONS.md` › L-013, L-014, L-015. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** as tarefas 01–08 (`done`, commitadas) — o desconto do Compre Junto já está na árvore. Confira que existe antes de começar.

### Critérios de aceite

### BUG-013 — [Página do produto · Compre junto] As peças de uma lista aparecem em grade, e não na faixa que rola dentro do bloco

#### Resumo

Marina abre "Ver os 2 modelos" da lista "QA Correntes" no bloco Compre junto do pingente. As peças aparecem numa grade de 2 colunas no celular (3 no computador), que cresce para baixo. A decisão Q-02 do Gate 1 exige uma faixa que rola na horizontal dentro do bloco. O "de/por" de cada cartão está certo.

**Origem:** sessão CH-01 · ambiente local

#### Impacto

- **Nível:** Cosmético. Com as 2 peças da massa, Marina escolhe a peça e vê o "de/por" sem esforço, e a grade não empurrou nada. O efeito de uma lista com 3 peças ou mais (a grade empurra o total para baixo) não foi observado, porque a massa só oferece 2 modelos
- **Persona mais atingida:** PER-01 Marina
- **Jornada e passo:** J-01, passo 1 (escolher a peça da lista)
- **Frequência:** sempre (3 de 3: 390, 320 e 1440)
- **Contorno:** nenhum necessário
- **Gravidade proposta na sessão:** medium. Aqui desce para low: o observado é uma divergência de layout sem fricção medida. Fricção, se aparecesse, subiria por estar na J-01, que é P0, mas a sessão não a mediu. Vale reconferir com uma lista de 3 peças ou mais

#### Ambiente

- **URL:** http://localhost:8082/produtos/qa-pingente-estrela
- **Tela:** página do produto · **Componente:** bloco Compre junto, peças da lista ("Escolha a peça")
- **Branch / build:** `feature/92`, dev server Vite
- **Browser:** Chromium headless (Playwright MCP) · **Viewport:** 390 × 844 (também 320 × 568 e 1440 × 900)
- **Rede:** local · **Idioma:** pt-BR

#### Passos

1. Anônima, sacola vazia, abrir `http://localhost:8082/produtos/qa-pingente-estrela` em 390 × 844
2. No bloco "Compre junto", tocar "Ver os 2 modelos" de "QA Correntes"
3. Olhar o grupo "Escolha a peça · 2 modelos"

#### Esperado

As peças numa faixa que rola na horizontal dentro do bloco, sem rolar o `body`, cada cartão com o "de/por", até a última peça.

**Fonte:** decisão Q-02 do Gate 1 (2026-11-04, "a faixa é exigida neste WI; a diferença vira bug"); `spec.md` › Design › Loja — Bloco ("Peças de uma lista (faixa que rola dentro dela)"); protótipo `Produto - Compre Junto com desconto.html` (não lido nesta rodada, porque CH-09 não rodou); TC-FUNC-006, passo 3

#### Observado

Grade: `display: grid`, `grid-template-columns: 131px 131px` em 390, 96px 96px em 320, e 3 colunas de 166px em 1440. `overflow-x: visible`, sem `scroll-snap`. Cada cartão mostra o "de/por" (Veneziana de R$ 89,90 por R$ 80,91; Cartier de R$ 119,90 por R$ 107,91).

#### Evidência

- `screenshots/CH-01-04-lista-grade-390.png`: os dois cartões lado a lado, em grade, em 390
- `screenshots/CH-01-13-bloco-320.png`: a mesma grade em 320
- `screenshots/CH-01-14-bloco-1440.png`: grade de 3 colunas em 1440

#### Design × implementado

| Propriedade | Protótipo | Observado | Confere |
| ----------- | --------- | --------- | ------- |
| Disposição das peças da lista | faixa que rola na horizontal dentro do bloco (`spec.md` › Design; Q-02) | grade de 2 colunas (390, 320) e de 3 (1440) | não |
| Rolagem horizontal interna | sim | `overflow-x: visible`, sem `scroll-snap` | não |
| "de/por" por cartão | sim | sim | sim |

#### Relacionados

- **TC:** TC-FUNC-006
- **Charter:** CH-01
- **Critério:** CA-02.1
- **Protótipo:** Claude Design · `Produto - Compre Junto com desconto.html`, não conferido (CH-09 `not-run`)
- **Bugs:** nenhum

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| `apps/store/src/entities/product/ui/buy-together/AddonPanel.tsx` — onde o sintoma aparece (localizado pelo planejamento, não diagnosticado) | VOCÊ ALTERA, se a causa estiver aqui | — | — |

Só o que ESTA tarefa cria ou consome. `JÁ EXISTE` é afirmação a conferir no código. A causa é do seu diagnóstico: se ela morar fora destes arquivos, siga até ela e diga no retorno.

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-013 · [Página do produto · Compre junto] As peças de uma lista aparecem em grade, e não na faixa que rola dentro do bloco · low
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA
- **D-39** (spec.md, Decisões): A faixa das peças da lista — a faixa que rola dentro do bloco, do protótipo, é exigida neste WI — revisa a premissa 7 da T02; a grade de hoje é bug

### Testes

- o comportamento esperado de BUG-013 (a reprodução do bug, que hoje dá o obtido, passa a dar o esperado) — escreva o teste antes do conserto e veja-o reprovar; no nível mais baixo que alcance o defeito (unidade em `core` quando a regra mora lá; componente ou página real quando o defeito é de fiação ou de tela)

### Não faça

- não mude o `status` nem o corpo dos arquivos de `qa/issues/` — reteste e fechamento são da QA
- não corrija outro bug da rodada que não esteja nesta tarefa (BUG-001..013 têm cada um a sua fix task)
- não toque na Adesão por causa da P-01 (`qa/decisoes-produto.md`): o destino é um WI novo
- não altere `packages/core/src/payment/**` sem que o diagnóstico mostre que a causa está lá; se estiver, diga no retorno

### Pronto quando

- [ ] a reprodução de BUG-013 dá o **Esperado** do bug, provado por um teste que reprovou antes do conserto
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
