## 20 · [backoffice] BUG-006 — [Painel · aba Compre junto] A prévia da faixa de uma lista inclui o preço de uma peça que a loja não oferece nessa lista — para a dona

**Status:** done

`BUG-006` — 92

**Objetivo.** O bug BUG-006 da rodada 2 da QA deixa de acontecer: o que a tela mostra passa a ser o que o critério de aceite de cada bug diz que é esperado.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines; `packages/core/CLAUDE.md` (inteiro); `apps/backoffice/CLAUDE.md` › Molde dos formulários, Compre Junto › a aba "Compre junto" do produto; `apps/store/CLAUDE.md` › O bloco Compre Junto, O botão único leva o conjunto, Carrinho, chrome e checkout, A sacola v4 e a marca "acompanha", Minha conta e o detalhe do pedido; `.specs/LESSONS.md` › L-013, L-014, L-015. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** as tarefas 01–18 (`done`, commitadas) — o desconto do Compre Junto e as correções da rodada 1 já estão na árvore. Confira que existe antes de começar.

### Critérios de aceite

### BUG-006 — [Painel · aba Compre junto] A prévia da faixa de uma lista inclui o preço de uma peça que a loja não oferece nessa lista — para a dona

#### Resumo

A Adri deu 10 % à lista "QA Correntes" no QA Pingente Estrela. A prévia diz "As peças de QA Correntes saem de R$ 62,91 a R$ 116,91 com esta joia.". Na loja, essa lista mostra só a Veneziana (R$ 80,91) e a Cartier (a partir de R$ 107,91) com essa joia. O piso de R$ 62,91 é o QA Berloque Coração com 10 % (69,90 × 0,90). O Berloque está na lista, mas a loja não o mostra dentro dela nessa joia, porque ele já é um adicional avulso dela. A prévia anuncia um preço que a cliente não vai encontrar.

**Origem:** sessão CH-05 · ambiente local

#### Impacto

- **Nível:** Dano à confiança. A prévia existe para dizer "por quanto a peça sai", e a loja não confirma o número
- **Persona mais atingida:** PER-02 Adri (painel)
- **Jornada e passo:** J-02, passo 5 (comparar com a loja)
- **Frequência:** sempre, numa lista em que uma peça também é adicional avulso da mesma joia (2 de 2)
- **Contorno:** conferir na loja
- **Gravidade proposta na sessão:** high. Mantida

#### Ambiente

- **URL:** http://localhost:8083/admin/produtos/<id de "QA Pingente Estrela">/editar (aba Compre junto) e http://localhost:8082/produtos/qa-pingente-estrela
- **Tela:** aba Compre junto do produto (painel) · **Componente:** prévia do desconto do adicional (lista)
- **Branch / build:** `feature/92`, dev server Vite
- **Browser:** Chromium headless (Playwright MCP) · **Viewport:** 1440 × 900
- **Rede:** local · **Idioma:** pt-BR

#### Passos

1. Entrar com a conta `admin-painel` e abrir `/admin/produtos/<id de "QA Pingente Estrela">/editar`, aba "Compre junto". O adicional 1 é a lista "QA Correntes", que inclui o QA Berloque Coração. O adicional 2 é o próprio QA Berloque Coração, avulso
2. No adicional 1, com 10 %, ler a prévia
3. Em outra aba, anônima, abrir `http://localhost:8082/produtos/qa-pingente-estrela`. No bloco Compre junto, tocar "Ver os 2 modelos" de QA Correntes

#### Esperado

A faixa da prévia é a das peças que a loja oferece dentro dessa lista com essa joia, e o preço levando junto na loja é o da prévia.

**Fonte:** `prd.md` CA-01.5 e CA-02.1; TC-JOURNEY-003 ("o preço levando junto da loja = o da prévia")

#### Observado

Prévia: "As peças de QA Correntes saem de R$ 62,91 a R$ 116,91 com esta joia.". Loja: só "QA Corrente Veneziana de R$ 89,90 por R$ 80,91" e "QA Corrente Cartier de R$ 119,90 por R$ 107,91". O teto de R$ 116,91 corresponde à Cartier 60 cm (R$ 129,90 → R$ 116,91), vista na CH-01. O piso de R$ 62,91 não aparece em nenhuma peça da lista na loja.

#### Evidência

