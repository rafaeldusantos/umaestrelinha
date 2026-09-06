import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  PRODUCT_CARD_SELECT,
  PRODUCT_CARD_SELECT_BY_CATEGORY,
  PRODUCT_SELECT,
  PRODUCT_SELECT_BY_CATEGORY,
} from '../mapProduct'

/**
 * **Nenhum `select` nomeia uma coluna que uma migration renomeou para fora** — `PRF-08`.
 *
 * ## O defeito que este guarda existe para pegar, e que já aconteceu
 *
 * A feature 38 trocou o `select('*')` da listagem por uma lista explícita de colunas. Para montar a
 * lista, a fonte consultada foi o `mapDbToProduct` — que lê `p.stock ?? p.stock_total`. O `??` foi
 * lido como "as duas colunas existem", e `stock` entrou no `select`.
 *
 * `stock` **não existe**. Ela virou `stock_total` na migration
 * `20260726000000_products_extended_fields.sql`, e o que restou no mapper é um fallback de
 * intervalo de deploy — bundle velho contra banco novo. O PostgREST responde
 * **`400 · column products.stock does not exist`**, e a vitrine inteira fica vazia.
 *
 * ## Por que NADA pegou
 *
 * Nem o `tsc` (o `select` é uma string), nem o `build` (`vite build` não checa tipo), nem os testes
 * de componente e de hook — **eles mockam o client do Supabase**, então a resposta do banco é a que
 * o dublê inventa. É o `AD-012` na íntegra, agora do lado da leitura: *tipo escrito à mão — e
 * fallback escrito à mão — é afirmação, não verificação.*
 *
 * `PRODUCT_SELECT` nunca sofreu disso porque pede `*`: o `*` não pode nomear coluna errada.
 * Trocar `*` por lista explícita é justamente o que transforma um fallback tolerado em erro 400.
 *
 * ## A régua
 *
 * As migrations do disco são a autoridade. Cada `RENAME COLUMN a TO b` prova que `a` **deixou de
 * existir** — e nenhum `select` da loja pode nomeá-la. Não é preciso reconstruir o schema inteiro
 * (que exigiria interpretar `CREATE TABLE`, `ADD COLUMN` e DDL condicional em bloco `DO $$`, e um
 * parser frágil é pior que guarda nenhum): a classe de defeito medida é **coluna renomeada**, e é
 * ela que esta régua cobre.
 *
 * ÂNCORA DUPLA: prova que leu migrations **e** que encontrou renomeações. Só contar arquivos deixa
 * passar um regex quebrado; só procurar ocorrência deixa passar um caminho errado.
 *
 * A régua nunca é o objeto medido: o caminho das migrations está escrito **literalmente** aqui, e
 * não derivado de constante que o código sob teste exporte — lição da `fieldBorder`.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
/**
 * Escopo literal — a raiz do repositório, sete níveis acima deste arquivo:
 * `__tests__` → `lib` → `product` → `entities` → `src` → `store` → `apps` → raiz.
 *
 * A primeira escrita deste guarda errou por UM nível e apontou para `apps/supabase/migrations`.
 * O teste **quebrou alto** (`ENOENT`) em vez de varrer zero arquivo e passar — que é a pior falha
 * possível num guarda que lê o disco. É para isso que a âncora de contagem existe.
 */
const ROOT = resolve(HERE, '../../../../../../..')
const MIGRATIONS = join(ROOT, 'supabase', 'migrations')

/** Os quatro `select` que a loja manda ao PostgREST. */
const SELECTS = {
  PRODUCT_SELECT,
  PRODUCT_SELECT_BY_CATEGORY,
  PRODUCT_CARD_SELECT,
  PRODUCT_CARD_SELECT_BY_CATEGORY,
} as const

interface Rename {
  tabela: string
  de: string
  para: string
  arquivo: string
}

