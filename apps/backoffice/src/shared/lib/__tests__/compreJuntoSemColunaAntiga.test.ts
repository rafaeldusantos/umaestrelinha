import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * `products.buy_together_ids` saiu do painel, e a coluna continua no banco.
 *
 * O Compre Junto da joia mora em `product_buy_together` (até três adicionais, cada um uma peça ou
 * uma lista). A coluna antiga só existe até uma migration futura derrubá-la, depois do deploy deste
 * painel. Se qualquer `insert`/`update` do painel ainda a mandar, o `drop column` vira `PGRST204` em
 * produção — com o produto sem salvar e nada na tela dizendo por quê. Build, `tsc` e teste de
 * componente passam com a chave ali: o tipo `Product` ainda a descreve, de propósito.
 *
 * A régua é por NOME e vale para tudo o que o painel escreve, testes inclusos: um fixture que a
 * nomeia é o primeiro passo para o envio voltar. **Allowlist de UM** — este arquivo, que precisa
 * escrever a forma proibida nos sensores.
 *
 * ÂNCORA DUPLA: a varredura leu arquivos **e** a régua encontra o que procura (o sensor). O escopo é
 * escrito por extenso, e nunca a constante que a regra deveria medir.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const PAINEL = resolve(HERE, '../../..')
const ESTE = 'shared/lib/__tests__/compreJuntoSemColunaAntiga.test.ts'
const NOME = 'buy_together_ids'

const arquivos = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const caminho = join(dir, e.name)
    if (e.isDirectory()) return arquivos(caminho)
    return /\.(ts|tsx)$/.test(e.name) ? [caminho] : []
  })

/** Comentário não é código: linha e bloco na MESMA varredura, com CRLF e LF. */
const semComentario = (texto: string): string =>
  texto.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')

const nomeiaAColuna = (texto: string): boolean => new RegExp(`(?<![\\w])${NOME}(?![\\w])`).test(semComentario(texto))

const LIDOS = arquivos(PAINEL).map(c => ({ caminho: relative(PAINEL, c).replace(/\\/g, '/'), texto: readFileSync(c, 'utf8') }))

describe('o painel não manda mais a coluna antiga do Compre Junto', () => {
  it('âncora: leu o painel inteiro, e o formulário, o hook e a listagem do produto estão entre os arquivos', () => {
    expect(LIDOS.length).toBeGreaterThan(300)
    const caminhos = LIDOS.map(l => l.caminho)
    expect(caminhos).toContain('pages/admin/AdminProductFormPage.tsx')
    expect(caminhos).toContain('features/product-form/model/useProductForm.ts')
    expect(caminhos).toContain('entities/product/api/useAdminProducts.ts')
    expect(caminhos).toContain('features/product-form/model/persistAddons.ts')
  })

  it('nenhum arquivo do painel — testes inclusos — nomeia a coluna', () => {
    const acusados = LIDOS.filter(l => l.caminho !== ESTE && nomeiaAColuna(l.texto)).map(l => l.caminho)
    expect(acusados).toEqual([])
  })

  it('sensor: o nome em chave de objeto, em acesso e em lista de colunas É acusado', () => {
    expect(nomeiaAColuna(`const payload = { ${NOME}: ids }`)).toBe(true)
    expect(nomeiaAColuna(`const x = row.${NOME} ?? []`)).toBe(true)
    expect(nomeiaAColuna(`select('id, ${NOME}, name')`)).toBe(true)
  })

  it('sensor: o nome só em comentário (linha, bloco, CRLF) NÃO é acusado, e nome parecido também não', () => {
    expect(nomeiaAColuna(`// ${NOME} saiu daqui\nconst x = 1`)).toBe(false)
    expect(nomeiaAColuna(`/* ${NOME}\n   continua no banco */ const x = 1`)).toBe(false)
    expect(nomeiaAColuna(`// ${NOME}\r\nconst x = 1\r\n`)).toBe(false)
    expect(nomeiaAColuna(`const x = { old_${NOME}: 1 }`)).toBe(false)
    expect(nomeiaAColuna(`const x = { ${NOME}_v2: 1 }`)).toBe(false)
  })
})
