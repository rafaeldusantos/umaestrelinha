# 84 — SEO do produto com IA · Validation

**Date**: 2026-10-27
**Spec**: `.specs/features/84-seo-do-produto-com-ia/spec.md`
**Diff range**: árvore de trabalho não commitada sobre `96757cc7` (branch `feature/84-seo-do-produto-com-ia`), recortada aos arquivos da `84` listados em `tasks.md` (o resto da árvore é de outra frente).
**Verifier**: sub-agente independente (autor ≠ verificador). Não editou código nem testes.

## Veredito: ❌ FAIL — por cobertura, nenhum defeito de produto encontrado

41 mutantes de comportamento, escolhidos a partir da spec: **36 mortos por asserção, 0 por compilação, 5 sobreviventes**. Os 5 sobreviventes caem em três ACs (`SIA-10`, `SIA-13`/`SIA-14`, `SIA-26`) e num edge case. O código de hoje está certo em todos os cinco pontos. O que falta é a prova: a suíte continua verde quando o comportamento é quebrado. Some-se a isso a T13 (prova em navegador e probe contra a API real), que não foi feita.

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T01–T12 | ✅ Done | Resultados e gates conferidos contra os números medidos abaixo |
| T13 | ❌ Não feita | Não existem `prova-navegador.md` nem `probes/`. Os Success Criteria "prova em navegador 390/1440" e "probe contra a Anthropic real" estão em aberto |

---

## Spec-Anchored Acceptance Criteria

| AC | Resultado definido pela spec | Evidência (`file:line` — asserção) | Resultado |
| --- | --- | --- | --- |
| SIA-01 | publicar sem SEO ⇒ `is_active=true`, `seo_*=null`, sem toast, sem levar à aba SEO | `apps/backoffice/src/pages/admin/AdminProductFormPage.seo.test.tsx:155-185`: `toMatchObject({ is_active: true })`, `seo_title).toBeNull()`, `toastsDestrutivos()).toEqual([])`, aba Geral `data-state='active'` (`:173`), só-espaço ⇒ `null` (`:177`). Página real | ✅ (V29 morto) |
| SIA-02 | rascunho ⇒ `is_active=false`, `null` | `…seo.test.tsx:190-197` | ✅ |
| SIA-03 | SEO fora de `canPublish`/`pendingCount`; os três rótulos | `checklist.test.ts:83-89` (`ok` true, `blocking` false, `canPublish` true, `pendingCount` 0), `:104-127` (os três rótulos literais, nos dois sentidos do parcial) | ✅ (V24, V25 mortos). Observação: `canPublish` ignorar `blocking` é um mutante **equivalente**, porque o item de SEO tem sempre `ok: true` |
| SIA-04 | só um preenchido ⇒ grava um, `null` no outro | `…seo.test.tsx:202-209` | ✅ |
| SIA-05 | prévia = `productPageMeta` do estado atual; nunca os textos fixos | `SeoPreview.test.tsx:37-60` (igual a `productPageMeta`; textos antigos ausentes); página real com o nome editado sem salvar `…seo.test.tsx:214-228` (`'Anel Estrela \| Uma Estrelinha'`) | ✅ (V31 morto pela página) |
| SIA-06 | placeholder = nome sem a marca / `descriptionFromHtml` | `SeoPreview.test.tsx:101-111` | ✅ (V27 morto) |
| SIA-07 | piso `STORE_BRAND` + descrição da loja / `STORE_DESCRIPTION_FLOOR` | `SeoPreview.test.tsx:88-99` | ⚠️ Lacuna de precisão: a página **não** passa `storeDescription` (desvio declarado na T03). No painel o piso é sempre `STORE_DESCRIPTION_FLOOR`; quando a loja tem descrição configurada, um produto sem descrição mostra no painel um texto diferente do que a loja serve. É raro (o nome bloqueia a publicação), mas contradiz a letra "exatamente o que a loja serve" |
| SIA-08 | selo "automático" só no derivado | `SeoPreview.test.tsx:113-141` (os quatro cruzamentos e o só-espaço) | ✅ |
| SIA-09 | contador `N/60 · M com a marca` | `SeoPreview.test.tsx:143-153` (`30/60 · 47 com a marca`) | ✅ (V26 morto) |
| SIA-10 | invoca `seo-suggest` com nome, descrição, categorias **e relacionados do estado atual**; "Sugerindo…" desabilitado; preenche sem gravar | `…seo.test.tsx:263-294`: corpo `toEqual({...relatedIds: [] ...})`, `Sugerindo…` desabilitado, `h.diario).toEqual([])` | ❌ **GAP**: a fixture tem `related_product_ids: []`, então trocar `relatedIds: form.related_product_ids` por `relatedIds: []` na página **sobrevive (V30)**. A parte "ids de produtos relacionados do estado atual" não tem prova pela página |
| SIA-11 | nome vazio ⇒ desabilitado + dica | `…seo.test.tsx:297-308`; `SuggestSeoButton.test.tsx` (só espaço) | ✅ (V36 morto) |
| SIA-12 | Desfazer devolve o par; some na edição, na nova sugestão e no save | `…seo.test.tsx:331-370`; `useSeoSuggestion.test.ts:88-143` | ✅ (V32, V33, V37 mortos) |
| SIA-13 | até 5 exemplos (A5); `claude-haiku-5-5`, `effort: medium`, `output_config.format` com o schema; regras de tom no `system` | Payload **enviado à porta neutra**: `handlers.test.ts:227-249` (`model` `'claude-haiku-5-5'`, `effort` `'medium'`, `schema` por identidade, chaves exatas); `prompt.test.ts:33-95`; `examples.test.ts:50-93` | ⚠️/❌ **GAP parcial**: a tradução da porta para a chamada do SDK (`_shared/claude.ts`: `output_config.effort`, `format`, `signal`) **não tem teste nenhum**. `effort: req.effort` → `"high"` **sobrevive (V20)**; `{ signal: req.signal }` → `{}` **sobrevive (V22)**. Hoje a única prova é o `deno check` e o boot local, que só chegou até o 503 (sem chave) |
| SIA-14 | régua de A7 em `core`; uma retentativa; 422 `off_rules` | `suggestion.test.ts:108-236`; `handlers.test.ts:272-305` (2 chamadas, depois 422) | ✅ no handler (V01–V04, V06, V07 mortos). ❌ `maxRetries: 1` do SDK (Decisão 4 da spec) sem prova: `maxRetries: 3` **sobrevive (V21)** |
| SIA-15 | 200 `{title sem a marca, aparado; description aparada; examples}` | `handlers.test.ts:260-270` `toEqual({ title: 'Pingente Estrela em resina', … examples: 1 })` | ✅ (V09 morto) |
| SIA-16 | sugestão ⇒ prévia na hora | `…seo.test.tsx:288-292`; `SeoPreview.test.tsx:70` | ✅ |
| SIA-17 | 401/403/403 sem chamar a Anthropic | `handlers.test.ts:111-134` (porta que conta e lança) | ✅ |
| SIA-18 | 31ª ⇒ 429 sem chamar; a frase | `handlers.test.ts:161-188`; frase literal em `useSeoSuggestion.test.ts:224` | ✅ |
| SIA-19 | chave e SDK só em `supabase/functions/**` | `claudeSoNoServidor.test.ts:118-130` (+ âncoras e sensores); `claudeSoNaPorta.test.ts` | ✅ (V23, V39 mortos) |
| SIA-20 | 503 `not_configured`; botão desabilitado, visível, com a dica | `handlers.test.ts:144-158`; `…seo.test.tsx:409-419`; `useSeoSuggestion.test.ts:241` | ✅ (V13 morto) |
| SIA-21 | só os campos de A6; nenhum `select` com custo, fornecedor, estoque ou cliente | `examples.test.ts:120-168` (colunas por igualdade; regex `/cost\|supplier\|stock\|customer\|price/`; dublê que projeta só as colunas pedidas); `prompt.test.ts:148` | ✅ |
| SIA-22 | 15 s / 5xx / rede ⇒ 502 `upstream`; frase; campos intocados | `handlers.test.ts:335-393` (relógio falso: 14 999 não aborta, 15 000 aborta); `…seo.test.tsx:422-435` | ✅ no handler (V08 morto). A metade "5xx/529 **depois da retentativa do SDK**" depende de `claude.ts` (ver V21) |
| SIA-23 | refusal/truncated ⇒ 422, sem retentar a recusa; frase | `handlers.test.ts:317-333`; `claudeResult.test.ts` | ✅ (V10, V14 mortos) |
| SIA-24 | toque em voo ignorado; troca de aba ou saída descarta | `useSeoSuggestion.test.ts:73,171-220`; `…seo.test.tsx:390-404` | ✅ (V34 morto) |
| SIA-25 | edição em voo ⇒ descarte + frase | `…seo.test.tsx:375-388`; `useSeoSuggestion.test.ts:145-169` | ✅ |
| SIA-26 | log: conta, resultado, exemplos, tentativas, tokens, duração; sem o texto do produto | `handlers.test.ts:403-450` | ✅ (V11, V41 mortos) |

