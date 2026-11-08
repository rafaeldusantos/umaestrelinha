ONDAS: 11,12,15,16 | 14,17,21 | 13,19 | 18,22 | 23 | 20
- 11 posse: apps/mobile-adm/src/pages/MontarPedidoPage.tsx, apps/mobile-adm/src/features/order-proposal/model/usePassosDaMontagem.ts, apps/mobile-adm/src/features/order-proposal/model/useCriarLink.ts, apps/mobile-adm/src/features/order-proposal/ui/FolhaDeConfirmacao.tsx
- 12 posse: apps/mobile-adm/src/features/order-proposal/ui/FolhaDaVariacao.tsx, apps/mobile-adm/src/features/order-proposal/ui/PassoDasPecas.tsx, apps/mobile-adm/src/features/order-proposal/model/sacola.ts
- 15 posse: apps/mobile-adm/src/features/order-proposal/ui/PassoDaCliente.tsx, apps/mobile-adm/src/features/order-proposal/api/portaDeLeitura.ts
- 16 posse: apps/mobile-adm/src/features/order-proposal/model/useCotacaoDaRevisao.ts, apps/mobile-adm/src/features/order-proposal/api/portaDaCotacao.ts, apps/mobile-adm/src/features/order-proposal/model/revisao.ts, apps/mobile-adm/src/features/order-proposal/ui/PassoRevisar.tsx
- 14 posse: apps/mobile-adm/src/pages/MontarPedidoPage.tsx, apps/mobile-adm/src/features/order-proposal/model/montagem.ts, apps/mobile-adm/src/features/order-proposal/model/useResumoDaMontagem.ts, apps/mobile-adm/src/features/order-proposal/ui/PassoDosDescontos.tsx
- 17 posse: apps/mobile-adm/src/pages/PedidoMontadoPage.tsx, apps/mobile-adm/src/features/order-proposal/model/frases.ts, apps/mobile-adm/src/features/order-proposal/ui/CartaoDoLink.tsx, apps/mobile-adm/src/features/order-proposal/ui/SeloDoMontado.tsx
- 21 posse: apps/mobile-adm/src/features/order-proposal/ui/PassoDaCliente.tsx, apps/mobile-adm/src/features/order-proposal/ui/FormularioDeEndereco.tsx
- 13 posse: apps/mobile-adm/src/features/order-proposal/ui/FolhaColarTexto.tsx, apps/mobile-adm/src/features/order-proposal/model/useLeituraDoTexto.ts, apps/mobile-adm/src/pages/MontarPedidoPage.tsx
- 19 posse: apps/mobile-adm/src/features/order-proposal/ui/CampoDaMontagem.tsx, apps/mobile-adm/src/features/order-proposal/ui/FormularioDeEndereco.tsx, apps/mobile-adm/src/features/order-proposal/ui/PassoDosDescontos.tsx
- 18 posse: apps/mobile-adm/src/pages/MontarPedidoPage.tsx, apps/mobile-adm/src/features/order-proposal/model/sacola.ts
- 22 posse: apps/mobile-adm/src/features/order-proposal/model/descontos.ts, apps/mobile-adm/src/features/order-proposal/model/revisao.ts, apps/mobile-adm/src/features/order-proposal/model/frases.ts, apps/mobile-adm/src/features/order-proposal/ui/FolhaColarTexto.tsx, apps/mobile-adm/src/features/order-proposal/ui/PassoDosDescontos.tsx, apps/mobile-adm/src/features/order-proposal/ui/PassoRevisar.tsx, apps/mobile-adm/src/pages/PedidoMontadoPage.tsx
- 23 posse: apps/mobile-adm/src/pages/PedidoMontadoPage.tsx, apps/mobile-adm/src/features/order-proposal/ui/PassoDosDescontos.tsx, apps/mobile-adm/src/widgets/proposal-list/ui/ListaDeMontados.tsx, apps/mobile-adm/src/features/order-proposal/ui/FolhaDeConfirmacao.tsx (e o botão secundário das folhas da montagem)
- 20 posse: apps/mobile-adm/src/widgets/proposal-list/ui/ListaDeMontados.tsx, apps/mobile-adm/src/pages/MontarPedidoPage.tsx, apps/mobile-adm/src/features/order-proposal/ui/PassoRevisar.tsx, apps/mobile-adm/src/features/order-proposal/ui/FolhaDaVariacao.tsx, apps/mobile-adm/src/features/order-proposal/ui/PassoDaCliente.tsx

Por que as ondas não são uma só:
- Onda 1 junta os quatro lotes sem arquivo em comum, com os três de maior severidade que não dividem a página da montagem (11 high, 12 high) e os dois medium (15, 16).
- 14 (high) vem depois de 11: os dois mexem em pages/MontarPedidoPage.tsx (11 no voltar, 14 no cabeçalho e na barra). 17 e 21 entram com ela por não dividirem arquivo; 21 depende de 15 (PassoDaCliente.tsx).
- 13 (high) espera 11 e 14 pela mesma pages/MontarPedidoPage.tsx (a fiação da folha). 19 vai junto: depende de 14 (PassoDosDescontos.tsx) e de 21 (FormularioDeEndereco.tsx), sem arquivo em comum com 13.
- 18 espera 11/13/14 (MontarPedidoPage.tsx) e 12 (sacola.ts). 22 espera 13 (FolhaColarTexto.tsx), 16 (revisao.ts, PassoRevisar.tsx), 17 (frases.ts, PedidoMontadoPage.tsx) e 19 (PassoDosDescontos.tsx).
- 23 espera 22 (PedidoMontadoPage.tsx, PassoDosDescontos.tsx) e 11 (FolhaDeConfirmacao.tsx).
- 20 toca arquivos de quase todos os lotes (a barra, o Revisar, a folha da variação, o passo da cliente e o cartão de Montados, este também da 23): onda própria, por último.
