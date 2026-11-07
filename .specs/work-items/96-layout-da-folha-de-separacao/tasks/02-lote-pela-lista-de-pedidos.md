## 02 · [store: apps/backoffice] A folha em lote pela lista de Pedidos

**Status:** done

`C-08` — 96

**Objetivo.** Na lista de Pedidos, o botão "Folha de separação" do cabeçalho e o da barra de seleção geram um documento só com a folha completa de cada pedido (até 10), lendo os dados pelo carregador da tarefa 01.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz), `apps/backoffice/CLAUDE.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · plan.md — Código — /Users/rafael.santos/Projetos/uma-estrelinha/store.

**Depende de.** Tarefa 01: o carregador `entities/order/api/pickSlipOrders.ts` (N ids ⇒ `PickSlipOrder[]` na ordem dos ids; falha de `orders`/`order_items` lança) e a forma nova de `openPickSlips` (abre a janela no clique, preenche depois da leitura, sinaliza popup bloqueado e falha). Confira que existem, e a assinatura real, antes de começar.

### Critérios de aceite

| #    | O que precisa passar a ser verdade |
| ---- | ---------------------------------- |
| C-08 | A folha gerada pela lista de Pedidos (botão do cabeçalho e barra de lote) lê os dados completos de cada pedido e gera um documento só, uma folha por pedido, com C-01..C-07 em todas. Máximo de 10 pedidos por lote: acima disso, saem os 10 primeiros e a tela avisa quantos ficaram de fora |

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `entities/order/api/pickSlipOrders.ts` | JÁ EXISTE (tarefa 01). Consuma; não altere | ids | `Promise<PickSlipOrder[]>` |
| `features/pick-slip › openPickSlips` | JÁ EXISTE (tarefa 01). Consuma; não altere | `openPickSlips(fonte, opcoes?)`, `fonte` = `PickSlipOrder[]` **ou** `() => Promise<PickSlipOrder[]>` (ex.: `() => fetchPickSlipOrders(ids)`), chamada dentro do clique, sem `await` antes | `Promise<'aberta' \| 'bloqueada' \| 'falhou' \| 'vazia'>`; os avisos: `PICK_SLIP_BLOCKED` (`@/features/pick-slip`) para `bloqueada` e `PICK_SLIP_READ_FAILED` (`@/entities/order`) para `falhou` — molde no botão de `AdminOrderPage.tsx` |
| teto da folha em lote (ex.: `PICK_SLIP_LIMIT = 10`) | VOCÊ CRIA, num lugar só no painel (ex.: `features/order-list/model/`, ao lado de `bulkMaterial.ts`) | — | — |
| `pages/admin/AdminOrdersPage.tsx` — botão do cabeçalho e `onPickSlips` da barra; `widgets`/`features` `OrderBulkBar.tsx` | JÁ EXISTE. Altere | — | — |

### Decisões já tomadas

- P4: "Máximo 10 pedidos por lote" — aplicado como: acima de 10, saem os 10 primeiros e a tela avisa quantos ficaram de fora. Vale para os dois botões: com seleção, os selecionados; sem seleção, o botão do cabeçalho usa os pedidos da página (também recortados em 10).
- P3: a falha da leitura da Observação não impede a impressão (já resolvido no carregador); a falha de pedidos/itens avisa e nada é impresso ("Nada foi impresso").
- O botão fica ocupado enquanto lê (convenção da feature `88`: `ActionButton` ou o mesmo padrão, gerúndio, `aria-busy`), e um segundo clique não abre outra janela.
- Popup bloqueado avisa (nunca falha em silêncio).
- O aviso usa o toast que a lista já usa para o lote de material.

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| recorte de lote com teto e aviso | `apps/backoffice/src/features/order-list/model/bulkMaterial.ts › BULK_LIMIT` e o uso dele em `AdminOrdersPage.tsx › acionarLote` |
| gesto assíncrono do lote com leitura dos selecionados | `AdminOrdersPage.tsx` — o uso de `fetchSentEmails` para os selecionados |
| botão ocupado | `ActionButton` (feature `88`, ver `apps/backoffice/CLAUDE.md`) |
| teste da página com o client dublado | `apps/backoffice/src/pages/admin/AdminOrdersPage.aviso.test.tsx` |

### Testes

- página (`AdminOrdersPage` real): com pedidos selecionados, o botão da barra e o do cabeçalho passam ao carregador os ids selecionados e entregam a `openPickSlips` os pedidos completos.
- página: sem seleção, o botão do cabeçalho usa os pedidos da página.
- página: com 12 selecionados, saem os 10 primeiros e a tela avisa que 2 ficaram de fora; com 10, sem aviso.
- página: leitura que falha avisa e não imprime.
- página: popup bloqueado avisa.
- página: o botão fica ocupado enquanto lê e não abre segunda janela num duplo clique.

### Obrigações

- `animacaoRespeitaMovimento` (escopo literal): classe `animate-*`/`transition-*` nova em arquivo do escopo leva par `motion-reduce:` na mesma linha; `animate-spin` é dispensado.
- Mobile primeiro: os botões continuam com alvo ≥ 44px (`min-h-[44px]`) e sem rolagem horizontal em 390.
- Lint sem `any` novo (`@typescript-eslint/no-explicit-any` é `error`; baseline do painel 23/5).
- Os testes de página que hoje só dublam `openPickSlips` (`vi.mock('@/features/pick-slip', …)`) precisam continuar verdes: se o mock precisar exportar algo novo, ajuste o mock, nunca a asserção.

### Não faça

- O layout da folha, o carregador e `openPickSlips` — são da tarefa 01 (consuma, não altere; divergência vai no retorno).
- A folha da página de um pedido (`AdminOrderPage.tsx`) — tarefa 01.
- Leitura nova em `order_list`; migration; mudança de RLS.

### Pronto quando

- [ ] os dois botões da lista geram um documento com a folha completa de cada pedido, até 10, com aviso acima disso
- [ ] falha de leitura e popup bloqueado avisam; o botão fica ocupado durante a leitura
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
