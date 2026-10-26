# QA Run Report — 2026-10-26 — opções e variações do produto (feature 81)

- **Scope:** branch `feat/81-opcoes-e-variacoes-do-produto` — a aba **Preços & variações** do formulário de produto do painel: grade que acompanha as opções sem "Regerar", sugestões de nome e valores derivadas do catálogo, imagem da variação escolhida e enviada pela própria linha.
- **Cadence tier:** targeted
- **Build:** working tree sem commit sobre `fc2b3b60` · **Environment:** `pnpm dev:backoffice` (:8083) contra o Supabase local (:54441, catálogo importado: 680+ produtos), login do `seed.sql`, Chromium (Playwright). Código servido conferido antes de medir (o módulo do `OptionsEditor` servido tem "Usar os", o da grade não tem "Regerar" e tem `VariantImagePicker`).
- **Started:** 2026-10-26T16:44Z · **Status:** closed

> **Onde mora a árvore**: o `README.md`, `personas.md` e `templates/` desta árvore estão na branch
> `feature/mobile-adm`, não nesta (que sai de `master`). Os arquivos deste ciclo foram escritos no
> formato de lá (área `PNL`, que o README já define) e só **acrescentam** arquivos novos, para o merge
> não ter conflito de add/add. A persona nova (`Adri cadastrando peças`) está declarada no arquivo da
> jornada e entra em `personas.md` no merge.

## Personas

| Persona | Base | Device / Network / Locale | Sessions |
|---|---|---|---|
| Adri cadastrando peças | Power User | 390 × 844 (fonte 100/130/200 %) e 1440 × 900 · wifi · pt-BR | CH-variacoes-cadastrar-pecas-repetidas |

## Flows in Scope

- `J-cadastrar-peca-com-variacoes` — cadastrar uma peça que repete um padrão do catálogo, com a grade ativa e a foto de cada variação (`../journeys/J-cadastrar-peca-com-variacoes.md`)
- Canário adjacente: a grade rápida (`/admin/produtos/grade-rapida`), que usa o mesmo editor.

## Session Matrix & Results

| # | Charter | Journey / Scenario | Persona | Tour | Status | Issue | Fix commit |
|---|---|---|---|---|---|---|---|
| 1 | CH-variacoes-cadastrar-pecas-repetidas | J-cadastrar-peca-com-variacoes / PNL-variacoes-linha-nasce-ativa-com-padroes | Adri cadastrando peças | Data | Pass | | |
| 2 | idem | / PNL-variacoes-sugestao-de-nome-e-valores | idem | Data | Blocked (human decision) | BUG-20261026-usar-os-valores-junta-o-catalogo-inteiro; BUG-20261026-sugestao-de-valores-some-no-primeiro-clique | |
| 3 | idem | / PNL-variacoes-remover-valor-vendido-pausa | idem | Data | Pass | BUG-20261026-valor-devolvido-volta-pausado (decisão) | |
| 4 | idem | / PNL-variacoes-renomear-e-segunda-opcao | idem | Data | Pass | | |
| 5 | idem | / PNL-variacoes-nome-repetido-ou-vazio | idem | Data | Fixed | BUG-20261026-conta-do-cruzamento-com-nome-vazio | working tree |
| 6 | idem | / PNL-variacoes-imagem-na-linha-e-envio | idem | Data | Pass | BUG-20261026-fechar-do-modal-em-ingles (decisão) | |
| 7 | idem | / PNL-variacoes-modal-com-muitas-fotos | idem | Data | Fixed | BUG-20261026-modal-de-imagem-passa-da-tela | working tree |
| 8 | idem | / PNL-variacoes-salvar-e-reabrir-sem-mudar | idem | Data | Fixed | BUG-20261026-posicao-repetida-na-grade | working tree |
| 9 | idem | / PNL-variacoes-fonte-grande-e-390 | idem | Data | Fixed | BUG-20261026-aba-de-precos-rola-com-fonte-grande; BUG-20261026-alvos-pequenos-no-editor-de-opcoes (decisão) | working tree |
| 10 | idem | / PNL-variacoes-grade-rapida-canario | idem | Data | Pass | | |

## Session Debriefs

### CH-variacoes-cadastrar-pecas-repetidas — Adri cadastrando peças

