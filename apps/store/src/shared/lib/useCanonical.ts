import { useEffect } from 'react'

/**
 * A `<link rel="canonical">` da página montada (`URL-01`, `URL-03`).
 *
 * A loja serve o mesmo conteúdo em mais de uma forma **de propósito** (`AD-018`): a subcategoria
 * responde por um segmento e por dois, e a canônica é a de dois. Sem esta tag as duas formas seriam
 * conteúdo duplicado — que é exatamente o que o Success Criteria da spec proíbe ("nenhuma URL
 * responde 200 em duas formas sem uma delas ser canônica").
 *
 * **Remove no unmount, e isso é o ponto.** Numa SPA o `<head>` sobrevive à navegação: sem a remoção,
 * abrir uma categoria e depois ir para `/conta` deixaria a canônica da categoria declarada numa
 * página que não é ela. Uma tag errada é pior que nenhuma — ela manda o buscador consolidar o sinal
 * no endereço errado.
 *
 * `index.html` **não** traz canônica estática: esta função é a única dona da tag, e por isso pode
 * removê-la sem apagar declaração de ninguém.
 */
export const useCanonical = (path: string | null): void => {
  useEffect(() => {
    if (!path) return

    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!link) {
      link = document.createElement('link')
      link.setAttribute('rel', 'canonical')
      document.head.appendChild(link)
    }
    // Absoluta: a canônica relativa é aceita, mas a absoluta é a que os validadores e o Search
    // Console leem sem ambiguidade de base.
    link.setAttribute('href', new URL(path, window.location.origin).toString())

    return () => {
      link?.remove()
    }
  }, [path])
}
