import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import {
  menuBannerSlots,
  resolveMenuBanners,
  type MenuProduct,
  type MenuSurface,
  type ResolvedMenuBanner,
} from '@estrelinha/core/menu'
import { useCategories } from '@/entities/category'

/**
 * Os ids de **produto** que os banners desta superfície apontam.
 *
 * Lê a forma do jsonb por `menuBannerSlots`, o primitivo de `core/menu`, e não por um `raw.desktop`
 * escrito aqui: a lista pode ser `null`, pode ser array na raiz, pode ter a superfície faltando, e
 * cada tela que reinventasse esse recorte erraria um dos casos.
 *
 * Ordenado e sem repetição porque o resultado vira **chave de cache**: dois banners para o mesmo
 * produto, ou a mesma dupla em ordem trocada, não podem produzir duas consultas.
 */
const idsDeProduto = (raw: unknown, surface: MenuSurface): string[] => {
  const ids = new Set<string>()

  for (const bruto of menuBannerSlots(raw, surface)) {
    if (bruto === null || typeof bruto !== 'object' || Array.isArray(bruto)) continue
    const alvo = (bruto as { target?: { kind?: unknown; id?: unknown } }).target
    if (!alvo || alvo.kind !== 'product') continue
    if (typeof alvo.id === 'string' && alvo.id.trim() !== '') ids.add(alvo.id.trim())
  }

  return [...ids].sort()
}

/** Lista congelada: uma nova a cada render viraria dependência instável do `useMemo` de quem chama. */
const SEM_PRODUTO: MenuProduct[] = []

/**
 * Os produtos de destino dos banners de **um** painel — resolvidos tarde, só quando ele abre.
 *
 * **Sem banner de produto, nenhuma consulta acontece** (`enabled`), e o retorno é a lista vazia
 * congelada. Isso importa: a loja não carrega o catálogo para desenhar o topo, e o painel é aberto
 * por hover — uma consulta por passada do ponteiro seria uma requisição a cada 120ms de travessia
 * da barra. É a mesma montagem tardia que a faixa "Em destaque" usava antes de sair.
 *
 * **Enquanto carrega, devolve `undefined` — e isso é a resposta certa, não um estado intermediário
 * descuidado.** `resolveMenuTarget` trata "lista ausente" como "ainda não sei" e recusa o destino,
 * então o banner de produto não renderiza antes da prova. A alternativa — desenhar e corrigir — faz
 * o card piscar e, no caso do produto apagado, levar a 404.
 *
 * `is_active` vem explícito e não é presumido pela RLS: `public read products` filtra por ele, mas
 * `admin full products` é `FOR ALL`, então um admin logado **na loja** veria um banner apontando
 * para uma peça que ninguém mais vê.
 */
export const useMenuTargets = (raw: unknown, surface: MenuSurface): MenuProduct[] | undefined => {
  const ids = useMemo(() => idsDeProduto(raw, surface), [raw, surface])

  const { data } = useQuery({
    queryKey: ['menu-banner-produtos', ids],
    enabled: ids.length > 0,
    queryFn: async (): Promise<MenuProduct[]> => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug, description, is_active')
        .in('id', ids)
      // Falha de consulta é lista vazia, e o banner some junto: o menu é navegação, e derrubá-lo
      // por causa de um card é perder as coleções inteiras para não perder um anúncio.
      if (error || !data) return []
      return data as unknown as MenuProduct[]
    },
  })

  return ids.length === 0 ? SEM_PRODUTO : data
}

/**
 * Os banners de um painel, prontos para desenhar — a porta única das duas superfícies.
 *
 * Recebe o **id da categoria** e não o jsonb: quem tem a linha crua é `useCategories`, e passá-la
 * pela mão de cada widget faria o `menu_banners` viajar pelas props do header. Com o id, o widget só
 * diz *qual painel está aberto*, que é a única coisa que ele sabe.
 *
 * `null` (nenhum painel aberto, ou item de link) devolve lista vazia sem consultar nada — item de
 * link não tem banner por definição (`NAV-12`), e um painel fechado não é motivo para requisição.
 *
 * A resolução em si é `resolveMenuBanners`: destino apagado ou inativo **não renderiza** e o painel
 * encolhe, título e texto ausentes são herdados do destino, e a arte cai na do outro dispositivo
 * quando falta a desta. Nada disso é decidido aqui.
 */
export const useMenuBanners = (
  categoryId: string | null,
  surface: MenuSurface,
): ResolvedMenuBanner[] => {
  const { data: categories } = useCategories()

  const raw = categoryId
    ? ((categories ?? []).find(c => c.id === categoryId)?.menu_banners ?? null)
    : null
  const products = useMenuTargets(raw, surface)

  return useMemo(
    () => resolveMenuBanners({ categories: categories ?? [], products }, raw, surface),
    [categories, products, raw, surface],
  )
}