/**
 * `ALTER TABLE <tabela> … RENAME COLUMN a TO b` de todas as migrations.
 *
 * **A tabela é capturada, e isso não é detalhe.** Renomeação é por tabela: `products.stock` virou
 * `stock_total`, e `product_variants.stock` — que nunca foi tocada — continua existindo. Uma régua
 * que proibisse o nome `stock` em qualquer profundidade acusaria o embed de variação, que está
 * certo. Foi o primeiro erro desta régua, e ele fica registrado porque é o que faria alguém
 * afrouxá-la depois.
 *
 * `[\s\S]*?` entre `ALTER TABLE` e `RENAME COLUMN`: o SQL do projeto quebra linha no meio do
 * comando, e `.` não casa `\n`. `i` porque metade das migrations escreve o DDL em maiúscula.
 */
const renomeacoes = (): { renames: Rename[]; arquivosLidos: number } => {
  const arquivos = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql'))
  const renames: Rename[] = []
  const regex =
    /alter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?([a-z_][a-z0-9_]*)[\s\S]*?rename\s+column\s+([a-z_][a-z0-9_]*)\s+to\s+([a-z_][a-z0-9_]*)/gi

  for (const arquivo of arquivos) {
    const sql = readFileSync(join(MIGRATIONS, arquivo), 'utf8')
    for (const m of sql.matchAll(regex)) {
      renames.push({
        tabela: m[1].toLowerCase(),
        de: m[2].toLowerCase(),
        para: m[3].toLowerCase(),
        arquivo,
      })
    }
  }

  return { renames, arquivosLidos: arquivos.length }
}

/**
 * As colunas que um `select` do PostgREST nomeia, **agrupadas pela tabela de cada nível**.
 *
 * O nível de topo é `products`; cada `nome(...)` abre um nível cujo dono é a tabela `nome`. O alias
 * (`filtro:product_categories`) e a FK nomeada (`!products_category_id_fkey`) são descartados
 * antes — nenhum dos dois é coluna nem tabela.
 */
const colunasPorTabela = (select: string, tabelaRaiz = 'products'): Map<string, string[]> => {
  const limpo = select
    // `categories!products_category_id_fkey(...)` -> `categories(...)`
    .replace(/![a-z0-9_]+/gi, '')
    // `filtro:product_categories(...)` -> `product_categories(...)`
    .replace(/[a-z0-9_]+\s*:/gi, '')

  const porTabela = new Map<string, string[]>([[tabelaRaiz, []]])
  const pilha: string[] = [tabelaRaiz]
  let token = ''

  const fecharToken = (abrindoEmbed: boolean) => {
    const nome = token.trim().toLowerCase()
    token = ''
    if (nome === '' || nome === '*') return
    if (abrindoEmbed) {
      pilha.push(nome)
      if (!porTabela.has(nome)) porTabela.set(nome, [])
      return
    }
    porTabela.get(pilha[pilha.length - 1])!.push(nome)
  }

  for (const ch of limpo) {
    if (ch === '(') fecharToken(true)
    else if (ch === ')') {
      fecharToken(false)
      if (pilha.length > 1) pilha.pop()
    } else if (ch === ',') fecharToken(false)
    else token += ch
  }
  fecharToken(false)

  return porTabela
}

/** Todas as colunas nomeadas, sem agrupamento — usada só pelos sensores. */
const colunasNomeadas = (select: string): string[] =>
  [...colunasPorTabela(select).values()].flat()

const { renames, arquivosLidos } = renomeacoes()

describe('a varredura das migrations encontrou o que procura', () => {
  it('leu migrations do disco', () => {
    expect(arquivosLidos).toBeGreaterThan(30)
  })

  it('encontrou renomeações de coluna', () => {
    expect(renames.length).toBeGreaterThanOrEqual(5)
  })

  it('encontrou a renomeação que originou o defeito', () => {
    const stock = renames.find((r) => r.de === 'stock' && r.para === 'stock_total')
    expect(stock).toBeDefined()
    expect(stock!.arquivo).toBe('20260726000000_products_extended_fields.sql')
  })
})

/**
 * As colunas que saíram de circulação, **por tabela**. Um nome só é proibido naquela tabela se
 * nada o reintroduziu ali como destino de outra renomeação.
 */
const proibidasPorTabela = (): Map<string, Set<string>> => {
  const mapa = new Map<string, Set<string>>()
  for (const r of renames) {
    const reintroduzida = renames.some((o) => o.tabela === r.tabela && o.para === r.de)
    if (reintroduzida) continue
    if (!mapa.has(r.tabela)) mapa.set(r.tabela, new Set())
    mapa.get(r.tabela)!.add(r.de)
  }
  return mapa
}

