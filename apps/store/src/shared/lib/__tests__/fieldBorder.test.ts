import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Borda de campo é Papelão (`nanita-rule`), nunca Dobra (`nanita-border`).
 *
 * A WCAG 1.4.11 pede 3:1 de contorno de controle. Sobre Papel, Dobra dá
 * **1,19:1** — o campo existe no DOM e não tem borda visível. É a razão de
 * `--nanita-rule` ser um token separado de `--nanita-border`: duas funções,
 * dois valores.
 *
 * Esta varredura lê o fonte real. Um teste de componente não pegaria: ele
 * assere nome de classe, e `border-nanita-border` é um nome de classe válido.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(HERE, '../../..')

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : tsxFiles(full)
    return entry.isFile() && entry.name.endsWith('.tsx') ? [full] : []
  })
}

/**
 * Um `<input>`, `<textarea>` ou `<select>` e as ~10 linhas de atributos que o
 * seguem — que é onde a `className` dele mora no estilo deste repo.
 */
function fieldBlocks(source: string): string[] {
  const lines = source.split('\n')
  const blocks: string[] = []

  lines.forEach((line, i) => {
    if (/<(input|textarea|select)\b/.test(line)) {
      blocks.push(lines.slice(i, i + 12).join('\n'))
    }
  })

  return blocks
}

describe('borda de campo — Papelão, não Dobra', () => {
  const files = tsxFiles(SRC)

  it('a varredura encontra os arquivos da loja', () => {
    // Sem esta âncora, um erro de caminho faria a suíte varrer zero arquivo e
    // passar em silêncio — a pior falha possível num teste de varredura.
    expect(files.length).toBeGreaterThan(50)
  })

  it('nenhum campo de formulário usa `border-nanita-border`', () => {
    const offenders = files.flatMap((file) => {
      const source = readFileSync(file, 'utf8')
      return fieldBlocks(source)
        .filter((block) => /border-nanita-border/.test(block))
        .map(() => relative(SRC, file).replace(/\\/g, '/'))
    })

    expect(offenders).toEqual([])
  })
})
