# 85 — O Resumo com as imagens do produto · Validation

**Date**: 2026-10-28
**Spec**: `.specs/features/85-resumo-com-imagens-do-produto/spec.md`
**Diff range**: working tree sobre `8d9aaf5a` (branch `feature/85-resumo-com-imagens-do-produto`, sem commit próprio): `git diff HEAD` (21 arquivos) + 13 não rastreados
**Verifier**: sub-agente independente (autor ≠ verificador). Nenhuma linha de código ou de teste foi escrita por ele; as mutações e as duas sondas foram feitas em arquivos reais com cópia guardada e SHA-256 conferido na restauração. `git diff HEAD | shasum` antes e depois: `b7a69a1a…76b7` (idêntico); `git status --short`: 34 linhas antes e depois.

**Veredito: FAIL ❌ (por cobertura e por um defeito latente de concorrência)** — nenhuma AC falha em comportamento observado, mas três fios de mutação sobrevivem (o progresso e o `uploading` do envio chegando ao modal e ao Resumo pela página) e uma sonda achou perda de foto com dois lotes terminando no mesmo tique.

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T01–T08 | ✅ | arquivos e testes presentes, quick gate verde |
| T09 | ⚠️ | fiação feita; o fio "progresso do Resumo visível no modal" (edge case) não tem teste pela página (M32/M33/M35) |
| T10 | ✅ | `StorefrontPreview` apagado (nenhuma referência em `apps/*/src`); guarda de movimento com 3 arquivos novos e âncoras 48/23 |
| T11 | ⚠️ | gates verdes (abaixo); a atualização do `CLAUDE.md` da raiz não é verificada aqui |
| T12 | ⚠️ | `prova-navegador.md` existe; os consertos do defeito 1 (MOD-07, 44px no modal) **não foram remedidos em navegador** — o próprio documento declara |

---

## Spec-Anchored Acceptance Criteria

Arquivos abreviados: `MS` = `features/product-form/model/mediaSummary.test.ts`, `UP` = `…/model/useProductImageUpload.test.ts`, `SUM` = `…/ui/ProductMediaSummary.test.tsx`, `LB` = `…/ui/ImageLightbox.test.tsx`, `DLG` = `…/ui/ProductMediaDialog.test.tsx`, `GAL` = `…/ui/ImageGallery.test.tsx`, `PG` = `pages/admin/AdminProductFormPage.midia.test.tsx`, `PGT` = `pages/admin/AdminProductFormPage.test.tsx`, `VAR` = `pages/admin/AdminProductFormPage.variacoes.test.tsx` (todos sob `apps/backoffice/src/`).

### P1 — Resumo

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| RES-01 | coluna (≥ lg): Publicação → Resumo → Pronto → Fornecedor | `PG:159` — `toContain("lg:[grid-template-areas:'main_pub'_'main_res'_'main_chk'_'main_sup'_'main_.']")`; `PG:167` — áreas `['lg:[grid-area:pub]','…res]','…chk]','…sup]']` (página real, com fornecedor) | ✅ (token exato; ordem visual medida só em navegador, 1024/1440) |
| RES-02 | card "Prévia na loja" não existe | `PG:177` — `queryByText('Prévia na loja')).toBeNull()`; `PGT:189` | ✅ |
| RES-03 | `images[0]`, 1:1, `object-cover`, alt ou "Imagem 1" | `SUM:43-50` — alt `'Joia 1'`, `srcset` = `renditionSrcSet(url)`, tokens `aspect-square`/`object-cover`; `SUM:55` — alt null/""/"   " ⇒ `'Imagem 1'` | ✅ |
| RES-04 | 2..8 ⇒ n−1 miniaturas 72×72, máx. 7, embrulham | `MS:25-39` (0/1/2/8/9/28 ⇒ 0/0/1/7/7/7) + `MS:19` `toBe(7)` literal; `SUM:68` (2,5,8); `SUM:79-80` tokens `h-[72px]`/`w-[72px]`; `SUM:117` `flex-wrap` | ✅ (72px medido em navegador, `prova-navegador.md`) |
| RES-09 | > 8 ⇒ "+N" (N = total − 8) depois da 7ª, nome "Ver mais N imagens", abre a 9ª; ≤ 8 sem ladrilho | `SUM:89-104` — 9⇒+1, 28⇒+20, `onOpenImage(8)`, posição após "Ampliar imagem 8"; `SUM:68` e `SUM:60` ausência com 1/2/5/8 | ✅ ⚠️ o rótulo com N = 1 é "Ver mais 1 imagem" (singular), não o molde literal da spec — mudança consciente (defeito 3 da prova), não registrada como `SPEC_DEVIATION` na spec |
| RES-05 | sem imagem: "Nenhuma imagem ainda" + controle de adicionar | `SUM:128-132`; `PG:293` (página real) | ✅ |
| RES-06 | < lg antes das abas; uma vez no DOM | `PG:183` `toHaveLength(1)`; `PG:186` `compareDocumentPosition(tablist) & FOLLOWING` | ✅ (posição real em 390 só no navegador) |
| RES-07 | "Abrir ↗" no cabeçalho do Resumo, nova aba | `PG:201-205` — `href` = `storeUrlFor(slug)` e `'https://loja.test/produtos/pingente-estrela'`, `target=_blank`, dentro do card | ✅ |
| RES-08 | mesmos valores de `summaryFacts` | `PG:211-216` — presença de preço, estoque, Imagens, Peso | ⚠️ spec-precision: a página assere **presença**, não valor; os valores ficam provados pelos testes antigos de `summaryFacts`/página (bloco movido sem mudança) |

