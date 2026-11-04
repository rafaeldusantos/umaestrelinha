import { describe, expect, it } from 'vitest'

import { adminNoteAuthorLine } from '../index.ts'

// "Atualizada em <data> às <hora> por <nome>" — a última edição da observação do pedido. O painel e o
// app do ateliê escrevem a mesma frase, então ela tem um dono só. A hora é a de Brasília, nunca a do
// aparelho.

describe('adminNoteAuthorLine', () => {
  it('data, hora de Brasília e o nome de quem editou', () => {
    // 15h00 UTC = 12h00 em Brasília
    expect(adminNoteAuthorLine({ updated_at: '2026-11-03T15:00:00.000Z', updated_by_name: 'Bruna Lima' })).toBe(
      'Atualizada em 3 nov 2026 às 12h00 por Bruna Lima',
    )
  })

  it('o dia é o de Brasília: 01h00 UTC ainda é o dia anterior', () => {
    expect(adminNoteAuthorLine({ updated_at: '2026-11-04T01:30:00.000Z', updated_by_name: 'Adri' })).toBe(
      'Atualizada em 3 nov 2026 às 22h30 por Adri',
    )
  })

  it('sem nome (ou só espaço), a frase para na hora', () => {
    expect(adminNoteAuthorLine({ updated_at: '2026-11-03T15:00:00.000Z', updated_by_name: null })).toBe(
      'Atualizada em 3 nov 2026 às 12h00',
    )
    expect(adminNoteAuthorLine({ updated_at: '2026-11-03T15:00:00.000Z', updated_by_name: '  ' })).toBe(
      'Atualizada em 3 nov 2026 às 12h00',
    )
  })

  it('sem observação, ou com a data ilegível, nenhuma frase', () => {
    expect(adminNoteAuthorLine(null)).toBeNull()
    expect(adminNoteAuthorLine({ updated_at: 'não é data', updated_by_name: 'Adri' })).toBeNull()
  })
})
