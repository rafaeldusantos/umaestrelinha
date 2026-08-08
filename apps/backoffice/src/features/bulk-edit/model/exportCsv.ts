// RFN-03 (A26) — exportar os selecionados num CSV que o próprio importador relê.
//
// As colunas são as chaves do `FIELD_MAP` do `CsvImportDialog`, na forma em português. Não é
// escolha estética: é o que fecha o ciclo exportar → editar no Excel → reimportar. Qualquer coluna
// a mais o importador ignora; qualquer coluna com nome diferente vira dado perdido em silêncio.

import type { AdminListRow } from '@/entities/product/api/productQuery'

/** Exatamente os cabeçalhos que o importador reconhece. A ordem é a de leitura humana. */
export const CSV_COLUMNS = [
  'nome',
  'descricao',
  'preco',
  'preco_comparativo',
  'custo',
  'estoque',
  'slug',
  'tags',
] as const

export type CsvColumn = (typeof CSV_COLUMNS)[number]

/** O que a listagem NÃO carrega e precisa de uma leitura extra: corpo e custo. */
export interface ExportDetail {
  description?: string | null
  cost_price?: number | null
}

/**
 * RFC 4180: campo com vírgula, aspas ou quebra de linha vai entre aspas, e a aspa interna dobra.
 *
 * Sem isso, uma descrição com vírgula desloca todas as colunas seguintes da linha — e o estrago só
 * aparece quando alguém reimporta e encontra o preço no campo de tags.
 */
export const escapeCsvValue = (value: unknown): string => {
  const text = value === null || value === undefined ? '' : String(value)
  if (!/[",\n\r]/.test(text)) return text
  return `"${text.replace(/"/g, '""')}"`
}

/** Número no formato que o importador lê (`Number(value)`): ponto decimal, sem símbolo. */
const toNumberCell = (value: number | null | undefined): string =>
  value === null || value === undefined ? '' : String(value)

export const toExportRow = (
  row: AdminListRow,
  detail: ExportDetail = {},
): Record<CsvColumn, string> => ({
  nome: row.name,
  descricao: detail.description ?? '',
  // Produto com grade exporta o `base_price`, não a faixa: o importador cria UM produto com UM
  // preço, e a faixa é derivada das variações, que não vão no CSV.
  preco: toNumberCell(row.price),
  preco_comparativo: toNumberCell(row.compare_price),
  custo: toNumberCell(detail.cost_price),
  estoque: toNumberCell(row.stock_total),
  slug: row.slug,
  tags: row.tags.join(', '),
})

export const toCsv = (
  rows: readonly AdminListRow[],
  details: Readonly<Record<string, ExportDetail>> = {},
): string => {
  const lines = [CSV_COLUMNS.join(',')]
  for (const row of rows) {
    const exported = toExportRow(row, details[row.id] ?? {})
    lines.push(CSV_COLUMNS.map(column => escapeCsvValue(exported[column])).join(','))
  }
  // `\r\n` é o que o Excel espera; o Papa Parse lê os dois.
  return lines.join('\r\n')
}

/** `produtos-2026-08-01.csv`. A data vem de fora para a função seguir determinística. */
export const csvFileName = (date: Date): string =>
  `produtos-${date.toISOString().slice(0, 10)}.csv`

/**
 * O download em si. Fora das puras porque toca `document` e `URL` — e é a única parte que não dá
 * para testar em node sem dublar o DOM inteiro.
 *
 * O BOM (`\ufeff`) existe para o Excel abrir acentuação correta: sem ele, `Coleção` vira
 * no Windows.
 */
export const downloadCsv = (content: string, fileName: string): void => {
  const blob = new Blob([`\ufeff${content}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
