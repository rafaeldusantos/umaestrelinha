## 12 · [apps/mobile-adm] BUG-002, BUG-018 — Montar pedido, passo 2 · folha da variação

**Status:** done

`BUG-002, BUG-018` — 94

**Objetivo.** A folha da variação acrescenta a peça uma vez só por toque, e o chip escolhido, o aviso de material e a linha de estoque seguem o protótipo.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines; `apps/mobile-adm/CLAUDE.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

### Critérios de aceite

### BUG-002 — [Montagem · Peças] Duplo toque em "Acrescentar" põe a mesma peça duas vezes na sacola

#### Resumo

Com o celular numa mão, a Adri toca duas vezes rápido em "Acrescentar · R$ X" na folha da variação. A sacola
recebe duas linhas iguais ("Sacola · 2 peças"). Se ela não notar, o link sai com a peça em dobro e a cliente
recebe um pedido com o dobro do valor combinado.

**Origem:** sessão CH-01 · ambiente local

#### Impacto

- **Nível:** Dano à confiança
- **Persona mais atingida:** PER-01 Adri no WhatsApp — outras: nenhuma
- **Jornada e passo:** J-02 (e J-01), passo 3 (acrescentar as peças)
- **Frequência:** sempre (2 de 2, peças diferentes, cliente cadastrada e cliente nova)
- **Contorno:** remover a linha a mais pela lixeira, se notar
- **Gravidade proposta na sessão:** medium — subiu para high: a jornada é P0 e o efeito, se não notado, é cobrar
  a peça em dobro; o "Criar link" da mesma montagem já é protegido do duplo toque, este botão não

#### Ambiente

- **URL:** `http://localhost:8084/pedidos/montar` (passo 2)
- **Tela:** Montar pedido · Passo 2 Peças · **Componente:** folha da variação, botão "Acrescentar"
- **Branch / build:** `feature/94` @ `09b5b575`
- **Browser:** Chromium headless (Playwright MCP) · **Viewport:** 390 × 844
- **Rede:** local · **Idioma:** pt-BR

#### Passos

1. Entre no app do ateliê com a conta de administração, em `/pedidos`, e toque em "Montar pedido"
2. Escolha uma cliente cadastrada e toque em "Continuar"
3. Busque "qa pingente" e abra uma peça com estoque
4. Toque duas vezes rápido em "Acrescentar · R$ X"

#### Esperado

Uma linha só na sacola.

**Fonte:** TC-FUNC-017, variação "duplo toque em 'Acrescentar' → uma linha só"

#### Observado

"Sacola · 2 peças" com duas linhas idênticas ("QA Pingente Estrela Guia… · Prata 925 · 1 × R$ 269,90"); a
barra diz "Itens · 2 peças · frete à parte".

#### Evidência

- `screenshots/CH-01-05-duplo-toque-duas-linhas.png` — as duas linhas iguais na sacola

#### Ocorrências

| Sessão | Persona | Passo | Evidência |
| ------ | ------- | ----- | --------- |
| CH-01  | PER-01  | 07 (cliente cadastrada, "QA Pingente Estrela Guia…") | `screenshots/CH-01-05-duplo-toque-duas-linhas.png` |
| CH-01  | PER-01  | 18 (cliente nova, "QA Pingente Lua") | — |

#### Relacionados

- **TC:** TC-FUNC-017, TC-PERSONA-001
- **Charter:** CH-01
- **Critério:** UC-06
- **Bugs:** BUG-018 (a mesma folha, divergências de desenho)

### BUG-018 — [Folha da variação] Chip escolhido, aviso de material e linha de estoque diferentes do protótipo

#### Resumo

Na folha da variação, o chip escolhido aparece em areia com borda (não preenchido na cor primária), o aviso de
material vem sem o ícone de envio, e ao passar do estoque a folha mostra "10 em estoque" e, embaixo, "Só há 10
em estoque." — as duas linhas, em vez de uma trocar pela outra.

**Origem:** sessão CH-09 · ambiente local

#### Impacto

