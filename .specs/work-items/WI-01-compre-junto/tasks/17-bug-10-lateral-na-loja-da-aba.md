## 17 · [apps/backoffice + packages/core] BUG-010 — [Painel · aba Compre junto do produto] Falta o cartão “Na loja” e os textos diferem do protótipo

**Status:** done

`CA-02.1` — WI-01

**Objetivo.** A aba "Compre junto" do formulário do produto passa a ter o desenho do protótipo do painel (`cj-admin-produto.jsx` e `cj-admin-comum.jsx` › `Variacoes`, projeto Claude Design "Uma Estrelinha - Backoffice"): ao lado do cartão "Compre junto", uma coluna da própria aba com o cartão **"Na loja"** (a lista ordenada dos adicionais como a cliente vai vê-los) e o cartão "Quando a peça sai do ar"; as dicas de nome sob a escolha; a peça só escolhida com "a partir de R$ X"; as variações oferecidas recolhidas atrás de uma linha-resumo com "Escolher quais"; e os textos do protótipo, inclusive a recusa do 4º adicional.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` da raiz › O "defeito 01", › Os guardas, › Convenções, › Baselines; `apps/backoffice/CLAUDE.md`; `packages/core/CLAUDE.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** a tarefa 02 (`apps/backoffice/src/features/product-form/ui/BuyTogetherTab.tsx`) e a 16 (prop `bloqueados` do `ProductSearchField`, já em uso na aba). Confira que existem.

### Critérios de aceite

### BUG-010 — [Painel · aba Compre junto do produto] Falta o cartão “Na loja” e os textos diferem do protótipo

O envelope completo está em `qa/issues/BUG-010.md`. A tabela "Design × implementado" dele é o critério, linha a linha:

| # | Protótipo (o que passa a valer) |
| - | ------------------------------- |
| D27 | cartão lateral **"Na loja"** (título `h2`), frase `O bloco fica entre a escolha da variação e o botão de compra, nesta ordem:`, e uma lista ordenada (`<ol>`) com um item por adicional, na ordem do rascunho: o nome como a loja mostra (nome da lista ou do produto) em negrito e, abaixo, `a cliente escolhe uma peça` (tipo lista) ou `uma peça só` (tipo produto), seguido de ` · some com X, Y` quando há variações da joia marcadas em "Some quando" (rótulos separados por vírgula e espaço); adicional sem lista nem peça mostra `falta escolher` e nada abaixo; sem adicionais, `Nenhum adicional.`. A lista acompanha o rascunho na hora (subir, descer, tirar, trocar de tipo, marcar "some") |
| D28 | frase do cartão: `Até três peças que a cliente pode levar junto com esta joia, na ordem em que aparecem na loja. Nada vem marcado: ela escolhe o que quer.` |
| D29 | sob a escolha de lista: `O nome da lista é o que a cliente lê no bloco.`; sob a peça só escolhida: `O nome do produto é o que a cliente lê no bloco.` |
| D30 | peça só escolhida: nome + `a partir de R$ X` (o `precoBase` de `useProductVariants`, formatado por `formatPrice` de `@estrelinha/core/formatters`) + "Trocar" |
| D31 | variações oferecidas: linha `Variações oferecidas: todas as ativas (N)` (nenhuma marcada) ou `Variações oferecidas: k de N` (k = marcadas que ainda existem, N = ativas), com o botão `Escolher quais` / `Esconder` (`aria-expanded`) e `Oferecer todas` quando há marcada; os chips só aparecem abertos; aberto e sem marcada, `Nenhuma marcada: a loja oferece todas as variações ativas, inclusive as que você criar depois.`. Abre por padrão quando já há variação marcada (como o protótipo: `useState(vars.length > 0)`). O aviso "Nenhuma das variações escolhidas existe mais…" continua visível com a linha fechada |
| D32 | recusa do 4º adicional: `Cada joia leva até 3 adicionais. Tire um para acrescentar outro.` |
| D33 | "Quando a peça sai do ar" na coluna lateral, abaixo de "Na loja", com o texto `A loja pula o adicional sem quebrar a página, e ele aparece marcado aqui. Se todas as variações que você escolheu deixarem de existir, ele também sai — nunca passa a oferecer todas.` |

