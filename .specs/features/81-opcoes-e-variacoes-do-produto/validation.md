# 81 — Validação (Verificador independente)

## Rodada 1 — **FAIL** (cobertura; nenhum defeito de produto no código de hoje)

**Data**: 2026-10-26
**Spec**: `.specs/features/81-opcoes-e-variacoes-do-produto/spec.md` (OPV-01..28)
**Diff**: working tree sobre `fc2b3b60` (branch `feat/81-opcoes-e-variacoes-do-produto`, sem commit) —
`git diff HEAD --stat -- apps/backoffice/src`: 16 arquivos, +1063 / −819, mais 13 arquivos novos
(`gridSync`, `orphans`, `optionLibrary`, `useOptionLibrary`, `VariantImagePicker`, testes e a página
`AdminProductFormPage.variacoes.test.tsx`). O mesmo stat foi conferido **antes e depois** do sensor.
**Verificador**: sub-agente independente (autor ≠ verificador). Não escrevi este código e não consertei
nada.

### Veredito curto

O código de hoje faz o que a spec pede em todos os casos que exercitei, inclusive nos três cenários
novos que montei pela página real (abaixo). A rodada **reprova por cobertura**: 3 dos 32 mutantes
sobreviveram, os três **na fiação da página** (`AdminProductFormPage.tsx`, `handleOptionsChange`), e cada
sobrevivente tem consequência concreta que reproduzi com uma sonda pela página real. Há ainda uma lacuna
de texto (OPV-17: "eixos" visível no card "Opções" do formulário) e a prova de layout de OPV-28, que é
de navegador e ainda não existe.

---

## Tarefas

| Task | Status | Nota |
| --- | --- | --- |
| T01..T10 | ✅ marcadas feitas no `tasks.md` | conferido o que cada "Done when" pede contra os arquivos e testes |
| Prova em navegador (`prova-navegador.md`) | ⏳ não existe | prevista para depois do Verificador (orquestração); OPV-28 e o Success Criterion 3 dependem dela |

---

## Gate (Build) — medido nesta rodada, um workspace por vez, exit fora de pipe

| Medida | Resultado | Exit | Baseline de entrada (`baseline.md`) | Fim da Fase 3 (`baseline.md`) |
| --- | --- | --- | --- | --- |
| Testes backoffice | **3808 em 218**, todos verdes | 0 | 3706/211 | 3808/218 ✅ igual |
| Testes store | **5754 em 314**, todos verdes | 0 | 5754/314 | 5754/314 ✅ igual |
| `tsc -p apps/backoffice/tsconfig.app.json` | **0** erros | 0 | 0 | 0 ✅ |
| `eslint .` em `apps/backoffice` | **23 erros / 5 warnings** (nenhum em arquivo da 81) | 1 | 23/5 | 23/5 ✅ |
| `pnpm --filter @estrelinha/backoffice build` | verde | 0 | — | verde ✅ |

Comandos: `pnpm --filter @estrelinha/<ws> test --testTimeout=20000` (sem `--`). Delta da feature:
**backoffice +102/+7**, store 0. As quedas declaradas no `baseline.md` (−16 do "Regerar", −14 de
`VariantImageCard.test.tsx` com 9 casos movidos sem alteração) batem com os arquivos: os casos de
`clearMissingVariantImages`/`StorefrontPreview` estão em `lib/variantImages.test.ts` e
`ui/StorefrontPreview.test.tsx`; o "toKeep pelo objeto" e "órfã nunca apagada às cegas" estão em
`gridSync.test.ts:118-162`. Nenhuma asserção antiga afrouxada que eu tenha encontrado: as de
`OptionsEditor.test.tsx` passaram a exigir também a mudança tipada.

---

## Critérios de aceite — checagem ancorada na spec

Legenda: ✅ a asserção mira o valor da spec · ⚠️ lacuna (spec-precision ou cobertura) · ⏳ só navegador

| AC | O que a spec define | Evidência (`arquivo:linha` — asserção) | Resultado |
| --- | --- | --- | --- |
| OPV-01 | valor acrescentado cria as combinações novas no mesmo gesto | `gridSync.test.ts:98-115` (2 opções +1 valor ⇒ +2 linhas, posições `[2,3]`); página real `AdminProductFormPage.variacoes.test.tsx:200-222` (2 linhas sem clicar em gerar, `queryByText(/Regerar/)` nulo) | ✅ (M01 morto) |
| OPV-02 | `is_active=true`, `price`/`compare_price`/`weight_kg` padrão ou `null` se 0, `stock=0`, `sku=null`, `image_url=null` | `gridSync.test.ts:63-96` (`toMatchObject` com os sete campos; padrão zero ⇒ `toBeNull()` nos três); página `:210-218` (89,90 · 120,00 · 50 g · 0 · SKU vazio) e `:224-248` (payload do insert) | ✅ (M01, M02, M27, M28 mortos) |
| OPV-03 | linha que fica é o mesmo objeto | `gridSync.test.ts:127` — `expect(r.variants[0]).toBe(original)` | ✅ (M03 morto) |
| OPV-04 | órfã com id real passa pela consulta; vendida ou consulta falhada ⇒ pausada e nomeada; sem pedido ⇒ sai | `orphans.test.ts:24-53`; página `:264-327` (literal "Estas variações já foram vendidas e ficaram pausadas: 3,5 cm.", `aria-checked=false`, nenhum `delete`) | ✅ (M05, M06, M31 mortos) |
| OPV-05 | renomear: linhas passam ao nome novo, nenhuma criada/removida | `gridSync.test.ts:164-179` (unidade) | ⚠️ **lacuna de fiação**: na página, o rename de um produto **carregado** não tem caso — mutante **M29 sobreviveu** (ver G1) |
| OPV-06 | nova opção: linhas existentes ganham o 1º valor; resto nasce por OPV-02 | `gridSync.test.ts:182-210` | ✅ (M14 morto) |
| OPV-07 | remover opção: 1ª linha de cada combinação sobrevive sem a chave | `gridSync.test.ts:254-279` | ✅ (M17 morto) |
| OPV-08 | abrir o produto não mexe na grade nem suja o formulário | página `:184-196` (grade divergente intacta, sem "Alterações não salvas", zero consultas) | ✅ (M04 — sincronizar num efeito da carga — morto) |
| OPV-09 | mudança sem mudar o cruzamento ⇒ mesma referência | `gridSync.test.ts:289-311` (`toBe(variants)` em move, opção vazia, nome sem valores, no-op) | ✅ (M16 morto) |
| OPV-10 | "Regerar" e diálogo saem; estado vazio com a frase nova | `VariantsTable.test.tsx:338-378` (literal exato; nenhum `/regerar/i`, nenhum `dialog`) | ✅ |
| OPV-11 | botão 48×48 (`h-12 w-12`), miniatura ou marcador, nome "Imagem de <variação>" | `VariantImagePicker.test.tsx:50-68`; `VariantsTable.test.tsx:381-394` (por token exato, dentro da linha) | ✅ (M09 morto) |
| OPV-12 | modal com todas as imagens na ordem da galeria, "Usar a principal", atual marcada | `VariantImagePicker.test.tsx:72-102` | ✅ |
| OPV-13 | escolher atualiza `image_url` (`null` para principal) e fecha | `VariantImagePicker.test.tsx:104-123`; `VariantsTable.test.tsx:396-422` (só aquela linha) | ✅ (M19, M26 mortos) |
| OPV-14 | "Adicionar imagens" pelo motor da galeria; fotos na galeria; a 1ª escolhida | `VariantImagePicker.test.tsx:181-198`; página `:388-431` (foto na aba Mídia, `images` e `image_url` no payload) | ✅ (M18 morto) |
| OPV-15 | salvar desabilitado durante o envio; falha ⇒ frase de `uploadFailureMessage` | `VariantImagePicker.test.tsx:200-238` (literais do motor real); página `:402` (`toBeDisabled()`) | ✅ (M10, M20 mortos) |
| OPV-16 | card "Imagem por variação" sai | página `:381-386` | ✅ |
| OPV-17 | "Nome da opção", "Valores", "Adicionar opção", "N de 3 opções"; **nenhum texto do editor usa "eixo"** | `OptionsEditor.test.tsx:259-319` (literais e varredura de texto/aria/title/placeholder do componente) | ⚠️ **G4**: o card que embrulha o editor no formulário ainda diz **"Os eixos de escolha do produto. Máximo de 3."** (`AdminProductFormPage.tsx:761`). A grade rápida tem asserção de ausência de "eixo" na página (`AdminQuickGridPage.test.tsx:255`); o formulário do produto não tem |
| OPV-18 | nomes do catálogo, pela dobra, na ordem de A2, texto livre mantido | `optionLibrary.test.ts:21-63, 111-132`; `OptionsEditor.test.tsx:322-415` | ✅ (M13, M22 mortos) |
| OPV-19 | nome conhecido sem valores ⇒ chips + "Usar os N valores"; clique acrescenta | `OptionsEditor.test.tsx:417-485` (ordem do catálogo, `onChange` com a mudança tipada; nada sem clique) | ✅ (M21 morto). `SPEC_DEVIATION` declarado: com 1 valor, "Usar o valor" |
| OPV-20 | valores conhecidos que casam e ainda não estão na opção | `optionLibrary.test.ts:134-152`; `OptionsEditor.test.tsx:487-541` | ✅ (M30 morto) |
| OPV-21 | leitura falha/ausente ⇒ texto livre sem erro | `useOptionLibrary.test.ts:131-151`; `OptionsEditor.test.tsx:543-567`; `AdminQuickGridPage.test.tsx:268-271` | ✅ |
| OPV-22 | salvar produto ⇒ sugestões refletem na próxima abertura | `useOptionLibrary.test.ts:154-174` (chave sob o pool; `invalidarPoolDeProdutos` faz reler) + quem grava já invalida o pool (`useAdminProducts.ts:68-80`, coberto desde a `51`) | ✅ (M24, M25 mortos) |
| OPV-23 | nome duplicado: aviso na segunda; grade não reconcilia | `gridSync.test.ts:314-353`; `OptionsEditor.test.tsx:569-591` (literal, no cartão da 3ª) | ✅ (M15, M23 mortos) |
| OPV-24 | nome apagado não custa linhas | `gridSync.test.ts:355-393` | ✅ unidade |
| OPV-25 | resposta aplicada por **id** sobre a grade atual | `orphans.test.ts:65-79`; página `:330-370` | ⚠️ **lacuna**: nenhum caso em que a grade **mude de forma** (linha anterior saindo) entre a pergunta e a resposta — mutante **M07 (por índice) sobreviveu** (ver G2) |
| OPV-26 | sem imagens: só "Usar a principal", "Adicionar imagens" e a frase | `VariantImagePicker.test.tsx:137-153` | ✅ |
| OPV-27 | imagem removida da galeria ⇒ linha volta à principal | página `:433-454` | ✅ |
| OPV-28 | alvo ≥ 44px; grade rola no próprio contêiner em 390 | `VariantImagePicker.test.tsx:125-135` e `VariantsTable.test.tsx:424-428` (tokens) | ⏳ a metade de layout é de navegador (`prova-navegador.md` não existe ainda) |

Assunções `n — confirmar` (A1..A9) seguem não confirmadas pelo usuário; o código implementa os defaults.

---

## Sensor de discriminação

