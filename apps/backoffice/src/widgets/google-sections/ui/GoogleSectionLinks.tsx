// A fileira de links das seções de `/admin/google` — feature 61 (`ANL-01`, `AD-046`).
//
// Parece uma fileira de abas, e **não é um `<Tabs>`**: cada item é um `<Link>` para o endereço da
// seção. A seção aberta é a URL (`AD-038`), e um `<Tabs>` do Radix seria um segundo dono de "onde
// estou" — o estado dele e o endereço discordariam no primeiro "voltar" do navegador.
//
// Cada item diz o **próprio estado** (`Ligado`/`Desligado`), porque é a primeira pergunta de quem
// abre a tela: "o que está ligado?". O estado vem de quem lê as configurações (a página), e não
// daqui — esta fileira não sabe o que cada integração é.

import { Link } from 'react-router-dom'
import { cn } from '@estrelinha/ui/lib/utils'
import {
  GOOGLE_SECTIONS,
  googleSectionPath,
  type GoogleSectionSlug,
} from '@/shared/lib/googleSections'

interface Props {
  /** A seção que o painel está mostrando — vem da URL, sempre. */
  ativa: GoogleSectionSlug
  /** `true` ⇒ "Ligado". Uma entrada por seção do registro. */
  ligada: Record<GoogleSectionSlug, boolean>
}

export const GoogleSectionLinks = ({ ativa, ligada }: Props) => (
  <nav aria-label="Integrações com o Google" data-testid="google-section-links">
    {/* `overflow-x-auto` é a rede para uma terceira seção num celular estreito: a fileira rola
        dentro de si, e o body nunca. Com duas, cabe em 390 com folga (`AD-046`). */}
    <ul className="flex gap-1 overflow-x-auto border-b border-border">
      {GOOGLE_SECTIONS.map(secao => {
        const marcada = secao.slug === ativa
        const on = ligada[secao.slug]

        return (
          <li key={secao.slug} className="shrink-0">
            <Link
              to={googleSectionPath(secao.slug)}
              data-testid={`google-section-link-${secao.slug}`}
              aria-current={marcada ? 'page' : undefined}
              onKeyDown={event => {
                // `<a>` não responde a Espaço por padrão; quem vem de uma fileira de abas espera
                // que responda. Mesmo cuidado de `SettingsSectionNav`.
                if (event.key === ' ' || event.key === 'Spacebar') {
                  event.preventDefault()
                  event.currentTarget.click()
                }
              }}
              className={cn(
                '-mb-px flex h-11 items-center gap-2 whitespace-nowrap border-b-2 px-3.5 text-sm',
                'transition-colors motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                marcada
                  ? 'border-primary font-semibold text-foreground'
                  : 'border-transparent font-medium text-muted-foreground hover:text-foreground',
              )}
            >
              {secao.label}
              <span
                data-testid={`google-section-status-${secao.slug}`}
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11.5px] font-semibold leading-[14px]',
                  on
                    ? 'bg-estrelinha-admin-emerald/10 text-estrelinha-admin-emerald'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {on ? 'Ligado' : 'Desligado'}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  </nav>
)

export default GoogleSectionLinks
