import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'
import { ORDER_ADMIN_NOTE_MAX } from '@estrelinha/core/orders'

/**
 * O guarda da observação da PROPOSTA — o texto que só quem administra lê, escrito na montagem do
 * pedido e passado ao pedido quando a cliente conclui o link.
 *
 * A migration recria `save_order_proposal` e `create_order_from_proposal`, que nasceram na 89 e estão
 * aplicadas (imutáveis). `pedidoMontadoSchema.test.ts` passa a ler a VIGENTE das duas, e este guarda
 * fecha o par no molde de `fotoDasJoiasSchema`: desfeitas as trocas da observação, cada função é a da
 * 89 BYTE A BYTE. Então tudo o que aquele guarda prova sobre a 89 (versão, dedupe, ficha por e-mail,
 * itens da proposta, os grants) continua valendo para a vigente, e mudar qualquer outra linha das
 * duas exige mudar este guarda.
 *
 * O que as trocas fazem, e por que cada uma é régua aqui:
 *   - `admin_note` em `v_fora`: sem isso, todo save e todo `renew` (que não manda a nota) pareceriam
 *     mudança, subiriam a versão e matariam a página aberta da cliente com "a proposta mudou";
 *   - a nota só muda na edição quando o corpo a TRAZ — a ausência não apaga;
 *   - a conversão copia a nota para `order_admin_notes` na MESMA transação.
 *
 * O teto do `check` é IMPORTADO de `@estrelinha/core/orders`, nunca cravado. `mutar()` LANÇA quando
 * a mutação não muda nada. A semântica (a versão que não sobe, a cópia de verdade) é do probe
 * `.specs/work-items/95-observacao-do-pedido/probes/02-observacao-da-proposta.sql`.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const PASTA = resolve(ROOT, 'supabase/migrations')
const NOME_89 = '20261103120000_89-pedido-montado.sql'
const NOME_NOVA = '20261109120000_95-observacao-da-proposta.sql'

const ler = (nome: string): string => readFileSync(resolve(PASTA, nome), 'utf8').replace(/\r\n/g, '\n')
const DA_89 = ler(NOME_89)
const NOVA = ler(NOME_NOVA)

const semComentarios = (texto: string): string => texto.replace(/--[^\n]*/g, '')

const mutar = (texto: string, de: string, para: string): string => {
  const mutante = texto.replace(de, para)
  if (mutante === texto) throw new Error(`mutação não encontrou o alvo: ${de.slice(0, 60)}…`)
  return mutante
}

const FUNCOES = [
  { nome: 'save_order_proposal', assinatura: 'jsonb' },
  { nome: 'create_order_from_proposal', assinatura: 'uuid, integer, jsonb' },
] as const
type NomeDaFuncao = (typeof FUNCOES)[number]['nome']

/** Do `create or replace function public.<nome>(` ao `grant execute … to service_role;`, inclusive — ou `null`. */
const regiao = (sql: string, nome: NomeDaFuncao): string | null => {
  const assinatura = FUNCOES.find((f) => f.nome === nome)!.assinatura
  const inicio = sql.indexOf(`create or replace function public.${nome}(`)
  const grant = `grant execute on function public.${nome}(${assinatura}) to service_role;`
  const fim = sql.indexOf(grant, inicio)
  return inicio < 0 || fim < 0 ? null : sql.slice(inicio, fim + grant.length)
}

const NOTA_NA_EDICAO = [
  "  -- A observacao NAO e conteudo: fica em `v_fora`, entao so ela mudando nao sobe a versao nem gera",
  "  -- `edited`. Na edicao ela muda SO quando o corpo a traz — `renew` nao a manda, e nao a apaga.",
  "  if v_id is not null and p ? 'admin_note' then",
  '    update public.order_proposals',
  "       set admin_note = nullif(btrim(coalesce(p->>'admin_note', '')), '')",
  '     where id = v_id;',
  '  end if;',
  '',
  '',
].join('\n')

const NOTA_AO_PEDIDO = [
  '  -- A observacao passa ao pedido NESTA transacao. Dali em diante a dona e `order_admin_notes`; a',
  '  -- coluna da proposta fica congelada. O autor e quem montou a proposta; o nome, a proposta nao guarda.',
  '  if v_prop.admin_note is not null then',
  '    insert into public.order_admin_notes (order_id, note, updated_by, updated_by_name)',
  '    values (v_order_id, v_prop.admin_note, v_prop.created_by, null);',
  '  end if;',
  '',
  '',
].join('\n')

