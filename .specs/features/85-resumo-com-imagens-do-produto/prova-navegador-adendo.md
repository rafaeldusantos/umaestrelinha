# Prova em navegador — adendo MOD-08..10 (T14)

**Data**: 2026-10-28 · **Ambiente**: Chromium (Playwright MCP), painel do worktree em `http://localhost:8093`
(Vite dev), Supabase local `:54441`, `*.supabase.co` e `**/g/collect*` abortados. Login
`admin@umaestrelinha.dev`. Produtos: 28 fotos `2f0af091-…` e 6 fotos `eb0d919d-…`. **Nenhum produto foi
salvo**: toda saída da página descartou com `beforeunload` aceito (a reabertura mostrou a ordem original).
Fonte grande = `font-size` da raiz em 130/150/200 % (as medidas em `rem` crescem; as em `px` não).
Screenshots em `store/.playwright-mcp/85-t14-*.png`.

## 1. Altura da lista e colunas (MOD-10)

| | 390×844 | 1440×900 |
| --- | --- | --- |
| Colunas da grade | **2** (`168px 168px`) | 4 (`215.5px` ×4) |
| Linhas (28 fotos) | 14 | 7 |
| Ladrilho | 168 × 320 | 216 de largura |
| Grade | 4.636 px | — |
| `scrollHeight` do corpo do modal / área visível | **4.992 / 632** (antes **13.208**) | 2.969 / 704 |
| Peça de 6 fotos, `scrollHeight` / área | 1.340 / 632 | — |

Em 390 a lista caiu de 13.208 para 4.992 px (−62 %). **PASS.**

## 2. Alvos e estouro (MOD-08)

Fonte 100 %:

| | 390 | 1440 |
| --- | --- | --- |
| "←" / "→" | 44 × 44 | 44 × 44 |
| "Tornar principal" | **52 × 44** | 100 × 44 |
| Menor botão de ordem (84 botões) | 44 × 44 | 44 × 44 |
| Botões fora do ladrilho | 0 | 0 |
| `scrollWidth` documento / modal / corpo | 390 / 388=388 / 388=388 | 1440 / 938=938 |

**PASS a 100 %**, com um paper cut: em 390 o rótulo visível de "Tornar principal" cabe só em **uma letra**
("☆ T", e "☆ É" na 1ª) — o nome acessível está completo, o texto visível não diz nada
(`85-t14-390-modal-28.png`).

Fonte grande, 390, modal aberto (28 fotos):

| Fonte | Botões fora do ladrilho | Pior estouro | "Tornar principal" (L) | corpo `scrollWidth`/`clientWidth` | documento |
| --- | --- | --- | --- | --- | --- |
| 130 % | 0 | 0 | **23 px** (×57) | 388 / 388 | 418 |
| 150 % | 28 | 3 px | 26 px | 388 / 388 | 482 |
| 200 % | **56** | **68 px** | 34 px (×88) | **416 / 388** | 643 |

1440 a 200 %: 27 botões fora do ladrilho (pior 14 px), "Tornar principal" 34 px; corpo 938 = 938, documento 1440.

**FAIL com fonte grande (defeito, não consertado — T14 não conserta)**:
- A partir de **130 %** o botão do meio encolhe para **23 px** de largura (abaixo de 44): `min-w-0` e as duas setas
  `w-11` (em `rem`) comem a linha de 168 px.
- A **150 %+** os botões saem do ladrilho e se sobrepõem; a **200 %** o "→" passa 68 px da borda do ladrilho, o
  corpo do modal ganha **28 px de rolagem horizontal** (416 vs 388) e o "→" da coluna direita é cortado pela borda da
  tela (`85-t14-390-fonte200-ladrilhos.png`, `85-t14-390-fonte130-ladrilhos.png`).
- `scrollWidth` do **documento** passa de 390 já a 130 % **também com o modal fechado** (643 a 200 %): é a página de
  trás, anterior a este adendo, e não foi investigada aqui.

## 3. Só teclado (MOD-08, MOD-09)

390×844, 28 fotos, a partir do modal recém-aberto:

1. **19 Tabs** até "Tornar a imagem 4 principal" (a 1ª foto pula "←" e "Tornar", desabilitados). Ordem por foto:
   Remover n → ← → Tornar → → → Alt-text n → Gerar.
2. Enter ⇒ a foto `…817` (antes a 4ª) vira a 1ª e as três de antes descem uma (verificado pelos `src`). Foco em
   **"Mover a imagem 1 para depois"** (o vizinho habilitado: ← e Tornar ficaram desabilitados). Região viva
   `data-order-live-region`: **"Imagem 4 agora é a principal"**. O Resumo atrás passou a mostrar `…817` como
   principal e o cabeçalho diz **"Alterações não salvas"**. **PASS** (`85-t14-390-teclado-principal.png`).
