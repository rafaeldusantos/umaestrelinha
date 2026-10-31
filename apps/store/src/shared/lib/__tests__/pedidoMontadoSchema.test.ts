import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * O guarda da migration da feature 89 — a proposta (o pedido montado pelo painel), as três RPCs e a
 * adoção da ficha sem conta em `handle_new_customer` (`SEG-05`, `CON-06`, `CON-10`, `MON-03`, `A-09`,
 * `A-12`, `AD-070`).
 *
 * Lê o `.sql` **do disco**, no molde de `avisoPuladoSchema` e `minhaContaSchema`, porque afrouxar uma
 * migration não quebra nada: uma policy `to authenticated` nas tabelas da proposta entregaria o
 * hash do link e o motivo interno do desconto a qualquer cliente logada; um `grant execute` que
 * alcança `authenticated` deixaria qualquer conta criar pedido a partir de uma proposta; uma adoção
 * sem o recorte de `user_id` nulo roubaria a ficha de outra conta. Tudo isso aplica limpo e passa em
 * build, em `tsc` e em teste de componente.
 *
 * **Uma régua por comando** (`L-033`), cada uma um predicado com sensor por mutação, e `mutar()`
 * LANÇA quando a mutação não acha o alvo.
 *
 * Os limites (30 linhas, quantidade 1..99, motivo 120, itens ≥ R$ 1,00, % 0,01..99,99) estão
 * escritos por extenso aqui porque `core/proposals/limits.ts` nasce numa task paralela (T05); quem
 * a fechar troca os literais pela importação das constantes.
 *
 * A semântica (versão, dedupe, idempotência, a adoção de verdade, o gatilho da 59 deixando passar)
 * só se prova contra o banco: `.specs/features/89-pedido-montado-pelo-painel/probes/01-proposta.sql`.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const PASTA = resolve(ROOT, 'supabase/migrations')
const NOME_89 = '20261103120000_89-pedido-montado.sql'
const NOME_35 = '20260830120000_35-clientes-e-pedidos-nuvemshop.sql'

const sql = readFileSync(resolve(PASTA, NOME_89), 'utf8')

const mutar = (texto: string, de: string, para: string): string => {
  const mutante = texto.replace(de, para)
  if (mutante === texto) throw new Error(`mutação não encontrou o alvo: ${de.slice(0, 60)}…`)
  return mutante
}

/** `mutar`, mas só dentro da statement da função `nome` — o alvo é a primeira ocorrência DEPOIS do `create`. */
const mutarNaFuncao = (texto: string, nome: string, de: string, para: string): string => {
  const inicio = texto.toLowerCase().indexOf(`create or replace function public.${nome}(`)
  if (inicio < 0) throw new Error(`função não encontrada: ${nome}`)
  return texto.slice(0, inicio) + mutar(texto.slice(inicio), de, para)
}

/** O SQL sem comentários de linha — o cabeçalho da migration EXPLICA o que ela faz em prosa. CRLF e LF. */
const semComentarios = (texto: string): string => texto.replace(/--[^\r\n]*/g, '')

const TABELAS = ['order_proposals', 'order_proposal_items', 'order_proposal_events'] as const
const PAPEIS_DE_CLIENTE = ['public', 'anon', 'authenticated'] as const
const RPCS = [
  { nome: 'save_order_proposal', assinatura: 'jsonb' },
  { nome: 'create_order_from_proposal', assinatura: 'uuid, integer, jsonb' },
  { nome: 'mark_order_proposal_viewed', assinatura: 'uuid' },
] as const

// -------------------------------------------------------------------------------------------
// As réguas, como predicados — uma por COMANDO
// -------------------------------------------------------------------------------------------

/** A statement `create table if not exists public.<t> ( … );` — ou `null`. */
const tabela = (texto: string, nome: string): string | null =>
  semComentarios(texto).match(new RegExp(`create table if not exists public\\.${nome}\\s*\\([\\s\\S]*?\\n\\);`, 'i'))?.[0] ??
  null

const rlsLigada = (texto: string, nome: string): boolean =>
  new RegExp(`alter\\s+table\\s+public\\.${nome}\\s+enable\\s+row\\s+level\\s+security\\s*;`, 'i').test(semComentarios(texto))

