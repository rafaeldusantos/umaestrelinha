// As seções de `/admin/google` — feature 61 (`ANL-01`, `AD-046`).
//
// A tela junta as duas integrações da loja com o Google: o **Analytics** (novo, feature 61) e o
// **Shopping** (feature 30, que morava sozinho em `/admin/google-shopping`).
//
// É o molde de `settingsSections.ts` (`AD-038`) com UMA diferença, registrada em `AD-046`: com duas
// seções, o registro é desenhado como **fileira de links**, e não como rail. A mecânica é a mesma —
// e é ela que importa:
//
// | Pergunta                               | Dono                                               |
// | -------------------------------------- | -------------------------------------------------- |
// | Quais seções existem, e como se chamam | este arquivo                                       |
// | Qual está aberta                       | **a URL** (`useParams().secao`)                    |
// | O que cada uma desenha                 | `widgets/google-sections/model/panels.tsx`         |
//
// Este arquivo **não** carrega componente React pelo mesmo motivo do de Configurações: o corpo das
// duas seções vem de `features/`, e `shared` importar `features` é a inversão de camada mais grave
// que a FSD deste repositório admite. O par registro × mapa é bidirecional e testado.
//
// A quarta seção faz a tela voltar ao rail (`AD-046`, trade-off). O registro não muda — só o
// componente que o desenha.

/** O endereço da tela, e o que mora em `navGroups`. */
export const GOOGLE_ROOT = '/admin/google'

/**
 * O endereço antigo da tela do Shopping (feature 30). Continua existindo como **redirect** para a
 * seção nova (`ANL-02`) — links salvos, favoritos do navegador e o histórico da dona não quebram.
 */
export const LEGACY_GOOGLE_SHOPPING_PATH = '/admin/google-shopping'

export type GoogleSectionSlug = 'analytics' | 'shopping'

export interface GoogleSection {
  slug: GoogleSectionSlug
  label: string
}

/**
 * A ordem daqui é a ordem da fileira. **Analytics vem primeiro** e é a seção que a rota-mãe abre
 * (`/admin/google` ⇒ Analytics): é a integração nova, a que ainda pede configuração, e a que a dona
 * vai abrir para conferir se as compras estão chegando.
 */
export const GOOGLE_SECTIONS: readonly GoogleSection[] = [
  { slug: 'analytics', label: 'Analytics' },
  { slug: 'shopping', label: 'Shopping' },
]

/** A seção que a rota-mãe mostra. */
export const DEFAULT_GOOGLE_SECTION: GoogleSectionSlug = 'analytics'

/** O endereço de uma seção. Ninguém monta este caminho à mão. */
export const googleSectionPath = (slug: GoogleSectionSlug): string => `${GOOGLE_ROOT}/${slug}`

/**
 * A seção que este slug nomeia, ou `null` (slug inexistente, vazio ou ausente).
 *
 * `string | null`-style, e não veredito por booleano: com `strictNullChecks: false` aquela forma não
 * estreita (`CLAUDE.md` raiz, *Convenções*). Quem lê trata `null` como a seção padrão.
 */
export const findGoogleSection = (slug: string | undefined | null): GoogleSection | null =>
  GOOGLE_SECTIONS.find(section => section.slug === slug) ?? null
