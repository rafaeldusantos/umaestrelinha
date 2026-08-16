# Perguntas Frequentes — Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.**

**Duas regras do projeto sobrepõem a Skill, e estão no `CLAUDE.md`:**

1. **Commits agrupados no fim**, não um por task (`BL-012`, fechada em 2026-08-15 por decisão do
   usuário). A árvore fica suja de propósito durante a execução.
2. **Sub-agentes não são usados nesta sessão.** O Verifier roda como passe standalone (`validate.md`),
   como nas features `24` e `25`.

**Design**: [`design.md`](./design.md) · **Spec**: [`spec.md`](./spec.md)
**Status**: Approved

---

## Test Coverage Matrix

> Gerada do próprio repositório e das diretrizes do projeto. Diretrizes encontradas: **`CLAUDE.md`**
> (seções *Os guardas*, *Convenções → Mobile é o caso principal*, *Estado conhecido / dívidas*) e
> `vitest.config.ts` por workspace. Amostradas 10 suítes: `material.test.ts`, `derive.test.ts`,
> `homeSections.test.ts`, `ProductDescription.test.tsx`, `VariantPhotoAxis.test.tsx`,
> `AdminHomePage.test.tsx`, `navItems.test.ts`, `persistProduct.test.ts`, `write/__tests__/products.test.ts`,
> `db.test.ts`.

| Camada | Tipo de teste | Expectativa de cobertura | Padrão de local | Comando |
| --- | --- | --- | --- | --- |
| Domínio puro (`packages/core/src/faq/**`) | unit | **Todos os ramos; 1:1 com as ACs; todo edge case listado na spec** | `packages/core/src/faq/__tests__/*.test.ts` | `pnpm --filter @estrelinha/core test` |
| Guarda que lê arquivo do disco | unit | Asserção **com âncora de contagem** (arquivos lidos **e** ocorrências encontradas) | `apps/*/src/shared/lib/__tests__/*.test.ts` | `pnpm --filter @estrelinha/<app> test` |
| Componente de loja | unit (RTL) | Toda AC de render + todo edge case; **prova em viewport móvel fica para a auditoria**, não para jsdom | `apps/store/src/**/__tests__/*.test.tsx` | `pnpm --filter @estrelinha/store test` |
| Componente/página de painel | unit (RTL) | Happy path + recusa + estado vazio de cada AC | `apps/backoffice/src/**/__tests__/*.test.tsx` ou co-locado `*.test.tsx` | `pnpm --filter @estrelinha/backoffice test` |
| Acesso a dados (hook `useQuery`) | unit | Caminho de sucesso + erro (devolve vazio, não quebra) | co-locado em `**/api/__tests__/` | idem app |
| Plano puro do importador | unit | Todos os ramos; idempotência asserida por contagem | `tools/catalog-import/src/write/__tests__/*.test.ts` | `pnpm --filter @estrelinha/catalog-import test` |
| Migration / schema | unit (guarda lendo o `.sql`) **+ probe HTTP** | `AD-012`: **tipo não é schema** — toda tabela nova é provada por escrita real contra o banco local | `apps/store/src/shared/lib/__tests__/faqSchema.test.ts` | `pnpm --filter @estrelinha/store test` + probe |
| Wiring de rota / barrel / export map | none | Gate de build | — | build gate |

## Gate Check Commands

| Nível | Quando | Comando |
| --- | --- | --- |
| **quick** | Task com testes de unidade num workspace só | `pnpm --filter @estrelinha/<workspace> test` |
| **full** | Fim de fase, ou task que cruza workspaces | os `quick` de cada workspace tocado + `npx tsc --noEmit -p apps/<app>/tsconfig.app.json` |
| **build** | Fecho da feature | os 5 workspaces (`store`, `backoffice`, `core`, `functions`, `catalog-import`) + `pnpm lint` + `tsc` dos 3 apps |

> ⚠️ **Nunca `pnpm test \| tail`** — o código de saída que sai do pipe é o do `tail`. Capturar o de
> verdade, por workspace. `pnpm test` em paralelo já produziu flake de RTL sob carga.

**Baselines a comparar** (do `CLAUDE.md`, fecho da `27`):

| | valor |
| --- | ---: |
| Testes | 4.794 em 266 arquivos — store 1712/122 · backoffice 1391/86 · core 1113/39 · functions 279/4 · catalog-import 299/15 |
| Lint | **30 erros / 8 warnings** (backoffice 28/7 · store 2/1) |
| Tipos | store **0** · backoffice **0** · catalog-import **0** |

---

## Execution Plan

