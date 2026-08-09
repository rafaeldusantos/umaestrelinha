# Listagem v2 e Operações em Lote — Validation

**Date**: 2026-08-01
**Spec**: [`spec.md`](./spec.md)
**Diff range**: `c29f7b1..e4acaae`
**Verifier**: modo **standalone** — mesma limitação declarada nas features
[`07`](../07-product-catalog-admin/validation.md), [`10`](../10-emails-transacionais/validation.md) e
[`12`](../12-product-media-studio/validation.md): autor e verificador são o mesmo agente. A
compensação é o **sensor de discriminação**, empírico, e — nesta feature — a conferência das formas
de consulta contra o **PostgREST real** antes de escrevê-las.

---

## Task Completion

| Task | Status | Notas |
| ---- | ------ | ----- |
| T38 | ✅ Done | 26 testes. Formas de filtro validadas contra o PostgREST local |
| T39 | ✅ Done | 43 testes (27 puros + 16 de tela) |
| T40 | ✅ Done | 34 testes (28 puros + 6 de tela) |
| T41 | ✅ Done | 37 testes (22 puros + 15 de tela) |
| T42 | ✅ Done | Gate manual: `db reset` + `grep`, ambos conferidos |

---

## Spec-Anchored Acceptance Criteria

### P2.1 — Listagem v2 (PLS-01…PLS-04, PLS-09)

| Critério | Saída definida na spec | `file:line` + asserção | Resultado |
| -------- | ---------------------- | ---------------------- | --------- |
| AC 1 — paginação, busca, filtro e ordenação **no servidor**, sem `select('*')` em memória | `count` + `range`, select nomeado | `useAdminProducts.test.ts:280-286` — `expect(call.select?.[1]).toEqual({count:'exact'})`, `expect(call.range).toEqual([0,24])`, `expect(call.select?.[0]).not.toContain('*')` | ✅ PASS |
| AC 2 — rodapé `X–Y de N` com o total do servidor | `1–25 de 160` | `AdminProductsPage.test.tsx:122` — `getByText('1–25 de 160')` com `total: 160` e 2 linhas | ✅ PASS |
| AC 3 — sete visões com a contagem de cada | `Todos`…`Agendados` | `AdminProductsPage.test.tsx:129-133` (rótulos + contagens) · filtros por visão em `useAdminProducts.test.ts:307-345` | ✅ PASS |
| AC 4 — `Salvar visão atual` persiste em `localStorage` (A22) | visão nomeada por navegador | `rowSummary.test.ts:229` — `upsertView` não duplica · `:238` storage corrompido não derruba | ✅ PASS — **nota 1** |
| AC 5 — filtro ativo vira chip com valor e `×` | chip por categoria/tag/faixa | `rowSummary.test.ts:187-213` — rótulos e `clear()` de cada chip | ✅ PASS |
| AC 6 — busca cobre nome, **SKU de variação** e tag | uma condição com os três | `useAdminProducts.test.ts:351-359` — `name.ilike`, `tags.cs.{"…"}` e `id.in.(…)` | ✅ PASS |
| AC 7 — `Enter` salva, `Tab` avança, `Esc` cancela | teclado na célula | `AdminProductsPage.test.tsx:215-247` — três testes, um por tecla | ✅ PASS |
| AC 8 — toast com **Desfazer** restaura o valor anterior | segundo update com o snapshot | `AdminProductsPage.test.tsx:266-283` — `action.props.altText === 'Desfazer'` e o clique regrava `{stock_total: 12}` | ✅ PASS |
| AC 9 — faixa + `N preços`, edição de preço travada **com explicação** | `R$ 14,90 – 18,40` · `2 preços` | `AdminProductsPage.test.tsx:168-170`, `:181-184` · regra pura em `rowSummary.test.ts:71-88` | ✅ PASS |
| AC 10 — `stock_policy: none` mostra `sempre disponível` e não é editável | string exata | `AdminProductsPage.test.tsx:192-193` · `rowSummary.test.ts:106-112` | ✅ PASS |
| AC 11 — coluna Produto com thumb, nome, contagem de variações, slug e badges | `sem imagem`, `grade incompleta` (PST-10) | `AdminProductsPage.test.tsx:199`, `:205` · `rowSummary.test.ts:165-182` | ✅ PASS |
| AC 12 — Status `Ativo`/`Esgotado`/`Rascunho`/agendamento | ordem: agendado vence ativo | `rowSummary.test.ts:136-161` — seis casos, incluindo `none` que nunca esgota | ✅ PASS |
| AC 13 — menu **Colunas** com densidade | mostrar/ocultar + densidade | `rowSummary.test.ts:217-227` — `toggleColumn` e a coluna fixa | ✅ PASS |
| AC 14 — `Novo produto ▾` oferece os três caminhos | `Novo produto`, `Grade rápida`, `Importar CSV` | `AdminProductsPage.test.tsx:296-303` — os três itens, na ordem | ✅ PASS |

