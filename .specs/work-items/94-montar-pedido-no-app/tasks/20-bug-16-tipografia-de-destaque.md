## 20 · [apps/mobile-adm] BUG-016 — [Valores em dinheiro e nome da cliente] Sem a tipografia de destaque do protótipo

**Status:** done

`BUG-016` — 94

**Objetivo.** Totais, preços e o nome da cliente usam a tipografia de destaque do protótipo nas cinco telas.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines; `apps/mobile-adm/CLAUDE.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** 11 a 19 (toca arquivos de quase todos os lotes; roda por último). Confira que existe antes de começar.

### Critérios de aceite

### BUG-016 — [Valores em dinheiro e nome da cliente] Sem a tipografia de destaque do protótipo

#### Resumo

Os totais e preços (cartão de Montados, "Total dos itens", barra fixa, preço da folha da variação) e o nome da
cliente escolhida aparecem na fonte de corpo, sem peso e na cor de texto comum. No protótipo eles são o destaque
da tela, em serifa 700 na cor primária.

**Origem:** sessão CH-09 · ambiente local

#### Impacto

- **Nível:** Cosmético
- **Persona mais atingida:** PER-01 Adri no WhatsApp — outras: nenhuma
- **Jornada e passo:** UC-01, UC-06, UC-09 (lista, peças, pedido montado)
- **Frequência:** sempre (5 telas)
- **Contorno:** nenhum necessário
- **Gravidade proposta na sessão:** low — mantida

#### Ambiente

- **URL:** `http://localhost:8084/pedidos?visao=montados`, `/pedidos/montar`, `/pedidos/montados/<id>`
- **Tela:** Montados, Montar pedido (passos 1 e 2, folha da variação, barra), Pedido montado · **Componente:**
  valores em dinheiro e nome da cliente
- **Branch / build:** `feature/94` @ `09b5b575`
- **Browser:** Chromium headless (Playwright MCP) · **Viewport:** 390 × 844
- **Rede:** local · **Idioma:** pt-BR

#### Passos

1. Entre no app do ateliê com a conta de administração e abra `/pedidos?visao=montados`
2. Olhe o total de um cartão; abra um pedido montado e olhe "Total dos itens" e o nome da cliente
3. Toque em "Montar pedido", escolha uma cliente (nome no cartão), abra a folha de uma peça (preço) e
   acrescente-a (total da barra)

#### Esperado

Totais e preços em `--font-display` (Libre Baskerville) 700, cor primária (16/18/18/16 px); nome da cliente
em display 700, 17 px.

**Fonte:** protótipo `Montar Pedido.dc.html` (Montados, Pedido montado, Passo 1, Folha da variação, casca)

#### Observado

Ver a tabela abaixo.

#### Evidência

- `screenshots/CH-09-01-montados.png` — o total do cartão
- `screenshots/CH-09-02-aberta.png` — "Total dos itens" e o nome da cliente
- `screenshots/CH-09-13-folha-variacao.png` — o preço da folha
- `screenshots/CH-09-15-sacola.png` — o total da barra
- `screenshots/CH-09-10-cadastrada-escolhida.png` — o nome da cliente escolhida

#### Design × implementado

| Propriedade | Protótipo | Observado | Confere |
| ----------- | --------- | --------- | ------- |
| Total do cartão de Montados | display 700 primária 16 px | Outfit 500 16 px tinta | não |
| "Total dos itens" | display 700 primária 18 px | Outfit 500 14 px tinta | não |
| Total da barra | display 700 primária 18 px | Libre Baskerville 400 18 px tinta | não |
| Preço da folha da variação | display 700 primária 16 px | Outfit 400 16 px tinta | não |
| Nome da cliente | display 700 17 px | Outfit 400/500 16 px | não |

#### Relacionados

- **TC:** TC-UI-001
- **Charter:** CH-09
- **Critério:** UC-01, UC-06, UC-09
- **Protótipo:** Claude Design `a780eec8-…` › `Montar Pedido.dc.html`
- **Bugs:** nenhum

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `apps/mobile-adm/src/widgets/proposal-list/ui/ListaDeMontados.tsx` | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/pages/MontarPedidoPage.tsx` (o total da barra) | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/features/order-proposal/ui/PassoRevisar.tsx` | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/features/order-proposal/ui/FolhaDaVariacao.tsx` (o preço) | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/features/order-proposal/ui/PassoDaCliente.tsx` (o nome) | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-016 · [Valores em dinheiro e nome da cliente] Sem a tipografia de destaque do protótipo · low
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA
- Fontes e cores pelos tokens do preset (`packages/ui/src/tokens/estrelinha.ts`); o guarda `palette.test.ts` recusa cópia.

### Testes

- cada um dos cinco valores com a classe da tipografia de destaque (token exato) — componente/página (vitest)

### Não faça

- alterar `packages/ui` ou o `tailwind.config` do app
- mudar texto (tarefa 22) ou medida (tarefa 23)
- tocar arquivo fora da posse desta tarefa sem registrar no retorno; outras tarefas da mesma onda rodam ao mesmo tempo na mesma árvore

### Pronto quando

- [ ] BUG-016: o **Esperado** do bug acontece seguindo os **Passos** dele
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
