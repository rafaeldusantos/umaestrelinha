# WI-01 Compre Junto — Validation Report

**Date**: 2026-11-02
**Run by**: Validation (Dev), fechamento da corrida por ondas
**Source**: `prd.md` + `spec.md` + os `Pronto quando` de `tasks/01..07`
**Árvore medida**: worktree `feature/WI-01`, com os commits `23d346d4..22980fdd` mais as três correções de commit abaixo (`67626a0c`, `07fc6a29`, `415af2b5`). Depois delas, `git diff HEAD` fora de `.specs/work-items/` está vazio: o HEAD é exatamente a árvore medida.

---

## Validation 14 — fix task 20 (BUG-013), 2026-11-03

**Status**: PASS · escopo: o repositório que a tarefa 20 tocou (`apps/backoffice`) e a loja, cujos guardas varrem `apps/**`.

- **Mudança**: o cartão do recorte da Adesão segue o protótipo (`cj-admin-listas.jsx` › `Adesao`): título `h2` "Por joia principal" / "Por lista" à esquerda e o alternador à direita, na mesma linha `flex flex-wrap items-center justify-between`, com a `section` nomeada pelo título (`aria-labelledby`, `useId`); o alternador diz "Por joia" / "Por lista" (segue o `Tabs` do design system, papel `tab`, `min-h-11`); a nota da régua com o `Info` do lucide de 14 px, `aria-hidden`, antes do texto; a última linha dos cartões de 390 diz "Mais sai: X" (a coluna da tabela continua "Peça que mais sai"). Só `AdoptionReport.tsx`. Commit `f9167d9d`.
- **Testes**: backoffice `280 passed` / `5086 passed`, exit 0 (era 5081: +5 em `AdminBuyTogetherAdoption.test.tsx`, pela página real, os cinco vermelhos antes do código; nenhuma asserção antiga tocada — no HEAD nenhuma cravava a aba "Por joia principal" nem a linha "Peça que mais sai:" dos cartões); store `366 passed` / `6901 passed`, exit 0 (idêntico). `--testTimeout=20000`, um workspace por vez, exit fora de pipe.
- **Tipos**: `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` 0.
- **Lint**: `npx eslint` nos dois arquivos tocados sem erro (baseline do backoffice 23/5 inalterada).
- **Revisão adversarial** (`wi-impl-review`): serve, sem achados.
- **Bugs da QA**: BUG-013 com fix task `done` — aguardando o reteste do QA.

---

## Validation 13 — fix task 19 (BUG-012), 2026-11-02

**Status**: PASS · escopo: o repositório que a tarefa 19 tocou (`apps/backoffice`) e a loja, cujos guardas varrem `apps/**`.

- **Mudança**: o índice do Compre Junto segue o protótipo (`cj-admin-listas.jsx` › `Pagina` e `ListasIndex`): o subtítulo "As listas de peças que você oferece junto com outras joias, e como elas estão saindo. O Compre Junto de cada joia se monta na página dela." nas duas abas, numa constante só (`BUY_TOGETHER_SUBTITLE`, `features/buy-together-lists/model/copy.ts`); a contagem das listas dentro da aba "Listas" (`BuyTogetherTabs` com `listas?`, sem número enquanto lê ou se a leitura falhou; a Adesão lê as listas pelo mesmo `useBuyTogetherLists`), sem o título "Listas (n)"; erro, carregamento, vazio, tabela e cartões dentro de um cartão (`rounded-2xl border bg-card`); "Editar" `outline`/`sm` com `min-h-11`; os cartões de 390 com "em uso em N joias" / "em nenhuma joia" (a tabela segue com "N joias" / "Nenhuma joia").
- **Testes**: backoffice `280 passed` / `5081 passed`, exit 0 (era 5074: +7 entre `AdminBuyTogether.test.tsx` e `AdminBuyTogetherAdoption.test.tsx`, pelas páginas reais; asserções antigas de `contagem-de-listas` e do nome `'Listas'` reescritas pelo valor novo, nenhuma afrouxada); store `366 passed` / `6901 passed`, exit 0 (idêntico; a primeira corrida terminou com exit 1 por `[vitest-worker]: Timeout calling "onTaskUpdate"` com 6901/6901 verdes — contenção do worker, não asserção — e a segunda, sozinha, exit 0). `--testTimeout=20000`, um workspace por vez, exit fora de pipe, remedido pela thread principal.
- **Tipos**: `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` 0.
- **Lint**: backoffice 23 erros / 5 warnings (baseline 23/5).
- **Revisão adversarial** (`wi-impl-review`): serve, sem achados.
- **Bugs da QA**: BUG-012 com fix task `done` — aguardando o reteste do QA.
- **Caducou** (tarefa 01, não reescrita): "'N joia(s)' ou 'Nenhuma joia'" no índice vale agora só para a tabela; os cartões dizem "em uso em N joia(s)" / "em nenhuma joia".

---

## Validation 12 — fix task 18 (BUG-011), 2026-11-02

