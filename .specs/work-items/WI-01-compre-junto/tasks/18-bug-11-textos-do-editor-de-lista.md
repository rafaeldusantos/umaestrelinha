## 18 · [apps/backoffice] BUG-011 — [Painel · editor de lista] “Como a cliente vê” descreve a loja errado e faltam as dicas de nome

**Status:** done

`CA-01.1` — WI-01

**Objetivo.** O editor de uma lista do Compre Junto (`/admin/compre-junto/listas/:id` e `/admin/compre-junto/listas/nova`) passa a dizer o que a loja de fato faz e a seguir os textos e o comportamento do protótipo do painel (`cj-admin-listas.jsx` › `EditorLista` e `cj-admin-comum.jsx` › `Variacoes`/`BuscaProduto`, projeto Claude Design "Uma Estrelinha - Backoffice"): a lateral "Como a cliente vê" corrigida, a dica sob "Nome da lista", "Em uso" com a consequência, o resumo "Variações oferecidas", o contador "n / 40", a busca "Acrescentar uma peça" que só lista a partir de 2 letras e até 8 resultados, e a trilha "Compre Junto › <lista>".

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` da raiz › O "defeito 01", › Os guardas, › Convenções, › Baselines; `apps/backoffice/CLAUDE.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** a tarefa 01 (`apps/backoffice/src/features/buy-together-lists/ui/BuyTogetherListEditor.tsx` e `ListItemRow.tsx`) e a 16 (`ProductSearchField` com `bloqueados`). Confira que existem.

### Critérios de aceite

### BUG-011 — [Painel · editor de lista] “Como a cliente vê” descreve a loja errado e faltam as dicas de nome

O envelope completo está em `qa/issues/BUG-011.md`. A tabela "Design × implementado" dele é o critério, linha a linha:

| # | Protótipo (o que passa a valer) |
| - | ------------------------------- |
| D16 | lateral "Como a cliente vê": `Na página da joia, o bloco mostra o nome da lista e as peças nesta ordem, e a cliente escolhe uma. Peças fora do ar, sem nenhuma variação à venda, ou que sejam a própria joia da página são puladas.` (a frase antiga "O nome da lista é o título do bloco…" some) |
| D17 | dica sob o campo "Nome da lista" (lista nova e existente): `É este nome que a cliente lê no Compre Junto, na página de cada joia que usa a lista. Escreva como você falaria com ela: “Correntes”, “Pingentes para a mesma corrente”.` — ligada ao campo por `aria-describedby` |
| D18 | lateral "Em uso", com joias: `N joias oferecem esta lista. Mudar aqui muda o Compre Junto de todas elas.` (singular `1 joia oferece esta lista. …`); os nomes (até 4) e "Ver as N joias" continuam |
| D19 | resumo das variações de cada peça: `Variações oferecidas: todas as ativas (N)` / `Variações oferecidas: k de N` |
| D20 | contador do nome: `12 / 40` (com espaços em volta da barra) |
| D21 | busca de peça: rótulo `Acrescentar uma peça`, placeholder `Buscar pelo nome da joia`; nenhum resultado aparece com menos de 2 letras no termo (aparado); a partir de 2, no máximo 8 resultados |
| D22 | trilha: `Compre Junto › <nome da lista>` (sem o nível "Catálogo") |

