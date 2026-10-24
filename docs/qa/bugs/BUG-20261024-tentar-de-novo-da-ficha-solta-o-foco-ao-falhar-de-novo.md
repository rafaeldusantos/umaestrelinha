# BUG-20261024-tentar-de-novo-da-ficha-solta-o-foco-ao-falhar-de-novo: o "Tentar de novo" dos pedidos que falha de novo deixa o foco no <body>

- **Status:** verified (retestado 2026-10-24, rodada 3)
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P4
- **Persona Affected:** Equipe com TalkBack
- **Journey Step:** J-ver-uma-cliente, passo "ver mais pedidos" com a rede falhando
- **Scenarios:** MAD-cliente-pedidos-falha; MAD-clientes-com-leitor-de-tela
- **Found:** 2026-10-24 · **Report:** reports/2026-10-24-mobile-adm-clientes-reteste-1.md

## Summary

No reteste de B10: a primeira falha da próxima página leva o foco ao "Tentar de novo" (certo). Ao ativar o
botão e a nova tentativa falhar também, o foco termina no `<body>`, e o código documenta o contrário
("um 'Tentar de novo' que falha de novo não mexe"). Quem usa TalkBack perde a posição a cada tentativa.

## Reproduction

- **Tour:** Back-Button / Network · **Environment:** Chromium 390×844, `order_list` interceptada em 500 depois da primeira janela

1. Abrir a ficha da fixtura de 22 pedidos; ativar "Ver mais pedidos" com `order_list` em 500 (foco vai a "Tentar de novo").
2. Ativar "Tentar de novo" (continua 500), esperar 6 s.
3. Ler `document.activeElement`.

**Expected:** o foco continua em "Tentar de novo".
**Actual:** `BODY`. Com a rede boa o retry funciona (22 pedidos).

## Evidence

- Log do reteste: `FALHOU — B10 falha de novo não rouba/move o foco ... {"tag":"BODY"}`. Hipótese não verificada: o botão fica desabilitado/desmontado durante a tentativa.

## Retest (2026-10-24, rodada 3)

Ficha da fixtura de 22 pedidos, `order_list` em 500 depois da primeira janela: 1ª falha, 2ª e 3ª tentativas que falham de novo mantêm o foco em `BUTTON "Tentar de novo"` (500s contados: 1, 2, 3). Com a rede de volta: 22 pedidos, foco na 1ª linha nova, região viva "Agora são 22 pedidos na lista.".
