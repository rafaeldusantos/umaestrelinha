# 80 — Validação (verificador independente)

2026-10-22 · autor ≠ verificador · árvore sem commit em `feat/80-fornecedor-da-peca` (base `41ea7040`).

## Veredito: **FAIL** — por cobertura, sem defeito de produto achado

42 mutantes nos arquivos reais (40 válidos de comportamento + 2 de alcance do guarda), **35 mortos por
asserção, 0 por compilação, 7 sobreviventes**. Cinco dos sete mapeiam para requisito da spec
(FOR-09, FOR-11, FOR-16, FOR-07, FOR-17). Cada arquivo foi restaurado e conferido por SHA-256
(`mut.py` lança se o alvo não existe exatamente uma vez, e se a restauração diverge).

## Gates (sem mutação)

| Gate | Esperado | Medido |
| --- | --- | --- |
| backoffice `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` | 3699/211 | **3699/211**, exit 0 |
| store `pnpm --filter @estrelinha/store test --testTimeout=20000` | 5753/314 | **5753/314**, exit 0 |
| core `npx vitest run` | 3516/139 | **3516/139**, exit 0 |
| `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` | 0 | **0** |
| probe HTTP `probes/rls.sh` (banco local) | — | anon 401 em ler/gravar as duas tabelas e o embed; admin 201; duplicata em maiúsculas 409/23505; link `javascript:` 400/23514; apagar fornecedor em uso 409/23503; limpeza ok |
| probe psql, `authenticated` **não-admin** | — | vê 0 de 1 fornecedor; `insert` recusado pela RLS (`with check`) |

## Cobertura por requisito

| FOR | Evidência (`arquivo:linha` — asserção) | Resultado |
| --- | --- | --- |
| 01 | `apps/store/src/shared/lib/__tests__/fornecedorSchema.test.ts:123` `limiteDoNome == SUPPLIER_NAME_MAX`; `:129` índice `lower(btrim(name))`; probe 5 (409) | ✅ |
| 02 | `fornecedorSchema.test.ts:137,143,148` (PK+cascade, restrict, `^https?://` e 2000); probes 7, 10 | ✅ |
| 03 | `fornecedorSchema.test.ts:156,161,166,178`; `fornecedorForaDaLoja.test.ts:64-72`; probes 1–3, 9 e psql não-admin | ✅ (ver G6: alcance) |
| 04 | `fornecedorSchema.test.ts:185` | ✅ |
| 05 | `AdminProductFormPage.fornecedor.test.tsx:157-162` (`titulos[preco+1] === 'Fornecedor'`, selo, dois campos) | ✅ |
| 06 | `AdminProductFormPage.fornecedor.test.tsx:168` texto exato | ✅ |
| 07 | `suggest.test.ts:8-27` (acento, contém, 8); `fornecedor.test.tsx:180,199-209` (↓, Enter, Esc) | ⚠️ **↑ sem prova** (M33) |
| 08 | `fornecedor.test.tsx:180,191` (`Criar ‘…’`) | ✅ |
| 09 | `fornecedor.test.tsx:220-222` — **só "Salvar rascunho"** | ❌ **"nos dois botões" sem prova** (M14) |
| 10 | `fornecedor.test.tsx:232-237` (rascunho); `rules.test.ts:22` | ⚠️ idem, só rascunho (M14 cobre os dois) |
| 11 | `persistSupplier.test.ts:47,62,77`; `fornecedor.test.tsx:250-271` — **só produto em edição** | ❌ **produto NOVO sem prova** (M21) |
| 12 | `persistSupplier.test.ts:91`; `fornecedor.test.tsx:284` | ✅ |
| 13 | `persistSupplier.test.ts:98-104`; `fornecedor.test.tsx:296-297` | ✅ |
| 14 | `fornecedor.test.tsx:307-313` | ✅ |
| 15 | `persistSupplier.test.ts:130` (`productRowToForm` com `asCopy`) | ⚠️ só a carga; o save da cópia não é provado (mesma lacuna de M21) |
| 16 | `fornecedor.test.tsx:326-330` (href, `_blank`, `rel`), `:336` (sem card), `:344` (link do rascunho não muda o card) | ❌ **nome do rascunho no card sem prova** (M17) |
| 17 | `AdminProductsPage.test.tsx` (feature 80, FOR-17 ×2); `useAdminProducts.test.ts` (`toListRow`) | ❌ **"configurável como as outras" sem prova** (M41, M42) |
| 18 | `useAdminProducts.test.ts` (FOR-18 ×4: `in('supplier_id')`, interseção, vazio, filtro ativo); `fornecedorNosFiltros.test.ts:31-36` (chip); `AdminProductsPage.test.tsx` (Select → `supplierIds`, chip) | ✅ (contagem: mesmo builder com `count: 'exact'`, por construção) |
| 19 | `fornecedorNosFiltros.test.ts:14-22` | ✅ (unidade; a página abrindo a visão não é exercitada) |

