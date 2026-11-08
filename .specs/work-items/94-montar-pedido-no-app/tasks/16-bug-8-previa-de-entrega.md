## 16 · [apps/mobile-adm] BUG-008 — [Montagem · Revisar] A prévia de entrega para CEP de Porto Alegre não mostra a Retirada no escritório

**Status:** done

`BUG-008` — 94

**Objetivo.** A prévia da entrega no Revisar inclui "Retirada no escritório" para CEP do RS, como o painel.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines; `apps/mobile-adm/CLAUDE.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

### Critérios de aceite

### BUG-008 — [Montagem · Revisar] A prévia de entrega para CEP de Porto Alegre não mostra a Retirada no escritório

#### Resumo

Na revisão de um pedido para uma cliente de Porto Alegre, a Adri confere a prévia de entrega para dizer à
cliente as opções. A prévia mostra só "SEDEX · 1 a 2 dias úteis · R$ 17,91" — sem a "Retirada no escritório",
que vale para CEP do RS. No painel, no mesmo ambiente e para um CEP de Porto Alegre, a prévia mostra SEDEX **e**
Retirada.

**Origem:** sessão CH-01 (e visto no CH-09) · ambiente local, cotação do Melhor Envio servida localmente

#### Impacto

- **Nível:** Fricção
- **Persona mais atingida:** PER-01 Adri no WhatsApp — outras: PER-06 (a cliente pode não saber que pode retirar)
- **Jornada e passo:** J-02, passo 5 (revisar)
- **Frequência:** sempre (2 de 2 no app)
- **Contorno:** nenhum no app; a cliente vê as opções no link
- **Gravidade proposta na sessão:** low — subiu para medium: a Adri usa a prévia para orientar a cliente, e o
  painel no mesmo ambiente mostra a Retirada, então não é falta de configuração

#### Ambiente

- **URL:** `http://localhost:8084/pedidos/montar` (passo 4)
- **Tela:** Montar pedido · Passo 4 Revisar · **Componente:** cartão "Entrega", prévia da cotação
- **Branch / build:** `feature/94` @ `09b5b575`
- **Browser:** Chromium headless (Playwright MCP) · **Viewport:** 390 × 844
- **Rede:** local · **Idioma:** pt-BR

#### Passos

1. Entre no app do ateliê com a conta de administração, em `/pedidos`, e toque em "Montar pedido"
2. Escolha "Marta Lúcia QA Oitenta e Nove" com o endereço salvo de CEP 90010-000 (Porto Alegre)
3. Acrescente duas peças e siga até "Revisar"
4. Olhe o cartão "Entrega"

#### Esperado

Prévia com PAC · Correios, SEDEX · Correios e "Retirada no escritório" para CEP do RS, com prazo e preço, e
"Prévia. A cliente escolhe a entrega no link."

**Fonte:** spec › Design › Passo 4 · Revisar ("prévia: PAC · Correios, SEDEX · Correios, 'Retirada no escritório'
para CEP do RS"); TC-FUNC-024 passo 2

#### Observado

"SEDEX · 1 a 2 dias úteis · R$ 17,91" e "Prévia. A cliente escolhe a entrega no link." Sem a Retirada. (Sem PAC
também — mas a cotação local devolveu só SEDEX no painel, então a ausência do PAC parece do ambiente; a da
Retirada, não: o painel, no CH-07, mostrou "SEDEX R$ 16,61 e Retirada" para CEP 90010-000.)

#### Evidência

- `screenshots/CH-01-08-revisar-j02.png` — o cartão "Entrega" só com SEDEX, CEP 90010000
- `screenshots/CH-09-18-revisar.png` — a revisão de outra montagem, também só com SEDEX

#### Ocorrências

| Sessão | Persona | Passo | Evidência |
| ------ | ------- | ----- | --------- |
| CH-01  | PER-01  | 12 | `screenshots/CH-01-08-revisar-j02.png` |
| CH-09  | PER-01  | 18 | `screenshots/CH-09-18-revisar.png` |

#### Relacionados

- **TC:** TC-FUNC-024
- **Charter:** CH-01
- **Critério:** UC-08
- **Bugs:** nenhum

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `apps/mobile-adm/src/features/order-proposal/model/useCotacaoDaRevisao.ts` | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/features/order-proposal/api/portaDaCotacao.ts` | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/features/order-proposal/model/revisao.ts` | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/features/order-proposal/ui/PassoRevisar.tsx` (o cartão Entrega) | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-008 · [Montagem · Revisar] A prévia de entrega para CEP de Porto Alegre não mostra a Retirada no escritório · medium
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA
- A regra da retirada tem dono único em `packages/core/src/shipping/pickup.ts` (`AD-049`): consuma, não reescreva.

### Testes

- CEP do RS com a retirada disponível mostra "Retirada no escritório" na prévia; CEP de fora do RS, não — componente/página (vitest)

### Não faça

- alterar `packages/core/src/shipping/pickup.ts`
- mudar a linha "Total" do resumo (tarefa 22)
- tocar arquivo fora da posse desta tarefa sem registrar no retorno; outras tarefas da mesma onda rodam ao mesmo tempo na mesma árvore

### Pronto quando

- [ ] BUG-008: o **Esperado** do bug acontece seguindo os **Passos** dele
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
