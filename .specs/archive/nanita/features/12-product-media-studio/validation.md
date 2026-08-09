# Mídia do Produto e Estúdio de Mockup — Validation

**Date**: 2026-08-01
**Spec**: [`spec.md`](./spec.md)
**Diff range**: `f1f04f0..HEAD` (commit `28dc6ad` + o commit de fecho desta verificação)
**Verifier**: modo **standalone** — mesma limitação declarada nas features
[`07`](../07-product-catalog-admin/validation.md) e [`10`](../10-emails-transacionais/validation.md):
autor e verificador são o mesmo agente. A compensação é o **sensor de discriminação**, que é
empírico e não depende do julgamento de quem escreveu o código.

---

## Task Completion

| Task | Status | Notas |
| ---- | ------ | ----- |
| T33 | ✅ Done | 18 testes. Validação antes da compressão provada por `createObjectURL` **não** chamado |
| T34 | ✅ Done | 26 testes (7 `buildAltText` + 19 galeria) |
| T35 | ✅ Done | 15 testes. Os 9 de `renderPlan` seguem verdes — engine intocada |
| T36 | ✅ Done | 23 testes (13 `applyPlan` + 10 estúdio) |
| T37 | ✅ Done | 18 testes (14 backoffice + 4 loja) |

---

## Spec-Anchored Acceptance Criteria

### P2.4 — Mídia: alt-text, origem e upload que diz a verdade

| Critério | Saída definida na spec | `file:line` + asserção | Resultado |
| -------- | ---------------------- | ---------------------- | --------- |
| AC 1 — tile de 196 px, badge `Principal` na 1ª, remoção no hover, campo de alt-text | tile 196 px · badge só na primeira | `ImageGallery.test.tsx:97` — `expect(grade?.className).toContain('minmax(196px,1fr)')` · `:192` `getByText('Principal')` / `:193` `queryByText('Principal')` ausente na 2ª · `:202` remoção · `:131` campo de alt | ⚠️ **Parcial — ver nota 1** (recorte fora de escopo) |
| AC 2 — alt vazio ⇒ `faltando` + `Gerar`; preenchido pela ação ⇒ `gerado automaticamente`; template puro, sem serviço externo | strings exatas `faltando` / `gerado automaticamente`; **zero** chamada de rede | `ImageGallery.test.tsx:105`, `:127` · `buildAltText.test.ts:33` — `expect(fetchSpy).not.toHaveBeenCalled()` | ✅ PASS |
| AC 3 — imagem do estúdio exibe selo `Mockup` e `source === 'mockup'` | selo `Mockup`; `images[].source = 'mockup'` | `ImageGallery.test.tsx:183` — `within(tiles[1]).getByText('Mockup')` · `applyPlan.test.ts:53` — `result.filter(i => i.source === 'mockup')` | ✅ PASS |
| AC 4 — valida tipo (PNG/JPG/WebP) e 8 MB **antes** de comprimir, nomeando arquivo e motivo | rejeição com nome + motivo, sem entrar no canvas | `uploadProductImage.test.ts:138-141` — `expect(createObjectURL).not.toHaveBeenCalled()` · `:116-128` mensagens | ✅ PASS |
| AC 5 — WebP com dimensão máxima de 1600 px | 3000×2000 ⇒ 1600×1067 | `uploadProductImage.test.ts:177-178` — `expect(lastCanvas?.width).toBe(1600)` | ✅ PASS |
| AC 6 — copy exata `PNG, JPG ou WebP até 8 MB · convertidas para WebP 1600 px` | a frase inteira | `ImageGallery.test.tsx:84-85` — `toHaveTextContent('PNG, JPG ou WebP até 8 MB · convertidas para WebP 1600 px')` | ✅ PASS |
| AC 7 — nome, tamanho e progresso por arquivo | linha por arquivo com os três | `ImageGallery.test.tsx:268-271` — `getByText('um.png')`, `getByText('3.0 MB')`, `getAllByText('enviada')` | ✅ PASS |
| AC 8 — colar (⌘V) entra pelo mesmo caminho do arraste | mesma função de envio | `ImageGallery.test.tsx:252-253` — `uploadMock.mock.calls[0][0].map(f => f.name)` = `['print.png']` + `onChange` com a URL | ✅ PASS |
| AC 9 — reordenar: 1ª é a principal, ordem persiste no `jsonb` | nova ordem, `alt`/`source` preservados | `ImageGallery.test.tsx:221` — `onChange` com `[b(mockup), a(upload)]` | ✅ PASS — **nota 2** |
| AC 10 — loja usa o `alt` do `jsonb`, nome do produto como fallback | `alt` cadastrado vence | `apps/store/.../__tests__/ProductGallery.test.tsx` (VAR-11, feature `07`) | ✅ PASS (herdado, não regredido) |