**Status**: 22/26 cobertos e discriminantes; 2 gaps (SIA-10, SIA-13/14 no adaptador); 1 lacuna de precisão (SIA-07); SIA-22 coberto na parte do handler.

---

## Edge Cases

- [x] Descrição que é só o bloco de FAQ ⇒ vazia — `prompt.test.ts:104`
- [~] Mais de 4.000 caracteres ⇒ corte em limite de palavra **declarado no log** — o corte está provado (`prompt.test.ts:111-121`), mas a declaração no log **não**: remover `descriptionCut` da linha de log **sobrevive (V40)**
- [x] Id relacionado inexistente ou do próprio produto ⇒ ignorado — `examples.test.ts:75,171` (V17 morto)
- [x] Mais de 20 relacionados, mais de 10 categorias, nome com mais de 200 ⇒ 400 sem chamar — `handlers.test.ts:194-218` (V12 morto)
- [x] Título com a marca ⇒ removida antes de medir — `suggestion.test.ts:129-133`
- [x] Título igual a um exemplo (sem caixa e sem acento) ⇒ reprova — `suggestion.test.ts:178-186` (V03 morto)
- [x] `requires_material` ⇒ o prompt permite dizer, proíbe nomear — `prompt.test.ts:81-95`; régua em `core` (V06 morto)
- [~] A régua de urgência e de material casa "com fronteira de palavra" (afirmado no comentário de `suggestion.ts:52` e por um teste "inverso") — remover a fronteira **sobrevive (V05)**: o inverso usa "Corrente", que não contém "corra" como substring, então ele é verdadeiro nos dois mundos

---

## Gate Check

Um workspace por vez, `--testTimeout=20000` sem `--`, exit fora de pipe. Logs em `/private/tmp/claude-503/-Users-rafael-santos-Projetos-uma-estrelinha-store/cc66d325-20ac-4107-8ea3-42611f7041ad/scratchpad/verifier/gate-*.log`.

| Workspace | Baseline de entrada | Agora | Exit |
| --- | --- | --- | --- |
| core | 4697 / 184 | **4761 / 186** (+64/+2) | 0 |
| functions | 1105 / 26 | **1198 / 31** (+93/+5) | 0 |
| backoffice | 4016 / 230 | **4104 / 235** (+88/+5) | 0 |
| store | 6146 / 329 | **6168 / 330** (+22/+1) | **0** (desta vez sem o `onTaskUpdate` de contenção) |
| `tsc` backoffice | 0 | 0 | 0 |