**Método**: 32 mutações de comportamento injetadas nos **arquivos reais**, uma por vez, com o arnês
`mut.py` (scratchpad): o alvo tem de aparecer **exatamente uma vez** (senão o arnês lança, para mutação
não virar no-op), roda o vitest só dos arquivos que cobrem o mutado (sempre incluindo a página real
quando a mutação a alcança), restaura o arquivo e **confere o SHA-256** contra o original (assert no
arnês; nenhuma falha). Morte por **compilação** foi procurada no log (`Transform failed`, `SyntaxError`,
`Failed to parse`): **nenhuma** — as 29 mortes são por asserção.

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| M01 | `gridSync.ts:228` | linha nova nasce **pausada** | ✅ morto — asserção (7 casos) |
| M02 | `gridSync.ts:216` | padrão 0 **não** vira `null` (`>= 0`) | ✅ morto — asserção |
| M03 | `gridSync.ts:205` | `toKeep` recriado (`{ ...variant }`) | ✅ morto — asserção (`toBe(original)`) |
| M04 | `AdminProductFormPage.tsx` | `useEffect` que sincroniza na abertura do produto | ✅ morto — asserção (OPV-08 na página) |
| M05 | `orphans.ts:34` | vendida apagada (veredito ignora `orders > 0`) | ✅ morto — asserção (4) |
| M06 | `orphans.ts:53` | `pause` tratado como `remove` | ✅ morto — asserção (5) |
| **M07** | `AdminProductFormPage.tsx:255` | resposta aplicada **por índice** (posição na grade do momento da pergunta) em vez de id | ❌ **SOBREVIVEU** (71/71) |
| M08 | `orphans.ts:46` | veredito de id ausente não ignorado | ✅ morto — asserção |
| M09 | `VariantImagePicker.tsx:99` | botão `h-10 w-10` em vez de `h-12 w-12` | ✅ morto — asserção (2) |
| M10 | `VariantImagePicker.tsx:62` | envio sem `onUploadingChange` | ✅ morto — asserção (3, inclusive a página) |
| M11 | `OptionsEditor.tsx:328` | "eixos" de volta no `title` do teto | ✅ morto — asserção |
| M12 | `OptionsEditor.tsx:409` | "eixo" de volta no `aria-label` de remover | ✅ morto — asserção |
| M13 | `optionLibrary.ts:72` | biblioteca **sem agrupar grafias** (chave = nome cru) | ✅ morto — asserção (3) |
| M14 | `gridSync.ts:158` | OPV-06 com o **último** valor | ✅ morto — asserção |
| M15 | `gridSync.ts:71` | nome duplicado não pula | ✅ morto — asserção (3) |
| M16 | `gridSync.ts:89` | `move` ignorado no refletido | ✅ morto — asserção (2) |
| M17 | `gridSync.ts:121` | colisão de `removeOption` sem preservar a 1ª | ✅ morto — asserção (2) |
| M18 | `VariantImagePicker.tsx:82` | escolhe a **última** enviada | ✅ morto — asserção |
| M19 | `VariantImagePicker.tsx:57` | escolher não fecha o modal | ✅ morto — asserção (2) |
| M20 | `VariantImagePicker.tsx:85` | falha com frase genérica | ✅ morto — asserção (2) |
| M21 | `OptionsEditor.tsx:460` | "Usar os N valores" acrescenta só o 1º | ✅ morto — asserção |
| M22 | `OptionsEditor.tsx:77` | Enter sem descer na lista troca o texto pela sugestão | ✅ morto — asserção |
| M23 | `OptionsEditor.tsx:49` | aviso de nome repetido nunca aparece | ✅ morto — asserção |
| M24 | `useOptionLibrary.ts:22` | chave da biblioteca fora do pool | ✅ morto — asserção (2) |
| M25 | `useOptionLibrary.ts:57` | leitura ordenada por `name` em vez de `id` | ✅ morto — asserção |
| M26 | `VariantsTable.tsx` (célula de imagem) | imagem escolhida grava na linha 0 | ✅ morto — asserção |
| M27 | `AdminProductFormPage.tsx:224` | preço "de" padrão zerado | ✅ morto — asserção (2) |
| M28 | `AdminProductFormPage.tsx:225` | peso padrão zerado | ✅ morto — asserção (2) |
| **M29** | `AdminProductFormPage.tsx:213` | o refletido **nunca recomeça** das opções carregadas (`if (false)`) | ❌ **SOBREVIVEU** (71/71) |
| M30 | `optionLibrary.ts:121` | valores em ordem alfabética | ✅ morto — asserção (3) |
| M31 | `AdminProductFormPage.tsx:260` | aviso das pausadas substitui em vez de acumular | ✅ morto — asserção |
| **M32** | `AdminProductFormPage.tsx:252` | órfã que voltou ao cruzamento **não** é liberada do conjunto de conferidas | ❌ **SOBREVIVEU** (71/71) |

**Resultado: 32 injetados · 29 mortos por asserção · 0 por compilação · 3 sobreviventes — FAIL.**

### A consequência de cada sobrevivente, reproduzida pela página real

Para separar "mutante equivalente" de "lacuna", escrevi três sondas num arquivo temporário (cópia do
arnês de `AdminProductFormPage.variacoes.test.tsx`), rodei contra o código de hoje (**3/3 verdes**) e
contra cada mutante (**cada uma reprova só no seu**), e apaguei o arquivo (`git status` sem ele). As
sondas não ficaram no repositório — viram tarefa de conserto.

- **M29 → G1 (OPV-05 na página).** Produto salvo com `Tamanho: 3,5 cm, 4,5 cm` e linhas `v1`, `v2`;
  a Adri troca o nome para "Medida". Com o mutante, o refletido começa do formulário **vazio** de antes
  da carga, `rekey` trata "Medida" como opção nova e dá a **toda** linha `Medida: 3,5 cm` ao lado de
  `Tamanho` — todas viram órfãs: as sem pedido somem (preços e SKUs digitados perdidos), as vendidas
  ficam pausadas, e linhas novas nascem com os padrões. A suíte não vê porque nenhum caso da página
  renomeia (nem troca valores de forma que dependa do refletido) num produto **carregado**: todos os
  casos de remover valor passam com o refletido errado, porque `diffGrid` acerta a remoção com ou sem
  ele. Sonda S1: `linhasDaGrade()` = `['v1','v2']`, zero consultas, `SKU-v1` mantido.
- **M07 → G2 (OPV-25).** Linhas `v1 (3,5)`, `v2 (4,5)`, `v3 (5,5)`. Remove 4,5 cm (consulta de `v2`
  fica no ar); remove 3,5 cm (`v1` sem pedido sai); a consulta de `v2` responde 0. Correto: sobra
  `['v3']`. Com o mutante (veredito pela **posição** que `v2` tinha), o veredito de remoção cai em
  `v3` — uma linha **que continua no cruzamento** some, e `v2` (órfã) fica. Os dois casos de OPV-25 da
  página só mudam a grade sem mudar a posição da órfã, e por isso são verdadeiros nos dois mundos.
- **M32 → G3 (OPV-04/25, o conjunto de conferidas).** Remove 4,5 cm (consulta de `v2` no ar);
  acrescenta 4,5 cm de volta (a resposta chega com `v2` de novo no cruzamento: nem sai nem pausa —
  isso está provado em `:331-350`); remove 4,5 cm **de novo**. Correto: `v2` é consultada outra vez e
  sai (`['v1']`). Com o mutante, `v2` continua no conjunto de conferidas, não é perguntada, e fica na
  grade como órfã **ativa** fora do cruzamento — e iria ao banco assim no salvar. Nenhum caso faz a
  terceira volta.

---

## Lacunas, ranqueadas

1. **G1 — OPV-05 sem prova na página (M29).** O reinício do refletido quando as opções chegam por fora
   (carga, releitura pós-salvar, rascunho) é o que impede o rename de um produto existente de apagar
   a grade inteira, e nenhum teste o exercita. `AdminProductFormPage.tsx:213-217`.
2. **G2 — OPV-25 por id só provado com a posição parada (M07).** `AdminProductFormPage.tsx:250-258`
   (a fiação) e `orphans.test.ts:65-79` (a unidade tem linha inserida no fim, nunca removida antes).
3. **G3 — liberar a órfã que voltou ao cruzamento (M32).** `AdminProductFormPage.tsx:248-253`.
4. **G4 — OPV-17, "eixos" visível no formulário do produto.** `AdminProductFormPage.tsx:761`:
   `description="Os eixos de escolha do produto. Máximo de 3."`, logo acima do editor. A régua de
   OPV-17 está no componente, e a página do produto não tem a asserção que a grade rápida tem.
   Lacuna de spec-precision ("texto do editor" × texto do card que o embrulha); a decisão do usuário
   (A — "Nome da opção") aponta para tirar a palavra também dali.
5. **G5 — OPV-28 e Success Criterion 3 dependem de navegador** (390×844 e 1440: botão 48px, modal,
   envio, grade sem rolagem do `body`). Esperado pela orquestração; registrado para não ser lido como
   coberto.

Observações sem lacuna (não reprovam, registro):

- `VariantImagePicker.handleFiles` não trata uma **rejeição** de `uploadProductImages` (o `finally`
  libera o salvar, mas a promessa rejeitada não vira mensagem). Hoje o motor devolve `failed` por
  arquivo em vez de lançar, então o ramo não é alcançável pelo motor atual.
- Esvaziar todos os valores de uma opção de um produto com 2 opções descarta as linhas (viram órfãs) e
  recria as combinações restantes com os padrões, perdendo preços digitados. Está dentro da letra de
  OPV-04 (a linha "usava o valor"), mas é o caso que A5 tenta evitar para `removeOption`; vale uma
  pergunta ao usuário, não um conserto.

---

## Tarefas de conserto propostas (não executadas — "não conserte nada")

| Fix | O quê | Onde | Pronto quando |
| --- | --- | --- | --- |
| F1 (G1) | Caso pela página real: produto carregado com opção e linhas; renomear a opção ⇒ mesmas linhas, mesmos SKUs/preços, zero consultas a `order_items`. Idealmente também: salvar, e depois renomear (o refletido recomeça da releitura) | `AdminProductFormPage.variacoes.test.tsx` | M29 reinjetado morre por asserção |
| F2 (G2) | Caso em que uma linha **anterior** à órfã sai antes da resposta (o cenário de S2), na página; e o par em `orphans.test.ts` com remoção antes da órfã | idem + `orphans.test.ts` | M07 morre por asserção |
| F3 (G3) | Caso de remover → devolver (resposta no ar) → remover de novo ⇒ segunda consulta e a linha sai | página | M32 morre por asserção |
| F4 (G4) | Tirar "eixos" da descrição do card "Opções" e acrescentar a asserção de ausência na página do produto, molde de `AdminQuickGridPage.test.tsx:255` | `AdminProductFormPage.tsx:761` + teste | asserção reprova com a frase de hoje e passa com a nova |
| F5 (G5) | `prova-navegador.md` em 390×844 e 1440 | — | medido |

---

## Qualidade de código

| Princípio | Status |
| --- | --- |
| Código mínimo / sem escopo a mais | ✅ — `suggestOptionNames`/`suggestOptionValues` e `orphanVerdict` são pequenos e têm leitor |
| Mudança cirúrgica | ✅ — fora do escopo só os testes que dependiam do rótulo e da assinatura antigos |
| Segue os padrões | ✅ — client injetável e `readAllPages` (molde `useProductPool`), `string | null`/literais de string, `dobrarTexto` reusado, chave sob `PRODUCT_POOL_KEY` |
| Asserções miram o valor da spec | ✅ nas unidades; ⚠️ na fiação da página (G1..G3) |
| Testes mapeiam ACs | ✅ — cada `describe` nomeia o OPV |
| Diretrizes | `CLAUDE.md` raiz (guardas, baselines, "teste não monta a árvore que prova"), `apps/backoffice/CLAUDE.md` |

Os `SPEC_DEVIATION` declarados no código (`gridSync.ts:186-199`: corte da chave em `removeOption` mesmo
pulado, e refletido estrutural quando pula; `OptionsEditor.tsx:462`: "Usar o valor") são razoáveis e
estão provados por teste (`gridSync.test.ts:374-393`, `OptionsEditor.test.tsx:481-484`).

---

## Rastreabilidade (proposta — spec não editada)