**Status**: PASS · escopo: o repositório que a tarefa 18 tocou (`apps/backoffice`) e a loja, cujos guardas varrem `apps/**`.

- **Mudança**: o editor de lista do Compre Junto segue o protótipo (`cj-admin-listas.jsx` › `EditorLista`): "Como a cliente vê" passa a "Na página da joia, o bloco mostra o nome da lista e as peças nesta ordem, e a cliente escolhe uma. …"; a dica sob "Nome da lista" (ligada por `aria-describedby`); "Em uso" com "Mudar aqui muda o Compre Junto de todas elas." e a frase sem joias; "Variações oferecidas: …"; o contador "n / 40"; a busca "Acrescentar uma peça" (placeholder "Buscar pelo nome da joia") só a partir de 2 letras e até 8 resultados; a trilha "Compre Junto › lista". Props opcionais novas, com padrão que preserva as outras telas: `ProductSearchField` (`minimoDeLetras`, `teto`), `CharCounter` (`espacado`, as duas formas escritas no dono — `contadorComDonoUnico` intocado e verde), `RecordPageHeader` (`group` opcional). Commit `543e98e8`.
- **Testes**: backoffice `280 passed` / `5074 passed`, exit 0 (era 5056: +18 entre `AdminBuyTogether.test.tsx` pelo editor real, `ProductSearchField.test.tsx`, `FieldGroup.test.tsx` e `RecordPageHeader.test.tsx`; asserções antigas reescritas pelo valor novo, nenhuma afrouxada); store `366 passed` / `6901 passed`, exit 0 (idêntico). `--testTimeout=20000`, um workspace por vez, exit fora de pipe, remedido pela thread principal.
- **Tipos**: `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` 0.
- **Lint**: backoffice 23 erros / 5 warnings (baseline 23/5).
- **Revisão adversarial** (`wi-impl-review`): serve, sem achados.
- **Bugs da QA**: BUG-011 com fix task `done` — aguardando o reteste do QA.

---

## Validation 11 — fix task 17 (BUG-010), 2026-11-02

**Status**: PASS · escopo: os repositórios que a tarefa 17 tocou (`packages/core`, `apps/backoffice`) e a loja, cujos guardas varrem `apps/**`.

- **Mudança**: a aba "Compre junto" do produto ganha uma grade própria (uma coluna abaixo de `xl`; a partir dela `minmax(0,1fr)` + `minmax(0,18rem)`) com a lateral da aba: o cartão "Na loja" (`h2`, "O bloco fica entre a escolha da variação e o botão de compra, nesta ordem:", `<ol>` com o nome como a loja mostra, "a cliente escolhe uma peça" / "uma peça só", " · some com X, Y", "falta escolher", "Nenhum adicional.") e "Quando a peça sai do ar" com o texto do protótipo. A frase do cartão, as dicas de nome dos dois tipos, "a partir de R$ X" na peça escolhida e as variações oferecidas recolhidas atrás de "Variações oferecidas: todas as ativas (N)" / "k de N" com "Escolher quais"/"Esconder" seguem o protótipo. `addonCountRefusal` (core) passa a "Cada joia leva até 3 adicionais. Tire um para acrescentar outro.". A lateral da página (Resumo) e as outras abas não mudam. Commit `55c79954`.
- **Testes**: core `213 passed` / `5311 passed`, exit 0 (idêntico; o caso da recusa reescrito pelo valor novo); backoffice `280 passed` / `5056 passed`, exit 0 (era 5048: +8 em `AdminProductFormPage.compreJunto.test.tsx`, pela aba real; asserções da frase antiga reescritas pelo valor novo, nenhuma afrouxada); store `366 passed` / `6901 passed`, exit 0 (idêntico). `--testTimeout=20000` nos apps, um workspace por vez, exit fora de pipe, remedido pela thread principal.
- **Tipos**: `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` 0; `packages/core` 11 herdados (nenhum novo, relatado pelo implementador).
- **Lint**: backoffice 23 erros / 5 warnings (baseline 23/5).
- **Revisão adversarial** (`wi-impl-review`): serve, sem achados.
- **Bugs da QA**: BUG-010 com fix task `done` — aguardando o reteste do QA.

---

## Validation 10 — fix task 16 (BUG-009), 2026-11-02

**Status**: PASS · escopo: o repositório que a tarefa 16 tocou (`apps/backoffice`) e a loja, cujos guardas varrem `apps/**`.