### Fase 1 — Domínio puro e banco (7 tasks)

```
T1 → T2 → T3 → T4 → T5 → T6 → T7
```

### Fase 2 — A loja lê e para de repetir (5 tasks)

```
T8 → T9 → T10 → T11 → T12
```

### Fase 3 — A semente (4 tasks)

```
T13 → T14 → T15 → T16
```

### Fase 4 — Painel: a biblioteca (5 tasks)

```
T17 → T18 → T19 → T20 → T21
```

### Fase 5 — Painel: a aba do produto (5 tasks)

```
T22 → T23 → T24 → T25 → T26
```

### Fase 6 — Fecho (2 tasks)

```
T27 → T28
```

---

## Task Breakdown

### T1: `@estrelinha/core/faq` — tipos, chave e limites

**What**: O módulo nasce com `types.ts` e `faq.ts` (decodificação de entidade, `faqQuestionKey`,
`normalizeFaqText`, `FAQ_QUESTION_MAX`/`FAQ_ANSWER_MAX`, `faqRefusal`), mais o barrel e o export map.
**Where**: `packages/core/src/faq/{types.ts,faq.ts,index.ts}`, `packages/core/package.json`
**Depends on**: —
**Reuses**: o tratamento de acento de `packages/core/src/material/material.ts` (NFD + `\p{Diacritic}`), replicado com o mesmo comentário
**Requirement**: `FAQ-11`, `FAQ-12`, `FAQ-23`

**Done when**:
- [ ] `faqQuestionKey` decodifica entidade, tira tag, corta acento, minúsculas, colapsa espaço e corta pontuação final
- [ ] `decodeHtmlEntities` cobre as **15 entidades medidas** + Latin-1 acentuado + os 5 básicos (`&amp;` **por último**) + numéricas decimal e hex; entidade desconhecida sai intacta
- [ ] `faqRefusal` devolve `string | null` — **nunca** união discriminada por literal booleano (`strictNullChecks: false`)
- [ ] `packages/core/package.json` exporta `"./faq"`
- [ ] Gate: `pnpm --filter @estrelinha/core test`

**Tests**: unit · **Gate**: quick

---

### T2: `resolveProductFaqs` — o leitor único

**What**: A função que ordena por `position`, **pula** vínculo com entrada ausente ou inativa, e
resolve `answer_override ?? entry.answer`. Mais `faqOverrideOf`, que devolve `null` quando o override
é idêntico ao padrão.
**Where**: `packages/core/src/faq/faq.ts` (acrescenta)
**Depends on**: T1
**Reuses**: o formato `requiresMaterial()` — leitor único sobre coluna com fallback
**Requirement**: `FAQ-01`, `FAQ-03`, `FAQ-04`

**Done when**:
- [ ] Ordena por `position` ascendente; empate desempata por `faq_id`, para a ordem não mudar entre leituras
- [ ] Vínculo cuja entrada é `null`, ausente do mapa, ou `is_active === false` é **pulado** — e a vaga **não** é preenchida por outra
- [ ] `answer_override` só de espaço cai no padrão
- [ ] `faqOverrideOf` devolve `null` quando `trim` do override é igual ao `trim` do padrão
- [ ] Todos os 4 edge cases da spec que tocam resolução têm teste
- [ ] Gate: `pnpm --filter @estrelinha/core test`

**Tests**: unit · **Gate**: quick

---

### T3: `block.ts` — a fronteira do bloco, com um dono

**What**: `faqBlockRange`, `extractFaqPairs`, `stripFaqBlock`, `hasFaqBlock`.
**Where**: `packages/core/src/faq/block.ts`
**Depends on**: T1
**Requirement**: `FAQ-05`, `FAQ-06`, `FAQ-21`, `FAQ-22`, `FAQ-23`

**Done when**:
- [ ] Fixtures **reais** dos dois arranjos medidos (um `<p>` por par · todos num `<p>` com `<br/>`), copiadas do catálogo
- [ ] Bloco termina no próximo heading de nível ≤ ao do próprio, ou no fim do texto — asserido nos dois casos (685 × 2 no catálogo)
- [ ] `stripFaqBlock` **não** remove bloco sem par extraível
- [ ] `stripFaqBlock` não toca `Especificações` nem `Observações importantes`
- [ ] Entrada `null`/vazia/HTML malformado devolve resultado neutro, sem lançar
- [ ] Resposta extraída sai como **texto**: entidade decodificada, tag removida
- [ ] Gate: `pnpm --filter @estrelinha/core test`

**Tests**: unit · **Gate**: quick

---

### T4: `suggest.ts` — o ranking determinístico

