// Os descontos da montagem num cartão só (feature 89, `MON-07`, `MON-08`; desenho do protótipo
// `Pedido - Montar.html`, ajuste de 2026-11-01): o cupom em cima e, separado por um fio, o desconto
// combinado, que se liga por uma caixa de marcar. As regras são as dos dois campos, intocadas.

import type { ReactNode } from 'react'
import { FormCard } from '@/shared/ui'

const DiscountsSection = ({ cupom, combinado }: { cupom: ReactNode; combinado: ReactNode }) => (
  <FormCard title="Descontos">
    {cupom}
    <div className="border-t border-border pt-4">{combinado}</div>
  </FormCard>
)

export default DiscountsSection
