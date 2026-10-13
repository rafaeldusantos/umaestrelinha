# Revisão — Tasks (rodada 2)

Veredito: APROVADO

## Achados

### R1 — O item da LCT-15 na T14 não tem arquivo de teste no **Where** (menor)
- Onde: `tasks.md` T14, **Where** (linha 391) e o item "**LCT-15**" do "Done when" (linha 401): "acrescentar o bloco pela bandeja cria a seção com `active: false` e sem itens".
- Problema: quem cria a seção é `createSection` em `apps/backoffice/src/entities/home/api/useAdminHomeSections.ts:165-169` (`.insert({ type, position, active: false, config: {} })`). O teste dessa gravação mora em `useAdminHomeSections.test.ts:216-229,625-629`, e nenhum dos dois arquivos está no **Where** da T14. O protocolo da própria lista proíbe tocar em arquivo fora do **Where** (linhas 15-16). Já o `HomeBlockTray.test.tsx` só vê o callback de adicionar, não a gravação.
- Cenário: o executor da T14 ou deixa a metade "nasce desligada" sem prova, ou a prova num arquivo que não está listado. A outra metade (o editor abre vazio com "Título da seção" e "Adicionar categoria") cabe no `CategoryListEditor.test.tsx` montado pelo `HomeSectionEditor`, que já está no **Where**.
- Sugestão: acrescentar `apps/backoffice/src/entities/home/api/useAdminHomeSections.test.ts` ao **Where** da T14, com um caso `createSection('category_grid')` que assere `active: false`, no molde da linha 625. A alternativa é declarar que `HOME-10` já está coberto de forma genérica e restringir o item à metade do editor.

### R2 — A justificativa da T13 diz que o editor "existe" na T12, mas ele só fica alcançável na T14 (menor)
- Onde: T13, "Done when" (linha 380): "a bandeja só pode oferecer o bloco quando o editor existe (T12)".
- Problema: a T12 cria o componente, mas a entrada `SECTION_EDITORS.category_grid` nasce só na T14. `HomeSectionEditor.tsx:79` lê `SECTION_EDITORS[section.type]`. Entre a T13 e a T14, portanto, a bandeja oferece o bloco e abrir a seção não monta corpo nenhum. A suíte fica verde e as duas tarefas são consecutivas no mesmo lote, então não há dano de execução. O problema é só o texto, que afirma uma coerência que não existe naquele intervalo.
- Cenário: o revisor de adequação da T13 confere a frase, abre a seção e não vê editor.
- Sugestão: reescrever como "o editor existe (T12) e é registrado na tarefa seguinte (T14), no mesmo lote", ou trocar a ordem para que o registro venha antes do catálogo.

## Conferido sem achado
- **Achados da rodada 1, todos resolvidos no texto:**
  - R1: o catálogo virou a T13 e inverte `catalog.test.ts` (inclusive a lista da linha 157, "os outros dez") e `HomeBlockTray.test.tsx:66-121` na mesma tarefa. A previsão errada sobre `HomeRenderer.test.tsx` saiu.
  - R2: a T14 prova a recusa pelo `HomeSectionEditor` real nos três casos, com dublê sem escrita, rascunho preservado e sensor que remove `refusal:`. O molde `FeaturedProductsEditor.test.tsx:3-6` existe e monta o casco.
  - R3: a T09 troca a fixture de `HomeRenderer.test.tsx:106-110` por tipo desconhecido, com asserção de ausência no registro.
  - R4: `sectionRefusals.test.ts` (novo) está fixado no **Where** da T04 e reaproveitado na T11. Conferido que `model/__tests__/` hoje só tem `applyDraft`, `toNewItems` e `usePreviewBridge`.
  - R5: há `case 'category_grid'` no resumo e o ícone `CircleDot`. Conferido que `HomeSectionRow.tsx:54` hoje usa `LayoutGrid`, que `GalleryHorizontal` é do `hero_carousel` e que `lucide-react` tem `circle-dot`.
  - R6: rastreabilidade ID a ID (40 de 40), e a T17 a copia para a `spec.md`.
  - R7: a LCT-15 tem item próprio na T14, com a ressalva de arquivo do R1 acima.
- **A mudança de motivo da T06 não quebra asserção alheia:** as três ocorrências da frase antiga (`useAdminResolvedHome.test.ts:85`, `HomeSectionList.test.tsx:248` e `resolve.test.ts:180`) são de `collection_rows`, cuja entrada em `EMPTY_SOURCE_REASON` não muda.
- **O pós-processamento da T06 está bem posicionado:** em `resolve.ts:160-170`, `resolveItem` devolve `null` e soma em `droppedCount`. Sem itens curados cai em `ctx.derive`, que para `category_grid` devolve `[]` (`useAdminResolvedHome.ts:162-192`). Assim, "zero itens", "todos órfãos" e "desligada" saem dos ramos já existentes, como a T06 assere.
- **Desativada ⇒ `droppedCount` (T14):** `useAdminResolvedHome.ts:97` devolve `null` para `categoria.active === false`.
- **A prévia carrega `title`:** `parsePreviewMessage` (`core/home/preview.ts:126-128`) repassa `sections` sem filtrar campos de item, então a T10 (`applyDraft`) basta para a LCT-40.
- **Artefatos reaproveitados existem:** `useOverflowAffordance.ts`, `TAP_44` (`touchTarget.ts:29`), `alvoDeToqueNaoRoubaPosicao.test.ts`, `animacaoRespeitaMovimento.test.ts`, `googleShoppingSchema.test.ts`, `renditionSingleOwner.test.ts` e `homeSections.test.ts`. A lista literal de `homeSections.test.ts:241` não depende de `comingSoon`, o que confirma o "verde sem edição" da T13. O widget novo `category-list` não colide com `widgets/category-grid`.
- **Migration:** a última é `20261011120000_63-retirada.sql`, e o prefixo `20261012120000` é único e posterior.
- **Gate Check Commands:** `@estrelinha/core` (`vitest run`), `@estrelinha/store` (`vitest run`) e `@estrelinha/backoffice` (`vitest run --passWithNoTests`) existem. `--testTimeout=20000` vem sem `--`, e o `tsc` usa `tsconfig.app.json`.
- **Dependências:** sem ciclo e sem apontar para fase posterior. O diagrama bate com os **Depends on**, e toda fase termina verde (a T13 inverte os guardas na mesma tarefa em que muda o catálogo).
- **Convenções:** itens `NN-kebab-case`; **Commit** como mensagem planejada, sem commit por tarefa (`BL-012`); proibição de `git stash`; um workspace por vez; `payment/**` conferido no gate de build; baseline de entrada medida com a árvore parada.

## Resposta do autor

- **R1**: aplicado — `useAdminHomeSections.test.ts` entrou no Where da T14, e o item da LCT-15 nomeia o caso de `createSection('category_grid')`.
- **R2**: aplicado — o texto da T13 passou a declarar o intervalo entre T13 e T14 (bloco oferecido sem editor), consecutivas no mesmo lote e sem estado publicado.
