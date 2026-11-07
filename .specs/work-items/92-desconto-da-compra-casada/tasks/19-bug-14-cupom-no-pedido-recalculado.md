## 19 · [functions] BUG-014 — [Pedido recalculado] Com cupom, depois de o desconto subir, a linha do cupom fica no valor antigo e o resumo não fecha com o Total

**Status:** done

`BUG-014` — 92

**Objetivo.** O bug BUG-014 da rodada 2 da QA deixa de acontecer: o que a tela mostra passa a ser o que o critério de aceite de cada bug diz que é esperado.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines; `packages/core/CLAUDE.md` (inteiro); `supabase/CLAUDE.md` › edge functions, e-mail; `.specs/LESSONS.md` › L-013, L-014, L-015. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** as tarefas 01–18 (`done`, commitadas) — o desconto do Compre Junto e as correções da rodada 1 já estão na árvore. Confira que existe antes de começar.

### Critérios de aceite

### BUG-014 — [Pedido recalculado] Com cupom, depois de o desconto subir, a linha do cupom fica no valor antigo e o resumo não fecha com o Total

#### Resumo

Helena fez um pedido com o pingente, o QA Berloque Coração pelo bloco e o cupom QA92CUPOM15, e deixou para pagar depois. Nesse meio-tempo, a dona aumentou o desconto do Berloque. Quando Helena abriu a tela de pagamento, o pedido foi recalculado para um Total menor, e a tela mostra esse Total novo. Mas o resumo do pedido continua com o cupom de antes: somando as linhas que ela vê, o resultado não é o Total. A mesma conta que não fecha aparece em `/pedido/<id>`, no painel do pedido, no app do ateliê e no e-mail do pedido. O valor cobrado (o Total) é o certo. O que está errado é a linha do cupom.

**Origem:** reteste (achado novo no entorno do BUG-005, N-1) · ambiente local

#### Impacto

- **Nível:** Dano à confiança. O resumo do pedido não fecha (Subtotal − descontos + frete ≠ Total) em todas as telas que mostram o pedido. Quem confere a conta acha um erro de R$ 0,53 a R$ 1,05 que ninguém explica
- **Persona mais atingida:** PER-04 Helena. Outras: PER-02 e PER-03 Adri, que veem a mesma conta errada no painel e no app do ateliê
- **Jornada e passo:** J-04, ramo J-04c (pagar depois de o desconto subir), passo "abrir o pedido depois do recálculo"
- **Frequência:** sempre, num pedido com cupom percentual que é recalculado mais barato (2 de 2: 20 % e 25 %)
- **Contorno:** nenhum. Nada na tela explica a diferença
- **Gravidade proposta na sessão:** high. Mantida: é o risco "o resumo do pedido não fecha" do plano, no caminho do dinheiro, em quatro superfícies

#### Ambiente

- **URL:** http://localhost:8082/pedido/<id>/pagamento e /pedido/<id> · http://localhost:8083/admin/pedidos/<id> · app do ateliê http://localhost:8084/pedidos/<id> · prévia do e-mail em http://localhost:8083/admin/configuracoes/notificacoes
- **Tela:** página do pedido (loja), pedido no painel, detalhe do pedido no app do ateliê e e-mail "Pedido recebido" · **Componente:** resumo do pedido (a linha do cupom e o Total)
- **Branch / build:** `feature/92`, HEAD `b48ee26d`, dev servers Vite
- **Browser:** Chromium headless (Playwright MCP) · **Viewport:** 390 × 844 (loja e app) · 1440 × 900 (painel e e-mail)
- **Rede:** local, Mercado Pago com chave inválida (o "cobrado" é o Total gravado) · **Idioma:** pt-BR

#### Passos

1. Com a conta `cliente-loja`, sacola vazia, abrir `/produtos/qa-pingente-estrela`, marcar o QA Berloque Coração (Prata 925) no bloco e "Levar o conjunto"
2. Aplicar o cupom QA92CUPOM15, ir ao checkout, frete padrão, PIX, e criar o pedido. Ele fica pendente com Subtotal R$ 329,80 · Desconto do Compre Junto −R$ 10,48 · Cupom −R$ 47,90 · Desconto PIX −R$ 19,00 · Frete R$ 19,90 · Total R$ 272,32
3. No painel (`admin-painel`), abrir a aba Compre junto do QA Pingente Estrela, subir o Berloque de 15 % para 25 % e salvar
4. Na loja, abrir `/pedido/<id>/pagamento` desse pedido (o pagamento recalcula e regrava o pedido)
5. Abrir `/pedido/<id>` e somar as linhas do resumo

#### Esperado

O cupom é recalculado sobre o subtotal já com o novo desconto do Compre Junto, e as linhas fecham com o Total em todas as telas. Com 25 %: Cupom −R$ 46,85 = 15 % × (329,80 − 17,47), e 329,80 − 17,47 − 46,85 − 18,58 + 19,90 = 266,80.

**Fonte:** `prd.md` CA-03.6 (o cupom incide sobre o subtotal já com o desconto casado), CA-05.2 (Subtotal − descontos + frete = Total), CA-05.3 (painel e app com a mesma composição) e RNF-01; o risco "o resumo do pedido não fecha" do plano

#### Observado