const revogaTabela = (texto: string, nome: string, papel: string, tipo = 'table'): boolean =>
  new RegExp(`revoke\\s+all\\s+on\\s+${tipo}\\s+public\\.${nome}\\s+from\\s+${papel}\\s*;`, 'i').test(semComentarios(texto))

const nenhumaPolicy = (texto: string): boolean => !/create\s+policy/i.test(semComentarios(texto))

/** Nenhum `grant` alcança papel de cliente — nem por curinga. */
const nenhumGrantDeCliente = (texto: string): boolean =>
  !/grant[^;]*\bto\b[^;]*\b(anon|authenticated|public)\b/is.test(semComentarios(texto))

/** A statement inteira de `create or replace function public.<nome>`, até o `$$;` — ou `null`. */
const funcao = (texto: string, nome: string): string | null =>
  semComentarios(texto).match(new RegExp(`create or replace function public\\.${nome}\\s*\\([\\s\\S]*?\\$\\$;`, 'i'))?.[0] ??
  null

const corpo = (texto: string, nome: string): string => (funcao(texto, nome) ?? '').match(/as\s+\$\$([\s\S]*?)\$\$;/i)?.[1] ?? ''

const securityDefiner = (texto: string, nome: string): boolean => /\bsecurity\s+definer\b/i.test(funcao(texto, nome) ?? '')

const searchPathVazio = (texto: string, nome: string): boolean =>
  /set\s+search_path\s*=\s*''/i.test(funcao(texto, nome) ?? '')

const assinaturaRe = (nome: string, assinatura: string): string =>
  `public\\.${nome}\\(${assinatura.split(/,\s*/).join(',\\s*')}\\)`

const revogaFuncao = (texto: string, nome: string, assinatura: string, papel: string): boolean =>
  new RegExp(`revoke\\s+all\\s+on\\s+function\\s+${assinaturaRe(nome, assinatura)}\\s+from\\s+${papel}\\s*;`, 'i').test(
    semComentarios(texto),
  )

/** `execute` concedido EXATAMENTE uma vez, e à `service_role`. */
const executaSoServiceRole = (texto: string, nome: string, assinatura: string): boolean => {
  const grants = [
    ...semComentarios(texto).matchAll(
      new RegExp(`grant\\s+execute\\s+on\\s+function\\s+${assinaturaRe(nome, assinatura)}\\s+to\\s+([a-z_]+)\\s*;`, 'gi'),
    ),
  ].map((m) => m[1])
  return JSON.stringify(grants) === JSON.stringify(['service_role'])
}

/** O `check` de quantidade 1..99 na tabela das linhas. */
const checkQuantidade = (texto: string): boolean =>
  /quantity\s+integer\s+not\s+null\s+check\s*\(\s*quantity\s+between\s+1\s+and\s+99\s*\)/i.test(
    tabela(texto, 'order_proposal_items') ?? '',
  )

/** O motivo do desconto avulso: 1..120 caracteres depois de aparar. */
const checkMotivo = (texto: string): boolean =>
  /char_length\(\s*btrim\(\s*manual_discount_reason\s*\)\s*\)\s+between\s+1\s+and\s+120/i.test(
    tabela(texto, 'order_proposals') ?? '',
  )

/** `A-12`: os itens somam pelo menos R$ 1,00. */
const checkItensMinimo = (texto: string): boolean =>
  /items_total\s+numeric\(10,\s*2\)\s+not\s+null\s+check\s*\(\s*items_total\s*>=\s*1\.00\s*\)/i.test(
    tabela(texto, 'order_proposals') ?? '',
  )

/** A porcentagem do desconto avulso vai de 0,01 a 99,99. */
const checkPercentual = (texto: string): boolean =>
  /manual_discount_kind\s*=\s*'percent'\s+and\s+manual_discount_value\s+between\s+0\.01\s+and\s+99\.99/i.test(
    tabela(texto, 'order_proposals') ?? '',
  )

/** Tipo, valor e motivo andam juntos. */
const checkAvulsoJunto = (texto: string): boolean => {
  const t = tabela(texto, 'order_proposals') ?? ''
  return (
    /\(manual_discount_kind is null\)\s*=\s*\(manual_discount_value is null\)/i.test(t) &&
    /\(manual_discount_kind is null\)\s*=\s*\(manual_discount_reason is null\)/i.test(t)
  )
}