/** As trocas da observação, por função: `[como era na 89, como é na nova]`. */
const TROCAS: Record<NomeDaFuncao, [string, string][]> = {
  save_order_proposal: [
    [
      "    'idempotency_key', 'created_by', 'created_at', 'updated_at'\n  ];",
      "    'idempotency_key', 'created_by', 'created_at', 'updated_at', 'admin_note'\n  ];",
    ],
    ['  -- O conteudo novo, pelos tipos da tabela.\n', `${NOTA_NA_EDICAO}  -- O conteudo novo, pelos tipos da tabela.\n`],
    [
      '      subtotal, promotion_discount, items_total\n    ) values (',
      '      subtotal, promotion_discount, items_total, admin_note\n    ) values (',
    ],
    [
      '      v_novo.subtotal, coalesce(v_novo.promotion_discount, 0), v_novo.items_total\n    )',
      "      v_novo.subtotal, coalesce(v_novo.promotion_discount, 0), v_novo.items_total,\n      nullif(btrim(coalesce(p->>'admin_note', '')), '')\n    )",
    ],
  ],
  create_order_from_proposal: [
    [
      "  update public.order_proposals\n     set status = 'completed'",
      `${NOTA_AO_PEDIDO}  update public.order_proposals\n     set status = 'completed'`,
    ],
  ],
}

/** Desfaz as trocas. LANÇA quando uma delas não está lá, ou está duas vezes: troca sumida não pode virar igualdade. */
const desfazer = (texto: string, nome: NomeDaFuncao): string =>
  TROCAS[nome].reduce((acc, [antes, depois]) => {
    if (acc.split(depois).length !== 2) throw new Error(`troca ausente ou repetida: ${depois.trim().slice(0, 50)}`)
    return acc.replace(depois, antes)
  }, texto)

/** O teto do `check` da coluna nova, contado aparado — ou `null`. */
const tetoDaColuna = (sql: string): number | null => {
  const m = semComentarios(sql).match(
    /alter\s+table\s+public\.order_proposals\s+add\s+column\s+if\s+not\s+exists\s+admin_note\s+text\s+check\s*\(\s*char_length\(btrim\(admin_note\)\)\s+between\s+1\s+and\s+(\d+)\s*\)\s*;/i,
  )
  return m ? Number(m[1]) : null
}

/** `admin_note` está no `v_fora` de `save_order_proposal`. */
const notaForaDoConteudo = (sql: string): boolean => {
  const v = (regiao(sql, 'save_order_proposal') ?? '').match(/v_fora\s+constant\s+text\[\]\s*:=\s*array\[([\s\S]*?)\];/i)
  return !!v && /'admin_note'/.test(v[1])
}

/** O `update` de CONTEÚDO (o que sobe a versão) não escreve a nota. */
const updateDeConteudoSemNota = (sql: string): boolean => {
  const u = (regiao(sql, 'save_order_proposal') ?? '').match(/update public\.order_proposals set\n[\s\S]*?returning \* into v_atual;/i)
  return !!u && /version = version \+ 1/.test(u[0]) && !/admin_note/.test(u[0])
}

