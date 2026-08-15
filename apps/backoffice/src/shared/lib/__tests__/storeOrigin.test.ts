// Feature 25 — a origem da loja, que é o `targetOrigin` do rascunho (`PRV-07`).
//
// Vale por si porque o modo de falhar é silencioso: uma origem errada faz o `postMessage` ser
// descartado pelo navegador **sem erro**, e a prévia fica parada mostrando a composição salva
// enquanto a dona digita. Ninguém vê exceção; ela só acha que "não atualiza".

import { describe, expect, it } from 'vitest'
import { storeOrigin } from '../storeOrigin'

describe('storeOrigin — só a origem, nunca o caminho', () => {
  it('descarta caminho, busca e âncora', () => {
    expect(storeOrigin('https://umaestrelinha.com.br/produtos/x?a=1#y')).toBe(
      'https://umaestrelinha.com.br',
    )
  })

  it('preserva a porta, que é o caso de dev', () => {
    expect(storeOrigin('http://localhost:8082')).toBe('http://localhost:8082')
    expect(storeOrigin('http://localhost:8082/')).toBe('http://localhost:8082')
  })

  it('sem env devolve `null` — o painel segue funcionando sem a loja configurada', () => {
    expect(storeOrigin(undefined)).toBeNull()
    expect(storeOrigin('')).toBeNull()
  })

  it('valor inválido devolve `null` e NÃO lança — exceção aqui derrubaria /admin/home inteira', () => {
    expect(storeOrigin('nao-e-uma-url')).toBeNull()
    expect(() => storeOrigin('://quebrado')).not.toThrow()
    expect(storeOrigin('://quebrado')).toBeNull()
  })
})