/** "Expirada" é derivada: o `check` de status conhece só três estados. */
const statusSemExpirada = (texto: string): string[] | null => {
  const m = (tabela(texto, 'order_proposals') ?? '').match(/check\s*\(\s*status\s+in\s*\(([^)]*)\)\s*\)/i)
  return m ? [...m[1].matchAll(/'([a-z]+)'/g)].map((x) => x[1]) : null
}

/** O token só como hash, e único. */
const tokenSoHash = (texto: string): boolean => {
  const t = tabela(texto, 'order_proposals') ?? ''
  return /token_hash\s+text\s+not\s+null\s+unique/i.test(t) && !/\btoken\s+text/i.test(t)
}

/** `CON-06` também no banco: um pedido por proposta. */
const proposalIdUnico = (texto: string): boolean =>
  /alter\s+table\s+public\.orders\s+add\s+column\s+if\s+not\s+exists\s+proposal_id\s+uuid\s+unique\s+references\s+public\.order_proposals\s*\(\s*id\s*\)/i.test(
    semComentarios(texto),
  )

const descontoAvulsoNoPedido = (texto: string): boolean =>
  /alter\s+table\s+public\.orders\s+add\s+column\s+if\s+not\s+exists\s+manual_discount\s+numeric\(10,\s*2\)\s+not\s+null\s+default\s+0/i.test(
    semComentarios(texto),
  )

/** Nenhuma escrita de DADO fora dos corpos das funções. */
const semEscritaDeDado = (texto: string): boolean => {
  const fora = semComentarios(texto).replace(/as\s+\$\$[\s\S]*?\$\$;/gi, '')
  return !/\b(insert\s+into|update\s+public\.|delete\s+from|truncate|drop\s+table)\b/i.test(fora)
}

