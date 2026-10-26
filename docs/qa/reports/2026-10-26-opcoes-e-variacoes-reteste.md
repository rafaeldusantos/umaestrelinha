# QA Run Report — 2026-10-26 — opções e variações do produto, RETESTE (feature 81)

- **Scope:** reteste de `reports/2026-10-26-opcoes-e-variacoes.md` na branch `feat/81-opcoes-e-variacoes-do-produto`: os 4 bugs consertados, as 3 decisões aplicadas (conjuntos mais usados, chips que permanecem, frase da pausa) e regressão da jornada.
- **Cadence tier:** targeted
- **Build:** working tree sem commit sobre `fc2b3b60` · **Environment:** `pnpm dev:backoffice` (:8083) contra o Supabase local (:54441, catálogo importado), login do `seed.sql`, Chromium (Playwright). **Código servido conferido antes de medir**: o `OptionsEditor.tsx` servido tem "Conjuntos mais usados" e `whitespace-normal`, e não tem "Usar os"; o `VariantImagePicker.tsx` tem `max-h-[calc(100dvh-2rem)]`; o `gridSync.ts` tem `Math.max`; a página tem a frase "Continuam pausadas mesmo que o valor volte às opções…".
- **Started:** 2026-10-26 · **Status:** closed

## Personas

| Persona | Base | Device / Network / Locale | Sessions |
|---|---|---|---|
| Adri cadastrando peças | Power User | 390 × 844 (fonte 100 e 200 %) e 1440 × 900 · wifi · pt-BR | CH-variacoes-cadastrar-pecas-repetidas (reteste) |

## Flows in Scope

- `J-cadastrar-peca-com-variacoes` (`../journeys/J-cadastrar-peca-com-variacoes.md`)
- Canário adjacente: a grade rápida (`/admin/produtos/grade-rapida`), em 390 e 1440.

## Session Matrix & Results

| # | Charter | Journey / Scenario | Persona | Tour | Status | Issue | Fix commit |
|---|---|---|---|---|---|---|---|
| 1 | CH-variacoes-cadastrar-pecas-repetidas | J-cadastrar-peca-com-variacoes / PNL-variacoes-sugestao-de-nome-e-valores (conjuntos e chips) | Adri cadastrando peças | Data | Pass | BUG-20261026-chips-ocupam-a-tela-depois-do-conjunto (decisão) | |
| 2 | idem | / PNL-variacoes-linha-nasce-ativa-com-padroes | idem | Data | Pass | | |
| 3 | idem | / PNL-variacoes-remover-valor-vendido-pausa (frase nova) | idem | Data | Fixed | BUG-20261026-aviso-de-pausa-continua-depois-de-reativar | working tree |
| 4 | idem | / PNL-variacoes-renomear-e-segunda-opcao | idem | Data | Pass | | |
| 5 | idem | / PNL-variacoes-nome-repetido-ou-vazio (reteste) | idem | Data | Pass | | |
| 6 | idem | / PNL-variacoes-imagem-na-linha-e-envio | idem | Data | Pass | BUG-20261026-fechar-do-modal-em-ingles (decisão, aberta antes) | |
| 7 | idem | / PNL-variacoes-modal-com-muitas-fotos (reteste) | idem | Data | Pass | | |
| 8 | idem | / PNL-variacoes-salvar-e-reabrir-sem-mudar (reteste) | idem | Data | Pass | | |
| 9 | idem | / PNL-variacoes-fonte-grande-e-390 (reteste) | idem | Data | Pass | | |
| 10 | idem | / PNL-variacoes-grade-rapida-canario (390 e 1440) | idem | Data | Pass | | |

## Session Debriefs

### CH-variacoes-cadastrar-pecas-repetidas (reteste) — Adri cadastrando peças

