# BUG-20261030-leitura-de-envios-falha-em-silencio: Com a leitura dos e-mails falhando, o pedido pergunta por um e-mail já enviado e promete uma anotação que não acontece

- **Status:** verified (2026-10-30, reteste em navegador; working tree, sem commit)
- **Impact (user-side):** Trust-Damage
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Adri despachando pedidos
- **Journey Step:** J-mudar-pedido-com-ou-sem-aviso, passos 'previsão' e 'resultado'
- **Scenarios:** PNL-aviso-leitura-de-envios-falha
- **Found:** 2026-10-30 · **Report:** reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos.md
- **AC:** A-01, A-09, AVS-07 (decisão aberta do tasks.md)

## Summary

É a 'decisão aberta para o QA' da 88, observada. Com a leitura de order_notifications falhando, a página do pedido não avisa nada: o Histórico diz "Nada por aqui ainda." (falso — o "Pedido postado" já tinha sido enviado), o "Marcar como enviado" abre o diálogo perguntando por "Pedido postado" como se nunca tivesse saído, e com a caixa desmarcada o resultado diz "sem e-mail à cliente (anotado no histórico)". Ao recarregar, não há anotação nenhuma (o motor não grava skipped sobre sent): o Histórico mostra só o envio antigo. Duas frases falsas seguidas, sem sinal de que a tela estava incompleta. O lote e o cartão tratam a mesma falha recusando o gesto.

## Reproduction

- **Charter:** CH-aviso-rede-lenta-e-falhas · **Tour:** Network Tour
- **Environment:** Chromium 390×844; GET /rest/v1/order_notifications respondendo 500 (interceptado)

1. Pedido Em Separação com rastreio e order_shipped já sent.
2. Fazer a leitura de order_notifications falhar (500).
3. Abrir o pedido: o Histórico diz 'Nada por aqui ainda.'
4. Marcar como enviado → o diálogo pergunta por Pedido postado → desmarcar → confirmar.
5. Recarregar com a leitura de volta.

**Expected:** A página diz que não conseguiu ler os e-mails do pedido e não pergunta/afirma com base numa lista vazia (como o lote e o cartão: recusar, ou avisar que a previsão está incompleta).
**Actual:** Histórico vazio sem aviso; diálogo para e-mail já enviado; resultado 'anotado no histórico'; depois do reload, nenhuma linha 'não enviado'.

## Evidence

- Sessão 2 do relatório (QA88-L01)

## Fix (2026-10-30)

Decisão `A-14` (pela recomendação do QA, opção b — **n — confirmar**). `useAdminOrder` passou a
expor `emailsError` (a leitura de `order_notifications` falhou ⇒ vazio por falha, não "nenhum e-mail").
`useGestoComAviso({ enviadosIndisponiveis })` recusa o gesto cuja previsão teria algum e-mail com
`SENT_EMAILS_READ_FAILED` ("Não consegui conferir os e-mails já enviados. Nada foi alterado." — a mesma
constante do lote e do cartão), sem diálogo e sem escrita; gesto sem e-mail previsto segue. O
cancelamento recusa dentro do diálogo. O Histórico mostra "Não consegui ler os e-mails deste pedido."
com "Tentar de novo" e nunca "Nada por aqui ainda.".

- Arquivos: `entities/order/api/useAdminOrder.ts`, `features/order-notice/model/useGestoComAviso.ts`,
  `features/order-detail/ui/OrderHistory.tsx`, `pages/admin/AdminOrderPage.tsx`.
- Testes (vermelhos antes): `AdminOrderPage.aviso.test.tsx`, bloco "conserto do QA — a leitura dos
  envios falha" (4); `OrderHistory.test.tsx` (1).
- Mutantes Q1a..Q1e reinjetados e mortos por asserção.

## Verification

- **Retested:** 2026-10-30, Adri despachando pedidos, Chromium 1440×900 · **Report:** reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos-reteste.md
- **Result:** com `GET /rest/v1/order_notifications` em 500 (interceptado), QA88R-03 (Em Separação, "Pedido postado" já `sent`): o Histórico diz "Não consegui ler os e-mails deste pedido." com "Tentar de novo" (`role=alert`), nunca "Nada por aqui ainda.". "Enviado" é recusado sem diálogo e sem escrita (zero PATCH/POST), aviso "Não consegui conferir os e-mails já enviados. Nada foi alterado.", foco fica no "Enviado"; o banco segue `separating`, 0 linhas de histórico. A nota interna grava (POST `order_notes`) e aparece no Histórico mesmo com a leitura falhando. Cancelamento (QA88R-04, `order_cancelled` ligado): a recusa aparece DENTRO do diálogo com a mesma frase, zero escrita, pedido segue `separating`. "Tentar de novo" com a leitura de volta mostra o envio antigo ("Aviso de postagem enviado"). **Achado novo**: esse "Tentar de novo", quando dá certo, some e o foco vai ao `<body>` → `BUG-20261030-foco-cai-no-body-ao-reler-e-ao-dispensar`. Evidência `evidence/2026-10-30-aviso-opcional-reteste/r1-historico-leitura-falhou-1440.png`, `evidence/2026-10-30-aviso-opcional-reteste/r1-gesto-recusado-1440.png`, `evidence/2026-10-30-aviso-opcional-reteste/r1-cancelamento-recusado-1440.png`.
