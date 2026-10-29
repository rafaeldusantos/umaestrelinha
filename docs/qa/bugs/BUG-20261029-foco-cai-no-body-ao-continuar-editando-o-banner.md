# BUG-20261029-foco-cai-no-body-ao-continuar-editando-o-banner: "Continuar editando" na pergunta de descartar o banner deixa o foco no body

- **Status:** verified
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Equipe com TalkBack (e quem usa teclado)
- **Journey Step:** J-montar-o-menu-da-loja, editor do item → Banners → Esc → "Continuar editando"
- **Scenarios:** PNL-menu-teclado-foco-e-nomes; PNL-menu-banners-do-item
- **Found:** 2026-10-29 · **Report:** reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste.md

## Summary

**Da `86`, da correção Q05.** A pergunta "Descartar as alterações do banner?" é nova. Ao escolher "Continuar editando",
ela fecha e o foco vai para o `<body>`, não de volta ao editor (o mesmo padrão que o Q07 consertou nos outros três
diálogos). Quem navega por teclado ou leitor perde o lugar dentro da folha do editor. "Descartar" devolve o foco ao ⋯
do item corretamente.

## Reproduction

- **Charter:** CH-menu-teclado-e-leitor · **Tour:** Feature Tour
- **Environment:** 1440 × 900, painel dev, Supabase local

1. `/admin/menu` → ⋯ de "Joias afetivas" → "Editar nome, ícone e banners" → "Editar banners" → "Adicionar um banner"; digitar um título.
2. Esc → "Continuar editando".

**Expected:** o foco volta ao editor (ao campo que estava em edição ou ao primeiro controle).
**Actual:** `document.activeElement` é o `<body>`.

## Evidence

- `document.activeElement` = BODY logo depois do clique; o editor continua aberto com o banner (1 de 2).

## Correção (2026-10-29, R03 das "Correções do QA r2")

- `MenuItemEditor` guarda o controle focado quando a pergunta abre (Esc, fechar ou "Voltar") e, em "Continuar editando", o `onCloseAutoFocus` da pergunta devolve o foco a ele — ou ao primeiro campo da folha, se ele saiu do DOM. "Descartar" segue o caminho de antes (o ⋯ do item).
- Testes que reprovaram antes: `MenuItemEditor.test.tsx` "R03" (3): Esc no Título ⇒ foco no Título; "Voltar" ⇒ foco no "Voltar"; sem origem ⇒ foco dentro do editor, nunca no `<body>` (`document.activeElement`).

## Verification

- **Retested:** 2026-10-29, Equipe com TalkBack (teclado), 1440 × 900, pelos passos originais (rodada 3) · **Report:** reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r3.md
- **Result:** com o foco no Título do banner (digitado "Teste foco"): Esc → a pergunta abre com o foco em "Continuar editando"; clique nele → foco no **Título** (`banner-titulo-0`), editor aberto e o texto preservado. Esc + Esc e Esc + Enter → foco no Título. "Voltar" → "Continuar editando" → foco em **"Voltar"**, e Tab segue para "Computador" dentro do editor. "Descartar" → foco no ⋯ de "Joias afetivas", e a arte enviada saiu do Storage. Em nenhum caso o foco foi ao `<body>`. Evidência: `evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r3/r3-05-continuar-editando-foco-1440.png`.
