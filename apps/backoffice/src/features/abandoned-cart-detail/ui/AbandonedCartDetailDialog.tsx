import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@estrelinha/ui/dialog'
import { Button } from '@estrelinha/ui/button'
import { Badge } from '@estrelinha/ui/badge'
import { Mail, ShoppingBag, Clock, Tag, ExternalLink, Trash2, MailWarning, Link2, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { formatPrice, formatRelativeDate } from '@estrelinha/core/formatters'
import { STATUS_LABELS, STATUS_COLORS } from '@/entities/abandoned-cart/api/useAdminAbandonedCarts'
import { storeUrlFor } from '@/features/product-form/lib/storeUrl'
import { toast } from 'sonner'
import type { DbAbandonedCart } from '@estrelinha/supabase/types/abandonedCart'

interface Props {
  cart: DbAbandonedCart | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete?: (id: string) => void
}

const AbandonedCartDetailDialog = ({ cart, open, onOpenChange, onDelete }: Props) => {
  const [copied, setCopied] = useState(false)

  if (!cart) return null

  const handleCopyRecoveryLink = async () => {
    const url = `${window.location.origin}/carrinho?recover=${cart.id}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Link de recuperação copiado!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Não foi possível copiar o link')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl flex items-center gap-3">
            Carrinho de {cart.customer_name || cart.customer_email}
            <Badge variant="outline" className={STATUS_COLORS[cart.status]}>
              {STATUS_LABELS[cart.status]}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Cliente */}
          <section className="bg-estrelinha-admin-elevated rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">Cliente</h3>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-estrelinha-admin-violet" />
              <span className="font-medium">{cart.customer_email}</span>
            </div>
            {cart.customer_name && (
              <div className="text-sm text-muted-foreground">{cart.customer_name}</div>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              Última atividade: {formatRelativeDate(cart.last_activity_at)}
            </div>
            {cart.marketing_consent ? (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                ✓ Consentiu receber lembretes
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                Sem consentimento de marketing
              </Badge>
            )}
          </section>

          {/* Itens */}
          <section>
            <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-3 flex items-center gap-2">
              <ShoppingBag className="w-3 h-3" />
              Itens ({cart.items.length})
            </h3>
            <div className="space-y-2">
              {cart.items.map((item, i) => {
                // O link é para a LOJA, e por isso é `<a href>` e não `<Link to>`. Com `<Link>` o
                // React Router do painel tentava casar o caminho do produto contra as rotas de
                // `/admin/*`, não achava nenhuma e entregava a 404 **do painel** — nunca a loja.
                // Sem `VITE_STORE_URL` não há loja para onde ir: o nome vira texto, nunca link morto.
                const storeHref = storeUrlFor(item.product_slug)

                return (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 bg-white border border-estrelinha-admin-border rounded-xl"
                >
                  {item.product_image ? (
                    <img
                      src={item.product_image}
                      alt={item.product_name}
                      className="w-14 h-14 rounded-lg object-cover bg-estrelinha-admin-elevated"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-estrelinha-admin-elevated" />
                  )}
                  <div className="flex-1 min-w-0">
                    {storeHref ? (
                      <a
                        href={storeHref}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-estrelinha-admin-text hover:text-estrelinha-admin-violet line-clamp-1 flex items-center gap-1"
                      >
                        {item.product_name}
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    ) : (
                      <span className="font-medium text-estrelinha-admin-text line-clamp-1">
                        {item.product_name}
                      </span>
                    )}
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {item.size && `${item.size}`}
                      {item.size && item.finish && ' · '}
                      {item.finish && `${item.finish}`}
                      {' · '}
                      {item.quantity}x {formatPrice(item.unit_price)}
                    </div>
                  </div>
                  <div className="font-semibold text-estrelinha-admin-text">
                    {formatPrice(item.unit_price * item.quantity)}
                  </div>
                </div>
                )
              })}
            </div>
          </section>

          {/* Resumo */}
          <section className="bg-estrelinha-admin-elevated rounded-xl p-4 space-y-1">
            {cart.coupon_code && (
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Tag className="w-3 h-3" /> Cupom aplicado
                </span>
                <span className="font-mono font-semibold text-estrelinha-admin-violet">{cart.coupon_code}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base pt-1">
              <span>Subtotal</span>
              <span>{formatPrice(cart.subtotal)}</span>
            </div>
          </section>

          {/* Recuperação */}
          {cart.status === 'recovered' && cart.recovered_order_id && (
            <section className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="text-sm text-emerald-800">
                ✓ Carrinho recuperado em pedido{' '}
                <Link
                  to={`/admin/pedidos`}
                  className="font-mono font-semibold underline"
                >
                  #{cart.recovered_order_id.slice(0, 8)}
                </Link>
              </div>
            </section>
          )}

          {/* Lembretes */}
          {cart.reminder_sent_at && (
            <section className="text-xs text-muted-foreground">
              Último lembrete enviado: {formatRelativeDate(cart.reminder_sent_at)} (
              {cart.reminder_sent_count}x)
            </section>
          )}

          {/* Ações */}
          <div className="flex gap-2 pt-2 border-t border-estrelinha-admin-border">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCopyRecoveryLink}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2 text-emerald-600" />
                  Copiado!
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4 mr-2" />
                  Copiar link de recuperação
                </>
              )}
            </Button>
            <Button
              disabled
              variant="outline"
              size="icon"
              title="Configure email para enviar lembretes"
            >
              <MailWarning className="w-4 h-4" />
            </Button>
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (confirm('Excluir este registro permanentemente?')) {
                    onDelete(cart.id)
                    onOpenChange(false)
                  }
                }}
                title="Excluir"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AbandonedCartDetailDialog
