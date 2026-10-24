// `PED-16` — "cobrar material" é **um clique que abre o WhatsApp com o texto pronto**.
//
// Feature `75` (`MAA-28`, A18): o rascunho e o link SUBIRAM, byte a byte, para
// `@estrelinha/core/orders` (`charge.ts`) — o app do ateliê manda o mesmo lembrete, e duas cópias
// da mensagem divergiriam sem nada quebrar (o defeito 01). Este arquivo virou REEXPORTAÇÃO: os
// chamadores do painel continuam importando daqui, e `app/__tests__/lembreteNoCore.test.ts` prova
// que é a mesma referência (`toBe`, nunca `toEqual`). O porquê de não ser régua automática, e de não
// nomear o material, mora agora no cabeçalho de `core/orders/charge.ts`.

import { normalizeBrPhone } from '@estrelinha/core/notifications'

export { chargeMaterialText, chargeMaterialUrl } from '@estrelinha/core/orders'

/**
 * O normalizador SUBIU para `@estrelinha/core/notifications` na feature 42 (`PNL-07`): o canal
 * WhatsApp da 43 precisa do mesmo número no mesmo formato, e duas cópias é o "defeito 01". O nome
 * antigo continua exportado daqui **só** para não quebrar quem já importa `whatsappNumber` — é
 * reexport, não cópia.
 */
export { normalizeBrPhone as whatsappNumber }