/** A conversão grava a nota em `order_admin_notes`, só quando há nota, e DEPOIS de o pedido nascer. */
const conversaoCopiaANota = (sql: string): boolean => {
  const c = semComentarios(regiao(sql, 'create_order_from_proposal') ?? '')
  const pedido = c.search(/returning id, order_number into v_order_id, v_order_number;/i)
  const copia = c.search(
    /if v_prop\.admin_note is not null then\s+insert into public\.order_admin_notes \(order_id, note, updated_by, updated_by_name\)\s+values \(v_order_id, v_prop\.admin_note, v_prop\.created_by,/i,
  )
  return pedido >= 0 && copia > pedido
}

const nenhumGrantAAnon = (sql: string): boolean => !/grant[^;]*\bto\b[^;]*\banon\b/is.test(semComentarios(sql))

const nenhumaPolicy = (sql: string): boolean => !/create\s+policy/i.test(semComentarios(sql))

/** Nenhuma escrita de DADO fora dos corpos das funções. */
const semEscritaDeDado = (sql: string): boolean => {
  const fora = semComentarios(sql).replace(/as\s+\$\$[\s\S]*?\$\$;/gi, '')
  return !/\b(insert\s+into|update\s+public\.|delete\s+from|truncate|drop\s+table)\b/i.test(fora)
}

const recarregaSchema = (sql: string): boolean => /notify pgrst,\s*'reload schema';/i.test(semComentarios(sql))

const disco = readdirSync(PASTA)
  .filter((f) => f.endsWith('.sql'))
  .map((nome) => ({ nome, texto: ler(nome) }))

/** A última migration (ordem do `db push`) que cria a função `nome`. */
const vigente = (arquivos: { nome: string; texto: string }[], nome: string): string | null => {
  const criadoras = arquivos
    .filter((a) => new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${nome}\\s*\\(`, 'i').test(semComentarios(a.texto)))
    .map((a) => a.nome)
    .sort()
  return criadoras[criadoras.length - 1] ?? null
}

describe('âncoras', () => {
  it('as duas migrations lidas, e as duas funções achadas nas duas', () => {
    for (const { nome } of FUNCOES) {
      expect(regiao(DA_89, nome)?.length ?? 0, `${nome} na 89`).toBeGreaterThan(2000)
      expect(regiao(NOVA, nome)?.length ?? 0, `${nome} na nova`).toBeGreaterThan(2000)
    }
    expect(disco.length).toBeGreaterThan(70)
  })

  it.each(FUNCOES)('a vigente de $nome é a migration nova', ({ nome }) => {
    expect(vigente(disco, nome)).toBe(NOME_NOVA)
  })
  it.each(FUNCOES)('SENSOR: sem a nova, a vigente de $nome volta a ser a 89', ({ nome }) => {
    expect(vigente(disco.filter((a) => a.nome !== NOME_NOVA), nome)).toBe(NOME_89)
  })
})

describe('as duas funções são as da 89 mais a observação, e nada mais', () => {
  it.each(FUNCOES)('$nome: desfeitas as trocas, é a da 89 byte a byte', ({ nome }) => {
    expect(desfazer(regiao(NOVA, nome)!, nome)).toBe(regiao(DA_89, nome))
  })

  it('SENSOR: uma linha da versão mudada na nova reprova a igualdade', () => {
    const mutante = mutar(regiao(NOVA, 'save_order_proposal')!, "if v_atual.version <> (p->>'version')::integer then", 'if false then')
    expect(desfazer(mutante, 'save_order_proposal')).not.toBe(regiao(DA_89, 'save_order_proposal'))
  })
  it('SENSOR: o grant da conversão alargado a authenticated reprova a igualdade', () => {
    const mutante = mutar(regiao(NOVA, 'create_order_from_proposal')!, 'from authenticated;', 'from anon;')
    expect(desfazer(mutante, 'create_order_from_proposal')).not.toBe(regiao(DA_89, 'create_order_from_proposal'))
  })
  it('SENSOR: uma das trocas sumindo LANÇA em vez de passar', () => {
    const mutante = mutar(regiao(NOVA, 'create_order_from_proposal')!, 'if v_prop.admin_note is not null then', 'if true then')
    expect(() => desfazer(mutante, 'create_order_from_proposal')).toThrow(/troca ausente/)
  })
})

describe('a coluna `order_proposals.admin_note`', () => {
  it('nasce com o MESMO teto da observação do pedido, importado de core', () => {
    expect(tetoDaColuna(NOVA)).toBe(ORDER_ADMIN_NOTE_MAX)
  })
  it('SENSOR: outro teto reprova', () => {
    expect(tetoDaColuna(mutar(NOVA, `between 1 and ${ORDER_ADMIN_NOTE_MAX})`, `between 1 and ${ORDER_ADMIN_NOTE_MAX + 1})`))).not.toBe(
      ORDER_ADMIN_NOTE_MAX,
    )
  })
})

describe('`save_order_proposal`', () => {
  it("'admin_note' está em `v_fora` — a nota não é conteúdo e não sobe a versão", () => {
    expect(notaForaDoConteudo(NOVA)).toBe(true)
  })
  it("SENSOR: sem 'admin_note' em `v_fora` reprova", () => {
    expect(notaForaDoConteudo(mutar(NOVA, ", 'updated_at', 'admin_note'\n", ", 'updated_at'\n"))).toBe(false)
  })

  it('o `update` de conteúdo (o que sobe a versão) não toca a nota', () => {
    expect(updateDeConteudoSemNota(NOVA)).toBe(true)
  })
  it('SENSOR: a nota no `update` de conteúdo reprova', () => {
    expect(updateDeConteudoSemNota(mutar(NOVA, '      version = version + 1,\n', '      admin_note = v_novo.admin_note,\n      version = version + 1,\n'))).toBe(
      false,
    )
  })
})

describe('`create_order_from_proposal`', () => {
  it('copia a nota para `order_admin_notes` depois de o pedido nascer, só quando há nota', () => {
    expect(conversaoCopiaANota(NOVA)).toBe(true)
  })
  it('SENSOR: sem o recorte de nota nula reprova', () => {
    expect(conversaoCopiaANota(mutar(NOVA, 'if v_prop.admin_note is not null then', 'if true then'))).toBe(false)
  })
  it('SENSOR: a 89, que não copia, reprova', () => {
    expect(conversaoCopiaANota(DA_89)).toBe(false)
  })
})

describe('o resto da migration', () => {
  it('nenhum grant a anon e nenhuma policy', () => {
    expect(nenhumGrantAAnon(NOVA)).toBe(true)
    expect(nenhumaPolicy(NOVA)).toBe(true)
  })
  it('SENSOR: um grant a anon reprova', () => {
    expect(nenhumGrantAAnon(`${NOVA}\ngrant execute on function public.save_order_proposal(jsonb) to anon;\n`)).toBe(false)
  })

  it('nenhuma escrita de dado fora dos corpos das funções', () => {
    expect(semEscritaDeDado(NOVA)).toBe(true)
  })
  it('SENSOR: um `update` solto reprova', () => {
    expect(semEscritaDeDado(`${NOVA}\nupdate public.order_proposals set admin_note = null;\n`)).toBe(false)
  })

  it('termina avisando o PostgREST', () => {
    expect(recarregaSchema(NOVA)).toBe(true)
  })
  it('o `mutar` lança quando o alvo não existe', () => {
    expect(() => mutar(NOVA, 'texto que não está na migration', 'x')).toThrow(/não encontrou o alvo/)
  })
})