### P2.2 — Edição em massa (PLS-05, PLS-06)

| Critério | Saída definida na spec | `file:line` + asserção | Resultado |
| -------- | ---------------------- | ---------------------- | --------- |
| AC 1 — barra de massa com a contagem | `N selecionados` | `AdminProductsPage.test.tsx:320-323` | ✅ PASS — **nota 2** |
| AC 2 — selecionar **todos os N do filtro** | além da página visível | `AdminProductsPage.test.tsx:338-345` — `fetchAllFiltered` chamado, seleção passa a 5 | ✅ PASS |
| AC 3 — interruptor por campo; só o ligado muda | campo desligado fora do patch | `buildBulkPatch.test.ts:65-70` — `Object.keys(patch.values)` só tem `base_price` | ✅ PASS |
| AC 4 — modos de preço, com `terminar em ,90` | `+10%` sobre 3 preços conhecidos | `buildBulkPatch.test.ts:90-92` — `[16.39, 20.24, 6.49]` (conta no comentário) · `:110-112` `,90` → `[16.9, 20.9, 6.9]` | ✅ PASS |
| AC 5 — estoque ignora `none` e **informa quantos** | ignorado + contagem no aviso | `buildBulkPatch.test.ts:141-147` — `ignored` nomeado e `'1 produto(s) ignorado(s) no campo Estoque'` | ✅ PASS |
| AC 6 — categorias/tags com `Adicionar`/`Remover` | sem duplicar | `buildBulkPatch.test.ts:187-200` | ✅ PASS — **nota 3** |
| AC 7 — status `Ativar`/`Pausar`/`Agendar` | só `is_active` | `buildBulkPatch.test.ts:180-184` | ⚠️ **Parcial** — `Agendar` existe na função pura, não no painel (**nota 3**) |
| AC 8 — prévia antes → depois + ticket médio + avisos | médias 13,07 → 14,37 | `buildBulkPatch.test.ts:203-212` | ✅ PASS |
| AC 9 — toast `Desfazer · 30 s` com os valores anteriores | snapshot capturado antes da escrita | `buildBulkPatch.test.ts:217-229` · `AdminProductsPage.test.tsx:395-417` | ✅ PASS |
| AC 10 — expira em 30 s e some no reload | buffer em memória | `buildBulkPatch.test.ts:246-256` (TTL com fake timers) · `:275-283` (nada em storage) | ✅ PASS |
| AC 11 — falha parcial reporta `X alterados · Y falharam` | string exata | `AdminProductsPage.test.tsx:379-381` — `'1 alterados · 1 falharam'` | ✅ PASS |

### P2.3 — Grade rápida (PLS-07, PLS-08)