/** As colunas de um select que a régua reprova, com a tabela de cada uma. */
const infracoes = (select: string): string[] => {
  const proibidas = proibidasPorTabela()
  const saida: string[] = []
  for (const [tabela, colunas] of colunasPorTabela(select)) {
    const fora = proibidas.get(tabela)
    if (!fora) continue
    for (const c of colunas) if (fora.has(c)) saida.push(`${tabela}.${c}`)
  }
  return saida
}

describe('nenhum select nomeia coluna que foi renomeada para fora', () => {
  it('há nome proibido a procurar — senão esta suíte não afirma nada', () => {
    expect([...(proibidasPorTabela().get('products') ?? [])]).toContain('stock')
  })

  for (const [nome, select] of Object.entries(SELECTS)) {
    it(`${nome} não pede nenhuma delas`, () => {
      expect(infracoes(select)).toEqual([])
    })
  }

  it('em especial, nenhum select pede `products.stock` — o defeito medido', () => {
    for (const select of Object.values(SELECTS)) {
      expect(colunasPorTabela(select).get('products')).not.toContain('stock')
    }
  })

  it('mas `stock_total`, que é o nome vivo, continua sendo pedido pelo card', () => {
    expect(colunasPorTabela(PRODUCT_CARD_SELECT).get('products')).toContain('stock_total')
  })

  it('e `product_variants.stock`, que NUNCA foi renomeada, segue permitida', () => {
    expect(colunasPorTabela(PRODUCT_CARD_SELECT).get('product_variants')).toContain('stock')
    expect(infracoes(PRODUCT_CARD_SELECT)).toEqual([])
  })
})

describe('sensores — a régua reprova o defeito que ela existe para pegar', () => {
  it('um select sintético com `products.stock` é REPROVADO', () => {
    expect(infracoes('id, name, stock, stock_total')).toEqual(['products.stock'])
  })

  it('o mesmo select sem `stock` PASSA — a régua não acusa qualquer coisa', () => {
    expect(infracoes('id, name, stock_total')).toEqual([])
  })

  it('`stock` DENTRO do embed de variação é permitido — a régua é por tabela', () => {
    expect(infracoes('id, product_variants(id, stock, price)')).toEqual([])
  })

  it('mas `stock` no topo continua reprovado mesmo com o embed presente', () => {
    expect(infracoes('id, stock, product_variants(id, stock)')).toEqual(['products.stock'])
  })

  it('a régua enxerga coluna dentro de embed, não só no topo', () => {
    const dentro = colunasPorTabela('id, product_variants(id, stock, price)')
    expect(dentro.get('product_variants')).toEqual(['id', 'stock', 'price'])
    expect(dentro.get('products')).toEqual(['id'])
  })

  it('a régua separa embed aninhado do nível de cima', () => {
    const mapa = colunasPorTabela('id, items:home_section_items(id, product:products(slug))')
    expect(mapa.get('home_section_items')).toEqual(['id'])
    expect(mapa.get('products')).toEqual(['id', 'slug'])
  })

  it('a régua não confunde alias de embed com coluna', () => {
    expect(colunasNomeadas('filtro:product_categories(category_id)')).not.toContain('filtro')
  })

  it('a régua não confunde o nome da FK com coluna', () => {
    const comFk = 'categories!products_category_id_fkey(slug)'
    expect(colunasNomeadas(comFk)).not.toContain('products_category_id_fkey')
    expect(colunasNomeadas(comFk)).toContain('slug')
  })

  it('`RENAME COLUMN` quebrado em várias linhas também é encontrado', () => {
    const sql = 'ALTER TABLE public.x\n  RENAME COLUMN\n  velho\n  TO\n  novo;'
    const m = [...sql.matchAll(/rename\s+column\s+([a-z_][a-z0-9_]*)\s+to\s+([a-z_][a-z0-9_]*)/gi)]
    expect(m).toHaveLength(1)
    expect(m[0][1]).toBe('velho')
  })
})
