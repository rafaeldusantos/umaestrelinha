import { describe, expect, it } from 'vitest'
import { SUPPLIER_NAME_MAX, SUPPLIER_URL_MAX, supplierLinkLabel, supplierRefusal } from '../index.ts'

// Feature 80 — as frases são escritas por extenso de propósito: ler a constante aqui faria o teste
// concordar com qualquer texto.

describe('supplierRefusal (FOR-09, FOR-10)', () => {
  it('os dois vazios é "sem fornecedor", e pode', () => {
    expect(supplierRefusal('', '')).toBeNull()
    expect(supplierRefusal('   ', '  ')).toBeNull()
  })

  it('link sem nome é recusado', () => {
    expect(supplierRefusal('', 'https://exemplo.com/peca')).toBe('Informe o nome do fornecedor da peça')
    expect(supplierRefusal('  ', 'https://exemplo.com/peca')).toBe('Informe o nome do fornecedor da peça')
  })

  it('nome sem link pode', () => {
    expect(supplierRefusal('Ateliê Prata', '')).toBeNull()
  })

  it('link que não começa com http:// ou https:// é recusado', () => {
    for (const link of ['exemplo.com/peca', 'javascript:alert(1)', 'ftp://exemplo.com', 'www.exemplo.com']) {
      expect(supplierRefusal('Ateliê', link)).toBe('O link da peça precisa começar com http:// ou https://')
    }
  })

  it('http e https, em qualquer caixa, passam', () => {
    expect(supplierRefusal('Ateliê', 'https://exemplo.com/peca')).toBeNull()
    expect(supplierRefusal('Ateliê', 'http://exemplo.com')).toBeNull()
    expect(supplierRefusal('Ateliê', 'HTTPS://EXEMPLO.COM')).toBeNull()
  })

  it('os tetos: 120 no nome e 2000 no link, contados depois de aparar', () => {
    expect(SUPPLIER_NAME_MAX).toBe(120)
    expect(SUPPLIER_URL_MAX).toBe(2000)
    expect(supplierRefusal('a'.repeat(120), '')).toBeNull()
    expect(supplierRefusal(` ${'a'.repeat(120)} `, '')).toBeNull()
    expect(supplierRefusal('a'.repeat(121), '')).toBe('O nome do fornecedor tem no máximo 120 caracteres')
    const base = 'https://x.co/'
    expect(supplierRefusal('A', base + 'p'.repeat(2000 - base.length))).toBeNull()
    expect(supplierRefusal('A', base + 'p'.repeat(2001 - base.length))).toBe('O link da peça tem no máximo 2000 caracteres')
  })
})

describe('supplierLinkLabel (FOR-16, FOR-17)', () => {
  it('mostra o domínio sem www e o caminho', () => {
    expect(supplierLinkLabel('https://www.exemplo.com/item/123')).toBe('exemplo.com/item/123')
    expect(supplierLinkLabel('https://loja.exemplo.com/')).toBe('loja.exemplo.com')
  })

  it('corta o rótulo longo com reticências, no teto dado', () => {
    const rotulo = supplierLinkLabel(`https://exemplo.com/${'a'.repeat(80)}`, 20)
    expect(rotulo).toHaveLength(20)
    expect(rotulo.endsWith('…')).toBe(true)
    expect(rotulo.startsWith('exemplo.com/')).toBe(true)
  })

  it('link que não parseia volta como veio', () => {
    expect(supplierLinkLabel('nao-e-url')).toBe('nao-e-url')
  })
})