- **Mudança**: o `ProductSearchField` ganha a prop opcional `bloqueados` (id → motivo); a peça bloqueada entra no resultado e na contagem, com o botão desabilitado, sem o ícone de acrescentar e com o motivo no `<span data-testid="ja-escolhida-<id>">`. A aba Compre junto (`ProductChoice` em `BuyTogetherTab.tsx`) passa o principal por ela com "É esta joia", em vez de `excluir`. Sem a prop, as outras superfícies não mudam. Uma linha de `apps/backoffice/CLAUDE.md` atualizada. Commit `ddacc7cf`.
- **Testes**: backoffice `280 passed` / `5048 passed`, exit 0 (era 5043: +4 em `ProductSearchField.test.tsx` e +1 em `AdminProductFormPage.compreJunto.test.tsx`, pela aba real; o teste antigo "o principal não aparece" foi invertido por esta tarefa e a metade "fora do ar" virou caso próprio com as asserções intactas); store `366 passed` / `6901 passed`, exit 0 (idêntico). `--testTimeout=20000`, um workspace por vez, exit fora de pipe, remedido pela thread principal.
- **Tipos**: `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` 0.
- **Lint**: backoffice 23 erros / 5 warnings (baseline 23/5).
- **Revisão adversarial** (`wi-impl-review`): serve, sem achados.
- **Bugs da QA**: BUG-009 com fix task `done` — aguardando o reteste do QA.

---

## Validation 9 — fix task 15 (BUG-008), 2026-11-02

**Status**: PASS · escopo: o repositório que a tarefa 15 tocou (`apps/store`) e o painel, cujos guardas varrem `apps/**`.

- **Mudança**: na gaveta da sacola, a linha "Acompanha o …" (`CartDrawerRow`) ganha antes da frase um `<span aria-hidden="true">` vazio de 10×1px em `bg-estrelinha-accent` (`mr-1.5 inline-block h-px w-2.5 align-middle`), como o `.acomp i` do protótipo, e a frase passa de 12px a 12,5px em `ink-soft`. O texto, o nome completo e a quebra de linha não mudam; `companionPhrase` e a frase do pedido não foram tocados. Commit `b819d1b8`.
- **Testes**: store `366 passed` / `6901 passed`, exit 0 (era 6898: +3 em `CartDrawerAcompanha.test.tsx`, pela gaveta real — o traço como primeiro nó, `aria-hidden`, vazio, com os tokens exatos; a frase em `text-[12.5px]` e `ink-soft`, sem `text-[12px]`; o `textContent` exatamente a frase; os dois primeiros vermelhos antes do código, o terceiro prova que o traço não entra no texto); backoffice `280 passed` / `5043 passed`, exit 0 (idêntico). `--testTimeout=20000`, um workspace por vez, exit fora de pipe.
- **Tipos**: `npx tsc --noEmit -p apps/store/tsconfig.app.json` 0.
- **Lint**: store 2 erros / 2 warnings (baseline 2/2).
- **Build**: `vite build` da loja exit 0 (envs locais no ambiente).
- **Revisão adversarial** (`wi-impl-review`): serve, sem achados.
- **Bugs da QA**: BUG-008 com fix task `done` — aguardando o reteste do QA.

---

## Validation 8 — fix task 14 (BUG-007), 2026-11-02

**Status**: PASS · escopo: o repositório que a tarefa 14 tocou (`apps/store`) e o painel, cujos guardas varrem `apps/**`.

- **Mudança**: na forma "Com fórmula", o `FormulaStrip` deixa as pílulas de texto sobre fundo areia e segue o `.formula` do protótipo: faixa sem fundo e sem quebra, rolando na horizontal; cada item é a foto (`Foto` de `AddonPanel`, 64×80, raio 12) com o nome em 11px abaixo; o primeiro é a foto da joia e "Esta joia"; o adicional não marcado a 35% de opacidade, com transição de 150ms e par `motion-reduce:transition-none`. `BuyTogetherBlock` ganha `mainPhoto` (opcional), passado pelo `ProductInfo` (`purchase.variant?.image_url || product.image_url`). Commit `016252b5`.
- **Testes**: store `366 passed` / `6898 passed`, exit 0 (era 6893: +5 em `ProductPageBuyTogetherForma.test.tsx`, pela página real — sem fundo e com `overflow-x-auto` por token exato, foto e nome por item com a joia primeiro, 35% ↔ plena ao marcar pela lista, nome em 11px, par de movimento; os dois casos antigos da faixa intocados; vermelhos antes do código); backoffice `280 passed` / `5043 passed`, exit 0 (idêntico). `--testTimeout=20000`, um workspace por vez, exit fora de pipe.
- **Tipos**: `npx tsc --noEmit -p apps/store/tsconfig.app.json` 0.
- **Lint**: store 2 erros / 2 warnings (baseline 2/2).
- **Build**: `vite build` da loja exit 0 (envs locais no ambiente).
- **Revisão adversarial** (`wi-impl-review`): serve, sem achados. Registrada na tarefa a tensão com o piso de `DESIGN.md:138` (11px só em caixa alta), mantida pelo protótipo e pelo bug.
- **Bugs da QA**: BUG-007 com fix task `done` — aguardando o reteste do QA.

---

## Validation 7 — fix task 13 (BUG-006), 2026-11-02

**Status**: PASS · escopo: o repositório que a tarefa 13 tocou (`apps/store`) e o painel, cujos guardas varrem `apps/**`.

