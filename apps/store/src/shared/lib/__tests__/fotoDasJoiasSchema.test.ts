// 2026-10-26 — `store_overview` recriada com a foto das "Joias mais pedidas no mês"
// (`20261027120000_inicio-fotos-das-joias.sql`).
//
// `overviewSchema.test.ts` e `filaComDonoUnico.test.ts` leem a migration da 73. Com a função recriada,
// eles passariam a medir um arquivo que não é mais a função vigente — peça certa, endereço errado,
// suíte verde. Este guarda fecha o par: desfeitas as DUAS trocas da foto, o corpo da nova é o da 73
// BYTE A BYTE. Então tudo o que aqueles guardas provam sobre a 73 (a recusa `42501`, o recorte de dia,
// a fila copiada de `core`, os grants) continua valendo para a vigente. Mudar qualquer outra linha
// da função exige mudar este guarda — e é a hora de apontar os outros dois para o arquivo novo.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const MIGRATIONS = resolve(__dirname, '../../../../../../supabase/migrations')
const DA_73 = readFileSync(resolve(MIGRATIONS, '20261023120000_73-resumo-do-atelie.sql'), 'utf8').replace(/\r\n/g, '\n')
const NOVA = readFileSync(resolve(MIGRATIONS, '20261027120000_inicio-fotos-das-joias.sql'), 'utf8').replace(/\r\n/g, '\n')

/** Do `create or replace function` ao fim do arquivo: o corpo e os grants, sem o cabeçalho de comentário. */
const corpo = (sql: string): string | null => {
  const i = sql.indexOf('create or replace function public.store_overview')
  return i < 0 ? null : sql.slice(i)
}

const TROCAS: [string, string][] = [
  [
    "      sum(i.quantity) as pecas\n",
    "      sum(i.quantity) as pecas,\n      p.images as imagens,\n      max(nullif(btrim(i.product_image), '')) as foto_do_pedido\n",
  ],
  ['    group by 1, 2\n', '    group by 1, 2, 4\n'],
  [
    "        'chave', j.chave, 'nome', j.nome, 'pecas', j.pecas\n",
    "        'chave', j.chave, 'nome', j.nome, 'pecas', j.pecas,\n        'imagens', j.imagens, 'foto_do_pedido', j.foto_do_pedido\n",
  ],
]

/** Desfaz as trocas da foto. Lança quando uma delas não está lá: troca sumida não pode virar igualdade. */
const desfazer = (sql: string): string =>
  TROCAS.reduce((acc, [antes, depois]) => {
    if (acc.split(depois).length !== 2) throw new Error(`troca ausente ou repetida: ${depois.trim().slice(0, 40)}`)
    return acc.replace(depois, antes)
  }, sql)

/** Muta o texto e LANÇA se a mutação não mudou nada (sensor que vira no-op não prova nada). */
const mutar = (texto: string, de: string, para: string): string => {
  const saida = texto.replace(de, para)
  if (saida === texto) throw new Error(`mutação sem alvo: ${de}`)
  return saida
}

describe('a store_overview recriada é a da 73 mais a foto das joias, e nada mais', () => {
  it('âncora: as duas migrations lidas, e o corpo encontrado nas duas', () => {
    expect(corpo(DA_73)?.length ?? 0).toBeGreaterThan(3000)
    expect(corpo(NOVA)?.length ?? 0).toBeGreaterThan(3000)
  })

  it('desfeitas as três trocas, o corpo é o da 73 byte a byte', () => {
    expect(desfazer(corpo(NOVA)!)).toBe(corpo(DA_73))
  })

  it('a nova devolve `imagens` cru e `foto_do_pedido` — e não escolhe a capa em SQL', () => {
    const c = corpo(NOVA)!
    expect(c).toContain("'imagens', j.imagens")
    expect(c).toContain("'foto_do_pedido', j.foto_do_pedido")
    // Escolher a primeira imagem aqui seria a segunda escrita de `primaryImage`.
    expect(c).not.toMatch(/images\s*->\s*0|images\s*->>|jsonb_array_elements\(\s*p\.images/)
  })

  it('sem escrita de dado e sem grant a anon', () => {
    const c = corpo(NOVA)!
    expect(c).not.toMatch(/\b(insert\s+into|update\s+public\.|delete\s+from)\b/i)
    expect(c).not.toMatch(/grant[^;]*\banon\b/i)
  })

  describe('sensores', () => {
    it('uma linha da fila mudada na nova reprova a igualdade', () => {
      const mutante = mutar(corpo(NOVA)!, "o.material_status = 'aguardando_material') as aguardando", "o.material_status = 'material_enviado') as aguardando")
      expect(desfazer(mutante)).not.toBe(corpo(DA_73))
    })

    it('o grant a anon reaparecendo é acusado', () => {
      const mutante = mutar(corpo(NOVA)!, 'to authenticated;', 'to authenticated, anon;')
      expect(mutante).toMatch(/grant[^;]*\banon\b/i)
    })

    it('uma das trocas sumindo LANÇA em vez de passar', () => {
      const mutante = mutar(corpo(NOVA)!, "'imagens', j.imagens, ", '')
      expect(() => desfazer(mutante)).toThrow(/troca ausente/)
    })
  })
})