- **Percurso** (produto novo, 390): preço 89,90, preço "de" 120,00, peso 50 g → "Adicionar opção" → "tam" (Tamanho, Tamanho da corrente, Tamanho de corrente) → **Tamanho** → "Conjuntos mais usados": "6mm, 8mm", "45cm, 50cm", "16, 17, 18", cada um "em 3 produtos", e os 50 chips abaixo. Tocar em **"16, 17, 18"** → três linhas **ativas** (89,90 · 120,00 · estoque 0 · 50), resumo "1 de 3 opções · 3 = 3 variações"; o conjunto aplicado sai e entra "P (0,8x0,9cm), M (1x1,1cm) em 2 produtos". Chip **"19"** → 4 linhas, e o chip some da lista (os outros ficam). "1" no campo de valores sugere 10–15, 21, 8x10mm (sem os presentes). "17" digitado de novo não duplica. Remover 19 → a linha sai e o chip volta.
- **Renomear e segunda opção**: 17 → 99,00; "Tamanho" → "Aro" (as sugestões somem, nome desconhecido) com as linhas e o 99,00 mantidos. Segunda opção "co" → **Cor** → conjuntos "Folheado a Ouro, Folheado a Ouro Branco, Folheado a Ródio" (152), "Prata 925 Folheado a Ouro Branco, … Rose" (77), "Folheado a Prata, Folheado a Ouro" (72). O conjunto longo embrulha dentro do cartão em 390 (240 × 110, borda direita 315 = a do grupo). Tocar em "Folheado a Prata, Folheado a Ouro" → **6 linhas ativas**, 17 · Folheado a Prata mantém 99,00, as outras nascem 89,90 — "2 de 3 opções · 3 × 2 = 6 variações".
- **Imagem** (390): botão 48 × 48; modal do produto sem fotos → "Adicionar imagens" com duas fotos → o modal fecha e a primeira fica na linha; reaberto, "Imagem 1" `pressed`, "Imagem 2" troca a miniatura. No banco, `products.images` com as duas. 1440: modal de 512 px centrado.
- **Salvar e reabrir** (o bug da posição): remover "16" e devolver → "Salvar rascunho" → `/admin/produtos/e3485bce…/editar`. No banco, as 6 linhas ativas com posições **1, 2, 4, 5, 6, 7** (únicas), 17·Prata a 99,00 com a foto, peso 0,050. Reaberto com `sessionStorage` limpo: sem "Alterações não salvas", as mesmas 6 linhas e o mesmo resumo.
- **Nome vazio e repetido**: nome do Aro apagado → "2 = 2 variações" com as 6 linhas na grade (OPV-24); "Aro" de volta → "3 × 2 = 6". "aro" na segunda opção → "Já existe uma opção com este nome." e a grade não muda.
- **Linha vendida** (`a789c7aa…`, "Folheado a Ouro" com 1 pedido): remover o valor → a linha fica **pausada** e o aviso, literal: "Estas variações já foram vendidas e ficaram pausadas: Folheado a Ouro. Continuam pausadas mesmo que o valor volte às opções; para vender de novo, ligue “Ativa” na linha da grade." Devolver o valor → a linha volta pausada e o aviso segue (a decisão). **Ligar "Ativa", como o aviso manda → o aviso continuava** dizendo "ficaram pausadas" (achado novo, consertado, abaixo). Nada salvo: a página foi deixada sem salvar e o rascunho local apagado.
- **Muitas fotos** (`fdc81401…`, 28) em 390: caixa 16 → 828, título em 41, "Usar a principal" em 101, rola por dentro (1320 / 810), itens 108 × 108, "Adicionar imagens" 340 × 44 alcançável. A 200 %: caixa 32 → 812.
- **Fonte 200 %** em 390 (raiz a 200 %): produto de 28 fotos e produto novo com "Cor" e um conjunto aplicado → `scrollWidth` 390, nenhum elemento passando de 391 fora de um contêiner de rolagem. Paper cut: o botão de conjunto fica com **96 px** de largura e embrulha palavra por palavra (650 px de altura para o conjunto de 77 produtos).
- **1440**: bloco de sugestões de "Cor" com 684 × 592; a grade rola dentro do contêiner (859 / 708); body 1440.
- **Canário — grade rápida**: 390 e 1440, "Tamanho" sugerido com 3 conjuntos, sem "eixo" nem "Regerar", body sem rolagem lateral.
- **Limpeza**: o produto de teste (`e3485bce…`, "QA 81 reteste — apagar") e as 6 linhas apagados do banco local; as duas fotos removidas do bucket `product-images` pela API do Storage (zero objetos novos na última hora depois). Os dois produtos do catálogo abertos (`a789c7aa…`, `fdc81401…`) não foram salvos — `updated_at` segue em 2026-10-22. Rascunhos locais do formulário apagados do navegador.
- **Bugs filed/updated:** 2 novos (`BUG-20261026-aviso-de-pausa-continua-depois-de-reativar`, consertado; `BUG-20261026-chips-ocupam-a-tela-depois-do-conjunto`, decisão) e seção *Retest* nos 7 de antes.
- **Surprises:** a frase nova da pausa manda religar a linha, e o próprio aviso não reagia a isso — a decisão criou uma instrução que a tela desmentia.
- **Suggested next charter:** a mesma jornada com leitor de tela e no Android real (já pedido no ciclo anterior).

## What Was Fixed

