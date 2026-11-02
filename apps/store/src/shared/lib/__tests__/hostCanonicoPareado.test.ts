import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { canonicalHost } from '@estrelinha/core/analytics/host'

import { ROOT, blocoDaFuncao, lerMigration, mutar, semComentario } from './visitasRegras'

/**
 * Cópia deliberada: `store_canonical_host` (SQL, na migration da presença na loja) é a cópia de
 * `canonicalHost` (`packages/core/src/analytics/host.ts`). O banco decide "este pulso veio do host de
 * produção?" dentro da gravação, e o navegador e o GA4 decidem a mesma pergunta pelo TypeScript — duas
 * escritas que divergiriam sem nada quebrar: a loja contaria uma origem que o servidor recusa.
 *
 * Três metades, cada uma com sensor:
 * 1. os PASSOS, lidos do disco nos dois arquivos, na mesma ordem (aparar, minúsculas, cortar a partir do
 *    último `:` salvo com `]`, um ponto final, o `www.` da frente);
 * 2. os CASOS DE BORDA executados no TypeScript;
 * 3. os MESMOS casos, com o mesmo esperado, escritos no probe que os executa no Postgres local
 *    (`.specs/work-items/90-loja-ao-vivo-presenca/probes/01-presenca.sql`) — o SQL não roda nesta suíte.
 */

const MIGRATION = '20261104120000_presenca-na-loja.sql'
const TS = resolve(ROOT, 'packages/core/src/analytics/host.ts')
const PROBE = resolve(ROOT, '.specs/work-items/90-loja-ao-vivo-presenca/probes/01-presenca.sql')

const sql = lerMigration(MIGRATION)
const fonteTs = readFileSync(TS, 'utf8').replace(/\r\n/g, '\n')
const probe = readFileSync(PROBE, 'utf8').replace(/\r\n/g, '\n')

/** [entrada, esperado] — escritos por extenso; a régua nunca recalcula o esperado. */
const CASOS: [string, string][] = [
  ['UmaEstrelinha.com.br', 'umaestrelinha.com.br'],
  ['www.umaestrelinha.com.br:443', 'umaestrelinha.com.br'],
  ['umaestrelinha.com.br.', 'umaestrelinha.com.br'],
  ['  WWW.Umaestrelinha.com.br  ', 'umaestrelinha.com.br'],
  ['localhost:8082', 'localhost'],
  ['x.com:', 'x.com'],
  ['x.com:abc', 'x.com'],
  ['a:b:c', 'a:b'],
  ['[::1]:8080', '[::1]:8080'],
  ['www.', 'www'],
  ['', ''],
]

/** Os passos do SQL, em ordem; `null` quando um falta ou está fora de ordem. */
const passosDoSql = (texto: string): boolean => {
  const b = blocoDaFuncao(texto, 'store_canonical_host')
  if (!b) return false
  const passos = [
    /lower\(\s*regexp_replace\(\s*coalesce\(\s*p_host\s*,\s*''\s*\)\s*,\s*'\^\\s\+\|\\s\+\$'\s*,\s*''\s*,\s*'g'\s*\)\s*\)/,
    /if\s+position\(\s*':'\s+in\s+h\s*\)\s*>\s*0\s+and\s+position\(\s*'\]'\s+in\s+h\s*\)\s*=\s*0\s+then\s+h\s*:=\s*regexp_replace\(\s*h\s*,\s*':\[\^:\]\*\$'\s*,\s*''\s*\)/,
    /if\s+right\(\s*h\s*,\s*1\s*\)\s*=\s*'\.'\s+then\s+h\s*:=\s*left\(\s*h\s*,\s*-1\s*\)/,
    /if\s+left\(\s*h\s*,\s*4\s*\)\s*=\s*'www\.'\s+then\s+h\s*:=\s*substr\(\s*h\s*,\s*5\s*\)/,
  ]
  let desde = 0
  for (const p of passos) {
    const m = p.exec(b.slice(desde))
    if (!m) return false
    desde += m.index + m[0].length
  }
  return true
}

