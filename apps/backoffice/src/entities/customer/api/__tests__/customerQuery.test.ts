import { describe, expect, it } from 'vitest'
import {
  CUSTOMER_SEARCH_COLUMNS,
  CUSTOMER_VIEWS,
  activeCustomerFilterCount,
  buildCustomerSearchCondition,
  defaultCustomerQuery,
  emptyCustomerFilters,
  lastPurchaseLabel,
  type CustomerListRow,
} from '../customerQuery'
import {
  CUSTOMER_CSV_HEADERS, buildCustomersCsv, customerCsvRow, customerExportLabel,
} from '@/features/customer-detail/lib/exportCsv'

/**
 * As datas das fixtures são **meio-dia UTC**, e isso não é arbitrário.
 *
 * `toLocaleDateString('pt-BR')` formata no fuso da MÁQUINA. Com `T00:00:00Z`, o dia 20 vira 19 em
 * qualquer fuso negativo — o teste passaria em UTC e reprovaria em Porto Alegre, medindo o relógio
 * do runner em vez do código. É a mesma família do `storeOrigin.test.ts`, que media o `.env` da
 * máquina. Meio-dia UTC cai no mesmo dia civil em UTC e em BRT.
 */
const cliente = (over: Partial<CustomerListRow> = {}): CustomerListRow => ({
  id: 'c1',
  user_id: 'u1',
  name: 'Luciana Prado',
  email: 'lu@example.com',
  cpf: '04212345618',
  phone: '51999184227',
  created_at: '2026-03-14T12:00:00Z',
  has_account: true,
  orders_paid: 3,
  orders_total: 3,
  total_spent: 1104,
  avg_ticket: 368,
  first_order_at: '2026-03-27T12:00:00Z',
  last_order_at: '2026-08-20T12:00:00Z',
  last_activity_at: '2026-08-20T12:00:00Z',
  orders_with_material: 2,
  material_kinds: ['cinzas', 'cabelo'],
  same_email_count: 1,
  ...over,
})

describe('as visões respondem perguntas de relacionamento (CLI-07)', () => {
  it('as seis existem, incluindo a das duplicadas', () => {
    expect(CUSTOMER_VIEWS.map(v => v.id)).toEqual([
      'todas', 'voltaram', 'confiaram-material', 'uma-vez', 'sem-compra', 'duplicadas',
    ])
  })

  it('a tela abre em `todas`, ordenada por quem mais gastou', () => {
    // Quem já confiou mais é quem se quer reconhecer ao abrir a tela.
    const q = defaultCustomerQuery()
    expect(q.filters.view).toBe('todas')
    expect(q.sort).toEqual({ key: 'spent', dir: 'desc' })
  })
})

describe('a busca alcança as quatro coisas que se tem em mãos (CLI-01)', () => {
  it('nome, e-mail, telefone e CPF', () => {
    expect([...CUSTOMER_SEARCH_COLUMNS]).toEqual(['name', 'email', 'phone', 'cpf'])
  })

  it('monta o `or=` com as quatro', () => {
    expect(buildCustomerSearchCondition('lu')).toBe(
      'name.ilike.%lu%,email.ilike.%lu%,phone.ilike.%lu%,cpf.ilike.%lu%',
    )
  })

  it('termo vazio não vira condição', () => {
    expect(buildCustomerSearchCondition('  ')).toBeNull()
  })
})

describe('activeCustomerFilterCount', () => {
  it('conta cada eixo, e a busca', () => {
    const base = emptyCustomerFilters()

    expect(activeCustomerFilterCount(base)).toBe(0)
    expect(activeCustomerFilterCount({ ...base, view: 'duplicadas' })).toBe(1)
    expect(activeCustomerFilterCount({ ...base, account: 'convidada' })).toBe(1)
    expect(activeCustomerFilterCount({ ...base, lastPurchase: '30d' })).toBe(1)
    expect(activeCustomerFilterCount({ ...base, materialKinds: ['cinzas'] })).toBe(1)
    expect(activeCustomerFilterCount(base, 'lu')).toBe(1)
  })
})

describe('lastPurchaseLabel — abandono deixa de virar compra (CLI-05)', () => {
  it('quando o último pedido é o último pago, não há nada em aberto', () => {
    expect(lastPurchaseLabel(cliente())).toEqual({ text: '20/08/2026', open: false })
  })

  it('um pedido mais recente que o último PAGO é "em aberto"', () => {
    // É o Pix pendente, ou o que ainda não virou dinheiro. Somá-lo ao gasto inflaria o LTV.
    const r = lastPurchaseLabel(
      cliente({ last_order_at: '2026-08-01T00:00:00Z', last_activity_at: '2026-08-20T12:00:00Z' }),
    )
    expect(r.open).toBe(true)
  })

  it('quem nunca comprou diz isso, e não uma data', () => {
    expect(lastPurchaseLabel(cliente({ last_activity_at: null, last_order_at: null }))).toEqual({
      text: 'Nunca comprou',
      open: false,
    })
  })

  it('quem só tem pedido não pago aparece em aberto, e não como "nunca"', () => {
    const r = lastPurchaseLabel(
      cliente({ orders_paid: 0, last_order_at: null, last_activity_at: '2026-08-20T12:00:00Z' }),
    )
    expect(r.open).toBe(true)
    expect(r.text).toBe('20/08/2026')
  })
})

describe('o CSV de clientes, em igualdade exata (CLI-12, TST-05)', () => {
  it('o cabeçalho é EXATAMENTE este', () => {
    expect([...CUSTOMER_CSV_HEADERS]).toEqual([
      'Nome', 'E-mail', 'Telefone', 'CPF', 'Origem',
      'Pedidos pagos', 'Pedidos no total', 'Gastou', 'Ticket médio',
      'Primeira compra', 'Última compra', 'Materiais confiados',
      'Cadastros com este e-mail',
    ])
  })

  it('a linha é EXATAMENTE esta', () => {
    expect(customerCsvRow(cliente())).toEqual([
      'Luciana Prado',
      'lu@example.com',
      '51999184227',
      '04212345618',
      'conta',
      3,
      3,
      '1104.00',
      '368.00',
      '27/03/2026',
      '20/08/2026',
      'Cinzas; Mecha de cabelo',
      1,
    ])
  })

  it('a convidada é marcada como tal na coluna Origem', () => {
    expect(customerCsvRow(cliente({ has_account: false }))[4]).toBe('convidada')
  })

  it('ticket ausente sai vazio, e não como zero', () => {
    expect(customerCsvRow(cliente({ avg_ticket: null }))[8]).toBe('')
  })

  it('vírgula no nome não quebra a coluna', () => {
    expect(buildCustomersCsv([cliente({ name: 'Prado, Luciana' })])).toContain('"Prado, Luciana"')
  })

  it('o rótulo carrega o total do filtro', () => {
    expect(customerExportLabel(324)).toBe('Exportar 324 do filtro')
    expect(customerExportLabel(0)).toBe('Exportar')
  })
})