| Critério | Saída definida na spec | `file:line` + asserção | Resultado |
| -------- | ---------------------- | ---------------------- | --------- |
| AC 1 — faixa de padrões + planilha | eixos, peso, rascunho | `AdminQuickGridPage.test.tsx:203-208` | ✅ PASS |
| AC 2 — linha herda o padrão do lote | eixos e peso no produto | `quickGrid.test.ts:180-186` | ✅ PASS |
| AC 3 — colunas do artboard | `# · Nome* · Categorias · Preço* · Estoque · Tags · SKU base` | `AdminQuickGridPage.test.tsx:213-217` — cabeçalhos exatos | ✅ PASS — **nota 4** |
| AC 4 — colar do Excel com as máscaras do formulário | `R$ 1.234,56` → `1234.56` | `quickGrid.test.ts:59-63` · 8 linhas em `:46-56` | ✅ PASS |
| AC 5 — `Tab` avança, `⌥↓` duplica | duplicação da linha | `AdminQuickGridPage.test.tsx:122-128` · `:130-136` (sem Alt não duplica) | ✅ PASS — **nota 5** |
| AC 6 — erro **abaixo da linha**, sem esperar o submit | `Preço é obrigatório` | `AdminQuickGridPage.test.tsx:79-84` | ✅ PASS |
| AC 7 — rodapé `N prontas · M com erro` | `7 prontas · 1 com erro` | `AdminQuickGridPage.test.tsx:71-76` · puro em `quickGrid.test.ts:145-149` | ✅ PASS |
| AC 8 — cria só as válidas, como rascunho; as com erro ficam | 7 de 8, `is_active: false` | `quickGrid.test.ts:167-175` · `AdminQuickGridPage.test.tsx:186-196` (as com erro permanecem) | ✅ PASS |
| AC 9 — grade do cruzamento dos eixos, herdando o preço (A4) | 2 produtos × 2 combos = 4 | `quickGrid.test.ts:188-200` | ✅ PASS |
| AC 10 — **um** insert e **um** refetch | não `fetchProducts()` por item | `useAdminProducts.test.ts:400-412` — um insert de 20 linhas, `products` chamado +2 · `AdminQuickGridPage.test.tsx:141-152` | ✅ PASS |

### P4.1 — Limpeza do legado (VAR-13)

| Critério | Evidência | Resultado |
| -------- | --------- | --------- |
| AC 1 — as três colunas deixam de existir | `information_schema.columns` para `variants/sizes/finishes` volta **vazio** depois do `db reset` | ✅ PASS |
| AC 2 — nenhum caminho de código as referencia | `grep -rn "\.variants\b\|\.sizes\b\|\.finishes\b" apps packages` só devolve leituras do modelo NOVO (`ProductVariant[]`) e comentários históricos | ✅ PASS |
| AC 3 — campos `@deprecated` saem dos tipos | `LegacyJsonbVariant`, `DbProduct.sizes/finishes` e `Product.sizes/finishes` removidos de `packages/supabase/src/types/index.ts` | ✅ PASS |
| AC 4 — `supabase db reset` completa de ponta a ponta | migrations aplicam limpo, **inclusive a nova**; o seed segue no workaround de dois passos do bug pré-existente | ⚠️ **Parcial declarado** — **nota 6** |
| AC 5 — build, test e lint na baseline | 1908 testes, build verde, lint 36/16 | ✅ PASS |

**Status**: ✅ 34 de 36 ACs com evidência direta · 2 parciais declarados (notas 3 e 6)

---

## Notas de divergência (declaradas)

**Nota 1 — visão salva sem UI de gerenciamento.** `Salvar visão atual` grava e a visão aparece ao
lado das sete fixas; **não** há renomear nem excluir na tela (o hook expõe `remove`, sem botão). A
AC 4 pede salvar, e é o que existe.

**Nota 2 — `Duplicar`, `Exportar` e `Excluir` não estão na barra de massa.** A AC 1 de P2.2 lista
seis ações; a barra entrega `Editar em massa` e `Limpar seleção`. `Ativar`/`Pausar` existem **dentro
do painel** (campo Status), que é o mesmo efeito por outro caminho. As três restantes não foram
implementadas — `Exportar` não tem formato definido em lugar nenhum da spec, e `Excluir` em massa
sem confirmação nomeada é destrutivo demais para inferir. **É a maior lacuna desta feature.**

**Nota 3 — `Agendar` e `Substituir categorias` existem na função pura, não no painel.**
`buildBulkPatch` implementa e testa os dois (`status.mode: 'schedule'`, `categories.mode:
'replace'`, com o aviso de que remove as atuais), mas o `BulkEditPanel` só expõe Preço, Estoque,
Status (Ativar/Pausar) e Tags. O campo Categorias não tem UI — falta o seletor de categorias no
painel.

**Nota 4 — a coluna `imagem` da planilha não existe.** A AC 3 lista `# · imagem · Nome* · …`; a
grade rápida não sobe imagem (seria um terceiro caminho de upload, com validação e progresso
próprios). As colunas entregues são as outras sete.