**What**: `rankFaqSuggestions`, `FAQ_SUGGESTION_LIMIT = 5`, `FAQ_MIN_CATEGORY_SAMPLE = 3`.
**Where**: `packages/core/src/faq/suggest.ts`
**Depends on**: T1
**Requirement**: `FAQ-30`, `FAQ-31`, `FAQ-32`

**Done when**:
- [ ] Score é `uses / (sample − self)`, **maior proporção** entre as categorias do produto
- [ ] Categoria com `sample < 3` é ignorada
- [ ] Já vinculadas ficam fora; `self` desconta o próprio produto do denominador
- [ ] Sem categoria qualificada, cai na frequência global com `source: 'global'`
- [ ] Desempate determinístico (`score desc`, `faq_id asc`) — duas chamadas devolvem a mesma lista
- [ ] Biblioteca vazia devolve `[]`, não lança
- [ ] Gate: `pnpm --filter @estrelinha/core test`

**Tests**: unit · **Gate**: quick

---

### T5: `faqSuggestion.test.ts` — a guarda dos 80%

**What**: Fixture com a distribuição real (categoria × pergunta × contagem) extraída do banco, e a
asserção de precisão/cobertura do top-5.
**Where**: `packages/core/src/faq/__tests__/faqSuggestion.test.ts` + `__fixtures__/catalogUsage.json`
**Depends on**: T4
**Requirement**: `FAQ-33`

**Done when**:
- [ ] Fixture gerada do banco local, com **âncora de contagem** (nº de produtos, de categorias e de perguntas conferidos no próprio teste)
- [ ] Precisão@5 **≥ 80%** e cobertura@5 **≥ 80%** — referência medida 84,0% / 83,5%
- [ ] Um teste **negativo**: o ranking por contagem bruta **reprova** a mesma régua (mede ~61%), provando que a asserção discrimina
- [ ] Gate: `pnpm --filter @estrelinha/core test`

**Tests**: unit · **Gate**: quick

---

### T6: Migration + probe HTTP

**What**: `faqs`, `product_faqs`, os dois índices, as views `faq_usage` e `faq_category_usage`, o
trigger de `updated_at` e a RLS. Aplicada e **provada por escrita real** (`AD-012`).
**Where**: `supabase/migrations/20260816120000_28-perguntas-frequentes.sql`
**Depends on**: —
**Reuses**: o molde de RLS de `20260815120000_24-home-gerenciavel.sql`; `security_invoker` de `category_product_counts`
**Requirement**: `FAQ-10`, `FAQ-12`, `FAQ-13`, `FAQ-29`

**Done when**:
- [ ] `supabase db reset` aplica sem erro
- [ ] **Probe HTTP** contra `127.0.0.1:54341` prova: insert/select/update como admin; select público só de ativa; **escrita anônima recusada** nas duas tabelas; `on delete restrict` recusa apagar entrada em uso; `on delete cascade` do produto leva os vínculos; `check` de 160/600 recusa
- [ ] As duas views devolvem linha com dado semeado à mão no probe
- [ ] Nenhum `grant` a `anon`; as duas policies de escrita são `to authenticated` com `has_role` no `using` **e** no `with check`
- [ ] Gate: probe registrado + `pnpm --filter @estrelinha/store test`

**Tests**: none (schema) — coberto por T7 + probe · **Gate**: full

---

### T7: `faqSchema.test.ts` — a guarda que lê a migration

**What**: Guarda que lê o `.sql` do disco e derruba a suíte quando o schema afrouxa.
**Where**: `apps/store/src/shared/lib/__tests__/faqSchema.test.ts`
**Depends on**: T6
**Reuses**: o formato de `homeSections.test.ts` e `materialTransitions.test.ts`
**Requirement**: `FAQ-10`, `FAQ-12`, `FAQ-13`

**Done when**:
- [ ] **Âncora dupla**: o arquivo é encontrado **e** o número de `create policy` / `check` / `create view` encontrados é asserido
- [ ] Derruba se: aparecer `grant` a `anon`; policy de escrita sem `has_role`; `faq_id` deixar de ser `on delete restrict`; sumirem os `check` de 160/600; a view perder `security_invoker`
- [ ] Os limites do TypeScript (`FAQ_QUESTION_MAX`/`FAQ_ANSWER_MAX`) são comparados com os números lidos do `.sql`
- [ ] Gate: `pnpm --filter @estrelinha/store test`

**Tests**: unit (guarda) · **Gate**: quick

---

### T8: `useProductFaqs`