## Mutantes

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| M01 | migration | sem `with check` na policy de `product_suppliers` | morto (asserção) |
| M02 | migration | sem `revoke … suppliers from anon` | morto |
| M03 | migration | `to authenticated` → `to public` (suppliers) | morto |
| M04 | migration | índice único em `(name)` | morto |
| M05 | migration | `grant select … product_suppliers to anon` | morto |
| M06 | migration | `check` do link sem `^https?://` | morto |
| M07 | persistSupplier | nunca reaproveita (sempre cria) | morto |
| M08 | persistSupplier | sem o atalho "sem mudança" (FOR-13) | morto |
| M09 | persistSupplier | `supplierChanged` ignora o link | morto |
| M10 | persistSupplier | nome vazio não apaga o vínculo | morto |
| M11 | persistSupplier | corrida `23505` não relê | morto |
| M12 | persistSupplier | link vazio grava `''` em vez de `null` | morto |
| M13 | persistSupplier | `upsert` sem `onConflict: 'product_id'` | morto |
| **M14** | AdminProductFormPage | recusa só quando `intent === 'draft'` (publicar passa e grava) | **SOBREVIVEU** |
| M15 | AdminProductFormPage | recusa só quando `intent === 'publish'` | morto |
| M16 | AdminProductFormPage | falha do fornecedor segue e diz "salvo" | morto |
| **M17** | AdminProductFormPage | card lateral lê `form.supplier_name` (rascunho) | **SOBREVIVEU** |
| M18 | AdminProductFormPage | card lateral lê `form.supplier_url` | morto |
| M19 | SupplierSummaryCard | `rel="noopener"` | morto |
| M20 | useProductForm | cópia (`asCopy`) não traz o fornecedor | morto |
| **M21** | AdminProductFormPage | grava o fornecedor só se `isEdit` (produto novo/duplicado perde o fornecedor) | **SOBREVIVEU** |
| M22 | PricingTab | `afterPrice` não renderizado | morto |
| M23 | useAdminProducts | interseção categoria×fornecedor vira união | morto |
| M24 | useAdminProducts | sem `.in('supplier_id', …)` | morto |
| M25 | savedViews | sem normalização das visões antigas | morto |
| M26 | filterChips | `x` do chip tira o fornecedor errado | morto |
| M27 | SupplierCell | `target="_self"` | morto |
| M28 | SupplierCell | `—` → `-` | morto |
| M29 | productQuery | fornecedor não conta como filtro ativo | morto |
| M30 | AdminProductsPage | o Select não aplica o fornecedor | morto |
| M31 | suggest | limite 8 → 9 | morto |
| M32 | suggest | comparação sem dobra de acento | morto |
| **M33** | SupplierNameField | ↑ não move | **SOBREVIVEU** |
| M34 | SupplierNameField | Esc não fecha | morto |
| M35 | SupplierNameField | "Criar" só sem sugestões | morto |
| **M36** | SupplierNameField | Enter sem `preventDefault` | **SOBREVIVEU** (o teste diz "sem enviar o formulário", mas `fireEvent.keyDown` não dispara submissão implícita em jsdom — a asserção `diario == []` é verdadeira nos dois mundos) |
| M37 | core `rules.ts` | sem a recusa do esquema do link | morto |
| M38 | `apps/store/src/main.tsx` | embed `product_suppliers(url)` plantado | morto (guarda) |
| M39 | `supabase/functions/google-feed/handlers.ts` | embed plantado | morto (guarda) |
| **M40** | `packages/core/src/page/serve.ts` | embed plantado | **SOBREVIVEU** — fora do escopo do guarda |
| **M41** | AdminProductsPage | `fornecedor` fora de `columnIdFor` (ocultar a coluna não oculta) | **SOBREVIVEU** |
| **M42** | columns | `fornecedor` fora de `LIST_COLUMNS` (some do seletor de colunas) | **SOBREVIVEU** |

