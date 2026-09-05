import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_GENERAL,
  DEFAULT_GOOGLE_SHOPPING,
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

/**
 * A chave `google_shopping` nasceu na feature 30, então ela não está nas duas migrations
 * originais — mora na sua própria (`GSH-15`). O mesmo parser vale porque a migration 30
 * escreve o INSERT na mesma forma, de propósito.
 */
const SQL_GOOGLE = readFileSync(
  `${MIGRATIONS}/20260816130000_30-google-shopping.sql`,
  'utf8',
)
const googleSql = bloco(SQL_GOOGLE, 'google_shopping')

/**
 * `FRG-11` — a chave `shipping` ganhou `free_shipping_enabled` na feature 37, e o campo **não** está
 * nas duas migrations originais: ele mora na sua própria, no molde **aditivo** de `handling_days`
 * (`AD-017` venceu, então correção vem em migration nova, nunca em edição de arquivo já aplicado).
 *
 * O parser `bloco` acima não serve aqui, e a diferença não é cosmética: aquele lê um **INSERT**
 * (`('chave', jsonb_build_object(…))`), e este arquivo escreve um **UPDATE**
 * (`SET value = value || jsonb_build_object(…)`). Reusar `bloco` devolveria `{}` e o teste passaria
 * comparando vazio com vazio — a pior falha possível num teste que lê disco.
 */
const SQL_FRETE_GRATIS = readFileSync(
  `${MIGRATIONS}/20260905120000_37-frete-gratis-configuravel.sql`,
  'utf8',
)

/** Extrai o literal de `jsonb_build_object('<campo>', <literal>)` de um UPDATE aditivo. */
function campoAditivo(fonte: string, campo: string): string | number | boolean | undefined {
  const re = new RegExp(
    `jsonb_build_object\\(\\s*'${campo}',\\s*(?:'((?:[^']|'')*)'|(-?\\d+(?:\\.\\d+)?)|(true|false))\\s*\\)`,
  )
  const m = re.exec(fonte)
  if (!m) return undefined
  const [, texto, numero, booleano] = m
  if (texto !== undefined) return texto.replace(/''/g, "'")
  if (numero !== undefined) return Number(numero)
  return booleano === 'true'
}

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

  it('leu a migration da 30 e extraiu o bloco do Google Shopping', () => {
    expect(SQL_GOOGLE).toContain('jsonb_build_object')
    expect(Object.keys(googleSql).length).toBeGreaterThanOrEqual(4)
  })
})

describe('google_shopping — o interruptor diz o mesmo nos dois lados', () => {
  it('nasce desligado no SQL e no TypeScript', () => {
    expect(DEFAULT_GOOGLE_SHOPPING.enabled).toBe(false)
    expect(googleSql.enabled).toBe(false)
  })

  it('nasce sem histórico de ter sido ligado', () => {
    expect(DEFAULT_GOOGLE_SHOPPING.ever_enabled).toBe(false)
    expect(googleSql.ever_enabled).toBe(false)
  })

  it('o ID do Merchant Center é o da conta real, nos dois lados', () => {
    expect(DEFAULT_GOOGLE_SHOPPING.merchant_id).toBe('685367464')
    expect(googleSql.merchant_id).toBe(DEFAULT_GOOGLE_SHOPPING.merchant_id)
  })

  it('a categoria padrão do Google é a mesma nos dois lados', () => {
    expect(googleSql.default_product_category).toBe(
      DEFAULT_GOOGLE_SHOPPING.default_product_category,
    )
  })

  it('todo campo literal do SQL tem o mesmo valor no TypeScript', () => {
    const divergentes: string[] = []
    const doTs = DEFAULT_GOOGLE_SHOPPING as unknown as Record<string, unknown>
    for (const [campo, valor] of Object.entries(googleSql)) {
      if (!(campo in doTs)) continue
      if (doTs[campo] !== valor) {
        divergentes.push(`google_shopping.${campo}: SQL ${JSON.stringify(valor)} ≠ TS ${JSON.stringify(doTs[campo])}`)
      }
    }
    expect(divergentes).toEqual([])
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

describe('free_shipping_enabled — o interruptor diz o mesmo nos dois lados (FRG-11)', () => {
  it('leu a migration da 37 do disco', () => {
    // Âncora: sem ela, um caminho errado faria `campoAditivo` devolver `undefined` para tudo, e as
    // comparações abaixo passariam a comparar indefinido com indefinido.
    expect(SQL_FRETE_GRATIS).toContain('store_settings')
    expect(SQL_FRETE_GRATIS).toContain('jsonb_build_object')
  })

  it('o parser DISCRIMINA — campo ausente devolve undefined', () => {
    // Sensor embutido. Sem ele, um `campoAditivo` que devolvesse sempre `false` faria a asserção
    // seguinte passar por acidente, e o teste inteiro viraria decoração.
    expect(campoAditivo(SQL_FRETE_GRATIS, 'campo_que_nao_existe')).toBeUndefined()
    expect(campoAditivo(SQL_FRETE_GRATIS, 'free_shipping_enabled')).toBeDefined()
  })

  it('nasce DESLIGADO no SQL e no TypeScript', () => {
    // Decisão do usuário: o interruptor exige ato explícito da dona. Trocar um dos dois lados para
    // `true` reprova aqui — que é o ponto, porque divergir não quebraria mais nada.
    expect(DEFAULT_SHIPPING.free_shipping_enabled).toBe(false)
    expect(campoAditivo(SQL_FRETE_GRATIS, 'free_shipping_enabled')).toBe(false)
    expect(campoAditivo(SQL_FRETE_GRATIS, 'free_shipping_enabled')).toBe(
      DEFAULT_SHIPPING.free_shipping_enabled,
    )
  })

  it('a migration é ADITIVA — não apaga os outros campos da chave `shipping`', () => {
    // `SET value = jsonb_build_object(…)` sem o `value ||` trocaria a linha inteira, apagando
    // free_shipping_threshold, default_shipping_cost, origin_zip e handling_days de uma vez.
    expect(SQL_FRETE_GRATIS).toMatch(/SET\s+value\s*=\s*value\s*\|\|\s*jsonb_build_object/i)
  })

  it('a migration é IDEMPOTENTE — a segunda execução não desliga o que a dona ligou', () => {
    // Sem esta guarda, todo `db push` futuro sobrescreveria a escolha da Adri com `false`.
    expect(SQL_FRETE_GRATIS).toMatch(/NOT\s+value\s*\?\s*'free_shipping_enabled'/i)
  })

  it('a migration alcança a chave `shipping`, e só ela', () => {
    expect(SQL_FRETE_GRATIS).toMatch(/WHERE\s+key\s*=\s*'shipping'/i)
  })
})
