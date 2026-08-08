import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Pagination from './Pagination'
import { getPageItems } from './paginationItems'

describe('getPageItems', () => {
  it('lists all pages when there is no gap', () => {
    expect(getPageItems(1, 3)).toEqual([1, 2, 3])
  })

  it('inserts an ellipsis between first/last and the current window', () => {
    // página 5 de 10 -> 1, ellipsis, 4,5,6, ellipsis, 10
    expect(getPageItems(5, 10)).toEqual([1, 'ellipsis', 4, 5, 6, 'ellipsis', 10])
  })

  it('has a single ellipsis near the start', () => {
    // página 2 de 10 -> 1,2,3, ellipsis, 10 (sem elipse inicial pois não há salto)
    expect(getPageItems(2, 10)).toEqual([1, 2, 3, 'ellipsis', 10])
  })
})

describe('Pagination', () => {
  it('renders nothing when there is a single page', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  it('disables previous on the first page and does not call onPageChange', () => {
    const onPageChange = vi.fn()
    render(<Pagination page={1} totalPages={5} onPageChange={onPageChange} />)
    const prev = screen.getByRole('button', { name: 'Página anterior' })
    expect(prev).toBeDisabled()
    fireEvent.click(prev)
    expect(onPageChange).not.toHaveBeenCalled()
  })

  it('disables next on the last page', () => {
    render(<Pagination page={5} totalPages={5} onPageChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Próxima página' })).toBeDisabled()
  })

  it('changes page when a page number is clicked', () => {
    const onPageChange = vi.fn()
    render(<Pagination page={1} totalPages={5} onPageChange={onPageChange} />)
    fireEvent.click(screen.getByRole('button', { name: '2' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })
})
