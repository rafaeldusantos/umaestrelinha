import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  MATERIAL_STATUSES,
  type MaterialStatus,
  materialTransitionSources,
} from '@estrelinha/core/material'

/**
 * `MAT-08` — o guarda entre a máquina de estado escrita em **SQL** e a escrita em **TypeScript**.
 *
 * As duas existem, e as duas precisam existir:
 *
 * - o **SQL** (`set_material_status`) é a única ponta que uma requisição forjada não contorna;
 * - o **TypeScript** (`materialTransitionRefusal`) é o único que produz o motivo legível que a
 *   `AC 3` exige — motivo é texto de interface, e não sai de um `where`.
 *
 * Duas cópias da mesma regra é o "defeito 01" do projeto, e a contrapartida obrigatória é este
 * arquivo: ele **lê a migration do disco** e compara conjunto a conjunto. Editar as listas do SQL sem
 * editar o core (ou o contrário) derruba a suíte — que é exatamente o ponto.
 *
 * A falha que este teste precisa evitar em si mesmo é a pior de todas: um caminho errado varre zero,
 * as duas listas ficam vazias, a comparação passa e ninguém percebe. Daí a **âncora dupla**.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/**
 * O caminho por extenso. A régua nunca é o objeto medido: derivar este caminho de uma constante do
 * projeto faria a varredura encolher junto com o que ela deveria guardar.
 */
const MIGRATION = join(ROOT, 'supabase/migrations/20260811120000_22-material-afetivo.sql')

const SQL = readFileSync(MIGRATION, 'utf8')

/** Comentário não é código. Sem tirá-los, o texto que EXPLICA a regra entraria na medição dela. */
const semComentarios = (fonte: string): string => fonte.replace(/--[^\n]*/g, '')

/** O corpo de uma função `create or replace function public.<nome>` até o `$$;` que a fecha. */
const corpoDaFuncao = (fonte: string, nome: string): string => {
  const inicio = fonte.indexOf(`create or replace function public.${nome}`)
  if (inicio === -1) return ''
  const fim = fonte.indexOf('$$;', inicio)
  return fim === -1 ? fonte.slice(inicio) : fonte.slice(inicio, fim)
}

/**
 * As origens permitidas por alvo, como o SQL as declara:
 * `when 'material_recebido' then array['aguardando_material', …]`.
 */
const origensDoSql = (corpo: string): Map<string, string[]> => {
  const mapa = new Map<string, string[]>()
  const bloco = /when\s+'([a-z_]+)'\s+then\s+array\[([^\]]*)\]/g
  let m: RegExpExecArray | null
  while ((m = bloco.exec(corpo)) !== null) {
    const origens = [...m[2].matchAll(/'([a-z_]+)'/g)].map(match => match[1])
    mapa.set(m[1], origens)
  }
  return mapa
}

const CORPO_STATUS = semComentarios(corpoDaFuncao(SQL, 'set_material_status'))
const CORPO_TRACKING = semComentarios(corpoDaFuncao(SQL, 'set_material_tracking'))
const ORIGENS = origensDoSql(CORPO_STATUS)

describe('máquina de estado do material — âncora da leitura', () => {
  it('leu a migration de verdade: tem as duas RPCs', () => {
    expect(SQL.length).toBeGreaterThan(1000)
    expect(SQL).toContain('create or replace function public.set_material_status')
    expect(SQL).toContain('create or replace function public.set_material_tracking')
  })

  it('extraiu os cinco alvos do `case` — não uma lista vazia', () => {
    // Sem esta âncora, uma regex quebrada devolveria zero entradas, a comparação abaixo compararia
    // dois conjuntos vazios e o guarda passaria para sempre.
    expect(ORIGENS.size).toBe(5)
  })

  it('o parser REPROVA um SQL divergente — a prova de que ele pega', () => {
    const sintetico = `
      v_allowed := case p_status
        when 'material_recebido' then array['aguardando_material']
        else null
      end;
    `
    expect(origensDoSql(sintetico).get('material_recebido')).toEqual(['aguardando_material'])
    // E o de verdade tem três origens — se o parser lesse errado, este contraste não existiria.
    expect(ORIGENS.get('material_recebido')).toHaveLength(3)
  })
})

