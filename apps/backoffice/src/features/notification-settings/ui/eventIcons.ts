// A metade do painel do catálogo de ícones dos eventos — feature 56 (`LEG-03`).
//
// `core` guarda a CHAVE (`NOTIFICATION_ICON_KEYS`, um vocabulário fechado de strings) e este arquivo
// guarda o desenho. A divisão não é gosto: `purity.test.ts` de `core/notifications` proíbe React
// naquele módulo, porque o motor de notificação o importa por caminho relativo e o Deno resolve o
// grafo de tipos inteiro. Mesmo molde de `core/menu/icons.ts` × `MENU_ICON_COMPONENTS`.
//
// O par é guardado nos **dois sentidos** por `__tests__/eventIcons.test.ts`: chave sem componente
// quebraria o card em runtime, e componente sem chave ficaria no bundle sem ninguém alcançar. O
// `tsc` pega só o primeiro (o `Record` exige a chave).

import {
  Ban,
  BellRing,
  CircleAlert,
  CheckCircle2,
  Clock,
  Coins,
  Hammer,
  HeartHandshake,
  Inbox,
  Mail,
  MailOpen,
  PackageCheck,
  PackagePlus,
  PackageSearch,
  RotateCcw,
  Truck,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import type { NotificationIconKey } from '@estrelinha/core/notifications'

export const EVENT_ICON_COMPONENTS: Record<NotificationIconKey, LucideIcon> = {
  mail: Mail,
  check: CheckCircle2,
  'mail-open': MailOpen,
  x: XCircle,
  clock: Clock,
  ban: Ban,
  undo: RotateCcw,
  tracking: PackageSearch,
  inbox: Inbox,
  craft: Hammer,
  truck: Truck,
  delivered: PackageCheck,
  care: HeartHandshake,
  coins: Coins,
  bell: BellRing,
  // Feature 57.
  'inbox-new': PackagePlus,
  alert: CircleAlert,
}
