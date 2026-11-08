## 11 · [apps/mobile-adm] BUG-001, BUG-007 — Montar pedido / Pedido montado · o voltar (entradas da montagem no histórico)

**Status:** done

`BUG-001, BUG-007` — 94

**Objetivo.** O voltar do Android, dentro e logo depois da montagem, faz o que a costura manda: depois de "Criar link" leva a Montados com a montagem fora do histórico (D-43), e com a folha "Sair sem criar o link?" aberta fecha a folha.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines; `apps/mobile-adm/CLAUDE.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

### Critérios de aceite

### BUG-001 — [Pedido montado] Voltar depois de "Criar link" reabre a montagem vazia em vez de Montados

#### Resumo

A Adri acaba de criar o link e, já no pedido montado, usa o voltar do celular para conferir a lista. Em vez de
cair em Montados com o cartão que acabou de criar, ela cai numa montagem nova e vazia ("Passo 1 de 4 ·
Cliente"). O voltar seguinte leva a Pedidos (não a Montados) e o avançar reabre a montagem vazia; o pedido
montado deixa de ser alcançável pelo avançar. Ela fica sem saber se o link foi criado.

**Origem:** sessões CH-01 e CH-04 · ambiente local

#### Impacto

- **Nível:** Dano à confiança
- **Persona mais atingida:** PER-01 Adri no WhatsApp — outras: PER-02 Adri interrompida
- **Jornada e passo:** J-02, passo 5 (criar o link) → saída natural para Montados; J-01 passo 6b; J-03 (CH-04)
- **Frequência:** sempre (2 de 2, em duas sessões)
- **Contorno:** tocar no "x" da montagem vazia e abrir o chip "Montados" à mão
- **Gravidade proposta na sessão:** high — mantida (o plano já previa P1 pela D-43)

#### Ambiente

- **URL:** `http://localhost:8084/pedidos/montados/<id>` → voltar → `/pedidos/montar`
- **Tela:** Pedido montado → Montar pedido · **Componente:** voltar do navegador (o voltar do Android)
- **Branch / build:** `feature/94` @ `09b5b575`
- **Browser:** Chromium headless (Playwright MCP) · **Viewport:** 390 × 844
- **Rede:** local, sem limitação · **Idioma:** pt-BR

#### Passos

1. Entre no app do ateliê com a conta de administração, em `/pedidos`
2. Toque em "Montar pedido", escolha uma cliente cadastrada, acrescente uma peça e siga até "Revisar"
3. Toque em "Criar link" — abre o pedido montado com "Link criado."
4. Use o voltar do navegador (o voltar do Android)
5. Use o voltar mais uma vez; depois use o avançar

#### Esperado

O primeiro voltar leva a `/pedidos?visao=montados` com o cartão novo; a montagem sai do histórico, então um
segundo voltar não a reabre (e o avançar não a reabre).

**Fonte:** spec D-43 (resposta da Q-01, 2026-11-08) · TC-FUNC-025 (variação P1) · TC-FUNC-003 · TC-JOURNEY-001 passo 6b

#### Observado

- 1.º voltar: URL `/pedidos/montar`, "Montar pedido · Passo 1 de 4 · Cliente", vazia, com "Escolha a cliente
  para continuar."; os botões "Passo 2: Peças" e "Passo 3: Descontos" do indicador aparecem habilitados sem
  cliente; o título da aba continua "Pedido montado · Ateliê". `history.length` 8 → 4, `state.usr =
  {doApp:true, passoDaMontagem:1}`
- 2.º voltar: `/pedidos` (Precisa de ação), não Montados
- Avançar: reabre `/pedidos/montar` vazia; o pedido montado não volta pelo avançar

#### Evidência

- `screenshots/CH-01-10-voltar-cai-na-montagem.png` — a montagem vazia depois do voltar (CH-01)
- `screenshots/CH-04-15-voltar-depois-do-link.png` — o mesmo, com "Passo 2" habilitado (CH-04)
- `screenshots/CH-01-09-link-criado-j02.png` — o pedido montado de onde se voltou

#### Ocorrências

| Sessão | Persona | Passo | Evidência |
| ------ | ------- | ----- | --------- |
| CH-01  | PER-01  | 14    | `screenshots/CH-01-10-voltar-cai-na-montagem.png` |
| CH-04  | PER-02  | 17–18 | `screenshots/CH-04-15-voltar-depois-do-link.png` |

#### Relacionados

- **TC:** TC-FUNC-025, TC-FUNC-003, TC-JOURNEY-002, TC-PERSONA-001
- **Charter:** CH-01, CH-04
- **Critério:** UC-02, UC-08 · D-43
- **Bugs:** BUG-007 (outro voltar da montagem que sai do lugar)

### BUG-007 — [Montagem] Voltar com a folha "Sair sem criar o link?" aberta sai da montagem em vez de fechar a folha

#### Resumo

A Adri usa o voltar do celular para andar entre os passos. No passo 1 o voltar abre "Sair sem criar o link?".
O gesto natural para "não, fico" é voltar de novo — e isso a tira da montagem, para Pedidos, sem ela escolher
"Sair", "Guardar rascunho" ou "Descartar". A cliente escolhida se perde.

