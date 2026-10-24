// Feature `76` · `MAC-14` — o id de uma cliente é um uuid, e um id que não pode existir não vai à
// rede nem entra numa string de `or()`. É o MESMO predicado do pedido (`isOrderId`), por referência.
import { isOrderId } from '../orders/list.ts'

export const isCustomerId: (value: unknown) => value is string = isOrderId
