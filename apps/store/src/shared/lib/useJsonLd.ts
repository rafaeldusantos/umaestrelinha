import { useEffect } from 'react'

/**
 * O `<script type="application/ld+json">` da página montada — `FAQL-13`.
 *
 * **Molde do `useCanonical`, e pela mesma razão.** Numa SPA o `<head>` sobrevive à navegação: sem a
 * remoção no unmount, sair das perguntas frequentes para o carrinho deixaria um `FAQPage` declarado
 * numa página que não é ela. Dado estruturado errado é pior que nenhum — ele afirma ao buscador algo
 * que a página não mostra, e é justamente isso que um rastreador de IA cita.
 *
 * **`data-owner` é o que torna a remoção segura.** A `product-page` (edge function) injeta o JSON-LD
 * do produto **no HTML servido**, antes de o React existir; um `querySelector` genérico por
 * `script[type="application/ld+json"]` acharia aquele e o arrancaria ao desmontar esta página. O
 * atributo marca o que é nosso, e só o que é nosso sai.
 *
 * Conteúdo `null`/`undefined` não injeta nada — é o estado "ainda carregando", e um `FAQPage` com
 * zero perguntas declarado enquanto a leitura acontece seria uma afirmação falsa de página vazia.
 */
export const useJsonLd = (content: object | null | undefined): void => {
  // O JSON serializado entra na dependência do efeito, e não o objeto: `faqPageJsonLd` devolve uma
  // instância nova a cada render, e comparar por identidade reinjetaria a tag a cada pintura.
  const serializado = content ? JSON.stringify(content) : null

  useEffect(() => {
    if (!serializado) return

    const script = document.createElement('script')
    script.setAttribute('type', 'application/ld+json')
    script.setAttribute('data-owner', 'estrelinha-spa')
    script.textContent = serializado
    document.head.appendChild(script)

    return () => {
      script.remove()
    }
  }, [serializado])
}
