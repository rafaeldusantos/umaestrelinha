import { bySortOrder } from '@nanapin/core/menu'
import type { Category } from '@nanapin/supabase/types'

/**
 * As categorias que a loja oferece para **navegar** — a grade "Coleções" da home e a coluna
 * "Categorias" do rodapé.
 *
 * ## Por que não é `parent_id === null`
 *
 * Quatro superfícies listavam "as categorias de topo" com `categories.slice(0, N)` sobre a lista
 * chapada. `slice` não sabe o que é raiz e o que é filha: com a árvore real do banco
 * (`Bottons › {Academia, Anime, K-Pop, Filmes, …}`), a grade mostrava o **contêiner de tudo** ao lado
 * de uma subcategoria que só chegou ali por empatar em `sort_order = 0` com ele.
 *
 * O reflexo é filtrar por raiz — e é errado, por um motivo que o repositório já tinha descoberto:
 * `features/search/lib/trendingCategories.ts` registra que "filtrar por `parent_id === null` mostrava
 * uma pílula só, escrita 'Bottons', numa loja que vende bottons". Uma raiz guarda-chuva não é uma
 * escolha; é o nome da loja.
 *
 * ## A regra: pular o guarda-chuva
 *
 * **Uma raiz sozinha é contêiner, não opção** — então a navegação começa nas filhas dela. Duas ou
 * mais raízes são escolhas de verdade e ficam como estão. Isso funciona nos dois formatos sem
 * configuração: árvore plana (8 raízes) devolve as 8; árvore com guarda-chuva devolve os universos.
 *
 * Não é "folha da árvore" como o `pickTrendingCategories`: no dia em que Anime tiver Naruto e
 * Villains dentro, a grade tem de continuar oferecendo **Anime** — quem quer folha é a nuvem de
 * pílulas de "Em alta agora", que é sobre o que está bombando, não sobre como navegar.
 *
 * `active` é filtrado aqui além da RLS: a policy `admin full categories` é `FOR ALL`, então um admin
 * logado **na loja** veria categoria oculta onde a cliente não vê. E `bySortOrder` vem do domínio
 * compartilhado porque o desempate por nome é o que faz a lista ser a mesma entre dois carregamentos
 * — duas ordens diferentes para a mesma lista é como o bug do topo começou.
 */
export const browseCategories = (categories: readonly Category[] | undefined): Category[] => {
  const visible = (categories ?? []).filter((c) => c.active)
  const roots = visible.filter((c) => c.parent_id === null).sort(bySortOrder)

  if (roots.length !== 1) return roots

  const umbrella = roots[0]
  const children = visible.filter((c) => c.parent_id === umbrella.id).sort(bySortOrder)
  // Guarda-chuva sem filha nenhuma é a única categoria que existe — aí ela própria é a navegação.
  return children.length > 0 ? children : roots
}
