# BUG-20261027-tentar-de-novo-da-loja-ao-vivo-solta-o-foco: o "Tentar de novo" da Loja ao vivo deixa o foco no <body>

- **Status:** open
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Equipe com TalkBack (e a Adri no 3G instável)
- **Journey Step:** J-ver-a-loja-ao-vivo, passo "a leitura falha e eu tento de novo"
- **Scenarios:** MAD-aovivo-leitura-falha-tentar-de-novo; MAD-aovivo-com-leitor-de-tela
- **Found:** 2026-10-27 · **Report:** reports/2026-10-27-mobile-adm-loja-ao-vivo.md

## Summary

Na primeira leitura que falha, a seção Acessos mostra "Não consegui carregar." + "Tentar de novo". Ao ativar
o botão, ele **desmonta** durante a nova tentativa (a seção volta ao estado carregando, com `aria-busy` e
traços), e o foco cai no `<body>` — tanto quando a tentativa falha de novo (o botão volta, mas sem foco)
quanto quando dá certo (os números aparecem e o foco fica no `<body>`). O cenário escrito diz "Depois de
Tentar de novo o foco não pode cair no body", e o app já consertou o mesmo defeito na ficha
(`BUG-20261024-tentar-de-novo-da-ficha-solta-o-foco-ao-falhar-de-novo`).

## Reproduction

- **Tour:** Network · **Environment:** Chromium 390×844, build servido (`vite preview`) contra o banco local; `store_movement` interceptada no Playwright

1. Abrir `/ao-vivo` com `store_movement` respondendo 500 (esperar ~6 s: aparecem "Não consegui carregar." e "Tentar de novo").
2. Focar "Tentar de novo" e apertar Enter, com a próxima resposta atrasada 1,5 s e ainda 500.
3. Ler `document.activeElement` durante e depois (6 s); repetir com a rede boa.

**Expected:** o foco fica em "Tentar de novo" quando a tentativa falha de novo; quando dá certo, vai a um lugar
anunciável da seção (o `h2` "Acessos" ou o primeiro número), nunca ao `<body>`.
**Actual:** durante: o botão some (`0` botões, `aria-busy="true"`), foco `BODY`; depois da nova falha: o botão
volta e o foco segue `BODY`; depois do sucesso: números na tela, foco `BODY`.

## Evidence

- Saída do Playwright: `{"durante":{"btn":0,"busy":1,"focus":"BODY"},"depois":{"btn":1,"focus":"BODY"}}` e, com a rede boa, `"retry_ok":{"focus":"BODY: Loja ao vivo…"}`.
- Arquivo provável: `apps/mobile-adm/src/widgets/store-access/ui/SecaoAcessos.tsx` (o estado de falha troca pelo de carregando no refetch, desmontando o botão); talvez `apps/mobile-adm/src/pages/AoVivoPage.tsx` (`leituraDe`).
