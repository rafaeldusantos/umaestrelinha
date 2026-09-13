// Feature 18 / T3 — DSC-03.

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import FormPageHeader from './FormPageHeader'

const onBack = vi.fn()
const onSave = vi.fn()

const setup = (over: { isDirty?: boolean; saving?: boolean; bleed?: boolean } = {}) =>
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
      {...(over.bleed === undefined ? {} : { bleed: over.bleed })}
    />,
  )

/** O `<header>` renderizado — a barra fixa, que é onde a sangria mora. */
const barra = () => document.querySelector('header') as HTMLElement

beforeEach(() => {
  onBack.mockClear()
  onSave.mockClear()
})

/**
 * A sangria de 16px, e por que ela virou opcional.
 *
 * O `-mx-4` nasceu para uma PÁGINA, onde a barra fixa cobre de borda a borda o que rola por baixo
 * dela. Dentro de `coluna-secoes` de `/admin/home` — que declara `overflow-y-auto` e não tem padding
 * nenhum para a sangria cobrir — ela só estourava, e o CSS promovia o eixo x a `auto` junto: barra de
 * rolagem horizontal no formulário, medida em navegador (`clientWidth` 560 × `scrollWidth` 576).
 */
describe('FormPageHeader — a sangria é opcional', () => {
  /**
   * Um token exato da lista de classes.
   *
   * Por partição, não por regex: `'px-4'.includes('x-4')` é `true` e `-mx-4` contém `mx-4`, então
   * uma régua por substring diria "sangra" olhando para `px-40` sozinho. Partir por espaço não tem
   * essa borda — e não tem escape de metacaractere para errar, que é como a primeira escrita desta
   * régua nasceu quebrada.
   */
  const temToken = (el: HTMLElement, token: string) =>
    el.className.split(/\s+/).includes(token)

  it('por padrão SANGRA — é do que as duas telas de Descontos dependem', () => {
    setup()
    expect(temToken(barra(), '-mx-4')).toBe(true)
    expect(temToken(barra(), 'px-4')).toBe(true)
  })

  it('`bleed={false}` tira a sangria E o padding que a compensa — os dois, ou o texto desalinha', () => {
    // Tirar só o `-mx-4` deixaria 16px de padding de cada lado, e o título do formulário sairia
    // desalinhado dos cartões abaixo dele. É um par, não duas decisões.
    setup({ bleed: false })
    expect(temToken(barra(), '-mx-4')).toBe(false)
    expect(temToken(barra(), 'px-4')).toBe(false)
  })

  it('a barra continua fixa nos dois casos — a sangria não é o que a gruda no topo', () => {
    setup()
    expect(temToken(barra(), 'sticky')).toBe(true)
    expect(temToken(barra(), 'top-0')).toBe(true)
  })

  it('SENSOR: a régua é de token exato — `px-4` sozinho NÃO conta como sangria', () => {
    setup({ bleed: false })
    // Com `includes`, `-mx-4` casaria dentro de qualquer `mx-4` e `px-4` dentro de `px-40`.
    const falso = document.createElement('div')
    falso.className = 'px-40 mx-4'
    expect(temToken(falso, 'px-4')).toBe(false)
    expect(temToken(falso, '-mx-4')).toBe(false)
    expect(temToken(falso, 'mx-4')).toBe(true)
  })
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
