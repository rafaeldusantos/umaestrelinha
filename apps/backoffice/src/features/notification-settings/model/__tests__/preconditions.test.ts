import { describe, expect, it } from 'vitest'
import { DEFAULT_MATERIAL, type MaterialSettings } from '@estrelinha/supabase/types/settings'

import { adminUrlLooksLocal, materialAddressMissing } from '../preconditions'

/** ABN-08 — o gate de material bloqueia salvar quando o logradouro está vazio. */
describe('materialAddressMissing', () => {
  const material = (over: Partial<MaterialSettings> = {}): MaterialSettings => ({
    ...DEFAULT_MATERIAL,
    ...over,
  })

  it('street vazio → true', () => {
    expect(materialAddressMissing(material({ street: '' }))).toBe(true)
  })

  it('street só com espaço → true (não conta como preenchido)', () => {
    expect(materialAddressMissing(material({ street: '   ' }))).toBe(true)
  })

  it('street preenchido → false', () => {
    expect(materialAddressMissing(material({ street: 'Rua das Flores' }))).toBe(false)
  })

  it('o default (DEFAULT_MATERIAL) tem street vazio → true — é o estado antes de a dona preencher', () => {
    expect(materialAddressMissing(DEFAULT_MATERIAL)).toBe(true)
  })
})

/** ABN-09 — o aviso não-bloqueante nos cards owner_* quando o link do painel não é de produção. */
describe('adminUrlLooksLocal', () => {
  it('http://localhost:8083 → true', () => {
    expect(adminUrlLooksLocal('http://localhost:8083')).toBe(true)
  })

  it('URL com 127.0.0.1 → true, mesmo com https', () => {
    expect(adminUrlLooksLocal('https://127.0.0.1:8083')).toBe(true)
  })

  it('https://painel.umaestrelinha.com.br → false', () => {
    expect(adminUrlLooksLocal('https://painel.umaestrelinha.com.br')).toBe(false)
  })

  it('string vazia → true (ausência conta como "não é de produção", não "não sei")', () => {
    expect(adminUrlLooksLocal('')).toBe(true)
  })

  it('http (sem "s") não é de produção → true', () => {
    expect(adminUrlLooksLocal('http://painel.umaestrelinha.com.br')).toBe(true)
  })
})
