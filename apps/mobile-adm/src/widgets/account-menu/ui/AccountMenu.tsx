import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CircleUser } from 'lucide-react'
import { useAuthContext } from '@estrelinha/auth'
import { isAccessDenied } from '@estrelinha/core/hooks/useStoreOverview'
import {
  AVISOS_NESTE_CELULAR,
  NAO_PAROU,
  SAIR_MESMO_ASSIM,
  TENTAR_DE_NOVO,
  pararAvisosDesteAparelho,
} from '@/features/push-notifications'

const LINHA = 'flex min-h-12 w-full items-center rounded-sm px-3 text-left text-sm font-medium text-estrelinha-ink disabled:opacity-50'

/**
 * O menu da conta no cabeçalho das abas (feature 72, `MAF-13`): o e-mail de quem está no ateliê,
 * "Avisos neste celular" (feature `79`, `MAN-17`) e "Sair". Sair encerra a sessão; quem leva ao Login
 * é o `RequireAdmin`.
 *
 * Um painel próprio, não o `DropdownMenu` do Radix: são poucas linhas, e o painel abre sob o botão sem
 * portal nem foco preso.
 *
 * **Sair para os avisos deste aparelho antes** (feature `79`, `MAN-30`, A7): `pararAvisosDesteAparelho`
 * — o MESMO dono que a tela de avisos usa — apaga a inscrição na porta e no navegador, e só então a
 * sessão é encerrada. Sem inscrição, o "Sair" é o de sempre, sem chamada a mais. A porta falhando ⇒ a
 * pergunta, aqui dentro do painel ("Tentar de novo" e "Sair mesmo assim"), e nada de `signOut` até ela
 * responder: não existe tela de saída, então a escolha tem de acontecer antes. A porta RECUSANDO por
 * papel (`42501`) ⇒ `signOut()` direto, sem a pergunta: a conta já não é admin, e o motor apaga as
 * inscrições dela no próximo envio (`MAN-18`).
 */
const AccountMenu = () => {
  const { user, signOut } = useAuthContext()
  const [aberto, setAberto] = useState(false)
  const [saindo, setSaindo] = useState(false)
  const [pergunta, setPergunta] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)
  const botao = useRef<HTMLButtonElement>(null)
  const primeiroDaPergunta = useRef<HTMLButtonElement>(null)
  const { key: rota } = useLocation()

  // O painel fecha quando ela sai dele (BUG-20261022-menu-da-conta-nao-fecha): ao trocar de rota
  // (toque numa aba OU o voltar do Android — o voltar continua sendo do navegador, nada é
  // interceptado), ao tocar fora e com Escape. Sem isso ele ficava pendurado em toda aba.
  useEffect(() => setAberto(false), [rota])
  useEffect(() => {
    if (!aberto) return
    const fora = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false)
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setAberto(false)
      botao.current?.focus()
    }
    document.addEventListener('pointerdown', fora)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('pointerdown', fora)
      document.removeEventListener('keydown', tecla)
    }
  }, [aberto])

  // A pergunta é do painel aberto: fechado, ele volta ao "Sair" de sempre.
  useEffect(() => {
    if (!aberto) setPergunta(false)
  }, [aberto])

  // `L-066`: a pergunta aparece no lugar do botão que estava focado; o foco vai ao primeiro botão dela,
  // senão cairia no `<body>` e o leitor de tela não a anunciaria pelo foco.
  useEffect(() => {
    if (pergunta) primeiroDaPergunta.current?.focus()
  }, [pergunta])

  const encerrar = async () => {
    setSaindo(true)
    // Sem navegação aqui: com a sessão encerrada, o `RequireAdmin` da rota já devolve ao `/login`.
    // Uma segunda decisão de destino seria a regra escrita duas vezes.
    await signOut()
  }

  const sair = async () => {
    setSaindo(true)
    setPergunta(false)
    let desfecho: Awaited<ReturnType<typeof pararAvisosDesteAparelho>>
    try {
      desfecho = await pararAvisosDesteAparelho()
    } catch (e) {
      if (isAccessDenied(e)) return encerrar()
      desfecho = 'falhou'
    }
    if (desfecho === 'falhou') {
      setSaindo(false)
      setPergunta(true)
      return
    }
    await encerrar()
  }

  return (
    <div ref={raiz} className="relative">
      <button
        ref={botao}
        type="button"
        aria-expanded={aberto}
        aria-controls="menu-da-conta"
        onClick={() => setAberto((v) => !v)}
        className="flex min-h-12 min-w-12 items-center justify-center rounded-full text-estrelinha-ink"
      >
        <CircleUser aria-hidden="true" className="h-6 w-6" strokeWidth={1.5} />
        <span className="sr-only">Sua conta</span>
      </button>
      {aberto && (
        <div
          id="menu-da-conta"
          className="absolute right-0 top-full z-50 mt-1 w-64 max-w-[calc(100vw-32px)] rounded-lg border border-estrelinha-line bg-estrelinha-surface p-2 shadow-estrelinha-soft"
        >
          <p className="truncate px-3 py-2 text-sm text-estrelinha-ink-soft">{user?.email}</p>
          <Link to="/avisos" onClick={() => setAberto(false)} className={LINHA}>
            {AVISOS_NESTE_CELULAR}
          </Link>
          {pergunta ? (
            <div className="mt-1 space-y-1 border-t border-estrelinha-line pt-2">
              <p role="alert" className="px-3 py-1 text-sm text-estrelinha-alert">
                {NAO_PAROU}
              </p>
              <button ref={primeiroDaPergunta} type="button" onClick={sair} disabled={saindo} className={LINHA}>
                {TENTAR_DE_NOVO}
              </button>
              <button type="button" onClick={encerrar} disabled={saindo} className={LINHA}>
                {SAIR_MESMO_ASSIM}
              </button>
            </div>
          ) : (
            <button type="button" onClick={sair} disabled={saindo} className={LINHA}>
              {saindo ? 'Saindo…' : 'Sair'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default AccountMenu
