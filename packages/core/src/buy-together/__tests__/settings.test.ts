import { describe, expect, it } from 'vitest'
import {
  BUY_TOGETHER_FORMS,
  BUY_TOGETHER_FORM_LABELS,
  DEFAULT_BUY_TOGETHER_FORM,
  normalizeBuyTogetherForm,
} from '../index.ts'

describe('a forma do bloco Compre Junto', () => {
  it('são três formas, e o padrão é "Na linha"', () => {
    expect([...BUY_TOGETHER_FORMS]).toEqual(['inline', 'sheet', 'formula'])
    expect(DEFAULT_BUY_TOGETHER_FORM).toBe('inline')
    expect(BUY_TOGETHER_FORMS.map(f => BUY_TOGETHER_FORM_LABELS[f].name)).toEqual([
      'Na linha',
      'Em folha',
      'Com fórmula',
    ])
  })

  it.each(BUY_TOGETHER_FORMS)('mantém %s', form => {
    expect(normalizeBuyTogetherForm(form)).toBe(form)
  })

  it.each([undefined, null, '', 'Sheet', 'grade', 3, {}, ['sheet'], true])(
    'valor %j vira a forma padrão',
    value => {
      expect(normalizeBuyTogetherForm(value)).toBe('inline')
    },
  )
})
