// O recorte que o PostgREST faria de uma linha COMPLETA, pelo `select` que o código de fato envia.
//
// Nasceu dentro de `cardSelect.test.ts` (`PRF-08`) e saiu dele na feature 61, por dois motivos: o
// embed `categories(slug, sort_order, active)` passou a viver DENTRO de `product_categories(...)`, e a
// régua de uma linha só (`dentro.split(',')`) partia o embed aninhado ao meio; e o teste de paridade
// do `item_category` precisa recortar a mesma linha pelos DOIS `select` — o da loja e o do servidor.
// Duas cópias do recorte seriam dois PostgRESTs de mentira que podem discordar.

/** Separa por vírgula de topo — vírgula dentro de `(...)` é do embed, não da lista. */
export const topLevelParts = (select: string): string[] => {
  const parts: string[] = []
  let depth = 0
  let atual = ''
  for (const ch of select) {
    if (ch === '(') depth += 1
    if (ch === ')') depth -= 1
    if (ch === ',' && depth === 0) {
      parts.push(atual.trim())
      atual = ''
      continue
    }
    atual += ch
  }
  if (atual.trim() !== '') parts.push(atual.trim())
  return parts
}

export interface Recorte {
  /** Colunas escalares pedidas. */
  colunas: string[]
  /**
   * Embeds pedidos: nome da relação → partes de topo de dentro dele (um embed aninhado continua
   * inteiro, como `categories(slug, sort_order, active)`). `dentro` é o `select` do próprio embed.
   */
  embeds: { alias: string; relacao: string; colunas: string[]; dentro: string }[]
}

/** Lê o `select` como o PostgREST leria: colunas de topo e embeds, com alias e FK nomeada. */
export const parseSelect = (select: string): Recorte => {
  const colunas: string[] = []
  const embeds: Recorte['embeds'] = []

  for (const parte of topLevelParts(select)) {
    const abre = parte.indexOf('(')
    if (abre === -1) {
      colunas.push(parte)
      continue
    }
    const cabeca = parte.slice(0, abre)
    const dentro = parte.slice(abre + 1, parte.lastIndexOf(')'))
    // `filtro:product_categories!inner` → alias `filtro`, relação `product_categories`.
    const [aliasOuRelacao, relacaoDepoisDoAlias] = cabeca.includes(':')
      ? [cabeca.split(':')[0], cabeca.split(':')[1]]
      : [null, cabeca]
    // `categories!products_category_id_fkey` → relação `categories`.
    const relacao = relacaoDepoisDoAlias.split('!')[0]
    embeds.push({ alias: aliasOuRelacao ?? relacao, relacao, colunas: topLevelParts(dentro), dentro })
  }

  return { colunas, embeds }
}

const eObjeto = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v)

/**
 * A linha que o PostgREST devolveria para este `select` — nada além do que foi pedido, em qualquer
 * profundidade. `*` traz as colunas escalares da linha (nunca as relações, que precisam de embed).
 */
export const recortar = (
  select: string,
  linha: Record<string, unknown>,
): Record<string, unknown> => {
  const { colunas, embeds } = parseSelect(select)
  const out: Record<string, unknown> = {}

  for (const coluna of colunas) {
    if (coluna === '*') {
      for (const [k, v] of Object.entries(linha)) {
        const relacao = eObjeto(v) || (Array.isArray(v) && v.some(eObjeto))
        if (!relacao) out[k] = v
      }
      continue
    }
    if (coluna in linha) out[coluna] = linha[coluna]
  }

  for (const embed of embeds) {
    const valor = linha[embed.relacao]
    if (Array.isArray(valor)) {
      out[embed.alias] = valor.map(row =>
        eObjeto(row) ? recortar(embed.dentro, row) : row,
      )
    } else if (eObjeto(valor)) {
      out[embed.alias] = recortar(embed.dentro, valor)
    } else if (valor === null) {
      out[embed.alias] = null
    }
  }

  return out
}
