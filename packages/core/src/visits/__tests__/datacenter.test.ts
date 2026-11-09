/**
 * A régua de rede da function `visit`: "esta requisição veio de dentro de um data center?".
 *
 * Existe pelo robô de 2026-11-08 e 2026-11-09 — Chrome de verdade, user agent comum, cookies
 * aceitos, perfil zerado a cada acesso, 157 IPs da ColoCrossing (AS36352) — que gravou ~400 visitas
 * únicas. Os IPs de fixtura abaixo são dos logs daqueles dias.
 */
import { describe, expect, it } from 'vitest'

import { isDatacenterIp, requestFromDatacenter } from '../datacenter.ts'
import { DATACENTER_RANGES } from '../datacenterRanges.ts'

const cabecalhos = (h: Record<string, string>) => (nome: string) => h[nome] ?? null

describe('isDatacenterIp — a lista gerada', () => {
  it('âncora — a lista tem as quatro redes e não está vazia', () => {
    expect(DATACENTER_RANGES.length).toBeGreaterThan(1000)
    expect(DATACENTER_RANGES.some((c) => c.includes(':'))).toBe(true)
  })

  it('toda faixa da lista é legível (uma faixa quebrada lança, nunca vira lista vazia)', () => {
    expect(() => isDatacenterIp('1.1.1.1')).not.toThrow()
  })

  it.each(['198.46.191.25', '198.46.150.7'])('ColoCrossing %s ⇒ data center', (ip) => {
    expect(isDatacenterIp(ip)).toBe(true)
  })

  it.each([
    ['Claro (operadora brasileira)', '177.12.34.56'],
    ['Vivo', '189.40.10.20'],
    ['TIM', '191.200.1.2'],
    ['documentação (TEST-NET-3)', '203.0.113.7'],
  ])('%s ⇒ não é data center', (_nome, ip) => {
    expect(isDatacenterIp(ip)).toBe(false)
  })

  it.each([null, undefined, '', 'lixo', '999.1.1.1', '1.2.3', '::g'])('IP ausente ou ilegível (%j) ⇒ não é data center', (ip) => {
    expect(isDatacenterIp(ip as string)).toBe(false)
  })
})

describe('isDatacenterIp — a aritmética da faixa', () => {
  const FAIXAS = ['10.0.0.0/8', '192.168.4.0/22', '2001:db8:abcd::/48', '203.0.113.9/32']

  it.each([
    ['10.255.255.255', true],
    ['11.0.0.0', false],
    ['192.168.4.0', true],
    ['192.168.7.255', true],
    ['192.168.8.0', false],
    ['192.168.3.255', false],
    ['203.0.113.9', true],
    ['203.0.113.10', false],
    ['2001:db8:abcd:1::1', true],
    ['2001:db8:abce::1', false],
    ['2001:0db8:abcd:ffff:ffff:ffff:ffff:ffff', true],
    ['[2001:db8:abcd::5]', true],
    ['::ffff:10.1.2.3', true],
    [' 10.1.2.3 ', true],
  ])('%s ⇒ %s', (ip, esperado) => {
    expect(isDatacenterIp(ip, FAIXAS)).toBe(esperado)
  })

  it('IPv4 não casa faixa IPv6 e vice-versa', () => {
    expect(isDatacenterIp('0.0.0.1', ['::/0'])).toBe(false)
    expect(isDatacenterIp('::1', ['0.0.0.0/0'])).toBe(false)
  })
})

describe('requestFromDatacenter — os candidatos a IP do cliente', () => {
  it('o `cf-connecting-ip` de data center decide, mesmo com um `x-forwarded-for` inventado na frente', () => {
    expect(
      requestFromDatacenter(cabecalhos({ 'x-forwarded-for': '177.12.34.56', 'cf-connecting-ip': '198.46.191.25' })),
    ).toBe(true)
  })

  it('qualquer entrada do `x-forwarded-for` de data center decide', () => {
    expect(requestFromDatacenter(cabecalhos({ 'x-forwarded-for': '177.12.34.56, 198.46.191.25' }))).toBe(true)
  })

  it('o `x-real-ip` também é lido', () => {
    expect(requestFromDatacenter(cabecalhos({ 'x-real-ip': '198.46.191.25' }))).toBe(true)
  })

  it('par — só operadora ⇒ não é data center', () => {
    expect(
      requestFromDatacenter(cabecalhos({ 'x-forwarded-for': '177.12.34.56', 'cf-connecting-ip': '177.12.34.56' })),
    ).toBe(false)
  })

  it('sem cabeçalho nenhum ⇒ não é data center', () => {
    expect(requestFromDatacenter(cabecalhos({}))).toBe(false)
  })
})