O que já conferia (recusa da 13ª peça, "Já está na lista", "N de 12") não muda.

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `BuyTogetherListEditor` / `ListItemRow` (`apps/backoffice/src/features/buy-together-lists/ui/`) | JÁ EXISTE | as mesmas props | os textos D16–D22 |
| `ProductSearchField` (`apps/backoffice/src/entities/product/ui/ProductSearchField.tsx`) | JÁ EXISTE | duas props opcionais novas: `minimoDeLetras?: number` (padrão 0 — sem mudança nas outras superfícies) e `teto?: number` (padrão `RESULTADOS_VISIVEIS`, passado a `buscarProdutos` pela opção `teto` que já existe) | com o termo aparado abaixo do mínimo, não renderiza lista, vazio nem "Mostrando…"; o contador do topo continua |
| `CharCounter` (`apps/backoffice/src/shared/ui/CharCounter.tsx`) | JÁ EXISTE | prop opcional `espacado?: boolean` (padrão falso — "0/600" de Configurações não muda) | `n / limite` quando ligada. As DUAS formas ficam escritas diretamente (comprimento colado na barra, com ou sem espaços), porque `contadorComDonoUnico.test.ts` ancora a régua nessa linha do dono (`/\.length\s*\}?\s*\//`) |
| `RecordPageHeader` (`apps/backoffice/src/shared/ui/RecordPageHeader.tsx`) | JÁ EXISTE | `group` passa a opcional | sem `group`, a trilha começa pelo `parentLabel` (sem o primeiro nível e o seu chevron); os outros chamadores não mudam |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-011 · [Painel · editor de lista] “Como a cliente vê” descreve a loja errado e faltam as dicas de nome · medium
- **Fechamento**: a tarefa fecha com o fix do bug; ele segue `open` até o reteste do QA
- **Premissa (orquestrador, sem humano)**: os textos vêm do protótipo lido em `cj-admin-listas.jsx` › `EditorLista`; no mesmo cartão "Em uso", sem joias, o protótipo diz `Nenhuma joia usa esta lista ainda. Ela entra na loja quando você a escolher no Compre Junto de uma joia.` — entra junto (mesmo cartão, mesma fonte). O mínimo de 2 letras e o teto de 8 valem só no editor de lista (a costura, `spec.md` › Editor de lista); a aba Compre junto do produto também os cita, mas fica fora (é de outra tarefa, já fechada). Raio de alcance: o editor de lista; três componentes compartilhados ganham props OPCIONAIS cujo padrão preserva as outras telas.
- **Fora desta tarefa**: o índice das listas (BUG-012), a aba Compre junto do produto, os demais bugs da QA, a cor do botão "Excluir lista".

### Testes

- pelo editor real (`apps/backoffice/src/pages/admin/AdminBuyTogether.test.tsx`):
  - "Como a cliente vê" com a frase D16 e sem a frase antiga
  - a dica D17 sob o nome, na lista nova e na existente, apontada pelo `aria-describedby` do campo
  - "Em uso" com a frase D18 (plural e singular) e a frase sem joias
  - o resumo "Variações oferecidas: todas as ativas (N)" e "k de N"
  - o contador `0 / 40` → `9 / 40`
  - a busca pelo rótulo "Acrescentar uma peça": sem digitar e com 1 letra, nenhuma peça listada; com 2 letras, até 8
  - a trilha começa por "Compre Junto" e não tem "Catálogo"
- `ProductSearchField.test.tsx`: `minimoDeLetras` esconde a lista abaixo do mínimo (espaços não contam) e `teto` corta os itens; sem as props, o comportamento antigo (20, lista sem digitar)
- `CharCounter`/`FieldGroup.test.tsx` ou teste próprio: `espacado` dá `n / limite`; sem ela, `n/limite`
- `RecordPageHeader.test.tsx`: sem `group`, a trilha não tem o primeiro nível; com, igual a antes
- as asserções antigas do editor que cravavam os textos velhos ("0/40", "Acrescentar peça", "Variações: …") são reescritas pelo valor novo do protótipo (mudança de VALOR), nenhuma afrouxada; um teste que digitava 1 letra para listar passa a digitar 2

### Não faça

- Não mexa no índice das listas, na aba Compre junto do produto nem nos outros bugs
- Não mude o padrão de `CharCounter`, `ProductSearchField` ou `RecordPageHeader` para as outras telas
- Não afrouxe `contadorComDonoUnico.test.ts`

### Pronto quando

- [ ] o editor de lista mostra os textos e o comportamento D16–D22
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu, que reprovou antes do código
- [ ] as suítes do painel (`pnpm --filter @estrelinha/backoffice test --testTimeout=20000`) e da loja (`pnpm --filter @estrelinha/store test --testTimeout=20000`, os guardas varrem o painel) passando, exit 0 fora de pipe
- [ ] `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` com 0 erros e `npx eslint` nos arquivos tocados sem erro novo
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
