import { describe, expect, it } from 'vitest'
import { CSV_HEADERS, buildOrdersCsv, exportLabel, orderCsvRow } from '../exportCsv'
import type { AdminOrderRow } from '@/entities/order/api/orderQuery'

/**
 * `PED-05` / `PED-06` — o CSV.
 *
 * `TST-05` na prática: a linha é comparada em **igualdade exata**, e não por `toContain`. É o que
 * impede uma coluna nova entrar no arquivo sem alguém decidir — e é o mesmo molde do payload de
 * gravação do `CategoryInspector`.
 */
const AGORA = new Date('2026-08-29T12:00:00Z')

const row = (over: Partial<AdminOrderRow> = {}): AdminOrderRow => ({
  id: 'o1',
  order_number: '1042',
  customer_id: 'c1',
  customer_name: 'Luciana Prado',
  customer_email: 'lu@example.com',
  status: 'separating',
  payment_status: 'approved',
  payment_method: 'pix',
  total: 369.55,
  tracking_code: null,
  material_tracking_code: 'BR44 9182 3',
  material_status: 'aguardando_material',
  material_received_at: null,
  created_at: '2026-08-20T12:00:00Z',
  notes: null,
  purchase_ordinal: 1,
  customer_phone: null,
  ...over,
})

describe('as colunas do CSV, em igualdade exata (TST-05)', () => {
  it('o cabeçalho é EXATAMENTE este', () => {
    // Coluna nova aqui é decisão, não acidente: quem abre a planilha depois conta com a posição.
    expect([...CSV_HEADERS]).toEqual([
      'Número',
      'Cliente',
      'Email',
      'Status',
      'Pagamento',
      'Situação do pagamento',
      'Estado do material',
      'Rastreio do envelope (entrada)',
      'Material recebido em',
      'Dias parado',
      'Total',
      'Rastreio da joia (saída)',
      'Data',
    ])
  })

  it('a linha é EXATAMENTE esta, e tem o mesmo tamanho do cabeçalho', () => {
    const linha = orderCsvRow(row(), AGORA)

    expect(linha).toEqual([
      '1042',
      'Luciana Prado',
      'lu@example.com',
      'Em Separação',
      'pix',
      'Aprovado',
      'Aguardando material',
      'BR44 9182 3',
      '',
      9,
      '369.55',
      '',
      '20/08/2026',
    ])
    expect(linha).toHaveLength(CSV_HEADERS.length)
  })
})

describe('as cinco colunas que a planilha não respondia (PED-06)', () => {
  it('`dias_parado` é o NÚMERO cru, não a frase', () => {
    // Quem exporta vai ordenar e filtrar por ele numa planilha; "parado há 9 dias" não ordena.
    expect(orderCsvRow(row(), AGORA)[9]).toBe(9)
  })

  it('pedido sem material não inventa zero dias', () => {
    // Zero e "não se aplica" são coisas diferentes, e zero ordenaria junto com os recentes.
    expect(orderCsvRow(row({ material_status: 'nao_aplicavel' }), AGORA)[9]).toBe('')
  })

  it('o relógio corre desde o recebimento depois que o envelope chega', () => {
    const linha = orderCsvRow(
      row({ material_status: 'material_recebido', material_received_at: '2026-08-27T12:00:00Z' }),
      AGORA,
    )
    expect(linha[9]).toBe(2)
    expect(linha[8]).toBe('27/08/2026')
  })

  it('a situação do pagamento é traduzida, e não o código cru', () => {
    expect(orderCsvRow(row({ payment_status: 'refunded' }), AGORA)[5]).toBe('Estornado')
  })
})

describe('o arquivo', () => {
  it('carrega o cabeçalho e uma linha por pedido', () => {
    const csv = buildOrdersCsv([row(), row({ order_number: '1041' })], AGORA)
    expect(csv.split('\n')).toHaveLength(3)
  })

  it('aspas no conteúdo são duplicadas, e não quebram a coluna', () => {
    const csv = buildOrdersCsv([row({ customer_name: 'Maria "Lu" Prado' })], AGORA)
    expect(csv).toContain('"Maria ""Lu"" Prado"')
  })

  it('vírgula no nome não vira duas colunas', () => {
    const csv = buildOrdersCsv([row({ customer_name: 'Prado, Luciana' })], AGORA)
    expect(csv).toContain('"Prado, Luciana"')
  })
})

describe('o rótulo do botão diz o total (PED-05)', () => {
  it('carrega o número, para ele estar do lado do clique', () => {
    // O defeito antigo: o botão dizia "Exportar CSV" e baixava 20 linhas enquanto o rodapé ao lado
    // dizia 148. Ninguém era avisado.
    expect(exportLabel(148)).toBe('Exportar 148 do filtro')
  })

  it('sem nada para exportar, não promete um número', () => {
    expect(exportLabel(0)).toBe('Exportar')
  })
})
