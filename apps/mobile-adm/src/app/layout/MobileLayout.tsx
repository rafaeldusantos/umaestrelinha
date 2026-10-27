import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { abaDoCaminho, barraNoCaminho, TabBar, tituloDaAba } from '@/widgets/tab-bar'
import { useResumo } from '@/entities/stats'
import { useBuscaEmFoco } from '@/shared/lib/useBuscaEmFoco'
import { RESERVA_DA_BARRA } from '@/shared/ui/alturas'
import { AvisoDaAcao } from '@/features/order-actions'

/**
 * A moldura das abas (feature 72): o conteúdo da aba e a barra inferior fixa. O rodapé "Produtos,
 * vitrine e configurações da loja seguem no Backoffice." com o link para o painel SAIU em 2026-10-26
 * (decisão do usuário), e com ele a `VITE_BACKOFFICE_URL`, que só existia para esse link.
 *
 * **Sem cabeçalho global**, como no protótipo do Claude Design: a marca e o menu da conta moram no topo da faixa da Início (`InicioPage`), e as outras abas abrem direto no título.
 *
 * Mora em `app/` e não em `widgets/` porque compõe widgets — um widget importando outro seria import
 * lateral (FSD).
 *
 * **A reserva da barra vem DEPOIS do conteúdo** (a lição do `BOTTOM_BAR_H` da loja): reservar antes
 * esconderia a última linha do conteúdo atrás da barra fixa. A altura reservada é a da barra mais o
 * inset do sistema, a mesma soma que a barra ocupa.
 *
 * **A troca de aba se anuncia** (`MAF-29`): o título do documento passa a ser o da aba ("Pedidos ·
 * Ateliê") e o foco vai ao título da página, para o leitor de tela ler a tela nova — antes ele só
 * repetia "Clientes, atual". O foco NÃO se move na primeira montagem: quem abre o app não trocou de
 * nada, e roubar o foco ali só atrapalharia.
 *
 * **A barra sai de cena enquanto se digita uma busca** (`useBuscaEmFoco`, conserto do QA da `76`): com o
 * teclado aberto ela cobria a primeira linha do resultado. A reserva dela no fim da página permanece.
 *
 * **O selo da aba Pedidos** (feature `74`, `MAP-31`..`MAP-33`, A24, A25) é `fila.precisa_acao` de
 * `store_overview`, lido por `useResumo` — a MESMA chave de cache da Início, então com a Início aberta
 * é UMA leitura (dedupe do React Query). Relê com ela: ao montar, no primeiro plano e quando a lista ou
 * o detalhe recebem o aviso do Realtime (eles invalidam `STORE_OVERVIEW_KEY`). Sem leitura boa —
 * pendente, em falha, releitura falhada com dado, recusa — não há selo: nunca o número do cache, nunca
 * zero (`MAP-32`). **Sem `useRecusaDePapel`** (G-A24): no `42501` o selo só some; quem leva à recusa é
 * a tela, uma vez por episódio.
 */
const MobileLayout = () => {
  const { pathname } = useLocation()
  const conteudo = useRef<HTMLElement>(null)
  const anterior = useRef<string | null>(null)
  const resumo = useResumo()
  const buscando = useBuscaEmFoco()
  // O detalhe do pedido e o da cliente cobrem a barra (protótipo): voltar próprio, ação no fim da tela.
  const comBarra = barraNoCaminho(pathname)
  const precisaDeVoce = resumo.isError || !resumo.data ? null : resumo.data.fila.precisa_acao

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
      <main ref={conteudo} className="flex-1 px-4 pb-6 pt-4">
        <Outlet />
      </main>


      {comBarra && <div data-testid="reserva-da-barra" aria-hidden="true" className={`${RESERVA_DA_BARRA} shrink-0`} />}
      <AvisoDaAcao comBarra={comBarra} />
      {comBarra && !buscando && <TabBar selos={{ '/pedidos': precisaDeVoce }} />}
    </div>
  )
}

export default MobileLayout