- **Nível:** Cosmético
- **Persona mais atingida:** PER-01 Adri no WhatsApp — outras: nenhuma
- **Jornada e passo:** J-01/J-02, passo 3 (escolher a variação)
- **Frequência:** sempre
- **Contorno:** nenhum necessário; a recusa e o botão desligado funcionam
- **Gravidade proposta na sessão:** low — mantida

#### Ambiente

- **URL:** `http://localhost:8084/pedidos/montar` (passo 2)
- **Tela:** Montar pedido · Passo 2 Peças · **Componente:** folha da variação
- **Branch / build:** `feature/94` @ `09b5b575`
- **Browser:** Chromium headless (Playwright MCP) · **Viewport:** 390 × 844
- **Rede:** local · **Idioma:** pt-BR

#### Passos

1. Entre no app do ateliê com a conta de administração, em `/pedidos`, toque em "Montar pedido", escolha a
   cliente e toque em "Continuar"
2. Busque "QA" e abra "QA Medalha Afetiva"
3. Olhe o chip escolhido e o aviso de material; suba a quantidade para 11

#### Esperado

Chip escolhido preenchido em primária com texto on-primary; aviso de material com o ícone "envio" em primária;
acima do estoque, a linha "N em estoque" vira "Só há N em estoque.".

**Fonte:** protótipo `Montar Pedido.dc.html`, Folha da variação; spec › Design › Passo 2 ("'N em estoque' →
acima: 'Só há N em estoque.'")

#### Observado

Chip escolhido em areia `#f1ebe1`, borda primária, texto tinta; aviso de material sem ícone; acima do estoque
aparecem "10 em estoque" e, abaixo, "Só há 10 em estoque.".

#### Evidência

- `screenshots/CH-09-13-folha-variacao.png` — o chip escolhido e o aviso de material
- `screenshots/CH-09-14-acima-do-estoque.png` — as duas linhas de estoque

#### Design × implementado

| Propriedade | Protótipo | Observado | Confere |
| ----------- | --------- | --------- | ------- |
| Fundo do chip escolhido | primária | `#f1ebe1` | não |
| Texto do chip escolhido | on-primary | tinta | não |
| Ícone do aviso de material | "envio" em primária | ausente | não |
| Linha de estoque acima do teto | substituída por "Só há N em estoque." | as duas linhas | não |
| Foto | 104 × 130 | 104 × 130 | sim |

#### Relacionados

- **TC:** TC-UI-001
- **Charter:** CH-09
- **Critério:** UC-06
- **Protótipo:** Claude Design `a780eec8-…` › `Montar Pedido.dc.html`, Folha da variação
- **Bugs:** BUG-002 (o botão "Acrescentar" da mesma folha)

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `apps/mobile-adm/src/features/order-proposal/ui/FolhaDaVariacao.tsx` | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/features/order-proposal/ui/PassoDasPecas.tsx` | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/features/order-proposal/model/sacola.ts` | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-002 · [Montagem · Peças] Duplo toque em "Acrescentar" põe a mesma peça duas vezes na sacola · high
- **Bug**: BUG-018 · [Folha da variação] Chip escolhido, aviso de material e linha de estoque diferentes do protótipo · low
- **Lote**: mesmo componente, `features/order-proposal/ui/FolhaDaVariacao.tsx`, na mesma tela
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA

### Testes

- dois toques seguidos em "Acrescentar" deixam uma linha só na sacola, com a quantidade escolhida — componente/página (vitest)
- o chip escolhido, o aviso de material e a linha de estoque com as classes e os textos do protótipo (token exato) — componente/página (vitest)

### Não faça

- mudar a frase "Peça acrescentada." e o tempo dela na tela (tarefa 18)
- mudar a tipografia do preço da folha (tarefa 20)
- tocar arquivo fora da posse desta tarefa sem registrar no retorno; outras tarefas da mesma onda rodam ao mesmo tempo na mesma árvore

### Pronto quando

- [ ] BUG-002: o **Esperado** do bug acontece seguindo os **Passos** dele
- [ ] BUG-018: o **Esperado** do bug acontece seguindo os **Passos** dele
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu, vermelho antes do fix
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho do arquivo de instruções do repositório

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
