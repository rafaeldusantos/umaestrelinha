import { useEffect } from 'react'
import type { PageMeta } from '@estrelinha/core/seo'
import { declarePageMeta } from '@/shared/lib/pageMeta'

/**
 * O `<head>` da página montada — feature 62. **Toda** página da loja chama este hook, e
 * `metaPorRota.test.ts` derruba a suíte quando uma não chama.
 *
 * Quem decide o valor é `@estrelinha/core/seo` — a mesma função que a edge function `product-page`
 * usa para o HTML servido. Este hook só escreve.
 *
 * - **`null` não escreve nada** (A9). É o estado "ainda carregando": escrever um título provisório
 *   faria o `page_view` sair com ele.
 * - **Ao desmontar, nada é revertido** (A12). Reverter ao título do `index.html` produziria uma troca
 *   intermediária entre duas rotas — exatamente o que o `page_view` mediria. A próxima página
 *   sobrescreve, e o guarda garante que toda página escreve. (O `useDocumentMeta` da feature 46
 *   revertia, e foi substituído por este.)
 * - **`og:url`, `og:image` e `og:type` não são tocados**: quem os lê não executa JavaScript, e lê o
 *   HTML servido (`Out of Scope`).
 * - **`robots` é criado e removido** — o `index.html` não o traz, e `data-owner` marca o que é nosso.
 */
export const usePageMeta = (meta: PageMeta | null | undefined): void => {
  const title = meta?.title ?? null
  const description = meta?.description ?? null
  const indexable = meta?.indexable ?? true

  useEffect(() => {
    if (!title) return

    document.title = title
    if (description) {
      escreverMeta('name', 'description', description)
      escreverMeta('property', 'og:description', description)
      escreverMeta('name', 'twitter:description', description)
    }
    escreverMeta('property', 'og:title', title)
    escreverMeta('name', 'twitter:title', title)
    marcarRobots(indexable)

    declarePageMeta(title)
  }, [title, description, indexable])
}

const escreverMeta = (atributo: 'name' | 'property', chave: string, valor: string): void => {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${atributo}="${chave}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(atributo, chave)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', valor)
}

const ROBOTS = 'meta[name="robots"][data-owner="estrelinha-spa"]'

const marcarRobots = (indexable: boolean): void => {
  const existente = document.head.querySelector(ROBOTS)
  if (indexable) {
    existente?.remove()
    return
  }
  if (existente) return
  const tag = document.createElement('meta')
  tag.setAttribute('name', 'robots')
  tag.setAttribute('content', 'noindex')
  tag.setAttribute('data-owner', 'estrelinha-spa')
  document.head.appendChild(tag)
}