Nenhuma queda de contagem. Asserções antigas tocadas: o caso "SEO exige título E descrição" do checklist foi **invertido**, como manda o design, e o `toHaveLength(5)` virou uma lista exata, o que é mais forte e não mais fraco.

---

## Discrimination Sensor

Método: edição no lugar com `perl`, os testes do arquivo e da página rodados por `vitest run`, restauração por cópia e conferência SHA-256 (**41/41 `SHA_OK`**). O arnês recusa uma mutação que não muda nada. Nenhum `git stash`, `checkout`, `restore`, `reset` ou `clean`. Os diffs e logs estão em `…/scratchpad/verifier/mut/`.

| # | Alvo | Mutação | Resultado | Quem matou |
| --- | --- | --- | --- | --- |
| V01 | `core/seo/suggestion.ts` | `< MIN` → `<= MIN` (descrição) | ✅ asserção | "descrição com 69 reprova e com 70 passa" |
| V02 | idem | régua do `!` apagada | ✅ asserção | "ponto de exclamação reprova" |
| V03 | idem | exemplo sem `stripBrand` | ✅ asserção | "título igual a um exemplo… sem a marca do exemplo" |
| V04 | idem | descrição medida sem aparar | ✅ asserção | "a descrição é medida aparada" |
| V05 | idem | `contemTermo` sem fronteira de palavra | ❌ **sobreviveu** | — |
| V06 | idem | `if (requiresMaterial)` invertido | ✅ asserção | material nomeado ×4 |
| V07 | `seo-suggest/handlers.ts` | `attempts < 2` → `< 3` | ✅ asserção | "reprovada 2× ⇒ 422" |
| V08 | idem | `setTimeout(…, BUDGET*2)` | ✅ asserção | "o prazo de 15 s aborta" |
| V09 | idem | título sem `stripBrand` na resposta | ✅ asserção | "200 com o título SEM a marca" |
| V10 | idem | `refusal` tratado como reprovada (retenta) | ✅ asserção | "refusal ⇒ 422 com UMA chamada" |
| V11 | idem | nome do produto no log | ✅ asserção | log SIA-26 |
| V12 | idem | teto de categorias = 20 | ✅ asserção | "> 10 categorias ⇒ 400" |
| V13 | idem | `claude === null` → `=== undefined` | ✅ asserção | 503 |
| V14 | `_shared/claudeResult.ts` | ramo `max_tokens` apagado | ✅ asserção | "max_tokens ⇒ truncated" |
| V15 | idem | `output` lê `input_tokens` | ✅ asserção | 5 casos |
| V16 | `seo-suggest/examples.ts` | `MIN_RELATED` 3 → 2 | ✅ asserção | pickExamples |
| V17 | idem | sem excluir o próprio produto | ✅ asserção | "nunca o próprio produto" |
| V18 | `seo-suggest/prompt.ts` | `SEO_EFFORT` → `'high'` | ✅ asserção | handler + prompt |
| V19 | idem | "não repita os exemplos" apagado do system | ✅ asserção | prompt |
| V20 | `_shared/claude.ts` | `effort: req.effort` → `"high"` | ❌ **sobreviveu** | — |
| V21 | idem | `maxRetries: 1` → `3` | ❌ **sobreviveu** | — |
| V22 | idem | `{ signal: req.signal }` → `{}` (o orçamento de 15 s deixa de abortar a chamada real) | ❌ **sobreviveu** | — |
| V23 | `handlers.ts` | importa o SDK por `npm:` | ✅ asserção | `claudeSoNaPorta` |
| V24 | `checklist.ts` | parcial só com título | ✅ asserção | rótulo parcial |
| V25 | idem | item de SEO `ok` exige título | ✅ asserção | checklist + página |
| V26 | `SeoPreview.tsx` | contador digitado = servido | ✅ asserção | "N/60 · M com a marca" |
| V27 | idem | placeholder com a marca | ✅ asserção | placeholder |
| V28 | idem | `storeDescription` ignorado | ✅ asserção | "com storeDescription" |
| V29 | `AdminProductFormPage.tsx` | `seo_title \|\| null` (espaço grava) | ✅ asserção | "só com espaços gravam null" |
| V30 | idem | `relatedIds: []` na sugestão | ❌ **sobreviveu** (863 testes de `src/pages/admin`) | — |
| V31 | idem | `productDescription={""}` | ✅ asserção | página |
| V32 | idem | `noteManualEdit` fora do `onDescriptionChange` | ✅ asserção | Desfazer some ao digitar na descrição |
| V33 | `useSeoSuggestion.ts` | desfazer mesmo sem texto antes | ✅ asserção | "campos vazios antes" |
| V34 | idem | toque em voo não ignorado | ✅ asserção | SIA-24 |
| V35 | `requestSeoSuggestion.ts` | 401/403 → `upstream` | ✅ asserção | forbidden ×2 |
| V36 | `SuggestSeoButton.tsx` | `name === ''` (sem aparar) | ✅ asserção | só espaço |
| V37 | `useSeoSuggestion.ts` | `noteManualEdit` não apaga o desfazer | ✅ asserção | ×3 |
| V38 | `SuggestSeoButton.tsx` | sem `role="status"`/`aria-live` | ✅ asserção | ×6 |
| V39 | `SeoPreview.tsx` | o nome da env da chave num arquivo de app | ✅ asserção | `claudeSoNoServidor` |
| V40 | `handlers.ts` | `descriptionCut` fora do log | ❌ **sobreviveu** | — |
| V41 | idem | `attempts: 1` fixo no log | ✅ asserção | log SIA-26 |

**Sensor depth**: P0 expandido (custo e segurança). **Resultado**: 36/41 mortos por asserção, 0 por compilação, 5 sobreviventes ⇒ **FAIL**.

---

## SPEC_DEVIATION — avaliação