- **Mudança**: na forma "Em folha", o `AddonSheet` passa `showMissing={false}` ao `AddonPanel` e a frase do que falta fica só no rodapé, acima de "Incluir no conjunto" (folha e diálogo); o `DialogContent` troca `max-w-lg` (512px) por `w-full max-w-[520px]`; o link da peça avulsa na forma "Em folha" diz "Escolher" (`AddonRow`), e "Na linha"/"Com fórmula" seguem com "Ver opções". Commit `636b5ad4`.
- **Testes**: store `366 passed` / `6893 passed`, exit 0 (era 6888: +5 em `ProductPageBuyTogetherForma.test.tsx` — a frase uma vez no rodapé nos dois desenhos, a largura por token exato, e o par "Escolher"/"Ver opções"; dois casos antigos da folha passaram de "Ver opções" para "Escolher", mudança de valor pedida pelo bug; 6 vermelhos antes do código); backoffice `280 passed` / `5043 passed`, exit 0 (idêntico). `--testTimeout=20000`, um workspace por vez, exit fora de pipe.
- **Tipos**: `npx tsc --noEmit -p apps/store/tsconfig.app.json` 0.
- **Lint**: store 2 erros / 2 warnings (baseline 2/2).
- **Build**: `vite build` da loja exit 0 (envs locais no ambiente).
- **Revisão adversarial** (`wi-impl-review`): serve, sem achados.
- **Bugs da QA**: BUG-006 com fix task `done` — aguardando o reteste do QA.

---

## Validation 6 — fix task 12 (BUG-005), 2026-11-02

**Status**: PASS · escopo: o repositório que a tarefa 12 tocou (`apps/store`) e o painel, cujos guardas varrem `apps/**`.

- **Mudança**: o bloco Compre Junto nas formas "Na linha" e "Com fórmula" passa ao desenho do protótipo (`cj-loja.css`): superfície `surface` com borda `line` e `rounded-lg` (bloco e esqueleto, pela constante `BUY_TOGETHER_SURFACE` em `panel.ts`), título 20px/400, frase em 300, linhas separadas por fio, `<input type="checkbox">` nativo com `appearance-none` 24×24 numa célula de 44px, foto 64×80, nome 400 com o preço da peça em foco abaixo (sem "a partir de"), rodapé sem areia e "no Pix" (também no anúncio da região viva). A frase do que falta da linha só aparece depois da tentativa de levar (`useBuyAction` expõe `attempted`, `ProductInfo` o repassa ao bloco), e o link "Ver opções" some com a linha marcada. A folha ("Em folha") mantém a frase como antes. Commit `20764d2d`.
- **Testes**: store `366 passed` / `6888 passed`, exit 0 (era 6881: +7 no describe novo de `ProductPageBuyTogether.test.tsx`; três casos antigos que codificavam a frase imediata passaram a tocar "Levar o conjunto" antes, com a ausência antes do toque conferida; "com Pix" → "no Pix" em três asserções); backoffice `280 passed` / `5043 passed`, exit 0 (idêntico). `--testTimeout=20000`, um workspace por vez, exit fora de pipe.
- **Tipos**: `npx tsc --noEmit -p apps/store/tsconfig.app.json` 0.
- **Lint**: store 2 erros / 2 warnings (baseline 2/2).
- **Build**: `vite build` da loja exit 0 (envs locais no ambiente).
- **Revisão adversarial** (`wi-impl-review`): serve com correção — dois achados de convenção contra `DESIGN.md` (título 400, foto em 12px), mantidos pelo protótipo aprovado por decisão registrada na tarefa 12.
- **Bugs da QA**: BUG-005 com fix task `done` — aguardando o reteste do QA.

---

## Validation 5 — fix task 11 (BUG-004), 2026-11-02

**Status**: PASS · escopo: o repositório que a tarefa 11 tocou (`apps/store`) e o painel, cujos guardas varrem `apps/**`.

- **Mudança**: `useBuyAction` (`apps/store/src/entities/product/model/useBuyAction.ts`) passa a montar o aviso "A gravação passou do limite. Ajuste o texto para continuar." na hora quando há adicional marcado e a gravação do principal está acima do limite (precede a frase de adicional incompleto). Sem conjunto, nada muda. A frase virou a constante `ENGRAVING_NOTICE`, usada pelos dois ramos. Commit `14587057`.
- **Testes**: store `366 passed` / `6881 passed`, exit 0 (era 6876: +5 casos em `ProductPageLevarConjunto.test.tsx`, 3 vermelhos antes da correção e 2 que fixam o comportamento de antes, com mutação conferida); backoffice `280 passed` / `5043 passed`, exit 0 (idêntico). `--testTimeout=20000`, um workspace por vez, exit fora de pipe.
- **Tipos**: `npx tsc --noEmit -p apps/store/tsconfig.app.json` 0.
- **Lint**: store 2 erros / 2 warnings (baseline 2/2).
- **Build**: `pnpm --filter @estrelinha/store build` exit 0 (envs locais no ambiente).
- **Revisão adversarial** (`wi-impl-review`): serve, sem achados.
- **Bugs da QA**: BUG-004 com fix task `done` — aguardando o reteste do QA.

---

## Validation 4 — fix task 10 (BUG-003), 2026-11-02

