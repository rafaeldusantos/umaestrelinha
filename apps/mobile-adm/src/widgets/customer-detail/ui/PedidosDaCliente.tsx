import { useEffect, useRef, useState } from 'react'
import { cn } from '@estrelinha/ui/lib/utils'
import { FALHA_DOS_PEDIDOS, maisPedidosNaLista, tituloDosPedidos, type PedidoDaFicha } from '@/entities/customer'
import { TENTAR_DE_NOVO, Traco } from '@/shared/ui/leitura'
import CartaoDaFicha from './CartaoDaFicha'
import LinhaDoPedidoDaCliente from './LinhaDoPedidoDaCliente'

export const VER_MAIS_PEDIDOS = 'Ver mais pedidos'

export interface PedidosDaClienteProps {
  /** `orders_total` do cabeçalho — o total de verdade, nunca `linhas.length`. */
  total: number
  janela: { linhas: PedidoDaFicha[]; lido_em: string; fim: boolean } | undefined
  /** A leitura dos pedidos falhou e não há janela nenhuma. */
  falhou: boolean
  tentarDeNovo: () => void
  carregarMais: () => void
  carregandoMais: boolean
  proximaFalhou: boolean
}

/**
 * Os pedidos da ficha (feature `76`, `MAC-18`, `MAC-19`, `MAC-22`, `MAC-31`). O título é "Pedidos · N" com
 * o `orders_total` do cabeçalho (ou "Nenhum pedido ainda." quando é zero).
 *
 * **Estados exclusivos**: a FALHA do bloco ("Não consegui carregar os pedidos." e "Tentar de novo"), que
 * não derruba o cabeçalho nem o contato; o ESQUELETO enquanto a primeira janela lê (`aria-busy`); e o
 * DADO. "Ver mais pedidos" (44 px) aparece **só** com `!fim`; se a próxima página falha, as linhas
 * ficam e a falha aparece **no rodapé do bloco**, com "Tentar de novo" que pede a mesma página.
 *
 * **O foco acompanha "Ver mais pedidos"** (`BUG-20261024-ver-mais-pedidos-foco-cai-no-body`): quando a
 * última janela chega o botão sai do DOM, e o foco caía no `<body>` — o leitor de tela voltava ao topo
 * da página sem dizer o que chegou. Depois do toque, o foco vai à PRIMEIRA linha nova (ou ao "Tentar de
 * novo" do rodapé, se a página falhou — também quando o toque foi no próprio "Tentar de novo" e a falha volta) e a região viva diz quantos pedidos a lista tem agora. Sem toque,
 * uma releitura que muda as linhas não mexe no foco.
 */
const PedidosDaCliente = ({ total, janela, falhou, tentarDeNovo, carregarMais, carregandoMais, proximaFalhou }: PedidosDaClienteProps) => {
  const titulo = tituloDosPedidos(total)
  const lista = useRef<HTMLUListElement>(null)
  const rodape = useRef<HTMLDivElement>(null)
  // Quantas linhas havia quando "Ver mais pedidos" foi tocado; `null` = nenhum toque esperando resposta.
  const [esperando, setEsperando] = useState<number | null>(null)
  const [aviso, setAviso] = useState('')
  // A falha já estava na tela quando o toque aconteceu (era o "Tentar de novo"): não é uma falha NOVA.
  const falhaNoToque = useRef(false)
  const quantas = janela?.linhas.length ?? 0

  useEffect(() => {
    if (esperando === null) return
    if (quantas > esperando) {
      const nova = lista.current?.querySelectorAll<HTMLElement>('a')[esperando]
      nova?.focus()
      setAviso(maisPedidosNaLista(quantas))
      setEsperando(null)
    } else if (!proximaFalhou) {
      // A falha que estava na tela saiu (a leitura está no ar): o que vier a seguir é falha NOVA, mesmo
      // que o toque tenha sido num "Tentar de novo" — o botão antigo saiu do DOM e levou o foco junto.
      falhaNoToque.current = false
    } else if (!falhaNoToque.current) {
      rodape.current?.querySelector<HTMLElement>('button')?.focus()
      setEsperando(null)
    }
  }, [esperando, quantas, proximaFalhou])

  const pedirMais = () => {
    falhaNoToque.current = proximaFalhou
    setEsperando(quantas)
    carregarMais()
  }

  if (falhou && !janela) {
    return (
      <CartaoDaFicha id="pedidos" titulo={titulo}>
        <div data-estado="falha" className="space-y-3 py-1">
          <p role="alert" className="text-sm text-estrelinha-ink-soft">
            {FALHA_DOS_PEDIDOS}
          </p>
          <button
            type="button"
            onClick={tentarDeNovo}
            className="min-h-12 rounded-sm border border-estrelinha-primary bg-estrelinha-surface px-4 text-sm font-medium text-estrelinha-primary"
          >
            {TENTAR_DE_NOVO}
          </button>
        </div>
      </CartaoDaFicha>
    )
  }

  if (!janela) {
    return (
      <CartaoDaFicha id="pedidos" titulo={titulo}>
        <div data-estado="carregando" aria-busy="true" className="space-y-2">
          <Traco className="h-14 w-full" />
          <Traco className="h-14 w-full" />
        </div>
      </CartaoDaFicha>
    )
  }

  return (
    <CartaoDaFicha id="pedidos" titulo={titulo}>
      <div data-estado="dado">
        <div data-testid="anuncio-dos-pedidos" aria-live="polite" className="sr-only">
          {aviso}
        </div>
        <ul ref={lista}>
          {janela.linhas.map((p, i) => (
            <li key={p.id} className={cn(i > 0 && 'border-t border-estrelinha-line')}>
              <LinhaDoPedidoDaCliente pedido={p} lidoEm={janela.lido_em} />
            </li>
          ))}
        </ul>
        {proximaFalhou ? (
          <div ref={rodape} data-testid="fim-com-falha" className="space-y-3 pt-2">
            <p role="alert" className="text-sm text-estrelinha-ink-soft">
              {FALHA_DOS_PEDIDOS}
            </p>
            <button
              type="button"
              onClick={pedirMais}
              className="min-h-12 rounded-sm border border-estrelinha-primary bg-estrelinha-surface px-4 text-sm font-medium text-estrelinha-primary"
            >
              {TENTAR_DE_NOVO}
            </button>
          </div>
        ) : !janela.fim ? (
          <button
            type="button"
            onClick={pedirMais}
            aria-disabled={carregandoMais ? 'true' : undefined}
            aria-busy={carregandoMais ? 'true' : undefined}
            className="mt-2 flex min-h-11 w-full items-center justify-center rounded-sm border border-estrelinha-primary bg-estrelinha-surface px-4 py-2 text-sm font-medium text-estrelinha-primary aria-disabled:opacity-70"
          >
            {VER_MAIS_PEDIDOS}
          </button>
        ) : null}
      </div>
    </CartaoDaFicha>
  )
}

export default PedidosDaCliente
