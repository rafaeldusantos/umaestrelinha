import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * A rota do kit de pins saiu com a página (`PIN-04`), e o que sobra é a promessa de que
 * `/crie-seu-botton` cai na **404 própria da loja** e que nada mais aponta para ela.
 *
 * Nenhuma das duas coisas quebra sozinha: um `<Link to="/crie-seu-botton">` esquecido compila,
 * renderiza e só falha quando a cliente clica. Por isso a prova é a leitura do fonte — o mesmo
 * molde de `navItems.test.ts` no backoffice, que lê o `App.tsx` do disco.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(HERE, '../..')
const APP = readFileSync(resolve(SRC, 'app/App.tsx'), 'utf8')

const declaredRoutes = (): string[] =>
  [...APP.matchAll(/path="([^"]*)"/g)].map((match) => match[1])

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full)
    return entry.isFile() && /\.tsx?$/.test(entry.name) ? [full] : []
  })
}

describe('a rota do kit de pins saiu (PIN-04)', () => {
  it('`/crie-seu-botton` não é rota declarada — cai no `path="*"`, a 404 da loja', () => {
    expect(declaredRoutes()).not.toContain('/crie-seu-botton')
    // O curinga é o que transforma "rota inexistente" em 404 da loja, e não em tela em branco.
    expect(declaredRoutes()).toContain('*')
    expect(APP).toMatch(/path="\*"\s+element=\{<NotFound \/>\}/)
  })

  it('nenhum link interno aponta para a rota removida', () => {
    const files = sourceFiles(SRC)
    // Âncora de contagem: sem ela, um erro de caminho faz a varredura ler zero arquivo e passar.
    expect(files.length).toBeGreaterThan(100)

    const offenders = files
      .flatMap((file) =>
        readFileSync(file, 'utf8')
          .split('\n')
          .map((line, index) => ({ file, line: index + 1, text: line }))
          .filter((entry) => entry.text.includes('crie-seu-botton')),
      )
      .map((entry) => `${relative(SRC, entry.file)}:${entry.line} — ${entry.text.trim()}`)

    expect(offenders).toEqual([])
  })

  it('nada importa o kit de pins nem a prévia de mockup', () => {
    const files = sourceFiles(SRC)
    expect(files.length).toBeGreaterThan(100)

    const offenders = files
      .filter((file) => /custom-pin|mockup-preview|CustomPinPage/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(SRC, file))

    expect(offenders).toEqual([])
  })

  /**
   * `URL-01` — todo link de produto passa por `productPath`.
   *
   * O caminho canônico virou `/produtos/:slug` (`AD-018`). Um literal esquecido não quebra build,
   * tipo nem teste de componente: ele leva a cliente para a rota **legada**, que responde com um
   * salto a mais em dev e com 301 em produção. É o tipo de defeito que só aparece no relatório de
   * Search Console, meses depois.
   */
  it('nenhum arquivo monta link de produto com o caminho legado', () => {
    const files = sourceFiles(SRC).filter(
      // `App.tsx` é a exceção declarada: é lá que a rota legada é DECLARADA, para redirecionar.
      (file) => !file.endsWith('App.tsx'),
    )
    // Âncora dupla: a varredura leu arquivos de verdade E alcançou o arquivo que constrói o link.
    expect(files.length).toBeGreaterThan(100)
    expect(
      files.some((file) => file.replace(/\\/g, '/').endsWith('entities/product/ui/ProductCard.tsx')),
    ).toBe(true)

    const offenders = files
      .flatMap((file) =>
        readFileSync(file, 'utf8')
          .split('\n')
          .map((text, index) => ({ file, line: index + 1, text }))
          // As duas formas que constroem endereço: template com interpolação e string literal.
          .filter((entry) => /`\/produto\/\$\{|['"]\/produto\//.test(entry.text)),
      )
      .map((entry) => `${relative(SRC, entry.file)}:${entry.line} — ${entry.text.trim()}`)

    expect(offenders).toEqual([])
  })

  /**
   * `URL-03` — todo link de categoria passa por `categoryHref`/`categoryPath`.
   *
   * A canônica virou `/<slug>` na raiz e `/<pai>/<filha>` na subcategoria (`AD-018`). Um literal
   * `/colecao/<slug>` esquecido **continua abrindo a página**, porque o edge responde 301 — e é
   * justamente por isso que ninguém percebe: a loja passa a mandar a cliente por um salto a mais e
   * declara canônica diferente do link que ela clicou.
   */
  it('nenhum arquivo monta link de categoria com o caminho legado', () => {
    const files = sourceFiles(SRC).filter((file) => !file.endsWith('App.tsx'))
    expect(files.length).toBeGreaterThan(100)
    expect(
      files.some((file) => file.replace(/\\/g, '/').endsWith('widgets/footer/ui/Footer.tsx')),
    ).toBe(true)

    const offenders = files
      .flatMap((file) =>
        readFileSync(file, 'utf8')
          .split('\n')
          .map((text, index) => ({ file, line: index + 1, text }))
          .filter((entry) => /`\/colecao\/\$\{|['"]\/colecao\//.test(entry.text)),
      )
      .map((entry) => `${relative(SRC, entry.file)}:${entry.line} — ${entry.text.trim()}`)

    expect(offenders).toEqual([])
  })

  // PIN-07, mesma mecânica: `entities/review` era depoimento fabricado, sem tabela por trás.
  it('nada importa as avaliações de demonstração', () => {
    const files = sourceFiles(SRC)
    expect(files.length).toBeGreaterThan(100)

    const offenders = files
      .filter((file) => /entities\/review|useProductReviews|summarizeReviews/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(SRC, file))

    expect(offenders).toEqual([])
  })
})
