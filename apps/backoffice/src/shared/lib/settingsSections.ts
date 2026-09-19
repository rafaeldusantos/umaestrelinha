// As seções de `/admin/configuracoes` — feature 55.
//
// A tela tinha **oito abas horizontais** num `<Tabs>` só, e o `TabsList` já carregava um remendo de
// CSS (`h-auto grid-cols-3 sm:grid-cols-8`) escrito no próprio código como conserto local para não
// cortar a terceira linha em 390px. A nona aba não caberia sem repetir o remendo — e a contagem
// estava na classe, o que é a definição de navegação que não cresce.
//
// Agora são **quatro seções** nomeadas com o vocabulário que a sidebar já usa, cada uma com
// endereço próprio, e a contagem saiu do CSS.
//
// ## Por que este arquivo mora em `shared/lib`, e não ao lado da página
//
// O molde é `widgets/admin-layout/model/navItems.ts` — uma lista onde a **ordem é o contrato** e
// cada item traz rota, rótulo e ícone. Aquele arquivo pode viver em `widgets/` porque só o widget o
// lê. Este tem consumidores em **`features/`**:
//
// - `features/notification-settings` precisa do caminho da seção *Frete e Material* para dizer onde
//   se preenche o endereço do ateliê (`CFG-21`);
// - `features/home-composition` precisa de **dois** caminhos, porque os três valores que a faixa de
//   vantagens cita hoje num link só passaram a morar em duas seções (`CFG-19`).
//
// `features` não importa de `widgets` (eslint.fsd.mjs). Pôr o registro em `widgets` obrigaria as
// duas features a repetir o caminho como literal — que é exatamente o defeito que `CFG-19` e
// `CFG-21` existem para fechar.
//
// ## O que este arquivo NÃO sabe
//
// **Qual componente desenha cada seção.** Isso é `SETTINGS_PANELS`
// (`widgets/settings-sections/model/panels.tsx`), um nível acima, porque o corpo de duas das quatro
// seções vem de `features/`. Se o componente morasse aqui, `shared` importaria `features` — a
// inversão de camada mais grave que a FSD deste repositório admite. O par entre os dois é
// **bidirecional e testado**: nem seção sem painel, nem painel sem seção.

import { CreditCard, House, Mail, Truck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * O endereço da tela. É ele que vive em `footerNavItems`, e é por isso que a rota-mãe continua
 * renderizando conteúdo em vez de redirecionar para a primeira seção (`CFG-17`): um `<Navigate>`
 * daqui trocaria o endereço do rodapé por um que a sidebar não conhece.
 */
export const SETTINGS_ROOT = '/admin/configuracoes'

export type SettingsSectionSlug =
  | 'dados-da-loja'
  | 'vendas'
  | 'frete-e-material'
  | 'notificacoes'

export interface SettingsSection {
  slug: SettingsSectionSlug
  label: string
  /** A linha abaixo do rótulo no rail e na lista do celular — diz o que se resolve ali dentro. */
  description: string
  icon: LucideIcon
}

/**
 * A ordem daqui é a ordem do rail, da lista do celular e do painel na rota-mãe.
 *
 * **Quatro seções, com o vocabulário que a sidebar já usa.** Uma versão anterior do agrupamento
 * tinha uma quinta ("Marketing" = SEO + Carrinho abandonado) que existia só para abrigar o que não
 * coube nas outras — categoria-depósito, não domínio. O SEO da loja é um dado da loja e o carrinho
 * abandonado é uma configuração de venda; os dois têm casa sem inventar um eixo.
 *
 * `Vendas` é a mesma palavra do eixo da sidebar que contém Pedidos, Carrinhos e Clientes — e não
 * "Pagamento e carrinho", que é a enumeração do conteúdo em vez do nome do assunto.
 *
 * `Frete e Material` junta as **duas remessas** da loja, que sempre foram vizinhas e nunca foram a
 * mesma coisa: a joia que sai daqui (cotação, frete grátis) e o material afetivo que chega
 * (o endereço do ateliê). Separadas em duas abas, a dona precisava lembrar em qual das duas estava
 * o endereço.
 */
export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  {
    slug: 'dados-da-loja',
    label: 'Dados da loja',
    description: 'Nome, contato, redes e SEO',
    icon: House,
  },
  {
    slug: 'vendas',
    label: 'Vendas',
    description: 'Pix, cartão, oferta e carrinho',
    icon: CreditCard,
  },
  {
    slug: 'frete-e-material',
    label: 'Frete e Material',
    description: 'A joia que sai, o material que chega',
    icon: Truck,
  },
  {
    slug: 'notificacoes',
    label: 'Notificações',
    description: '15 eventos de e-mail, agrupados',
    icon: Mail,
  },
]

/** O endereço de uma seção. Ninguém monta este caminho à mão — é o que `CFG-19`/`CFG-21` compram. */
export const settingsSectionPath = (slug: SettingsSectionSlug): string =>
  `${SETTINGS_ROOT}/${slug}`

/**
 * A seção que este slug nomeia, ou `null`.
 *
 * **É aqui que `CFG-18` mora**, num lugar só: slug inexistente, vazio ou ausente devolve `null`, e
 * quem lê trata `null` como a rota-mãe. Espalhar essa decisão pela tela faria o desktop e o celular
 * discordarem sobre o que `/admin/configuracoes/xpto` significa.
 *
 * Devolve `null` em vez de um veredito discriminado por booleano de propósito: com
 * `strictNullChecks: false` aquela forma não estreita (`CLAUDE.md` raiz, seção *Convenções*).
 */
export const findSettingsSection = (slug: string | undefined | null): SettingsSection | null =>
  SETTINGS_SECTIONS.find(section => section.slug === slug) ?? null
