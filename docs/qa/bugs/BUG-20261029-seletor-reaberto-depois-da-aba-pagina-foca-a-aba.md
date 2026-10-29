# BUG-20261029-seletor-reaberto-depois-da-aba-pagina-foca-a-aba: reabrir o seletor depois de sair pela aba "Página da loja" põe o foco na aba, não na busca

- **Status:** verified
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Equipe com TalkBack (e quem usa teclado)
- **Journey Step:** J-montar-o-menu-da-loja, Adicionar item → seletor
- **Scenarios:** PNL-menu-teclado-foco-e-nomes
- **Found:** 2026-10-29 · **Report:** reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r3.md

## Summary

**Da `86`, da correção R04 (QA r2), incompleta.** A primeira vez que o seletor abre, o foco vai para a busca da aba
Categoria, como a correção quis. Se a pessoa passar para a aba "Página da loja" e fechar (Esc ou depois de uma recusa),
na reabertura o seletor volta a mostrar a aba Categoria com a busca — mas o foco cai na **aba "Categoria"**, como antes
da correção. Medido em 390 e 1440 e de 360 a 412 com fonte 130/200 %, sempre depois de ter saído pela aba Página. O
seletor do submenu, aberto sem passar pela aba Página, foca a busca. Quem chega por teclado tem de andar até a busca de
novo no caso comum de quem acabou de usar "Outro endereço".

## Reproduction

- **Charter:** CH-menu-teclado-e-leitor · **Tour:** Feature Tour
- **Environment:** 1440 × 900 e 390 × 844, painel dev, Supabase local

1. `/admin/menu` → "Adicionar item": foco em `busca-categoria` (ok).
2. Tocar "Página da loja", Esc.
3. "Adicionar item" de novo.

**Expected:** foco na busca "Buscar categoria ou subcategoria" (a aba Categoria está selecionada e a busca à vista).
**Actual:** `document.activeElement` é a aba "Categoria" (`aba-categoria`).

## Evidence

- Sessão S5 (report): `raiz 1ª {"foco":"busca-categoria","aba":"aba-categoria"}` · `raiz depois de sair pela aba Página {"foco":"aba-categoria","aba":"aba-categoria","busca":true}`, igual em 390 e 1440.

## Correção (2026-10-29, S02 das "Correções do QA r3")

- Causa: o zero do seletor ("abrir de novo começa do zero") era um `useEffect` em `open`. No primeiro quadro aberto o estado ainda era o da aba "Página da loja" de quando ele fechou, a busca não existia, o `onOpenAutoFocus` não a achava e o Radix punha o foco na primeira aba; o efeito trocava a aba depois.
- `MenuTargetPicker.tsx` aplica o zero DURANTE o render em que `open` vira verdadeiro (o padrão do React para estado derivado de prop), então o primeiro quadro aberto já é a aba Categoria com a busca, e o foco vai para ela.
- Teste que reprovou antes: `MenuTargetPicker.test.tsx` "S02" (+2): fecha na aba Página (por Esc, e depois de uma recusa no "Outro endereço"), reabre e exige aba Categoria selecionada, `document.activeElement` = busca, nunca a aba, e a recusa limpa.
- Navegador (390 e 1440): primeira abertura e reabertura depois de sair pela aba Página (Esc e recusa) dão `{"foco":"busca-categoria","aba":"aba-categoria"}` nos quatro casos.

## Verification (rodada 4)

- **Retested:** 2026-10-29 · **Report:** reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r4.md
- **Result:** verified — 390 e 1440, teclado: reabrir depois de sair pela aba Página por Esc, depois de uma recusa no Outro endereço, e depois de sair pela aba Categoria — `document.activeElement` = `busca-categoria` nos três, aba Categoria selecionada, recusa limpa; digitar "botan" filtra sem clicar. Submenu reaberto: busca. Evidência: `r4-03-reaberto-foco-busca-{390,1440}.png`.