- **Ran:** 16:44Z → 17:40Z (box de 90 respeitado)
- **Percurso** (produto novo, 390): preço 89,90, preço "de" 120,00 → "Adicionar opção" → digitar "tam" (sugestões: Tamanho, Tamanho da corrente, Tamanho de corrente) → escolher **Tamanho** → bloco "Valores usados em outros produtos" com **50** chips e "Usar os 50 valores" → tocar em "16" (o bloco some) → "1" no campo mostra 10, 11 … 18 → escolher 17 → digitar 18 + Enter. Três linhas **ativas**, 89,90 / 120,00, estoque 0, sem clicar em gerar. Peso padrão posto depois (50 g) só vale para a linha criada depois (19 → 50), como a spec manda. Remover 19 → a linha sai. Preço de 17 → 99,00; renomear para **Aro** → mesmas linhas, 99,00 preservado, cabeçalhos "Aro: 16". Segunda opção **Cor** pelo nome sugerido → chip "Folheado a Prata" → as três linhas ganham Folheado a Prata (17 segue 99,00) → "Folheado a Ouro" pela sugestão do campo → **6** linhas, resumo "2 de 3 opções · 3 × 2 = 6 variações".
- **Imagem** (390): botão **48 × 48** nas 6 linhas; modal do produto sem fotos com "Este produto ainda não tem imagens.", "Usar a principal" e "Adicionar imagens"; envio de **duas** fotos de uma vez → modal fecha, a primeira fica na linha, as duas aparecem na Mídia; reaberto, "Imagem 1" `aria-pressed=true`, itens 108 × 108, "Adicionar imagens" 340 × 44; escolher "Imagem 2" troca a miniatura. 1440: modal 512 px centrado, itens 86 × 86, grade rola dentro do contêiner (708/857), body 1440.
- **Rascunho**: F5 no produto novo oferece "Restaurar rascunho"; restaurado, tirar e devolver "18" mantém 99,00 em 17 e recria as linhas de 18 — o refletido recomeça certo depois da restauração.
- **Salvar e reabrir**: "Salvar rascunho" leva a `/admin/produtos/c3095b60…/editar`; o banco tem as 6 linhas ativas, 17·Prata a 99,00 com a foto, `options` com Aro e Cor. **Mas as posições eram 0, 1, 3, 4, 4, 5** (achado). Reaberto com `sessionStorage` limpo: sem "Alterações não salvas", as mesmas 6 linhas (OPV-08).
- **Bordas**: "aro" numa terceira opção → "Já existe uma opção com este nome." e a grade não muda (OPV-23); trocado para "Gravação" → 6 linhas com "· X". Nome do Aro apagado → 6 linhas mantidas (OPV-24), mas o resumo dizia "3 × 2 × 1 = 2 variações" (achado); "Medida" → cabeçalhos "Medida: 16…".
- **Linha vendida** (`229afd74…`, "Prata 925" com 1 pedido): remover o valor → linha **pausada** e "Estas variações já foram vendidas e ficaram pausadas: Prata 925."; remover "Folheado a Ouro" (0 pedidos) → a linha sai. Devolver "Prata 925" → a linha volta **pausada** e o aviso segue (achado de decisão).
- **Muitas fotos** (`fdc81401…`, 28 fotos) em 390: o modal media 1320 px com o topo em −239 px — título e "Usar a principal" fora da tela, sem rolagem (achado, P1).
- **Fonte 130 / 200 %** em 390: 130 % limpo; 200 % com o body em 466 px (achado).
- **Canário**: grade rápida em 390 sem "eixo", sugestões de nome presentes, body 390.
- **Limpeza**: o produto de teste (`c3095b60…`) e as 6 linhas foram apagados do banco local, e as duas fotos removidas do bucket `product-images`. Nenhum produto do catálogo foi salvo.
- **Bugs filed/updated:** os nove `BUG-20261026-*` abaixo.
- **Scenarios settled:** os dez `PNL-variacoes-*` (ver matriz).
- **Surprises:** o nome "Tamanho" no catálogo cobre aro, milímetros, centímetros e P/M/G — a sugestão por união junta escalas que não convivem.
- **Suggested next charter:** a mesma jornada com leitor de tela (anúncio da linha nova, do aviso de pausa e do combobox) e no Android real.

## What Was Fixed

### BUG-20261026-modal-de-imagem-passa-da-tela: o modal perde o topo com muitas fotos
- **Symptom:** em 390, produto de 28 fotos: título e "Usar a principal" acima da tela, sem rolagem.
- **Root cause:** `DialogContent` sem altura máxima; centrado por `translate`, o excesso sai pelas duas pontas.
- **Fix:** `VariantImagePicker.tsx` — `max-h-[calc(100dvh-2rem)] overflow-y-auto` (working tree).
- **Regression test:** `VariantImagePicker.test.tsx` › "tem altura máxima da viewport e rola por dentro" (vermelho antes).
- **Retested:** 390 a 100 % (caixa 16 → 828, título em 41) e 200 % (32 → 812); "Adicionar imagens" alcançável rolando.

