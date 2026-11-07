## 11 · [mobile-adm] BUG-007, BUG-010 — App do ateliê · bloco de valores do detalhe do pedido

**Status:** done

`BUG-007, BUG-010` — 92

**Objetivo.** Os bugs BUG-007, BUG-010 da rodada 1 da QA deixam de acontecer: o que a tela mostra passa a ser o que o critério de aceite de cada bug diz que é esperado.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines; `packages/core/CLAUDE.md` (inteiro); `apps/mobile-adm/CLAUDE.md` (inteiro); `.specs/LESSONS.md` › L-013, L-014, L-015. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** as tarefas 01–08 (`done`, commitadas) — o desconto do Compre Junto já está na árvore. Confira que existe antes de começar.

### Critérios de aceite

### BUG-007 — [App do ateliê · detalhe do pedido] O pedido montado com "Desconto combinado" aparece sem essa linha, e as linhas não somam o Total

#### Resumo

A Adri abriu no celular o pedido #0220, montado pelo painel com o desconto combinado "Cliente antiga" de R$ 20,00. O bloco de valores do app mostra Subtotal, Frete, Cupom e PIX e o Total de R$ 901,86, sem a linha de desconto combinado. Pelas linhas, a conta dá R$ 921,86. O painel mostra o mesmo pedido com a linha.

**Origem:** sessão CH-06 · ambiente local

#### Impacto

- **Nível:** Dano à confiança. As linhas do resumo não fecham com o Total, e a dona não sabe de onde saíram os R$ 20,00
- **Persona mais atingida:** PER-02 / PER-03 Adri (no ateliê)
- **Jornada e passo:** J-05, passo 2 (pedido antigo no app); J-06, passo 2 (lê o bloco de valores)
- **Frequência:** sempre (2 de 2, também depois de recarregar)
- **Contorno:** abrir o pedido no painel
- **Gravidade proposta na sessão:** medium. Aqui sobe para high: "o resumo do pedido não fecha" é dano à confiança no risco do plano. A sessão não sabe se o defeito é anterior ao WI. Este WI mudou o bloco de valores do app (os rótulos vêm de `core`, e a linha "Promoção" saiu). De qualquer forma, por ser `high`, entra como bug

#### Ambiente

- **URL:** http://localhost:8084/pedidos/c8f5baa0-2589-4e75-bf17-552eb983d77a
- **Tela:** detalhe do pedido (app do ateliê) · **Componente:** bloco de valores
- **Branch / build:** `feature/92`, dev server Vite
- **Browser:** Chromium headless (Playwright MCP) · **Viewport:** 390 × 844
- **Rede:** local · **Idioma:** pt-BR

#### Passos

