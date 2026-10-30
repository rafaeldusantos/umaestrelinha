# BUG-20261030-foco-cai-no-body-nas-acoes-do-pedido: Depois de várias ações do pedido o foco do teclado cai no começo da página

- **Status:** verified (2026-10-30, reteste em navegador; working tree, sem commit) — os casos do bug passam; dois casos novos no BUG-20261030-foco-cai-no-body-ao-reler-e-ao-dispensar
- **Impact (user-side):** Friction
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Adri despachando pedidos
- **Journey Step:** J-mudar-pedido-com-ou-sem-aviso, passos 'confirma' e 'avião'
- **Scenarios:** PNL-aviso-teclado-e-leitor;PNL-aviso-fechar-sem-gravar;PNL-aviso-aviao-envia-depois;PNL-lote-cartao-do-celular
- **Found:** 2026-10-30 · **Report:** reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos.md
- **AC:** CRG-09 (o anúncio sai, mas o lugar se perde); padrão do repositório (bugs 'foco cai no body' de 75/86)

## Summary

Quem usa teclado ou leitor de tela perde o lugar depois de quase toda ação nova da 88: o foco vai para o <body> (o leitor recomeça do topo da página). Acontece ao fechar o diálogo aberto pelo "Outro status" (Esc), depois do avião (com sucesso, falha ou evento desligado), depois de confirmar "Marcar como enviado" (o botão some porque o próximo passo muda), depois do cancelamento, do "Tentar de novo" da releitura e do "Recebi o material" do cartão. O diálogo aberto pelo botão principal devolve o foco certo ao fechar sem gravar (Esc, Voltar, clique fora) — o defeito é quando o gatilho some ou é remontado.

## Reproduction

- **Charter:** CH-aviso-fonte-grande-e-leitor · **Tour:** Feature Tour
- **Environment:** Chromium 1440×900 e 390×844, teclado

1. Abrir /admin/pedidos/<id> de um pedido Em Separação com rastreio.
2. Escolher Enviado em "Outro status"; o diálogo abre; apertar Esc.
3. Ler document.activeElement.
4. Noutro pedido com a linha "Aviso à cliente não enviado", acionar o avião e ler o foco ao terminar.

**Expected:** O foco volta ao seletor "Outro status", ao avião (ou à linha que o substitui), ao novo botão do próximo passo, ou a um título do bloco — nunca ao <body>.
**Actual:** document.activeElement = BODY nos seis casos; com o avião desligado em Notificações a linha continua na tela e mesmo assim o foco vai ao BODY.

## Evidence

- Medido por document.activeElement nas sessões 1–3 (ver o relatório)

## Fix (2026-10-30)

Um dono para "para onde volta o foco": `shared/lib/foco.ts` (`devolverFoco(origem, ...alternativas)`,
`blocoDe`, `tituloDaPagina`). A origem é guardada no início do gesto e o foco volta DEPOIS do commit
(efeito), quando o botão já foi reabilitado; se ela sumiu, vai ao bloco (o título `h2` da seção, ou o
cartão) e por último ao `h1` da página. Casos: o portão de aviso (`useNoticeGate`), o gesto sem
diálogo (`useGestoComAviso`), o "Outro status" (o seletor vai como origem), o avião e o "Reenviar"
(o botão da mesma linha; sem ele, a linha; sem ela, o título do Histórico), o cancelamento
(`onCloseAutoFocus`), o "Tentar de novo" da releitura (o título do pedido) e o "Recebi o material" do
cartão (a origem guardada antes da leitura dos envios; sem o botão, o próprio cartão), inclusive
quando a leitura dos envios falha. Depois do lote o foco vai ao resumo que fica na lista.

- O teste usa `src/test/focoDoNavegador.ts`: o jsdom não tira o foco de um botão que fica desabilitado
  (o Chromium tira), e sem simular isso todo caso passaria nos dois mundos.
- Testes (`AdminOrderPage.aviso.test.tsx` e `AdminOrdersPage.aviso.test.tsx`, blocos "o foco"). O caso
  do "Outro status" → Voltar **não reproduz no jsdom** (passa antes e depois): ele fica como guarda, e
  a prova do conserto é o mutante Q3f. Mutantes Q3a..Q3h mortos por asserção.

## Verification

- **Retested:** 2026-10-30, Adri despachando pedidos, Chromium real (Playwright), 1440×900 e 390×844, teclado; `document.activeElement` lido depois de cada desfecho · **Report:** reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos-reteste.md
- **Result:**

| Caso | `document.activeElement` |
| --- | --- |
| "Outro status" → Enviado → **Esc** | `BUTTON[role=combobox] "Outro status"` |
| "Outro status" → Enviado → **Voltar** | `BUTTON[role=combobox] "Outro status"` |
| botão "Enviado" → Esc | `BUTTON "Enviado"` |
| "Enviado" confirmado (marcada e desmarcada, 1440 e 390) | `BUTTON "Entregue"` (o novo próximo passo) |
| "já enviado" sem diálogo (1440 e 390) | `BUTTON "Entregue"` |
| avião que falha (1440 e 390) | `BUTTON "Reenviar"` da mesma linha |
| avião com o evento desligado | `BUTTON "Enviar agora o e-mail “Pedido postado” para a cliente"` |
| cancelamento com sucesso | `BUTTON "Cancelar pedido"` |
| cancelamento com PATCH 500 | o próprio diálogo (`DIV[role=dialog]`), com o `role=alert` "O pedido não foi cancelado…"; Esc depois → `BUTTON "Cancelar pedido"` |
| cancelamento → Voltar | `BUTTON "Cancelar pedido"` |
| cancelamento recusado (leitura dos envios falhando) | o diálogo; Esc → `BUTTON "Cancelar pedido"` |
| "Tentar de novo" da faixa da releitura | `H1 "Pedido #QA88R-07"` |
| gesto recusado (A-14) | `BUTTON "Enviado"` (fica) |
| cartão "Recebi o material" com sucesso (390) | `BUTTON "Iniciar separação — pedido #QA88R-31, …"` (mesmo cartão) |
| cartão com a leitura dos envios falhando (390) | `BUTTON "Recebi o material — pedido #QA88R-32, …"` |
| resumo do lote ao aparecer | `DIV[role=status] "Resumo do lote"` |

  Nenhum dos casos do bug cai no `<body>`. Dois casos **fora** desta lista caem (o "Tentar de novo" do Histórico, novo no conserto A-14, e o "Dispensar" do resumo, novo no Q5): registrados à parte em `BUG-20261030-foco-cai-no-body-ao-reler-e-ao-dispensar`.
