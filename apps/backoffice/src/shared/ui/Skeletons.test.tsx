import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TableSkeleton, CardSkeleton } from './Skeletons'

describe('TableSkeleton', () => {
  it('renders the requested number of rows', () => {
    render(<TableSkeleton rows={4} cols={3} />)
    expect(screen.getAllByTestId('skeleton-row')).toHaveLength(4)
  })

  it('defaults to 6 rows', () => {
    render(<TableSkeleton />)
    expect(screen.getAllByTestId('skeleton-row')).toHaveLength(6)
  })
})

describe('CardSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<CardSkeleton />)
    expect(container.firstChild).toBeInTheDocument()
  })
})
