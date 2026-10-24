# BUG-20261024-falha-de-aviso-diz-enviado: O histórico diz "Falha ao enviar aviso … enviado" quando o e-mail não saiu

- **Status:** fixed (retestado 2026-10-24, rodada 3) — tasks.md da `74`, B03
- **Impact (user-side):** Trust-Damage
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri no celular (e o painel, a mesma frase)
- **Journey Step:** J-ver-um-pedido, o detalhe do pedido (bloco Histórico)
- **Scenarios:** MAD-pedido-abrir-e-entender
- **Found:** 2026-10-24 · **Report:** reports/2026-10-24-mobile-adm-pedidos-reteste.md

## Summary

Quando um aviso por e-mail falha, a linha do histórico junta "Falha ao enviar" com o rótulo de HISTÓRICO do
evento, que já está no passado: "Falha ao enviar aviso de pagamento aprovado **enviado** (E-mail)". A frase
afirma e nega o envio ao mesmo tempo, logo acima de "A cliente NÃO foi avisada". `buildHistory`
(`packages/core/src/orders/history.ts:138`) usa `NOTIFICATION_EVENT_LABELS` (o "o que aconteceu?", no
particípio) onde deveria usar o NOME do evento (`NOTIFICATION_EVENT_NAMES`, `core/notifications/catalog.ts`,
a pergunta "que evento é este?" — a distinção que a `56` registrou). **Herdado**: a frase é a do painel no
`775e407e`, e `AdminOrderPage.test.tsx:334` e `core/orders/__tests__/history.test.ts:46` a CRAVAM; a `74` a
subiu para `core` byte a byte (`MAP-48`) e por isso ela agora aparece também no ateliê. Já estava como
observação O2 em `.specs/features/74-mobile-adm-pedidos/prova-navegador.md`, não no registro de bugs.

## Reproduction

- **Charter:** CH-pedidos-achar-o-pedido-da-cliente · **Tour:** Paste Tour
- **Environment:** build servido em :4377, 390×844, Supabase local, fixturas da prova + extras de QA

1. Pedidos → Tudo → buscar `#P74-01` → abrir.
2. Rolar até "Histórico".

**Expected:** "Falha ao enviar o aviso de pagamento aprovado (E-mail)" (ou "Aviso de pagamento aprovado
não saiu"), sem "enviado".
**Actual:** "Falha ao enviar aviso de pagamento aprovado enviado (E-mail)".

## Evidence

- evidence/2026-10-24-mobile-adm-pedidos/r2-390-detalhe-p01-fonte-200.png

## Notes

Conserto provável: na falha, usar o nome do evento (`NOTIFICATION_EVENT_NAMES`) em vez do rótulo de histórico,
e atualizar as duas asserções que cravam a frase quebrada. Muda texto do painel (regra `AD-056` de "o painel não
muda") — decisão humana; fora do escopo escrito da `74`.


## Retest

2026-10-24, rodada 3 (`reports/2026-10-24-mobile-adm-pedidos-reteste-2.md`): `#P74-01` mostra "Falha ao enviar o aviso: Pagamento aprovado (E-mail)". Fixed. Evidence: `evidence/2026-10-24-mobile-adm-pedidos/r3-390-historico-falha-de-aviso.png`.
