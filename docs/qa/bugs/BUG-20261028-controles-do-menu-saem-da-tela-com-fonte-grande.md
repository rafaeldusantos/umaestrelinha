# BUG-20261028-controles-do-menu-saem-da-tela-com-fonte-grande: com a letra do celular maior, os botões do submenu e o ⋯ saem da tela e a página rola de lado

- **Status:** verified
- **Impact (user-side):** Friction
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Adri montando o menu (celular, fonte aumentada)
- **Journey Step:** J-montar-o-menu-da-loja, submenu aberto
- **Scenarios:** PNL-menu-fonte-grande-e-telas
- **Found:** 2026-10-28 · **Report:** reports/2026-10-28-backoffice-menu-montado-pela-dona.md

## Summary

**Da `86`** (a linha da lista e do submenu). A 100 % tudo cabe (360/390/1024/1440, nada truncado, controles ≥ 44).
A **130 %** em 360/390/412, com um submenu aberto, o botão "Tirar “…” do submenu" fica em x = 456 e o body rola de
lado (`scrollWidth` 456). A **200 %** em 390: o ⋯ das linhas principais em x = 485, Mover/Editar/Tirar do submenu
até x = 701, nomes em reticências ("Linha Leite Ma…", "Joias afeti…"), o título da página vira "Menu …" e o editor
do item rola de lado por dentro (434/388) com o Salvar só rolando. O seletor a 200 % deixa ~40 px de lista entre
cabeçalho e rodapé.

## Reproduction

- **Charter:** CH-menu-celular-fonte-grande-e-movimento · **Tour:** Feature Tour
- **Environment:** Chromium 360/390/412/1024/1440, `html { font-size }` 100/130/200 %

1. `/admin/menu` em 390; abrir o submenu de "Joias afetivas".
2. Fonte a 130 %, depois 200 %; medir `scrollWidth` e a borda direita dos botões.

**Expected:** a linha embrulha (como a 100 %) e todo controle fica dentro da largura; `scrollWidth` = 390.
**Actual:** 130 %: 456; 200 %: 701 (1024/200 %: 1202, pela barra do palco da prévia).

## Evidence

- `evidence/2026-10-28-backoffice-menu-montado-pela-dona/86-qa-16-menu-390-fonte200.png`, `evidence/2026-10-28-backoffice-menu-montado-pela-dona/86-qa-17-linha-e-submenu-390-fonte200.png`, `evidence/2026-10-28-backoffice-menu-montado-pela-dona/86-qa-18-seletor-390-fonte200.png`, `evidence/2026-10-28-backoffice-menu-montado-pela-dona/86-qa-19-editor-390-fonte200.png`

## Correção

- **Rodada:** correções do QA r1 da `86` (2026-10-29), sem commit.
- **O quê / onde:** `MenuTree.tsx`: os blocos de controles do item e do filho passaram de `shrink-0` a `min-w-0 max-w-full flex-wrap justify-end`; nomes, meta e destino de `truncate` a `break-words`; "Adicionar item" e "Adicionar ao submenu" com `h-auto max-w-full whitespace-normal` (o `Button` é `whitespace-nowrap`, e a 200 % ia até x = 493).
- **Teste que prova:** `MenuTree.test.tsx`, "Q06" (5 casos por token exato + sensor; a asserção antiga de `shrink-0` saiu, substituída pela régua oposta). **Medida em navegador** (dev 8083, Supabase local, `*.supabase.co` bloqueado, submenu de "Joias afetivas" aberto, sem gravar nada): 360/390/412 × 100/130/200 % ⇒ `body.scrollWidth` = largura da janela nos 9 casos, 0 elementos além da borda, 0 nomes com reticências, 0 botões abaixo de 44 px. Antes do último conserto, 200 % dava 493 (o "Adicionar ao submenu"). Evidência: `evidence/2026-10-28-backoffice-menu-montado-pela-dona/86-qa-r1-Q06-menu-390-fonte200.png`. **Fora deste conserto**: o editor do item e o seletor a 200 % — fechados no Q06b, abaixo; a barra do palco da prévia em 1024/200 % segue aberta (compartilhada com `/admin/home`, fora do escopo).

### Q06b — o editor do item e o seletor (2026-10-29, sem commit)

