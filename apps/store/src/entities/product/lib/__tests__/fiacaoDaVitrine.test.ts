import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * **A fiação que nenhum teste de componente alcança** — `PRF-03` AC 1 e `PRF-08` AC 2.
 *
 * Este guarda existe por causa de duas lacunas que o Verifier independente da feature 38 encontrou
 * por injeção de falha, e as duas têm a mesma assinatura: **remover a fiação e a suíte inteira
 * continua verde.**
 *
 * ## Lacuna 1 — o índice da listagem (`PRF-03`)
 *
 * `imagePriority` decide, pelo índice, quais cards nascem ansiosos e sem opacidade zero. Quem
 * passa o índice é a página. O Verifier apagou `index={i}` da `CategoryPage` e rodou os **2234
 * testes do store**: todos passaram. Sem o índice, todo card volta a `loading="lazy"` + animação
 * de entrada — os três mecanismos que esta feature existe para remover, e justamente na listagem
 * que mediu **LCP de 15,6 s**.
 *
 * O `ProductCard` tem teste para cada valor de índice; o que não havia era prova de que **alguém
 * passa** o índice. Teste de componente monta o card com a prop na mão, então a fiação da página
 * é invisível para ele.
 *
 * ## Lacuna 2 — o select da página do produto (`PRF-08` AC 2)
 *
 * A feature criou um select enxuto **sem `description`** para as listagens. A página do produto
 * tem de continuar no completo, porque ali a descrição é o conteúdo. O Verifier trocou
 * `PRODUCT_SELECT` por `PRODUCT_CARD_SELECT` em `useProduct.ts` e os 2234 testes passaram — e o
 * efeito real seria a descrição de **todo** produto sumir da loja, porque `mapDbToProduct`
 * coalesce o campo ausente para `''` e o acordeão simplesmente não renderiza a seção.
 *
 * É o `AD-012` do lado da leitura, de novo: coluna que não vem não é erro, é vazio silencioso.
 *
 * ## A régua
 *
 * Lê o fonte do disco. Não há como provar isto por render: a `CategoryPage` real puxa catálogo,
 * categorias, filtros e janela, e o `useProduct` real fala com o client. Ler o arquivo é o mesmo
 * caminho de `reservedSlugs.test.ts` e `previaUnica.test.ts`.
 *
 * ÂNCORA DUPLA: prova que leu os arquivos **e** que encontrou o que procura. O escopo está
 * escrito **literalmente** aqui, nunca derivado de constante que o código sob teste exporte.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
/** `__tests__` → `lib` → `product` → `entities` → `src` → a raiz do app. */
const STORE_SRC = resolve(HERE, '../../../..')

const ler = (rel: string): string => readFileSync(join(STORE_SRC, rel), 'utf8')

/**
 * Remove comentário de linha preservando a numeração.
 *
 * `(^|[^:])` antes do `//` — sem isso, o `//` de qualquer `https://` faz a régua apagar o resto da
 * linha. O molde original deste projeto (`freeShippingSingleOwner.test.ts`) tem esse defeito; ali
 * é inofensivo porque a régua procura nome de coluna, mas copiado para procurar URL vira um guarda
 * inerte. CRLF normalizado **primeiro**, porque num checkout Windows `.` não casa `\r` e o
 * comentário não seria removido.
 */
const semComentarios = (fonte: string): string =>
  fonte
    .split('\r\n')
    .join('\n')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/\/\*[\s\S]*?\*\//g, '')

const CATEGORY_PAGE = 'pages/CategoryPage.tsx'
const USE_PRODUCT = 'entities/product/api/useProduct.ts'

const categoria = semComentarios(ler(CATEGORY_PAGE))
const useProduct = semComentarios(ler(USE_PRODUCT))

describe('a varredura leu os arquivos que diz ler', () => {
  it('a CategoryPage foi lida e tem corpo', () => {
    expect(categoria.length).toBeGreaterThan(2000)
    expect(categoria).toContain('CategoryPage')
  })

  it('o useProduct foi lido e tem corpo', () => {
    expect(useProduct.length).toBeGreaterThan(500)
    expect(useProduct).toContain('useProduct')
  })
})