| Requisito | Novo status |
| --- | --- |
| OPV-01..04, 06..16, 18..24, 26, 27 | ✅ Verificado |
| OPV-05 | ❌ Precisa de prova na página (G1) |
| OPV-25 | ❌ Precisa de prova com a grade encolhendo (G2, G3) |
| OPV-17 | ⚠️ "eixos" no card do formulário (G4) |
| OPV-28 | ⏳ navegador (G5) |

**Lições**: registradas à mão em `.specs/LESSONS.md` como candidatas (L-068, L-069) — a memória do
projeto manda não rodar `lessons.py` (o `list` reescreve o store).

---

## Conserto da rodada 1 (autor, 2026-10-26)

Feito pelo autor sobre as lacunas G1..G5 acima. **Não é a rodada 2**: o Verificador independente
ainda precisa correr sobre este conserto. Sem commit (decisão do usuário).

### O que mudou

| Lacuna | Tipo | Conserto | Onde |
| --- | --- | --- | --- |
| G1 (M29) | cobertura | caso pela página real: produto carregado com `Tamanho: 3,5 cm, 4,5 cm` e linhas `v1`/`v2`, renomear para "Medida" ⇒ as mesmas linhas, SKUs e preços (61,00 · 72,00), **zero** consultas a `order_items`; e o salvar leva `option_values` com `Medida` e sem `Tamanho`, sem `insert` nem `delete` de linha | `AdminProductFormPage.variacoes.test.tsx` |
| G2 (M07) | cobertura | caso pela página: `v1, v2, v3`; remove 4,5 (consulta de `v2` no ar); remove 3,5 (`v1` responde 0 e sai, grade `['v2','v3']`); `v2` responde 0 ⇒ sobra `['v3']`, ativa, `SKU-v3`. E o par de unidade em `orphans.test.ts`: a linha anterior à órfã já saiu — o veredito `remove` e o `pause` alcançam a órfã, e a vizinha que herdou a posição volta como o **mesmo objeto** | idem + `features/product-form/model/orphans.test.ts` (+2) |
| G3 (M32) | cobertura | caso pela página: remover 4,5 (consulta no ar) → devolver 4,5 → resposta 0 (`v2` fica) → remover 4,5 **de novo** ⇒ segunda consulta (`['v2','v2']`) e `v2` sai (`['v1']`) | `AdminProductFormPage.variacoes.test.tsx` |
| G4 | spec-precision | teste antes: "nenhum texto da aba usa 'eixo'" pela página **reprovou** com a frase de então (`expected <p …(1)></p> to be null`); depois a descrição do card "Opções" virou **"As escolhas da peça, como tamanho ou acabamento. Até 3 opções."** e o caso passou | `AdminProductFormPage.tsx` (card "Opções") + teste |
| G5 | navegador | `prova-navegador.md`, em 390×844 e 1440×900 contra o banco local. **Achou um defeito**: em 390 o body rolava na horizontal (`scrollWidth` 851) porque os `<input>` escondidos do `Switch` do Radix (absolutos) escapavam do `overflow-x-auto`. Anterior à `81` (igual em `HEAD`), mas é a letra de OPV-28. Teste antes (token `relative` no contêiner, reprovou), conserto (`relative overflow-x-auto`), remedido no código servido: 390 e `scrollX` 0 | `VariantsTable.tsx` + `VariantsTable.test.tsx` (+1) |

### Sensor — os três sobreviventes reinjetados

Arnês próprio (scratchpad `mut/mut.py`): o alvo tem de aparecer **exatamente uma vez** (senão lança),
roda o vitest da página real e de `orphans.test.ts`, restaura e **confere o SHA-256** do
`AdminProductFormPage.tsx` (`9ebd3ef1…5da86c5da`, igual ao original nas três restaurações). Morte por
compilação procurada no log (`Transform failed`, `SyntaxError`, `Failed to parse`): nenhuma.

| # | Mutação reinjetada | Resultado | Asserção que matou |
| --- | --- | --- | --- |
| M29 | `if (form.options !== lastEmitted.current)` → `if (false)` | ✅ morto — asserção (1 caso, G1) | `expected [ 'tmp-4', 'tmp-5' ] to deeply equal [ 'v1', 'v2' ]` |
| M07 | a resposta aplicada pela **posição** que a órfã tinha na grade do momento da pergunta | ✅ morto — asserção (1 caso, G2) | `expected [ 'v2' ] to deeply equal [ 'v3' ]` |
| M32 | `if (back) checkedOrphans.current.delete(verdict.id)` apagado | ✅ morto — asserção (1 caso, G3) | `expected [ 'v1', 'v2' ] to deeply equal [ 'v1' ]` |

O par de G2 em `orphans.test.ts` **não** mata o M07, e não pode: o M07 mora na página
(`applyOrphanChecks` só recebe ids). Ele está lá pelo que a lacuna pediu — a unidade passar a ter o
caso em que a remoção acontece **antes** da órfã.

### Gate (Build) — medido depois do último conserto, um workspace por vez, exit fora de pipe

| Medida | Resultado | Exit | Fim da Fase 3 |
| --- | --- | --- | --- |
| Testes backoffice | **3815 em 218**, todos verdes | 0 | 3808/218 (+7: página +4, `orphans` +2, `VariantsTable` +1) |
| Testes store | **5754 em 314**, todos verdes | 0 | 5754/314 |
| `tsc -p apps/backoffice/tsconfig.app.json` | **0** | 0 | 0 |
| `eslint .` em `apps/backoffice` | **23 / 5** | 1 | 23/5 |
| `pnpm --filter @estrelinha/backoffice build` | verde | 0 | verde |

Nenhuma asserção antiga tocada; nenhum teste removido.

### Observações novas, não consertadas (fora do escopo, registradas)

