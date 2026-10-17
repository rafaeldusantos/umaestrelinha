import { Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { TAP_ROW } from '@/shared/lib/touchTarget'

/**
 * "Compartilhar esta pergunta" — o link próprio da pergunta, para mandar a alguém.
 *
 * **É um `<a href>` de verdade, e o clique é interceptado.** O `href` é o endereço canônico da
 * pergunta, então o rastreador encontra os 67 endereços dentro da própria página (link interno, e não
 * só o sitemap), e abrir em nova aba continua funcionando. O clique normal não navega: no celular abre
 * o compartilhar do sistema (WhatsApp, mensagens…), e onde ele não existe copia o link.
 */
const FaqShareLink = ({ path, question }: { path: string; question: string }) => {
  const compartilhar = async (evento: React.MouseEvent<HTMLAnchorElement>) => {
    // Ctrl/Cmd/Shift + clique é "abrir em outra aba": quem pediu isso quer a página, não o link.
    if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.button !== 0) return
    evento.preventDefault()

    const url = `${window.location.origin}${path}`

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: question, url })
        return
      } catch (erro) {
        // Fechar a folha de compartilhar não é falha, e não pede fallback.
        if ((erro as DOMException)?.name === 'AbortError') return
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link da pergunta copiado')
    } catch {
      toast.error('Não foi possível copiar o link')
    }
  }

  return (
    <a
      href={path}
      onClick={compartilhar}
      className={`${TAP_ROW} mt-3 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-estrelinha-primary-strong underline-offset-4 hover:underline`}
    >
      <Link2 aria-hidden className="h-4 w-4" />
      Compartilhar esta pergunta
    </a>
  )
}

export default FaqShareLink
