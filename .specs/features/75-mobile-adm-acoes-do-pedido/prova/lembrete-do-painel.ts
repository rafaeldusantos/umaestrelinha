// Feature 75 · T31, item 9 — o texto do lembrete que o PAINEL monta para o mesmo pedido, na mesma hora.
// Importa a função do painel (`chargeMaterialUrl`, que reexporta a de `core` por referência) e a chama
// com a linha lida do banco local. Uso: npx tsx --tsconfig tsconfig.base.json <este arquivo> <linha.json> <agora-iso>
import { readFileSync } from 'node:fs'
import { chargeMaterialUrl } from '../../../../apps/backoffice/src/features/order-list/model/chargeMaterial.ts'

const row = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const agora = new Date(process.argv[3])
console.log(chargeMaterialUrl(row, row.customer_phone, agora))