(M41 e M42 contam como um item de cobertura — FOR-17 "configurável". Total: 42 execuções, 7 sobreviventes.)

## Lacunas, por prioridade

1. **G1 — FOR-11 em produto NOVO (M21).** Nenhum teste cria produto com fornecedor. Matar: em
   `AdminProductFormPage.fornecedor.test.tsx`, montar `/admin/produtos/novo` (e `?from=p1`, que fecha
   também o save de FOR-15), preencher nome + link, salvar e asserir no diário
   `product_suppliers:upsert` com `product_id: 'novo'` depois de `products:insert`.
2. **G2 — FOR-09/10 "nos dois botões" (M14).** Só o rascunho é exercitado. Matar: o mesmo caso com
   "Salvar e publicar" (produto que passa o checklist de publicação), asserindo o toast da recusa e
   `h.diario` vazio.
3. **G3 — FOR-16 nome do card lateral (M17).** Só o link do rascunho é conferido. Matar: com
   fornecedor salvo, trocar o NOME no campo sem salvar e asserir que o card lateral continua com
   "Ateliê Prata" (e não mostra o nome digitado).
4. **G4 — FOR-17 "configurável como as outras" (M41, M42).** Matar: em `AdminProductsPage.test.tsx`,
   abrir o seletor de colunas, desmarcar "Fornecedor" e asserir que o `columnheader` some.
5. **G5 — FOR-07 ↑ (M33).** Matar: no teste de teclado, ↓ ↓ ↑ e asserir `aria-selected` na opção 1.
6. **G6 — alcance de `fornecedorForaDaLoja` (M40).** `packages/core/src/page/**` é o que a função
   `api/page` da loja executa, e o cabeçalho do guarda diz cobrir "a função `api/page`" — mas só
   `apps/store/server` é varrido. Fora da letra de FOR-03 ("apps/store"), dentro da intenção. Matar:
   acrescentar `packages/core/src/page` e `packages/core/src/sitemap` aos `ESCOPOS`.
7. **G7 — nome de teste que afirma mais do que prova (M36).** "Enter escolhe sem enviar o formulário"
   não discrimina; ou renomear, ou asserir `defaultPrevented` no evento do `keyDown`.

## Observações (não reprovam)

- A leitura de `product_suppliers` no filtro ignora `error` e não pagina: falha ou >1.000 vínculos
  viram lista vazia/truncada em silêncio. É o mesmo molde do filtro de categoria, que já existia.
- Falha do fornecedor num produto NOVO deixa a página em `/novo`; o próximo save cria outro produto.
  Mesmo molde da falha das relações (pré-existente), mas vale registro.
- A prova em navegador (`prova-navegador.md`) foi lida, não refeita.

---

## Rodada 2 (2026-10-22) — veredito: **PASS**

Os sete sobreviventes da rodada 1 foram reinjetados nos arquivos reais, mais sete mutantes sobre as
duas mudanças novas (a releitura antes de criar em `persistSupplier` e a recusa movida para antes do
checklist). Mesmo arnês (`mut.py`), SHA-256 conferido em cada restauração, sem `.mutbak` restante.