### P3.1 — Estúdio de mockup ampliado

| Critério | Saída definida na spec | `file:line` + asserção | Resultado |
| -------- | ---------------------- | ---------------------- | --------- |
| AC 1 — ~1360 × 886 px, colunas 264 / 452 / 300 | largura do desenho, `max-w-3xl` extinto | `MockupStudioDialog.test.tsx:105-106` — `not.toContain('max-w-3xl')` + `toContain('w-[1360px]')` · `:115-116` 264/300 · `:126` — `expect(canvas.width).toBe(452)` | ✅ PASS |
| AC 2 — mockups com thumb 38 px, seleção múltipla, estado do relevo | `relevo não medido — sai chapado` | `MockupStudioDialog.test.tsx:139` thumb · `:144-145` seleção · `:151` string do aviso | ✅ PASS |
| AC 3 — zoom, antes/depois, camadas `Fundo · Arte · Relevo · Overlay`, filmstrip com estado | estados `pronto` / `compondo` / `com aviso` | `:239-244` zoom · `:230-231` antes/depois · `:180-183` camadas · `:258` `compondo` → `:265` `pronto` | ✅ PASS |
| AC 4 — `Aplicar a todos` replica o ajuste | mesmo `scale` em todos os selecionados | `MockupStudioDialog.test.tsx:363` — `expect(escalas).toEqual([1.05, 1.05])` | ✅ PASS |
| AC 5 — resolução (1200/1600/2000) e formato (WebP/PNG) | chegam ao arquivo gravado | `:336` — `uploadBlobMock` chamado com `{ maxDimension: 2000, format: 'image/png' }` | ✅ PASS |
| AC 6 — anexar × substituir, 1ª como principal, gerar alt-text | mesmo template de PMD-01 AC 2 | `:383` anexar · `:399` substituir · `:414` sem alt · `:431` principal · `applyPlan.test.ts:98` — `toBe(buildAltText('Botton Sailor Moon', 'Na mão'))` | ✅ PASS |
| AC 7 — rodapé `N renders em X px · leva ~Ys · nada é salvo antes de você aplicar` + `Aplicar N imagens ao produto` | frase inteira | `:297` — `getByText('2 renders em 1600 px · leva ~3 s · nada é salvo antes de você aplicar')` · `:307` ação primária | ✅ PASS |
| AC 8 — fechar sem aplicar não grava nada | nem Storage nem `images` | `:320-322` — `uploadBlobMock` **não** chamado, `onApply` **não** chamado | ✅ PASS |

### P3.2 — Imagem por variação e prévia da vitrine

| Critério | Saída definida na spec | `file:line` + asserção | Resultado |
| -------- | ---------------------- | ---------------------- | --------- |
| AC 1 — cada linha da grade aponta para imagem da galeria | `image_url` gravado na variação | `VariantImageCard.test.tsx:77` — `onChange` com `image_url: 'https://cdn/fosco.webp'` | ✅ PASS |
| AC 2 — variação sem imagem própria usa a principal | admin marca `usa a principal`; loja mostra a principal | `VariantImageCard.test.tsx:61` · `VariantImage.test.tsx:176` — `expect(destaque()).toContain('principal.webp')` | ✅ PASS |
| AC 3 — escolher variação com imagem própria troca o destaque | imagem da variação no palco | `VariantImage.test.tsx:155` — `expect(destaque()).toContain('fosco.webp')` | ✅ PASS |
| AC 4 — prévia com `a partir de R$ X` quando há variações | menor preço **ativo** | `VariantImageCard.test.tsx:141` — `getByText('a partir de R$ 5,90')` · `:154` pausada não entra | ✅ PASS |
| AC 5 — prévia reflete a edição sem salvar | novo nome aparece | `VariantImageCard.test.tsx:174-180` | ✅ PASS |

