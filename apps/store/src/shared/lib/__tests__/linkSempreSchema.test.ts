import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * O guarda da migration do link SEMPRE e do endereço salvo pela própria gravação .
 *
 * A migration acrescenta `order_proposals.token_cipher` (a cifra do token, nunca o token) e recria
 * `save_order_proposal`, cuja vigente era a da 95 (imutável). No molde de
 * `observacaoDaPropostaSchema`: desfeitas as trocas do 94, a função é a da 95 BYTE A BYTE — então tudo
 * o que os guardas da 89 e da 95 provam sobre ela continua valendo, e mudar qualquer outra linha exige
 * mudar este guarda.
 *
 * O que as trocas fazem, e por que cada uma é régua aqui:
 *   - `token_cipher` em `v_fora`: a cifra não é conteúdo; sem isso, uma gravação que mandasse a cifra
 *     pareceria mudança, subiria a versão e a página aberta da cliente diria "a proposta mudou";
 *   - ao criar, a cifra é gravada junto do hash;
 *   - `save_address` (o booleano `true`, nada mais) grava o endereço em `addresses` da ficha que a
 *     própria função resolveu, DEPOIS de resolvê-la e ANTES de qualquer retorno de "sem mudança", na
 *     mesma transação; o padrão só quando a ficha não tem padrão (`addresses_one_default`); o mesmo
 *     endereço não entra duas vezes.
 *
 * `mutar()` LANÇA quando a mutação não muda nada. A semântica (a transação que desfaz tudo, o padrão
 * único, a versão que não sobe) é do probe `.specs/work-items/94-montar-pedido-no-app/probes/01-link-e-endereco.sql`.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const PASTA = resolve(ROOT, 'supabase/migrations')
const NOME_95 = '20261109120000_95-observacao-da-proposta.sql'
const NOME_NOVA = '20261111120000_94-link-sempre-e-endereco.sql'

const ler = (nome: string): string => readFileSync(resolve(PASTA, nome), 'utf8').replace(/\r\n/g, '\n')
const DA_95 = ler(NOME_95)
const NOVA = ler(NOME_NOVA)

const semComentarios = (texto: string): string => texto.replace(/--[^\n]*/g, '')

const mutar = (texto: string, de: string, para: string): string => {
  const mutante = texto.replace(de, para)
  if (mutante === texto) throw new Error(`mutação não encontrou o alvo: ${de.slice(0, 60)}…`)
  return mutante
}

const GRANT = 'grant execute on function public.save_order_proposal(jsonb) to service_role;'

/** Do `create or replace function public.save_order_proposal(` ao grant da service role, inclusive — ou `null`. */
const regiao = (sql: string): string | null => {
  const inicio = sql.indexOf('create or replace function public.save_order_proposal(')
  const fim = sql.indexOf(GRANT, inicio)
  return inicio < 0 || fim < 0 ? null : sql.slice(inicio, fim + GRANT.length)
}

/** O bloco do endereço, exatamente como entra (e é o que se desfaz). */
const blocoDoEndereco = (sql: string): string | null => {
  const r = regiao(sql) ?? ''
  const inicio = r.indexOf('  -- O endereco no cadastro da cliente')
  const fim = r.indexOf('  -- O conteudo novo, pelos tipos da tabela.\n', inicio)
  return inicio < 0 || fim < 0 ? null : r.slice(inicio, fim)
}

/** As trocas do link sempre e do endereço: `[como era na 95, como é na nova]`. O bloco do endereço é lido da própria nova. */
const trocas = (nova: string): [string, string][] => [
  [
    "    'idempotency_key', 'created_by', 'created_at', 'updated_at', 'admin_note'\n  ];",
    "    'idempotency_key', 'created_by', 'created_at', 'updated_at', 'admin_note', 'token_cipher'\n  ];",
  ],
  ['  -- O conteudo novo, pelos tipos da tabela.\n', `${blocoDoEndereco(nova) ?? '<sem bloco>'}  -- O conteudo novo, pelos tipos da tabela.\n`],
  [
    '      status, version, token_hash, expires_at, idempotency_key, created_by,',
    '      status, version, token_hash, token_cipher, expires_at, idempotency_key, created_by,',
  ],
  [
    "      'open', 1, p->>'token_hash', (p->>'expires_at')::timestamptz, p->>'idempotency_key',",
    "      'open', 1, p->>'token_hash', nullif(p->>'token_cipher', ''), (p->>'expires_at')::timestamptz,\n      p->>'idempotency_key',",
  ],
]