**Origem:** sessão CH-04 · ambiente local

#### Impacto

- **Nível:** Fricção
- **Persona mais atingida:** PER-02 Adri interrompida — outras: PER-01
- **Jornada e passo:** J-03, ramos J-03a/J-03b (sair)
- **Frequência:** sempre (2 de 2: só com a cliente; com peças e descontos)
- **Contorno:** fechar a folha por "Continuar montando"; se já saiu, reabrir e escolher a cliente de novo (as
  peças voltam pelo rascunho automático)
- **Gravidade proposta na sessão:** medium — mantida. Não testado com "Cliente nova" digitada; nesse caso o
  mesmo gesto levaria nome, e-mail, CPF e endereço digitados

#### Ambiente

- **URL:** `http://localhost:8084/pedidos/montar` → `/pedidos`
- **Tela:** Montar pedido · **Componente:** folha "Sair sem criar o link?" e o voltar do navegador
- **Branch / build:** `feature/94` @ `09b5b575`
- **Browser:** Chromium headless (Playwright MCP) · **Viewport:** 390 × 844
- **Rede:** local · **Idioma:** pt-BR

#### Passos

1. Entre no app do ateliê com a conta de administração, em `/pedidos`, e toque em "Montar pedido"
2. Escolha uma cliente cadastrada (opcional: siga, acrescente uma peça e volte ao passo 1)
3. Use o voltar do navegador: abre "Sair sem criar o link?"
4. Use o voltar de novo, com a folha aberta

#### Esperado

A folha fecha e a montagem fica no passo 1, como acontece com a folha da variação e com as folhas do pedido
montado.

**Fonte:** TC-FUNC-004 › Variações ("voltar com a folha aberta: a folha fecha, a montagem fica"); spec D-12 ("o
voltar do Android volta um passo (ou fecha a folha aberta)")

#### Observado

A tela vai a `/pedidos` (Precisa de ação), sem folha; a cliente escolhida se perde. `history.state` passa de
`{doApp, passoDaMontagem:0}` (idx 1) a `{idx:0}`. Com peças, o rascunho fica no aparelho sem a Adri ter
escolhido "Guardar rascunho" ou "Descartar".

#### Evidência

- `screenshots/CH-04-10-folha-sair-com-pecas.png` — a folha aberta, no instante anterior ao segundo voltar

#### Ocorrências

| Sessão | Persona | Passo | Evidência |
| ------ | ------- | ----- | --------- |
| CH-04  | PER-02  | 04 (só a cliente) | — |
| CH-04  | PER-02  | 11 (com peças e descontos) | `screenshots/CH-04-10-folha-sair-com-pecas.png` |

#### Relacionados

- **TC:** TC-FUNC-004
- **Charter:** CH-04
- **Critério:** UC-02 · D-12, D-18
- **Bugs:** BUG-001 (o voltar depois do link)

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `apps/mobile-adm/src/pages/MontarPedidoPage.tsx` | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/features/order-proposal/model/usePassosDaMontagem.ts` | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/features/order-proposal/model/useCriarLink.ts` | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/features/order-proposal/ui/FolhaDeConfirmacao.tsx` | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-001 · [Pedido montado] Voltar depois de "Criar link" reabre a montagem vazia em vez de Montados · high
- **Bug**: BUG-007 · [Montagem] Voltar com a folha "Sair sem criar o link?" aberta sai da montagem em vez de fechar a folha · medium
- **Lote**: mesmo comportamento — as entradas da montagem no histórico (`pages/MontarPedidoPage.tsx`, `features/order-proposal/model/usePassosDaMontagem.ts`) — em duas telas
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA
- **D-43** (spec › Decisões): o voltar do Android logo depois de "Criar link" leva a Montados (`/pedidos?visao=montados`) com a montagem fora do histórico: a criação do link substitui as entradas dos passos, e um segundo voltar não reabre a montagem.
- Voltar do Android (spec, premissa técnica): cada passo e cada folha é uma entrada de histórico, sem dado da cliente no `state` — o guarda `semDadoDeClienteNoAparelho` continua valendo.

### Testes

- voltar depois de criar o link cai em Montados com o cartão novo, e um segundo voltar e o avançar não reabrem a montagem — página real (`<App />`), histórico real — componente/página (vitest)
- voltar com a folha "Sair sem criar o link?" aberta fecha a folha e mantém o passo — componente/página (vitest)

### Não faça

- mexer no cabeçalho, no indicador e na barra fixa (tarefa 14)
- mexer na folha "Colar texto" (tarefa 13) e na confirmação "Peça acrescentada." (tarefa 18)
- pôr dado da cliente no `history.state`
- tocar arquivo fora da posse desta tarefa sem registrar no retorno; outras tarefas da mesma onda rodam ao mesmo tempo na mesma árvore

### Pronto quando

- [ ] BUG-001: o **Esperado** do bug acontece seguindo os **Passos** dele
- [ ] BUG-007: o **Esperado** do bug acontece seguindo os **Passos** dele
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