| Task | Desvio | Avaliação |
| --- | --- | --- |
| T01-1 | `suggestion.ts` fora do barril de `core/seo` | ✅ Aceito. Mantém a âncora de 15 do `denoReach` honesta; um `denoReach` próprio cobre o arquivo |
| T01-2 | parâmetro `requiresMaterial` (o design dizia `materialNamed`) | ✅ Aceito. É só nome; a semântica bate com o edge case |
| T01 gap | "cabelo" solto não era acusado | Já fechado: `PALAVRAS_DE_MATERIAL` existe e tem teste (`suggestion.test.ts:221`). A fronteira de palavra é que não tem prova (V05) |
| T03 | prop `productDescription`; a página não passa `storeDescription` | Nome: ✅. `storeDescription` ausente: ⚠️ desvio **real** contra SIA-05/07 ("exatamente o que a loja serve") quando a loja tem descrição e o produto não. Decisão do usuário: ler `store_settings.seo` no painel, ou aceitar e registrar |
| T05 | `claudeResult.ts` com um `import type` relativo `.ts` | ✅ Aceito. A alternativa seria declarar o tipo duas vezes; o teste assere a forma exata |
| T06 | leitura por categoria com embed `!inner`, sem `.not('seo_title','is',null)` | ✅ Aceito. `pickExamples` descarta os sem SEO. Risco residual: com mais de 8 recentes sem SEO na categoria, os exemplos minguam (686/702 curados hoje) |
| T11-1 | `cancel()` além da interface do design | ✅ Aceito. Necessário para SIA-24 com o Radix desmontando a aba |
| T11-2 | `reset()` invalida o voo | ✅ Aceito. Mais seguro que a letra |
| T11-3 | Desfazer só quando havia texto | ✅ Aceito. É a letra de SIA-12 |
| T11-4 | motivos `forbidden`/`bad_request`; `network` = `upstream` | ✅ Aceito. As frases vêm da tabela de erros do design |

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Minimum code / surgical | ✅ Diff da `84` na página limitado ao registrado na T04/T12 |
| Matches patterns (`AD-004`, porta neutra como `PushSender`, `requireAdmin`, `rateLimit`) | ✅ |
| Spec-anchored (valores literais da spec nas asserções: 43/70/160, `claude-haiku-5-5`, `medium`, frases exatas, 15 000 ms, 30/10 min) | ✅ |
| Cada camada coberta | ❌ `_shared/claude.ts` não tem teste nenhum. Ele é o único arquivo que fala com a API paga, e é exatamente onde ficam `effort`, `format`, `signal`, `maxRetries` e `timeout` |
| Guidelines: `CLAUDE.md` (raiz, backoffice, supabase, core) | ✅ guardas com âncora e sensor; "teste monta a página real" respeitado, menos o furo de V30 |

---

## O que NÃO foi provado

- **Navegador** (T13): nada medido em 390×844 nem em 1440, nem rolagem horizontal, alvo de 44 px, a quebra de linha da fileira do botão ou a região viva.
- **API real** (T13): nenhuma chamada a `claude-haiku-5-5`. Não há prova de que `output_config.format` + `effort` são aceitos (o design cita 400 se a forma estiver errada), nem do p95 ≤ 15 s, nem do tom real. O boot local só chegou ao 503 sem chave.
- **`npm:@anthropic-ai/sdk@1.3.0` no edge runtime hospedado**: provado só que o worker sobe localmente (runtime 1.77.4).
- **Tetos por isolate**: o limitador é por isolate. O teto de verdade é o do Console da Anthropic, um passo de operação.

---

## Fix Plans

1. **SIA-10 / V30** — em `AdminProductFormPage.seo.test.tsx`, um caso com `related_product_ids: ['r1','r2']` na fixture (e um relacionado acrescentado sem salvar na aba Relacionados) asserindo `relatedIds` no corpo do `invoke`. *Done when*: V30 reinjetado morre.
2. **SIA-13/14/22 / V20, V21, V22** — extrair de `claude.ts` a montagem dos argumentos (`toMessagesArgs(req)` ⇒ `[params, { signal }]`) e as opções do client (`CLIENT_OPTIONS = { maxRetries: 1, timeout: 15_000 }`) para um arquivo sem o SDK, testado sob vitest com igualdade de objeto (`output_config: { effort, format: { type: 'json_schema', schema } }`, `signal` por identidade). `claude.ts` passa a usar os dois. Alternativa: um guarda pela AST de `claude.ts`. *Done when*: V20–V22 reinjetados morrem.
3. **Edge case de 4 000 / V40** — no teste de log do handler, uma descrição com mais de 4 000 caracteres asserindo `descriptionCut: true`, e o par com `false`.
4. **Fronteira de palavra / V05** — um inverso em que o termo é substring de uma palavra legítima: "aleitamento" ou "leiteira" com `requiresMaterial`, ou "socorra" para urgência. *Done when*: V05 morre.
5. **SIA-07 (decisão)** — passar a descrição da loja ao `SeoPreview`, ou registrar o desvio como aceito.
6. **T13** — prova em navegador e probe real, ou declarar como pendentes com o comando pronto.

## Requirement Traceability Update

| Requirement | Novo status |
| --- | --- |
| SIA-01..06, 08, 09, 11, 12, 15..21, 23..26 | ✅ Verified |
| SIA-07 | ⚠️ Desvio a decidir |
| SIA-10 | ❌ Needs fix (prova dos relacionados) |
| SIA-13, SIA-14 (adaptador) | ❌ Needs fix (prova do SDK) |
| SIA-22 | ✅ handler · ❌ retentativa do SDK sem prova |

---

## Rodada 2

