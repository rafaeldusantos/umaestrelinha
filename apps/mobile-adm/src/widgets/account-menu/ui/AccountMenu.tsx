import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { CircleUser } from 'lucide-react'
import { useAuthContext } from '@estrelinha/auth'

/**
 * O menu da conta no cabeçalho das abas (feature 72, `MAF-13`): o e-mail de quem está no ateliê e
 * "Sair". Sair encerra a sessão; quem leva ao Login é o `RequireAdmin`.
 *
 * Um painel próprio, não o `DropdownMenu` do Radix: são duas linhas, e o painel abre sob o botão sem
 * portal nem foco preso.
 */
const AccountMenu = () => {
  const { user, signOut } = useAuthContext()
  const [aberto, setAberto] = useState(false)
  const [saindo, setSaindo] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)
  const botao = useRef<HTMLButtonElement>(null)
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

  const sair = async () => {
    setSaindo(true)
    // Sem navegação aqui: com a sessão encerrada, o `RequireAdmin` da rota já devolve ao `/login`.
    // Uma segunda decisão de destino seria a regra escrita duas vezes.
    await signOut()
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
          <button
            type="button"
            onClick={sair}
            disabled={saindo}
            className="flex min-h-12 w-full items-center rounded-sm px-3 text-left text-sm font-medium text-estrelinha-ink disabled:opacity-50"
          >
            {saindo ? 'Saindo…' : 'Sair'}
          </button>
        </div>
      )}
    </div>
  )
}

export default AccountMenu
