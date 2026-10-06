import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Link, matchPath, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { PRIVACY_POLICY_PATH } from '@estrelinha/core/routes'
import { useCookieConsent } from '@/entities/cookie-consent'
import { bottomBarReserve } from '@/shared/lib/storeChrome'
import { TAP_44, TAP_ROW } from '@/shared/lib/touchTarget'
import CookiePreferencesSheet from './CookiePreferencesSheet'

/**
 * As telas de DINHEIRO — o checkout e o pagamento PIX (`AVS-07`). O aviso não aparece nelas.
 *
 * O CTA de pagar está no fluxo, no fim da página, e no celular o aviso cobria ~150px exatamente
 * ali. Como a medição já vale sem aceite (legítimo interesse, `AVS-03`), esconder o aviso nessas
 * duas telas não muda o que se mede — só tira o obstáculo do toque que importa. Ele volta ao sair
 * delas, enquanto a cliente não responder. A folha de preferências continua montada: quem a abre
 * é o link do rodapé, e essas telas nem têm rodapé.
 *
 * Os padrões são os das rotas do `App.tsx`, pela mesma função que o router usa para casar.
 */
const TELAS_DE_DINHEIRO = ['/checkout', '/pedido/:id/pagamento'] as const

const telaDeDinheiro = (pathname: string): boolean =>
  TELAS_DE_DINHEIRO.some(path => matchPath({ path, end: true }, pathname) !== null)

/**
 * Feature 61 · AVS-01..07 — o aviso de cookies (Paper, "61 · Loja — Aviso de cookies (Mobile 390)").
 *
 * **Compacto e induzido ao aceite**, no modelo das grandes lojas: uma frase que não nomeia o Google
 * (quem nomeia é a política), "Aceitar" como botão principal, "Preferências" como link discreto e o
 * X. **Fechar não é recusar** — a medição é por legítimo interesse e segue enquanto a cliente navega.
 *
 * **Fica ACIMA da barra fixa do rodapé, nunca por cima dela** (`AVS-07`): no celular a loja tem
 * `MobileNav` ou a barra de compra, e cobrir qualquer uma tiraria da cliente o toque que ela veio
 * dar. **E não aparece nas telas de dinheiro** (checkout e pagamento PIX), onde não há barra e o
 * CTA de pagar está no fluxo — ver `telaDeDinheiro`.
 *
 * **Vai por portal ao fim do `<body>`**, e a ordem do DOM é o que decide as camadas: ele fica acima
 * da bolha do WhatsApp (que mora no `#root` na mesma camada) e abaixo de toda gaveta da loja — o
 * Radix monta o portal dela DEPOIS, ao abrir, e por isso o véu do carrinho cobre o aviso em vez de
 * o aviso cobrir o botão do carrinho.
 */
const CookieNotice = () => {
  const { pathname } = useLocation()
  const { noticeOpen, preferencesOpen, accept, dismiss, openPreferences } = useCookieConsent()

  const visivel =
    noticeOpen && !preferencesOpen && !telaDeDinheiro(pathname) && typeof document !== 'undefined'
  const rodape = bottomBarReserve(pathname)

  return (
    <>
      {visivel &&
        createPortal(
          <section
            aria-label="Aviso de cookies"
            style={{ '--aviso-rodape': rodape } as CSSProperties}
            className="fixed inset-x-0 bottom-[var(--aviso-rodape)] z-50 rounded-t-lg border-t border-estrelinha-line bg-estrelinha-surface px-4 pb-6 pt-4 shadow-[0_-8px_24px_rgba(35,48,58,0.08)] md:bottom-0 md:pb-5"
          >
            <div className="mx-auto flex max-w-[720px] flex-col gap-3">
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 text-[14.5px] leading-[22px] text-estrelinha-ink-soft">
                  Usamos cookies para melhorar a sua experiência. Ao continuar navegando, você
                  concorda com a nossa{' '}
                  <Link
                    to={PRIVACY_POLICY_PATH}
                    className="text-estrelinha-ink underline underline-offset-2"
                  >
                    Política de Privacidade
                  </Link>
                  .
                </p>
                <button
                  type="button"
                  onClick={dismiss}
                  aria-label="Fechar aviso de cookies"
                  className={`${TAP_44} -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-estrelinha-ink`}
                >
                  <X className="h-[14px] w-[14px]" strokeWidth={2} aria-hidden />
                </button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={openPreferences}
                  className={`${TAP_ROW} px-1 text-[13.5px] leading-[18px] text-estrelinha-ink-soft underline underline-offset-2`}
                >
                  Preferências
                </button>
                <button
                  type="button"
                  onClick={accept}
                  className="flex h-12 w-[168px] shrink-0 items-center justify-center rounded-sm bg-estrelinha-primary text-[15px] font-semibold text-estrelinha-on-primary"
                >
                  Aceitar
                </button>
              </div>
            </div>
          </section>,
          document.body,
        )}
      <CookiePreferencesSheet />
    </>
  )
}

export default CookieNotice