describe('a listagem passa o índice ao card (PRF-03 AC 1)', () => {
  /** `<ProductCard … index={…} />`, em qualquer ordem de props e com quebra de linha no meio. */
  const CARD_COM_INDICE = /<ProductCard\b[^>]*\bindex=\{/

  it('a CategoryPage renderiza `ProductCard`', () => {
    expect(categoria).toMatch(/<ProductCard\b/)
  })

  it('e passa `index` — sem isto, todo card volta a lazy e opacidade zero', () => {
    expect(categoria).toMatch(CARD_COM_INDICE)
  })

  it('o índice vem do `map`, e não de um literal', () => {
    // Um `index={0}` cravado faria TODOS os cards serem o primeiro, e o `fetchpriority="high"`
    // sairia repetido — o navegador ignora a dica quando ela não distingue nada.
    expect(categoria).not.toMatch(/<ProductCard\b[^>]*\bindex=\{\s*\d+\s*\}/)
    expect(categoria).toMatch(/\.map\(\s*\(\s*\w+\s*,\s*(\w+)\s*\)/)
  })

  describe('sensores — a régua reprova a remoção que o Verifier fez', () => {
    it('`<ProductCard product={p} />` sem índice é REPROVADO', () => {
      expect('<ProductCard key={p.id} product={p} />').not.toMatch(CARD_COM_INDICE)
    })

    it('`<ProductCard product={p} index={i} />` PASSA', () => {
      expect('<ProductCard key={p.id} product={p} index={i} />').toMatch(CARD_COM_INDICE)
    })

    it('props quebradas em várias linhas continuam sendo encontradas', () => {
      expect('<ProductCard\n  product={p}\n  index={i}\n/>').toMatch(CARD_COM_INDICE)
    })

    it('a régua não casa o índice de OUTRO componente', () => {
      expect('<OutraCoisa index={i} />\n<ProductCard product={p} />').not.toMatch(CARD_COM_INDICE)
    })
  })
})

describe('a página do produto continua no select COMPLETO (PRF-08 AC 2)', () => {
  it('`useProduct.ts` importa `PRODUCT_SELECT`', () => {
    expect(useProduct).toMatch(/\bPRODUCT_SELECT\b/)
  })

  it('e NÃO usa nenhum dos selects enxutos — a descrição é o conteúdo desta página', () => {
    expect(useProduct).not.toMatch(/\bPRODUCT_CARD_SELECT\b/)
  })

  it('todo `.select(...)` do arquivo usa o completo', () => {
    const selects = [...useProduct.matchAll(/\.select\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/g)].map(
      (m) => m[1],
    )
    expect(selects.length).toBeGreaterThanOrEqual(2)
    expect(new Set(selects)).toEqual(new Set(['PRODUCT_SELECT']))
  })

  describe('sensores — a régua reprova a troca que o Verifier fez', () => {
    const enxuto = /\bPRODUCT_CARD_SELECT\b/

    it('um arquivo sintético com o select enxuto é REPROVADO', () => {
      expect("import { PRODUCT_CARD_SELECT } from '../lib/mapProduct'").toMatch(enxuto)
    })

    it('o mesmo arquivo com o completo PASSA', () => {
      expect("import { PRODUCT_SELECT } from '../lib/mapProduct'").not.toMatch(enxuto)
    })

    it('a régua distingue o nome exato das variantes com sufixo', () => {
      // `_` é caractere de palavra, então `\bPRODUCT_SELECT\b` **não** casa
      // `PRODUCT_SELECT_BY_CATEGORY` — e é isso que faz a régua ser sobre o nome exato. A primeira
      // escrita deste sensor afirmou o contrário e reprovou; fica registrado porque a intuição
      // errada é fácil de ter de novo.
      expect('PRODUCT_SELECT_BY_CATEGORY').not.toMatch(/\bPRODUCT_SELECT\b/)
      expect('PRODUCT_CARD_SELECT_BY_CATEGORY').not.toMatch(/\bPRODUCT_SELECT\b/)
      expect('const x = PRODUCT_SELECT').toMatch(/\bPRODUCT_SELECT\b/)
    })

    it('e o `useProduct` real casa a régua porque usa o nome NU', () => {
      // A asserção principal desta suíte depende disto: se o arquivo passasse a usar só
      // `PRODUCT_SELECT_BY_CATEGORY`, a régua não o encontraria e a suíte reprovaria — que é o
      // comportamento certo, porque a página do produto não filtra por categoria.
      expect(useProduct).toMatch(/\.select\(\s*PRODUCT_SELECT\s*\)/)
    })
  })
})

describe('o removedor de comentário não engole URL', () => {
  it('mantém a linha de código que vem depois de um `https://` num comentário', () => {
    const fonte = 'const a = 1 // veja https://exemplo.com/x\nconst b = 2'
    expect(semComentarios(fonte)).toContain('const b = 2')
    expect(semComentarios(fonte)).toContain('const a = 1')
  })

  it('não apaga a URL dentro de uma string de código', () => {
    expect(semComentarios("const u = 'https://exemplo.com/x'")).toContain('exemplo.com')
  })

  it('funciona com CRLF e com LF', () => {
    expect(semComentarios('const a = 1 // nota\r\nconst b = 2')).toContain('const b = 2')
    expect(semComentarios('const a = 1 // nota\nconst b = 2')).toContain('const b = 2')
  })
})