**Status**: PASS · escopo: os repositórios que a tarefa 10 tocou (`packages/core`, `apps/store`) e o painel, que consome `core` e cujos guardas varrem `apps/**`.

- **Mudança**: `addonMissingChoice` (`packages/core/src/buy-together/total.ts`) passa o eixo e a primeira palavra do nome da peça a minúscula (`toLocaleLowerCase('pt-BR')`): "Escolha o cor da pingente.". Os quatro testes de página que cravavam a maiúscula foram reescritos (string inteira, sem afrouxar); +1 caso em `total.test.ts` (eixo de várias palavras e acento). Vermelhos antes: core 2, store 6.
- **Testes**: core `213 passed` / `5311 passed`, exit 0; store `366 passed` / `6876 passed`, exit 0 (idêntico em contagem: só expectativas reescritas); backoffice `280 passed` / `5043 passed`, exit 0. `--testTimeout=20000` nos apps, um workspace por vez, exit fora de pipe.
- **Tipos**: `npx tsc --noEmit -p apps/store/tsconfig.app.json` 0; `packages/core` 11, os herdados.
- **Lint**: store 2 erros / 2 warnings (baseline 2/2).
- **Build**: `pnpm --filter @estrelinha/store build` exit 0 (envs locais no ambiente).
- **Revisão adversarial** (`wi-impl-review`): serve, sem achados.
- **Bugs da QA**: BUG-003 com fix task `done`, retestado `resolved`.

---

## Validation 3 — fix task 09 (BUG-002), 2026-11-02

**Status**: PASS · escopo: o repositório que a tarefa 09 tocou (`apps/store`) e o painel, cujos guardas varrem `apps/**`.

- **Mudança**: o bloco Compre Junto ganhou uma região `role="status"` visualmente oculta, montada com o bloco pronto e vazia sem marcação, que recebe "Total do conjunto: R$ X" (e ", R$ Y com Pix" com o PIX ligado) a cada total novo. O rodapé visível não mudou; a barra fixa não ganhou região própria (uma região só).
- **Testes**: store `366 passed` / `6876 passed`, exit 0 (era 365/6871: +1 arquivo `ProductPageBuyTogetherAnuncio.test.tsx`, +5 casos, vermelhos antes da correção); backoffice `280 passed` / `5043 passed`, exit 0 (idêntico). `--testTimeout=20000`, um workspace por vez, exit fora de pipe.
- **Tipos**: `npx tsc --noEmit -p apps/store/tsconfig.app.json` 0.
- **Lint**: store 2 erros / 2 warnings (baseline 2/2).
- **Build**: `pnpm --filter @estrelinha/store build` exit 0 (com as envs locais no ambiente, sem `.env`).
- **Revisão adversarial** (`wi-impl-review`): serve, sem achados (uma conta errada no comentário do teste, corrigida).
- **Bugs da QA**: BUG-002 com fix task `done` — aguardando o reteste do QA.

---

## Validation 2 — fix task 08 (BUG-001), 2026-11-02

**Status**: PASS · escopo: o repositório que a tarefa 08 tocou (`apps/store`) e o painel, cujos guardas varrem `apps/**`.

- **Mudança**: a leitura do Compre Junto virou uma ida ao banco só, pelo slug da joia (`!inner` na FK `product_buy_together_product_id_fkey`), com os produtos dos adicionais e das peças das listas embutidos (`PRODUCT_CARD_SELECT`); a `ProductPage` a dispara em paralelo com a do produto e segura o corpo até a primeira resposta (erro ou primeira falha soltam). A coluna nasce com o bloco no tamanho real, sem esqueleto e sem salto.
- **Testes**: store `365 passed` / `6871 passed`, exit 0 (era 364/6865: +1 arquivo `BuyTogetherBlockReserva.test.tsx`, +6 casos); backoffice `280 passed` / `5043 passed`, exit 0 (idêntico). `--testTimeout=20000`, um workspace por vez, exit fora de pipe.
- **Tipos**: `npx tsc --noEmit -p apps/store/tsconfig.app.json` 0.
- **Lint**: store 2 erros / 2 warnings (baseline 2/2).
- **Build**: `pnpm --filter @estrelinha/store build` exit 0 (com as envs locais no ambiente, sem `.env`).
- **Revisão adversarial** (`wi-impl-review`): serve, sem achados.
- **Probe**: o `BUY_TOGETHER_SELECT` exato contra o Supabase local (`main.slug=eq.qa-pingente-estrela`) devolve os 3 adicionais com os produtos embutidos.
- **Bugs da QA**: BUG-001 com fix task `done` — aguardando o reteste do QA.
- **Caducou** (tarefa 03, não reescrita): os produtos dos adicionais por `useProductsByIds`; o esqueleto como estado da página.

---

## Achado da Validation: commits de onda incompletos (corrigido)

