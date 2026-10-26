# 81 — Prova em navegador (OPV-28 e Success Criterion 3)

**Data**: 2026-10-26 · **Quem**: conserto da rodada 1 do Verificador (G5) · **Navegador**: Chromium
(Playwright), painel em `pnpm dev:backoffice` (:8083) contra o **Supabase local** (:54441), login do
`seed.sql`.

**Produto medido**: `Colar com letra Pequena` (`c3ec39a9-…`), 2 opções (`Cor` × 3, `Letra` × 24),
**72 linhas**, 5 imagens — escolhido por ser a grade mais larga e mais longa do catálogo local.

**Nada foi salvo.** O produto não foi gravado em nenhum momento (`products.updated_at` continua
`2026-10-22 11:57`, 72 linhas em `product_variants`); as duas fotos enviadas pelo modal foram
**apagadas** do bucket `product-images` no fim (`storage.remove`, as duas confirmadas).

O código servido foi conferido antes de medir (o `fetch` do módulo `VariantsTable.tsx` servido pelo
Vite contém `relative overflow-x-auto`).

---

## 1. Um defeito achado, e consertado com teste antes

**Na primeira medida em 390, o body rolava na horizontal**: `document.documentElement.scrollWidth` =
**851** numa viewport de 390, e `window.scrollTo(500, …)` levava `scrollX` a **461**. A grade em si
rolava dentro do contêiner (`clientWidth` 290, `scrollWidth` 857) — o que vazava eram os **`<input>`
nativos escondidos** (44×24, `position: absolute`, borda direita em 851): o `Switch` do Radix
desenha um deles por interruptor quando está dentro de um `<form>`, para o envio nativo. O contêiner
`overflow-x-auto` não era bloco de contenção, então o bloco de contenção desses inputs ficava **fora**
dele, e o `overflow` não os recortava.

- **Existia antes da `81`**: o contêiner e o `Switch` da linha são iguais em `HEAD`
  (`git show HEAD:…/VariantsTable.tsx`). Mas OPV-28 é desta feature e diz "sem rolagem horizontal do
  `body`", então o conserto entrou aqui.
- **Confirmado ao vivo antes de mexer no código**: pôr `position: relative` no contêiner pelo
  console levou `scrollWidth` de 851 a **390** e `scrollX` máximo a **0**.
- **Teste antes do conserto**: `VariantsTable.test.tsx` ganhou "o contêiner que rola é também o bloco
  de contenção (`relative`)", por token exato. Reprovou com o código de então
  (`expected [ 'overflow-x-auto', …(3) ] to include 'relative'`) e passou com o conserto
  (`relative overflow-x-auto rounded-xl border border-border`). jsdom não mede layout: a régua é o
  token, e a medida é esta página.

## 2. 390 × 844 (depois do conserto)

| Medida | Valor |
| --- | --- |
| `documentElement.scrollWidth` / `body.scrollWidth` | **390 / 390** |
| `scrollX` depois de `scrollTo(500, …)` | **0** — o body não rola na horizontal |
| contêiner da grade: `clientWidth` / `scrollWidth` / `scrollLeft` máximo | 290 / 857 / **567** — a grade rola **dentro** dele |
| linhas · botões de imagem | 72 · 72 |
| botão de imagem da linha (OPV-11, OPV-28) | **48 × 48** |
| "eixo" no texto da página (OPV-17) | **ausente**; o card diz "As escolhas da peça, como tamanho ou acabamento. Até 3 opções." |
| modal (OPV-12): caixa | 0 → 390 de largura, 225 → 619 de altura; `scrollWidth` do documento 390 com ele aberto |
| itens do modal (OPV-28) | "Usar a principal" e as 5 imagens **108 × 108**; "Adicionar imagens" **340 × 44** |
| imagem atual marcada (OPV-12) | "Imagem 4" com `aria-pressed="true"` — é a da linha (`…/1018834487.webp`) |
| **envio pela linha** (OPV-14/15, SC 3) | `foto-81.png` (600×600) por "Adicionar imagens": **"Salvar rascunho" desabilitado** com o modal aberto e o envio no ar; ao terminar, o modal **fecha**, o salvar volta a habilitar, a miniatura da linha passa a ser `products/d1c187f4-….webp` e a mesma URL aparece **uma vez** na aba Mídia |

Capturas: `.playwright-mcp/81-grade-390.png`, `81-modal-390.png`, `81-linha-depois-390.png`.

## 3. 1440 × 900