### Gates

| Gate | Medido |
| --- | --- |
| backoffice | **3706/211**, exit 0 |
| store | **5754/314**: a 1ª execução saiu com exit 1 por `[vitest-worker]: Timeout calling "onTaskUpdate"`, um erro não tratado de contenção, com 5754 verdes; a 2ª, sozinha, saiu com exit 0 |
| `tsc` do painel | 0 |

### Mutantes

| # | Mutação | Resultado |
| --- | --- | --- |
| R14 | recusa só no rascunho | morto: `describe` "as recusas valem também no Salvar e publicar" (×2) |
| R15 | recusa só no publicar | morto |
| R17 | card lateral lê `form.supplier_name` | morto: "editar o nome e o link sem salvar NÃO muda o card" |
| R21 | grava o fornecedor só se `isEdit` | morto: produto DUPLICADO e produto NOVO |
| R33 | ↑ não move | morto |
| R36 | Enter sem `preventDefault` | morto: `fireEvent.keyDown(...) === false` |
| R40 | embed plantado em `packages/core/src/page/serve.ts` | morto (guarda) |
| R40b | nome plantado em `apps/store/server/page.ts` | morto (guarda) |
| R41 | `fornecedor` fora de `columnIdFor` | morto: desmarcar em Colunas esconde |
| R42 | `fornecedor` fora de `LIST_COLUMNS` | morto |
| N1 | releitura antes de criar devolve `[]` | morto (4 casos) |
| N2 | erro da releitura engolido (`atual = []`) | morto: "a releitura que falha… não grava nada" |
| N3 | resultado da releitura ignorado | morto |
| N4 | corrida 23505 usa a lista da tela em vez de reler | morto |
| N5 | sem o bloco da releitura antes de criar | morto |
| N6 | o checklist de publicação volta a vencer a recusa do fornecedor (a ordem antiga) | **sobreviveu, e não é requisito**: na ordem antiga o produto não publicável também é recusado antes de qualquer gravação, só que com o aviso do checklist. A spec não diz qual aviso aparece primeiro |
| N7 | a recusa avisa mas não retorna (segue gravando) | morto (4 casos) |

**17 mutantes: 16 mortos por asserção, 0 por compilação, 1 sobrevivente fora da spec (N6).**

### Cobertura atualizada

FOR-09, FOR-10, FOR-11 (produto novo e duplicado), FOR-15 (o save da cópia), FOR-16 (nome e link),
FOR-17 (coluna configurável) e FOR-07 (↑) agora têm evidência que discrimina. FOR-03 alcança
`apps/store/api` e `packages/core/src`. Todo FOR-01..19 tem `arquivo:linha`.

### Lacunas restantes (não reprovam)

1. **N6, a precedência dos avisos**: se a dona quiser que a recusa do fornecedor vença o checklist
   (é o comportamento atual), falta um caso com um produto NÃO publicável + link inválido no
   "publicar", que assere o aviso do fornecedor. Hoje é escolha de implementação, não AC.
2. As observações da rodada 1 continuam valendo: a leitura de `product_suppliers` no filtro sem
   `error` e sem paginar, e a falha num produto novo deixando a página em `/novo`.

## Fecho do orquestrador — N6 é equivalente

A lacuna 1 da rodada 2 (fixar a ordem "recusa do fornecedor antes do checklist") foi tentada e se
mostrou **inalcançável pela tela**: o botão "Salvar e publicar" fica desabilitado sempre que há erro de
publicação (`canPublish` da página soma o checklist e `hasBlockingErrors`), então no clique as duas
recusas nunca concorrem. Dois produtos de teste foram tentados (preço zerado, limite de gravação 500) e
nos dois o botão nasce desabilitado. **N6 é mutante equivalente**; o caso foi descartado em vez de
escrito sobre um botão desabilitado. As duas observações da rodada 1 seguem como dívida declarada.