**Status**: ✅ 22 de 23 ACs com evidência direta · 1 parcial declarado (nota 1)

---

## Notas de divergência (declaradas, não silenciadas)

**Nota 1 — recorte de imagem não foi implementado.** A AC 1 de P2.4 lista "ações de **recorte** e
remoção no hover", mas a tabela *Out of Scope* da **mesma spec** exclui "Recorte/edição destrutiva de
imagem no navegador — Não pedido", e o "Done when" da T34 não menciona recorte. É uma contradição
interna da spec, resolvida pela exclusão explícita (que é a afirmação mais forte e deliberada).
Implementar um recortador seria uma feature inteira, não um botão. Registrado no cabeçalho de
[`ImageGallery.tsx`](../../../apps/backoffice/src/features/product-form/ui/ImageGallery.tsx).

**Nota 2 — "persiste no `jsonb`" (AC 9) é provado no limite do componente.** A galeria devolve
`ProductImage[]` na ordem nova; quem grava é o save da página (`images: form.images` em
`AdminProductFormPage`), caminho que já tem cobertura própria desde a `07`/T21. Não há teste de
integração ponta a ponta com o banco — o projeto não tem runner de SQL.

**Nota 3 — `uploadImageBlob` ganhou opções.** `{ maxDimension, format }` foi adicionado fora da
letra da T33 porque o seletor de saída da AC 5 do estúdio seria **decorativo** sem isso: qualquer
escolha viraria WebP de 1600 px no Storage. A assinatura `Blob → url` foi preservada (critério da
T33) e tem teste (`uploadProductImage.test.ts:193-198`).

**Nota 4 — `imagePayload.ts` ficou sem chamador.** A T36 tirou o último uso de `toImagePayload`
quando o estúdio passou a devolver a galeria já aplicada. O módulo e seus 7 testes foram
**mantidos** — removê-lo é escopo da limpeza da feature `13` (T42), não desta task.

**Nota 5 — qualidade visual do composto não é testável em node (A12).** Declarada na spec como UAT
manual e **não** compensada com asserção fraca sobre pixels. O que os testes provam é o plano de
render e a política de aplicação; o que o composto *parece* continua exigindo olho humano.

---

## Discrimination Sensor

| # | Mutação | Arquivo | Killed? |
| - | ------- | ------- | ------- |
| M1 | Teto de 8 MB vira exclusivo (`>` → `>=`) | `uploadProductImage.ts:validateImageFile` | ✅ Killed |
| M2 | Resolução volta a 1200 px | `uploadProductImage.ts:MAX_DIMENSION` | ✅ Killed |
| M3 | Alt-text de produto sem nome vira string vazia (`null` → `''`) | `buildAltText.ts` | ✅ Killed |
| M4 | `1ª como principal` é ignorado | `applyPlan.ts` | ✅ Killed |
| M5 | Render entra como `upload` em vez de `mockup` | `applyPlan.ts` | ✅ Killed |
| M6 | Vínculo órfão da variação não é limpo | `variantImages.ts` | ✅ Killed |
| M7 | Alt vazio deixa de mostrar `faltando` (`!x` → `!!x`) | `ImageGallery.tsx` | ✅ Killed |
| M8 | Galeria da loja ignora a variação escolhida | `ProductGallery.tsx` (store) | ✅ Killed |

**Profundidade**: lightweight ampliado — 8 mutações, ao menos uma por task, cobrindo as duas
fronteiras de risco (o arquivo que vai para o Storage e a imagem que a cliente vê).
**Resultado**: **8/8 killed** — ✅ PASS.
**Higiene**: cada mutação foi aplicada isoladamente e revertida por `git checkout --`;
`git status` limpo ao fim (conferido). Script em `scratchpad/sensor.py`, fora do repo.