### P1 — Zoom

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| ZOM-01 | clique/Enter/Espaço abre na imagem; nome "Ampliar imagem n de N" | `PG:233-236` — "Ampliar imagem 3 de 5" ⇒ "3 / 5" (página real); `SUM:85` `onOpenImage(2)` | ✅ (Enter/Espaço = `<button>` nativo) |
| ZOM-02 | `object-contain`, `n / N`, alt ou nada | `LB:65`, `LB:72`, `LB:79`, `LB:84` | ✅ |
| ZOM-03 | →/←, setas, laço nos dois sentidos; 1 imagem sem setas | `LB:96`, `LB:104`, `LB:112`, `LB:123` | ✅ |
| ZOM-04 | > 48px troca no sentido do gesto | `MS:20` `SWIPE_PX).toBe(48)` literal; `LB:137` (49 troca), `LB:145` (47 e 48 não) | ✅ |
| ZOM-05 | Esc/Fechar/fundo fecham e devolvem o foco | `LB:167`, `LB:175`, `LB:183` — `document.activeElement).toBe(origem)` | ✅ (botão de origem sintético no teste do componente; percurso pela página só no navegador) |
| ZOM-06 | setas e Fechar ≥ 44px | `LB:202` — tokens `h-11`,`w-11` | ✅ |

### P2 — Adicionar

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| ADI-01 | seletor múltiplo, `image/*` | `SUM:140-143` — `multiple`, `accept='image/png,image/jpeg,image/webp'` | ⚠️ desvio de spec: a spec diz `image/*`; a implementação usa o `accept` da galeria (decisão do design, coerente com o motor), sem `SPEC_DEVIATION` registrado |
| ADI-02 | soltar envia; "Solte para enviar" durante o arraste | `SUM:177-224` — véu, `pointer-events-none`, não pisca, drop ⇒ `upload([a])`, sobre os fatos também, texto ignorado | ✅ (arrasto nativo do SO não provado — declarado na prova) |
| ADI-03 | progresso por arquivo no card; salvar desabilitado | `SUM:231-247` (componente, 3 linhas); `PG:314` / `PG:351-358` `salvarRascunho()).toBeDisabled()`; `UP:114`, `UP:139`, `UP:158` | ⚠️ o salvar está provado pela página; a **linha de progresso no card** só pelo componente — o fio página → `progress` do Resumo sobrevive à mutação (M35) |
| ADI-04 | novas no fim, `alt:null`, `source:'upload'` | `PG:319-320` — "Ampliar imagem 6 de 6" com `nova.webp` (fim) | ✅ ⚠️ `alt:null`/`source:'upload'` não assertados pela página (o par da galeria em `GAL:245` cobre o formato antigo) |
| ADI-05 | toast `uploadFailureMessage`, lote segue | `UP:70-90` — 2 toasts destrutivos com o texto, `onUploaded(['…ok.webp'])` | ✅ |
| ADI-06 | o mesmo motor `uploadProductImages` | `UP:63-64` — motor chamado com os arquivos; `DLG:84`, `GAL:333-364` (galeria chama o `upload` recebido) | ✅ |

### P2 — Modal

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| MOD-01 | sem aba Mídia | `PGT:99` (5 abas por extenso), `PGT:133`, `PG:191` | ✅ |
| MOD-02 | modal "Mídia" com a galeria inteira e o vídeo | `DLG:51`; inventário em `GAL:95-364` | ✅ |
| MOD-03 | reflete ao vivo, marca alterado; `clearMissingVariantImages` | `PG:247-254` (principal vira a foto 2, "Alterações não salvas"); `VAR:496-520` (OPV-27 pelo modal) | ✅ |
| MOD-04 | fechar não descarta; sem "Cancelar" | `DLG:105-121` (Concluir/Esc/X sem setter), `DLG:101`; `PG:257-268` | ✅ |
| MOD-05 | "Vídeo · sim/não" | `summaryFacts.test.ts:90-97` (""/"   "/URL); `PG:216`, `PG:226` | ✅ |
| MOD-06 | pendência de imagens abre o modal | `checklist.test.ts:145` (`tab: null`); `PG:290-298` (página real, produto sem foto) | ✅ |
| MOD-07 | 390: tela cheia, sem rolagem horizontal, alvos ≥ 44 | `DLG:125-160` tokens `h-[100dvh]`,`w-screen`,`max-w-none`, X/Concluir/vídeo `h-11`; `GAL:412`, `GAL:420` | ⚠️ tokens provados; **a medida em navegador dos controles da galeria foi feita ANTES do conserto** (18×18, 73×24, 328×32) e não foi refeita |