- `screenshots/CH-05-08-gravado-12.png`: a aba com a prévia "de R$ 62,91 a R$ 116,91" da lista QA Correntes
- `screenshots/CH-05-12-loja-P-14.png`: o bloco na loja com a lista
- `screenshots/CH-01-04-lista-grade-390.png`: a lista aberta na loja, só com Veneziana e Cartier

#### Relacionados

- **TC:** TC-JOURNEY-003
- **Charter:** CH-05
- **Critério:** CA-01.5, CA-02.1
- **Bugs:** nenhum

#### Histórico

| Rodada | Status | O que se viu | Evidência |
| --- | --- | --- | --- |
| Rodada 2 · 2026-11-07 (Gate 3) | open → still-open | O caso relatado foi corrigido (o Berloque avulso saiu do piso; teto R$ 125,91 bate com a Banhada 80 cm na loja), mas a prévia diz 'de R$ 71,91 a R$ 125,91' e o piso vem da QA Corrente Esgotada (79,90 × 0,90), que a loja pula; a loja mostra piso R$ 80,91. Com 20 %, piso R$ 63,92. Reproduziu 3 de 3 no reteste e 2 de 2 no CH-05 r2 | screenshots/RT-r2-retest-BUG-006-previa.png · screenshots/RT-r2-retest-BUG-006-loja-lista.png · screenshots/CH-05-r2-01-previa-lista.png |

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| `apps/backoffice/src/features/product-form/model/discountPreview.ts (`pecasDaListaNestaJoia`)` — onde o sintoma aparece (localizado pelo planejamento, não diagnosticado) | VOCÊ ALTERA, se a causa estiver aqui | — | — |
| `apps/backoffice/src/features/product-form/ui/BuyTogetherTab.tsx` — onde o sintoma aparece (localizado pelo planejamento, não diagnosticado) | VOCÊ ALTERA, se a causa estiver aqui | — | — |
| `apps/backoffice/src/pages/admin/AdminProductFormPage.compreJunto.test.tsx` — onde o sintoma aparece (localizado pelo planejamento, não diagnosticado) | VOCÊ ALTERA, se a causa estiver aqui | — | — |

Só o que ESTA tarefa cria ou consome. `JÁ EXISTE` é afirmação a conferir no código. A causa é do seu diagnóstico: se ela morar fora destes arquivos, siga até ela e diga no retorno.

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-006 · [Painel · aba Compre junto] A prévia da faixa de uma lista inclui o preço de uma peça que a loja não oferece nessa lista — para a dona · high
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA
- **Reteste reprovado da tarefa 14** (`done`): ela tirou o adicional avulso da faixa, e o reteste da rodada 2 achou o piso vindo de uma peça sem variação à venda (QA Corrente Esgotada, 79,90 × 0,90 = R$ 71,91; a loja começa em R$ 80,91). A régua do Esperado é a da QA: a prévia pula **as mesmas peças que a loja pula** — fora do ar, sem variação à venda, a própria joia, o adicional avulso, a variação não oferecida. Ler a regra da loja (o bloco na página do produto) e reusá-la ou compartilhá-la é o caminho que impede o terceiro reteste; uma segunda escrita da regra é o "defeito 01"

### Testes

- o comportamento esperado de BUG-006 (a reprodução do bug, que hoje dá o obtido, passa a dar o esperado) — escreva o teste antes do conserto e veja-o reprovar; no nível mais baixo que alcance o defeito (unidade em `core` quando a regra mora lá; componente ou página real quando o defeito é de fiação ou de tela)

### Não faça

- não mude o `status` nem o corpo dos arquivos de `qa/issues/` — reteste e fechamento são da QA
- não corrija outro bug da rodada que não esteja nesta tarefa (BUG-006 e BUG-014 têm cada um a sua fix task; BUG-001..005 e 007..013 estão resolvidos)
- não toque na Adesão por causa da P-01 (`qa/decisoes-produto.md`): o destino é um WI novo
- não altere `packages/core/src/payment/**` sem que o diagnóstico mostre que a causa está lá; se estiver, diga no retorno
- não altere dado existente no banco para fazer a tela fechar: o conserto é a escrita, daqui para frente

### Pronto quando

- [ ] a reprodução de BUG-006 dá o **Esperado** do bug, provado por um teste que reprovou antes do conserto
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