**What**: O hook de leitura dos vínculos de um produto, com embed da entrada.
**Where**: `apps/store/src/entities/product/api/useProductFaqs.ts` + `__tests__/`
**Depends on**: T2, T6
**Reuses**: o formato de `useProduct.ts`
**Requirement**: `FAQ-09`, `FAQ-04`

**Done when**:
- [ ] `select('faq_id, position, answer_override, faq:faqs(id, question, answer, is_active)')`, `.eq('product_id')`, `.order('position')`
- [ ] `enabled: !!productId`
- [ ] Erro de leitura devolve `[]` — a página nunca quebra
- [ ] Devolve `ResolvedFaq[]` já passado por `resolveProductFaqs`
- [ ] `PRODUCT_SELECT` **inalterado** (asserido por varredura)
- [ ] Gate: `pnpm --filter @estrelinha/store test`

**Tests**: unit · **Gate**: quick

---

### T9: `ProductFaq`

**What**: O `<dl>` da seção, a partir de `ResolvedFaq[]`.
**Where**: `apps/store/src/entities/product/ui/ProductFaq.tsx` + `__tests__/ProductFaq.test.tsx`
**Depends on**: T2
**Reuses**: a marcação e os tokens do `<dl>` fixo que ele substitui
**Requirement**: `FAQ-01`, `FAQ-08`

**Done when**:
- [ ] Renderiza `<dt>`/`<dd>` por item, na ordem recebida
- [ ] Resposta com `<b>` ou `&` sai **literal** — nenhum `dangerouslySetInnerHTML` no arquivo
- [ ] Pergunta de 94 caracteres embrulha, não trunca
- [ ] Lista vazia devolve `null`
- [ ] Gate: `pnpm --filter @estrelinha/store test`

**Tests**: unit · **Gate**: quick

---

### T10: O acordeão perde as duas perguntas fixas

**What**: `ProductDetailsAccordion` ganha a prop `faqs` e monta `ProductFaq`; o `<dl>` de
`Em quanto tempo chega?` / `Dá para comprar em quantidade?` sai do fonte.
**Where**: `apps/store/src/entities/product/ui/ProductDetailsAccordion.tsx` + teste existente
**Depends on**: T9
**Requirement**: `FAQ-02`

**Done when**:
- [ ] Seção `faq` só é montada com `faqs.length > 0`
- [ ] O teste assere que os dois literais fixos **não existem mais no fonte** (varredura de arquivo, não só de render)
- [ ] `ProductDetailsAccordion.test.tsx` continua montando **sem** `QueryClientProvider`
- [ ] As asserções existentes do arquivo **não perdem nenhuma** — só ganham
- [ ] Gate: `pnpm --filter @estrelinha/store test`

**Tests**: unit · **Gate**: quick

---

### T11: A descrição para de repetir o FAQ

**What**: `ProductDescription` passa a chamar `sanitizeHtml(stripFaqBlock(html))`; nasce a guarda
`faqNoDuplicate`.
**Where**: `apps/store/src/entities/product/ui/ProductDescription.tsx` + `__tests__/faqNoDuplicate.test.tsx`
**Depends on**: T3
**Requirement**: `FAQ-05`, `FAQ-06`, `FAQ-07`

**Done when**:
- [ ] Descrição **real** do catálogo renderiza sem o heading `Perguntas frequentes` e sem nenhuma das perguntas dela
- [ ] `Especificações` e `Observações importantes` continuam na tela
- [ ] Descrição que fica vazia após a remoção devolve `null` (encadeia com `PDP-10`)
- [ ] `ProductDescription.test.tsx` e `ProductDescriptionPlacement.test.tsx` seguem passando sem perder asserção
- [ ] Gate: `pnpm --filter @estrelinha/store test`

**Tests**: unit · **Gate**: quick

---

### T12: `ProductPage` liga as pontas

**What**: A página chama `useProductFaqs` e passa `faqs` ao acordeão.
**Where**: `apps/store/src/pages/ProductPage.tsx`
**Depends on**: T8, T10
**Requirement**: `FAQ-01`, `FAQ-09`

**Done when**:
- [ ] Hook chamado na página, **não** dentro do acordeão (lição da feature 22 sobre `QueryClientProvider`)
- [ ] Testes existentes de `ProductPage` seguem passando
- [ ] `npx tsc --noEmit -p apps/store/tsconfig.app.json` = **0**
- [ ] Gate: `pnpm --filter @estrelinha/store test` + `tsc`

**Tests**: unit · **Gate**: full

---

### T13: `planFaqSeed` — o plano puro da semente