**Status**: 28/28 com evidência `file:line`; 6 marcadas ⚠️ (RES-08, RES-09 rótulo, ADI-01, ADI-03 fiação, ADI-04 campos, MOD-07 remedição).

---

## Edge Cases

- [x] Imagem que não carrega ⇒ fundo com o número (`SUM:278-295`).
- [ ] **Envio em curso e modal aberto ⇒ progresso visível**: comportamento correto (sonda do verificador: com o envio do Resumo no ar, o modal mostra `a.png`), mas **sem teste**: trocar `progress={imageUpload.progress}` do modal por `[]` (M32), `uploading` do modal por `false` (M33) ou o `progress` do Resumo por `[]` (M35) deixa as 901 verdes.
- [x] Principal removida no modal ⇒ a seguinte vira principal (`PG:247-253`).
- [~] Imagem aberta removida por outra via ⇒ fecha: só o caso **fora do intervalo** (`index >= length`) está implementado e testado (`LB:210`, `LB:217`). Remover uma imagem do meio deixaria o visualizador mostrando a vizinha. Hoje é inalcançável (o visualizador é modal e nenhuma outra via remove), por isso é observação, não lacuna de produto.

---

## Discrimination Sensor

Profundidade: expandida (41 mutações). Cada uma num arquivo real, uma por vez, com o conjunto `src/features/product-form` + `src/pages/admin/AdminProductFormPage*` (48 arquivos, 901 testes), `--testTimeout=20000`. O arnês recusa alvo ausente ou repetido e confere o SHA-256 depois de restaurar.

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| M01 | `model/mediaSummary.ts` | `SUMMARY_THUMB_LIMIT` 7 → 8 | ✅ morto (asserção) |
| M02 | `model/mediaSummary.ts` | `rest = n − 7` | ✅ morto (asserção) |
| M03 | `ui/ProductMediaSummary.tsx` | "+N" abre o índice 7 | ✅ morto (asserção) |
| M04 | `ui/ImageLightbox.tsx` | "Próxima" sem laço | ✅ morto (asserção) |
| M05 | `ui/ImageLightbox.tsx` | "Anterior" sem laço | ✅ morto (asserção) |
| M06 | `ui/ImageLightbox.tsx` | gesto `<= 48` → `< 48` | ✅ morto (asserção) |
| M07 | `ui/ImageLightbox.tsx` | limiar 48 → 30 | ✅ morto (asserção) |
| M08 | `ui/ImageLightbox.tsx` | sem devolver o foco | ✅ morto (asserção) |
| M09 | `ui/ProductMediaDialog.tsx` | sem devolver o foco | ✅ morto (asserção, página real) |
| M10 | página | `uploading = imageUpload.uploading` (perde a variação) | ✅ morto (asserção) |
| M11 | página | `uploading = variantUploading` (perde o Resumo) | ✅ morto (asserção) |
| M12 | página | imagens novas no **começo** | ✅ morto (asserção) |
| M13 | página | modal sem `clearMissingVariantImages` | ✅ morto (asserção, `VAR` OPV-27) |
| M14 | página | `focusField` não abre o modal para `images` | ✅ morto (asserção) |
| M15 | página | áreas `res`/`pub` trocadas | ✅ morto (asserção) |
| M16 | página | Resumo na área `chk` | ✅ morto (asserção) |
| M17 | `model/summaryFacts.ts` | `videoFact` sem `trim` | ✅ morto (asserção) |
| M18 | `model/useFileDrop.ts` | filtro `Files` → qualquer tipo | ✅ morto (asserção) |
| M19 | `model/useProductImageUpload.ts` | contador de lotes → destrava no primeiro | ✅ morto (asserção) |
| M20 | `ui/ImageLightbox.tsx` | não fecha com índice fora | ✅ morto (asserção) |
| M21 | `ui/ProductMediaSummary.tsx` | `rest >= 0` ("+0" com ≤ 8) | ✅ morto (asserção) |
| M22 | `ui/ImageLightbox.tsx` | setas com 1 imagem | ✅ morto (asserção) |
| M23 | `ui/ImageLightbox.tsx` | alt vazio desenhado | ✅ morto (asserção) |
| M24 | `model/useFileDrop.ts` | drop não envia | ✅ morto (asserção) |
| M25 | `model/useProductImageUpload.ts` | sem toast de falha | ✅ morto (asserção) |
| M26 | `model/useProductImageUpload.ts` | progresso sem substituir a linha do mesmo arquivo | ✅ morto (asserção) |
| M27 | `ui/ProductMediaSummary.tsx` | principal sem `srcset` | ✅ morto (asserção) |
| M28 | `ui/ProductMediaSummary.tsx` | "sem descrição" sem `trim` | ✅ morto (asserção) |
| M29 | `ui/ProductMediaSummary.tsx` | miniatura sem `onError` | ✅ morto (asserção) |
| M30 | `ui/ProductMediaDialog.tsx` | `w-screen` → `w-full` | ✅ morto (asserção) |
| M31 | página | Resumo abre o zoom no índice + 1 | ✅ morto (asserção) |
| **M32** | página | modal recebe `progress={[]}` | ❌ **sobreviveu** (901/901) |
| **M33** | página | modal recebe `uploading={false}` | ❌ **sobreviveu** (901/901) |
| M34 | `ui/ProductMediaSummary.tsx` | alt da principal sem "Imagem 1" | ✅ morto (asserção) |
| **M35** | página | Resumo recebe `progress={[]}` | ❌ **sobreviveu** (901/901) |
| M36 | `ui/ImageGallery.tsx` | galeria não chama `upload` | ✅ morto (asserção) |
| M37 | `ui/ImageGallery.tsx` | remover 44 → 24px | ✅ morto (asserção) |
| M38 | página | "Abrir na loja" sem `target=_blank` | ✅ morto (asserção) |
| M39 | página | vídeo do modal não grava | ✅ morto (asserção) |
| M40 | `ui/ProductMediaSummary.tsx` | input sem `multiple` | ✅ morto (asserção) |
| M41 | `ui/ProductMediaSummary.tsx` | véu nunca aparece | ✅ morto (asserção) |