/** `save_order_proposal`: a ficha é procurada por `lower(btrim(email))` — nunca duas fichas (`MON-03`). */
const saveProcuraFichaPorEmailNormalizado = (texto: string): boolean =>
  /from public\.customers c\s+where lower\(btrim\(c\.email\)\)\s*=\s*v_email/i.test(corpo(texto, 'save_order_proposal')) &&
  /v_email\s+text\s*:=\s*lower\(btrim\(/i.test(funcao(texto, 'save_order_proposal') ?? '')

/** A ficha nova nasce SEM conta (`A-09`). */
const saveCriaFichaSemConta = (texto: string): boolean =>
  /insert into public\.customers \(user_id, name, email, phone, cpf\)\s+values \(null,/i.test(corpo(texto, 'save_order_proposal'))

/** A trava consultiva por e-mail, com a MESMA chave em `save_order_proposal` e `handle_new_customer`. */
const CHAVE_DA_TRAVA = /pg_advisory_xact_lock\(hashtext\('customer-email:' \|\|/i
const travaPorEmail = (texto: string, nome: string): boolean => CHAVE_DA_TRAVA.test(corpo(texto, nome))

/** `CON-10`: a edição confere a versão lida. */
const saveConfereVersao = (texto: string): boolean =>
  /if v_atual\.version <> \(p->>'version'\)::integer then\s+return jsonb_build_object\('error', 'version_conflict'\)/i.test(
    corpo(texto, 'save_order_proposal'),
  )

/** O duplo clique devolve a mesma proposta. */
const saveDeduplicaPorChave = (texto: string): boolean =>
  /from public\.order_proposals where idempotency_key = p->>'idempotency_key'/i.test(corpo(texto, 'save_order_proposal'))

/** A edição trava a linha. */
const saveTravaALinha = (texto: string): boolean =>
  /from public\.order_proposals where id = v_id for update/i.test(corpo(texto, 'save_order_proposal'))

/** `create_order_from_proposal`: trava a proposta, e os itens do pedido vêm das linhas da PROPOSTA (`PRC-03`). */
const criarTravaAProposta = (texto: string): boolean =>
  /from public\.order_proposals where id = p_proposal_id for update/i.test(corpo(texto, 'create_order_from_proposal'))

const itensVemDaProposta = (texto: string): boolean => {
  const c = corpo(texto, 'create_order_from_proposal')
  const m = c.match(/insert into public\.order_items[\s\S]*?;/i)?.[0] ?? ''
  return /from public\.order_proposal_items i\s+where i\.proposal_id = v_prop\.id/i.test(m) && !/p_order->'items'/i.test(c)
}

/** O e-mail do pedido é o da proposta (`A-07`), nunca o do corpo. */
const emailDaProposta = (texto: string): boolean => {
  const c = corpo(texto, 'create_order_from_proposal')
  return /v_prop\.id, v_prop\.customer_id, v_prop\.customer_email, 'pending'/i.test(c) && !/p_order->>'customer_email'/i.test(c)
}

/** Concluída devolve o mesmo pedido ANTES de conferir a versão (`CON-06`/`CON-07`). */
const concluidaAntesDaVersao = (texto: string): boolean => {
  const c = corpo(texto, 'create_order_from_proposal')
  const concluida = c.search(/if v_prop\.status = 'completed' then/i)
  const versao = c.search(/if v_prop\.version <> p_version then/i)
  return concluida >= 0 && versao > concluida
}

/** Vencida pelo relógio DO SERVIDOR recusa. */
const vencidaPeloServidor = (texto: string): boolean =>
  /if v_prop\.status = 'cancelled' or v_prop\.expires_at <= now\(\) then\s+return jsonb_build_object\('error', 'unavailable'\)/i.test(
    corpo(texto, 'create_order_from_proposal'),
  )

/** `CON-11`: só a primeira visita marca. */
const vistaUmaVez = (texto: string): boolean =>
  /where id = p_proposal_id and viewed_at is null and status = 'open'/i.test(corpo(texto, 'mark_order_proposal_viewed'))

// --- handle_new_customer ---------------------------------------------------------------------

/** A adoção: a ficha SEM conta (`user_id is null`) do mesmo e-mail normalizado ganha o `user_id`. */
const adotaFichaSemConta = (texto: string): boolean => {
  const c = corpo(texto, 'handle_new_customer')
  const update = c.match(/update public\.customers c[\s\S]*?;/i)?.[0] ?? ''
  return (
    /set user_id = new\.id/i.test(update) &&
    /c2\.user_id is null/i.test(update) &&
    /lower\(btrim\(c2\.email\)\)\s*=\s*lower\(btrim\(new\.email\)\)/i.test(update) &&
    /limit 1/i.test(update)
  )
}

/** A adoção vem ANTES do insert — depois, o insert já teria criado a segunda ficha. */
const adocaoAntesDoInsert = (texto: string): boolean => {
  const c = corpo(texto, 'handle_new_customer')
  const adocao = c.search(/update public\.customers c/i)
  const insert = c.search(/insert into public\.customers/i)
  return adocao >= 0 && insert > adocao
}

/** O que a 35 já fazia, intacto: insert idempotente por `user_id` e a adoção dos pedidos órfãos. */
const preservaA35 = (texto: string): boolean => {
  const c = corpo(texto, 'handle_new_customer')
  const pedidos = c.match(/update public\.orders o[\s\S]*?;/i)?.[0] ?? ''
  return (
    /on conflict \(user_id\) do nothing/i.test(c) &&
    /o\.customer_id is null/i.test(pedidos) &&
    /lower\(o\.customer_email\)\s*=\s*lower\(new\.email\)/i.test(pedidos)
  )
}

/** A última migration (ordem do `db push`) que cria `handle_new_customer`. */
const vigenteDoTrigger = (arquivos: { nome: string; texto: string }[]): string | null => {
  const criadoras = arquivos
    .filter((a) => /create\s+or\s+replace\s+function\s+public\.handle_new_customer\s*\(/i.test(semComentarios(a.texto)))
    .map((a) => a.nome)
    .sort()
  return criadoras[criadoras.length - 1] ?? null
}

const recarregaSchema = (texto: string): boolean => /notify pgrst,\s*'reload schema';/i.test(semComentarios(texto))

// -------------------------------------------------------------------------------------------

const disco = readdirSync(PASTA)
  .filter((f) => f.endsWith('.sql'))
  .map((nome) => ({ nome, texto: readFileSync(resolve(PASTA, nome), 'utf8') }))

describe('âncoras — a varredura olhou alguma coisa', () => {
  it('a migration da 89 existe e as três tabelas, as três RPCs e o gatilho foram achados nela', () => {
    expect(sql.length).toBeGreaterThan(5000)
    for (const t of TABELAS) expect(tabela(sql, t), t).not.toBeNull()
    for (const r of RPCS) expect(corpo(sql, r.nome), r.nome).not.toBe('')
    expect(corpo(sql, 'handle_new_customer')).not.toBe('')
  })

  it('a pasta de migrations foi lida, e nela a 35 e a 89 criam `handle_new_customer`', () => {
    expect(disco.length).toBeGreaterThan(70)
    const criadoras = disco
      .filter((a) => /create\s+or\s+replace\s+function\s+public\.handle_new_customer\s*\(/i.test(semComentarios(a.texto)))
      .map((a) => a.nome)
    expect(criadoras).toContain(NOME_35)
    expect(criadoras).toContain(NOME_89)
  })
})

describe('as tabelas da proposta são fechadas (SEG-05)', () => {
  it.each(TABELAS)('RLS ligada em %s', (t) => {
    expect(rlsLigada(sql, t)).toBe(true)
  })
  it.each(TABELAS)('SENSOR: sem o `enable row level security` de %s reprova', (t) => {
    expect(rlsLigada(mutar(sql, `alter table public.${t} enable row level security;`, ''), t)).toBe(false)
  })

  const pares = TABELAS.flatMap((t) => PAPEIS_DE_CLIENTE.map((p) => [t, p] as const))
  it.each(pares)('revoga tudo de %s de `%s`', (t, p) => {
    expect(revogaTabela(sql, t, p)).toBe(true)
  })
  it.each(pares)('SENSOR: sem o revoke de %s de `%s` reprova', (t, p) => {
    expect(revogaTabela(mutar(sql, `revoke all on table public.${t} from ${p};`, ''), t, p)).toBe(false)
  })

  it.each(PAPEIS_DE_CLIENTE)('revoga a sequência de `%s`', (p) => {
    expect(revogaTabela(sql, 'order_proposal_seq', p, 'sequence')).toBe(true)
  })
  it.each(PAPEIS_DE_CLIENTE)('SENSOR: sem o revoke da sequência de `%s` reprova', (p) => {
    const mutado = mutar(sql, `revoke all on sequence public.order_proposal_seq from ${p};`, '')
    expect(revogaTabela(mutado, 'order_proposal_seq', p, 'sequence')).toBe(false)
  })

  it('nenhuma policy — a loja e o painel só alcançam as tabelas pelas functions', () => {
    expect(nenhumaPolicy(sql)).toBe(true)
  })
  it('SENSOR: uma policy `to authenticated` reprova, e a mesma em comentário não — LF e CRLF', () => {
    for (const quebra of ['\n', '\r\n']) {
      const linha = 'create policy "le" on public.order_proposals for select to authenticated using (true);'
      expect(nenhumaPolicy(`${sql}${quebra}-- ${linha}${quebra}`)).toBe(true)
      expect(nenhumaPolicy(`${sql}${quebra}${linha}${quebra}`)).toBe(false)
    }
  })

  it('nenhum `grant` alcança papel de cliente', () => {
    expect(nenhumGrantDeCliente(sql)).toBe(true)
  })
  it('SENSOR: um grant de select a `anon` reprova', () => {
    expect(nenhumGrantDeCliente(`${sql}\ngrant select on public.order_proposals to anon;\n`)).toBe(false)
  })
})

describe('as três RPCs — security definer, search_path vazio, execute só da service role', () => {
  it.each(RPCS)('$nome é security definer', ({ nome }) => {
    expect(securityDefiner(sql, nome)).toBe(true)
  })
  it.each(RPCS)('SENSOR: $nome como security invoker reprova', ({ nome }) => {
    expect(securityDefiner(mutarNaFuncao(sql, nome, 'security definer', 'security invoker'), nome)).toBe(false)
  })

  it.each(RPCS)("$nome tem search_path = ''", ({ nome }) => {
    expect(searchPathVazio(sql, nome)).toBe(true)
  })
  it.each(RPCS)('SENSOR: $nome com search_path = public reprova', ({ nome }) => {
    expect(searchPathVazio(mutarNaFuncao(sql, nome, "set search_path = ''", 'set search_path = public'), nome)).toBe(false)
  })

  const trios = RPCS.flatMap((r) => PAPEIS_DE_CLIENTE.map((p) => [r.nome, r.assinatura, p] as const))
  it.each(trios)('%s(%s) revogada de `%s`', (nome, assinatura, p) => {
    expect(revogaFuncao(sql, nome, assinatura, p)).toBe(true)
  })
  it.each(trios)('SENSOR: sem o revoke de %s(%s) de `%s` reprova', (nome, assinatura, p) => {
    const mutado = mutar(sql, `revoke all on function public.${nome}(${assinatura}) from ${p};`, '')
    expect(revogaFuncao(mutado, nome, assinatura, p)).toBe(false)
  })

  it.each(RPCS)('$nome: execute concedido só à service_role', ({ nome, assinatura }) => {
    expect(executaSoServiceRole(sql, nome, assinatura)).toBe(true)
  })
  it.each(RPCS)('SENSOR: $nome sem o grant à service_role, ou com um segundo grant, reprova', ({ nome, assinatura }) => {
    const linha = `grant execute on function public.${nome}(${assinatura}) to service_role;`
    expect(executaSoServiceRole(mutar(sql, linha, ''), nome, assinatura)).toBe(false)
    expect(executaSoServiceRole(mutar(sql, linha, `${linha}\n${linha.replace('service_role', 'authenticated')}`), nome, assinatura)).toBe(
      false,
    )
  })
})

describe('os `check`s da proposta', () => {
  it('quantidade de 1 a 99', () => {
    expect(checkQuantidade(sql)).toBe(true)
  })
  it('SENSOR: quantidade até 100 reprova', () => {
    expect(checkQuantidade(mutar(sql, 'quantity between 1 and 99', 'quantity between 1 and 100'))).toBe(false)
  })

  it('motivo de 1 a 120 caracteres', () => {
    expect(checkMotivo(sql)).toBe(true)
  })
  it('SENSOR: motivo até 200 reprova', () => {
    expect(checkMotivo(mutar(sql, 'between 1 and 120', 'between 1 and 200'))).toBe(false)
  })

  it('itens somam pelo menos R$ 1,00 (A-12)', () => {
    expect(checkItensMinimo(sql)).toBe(true)
  })
  it('SENSOR: itens ≥ 0 reprova', () => {
    expect(checkItensMinimo(mutar(sql, 'check (items_total >= 1.00)', 'check (items_total >= 0)'))).toBe(false)
  })

  it('porcentagem de 0,01 a 99,99', () => {
    expect(checkPercentual(sql)).toBe(true)
  })
  it('SENSOR: porcentagem até 100 reprova', () => {
    expect(checkPercentual(mutar(sql, 'between 0.01 and 99.99', 'between 0.01 and 100'))).toBe(false)
  })

  it('tipo, valor e motivo do desconto avulso andam juntos', () => {
    expect(checkAvulsoJunto(sql)).toBe(true)
  })
  it('SENSOR: sem o par do motivo reprova', () => {
    const mutado = mutar(sql, '\n    and (manual_discount_kind is null) = (manual_discount_reason is null)', '')
    expect(checkAvulsoJunto(mutado)).toBe(false)
  })

  it('status: open, completed, cancelled — "expirada" é derivada de expires_at', () => {
    expect(statusSemExpirada(sql)).toEqual(['open', 'completed', 'cancelled'])
  })
  it('SENSOR: gravar `expired` como status deixa de ser os três', () => {
    expect(statusSemExpirada(mutar(sql, "'open', 'completed', 'cancelled'", "'open', 'completed', 'cancelled', 'expired'"))).not.toEqual([
      'open',
      'completed',
      'cancelled',
    ])
  })

  it('o token só como hash, único (SEG-01)', () => {
    expect(tokenSoHash(sql)).toBe(true)
  })
  it('SENSOR: hash sem `unique` reprova', () => {
    expect(tokenSoHash(mutar(sql, 'token_hash text not null unique', 'token_hash text not null'))).toBe(false)
  })
})

describe('o pedido carrega a origem (CON-06)', () => {
  it('`orders.proposal_id` é único e referencia a proposta', () => {
    expect(proposalIdUnico(sql)).toBe(true)
  })
  it('SENSOR: `proposal_id` sem `unique` reprova', () => {
    expect(proposalIdUnico(mutar(sql, 'proposal_id uuid unique references', 'proposal_id uuid references'))).toBe(false)
  })

  it('`orders.manual_discount` nasce com default 0 e not null', () => {
    expect(descontoAvulsoNoPedido(sql)).toBe(true)
  })
  it('SENSOR: `manual_discount` anulável reprova', () => {
    expect(descontoAvulsoNoPedido(mutar(sql, 'manual_discount numeric(10,2) not null default 0\n', 'manual_discount numeric(10,2)\n'))).toBe(
      false,
    )
  })
})

describe('`save_order_proposal` — o que só o banco confere', () => {
  it('procura a ficha por lower(btrim(email)), com o e-mail normalizado na entrada (MON-03)', () => {
    expect(saveProcuraFichaPorEmailNormalizado(sql)).toBe(true)
  })
  it('SENSOR: comparar o e-mail cru reprova', () => {
    expect(saveProcuraFichaPorEmailNormalizado(mutar(sql, 'where lower(btrim(c.email)) = v_email', 'where c.email = v_email'))).toBe(false)
  })

  it('a ficha nova nasce sem conta (A-09)', () => {
    expect(saveCriaFichaSemConta(sql)).toBe(true)
  })

  it('confere a versão lida (CON-10)', () => {
    expect(saveConfereVersao(sql)).toBe(true)
  })
  it('SENSOR: sem a conferência de versão reprova', () => {
    expect(saveConfereVersao(mutar(sql, "if v_atual.version <> (p->>'version')::integer then", 'if false then'))).toBe(false)
  })

  it('deduplica pela chave de idempotência', () => {
    expect(saveDeduplicaPorChave(sql)).toBe(true)
  })
  it('SENSOR: sem a leitura pela chave reprova', () => {
    expect(saveDeduplicaPorChave(mutar(sql, "where idempotency_key = p->>'idempotency_key'", 'where false'))).toBe(false)
  })

  it('a edição trava a linha (`for update`)', () => {
    expect(saveTravaALinha(sql)).toBe(true)
  })
  it('SENSOR: sem `for update` reprova', () => {
    expect(saveTravaALinha(mutar(sql, 'where id = v_id for update', 'where id = v_id'))).toBe(false)
  })
})

describe('a trava consultiva por e-mail é a MESMA nos dois lados', () => {
  it.each(['save_order_proposal', 'handle_new_customer'])('%s trava por `customer-email:`', (nome) => {
    expect(travaPorEmail(sql, nome)).toBe(true)
  })
  it('SENSOR: outra chave no gatilho reprova', () => {
    const mutado = mutar(sql, "perform pg_advisory_xact_lock(hashtext('customer-email:' || lower(btrim(new.email))));", "perform pg_advisory_xact_lock(hashtext('conta:' || new.email));")
    expect(travaPorEmail(mutado, 'handle_new_customer')).toBe(false)
  })
})

describe('`create_order_from_proposal` — o pedido nasce da proposta', () => {
  it('trava a proposta (`for update`)', () => {
    expect(criarTravaAProposta(sql)).toBe(true)
  })
  it('SENSOR: sem `for update` reprova', () => {
    expect(criarTravaAProposta(mutar(sql, 'where id = p_proposal_id for update', 'where id = p_proposal_id'))).toBe(false)
  })

  it('os itens do pedido vêm das linhas da proposta, nunca do corpo (PRC-03)', () => {
    expect(itensVemDaProposta(sql)).toBe(true)
  })
  it('SENSOR: itens lidos do corpo reprova', () => {
    const mutado = mutar(sql, '    from public.order_proposal_items i\n   where i.proposal_id = v_prop.id', "    from jsonb_to_recordset(p_order->'items') i")
    expect(itensVemDaProposta(mutado)).toBe(false)
  })

  it('o e-mail do pedido é o da proposta (A-07)', () => {
    expect(emailDaProposta(sql)).toBe(true)
  })
  it('SENSOR: e-mail do corpo reprova', () => {
    const mutado = mutar(sql, "v_prop.id, v_prop.customer_id, v_prop.customer_email, 'pending'", "v_prop.id, v_prop.customer_id, p_order->>'customer_email', 'pending'")
    expect(emailDaProposta(mutado)).toBe(false)
  })

  it('concluída devolve o mesmo pedido ANTES de conferir a versão (CON-06, CON-07)', () => {
    expect(concluidaAntesDaVersao(sql)).toBe(true)
  })
  it('SENSOR: a versão conferida antes reprova', () => {
    const versao = "  if v_prop.version <> p_version then\n    return jsonb_build_object('error', 'proposal_changed');\n  end if;\n"
    const semVersao = mutar(sql, versao, '')
    const mutado = mutar(semVersao, "  if v_prop.status = 'completed' then", `${versao}  if v_prop.status = 'completed' then`)
    expect(concluidaAntesDaVersao(mutado)).toBe(false)
  })

  it('cancelada ou vencida pelo relógio do servidor recusa (CON-08)', () => {
    expect(vencidaPeloServidor(sql)).toBe(true)
  })
  it('SENSOR: sem o `expires_at <= now()` reprova', () => {
    expect(vencidaPeloServidor(mutar(sql, " or v_prop.expires_at <= now() then\n    return jsonb_build_object('error', 'unavailable')", " then\n    return jsonb_build_object('error', 'unavailable')"))).toBe(false)
  })
})

describe('`mark_order_proposal_viewed` — uma vez (CON-11)', () => {
  it('só marca quando `viewed_at is null` e aberta', () => {
    expect(vistaUmaVez(sql)).toBe(true)
  })
  it('SENSOR: sem o `viewed_at is null` reprova', () => {
    expect(vistaUmaVez(mutar(sql, 'and viewed_at is null and status', 'and status'))).toBe(false)
  })
})

describe('`handle_new_customer` — a adoção da ficha (A-09)', () => {
  it('a vigente é a da 89', () => {
    expect(vigenteDoTrigger(disco)).toBe(NOME_89)
  })
  it('SENSOR: sem a 89, a vigente volta a ser a da 35 (sem adoção)', () => {
    expect(vigenteDoTrigger(disco.filter((a) => a.nome !== NOME_89))).toBe(NOME_35)
    expect(adotaFichaSemConta(readFileSync(resolve(PASTA, NOME_35), 'utf8'))).toBe(false)
  })

  it('security definer — o gatilho da 59 só deixa trocar `user_id` fora dos papéis de cliente', () => {
    expect(securityDefiner(sql, 'handle_new_customer')).toBe(true)
  })

  it('adota a ficha SEM conta do mesmo e-mail normalizado, uma só', () => {
    expect(adotaFichaSemConta(sql)).toBe(true)
  })
  it('SENSOR: sem o recorte `user_id is null` reprova (roubaria a ficha de outra conta)', () => {
    expect(adotaFichaSemConta(mutar(sql, 'where c2.user_id is null\n          and ', 'where '))).toBe(false)
  })
  it('SENSOR: comparar o e-mail cru reprova', () => {
    expect(adotaFichaSemConta(mutar(sql, 'lower(btrim(c2.email)) = lower(btrim(new.email))', 'c2.email = new.email'))).toBe(false)
  })

  it('a adoção vem ANTES do insert', () => {
    expect(adocaoAntesDoInsert(sql)).toBe(true)
  })
  it('SENSOR: o insert antes da adoção reprova', () => {
    const c = corpo(sql, 'handle_new_customer')
    const adocao = c.match(/ {2}if new\.email is not null then\n {4}perform[\s\S]*?\n {2}end if;\n/)![0]
    const semAdocao = mutar(sql, adocao, '')
    const mutado = mutar(semAdocao, '  if v_customer_id is null then\n    select id', `${adocao}  if v_customer_id is null then\n    select id`)
    expect(adocaoAntesDoInsert(mutado)).toBe(false)
  })

  it('preserva o que a 35 fazia: insert idempotente e a adoção dos pedidos órfãos por lower()', () => {
    expect(preservaA35(sql)).toBe(true)
  })
  it('SENSOR: adoção de pedido sem o recorte de órfão reprova', () => {
    expect(preservaA35(mutar(sql, '     where o.customer_id is null\n       and lower', '     where lower'))).toBe(false)
  })
})

describe('o resto da migration', () => {
  it('nenhuma escrita de dado fora dos corpos das funções', () => {
    expect(semEscritaDeDado(sql)).toBe(true)
  })
  it('SENSOR: um `update` solto, ou um `insert` solto, reprova', () => {
    expect(semEscritaDeDado(`${sql}\nupdate public.customers set user_id = null;\n`)).toBe(false)
    expect(semEscritaDeDado(`${sql}\ninsert into public.order_proposals (number) values ('P-0001');\n`)).toBe(false)
  })

  it('termina avisando o PostgREST', () => {
    expect(recarregaSchema(sql)).toBe(true)
  })
  it('SENSOR: sem o notify reprova', () => {
    expect(recarregaSchema(mutar(sql, "notify pgrst, 'reload schema';", ''))).toBe(false)
  })
})

describe('o `mutar` do próprio guarda', () => {
  it('lança quando o alvo não existe', () => {
    expect(() => mutar(sql, 'texto que não está na migration', 'x')).toThrow(/não encontrou o alvo/)
  })
})
