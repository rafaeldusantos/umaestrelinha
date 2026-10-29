# BUG-20261028-banner-em-edicao-some-ao-trocar-de-aba-ou-esc: o banner que a dona está montando some sem aviso ao trocar Computador/Celular ou apertar Esc

- **Status:** verified
- **Impact (user-side):** Friction
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Adri montando o menu
- **Journey Step:** J-montar-o-menu-da-loja, ⋯ → Editar nome, ícone e banners → Editar banners
- **Scenarios:** PNL-menu-banners-do-item
- **Found:** 2026-10-28 · **Report:** reports/2026-10-28-backoffice-menu-montado-pela-dona.md

## Summary

**Da `86`** (o editor de banners da `39` passou a morar dentro do editor do item, com a troca Computador/Celular
dentro dele). A dona adiciona um banner, escreve o título e **envia a arte** (já no Storage). Se tocar "Celular" para
conferir o outro dispositivo e voltar a "Computador", o banner sumiu ("0 de 2"). Se apertar Esc, o editor inteiro
fecha e o banner some. Em nenhum dos dois há aviso de que há alterações não salvas; a arte enviada fica órfã no
Storage (`home-images/menu/…`). Salvando com "Salvar banners" antes de trocar, tudo grava e chega à loja.

## Reproduction

- **Charter:** CH-menu-editar-nome-icone-banners · **Tour:** Interrupt Tour
- **Environment:** 1440 × 900, painel dev, Storage local

1. ⋯ de um item → Editar nome, ícone e banners → Editar banners → Adicionar um banner.
2. Título "TESTE-86-QA- Banner"; Enviar a arte do computador (aparece "640 × 380").
3. Tocar "Celular" e depois "Computador".

**Expected:** o banner continua lá (ou a tela pergunta antes de descartar).
**Actual:** "0 de 2 · Nenhum banner." — título e arte perdidos; nenhum aviso. Com Esc no passo 3: editor fechado, nada gravado (`banners` = null no documento).

## Evidence

- `evidence/2026-10-28-backoffice-menu-montado-pela-dona/86-qa-14a-banner-antes-de-trocar-aba.png`, `evidence/2026-10-28-backoffice-menu-montado-pela-dona/86-qa-14b-banner-sumiu-ao-voltar.png`
- Storage local: dois objetos `menu/*.webp` sem dono depois dos descartes (apagados na limpeza).

## Correção

- **Rodada:** correções do QA r1 da `86` (2026-10-29), sem commit.
- **O quê / onde:** `MenuBannerEditor.tsx`: um rascunho por dispositivo (a troca Computador/Celular só muda qual aparece; "Salvar banners" grava os dois, com a régua nos dois), e as artes enviadas na sessão são rastreadas — o que não fica no gravado sai do Storage ao descartar e ao salvar. `MenuItemEditor.tsx`: Esc/fechar/"Voltar" com rascunho pergunta "Descartar as alterações do banner?" (Continuar editando · Descartar). O apagar é `deleteStorageImage` em `shared/lib/uploadImage.ts`, chamado por `deleteBannerImage` (só dentro de `home-images/menu/`).
- **Teste que prova:** `MenuItemEditor.test.tsx`, "Q05 — o banner em edição não some sem aviso" (7 casos, 6 vermelhos antes); `uploadImage.test.ts` "deleteStorageImage" (3).


## Verification

- **Retested:** 2026-10-29, mesma persona/jornada (rodada 2) · **Report:** reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste.md
- **Result:** 1440, "Joias afetivas" → Editar banners: banner com título e arte enviada, Computador → Celular (0 de 2) → Computador: o banner continua (1 de 2, título preservado). Esc pergunta "Descartar as alterações do banner?"; "Continuar editando" mantém; "Descartar" fecha e a arte enviada sai do Storage (lista igual à de antes). "Voltar" com alteração também pergunta. Banner no Computador + banner no Celular, arte do computador trocada uma vez, "Salvar banners": o banco tem 1 + 1, os 3 objetos restantes são exatamente os referenciados (a arte trocada saiu); a loja mostra o banner do computador no mega menu (1440) e o do celular no acordeão da folha (390). **Achado novo**: "Continuar editando" deixa o foco no `<body>` — `BUG-20261029-foco-cai-no-body-ao-continuar-editando-o-banner`. Evidência `evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste/r2-08-descartar-banner-1440.png`, `evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste/r2-11-loja-1440-mega-banner.png`, `evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste/r2-12-loja-390-folha-joias.png`.