**Result**: 41 injetadas, **38 mortas (todas por asserção, nenhuma por compilação)**, **3 sobreviventes** (M32, M33, M35 — o mesmo fio: o estado do envio chegando às duas superfícies pela página) — **FAIL**.

### Sondas do verificador (arquivo temporário apagado em seguida; `git status` conferido)

1. **Dois lotes terminando no MESMO tique perdem uma foto.** Página real, 5 fotos, um envio pelo Resumo e outro com o modal aberto; os dois `uploadProductImages` resolvidos dentro do mesmo `act`: o Resumo termina com **"Ampliar imagem 1 de 6"** (esperado 7). Com os dois resolvidos em `act` separados, 7. Causa: `onUploaded` faz `setFields({ images: [...form.images, ...urls] })` com o `form` do último render (`AdminProductFormPage.tsx`, o `useProductImageUpload({ onUploaded })`); o ref de callbacks do hook só é atualizado no render, e o segundo lote resolve antes dele. A foto vai ao Storage e some do formulário, sem aviso. O design afirma que dois lotes concorrentes "somam" — vale para o progresso e o `uploading`, não para a lista de imagens.
2. **Progresso do Resumo visível no modal**: correto hoje (`a.png` aparece no Resumo e no modal). O comportamento existe; o que falta é o teste (M32/M35).

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ |
| Surgical changes | ✅ (`ImageGallery` perdeu o estado de envio; `VariantImagePicker`/quick-grid só comentários; `StorefrontPreview` apagado sem consumidor) |
| No scope creep | ✅ (o redesenho dos alvos do `ImageGallery` é exigido por MOD-07) |
| Matches patterns | ✅ (Radix `Dialog`, `renditionUrl`, `FormCard`, guarda de movimento ampliado com âncoras medidas) |
| Spec-anchored outcome check | ⚠️ ADI-01 (`accept`) e RES-09 (singular) diferem da letra da spec sem `SPEC_DEVIATION` |
| Per-layer coverage | ❌ a fiação do progresso pela página não tem teste (T09 "estado único de envio") |
| Every test maps to a requirement | ✅ |
| Guidelines followed | `CLAUDE.md` (raiz), `apps/backoffice/CLAUDE.md`: página real para fiação ✅, token exato para medida ✅, prova em navegador ✅ (com a remedição de MOD-07 pendente) |

Nenhuma asserção antiga foi afrouxada: as deleções em `ImageGallery.test.tsx` são de montagem e comentário; `AdminProductFormPage.test.tsx` reescreveu os dois casos de abas/ordem com vizinhas novas (5 abas por extenso, "Editar mídia" presente, Prévia ausente).

---

## Gate Check

| Gate | Resultado |
| --- | --- |
| backoffice (`pnpm --filter @estrelinha/backoffice test --testTimeout=20000`) | **4261 / 240**, exit 0 (entrada: 4162/235 ⇒ **+99/+5**: 6 arquivos novos − `StorefrontPreview.test.tsx`) |
| store (`pnpm --filter @estrelinha/store test --testTimeout=20000`) | **6176 / 330**, exit 0 (idêntico à entrada) |
| `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` | **0** erros, exit 0 |
| `cd apps/backoffice && npx eslint .` | **23 erros / 5 warnings** (= baseline) |
| `pnpm --filter @estrelinha/backoffice build` | exit 0 |
| Testes pulados | nenhum |

