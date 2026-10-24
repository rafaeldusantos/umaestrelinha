# BUG-20261024-primeiro-toque-em-chip-ou-limpar-se-perde-com-a-busca-em-foco: com o teclado aberto, o primeiro toque num chip de recorte ou em "Limpar" não faz nada

- **Status:** open (regressed, 2026-10-24, reteste-3: o conserto bug-16 está no bundle e não funciona com toque no navegador)
- **Impact (user-side):** Friction (a pessoa toca de novo e funciona; mas é a ação que ela faz logo depois de buscar)
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Adri no celular
- **Journey Step:** J-achar-uma-cliente, buscar e depois trocar o recorte ou desfazer uma busca sem resultado
- **Scenarios:** MAD-clientes-teclado-e-voltar-do-android; MAD-clientes-buscar-nome-email-telefone
- **Found:** 2026-10-24 · **Report:** reports/2026-10-24-mobile-adm-clientes-reteste-2.md
- **Origem:** regressão do conserto B13 (`b13-teclado-aberto-resultados`); o `percurso.cjs` passava 31/31 na rodada 2 e reprova agora.

## Summary

O conserto B13 faz o `h1` virar `sr-only` e some com a linha de frescor enquanto o campo de busca tem o foco.
Ao tocar num chip ou em "Limpar", o campo perde o foco no início do toque; o `h1` e a linha de frescor voltam
e empurram a tela 32 px para baixo **antes do clique**. O dedo já está sobre o lugar onde o botão estava, o
clique cai fora dele e nada acontece. Um segundo toque funciona (o campo já não tem foco, nada se move).

## Reproduction

- **Charter:** CH-clientes-reteste-2 · **Tour:** Feature Tour (touch)
- **Environment:** Chromium 390×844 com toque (`isMobile`, `hasTouch`), build servido `index-BL0Yvu9k.js`, Supabase local

1. Abrir /clientes, tocar "Compraram mais de uma vez", digitar `rosa` no campo (o foco fica no campo).
2. Tocar "Todas" (`touchscreen.tap` no centro do botão medido antes do toque).
3. Alternativa: buscar `Telma Souza` (sem resultado) e tocar "Limpar".

**Expected:** o recorte volta a "Todas" / a busca é limpa no primeiro toque.
**Actual:** nada muda (`aria-pressed` do chip continua `false`, URL com `?recorte=recorrentes`; o campo continua com "Telma Souza"). Medido: o chip estava em y 160 e, no início do toque, passa a y 192 (+32 px) com o foco em `BUTTON`. Com o mouse (down, 400 ms, up) o mesmo.
Teclado (foco no botão + Enter) funciona. /pedidos não tem o problema (a página não troca o layout no foco).

## Evidence

- `docs/qa/evidence/2026-10-24-mobile-adm-clientes-reteste-2/N01-toque-no-chip-com-busca-em-foco-nao-troca.png`
- `docs/qa/evidence/2026-10-24-mobile-adm-clientes-reteste-2/N01-limpar-com-toque-nao-limpa.png`

## Suggested fix (not applied)

Não mudar o layout na perda de foco que vem de um toque: ou manter o espaço do `h1` e da linha de frescor
(visualmente ocultos, sem sair do fluxo), ou adiar a volta do layout até depois do clique (por exemplo, só
reagir ao `focusout` se nenhum `pointerdown` estiver em curso). Teste de regressão: em jsdom não há layout;
o guarda é a prova em navegador por toque (`N01`), mais um teste de que o `h1` não muda de classe no `focusout`
disparado por `pointerdown` num botão da própria página.

## Regressed (2026-10-24, reteste-3, rodada 4)

O conserto `bug-16` (`useBuscaEmFoco` segura a saída do foco durante o toque) está no bundle servido
(`index-B2-1-LGG.js`, conferido) e **não resolve o defeito**: 390×844, toque (`touchscreen.tap`), clique do
Playwright e mouse (down, 400 ms, up) reprovam igual. "Todas" continua `aria-pressed=false`, URL com
`?recorte=recorrentes`, campo com o texto; "Limpar" por toque não limpa (campo "Telma Souza" depois do toque).
Por teclado (Enter no botão) funciona, e o campo recebe o foco de volta.

**Causa medida** (`evidence/2026-10-24-mobile-adm-clientes-reteste-3/diag-ordem-dos-eventos.cjs`). A ordem de eventos
de um toque no Chromium é `pointerdown, touchstart, pointerup, touchend, mousedown, focusout (input), focusin
(botão)`; o `h1` volta a `text-2xl` na mesma passada (y do chip 160 para 192), e `mouseup`/`click` já caem num
`DIV`. O hook segura o `focusout` (`pendente = true`) mas o `focusin` seguinte, no **botão** tocado, cai em
`entrou`, que faz `pendente = false` e `setEmFoco(emBusca(e.target))`, ou seja `false`: o foco passar para outro
controle cancela a espera e aplica a saída na hora. O teste de unidade (`useBuscaEmFoco.test.tsx`, 1763 verdes)
não cobre o `focusin` no botão, por isso a suíte passa.

**Sugestão** (não aplicada, não é escopo de QA): em `entrou`, só cancelar o pendente e mudar o estado quando o alvo
**é** um campo de busca; foco que vai para outro elemento durante o toque mantém a espera até `click`/fim do toque.
Teste novo: `pointerdown` + `pointerup`, `focusout` do campo e `focusin` num botão, e o layout ainda em modo de
busca até o `click`.

Evidência: `evidence/2026-10-24-mobile-adm-clientes-reteste-3/B16-depois-do-toque-em-todas.png`, `B16-limpar-com-toque.png`.

## Resolved (2026-10-24, bug-18)

`entrou` em `useBuscaEmFoco` não cancela mais a espera quando o foco chega ao botão tocado: só aplica a entrada se o
alvo é campo de busca; com o dedo no vidro, qualquer outro foco mantém a espera até o `click` ou o fim do toque.
Testes `useBuscaEmFoco.test.tsx` +2 (reprovavam antes). Remedido: mobile-adm 1765, store 5908, tsc 0, lint limpo.
Reteste em navegador com toque (390x844) pendente.
