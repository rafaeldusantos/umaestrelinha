import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import type { DbHomeSection, DbHomeSectionItem } from '@estrelinha/supabase/types'
import {
  DEFAULT_HOME_COMPOSITION,
  type HomeSection,
  type HomeSectionConfig,
  type HomeSectionItem,
  type HomeSectionType,
} from '@estrelinha/core/home'

/**
 * A leitura das seções da Home — **com o piso semeado embaixo** (`HOME-07`).
 *
 * Uma consulta só, com a curadoria embutida na mesma ida: `home_section_items` é filha de
 * `home_sections`, e duas consultas dariam dois estados de carregamento para uma página só.
 *
 * **A RLS já faz o recorte**: a policy pública devolve apenas `active = true`, e o item segue o
 * estado da seção-mãe. A loja não filtra `active` de novo — quem lê isto autenticado como admin
 * (a prévia do painel) precisa justamente das desligadas.
 */

/**
 * O piso, em cópia.
 *
 * `DEFAULT_HOME_COMPOSITION` é `readonly` e compartilhada pelo processo inteiro; devolver a própria
 * referência deixaria qualquer consumidor distraído mutá-la para todo mundo.
 */
const piso = (): HomeSection[] => DEFAULT_HOME_COMPOSITION.map(section => ({ ...section }))

const mapItem = (row: DbHomeSectionItem): HomeSectionItem => ({
  id: row.id,
  section_id: row.section_id,
  position: typeof row.position === 'number' ? row.position : 0,
  category_id: row.category_id ?? null,
  product_id: row.product_id ?? null,
  // Emenda `E5`: o slug vem embutido, e ausente significa **fora do ar** — produto despublicado
  // volta com `product: null` e o `product_id` intacto (medido em probe). Sem ele o banner de
  // produto nunca renderizaria, porque `/produtos/:slug` precisa do slug.
  product_slug: row.product?.slug ?? null,
  href: row.href ?? null,
  image_url: row.image_url ?? null,
  alt: row.alt ?? null,
  label_snapshot: row.label_snapshot ?? null,
})

/**
 * O mapper único da seção na loja.
 *
 * `active` cai em `true` quando a coluna não veio, pelo mesmo instinto do `mapCategory`: a policy já
 * filtrou o que a cliente pode ver, e sumir da vitrine é pior que aparecer.
 *
 * `type` é afirmado e **não validado aqui**: tipo desconhecido (linha gravada por uma versão mais
 * nova) tem de chegar inteiro ao renderizador, que o pula, e ao painel, que o lista. Recusá-lo na
 * leitura tiraria da dona a única tela onde ele pode ser removido.
 */
const mapSection = (row: DbHomeSection): HomeSection => ({
  id: row.id,
  type: row.type as HomeSectionType,
  position: typeof row.position === 'number' ? row.position : 0,
  active: row.active ?? true,
  config: (row.config ?? {}) as HomeSectionConfig,
  items: (row.items ?? []).map(mapItem),
})

export const useHomeSections = () =>
  useQuery({
    queryKey: ['home-sections'],
    // O piso enquanto carrega, e não `undefined`: `HOME-07` diz "nunca página em branco", e a
    // primeira pintura da Home é justamente onde o branco apareceria. `placeholderData` e não
    // `initialData` porque isto não é dado do servidor e não pode ser gravado no cache.
    placeholderData: piso(),
    queryFn: async (): Promise<HomeSection[]> => {
      // SPEC_DEVIATION: o `design.md` escreve `.select(...).order('position')`; aqui não há `.order`.
      // Reason: a ordem da Home tem **um dono**, `orderSections` — que é quem desempata `position`
      // igual por `id` (`HOME-12`). Ordenar também no PostgREST daria uma segunda resposta para a
      // mesma pergunta, e a do banco não tem desempate: duas seções empatadas voltariam em ordem
      // arbitrária a cada carregamento.
      const { data, error } = await supabase
        .from('home_sections')
        .select('*, items:home_section_items(*, product:products(slug))')

      // Erro **e** lista vazia caem no mesmo piso. Vazio não é "Home sem seções": é banco novo, ou
      // uma leitura que a RLS recortou inteira — e nos dois casos a página de hoje é a resposta
      // certa.
      if (error || !data?.length) return piso()

      return (data as unknown as DbHomeSection[]).map(mapSection)
    },
  })