---

## Fix Plans

### Fix 1 — perda de foto com dois lotes terminando juntos (Major, defeito latente)
- **Root cause**: `onUploaded` anexa sobre `form.images` capturado no último render; dois lotes resolvendo antes do próximo render escrevem sobre a mesma lista.
- **Fix task**: anexar por atualização funcional (o setter do formulário receber `prev => …`, ou o hook acumular as URLs e a página ler a lista vigente por ref atualizado no `setFields`), e um teste pela página real com os dois `uploadProductImages` resolvidos no mesmo `act`, esperando "Ampliar imagem 1 de 7" (vermelho antes do conserto).

### Fix 2 — o "estado único de envio" sem prova pela página (Major, cobertura)
- **Fix task**: em `AdminProductFormPage.midia.test.tsx`, com o motor dublado emitindo um evento de progresso e a promessa pendurada: enviar pelo Resumo ⇒ a linha `x.png · enviando` aparece no Resumo (mata M35); abrir o modal ⇒ a mesma linha aparece dentro do `dialog` e o estado de envio da galeria está ligado (mata M32 e M33).

### Fix 3 — desvios da letra da spec sem registro (Minor)
- Registrar como `SPEC_DEVIATION` (ou emendar a spec): ADI-01 `accept` = png/jpeg/webp em vez de `image/*`; RES-09 "Ver mais 1 imagem" no singular.

### Fix 4 — remedir MOD-07 em navegador (Minor)
- Repetir a medida de 390 do modal Mídia depois do conserto (remover, Gerar, alt ≥ 44px).

---

## Requirement Traceability Update

| Requirement | New Status |
| --- | --- |
| RES-01..07, RES-09 | ✅ Verified (RES-09 com o singular a registrar) |
| RES-08 | ✅ Verified (presença; valores pelos testes de `summaryFacts`) |
| ZOM-01..06 | ✅ Verified |
| ADI-01 | ⚠️ Verified com desvio de `accept` não registrado |
| ADI-02, ADI-05, ADI-06 | ✅ Verified |
| ADI-03 | ❌ Needs Fix (fiação do progresso — Fix 2) |
| ADI-04 | ❌ Needs Fix (lotes concorrentes — Fix 1) |
| MOD-01..06 | ✅ Verified |
| MOD-07 | ⚠️ Verified por token; remedição em navegador pendente |

---

## Lições (descritas aqui; `lessons.py` não foi executado, a pedido)

1. **Quando duas superfícies passam a compartilhar um estado (o "dono único"), o que precisa de teste é o FIO de cada consumidor, não o componente.** Os testes do componente desenhavam o `progress` recebido, e a página podia passar `[]` a qualquer um dos dois sem nada reprovar (M32, M35). O edge case que justificou o dono único ("o progresso continua visível no modal") era exatamente o que ficou sem prova.
2. **Um callback guardado em ref "para pegar o vigente" não protege de dois eventos assíncronos no mesmo tique**: o ref só anda no render. Acumular sobre o estado de fora exige atualização funcional; o teste é resolver as duas promessas dentro do mesmo `act`.

---

## Summary

**Overall**: ❌ Not Ready (gaps de cobertura + um defeito latente)

**Spec-anchored check**: 28/28 com evidência; 6 ⚠️ (2 desvios de letra sem registro, 1 spec-precision, 1 fiação sem prova, 1 campo não assertado, 1 remedição pendente)
**Sensor**: 41 injetadas, 38 mortas por asserção, 3 sobreviventes
**Gate**: backoffice 4261/240 e store 6176/330 verdes; tsc 0; lint 23/5; build verde

**O que funciona**: recorte 1 + 7 + "+N", zoom completo (laço, gesto de 48, foco), soltar arquivo com filtro `Files`, contador de lotes do `uploading`, salvar travado por galeria ‖ variação, modal sem "Cancelar", checklist abrindo o modal, ordem do DOM e das áreas, `clearMissingVariantImages` pelo caminho do modal.

**Next steps**: Fix 1 e Fix 2 (com os mutantes M32/M33/M35 e a sonda 1 reinjetados como prova), depois Fix 3 e Fix 4, e re-verificação.

---

## Conserto r1

**Date**: 2026-10-28 · **Autor**: worker de implementação (não é o verificador). Fecha os gaps 1 e 2 (Fix 1 e Fix 2). Fix 3 (registrar os desvios de ADI-01/RES-09) e Fix 4 (remedir MOD-07 em navegador) **não** foram tocados aqui.

### O que mudou

