// Feature 80 — o fornecedor da peça (FOR-01, FOR-02, FOR-09, FOR-10, FOR-16).
//
// Mora em `core` porque tem DOIS leitores: a tela do painel (recusa antes de gravar) e a migration
// (`check` do banco), comparados pelo guarda `fornecedorSchema.test.ts`, que importa estas
// constantes. Escrito nos dois lados à mão, a tela aceitaria o que o banco recusa — e o aviso seria
// "o produto foi salvo, mas o fornecedor não", sem dizer por quê.

/** O teto do nome, igual ao `check` do nome do fornecedor na migration da feature 80. */
export const SUPPLIER_NAME_MAX = 120

/** O teto do link, igual ao `check` do link da peça na migration da feature 80. */
export const SUPPLIER_URL_MAX = 2000

/** O começo exigido do link, igual ao `check` do banco (`~* '^https?://'`). */
export const SUPPLIER_URL_PATTERN = /^https?:\/\//i

/** As frases de recusa, ditas pela tela antes de qualquer gravação. */
export const SUPPLIER_REFUSALS = {
  nameMissing: 'Informe o nome do fornecedor da peça',
  nameTooLong: `O nome do fornecedor tem no máximo ${SUPPLIER_NAME_MAX} caracteres`,
  urlScheme: 'O link da peça precisa começar com http:// ou https://',
  urlTooLong: `O link da peça tem no máximo ${SUPPLIER_URL_MAX} caracteres`,
} as const

/**
 * Pode gravar este fornecedor? `null` = pode; senão, a frase da recusa.
 *
 * Os dois campos vazios é "sem fornecedor", e pode (o save apaga o vínculo). Link sem nome não:
 * o vínculo precisa de um fornecedor para existir. Devolve `string | null`, e não união
 * discriminada por booleano, porque `strictNullChecks` está desligado (ver `CLAUDE.md`).
 */
export const supplierRefusal = (name: string, url: string): string | null => {
  const nome = name.trim()
  const link = url.trim()
  if (nome === '' && link === '') return null
  if (nome === '') return SUPPLIER_REFUSALS.nameMissing
  if (nome.length > SUPPLIER_NAME_MAX) return SUPPLIER_REFUSALS.nameTooLong
  if (link === '') return null
  if (!SUPPLIER_URL_PATTERN.test(link)) return SUPPLIER_REFUSALS.urlScheme
  if (link.length > SUPPLIER_URL_MAX) return SUPPLIER_REFUSALS.urlTooLong
  return null
}

/**
 * O texto curto do link na tela: o domínio sem `www.` e o começo do caminho, para a dona
 * reconhecer a peça sem ler uma URL de 300 caracteres. Link que não parseia volta como veio.
 */
export const supplierLinkLabel = (url: string, max = 40): string => {
  let rotulo: string
  try {
    const u = new URL(url)
    const caminho = u.pathname === '/' ? '' : u.pathname
    rotulo = `${u.hostname.replace(/^www\./, '')}${caminho}`
  } catch {
    rotulo = url
  }
  return rotulo.length > max ? `${rotulo.slice(0, max - 1)}…` : rotulo
}