### BUG-20261026-aviso-de-pausa-continua-depois-de-reativar: o aviso de pausa não sai depois de religar a linha
- **Symptom:** ligar "Ativa" na linha vendida deixava "ficaram pausadas: Folheado a Ouro." na tela.
- **Root cause:** o aviso guardava só os rótulos (`pausedOrphans`) e não perguntava à grade de agora.
- **Fix:** `features/product-form/model/orphans.ts` — `mergePausedIds` e `stillPausedLabels`; `pages/admin/AdminProductFormPage.tsx` desenha o aviso pelos rótulos cujas linhas continuam na grade e pausadas. O literal e `mergePausedLabels` não mudaram (working tree).
- **Regression test:** `AdminProductFormPage.variacoes.test.tsx` › "ligar \"Ativa\" na linha vendida, como o aviso manda, tira a linha do aviso" — vermelho antes (recebido "…pausadas: 3,5 cm, 5,5 cm."), verde depois; +3 casos de unidade em `orphans.test.ts`.
- **Retested:** em navegador, 390, `a789c7aa…`: remover o valor → aviso; ligar "Ativa" → aviso some.

## Paper Cuts

| Persona | Where (journey/step) | Felt | Sharpness | Outcome |
|---|---|---|---|---|
| Adri cadastrando peças | depois de escolher "16, 17, 18" | "Ainda tenho 47 chips e conjuntos de mm e cm na frente da grade." | sharp | decisão (BUG-20261026-chips-ocupam-a-tela-depois-do-conjunto) |
| Adri cadastrando peças | fonte 200 % no celular | o conjunto vira uma coluna de uma palavra por linha | dull | watching — sem rolagem lateral; o aperto vem do aninhamento de cartões |
| Adri cadastrando peças | botão de conjunto com leitor de tela | nome acessível "Usar 16, 17, 18 (3 produtos)" × texto "16, 17, 18 em 3 produtos" | dull | watching — o texto visível dos valores está contido no nome |

## Runtime Errors Observed

- Nenhum erro de console (0 errors; os 2–4 avisos de sempre do dev server).

## Human Verifications Needed

- [ ] Android real: a jornada no Chrome do celular (teclado virtual sobre o campo de valores, seletor da câmera em "Adicionar imagens", gesto de voltar com o modal aberto).
- [ ] Leitor de tela: o combobox de nome, os conjuntos, a linha nova e o aviso de pausa.

## Decisions for a Human

### O bloco de sugestões continua ocupando a tela depois do conjunto (BUG-20261026-chips-ocupam-a-tela-depois-do-conjunto)
- What's broken: com "Tamanho", 986 px de sugestões em 390; depois de tocar em "16, 17, 18", 936 px (47 chips e três conjuntos de outras escalas) entre o campo e a grade.
- Why not auto-fixed: é a letra da decisão de 2026-10-26 (OPV-19, "os chips ficam enquanto sobrar valor").
- Options: 1. com a opção já tendo valores, recolher o bloco num "Ver sugestões (N)"; 2. oferecer só conjuntos e chips que compartilham valor com a opção; 3. manter.
- Recommendation: 1.

### Continuam abertas do ciclo anterior
- `BUG-20261026-fechar-do-modal-em-ingles` — "Close" no primitivo compartilhado (tarefa própria).
- `BUG-20261026-alvos-pequenos-no-editor-de-opcoes` — "x" do valor 16 px, mover 24 px, remover opção 32 px (desenho).
- As três decisões aplicadas pela recomendação do QA (conjuntos, chips, frase da pausa) seguem **a confirmar** pelo usuário, como a spec registra.

## Learnings

- Um aviso que manda a pessoa fazer algo precisa reagir quando ela faz: toda frase com instrução ("ligue X") pede o caso de teste do depois.
- "Fica enquanto sobrar" medido contra o catálogo real (50 valores) é uma parede permanente — a regra estava certa no dado da fixture e cara no dado de verdade, como a da união.

## Final Status

- **Exit gate (full automated suite):** `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` → `Test Files 218 passed (218) · Tests 3852 passed (3852)`, exit 0 · `pnpm --filter @estrelinha/store test --testTimeout=20000` → `Test Files 314 passed (314) · Tests 5754 passed (5754)`, exit 0 · `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` → 0 erros · `npx tsc --noEmit -p apps/store/tsconfig.app.json` → 0 erros · eslint backoffice `28 problems (23 errors, 5 warnings)` e store `4 problems (2 errors, 2 warnings)` = baseline · `pnpm --filter @estrelinha/backoffice build` e `pnpm --filter @estrelinha/store build` → verdes.
- **Issues by user impact:** Blocks-Completion 0 · Data-Loss 0 · Trust-Damage 1 (fixed) · Friction 1 (decisão) · Cosmetic 0. Os 4 bugs consertados no ciclo anterior: retestados, passam.
- **Coverage:** 10/10 cenários, 390 · 1440 · 200 %, e o canário; leitor de tela e Android real fora (human verify).
- **Verdict:** ready — a jornada fecha de ponta a ponta; resta uma decisão de produto de baixo impacto (o espaço das sugestões no celular) e as confirmações já pendentes.
