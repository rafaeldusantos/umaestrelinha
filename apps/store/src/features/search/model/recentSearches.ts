// Buscas recentes — bloco "BUSCAS RECENTES" do board "Mobile Search Open - v3".
//
// No celular, redigitar "jujutsu kaisen" no teclado da tela é a diferença entre voltar à busca e
// desistir dela. Por isso o histórico é persistido, não estado de sessão.
//
// Chave nova, prefixo `nanapin-` como as demais (`nanapin-cart`, `nanapin-wishlist`): o prefixo é o
// identificador técnico do contrato com o navegador do cliente, e trocá-lo por `nanita-` só criaria
// duas famílias de chave para a mesma loja.
//
// Todo acesso vai dentro de `try/catch`: `localStorage` lança em modo privado do Safari e com cookies
// de terceiros bloqueados. Um histórico é conveniência — nunca pode derrubar a busca.

const KEY = 'nanapin-recent-searches'
const MAX = 5

const read = (): string[] => {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((v): v is string => typeof v === 'string' && v.trim().length > 0).slice(0, MAX)
  } catch {
    return []
  }
}

const write = (list: string[]): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* histórico é conveniência: sem storage, a busca segue funcionando sem ele */
  }
}

export const readRecentSearches = (): string[] => read()

/**
 * Guarda `query` no topo e devolve a lista nova. Repetido sobe para o topo em vez de duplicar — a
 * comparação é sem diferenciar maiúsculas, senão "Naruto" e "naruto" ocupariam duas das 5 linhas.
 */
export const pushRecentSearch = (query: string): string[] => {
  const term = query.trim()
  if (!term) return read()
  const rest = read().filter((v) => v.toLowerCase() !== term.toLowerCase())
  const next = [term, ...rest].slice(0, MAX)
  write(next)
  return next
}

export const clearRecentSearches = (): string[] => {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* idem */
  }
  return []
}
