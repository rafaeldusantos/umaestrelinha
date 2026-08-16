/**
 * Sanitizador do HTML da descrição do produto — `PDP-03`..`PDP-09`.
 *
 * A descrição do catálogo **é HTML**: medido no banco em 2026-08-15, 679 dos 680 produtos têm
 * descrição e 100% delas trazem tag. Até esta feature a loja imprimia o campo como texto puro, então
 * a cliente lia `<h2>Anel Afetivo Cora&ccedil;&otilde;es` na tela. Renderizar de verdade exige
 * `dangerouslySetInnerHTML`, e é a primeira vez que a loja o usa com dado de origem externa
 * (Nuvemshop) — daí este arquivo.
 *
 * **A varredura é de ÁRVORE, nunca de regex.** `DOMParser` em `text/html` monta um documento inerte:
 * não executa `<script>`, não dispara `onerror`, não busca `src`. Regex sobre HTML é a família de bug
 * que um sanitizador existe para não ter.
 *
 * O que o dado real usa hoje é `p`, `li`, `strong`, `h3`, `br`, `ul`, `h2` — e **zero atributos**. A
 * allowlist é um pouco maior que isso porque o `RichTextEditor` do painel também escreve neste campo,
 * e a dona pode formatar em itálico ou pôr um link.
 *
 * **Por que aqui e não em `@estrelinha/core`**: só a loja renderiza descrição (o painel a *produz*),
 * e `packages/core` roda vitest em `environment: 'node'`, onde `DOMParser` não existe. Se um dia o
 * painel precisar pré-visualizar, o módulo sobe para `core` — o caminho que `resolveInstallments`
 * percorreu.
 */

/** O que sobrevive. Fora daqui, a tag **desembrulha** e o texto dela permanece. */
const PERMITIDAS = new Set([
  'p',
  'br',
  'strong',
  'em',
  'b',
  'i',
  'ul',
  'ol',
  'li',
  'h4',
  'h5',
  'a',
])

/**
 * O que some **com o conteúdo**, em vez de desembrulhar.
 *
 * Desembrulhar um `<div>` preserva o parágrafo que a dona escreveu; desembrulhar um `<script>`
 * imprimiria o código como texto na tela do produto. São desfechos opostos, e por isso duas listas.
 */
const DROP_COM_FILHOS = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'noscript',
  'template',
])

/**
 * `PDP-09` — os títulos da origem descem para `h4`.
 *
 * Duas razões somadas: o `AccordionPrimitive.Header` do shadcn já renderiza `<h3>`, então um `h2`
 * dentro do conteúdo ficaria acima do próprio gatilho da seção; e 1.358 descrições abrem com um
 * `<h2>` que repete o nome do produto, que a página já mostra como `<h1>`.
 */
const REBAIXA: Record<string, string> = { h1: 'h4', h2: 'h4', h3: 'h4' }

/** `PDP-07`. Base fixa só para resolver caminho relativo — não é a origem da loja em runtime. */
const BASE = 'https://uma-estrelinha.invalid'
const PROTOCOLOS = new Set(['http:', 'https:', 'mailto:'])

/**
 * `href` aceitável?
 *
 * A verificação é por `new URL`, e **nunca** por `startsWith`: o parser de URL descarta tabulação e
 * quebra de linha antes de ler o esquema, então `java&#9;script:alert(1)` — que passa por qualquer
 * comparação de prefixo — chega aqui já normalizado para `javascript:` e é recusado.
 */
const hrefSeguro = (valor: string): boolean => {
  try {
    return PROTOCOLOS.has(new URL(valor, BASE).protocol)
  } catch {
    return false
  }
}

/** `PDP-06`/`PDP-08` — atributo zero, exceto `href` de `<a>`, que sai acompanhado de `rel`. */
const limparAtributos = (el: Element): void => {
  const tag = el.tagName.toLowerCase()

  Array.from(el.attributes).forEach(attr => {
    const manter = tag === 'a' && attr.name.toLowerCase() === 'href' && hrefSeguro(attr.value)
    if (!manter) el.removeAttribute(attr.name)
  })

  if (tag === 'a' && el.hasAttribute('href')) el.setAttribute('rel', 'noopener noreferrer')
}

/** Troca a tag preservando os filhos já limpos. O elemento novo nasce sem atributo nenhum. */
const renomear = (el: Element, tag: string, doc: Document): Element => {
  const novo = doc.createElement(tag)
  while (el.firstChild) novo.appendChild(el.firstChild)
  el.parentNode?.replaceChild(novo, el)
  return novo
}

const limpar = (pai: Element, doc: Document): void => {
  // Cópia: `childNodes` é viva, e o laço remove e insere nós enquanto anda.
  Array.from(pai.childNodes).forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) return

    // Comentário, CDATA, instrução de processamento — nada disso é conteúdo.
    if (node.nodeType !== Node.ELEMENT_NODE) {
      pai.removeChild(node)
      return
    }

    const el = node as Element
    const tag = el.tagName.toLowerCase()

    if (DROP_COM_FILHOS.has(tag)) {
      pai.removeChild(el)
      return
    }

    const alvo = REBAIXA[tag] ?? tag

    if (!PERMITIDAS.has(alvo)) {
      // Desembrulha: os filhos são limpos ANTES de subirem, senão um `<script>` dentro de um `<div>`
      // desconhecido escaparia junto com eles.
      limpar(el, doc)
      while (el.firstChild) pai.insertBefore(el.firstChild, el)
      pai.removeChild(el)
      return
    }

    limpar(el, doc)
    limparAtributos(alvo === tag ? el : renomear(el, alvo, doc))
  })
}

/**
 * O HTML seguro, pronto para `dangerouslySetInnerHTML`.
 *
 * Devolve `''` para entrada vazia e para entrada que **sobra** vazia — quem chama esconde o bloco
 * inteiro nesse caso (`PDP-10`), e é por isso que a decisão de mostrar olha o resultado daqui, e não
 * o campo cru.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty || !dirty.trim()) return ''

  const doc = new DOMParser().parseFromString(dirty, 'text/html')
  limpar(doc.body, doc)

  return doc.body.innerHTML.trim()
}
