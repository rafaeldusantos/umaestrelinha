# BUG-20261025-foco-cai-no-body-nos-avisos: Depois de ativar, trocar um interruptor, testar ou parar, o foco cai no `<body>`

- **Status:** verified (retestado em navegador no build refeito, 2026-10-25 — reports/2026-10-25-mobile-adm-avisos-no-celular.md)
- **Impact (user-side):** Friction (acessibilidade — leitor de tela e teclado)
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Pessoa da equipe com leitor de tela (e quem usa teclado)
- **Journey Step:** J-receber-aviso-de-pedido — passos 1, 2, 3 e 5 (ativar, interruptor, teste, parar)
- **Scenarios:** MAD-avisos-com-leitor-de-tela
- **Requirements:** charter CH-avisos-com-fonte-grande-e-leitor-de-tela ("onde o foco vai depois de ativar, de parar e de uma falha"); `MAN-41` (o controle tocado fica desabilitado)
- **Found:** 2026-10-25 · **Report:** reports/2026-10-25-mobile-adm-avisos-no-celular.md

## Summary

Em `/avisos`, cada ação deixava `document.activeElement` no `<body>`: "Avisar neste celular" e "Parar avisos
neste celular" saem da tela quando dão certo, e o interruptor, o botão de teste e o de parar ficam
desabilitados enquanto gravam (`MAN-41`) — o Chromium tira o foco de um controle desabilitado. Quem usa
leitor de tela ou teclado recomeçava do topo da página (o botão "Sua conta") depois de cada toque. Também no
"Tentar de novo" da leitura que falhou.

## Reproduction

- **Charter:** CH-avisos-com-fonte-grande-e-leitor-de-tela · **Tour:** Feature Tour
- **Environment:** build servido (`vite preview`, :8191), Supabase local, a porta `atelie-avisos` servida, 360×800, push dublado por `addInitScript`

1. Entrar com a conta admin em `/avisos`.
2. Tab até "Avisar neste celular", Enter. Ler `document.activeElement`.
3. Focar o interruptor "Pedido pago", Espaço; esperar a gravação. Ler o foco.
4. Focar "Parar avisos neste celular", Enter. Ler o foco.

**Expected:** o foco num ponto estável — o controle tocado quando ele continua na tela, o título quando ele saiu.
**Actual:** `BODY` nos três passos, e também depois de uma gravação que falha.

## Fix

- **Causa:** o controle que tinha o foco sai do DOM ou é desabilitado (`disabled`, `MAN-41`) e ninguém devolvia
  o foco quando a ação terminava.
- **Conserto** (`apps/mobile-adm/src/pages/AvisosPage.tsx`, sem commit — pedido do usuário): `agir` guarda o
  elemento que tinha o foco; quando nenhuma ação está em curso, um efeito devolve o foco a ele (se continua na
  tela e habilitado) ou ao título (`main h1`, `tabindex="-1"`, `preventScroll`) — só quando o foco caiu no
  `<body>`, para não roubar o que a pessoa levou a outro lugar. O "Tentar de novo" da leitura foca o título. O
  molde é o de `FolhaDoRastreio` (BUG-20261024-folha-fecha-e-foco-cai-no-body).
- **Teste:** `apps/mobile-adm/src/pages/__tests__/avisosPage.test.tsx`, bloco "o foco depois de cada ação não
  cai no body (QA da 79)", +7 casos; 6 reprovavam antes com `expected <body …>` (o 7º, "não rouba", é o
  inverso). O jsdom não tira o foco de um controle desabilitado: `perderFoco()` o leva ao `<body>` como o
  Chromium faz.
- **Mutantes** (SHA-256 conferido na restauração): M1 sem `devolverFoco` (5 mortos), M2 sempre o título (4),
  M3 sem a guarda de "foco caiu" (1, o inverso), M4 sem o foco do "Tentar de novo" (1), M5 sem guardar a
  origem (5) — todos por asserção.
- **Reteste:** build refeito; teclado e toque em 360/390: ativar ⇒ `H1`, interruptor ⇒ o próprio `INPUT`,
  interruptor que falha ⇒ o `INPUT`, teste ⇒ o botão, parar ⇒ `H1`; `scrollY` 0. Durante a gravação o foco
  ainda passa pelo `<body>` (o controle está desabilitado por `MAN-41`) e volta ao fim.
