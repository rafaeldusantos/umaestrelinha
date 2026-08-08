// Feature 18 / T3 — DSC-03.

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import FormPageHeader from './FormPageHeader'

const onBack = vi.fn()
const onSave = vi.fn()

const setup = (over: { isDirty?: boolean; saving?: boolean } = {}) =>
  render(
    <FormPageHeader
      group="Descontos"
      parentLabel="Promoções"
      title="Kit de bottons"
      isDirty={over.isDirty ?? false}
      saving={over.saving ?? false}
      saveLabel="Salvar promoção"
      onBack={onBack}
      onSave={onSave}
    />,
  )

beforeEach(() => {
  onBack.mockClear()
  onSave.mockClear()
})

describe('FormPageHeader', () => {
  it('mostra a trilha de três níveis, com a listagem como link de volta (AC 1-2)', () => {
    setup()

    const trilha = screen.getByRole('navigation', { name: 'Trilha' })
    expect(trilha).toHaveTextContent('Descontos')
    expect(trilha).toHaveTextContent('Promoções')
    expect(trilha).toHaveTextContent('Kit de bottons')

    fireEvent.click(screen.getByRole('button', { name: 'Promoções' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('o título é o nome do registro', () => {
    setup()

    expect(screen.getByRole('heading', { name: 'Kit de bottons' })).toBeInTheDocument()
  })

  it('o selo de pendência aparece só com alteração não salva (AC 3)', () => {
    setup({ isDirty: false })
    expect(screen.queryByText('Alterações não salvas')).not.toBeInTheDocument()

    setup({ isDirty: true })
    expect(screen.getByText('Alterações não salvas')).toBeInTheDocument()
  })

  it('oferece Cancelar e o primário com o atalho anunciado (AC 4)', () => {
    setup()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onBack).toHaveBeenCalledTimes(1)

    const salvar = screen.getByRole('button', { name: /Salvar promoção/ })
    expect(salvar).toHaveTextContent('⌘S')
    fireEvent.click(salvar)
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('`Ctrl+S` salva e impede o "salvar página" do navegador (AC 5)', () => {
    setup()

    // `fireEvent.keyDown` devolve `false` quando o handler chamou `preventDefault`.
    const notPrevented = fireEvent.keyDown(window, { key: 's', ctrlKey: true })

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(notPrevented).toBe(false)
  })

  it('`⌘S` (metaKey) faz o mesmo', () => {
    setup()

    fireEvent.keyDown(window, { key: 's', metaKey: true })

    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('`s` sem modificador não salva — é uma letra dentro de um campo de texto', () => {
    setup()

    fireEvent.keyDown(window, { key: 's' })

    expect(onSave).not.toHaveBeenCalled()
  })

  it('durante o save os dois botões ficam desabilitados, e o atalho não reentra (AC 6)', () => {
    setup({ saving: true })

    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Salvar promoção/ })).toBeDisabled()

    fireEvent.keyDown(window, { key: 's', ctrlKey: true })
    expect(onSave).not.toHaveBeenCalled()
  })
})
