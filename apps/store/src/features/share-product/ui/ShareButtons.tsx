import { Share2, Copy, MessageCircle } from 'lucide-react'
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
        await navigator.share({ title: name, text: `Olha esse botton: ${name}`, url })
      } catch {}
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url)
    toast.success('Link copiado!')
  }

  const handleWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`Olha esse botton: ${name} - ${url}`)}`,
      '_blank'
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-nanita-plum">Compartilhar:</span>
      <button
        onClick={handleWhatsApp}
        className="p-2 rounded-full hover:bg-nanita-sugar transition-colors"
        aria-label="Compartilhar no WhatsApp"
      >
        <MessageCircle className="w-4 h-4 text-nanita-plum" />
      </button>
      <button
        onClick={handleCopy}
        className="p-2 rounded-full hover:bg-nanita-sugar transition-colors"
        aria-label="Copiar link"
      >
        <Copy className="w-4 h-4 text-nanita-plum" />
      </button>
      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <button
          onClick={handleShare}
          className="p-2 rounded-full hover:bg-nanita-sugar transition-colors"
          aria-label="Compartilhar"
        >
          <Share2 className="w-4 h-4 text-nanita-plum" />
        </button>
      )}
    </div>
  )
}

export default ShareButtons