**Date**: 2026-10-27 · **Verifier**: sub-agente independente (não escreveu o código nem o conserto r1). Não editou código nem testes; só este arquivo. Logs, diffs e o arnês em `/private/tmp/claude-503/-Users-rafael-santos-Projetos-uma-estrelinha-store/cc66d325-20ac-4107-8ea3-42611f7041ad/scratchpad/verifier-r2/`.

### Veredito: ❌ FAIL — por cobertura; nenhum defeito de produto no código de hoje

As **7 lacunas da r1 estão fechadas** (V05, V20, V21, V22, V30, V40 e SIA-07, todas reinjetadas e mortas por asserção). O sensor novo (27 mutantes que a r1 não usou) achou **10 sobreviventes**, dos quais dois são exatamente o buraco que o conserto criou: a régua pela AST de `claude.ts` prova que as duas montagens são CHAMADAS, não que o resultado delas chega intacto ao SDK.

### Lacunas da r1 — status

| Lacuna | Mutante reinjetado | Resultado | Quem matou |
| --- | --- | --- | --- |
| V05 fronteira de palavra | `contemTermo` sem a fronteira | ✅ asserção | 3 inversos (socorra, aproveitem, leiteira) |
| V20 `effort` | `effort: 'high'` em `claudeRequest.ts` | ✅ asserção | "o corpo inteiro, por igualdade"; "os três valores" |
| V21 `maxRetries` | `CLAUDE_MAX_RETRIES = 3` | ✅ asserção | "uma retentativa, 15 s por tentativa" |
| V22 `signal` | opções do pedido `{}` | ✅ asserção | "o MESMO signal do orçamento" |
| V30 relacionados | `relatedIds: []` na página | ✅ asserção | SIA-10 pela página real |
| V40 `descriptionCut` | fora da linha de log | ✅ asserção | os 2 casos de log |
| SIA-07 | página sem `storeDescription={…}` | ✅ asserção | "com `seo.description` configurada" |

**7/7 fechadas.** `useSeoSettings` do painel é o MESMO hook de `@estrelinha/core/hooks/useStoreSettings` que `apps/store/src/pages/ProductPage.tsx:99` lê (`data?.seo ?? DEFAULT_SEO`) — a prévia passou a ser o que a loja hidratada mostra. Observação herdada, fora da `84`: sem a linha `seo` no banco, a função `api/page` serve a descrição do **shell** (`index.html`, termina em "Feitas por Adri Muniz, em Porto Alegre.") e o cliente/painel mostram `DEFAULT_SEO.description` (sem essa frase). A divergência já existia entre servidor e cliente da loja; o painel acompanha o cliente.

### Sensor novo (edição no lugar, restauração por cópia, SHA-256: 27/27 `SHA_OK`; o arnês recusa alvo ausente ou repetido e, desde esta rodada, recusa execução sem arquivo de teste — a primeira passada dos mutantes de functions rodou com o filtro colapsado pelo zsh e "morreu" por `No test files found`; foi descartada e refeita)

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| N01 | `_shared/claude.ts` | depois de `[body, options] = claudeMessagesArgs(req)`, `body.output_config.effort = 'high'` | ❌ **sobreviveu** |
| N02 | idem | depois de `new Anthropic(claudeClientOptions(apiKey))`, `Object.assign(client, { maxRetries: 3 })` | ❌ **sobreviveu** |
| N03 | idem | `options.signal = new AbortController().signal` antes do `create` | ✅ asserção — **por acaso**: morreu em "o client nasce de `claudeClientOptions`", porque `new AbortController()` é um segundo `new`. `options.signal = req.signal` reescrito sem `new` passaria (mesma família de N01) |
| N04 | idem | `fromError`: `APIUserAbortError` ⇒ `refusal` (o estouro dos 15 s viraria 422 "recusa") | ❌ **sobreviveu** |
| N05 | idem | `messageToResult({ ...msg, stop_reason: 'end_turn' })` (recusa e corte do modelo deixam de ser vistos) | ❌ **sobreviveu** |
| N06 | `_shared/claudeRequest.ts` | `max_tokens: 4096` | ✅ asserção |
| N07 | idem | `CLAUDE_TIMEOUT_MS = 60_000` | ✅ asserção |
| N08 | idem | `schema: { ...req.schema }` | ✅ asserção (`toBe`) |
| N09 | idem | `content: req.user.slice(0, 2000)` | ❌ **sobreviveu** (a fixtura do `user` tem 25 caracteres) |
| N10 | `AdminProductFormPage.tsx` | `{ title: storeDescription } = useSeoSettings()` | ✅ asserção |
| N12 | `core/seo/suggestion.ts` | `'cabelinho'` fora de `PALAVRAS_DE_MATERIAL` | ❌ **sobreviveu** |
| N13 | idem | `'pelinho'` fora | ❌ **sobreviveu** |
| N14 | idem | `'cabelos'` fora | ✅ asserção |
| N15 | idem | `dobrar` sem tirar o acento | ✅ asserção |
| N16 | idem | `'garanta já'` fora de `URGENCY_TERMS` | ❌ **sobreviveu** |
| N17 | idem | `'estoque limitado'` fora | ❌ **sobreviveu** |
| N18 | idem | tom medido só no título | ✅ asserção |
| N19 | `seo-suggest/handlers.ts` | `suggestionRefusal(…, false)` | ✅ asserção |
| N20 | idem | exemplos `[]` na régua | ✅ asserção |
| N21 | `_shared/claudeRequest.ts` | importa o SDK | ✅ asserção (`claudeSoNaPorta` + forma dos imports) |
| N22 | `handlers.ts` | sem o corte de `RETRY_MIN_REMAINING_MS` | ✅ asserção |
| N23 | `suggestion.ts` | `SUGGESTION_TITLE_MAX = SEO_TITLE_FIELD_MAX` | ✅ asserção |
| N24 | idem | `stripBrand` sem a abreviação | ✅ asserção |
| N25 | página | `productId: null` na sugestão | ✅ asserção |
| N26 | `suggestion.ts` | `'dentinho'` fora | ✅ asserção |
| N27 | idem | "Outro material" volta à lista | ✅ asserção |
| N28 | página | `requiresMaterial: true` fixo | ❌ **sobreviveu** (a única fixtura da página tem `requires_material: true`) |

