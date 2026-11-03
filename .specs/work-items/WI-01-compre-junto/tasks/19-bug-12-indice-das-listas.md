## 19 · [apps/backoffice] BUG-012 — [Painel · Compre Junto, aba Listas] Subtítulo, contagem da aba e cartões fora do protótipo

**Status:** done

`CA-01.4` — WI-01

**Objetivo.** O índice do Compre Junto (`/admin/compre-junto`, e o cabeçalho e as abas compartilhados com `/admin/compre-junto/adesao`) passa a seguir o protótipo do painel (`cj-admin-listas.jsx` › `Pagina` e `ListasIndex`, projeto Claude Design "Uma Estrelinha - Backoffice"): o subtítulo do protótipo, a contagem de listas DENTRO da aba "Listas", a tabela e os cartões dentro de um cartão, "Editar" como botão pequeno com borda, e a linha de apoio dos cartões do celular com "em uso em N joias" / "em nenhuma joia".

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` da raiz › O "defeito 01", › Os guardas, › Convenções, › Baselines; `apps/backoffice/CLAUDE.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** a tarefa 01 (`apps/backoffice/src/features/buy-together-lists/ui/BuyTogetherListsIndex.tsx` e `BuyTogetherTabs.tsx`) e a 06 (`apps/backoffice/src/pages/admin/AdminBuyTogetherAdoptionPage.tsx`). Confira que existem.

### Critérios de aceite

### BUG-012 — [Painel · Compre Junto, aba Listas] Subtítulo, contagem da aba e cartões fora do protótipo

O envelope completo está em `qa/issues/BUG-012.md`. A tabela "Design × implementado" dele é o critério, linha a linha:

| # | Protótipo (o que passa a valer) |
| - | ------------------------------- |
| D23 | subtítulo da página, nas DUAS abas (Listas e Adesão — o protótipo tem um cabeçalho só para a página): `As listas de peças que você oferece junto com outras joias, e como elas estão saindo. O Compre Junto de cada joia se monta na página dela.` |
| D24 | a contagem das listas dentro da aba "Listas" (`Listas 2`), nas duas abas; o título "Listas (n)" acima da tabela some. Enquanto a leitura não terminou, ou se falhou, a aba não mostra número (não afirma um 0 que não sabe) |
| D25 | a tabela (computador) e os cartões (celular), e também o vazio, o erro e o carregamento, dentro de um cartão (`rounded-2xl border bg-card`); "Editar" como botão pequeno com borda (`variant="outline" size="sm"`), mantendo o alvo de 44px (`min-h-11`) |
| D26 | linha de apoio dos cartões, 390: `5 peças · em uso em 2 joias` / `1 peça · em nenhuma joia` (a tabela continua com "2 joias" / "Nenhuma joia", como no protótipo) |

O que já conferia (as 5 colunas da tabela) não muda.

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `BuyTogetherTabs` (`apps/backoffice/src/features/buy-together-lists/ui/BuyTogetherTabs.tsx`) | JÁ EXISTE | prop opcional nova `listas?: number` | com o número, a aba "Listas" mostra o número ao lado do rótulo; sem, só o rótulo |
| `BuyTogetherListsIndex` (`…/ui/BuyTogetherListsIndex.tsx`) | JÁ EXISTE | as mesmas props | D23, D25, D26; sem o título "Listas (n)" |
| `AdminBuyTogetherPage` / `AdminBuyTogetherAdoptionPage` (`apps/backoffice/src/pages/admin/`) | JÁ EXISTE | — | passam a contagem às abas (a Adesão lê as listas por `useBuyTogetherLists`); a Adesão com o subtítulo D23 |
| o subtítulo D23 | NOVO, uma constante exportada pelo slice `buy-together-lists` | — | lida pelas duas páginas — duas escritas da mesma frase divergem (o "defeito 01") |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-012 · [Painel · Compre Junto, aba Listas] Subtítulo, contagem da aba e cartões fora do protótipo · low
- **Causa raiz**: `BuyTogetherListsIndex.tsx` escreveu o subtítulo, a contagem (num `<p>` "Listas (n)") e a linha dos cartões (`usoDe`) por conta própria, e a tabela fora de cartão com `variant="ghost"`; `BuyTogetherTabs.tsx` não recebe contagem; `AdminBuyTogetherAdoptionPage.tsx` tem um segundo subtítulo.
- **Fechamento**: a tarefa fecha com o fix do bug; ele segue `open` até o reteste do QA
- **Premissa (orquestrador, sem humano)**: no protótipo, o cabeçalho e as abas são um só para a página (`Pagina`), então o subtítulo e a contagem valem também na aba Adesão; isso custa uma leitura das listas na Adesão (a mesma consulta do índice). Raio de alcance: as duas páginas do Compre Junto; nenhum componente compartilhado de `shared/ui` muda.
- **Fora desta tarefa**: o cartão do recorte e os rótulos da aba Adesão (BUG-013), o editor de lista, os demais bugs da QA, o cartão "forma do bloco" (tarefa 07).

### Testes

- pelo índice real (`apps/backoffice/src/pages/admin/AdminBuyTogether.test.tsx`):
  - o subtítulo D23
  - a aba "Listas" com o número de listas (0 sem listas, 1 com uma) e nenhum título "Listas (n)" fora dela
  - a tabela e os cartões dentro do mesmo cartão; "Editar" com a classe de borda (variante outline) e `min-h-11`
  - o cartão do celular com "3 peças · em nenhuma joia" e, com uso, "4 peças · em uso em 2 joias" (e singular "em uso em 1 joia")
  - a leitura que falha: a aba sem número
- pela Adesão real (`AdminBuyTogetherAdoption.test.tsx`): o subtítulo D23 e a aba "Listas" com a contagem
- as asserções antigas que cravavam `contagem-de-listas` e o nome exato `'Listas'` do link são reescritas pelo valor novo (mudança de VALOR), nenhuma afrouxada

### Não faça

- Não mexa na aba Adesão além do subtítulo e da contagem da aba (o resto é BUG-013)
- Não mude componentes de `shared/ui`
- Não afrouxe guarda nenhum

### Pronto quando

- [ ] o índice e as abas mostram D23–D26
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
