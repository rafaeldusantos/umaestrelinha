# Marca Uma Estrelinha — vetores canônicos

**Origem**: arquivo do Paper **"Uma Estrelinha"** (`01KVZTRJXYB9S4M2EXA8BSV5EW`), prancha
**`78R-0` — "Uma Estrelinha — Logotipo oficial completo"** e prancha **`734-0` — "Logo final e
aplicações"**.
**Exportado em**: 2026-08-08 · feature `20-rebrand-uma-estrelinha`, task **T24**.

Este diretório é a **fonte** da marca no repositório. `apps/store/src/shared/ui/brand/paths.ts` é
**gerado** daqui por `_gen-paths.mjs` (T25) e um teste compara os dois caractere a caractere — são
~10KB de coordenada, e transcrever à mão deforma a letra sem quebrar nada visível.

---

## Os arquivos, e o nó do Paper de cada um

| arquivo | nó | viewBox | papel |
| --- | --- | --- | --- |
| `uma-estrelinha-lockup.svg` | `7BM-0` / `7C1-0` | `0 0 900 244.92` | **Logotipo completo** — marca + tipografia + assinatura |
| `uma-estrelinha-lockup-negativo.svg` | idem | idem | o mesmo, em `#F7F3EC`, para superfície escura |
| `uma-estrelinha-assinatura.svg` | `744-0` | `0 0 450.06 97.64` | **Assinatura visual** — marca + tipografia + ornamento, sem a linha "ETERNIZANDO…" |
| `uma-estrelinha-assinatura-negativo.svg` | `73R-0` | idem | idem, negativo |
| `uma-estrelinha-simbolo.svg` | `74I-0` | `0 0 100 100` | **Símbolo** — lua + estrela + duas fagulhas. Do board: *"Use de 48px para cima"* |
| `uma-estrelinha-simbolo-16.svg` | `78N-0` | `0 0 100 100` | **Símbolo reduzido** — só lua e estrela, traço 8,0. É a arte do favicon |
| `uma-estrelinha-selo.svg` | `7BA-0` | `0 0 1000 1000` | **Selo circular** — anel + marca + assinatura curva. Para carimbo, etiqueta e selo de embalagem |
| `uma-estrelinha-selo-negativo.svg` | idem | idem | idem, negativo |

Cores, direto da prancha `734-0` ("05 · APLICAÇÕES APROVADAS"): positivo `#283A4A`
(`--estrelinha-primary-strong`), negativo `#F7F3EC` (`--estrelinha-on-primary`).

---

## A marca é MONOLINE, e isso muda a regra estrutural herdada

A marca da Nanita era **preenchimento**: letras fechadas, contadores vazados, e por isso a regra
*"cada cor é UM `<path>` com `fill-rule="evenodd"`"* — separar os subpaths pintava o miolo do `a` por
cima do corpo e a letra saía maciça.

Esta marca é o oposto: **todo desenho é traço** (`fill="none" stroke="…"`). Não há contador para
vazar, e `fill-rule` não tem efeito nenhum sobre um path que não preenche. Copiar o atributo para cá
seria cargo cult — um atributo inerte que sugere uma regra que não está valendo.

**O que transfere é a consolidação, com outro critério: um `<path>` por PAPEL DE TRAÇO.** Aqui o que
divide os paths não é a cor (é uma só) — é a **espessura**, que é geometria. Dois papéis com a mesma
espessura viram um path só; papéis com espessuras diferentes não podem ser fundidos sem mudar o
desenho.

**O export do Paper vem partido** — um `<path>` por sub-elemento da camada — e foi consolidado:

| arquivo | como saiu do Paper | como está aqui |
| --- | --- | --- |
| lockup | 8 `<path>` em 4 `<g>` | **4 `<path>`** — marca (6,02) · tipografia (5,7) · assinatura (1,5) · losangos (2,32) |
| assinatura | 7 `<path>` em 3 `<g>` | **3 `<path>`** — marca (2,4) · losangos (1,29) · tipografia (3,15) |
| símbolo | 4 `<path>` | **2 `<path>`** — marca (2,46) · fagulhas (1,32) |
| símbolo 16 | 2 `<path>` | **1 `<path>`** (8,0) |
| selo | 6 `<path>` em 4 `<g>` | **4 `<path>`** — anel (14,3) · marca (15,21) · assinatura curva (4,97) · losangos (8,17) |

Além da consolidação, a normalização resolveu o `style="stroke: …"` que o Paper emite **por cima** do
atributo `stroke=`: aqui só existe o atributo, com o valor que de fato pinta. Um arquivo com a cor
declarada em dois lugares é a mesma armadilha da paleta em dois arquivos, na escala de um SVG.

O teste que guarda isto (`shared/ui/brand/__tests__/paths.test.ts`) verifica o que importa nesta
marca: **cada papel é exatamente um `<path>` renderizado, e nenhum `<svg>` emite dois paths com o
mesmo par (cor, espessura)** — que é o sintoma de um papel partido em elementos.