**What**: A função pura que, dados os produtos e o que já existe, decide entradas a criar, vínculos a
criar e quais levam `answer_override`.
**Where**: `tools/catalog-import/src/write/faqs.ts` + `__tests__/faqs.test.ts`
**Depends on**: T1, T3
**Reuses**: `extractFaqPairs`, `faqQuestionKey` de `@estrelinha/core/faq`
**Requirement**: `FAQ-24`, `FAQ-25`, `FAQ-26`

**Done when**:
- [ ] Resposta padrão é a **mais frequente** por chave; empate resolvido de forma determinística
- [ ] Produto com vínculo existente é **pulado**
- [ ] Entrada existente é reusada **sem** reescrever `faqs.answer`
- [ ] Ordem dos vínculos reproduz a ordem dos pares na descrição
- [ ] Rodar o plano duas vezes sobre o mesmo estado devolve o segundo plano **vazio** (idempotência asserida por contagem)
- [ ] Gate: `pnpm --filter @estrelinha/catalog-import test`

**Tests**: unit · **Gate**: quick

---

### T14: `writeFaqs` — a escrita

**What**: A execução do plano contra o banco, lendo o existente com `selectAll`.
**Where**: `tools/catalog-import/src/write/faqs.ts` (acrescenta)
**Depends on**: T13, T6
**Reuses**: `selectAll`, `unwrap`, `DbError` de `write/db.ts`
**Requirement**: `FAQ-20`, `FAQ-25`

**Done when**:
- [ ] Leituras de "o que já existe" usam **`selectAll`**, nunca `select` simples — `product_faqs` terá 3.476 linhas
- [ ] Insert em lote manda **as mesmas chaves em todos os objetos** (`PGRST102`)
- [ ] `--dry-run` não grava nada
- [ ] Teste com dublê de banco cobre sucesso e `DbError`
- [ ] Gate: `pnpm --filter @estrelinha/catalog-import test`

**Tests**: unit · **Gate**: quick

---

### T15: `run.ts` e o relatório

**What**: A etapa entra no fluxo depois de `writeProducts`; `stopAfter` ganha `'perguntas'`; o
relatório ganha a seção.
**Where**: `tools/catalog-import/src/run.ts`, `report.ts`, `cli.ts`
**Depends on**: T14
**Requirement**: `FAQ-26`

**Done when**:
- [ ] Seção do relatório com entradas criadas, vínculos criados, vínculos com resposta própria, produtos pulados e produtos sem bloco
- [ ] `--stop-after=perguntas` funciona e está documentado no `CLAUDE.md` (T28)
- [ ] Testes de `report` e de `run` cobrem a etapa nova
- [ ] Gate: `pnpm --filter @estrelinha/catalog-import test`

**Tests**: unit · **Gate**: quick

---

### T16: Execução real medida

**What**: Rodar o importador contra o catálogo real e conferir os números da spec.
**Where**: — (execução)
**Depends on**: T15
**Requirement**: `FAQ-20`, `FAQ-25`

**Done when**:
- [ ] `faqs` = **67**, `product_faqs` = **3.476**, produtos com vínculo = **687**, com `answer_override` = **1.044**
- [ ] Segunda execução: os quatro números **não mudam**
- [ ] Divergência de qualquer número é investigada e explicada por escrito, **não** ajustada na spec sem motivo
- [ ] Gate: consultas SQL registradas

**Tests**: none (medição) · **Gate**: full

---

### T17: `useAdminFaqs`

**What**: Leitura da biblioteca com uso, e as mutações de criar/editar/ativar/apagar.
**Where**: `apps/backoffice/src/features/faq-library/api/useAdminFaqs.ts` + testes
**Depends on**: T6
**Reuses**: o formato dos hooks `useAdmin*` existentes
**Requirement**: `FAQ-14`, `FAQ-15`, `FAQ-18`

**Done when**:
- [ ] Lista junta `faqs` + `faq_usage`
- [ ] `23505` (chave duplicada) e `23503` (`restrict`) viram motivo legível, não "erro ao salvar"
- [ ] Toggle manda **`{ id, is_active }` e nada mais** (mesma regra do pausar cupom)
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test`

**Tests**: unit · **Gate**: quick

---

### T18: `/admin/perguntas` — a listagem

**What**: A página e a tabela da biblioteca.
**Where**: `apps/backoffice/src/pages/admin/AdminFaqsPage.tsx`, `features/faq-library/ui/FaqLibraryTable.tsx` + testes
**Depends on**: T17
**Reuses**: `AdminTable`, `FormCard`
**Requirement**: `FAQ-14`

**Done when**:
- [ ] Colunas: pergunta · início da resposta · **em N produtos** · estado · ações
- [ ] Estado vazio declarado (biblioteca sem entrada)
- [ ] Busca por texto
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test`

