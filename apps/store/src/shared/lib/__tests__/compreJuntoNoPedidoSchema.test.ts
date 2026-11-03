import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * O guarda da migration que leva a marca "acompanha" do Compre Junto a `order_items`.
 *
 * Lê o `.sql` **do disco**, no molde de `orderNumberSchema`: afrouxar uma migration não quebra nada.
 * Uma coluna `not null` derrubaria todo pedido gravado por quem não manda a marca (a proposta do
 * painel, o bump, a function publicada antes do bundle); uma chave estrangeira com `restrict` para a
 * lista impediria a dona de apagar uma lista usada num pedido antigo, e com `cascade` apagaria o
 * histórico do relatório. As três aplicam limpo, e passam em build, `tsc` e teste de componente.
 *
 * Uma régua por COMANDO, cada uma um predicado exercido contra texto mutado, e `mutar()` que lança
 * quando não acha o alvo.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const CAMINHO = resolve(ROOT, 'supabase/migrations/20261106120000_compre-junto-no-pedido.sql')

const sql = readFileSync(CAMINHO, 'utf8')

/** Comentário de linha e de bloco na mesma varredura, fechando antes do `\r`. */
const semComentario = (texto: string): string => texto.replace(/\/\*[\s\S]*?\*\/|--[^\n\r]*/g, '')

const mutar = (texto: string, de: string | RegExp, para: string): string => {
  const mutante = texto.replace(de as string, para)
  if (mutante === texto) throw new Error(`mutação não encontrou o alvo: ${String(de).slice(0, 70)}…`)
  return mutante
}

const comandos = semComentario(sql)

/** As cláusulas `add column` do `alter table public.order_items`, uma por coluna. */
const clausula = (texto: string, coluna: string): string | null => {
  const alter = /alter\s+table\s+public\.order_items\s+([\s\S]*?);/i.exec(semComentario(texto))
  if (!alter) return null
  const partes = alter[1].split(',').map((p) => p.trim())
  return partes.find((p) => new RegExp(`\\b${coluna}(?![\\w])`, 'i').test(p)) ?? null
}

/** A coluna é acrescentada de forma reexecutável, com o tipo certo, e NULA (sem `not null` nem default). */
const colunaNulaAditiva = (texto: string, coluna: string, tipo: string): boolean => {
  const c = clausula(texto, coluna)
  if (!c) return false
  return (
    new RegExp(`^add\\s+column\\s+if\\s+not\\s+exists\\s+${coluna}\\s+${tipo}$`, 'i').test(c)
  )
}

/** Qualquer chave estrangeira (`references`) no arquivo. */
const temChaveEstrangeira = (texto: string): boolean => /\breferences\b/i.test(semComentario(texto))

const escreveDado = (texto: string): boolean =>
  /\b(insert\s+into|update\s+public\.|delete\s+from|truncate)\b/i.test(semComentario(texto))

const concede = (texto: string): boolean => /\bgrant\b/i.test(semComentario(texto))

describe('migration da marca no pedido — âncoras', () => {
  it('leu o arquivo certo', () => {
    expect(sql.length).toBeGreaterThan(300)
    expect(sql).toContain('order_items')
  })

  it('âncora de contagem: o alter e os dois comentários de coluna — três comandos', () => {
    const lista = comandos
      .split(';')
      .map((c) => c.trim())
      .filter((c) => c !== '')
    expect(lista).toHaveLength(3)
    expect(lista.filter((c) => /^comment\s+on\s+column\s+public\.order_items\./i.test(c))).toHaveLength(2)
  })
})

describe('as duas colunas', () => {
  it('os principais são TEXTO[] (porque `order_items.product_id` é texto) — todos os da linha —, nulos e aditivos', () => {
    expect(colunaNulaAditiva(sql, 'accompanies_product_ids', 'text\\[\\]')).toBe(true)
  })

  it('as listas são uuid[], alinhadas por posição, nulas e aditivas', () => {
    expect(colunaNulaAditiva(sql, 'accompanies_list_ids', 'uuid\\[\\]')).toBe(true)
  })

  it('sensor — sem `if not exists`, reprova', () => {
    const m = mutar(comandos, 'add column if not exists accompanies_product_ids', 'add column accompanies_product_ids')
    expect(colunaNulaAditiva(m, 'accompanies_product_ids', 'text\\[\\]')).toBe(false)
  })

  it('sensor — `not null` reprova', () => {
    const m = mutar(comandos, 'accompanies_list_ids uuid[]', 'accompanies_list_ids uuid[] not null')
    expect(colunaNulaAditiva(m, 'accompanies_list_ids', 'uuid\\[\\]')).toBe(false)
  })

  it('sensor — um `default` reprova', () => {
    const m = mutar(comandos, 'accompanies_product_ids text[]', "accompanies_product_ids text[] default '{}'")
    expect(colunaNulaAditiva(m, 'accompanies_product_ids', 'text\\[\\]')).toBe(false)
  })

  it('sensor — o principal como uuid[] reprova (o produto do pedido é texto)', () => {
    const m = mutar(comandos, 'accompanies_product_ids text[]', 'accompanies_product_ids uuid[]')
    expect(colunaNulaAditiva(m, 'accompanies_product_ids', 'text\\[\\]')).toBe(false)
  })

  it('sensor — voltar a uma coluna escalar (um principal por linha) reprova', () => {
    const m = mutar(comandos, 'accompanies_product_ids text[]', 'accompanies_product_ids text')
    expect(colunaNulaAditiva(m, 'accompanies_product_ids', 'text\\[\\]')).toBe(false)
  })
})

describe('sem chave estrangeira — apagar a lista nunca esbarra num pedido antigo', () => {
  it('nenhum `references`', () => {
    expect(temChaveEstrangeira(sql)).toBe(false)
  })

  it('sensor — uma FK para a lista, com qualquer regra de remoção, é acusada', () => {
    const m = mutar(
      comandos,
      'accompanies_list_ids uuid[]',
      'accompanies_list_ids uuid[] references public.buy_together_lists(id) on delete set null',
    )
    expect(temChaveEstrangeira(m)).toBe(true)
  })
})

describe('aditiva: sem dado e sem grant', () => {
  it('não escreve dado', () => {
    expect(escreveDado(sql)).toBe(false)
  })

  it('não concede nada', () => {
    expect(concede(sql)).toBe(false)
  })

  it('sensor — um backfill e um grant são acusados; a menção em comentário (CRLF e LF) não', () => {
    expect(escreveDado(`${sql}\nupdate public.order_items set accompanies_list_ids = null;`)).toBe(true)
    expect(concede(`${sql}\ngrant select on public.order_items to anon;`)).toBe(true)
    expect(escreveDado('-- insert into x\r\nselect 1;')).toBe(false)
    expect(concede('/* grant\n */ select 1;')).toBe(false)
  })
})
