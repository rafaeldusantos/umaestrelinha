# BUG-20261028-previa-da-home-no-celular-abre-o-menu: a prévia da Home no Celular abre com o menu da loja por cima e esconde a Home

- **Status:** verified
- **Impact (user-side):** Trust-Damage
- **Severity:** High · **Priority:** P1
- **Persona Affected:** Adri montando o menu (e toda curadoria da Home)
- **Journey Step:** canário de J-montar-o-menu-da-loja — `/admin/home`, prévia em Celular
- **Scenarios:** PNL-menu-previa-acompanha (adjacente; o canário da `/admin/home` não tem cenário próprio)
- **Found:** 2026-10-28 · **Report:** reports/2026-10-28-backoffice-menu-montado-pela-dona.md

## Summary

**Da `86`.** Ao abrir `/admin/home`, a prévia nasce em Celular (390 × 844) e mostra a **folha do menu da loja aberta**
cobrindo a Home inteira: "Perguntas frequentes · Joias afetivas · … · Conta · Favoritos · Pedidos". A dona abre a tela
para conferir a Home no celular e vê o menu. Fecha no X dentro do quadro, mas a folha volta a cada carga da página e a
cada troca para Celular. A `86` fez a folha acompanhar o quadro de 390 "dentro da prévia" (`prova-navegador.md` (c)),
pensando na prévia do menu; a mudança vale para toda prévia da loja, inclusive a da Home.

## Reproduction

- **Charter:** canário do ciclo da 86 · **Tour:** —
- **Environment:** painel dev :8083, loja dev :8082, Supabase local, Chromium 1440 × 900, pt-BR

1. Entrar no painel e abrir `/admin/home`.
2. Olhar a prévia (Celular, o padrão da tela).

**Expected:** a prévia mostra a Home como a cliente vê ao abrir a loja no celular — sem o menu aberto.
**Actual:** `[role=dialog]` da folha do menu aberto no iframe (`innerWidth` 390), cobrindo a Home. Em Computador (1024) a folha não abre.

## Evidence

- `evidence/2026-10-28-backoffice-menu-montado-pela-dona/86-qa-21-canario-home-previa-com-folha-aberta-1440.png`
- iframe `http://localhost:8082/?preview=1`: 1 diálogo em Celular, 0 em Computador; fechar pelo X dentro do quadro some até a próxima carga. A prévia segue acompanhando a edição sem recarregar (marca em `window` preservada ao ligar/desligar uma seção).

## Correção

- **Rodada:** correções do QA r1 da `86` (2026-10-29), sem commit.
- **O quê / onde:** `apps/store/src/widgets/store-layout/ui/StoreLayout.tsx`: a folha só abre sozinha na prévia do **menu** — `previa && useMenuPreview().draft !== null` (só o canal do menu manda rascunho com `MENU_PREVIEW_SOURCE`); na prévia da Home ela nasce fechada e só abre pelo hambúrguer.
- **Teste que prova:** `apps/store/src/widgets/store-layout/ui/__tests__/StoreLayoutOverlays.test.tsx` — "na prévia da HOME em 390 a folha NÃO abre — nem com as mensagens do canal da Home" (vermelho antes), "abrir pelo hambúrguer continua funcionando", e os dois casos da prévia do menu agora recebem o rascunho. Navegador (dev, 1440): iframe de `/admin/home` em 390 com 0 diálogos; de `/admin/menu` em Celular com 1.


## Verification

- **Retested:** 2026-10-29, mesma persona/jornada (rodada 2) · **Report:** reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste.md
- **Result:** `/admin/home` em 1440 e em 390: iframe `?preview=1` em Celular (`innerWidth` 390) com **0** diálogos ao carregar, 0 em Computador (1024), 0 ao voltar para Celular; o hambúrguer dentro do quadro abre a folha (1). `/admin/menu` em Celular: 1 diálogo, a folha com os itens do menu. Evidência `evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste/r2-01-home-previa-celular-1440.png`, `evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste/r2-02-menu-previa-celular-1440.png`.
