import { useRef, useState, type ReactNode, type TouchEvent } from 'react'
import { LoaderCircle } from 'lucide-react'

/** Quanto o dedo precisa descer, no topo, para a tela reler. */
export const LIMIAR_DO_PUXAR = 64

/** A frase do indicador enquanto a releitura está no ar. */
export const ATUALIZANDO = 'Atualizando…'

/**
 * Puxar para atualizar (feature `73`, `MAI-19`, `MAI-31`). Sem biblioteca: é um gesto.
 *
 * - Só no TOPO: começar o gesto com a página rolada não faz nada — puxar para baixo ali é rolar.
 * - Acima de `LIMIAR_DO_PUXAR`, `onRefresh` é chamado UMA vez; abaixo, nada.
 * - Enquanto a promessa está no ar, um indicador `role="status"` diz "Atualizando…" e some ao
 *   terminar — também na FALHA (a falha é dita pelo bloco, não pelo indicador preso). Um segundo
 *   gesto no meio não chama de novo.
 * - O giro do ícone tem `motion-reduce:animate-none`, e a faixa que acompanha o dedo não anima.
 *
 * O `overscroll-behavior-y: contain` do `body` (`app/app.css`) é a outra metade: sem ele, o Chrome em
 * ABA recarregaria a página inteira no mesmo gesto. Instalado (standalone) o gesto nativo não existe.
 */
const PullToRefresh = ({ onRefresh, children }: { onRefresh: () => Promise<unknown>; children: ReactNode }) => {
  const inicio = useRef<number | null>(null)
  const distancia = useRef(0)
  const emCurso = useRef(false)
  const [puxado, setPuxado] = useState(0)
  const [atualizando, setAtualizando] = useState(false)

  const comecar = (e: TouchEvent) => {
    inicio.current = window.scrollY > 0 || emCurso.current ? null : (e.touches[0]?.clientY ?? null)
    distancia.current = 0
  }

  const mover = (e: TouchEvent) => {
    if (inicio.current === null) return
    const y = e.touches[0]?.clientY
    if (y === undefined) return
    distancia.current = Math.max(0, y - inicio.current)
    setPuxado(distancia.current)
  }

  const soltar = () => {
    const d = distancia.current
    inicio.current = null
    distancia.current = 0
    setPuxado(0)
    if (d < LIMIAR_DO_PUXAR || emCurso.current) return
    emCurso.current = true
    setAtualizando(true)
    const fim = () => {
      emCurso.current = false
      setAtualizando(false)
    }
    // `then(fim, fim)` e não `finally`: a falha da releitura é dita pelo bloco, e um `finally`
    // devolveria a rejeição como erro solto.
    Promise.resolve()
      .then(onRefresh)
      .then(fim, fim)
  }

  return (
    <div onTouchStart={comecar} onTouchMove={mover} onTouchEnd={soltar} onTouchCancel={soltar}>
      {puxado > 0 && !atualizando && (
        <div
          aria-hidden="true"
          data-testid="puxar"
          style={{ height: Math.min(puxado / 2, 48) }}
          className="flex items-end justify-center overflow-hidden text-xs text-estrelinha-ink-soft"
        >
          {puxado >= LIMIAR_DO_PUXAR ? 'Solte para atualizar' : 'Puxe para atualizar'}
        </div>
      )}
      {atualizando && (
        <div role="status" className="flex items-center justify-center gap-2 py-2 text-sm text-estrelinha-ink-soft">
          <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />
          {ATUALIZANDO}
        </div>
      )}
      {children}
    </div>
  )
}

export default PullToRefresh