3. Tab até "Mover a imagem 2 para depois", Enter ⇒ a 2ª vira a 3ª (trocou com a vizinha). Foco em **"Mover a
   imagem 3 para depois"** (mesmo botão, posição nova). Região viva: **"Imagem movida para a posição 3 de 28"**.
   **PASS no comportamento**, com um achado:
   - **Foco fora da vista (390)**: o botão focado ficou em y 724–768, e o corpo rolável termina em 730 — o botão
     está sob o rodapé fixo ("Concluir"); `elementFromPoint` no centro dele não acerta o botão. O foco programático
     não rolou a foto para a área visível; quem enxerga perde o anel de foco depois de mover para a linha de baixo
     (`85-t14-390-teclado-mover-depois.png`). Leitor de tela não é afetado (anúncio e foco certos).

1440×900 (repetido, mais as pontas):

| Ação | Foco depois | Região viva |
| --- | --- | --- |
| Enter em "Tornar a imagem 4 principal" (20 Tabs) | Mover a imagem 1 para depois | Imagem 4 agora é a principal |
| Enter em "Mover a imagem 2 para depois" | Mover a imagem 3 para depois | Imagem movida para a posição 3 de 28 |
| Enter em "Mover a imagem 28 para antes" | Mover a imagem 27 para antes | Imagem movida para a posição 27 de 28 |
| Enter em "Mover a imagem 27 para depois" (vira a última) | Mover a imagem 28 para antes (vizinho) | Imagem movida para a posição 28 de 28 |
| Enter em "Mover a imagem 2 para antes" (vira a 1ª) | Mover a imagem 1 para depois (vizinho) | Imagem movida para a posição 1 de 28 |

Em 1440 nenhum foco ficou encoberto. Resumo atrás com a nova principal. **PASS.**

## 4. Limites (MOD-08)

Desabilitados, nas duas larguras e nas duas peças: **"Mover a imagem 1 para antes"**, **"Tornar a imagem 1
principal"** (texto "É a principal") e **"Mover a imagem N para depois"** (28 e 6). Nenhum outro. **PASS.**

## 5. Regressão rápida (1440)

- **Arrastar** (`dragstart` na 5ª → `dragover`/`drop` na 1ª → `dragend`, com um tique entre eventos): a 5ª virou a
  1ª e as demais desceram. **PASS.** (Os mesmos eventos disparados no mesmo tique síncrono não movem — o
  `setDragIdx` do `dragstart` ainda não comprometeu; artefato do arnês, um arrasto real nunca é síncrono.) O arrasto
  não atualiza a região viva (não exigido): ela seguiu com o texto da última ação por botão.
- **Alt-text**: "Alt-text da imagem 1" aceitou "Teste T14 alt". **PASS.**
- **Remover**: "Remover imagem 2" ⇒ 28 → 27 fotos, a foto saiu. **PASS.**
- Nada salvo; a página foi abandonada com `beforeunload` aceito.

## Não provado aqui

TalkBack/VoiceOver real lendo a região viva; arrasto com o dedo no Android; fonte do sistema de um aparelho real
(a régua aqui foi o `font-size` da raiz).

## Veredito

MOD-08..10 **passam a 100 %** em 390 e 1440 (lista −62 %, 2 colunas, alvos 44, teclado, foco, anúncio, limites).
**Dois achados abertos**, não consertados por esta task:
1. **Fonte grande (130 %+) em 390**: "Tornar principal" com 23 px de largura; a 150 %+ botões fora do ladrilho; a
   200 % rolagem horizontal de 28 px no corpo do modal. Fere "alvo ≥ 44" e "sem estouro" de MOD-08.
2. **Foco sob o rodapé** depois de mover para a linha de baixo em 390.

Paper cut: rótulo visível "Tornar principal" truncado a uma letra em 390 a 100 %.

## Conserto e reteste (T14b)

**Data**: 2026-10-28 · mesmo ambiente (painel do worktree em `:8093`, Supabase local, `*.supabase.co` e
`**/g/collect*` abortados), peça de 28 fotos `2f0af091-…`, **nada salvo** (saída com `beforeunload` aceito).
Bundle servido conferido antes de medir (o `ImageGallery.tsx` servido pelo Vite contém a fileira nova e o
`scrollIntoView`). Screenshots em `store/.playwright-mcp/85-t14b-*.png`.

### O que mudou em `ImageGallery.tsx`

- **Fileira em duas linhas** (`grid grid-cols-2 gap-1`): "←" e "→" lado a lado na 1ª linha (`h-11 w-full`,
  metade do ladrilho cada; sai o `w-11` em rem), "Tornar principal" na 2ª com a largura inteira
  (`col-span-2 min-h-11 w-full`). A ordem do DOM passou a ser a visual (←, →, Tornar), para o Tab seguir o olho.
