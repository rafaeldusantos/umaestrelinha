import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_GENERAL,
  DEFAULT_PAYMENT,
  DEFAULT_SEO,
  DEFAULT_SHIPPING,
} from '@estrelinha/supabase/types/settings'

/**
 * Os defaults de `store_settings` são declarados em DOIS lugares — as migrations
 * `*_create_store_settings.sql`, que gravam a linha no banco, e
 * `packages/supabase/src/types/settings.ts`, que a loja usa enquanto a linha não
 * chega (e quando a chave não existe). É a mesma armadilha da paleta em dois
 * arquivos: divergir não quebra build, não quebra tipo e não quebra teste de
 * componente. A loja só mostra um nome antes do fetch e outro depois, e quem
 * descobre é a cliente.
 *
 * Este teste lê o SQL **do disco** e compara campo a campo — `COP-01`.
 *
 * As duas migrations são duplicatas byte-a-byte uma da outra e precisam
 * continuar sendo (`AD-017`): divergi-las cria um resultado que depende de qual
 * das duas roda por último no `db reset`.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS = resolve(HERE, '../../../../../../supabase/migrations')

const ARQUIVOS = [
  `${MIGRATIONS}/20260416000000_create_store_settings.sql`,
  `${MIGRATIONS}/20260417015945_create_store_settings.sql`,
]

const sql = ARQUIVOS.map((caminho) => readFileSync(caminho, 'utf8'))

/**
 * Extrai `('<chave>', jsonb_build_object( 'campo', 'valor', … ))` do INSERT.
 * Só valores literais entram — número, booleano e string entre aspas simples.
 */
function bloco(fonte: string, chave: string): Record<string, string | number | boolean> {
  const inicio = fonte.indexOf(`('${chave}', jsonb_build_object(`)
  if (inicio === -1) return {}
  const corpo = fonte.slice(inicio + `('${chave}', jsonb_build_object(`.length)
  const fim = corpo.indexOf('\n  ))')
  const campos: Record<string, string | number | boolean> = {}
  const par = /'([a-z_]+)',\s*(?:'((?:[^']|'')*)'|(-?\d+(?:\.\d+)?)|(true|false))/g
  let m: RegExpExecArray | null
  while ((m = par.exec(corpo.slice(0, fim === -1 ? undefined : fim))) !== null) {
    const [, campo, texto, numero, booleano] = m
    if (texto !== undefined) campos[campo] = texto.replace(/''/g, "'")
    else if (numero !== undefined) campos[campo] = Number(numero)
    else campos[campo] = booleano === 'true'
  }
  return campos
}

const geralSql = bloco(sql[0], 'general')
const seoSql = bloco(sql[0], 'seo')
const shippingSql = bloco(sql[0], 'shipping')
const paymentSql = bloco(sql[0], 'payment')

describe('defaults de store_settings — âncoras', () => {
  it('leu as duas migrations do disco', () => {
    // Sem esta âncora, um caminho errado faz o parser devolver `{}` para tudo,
    // e as comparações abaixo passam a comparar vazio com vazio.
    expect(sql).toHaveLength(2)
    for (const conteudo of sql) expect(conteudo).toContain('jsonb_build_object')
  })

  it('extraiu os quatro blocos do INSERT, com campos', () => {
    expect(Object.keys(geralSql).length).toBeGreaterThanOrEqual(5)
    expect(Object.keys(seoSql).length).toBeGreaterThanOrEqual(3)
    expect(Object.keys(shippingSql).length).toBeGreaterThanOrEqual(3)
    expect(Object.keys(paymentSql).length).toBeGreaterThanOrEqual(5)
  })

  it('as duas migrations continuam idênticas uma à outra', () => {
    expect(sql[0]).toBe(sql[1])
  })
})

describe('defaults de store_settings — o TypeScript diz o mesmo que o SQL', () => {
  it('store_name é o da Uma Estrelinha nos dois lados', () => {
    expect(DEFAULT_GENERAL.store_name).toBe('Uma Estrelinha')
    expect(geralSql.store_name).toBe(DEFAULT_GENERAL.store_name)
  })

  it('o e-mail de contato é o mesmo nos dois lados', () => {
    expect(DEFAULT_GENERAL.email).toBe('contato@umaestrelinha.com.br')
    expect(geralSql.email).toBe(DEFAULT_GENERAL.email)
  })

  it('o título de SEO é o mesmo nos dois lados', () => {
    expect(DEFAULT_SEO.title).toBe('Uma Estrelinha - Joias afetivas artesanais em resina')
    expect(seoSql.title).toBe(DEFAULT_SEO.title)
  })

  it('a descrição de SEO é a mesma nos dois lados', () => {
    expect(seoSql.description).toBe(DEFAULT_SEO.description)
  })

  it('todo campo que os dois lados declaram tem o mesmo valor', () => {
    const divergentes: string[] = []
    const pares: [string, Record<string, unknown>, Record<string, unknown>][] = [
      ['general', geralSql, DEFAULT_GENERAL as unknown as Record<string, unknown>],
      ['seo', seoSql, DEFAULT_SEO as unknown as Record<string, unknown>],
      ['shipping', shippingSql, DEFAULT_SHIPPING as unknown as Record<string, unknown>],
      ['payment', paymentSql, DEFAULT_PAYMENT as unknown as Record<string, unknown>],
    ]

    for (const [chave, doSql, doTs] of pares) {
      for (const [campo, valor] of Object.entries(doSql)) {
        if (!(campo in doTs)) continue
        if (doTs[campo] !== valor) {
          divergentes.push(`${chave}.${campo}: SQL ${JSON.stringify(valor)} ≠ TS ${JSON.stringify(doTs[campo])}`)
        }
      }
    }

    expect(divergentes).toEqual([])
  })
})

describe('defaults de store_settings — tom do negócio', () => {
  it('a mensagem do WhatsApp não usa linguagem festiva', () => {
    // A loja vende homenagem a quem morreu, leite materno e dente de leite.
    // A mensagem padrão é o primeiro texto que a cliente vê no WhatsApp.
    // Alternância, e não classe de caractere: emoji é par substituto, e dentro
    // de `[...]` o ESLint (no-misleading-character-class) recusa — com razão,
    // porque a classe casaria as METADES do par, não o emoji.
    expect(DEFAULT_GENERAL.whatsapp_message).not.toMatch(/🎉|🥳|✨|💖|drop|pin|botton/i)
    expect(DEFAULT_GENERAL.whatsapp_message.length).toBeGreaterThan(10)
  })
})
