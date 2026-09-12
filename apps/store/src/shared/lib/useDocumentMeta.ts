import { useEffect } from 'react'

/**
 * O `<title>` e a `<meta name="description">` da página montada — `FAQL-15`.
 *
 * **Até a feature 46 nenhuma página da loja tinha dono disso**: todas usavam o título do
 * `index.html`. Este hook nasce sendo o dono único, e as outras páginas o adotam quando quiserem —
 * migrá-las não é escopo daqui.
 *
 * **Restaura o que encontrou, e é isso que o diferencia do `useCanonical`.** Lá a tag é criada e
 * removida; aqui ela já existe e pertence ao documento. Apagar o título ao desmontar deixaria a aba
 * do navegador em branco no caminho para a próxima rota — então o que se guarda é o valor anterior,
 * e ele volta.
 *
 * A `<meta>` segue a mesma regra com uma distinção: se ela **não existia**, este hook a cria e a
 * remove; se existia, ele só troca o conteúdo e o devolve. Remover uma tag que era do documento
 * seria destruir declaração de outro dono.
 */
export const useDocumentMeta = (
  meta: { title?: string | null; description?: string | null } | null | undefined,
): void => {
  const title = meta?.title ?? null
  const description = meta?.description ?? null

  useEffect(() => {
    const tituloAnterior = document.title
    if (title) document.title = title

    let tag = document.head.querySelector<HTMLMetaElement>('meta[name="description"]')
    const criadaAqui = !tag && !!description
    let anterior: string | null = null

    if (description) {
      if (!tag) {
        tag = document.createElement('meta')
        tag.setAttribute('name', 'description')
        document.head.appendChild(tag)
      } else {
        anterior = tag.getAttribute('content')
      }
      tag.setAttribute('content', description)
    }

    return () => {
      if (title) document.title = tituloAnterior
      if (!tag) return
      if (criadaAqui) tag.remove()
      else if (anterior !== null) tag.setAttribute('content', anterior)
    }
  }, [title, description])
}
