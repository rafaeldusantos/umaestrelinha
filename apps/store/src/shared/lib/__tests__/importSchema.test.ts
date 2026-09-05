import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * O guarda da migration da feature 35 — o espelho de clientes e pedidos da Nuvemshop.
 *
 * Lê o `.sql` **do disco**, como `materialTransitions`, `homeSections` e `faqSchema`. O motivo é o
 * mesmo dos três: afrouxar uma migration não quebra nada. Uma policy que perde o `has_role`, um
 * `security definer` que some, um `grant` que alcança `anon` — tudo isso aplica limpo, passa em
 * build, em `tsc` e em teste de componente. Quem descobre é quem for atacado.
 *
 * Cada asserção aqui tem um par: primeiro contra o arquivo real, depois contra uma **cópia mutada**,
 * para provar que a régua reprova o que deve reprovar. Sem o par, uma asserção que sempre passa é
 * indistinguível de uma que funciona.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const CAMINHO = resolve(ROOT, 'supabase/migrations/20260830120000_35-clientes-e-pedidos-nuvemshop.sql')

const sql = readFileSync(CAMINHO, 'utf8')
const minusculo = sql.toLowerCase()

// -------------------------------------------------------------------------------------------
// As réguas, como predicados — para poderem ser exercidas contra texto mutado
// -------------------------------------------------------------------------------------------

/** Índice único SIMPLES: sem `where`, senão vira parcial (e `L-018` diz o que isso custa). */
const indiceUnicoSimples = (texto: string): boolean => {
  const m = texto.toLowerCase().match(/create unique index[^;]*orders_nuvemshop_id_key[^;]*;/s)
  return m !== null && !m[0].includes('where')
}

/** Nenhum `grant` alcança `anon` — nem por curinga (`public`). */
const nenhumGrantParaAnon = (texto: string): boolean =>
  !/grant[^;]*\bto\b[^;]*\b(anon|public)\b/is.test(texto)

const funcaoComSecurityDefiner = (texto: string): boolean =>
  /create or replace function public\.handle_new_customer[^$]*security definer/is.test(texto)

/** A adoção só alcança pedido ÓRFÃO. Sem isto, um pedido trocaria de dono por coincidência. */
const adocaoRestritaAOrfao = (texto: string): boolean => {
  const m = texto.toLowerCase().match(/update public\.orders[^;]*;/s)
  return m !== null && m[0].includes('customer_id is null')
}

/** `lower()` nos DOIS lados: o arquivo real traz e-mail em caixa alta. */
const comparacaoPorLower = (texto: string): boolean =>
  /lower\(o\.customer_email\)\s*=\s*lower\(new\.email\)/i.test(texto)

const viewComSecurityInvoker = (texto: string): boolean =>
  /create or replace view public\.customer_directory\s*with \(security_invoker = true\)/is.test(texto)

/** O telefone da convidada não pode ser apagado por um pedido mais novo sem telefone. */
const agregadoFiltraNulo = (texto: string): boolean =>
  /array_agg\(o\.customer_phone[^)]*\)\s*filter \(where o\.customer_phone is not null\)/is.test(texto)

// -------------------------------------------------------------------------------------------

describe('âncora — o arquivo foi lido', () => {
  it('a migration existe e tem corpo', () => {
    // Caminho errado leria string vazia, e toda asserção de ausência passaria em VERDE.
    expect(sql.length).toBeGreaterThan(4000)
    expect(minusculo).toContain('alter table public.orders')
  })
})

describe('proveniência e idempotência', () => {
  it('`nuvemshop_id` é bigint — os ids reais passam de 2 bilhões', () => {
    expect(minusculo).toMatch(/add column if not exists nuvemshop_id bigint/)
  })

  it('o índice de idempotência é único e SIMPLES', () => {
    expect(indiceUnicoSimples(sql)).toBe(true)
  })

  it('SENSOR: um índice parcial reprova na mesma régua', () => {
    const mutado = sql.replace(
      'ON public.orders (nuvemshop_id);',
      'ON public.orders (nuvemshop_id) WHERE nuvemshop_id IS NOT NULL;',
    )
    expect(mutado).not.toBe(sql)
    expect(indiceUnicoSimples(mutado)).toBe(false)
  })

  it('as três colunas cruas existem e declaram que nenhuma tela as lê', () => {
    for (const coluna of ['nuvemshop_status', 'nuvemshop_payment_status', 'nuvemshop_shipping_status']) {
      expect(minusculo).toContain(`add column if not exists ${coluna} text`)
      expect(sql).toMatch(
        new RegExp(`comment on column public\\.orders\\.${coluna} is[^;]*NENHUMA TELA LE`, 'is'),
      )
    }
  })

  it('o contato do comprador entra no próprio pedido', () => {
    expect(minusculo).toContain('add column if not exists customer_phone text')
    expect(minusculo).toContain('add column if not exists customer_document text')
  })
})