Com 25 %, `/pedido/<id>`, o painel do pedido, o app do ateliê e a prévia do e-mail mostram "Subtotal R$ 329,80 · Desconto do Compre Junto −R$ 17,47 · Cupom −R$ 47,90 · Desconto PIX −R$ 18,58 · Frete R$ 19,90 · Total R$ 266,80". Somadas, as linhas dão R$ 265,75, não R$ 266,80. O Total e o PIX (7 % × 265,48) batem com um cupom de R$ 46,85, mas a linha do cupom continua em R$ 47,90. O banco local guarda `discount = 47.90`, `buy_together_discount = 17.47` e `total = 266.80`. Com 20 % acontece o mesmo: a linha do cupom fica em −R$ 47,90 e o Total R$ 269,56 foi calculado com −R$ 47,37 (R$ 0,53 de diferença).

#### Evidência

- `screenshots/RT-r2-retest-BUG-005-N1-loja-0381-390.png`: `/pedido/:id` do #0381, com linhas que somam 265,75 e Total 266,80
- `screenshots/RT-r2-retest-BUG-005-N1-painel-0381.png`: o painel do mesmo pedido, com as mesmas linhas
- `screenshots/RT-r2-retest-BUG-010-0381-390.png`: o app do ateliê, com o mesmo resumo
- `screenshots/RT-r2-retest-BUG-012-email-0381.png`: a prévia do e-mail "Pedido recebido", com o mesmo resumo

#### Ocorrências

| Sessão | Persona | Passo | Evidência |
| ------ | ------- | ----- | --------- |
| reteste (BUG-005), Berloque a 20 % | PER-04 | 3–5: Cupom −47,90 nas linhas, Total 269,56 calculado com −47,37 | `screenshots/RT-r2-retest-BUG-005.png` |
| reteste (BUG-005), Berloque a 25 %, loja | PER-04 | 5: linhas 265,75 × Total 266,80 | `screenshots/RT-r2-retest-BUG-005-N1-loja-0381-390.png` |
| reteste, painel do pedido | PER-02 | o mesmo pedido | `screenshots/RT-r2-retest-BUG-005-N1-painel-0381.png` |
| reteste (BUG-010), app do ateliê | PER-03 | o mesmo pedido | `screenshots/RT-r2-retest-BUG-010-0381-390.png` |
| reteste (BUG-012), e-mail | PER-04 | o mesmo pedido | `screenshots/RT-r2-retest-BUG-012-email-0381.png` |

#### Relacionados

- **TC:** nenhum falhou nesta rodada. Fica perto de TC-FUNC-025 (o pagamento segue pelo valor menor, que passou) e de TC-JOURNEY-004 (cupom com desconto casado, que passou sem recálculo)
- **Charter:** CH-04 (não rodou nesta rodada; o achado veio do reteste)
- **Critério:** CA-03.6, CA-05.2, CA-05.3, RNF-01
- **Bugs:** BUG-005, cujo reteste revelou este achado. São sintomas diferentes: no BUG-005, o Total da tela de pagamento ficava desatualizado (resolvido). Aqui é a linha do cupom gravada no pedido

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| `supabase/functions/mercado-pago/handlers.ts (a regravação do pedido no recálculo: o `update` de `orders` grava subtotal, PIX, total e os descontos por item, e não a linha do cupom)` — onde o sintoma aparece (localizado pelo planejamento, não diagnosticado) | VOCÊ ALTERA, se a causa estiver aqui | — | — |
| `supabase/functions/mercado-pago/__tests__/` — onde o sintoma aparece (localizado pelo planejamento, não diagnosticado) | VOCÊ ALTERA, se a causa estiver aqui | — | — |

Só o que ESTA tarefa cria ou consome. `JÁ EXISTE` é afirmação a conferir no código. A causa é do seu diagnóstico: se ela morar fora destes arquivos, siga até ela e diga no retorno.

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-014 · [Pedido recalculado] Com cupom, depois de o desconto subir, a linha do cupom fica no valor antigo e o resumo não fecha com o Total · high
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA
- **Origem**: achado novo do reteste da rodada 2 (entorno do BUG-005, resolvido pela tarefa 13). O Total cobrado está certo; o que fica velho é a linha do cupom gravada no pedido (`orders.discount`), lida pela loja, pelo painel, pelo app e pelo e-mail. Corrija a escrita no recálculo para valer daqui para frente — o pedido #0381 do banco local não se regrava à mão (regra 6 do orquestrador)

### Testes

- o comportamento esperado de BUG-014 (a reprodução do bug, que hoje dá o obtido, passa a dar o esperado) — escreva o teste antes do conserto e veja-o reprovar; no nível mais baixo que alcance o defeito (unidade em `core` quando a regra mora lá; componente ou página real quando o defeito é de fiação ou de tela)

### Não faça

- não mude o `status` nem o corpo dos arquivos de `qa/issues/` — reteste e fechamento são da QA
- não corrija outro bug da rodada que não esteja nesta tarefa (BUG-006 e BUG-014 têm cada um a sua fix task; BUG-001..005 e 007..013 estão resolvidos)
- não toque na Adesão por causa da P-01 (`qa/decisoes-produto.md`): o destino é um WI novo
- não altere `packages/core/src/payment/**` sem que o diagnóstico mostre que a causa está lá; se estiver, diga no retorno
- não altere dado existente no banco para fazer a tela fechar: o conserto é a escrita, daqui para frente

### Pronto quando

- [ ] a reprodução de BUG-014 dá o **Esperado** do bug, provado por um teste que reprovou antes do conserto
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