| Medida | Valor |
| --- | --- |
| `documentElement.scrollWidth` · `scrollX` depois de `scrollTo(500, …)` | **1440 · 0** |
| contêiner da grade: `clientWidth` / `scrollWidth` | 708 / 857 (rola dentro dele) |
| botão de imagem da linha | **48 × 48** |
| "eixo" no texto da página | ausente |
| modal | 512 de largura, centrado (464 → 976); itens **86 × 86**; "Adicionar imagens" **462 × 44** |
| **envio pela linha** (2ª linha, "Folheado a Ouro Branco · U") | salvar **desabilitado** durante o envio; modal fecha; a miniatura vira `products/ae294bdf-….webp`; a foto aparece na aba Mídia |

Capturas: `.playwright-mcp/81-grade-1440.png`, `81-modal-1440.png`.

## 4. OPV-08 em navegador

Numa aba nova (`sessionStorage` vazio), abrir o produto **sem tocar em nada** mostra "Alterações não
salvas" e grava um rascunho em `sessionStorage`. A causa **não** é a grade: o rascunho tem as 72
linhas **idênticas** às do banco (id, SKU, preço, estoque, ativa, imagem e `option_values`,
comparados linha a linha contra `product_variants` lido pelo client do painel) e as mesmas `options`.
O que difere é a **descrição**: o banco guarda HTML com entidades (`pe&ccedil;a`, `<li>Tipo…`) e o
editor rico (TipTap) a normaliza na montagem (`peça`, `<li><p>Tipo…</p></li>`) e emite `onChange`.

- `RichTextEditor.tsx` não tem diff nesta branch, e a página passa `onChange={v => setField('description', v)}`
  como antes: é comportamento anterior à `81`, fora do escopo dela. **Registrado, não consertado.**
- O OPV-08 da `81` — a grade não é alterada na abertura — está de pé em navegador.

## 5. O que fica de fora, declarado

- **O X de fechar do modal mede 16 × 16** nos dois tamanhos. É o `DialogContent` compartilhado de
  `packages/ui` (15 diálogos do painel); `Esc` e o toque fora também fecham. OPV-28 nomeia "os itens do
  modal" — as escolhas, que medem 108/86 —; o X fica como observação para quem mexer no primitivo.
- **Android real, leitor de tela e rede lenta** não foram medidos.
- **A grade rápida** (`/admin/produtos/grade-rapida`) não foi andada em navegador.

---

# Rodada 2 — a jornada inteira, com a fonte grande (QA da `81`, 2026-10-26)

**Quem**: sessão de QA (`docs/qa/reports/2026-10-26-opcoes-e-variacoes.md`). Mesmo ambiente: painel
em `pnpm dev:backoffice` (:8083), Supabase local, Chromium (Playwright). Código servido conferido antes
de medir (o `OptionsEditor.tsx` servido contém "Usar os"; o `VariantsTable.tsx` servido não contém
"Regerar" e contém `VariantImagePicker`). Fonte grande simulada pondo `font-size` do `<html>` em
130 % e 200 % (o painel mede em `rem`). Capturas em `docs/qa/evidence/2026-10-26-opcoes-e-variacoes/`
(gitignored).

## 1. O percurso da spec, num produto NOVO, em 390 × 844

| Passo | Medida |
| --- | --- |
| "Adicionar opção" → digitar "tam" | sugestões: Tamanho · Tamanho da corrente · Tamanho de corrente |
| escolher **Tamanho** | bloco "Valores usados em outros produtos" com **50** chips (todos 44 px de altura) e **"Usar os 50 valores"** — ver *Achados* |
| tocar no chip "16" | linha `16` nasce **ativa**, 89,90 / 120,00, estoque 0; o bloco de chips some |
| "1" no campo de valores | sugestões 10, 11 … 15, 17, 18 (o 16 já usado fica fora) |
| 17 pela sugestão, 18 por Enter | 3 linhas ativas, mesmos padrões; **nenhum clique em gerar** |
| peso padrão 50 g depois, acrescenta 19 | só a linha 19 nasce com 50 (as de antes ficam sem peso — spec, *Out of Scope*) |
| remove 19 | a linha sai (id temporário, sem consulta) |
| preço de 17 → 99,00; renomeia para **Aro** | as mesmas 3 linhas, 99,00 preservado, cabeçalhos "Aro: 16 · 1 variação" |
| segunda opção **Cor** pelo nome sugerido → chip "Folheado a Prata" | as 3 linhas ganham "Folheado a Prata" e mantêm preço (OPV-06) |
| "Folheado a Ouro" pela sugestão | **6** linhas; resumo "2 de 3 opções · 3 × 2 = 6 variações" |
| botão de imagem da linha | **48 × 48** nas 6 linhas |
| modal sem fotos | "Este produto ainda não tem imagens.", "Usar a principal", "Adicionar imagens" (OPV-26) |
| "Adicionar imagens" com **duas** fotos | modal fecha; a 1ª fica na linha; as duas na aba Mídia; reaberto: "Imagem 1" `aria-pressed=true`, itens **108 × 108**, "Adicionar imagens" **340 × 44**, documento 390 |
| F5 → "Restaurar rascunho" → tira e devolve 18 | 17 segue 99,00; as linhas de 18 voltam com os padrões |
| `scrollWidth` / `scrollX` depois de `scrollTo(500)` | **390 / 0** |

