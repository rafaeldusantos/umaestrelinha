export { default as AnonymizeDialog } from './ui/AnonymizeDialog'
export {
  buildCustomersCsv, customerCsvRow, exportCustomersCsv, customerExportLabel,
  CUSTOMER_CSV_HEADERS,
} from './lib/exportCsv'
// `CustomerDetailDialog` foi APAGADO na feature 34: a ficha é rota (`/admin/clientes/:id`).
