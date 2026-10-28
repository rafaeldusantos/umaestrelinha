# BUG-20261028-ordenar-fotos-so-arrastando: Só dá para mudar a ordem das fotos arrastando — sem teclado, e a peça de 28 fotos vira uma lista de 13 mil px

- **Status:** fixed — retestado em navegador (2026-10-28, T14 e T14b, working tree, sem commit; `verified` depois do commit) · os dois achados do reteste (fonte grande e foco sob o rodapé) e o rótulo de uma letra consertados e retestados na T14b · prova em `.specs/features/85-resumo-com-imagens-do-produto/prova-navegador-adendo.md`
- **Impact (user-side):** Friction
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Equipe com TalkBack; Adri cadastrando peças (celular)
- **Journey Step:** J-ver-e-cuidar-das-fotos-da-peca, modal Mídia → ordenar
- **Scenarios:** PNL-midia-teclado-e-leitor; PNL-midia-modal-edicao-completa; PNL-midia-muitas-fotos
- **Found:** 2026-10-28 · **Report:** reports/2026-10-28-backoffice-resumo-com-imagens.md

## Summary

No modal Mídia a ordem só muda arrastando o ladrilho (HTML5 drag-and-drop). Pelo Tab a pessoa passa por Remover,
Alt-text e Gerar de cada foto, mas não existe controle de "mover" — quem usa teclado ou leitor não consegue
escolher a principal. No celular, com 28 fotos, a lista tem 13.208 px de altura numa área de 632 px: levar a última
para o topo é um arrasto de dezenas de telas (e o arrasto HTML5 com o dedo no Android não está provado).

## Reproduction

- **Charter:** CH-midia-teclado-e-leitor / CH-midia-muitas-fotos · **Tour:** Feature Tour
- **Environment:** 1440×900 teclado; 390×844 com `fdc81401-…` (28 fotos, sem salvar)

1. Editar mídia; Tab por todo o modal.
2. Em 390, abrir o modal da peça de 28 fotos e medir a área rolável.

**Expected:** a principal pode ser escolhida sem arrastar (ex.: "Tornar principal"/"Mover para cima").
**Actual:** ordem de Tab: Enviar imagens → (Remover n, Alt-text n, Gerar)×N → Vídeo → Concluir → Close; nenhum
controle de ordem. Área rolável 632 px, conteúdo 13.208 px. **Anterior à 85** (a galeria é a mesma da antiga aba).

## Evidence

- `evidence/2026-10-28-backoffice-resumo-com-imagens/85-qa-18-modal-28-390.png`; relatório, sessões 4 e 6.

## Fix

- **Root cause:** a galeria só mudava a ordem por arrasto HTML5 (`draggable` no ladrilho); não havia controle de ordem no caminho do Tab, e a grade `auto-fill minmax(196px,1fr)` dava UMA coluna em 390.
- **Fix:** feature `85`, T13 (`MOD-08`..`MOD-10`), em `apps/backoffice/src/features/product-form/ui/ImageGallery.tsx`. Cada foto ganhou "←" / "Tornar principal" / "→" (44 px, nomes "Mover a imagem n para antes", "Tornar a imagem n principal", "Mover a imagem n para depois"; "←" e o do meio desabilitados na 1ª, com "É a principal"; "→" desabilitado na última), pelo mesmo `onChange` do arrasto (`alt`/`source` viajam junto). O foco segue a foto até o mesmo botão na posição nova, ou ao vizinho habilitado na ponta; uma região viva irmã da do envio (`data-order-live-region`) anuncia "Imagem movida para a posição n de N" ou "Imagem n agora é a principal". As chaves dos ladrilhos passaram de posição para foto (URL + ocorrência). A grade é `grid-cols-2` abaixo de `sm` e o tile de 196 px a partir dele. A copy diz "Arraste ou use as setas para reordenar."
- **Fix commit:** nenhum — aplicado na working tree do worktree da 85 (sem commit, regra do usuário).
- **Regression test:** `apps/backoffice/src/features/product-form/ui/ImageGallery.test.tsx` › "botões de ordem (MOD-08)", "foco e anúncio depois de mover (MOD-09)", "2 colunas em 390 (MOD-10)" (15 casos, vermelhos antes); `apps/backoffice/src/pages/admin/AdminProductFormPage.midia.test.tsx` › "\"Tornar a imagem 4 principal\" no modal ⇒ o Resumo mostra a foto 4 como principal e marca alterado (MOD-08)". 9 mutantes no arquivo real (setas trocadas, "Tornar principal" sem efeito, foco sem seguir, foco sem vizinho, limite da última aberto, principal da 1ª habilitado, chave por posição, grade sem 2 colunas, anúncio sem posição) mortos por asserção, SHA-256 conferido na restauração.
- **Pendente:** a altura da lista em 390 com 28 fotos, os alvos medidos e o percurso só por teclado em navegador (T14).

## Reteste

- **Data:** 2026-10-28 · **Task:** feature 85, T14 · **Ambiente:** Chromium (Playwright), painel do worktree em
  `:8093`, Supabase local; peças de 28 (`2f0af091-…`) e 6 fotos (`eb0d919d-…`), **nada salvo**.