## 2. 1440 × 900

Documento **1440**, `scrollX` 0; contêiner da grade 708 / 857 (rola dentro dele); botão de imagem
**48 × 48**; modal 464 → 976 (512 px), itens **86 × 86**.

## 3. Salvar e reabrir (OPV-08)

"Salvar rascunho" levou a `/admin/produtos/c3095b60-…/editar`. No banco: `options` com Aro (16, 17, 18)
e Cor (Prata, Ouro), 6 linhas ativas, 17·Prata a 99,00 com a foto. Reaberto com `sessionStorage`
limpo: **sem** "Alterações não salvas", as mesmas 6 linhas e preços. As posições gravadas eram
**0, 1, 3, 4, 4, 5** — ver *Achados*. O produto, as 6 linhas e as duas fotos foram **apagados** no fim.

## 4. Bordas

| Caso | Medida |
| --- | --- |
| OPV-23: terceira opção "aro" com valor X | "Já existe uma opção com este nome."; 6 linhas, nenhuma criada; trocar para "Gravação" ⇒ "16 · Folheado a Prata · X"… |
| OPV-24: apagar o nome do Aro | 6 linhas mantidas; renomear para "Medida" ⇒ "Medida: 16 · 2 variações" |
| OPV-04 em produto do catálogo (`229afd74…`, Prata 925 com 1 pedido; nada salvo) | remover "Prata 925" ⇒ linha **pausada** e "Estas variações já foram vendidas e ficaram pausadas: Prata 925."; remover "Folheado a Ouro" (0 pedidos) ⇒ a linha **sai** |
| Devolver "Prata 925" | a linha volta **pausada** e o aviso continua — decisão de produto |
| Canário: grade rápida em 390 | sem "eixo", sugestões de nome, documento 390 |

## 5. Achados — consertados (teste vermelho antes, reteste aqui)

| Achado | Antes | Depois |
| --- | --- | --- |
| **Modal com muitas fotos perde o topo** (`fdc81401…`, 28 fotos, 390) | caixa −239 → 1083, título em −214, `scrollHeight` = `clientHeight` (sem rolagem) | caixa 16 → 828, título em 41, rola por dentro; a 200 %: 32 → 812 |
| **Posição repetida** (tira 18, devolve 18, salva) | 0, 1, 3, 4, 4, 5 | a nova vai depois da maior que ficou (`gridSync.test.ts`) |
| **Fonte a 200 % em 390** | documento **466** (`scrollX` 76): abas do formulário, "Adicionar opção", "Ir para a grade", seletores do "Preencher coluna", "Comprimento" | **390 / 0** a 100, 130 e 200 % |
| **Resumo com o nome apagado** | "3 × 2 × 1 = 2 variações" | "2 × 1 = 2 variações" |

130 % já estava limpo antes (documento 390, botão de imagem 62 × 62).

## 6. Achados — esperando decisão (não consertados)

- **"Usar os 50 valores"**: a biblioteca une os valores de **todos** os produtos com o nome — no
  banco local os conjuntos mais comuns de Tamanho são "6mm, 8mm", "16, 17, 18" e "45cm, 50cm" (3 peças
  cada). Letra de OPV-19/A2.
- **Os chips somem no primeiro toque** (OPV-19 condiciona o bloco a "sem valores").
- **Valor devolvido volta pausado** e o aviso não muda.
- **Alvos pequenos no editor** (anteriores à 81): "x" do valor 16 × 16, mover 24 × 24, remover opção
  32 × 32.
- **O X do modal se anuncia "Close"** (primitivo compartilhado; continua 16 × 16, como a rodada 1 já
  registrou).

## 7. Fora, declarado

Android real, leitor de tela, rede lenta e falha de envio em navegador (a falha está provada em
`VariantImagePicker.test.tsx`).
