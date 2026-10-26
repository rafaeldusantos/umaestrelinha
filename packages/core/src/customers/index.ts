// `@estrelinha/core/customers` — as regras de "clientes" que o painel e o app do ateliê compartilham.
// Todo especificador leva `.ts`: o diretório inteiro é alcançável pelo Deno (`denoReach.test.ts`).
export {
  CUSTOMER_SLICES,
  DEFAULT_CUSTOMER_SLICE,
  OPEN_CUSTOMER_RULE,
  RETURNING_CUSTOMER_RULE,
  applyCustomerSlice,
  customerSliceRule,
  isCustomerSliceId,
  type CustomerRule,
  type CustomerSliceId,
} from './slices.ts'
export { OPEN_ORDER_RULE, OPEN_ORDER_STATUSES, openOrdersSqlFilter } from './open.ts'
export { isCustomerId } from './id.ts'
export { escapeLike, ilikeContains, ilikeExact } from './like.ts'
export {
  APP_CUSTOMER_SEARCH,
  CUSTOMER_SEARCH_COLUMNS,
  CUSTOMER_SEARCH_DEBOUNCE_MS,
  buildAppCustomerSearch,
  buildCustomerSearchCondition,
  limparTermoColado,
  type CustomerSearchOptions,
} from './search.ts'
export {
  CUSTOMER_ORDERS_PAGE_SIZE,
  CUSTOMER_PAGE_SIZE,
  customerCursorFilter,
  type CustomerCursor,
} from './cursor.ts'
export { customerOrdersCondition, directoryEmailCondition } from './link.ts'
