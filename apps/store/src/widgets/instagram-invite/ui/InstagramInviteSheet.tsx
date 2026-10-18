import type { CSSProperties } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Instagram, X } from 'lucide-react'
import { Sheet, SheetDescription, SheetOverlay, SheetPortal, SheetTitle } from '@estrelinha/ui/sheet'
import {
  INSTAGRAM_CTA_GRADIENT,
  INSTAGRAM_CTA_TEXT,
  INSTAGRAM_HANDLE,
  INSTAGRAM_URL,
} from '@/shared/config/instagram'
import { TAP_ROW } from '@/shared/lib/touchTarget'
import Button from '@/shared/ui/Button'
import { InstagramAvatar, InstagramGlyph } from './InstagramMarks'

interface InstagramInviteSheetProps {
  open: boolean
  onClose: () => void
}

/**
 * A folha do convite: presa ao rodapé no celular, cartão de 480px no centro a partir de `md`.
 *
 * O conteúdo é o primitivo do Radix e não o `SheetContent` do pacote de UI porque aquele monta o
 * próprio véu (`bg-black/80`) e o próprio X; aqui o véu é `ink` a 55% e o X tem o alvo de 44px.
 * `Sheet`, `SheetPortal` e `SheetOverlay` são os do pacote — o mesmo Root do Radix por baixo.
 *
 * V2 (Paper, "IG A V2" e "IG B V2"): a identidade do Instagram entra em TRÊS pontos e só neles — o
 * ícone colorido no rótulo, o anel de story no avatar e o gradiente do botão. Título, texto, fundo
 * e "Agora não" continuam da loja.
 */
const InstagramInviteSheet = ({ open, onClose }: InstagramInviteSheetProps) => (
  <Sheet open={open} onOpenChange={aberto => !aberto && onClose()}>
    <SheetPortal>
      <SheetOverlay className="bg-estrelinha-ink/55" />
      <DialogPrimitive.Content className="fixed inset-x-0 bottom-0 z-50 flex flex-col gap-6 rounded-t-lg bg-estrelinha-surface px-6 pb-8 pt-3 shadow-[0_-14px_28px_-10px_rgba(52,73,94,0.16)] focus:outline-none md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[480px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:p-10 md:shadow-estrelinha-lift">
        <span
          aria-hidden
          data-testid="puxador"
          className="mx-auto block h-1 w-10 shrink-0 rounded-pill bg-estrelinha-line md:hidden"
        />

        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar convite do Instagram"
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-estrelinha-ink md:right-4 md:top-4"
        >
          <X className="h-5 w-5" strokeWidth={1.5} aria-hidden />
        </button>

        <div className="flex flex-col gap-3 pr-10">
          <p className="flex items-center gap-2.5 text-[12px] font-medium leading-4 tracking-[0.18em] text-estrelinha-ink-soft">
            <InstagramGlyph />
            NO INSTAGRAM
          </p>
          <SheetTitle className="font-display text-[28px] font-bold leading-[34px] tracking-[-0.02em] text-estrelinha-ink md:text-[32px] md:leading-[40px]">
            <span className="block">Acompanhe de perto</span>{' '}
            <span className="block">o meu trabalho</span>
          </SheetTitle>
          <SheetDescription className="font-body text-[17px] leading-[27px] text-estrelinha-ink-soft">
            Lá eu mostro cada joia sendo feita, do material que chega até a peça pronta. Se quiser
            acompanhar, vai ser um carinho ter você por lá.
          </SheetDescription>
        </div>

        <div className="flex items-center gap-3">
          <InstagramAvatar />
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="font-body text-[15px] font-semibold leading-5 text-estrelinha-ink">
              {INSTAGRAM_HANDLE}
            </p>
            <p className="font-body text-[14px] leading-[18px] text-estrelinha-ink-soft">
              Adri Muniz · joias afetivas
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            asChild
            block
            className="h-[52px] py-0 font-body text-[17px] font-medium shadow-[0_8px_20px_-10px_rgba(131,58,180,0.6)] [background-image:var(--ig-gradiente)] hover:opacity-90"
            // O gradiente vai por variável pelo mesmo motivo do anel (`InstagramMarks.tsx`).
            style={{ '--ig-gradiente': INSTAGRAM_CTA_GRADIENT, color: INSTAGRAM_CTA_TEXT } as CSSProperties}
          >
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" onClick={onClose}>
              <Instagram className="h-5 w-5" strokeWidth={1.5} aria-hidden />
              Ver o perfil no Instagram
            </a>
          </Button>
          <button
            type="button"
            onClick={onClose}
            className={`${TAP_ROW} self-center text-[15px] font-medium leading-5 text-estrelinha-primary`}
          >
            Agora não
          </button>
        </div>
      </DialogPrimitive.Content>
    </SheetPortal>
  </Sheet>
)

export default InstagramInviteSheet
