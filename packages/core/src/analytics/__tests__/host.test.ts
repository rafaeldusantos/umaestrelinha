import { describe, expect, it } from 'vitest'
import { trafficType } from '../host.ts'

// CMP-08 — homologação e produção na MESMA propriedade, separadas por `traffic_type=internal`.
const PROD = 'umaestrelinha.com.br'

describe('trafficType (CMP-08)', () => {
  it('o host de produção NÃO é interno', () => {
    expect(trafficType('umaestrelinha.com.br', PROD)).toBeNull()
  })

  it('o www. do host de produção também não é', () => {
    expect(trafficType('www.umaestrelinha.com.br', PROD)).toBeNull()
  })

  it('maiúsculas, porta e ponto final não mudam a resposta', () => {
    expect(trafficType('UmaEstrelinha.com.br', PROD)).toBeNull()
    expect(trafficType('umaestrelinha.com.br:443', PROD)).toBeNull()
    expect(trafficType('umaestrelinha.com.br.', PROD)).toBeNull()
  })

  it.each([
    'umaestrelinha-store-five.vercel.app',
    'qualquer-preview.vercel.app',
    'localhost',
    'localhost:8082',
    '127.0.0.1',
    'loja.umaestrelinha.com.br',
  ])('%s ⇒ interno', (host) => {
    expect(trafficType(host, PROD)).toBe('internal')
  })

  it('um host que só CONTÉM o de produção é interno (não é casamento por sufixo)', () => {
    expect(trafficType('umaestrelinha.com.br.evil.app', PROD)).toBe('internal')
    expect(trafficType('xumaestrelinha.com.br', PROD)).toBe('internal')
  })

  it('sem host de produção configurado, tudo é interno (o lado que não polui o relatório)', () => {
    expect(trafficType('umaestrelinha.com.br', '')).toBe('internal')
    expect(trafficType('umaestrelinha.com.br', null)).toBe('internal')
  })

  it('host ausente é interno', () => {
    expect(trafficType(undefined, PROD)).toBe('internal')
    expect(trafficType('', PROD)).toBe('internal')
  })
})