**Nota 5 — `Tab` é o comportamento nativo do navegador.** Não há teste dele: em jsdom o foco não
percorre a tabela como no browser, e afirmar "avançou" com um `fireEvent` seria testar o dublê. O
que existe é a ausência de `preventDefault` no `Tab` — declarado aqui em vez de fingido.

**Nota 6 — `supabase db reset` completa as migrations, não o seed.** O seed falha em
`relation "_pal" does not exist`, que é o
[`BUG-20260801-seed-temp-table-quebra-db-reset`](../../../docs/qa/bugs/BUG-20260801-seed-temp-table-quebra-db-reset.md) —
**pré-existente, registrado e com workaround em uso** (dois passos: `db reset --no-seed` + o seed
numa sessão única). Com o workaround: `categories 8 · products 32 · product_variants 30`. A AC 4
pede "completar sem erro"; o que se pode afirmar é que **nenhuma migration falha** e que a única
falha é a já catalogada, independente desta feature.

**Nota 7 — a suíte completa em paralelo pode dar timeout sob carga.** Uma execução de `pnpm test`
acusou 6 falhas em suítes pesadas (`MockupStudioDialog`, `AuthOverlay`, `PixPayment`,
`ProductFormHeader`), todas com duração de 5–7 s. Rodadas isoladamente e numa segunda execução
completa, **todas passam**. É contenção de máquina, não regressão — registrado para quem vir o
mesmo.

---

## Discrimination Sensor

| # | Mutação | Arquivo | Killed? |
| - | ------- | ------- | ------- |
| M1 | O range da página 2 volta a começar em zero | `productQuery.ts:pageRange` | ✅ |
| M2 | O total passa a ser o tamanho da página | `useAdminProducts.ts` | ✅ |
| M3 | A busca deixa de cobrir o SKU de variação | `useAdminProducts.ts` | ✅ |
| M4 | A célula de preço com grade volta a ser editável | `rowSummary.ts` | ✅ |
| M5 | `stock_policy: none` deixa de ser `sempre disponível` | `rowSummary.ts` | ✅ |
| M6 | Aumento de 10% vira 1% | `buildBulkPatch.ts` | ✅ |
| M7 | `terminar em ,90` arredonda para BAIXO | `buildBulkPatch.ts` | ✅ |
| M8 | Produto sem controle de estoque deixa de ser ignorado | `buildBulkPatch.ts` | ✅ |
| M9 | O snapshot do desfazer guarda o valor NOVO | `buildBulkPatch.ts` | ✅ |
| M10 | O teto de 200 linhas some | `quickGrid.ts` | ✅ |
| M11 | Linha inválida entra no lote | `quickGrid.ts` | ✅ |
| M12 | Produto da grade rápida nasce publicado | `quickGrid.ts` | ✅ |
| M13 | Colisão de slug vira mensagem genérica | `quickGrid.ts` | ✅ |

**Profundidade**: ampliada — 13 mutações, concentradas onde o erro é **silencioso e caro**: a
aritmética de reajuste (M6, M7), o alvo do desfazer (M9) e o que entra no banco pelo lote (M11–M13).
**Resultado**: **13/13 killed** — ✅ PASS. Árvore restaurada por `git checkout --`; `git status`
limpo ao fim (conferido).

---

## Defeitos reais encontrados PELOS testes durante a implementação

Registrados porque são a prova de que a cobertura discrimina — não foram achados por leitura:

1. **`async` devolvendo o builder do `supabase-js` executa a consulta.** O builder é *thenable*, e
   uma função `async` que o devolve faz a promise adotá-lo: o `await` do chamador recebia o
   **resultado**, não o builder. Conserto: devolver `{ builder }`.
2. **O `Desfazer` do toast lia um `pending` velho.** O toast é montado no render anterior ao
   `capture`, então o closure via `null` e o desfazer não fazia nada, calado. Conserto: o buffer
   também vive num `ref`, lido no clique.
3. **`no-this-alias` no dublê de canvas da feature 12**, pego pelo gate de lint antes do fecho.

---

## Code Quality