1. Entrar no app do ateliê (http://localhost:8084/login) com a conta `admin-painel`
2. Abrir o pedido #0220. Ele foi montado pelo painel (P-0001) e tem o desconto combinado "Cliente antiga" de R$ 20,00
3. Ler o bloco de valores e somar as linhas

#### Esperado

As mesmas linhas de desconto do painel, inclusive "Desconto combinado — Cliente antiga − R$ 20,00", e as linhas fechando com o Total.

**Fonte:** `prd.md` CA-05.3 (painel e app com a mesma composição) e CA-05.2 ("Pedido feito antes deste WI continua como está"); o painel do mesmo pedido

#### Observado

"Subtotal R$ 1.071,00 · Frete · SEDEX R$ 24,03 · Cupom PROVA89 − R$ 107,10 · Desconto PIX − R$ 66,07 · Total R$ 901,86", sem nenhuma linha de desconto combinado. 1.071,00 + 24,03 − 107,10 − 66,07 = 921,86.

#### Evidência

- `screenshots/CH-06-14-atelie-0220-390.png`: o resumo do app sem a linha
- `screenshots/CH-06-15-atelie-0220-resumo-repro.png`: o mesmo resumo, depois de recarregar
- `screenshots/CH-06-04-pedido-antigo-0220-1440.png`: o painel com a linha "Desconto combinado — Cliente antiga − R$ 20,00"

#### Relacionados

- **TC:** nenhum. TC-FUNC-028 passou nos passos dele: o Total é o mesmo e não há linha nova
- **Charter:** CH-06
- **Critério:** CA-05.2, CA-05.3
- **Bugs:** BUG-010 (o mesmo bloco de valores do app, ordem das linhas)

### BUG-010 — [App do ateliê · detalhe do pedido] O Frete aparece antes dos descontos, fora da ordem do painel — para a Adri conferindo o pedido

#### Resumo

A Adri abriu no celular os pedidos com desconto do Compre Junto. Os valores e o Total são os do painel, mas o bloco de valores do app põe o Frete logo abaixo do Subtotal, antes dos descontos. O painel põe os descontos e o PIX antes do Frete. Ao conferir o mesmo pedido nas duas pontas, ela lê as linhas em ordens diferentes.

**Origem:** sessão CH-07 · ambiente local

#### Impacto

- **Nível:** Fricção. A dona compara o app com o painel e encontra uma ordem diferente, e a conta "Subtotal − descontos" não fica junta
- **Persona mais atingida:** PER-03 Adri (ateliê)
- **Jornada e passo:** J-06, passo 2 (lê o bloco de valores), que é P1 no plano
- **Frequência:** sempre (4 de 4: #0360, #0362, #0363, #0365; e depois de recarregar)
- **Contorno:** nenhum necessário. Os valores batem
- **Gravidade proposta na sessão:** medium. Mantida

#### Ambiente

- **URL:** http://localhost:8084/pedidos/<id>
- **Tela:** detalhe do pedido (app do ateliê) · **Componente:** bloco de valores
- **Branch / build:** `feature/92`, dev server Vite
- **Browser:** Chromium headless (Playwright MCP) · **Viewport:** 390 × 844
- **Rede:** local · **Idioma:** pt-BR

#### Passos

1. Entrar no app do ateliê (http://localhost:8084/login) com a conta `admin-painel`
2. Na aba Pedidos, buscar "0363" (pedido com Compre Junto e cupom) e abrir
3. Ler o bloco de valores e comparar com o painel do mesmo pedido

#### Esperado

Subtotal · Desconto do Compre Junto · Cupom · Desconto PIX · Frete · Total, na mesma ordem do painel.

**Fonte:** decisão Q-01 do Gate 1 (2026-11-04); charter CH-07 › Mudança; TC-FUNC-031, passo 2; TC-JOURNEY-008, passo 2

#### Observado

"Subtotal R$ 329,80 · Frete · Frete padrão R$ 19,90 · Desconto do Compre Junto − R$ 10,48 · Cupom QA92CUPOM15 − R$ 47,90 · Desconto PIX − R$ 19,00 · Total R$ 272,32". O painel, para o mesmo pedido em 390: Subtotal · Compre Junto · Cupom · PIX · Frete · Total.

#### Evidência

- `screenshots/CH-07-01-0360-390.png`: o #0360 com o Frete logo abaixo do Subtotal
- `screenshots/CH-07-02-0365-390.png`: o #0365, com a mesma ordem
- `screenshots/CH-07-07-painel-0363-390.png`: o painel com o Frete antes do Total

#### Relacionados

- **TC:** TC-FUNC-031, TC-JOURNEY-008
- **Charter:** CH-07
- **Critério:** CA-05.3
- **Bugs:** BUG-011 e BUG-012 (o mesmo padrão de ordem na loja e no e-mail); BUG-007 (o mesmo bloco de valores)

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| `apps/mobile-adm/src/widgets/order-detail/ui/BlocoValores.tsx` — onde o sintoma aparece (localizado pelo planejamento, não diagnosticado) | VOCÊ ALTERA, se a causa estiver aqui | — | — |

Só o que ESTA tarefa cria ou consome. `JÁ EXISTE` é afirmação a conferir no código. A causa é do seu diagnóstico: se ela morar fora destes arquivos, siga até ela e diga no retorno.

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-007 · [App do ateliê · detalhe do pedido] O pedido montado com "Desconto combinado" aparece sem essa linha, e as linhas não somam o Total · high
- **Bug**: BUG-010 · [App do ateliê · detalhe do pedido] O Frete aparece antes dos descontos, fora da ordem do painel — para a Adri conferindo o pedido · medium
- **Lote**: mesmo componente na mesma tela — `apps/mobile-adm/src/widgets/order-detail/ui/BlocoValores.tsx`
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA
- **D-38** (spec.md, Decisões): A ordem do resumo nas três pontas — a ordem do painel do pedido (descontos e PIX antes do Frete) vale; a loja (confirmação, Minha conta, e-mail) e o app passam a segui-la — revisa D-36; a diferença é bug da loja e do app. O preço por item (unidade × total da linha) não muda

### Testes

- o comportamento esperado de BUG-007 (a reprodução do bug, que hoje dá o obtido, passa a dar o esperado) — escreva o teste antes do conserto e veja-o reprovar; no nível mais baixo que alcance o defeito (unidade em `core` quando a regra mora lá; componente ou página real quando o defeito é de fiação ou de tela)
- o comportamento esperado de BUG-010 (a reprodução do bug, que hoje dá o obtido, passa a dar o esperado) — escreva o teste antes do conserto e veja-o reprovar; no nível mais baixo que alcance o defeito (unidade em `core` quando a regra mora lá; componente ou página real quando o defeito é de fiação ou de tela)

### Não faça

- não mude o `status` nem o corpo dos arquivos de `qa/issues/` — reteste e fechamento são da QA
- não corrija outro bug da rodada que não esteja nesta tarefa (BUG-001..013 têm cada um a sua fix task)
- não toque na Adesão por causa da P-01 (`qa/decisoes-produto.md`): o destino é um WI novo
- não altere `packages/core/src/payment/**` sem que o diagnóstico mostre que a causa está lá; se estiver, diga no retorno

### Pronto quando

- [ ] a reprodução de BUG-007 dá o **Esperado** do bug, provado por um teste que reprovou antes do conserto
- [ ] a reprodução de BUG-010 dá o **Esperado** do bug, provado por um teste que reprovou antes do conserto
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