describe('customer_directory v2', () => {
  it('mantém `security_invoker`', () => {
    expect(viewComSecurityInvoker(sql)).toBe(true)
  })

  it('SENSOR: perder o `security_invoker` reprova', () => {
    const mutado = sql.replace(
      'CREATE OR REPLACE VIEW public.customer_directory\nWITH (security_invoker = true) AS',
      'CREATE OR REPLACE VIEW public.customer_directory AS',
    )
    expect(mutado).not.toBe(sql)
    expect(viewComSecurityInvoker(mutado)).toBe(false)
  })

  it('o telefone da convidada filtra nulo antes de pegar o mais recente', () => {
    expect(agregadoFiltraNulo(sql)).toBe(true)
  })

  it('SENSOR: sem o filtro, a régua reprova', () => {
    const mutado = sql.replace(
      "(array_agg(o.customer_phone ORDER BY o.created_at DESC)\n       FILTER (WHERE o.customer_phone IS NOT NULL))[1]         AS phone,",
      '(array_agg(o.customer_phone ORDER BY o.created_at DESC))[1] AS phone,',
    )
    expect(mutado).not.toBe(sql)
    expect(agregadoFiltraNulo(mutado)).toBe(false)
  })

  it('a lista de colunas continua a mesma — por isso as views dependentes não caem', () => {
    // `customer_list` e `customer_stats` dependem desta view. `CREATE OR REPLACE VIEW` só aceita
    // quando nomes, tipos e ordem não mudam; mudar a lista obrigaria a derrubar as três.
    expect(minusculo).not.toContain('drop view')
    for (const coluna of ['has_account', 'first_seen', 'email_key']) {
      expect(minusculo).toContain(coluna)
    }
  })
})

describe('handle_new_customer — o reencontro por e-mail', () => {
  it('preserva `security definer`', () => {
    // Sem ele o UPDATE bate na RLS de `orders` (que não tem policy de UPDATE para cliente) e falha
    // CALADO: o cadastro dá certo e o histórico não aparece, sem erro nenhum.
    expect(funcaoComSecurityDefiner(sql)).toBe(true)
  })

  it('SENSOR: perder o `security definer` reprova', () => {
    const mutado = sql.replace('SECURITY DEFINER\nSET search_path', 'SET search_path')
    expect(mutado).not.toBe(sql)
    expect(funcaoComSecurityDefiner(mutado)).toBe(false)
  })

  it('o INSERT existente não mudou de forma', () => {
    expect(minusculo).toContain('on conflict (user_id) do nothing')
  })

  it('a adoção só alcança pedido órfão', () => {
    expect(adocaoRestritaAOrfao(sql)).toBe(true)
  })

  it('SENSOR: adoção sem o recorte de órfão reprova', () => {
    const mutado = sql.replace('WHERE o.customer_id IS NULL\n       AND lower', 'WHERE lower')
    expect(mutado).not.toBe(sql)
    expect(adocaoRestritaAOrfao(mutado)).toBe(false)
  })

  it('compara e-mail por `lower()` nos dois lados', () => {
    expect(comparacaoPorLower(sql)).toBe(true)
  })

  it('SENSOR: comparação crua reprova', () => {
    const mutado = sql.replace('lower(o.customer_email) = lower(new.email)', 'o.customer_email = new.email')
    expect(mutado).not.toBe(sql)
    expect(comparacaoPorLower(mutado)).toBe(false)
  })
})

describe('a migration não afrouxa nada', () => {
  it('nenhum `grant` alcança `anon` nem `public`', () => {
    expect(nenhumGrantParaAnon(sql)).toBe(true)
  })

  it('SENSOR: um grant para anon reprova', () => {
    const mutado = `${sql}\nGRANT SELECT ON public.orders TO anon;\n`
    expect(nenhumGrantParaAnon(mutado)).toBe(false)
  })

  it('não apaga nem reescreve migration anterior', () => {
    expect(minusculo).not.toContain('drop table')
    expect(minusculo).not.toContain('drop policy')
    expect(minusculo).not.toContain('drop trigger')
  })
})
