// A dobra de busca: os casos dela moram com o dono, `packages/core/src/product-search/__tests__/`.
// Aqui fica a prova de que os antigos declarantes do painel leem a dobra do endereço do painel.

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('os antigos declarantes da dobra a leem de `shared/lib/texto` (que reexporta o dono de core)', () => {
  const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

  /**
   * Os dois arquivos que esta task converteu. O `ProductPicker` sai na T05, junto com a delegação
   * dele ao componente compartilhado — e o guarda de verdade (`BUS-22`, varredura do app inteiro)
   * nasce na T10. Aqui a régua é estreita e declarada: prova que a conversão **aconteceu**, e não
   * que ninguém mais no painel escreve a dobra.
   */
  const CONVERTIDOS = [
    'features/store-menu/ui/MenuIconPicker.tsx',
    'features/category-list/model/categoryTree.ts',
  ] as const

  const FONTES = CONVERTIDOS.map(caminho => ({
    caminho,
    fonte: readFileSync(resolve(RAIZ, caminho), 'utf8'),
  }))

  it('ÂNCORA: os dois arquivos foram lidos e não estão vazios', () => {
    // Sem ela um caminho errado varreria zero arquivo e as duas asserções de baixo passariam sobre
    // nada, que é a pior falha possível num teste que lê fonte (`L-021`).
    expect(FONTES).toHaveLength(2)
    expect(FONTES.every(f => f.fonte.length > 0)).toBe(true)
  })

  it('nenhum dos dois declara mais a dobra', () => {
    const culpados = FONTES.filter(f => /normalize\(\s*['"]NFD['"]\s*\)/.test(f.fonte))
    expect(culpados.map(c => c.caminho)).toEqual([])
  })

  it('os dois importam do dono', () => {
    // O par da asserção acima: apagar a dobra sem pôr o import no lugar deixaria a primeira verde e
    // o arquivo sem compilar.
    const semImport = FONTES.filter(f => !/from ['"]@\/shared\/lib\/texto['"]/.test(f.fonte))
    expect(semImport.map(c => c.caminho)).toEqual([])
  })
})