describe('máquina de estado do material — SQL × TypeScript (MAT-08)', () => {
  it.each(MATERIAL_STATUSES)(
    'o alvo `%s` tem no SQL exatamente as origens de `materialTransitionSources`',
    status => {
      const doSql = [...(ORIGENS.get(status) ?? [])].sort()
      const doCore = [...materialTransitionSources(status as MaterialStatus)].sort()

      expect(doSql, `divergência no alvo ${status}`).toEqual(doCore)
    },
  )

  it('todo estado citado no SQL existe em `MATERIAL_STATUSES`', () => {
    const citados = new Set<string>()
    for (const [alvo, origens] of ORIGENS) {
      citados.add(alvo)
      for (const origem of origens) citados.add(origem)
    }

    const desconhecidos = [...citados].filter(s => !MATERIAL_STATUSES.includes(s as MaterialStatus))
    expect(desconhecidos).toEqual([])
  })

  it('o SALTO DIRETO está no SQL: `material_recebido` aceita `aguardando_material`', () => {
    // É obrigatório, não atalho — informar o rastreio é opcional, então a maioria dos pedidos nunca
    // passa por `material_enviado`. Perder esta linha deixaria a Adri sem como registrar o caso mais
    // comum, e nenhum outro teste notaria.
    expect(ORIGENS.get('material_recebido')).toContain('aguardando_material')
  })

  it('o alvo é sempre origem de si mesmo — é o que torna a transição idempotente', () => {
    for (const [alvo, origens] of ORIGENS) {
      expect(origens, `${alvo} não é origem de si mesmo`).toContain(alvo)
    }
  })
})

describe('set_material_tracking escreve o campo de rastreio e NADA MAIS (MAT-11 AC 11)', () => {
  it.each(['payment_status', 'paid_at', 'total', 'subtotal', 'discount', 'coupon_id'])(
    'o corpo da RPC não menciona `%s`',
    coluna => {
      // A RPC existe porque `orders` NÃO tem policy de UPDATE para cliente (PAY-10). Se ela crescer
      // para escrever mais uma coluna, o buraco que a policy fechou reabre por dentro.
      expect(CORPO_TRACKING).not.toContain(coluna)
    },
  )

  it('o `update` da RPC toca só `material_tracking_code` e `material_status`', () => {
    const set = CORPO_TRACKING.slice(
      CORPO_TRACKING.indexOf('update public.orders'),
      CORPO_TRACKING.indexOf('where id = p_order_id'),
    )
    const colunas = [...set.matchAll(/(\w+)\s*=/g)].map(m => m[1])

    expect([...new Set(colunas)].sort()).toEqual(['material_status', 'material_tracking_code'])
  })

  it('a autorização exige identidade — admin OU dona do pedido', () => {
    expect(CORPO_TRACKING).toContain("public.has_role(auth.uid(), 'admin')")
    expect(CORPO_TRACKING).toContain('c.user_id = auth.uid()')
  })
})

describe('nenhuma policy de UPDATE em `orders` é aberta pela migration (PAY-10)', () => {
  it('a migration não cria policy de update em orders', () => {
    // O ponto inteiro de `MAT-11` ser RPC é este: abrir uma policy de UPDATE exporia
    // `payment_status` e os valores do pedido a quem só devia informar um código de rastreio.
    const sql = semComentarios(SQL).toLowerCase()
    expect(sql).not.toMatch(/create\s+policy[\s\S]{0,200}?for\s+update[\s\S]{0,200}?on\s+public\.orders/)
    expect(sql).not.toMatch(/on\s+public\.orders[\s\S]{0,120}?for\s+update/)
  })

  it('a migration concede execute só a `authenticated`, e revoga de `anon`', () => {
    const sql = semComentarios(SQL)
    for (const fn of ['set_material_status', 'set_material_tracking']) {
      expect(sql).toContain(`revoke all on function public.${fn}(uuid, text) from anon;`)
      expect(sql).toContain(`grant execute on function public.${fn}(uuid, text) to authenticated;`)
      expect(sql).not.toContain(`grant execute on function public.${fn}(uuid, text) to anon;`)
    }
  })
})