- **Sintoma original — consertado:**
  - Em 390 a grade tem **2 colunas** (`168px 168px`), 14 linhas; o corpo do modal rola **4.992 px** numa área de
    632 (antes **13.208**). 1440: 4 colunas, 2.969/704.
  - Cada foto tem "←", "Tornar principal", "→": **44×44**, 52×44 e 44×44 em 390 (100×44 o do meio em 1440); 0 botão
    fora do ladrilho; `scrollWidth` documento 390 / corpo 388 = 388; 1440: 1440 / 938 = 938.
  - Só teclado, 390: 19 Tabs até "Tornar a imagem 4 principal", Enter ⇒ a foto vira a 1ª, foco em "Mover a imagem
    1 para depois" (vizinho habilitado), região viva "Imagem 4 agora é a principal", Resumo com a nova principal e
    "Alterações não salvas". Enter em "Mover a imagem 2 para depois" ⇒ vira a 3ª, foco em "Mover a imagem 3 para
    depois", região viva "Imagem movida para a posição 3 de 28". Igual em 1440, mais as pontas (vira a última ⇒
    foco no "←"; vira a 1ª ⇒ foco no "→").
  - Limites: desabilitados só "Mover a imagem 1 para antes", "Tornar a imagem 1 principal" ("É a principal") e
    "Mover a imagem N para depois" (28 e 6).
  - Regressão: arrastar (sintético) ainda reordena; alt-text edita; "Remover imagem 2" tira a foto (28 → 27).
- **Achados novos (não consertados; T14 não conserta) — candidatos a bug próprio:**
  1. **Fonte grande em 390** (raiz a 130/150/200 %): o "Tornar principal" encolhe para **23 / 26 / 34 px** de
     largura (abaixo de 44); a 150 % 28 botões saem do ladrilho (3 px); a 200 % **56 botões** saem (até **68 px**),
     se sobrepõem, e o corpo do modal ganha rolagem horizontal **416 vs 388**. 1440 a 200 %: 27 fora (até 14 px).
     Causa provável: duas setas `w-11` (rem) + meio `min-w-0` numa linha de largura fixa do ladrilho. Fere "alvo ≥ 44"
     de MOD-08. Evidência `85-t14-390-fonte130-ladrilhos.png`, `85-t14-390-fonte200-ladrilhos.png`. (O documento
     passa de 390 a 130 %+ mesmo com o modal fechado — página de trás, anterior, não investigada.)
  2. **Foco sob o rodapé (390)**: depois de "Mover a imagem 2 para depois", o botão focado fica em y 724–768 e a área
     rolável acaba em 730 — encoberto pelo "Concluir"; o foco não rolou a foto para a vista. Evidência
     `85-t14-390-teclado-mover-depois.png`. Em 1440 não ocorre.
  - Paper cut: em 390 a 100 % o rótulo visível de "Tornar principal" mostra uma letra ("☆ T" / "☆ É"); o nome
    acessível está inteiro.
- **Evidência:** `store/.playwright-mcp/85-t14-*.png` (9 arquivos).


## Conserto dos achados do reteste (T14b)

- **Data:** 2026-10-28 · **Ambiente:** o mesmo do reteste; nada salvo.
- **Fix:** em `ImageGallery.tsx`, a fileira de ordem virou `grid grid-cols-2`: "←" e "→" lado a lado
  (`h-11 w-full`, sem largura em rem) e "Tornar principal" na linha de baixo com a largura inteira
  (`col-span-2 min-h-11 w-full`), rótulo que **quebra** em vez de cortar (`whitespace-normal`, ícone `size-3`,
  sem `truncate`); ordem do DOM = visual (←, →, Tornar). Depois de mover, o botão focado recebe
  `scrollIntoView({ block: 'nearest' })`, e os três têm `scroll-my-2` para o anel de foco não ser cortado.
- **Regression test:** `ImageGallery.test.tsx` › MOD-08 "os botões de ordem medem 44 de altura e dividem a
  largura do ladrilho em duas linhas", "a ordem do DOM é a ordem visual…"; MOD-09 "depois de mover, pede ao
  botão focado que role para a vista (block nearest)", "o vizinho que recebe o foco na ponta também é rolado…",
  "sem mover nada, nada é rolado…", "os três botões de ordem têm folga de rolagem…" — vermelhos antes.
- **Reteste (390, 28 fotos, raiz a 100/130/150/200 %):** 0 de 84 botões fora do ladrilho nas quatro (antes 0/0/28/56);
  menor seta 72/65/61/49 px, "Tornar principal" 148/135/127/106 px (antes 52/23/26/34), altura ≥ 44; rótulo nunca
  cortado (2 linhas a 200 %); corpo do modal `scrollWidth` 388 = `clientWidth` 388 nas quatro (antes 416 a 200 %).
  Teclado: Enter em "Mover a imagem 2 para depois" ⇒ foco em "Mover a imagem 3 para depois" **dentro** do corpo
  visível nas quatro fontes (100 %: 678–722 em 98–730, folga 8 px; antes 724–768 com o corpo acabando em 730),
  `elementFromPoint` acerta o botão. 1440: 0 fora nas quatro fontes. Custo: a lista de 28 fotos a 100 % em 390
  passou de 4.992 para **5.664 px** (a linha extra de botões).
- **Evidência:** `store/.playwright-mcp/85-t14b-390-fonte{100,130,150,200}.png`,
  `85-t14b-390-teclado-mover-depois-fonte{100,130,150,200}.png`, `85-t14b-1440-fonte*.png`.
