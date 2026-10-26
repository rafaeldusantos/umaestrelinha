# 81 — Baseline de entrada

Medida em **2026-10-26**, com a árvore parada (antes da T01), no commit `fc2b3b60`, branch
`feat/81-opcoes-e-variacoes-do-produto`. Um workspace por vez, exit code capturado fora de pipe.

| Medida | Resultado | Exit | Comando |
| --- | --- | --- | --- |
| Testes backoffice | **3706 em 211 arquivos**, todos verdes | 0 | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` |
| Testes store | **5754 em 314 arquivos**, todos verdes | 0 | `pnpm --filter @estrelinha/store test --testTimeout=20000` |
| Tipos backoffice | **0 erros** | 0 | `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` |
| Lint backoffice | **23 erros / 5 warnings** (28 problemas) | 1 | `npx eslint .` em `apps/backoffice` |

> **Os números de teste NÃO batem a tabela de baselines do `CLAUDE.md` raiz** (store 5985/323 ·
> backoffice 3710/214), e não é regressão: aquela tabela é da branch de integração
> `feature/mobile-adm` (features 72..79), e esta branch nasceu do `master`, que não as tem. O gate
> desta feature compara contra os números acima.

## Fim da Fase 1 (T01..T04) — medido em 2026-10-26

| Medida | Resultado | Exit | Delta |
| --- | --- | --- | --- |
| Testes backoffice | **3760 em 215** | 0 | +54/+4 (`gridSync` 22 · `orphans` 7 · `optionLibrary` 16 · `useOptionLibrary` 9) |
| Testes store | **5754 em 314** | 0 | 0 (não tocada; remedida porque os guardas dela varrem `apps/**`) |
| Tipos backoffice | **0** | 0 | 0 |
| Lint backoffice | **23 / 5** | 1 | 0 (os 9 arquivos novos/tocados passam limpos) |

Nenhuma queda de teste e nenhuma asserção existente tocada. O guarda de pureza de
`entities/product/lib` (`buscarProdutos.test.ts`) reprovou na primeira medição — `optionLibrary.ts`
importava o TIPO `ProductOption` de `@estrelinha/supabase/types` — e o conserto foi no código
(forma estrutural local `OpcaoDoCatalogo`), não na régua.

## Fim da Fase 2 (T05..T07) — medido em 2026-10-26

| Medida | Resultado | Exit | Delta sobre a Fase 1 |
| --- | --- | --- | --- |
| Testes backoffice | **3797 em 216** | 0 | +37/+1 = `OptionsEditor` +29 · `VariantImagePicker` +17 (arquivo novo) · `VariantsTable` +7 · **queda declarada −16** (`gridActions.test.ts` −10, `GridActions.test.tsx` −6: o "Regerar do cruzamento" saiu, OPV-10) |
| Testes store | **5754 em 314** | 0 | 0 (remedida pelos guardas que varrem `apps/**`) |
| Tipos backoffice | **0** | 0 | 0 |
| Lint backoffice | **23 / 5** | 1 | 0 (nenhum problema nos arquivos tocados) |

As 24 asserções antigas de `OptionsEditor.test.tsx` foram reescritas para os literais de OPV-17
("Nome da opção", "N de 3 opções", "Adicionar opção") e passaram a cobrar também a mudança tipada
(`{ kind, index }`) — ficaram mais estritas, nenhuma afrouxada. `RegenerateGridDialog.tsx` foi apagado.

## Fim da Fase 3 (T08..T10) — medido em 2026-10-26 (Build gate)

| Medida | Resultado | Exit | Delta sobre a Fase 2 |
| --- | --- | --- | --- |
| Testes backoffice | **3808 em 218** | 0 | +11/+2 = página real `AdminProductFormPage.variacoes.test.tsx` +13 (arquivo novo) · `AdminQuickGridPage.test.tsx` +3 (15 → 18) · `StorefrontPreview.test.tsx` +6 e `lib/variantImages.test.ts` +3 (arquivos novos, casos movidos sem alteração) · **queda declarada −14 de `VariantImageCard.test.tsx`** (apagado com o card, OPV-16): 9 desses casos são os movidos acima; a queda líquida é **−5**, o `describe` do próprio card, cujo comportamento (escolher, principal, galeria vazia) está em `VariantImagePicker.test.tsx` |
| Testes store | **5754 em 314** | 0 | 0 (remedida pelos guardas que varrem `apps/**`) |
| Tipos backoffice | **0** | 0 | 0 |
| Lint backoffice | **23 / 5** | 1 | 0 (= entrada) |
| Build backoffice | verde | 0 | — |

Delta total da feature sobre a entrada: **backoffice +102/+7** (3706/211 → 3808/218), store 0.

Sensor do autor na fiação da página (T08): 8 mutantes reinjetados em `AdminProductFormPage.tsx`
(hash do arquivo conferido na restauração), **8 mortos por asserção** no arquivo de página — editor sem
`syncGrid`, filtro "voltou ao cruzamento" apagado, conjunto de conferidas ignorado, preço padrão
zerado, aviso das pausadas apagado, `onUploadingChange` da grade desligado, `onImagesAdded` sem
efeito, e a resposta aplicada sobre o `form` do momento da mudança em vez do atual. Autor ≠
verificador ainda não correu.


## Conserto da rodada 1 do Verificador — medido em 2026-10-26

| Medida | Resultado | Exit | Delta sobre o fim da Fase 3 |
| --- | --- | --- | --- |
| Testes backoffice | **3815 em 218** | 0 | +7/0 = página real +4 (G1, G2, G3, G4) · `orphans.test.ts` +2 (o par de G2) · `VariantsTable.test.tsx` +1 (o `relative` do contêiner, achado em navegador) |
| Testes store | **5754 em 314** | 0 | 0 |
| Tipos backoffice | **0** | 0 | 0 |
| Lint backoffice | **23 / 5** | 1 | 0 |
| Build backoffice | verde | 0 | — |

Delta total da feature sobre a entrada: **backoffice +109/+7** (3706/211 → 3815/218), store 0.