- **Abrir um produto com descrição em HTML com entidades suja o formulário** ("Alterações não
  salvas" e rascunho em `sessionStorage`) sem nenhum toque: o TipTap normaliza a descrição na
  montagem e emite `onChange`. A grade **não** é tocada (72 linhas idênticas ao banco, conferido
  linha a linha) — OPV-08 da `81` está de pé —, e `RichTextEditor.tsx` não tem diff nesta branch.
  Afeta qualquer produto importado da Nuvemshop; merece conserto próprio.
- **O X de fechar do `DialogContent` compartilhado mede 16×16** (abaixo de 44). Primitivo de
  `packages/ui`, usado por 15 diálogos; `Esc` e o toque fora também fecham.

### Rastreabilidade (proposta, depois do conserto)

| Requisito | Status |
| --- | --- |
| OPV-05 | ✅ provado na página (M29 morto) |
| OPV-25 | ✅ provado com a grade encolhendo e com a terceira volta (M07, M32 mortos) |
| OPV-17 | ✅ sem "eixo" no card do formulário, com asserção na página |
| OPV-28 | ✅ medido em navegador (390 e 1440), depois do conserto do contêiner |
| Success Criterion 3 | ✅ imagem escolhida e enviada pela linha, em 390 e 1440 |

---

## Rodada 2 — **FAIL** (cobertura; nenhum defeito de produto no código de hoje)

**Data**: 2026-10-26
**Spec**: `spec.md` na versão atual (OPV-01..28, com OPV-04, OPV-19, OPV-20, A1 e A2 reescritos pelas três
decisões do QA)
**Diff**: working tree sobre `fc2b3b60`, sem commit — `git diff HEAD --stat -- apps/backoffice/src`:
18 arquivos, +1259 / −828, mais os arquivos novos. O mesmo stat conferido antes e depois do sensor.
**Verificador**: sub-agente independente (autor ≠ verificador), rodada 2. Não escrevi este código e não
consertei nada. Escopo: a feature inteira, com o foco no que mudou depois da rodada 1 — os consertos
G1..G4, o contêiner `relative` da grade, os 4 bugs consertados no QA e as 3 decisões.

### Veredito curto

O código de hoje faz o que a spec pede em todos os casos que exercitei, inclusive em duas sondas novas
(abaixo). Os consertos da rodada 1 se sustentam (os 3 sobreviventes reinjetados morrem), os 4 consertos
do QA têm régua, e as três decisões estão provadas no essencial. A rodada **reprova por cobertura**:
4 dos 38 mutantes sobreviveram, e um deles está na fiação da tela principal — a página do produto pode
deixar de entregar a biblioteca ao editor e nenhuma sugestão aparece, com a suíte verde.

### Gate (Build) — um workspace por vez, exit fora de pipe

| Medida | Resultado | Exit | Referência |
| --- | --- | --- | --- |
| Testes backoffice (`pnpm --filter @estrelinha/backoffice test --testTimeout=20000`) | **3836 em 218**, todos verdes | 0 | 3815/218 depois do conserto da r1; +21 do QA e das decisões (relatório do QA: 3836) ✅ |
| Testes store (idem) | **5754 em 314**, todos verdes | 0 | 5754/314 ✅ |
| `tsc -p apps/backoffice/tsconfig.app.json` | **0** | 0 | 0 ✅ |
| `tsc -p apps/store/tsconfig.app.json` | **0** | 0 | 0 ✅ |
| `eslint .` backoffice | **23 / 5**, nenhum em arquivo da 81 | 1 | 23/5 ✅ |
| `eslint .` store | **2 / 2** | 1 | 2/2 ✅ |
| `pnpm --filter @estrelinha/backoffice build` · store build | verdes | 0 · 0 | ✅ |

Nenhum teste removido nesta rodada além das quedas já declaradas no `baseline.md`; não achei asserção
antiga afrouxada nos arquivos que o QA tocou (os casos novos só acrescentam; a fixture de
`gridSync.test.ts` "acrescentar um valor cria SÓ as combinações novas" passou a ter posições 0 e 1 e a
asserção `[2, 3]` ficou — é um aperto, não um afrouxamento, porque com duas linhas em 0 a régua velha
aceitava a numeração por contagem).

### Critérios de aceite — o que mudou desde a rodada 1

As linhas da rodada 1 que não mudaram continuam valendo (conferidas de novo pelos mutantes R07, R29,
R32). Abaixo, só o que é novo ou mudou de texto.

| AC | O que a spec define agora | Evidência | Resultado |
| --- | --- | --- | --- |
| OPV-04 (decisão 3) | vendida pausada; literal com "Continuam pausadas mesmo que o valor volte às opções; para vender de novo, ligue “Ativa” na linha da grade."; o valor que volta **não** religa | `AdminProductFormPage.variacoes.test.tsx:274-286` (literal exato), `:311-328` (devolver: `aria-checked=false` e o literal inteiro de novo) | ✅ N31, N32, N33 mortos |
| OPV-05 / OPV-25 (G1..G3) | conferidos na r1 | `:480-569` | ✅ R29, R07, R32 mortos |
| OPV-17 (G4) | nenhum texto da aba usa "eixo" | `:571-588` | ✅ N01 morto |
| OPV-19 (decisão 1) | até 3 conjuntos, por nº de produtos, empate pela 1ª aparição, "em N produtos"/"em 1 produto"; tocar aplica o que falta, na ordem do conjunto; sem botão da união | `optionLibrary.test.ts:177-223`; `OptionsEditor.test.tsx:438-495` | ✅ N14..N17, N19..N26 mortos · ⚠️ **G7** — "cada conjunto na grafia e na ordem do PRIMEIRO produto" (A2) sem fixture que discorde (N18) |
| OPV-19 (decisão 2) | chips ficam enquanto sobrar sugestão não usada (pela dobra) | `optionLibrary.test.ts:234-244`; `OptionsEditor.test.tsx:519-536` | ✅ N27, N28 mortos |
| OPV-18/19 **na página do produto** | as sugestões aparecem no editor da aba Preços & variações | **nenhuma** — a suíte da página roda com biblioteca vazia (comentário `AdminProductFormPage.variacoes.test.tsx:11-13`) | ❌ **G6** — N34 sobreviveu (a grade rápida tem a régua: N35 morto) |
| OPV-20 (decisão) | exclusão pela dobra nas sugestões, chips e conjuntos; **o acréscimo também compara pela dobra** | sugestões/chips/conjuntos: `optionLibrary.test.ts:145`, `:210`, `:234` · acréscimo: nenhuma régua alcança | ⚠️ **G8** — N29 sobreviveu |
| OPV-28 + QA (fonte grande, modal) | modal com `max-h` e rolagem; botões e seletores encolhem | `VariantImagePicker.test.tsx:146`; `OptionsEditor.test.tsx:669-680`; `PricingTab.test.tsx:155-167`; `GridActions.test.tsx:186-193`; página `:590-…` | ✅ N03, N04, N07..N10, N12 mortos · ⚠️ **G9** — o 3º seletor ("Grupo de origem") sem régua (N11) |
| QA — posição | linha nova depois da maior posição que ficou | `gridSync.test.ts:398-…` | ✅ N05, N06 mortos |
| QA — fatores da conta | os fatores seguem o filtro de `cartesian` (nome e valores) | `OptionsEditor.test.tsx:684-694` (literal "3 de 3 opções · 2 × 1 = 2 variações") | ✅ N13 morto |
| Contêiner da grade | `relative overflow-x-auto` | `VariantsTable.test.tsx:435-441` | ✅ N02 morto |

### Sensor de discriminação — rodada 2

**Método**: 38 mutações nos **arquivos reais**, uma por vez, com o arnês da r1 adaptado
(`scratchpad/r2/mut2.py`): o alvo tem de aparecer **exatamente uma vez** (conferido a seco antes de
rodar, para os 38), roda o vitest dos arquivos que cobrem o mutado — sempre com a página real quando a
mutação a alcança —, restaura e **confere o SHA-256** (assert por mutante; nenhuma falha). Morte por
compilação procurada no log (`Transform failed`, `SyntaxError`, `Failed to parse`, `Failed to load
url`): **nenhuma**. O gate inteiro foi medido **antes** do sensor, nunca em paralelo com ele.

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| R07 | `AdminProductFormPage.tsx` | G2: veredito pela posição antiga | ✅ morto — asserção |
| R29 | `AdminProductFormPage.tsx:213` | G1: o refletido nunca recomeça (`if (false)`) | ✅ morto — asserção |
| R32 | `AdminProductFormPage.tsx:252` | G3: órfã que voltou não é liberada | ✅ morto — asserção |
| N01 | `AdminProductFormPage.tsx` | G4: "Os eixos de escolha do produto" de volta | ✅ morto — asserção |
| N02 | `VariantsTable.tsx:230` | contêiner sem `relative` | ✅ morto — asserção |
| N03 | `VariantImagePicker.tsx:114` | modal sem `max-h-[calc(100dvh-2rem)]` | ✅ morto — asserção |
| N04 | idem | modal sem `overflow-y-auto` | ✅ morto — asserção |
| N05 | `gridSync.ts:220` | linha nova numerada por `staying.length` | ✅ morto — asserção |
| N06 | idem | `max(position)` sem `+1` | ✅ morto — asserção (2) |
| N07 | `OptionsEditor.tsx:334` | "Adicionar opção" com `whitespace-nowrap` | ✅ morto — asserção |
| N08 | `PricingTab.tsx` | "Ir para a grade" sem `whitespace-normal` | ✅ morto — asserção |
| N09 | `PricingTab.tsx` | "Comprimento" sem `[overflow-wrap:anywhere]` | ✅ morto — asserção |
| N10 | `GridToolbar.tsx` | seletor "Modo" sem `max-w-full` | ✅ morto — asserção |
| **N11** | `GridToolbar.tsx:111` | seletor "Grupo de origem" sem `max-w-full` | ❌ **SOBREVIVEU** (45/45) |
| N12 | `AdminProductFormPage.tsx:543` | abas sem `whitespace-normal` | ✅ morto — asserção |
| N13 | `OptionsEditor.tsx:276` | fatores sem o filtro de nome | ✅ morto — asserção |
| N14 | `optionLibrary.ts:160` | conjuntos em ordem alfabética | ✅ morto — asserção (4) |
| N15 | idem | empate pela ÚLTIMA aparição | ✅ morto — asserção (2) |
| N16 | `optionLibrary.ts:133` | chave do conjunto sensível à ordem | ✅ morto — asserção (3) |
| N17 | idem | chave do conjunto sem dobra | ✅ morto — asserção (3) |
| **N18** | `optionLibrary.ts:135` | o conjunto guarda a grafia/ordem do ÚLTIMO produto | ❌ **SOBREVIVEU** (92/92) |
| N19 | `optionLibrary.ts:54` | limite de 4 conjuntos | ✅ morto — asserção (2) |
| N20 | `optionLibrary.ts:235` | conjunto já inteiro não sai | ✅ morto — asserção (2) |
| N21 | `optionLibrary.ts:234` | `missing` sem dobra | ✅ morto — asserção |
| N22 | `optionLibrary.ts:132` | opção sem valores vira conjunto | ✅ morto — asserção |
| N23 | `OptionsEditor.tsx:462` | conjunto aplica só o 1º valor | ✅ morto — asserção (2) |
| N24 | idem | conjunto aplica na ordem inversa | ✅ morto — asserção (2) |
| N25 | `OptionsEditor.tsx:456` | singular nunca usado ("1 produtos") | ✅ morto — asserção |
| N26 | `OptionsEditor.tsx:352` | só 1 conjunto | ✅ morto — asserção (3) |
| N27 | `OptionsEditor.tsx:353` | chips só com a opção vazia (a regra de antes da decisão 2) | ✅ morto — asserção |
| N28 | `optionLibrary.ts:218` | `remainingValues` sem dobra | ✅ morto — asserção (3) |
| **N29** | `OptionsEditor.tsx:303-304` | `addValues` compara exato (sem `dobrarTexto`) | ❌ **SOBREVIVEU** (153/153) |
| N30 | `optionLibrary.ts:205` | `suggestOptionValues` não exclui os presentes | ✅ morto — asserção (2) |
| N31 | `AdminProductFormPage.tsx:780` | aviso sem a frase de como reativar | ✅ morto — asserção (4) |
| N32 | `AdminProductFormPage.tsx:231` | devolver o valor religa as pausadas | ✅ morto — asserção |
| N33 | `AdminProductFormPage.tsx:230` | o aviso some quando a edição não gera órfã (valor devolvido) | ✅ morto — asserção |
| **N34** | `AdminProductFormPage.tsx:765` | a página entrega `library={[]}` ao editor | ❌ **SOBREVIVEU** (77/77) |
| N35 | `AdminQuickGridPage.tsx:197` | a grade rápida entrega `library={[]}` | ✅ morto — asserção |

**Resultado: 38 injetados · 34 mortos por asserção · 0 por compilação · 4 sobreviventes — FAIL.**

Equivalente declarado, não injetado: o botão de conjunto passar `set.values` em vez de `set.missing` —
`addValues` filtra os presentes pela dobra na mesma ordem, então o resultado é idêntico.

### A consequência de cada sobrevivente

Duas sondas num arquivo temporário (`features/product-form/ui/zzSondaR2.test.tsx`), **2/2 verdes no
código de hoje**, rodadas contra os mutantes com o mesmo arnês (SHA conferido), e o arquivo apagado
depois (`git status` sem ele):

- **N34 → G6 (OPV-18/19 na tela principal).** A biblioteca é lida na página (`useOptionLibrary`) e
  entregue por uma prop; trocar a prop por `[]` deixa a aba Preços & variações sem nenhuma sugestão de
  nome, de conjunto ou de chip — a feature P2 inteira some da superfície que a Adri usa — e as 77 de
  página e as 135 do editor ficam verdes, porque a suíte da página roda de propósito com a biblioteca
  vazia e o editor recebe a biblioteca do próprio teste. A grade rápida tem a régua equivalente
  (`AdminQuickGridPage.test.tsx:250-253`), o formulário do produto não. Também não há caso de página
  para o Success Criterion 1 (conjunto tocado ⇒ linhas ativas na grade). É a lição
  "teste não monta a árvore que prova".
- **N29 → G8 (OPV-20, "o acréscimo também compara pela dobra").** Sonda S1: opção `Tamanho: 3,5 CM`,
  digitar `3,5 cm` + Enter ⇒ hoje `onChange` não é chamado; com o mutante, entra um segundo valor
  `3,5 cm` (e a grade ganha uma linha para ele). `parseOptionValues` compara exato, então para o texto
  digitado a dobra de `addValues` é a **única** guarda — e os casos existentes chegam a `addValues`
  pela sugestão ou pelo conjunto, que já excluíram o repetido. Sonda morta pelo mutante.
- **N18 → G7 (A2: "cada conjunto na grafia e na ordem do primeiro produto que o usou").** Sonda S2:
  `['6mm','8mm']` depois `['8MM','6MM']` ⇒ hoje o conjunto sai `6mm, 8mm`; com o mutante, `8MM, 6MM`.
  A fixture de `optionLibrary.test.ts:163-175` tem o último produto do conjunto (`' 6mm ', '8mm'`)
  na mesma grafia e ordem do primeiro depois do `trim`, então a asserção é verdadeira nos dois mundos.
- **N11 → G9 (QA, fonte grande).** O relatório do QA conserta os três seletores do "Preencher coluna";
  `GridActions.test.tsx:186-193` mede só "Coluna" e "Modo". O terceiro aparece num modo específico e
  ficou sem régua. Menor, mas é exatamente a superfície que estourava a 200 %.

### Lacunas, ranqueadas

1. **G6 — a biblioteca não chega ao editor da página do produto sem nenhuma régua (N34).**
   `AdminProductFormPage.tsx:765`. Conserto proposto: na página real, semear `OPTION_LIBRARY_KEY` (ou o
   client dublado devolver linhas de `products.options`) e provar que o nome sugerido e um conjunto
   aparecem, e que tocar no conjunto cria as linhas ativas com os padrões (Success Criterion 1).
2. **G8 — a dobra do acréscimo (OPV-20) sem caso pela entrada que só ela protege (N29).**
   `OptionsEditor.tsx:303-304`. Conserto: digitar (e colar) um valor que difere só na caixa/acento de
   um presente ⇒ nada acrescentado.
3. **G7 — A2, grafia/ordem do primeiro produto (N18).** `optionLibrary.ts:135`. Conserto: fixture em
   que o produto seguinte do mesmo conjunto tem outra grafia **e** outra ordem.
4. **G9 — "Grupo de origem" sem `max-w-full` medido (N11).** `GridToolbar.tsx:111`.

### Observações, sem lacuna (não reprovam)

- **As três decisões não foram reverificadas em navegador** — o adendo do QA declara isso, e
  `prova-navegador.md` não tem a medida do botão de conjunto embrulhando em 390 com um conjunto longo
  (o botão é `max-w-full` com `break-words`, então a régua de forma existe; a medida não).
- **As três decisões seguem "a confirmar"** pelo usuário (A1, A2, OPV-04, OPV-19, OPV-20 na `spec.md`),
  assim como A3..A9 `n`.
- **`apps/mobile-adm/` e `.specs/features/81-79-mobile-adm-aviso-de-pedido` estão não rastreados na
  árvore** — de outra sessão (o programa mobile-adm, `AD-056`). Não foram tocados nem medidos aqui; o
  `81-79-…` colide com o número `81` desta feature e merece olhar humano antes do commit.
- As observações da r1 e do conserto (rejeição do motor de upload não tratada; esvaziar uma opção de
  um produto com 2 opções recria linhas; TipTap sujando o formulário; o X de 16px do `DialogContent`)
  continuam como estavam.

### Qualidade de código

| Princípio | Status |
| --- | --- |
| Código mínimo | ✅ — `suggestValueSets`/`remainingValues` são pequenas e têm leitor; nada de tabela nova (A1) |
| Mudança cirúrgica | ✅ — os consertos do QA tocam só as classes medidas |
| Segue os padrões | ✅ — dobra única (`dobrarTexto`), comentários ligam cada decisão ao `BUG-*` |
| Asserções miram o valor da spec | ✅ nos literais e nas unidades; ⚠️ fiação da biblioteca na página (G6) e fixtures de A2 (G7) |

### Rastreabilidade (proposta — spec não editada)

| Requisito | Status |
| --- | --- |
| OPV-01..17, 21..28 | ✅ verificado (OPV-28 com a prova em navegador da r1) |
| OPV-18, OPV-19 | ⚠️ unidade e editor ✅; **na página do produto** sem régua (G6); A2 dos conjuntos (G7) |
| OPV-20 | ⚠️ a metade "o acréscimo compara pela dobra" sem régua (G8) |

**Lição**: L-070 acrescentada à mão em `.specs/LESSONS.md` como candidata (guarda em camadas). G6 é
recorrência de "teste não monta a árvore que prova" e G7 de L-038 (fixture em que as alternativas
discordam) — registradas aqui, sem lição nova.


---

## Conserto da rodada 2 (2026-10-26)

Só cobertura: as quatro lacunas eram mutantes sobreviventes, sem defeito de produto. **Nenhum arquivo de
produção foi alterado**; os casos novos passam no código de hoje e reprovam no mutante.

| Lacuna | Caso novo | Arquivo |
| --- | --- | --- |
| **G6** (N34) | a página real com a biblioteca semeada em `OPTION_LIBRARY_KEY` (molde da grade rápida): o campo de nome lista os nomes do catálogo; escolher "Tamanho" mostra os conjuntos (com a contagem) e os chips; nada entra sem toque. **Success Criterion 1**: tocar em "Usar 3,5 cm, 4,5 cm" cria duas linhas ativas com 89,90 · 120,00 · 50 g, e o valor fora do conjunto não ganha linha | `pages/admin/AdminProductFormPage.variacoes.test.tsx` (+2; `montar(library?)`) |
| **G8** (N29) | `3,5 CM` na opção, digitar `3,5 cm` + Enter ⇒ `onChange` não é chamado e o campo limpa; colar `unico, 3,5 cm, Fosco` sobre `Único, 3,5 CM` ⇒ entra só `Fosco` (caixa e acento) | `features/product-form/ui/OptionsEditor.test.tsx` (+2) |
| **G7** (N18) | `['6mm','8mm']` seguido de `['8MM','6MM']` ⇒ um conjunto `6mm, 8mm` com 2 produtos — a fixture em que o primeiro e o último discordam na grafia **e** na ordem | `entities/product/lib/__tests__/optionLibrary.test.ts` (+1) |
| **G9** (N11) | troca o modo para "Copiar de outro grupo" pelo `Select` real (`enableRadixSelectInJsdom`) e mede `max-w-full` por token exato no "Grupo de origem" | `features/product-form/ui/GridActions.test.tsx` (+1) |

### Mutantes reinjetados no arquivo real

Arnês que **lança** quando o alvo não é encontrado, roda só o arquivo de teste do dono, restaura e confere
o SHA-256 do original.

| Mutante | Mutação | Resultado | Quem matou |
| --- | --- | --- | --- |
| N34 | `library={optionLibrary}` → `library={[]}` (`AdminProductFormPage.tsx`) | **morto por asserção** | os 2 casos de G6 |
| N29 | `addValues` comparando por `trim` em vez da dobra (`OptionsEditor.tsx`) | **morto por asserção** | os 2 casos de G8 |
| N18 | o conjunto repetido passa a guardar a grafia do último produto (`optionLibrary.ts`) | **morto por asserção** | o caso de G7 |
| N11 | `max-w-full` tirado do "Grupo de origem" (`GridToolbar.tsx`) | **morto por asserção** | o caso de G9 |

4 de 4 mortos, 0 por compilação; SHA conferido nos quatro (`ce1982ae0775`, `05cc903128dc`, `a9eecfa4dce4`,
`2a94b73ca808`, prefixos).

### Gate

| Medida | Resultado | Antes |
| --- | --- | --- |
| Testes backoffice (`pnpm --filter @estrelinha/backoffice test --testTimeout=20000`) | **3842 em 218**, exit 0 | 3836/218 (+6, todos acima) |
| Testes store (`pnpm --filter @estrelinha/store test --testTimeout=20000`) | **5754 em 314**, exit 0 | 5754/314, idêntica |
| Tipos (`npx tsc --noEmit -p apps/backoffice/tsconfig.app.json`) | **0** | 0 |
| Lint backoffice (`npx eslint .`) | **23 erros / 5 warnings** | 23/5 |

### O que continua aberto (não reprova, não é código)

- **D1** — as três decisões (conjuntos, chips que permanecem, frase do aviso) não foram reverificadas em
  navegador, e falta medir o botão de conjunto longo embrulhando em 390. A régua de forma existe
  (`max-w-full` + `break-words`); a medida não.
- **D2** — A1, A2, OPV-04, OPV-19 e OPV-20 seguem "decidido pela recomendação do QA, confirmar", e A3..A9
  `n`: confirmação do usuário pendente.
- **D3** — `apps/mobile-adm/` e `.specs/features/81-79-mobile-adm-aviso-de-pedido` não rastreados, de outra
  sessão; o prefixo `81` colide com esta feature. Não tocados nem medidos.

**Rastreabilidade proposta depois do conserto**: OPV-18, OPV-19 e OPV-20 passam a ✅ na unidade, no
editor **e** na página do produto. Falta o Verificador independente reconferir (autor ≠ verificador).

---

## Rodada 3 — **FAIL** (cobertura; nenhum defeito de produto no código de hoje)

**Data**: 2026-10-26
**Spec**: `spec.md` na versão atual (OPV-01..28; A1, A2, OPV-04, OPV-19 e OPV-20 com as três decisões do QA)
**Diff**: working tree sobre `fc2b3b60`, sem commit — `git diff HEAD --stat -- apps/backoffice/src`:
18 arquivos, +1301 / −828, mais os arquivos novos. O mesmo stat conferido antes do sensor, depois do
sensor e depois das sondas (apagadas; `git status` sem elas).
**Verificador**: sub-agente independente (autor ≠ verificador), rodada 3. Não escrevi este código e não
consertei nada. Escopo: a feature inteira, com foco no que mudou depois da r1 — G1..G4, o contêiner
`relative`, os 4 consertos do QA, as 3 decisões e o conserto da r2 (G6..G9).

### Veredito curto

O código de hoje faz o que a spec pede em todos os casos que exercitei, inclusive nas três sondas
novas (abaixo, verdes no código de hoje). Os consertos da r1, do QA, das decisões e da r2 se sustentam:
todos os mutantes reinjetados deles morrem por asserção. A rodada **reprova por cobertura**: 7 de 61
mutantes sobreviveram; dois deles têm consequência concreta sobre um AC (OPV-27 e a decisão 2 de
OPV-19), provada por sonda; os outros cinco são de baixo impacto ou equivalentes, e estão declarados.

### Gate (Build) — um workspace por vez, exit fora de pipe, medido ANTES do sensor

| Medida | Resultado | Exit | Referência |
| --- | --- | --- | --- |
| Testes backoffice (`pnpm --filter @estrelinha/backoffice test --testTimeout=20000`) | **3842 em 218**, todos verdes | 0 | 3842/218 depois do conserto da r2 ✅ |
| Testes store (idem) | **5754 em 314**, todos verdes | 0 | 5754/314 ✅ |
| `tsc -p apps/backoffice/tsconfig.app.json` · `tsc -p apps/store/tsconfig.app.json` | **0 · 0** | 0 · 0 | 0 · 0 ✅ |
| `eslint .` backoffice | **23 / 5**, nenhum em arquivo da 81 | 1 | 23/5 ✅ |
| `eslint .` store | **2 / 2** | 1 | 2/2 ✅ |
| `pnpm --filter @estrelinha/backoffice build` · store build | verdes | 0 · 0 | ✅ |

Tipos, lint e build medidos depois do sensor, com o SHA dos arquivos de produção conferido e as sondas
já apagadas. Nenhum teste removido nesta rodada; nenhuma asserção afrouxada nos arquivos que o conserto
da r2 tocou (os casos de G6..G9 só acrescentam).

### Critérios de aceite — checagem ancorada na spec

| AC | Evidência (`arquivo:linha` do `it`) | Resultado |
| --- | --- | --- |
| OPV-01 | `AdminProductFormPage.variacoes.test.tsx:205` (2 linhas no mesmo gesto, `h.consultas` vazio); `gridSync.test.ts:46`, `:98` | ✅ S04, S09 mortos |
| OPV-02 | página `:205-227` (`aria-checked=true`, 89,90 · 120,00 · 50 g · estoque 0 · SKU vazio), `:229` (o que vai ao banco); `gridSync.test.ts:63`, `:84` (zero ⇒ `null`) | ✅ S01, S02, S03, P03, P04 mortos |
| OPV-03 | `gridSync.test.ts:121` (mesmo objeto) | ✅ |
| OPV-04 (decisão 3) | página `:269`, `:279` (literal inteiro), `:293` (falha ⇒ pausa), `:304`, `:316` (devolver não religa), `:335` (nunca `delete`) | ✅ O01, O02, P05, P10, P11, RN31 mortos · ⚠️ **G12** (P06, dedupe do aviso) |
| OPV-05 | página `:486` (G1); `gridSync.test.ts:167` | ✅ R29 morto |
| OPV-06 | `gridSync.test.ts:184`, `:214`, `:227` | ✅ S07, S08 mortos |
| OPV-07 | `gridSync.test.ts:256`, `:274` | ✅ S06 morto |
| OPV-08 | página `:189` | ✅ |
| OPV-09 | `gridSync.test.ts:291-310` | ✅ S04 morto (P12 é equivalente na superfície, abaixo) |
| OPV-10 | `VariantsTable.test.tsx:338` (frase), `:359` (sem "Regerar" nem diálogo) | ✅ T02 morto |
| OPV-11 | `VariantImagePicker.test.tsx:50`; `VariantsTable.test.tsx:381` | ✅ |
| OPV-12 | `VariantImagePicker.test.tsx:72`, `:90`, `:98` | ✅ I05 morto |
| OPV-13 | `VariantImagePicker.test.tsx:104`, `:115`; `VariantsTable.test.tsx:396`, `:415` | ✅ I04, T01 mortos |
| OPV-14 | `VariantImagePicker.test.tsx:195`; página `:412` (galeria e banco) | ✅ I01, I06, P08 mortos |
| OPV-15 | `VariantImagePicker.test.tsx:214`, `:231`, `:244`; página `:412` (salvar desabilitado) | ✅ I02, P09 mortos |
| OPV-16 | página `:405` | ✅ |
| OPV-17 | `OptionsEditor.test.tsx:276`, `:295`; página `:577` | ✅ RN01 morto |
| OPV-18 | `OptionsEditor.test.tsx:339-428`; página `:612` (G6) | ✅ L03, L05 mortos |
| OPV-19 (decisões 1 e 2) | `optionLibrary.test.ts:177-226`, `:241`; `OptionsEditor.test.tsx:438-552`; página `:612`, `:635` | ✅ E01, E02, E06, L04, L06, L07, RN14, RN19, RN27 mortos · ❌ **G11** (E04) |
| OPV-20 | `optionLibrary.test.ts:145`; `OptionsEditor.test.tsx:556`, `:615`, `:626` | ✅ E05 morto |
| OPV-21 | `OptionsEditor.test.tsx:639`, `:657`; `useOptionLibrary.test.ts:140` | ✅ |
| OPV-22 | `useOptionLibrary.test.ts:163`, `:168` | ✅ U01 morto |
| OPV-23 | `gridSync.test.ts:317`, `:330`, `:339`; `OptionsEditor.test.tsx:666` | ✅ S11, E03 mortos |
| OPV-24 | `gridSync.test.ts:358`, `:376` | ✅ S05 morto · S10 sem consequência achada (abaixo) |
| OPV-25 | página `:355`, `:376`, `:522` (G2), `:551` (G3); `orphans.test.ts:65-90` | ✅ O03, P07, R32 mortos |
| OPV-26 | `VariantImagePicker.test.tsx:152`, `:162` | ✅ I05 morto |
| OPV-27 | página `:457` — olha só o **botão**, e o `VariantImagePicker` já esconde URL fora da galeria | ❌ **G10** (P02 e I03 sobrevivem, cada um mascarado pelo outro) |
| OPV-28 | `VariantImagePicker.test.tsx:125`, `:142`; `VariantsTable.test.tsx:424`, `:435`; `prova-navegador.md` | ✅ RN02, RN03 mortos |
| QA: posição · fonte grande · fatores | `gridSync.test.ts:404`; `OptionsEditor.test.tsx:696`, `:711`; página `:655`; `GridActions.test.tsx:186-200` | ✅ RN05, RN07, RN12, RN13 mortos |

### Sensor de discriminação — rodada 3

**Método**: arnês próprio (`scratchpad/r3/mut3.py`) — o alvo tem de aparecer **exatamente uma vez** em
cada um dos 61 (conferido a seco antes de rodar), uma mutação por vez no **arquivo real**, roda o vitest
dos arquivos que cobrem o mutado (sempre as quatro suítes da página do produto quando a mutação a
alcança, mais a grade rápida quando alcança o editor), restaura e **confere o SHA-256** (assert por
mutante; nenhuma falha — prefixos `e9538fa03155` gridSync, `02446d7a1e9b` orphans, `ce1982ae0775`
página, `05cc903128dc` editor, `a9eecfa4dce4` optionLibrary, `1e1b6eda9afa` useOptionLibrary,
`b75988621620` picker, `2634376046e2` VariantsTable). Morte por compilação procurada em todos os logs
(`Transform failed`, `SyntaxError`, `Failed to parse`, `Failed to load url`, `Unexpected token`):
**nenhuma**. O gate foi medido antes, nunca em paralelo com o sensor.

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| S01 | `gridSync.ts` | linha nova nasce pausada | ✅ asserção |
| S02 | idem | `orZero` com `>=` (padrão 0 vira preço 0) | ✅ asserção |
| S03 | idem | peso padrão nunca copiado | ✅ asserção |
| S04 | idem | sem a volta da mesma referência (OPV-09) | ✅ asserção |
| S05 | idem | sem o `incomplete` (nome vazio com valores) | ✅ asserção |
| S06 | idem | colisão de A5 sem "a primeira sobrevive" | ✅ asserção |
| S07 | idem | OPV-06 com o ÚLTIMO valor da nova opção | ✅ asserção |
| S08 | idem | a vendida com a chave "ressuscita" no 1º valor | ✅ asserção |
| S09 | idem | linha de id real sai sem passar pela consulta | ✅ asserção (11) |
| **S10** | idem | re-chaveia para o nome vazio em vez de manter o antigo | ❌ sobreviveu (62/62) — ver abaixo |
| S11 | idem | sem o `duplicate` | ✅ asserção |
| O01 | `orphans.ts` | consulta falhada ⇒ remove | ✅ asserção |
| O02 | idem | o veredito `remove` não remove | ✅ asserção |
| O03 | idem | pausa conta id que saiu da grade | ✅ asserção |
| **P01** | `AdminProductFormPage.tsx` | o aviso não recomeça quando as opções chegam por outro caminho | ❌ sobreviveu (79/79) |
| **P02** | idem | a galeria deixa de limpar o `image_url` das linhas | ❌ sobreviveu (82/82) |
| P03 | idem | preço e preço "de" trocados nos padrões | ✅ asserção |
| P04 | idem | peso padrão 0 | ✅ asserção |
| P05 | idem | a órfã conferida é consultada de novo | ✅ asserção |
| **P06** | idem | o aviso acumula sem tirar o rótulo repetido | ❌ sobreviveu (79/79) |
| P07 | idem | "voltou ao cruzamento" medido contra as opções da PERGUNTA | ✅ asserção |
| P08 | idem | a foto do modal substitui a galeria em vez de somar | ✅ asserção |
| P09 | idem | a grade sem `onUploadingChange` | ✅ asserção |
| P10 | idem | o aviso nomeia pelo id | ✅ asserção |
| P11 | idem | o aviso só com 2+ pausadas | ✅ asserção |
| **P12** | idem | `variants` sempre um array novo | ❌ sobreviveu (79/79) — equivalente na superfície |
| E01 | `OptionsEditor.tsx` | chips sem excluir os já usados | ✅ asserção |
| E02 | idem | conjunto já inteiro não sai | ✅ asserção |
| E03 | idem | aviso de nome repetido na 1ª opção | ✅ asserção |
| **E04** | idem | o bloco de sugestões exige conjuntos **e** chips | ❌ sobreviveu (99/99) |
| E05 | idem | sugestão ao digitar sem excluir os presentes | ✅ asserção |
| E06 | idem | "1 produtos" no singular | ✅ asserção |
| L01 | `optionLibrary.ts` | o representante é o ÚLTIMO com mais valores | ✅ asserção |
| L02 | idem | grafia: empate pela última aparição | ✅ asserção |
| L03 | idem | empate de nomes em ordem alfabética inversa | ✅ asserção |
| L04 | idem | conta o nome duas vezes no mesmo produto | ✅ asserção |
| L05 | idem | `findLibraryEntry` sem a dobra | ✅ asserção |
| L06 | idem | a contagem do conjunto não soma | ✅ asserção |
| L07 | idem | conjunto sem nada faltando continua | ✅ asserção |
| U01 | `useOptionLibrary.ts` | a chave sai de baixo do pool (OPV-22) | ✅ asserção |
| I01 | `VariantImagePicker.tsx` | escolhe a ÚLTIMA foto enviada | ✅ asserção |
| I02 | idem | fecha o modal mesmo com falha | ✅ asserção |
| **I03** | idem | mostra a URL que não está na galeria | ❌ sobreviveu (73/73) |
| I04 | idem | escolher não fecha o modal | ✅ asserção |
| I05 | idem | sem a frase do produto sem imagens | ✅ asserção |
| I06 | idem | as fotos enviadas não vão à galeria | ✅ asserção |
| T01 | `VariantsTable.tsx` | a escolha grava sempre na linha 0 | ✅ asserção |
| T02 | idem | a frase antiga do estado vazio | ✅ asserção |
| R29 · R32 · RN01 | página | reinjeção de G1, G3, G4 | ✅ asserção (3/3) |
| RN02 · RN03 | grade · modal | sem `relative` · sem `max-h`/`overflow-y-auto` | ✅ asserção (2/2) |
| RN05 · RN07 · RN12 · RN13 | gridSync · editor · página | posição por contagem · `whitespace-nowrap` · abas · fatores sem o nome | ✅ asserção (4/4) |
| RN14 · RN19 · RN27 · RN31 | biblioteca · editor · página | conjuntos alfabéticos · limite 4 · chips só com a opção vazia · aviso sem a frase de reativar | ✅ asserção (4/4) |

**Resultado: 61 injetados · 54 mortos por asserção · 0 por compilação · 7 sobreviventes — FAIL.**

### A consequência de cada sobrevivente

Três sondas em arquivos temporários (`features/product-form/ui/zzSondaR3.test.tsx` e uma cópia da suíte
da página com um caso a mais), **verdes no código de hoje**, rodadas contra os mutantes com o mesmo
arnês (SHA conferido) e apagadas depois:

- **P02 + I03 → G10 (OPV-27).** Duas camadas guardam a mesma regra: a página tira o `image_url` da
  linha cuja foto sai da galeria (`clearMissingVariantImages`, `AdminProductFormPage.tsx:725`), e o
  `VariantImagePicker` só desenha a miniatura se a URL estiver na galeria (`:53`). O caso da página
  (`:457`) olha só o botão, que é verdadeiro com qualquer uma das duas apagada. Sonda S-P02: produto
  com a linha apontando para `fosco.webp`, remover essa foto na aba Mídia e salvar ⇒ hoje nenhuma
  linha gravada leva `fosco.webp`; com P02, o banco recebe a URL morta (a loja lê
  `product_variants.image_url`), e as 21 da página seguem verdes. Sonda S-I03 morta pelo I03. É
  recorrência da L-070 (guarda em camadas) — evidência acrescentada lá.
- **E04 → G11 (OPV-19, decisão 2).** "Os chips SHALL continuar visíveis enquanto houver sugestão ainda
  não usada". Toda fixture do editor tem conjuntos sobrando quando há chips sobrando. Sonda S-E04:
  `Acabamento` com `Fosco` já na opção, biblioteca `values: ['Fosco','Brilhante']`, `sets: [Fosco]` ⇒
  hoje o chip `Brilhante` aparece; com E04 o bloco inteiro some. No catálogo real isso acontece
  sempre que o valor que falta mora num 4º conjunto ou mais (fora do limite de 3) ou num valor que
  nenhum conjunto restante contém.
- **P06 → G12 (OPV-04, "um aviso que nomeia cada uma").** O `filter(label => !prev.includes(label))` só
  importa quando duas órfãs pausadas têm o mesmo rótulo — por exemplo, depois de A5 (remover uma opção
  com duas vendidas que colidem e depois o valor que restou). Nenhum caso monta isso. Baixo impacto.
- **P01 (observação, sem AC).** Sem `setPausedOrphans([])` no recomeço, o aviso continua depois de as
  opções chegarem por outro caminho (releitura depois do salvar, rascunho restaurado). A spec não diz
  quando o aviso some; a frase continua verdadeira (as linhas seguem pausadas). Fica para decisão.
- **S10 (observação, sem consequência achada).** O nome vazio só chega ao re-chaveamento sem ser
  pulado quando a opção também ficou sem valores — e aí a linha é órfã nos dois mundos. Não achei
  entrada pela tela em que a chave vazia apareça; candidato a equivalente.
- **P12 (equivalente na superfície).** OPV-09 é sobre a saída de `syncGrid`, que tem régua
  (`gridSync.test.ts:291-310`); a página chama `setFields` de qualquer jeito, e um array novo com os
  mesmos objetos não muda nada que a tela ou o banco mostrem.

### Lacunas, ranqueadas

1. **G10 — OPV-27 sem régua no que vai ao banco (P02, e I03 mascarando).** Conserto proposto: no caso
   da página `:457`, salvar depois de remover a foto e asserir que a linha gravada leva `image_url:
   null` (a sonda S-P02 é o molde); e no `VariantImagePicker.test.tsx`, um caso com `imageUrl` fora de
   `images` ⇒ marcador vazio e "Usar a principal" marcada.
2. **G11 — chips sem conjunto restante (E04).** Conserto: no `OptionsEditor.test.tsx`, a fixture da
   sonda S-E04 (conjuntos esgotados, valor ainda não usado) ⇒ o grupo "Valores usados em outros
   produtos" com `Brilhante` e nenhum grupo de conjuntos.
3. **G12 — o aviso sem rótulo repetido (P06).** Conserto: caso de página com duas vendidas que acabam
   com o mesmo rótulo, ou o par em unidade se a dedupe sair da página.

### Observações, sem lacuna (não reprovam)

- **D1, D2 e D3 da r2 continuam** (as três decisões sem reverificação em navegador e sem a medida do
  botão de conjunto longo em 390; as decisões e A3..A9 a confirmar pelo usuário; `apps/mobile-adm/` e
  `.specs/features/81-79-mobile-adm-aviso-de-pedido` não rastreados, com o prefixo `81` colidindo).
- **P01** pede decisão: o aviso de pausadas deve sumir depois de salvar? Hoje some só na primeira
  edição de opções seguinte à releitura.
- `onImagesAdded={added => setField('images', [...form.images, ...added])}` e o `update(index, …)` da
  linha usam o `form` do render em que o envio começou; com o modal aberto e o salvar travado não
  achei caminho para outra edição no meio, então não é lacuna — registrado para quem mexer ali.

### Qualidade de código

| Princípio | Status |
| --- | --- |
| Código mínimo | ✅ — nada novo desde a r2 em produção (o conserto da r2 só acrescentou testes) |
| Mudança cirúrgica | ✅ |
| Segue os padrões | ✅ — dobra única, órfãs por id, upload pelo motor da galeria (A8) |
| Asserções miram o valor da spec | ✅ nos literais e na grade; ⚠️ OPV-27 asserido só na tela (G10) |

### Rastreabilidade (proposta — spec não editada)

| Requisito | Status |
| --- | --- |
| OPV-01..18, 20..26, 28 | ✅ verificado |
| OPV-19 | ⚠️ decisão 2 sem o caso "chips sem conjunto restante" (G11) |
| OPV-27 | ⚠️ provado na tela, não no banco (G10) |
| OPV-04 | ✅, com G12 (dedupe do aviso) de baixo impacto |

**Lição**: G10 é recorrência da L-070 (evidência acrescentada à mão em `.specs/LESSONS.md`, sem usar o
`lessons.py`); G11 é recorrência de L-038 (fixture em que as alternativas discordam) — sem lição nova.

---

## Conserto da rodada 3 (2026-10-26)

Só cobertura nas três lacunas; nenhum defeito de produto. **Uma mudança de produção, sem mudança de
comportamento**: a dedupe do aviso de pausadas saiu da página para `mergePausedLabels`
(`features/product-form/model/orphans.ts`), com a mesma régua de antes, para ganhar teste em unidade (G12).

| Lacuna | Caso novo | Arquivo |
| --- | --- | --- |
| **G10** (P02) | o caso OPV-27 da página real agora **salva** depois de remover a foto na aba Mídia e assere o que vai ao banco: `products.images` só com a principal e a única linha gravada com `image_url: null` (a sonda S-P02 virou o caso) | `pages/admin/AdminProductFormPage.variacoes.test.tsx` (caso estendido, +0) |
| **G10** (I03) | `imageUrl` fora de `images` ⇒ botão com o marcador vazio (`border-dashed`, sem `<img>`) e, no modal, "Usar a principal" marcada e as três imagens desmarcadas | `features/product-form/ui/VariantImagePicker.test.tsx` (+1) |
| **G11** (E04) | `Acabamento` com `Fosco` (o único conjunto, já inteiro) e `Brilhante` só nos valores ⇒ nenhum grupo de conjuntos, e o grupo de chips com `Brilhante` (a fixture da sonda S-E04, que já estava em `LIBRARY`) | `features/product-form/ui/OptionsEditor.test.tsx` (+1) |
| **G12** (P06) | `mergePausedLabels`: rótulo já no aviso não entra de novo; aviso vazio recebe o lote; dentro do mesmo lote os dois rótulos iguais ficam (comportamento de hoje, fixado); o `prev` não é mutado | `features/product-form/model/orphans.test.ts` (+4) |

### Mutantes reinjetados no arquivo real

Arnês da r3 (`scratchpad/r3conserto/mut3.py`): alvo exatamente uma vez, uma mutação por vez, restaura e
confere SHA-256 (assert por mutante e `shasum -c` no fim, OK nos quatro arquivos).

| Mutante | Mutação | Resultado | Quem matou |
| --- | --- | --- | --- |
| P02 | a galeria deixa de limpar o `image_url` (`AdminProductFormPage.tsx`) | **morto por asserção** | o caso OPV-27 da página (a parte do banco) |
| I03 | `escolhida = imageUrl` (`VariantImagePicker.tsx`) | **morto por asserção** | o caso novo do picker |
| E04 | `\|\|` → `&&` no bloco de sugestões (`OptionsEditor.tsx`) | **morto por asserção** | o caso novo do editor |
| P06 | `mergePausedLabels` sem o filtro (`orphans.ts`) | **morto por asserção** | `mergePausedLabels`, 1º caso |
| P06w | a página volta a concatenar sem chamar `mergePausedLabels` | **SOBREVIVEU (79/79)** — declarado, abaixo | — |

4 de 5 mortos, 0 por compilação. SHA conferido: `e5667916573d` página, `b75988621620` picker,
`05cc903128dc` editor, `b403f4028ca6` orphans.

**P06w, e por que não há caso de página.** Procurei um caminho pela tela em que duas pausadas com o
mesmo rótulo caiam em **lotes diferentes**, e não achei: a mesma linha não volta a ser consultada depois
de pausada (fica em `checkedOrphans`), e duas linhas distintas só terminam com o mesmo rótulo quando
têm o mesmo `option_values` — e aí ficam órfãs no **mesmo** lote. A tentativa pelo caminho de A5 que a
r3 sugeriu deu rótulos diferentes: a linha que colide continua com a chave removida e o rótulo a
carrega (`3,5 cm · Azul`, porque `variantLabel` acrescenta as chaves fora das opções). Medido também
que, com duas linhas iguais vendidas (grade salva divergente, OPV-08, mais a remoção de `Cor`), remover
o valor dá **`3,5 cm, 3,5 cm`** no aviso — a dedupe compara só com o que o aviso já mostra. Por isso o
filtro ganhou régua em unidade e a fiação da página fica declarada como não observável hoje.

### Gate

| Medida | Resultado | Antes |
| --- | --- | --- |
| Testes backoffice (`pnpm --filter @estrelinha/backoffice test --testTimeout=20000`) | **3848 em 218**, exit 0 | 3842/218 (+6: picker +1, editor +1, `orphans` +4) |
| Testes store (`pnpm --filter @estrelinha/store test --testTimeout=20000`) | **5754 em 314**, exit 0 | 5754/314, idêntica |
| Tipos (`npx tsc --noEmit -p apps/backoffice/tsconfig.app.json`) | **0** | 0 |
| Lint backoffice (`npx eslint .`) | **23 erros / 5 warnings**, nenhum em arquivo tocado | 23/5 |

### Para decisão (não consertado)

- **OBS-P01** — o mutante P01 (sem `setPausedOrphans([])` no recomeço) continua sobrevivendo, de
  propósito: hoje o aviso de pausadas some na primeira edição de opções depois de elas chegarem por outro
  caminho (releitura depois de salvar, rascunho restaurado), e não no instante da releitura. A spec não
  diz quando o aviso deve sumir; sem essa resposta, qualquer caso fixaria uma regra que ninguém pediu.
- **Aviso com rótulo repetido no mesmo lote** — duas variações vendidas com o mesmo rótulo aparecem as
  duas (`3,5 cm, 3,5 cm`). Nomear cada uma (OPV-04) sustenta as duas; um rótulo só esconderia que são
  duas. Fixado como está em `orphans.test.ts`; mudar é decisão.
- **OBS-EQ** — S10 e P12 seguem declarados equivalentes (r3).
- **D1..D3** seguem como na r2.

Falta o Verificador independente reconferir (autor ≠ verificador).

---

## Rodada 4 — **FAIL** (cobertura; nenhum defeito de produto no código de hoje)

**Data**: 2026-10-26
**Spec**: `spec.md` na versão atual (OPV-01..28; A1, A2, OPV-04, OPV-19 e OPV-20 com as três decisões do QA)
**Diff**: working tree sobre `fc2b3b60`, sem commit — `git diff HEAD --stat -- apps/backoffice/src`:
18 arquivos, +1311 / −828, mais os arquivos novos. O mesmo stat antes e depois do sensor e da sonda.
**Verificador**: sub-agente independente (autor ≠ verificador), rodada 4. Não escrevi este código e não
consertei nada. Escopo: a feature inteira, com foco no que mudou depois da r1 — G1..G4, o contêiner
`relative` da grade, os 4 consertos do QA (modal com `max-h`, posição da linha nova, fonte grande,
fatores da conta), as três decisões (conjuntos, chips que permanecem, frase do aviso) e o conserto da
r3 (G10..G12, `mergePausedLabels`).

### Veredito curto

O código de hoje faz o que a spec pede em tudo que exercitei, inclusive na sonda nova (verde no código
de hoje). Todos os consertos e decisões listados se sustentam: cada mutante reinjetado neles morre por
asserção. A rodada **reprova por cobertura**: 2 de 89 mutantes sobreviveram — um com consequência
concreta sobre OPV-04 (O02, o limiar "vendida = ao menos um pedido"), provada por sonda pela página
real; o outro (G17) é o S10 da r3, já declarado candidato a equivalente.

### Gate (Build) — um workspace por vez, exit fora de pipe, medido ANTES do sensor

| Medida | Resultado | Exit | Referência |
| --- | --- | --- | --- |
| Testes backoffice (`pnpm --filter @estrelinha/backoffice test --testTimeout=20000`) | **3848 em 218**, todos verdes | 0 | 3848/218 (conserto da r3) ✅ |
| Testes store (idem) | **5754 em 314**, todos verdes | 0 | 5754/314 ✅ |
| `tsc -p apps/backoffice/tsconfig.app.json` · `tsc -p apps/store/tsconfig.app.json` | **0 · 0** | 0 · 0 | 0 · 0 ✅ |
| `eslint .` backoffice | **23 / 5**, nenhum em arquivo da 81 | 1 | 23/5 ✅ |
| `eslint .` store | **2 / 2** | 1 | 2/2 ✅ |
| `pnpm --filter @estrelinha/backoffice build` · store build | verdes | 0 · 0 | ✅ |

Nenhum teste removido desde a r3; nenhuma asserção afrouxada que eu tenha encontrado.

### Critérios de aceite — checagem ancorada na spec

| AC | Evidência (`arquivo:linha` do `it`) | Resultado |
| --- | --- | --- |
| OPV-01 | página `AdminProductFormPage.variacoes.test.tsx:205`, `:651`; `gridSync.test.ts:46`, `:98` | ✅ P17, G03 mortos |
| OPV-02 | página `:205`, `:229`, `:651` (89,90 · 120,00 · 50 g); `gridSync.test.ts:63`, `:84` | ✅ G03..G06, G18, P12, P13 mortos |
| OPV-03 | `gridSync.test.ts:121` (`toBe`) | ✅ G08 morto |
| OPV-04 (decisão 3) | página `:269`, `:279` (literal inteiro), `:293`, `:304`, `:316`, `:335`; `orphans.test.ts:24-36`, `:101-118` | ✅ G12, O01, O03..O07, P09..P11, P16 mortos · ❌ **G13** (O02: limiar de 1 pedido) |
| OPV-05 | página `:502` (G1); `gridSync.test.ts:167` | ✅ P01 morto |
| OPV-06 | `gridSync.test.ts:184`, `:214`, `:227` | ✅ G13 (mutante) morto |
| OPV-07 | `gridSync.test.ts:256`, `:274` | ✅ G14, G15 mortos |
| OPV-08 | página `:189` | ✅ |
| OPV-09 | `gridSync.test.ts:291-310` | ✅ G07, G16 mortos |
| OPV-10 | `VariantsTable.test.tsx:338`, `:359` | ✅ T03 morto |
| OPV-11 | `VariantImagePicker.test.tsx:50`; `VariantsTable.test.tsx:381` | ✅ I06 morto |
| OPV-12 | `VariantImagePicker.test.tsx:87`, `:105`, `:113` | ✅ I09 morto |
| OPV-13 | `VariantImagePicker.test.tsx:119`, `:130`; `VariantsTable.test.tsx:396`, `:415` | ✅ I08, T02 mortos |
| OPV-14 | `VariantImagePicker.test.tsx:210`; página `:412` | ✅ I03, P07 mortos |
| OPV-15 | `VariantImagePicker.test.tsx:229`, `:246`, `:259`; página `:412` | ✅ I04, I05, P08, T04 mortos |
| OPV-16 | página `:405` | ✅ |
| OPV-17 | `OptionsEditor.test.tsx:276`, `:295`; página `:593`; grade rápida | ✅ P04, Q02 mortos |
| OPV-18 | `OptionsEditor.test.tsx:339-428`; página `:628` | ✅ E09, L06, L07, P14, Q01 mortos |
| OPV-19 (decisões 1 e 2) | `optionLibrary.test.ts:177-226`; `OptionsEditor.test.tsx:438-562`; página `:628`, `:651` | ✅ E01..E04, E10..E12, L01..L03, L08..L10 mortos |
| OPV-20 | `optionLibrary.test.ts:145`; `OptionsEditor.test.tsx:566-646` | ✅ E05, L04, L05 mortos |
| OPV-21 | `OptionsEditor.test.tsx:649`, `:667`; `useOptionLibrary.test.ts:140` | ✅ |
| OPV-22 | `useOptionLibrary.test.ts:163`, `:168` | ✅ U01 morto (U02, U03 também: coluna e teto) |
| OPV-23 | `gridSync.test.ts:317`, `:330`, `:339`; `OptionsEditor.test.tsx:676`, `:693` | ✅ G09, G11, E08 mortos |
| OPV-24 | `gridSync.test.ts:358`, `:376` | ✅ G10 morto · G17 (= S10) sobrevive, declarado |
| OPV-25 | página `:355`, `:376`, `:538` (G2), `:567` (G3); `orphans.test.ts:65-99` | ✅ O05, P02, P03, P05 mortos |
| OPV-26 | `VariantImagePicker.test.tsx:167`, `:177` | ✅ I07 morto |
| OPV-27 | página `:457` (salva e confere o banco); `VariantImagePicker.test.tsx:62` | ✅ P06, I02 mortos |
| OPV-28 | `VariantImagePicker.test.tsx:140`, `:157`; `VariantsTable.test.tsx:424`, `:435`; `prova-navegador.md` | ✅ I01, I10, E10, T01 mortos |
| QA: posição · fonte grande · fatores · modal | `gridSync.test.ts:404`; `OptionsEditor.test.tsx:706`, `:721`; página `:671`; `GridActions.test.tsx:186`, `:200`; `PricingTab.test.tsx:155`, `:165`; `VariantImagePicker.test.tsx:157` | ✅ G01, G02, E06, E07, P15, B01..B04, R01, R02, I01 mortos |

### Sensor de discriminação — rodada 4

**Método**: arnês próprio (`scratchpad/r4/mut4.py`), escrito nesta rodada. Conferido a seco antes de
rodar que cada um dos 89 alvos aparece **exatamente uma vez**; uma mutação por vez no **arquivo real**;
roda o vitest dos arquivos que cobrem o mutado (as quatro suítes da página do produto quando a mutação a
alcança, a grade rápida quando alcança o editor); restaura e confere o SHA-256 (assert por mutante, e
`shasum -c` dos 11 arquivos de produção no fim: 11 OK — `e9538fa03155` gridSync, `b403f4028ca6`
orphans, `e5667916573d` página, `05cc903128dc` editor, `a9eecfa4dce4` optionLibrary, `1e1b6eda9afa`
useOptionLibrary, `b75988621620` picker, `2634376046e2` VariantsTable, `2a94b73ca808` GridToolbar,
`5ebc974fde29` PricingTab, `c0076b439425` grade rápida). Morte por compilação procurada nos 89 logs
(`Transform failed`, `SyntaxError`, `Failed to parse`, `Failed to load url`, `Unexpected token`,
`ReferenceError`, `TypeError`): **nenhuma**. Gate medido antes, nunca em paralelo com o sensor.

| Grupo | Mutantes | Resultado |
| --- | --- | --- |
| `gridSync.ts` | G01 posição por contagem (QA) · G02 `position + 1` → `position` (QA) · G03 nasce pausada · G04 `>= 0` · G05 preço "de" = preço · G06 estoque 1 · G07 sem a mesma referência · G08 `toKeep` recriado · G09 sem `duplicate` · G10 sem `incomplete` · G11 duplicado sem a dobra · G12 id real sai sem consulta · G13 OPV-06 com o último valor · G14 colisão de A5 · G15 chave da opção removida não sai · G16 `move` ignorado · G18 peso nunca copiado | ✅ 17 mortos por asserção |
| `gridSync.ts` | **G17** re-chaveia para o nome vazio (`const to = n.name`) | ❌ sobreviveu (57/57) — é o S10 da r3 |
| `orphans.ts` | O01 falha da consulta remove · O03 `remove` não remove · O04 `pause` não pausa · O05 id ausente conta · O06 `mergePausedLabels` sem filtro (G12) · O07 aviso substitui | ✅ 6 mortos |
| `orphans.ts` | **O02** `check.orders > 0` → `> 1` | ❌ **sobreviveu (57/57)** |
| página | P01 refletido não recomeça (G1) · P02 resposta pela posição (G2) · P03 a que voltou não é liberada (G3) · P04 "eixos" de volta (G4) · P05 a que voltou segue órfã · P06 galeria não limpa `image_url` (G10) · P07 foto do modal substitui a galeria · P08 grade sem `onUploadingChange` · P09 reconsulta da conferida · P10 aviso substitui · P11 frase da decisão 3 · P12 padrões trocados · P13 peso zerado · P14 biblioteca não chega ao editor · P15 abas `whitespace-nowrap` (QA) · P16 consulta repetida em voo · P17 grade não acompanha | ✅ 17 mortos |
| `OptionsEditor.tsx` | E01 chips só com a opção vazia (decisão 2) · E02 `\|\|` → `&&` (G11) · E03 conjunto aplica só o 1º (decisão 1) · E04 "1 produtos" · E05 acréscimo sem a dobra · E06 fatores com nome vazio (QA) · E07 "Adicionar opção" `nowrap` (QA) · E08 aviso na 1ª opção · E09 Enter troca o texto livre · E10 chip `min-h-9` · E11 sem "em" · E12 chip acrescenta todos | ✅ 12 mortos |
| `optionLibrary.ts` · `useOptionLibrary.ts` | L01 conjuntos por aparição (decisão 1) · L02 conjunto dependente da ordem · L03 conjunto inteiro não sai · L04 chips sem a dobra · L05 sugestão sem excluir presentes · L06 empate sem alfabética · L07 grafia = primeira · L08 conjunto na grafia do último · L09 contagem por ocorrência · L10 até 4 conjuntos · U01 chave fora do pool · U02 coluna `*` · U03 teto de 1.000 | ✅ 13 mortos |
| `VariantImagePicker.tsx` | I01 sem `max-h` (QA) · I02 URL fora da galeria (G10) · I03 a última enviada · I04 falha fecha · I05 `finally` vazio · I06 `h-11 w-11` · I07 sem a frase de OPV-26 · I08 principal escolhe a 1ª foto · I09 atual não marcada · I10 item sem `min-h-11 min-w-11` | ✅ 10 mortos |
| `VariantsTable` · `GridToolbar` · `PricingTab` · grade rápida | T01 sem `relative` · T02 grava na linha 0 · T03 frase antiga · T04 não repassa o envio · B01..B04 `max-w-full`/`min-w-0` (QA) · R01 "Ir para a grade" `nowrap` (QA) · R02 sem `overflow-wrap` (QA) · Q01 grade rápida sem biblioteca · Q02 "Eixos de opção" | ✅ 12 mortos |

**Resultado: 89 injetados · 87 mortos por asserção · 0 por compilação · 2 sobreviventes — FAIL.**

### A consequência de cada sobrevivente

- **O02 → G13 (OPV-04, "as vendidas SHALL ficar na grade pausadas").** "Vendida" é ter **um** pedido;
  toda fixture usa **2** (`orphans.test.ts:31` `orders: 2`; página `:266` `'v-vendida': 2`), e as de
  "sem pedido" usam 0 — `> 0` e `> 1` dão o mesmo resultado nas duas. Sonda (`zzSondaR4.test.tsx`, cópia
  da suíte da página com um caso a mais: produto com `v-um` de **1** pedido, remover o valor dela):
  **verde no código de hoje** (linha na grade, `Ativa` desligado, aviso "…ficaram pausadas: 3,5 cm.");
  **reprova com O02** (a linha some da grade e o aviso não aparece). No mundo do mutante a variação
  vendida uma vez sai da grade, e o salvar tentaria apagá-la — o banco recusaria pela FK `NO ACTION` de
  `order_items` (não medido aqui). A sonda foi apagada; `orphans.ts` restaurado com o SHA conferido
  (`b403f4028ca6`).
- **G17 (= S10 da r3, observação).** O nome vazio só chega ao re-chaveamento sem ser pulado quando a
  opção também está sem valores — e aí a linha é órfã nos dois mundos. Continua sem entrada pela tela
  que eu ache; candidato a equivalente, como a r3 declarou.

### Lacunas, ranqueadas

1. **G13 — o limiar de OPV-04 sem caso no limiar (O02).** Conserto proposto: em `orphans.test.ts`,
   `orphanVerdict('a', '3,5 cm', { orders: 1 }).outcome` === `'pause'`; e, se quiser a fiação, o caso da
   sonda pela página (`'v-um': 1` ⇒ linha pausada, nomeada, nenhum `delete`). Lição nova candidata
   **L-071** registrada à mão em `.specs/LESSONS.md` (sem `lessons.py`, como manda a memória do projeto).

### Observações, sem lacuna (não reprovam)

- **Esta é a 4ª rodada.** O protocolo limita o ciclo conserto → reverificação a 3 rodadas antes de
  escalar ao usuário; a lacuna que sobra é de um caso só, mas a decisão de consertar mais uma vez ou
  fechar é do usuário.
- **Decisões a confirmar**: as três do QA (A1/OPV-19 conjuntos, OPV-19 chips que permanecem, OPV-04 a
  frase e o "não religa") e A2..A9 seguem marcadas "confirmar" na spec.
- **Navegador**: as decisões do QA não foram reverificadas em navegador depois do conserto (o botão de
  conjunto longo embrulhando em 390 é o que falta medir — adendo do relatório de QA).
- **OBS-P01** (o aviso de pausadas não some na releitura) e **o aviso com rótulo repetido no mesmo
  lote** seguem para decisão, como na r3. P12 da r3 segue equivalente na superfície (não reinjetado).
- `apps/mobile-adm/` e `.specs/features/81-79-mobile-adm-aviso-de-pedido` continuam não rastreados na
  árvore, com o prefixo `81` colidindo (D3 da r2).

### Qualidade de código

| Princípio | Status |
| --- | --- |
| Código mínimo / mudança cirúrgica | ✅ — desde a r3 só `mergePausedLabels` em produção, com régua |
| Segue os padrões | ✅ — dobra única, órfãs por id, upload pelo motor da galeria, client injetável |
| Asserções miram o valor da spec | ✅ literais e grade; ⚠️ o limiar de "vendida" (G13) |

### Rastreabilidade (proposta — spec não editada)

| Requisito | Status |
| --- | --- |
| OPV-01..03, 05..28 | ✅ verificado |
| OPV-04 | ⚠️ "vendida" provado com 2 pedidos, não com 1 (G13) |


## Conserto da rodada 4 (2026-10-26, orquestrador)

- **G13 fechado**: `orphans.test.ts` ganhou `um pedido só já é vendida ⇒ pausa (o limite da régua)`. Mutante `check.orders > 0` → `> 1` reinjetado em `orphans.ts`: morto por asserção (`expected 'remove' to be 'pause'`); restaurado com SHA-256 conferido.
- **G17** (re-chavear para o nome vazio) segue como candidato a equivalente, declarado; sem entrada pela tela que o distinga.
- Backoffice 3853/218, exit 0. Sem quinta rodada de verificação (acima do limite de 3 ciclos); o caso novo é autor = verificador.