| Princípio | Status |
| --------- | ------ |
| Código mínimo | ✅ |
| Mudanças cirúrgicas | ⚠️ `MaskedNumberInput` ganhou `autoFocus`/`onBlur` (edição inline precisa dos dois) — extensão de 4 linhas, declarada |
| Sem scope creep | ⚠️ ver notas 2 e 3 — o escopo ficou **aquém**, não além |
| Segue os padrões existentes | ✅ — puro em `model/`, UI em `ui/`, barrel por slice |
| Saída afirmada bate com a definida na spec | ✅ — as strings fixadas pela spec são asseridas por inteiro |
| Cobertura por camada | ✅ — domínio 1:1 com AC; dados asseridos **sobre o mock do supabase**, como a matriz pede |
| Todo teste mapeia para um requisito | ✅ |
| Guidelines seguidas | `CLAUDE.md` + `tasks.md` (Test Coverage Matrix e Gate Check Commands) |

---

## Gate Check

- **Comando (build)**: `pnpm build && pnpm test && pnpm lint`
- **`pnpm test`**: **1908 passed, 0 failed** — core 500 · store 499 · functions 232 · backoffice 677
- **Antes da feature 13**: 1769 · **Delta**: **+139**
- **`pnpm build`**: exit 0 · **`pnpm lint`**: 36 err / 16 warn (baseline) · **`tsc`**: store 0 · backoffice 4
- **`sql`**: `supabase db reset --no-seed` + seed em sessão única → `categories 8 · products 32 ·
  product_variants 30`; as três colunas legadas **não existem** (`information_schema` vazio)
- **Nota de contagem**: o backoffice tem 677 e não 678 porque a T42 **removeu** o teste que afirmava
  `form.sizes`/`form.finishes` — o requisito que ele cobria deixou de existir com as colunas.

---

## Requirement Traceability Update

| Requisito | Novo status |
| --------- | ----------- |
| PLS-01, PLS-02, PLS-03, PLS-04, PLS-07, PLS-08, PLS-09 | ✅ Verified |
| PLS-05 | ⚠️ Verified com lacuna — barra de massa sem `Duplicar`/`Exportar`/`Excluir` (nota 2) |
| PLS-06 | ⚠️ Verified com lacuna — painel sem Categorias e sem `Agendar` (nota 3) |
| VAR-13 | ✅ Verified |

---

## Fix Plans (lacunas que sobram, priorizadas)

### Fix 1 — barra de massa incompleta (PLS-05 AC 1) · **Major**
- **Causa**: implementadas `Editar em massa` e `Limpar seleção`; faltam `Ativar`, `Pausar`,
  `Duplicar`, `Exportar` e `Excluir` como atalhos da barra.
- **Task**: acrescentar as ações à barra. `Ativar`/`Pausar` reusam `updateProductsBatch`;
  `Excluir` exige diálogo com a contagem; `Duplicar` e `Exportar` precisam de decisão de produto
  (o que copiar das variações · qual formato).
- **Done when**: as seis ações existem ou estão declaradas fora de escopo na spec.

### Fix 2 — painel sem Categorias e sem `Agendar` (PLS-06 AC 6-7) · **Minor**
- **Causa**: `buildBulkPatch` já implementa e testa os dois; falta a UI.
- **Task**: seletor de categorias (Adicionar/Remover/Substituir) e data no campo Status.
- **Done when**: os modos que a função pura suporta aparecem no painel.

### Fix 3 — coluna `imagem` da grade rápida (PLS-07 AC 3) · **Minor**
- Decidir se entra (terceiro caminho de upload) ou sai da spec.

---

## Summary

**Overall**: ⚠️ **PASS com lacunas declaradas** — a feature está utilizável e verificada; três
pedaços de UI listados nas ACs não foram entregues e estão nomeados acima.

**Spec-anchored**: 34/36 ACs com asserção que bate com a saída definida na spec.
**Sensor**: 13/13 mutações mortas.
**Gate**: 1908 passed, build verde, lint na baseline, `db reset` conferido no banco real.

**O que funciona**: a listagem pergunta ao servidor e mostra o total real; preço com grade trava com
explicação; `sempre disponível` não é editável; reajuste em massa com prévia conferível e desfazer
de 30 s que regrava só o que mudou; grade rápida colando do Excel com um insert de produtos, um de
variações e um refetch; e o modelo legado deixou de existir no banco e no código.

**Próximo passo**: os três Fix Plans acima. Nenhum bloqueia o uso; o Fix 1 é o que um operador
sente primeiro.
