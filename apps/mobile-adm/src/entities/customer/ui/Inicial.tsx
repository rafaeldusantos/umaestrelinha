import { inicialDoCliente } from '../model/identidade'

/**
 * A inicial da pessoa num círculo (feature `76`, `MAC-03`, `MAC-15`). Decorativa: o nome já está ao
 * lado, e ler "M" em voz alta antes dele só atrapalha (`aria-hidden`). A letra é a de
 * `inicialDoCliente` — a primeira do nome, ou do e-mail quando não há nome.
 */
const Inicial = ({ cliente, grande = false }: { cliente: { name?: string | null; email: string }; grande?: boolean }) => (
  <span
    aria-hidden="true"
    data-parte="inicial"
    className={
      grande
        ? 'flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-estrelinha-ground-deep font-display text-xl font-bold text-estrelinha-primary-strong'
        : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-estrelinha-ground-deep font-display text-base font-bold text-estrelinha-primary-strong'
    }
  >
    {inicialDoCliente(cliente)}
  </span>
)

export default Inicial
