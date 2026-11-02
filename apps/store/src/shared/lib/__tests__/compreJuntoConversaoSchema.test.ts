import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BUY_TOGETHER_ADDONS_MAX } from '@estrelinha/core/buy-together'

/**
 * O guarda da migration que converte `products.buy_together_ids` em adicionais.
 *
 * É uma migration de DADO, e o dano de errar nela não aparece em build, `tsc` nem teste de
 * componente: converter sem recorte repetiria a conversão por cima do Compre Junto que a dona já
 * montou, e um `delete` ou `drop column` de carona apagaria o que o painel ainda lê. O guarda lê o
 * arquivo do disco, uma régua por comando, e o teto vem IMPORTADO de `@estrelinha/core/buy-together`.
 * O comportamento (ordem, descarte, idempotência) é do probe `02-conversao.sh`.
 *
 * Âncora: o arquivo é lido e cada extração devolve algo — uma que falha devolve `null` e REPROVA.
 * `mutar()` lança quando a mutação não muda nada.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const MIGRATION = join(ROOT, 'supabase/migrations/20261105130000_compre-junto-conversao.sql')
const SQL = readFileSync(MIGRATION, 'utf8')

const semComentario = (texto: string): string => texto.replace(/\r\n/g, '\n').replace(/--[^\n]*/g, '')
const LIMPO = semComentario(SQL)

const mutar = (texto: string, de: string | RegExp, para: string): string => {
  const mutante = texto.replace(de, para)
  if (mutante === texto) throw new Error(`mutação não encontrou o alvo: ${String(de).slice(0, 60)}…`)
  return mutante
}

const insereSoEmAdicionais = (t: string): boolean => {
  const inserts = [...t.matchAll(/insert\s+into\s+([\w.]+)/gi)].map(m => m[1])
  return inserts.length === 1 && inserts[0] === 'public.product_buy_together'
}
const tipoProduto = (t: string): boolean => /'product'\s*,\s*ranked\.target|,\s*'product'\s*,/i.test(t) && !/'list'/i.test(t)
const tetoDaConversao = (t: string): number | null => {
  const m = t.match(/where\s+ranked\.rn\s*<=\s*(\d+)/i)
  return m ? Number(m[1]) : null
}
const posicaoDaOrdem = (t: string): boolean => /\(\s*ranked\.rn\s*-\s*1\s*\)::integer/i.test(t)
const ordemDoArray = (t: string): boolean => /with\s+ordinality/i.test(t) && /order by[^)]*ord\b/i.test(t)
const descartaInexistente = (t: string): boolean =>
  /join\s+public\.products\s+t\s+on\s+t\.id\s*=\s*e\.target/i.test(t)
const descartaAPropria = (t: string): boolean => /e\.target\s*<>\s*p\.id/i.test(t)
const descartaRepetido = (t: string): boolean => /distinct\s+on\s*\(\s*p\.id\s*,\s*e\.target\s*\)/i.test(t)
const soConverteQuemNaoTem = (t: string): boolean =>
  /not\s+exists\s*\(\s*select\s+1\s+from\s+public\.product_buy_together\s+a\s+where\s+a\.product_id\s*=\s*p\.id\s*\)/i.test(t)
const semDestruicao = (t: string): boolean =>
  !/\b(delete\s+from|update\s+public|drop\s+column|drop\s+table|truncate|alter\s+table)\b/i.test(t)

describe('a migration que converte o Compre Junto antigo', () => {
  it('âncora: o arquivo foi lido e tem o insert', () => {
    expect(SQL.length).toBeGreaterThan(200)
    expect(LIMPO).toMatch(/insert\s+into/i)
  })

  it('só insere em product_buy_together, e só do tipo produto', () => {
    expect(insereSoEmAdicionais(LIMPO)).toBe(true)
    expect(tipoProduto(LIMPO)).toBe(true)
  })

  it('o teto é o dos adicionais (importado de core) e a posição sai do ranking, sem buraco', () => {
    expect(tetoDaConversao(LIMPO)).toBe(BUY_TOGETHER_ADDONS_MAX)
    expect(posicaoDaOrdem(LIMPO)).toBe(true)
  })

  it('segue a ordem do array', () => {
    expect(ordemDoArray(LIMPO)).toBe(true)
  })

  it('descarta id inexistente, a própria joia e a repetição', () => {
    expect(descartaInexistente(LIMPO)).toBe(true)
    expect(descartaAPropria(LIMPO)).toBe(true)
    expect(descartaRepetido(LIMPO)).toBe(true)
  })

  it('é idempotente por estado: só converte a joia sem adicional', () => {
    expect(soConverteQuemNaoTem(LIMPO)).toBe(true)
  })

  it('não apaga nem altera nada, e não derruba a coluna antiga', () => {
    expect(semDestruicao(LIMPO)).toBe(true)
  })

  describe('sensores: cada régua reprova a sua mutação', () => {
    it('insert em outra tabela', () => {
      expect(insereSoEmAdicionais(mutar(LIMPO, 'public.product_buy_together (', 'public.products ('))).toBe(false)
    })
    it('tipo lista', () => {
      expect(tipoProduto(mutar(LIMPO, "'product',", "'list',"))).toBe(false)
    })
    it('teto 4', () => {
      expect(tetoDaConversao(mutar(LIMPO, /rn\s*<=\s*3/, 'rn <= 4'))).not.toBe(BUY_TOGETHER_ADDONS_MAX)
    })
    it('posição sem o menos um', () => {
      expect(posicaoDaOrdem(mutar(LIMPO, '(ranked.rn - 1)', 'ranked.rn'))).toBe(false)
    })
    it('sem a ordem do array', () => {
      expect(ordemDoArray(mutar(LIMPO, /with\s+ordinality/i, ''))).toBe(false)
    })
    it('sem o join que descarta inexistente', () => {
      expect(descartaInexistente(mutar(LIMPO, 'join public.products t on t.id = e.target', ''))).toBe(false)
    })
    it('sem o descarte da própria joia', () => {
      expect(descartaAPropria(mutar(LIMPO, 'e.target <> p.id', 'true'))).toBe(false)
    })
    it('sem o descarte do repetido', () => {
      expect(descartaRepetido(mutar(LIMPO, 'distinct on (p.id, e.target)', ''))).toBe(false)
    })
    it('sem o recorte de quem já tem adicional', () => {
      expect(soConverteQuemNaoTem(mutar(LIMPO, /and not exists \(select 1 from public\.product_buy_together a where a\.product_id = p\.id\)/i, ''))).toBe(false)
    })
    it('com um delete de carona', () => {
      expect(semDestruicao(`${LIMPO}\ndelete from public.products;`)).toBe(false)
    })
    it('com o drop column', () => {
      expect(semDestruicao(`${LIMPO}\nalter table public.products drop column buy_together_ids;`)).toBe(false)
    })
  })
})