- **O rótulo quebra em vez de cortar**: a 1ª versão manteve `truncate`, e a medida mostrou o rótulo cortado
  em 27/28 a 130 % e 28/28 a 150 %+ (o ícone `[&_svg]:size-4`, o `gap` e o `padding` são rem e crescem; o texto
  é 11 px). Agora `whitespace-normal leading-tight`, ícone `size-3`, `gap-1 px-1`, sem `truncate`; altura
  **mínima** 44 (`min-h-11`), nunca fixa.
- **Foco visível**: depois de focar o botão na posição nova, `button.scrollIntoView({ block: 'nearest' })`; os
  três botões ganharam `scroll-my-2` (a 1ª medida, sem ele, deixava o botão rente à borda do corpo, 730 = 730,
  com o anel de foco de 4 px cortado).

Testes (vermelhos antes, token exato), em `ImageGallery.test.tsx`: a fileira `grid-cols-2` com setas
`h-11 w-full` e sem `w-11`; o do meio `col-span-2 min-h-11 w-full whitespace-normal`, sem `h-11` e sem
`truncate`; a ordem do DOM `prev, next, principal`; `scrollIntoView` pedido ao botão focado com
`{ block: 'nearest' }` (e ao vizinho na ponta), e nunca sem mover; `scroll-my-2` nos três. O caso antigo
"setas 44×44, o do meio flexível com `truncate`" foi **reescrito** (a régua de 44 de altura continua).

### Reteste — 390×844, modal aberto, 28 fotos (84 botões de ordem)

| Fonte | Ladrilho | Fora do ladrilho | Seta (menor L) | "Tornar principal" (menor L) | Menor altura | Rótulo cortado | Linhas do rótulo | corpo `scrollWidth`/`clientWidth` | corpo `scrollHeight`/área |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 100 % | 168 | **0** | 72 | 148 | 44 | 0 | 1 | **388 / 388** | **5.664** / 632 |
| 130 % | 160 | **0** | 65 | 135 | 57 | 0 | 1 | **388 / 388** | 6.572 / 570 |
| 150 % | 155 | **0** | 61 | 127 | 66 | 0 | 1 | **388 / 388** | 7.190 / 498 |
| 200 % | 142 | **0** | 49 | 106 | 88 | 0 | 2 | **388 / 388** | 8.832 / 312 |

Antes: a 130 % o do meio media 23 px; a 150 % 28 botões fora; a 200 % 56 fora (pior 68 px) e o corpo 416/388.
**PASS** nas quatro fontes. A 100 % o rótulo diz "Tornar principal" inteiro (antes "☆ T").

**Custo declarado**: a 2ª linha de botões soma ~48 px por linha de ladrilhos; a lista de 28 fotos a 100 % em
390 foi de **4.992 para 5.664 px** (ainda −57 % contra os 13.208 de antes da T13).

1440×900, mesma régua: 0 botões fora a 100/130/150/200 %; setas ≥ 76, meio ≥ 161, altura ≥ 44; corpo 938 = 938
nas quatro; documento 1440. `scrollHeight` 3.305 a 100 %.

O `scrollWidth` do **documento** continua passando de 390 a 130 %+ (418 / 482 / 643) — é a página de trás, igual
à medida anterior, não a galeria; fora deste conserto.

### Reteste — foco depois de "Mover a imagem 2 para depois" pelo teclado (390)

Corpo rolado ao topo, foco no botão, **Enter**:

| Fonte | Focado depois | Botão (y) | Corpo visível (y) | Folga abaixo | Dentro | `elementFromPoint` no centro | Região viva |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 100 % | Mover a imagem 3 para depois | 678–722 | 98–730 | 8 | sim | o botão | Imagem movida para a posição 3 de 28 |
| 130 % | idem | 629–686 | 127–696 | 10 | sim | o botão | idem |
| 150 % | idem | 596–662 | 176–674 | 12 | sim | o botão | idem |
| 200 % | idem | 482–570 | 274–586 | 16 | sim | o botão | idem |

Antes: botão em 724–768 com o corpo terminando em 730 (sob o "Concluir"). **PASS.**

### Gates

`tsc` backoffice **0**; eslint backoffice **23/5** (sem mudança); suíte do backoffice **4301/240**, store
**6176/330**, as duas exit 0 (`--testTimeout=20000`, exit fora de pipe).

### Veredito do conserto

Os dois achados abertos e o paper cut do rótulo estão **consertados e retestados** em 390 (e conferidos em 1440).
Segue não provado: fonte do sistema de um Android real e TalkBack.
