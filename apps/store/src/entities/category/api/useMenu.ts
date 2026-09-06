import { useMemo } from 'react'
import { menuItems, type MenuItem, type MenuSurface } from '@estrelinha/core/menu'
import { useStoreSettings } from '@estrelinha/core/hooks/useStoreSettings'
// Import PROFUNDO de propósito, e é a única forma sem ciclo: `entities/menu/index.ts` reexporta
// `useMenuTargets`, que importa `@/entities/category` — passar pelo barrel fecharia
// `category → menu → category` entre os dois barris. O arquivo apontado não importa de `category`.
import { useMenuPreview } from '@/entities/menu/model/useMenuPreview'
import { useCategories } from './useCategories'

/**
 * O menu de uma superfície — categorias e itens de link, já fundidos e ordenados.
 *
 * **Recebe `surface` porque o menu não é responsivo: são duas curadorias.** A Adri liga cada
 * categoria no computador e no celular separadamente, e a mesma loja pode ter uma barra e uma folha
 * com itens diferentes. Quem chama diz qual das duas está desenhando; o hook não adivinha por
 * largura de tela, porque a largura não é a pergunta — a pergunta é o que ela decidiu.
 *
 * **Sem consulta própria, e são DUAS fontes.** As categorias vêm da `queryKey ['categories']` que o
 * resto da loja já usa, e os links vêm de `store_settings.menu`, que já chega no mesmo `select` das
 * outras chaves de configuração (`useStoreSettings`). Montar o header não custa um round-trip novo.
 *
 * Falha de leitura devolve `[]` nos dois lados — `useCategories` engole o erro por design e
 * `fetchAllSettings` cai nos defaults —, e a faixa simplesmente não renderiza. A alternativa seria
 * um header quebrado numa página que ainda funciona (`NAV-15` e o caso de borda da spec).
 *
 * A regra inteira é `menuItems`, de `@estrelinha/core/menu`: o que o desktop mostra, o que o celular
 * mostra e o que a tela `/admin/menu` promete são a **mesma função**, chamada com superfícies
 * diferentes. Filtrar ou ordenar aqui seria o "defeito 01" nascendo de novo.
 */
export const useMenu = (surface: MenuSurface): { items: MenuItem[] } => {
  const { data: categories } = useCategories()
  const { data: settings } = useStoreSettings()
  /**
   * Em modo prévia as duas fontes chegam do painel, por `postMessage` (`NAV-44`).
   *
   * A substituição acontece **aqui e em nenhum outro lugar**: `useMenu` já é a porta única das
   * quatro superfícies, então a barra do computador, a folha do celular e a prévia continuam sendo a
   * mesma função com a mesma entrada. Trocar a fonte dentro de cada widget daria duas leituras do
   * rascunho, com a chance de uma delas ficar para trás — que é o "defeito 01" no lugar mais caro.
   *
   * Fora do modo prévia `draft` é `null` **permanentemente**, e nada disto custa um render.
   */
  const { draft } = useMenuPreview()

  const links = settings?.menu?.links
  const items = useMemo(
    () =>
      draft
        ? menuItems({ categories: draft.categories, links: draft.links }, surface)
        : menuItems({ categories: categories ?? [], links: links ?? [] }, surface),
    [draft, categories, links, surface],
  )

  return { items }
}
