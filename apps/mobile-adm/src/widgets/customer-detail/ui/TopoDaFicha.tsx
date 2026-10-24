import { ChevronLeft } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CLIENTES_PATH } from '@/entities/customer'

export const TITULO_DA_FICHA = 'Cliente'

/**
 * O "Voltar" da ficha (feature `76`, `MAC-14`, `MAC-20`): com `state.doApp` (a linha da lista, a ficha
 * aberta pelo "Ver cliente" ou o voltar de um pedido da própria ficha) volta UMA entrada — à lista no
 * mesmo recorte, busca e posição, ou ao pedido de onde veio. Sem ele (link colado, F5) não há histórico
 * do app para voltar: vai à lista, por substituição.
 */
const BotaoVoltar = () => {
  const navigate = useNavigate()
  const { state } = useLocation()
  const doApp = (state as { doApp?: boolean } | null)?.doApp === true
  return (
    <button
      type="button"
      onClick={() => (doApp ? navigate(-1) : navigate(CLIENTES_PATH, { replace: true }))}
      className="-ml-2 inline-flex min-h-11 min-w-11 items-center gap-1 rounded-sm px-2 text-sm font-medium text-estrelinha-primary"
    >
      <ChevronLeft aria-hidden="true" className="h-5 w-5" strokeWidth={1.5} />
      Voltar
    </button>
  )
}

/**
 * O topo da ficha: o "Voltar" e o `h1` "Cliente". Existe em TODO estado da página (lendo, falha, "não
 * encontrei", dado): o foco do `MobileLayout` precisa de um `h1` para ir. O nome da pessoa **não** é o
 * `h1` — ele fica no cabeçalho da ficha —, para o título do documento nunca carregá-lo (`MAC-28`).
 */
const TopoDaFicha = () => (
  <header className="space-y-2">
    <BotaoVoltar />
    <h1 className="font-display text-2xl">{TITULO_DA_FICHA}</h1>
  </header>
)

export default TopoDaFicha