Os commits de onda de três tarefas deixaram de fora arquivos que as próprias tarefas criaram ou alteraram, e que o código commitado já importava (o barril `packages/core/src/buy-together/index.ts` exportava `rules`, `types`, `availability` e `total`; o `App.tsx` do painel importava `AdminBuyTogetherListPage`; `useBuyTogether.ts` importava `useBuyTogetherData`). Fora deste worktree, a branch não compilava. Classificação: **config-issue** (empacotamento do commit), sem código a mudar. A Validation commitou os arquivos, atribuídos pelo `implement-log.md`:

| Commit | Tarefa | O que entrou |
| ------ | ------ | ------------ |
| `67626a0c` | T01 | `core/buy-together/rules.ts`, `types.ts`; `AdminBuyTogetherListPage.tsx`, `AdminBuyTogether.test.tsx` |
| `07fc6a29` | T03 | `core/buy-together/availability.ts`, `total.ts` e testes; `useBuyTogetherData` e teste; `BuyTogetherSkeleton`; `EngravingField`/`VariantPicker`; `ProductPageBuyTogether.test.tsx`, `tomDoCompreJunto.test.ts`; o fixture de `cardSelect` e os mocks das 7 páginas de produto; `packages/core/CLAUDE.md` |
| `415af2b5` | T06 | `.specs/STATE.md` (`AD-072` e o handoff) |

## Test Results

Um workspace por vez, `pnpm --filter @estrelinha/<w> test --testTimeout=20000`, exit lido fora de pipe:

| Workspace | Exit | Arquivos | Testes |
| --------- | ---- | -------- | ------ |
| core | 0 | 213 passed | 5310 passed |
| functions | 0 | 39 passed | 1439 passed |
| store | 0 | 364 passed | 6865 passed |
| backoffice | 0 | 280 passed | 5043 passed |
| mobile-adm | 0 | 148 passed | 2365 passed |
| catalog-import | 0 | 23 passed | 512 passed |

**Summary**: 21534 passed, 0 failed, 0 skipped, em 1067 arquivos. Os números batem com as baselines que a T06 gravou no `CLAUDE.md`.

## Build & Lint

**Tipos** (`npx tsc --noEmit -p …`): store 0 · backoffice 0 · mobile-adm 0 · `apps/store/tsconfig.server.json` 0 · `packages/core` 11. Os 11 de `core` são os herdados, nos mesmos arquivos do baseline (`home/__tests__/carousel` 5, `pickHomeBanners` 1, `pickHomeCollections` 1, `sitemap/__tests__/urls` 2, `packages/supabase/src/client.ts` 2). Nenhum erro novo.

**Build**: PASS. `pnpm --filter @estrelinha/{store,backoffice,mobile-adm} build` com exit 0 nos três (a loja gerou `.server/page.mjs`; o ateliê, `sw.js`). O `pnpm build` da raiz reprovou primeiro com `[vite:build-html] URI malformed` em `apps/store/index.html`. A causa é ambiente: o worktree não tem `.env` (gitignored), e `%VITE_SUPABASE_URL%` chegava cru ao Vite. O WI não tocou o `index.html`. Remedido com `VITE_SUPABASE_URL=http://127.0.0.1:54441` e uma chave publicável de mentira no ambiente da execução, sem copiar arquivo.

**Lint** (`npx eslint .` por app): PASS contra o baseline. backoffice 23 erros / 5 warnings · store 2/2 · mobile-adm 0/0, idêntico ao `CLAUDE.md` › Baselines (25/7). `packages/` não tem lint (`BL-002`).

## Acceptance Criteria Coverage

O mapeamento parte das tabelas *Cobertura da tarefa* das revisões (`implement-log.md`), com cada arquivo de teste conferido no HEAD. Os testes citados passaram na execução acima.

