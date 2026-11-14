import { describe, expect, it } from 'vitest'
import { STYLE_PROFILE_COPY, STYLE_PROFILE_LABELS, styleProfilePreviewTitle } from '../copy.ts'
import { STYLE_PROFILES } from '../types.ts'

describe('o texto do card do perfil', () => {
  it('nomeia cada perfil, e só os perfis que existem', () => {
    expect(Object.keys(STYLE_PROFILE_LABELS).sort()).toEqual([...STYLE_PROFILES].sort())
    expect(STYLE_PROFILE_LABELS.padrao.name).toBe('Padrão')
    expect(STYLE_PROFILE_LABELS['black-friday'].name).toBe('Black Friday')
  })

  it('o título do modal leva o nome do perfil', () => {
    expect(styleProfilePreviewTitle('black-friday')).toBe('A loja com o perfil Black Friday')
    expect(styleProfilePreviewTitle('padrao')).toBe('A loja com o perfil Padrão')
  })

  it('diz o que muda e quanto tempo leva', () => {
    expect(STYLE_PROFILE_COPY.description).toContain('Muda só as cores da loja.')
    expect(STYLE_PROFILE_COPY.notice).toContain('em até 5 minutos')
    expect(STYLE_PROFILE_COPY.notice).toContain('em até 1 hora')
    expect(STYLE_PROFILE_COPY.saved).toBe('Perfil salvo. Quem abrir a loja vê o perfil novo em até 1 hora.')
  })

  it('não usa exclamação nem urgência', () => {
    const textos = [
      ...Object.values(STYLE_PROFILE_COPY),
      ...Object.values(STYLE_PROFILE_LABELS).flatMap(l => [l.name, l.description]),
    ]
    expect(textos.length).toBeGreaterThan(10)
    expect(textos.filter(t => /!|últim|corra|agora mesmo/i.test(t))).toEqual([])
  })
})