| Arquivo | Mudança |
| --- | --- |
| `features/product-form/model/useProductForm.ts` | `setFields` passou a aceitar também uma função do estado vigente (`current => patch`). Aditivo: a forma de objeto segue igual para todos os chamadores. |
| `pages/admin/AdminProductFormPage.tsx` | o `onUploaded` do `useProductImageUpload` anexa por atualização funcional (`setFields(current => ({ images: [...current.images, …] }))`), não sobre o `form` do último render (ADI-04). |

### Testes novos (+3)

| Arquivo | Caso | Prova |
| --- | --- | --- |
| `AdminProductFormPage.midia.test.tsx` | ADI-04 — dois lotes terminando juntos | página real, 5 fotos; um envio pelo Resumo e outro pelo `input` do modal aberto; as duas promessas do motor resolvidas no MESMO `act` ⇒ "Ampliar imagem 1 de 7", com `resumo.webp` na 6ª e `modal.webp` na 7ª. **Vermelho antes do conserto**: "Ampliar imagem 1 de 6" (a sonda 1 do verificador, reproduzida). |
| idem | ADI-03 — o estado único de envio chega às duas superfícies | motor dublado emitindo `{ file: 'x.png', status: 'uploading' }` e segurando a promessa: a lista "Progresso do envio" do Resumo tem `x.png · enviando`; abrir o modal ⇒ a lista do modal tem a mesma linha, e a galeria mostra "Enviando..." (sem o convite "clique para selecionar"). Verde de saída — o comportamento existia; faltava a prova. |
| `useProductForm.test.ts` | `setFields` com função acumula | duas chamadas funcionais no mesmo `act` somam as duas imagens, preservam o resto e marcam alterado. |

### Mutantes reinjetados no arquivo real (`AdminProductFormPage.tsx`), um por vez, SHA-256 conferido na restauração (`d0ee1419…4759`)

| # | Mutação | Resultado |
| --- | --- | --- |
| M35 | Resumo recebe `progress={[]}` | ✅ morto por asserção (caso ADI-03 novo) |
| M32 | modal recebe `progress={[]}` | ✅ morto por asserção (caso ADI-03 novo) |
| M33 | modal recebe `uploading={false}` | ✅ morto por asserção (caso ADI-03 novo) |
| MS1 | `onUploaded` de volta a anexar sobre `form.images` | ✅ morto por asserção (caso ADI-04 novo) |

Nenhum morreu por compilação; em cada um reprovou só o caso que o nomeia (16 de 17 seguiram verdes).

### Gates

| Gate | Resultado |
| --- | --- |
| backoffice (`pnpm --filter @estrelinha/backoffice test --testTimeout=20000`) | **4264 / 240**, exit 0 (+3 sobre a r1: 4261/240) |
| store (`pnpm --filter @estrelinha/store test --testTimeout=20000`) | **6176 / 330**, exit 0 (idêntico) |
| `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` | **0** |
| `cd apps/backoffice && npx eslint .` | **23 / 5** (= baseline) |

### Requirement Traceability (após o conserto)

| Requirement | Status |
| --- | --- |
| ADI-03 | ✅ fiação provada pela página (M32/M33/M35 mortos) — a re-verificação independente confirma |
| ADI-04 | ✅ lotes concorrentes somam (sonda 1 vira teste) — a re-verificação independente confirma |
| Edge "envio em curso e modal aberto" | ✅ com teste |

---

## Rodada 2 — re-verificação independente

**Date**: 2026-10-28 · **Verifier**: sub-agente independente (não escreveu o código, o conserto r1 nem a rodada 1). Nenhuma linha de produto ou de teste foi alterada. Mutações nos arquivos reais, uma por vez, cópia em memória e SHA-256 conferido na restauração (`useProductForm.ts` `3229a7bb…f890`, `AdminProductFormPage.tsx` `d0ee1419…4759`); sem `git stash`/`checkout`. Uma sonda própria num arquivo de teste temporário (`AdminProductFormPage.sondaR2V.test.tsx`), apagado ao fim.

`git diff HEAD -- apps packages supabase | shasum`: `d4e223b8…cc6e` no início e no fim (idêntico). ⚠️ O `git diff HEAD` **inteiro** mudou durante a rodada (`d4e223b8` → `c91360e5`) porque **outra sessão** escreveu em `docs/qa/**` neste worktree (cenários, charters e o `BUG-20261028-…`); nada disso é deste verificador nem toca código.

**Veredito: PASS ✅ (com dois gaps menores de cobertura, não bloqueantes)** — os gaps 1 e 2 da r1 estão fechados e provados por mutação; o conserto não abriu defeito de produto. Ficou um mutante sobrevivente no `setFields` novo (R06) e o par `alt`/`source` de ADI-04 segue sem asserção na suíte (R12/R13).

### (a) Gaps 1 e 2 da r1