| ID | Critério (resumo) | Teste | Result | Status |
| --- | --- | --- | --- | --- |
| CA-01.1 | nome até 40, lista vazia salvável e não escolhível | `AdminBuyTogether.test.tsx`, `buy-together-lists/model/__tests__/draft.test.ts`, `core/buy-together/__tests__/rules.test.ts` | PASS | COVERED |
| CA-01.2 | reordenar peças | `AdminBuyTogether.test.tsx`, `draft.test.ts` | PASS | COVERED |
| CA-01.3 | variações liberadas por peça | `AdminBuyTogether.test.tsx`, `availability.test.ts` | PASS | COVERED |
| CA-01.4 | "em uso em N produtos" | `AdminBuyTogether.test.tsx`, `compreJuntoSchema.test.ts` (view de uso) | PASS | COVERED |
| CA-01.5 | peça fora do ar marcada e pulada | `AdminBuyTogether.test.tsx`, `availability.test.ts` | PASS | COVERED |
| CA-01.6 | a lista não vira vitrine | `compreJuntoSchema.test.ts`, guardas de rota (`reservedSlugs`, `sitemapRoutes` sem rota nova da loja) | PASS | COVERED |
| CA-01.7 | lista em uso não se apaga, nomeia produtos | `rules.test.ts` (`listDeleteRefusal`), `AdminBuyTogether.test.tsx`, `compreJuntoSchema.test.ts` (`restrict`) | PASS | COVERED |
| CA-02.1 | até 3 adicionais, 4ª recusada com motivo | `BuyTogetherTab` (teste da aba), `rules.test.ts` | PASS | COVERED |
| CA-02.2 | adicional produto com variações | teste da `BuyTogetherTab`, `persistAddons.test.ts` | PASS | COVERED |
| CA-02.3 | adicional lista | teste da `BuyTogetherTab` | PASS | COVERED |
| CA-02.4 | ordenar adicionais | teste da `BuyTogetherTab` | PASS | COVERED |
| CA-02.5 | principal não escolhível; repetido desabilitado | teste da `BuyTogetherTab`, `rules.test.ts` | PASS | COVERED |
| CA-02.6 | gravar um produto não mexe em outro | `persistAddons.test.ts` (diário completo) | PASS | COVERED |
| CA-02.7 | adicional fora do ar marcado e pulado | teste da `BuyTogetherTab`, `availability.test.ts` | PASS | COVERED |
| CA-02.8 | conversão de `buy_together_ids` | `compreJuntoConversaoSchema.test.ts`; probe `02-conversao.sh` (só local) | PASS | COVERED |
| CA-02.9 | some em variações do principal | teste da `BuyTogetherTab`, `availability.test.ts`, `ProductPageBuyTogether.test.tsx` | PASS | COVERED |
| CA-03.1 | bloco só com adicional disponível | `ProductPageBuyTogether.test.tsx`, `availability.test.ts` | PASS | COVERED |
| CA-03.2 | nada marcado ao abrir | `ProductPageBuyTogether.test.tsx` | PASS | COVERED |
| CA-03.3 | usa a variação do principal | `ProductPageBuyTogether.test.tsx` | PASS | COVERED |
| CA-03.4 | total pela variação, principal × quantidade | `total.test.ts`, `ProductPageBuyTogether.test.tsx` | PASS | COVERED |
| CA-03.5 | PIX do conjunto | `total.test.ts` (`bundlePix` = `pixPrice`), `ProductPageBuyTogether.test.tsx` | PASS | COVERED |
| CA-03.6 | diz qual escolha falta | `total.test.ts` (`addonMissingChoice`), `ProductPageBuyTogether.test.tsx` | PASS | COVERED |
| CA-03.7 | lista: ordem da dona, uma escolha, pula principal e repetidas | `availability.test.ts`, `ProductPageBuyTogether.test.tsx` | PASS | COVERED |
| CA-03.8 | esgotado não escolhível; sem vendável não aparece | `availability.test.ts`, `ProductPageBuyTogether.test.tsx` | PASS | COVERED |
| CA-03.10 | gravação dentro do bloco | `ProductPageBuyTogether.test.tsx`, `total.test.ts` (`addonEngravingRefusal`) | PASS | COVERED |
| CA-03.11 | 390px sem rolagem lateral; alvos ≥ 44px | guardas de fonte (`touchTarget.test.ts`, `alvoDeToqueNaoRoubaPosicao`) e as classes `min-h-11`/`grid-cols-[minmax(0,1fr)]` | PASS | COVERED (fonte) · a medida em navegador fica para a QA, porque o jsdom devolve 0 para layout |
| CA-03.12 | sem urgência nem prova social | `tomDoCompreJunto.test.ts` | PASS | COVERED |
| CA-03.13 | não diz qual material | `semMaterialNaPaginaDoProduto.test.ts` (alcança bloco, hook e leitura) | PASS | COVERED |
| CA-03.14 | título, frase e rodapé exatos | `ProductPageBuyTogether.test.tsx` | PASS | COVERED |
| CA-03.15 | sem seletor de quantidade no celular | `ProductPageBuyTogether.test.tsx`, `ProductBuyBar.test.tsx` | PASS | COVERED |
| CA-04.1 | linha própria, quantidade 1, soma e "acompanha o X e o Y" | testes do `cartStore`, `CartDrawerAcompanha.test.tsx`, testes de `useProductPurchase` | PASS | COVERED |
| CA-04.2 | a sacola abre | testes de `useProductPurchase` | PASS | COVERED |
| CA-04.3 | gravação recusada, nada entra | `ProductPageBuyTogether.test.tsx`, testes de `useProductPurchase` | PASS | COVERED |
| CA-04.4 | remover uma linha não remove as outras | testes do `cartStore` | PASS | COVERED |
| CA-04.5 | fila de material se qualquer peça exige | `buildOrderPayload.test.ts` (`initialMaterialStatus`) | PASS | COVERED |
| CA-04.6 | valor cobrado = total | `createOrder.test.ts` (preço do servidor intocado); `payment/**` sem diff | PASS | COVERED |
| CA-04.7 | sacola antiga intacta (`migrate` v3 → v4) | testes do `cartStore` | PASS | COVERED |
| CA-04.8 | principal indisponível bloqueia; esgotado esconde | `ProductPageBuyTogether.test.tsx` (3 casos) | PASS | COVERED |
| CA-04.9 | barra fixa "Conjunto · N peças" sem PIX | `ProductBuyBar.test.tsx` | PASS | COVERED |
| CA-05.1 | "acompanha o <nome completo>" na sacola | `CartDrawerAcompanha.test.tsx`, `marks.test.ts` | PASS | COVERED |
| CA-05.2 | no pedido: confirmação, conta e painel | `OrderItemsSummary.test.tsx`, `OrderConfirmationPage.test.tsx`, `AdminOrderPage.acompanha.test.tsx` | PASS | COVERED |
| CA-05.3 | sem o principal, vira peça comum | testes do `cartStore`, `CartDrawerAcompanha.test.tsx` | PASS | COVERED |
| CA-05.4 | a marca não muda preço | `createOrder.test.ts`, `marks.test.ts` | PASS | COVERED |
| CA-06.1 | pedidos, peças e valor; snapshot no pedido | `AdminBuyTogetherAdoption.test.tsx`, `compreJuntoAdesaoSchema`, `compreJuntoNoPedidoSchema.test.ts`; probe `05-adesao.sh` (só local) | PASS | COVERED |
| CA-06.2 | recorte por joia e por lista | `AdminBuyTogetherAdoption.test.tsx`, testes de `adoption` | PASS | COVERED |
| CA-06.3 | régua de venda do Dashboard | `compreJuntoAdesaoSchema` (fragmento `AD-055`) | PASS | COVERED |
| CA-06.4 | 7/30/90, parte dos pagos, média, mais vendida, "Peça escolhida direto", vazio escrito | `AdminBuyTogetherAdoption.test.tsx`, testes de `adoption` | PASS | COVERED |
| CA-06.5 | peças pela quantidade da linha | `compreJuntoAdesaoSchema`, probe `05-adesao.sh` | PASS | COVERED |
| CA-07.1 | indisponível some, os outros ficam | `availability.test.ts`, `ProductPageBuyTogether.test.tsx` | PASS | COVERED |
| CA-07.2 | nenhum disponível, bloco some | `ProductPageBuyTogether.test.tsx` | PASS | COVERED |
| CA-07.3 | leitura falha, página de pé | `useBuyTogetherData.test.tsx`, `ProductPageBuyTogether.test.tsx` | PASS | COVERED |
| CA-08.1 | `view_item_list` e `select_item` com id próprio | `ProductPageBuyTogether.test.tsx` (bloco "medição") | PASS | COVERED |
| CA-08.2 | `add_to_cart` sem duplicar o principal | testes de `useProductPurchase`, `events.test` | PASS | COVERED |
| CA-09.1 | três formas no painel, valem para a loja | `AdminBuyTogetherForm.test.tsx`, `settings.test.ts` | PASS | COVERED |
| CA-09.2 | sem escolha, "Na linha" | `settings.test.ts`, `storeSettingsDefaults.test.ts` | PASS | COVERED |
| CA-09.3 | regras iguais nas três | `ProductPageBuyTogetherForma.test.tsx` (página real) | PASS | COVERED |
| CA-09.4 | valor desconhecido vira "Na linha" | `settings.test.ts`, `ProductPageBuyTogetherForma.test.tsx` | PASS | COVERED |
| CA-09.5 | foco e Esc na folha; fórmula fora do leitor | `ProductPageBuyTogetherForma.test.tsx` | PASS | COVERED |

