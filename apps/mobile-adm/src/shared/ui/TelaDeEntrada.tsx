import { useEffect } from 'react'

/** O título do documento fora das abas: o mesmo do `index.html`. */
export const TITULO_FORA_DAS_ABAS = 'Ateliê · Uma Estrelinha'

/**
 * A moldura das telas de quem ainda não entrou (feature 72): o Login, a recuperação por código e o
 * "Não consegui conferir seu acesso.". O rótulo do topo e o aviso de acesso restrito ficam aqui,
 * uma vez — antes moravam dentro do `LoginPage`, e a recuperação ganhou rota própria (`MAF-24`).
 *
 * Também devolve o título do documento ao do `index.html`: quem sai pelas abas não pode ficar com
 * "Pedidos · Ateliê" na tela de entrar (`MAF-29`).
 */
const TelaDeEntrada = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    document.title = TITULO_FORA_DAS_ABAS
  }, [])

  return (
    <main className="flex min-h-screen flex-col bg-estrelinha-ground px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-12 text-estrelinha-ink">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col">
        <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-estrelinha-ink-soft">Ateliê · painel</p>
        {children}
        <p className="mt-auto pt-10 text-center text-xs text-estrelinha-ink-soft">Acesso restrito a quem cuida da loja.</p>
      </div>
    </main>
  )
}

export default TelaDeEntrada