- **O quê / onde** (só componentes da `86`; `packages/ui` e a barra do palco intocados):
  - `MenuIconPicker.tsx`: cabeçalho `flex-wrap` com o título `min-w-0 break-words` (o contador "N no conjunto" ia até x = 438); busca `h-9` → `h-11` (36 → 44 px a 100 %); cela `h-[76px]` → `min-h-[76px]` (o rótulo a 200 % não cabia numa altura fixa).
  - `MenuItemEditor.tsx`: par Computador | Celular `min-w-0 max-w-full flex-wrap` (ia até x = 479); botões com texto (Voltar, Editar banners, Remover do menu, Cancelar, Salvar) com `h-auto min-h-11 max-w-full whitespace-normal` (o `Button` é `whitespace-nowrap`); folha com `max-sm:p-4`.
  - `MenuBannerEditor.tsx`: cabeçalho e linha de ações `flex-wrap`; "Adicionar um banner", Descartar e Salvar banners com quebra de linha e 44 px (`size="sm"` é `h-9`; o "Adicionar" ia até x = 467); a cabeça do banner (miniatura + nome + lixeira, que ia até x = 371 em 360) `flex-wrap` com o nome `basis-24 break-words`; lixeira `min-h-11 min-w-11`; Coleção | Peça | Endereço `min-h-11` e `flex-wrap`; `SelectTrigger` e campos `h-11`; "Enviar/Trocar" arte e "remover a arte" `min-h-11`.
  - `MenuTargetPicker.tsx`: no celular a folha tem a altura da tela (`max-sm:h-[calc(100dvh-8px)]`, em px de propósito) com `max-sm:p-3 max-sm:gap-2`; a descrição vira `max-sm:sr-only`; o título `max-sm:text-base pr-8 break-words`; a lista (`lista-do-seletor`) é a parte que rola; o rodapé põe Cancelar e Adicionar lado a lado (`flex-row flex-wrap`, `flex-1 whitespace-normal h-auto`) e embrulha só quando não cabem.
- **Teste que prova** (régua de token exato + sensor, cada caso vermelho antes): `MenuIconPicker.test.tsx` Q06b (+4), `MenuBannerEditor.test.tsx` Q06b (+3), `MenuItemEditor.test.tsx` Q06b (+4), `MenuTargetPicker.test.tsx` Q06b (+5). Dois deles (o rodapé `flex-wrap` e a cabeça do banner `flex-wrap`) nasceram da medida em navegador e foram conferidos por mutação (tirar a classe ⇒ vermelho; arquivo restaurado, SHA-256 igual).
- **Medida em navegador** (Chromium, dev 8083, Supabase local, `*.supabase.co` e GA bloqueados, toda escrita REST bloqueada pelo arnês — nada gravado; editor do 1º item, vista de banners com um banner acrescentado e descartado, seletor "Adicionar item"):

  | | Antes | Depois |
  | --- | --- | --- |
  | 360/390/412 × 100/130 % | body = janela; diálogo sem rolagem; busca de ícone 36 px e "Adicionar um banner" 36 px a 100 % | body = janela; diálogo `scrollWidth` = `clientWidth`; 0 alvos < 44 |
  | editor, 200 % | diálogo `scrollWidth` 437 (contador de ícones) | = largura (358/388/410), 0 elementos além da borda |
  | banners, 200 % | diálogo 482 (par de dispositivo, "Adicionar") | = largura, 0 além da borda, 0 alvos < 44 (com um banner aberto) |
  | seletor, 200 % — altura da área que rola | 1 px (360) · 41 px (390/412) | 361 px (360) · 465 px (390/412) |
  | seletor, 200 % — linhas de categoria inteiras à vista (linha de 106 px) | 0 | 1 + parte da 2ª em 360 (o rodapé embrulha); 2 inteiras + ~80 % da 3ª em 390/412, abaixo da busca |
  | seletor, 100 % / 130 % | 457 / 341–367 px | 673 / 625 px (10 / 6 linhas inteiras) |

  O único alvo < 44 que sobra é o X de fechar do `DialogContent` (16 px a 100 %, 32 a 200 %), que é de `packages/ui` e fora do escopo (o mesmo componente do `BUG-20261026-fechar-do-modal-em-ingles`). Evidência: `evidence/2026-10-28-backoffice-menu-montado-pela-dona/86-qa-r1-Q06b-seletor-390-fonte200.png`, `…-Q06b-editor-390-fonte200.png`, `…-Q06b-banners-390-fonte200.png`.


## Verification

- **Retested:** 2026-10-29, mesma persona/jornada (rodada 2) · **Report:** reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste.md
- **Result:** `/admin/menu` com o submenu de Joias aberto em 360/390/412 × 130/200 %: `scrollWidth` = janela, nenhum controle fora da tela, nenhum alvo < 44 (o interruptor do editor mede 57 × 31 a 130 %, mas tem o `::before` de 53 × 47); seletor, editor e banners sem rolagem lateral (diálogo `scrollWidth` = `clientWidth`); área da lista do seletor 625 px a 130 % e 361/465 px a 200 %. Resta a 200 % no seletor: caminhos e alguns nomes em reticências ("Joias afetivas › Linha Dente de L…", "Coleção Código Mors…") — paper cut, não reabre. 1024/200 %: 1202 pela barra do palco da prévia (da `47`, fora). Evidência `evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste/r2-09-lista-390-fonte200.png`, `evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste/r2-10-seletor-390-fonte200.png`.
