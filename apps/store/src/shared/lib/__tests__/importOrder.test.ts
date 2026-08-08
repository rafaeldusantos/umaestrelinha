import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * A loja e o backoffice convivem com paletas diferentes, e a única coisa que
 * separa as duas é a **ordem de dois imports** em `main.tsx`.
 *
 * `@nanapin/ui/styles.css` traz os `--nana-*` do backoffice (roxo/rosa/navy).
 * `app/App.css` traz a papelaria e sobrescreve aqueles tokens. Como as duas
 * folhas declaram as mesmas custom properties com a mesma especificidade, quem
 * vence é a que vem depois.
 *
 * Inverter os dois devolve a loja INTEIRA à paleta do backoffice, e nada
 * acusaria: o build passa, o tipo passa, e todo teste de componente passa —
 * eles asseveram nome de classe, e o nome não muda. Só a tela muda.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const MAIN = resolve(HERE, '../../../main.tsx')

describe('ordem de import do tema da loja', () => {
  const source = readFileSync(MAIN, 'utf8')

  const packageStyles = source.indexOf('@nanapin/ui/styles.css')
  const storeStyles = source.indexOf('./app/App.css')

  it('`main.tsx` importa as duas folhas', () => {
    expect(packageStyles).toBeGreaterThan(-1)
    expect(storeStyles).toBeGreaterThan(-1)
  })

  it('`app/App.css` vem DEPOIS de `@nanapin/ui/styles.css`', () => {
    expect(storeStyles).toBeGreaterThan(packageStyles)
  })
})