### BUG-20261026-posicao-repetida-na-grade: posição repetida depois de tirar e devolver um valor
- **Symptom:** banco com posições 0, 1, 3, 4, 4, 5.
- **Root cause:** `syncGrid` numerava a linha nova por "quantas ficaram", não pela maior posição que ficou.
- **Fix:** `gridSync.ts` — `firstFree = max(position) + 1` (working tree). As que ficam continuam o mesmo objeto (OPV-03).
- **Regression test:** `gridSync.test.ts` › "tira um valor do meio do cruzamento e devolve: as posições continuam únicas" (vermelho antes: 5 posições distintas em 6). A fixture de "acrescentar um valor cria SÓ as combinações novas" tinha as duas linhas em 0; ganhou 0 e 1, e a asserção `[2, 3]` ficou como estava.
- **Retested:** suíte do modelo e a página real (18 verdes); em navegador, a grade de 6 linhas montada de novo.

### BUG-20261026-aba-de-precos-rola-com-fonte-grande: rolagem lateral a 200 %
- **Symptom:** body em 466 px numa viewport de 390.
- **Root cause:** `whitespace-nowrap` em "Adicionar opção", "Ir para a grade" e nas abas do formulário; `w-36`/`w-44` sem teto nos seletores do "Preencher coluna"; "Comprimento" sem quebra.
- **Fix:** `OptionsEditor.tsx`, `tabs/PricingTab.tsx`, `GridToolbar.tsx`, `AdminProductFormPage.tsx` (working tree).
- **Regression test:** cinco casos por token exato, todos vermelhos antes (`OptionsEditor.test.tsx`, `tabs/PricingTab.test.tsx` ×2, `GridActions.test.tsx`, `AdminProductFormPage.variacoes.test.tsx`).
- **Retested:** 390 a 100/130/200 %: `scrollWidth` 390, `scrollX` 0.

### BUG-20261026-conta-do-cruzamento-com-nome-vazio: "3 × 2 × 1 = 2"
- **Symptom:** resumo contraditório com o nome de uma opção apagado.
- **Root cause:** os fatores filtravam só "tem valores"; `cartesian` exige nome também.
- **Fix:** `OptionsEditor.tsx` (working tree).
- **Regression test:** `OptionsEditor.test.tsx` › "opção com valores e sem nome fica fora dos fatores" (vermelho antes).
- **Retested:** em navegador, "2 × 1 = 2" com o nome apagado e "3 × 2 × 1 = 6" de volta.

## Paper Cuts

| Persona | Where (journey/step) | Felt | Sharpness | Outcome |
|---|---|---|---|---|
| Adri cadastrando peças | escolher nome sugerido | "Usar os 50 valores? Minha peça tem três tamanhos." | sharp | decisão (BUG-20261026-usar-os-valores-junta-o-catalogo-inteiro) |
| Adri cadastrando peças | escolher valores | "Toquei no 16 e os outros sumiram." | sharp | decisão (BUG-20261026-sugestao-de-valores-some-no-primeiro-clique) |
| Adri cadastrando peças | remover valor vendido | "Pus de volta e continua pausada?" | dull | decisão (BUG-20261026-valor-devolvido-volta-pausado) |
| Adri cadastrando peças | editar opções no celular | "O x do valor é minúsculo." | sharp | decisão de desenho (BUG-20261026-alvos-pequenos-no-editor-de-opcoes) |
| Adri cadastrando peças | sugestões de nome | "Tamanho da corrente" e "Tamanho de corrente" lado a lado | dull | dado do catálogo, não código — watching |

## Runtime Errors Observed

- Nenhum erro de console durante a sessão (só os 2–3 avisos de sempre do dev server).

## Human Verifications Needed

- [ ] Android real: andar a jornada no Chrome do celular (teclado virtual sobre o campo de valores, o seletor de arquivo da câmera em "Adicionar imagens", o gesto de voltar com o modal aberto).
- [ ] Leitor de tela: o anúncio do combobox de nome, da linha nova e do aviso de pausa.

## Decisions for a Human

### "Usar os N valores" junta o catálogo inteiro (BUG-20261026-usar-os-valores-junta-o-catalogo-inteiro)
- What's broken: com "Tamanho" o botão acrescentaria 50 valores de escalas diferentes; com "Cor", 22 (`evidence/2026-10-26-opcoes-e-variacoes/81qa-valores-sugeridos-390.png`).
- Why not auto-fixed: é a letra de OPV-19/A1/A2; mudar muda a regra da spec.
- Options: 1. sugerir os **conjuntos** mais usados daquele nome ("16, 17, 18" — 3 peças; "45cm, 50cm" — 3), cada um com "Usar estes"; 2. esconder "usar todos" acima de um teto; 3. manter.
- Recommendation: 1 — mesma leitura de `products.options`, sem tabela nova, e é o que cumpre o objetivo "≤ 3 cliques sem digitar".