- **Gap 1 (foto perdida)**: reproduzido por sonda própria, mais dura que o caso do autor — **três** lotes (dois pelo Resumo, um pelo `input` do modal aberto, o de 2 arquivos incluso) resolvidos no MESMO `act`, em ordem diferente da de início. Resultado: "Ampliar imagem 1 de 9", as quatro novas no fim (na ordem de término), badge "Alterações não salvas", **rascunho** do `sessionStorage` com as 9 imagens (o autosave vê a mudança funcional) e **payload** do "Salvar rascunho" com as quatro novas como `{ url, alt: null, source: 'upload' }`. Com o `onUploaded` lendo `form.images` (R08) a sonda e o caso novo do autor reprovam. ✅ fechado.
- **Gap 2 (fiação do progresso)**: M35/M32/M33 reinjetados (R09/R10/R11) morrem por asserção no caso ADI-03 novo da página. ✅ fechado.

### Discrimination Sensor (r2)

Conjunto: `src/features/product-form` + `src/pages/admin/AdminProductFormPage*` (49 arquivos, 905 testes com a sonda), `--testTimeout=20000`. O arnês recusa alvo ausente ou repetido. "Asserção" = suítes carregam e um caso reprova; "compilação" = falha de transformação/carga.

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| R01 | `useProductForm.ts` | forma funcional lê o `form` do render (`patch(form)`, deps `[]` ⇒ estado velho) | ✅ morto (asserção: hook + 2 casos da página) |
| R02 | `useProductForm.ts` | forma funcional recebe `emptyProductForm()` | ✅ morto (asserção) |
| R03 | `useProductForm.ts` | forma funcional não marca alterado | ✅ morto (asserção: só `useProductForm.test.ts`; nenhum caso da página olha o badge depois do envio) |
| R04 | `useProductForm.ts` | forma de objeto ignorada (`: {}`) | ✅ morto (asserção, 56 casos) |
| R05 | `useProductForm.ts` | forma de objeto mescla sobre `emptyProductForm()` | ✅ morto (asserção, 18 casos) |
| **R06** | `useProductForm.ts` | forma **funcional** mescla sobre `emptyProductForm()` em vez do estado vigente | ❌ **sobreviveu** (905/905, inclusive a sonda) |
| R07 | `useProductForm.ts` | forma funcional vira no-op | ✅ morto (asserção) |
| R16 | `useProductForm.ts` | forma funcional devolve só o parcial (`patch(current) as ProductFormState`, passa no `tsc`) | ✅ morto (asserção) |
| R08 | página | `onUploaded` volta a anexar sobre `form.images` (MS1 da r1) | ✅ morto (asserção: caso ADI-04 do autor + sonda) |
| R09 | página | Resumo `progress={[]}` (M35) | ✅ morto (asserção) |
| R10 | página | modal `progress={[]}` (M32) | ✅ morto (asserção) |
| R11 | página | modal `uploading={false}` (M33) | ✅ morto (asserção) |
| **R12** | página | imagem nova com `alt: ''` | ⚠️ morto **só pela sonda temporária** — sobrevive à suíte do repositório |
| **R13** | página | imagem nova com `source: 'import'` | ⚠️ morto **só pela sonda temporária** — sobrevive à suíte do repositório |
| R14 | página | `onUploaded` substitui a lista em vez de anexar | ✅ morto (asserção) |
| R15 | página | imagens novas no começo | ✅ morto (asserção) |

**Result**: 16 injetadas; nenhuma morte por compilação. Contra a suíte do repositório (sem a sonda): **13 mortas por asserção, 3 sobreviventes** (R06, R12, R13).

**R06 é real, e foi medido**: com ele, um envio que termina zera o resto do formulário — a sonda mostrou o payload do "Salvar rascunho" com `name: ""` e `base_price: 0`, e o salvar passou. A asserção do autor que deveria prendê-lo (`useProductForm.test.ts`, "setFields com função acumula…") confere `weight_kg === 0.1` num `renderHook` **sem produto**, onde 0,1 é exatamente o default de `emptyProductForm()` — verdadeira nos dois mundos (asserção subsumida pelo default). Nenhum caso da página confere que o nome ou o preço sobrevivem a um envio.

### (b) Outros consumidores de `setFields`

Nome+slug (`AdminProductFormPage.tsx:771`), `MaterialCard` (`:878`), opções/variações (`:301`, `:327`), SEO sugerido (`:173`) e o `onImagesChange` do modal (`:1083`) usam a forma de objeto, que segue igual (R04/R05 mortos por dezenas de casos). Observação, não lacuna: o `onImagesChange` do modal ainda monta `images`/`variants` sobre as props do render; um envio terminando no mesmo tique que uma remoção poderia ser desfeito, mas a remoção é evento discreto (o React renderiza antes do próximo), então não há caminho alcançável hoje.

### (c) Itens da r1