---

## A escada de redução, medida

Os traços são finos e proporcionais à largura: reduzir a marca não borra a letra, **apaga a linha**.
O piso de cada degrau é o tamanho em que o traço estrutural mais fino ainda ocupa um pixel inteiro
(abaixo de 1px o traço não é a cor da marca — é o cinza do antialias).

| degrau | componente | proporção | traço estrutural mais fino | piso | o que rende no piso |
| --- | --- | ---: | --- | ---: | --- |
| 1 | `EstrelinhaLockup` | 3,674:1 | assinatura **1,5** = 0,167% da largura | **600px** | traço 1,00px · caixa alta 10,0px |
| 2 | `EstrelinhaSignature` | 4,610:1 | marca **2,4** = 0,533% da largura | **190px** | traço 1,01px · tipografia 1,33px |
| 3 | `EstrelinhaSymbol` | 1:1 | marca **2,46** = 2,46% do lado | **48px** | traço 1,18px |

**O 48px do degrau 3 não é escolha nossa — é o board.** A nota de `74N-0` diz *"Use de 48px para
cima"*, e 2,46% × 48 = **1,18px**. Abaixo disso o próprio board troca de desenho: `74Q-0` registra
que *"abaixo de 32px o símbolo completo vira mancha: as pétalas e as fagulhas fecham"*, e a redução
(`78N-0`) *"usa traço 8,0, calibrado para render pelo menos 1,3px de linha a 16px. É quase 3× o traço
do símbolo grande, e é proposital."* Por isso `EstrelinhaSymbol` **troca de arte** abaixo de 48px, em
vez de encolher a mesma — os cinco tamanhos da tira de escala do board (64 · 48 · 32 · 24 · 16) usam
todos a arte reduzida.

**Header e rodapé usando marcas diferentes é a escada funcionando.** O board da loja (`5MC-0`) reserva
**202×48** para a marca no header — acima do piso do degrau 2 (190px) e muito abaixo do piso do
degrau 1 (600px). Na mesma altura de 48px, o lockup completo mediria **176px de largura, 424px abaixo
do próprio piso**, com a assinatura em 0,29px: uma linha cinza onde deveria haver 25 letras.

---

## Os ícones — e por que a base quase não tem canto (T27)

Na marca anterior o desenho era o monograma **N**: um glifo vertical, com os
extremos nos eixos. Arredondar o canto não custava nada, e a base mais reta dava
a haste mais grossa — 2,1px no disco, 2,5px no squircle, 2,6px no quadrado.

**Aqui o extremo do desenho é a ponta da estrela, na DIAGONAL** — exatamente onde
um canto arredondado come área. Medido (maior escala que cabe sem cortar a ponta,
e o traço que sobra a 16px):

| base | escala que cabe | traço a 16px |
| --- | ---: | ---: |
| disco (r 50%) | 0,724 | 0,93px |
| squircle (r 28%) | 0,856 | 1,10px |
| **canto 6%** | **1,000** | **1,28px** ← a aba |
| **quadrado sangrado** | **1,000** | **1,28px** ← o `apple-touch-icon` |

A prancha `734-0` calibrou a redução para *"render pelo menos 1,3px de linha a
16px"*. Só a base quase reta entrega isso; o squircle custaria 15% do traço.
**A variável continua sendo quem faz o recorte**: canto próprio na aba, porque o
navegador não arredonda favicon; sangrado no iOS, porque lá o sistema aplica a
própria máscara e arte pré-arredondada deixa sobra de canto.

Medido no raster (`_build-ico.mjs`, linha do meio, tinta clara sobre a placa):
16px → 1px sólido + antialias · 48px → 4px (1,33px equivalente a 16px) ·
180px → 15px (1,33px equivalente). O nominal geométrico é 1,28px; a 16px o grid
de pixel quantiza para 1 sólido.

**O ícone é a redução, não o selo circular.** A `spec.md` (`IDN-07`) diz "selo
circular", mas o selo (`7BA-0`) carrega o anel e 25 glifos de assinatura curva:
a 16px o anel mede 0,23px e a assinatura 0,08px — uma mancha cinza. O board
resolve isso na própria prancha do favicon, e a tira de escala dele (64 · 48 ·
32 · 24 · 16) usa a **arte reduzida** nos cinco tamanhos. O selo fica aqui como
ativo de carimbo, etiqueta e embalagem, que é o uso que o board lhe dá.

## O que NÃO está aqui

- **`516-0` ("Home Loja — Desktop (re-skin)") e `5I2-0` ("Kit de Ícones Custom") estão vazios** — zero
  filhos no arquivo do Paper. Declarados fora de escopo na `spec.md`.
- O raster de `../landing-pages/public/` (`uma-estrelinha-logo.png`, `logo-uma-estrelinha-white.webp`)
  serve de **conferência visual**, nunca de fonte de geometria.