**27 injetados: 17 mortos por asserção, 0 por compilação, 10 sobreviventes.**

### O buraco que o conserto criou

A régua pela AST (`claudeRequest.test.ts`, "claude.ts usa as duas montagens") confere **presença**: o único `new` é `new Anthropic(claudeClientOptions(apiKey))`, a única `create` é `client.messages.create(body, options)` e a desestruturação vem de `claudeMessagesArgs(req)`. Ela não confere **ausência de escrita** entre a montagem e o envio: `body.output_config.effort = 'high'` (N01) ou `Object.assign(client, { maxRetries: 3 })` (N02) passam, e são exatamente V20/V21 com outro endereço. (N03 morreu só porque trazia um segundo `new` — acaso de forma, não régua.) O conserto mais curto: a régua passa a recusar, dentro de `createClaudeJson`, qualquer `BinaryExpression` de atribuição e qualquer `Object.assign`/spread cujo alvo seja `body`, `options` ou `client` — ou, mais forte, fixa por igualdade a lista de statements do corpo da função.

`fromError` e a chamada a `messageToResult` (N04, N05) continuam sem prova, como na r1 ("`claude.ts` não tem teste nenhum"): a extração cobriu a ida, não a volta. `fromError` é traduzível para `claudeResult.ts` se receber as classes por injeção; senão, a régua da AST pode fixar a chamada `messageToResult(msg as any)` por texto.

### Régua de material ampliada — o que ela faz com a copy real

Medido contra o banco local (`products`, 702 linhas):

- **Falsos positivos de copy comum**: não achei no tom memorial. "dentinho", "cabelinho", "pelinho" são de fato nomes de material. Os termos de urgência com fronteira não pegaram frase legítima plausível ("Uma lembrança que não se perde" passa); "não perca"/"corra" em sentido não comercial ("para quem não perca a memória") seriam recusados, mas são construções forçadas.
- **"Flores" e "Penas" são também motivo de desenho**: com `requires_material`, "Colar Flores do Campo" é recusado. No catálogo local isso não morde (as peças com "Flores" no nome nomeiam outro material também), mas a régua não distingue motivo de material.
- **A régua é MAIS ESTREITA que o prompt** (risco de produto, não de teste): o `system` proíbe "dente", "pelo", "coto umbilical", "flores", "penas"; a régua não pega "dente" sozinho ("Pingente com o dente do bebê" passa), "cinza"/"flor"/"pena" no singular, "coto" sozinho, "pelo do gato", "mechas". Spec (`spec.md:245`): "proibir **nomear** o material". Se o modelo desobedecer nessas formas, nada recusa.
- **Conflito exemplos × régua** (risco para T13): 430 das 463 peças com `requires_material` nomeiam o material no **nome**, e 432 das 460 com SEO curado o nomeiam no `seo_title`/`seo_description`. Os exemplos que vão ao prompt ensinam a forma que a régua recusa. A taxa de `off_rules` 422 nas peças com material é a primeira coisa que o probe real da T13 deve medir.

### Gates (um workspace por vez, `--testTimeout=20000` sem `--`, exit fora de pipe; árvore restaurada)

| Workspace | Esperado | Medido | Exit |
| --- | --- | --- | --- |
| core | 4767/186 | **4764/186** (o número do conserto r1; o "≈4767" do pedido não bate com o próprio `tasks.md`) | 0 |
| functions | 1208/32 | **1208/32** | 0 |
| backoffice | 4106/235 | **4106/235** | 0 |
| store | 6168/330 | **6168/330** | 0 |
| `tsc` backoffice | 0 | **0** | 0 |

### Ranked gaps

1. **N01/N02 — a régua da AST de `claude.ts` aceita escrita entre a montagem e o envio.** Reabre V20/V21 por outro caminho. Fecha recusando atribuição/`Object.assign` sobre `body`/`options`/`client` em `createClaudeJson` (ou fixando os statements). *Done when*: N01 e N02 morrem.
2. **N28 — SIA-10 sem o par de `requiresMaterial`.** A página nunca é provada com `requires_material: false`; `true` fixo diria a toda peça que ela leva material da cliente. *Done when*: um caso com `false` assere `requiresMaterial: false` no corpo.
3. **N04/N05 — a volta do SDK em `claude.ts`.** Aborto dos 15 s virando `refusal`, ou `stop_reason` mascarado, passam. *Done when*: os dois morrem.
4. **Régua de material mais estreita que o prompt** ("dente", "pelo do …", "coto", singulares). Decisão de produto + casos; e medir `off_rules` nas peças com material no probe da T13.
5. **N09 — o `user` longo.** Um caso de `claudeMessagesArgs` com `user` de mais de 2.000 caracteres por igualdade.
6. **N12/N13/N16/N17 — termos da lista sem caso.** Um `it.each` sobre `URGENCY_TERMS` e sobre `PALAVRAS_DE_MATERIAL` (cada termo reprova sozinho) mata a família inteira.
7. **T13** (navegador 390/1440 e probe contra a API real) segue em aberto.

---

## Rodada 3

**Date**: 2026-10-27 · **Verifier**: sub-agente independente (não escreveu o código nem os consertos r1/r2). Não editou código nem testes; só este arquivo. Só ambiente local (nada de `--linked`, deploy ou `secrets`). Arnês, logs e resultados em `/private/tmp/claude-503/-Users-rafael-santos-Projetos-uma-estrelinha-store/cc66d325-20ac-4107-8ea3-42611f7041ad/scratchpad/verifier-r3/` (`harness.py`, `harness_r2.py`, `mut/*.log`, `gate-*.log`).