O que já conferia (`N de 3 adicionais`, "Some quando a cliente escolhe", "Esta joia está na lista e é pulada aqui…", estado "Sem Compre Junto…") não muda.

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `addonCountRefusal` (`packages/core/src/buy-together/rules.ts`) | JÁ EXISTE | | a frase passa a começar por "Cada joia leva até 3 adicionais." — é o dono único da recusa (painel na tela e em `persistAddons`); não há segunda escrita da frase |
| `BuyTogetherTab` (`apps/backoffice/src/features/product-form/ui/BuyTogetherTab.tsx`) | JÁ EXISTE | as mesmas props | a aba vira uma grade própria: coluna principal (cartão "Compre junto") e coluna lateral (cartões "Na loja" e "Quando a peça sai do ar"), uma coluna só abaixo de `xl` (o cartão "Compre junto" primeiro, na ordem do DOM), duas a partir de `xl` com trilha `minmax(0,…)` (a coluna lateral da página — Resumo — continua a mesma; a lateral é da aba) |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-010 · [Painel · aba Compre junto do produto] Falta o cartão “Na loja” e os textos diferem do protótipo · medium
- **Fechamento**: a tarefa fecha com o fix do bug; ele segue `open` até o reteste do QA
- **Premissa (orquestrador, sem humano)**: a lateral do formulário do produto (Resumo, Publicação, Pronto para publicar, Fornecedor) é da página e serve a todas as abas; tirar dela o Resumo para pôr "Na loja" mudaria as outras abas. Por isso a lateral do protótipo vira uma coluna **da aba**, ao lado do cartão "Compre junto" a partir de `xl` (1280 px) e empilhada abaixo dele antes disso. O nome mostrado em "Na loja" vem da mesma fonte do título do adicional (nome da lista em `useBuyTogetherLists`, nome da peça em `useProductVariants`, cacheado pelo React Query). Raio de alcance: só a aba Compre junto do produto e a frase de `addonCountRefusal` (lida também por `persistAddons`).
- **Fora desta tarefa**: o campo "Desconto ao levar junto" (WI 92) e a faixa de conversão (fora da costura); o editor de lista (`ListItemRow`, BUG-011) mesmo onde o texto dele também diverge; os demais bugs da QA.

### Testes

- `packages/core/src/buy-together/__tests__/rules.test.ts`: a recusa do 4º com a frase nova (o caso existente reescrito pelo valor novo da spec, não afrouxado)
- `apps/backoffice/src/features/product-form/model/addons.test.ts` e `persistAddons.test.ts`: as asserções da frase passam ao valor novo
- pela aba real (`apps/backoffice/src/pages/admin/AdminProductFormPage.compreJunto.test.tsx`):
  - o cartão "Na loja" lista os adicionais na ordem, com `a cliente escolhe uma peça` / `uma peça só`, ` · some com …` quando há variação marcada, `falta escolher` para o incompleto e `Nenhum adicional.` sem adicionais; subir um adicional inverte a ordem do cartão
  - a frase D28 do cartão "Compre junto"
  - as dicas de nome D29 nos dois tipos
  - a peça só escolhida mostra `a partir de R$ …`
  - as variações oferecidas: resumo `todas as ativas (N)`, chips ausentes até "Escolher quais", a frase D31 aberta e sem marcada, `k de N` com marcada, aberta por padrão quando o adicional já vem com variação marcada
  - a recusa do 4º com a frase D32
  - "Quando a peça sai do ar" com o texto D33, depois de "Na loja"
- as asserções antigas da aba que cravavam os textos velhos são reescritas pelo valor novo do protótipo (mudança de VALOR da spec), nenhuma afrouxada

### Não faça

- Não mexa nos outros bugs da QA nem no `ListItemRow`
- Não mude a lateral da página do produto (Resumo) nem as outras abas
- Não escreva a frase da recusa fora de `core`

### Pronto quando

- [ ] a aba Compre junto mostra "Na loja" e os textos D28–D33 do protótipo
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu, que reprovou antes do código
- [ ] as suítes de `core` (`pnpm --filter @estrelinha/core test`), do painel (`pnpm --filter @estrelinha/backoffice test --testTimeout=20000`) e da loja (`pnpm --filter @estrelinha/store test --testTimeout=20000`, os guardas varrem o painel) passando, exit 0 fora de pipe
- [ ] `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` com 0 erros, `packages/core` sem erro novo além dos 11 herdados, e `npx eslint` nos arquivos tocados sem erro novo
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
