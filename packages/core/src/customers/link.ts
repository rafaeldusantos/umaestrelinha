// Feature `76` · `MAC-18`, A10 — o vínculo entre a pessoa e os pedidos dela, SEM curinga. O e-mail
// vai exato (sem `%`) e escapado, então `VROSA_RJ@…` não puxa `VROSAXRJ@…` (o `_` é curinga de LIKE).
// O painel ainda liga pelo e-mail cru (`BL-052`); o app não herda o defeito.
import { isCustomerId } from './id.ts'
import { ilikeExact } from './like.ts'

/** `email.ilike."<exato>"` — a pessoa de `customer_directory` por e-mail ("Ver cliente"). */
export const directoryEmailCondition = (email: string): string => `email.ilike.${ilikeExact(email)}`

/** O `or()` dos pedidos de uma pessoa: pelo id dela OU pelo e-mail exato (convidada). */
export const customerOrdersCondition = (id: string, email: string): string => {
  if (!isCustomerId(id)) throw new Error('id de cliente que não é uuid')
  return `customer_id.eq.${id},customer_email.ilike.${ilikeExact(email)}`
}