### Veredito: ❌ FAIL — por cobertura (3 sobreviventes pequenos), nenhum defeito de produto; é a 3ª rodada ⇒ **escalar ao usuário**

As 8 lacunas da r2 estão fechadas e N12/N13 são obsoletos pela A12. O conserto r2 não abriu buraco de comportamento. O sensor novo (27 mutantes) achou **3 sobreviventes reais e 1 equivalente**, os três em pontos de régua fina (emoji de apresentação de texto, a marca no meio com `|`, o tipo de `requiresMaterial` no corpo). T13 (navegador e API real) continua em aberto.

### Lacunas da r2 — status (reinjetadas; edição no lugar, restauração por cópia, 8/8 `SHA_OK`; cada execução conferiu `Test Files` ≥ 1)

| Lacuna | Mutante | Resultado |
| --- | --- | --- |
| N01 | `body.output_config.effort = 'high'` depois da montagem em `claude.ts` | ✅ asserção (o arquivo por igualdade) |
| N02 | `Object.assign(client, { maxRetries: 3 })` | ✅ asserção |
| N04 | `claudeError.ts`: aborto ⇒ `refusal` | ✅ asserção (3 casos) |
| N05 | `messageToResult({ ...msg, stop_reason: 'end_turn' })` | ✅ asserção |
| N09 | `content: req.user.slice(0, 2000)` | ✅ asserção ("o `user` vai inteiro") |
| N16 | `'garanta já'` fora | ✅ asserção (lista literal + 2 `each`) |
| N17 | `'estoque limitado'` fora | ✅ asserção |
| N28 | página com `requiresMaterial: true` fixo | ✅ asserção |
| N12/N13 | diminutivos fora da lista de material | **obsoletos** — `PALAVRAS_DE_MATERIAL` não existe mais (`grep` vazio em `packages/core/src` e `supabase/functions`); A12 retirou a recusa |

**Substituição dos testes de material × AC nova**: confere. A12 diz que a régua **não** recusa nomear o material e que o prompt manda nomeá-lo; os testes que entraram são exatamente isso (`suggestion.test.ts:236-249`, 4 títulos + 1 descrição ⇒ `null`; `prompt.test.ts` "NÃO proíbe nomear o material"; `handlers.test.ts:309` 200 com UMA chamada). Nenhuma régua de outra AC foi afrouxada junto (tom, urgência, exemplo, tetos seguem com os mesmos casos ou mais).

### O buraco do conserto r2 — avaliação

- **(a) `claude.ts` fixado por igualdade de texto impresso.** Prova FORMA, e aqui isso basta: o arquivo ficou sem decisão nenhuma — três linhas de fiação. O mapeamento de `stop_reason` mora em `claudeResult.ts` (testado por comportamento; X18 morto) e o de erro em `claudeError.ts` (testado por comportamento; X16/X17 mortos). A régua de texto impede justamente que uma decisão volte a `claude.ts` sem teste. Mudar `claude.ts` e o literal juntos é a edição consciente que a régua existe para forçar. O que ela não prova: que o SDK honra `create(body, options)` e que a `Message` real tem a forma de `MessageLike` (o `as any` desliga o `tsc`). Conferido à mão no SDK em cache (`@anthropic-ai/sdk@1.3.0`): `StopReason` inclui `'refusal'` e `'max_tokens'`, `OutputConfig.effort` e `format.type: 'json_schema'` existem. **Achado lateral**: `StopReason` também tem `'model_context_window_exceeded'` e `'pause_turn'`; os dois caem no caminho de leitura do JSON (provavelmente `invalid` ⇒ retentativa ⇒ `off_rules`), não em `truncated`. A spec não os cita; risco baixo com Haiku e entrada de ~3k tokens.
- **(b) dublê da hierarquia em `claudeError.test.ts`.** Corresponde ao SDK real: `core/error.d.ts` do 1.3.0 em cache — `APIUserAbortError extends APIError`, `APIConnectionError extends APIError`, `APIConnectionTimeoutError extends APIConnectionError`; e `client.d.ts:410-413` declara as três como estáticas de `Anthropic`, que é o que `claude.ts` passa. O `client.js` lança `APIUserAbortError` no `signal` abortado e `APIConnectionTimeoutError` no estouro por tentativa. `RetryableError` (filha de `AnthropicError`, não de `APIError`) só nasce de middleware, que não é usado — cai no ramo genérico `upstream` de qualquer jeito.
- **(c) A13 e 140/160 nas bordas.** 139/140/160/161 provados (X01 `>=` no teto e X06 `ASK_MIN` 145 mortos; o `<=` do piso foi o V01 da r1). A13: igualdade (X02 `includes` morto pelo inverso "nome CONTIDO passa"), medida depois de `stripBrand` (X07 morto), ordem exemplo→nome provada.
- **(d) `SEO_SYSTEM`.** Constante de módulo, idêntica entre peças (`prompt.test.ts` "é IDÊNTICO…"; X21, nome da peça anexado ao system, morto). Carrega as regras de tom (pt-BR, sem emoji, sem exclamação, sem urgência com exemplos, sem trocadilho, "nada de linguagem festiva", leitor em luto) e as de SEO (≤ 43 sem a marca, palavra-chave no início, nunca igual ao nome, 150–160, benefício + fecho sem urgência, não copiar exemplos). X19 (trocadilho) e X22 (pt-BR) mortos. "nada de linguagem festiva" está no texto mas sem asserção própria (risco baixo).

