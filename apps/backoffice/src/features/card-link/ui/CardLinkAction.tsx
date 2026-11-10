// "Gerar link de cartão" no bloco Pagamento do pedido. A página só o monta quando o pedido pode
// receber o link (`cardLinkRefusal`, `core/checkout`): feito com cartão, pagamento pendente, recusado
// ou vencido, não pago e não cancelado. O link — montado pela function — aparece num campo só leitura,
// com "Copiar" para a Adri mandar pelo WhatsApp. Gerar outro invalida o anterior — e a frase diz isso antes do toque.
import { useState } from 'react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { gerarLinkDeCartao } from '../api/gerarLinkDeCartao'

export const CARD_LINK_FAILED = 'Não consegui gerar o link. Tente de novo.'
export const CARD_LINK_REPLACES = 'Gerar outro link faz o anterior parar de funcionar.'

interface Props {
  orderId: string
}

export const CardLinkAction = ({ orderId }: Props) => {
  const [link, setLink] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [gerando, setGerando] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const gerar = async () => {
    setGerando(true)
    setAviso(null)
    setCopiado(false)
    const r = await gerarLinkDeCartao(orderId)
    setGerando(false)
    if (r.tipo === 'recusado') {
      setLink(null)
      setAviso(r.motivo)
      return
    }
    if (r.tipo === 'falhou') {
      setAviso(CARD_LINK_FAILED)
      return
    }
    setLink((r as { link: string }).link)
  }

  const copiar = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopiado(true)
    } catch {
      setCopiado(false)
      setAviso('Não consegui copiar. Selecione o link e copie à mão.')
    }
  }

  return (
    <div className="mt-3 space-y-2">
      {link && (
        <div className="space-y-2">
          <label htmlFor="link-de-cartao" className="text-xs font-medium text-muted-foreground">
            Link de pagamento com cartão
          </label>
          <Input
            id="link-de-cartao"
            data-testid="link-de-cartao"
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="min-h-11 text-xs"
          />
          <Button type="button" className="min-h-11 w-full" onClick={() => void copiar()}>
            {copiado ? 'Link copiado' : 'Copiar link'}
          </Button>
          <p className="text-xs text-muted-foreground">{CARD_LINK_REPLACES}</p>
        </div>
      )}
      {aviso && (
        <p role="alert" className="text-xs text-estrelinha-admin-amber">
          {aviso}
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full"
        disabled={gerando}
        onClick={() => void gerar()}
      >
        {gerando ? 'Gerando link…' : link ? 'Gerar outro link de cartão' : 'Gerar link de cartão'}
      </Button>
    </div>
  )
}
