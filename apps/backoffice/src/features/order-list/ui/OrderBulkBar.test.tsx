// Feature `88` · T20 — a barra de lote mostra o progresso (`CRG-10`).

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import OrderBulkBar, { type BulkProgress } from './OrderBulkBar'

const noop = () => {}
const montar = (progresso?: BulkProgress | null, extra: Record<string, unknown> = {}) =>
  render(
    <OrderBulkBar
      count={30}
      total={30}
      progresso={progresso}
      onMaterialReceived={noop}
      onAdvanceStatus={noop}
      onPickSlips={noop}
      onChargeMaterial={noop}
      onExport={noop}
      onSelectAll={noop}
      onClear={noop}
      {...extra}
    />,
  )

describe('OrderBulkBar — progresso (CRG-10)', () => {
  it('com o lote em curso: o verbo, a contagem e a barra determinada', () => {
    montar({ verbo: 'Avançando', feitos: 7, total: 30 })

    expect(screen.getByText('Avançando 7 de 30…')).toBeInTheDocument()
    const barra = screen.getByRole('progressbar')
    expect(barra).toHaveAttribute('aria-valuenow', '7')
    expect(barra).toHaveAttribute('aria-valuemax', '30')
    expect(barra).toHaveAttribute('aria-valuemin', '0')
    expect((barra.firstChild as HTMLElement).style.width).toBe(`${(7 / 30) * 100}%`)
    expect(screen.getByRole('toolbar')).toHaveAttribute('aria-busy', 'true')
  })

  it('com o lote em curso: nenhuma ação da barra fica ao alcance', () => {
    montar({ verbo: 'Registrando', feitos: 0, total: 3 })

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText('Registrando 0 de 3…')).toBeInTheDocument()
  })

  it('sem progresso: a barra de sempre, sem `progressbar` nem `aria-busy`', () => {
    const onAdvance = vi.fn()
    montar(null, { onAdvanceStatus: onAdvance })

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.getByRole('toolbar')).not.toHaveAttribute('aria-busy')
    fireEvent.click(screen.getByRole('button', { name: /Avançar status/ }))
    expect(onAdvance).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: /Marcar material recebido/ })).toBeEnabled()
  })

  it('`busy` sem progresso desabilita as ações (a leitura do filtro, por exemplo)', () => {
    montar(null, { busy: true })
    expect(screen.getByRole('button', { name: /Avançar status/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Marcar material recebido/ })).toBeDisabled()
  })
})