**Tests**: unit · **Gate**: quick

---

### T19: `FaqEditorDialog` e a recusa de apagar

**What**: Criar/editar com validação, e a recusa de apagar entrada em uso oferecendo desativar.
**Where**: `features/faq-library/ui/FaqEditorDialog.tsx`, `model/faqDelete.ts` + testes
**Depends on**: T18, T1
**Requirement**: `FAQ-12`, `FAQ-15`, `FAQ-18`

**Done when**:
- [ ] `faqRefusal` barra antes do banco; o `check` é a segunda linha
- [ ] Chave duplicada aponta a entrada existente e oferece vinculá-la
- [ ] `faqDeleteRefusal` é **puro** e testado; apagar entrada em uso mostra a contagem e oferece desativar
- [ ] Contador de caracteres nos dois campos
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test`

**Tests**: unit · **Gate**: quick

---

### T20: A rota e a sidebar

**What**: `/admin/perguntas` entra em `App.tsx` e em `navGroups`, no grupo `Catálogo`, depois de
Categorias — nos dois na mesma ordem.
**Where**: `apps/backoffice/src/app/App.tsx`, `widgets/admin-layout/model/navItems.ts`
**Depends on**: T18
**Requirement**: `FAQ-19`

**Done when**:
- [ ] `navItems.test.ts` passa (ele lê o `App.tsx` do disco e compara a ordem textual)
- [ ] Ícone do lucide coerente com o grupo
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test`

**Tests**: unit · **Gate**: quick

---

### T21: `ApplyToCategoryDialog` — o lote

**What**: Aplicar uma entrada a uma categoria e à descendência, com prévia contada.
**Where**: `features/faq-library/ui/ApplyToCategoryDialog.tsx` + testes
**Depends on**: T18
**Reuses**: `descendantIds` de `@estrelinha/core/menu`
**Requirement**: `FAQ-35`, `FAQ-36`

**Done when**:
- [ ] Prévia mostra **vão receber** e **já têm** antes de gravar
- [ ] Aplica à categoria **e à descendência**
- [ ] Produto que já tem o vínculo é pulado, sem alterar `position` nem `answer_override`
- [ ] Ao fim, informa quantos vínculos foram criados
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test`

**Tests**: unit · **Gate**: quick

---

### T22: `planFaqLinks` + persistência

**What**: O plano de upsert/delete dos vínculos e a gravação dentro de `persistProductRelations`.
**Where**: `features/product-form/model/planFaqLinks.ts`, `model/persistProduct.ts` + testes
**Depends on**: T6
**Reuses**: `planCategoryLinks` — espelho exato, mais `answer_override`
**Requirement**: `FAQ-16`, `FAQ-17`, `FAQ-37`

**Done when**:
- [ ] Duplicata na seleção é colapsada (a PK composta recusaria)
- [ ] **Todos** os presentes vão no upsert, não só os novos — reordenar muda `position` de linha que já existia
- [ ] `answer_override` idêntico ao padrão é gravado como `null` (`faqOverrideOf`)
- [ ] O upsert manda a linha inteira, não só `{product_id, faq_id, position}`
- [ ] `persistProduct.test.ts` ganha casos e **não perde nenhum**
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test`

**Tests**: unit · **Gate**: quick

---

### T23: `FaqTab` — a lista do produto

**What**: A aba: vinculadas em ordem, remover, resposta própria, voltar ao padrão, buscar na
biblioteca, criar na hora.
**Where**: `features/product-form/ui/tabs/FaqTab.tsx` + testes
**Depends on**: T22, T19
**Reuses**: `FormCard`, `PricingTab` como molde de aba extraída
**Requirement**: `FAQ-16`, `FAQ-17`

**Done when**:
- [ ] Linha marcada como **resposta própria** quando há override, com `Voltar ao padrão`
- [ ] Criar na hora não sai da tela e já vincula
- [ ] Vincular pergunta que já está no produto é recusado com motivo
- [ ] Aviso (não recusa) acima de 8 perguntas
- [ ] Alvo de toque ≥44px nas ações
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test`

**Tests**: unit · **Gate**: quick

---

### T24: As sugestões dentro da aba

**What**: O bloco de sugestões, lendo `faq_category_usage` e `faq_usage`, com `Adicionar todas`.
**Where**: `features/product-form/ui/tabs/FaqTab.tsx` (acrescenta), `features/product-form/api/useFaqSuggestions.ts` + testes
**Depends on**: T23, T4
**Requirement**: `FAQ-29`, `FAQ-31`, `FAQ-32`, `FAQ-34`

**Done when**:
- [ ] Até 5 sugestões, na ordem de `rankFaqSuggestions`
- [ ] Já vinculadas não aparecem
- [ ] `Adicionar todas` vincula na ordem exibida
- [ ] Produto sem categoria mostra as globais; biblioteca vazia mostra estado vazio declarado
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test`

