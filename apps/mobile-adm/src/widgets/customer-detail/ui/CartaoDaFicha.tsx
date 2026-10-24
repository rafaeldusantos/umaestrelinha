import type { ReactNode } from 'react'

/**
 * A moldura de um bloco da ficha da cliente (feature `76`): o cartão com o título (`h2`) e o conteúdo.
 * Só apresentação. É a mesma cara do bloco do detalhe do pedido; a cópia mora aqui porque o widget do
 * pedido é um irmão (import lateral entre widgets é fronteira FSD ao contrário).
 */
const CartaoDaFicha = ({ id, titulo, children }: { id: string; titulo: ReactNode; children: ReactNode }) => (
  <section
    aria-labelledby={`ficha-${id}`}
    data-bloco={id}
    className="rounded-lg border border-estrelinha-line bg-estrelinha-surface px-4 py-3"
  >
    <h2 id={`ficha-${id}`} className="text-base font-semibold [overflow-wrap:anywhere]">
      {titulo}
    </h2>
    <div className="mt-2">{children}</div>
  </section>
)

export default CartaoDaFicha
