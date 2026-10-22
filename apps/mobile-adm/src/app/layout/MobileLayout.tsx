import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { abaDoCaminho, TabBar, tituloDaAba } from '@/widgets/tab-bar'
import { AccountMenu } from '@/widgets/account-menu'
import { backofficeUrl } from '@/shared/config/backoffice'

/**
 * A moldura das abas (feature 72): cabeçalho com o menu da conta, o conteúdo da aba, o rodapé que
 * aponta para o Backoffice e a barra inferior fixa.
 *
 * Mora em `app/` e não em `widgets/` porque compõe dois widgets — um widget importando outro seria
 * import lateral (FSD).
 *
 * **A reserva da barra vem DEPOIS do rodapé** (a lição do `BOTTOM_BAR_H` da loja): reservar antes
 * esconderia a última linha do conteúdo atrás da barra fixa. A altura reservada é a da barra mais o
 * inset do sistema, a mesma soma que a barra ocupa.
 *
 * **A troca de aba se anuncia** (`MAF-29`): o título do documento passa a ser o da aba ("Pedidos ·
 * Ateliê") e o foco vai ao título da página, para o leitor de tela ler a tela nova — antes ele só
 * repetia "Clientes, atual". O foco NÃO se move na primeira montagem: quem abre o app não trocou de
 * nada, e roubar o foco ali só atrapalharia.
 */
const MobileLayout = () => {
  const url = backofficeUrl()
  const { pathname } = useLocation()
  const conteudo = useRef<HTMLElement>(null)
  const anterior = useRef<string | null>(null)

  useEffect(() => {
    const aba = abaDoCaminho(pathname)
    if (aba) document.title = tituloDaAba(aba)
    const trocou = anterior.current !== null && anterior.current !== pathname
    anterior.current = pathname
    if (!trocou) return
    const titulo = conteudo.current?.querySelector('h1')
    if (!titulo) return
    // `tabindex=-1`: focável por programa, fora da ordem do Tab.
    titulo.setAttribute('tabindex', '-1')
    titulo.focus()
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col bg-estrelinha-ground text-estrelinha-ink">
      <header className="flex min-h-14 items-center justify-between gap-4 border-b border-estrelinha-line bg-estrelinha-surface px-4">
        <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-estrelinha-ink-soft">Ateliê · painel</p>
        <AccountMenu />
      </header>

      <main ref={conteudo} className="flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer data-testid="rodape-backoffice" className="px-4 pb-6 text-sm text-estrelinha-ink-soft">
        <p>Produtos, vitrine e configurações da loja seguem no Backoffice.</p>
        {/* O link em linha própria: alvo de 48 px dentro da frase abria um vão no meio do texto. */}
        {url && (
          <a href={url} className="inline-flex min-h-12 items-center font-medium text-estrelinha-primary underline underline-offset-4">
            Abrir o Backoffice
          </a>
        )}
      </footer>

      <div data-testid="reserva-da-barra" aria-hidden="true" className="h-[calc(4rem+env(safe-area-inset-bottom))] shrink-0" />
      <TabBar />
    </div>
  )
}

export default MobileLayout