**Tests**: unit · **Gate**: quick

---

### T25: `DescriptionFaqNotice`

**What**: O aviso na aba Geral e o botão de remover o bloco da descrição.
**Where**: `features/product-form/ui/DescriptionFaqNotice.tsx` + testes
**Depends on**: T3
**Requirement**: `FAQ-27`, `FAQ-28`

**Done when**:
- [ ] Aviso só aparece com bloco localizável, e diz **quantas** perguntas há
- [ ] Atalho para a aba `Perguntas`
- [ ] `Remover o bloco` altera o rascunho (não grava sozinho) e o aviso some
- [ ] Usa **a mesma** `stripFaqBlock` da loja e do importador
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test`

**Tests**: unit · **Gate**: quick

---

### T26: A página do produto liga tudo

**What**: A aba entra em 2ª posição, os vínculos carregam ao abrir, o aviso entra na aba Geral, e a
reordenação por arrasto funciona.
**Where**: `apps/backoffice/src/pages/admin/AdminProductFormPage.tsx`, `model/useProductForm.ts`
**Depends on**: T23, T24, T25
**Requirement**: `FAQ-16`, `FAQ-27`, `FAQ-37`

**Done when**:
- [ ] Aba `Perguntas` logo depois de `Geral`; contagem de erro da aba funciona como nas outras
- [ ] Vínculos carregados no `load` e presentes no rascunho (`useFormDraft`)
- [ ] Arrastar grava `position` e a loja mostra na ordem nova
- [ ] `AdminProductFormPage.test.tsx` ganha casos e não perde nenhum
- [ ] `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` = **0**
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test` + `tsc`

**Tests**: unit · **Gate**: full

---

### T27: Gate de fecho, medido de verdade

**What**: Os cinco workspaces, lint e tipos, com exit code capturado — e o diff de `payment/`.
**Where**: — (verificação)
**Depends on**: T12, T16, T26
**Requirement**: todos

**Done when**:
- [ ] 5 workspaces verdes, contagem por workspace registrada; **nenhuma queda** de teste sem explicação escrita
- [ ] Lint == baseline **30/8**; tipos store/backoffice/catalog-import == **0**
- [ ] `git diff --name-only -- packages/core/src/payment` **vazio**
- [ ] Auditoria em **390×844** antes de 1440: sem scroll horizontal do `body` na página do produto com 8 perguntas
- [ ] Gate: build

**Tests**: none (verificação) · **Gate**: build

---

### T28: Documentação e commits

**What**: `CLAUDE.md`, `STATE.md`, a tabela de rastreabilidade da spec, e os commits agrupados.
**Where**: `CLAUDE.md`, `.specs/STATE.md`, `.specs/features/28-perguntas-frequentes/spec.md`
**Depends on**: T27
**Requirement**: todos

**Done when**:
- [ ] `CLAUDE.md` ganha a seção da feature 28 e as baselines novas de teste
- [ ] `STATE.md` — handoff atualizado com o que foi medido de verdade
- [ ] Rastreabilidade da spec sai de `Pending`
- [ ] Commits **agrupados** (convenção do projeto, não um por task)
- [ ] Gate: build

**Tests**: none · **Gate**: build

---

## Phase Execution Map

```
Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6

Fase 1:  T1 → T2 → T3 → T4 → T5 → T6 → T7      (domínio puro + banco)
Fase 2:  T8 → T9 → T10 → T11 → T12             (loja)
Fase 3:  T13 → T14 → T15 → T16                 (semente)
Fase 4:  T17 → T18 → T19 → T20 → T21           (biblioteca)
Fase 5:  T22 → T23 → T24 → T25 → T26           (aba do produto)
Fase 6:  T27 → T28                             (fecho)
```

**Execução inline, sem sub-agentes** (proibidos nesta sessão). 28 tasks, uma por vez, em ordem.

---

## Task Granularity Check