/** Os mesmos passos no TypeScript, na mesma ordem. */
const passosDoTs = (texto: string): boolean => {
  const codigo = texto.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')
  const inicio = codigo.indexOf('function canonicalHost(')
  if (inicio < 0) return false
  const corpo = codigo.slice(inicio, codigo.indexOf('\n}', inicio))
  const passos = [
    /host\.trim\(\)\.toLowerCase\(\)/,
    /lastIndexOf\(':'\)/,
    /porta\s*!==\s*-1\s*&&\s*!h\.includes\('\]'\)\)\s*h\s*=\s*h\.slice\(0,\s*porta\)/,
    /h\.endsWith\('\.'\)\)\s*h\s*=\s*h\.slice\(0,\s*-1\)/,
    /h\.startsWith\('www\.'\)\)\s*h\s*=\s*h\.slice\(4\)/,
  ]
  let desde = 0
  for (const p of passos) {
    const m = p.exec(corpo.slice(desde))
    if (!m) return false
    desde += m.index + m[0].length
  }
  return true
}

const casoNoProbe = (texto: string, [entrada, esperado]: [string, string]): boolean =>
  semComentario(texto).includes(`public.store_canonical_host('${entrada}') = '${esperado}'`)

describe('store_canonical_host (SQL) × canonicalHost (TypeScript) — a cópia deliberada', () => {
  it('âncora: os três arquivos foram lidos', () => {
    expect(blocoDaFuncao(sql, 'store_canonical_host')).not.toBeNull()
    expect(fonteTs).toContain('function canonicalHost(')
    expect(probe).toContain('store_canonical_host')
  })

  it('os passos, na mesma ordem, nos dois arquivos', () => {
    expect(passosDoSql(sql)).toBe(true)
    expect(passosDoTs(fonteTs)).toBe(true)
  })

  it.each(CASOS)('TypeScript: [%s] ⇒ [%s]', (entrada, esperado) => {
    expect(canonicalHost(entrada)).toBe(esperado)
  })

  it('TypeScript: nulo ⇒ vazio (o `coalesce` do SQL)', () => {
    expect(canonicalHost(null)).toBe('')
  })

  it.each(CASOS)('o probe executa no SQL o mesmo caso: [%s] ⇒ [%s]', (entrada, esperado) => {
    expect(casoNoProbe(probe, [entrada, esperado])).toBe(true)
  })

  describe('sensores', () => {
    it('a cópia antiga do SQL (só a porta numérica, sem a regra do `]`) reprova', () => {
      const antiga = mutar(semComentario(sql), /if\s+position\(\s*':'[\s\S]*?end if;/, "h := regexp_replace(h, ':[0-9]*$', '');")
      expect(passosDoSql(antiga)).toBe(false)
    })

    it('a ordem trocada no SQL (o `www.` antes da porta) reprova', () => {
      const b = blocoDaFuncao(sql, 'store_canonical_host')!
      const www = b.match(/ {2}if left\(h, 4\) = 'www\.' then[\s\S]*?end if;\n/)![0]
      const trocada = mutar(semComentario(sql), b, b.replace(www, '').replace('begin\n', `begin\n${www}`))
      expect(passosDoSql(trocada)).toBe(false)
    })

    it('o TypeScript sem a regra do `]` reprova', () => {
      expect(passosDoTs(mutar(fonteTs, " && !h.includes(']')", ''))).toBe(false)
    })

    it('um caso com o esperado trocado no probe reprova', () => {
      const trocado = mutar(probe, "store_canonical_host('x.com:abc') = 'x.com'", "store_canonical_host('x.com:abc') = 'x.com:abc'")
      expect(casoNoProbe(trocado, ['x.com:abc', 'x.com'])).toBe(false)
    })

    it('o caso citado só em comentário no probe não conta', () => {
      expect(casoNoProbe("-- public.store_canonical_host('a:b:c') = 'a:b'\n", ['a:b:c', 'a:b'])).toBe(false)
    })
  })
})