### Os chips somem no primeiro toque (BUG-20261026-sugestao-de-valores-some-no-primeiro-clique)
- What's broken: o bloco é condicionado a "opção sem valores" (OPV-19); tocar num chip o esconde.
- Why not auto-fixed: muda a condição escrita na spec.
- Options: 1. manter os chips restantes enquanto ela escolhe; 2. manter como está.
- Recommendation: decidir junto com o anterior.

### Valor devolvido volta pausado (BUG-20261026-valor-devolvido-volta-pausado)
- What's broken: a linha vendida que volta ao cruzamento fica pausada e o aviso não muda.
- Why not auto-fixed: religar sozinho seria uma terceira regra de `is_active` (a spec só tem OPV-02 e OPV-04).
- Options: 1. não religar e trocar a frase da linha que voltou ("voltou à grade e continua pausada"); 2. religar.
- Recommendation: 1.

### Alvos pequenos no editor de opções (BUG-20261026-alvos-pequenos-no-editor-de-opcoes)
- What's broken: "x" do valor 16 px, mover 24 px, remover opção 32 px — anteriores à 81.
- Why not auto-fixed: ampliar por pseudo-elemento sobrepõe as áreas dos chips vizinhos; precisa de desenho.
- Recommendation: chips maiores no celular com "x" de 44 px.

### O fechar dos modais se anuncia "Close" (BUG-20261026-fechar-do-modal-em-ingles)
- What's broken: texto acessível em inglês e alvo de 16 px no X do primitivo.
- Why not auto-fixed: primitivo compartilhado pelos três apps; muda duas asserções da loja.
- Recommendation: tarefa própria, "Fechar" e alvo de 44 px nos dois primitivos.

## Learnings

- A sugestão derivada do catálogo precisa ser medida contra a **distribuição real** dos dados, não contra a fixture do teste: a fixture tinha um "Tamanho" com 3 valores; o catálogo tem 50.
- Modal centrado por `translate` sem altura máxima perde o topo em silêncio; jsdom não vê. Todo modal com lista de tamanho do dado precisa de `max-h` + rolagem.
- Numerar linha nova por contagem (`length + i`) é seguro só enquanto nada sai do meio.

## Final Status

- **Exit gate (full automated suite):** `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` → `Test Files 218 passed (218) · Tests 3823 passed (3823)`, exit 0 · `pnpm --filter @estrelinha/store test --testTimeout=20000` → `Test Files 314 passed (314) · Tests 5754 passed (5754)`, exit 0 · `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` → 0 erros · `npx eslint .` (backoffice) → `28 problems (23 errors, 5 warnings)` = baseline · `pnpm --filter @estrelinha/backoffice build` → verde.
- **Issues by user impact:** Blocks-Completion 1 (fixed) · Data-Loss 0 · Trust-Damage 2 (1 fixed, 1 decisão) · Friction 5 (1 fixed, 4 decisão) · Cosmetic 1 (fixed)
- **Coverage:** 1/1 jornada andada pela persona, mais o canário; leitor de tela e Android real fora (human verify).
- **Verdict:** ready with blocked items — a grade automática e a imagem na linha estão prontas; a sugestão de valores ("Usar os N valores") precisa de decisão antes de cumprir o objetivo da feature.

## Adendo — as três decisões aplicadas (2026-10-26)

O usuário mandou seguir com as recomendações do QA. Decididas pela recomendação, **a confirmar**; cada
uma com teste vermelho antes do código e registrada na `spec.md` (A1, A2, OPV-04, OPV-19, OPV-20):

- `BUG-20261026-usar-os-valores-junta-o-catalogo-inteiro` — **consertado**: até 3 conjuntos mais
  usados daquele nome, cada um com "em N produtos", no lugar da união.
- `BUG-20261026-sugestao-de-valores-some-no-primeiro-clique` — **consertado**: os chips ficam enquanto
  sobrar valor não usado (pela dobra).
- `BUG-20261026-valor-devolvido-volta-pausado` — **consertado**: a linha continua pausada e o aviso diz
  como reativar.

Gate remedido: backoffice `Tests 3836 passed (3836)` em 218 arquivos, exit 0 · store `5754/314`, exit
0 · tipos 0 · 0 · lint backoffice 23/5, store 2/2. **Não reverificado em navegador** depois do
conserto (o botão de conjunto embrulhando em 390 com um conjunto longo é o que falta medir).

