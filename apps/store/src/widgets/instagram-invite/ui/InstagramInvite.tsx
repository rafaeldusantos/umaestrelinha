import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useCookieConsentStore } from '@/entities/cookie-consent'
import { inviteSeen, markInviteSeen } from '../model/inviteSeen'

/** Quanto a Home espera, depois de resolver, antes de oferecer o convite. */
export const ATRASO_DO_CONVITE_MS = 3000

// A folha vem num chunk próprio: ela só aparece uma vez por navegador, e a Home não deve pagar por
// ela no primeiro carregamento.
const InstagramInviteSheet = lazy(() => import('./InstagramInviteSheet'))

/**
 * O convite para seguir a Adri no Instagram, montado pela Home quando ela já resolveu.
 *
 * Abre **uma vez por navegador**, depois do atraso, e **só com o aviso de cookies fora do caminho**
 * — pendente ou com as preferências abertas, o convite espera; respondido o aviso, ele abre na hora
 * se o atraso já passou. A marca de "visto" é gravada **ao abrir**: quem fecha a aba com o convite
 * na tela já o viu.
 */
const InstagramInvite = () => {
  const avisoDeCookiesNoCaminho = useCookieConsentStore(
    s => s.notice === null || s.preferencesOpen,
  )
  const [atrasoCumprido, setAtrasoCumprido] = useState(false)
  const [aberto, setAberto] = useState(false)
  const montouAFolha = useRef(false)

  useEffect(() => {
    const t = setTimeout(() => setAtrasoCumprido(true), ATRASO_DO_CONVITE_MS)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!atrasoCumprido || avisoDeCookiesNoCaminho || montouAFolha.current) return
    if (inviteSeen()) return
    markInviteSeen()
    montouAFolha.current = true
    setAberto(true)
  }, [atrasoCumprido, avisoDeCookiesNoCaminho])

  // Uma vez montada, a folha fica montada: desmontar no mesmo quadro em que `open` vira `false`
  // cortaria a animação de saída.
  if (!montouAFolha.current) return null

  return (
    <Suspense fallback={null}>
      <InstagramInviteSheet open={aberto} onClose={() => setAberto(false)} />
    </Suspense>
  )
}

export default InstagramInvite
