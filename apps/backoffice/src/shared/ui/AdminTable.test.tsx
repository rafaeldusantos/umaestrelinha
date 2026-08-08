import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ShoppingCart } from 'lucide-react'
import AdminTable, { type AdminColumn } from './AdminTable'

interface Row { id: string; name: string; price: number }

const rows: Row[] = [
  { id: '1', name: 'Botton Naruto', price: 12 },
  { id: '2', name: 'Botton Goku', price: 15 },
]

const columns: AdminColumn<Row>[] = [
  { key: 'name', header: 'Produto', sortable: true, cell: r => r.name },
  { key: 'price', header: 'Preço', align: 'right', cell: r => `R$ ${r.price}` },
]

describe('AdminTable', () => {
  it('renders a cell for each row via the cell renderer', () => {
    render(<AdminTable columns={columns} data={rows} rowKey={r => r.id} />)
    expect(screen.getByText('Botton Naruto')).toBeInTheDocument()
    expect(screen.getByText('R$ 15')).toBeInTheDocument()
  })

  it('calls onSort with the column key when a sortable header is clicked', () => {
    const onSort = vi.fn()
    render(<AdminTable columns={columns} data={rows} rowKey={r => r.id} onSort={onSort} />)
    fireEvent.click(screen.getByText('Produto'))
    expect(onSort).toHaveBeenCalledWith('name')
  })

  it('does NOT call onSort when a non-sortable header is clicked', () => {
    const onSort = vi.fn()
    render(<AdminTable columns={columns} data={rows} rowKey={r => r.id} onSort={onSort} />)
    fireEvent.click(screen.getByText('Preço'))
    expect(onSort).not.toHaveBeenCalled()
  })

  it('renders the EmptyState when data is empty', () => {
    render(
      <AdminTable
        columns={columns}
        data={[]}
        rowKey={r => r.id}
        empty={{ icon: ShoppingCart, message: 'Nenhum produto encontrado' }}
      />,
    )
    expect(screen.getByText('Nenhum produto encontrado')).toBeInTheDocument()
    // Sem cabeçalho de tabela quando vazio
    expect(screen.queryByText('Produto')).not.toBeInTheDocument()
  })

  it('renders a footer when provided', () => {
    render(
      <AdminTable columns={columns} data={rows} rowKey={r => r.id} footer={<span>2 produtos</span>} />,
    )
    expect(screen.getByText('2 produtos')).toBeInTheDocument()
  })
})
