import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { accessFor, forgetAccess, rememberAccess } from '../orderAccess'

/**
 * `PED-05`/`CSC-06` — o token de posse do pedido, no navegador de quem comprou sem conta.
 *
 * O que estes casos protegem é a **resiliência**, não a funcionalidade: guardar e ler um valor é
 * trivial, e o que não é trivial é não derrubar a página de confirmação logo depois de a cliente
 * pagar. `localStorage` lança em aba privada de alguns navegadores e com cookies de terceiros
 * bloqueados, e devolve lixo quando alguém edita a chave à mão.
 */

const KEY = 'estrelinha-order-access'

beforeEach(() => {
  globalThis.localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('orderAccess — o caminho normal', () => {
  it('guarda e lê o acesso de um pedido', () => {
    rememberAccess('ord-1', 'tok-abc')

    expect(accessFor('ord-1')).toBe('tok-abc')
  })

  it('guarda vários pedidos sem um apagar o outro', () => {
    // Uma implementação que gravasse um par solto (e não um mapa) perderia o primeiro na segunda
    // compra — e a cliente abriria a confirmação antiga em branco.
    rememberAccess('ord-1', 'tok-1')
    rememberAccess('ord-2', 'tok-2')

    expect(accessFor('ord-1')).toBe('tok-1')
    expect(accessFor('ord-2')).toBe('tok-2')
  })

  it('pedido sem acesso guardado devolve `null`', () => {
    expect(accessFor('ord-desconhecido')).toBeNull()
  })

  it('esquecer remove só aquele pedido', () => {
    rememberAccess('ord-1', 'tok-1')
    rememberAccess('ord-2', 'tok-2')
    forgetAccess('ord-1')

    expect(accessFor('ord-1')).toBeNull()
    expect(accessFor('ord-2')).toBe('tok-2')
  })

  it('esquecer um pedido que não existe não quebra nem apaga o resto', () => {
    rememberAccess('ord-1', 'tok-1')
    forgetAccess('ord-fantasma')

    expect(accessFor('ord-1')).toBe('tok-1')
  })

  it('id ou token vazio não gravam entrada nenhuma', () => {
    rememberAccess('', 'tok')
    rememberAccess('ord-1', '')

    expect(globalThis.localStorage.getItem(KEY)).toBeNull()
    expect(accessFor('ord-1')).toBeNull()
  })
})

describe('orderAccess — o storage hostil', () => {
  it('`localStorage` que LANÇA na leitura devolve `null` em vez de derrubar a página', () => {
    // O pior momento possível para uma tela branca é logo depois de a cliente pagar.
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })

    expect(accessFor('ord-1')).toBeNull()
  })

  it('`localStorage` que LANÇA na escrita não derruba a compra', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    expect(() => rememberAccess('ord-1', 'tok-1')).not.toThrow()
  })

  it('lixo no storage não vira um terceiro estado', () => {
    // Nem exceção, nem valor inventado: quem lê recebe "não há acesso", que é a verdade.
    globalThis.localStorage.setItem(KEY, 'isto não é json')

    expect(accessFor('ord-1')).toBeNull()
  })

  it('um array gravado na chave não é lido como mapa', () => {
    // `typeof [] === 'object'` — sem o recorte de array, `['a'][ 'ord-1' ]` daria `undefined` por
    // acaso hoje e algo pior no dia em que a chave recebesse índices numéricos.
    globalThis.localStorage.setItem(KEY, '["tok-1"]')

    expect(accessFor('ord-1')).toBeNull()
  })

  it('valor não-texto sob o id não é devolvido como token', () => {
    globalThis.localStorage.setItem(KEY, JSON.stringify({ 'ord-1': 42 }))

    expect(accessFor('ord-1')).toBeNull()
  })
})