---

## Edge Cases

- [x] Arquivo rejeitado por tamanho **não** entra no canvas — `uploadProductImage.test.ts:140`
- [x] 6 arquivos com 2 inválidos: sobem 4, os 2 nomeados um a um — `:229-236`
- [x] Variação apontando para imagem removida volta à principal — `VariantImageCard.test.tsx:112` (edição) e `VariantImage.test.tsx:196` (leitura na loja)
- [x] Template sem relevo medido renderiza **e** avisa, não recusa — `MockupStudioDialog.test.tsx:167-169`
- [x] Produto sem nome deixa `Gerar` desabilitado, nunca alt vazio — `ImageGallery.test.tsx:149`

---

## Code Quality

| Princípio | Status |
| --------- | ------ |
| Código mínimo | ✅ |
| Mudanças cirúrgicas | ✅ — o que saiu da `AdminProductFormPage` saiu porque foi substituído, não "melhorado" |
| Sem scope creep | ⚠️ uma extensão declarada (nota 3) e uma limpeza recusada por escopo (nota 4) |
| Segue os padrões existentes | ✅ — mesmo molde de dublê e de barrel das features 07/11 |
| Saída afirmada bate com a definida na spec | ✅ — as três frases fixadas pela spec são asseridas por inteiro |
| Cobertura por camada | ✅ — lógica pura 1:1 com AC; UI por comportamento observável, sem snapshot |
| Todo teste mapeia para um requisito | ✅ |
| Guidelines seguidas | `CLAUDE.md` (FSD, temas, convenções de commit) + `tasks.md` (Test Coverage Matrix) |

---

## Gate Check

- **Comando (build)**: `pnpm build && pnpm test && pnpm lint`
- **`pnpm test`**: **1769 passed, 0 failed, 0 skipped** — core 500 · store 499 · functions 232 · backoffice 538
- **Antes da feature 12**: 1670 (core 500 · store 495 · functions 232 · backoffice 443)
- **Delta**: **+99** (backoffice +95, store +4). Nenhum teste removido, nenhum enfraquecido
- **`pnpm build`**: exit 0
- **`pnpm lint`**: **36 err / 16 warn** — idêntico à baseline pós-feature-11. Um erro novo
  (`no-this-alias`, dublê de canvas no teste da T33) foi introduzido e **corrigido** antes do fecho
- **`tsc --noEmit`**: store **0** · backoffice **4** (todos `import.meta.env`, pré-existentes)

---

## Requirement Traceability Update

| Requisito | Status anterior | Novo status |
| --------- | --------------- | ----------- |
| PMD-01 | Pending | ✅ Verified (parcial em recorte — nota 1) |
| PMD-02 | Pending | ✅ Verified |
| PMD-03 | Pending | ✅ Verified |
| PMD-04 | Pending | ✅ Verified |
| PMD-05 | Pending | ✅ Verified |
| PMD-06 | Pending | ✅ Verified |
| PFM-17 | Pending | ✅ Verified |

---

## Summary

**Overall**: ✅ **PASS** — pronta.

**Spec-anchored**: 22/23 ACs com asserção que bate com a saída definida na spec; 1 parcial
declarado (recorte, contradição interna da spec resolvida pelo *Out of Scope*).
**Sensor**: 8/8 mutações mortas.
**Gate**: 1769 passed, build verde, lint na baseline.

**O que funciona**: upload que recusa antes de comprimir e diz por quê; galeria com alt-text,
origem e progresso; estúdio de 1360 px que não grava nada até você mandar; variação com foto
própria trocando o destaque na loja; prévia da vitrine refletindo a edição.

**Pendências que NÃO bloqueiam**: UAT manual da qualidade visual do composto (A12, sempre foi
manual) e a remoção de `imagePayload.ts`, que pertence à T42.

**Próximo passo**: `13-product-bulk-ops` — a Fase 1 (T38–T41) e, com a `12` fechada, a **T42**
deixa de estar barrada: `07`, `11` e `12` estão todas fechadas (A25).