/** Desfaz as trocas. LANÇA quando uma delas não está lá, ou está duas vezes: troca sumida não pode virar igualdade. */
const desfazer = (texto: string, nova: string): string =>
  trocas(nova).reduce((acc, [antes, depois]) => {
    if (acc.split(depois).length !== 2) throw new Error(`troca ausente ou repetida: ${depois.trim().slice(0, 50)}`)
    return acc.replace(depois, antes)
  }, texto)

const colunaDaCifra = (sql: string): boolean =>
  /alter\s+table\s+public\.order_proposals\s+add\s+column\s+if\s+not\s+exists\s+token_cipher\s+text\s*;/i.test(semComentarios(sql))

const cifraForaDoConteudo = (sql: string): boolean => {
  const v = (regiao(sql) ?? '').match(/v_fora\s+constant\s+text\[\]\s*:=\s*array\[([\s\S]*?)\];/i)
  return !!v && /'token_cipher'/.test(v[1]) && /'token_hash'/.test(v[1])
}

/** O `update` de conteúdo (o que sobe a versão) não toca a cifra: editar mantém o link. */
const updateDeConteudoSemCifra = (sql: string): boolean => {
  const u = (regiao(sql) ?? '').match(/update public\.order_proposals set\n[\s\S]*?returning \* into v_atual;/i)
  return !!u && /version = version \+ 1/.test(u[0]) && !/token_cipher|token_hash/.test(u[0])
}

/** O bloco do endereço, sem comentários. */
const endereco = (sql: string): string => semComentarios(blocoDoEndereco(sql) ?? '')

/** Só o booleano `true` liga a gravação — nem texto, nem ausência. */
const ligadoSoPeloBooleano = (sql: string): boolean => /if p->'save_address' = 'true'::jsonb\s/i.test(endereco(sql))

