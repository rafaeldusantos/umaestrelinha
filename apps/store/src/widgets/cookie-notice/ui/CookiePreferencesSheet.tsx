import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@estrelinha/ui/sheet'
import { useAnalyticsSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { useCookieConsent } from '@/entities/cookie-consent'
import { TAP_44, TAP_ROW } from '@/shared/lib/touchTarget'

/** O marcador que esta folha põe no histórico para o gesto de voltar fechá-la (`AVS-07`). */
const MARCA_NO_HISTORICO = 'estrelinhaCookiePreferences'

/**
 * Feature 61 · AVS-04..07 — a folha "Preferências de cookies" (Paper, "61 · Loja — Preferências de
 * cookies (Mobile 390)").
 *
 * Duas categorias, e só duas: **Necessários** (sempre ativos, sem interruptor) e **Estatísticas**
 * (interruptor já ligado). "Preferências" e "Marketing" não têm o que controlar nesta loja hoje, e
 * um interruptor que não muda nada seria afirmar o que a loja não faz.
 *
 * Com a medição desligada no painel a categoria Estatísticas some (`AVS-02`): não há o que recusar.
 *
 * **O gesto de voltar fecha a folha** (`AVS-07`). Ao abrir, ela empilha uma entrada no histórico com
 * o MESMO endereço; o voltar consome essa entrada e a folha fecha, em vez de a cliente sair da
 * página. Fechar por dentro (X, salvar, aceitar) desempilha a entrada, para o próximo voltar ir
 * aonde ela espera. As outras gavetas da loja ainda não fazem isso — é dívida registrada delas.
 */
const CookiePreferencesSheet = () => {
  const { preferencesOpen, statistics, save, accept, closePreferences } = useCookieConsent()
  const { enabled: medicaoLigada } = useAnalyticsSettings()
  const [estatisticas, setEstatisticas] = useState(statistics)
  const empilhou = useRef(false)

  // Ao abrir, o interruptor mostra a escolha guardada — não a da última vez que a folha abriu.
  useEffect(() => {
    if (preferencesOpen) setEstatisticas(statistics)
  }, [preferencesOpen, statistics])

  useEffect(() => {
    if (!preferencesOpen) {
      if (empilhou.current) {
        empilhou.current = false
        if (window.history.state?.[MARCA_NO_HISTORICO]) window.history.back()
      }
      return
    }
    window.history.pushState({ ...window.history.state, [MARCA_NO_HISTORICO]: true }, '')
    empilhou.current = true
    const aoVoltar = () => {
      if (!empilhou.current) return
      empilhou.current = false
      closePreferences()
    }
    window.addEventListener('popstate', aoVoltar)
    return () => window.removeEventListener('popstate', aoVoltar)
  }, [preferencesOpen, closePreferences])

  return (
    <Sheet open={preferencesOpen} onOpenChange={aberto => !aberto && closePreferences()}>
      <SheetContent
        side="bottom"
        hideClose
        className="mx-auto max-h-[88vh] max-w-[560px] gap-1 overflow-y-auto rounded-t-lg border-0 bg-estrelinha-surface p-0 px-4 pb-6 pt-2 md:mb-6 md:rounded-lg"
      >
        <span aria-hidden className="mx-auto mb-2 mt-1 block h-1 w-10 rounded-pill bg-estrelinha-line" />

        <div className="flex items-center justify-between">
          <SheetTitle className="font-display text-[19px] font-normal leading-[26px] text-estrelinha-ink">
            Preferências de cookies
          </SheetTitle>
          <button
            type="button"
            onClick={closePreferences}
            aria-label="Fechar preferências de cookies"
            className={`${TAP_44} flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-estrelinha-ink`}
          >
            <X className="h-[14px] w-[14px]" strokeWidth={2} aria-hidden />
          </button>
        </div>
        <SheetDescription className="sr-only">
          Escolha quais cookies a loja pode usar neste navegador.
        </SheetDescription>

        <div className="flex items-start gap-4 border-b border-estrelinha-line py-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h3 className="text-[15.5px] font-semibold leading-5 text-estrelinha-ink">Necessários</h3>
            <p className="text-[14px] leading-[21px] text-estrelinha-ink-soft">
              Guardam a sua sacola, os favoritos e o andamento da compra. Sem eles a loja não
              funciona.
            </p>
          </div>
          <span className="shrink-0 pt-0.5 text-[13px] font-medium leading-4 text-estrelinha-ink-soft">
            Sempre ativos
          </span>
        </div>

        {medicaoLigada && (
          <div className="flex items-start gap-4 border-b border-estrelinha-line py-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h3
                id="cookies-estatisticas"
                className="text-[15.5px] font-semibold leading-5 text-estrelinha-ink"
              >
                Estatísticas
              </h3>
              <p className="text-[14px] leading-[21px] text-estrelinha-ink-soft">
                Ajudam a entender como a loja é visitada, de forma anônima, para melhorá-la.
              </p>
            </div>
            {/* O interruptor do board (44 × 26, disco de 20). Desenhado aqui, e não o `Switch` do
                pacote de UI: aquele pinta com os tokens do painel. O alvo de 44px vem do `TAP_44`. */}
            <button
              type="button"
              role="switch"
              aria-checked={estatisticas}
              aria-labelledby="cookies-estatisticas"
              onClick={() => setEstatisticas(v => !v)}
              className={`${TAP_44} mt-[9px] flex h-[26px] w-11 shrink-0 items-center rounded-full p-[3px] transition-colors motion-reduce:transition-none ${
                estatisticas
                  ? 'justify-end bg-estrelinha-primary'
                  : 'justify-start border border-estrelinha-field bg-estrelinha-ground-deep'
              }`}
            >
              <span aria-hidden className="block h-5 w-5 rounded-full bg-estrelinha-surface shadow-sm" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-4">
          <button
            type="button"
            onClick={() => save(medicaoLigada ? estatisticas : statistics)}
            className={`${TAP_ROW} px-1 text-[14px] leading-[18px] text-estrelinha-ink-soft underline underline-offset-2`}
          >
            Salvar escolhas
          </button>
          <button
            type="button"
            onClick={accept}
            className="flex h-12 w-[168px] shrink-0 items-center justify-center rounded-sm bg-estrelinha-primary text-[15px] font-semibold text-estrelinha-on-primary"
          >
            Aceitar todos
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default CookiePreferencesSheet
