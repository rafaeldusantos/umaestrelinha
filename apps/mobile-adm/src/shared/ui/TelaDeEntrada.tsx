import { useEffect } from 'react'
import lockup from '@/shared/assets/uma-estrelinha-lockup-negativo.svg?raw'

/** O título do documento fora das abas: o mesmo do `index.html`. */
export const TITULO_FORA_DAS_ABAS = 'Ateliê · Uma Estrelinha'

/**
 * A moldura das telas de quem ainda não entrou (feature 72): o Login, a recuperação por código e o
 * "Não consegui conferir seu acesso.". O cabeçalho e o aviso de acesso restrito ficam aqui, uma vez
 * — antes moravam dentro do `LoginPage`, e a recuperação ganhou rota própria (`MAF-24`).
 *
 * O cabeçalho é a faixa `primary-strong` do protótipo (`Ateliê Admin.dc.html`, tela Login): o
 * lockup negativo a **260 px**, centrado, com o rótulo em `on-primary` embaixo. É a mesma exceção à
 * escada da marca que a `Splash` declara (lockup abaixo do piso de 600 px), e o MESMO arquivo que
 * ela importa — inline, nunca `<img>`, para a faixa não ter estado de carregamento. A faixa tem a
 * cor da barra de status (`theme_color`), então o topo do celular e o cabeçalho viram um bloco só;
 * o `safe-area-inset-top` entra no respiro de cima.
 *
 * Também devolve o título do documento ao do `index.html`: quem sai pelas abas não pode ficar com
 * "Pedidos · Ateliê" na tela de entrar (`MAF-29`).
 */
const TelaDeEntrada = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    document.title = TITULO_FORA_DAS_ABAS
  }, [])

  return (
    <main className="flex min-h-screen flex-col bg-estrelinha-ground text-estrelinha-ink">
      <header className="flex shrink-0 flex-col items-center gap-[18px] bg-estrelinha-primary-strong px-6 pb-11 pt-[calc(3.5rem+env(safe-area-inset-top))]">
        <div
          role="img"
          aria-label="Uma Estrelinha — eternizando suas lembranças"
          data-testid="entrada-lockup"
          className="w-[260px] max-w-full [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: lockup }}
        />
        <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-estrelinha-on-primary">Ateliê · painel</p>
      </header>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        {children}
        <p className="mt-auto pt-10 text-center text-xs text-estrelinha-ink-soft">Acesso restrito a quem cuida da loja.</p>
      </div>
    </main>
  )
}

export default TelaDeEntrada
