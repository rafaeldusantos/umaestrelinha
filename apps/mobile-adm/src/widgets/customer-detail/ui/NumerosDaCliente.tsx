import { formatPrice } from '@estrelinha/core/formatters'
import { LEGENDA_DOS_NUMEROS, ticketMedio, type CabecalhoDeCliente } from '@/entities/customer'

const Numero = ({ nome, rotulo, valor }: { nome: string; rotulo: string; valor: string }) => (
  <div data-numero={nome} className="min-w-0 rounded-lg border border-estrelinha-line bg-estrelinha-surface px-3 py-2">
    <p className="text-xs text-estrelinha-ink-soft [overflow-wrap:anywhere]">{rotulo}</p>
    <p data-parte="valor" className="mt-0.5 font-display text-lg font-bold text-estrelinha-ink [overflow-wrap:anywhere]">
      {valor}
    </p>
  </div>
)

/**
 * Os três números da ficha (feature `76`, `MAC-16`, `MAC-32`): compras, no total e ticket médio, com a
 * legenda de que contam **só os pedidos pagos**. Vêm de `customer_list` (o cabeçalho), nunca da soma
 * dos pedidos da tela. O ticket sem compra paga é um travessão, nunca "R$ 0,00": zero seria afirmar que
 * ela gastou zero.
 *
 * A grade é `auto-fit` com piso em `rem` (a lição do QA da `73`): com a fonte do sistema grande os três
 * empilham em vez de se cortarem; nenhuma coluna fixa.
 */
const NumerosDaCliente = ({ cliente }: { cliente: CabecalhoDeCliente }) => (
  <section aria-label="Números" data-bloco="numeros" className="space-y-2">
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,7rem),1fr))] gap-3">
      <Numero nome="compras" rotulo="Compras" valor={String(cliente.orders_paid)} />
      <Numero nome="total" rotulo="No total" valor={formatPrice(cliente.total_spent)} />
      <Numero nome="ticket" rotulo="Ticket médio" valor={ticketMedio(cliente.avg_ticket)} />
    </div>
    <p data-parte="legenda" className="text-xs text-estrelinha-ink-soft">
      {LEGENDA_DOS_NUMEROS}
    </p>
  </section>
)

export default NumerosDaCliente