- **Item 3 (desvios de letra)**: confirmados na `spec.md` — ADI-01 com `SPEC_DEVIATION (emenda, 2026-10-28)` (`spec.md:97-98`, `accept` png/jpeg/webp) e RES-09 com o singular "Ver mais 1 imagem" (`spec.md:66`). ✅
- **Item 5 (ADI-04 `alt: null`/`source: 'upload'` pela página)**: **continua aberto** — R12/R13 sobrevivem à suíte; a sonda prova que o comportamento está certo hoje (rascunho e payload), falta o teste.
- **Fix 4 da r1 (remedir MOD-07 em navegador)**: `prova-navegador.md` ainda diz "Medida em navegador não refeita". Pendente (não medido por este verificador). E o achado 5 da prova (a principal fora da dobra em 1024/1440) segue como observação de Goal, não de AC.

### Gate (r2)

| Gate | Resultado |
| --- | --- |
| backoffice (`pnpm --filter @estrelinha/backoffice test --testTimeout=20000`) | **4264 / 240**, exit 0 |
| store (`pnpm --filter @estrelinha/store test --testTimeout=20000`) | **6176 / 330**, exit 0 |
| `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` | **0**, exit 0 |
| `cd apps/backoffice && npx eslint .` | **23 / 5** (= baseline) |

### Gaps (r2), ranqueados

1. **Minor (cobertura) — R06**: provar que a forma funcional preserva o resto do estado VIGENTE. No hook, carregar um produto (ou `setFields({ name: 'X', weight_kg: 0.3 })` antes) e conferir que a chamada funcional mantém `name`/`weight_kg` diferentes dos defaults; ou, na página, conferir nome e preço depois de um envio terminar.
2. **Minor (cobertura) — R12/R13 (item 5 da r1)**: na página, depois de um envio, salvar e conferir no diário o `images` com `{ url, alt: null, source: 'upload' }` para as novas.
3. **Minor (prova) — MOD-07 em navegador**: remedir em 390 os alvos do modal depois do conserto (Fix 4 da r1).

### Requirement Traceability (r2)

| Requirement | Status |
| --- | --- |
| ADI-03 | ✅ Verified (M32/M33/M35 mortos pela página) |
| ADI-04 | ✅ Verified em comportamento (lotes concorrentes somam; ordem; rascunho e payload pela sonda) · ⚠️ `alt`/`source` sem teste no repositório |
| ADI-01, RES-09 | ✅ Verified (desvios emendados na spec) |
| MOD-07 | ⚠️ token provado; remedição em navegador pendente |

## Conserto r2

**Date**: 2026-10-28 · **Autor**: worker de conserto (não é o Verifier da r2). Só arquivos de teste mudaram; `useProductForm.ts` (`3229a7bb…`) e `AdminProductFormPage.tsx` (`d0ee1419…`) com o mesmo SHA-256 do início ao fim.

### O que entrou

- `features/product-form/model/useProductForm.test.ts` (+2): a forma funcional de `setFields` preserva o estado VIGENTE quando ele difere do default — (a) `name`/`weight_kg`/`price` postos antes (`'Pingente Estrela'`, 0,3, 89,9; o caso confere que nenhum é o valor de `emptyProductForm()`), (b) um produto CARREGADO (`name`, `slug`, `price`, `weight_kg`, `images` anteriores + a nova) e o `isDirty` virando `true`.
- `pages/admin/AdminProductFormPage.midia.test.tsx` (+1, página real): envio de 2 arquivos pelo Resumo termina ⇒ badge "Alterações não salvas" (R03), o nome no campo (R06); "Salvar rascunho" ⇒ payload de `products` com `name`, `slug`, `base_price` 89,9, `original_price` 120, `weight_kg` 0,05 (R06) e `images` igual, por valor, às 5 de antes + `{ url, alt: null, source: 'upload' }` para as duas novas, no fim (R12/R13, item 5 da r1).

### Sensor (mutantes nos arquivos reais, um por vez, SHA-256 conferido na restauração)

Conjunto: `src/features/product-form` + `src/pages/admin/AdminProductFormPage*` (48 arquivos, 907 casos).

| # | Mutação | Resultado |
| --- | --- | --- |
| R06 | forma funcional mescla sobre `emptyProductForm()` | ✅ morto por asserção — 3 casos (os 2 do hook e o da página, no `getByDisplayValue('Pingente Estrela')`) |
| R03 | forma funcional não marca alterado | ✅ morto por asserção — 3 casos (2 do hook e o da página, no badge) |
| R12 | imagem nova com `alt: ''` | ✅ morto por asserção — o caso novo da página |
| R13 | imagem nova com `source: 'import'` | ✅ morto por asserção — o caso novo da página |

Nenhuma morte por compilação.

### Gate

| Gate | Resultado |
| --- | --- |
| backoffice (`pnpm --filter @estrelinha/backoffice test --testTimeout=20000`, exit fora de pipe) | **4267 / 240**, exit 0 (+3 sobre a r2) |
| `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` | **0** |

Gaps 1 e 2 da r2 fechados. O gap 3 (remedir MOD-07 em navegador) não é deste conserto e segue pendente.
