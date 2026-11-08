## 22 · [apps/mobile-adm] BUG-019 — [Textos da montagem e do pedido montado] Rótulos e sinais que divergem do protótipo

**Status:** done

`BUG-019` — 94

**Objetivo.** Os rótulos e sinais da montagem e do pedido montado batem com o protótipo.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines; `apps/mobile-adm/CLAUDE.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** 13, 16, 17 e 19 (os mesmos arquivos). Confira que existe antes de começar.

### Critérios de aceite

### BUG-019 — [Textos da montagem e do pedido montado] Rótulos e sinais que divergem do protótipo

#### Resumo

Alguns rótulos e sinais estão escritos de outro jeito do que o protótipo, sem decisão na costura que os troque:
o rótulo do valor do desconto combinado, a última linha do resumo da revisão, o sinal do desconto e o contador da
folha "Colar texto".

**Origem:** sessão CH-09 · ambiente local

#### Impacto

- **Nível:** Cosmético
- **Persona mais atingida:** PER-01 Adri no WhatsApp — outras: nenhuma
- **Jornada e passo:** UC-05, UC-07, UC-08, UC-09
- **Frequência:** sempre
- **Contorno:** nenhum necessário
- **Gravidade proposta na sessão:** low — mantida

#### Ambiente

- **URL:** `http://localhost:8084/pedidos/montar`, `/pedidos/montados/<id>`
- **Tela:** Montar pedido (passos 1, 3 e 4) e Pedido montado · **Componente:** textos (sem um componente só)
- **Branch / build:** `feature/94` @ `09b5b575`
- **Browser:** Chromium headless (Playwright MCP) · **Viewport:** 390 × 844
- **Rede:** local · **Idioma:** pt-BR

#### Passos

1. Entre no app do ateliê com a conta de administração, em `/pedidos`, e toque em "Montar pedido"
2. Em "Cliente nova", abra "Colar texto da conversa" e olhe o contador
3. Escolha a cliente e uma peça; no passo 3 ligue "Desconto combinado" e olhe o rótulo do valor; siga ao Revisar
   e olhe a última linha do resumo
4. Abra um pedido montado com desconto e olhe o sinal da linha do desconto

#### Esperado

Os textos do protótipo (tabela abaixo).

**Fonte:** protótipo `Montar Pedido.dc.html` (Passo 3, Passo 4, Pedido montado, Folha · Colar texto)

#### Observado

Ver a tabela abaixo.

#### Evidência

- `screenshots/CH-09-17-combinado-zera.png` — "Valor em %"
- `screenshots/CH-09-18-revisar.png` — a última linha "Itens"
- `screenshots/CH-09-04-cancelada.png` — "- R$ 47,19" com hífen
- `screenshots/CH-09-07-folha-colar.png` — o contador "0/2000"

#### Design × implementado

| Propriedade | Protótipo | Observado | Confere |
| ----------- | --------- | --------- | ------- |
| Passo 3, rótulo do valor do combinado | "Desconto (%)" / "Desconto (R$)" | "Valor em %" | não |
| Passo 4, última linha do resumo | "Total" | "Itens" | não |
| Pedido montado, sinal do desconto | "− R$ …" (sinal de menos) | "- R$ 47,19" (hífen) | não |
| Folha "Colar texto", contador | "0 / 2000" | "0/2000" | não |

#### Relacionados

- **TC:** TC-UI-001
- **Charter:** CH-09
- **Critério:** UC-05, UC-07, UC-08, UC-09
- **Protótipo:** Claude Design `a780eec8-…` › `Montar Pedido.dc.html`
- **Bugs:** BUG-009 (os textos do Histórico)

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `apps/mobile-adm/src/features/order-proposal/model/descontos.ts` | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/features/order-proposal/model/revisao.ts` | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/features/order-proposal/model/frases.ts` | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/features/order-proposal/ui/FolhaColarTexto.tsx` (o contador) | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/features/order-proposal/ui/PassoDosDescontos.tsx` | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/features/order-proposal/ui/PassoRevisar.tsx` | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/pages/PedidoMontadoPage.tsx` (o sinal do desconto) | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-019 · [Textos da montagem e do pedido montado] Rótulos e sinais que divergem do protótipo · low
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA
- O valor em dinheiro sai do formatador de `core`; o sinal de menos é `−` (U+2212), não o hífen.

### Testes

- cada texto da tabela do bug, lido no DOM — componente/página (vitest)

### Não faça

- mudar medidas (tarefa 23) ou tipografia (tarefa 20)
- tocar arquivo fora da posse desta tarefa sem registrar no retorno; outras tarefas da mesma onda rodam ao mesmo tempo na mesma árvore

### Pronto quando

- [ ] BUG-019: o **Esperado** do bug acontece seguindo os **Passos** dele
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