**Coverage**: 59/59 critérios cobertos (100%). Ressalva: CA-03.11, e a prova das três formas em 390 e 1440, têm só régua de fonte. A medida em navegador é da QA real-user.

## Afirmações caducadas na corrida

| Tarefa fechada | A afirmação | Quem a tornou falsa | Ainda verdadeiro no comportamento? |
| --- | --- | --- | --- |
| T04 | `companionPhrase` "em `drawerFacts`" | T05 a moveu para `core/buy-together/marks.ts`, com `drawerFacts` reexportando (`toBe`) | sim — CA-05.1 segue COVERED |
| T01 | o Compre Junto com três rotas (índice e editor), no `navItems.test.ts` e no `apps/backoffice/CLAUDE.md` | T06 acrescentou `/admin/compre-junto/adesao` (teste e CLAUDE.md atualizados) | sim — CA-01.* seguem COVERED |

## Failures & Fix Tasks

Nenhuma falha de teste, tipo, lint ou build atribuível ao código. A única falha (commits incompletos) foi corrigida na própria Validation, com os três commits acima. Nenhuma fix task foi criada. Não há `qa/issues/`.

## Overall Verdict

**Status**: PASS

- [x] Todos os testes passam (0 falhas)
- [x] Build e lint passam (lint no baseline; build verde com a env local)
- [x] Todo critério de aceite das unidades de escopo da fila está COVERED
- [x] Nenhum critério MISSING ou FAILING
- [x] Sem bug aberto da QA

Fica para a QA real-user: o layout em 390 e 1440 (CA-03.11 e as três formas), a aba Adesão em navegador e o percurso do conjunto até o pedido. Migrations aplicadas só no banco local (`20261105120000`, `20261105130000`, `20261106120000`, `20261107120000`).
