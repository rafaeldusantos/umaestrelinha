## 18 · [apps/mobile-adm] BUG-010 — [Montagem] A confirmação "Peça acrescentada." não some e segue no topo até o Revisar

**Status:** done

`BUG-010` — 94

**Objetivo.** A confirmação "Peça acrescentada." some sozinha e não segue no topo até o Revisar.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines; `apps/mobile-adm/CLAUDE.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** 11, 12, 13 e 14 (os mesmos arquivos). Confira que existe antes de começar.

### Critérios de aceite

### BUG-010 — [Montagem] A confirmação "Peça acrescentada." não some e segue no topo até o Revisar

#### Resumo

Ao acrescentar uma peça, a Adri vê "Peça acrescentada. <nome> · <variação>". A confirmação não some: fica como
um bloco no topo do conteúdo e acompanha os passos de Descontos e Revisar, mais de um minuto depois, e é lida
como estado atual — inclusive ao lado do alerta de falha do "Criar link".

**Origem:** sessões CH-08 e CH-09 (e visto no CH-01 e no CH-02) · ambiente local

#### Impacto

- **Nível:** Cosmético
- **Persona mais atingida:** PER-03 Adri com a fonte grande (o bloco ocupa o topo e o leitor de tela o lê junto
  do alerta) — outras: PER-01
- **Jornada e passo:** J-01, passos 3 → 5 (peças, descontos, revisar)
- **Frequência:** sempre
- **Contorno:** nenhum; o bloco não atrapalha o toque
- **Gravidade proposta na sessão:** low (CH-08 e CH-09) — mantida

#### Ambiente

- **URL:** `http://localhost:8084/pedidos/montar` (passos 2 a 4)
- **Tela:** Montar pedido · **Componente:** confirmação "Peça acrescentada." (região `status`)
- **Branch / build:** `feature/94` @ `09b5b575`
- **Browser:** Chromium headless (Playwright MCP) · **Viewport:** 390 × 844
- **Rede:** local · **Idioma:** pt-BR

#### Passos

1. Entre no app do ateliê com a conta de administração, em `/pedidos`, e toque em "Montar pedido"
2. Escolha a cliente e toque em "Continuar"
3. Acrescente uma peça
4. Toque em "Continuar" (Descontos) e de novo em "Continuar" (Revisar)

#### Esperado

Toast flutuante sobre a barra (fundo tinta, ícone de check dourado) que some sozinho em cerca de 3 s.

**Fonte:** protótipo `Montar Pedido.dc.html` (`hasToast`, `showToast` 3200 ms); spec › Design › Passo 2 ("toast
'Peça acrescentada.'"); TC-UI-001

#### Observado

`role=status` estático no topo da área de conteúdo, fundo areia `#f1ebe1`, texto tinta; presente nos passos 2, 3 e
4 e ainda presente ao lado do `alert` "Não consegui gravar o pedido…" quando o "Criar link" falha sem rede.

#### Evidência

- `screenshots/CH-09-15-sacola.png` — o bloco no passo das peças
- `screenshots/CH-09-16-cupom-recusado.png` — o mesmo bloco no passo dos descontos
- `screenshots/CH-09-18-revisar.png` — o mesmo bloco no Revisar
- `screenshots/CH-01-08-revisar-j02.png` — o bloco no Revisar de outra montagem
- `screenshots/CH-08-31-criar-link-offline.png` — o bloco ao lado do alerta de falha

#### Ocorrências

| Sessão | Persona | Passo | Evidência |
| ------ | ------- | ----- | --------- |
| CH-08  | PER-03  | 09–10 | `screenshots/CH-08-31-criar-link-offline.png` |
| CH-09  | PER-01  | 15, 16, 18 | `screenshots/CH-09-15-sacola.png`, `screenshots/CH-09-18-revisar.png` |
| CH-01  | PER-01  | 12 | `screenshots/CH-01-08-revisar-j02.png` |
| CH-02  | PER-01  | debrief | — |

#### Design × implementado

| Propriedade | Protótipo | Observado | Confere |
| ----------- | --------- | --------- | ------- |
| Posição | flutuante sobre a barra | estático no topo do conteúdo | não |
| Fundo | `--estrelinha-ink` | `#f1ebe1` (areia) | não |
| Duração | ~3,2 s | persiste entre passos | não |

#### Relacionados

- **TC:** TC-UI-001, TC-CFR-002
- **Charter:** CH-09, CH-08
- **Critério:** UC-06
- **Protótipo:** Claude Design `a780eec8-…` › `Montar Pedido.dc.html`, toast
- **Bugs:** nenhum

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `apps/mobile-adm/src/pages/MontarPedidoPage.tsx` (só a confirmação) | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/features/order-proposal/model/sacola.ts` | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-010 · [Montagem] A confirmação "Peça acrescentada." não some e segue no topo até o Revisar · low
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA

### Testes

- a confirmação some depois do tempo dela e ao trocar de passo — componente/página (vitest)

### Não faça

- mexer no cabeçalho, na barra e no voltar (tarefas 11 e 14)
- tocar arquivo fora da posse desta tarefa sem registrar no retorno; outras tarefas da mesma onda rodam ao mesmo tempo na mesma árvore

### Pronto quando

- [ ] BUG-010: o **Esperado** do bug acontece seguindo os **Passos** dele
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
