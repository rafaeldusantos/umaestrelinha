// Feature 86 — por que um documento do menu NÃO pode ser gravado.
//
// Tudo aqui devolve `string | null` (`null` = pode gravar), o formato de `menuTargetRefusal` e de
// `menuBannerRefusal`: com `strictNullChecks: false`, uma união discriminada por literal booleano não
// estreita, e ler o motivo no ramo do `else` seria TS2339.
//
// Dois consumidores leem estas réguas — o painel, antes da rede, e qualquer leitor futuro do
// documento —, e é por isso que elas moram em `core`. A régua do endereço do link é a da FORMA
// (`menuLinkPathRefusal`, R01 do QA r2: a existência é do painel), e a dos banners é
// `menuBannerRefusal`: duas escritas divergiriam, e uma aceitaria o que a outra recusa.
//
// **Não há teto no menu principal**, de propósito (feature 39): a barra rola. O único teto é o do
// submenu, que é de layout do painel (3 colunas de `MENU_PANEL_COLUMN_SIZE`).

import { menuHrefIsExternal, menuHrefKey, MENU_PANEL_COLUMN_SIZE } from './menu.ts'
import { menuBannerRefusal } from './banners.ts'
import type { MenuDocument, MenuNode } from './structure.ts'

/** O nome próprio de um item: até 40 caracteres (`MNM-14`). */
export const MENU_LABEL_MAX = 40

/** O submenu de um item: até 24 itens — três colunas de oito no mega menu (`MNM-24`). */
export const MENU_SUBMENU_LIMIT = MENU_PANEL_COLUMN_SIZE * 3

/**
 * O nome próprio de um item. `null` = "usar o nome da categoria" e é sempre aceito; texto vazio ou só
 * de espaços é recusado (`MNM-16`), e acima de 40 caracteres também (`MNM-14`). O comprimento é
 * contado **aparado**: espaço no fim não é nome.
 */
export const menuNodeLabelRefusal = (label: string | null): string | null => {
  if (label === null || label === undefined) return null
  if (typeof label !== 'string' || label.trim() === '') {
    return 'Digite o nome do item, ou use o nome da categoria.'
  }
  const tamanho = label.trim().length
  if (tamanho > MENU_LABEL_MAX) {
    return `O nome do item pode ter até ${MENU_LABEL_MAX} caracteres, e este tem ${tamanho}.`
  }
  return null
}

/** Um segmento de caminho da loja: letras, números, `-`, `_`, `.`, `~` e escape `%XX` — nunca `.`/`..`. */
const SEGMENTO = /^(?:[A-Za-z0-9\-_.~]|%[0-9A-Fa-f]{2})+$/

/**
 * A FORMA de um caminho interno de link (R01, QA r2 da `86`) — `null` quando é bem formado.
 *
 * **Só a forma.** "Existe uma página neste endereço?" é pergunta do painel (`conferirEnderecoDaLoja`,
 * com as categorias e o banco na mão), feita na hora de criar. Antes esta régua delegava a
 * `menuTargetRefusal`, que só conhece o primeiro segmento contra `ROUTE_SLUGS`: o caminho de uma
 * coleção ativa (`/botanicas`, `/joias-afetivas/<filha>`) passava no seletor e era recusado aqui, ao
 * gravar — dois donos discordando de "este endereço vale?". Agora cada pergunta tem um dono só.
 *
 * Bem formado: começa com uma barra (a que falta é acrescentada, como em `normalizeMenuHref`), não
 * começa com `//` nem `\`, cada segmento é de `SEGMENTO` (o que recusa `:` — `javascript:` —,
 * espaço, aspas, `<`, barra dupla, `.` e `..`), e query/âncora sem quebra de linha, aspas ou `<>` (o espaço da busca passa).
 * O externo não é julgado aqui. A recusa NUNCA lista as rotas (eram 19 endereços no aviso).
 *
 * **O destino de BANNER continua em `menuTargetRefusal`** (feature 39), que não afrouxou: o banner
 * aponta para a coleção pelo NOME, e o endereço digitado ali segue restrito às rotas fixas.
 */