/** Vai para a ficha que a função resolveu (`v_customer_id`), nunca para um id do corpo. */
const vaiParaAFichaResolvida = (sql: string): boolean => {
  const e = endereco(sql)
  return /insert into public\.addresses \(\s*customer_id,/i.test(e) && /select v_customer_id, 'Casa',/i.test(e) && !/p->>'customer_id'/.test(e)
}

/** Padrão só quando a ficha não tem padrão — `addresses_one_default` nunca recusa por esta gravação. */
const padraoSoSemPadrao = (sql: string): boolean =>
  /not exists \(select 1 from public\.addresses d where d\.customer_id = v_customer_id and d\.is_default\)/i.test(endereco(sql))

/** O mesmo endereço (CEP, rua, número e complemento) não entra duas vezes na mesma ficha. */
const semDuplicata = (sql: string): boolean => {
  const e = endereco(sql)
  const m = e.match(/where not exists \(\s*select 1 from public\.addresses a\s+where a\.customer_id = v_customer_id([\s\S]*?)\);/i)
  return !!m && ['a.cep', 'a.street', 'a.number', 'a.complement'].every((c) => m[1].includes(c))
}

/** O endereço é gravado DEPOIS de a ficha ser resolvida e ANTES do retorno de "sem mudança". */
const naOrdemCerta = (sql: string): boolean => {
  const r = semComentarios(regiao(sql) ?? '')
  const ficha = r.search(/returning id into v_customer_id;/i)
  const end = r.search(/insert into public\.addresses/i)
  const semMudanca = r.search(/if v_conteudo_atual = v_conteudo_novo and v_linhas_atuais = v_linhas_novas then/i)
  return ficha >= 0 && end > ficha && semMudanca > end
}

const nenhumGrantAAnon = (sql: string): boolean => !/grant[^;]*\bto\b[^;]*\b(anon|authenticated|public)\b/is.test(semComentarios(sql))
const nenhumaPolicy = (sql: string): boolean => !/create\s+policy/i.test(semComentarios(sql))
const semEscritaDeDado = (sql: string): boolean => {
  const fora = semComentarios(sql).replace(/as\s+\$\$[\s\S]*?\$\$;/gi, '')
  return !/\b(insert\s+into|update\s+public\.|delete\s+from|truncate|drop\s+table)\b/i.test(fora)
}
const recarregaSchema = (sql: string): boolean => /notify pgrst,\s*'reload schema';/i.test(semComentarios(sql))

const disco = readdirSync(PASTA)
  .filter((f) => f.endsWith('.sql'))
  .map((nome) => ({ nome, texto: ler(nome) }))

const vigente = (arquivos: { nome: string; texto: string }[]): string | null => {
  const criadoras = arquivos
    .filter((a) => /create\s+or\s+replace\s+function\s+public\.save_order_proposal\s*\(/i.test(semComentarios(a.texto)))
    .map((a) => a.nome)
    .sort()
  return criadoras[criadoras.length - 1] ?? null
}

describe('âncoras', () => {
  it('as duas migrations lidas, a função achada nas duas, e o bloco do endereço na nova', () => {
    expect(regiao(DA_95)?.length ?? 0).toBeGreaterThan(2000)
    expect(regiao(NOVA)?.length ?? 0).toBeGreaterThan(2000)
    expect(blocoDoEndereco(NOVA)?.length ?? 0).toBeGreaterThan(500)
    expect(disco.length).toBeGreaterThan(70)
  })
  it('a vigente de `save_order_proposal` é a migration nova', () => {
    expect(vigente(disco)).toBe(NOME_NOVA)
  })
  it('SENSOR: sem a nova, a vigente volta a ser a da 95', () => {
    expect(vigente(disco.filter((a) => a.nome !== NOME_NOVA))).toBe(NOME_95)
  })
})

describe('a função é a da 95 mais as trocas do link sempre, e nada mais', () => {
  it('desfeitas as trocas, é a da 95 byte a byte', () => {
    expect(desfazer(regiao(NOVA)!, NOVA)).toBe(regiao(DA_95))
  })
  it('SENSOR: uma linha da versão mudada reprova a igualdade', () => {
    const mutante = mutar(regiao(NOVA)!, "if v_atual.version <> (p->>'version')::integer then", 'if false then')
    expect(desfazer(mutante, NOVA)).not.toBe(regiao(DA_95))
  })
  it('SENSOR: o grant alargado reprova a igualdade', () => {
    const mutante = mutar(regiao(NOVA)!, 'from authenticated;', 'from anon;')
    expect(desfazer(mutante, NOVA)).not.toBe(regiao(DA_95))
  })
  it('SENSOR: uma das trocas sumindo LANÇA em vez de passar', () => {
    const mutante = mutar(regiao(NOVA)!, "'admin_note', 'token_cipher'\n", "'admin_note'\n")
    expect(() => desfazer(mutante, NOVA)).toThrow(/troca ausente/)
  })
})

describe('a cifra do token', () => {
  it('`order_proposals.token_cipher text`, aditiva', () => {
    expect(colunaDaCifra(NOVA)).toBe(true)
  })
  it('SENSOR: sem `if not exists` reprova', () => {
    expect(colunaDaCifra(mutar(NOVA, 'add column if not exists token_cipher', 'add column token_cipher'))).toBe(false)
  })

  it('a cifra está em `v_fora`, ao lado do hash: ela sozinha não sobe a versão', () => {
    expect(cifraForaDoConteudo(NOVA)).toBe(true)
  })
  it("SENSOR: sem 'token_cipher' em `v_fora` reprova", () => {
    expect(cifraForaDoConteudo(mutar(NOVA, ", 'admin_note', 'token_cipher'\n", ", 'admin_note'\n"))).toBe(false)
  })

  it('o `update` de conteúdo não toca a cifra nem o hash (editar mantém o link)', () => {
    expect(updateDeConteudoSemCifra(NOVA)).toBe(true)
  })
  it('SENSOR: a cifra no `update` de conteúdo reprova', () => {
    expect(
      updateDeConteudoSemCifra(mutar(NOVA, '      version = version + 1,\n', '      token_cipher = v_novo.token_cipher,\n      version = version + 1,\n')),
    ).toBe(false)
  })
})

describe('o endereço no cadastro', () => {
  it('só o booleano `true` liga a gravação', () => {
    expect(ligadoSoPeloBooleano(NOVA)).toBe(true)
  })
  it('SENSOR: ligar pelo texto reprova', () => {
    expect(ligadoSoPeloBooleano(mutar(NOVA, "if p->'save_address' = 'true'::jsonb", "if p->>'save_address' is not null"))).toBe(false)
  })

  it('vai para a ficha que a função resolveu', () => {
    expect(vaiParaAFichaResolvida(NOVA)).toBe(true)
  })
  it('SENSOR: um id do corpo no lugar da ficha resolvida reprova', () => {
    expect(vaiParaAFichaResolvida(mutar(NOVA, "select v_customer_id, 'Casa',", "select (p->>'customer_id')::uuid, 'Casa',"))).toBe(false)
  })

  it('padrão só quando a ficha não tem padrão (`addresses_one_default`)', () => {
    expect(padraoSoSemPadrao(NOVA)).toBe(true)
  })
  it('SENSOR: sempre padrão reprova', () => {
    expect(
      padraoSoSemPadrao(
        mutar(NOVA, 'not exists (select 1 from public.addresses d where d.customer_id = v_customer_id and d.is_default)', 'true'),
      ),
    ).toBe(false)
  })

  it('o mesmo endereço não entra duas vezes na mesma ficha', () => {
    expect(semDuplicata(NOVA)).toBe(true)
  })
  it('SENSOR: sem o número na comparação reprova', () => {
    expect(semDuplicata(mutar(NOVA, "          and btrim(a.number) = btrim(coalesce(p->>'address_number', ''))\n", ''))).toBe(false)
  })

  it('depois de a ficha ser resolvida, e antes do retorno de "sem mudança"', () => {
    expect(naOrdemCerta(NOVA)).toBe(true)
  })
  it('SENSOR: o endereço depois do retorno de "sem mudança" reprova (editar sem mudar não gravaria)', () => {
    const bloco = blocoDoEndereco(NOVA)!
    const semBloco = mutar(NOVA, bloco, '')
    const mutado = mutar(semBloco, '    delete from public.order_proposal_items where proposal_id = v_id;\n', `    delete from public.order_proposal_items where proposal_id = v_id;\n${bloco}`)
    expect(naOrdemCerta(mutado)).toBe(false)
  })
})

describe('o resto da migration', () => {
  it('nenhum grant a papel de cliente e nenhuma policy', () => {
    expect(nenhumGrantAAnon(NOVA)).toBe(true)
    expect(nenhumaPolicy(NOVA)).toBe(true)
  })
  it('SENSOR: um grant a authenticated reprova', () => {
    expect(nenhumGrantAAnon(`${NOVA}\ngrant execute on function public.save_order_proposal(jsonb) to authenticated;\n`)).toBe(false)
  })
  it('nenhuma escrita de dado fora do corpo da função', () => {
    expect(semEscritaDeDado(NOVA)).toBe(true)
  })
  it('SENSOR: um `insert` solto em addresses reprova', () => {
    expect(semEscritaDeDado(`${NOVA}\ninsert into public.addresses (customer_id) values (null);\n`)).toBe(false)
  })
  it('termina avisando o PostgREST', () => {
    expect(recarregaSchema(NOVA)).toBe(true)
  })
  it('o `mutar` lança quando o alvo não existe', () => {
    expect(() => mutar(NOVA, 'texto que não está na migration', 'x')).toThrow(/não encontrou o alvo/)
  })
})
