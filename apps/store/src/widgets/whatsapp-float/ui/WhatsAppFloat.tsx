import { useEffect, useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useGeneralSettings } from '@estrelinha/core/hooks/useStoreSettings'

const SEEN_KEY = 'estrelinha_wa_seen_v1'

const WhatsAppFloat = () => {
  const { whatsapp, whatsapp_message, store_name } = useGeneralSettings()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showBadge, setShowBadge] = useState(false)
  const [showTeaser, setShowTeaser] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 600)
    return () => clearTimeout(t)
  }, [])

  // Badge "1 nova mensagem" apenas na primeira visita
  useEffect(() => {
    if (typeof window === 'undefined') return
    const seen = localStorage.getItem(SEEN_KEY)
    if (seen) return
    const showT = setTimeout(() => setShowBadge(true), 1500)
    const teaserT = setTimeout(() => setShowTeaser(true), 2200)
    const hideTeaserT = setTimeout(() => setShowTeaser(false), 8000)
    return () => {
      clearTimeout(showT)
      clearTimeout(teaserT)
      clearTimeout(hideTeaserT)
    }
  }, [])

  const dismissBadge = () => {
    setShowBadge(false)
    setShowTeaser(false)
    try {
      localStorage.setItem(SEEN_KEY, '1')
    } catch {
      // ignore
    }
  }

  const handleToggle = () => {
    dismissBadge()
    setOpen((v) => !v)
  }

  // Não exibir no admin nem no checkout/pagamento
  if (location.pathname.startsWith('/admin')) return null
  if (location.pathname.startsWith('/checkout')) return null
  if (location.pathname.startsWith('/pedido/')) return null
  // Nem na página do produto, pela mesma razão das duas de cima: onde há barra de ação no rodapé, o
  // FAB não cabe. Ele é `bottom-20` com 56px de lado, então nasceria exatamente sobre o botão de
  // favoritos da barra de compra. Preventivo — hoje o WhatsApp não está configurado e o componente
  // nem renderiza. A página tem o link "Tirar uma dúvida no WhatsApp" abaixo das garantias.
  if (location.pathname.startsWith('/produto/')) return null
  if (!whatsapp || whatsapp.replace(/\D/g, '').length < 10) return null

  const phone = whatsapp.replace(/\D/g, '')
  const defaultMsg =
    whatsapp_message?.trim() ||
    `Olá! Estou navegando no site da ${store_name || 'Nanita'} e gostaria de tirar uma dúvida.`
  const link = `https://wa.me/${phone}?text=${encodeURIComponent(defaultMsg)}`

  return (
    <div
      className={`fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 flex flex-col items-end gap-3 transition-all duration-500 ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      {open && (
        <div className="bg-white border border-estrelinha-line rounded-2xl shadow-xl p-4 w-72 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-[hsl(142_70%_45%)] flex items-center justify-center shrink-0">
                <MessageCircle className="w-4 h-4 text-white" fill="white" />
              </div>
              <div>
                <p className="text-sm font-heading font-semibold text-estrelinha-ink leading-tight">
                  {store_name || 'Nanita'}
                </p>
                <p className="text-[11px] text-estrelinha-ink-soft">Normalmente responde em minutos</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-estrelinha-ink-soft hover:text-estrelinha-ink transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-estrelinha-ink-soft mb-3 leading-relaxed">
            Oi! 👋 Tem alguma dúvida sobre os bottons, frete ou pedido? Fala com a gente no WhatsApp!
          </p>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              dismissBadge()
              setOpen(false)
            }}
            className="block text-center text-sm font-medium text-white bg-[hsl(142_70%_45%)] hover:bg-[hsl(142_70%_40%)] rounded-xl py-2.5 transition-colors"
          >
            Iniciar conversa
          </a>
        </div>
      )}

      {!open && showTeaser && (
        <button
          onClick={handleToggle}
          className="bg-white border border-estrelinha-line rounded-2xl rounded-br-sm shadow-lg px-3 py-2 max-w-[220px] text-left animate-in fade-in slide-in-from-right-2 duration-300 hover:border-[hsl(142_70%_45%)] transition-colors"
          aria-label="Abrir mensagem"
        >
          <p className="text-[11px] font-semibold text-[hsl(142_70%_38%)] mb-0.5">
            {store_name || 'Nanita'}
          </p>
          <p className="text-xs text-estrelinha-ink leading-snug">
            Olá! 👋 Posso te ajudar com algo?
          </p>
        </button>
      )}

      <button
        onClick={handleToggle}
        aria-label="Abrir conversa no WhatsApp"
        className="relative group w-14 h-14 rounded-full bg-[hsl(142_70%_45%)] hover:bg-[hsl(142_70%_40%)] shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
      >
        <span className="absolute inset-0 rounded-full bg-[hsl(142_70%_45%)] animate-ping opacity-20" aria-hidden />
        {open ? (
          <X className="w-6 h-6 text-white relative z-10" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white relative z-10" fill="white" />
        )}
        {showBadge && !open && (
          <span
            className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-estrelinha-primary text-white text-[11px] font-bold flex items-center justify-center shadow-md ring-2 ring-white animate-in zoom-in duration-300"
            aria-label="1 nova mensagem"
          >
            1
          </span>
        )}
      </button>
    </div>
  )
}

export default WhatsAppFloat