export const menuLinkPathRefusal = (href: unknown): string | null => {
  const bruto = typeof href === 'string' ? href.trim() : ''
  if (bruto === '') return 'Digite o endereço da página da loja.'
  const malFormado =
    `“${bruto}” não é um caminho de página da loja. Depois da “/”, use só letras, números e hífens — ` +
    'por exemplo, “/sobre” — ou abra a página na loja e copie o endereço da barra.'
  if (bruto.startsWith('//') || bruto.startsWith('\\')) return malFormado
  const comBarra = bruto.startsWith('/') ? bruto : `/${bruto}`
  const corte = comBarra.search(/[?#]/)
  const caminho = corte === -1 ? comBarra : comBarra.slice(0, corte)
  const resto = corte === -1 ? '' : comBarra.slice(corte)
  if (/[\t\n\r"'<>`\\]/.test(resto)) return malFormado
  if (caminho === '/') return null
  const segmentos = caminho.replace(/\/$/, '').slice(1).split('/')
  if (segmentos.some(seg => !SEGMENTO.test(seg) || seg === '.' || seg === '..')) return malFormado
  return null
}

/**
 * O endereço de um item de link NOVO: só caminho da loja (`MNM-12`), bem formado.
 *
 * É `menuLinkPathRefusal` mais uma régua: externo (`https://…`, `http://…`) e protocol-relative
 * (`//host`) são recusados. Quem cuida do link externo **já gravado** antes desta feature é
 * `menuDocumentRefusal`, que o deixa passar (`MNM-31`) — esta função é só da criação.
 */
export const internalMenuHrefRefusal = (href: unknown): string | null => {
  const bruto = typeof href === 'string' ? href.trim() : ''
  if (bruto === '') return 'Digite o endereço da página da loja.'
  if (menuHrefIsExternal(bruto) || bruto.startsWith('//')) {
    return (
      'O menu leva só a páginas da loja. Digite o caminho da página, começando com “/” — ' +
      'por exemplo, “/sobre”.'
    )
  }
  return menuLinkPathRefusal(bruto)
}

/** Os rótulos de um nó: link precisa de nome; categoria aceita `null`. */
const rotuloDoNo = (no: MenuNode): string | null => {
  if (no.target?.kind === 'link' && (no.label === null || no.label === undefined)) {
    return 'Digite o nome do item de link.'
  }
  return menuNodeLabelRefusal(no.label)
}

/** O endereço de um link já gravado: o externo passa (`MNM-31`); o interno passa pela régua. */
const enderecoDoNo = (no: MenuNode): string | null => {
  if (no.target?.kind !== 'link') return null
  if (menuHrefIsExternal(no.target.href)) return null
  return menuLinkPathRefusal(no.target.href)
}

/**
 * O documento inteiro, antes de gravar. Cobra, nesta ordem, por item principal: rótulo, endereço,
 * categoria repetida no menu principal (`MNM-10`), banners, teto do submenu (`MNM-24`); e por item de
 * submenu: rótulo, endereço, categoria repetida **no mesmo** submenu (`MNM-25`). A mesma categoria em
 * submenus de itens diferentes é curadoria, e passa.
 *
 * **O teto do submenu só recusa a operação que o AUMENTA acima de 24** (`MNM-24`, revisto em
 * 2026-10-28). Um menu convertido do legado pode já nascer com um submenu de 30: recusar o documento
 * inteiro por isso travaria toda ação da dona — inclusive tirar um filho, que leva 30 a 29 e continua
 * acima do teto. Por isso a régua compara com `anterior` (o documento de antes da operação), **pelo id
 * do item**: acima de 24 recusa só se o submenu cresceu. Item que o `anterior` não tem conta como
 * vindo de zero. **Sem `anterior`**, a régua é a estrita — acima de 24 recusa —, que é o que vale para
 * quem não sabe de onde o documento veio.
 */
export const menuDocumentRefusal = (
  doc: MenuDocument,
  anterior: MenuDocument | null = null,
): string | null => {
  if (!doc || doc.version !== 2 || !Array.isArray(doc.items)) {
    return 'O menu chegou numa forma que não reconheço. Recarregue a página.'
  }

  /** Quantos filhos cada item tinha antes; `undefined` = sem `anterior` (régua estrita). */
  const antes: Map<string, number> | undefined =
    anterior && Array.isArray(anterior.items)
      ? new Map(anterior.items.map(i => [i.id, Array.isArray(i.children) ? i.children.length : 0]))
      : undefined

  /**
   * Q03 — as páginas que JÁ estavam repetidas no `anterior` (no menu principal e em cada submenu,
   * pelo id do item). Um documento que já nasceu com a repetição continua editável, como o teto do
   * submenu: só a operação que CRIA uma repetição recusa. Sem `anterior`, nenhuma é tolerada.
   */
  const repetidasAntes = (lista: readonly MenuNode[] | undefined): Set<string> => {
    const vistas = new Set<string>()
    const repetidas = new Set<string>()
    for (const no of Array.isArray(lista) ? lista : []) {
      if (no?.target?.kind !== 'link') continue
      const chave = menuHrefKey(no.target.href)
      if (vistas.has(chave)) repetidas.add(chave)
      vistas.add(chave)
    }
    return repetidas
  }
  const toleradasNaRaiz = anterior && Array.isArray(anterior.items) ? repetidasAntes(anterior.items) : new Set<string>()
  const toleradasNoSubmenu = new Map<string, Set<string>>(
    anterior && Array.isArray(anterior.items)
      ? anterior.items.map(i => [i.id, repetidasAntes(i.children)])
      : [],
  )

  const naRaiz = new Set<string>()
  const paginasNaRaiz = new Set<string>()
  for (const item of doc.items) {
    const rotulo = rotuloDoNo(item) ?? enderecoDoNo(item)
    if (rotulo) return rotulo

    if (item.target.kind === 'category') {
      if (naRaiz.has(item.target.category_id)) {
        return 'Esta categoria já está no menu principal. Cada categoria aparece lá uma vez só.'
      }
      naRaiz.add(item.target.category_id)
    }
    if (item.target.kind === 'link') {
      const chave = menuHrefKey(item.target.href)
      if (paginasNaRaiz.has(chave) && !toleradasNaRaiz.has(chave)) {
        return 'Esta página já está no menu principal. Cada página aparece lá uma vez só.'
      }
      paginasNaRaiz.add(chave)
    }

    const banners = item.banners
    if (banners) {
      const recusa =
        menuBannerRefusal(Array.isArray(banners.desktop) ? banners.desktop : []) ??
        menuBannerRefusal(Array.isArray(banners.mobile) ? banners.mobile : [])
      if (recusa) return recusa
    }

    const filhos = Array.isArray(item.children) ? item.children : []
    if (filhos.length > MENU_SUBMENU_LIMIT) {
      const tinha = antes ? (antes.get(item.id) ?? 0) : undefined
      if (tinha === undefined || filhos.length > tinha) {
        return `O submenu tem o máximo de ${MENU_SUBMENU_LIMIT} itens.`
      }
    }

    const noSubmenu = new Set<string>()
    const paginasNoSubmenu = new Set<string>()
    const toleradas = toleradasNoSubmenu.get(item.id) ?? new Set<string>()
    for (const filho of filhos) {
      const recusa = rotuloDoNo(filho) ?? enderecoDoNo(filho)
      if (recusa) return recusa
      if (filho.target.kind === 'link') {
        const chave = menuHrefKey(filho.target.href)
        if (paginasNoSubmenu.has(chave) && !toleradas.has(chave)) {
          return 'Esta página já está neste submenu.'
        }
        paginasNoSubmenu.add(chave)
      }
      if (filho.target.kind === 'category') {
        if (noSubmenu.has(filho.target.category_id)) {
          return 'Esta categoria já está neste submenu.'
        }
        noSubmenu.add(filho.target.category_id)
      }
    }
  }
  return null
}