| Task | Escopo | Status |
| --- | --- | --- |
| T1 | 2 arquivos coesos (tipos + funções de chave) + export map | ✅ |
| T2, T3, T4 | 1 grupo de funções coeso cada | ✅ |
| T5, T7 | 1 guarda cada | ✅ |
| T6 | 1 migration | ✅ |
| T8..T12 | 1 hook / 1 componente / 1 edição por task | ✅ |
| T13, T14 | plano puro × escrita — separados de propósito (`AD-002`) | ✅ |
| T15 | 3 arquivos do mesmo fluxo (run + report + cli) | ⚠️ coeso, aceito |
| T16, T27 | verificação medida | ✅ |
| T17..T21 | 1 hook / 1 tela / 1 diálogo por task | ✅ |
| T22..T26 | 1 plano / 1 aba / 1 bloco / 1 aviso / 1 wiring | ✅ |
| T28 | documentação + commits | ✅ |

---

## Diagram-Definition Cross-Check

| Task | Depends on (corpo) | Diagrama | Status |
| --- | --- | --- | --- |
| T1 | — | início da Fase 1 | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T1 | T2 → T3 (sequencial; dep real é T1, anterior) | ✅ |
| T4 | T1 | T3 → T4 (idem) | ✅ |
| T5 | T4 | T4 → T5 | ✅ |
| T6 | — | T5 → T6 (sequencial; sem dep) | ✅ |
| T7 | T6 | T6 → T7 | ✅ |
| T8 | T2, T6 | Fase 1 → Fase 2 | ✅ |
| T9 | T2 | Fase 1 → Fase 2 | ✅ |
| T10 | T9 | T9 → T10 | ✅ |
| T11 | T3 | Fase 1 → Fase 2 | ✅ |
| T12 | T8, T10 | T10 → T11 → T12 | ✅ |
| T13 | T1, T3 | Fase 1 → Fase 3 | ✅ |
| T14 | T13, T6 | T13 → T14 | ✅ |
| T15 | T14 | T14 → T15 | ✅ |
| T16 | T15 | T15 → T16 | ✅ |
| T17 | T6 | Fase 1 → Fase 4 | ✅ |
| T18 | T17 | T17 → T18 | ✅ |
| T19 | T18, T1 | T18 → T19 | ✅ |
| T20 | T18 | T19 → T20 (dep real T18, anterior) | ✅ |
| T21 | T18 | T20 → T21 (dep real T18, anterior) | ✅ |
| T22 | T6 | Fase 1 → Fase 5 | ✅ |
| T23 | T22, T19 | T22 → T23; T19 em fase anterior | ✅ |
| T24 | T23, T4 | T23 → T24 | ✅ |
| T25 | T3 | Fase 1 → Fase 5 | ✅ |
| T26 | T23, T24, T25 | T25 → T26 | ✅ |
| T27 | T12, T16, T26 | Fases 2/3/5 → Fase 6 | ✅ |
| T28 | T27 | T27 → T28 | ✅ |

Nenhuma dependência aponta para fase posterior. ✅

---

## Test Co-location Validation

| Task | Camada | Matriz exige | Task diz | Status |
| --- | --- | --- | --- | --- |
| T1..T4 | Domínio puro | unit | unit | ✅ |
| T5 | Guarda de disco | unit | unit | ✅ |
| T6 | Migration | none + **probe** | none + probe | ✅ |
| T7 | Guarda de disco | unit | unit | ✅ |
| T8 | Acesso a dados | unit | unit | ✅ |
| T9, T10, T11 | Componente de loja | unit | unit | ✅ |
| T12 | Página de loja | unit | unit | ✅ |
| T13, T14 | Plano do importador | unit | unit | ✅ |
| T15 | Fluxo do importador | unit | unit | ✅ |
| T16 | Medição | none | none | ✅ |
| T17 | Acesso a dados | unit | unit | ✅ |
| T18, T19, T21 | Componente de painel | unit | unit | ✅ |
| T20 | Wiring de rota | none (build) — mas `navItems.test.ts` já cobre | unit | ✅ (acima do exigido) |
| T22 | Plano puro | unit | unit | ✅ |
| T23, T24, T25 | Componente de painel | unit | unit | ✅ |
| T26 | Página de painel | unit | unit | ✅ |
| T27, T28 | Verificação / docs | none | none | ✅ |

Nenhuma violação. Nenhum `Tests: none` justificado por "coberto em outra task".

---

## Ferramentas por task

- **MCP**: nenhum. O Supabase MCP **não está autorizado nesta sessão** — o acesso ao banco é por
  `docker exec … psql` (medição) e `curl` contra `127.0.0.1:54341` (probe de `AD-012`).
- **Skill**: `tlc-spec-driven` (esta). Nenhuma outra.
- **Sub-agentes**: proibidos nesta sessão; Verifier roda como passe standalone.
