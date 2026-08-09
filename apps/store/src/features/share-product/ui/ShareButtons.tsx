import { Share2, Copy, MessageCircle } from 'lucide-react'
import { TAP_44 } from '@/shared/lib/touchTarget'
import { toast } from 'sonner'
import { Button } from '@estrelinha/ui/button'

interface Props {
  name: string
  url: string
}

const ShareButtons = ({ name, url }: Props) => {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: name, text: `Olha essa joia: ${name}`, url })
      } catch {}
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url)
    toast.success('Link copiado!')
  }

  const handleWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`Olha essa joia: ${name} - ${url}`)}`,
      '_blank'
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-estrelinha-ink-soft">Compartilhar:</span>
      <button
        onClick={handleWhatsApp}
        className={`${TAP_44} p-2 rounded-full hover:bg-estrelinha-ground-deep transition-colors`}
        aria-label="Compartilhar no WhatsApp"
      >
        <MessageCircle className="w-4 h-4 text-estrelinha-ink-soft" />
      </button>
      <button
        onClick={handleCopy}
        className={`${TAP_44} p-2 rounded-full hover:bg-estrelinha-ground-deep transition-colors`}
        aria-label="Copiar link"
      >
        <Copy className="w-4 h-4 text-estrelinha-ink-soft" />
      </button>
      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <button
          onClick={handleShare}
          className={`${TAP_44} p-2 rounded-full hover:bg-estrelinha-ground-deep transition-colors`}
          aria-label="Compartilhar"
        >
          <Share2 className="w-4 h-4 text-estrelinha-ink-soft" />
        </button>
      )}
    </div>
  )
}

export default ShareButtons