### Sensor novo (27 mutantes não usados nas r1/r2; 27/27 `SHA_OK`; nenhuma execução com zero arquivos de teste)

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| X01 | `core/seo/suggestion.ts` | `> DESCRIPTION_MAX` → `>=` | ✅ asserção |
| X02 | idem | A13 por `includes` | ✅ asserção |
| X03 | idem | tom medido só na descrição | ✅ asserção |
| X04 | idem | `\p{Extended_Pictographic}` → `\p{Emoji_Presentation}` | ❌ **sobreviveu** |
| X05 | idem | `MARCA_NO_FIM` sem a âncora `$` | ❌ **sobreviveu** |
| X06 | idem | `SUGGESTION_DESCRIPTION_ASK_MIN` 150 → 145 | ✅ asserção |
| X07 | idem | A13 medida antes de `stripBrand` | ✅ asserção |
| X08 | `seo-suggest/handlers.ts` | descrição devolvida sem aparar (SIA-15) | ✅ asserção |
| X09 | idem | `inputTokens =` em vez de `+=` (SIA-26) | ✅ asserção |
| X10 | idem | teto por constante em vez de por conta | ✅ asserção |
| X11 | idem | `sobra <= 5 s` | ✅ asserção (caso "exatamente 5 s") |
| X12 | idem | `ms: 0` no log | ✅ asserção |
| X13 | idem | `truncated` tratado como reprovada (retenta) | ✅ asserção |
| X14 | idem | `requiresMaterial: !!b.requiresMaterial` | ❌ **sobreviveu** |
| X15 | idem | nome de 200 recusado (`>=`) | ✅ asserção |
| X16 | `_shared/claudeError.ts` | ramo do aborto apagado (cai no `APIError` com status) | ✅ asserção |
| X17 | idem | `status ?? null` (string passa) | ✅ asserção |
| X18 | `_shared/claudeResult.ts` | lê `content[0]` em vez do bloco `text` | ✅ asserção |
| X19 | `seo-suggest/prompt.ts` | linha do trocadilho fora do system | ✅ asserção |
| X20 | idem | `dado` sem trocar `<`/`>` (fecho do delimitador) | ✅ asserção |
| X21 | idem | nome da peça no system (deixa de ser estável) | ✅ asserção |
| X22 | idem | linha do pt-BR fora | ✅ asserção |
| X23 | `useSeoSuggestion.ts` | nova sugestão não apaga o desfazer (SIA-12) | ✅ asserção |
| X24 | idem | desfazer não some depois de usado | ✅ asserção |
| X25 | `requestSeoSuggestion.ts` | 503 sem corpo deixa de virar `not_configured` | ✅ asserção |
| X26 | `SeoPreview.tsx` | selo "automático" sem aparar | ✅ asserção |
| X27 | `useSeoSuggestion.ts` | `cancel` ignora `desligado` | ⚪ **equivalente** — `desligado` só liga na chegada da resposta, quando `emVoo` já é `false`, e `suggest` sai cedo com ele ligado; `cancel` com `emVoo` verdadeiro implica `desligado` falso |

**27 injetados: 23 mortos por asserção, 0 por compilação, 3 sobreviventes, 1 equivalente.** Mais os 8 da r2 reinjetados: 8/8 por asserção.

Os três sobreviventes:
- **X04** (A7, "sem emoji"): os casos usam `✨` e `💛`, que são de apresentação emoji. Um emoji de apresentação de texto (`❤` U+2764 sem seletor, `☀`, `✝`) não tem caso; a régua de hoje (`Extended_Pictographic`) o recusa, mas trocá-la passa.
- **X05** (edge case "a marca no fim é removida"): o inverso "não toca na marca no meio" usa a marca **sem** `|` ("Sobre a Uma Estrelinha e o ateliê"), que nunca casaria o padrão; com `|` no meio ("Pingente | Uma Estrelinha para mães") não há caso — inverso verdadeiro nos dois mundos.
- **X14** (SIA-10 / validação de entrada): `requiresMaterial: "false"` (string) viraria `true`. O painel sempre manda booleano (N28 prova), então o efeito só existe para um chamador fora do painel, que já precisaria ser admin. Risco baixo.

### Gates (um workspace por vez, `--testTimeout=20000` sem `--`, exit fora de pipe; árvore restaurada antes)

| Workspace | Esperado | Medido | Exit |
| --- | --- | --- | --- |
| core | 4767/186 | **4767/186** | 0 |
| functions | 1228/33 | **1228/33** | 0 |
| backoffice | 4107/235 | **4107/235** | 0 |
| store | 6168/330 | **6168/330** | 0 |
| `tsc` backoffice | 0 | **0** | 0 |

### Ranked gaps

1. **T13 em aberto** — prova em navegador (390×844 e 1440: publicar sem SEO, prévia derivada, sugerir/desfazer, falha e limite interceptados, sem rolagem horizontal) e probe contra a Anthropic real (5 peças, p95 ≤ 15 s, `usage`). São Success Criteria da spec; a T13 também é quem mede a taxa de `off_rules` com A3 (140–160) e A13 na saída real do Haiku.
2. **X04** — um caso de emoji de apresentação de texto (`❤`, `☀`) em `memorialToneRefusal`. *Done when*: X04 morre.
3. **X05** — um inverso com `|` e a marca no meio do título. *Done when*: X05 morre.
4. **X14** — um caso de `parseBody` com `requiresMaterial: "true"`/`1` ⇒ `false` no prompt (ou 400). *Done when*: X14 morre.
5. **`stop_reason` `model_context_window_exceeded`/`pause_turn`** — sem tratamento explícito; decidir se viram `truncated` (achado lateral, fora da letra da spec).

### O que NÃO foi provado

- Nada em navegador real nesta rodada (layout, foco, `aria-live`, 390/1440).
- Nada contra a API real da Anthropic: forma real da `Message`, latência, aceitação do `output_config.format`/`effort` pelo `claude-haiku-5-5`, comportamento do SDK sob o `signal` — conferido só pela leitura do SDK em cache e pelo `deno check` do conserto r2.
- Nada no Supabase hospedado (restrição do usuário).
