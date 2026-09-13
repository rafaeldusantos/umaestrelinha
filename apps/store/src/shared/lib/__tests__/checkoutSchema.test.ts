import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * O guarda da migration da feature `49` — o checkout que deixa de exigir conta.
 *
 * Lê o `.sql` **do disco**, como `menuSchema`, `homeSections`, `faqSchema` e `importSchema`. O
 * motivo é o de sempre: **afrouxar uma migration não quebra nada**. Um `security definer` que cai,
 * um `grant` que alcança `anon`, um índice único que deixa de ser parcial — tudo isso aplica limpo
 * e passa em build, em `tsc` e em teste de componente. Quem descobre é a cliente, com o pedido
 * duplicado, ou ninguém, com `auth.users` respondendo a quem perguntar.
 *
 * Duas asserções aqui guardam coisas que **só se pagam no dia do deploy**:
 *
 * - **`account_exists` fechada a `anon`** é o que mantém o teto por IP relevante. A função responde
 *   um booleano, então parece inofensiva abri-la — e aberta ela vira um enumerador de e-mail com a
 *   anon key publicada no bundle, por fora do teto que a edge function aplica.
 * - **O índice parcial** é o que faz `client_request_id` nulo continuar valendo para todo pedido
 *   importado e para todo pedido anterior a esta feature. Total, ele declararia uma regra que não é
 *   verdade.
 *
 * Cada régua é um **predicado**, para poder ser exercida contra texto mutado. Sem esse par, uma
 * asserção que sempre passa é indistinguível de uma que funciona — e o modo de falhar de um teste
 * que lê disco é varrer o vazio e ficar verde.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const CAMINHO = resolve(ROOT, 'supabase/migrations/20260913120000_49-checkout-sem-conta.sql')
/** A migration da `35`, que esta feature NÃO altera e da qual passa a depender. */
const CAMINHO_35 = resolve(
  ROOT,
  'supabase/migrations/20260830120000_35-clientes-e-pedidos-nuvemshop.sql',
)

const sql = readFileSync(CAMINHO, 'utf8')
const sql35 = readFileSync(CAMINHO_35, 'utf8')

/** As três colunas que a feature acrescenta a `orders`. */
const COLUNAS_NOVAS = [
  'client_request_id',
  'guest_access_hash',
  'guest_access_expires_at',
] as const

// -------------------------------------------------------------------------------------------
// As réguas, como predicados
// -------------------------------------------------------------------------------------------

/** Coluna acrescentada de forma reexecutável: `add column if not exists <nome>`. */
const colunaAditiva = (texto: string, coluna: string): boolean =>
  new RegExp(`add column if not exists\\s+${coluna}\\s`, 'i').test(texto)

/**
 * O índice de idempotência é **único E parcial**. A cláusula `where` é conferida junto do `unique`:
 * um índice único total aplicaria limpo hoje (só há nulos) e recusaria o segundo pedido importado
 * amanhã.
 */
const indiceUnicoParcial = (texto: string): boolean =>
  /create unique index if not exists\s+idx_orders_client_request_id\s+on\s+public\.orders\s*\(\s*client_request_id\s*\)\s+where\s+client_request_id is not null/is.test(
    texto,
  )

/** `account_exists` é `security definer` com `search_path` fechado. */
const definerComSearchPathVazio = (texto: string): boolean =>
  /create or replace function public\.account_exists\(p_email text\)[\s\S]{0,200}?security definer[\s\S]{0,80}?set search_path\s*=\s*''/i.test(
    texto,
  )

/** A comparação é por `lower()` nos DOIS lados — senão a mesma pessoa vira duas. */
const comparaPorLower = (texto: string): boolean =>
  /lower\(u\.email\)\s*=\s*lower\(trim\(p_email\)\)/i.test(texto)

/** Conta apagada não conta como conta existente. */
const ignoraContaApagada = (texto: string): boolean => /u\.deleted_at is null/i.test(texto)

/** `revoke ... from <papel>` para a função. */
const revogaDe = (texto: string, papel: string): boolean =>
  new RegExp(
    `revoke all on function public\\.account_exists\\(text\\) from ${papel}\\s*;`,
    'i',
  ).test(texto)

/** `grant execute ... to <papel>`. */
const concedeA = (texto: string, papel: string): boolean =>
  new RegExp(
    `grant execute on function public\\.account_exists\\(text\\) to ${papel}\\s*;`,
    'i',
  ).test(texto)

/**
 * Escrita de DADO na migration — `insert`, `update` ou `delete` de linha.
 *
 * Comentário fora primeiro, e de linha **e** de bloco na MESMA varredura: o cabeçalho desta
 * migration explica em prosa que ela "nao semeia, nao atualiza e nao apaga NENHUMA linha", e uma
 * régua que casasse menção acusaria exatamente o arquivo que está certo.
 */
const semComentario = (texto: string): string =>
  texto.replace(/\/\*[\s\S]*?\*\/|--[^\n\r]*/g, '')

const escreveDado = (texto: string): boolean =>
  /\b(insert\s+into|update\s+public\.|delete\s+from)\b/i.test(semComentario(texto))

/**
 * A view `customer_directory` (migration `35`) exclui do ramo derivado todo e-mail que já tem linha
 * em `customers`.
 *
 * **Esta feature depende disso e não o escreve.** Até a `49`, convidada nunca virava `customers`, e
 * o `where not exists` era redundante na prática. A partir dela toda convidada vira — e, sem o
 * recorte, a MESMA pessoa apareceria duas vezes na tela de Clientes: uma pela tabela, outra pelo
 * ramo derivado dos pedidos. Nada quebraria; a lista só passaria a mentir.
 */
const diretorioExcluiQuemJaTemFicha = (texto: string): boolean =>
  /where not exists\s*\(\s*select 1 from public\.customers c2 where lower\(c2\.email\) = g\.email_key\s*\)/is.test(
    texto,
  )

// -------------------------------------------------------------------------------------------

describe('migration da 49 — âncoras de leitura', () => {
  it('a varredura leu os DOIS arquivos, e são os certos', () => {
    // Sem âncora, um caminho errado varreria string vazia e TODA asserção de ausência abaixo
    // passaria em silêncio — a pior falha possível num teste que lê disco.
    expect(sql.length).toBeGreaterThan(2000)
    expect(sql).toContain('49 · checkout sem conta')
    expect(sql35.length).toBeGreaterThan(2000)
    expect(sql35).toContain('customer_directory')
  })

  it('a varredura encontra as três colunas novas — âncora de contagem', () => {
    const achadas = COLUNAS_NOVAS.filter((c) => colunaAditiva(sql, c))

    expect(achadas).toHaveLength(3)
  })
})

describe('migration da 49 — orders ganha o acesso da convidada', () => {
  it.each(COLUNAS_NOVAS)('%s é acrescentada com `if not exists`', (coluna) => {
    expect(colunaAditiva(sql, coluna)).toBe(true)
  })

  it('sensor — uma coluna sem `if not exists` reprova na mesma régua', () => {
    const mutante = sql.replace(
      'add column if not exists guest_access_hash',
      'add column guest_access_hash',
    )

    expect(colunaAditiva(mutante, 'guest_access_hash')).toBe(false)
  })

  it('o índice de idempotência é único E parcial', () => {
    expect(indiceUnicoParcial(sql)).toBe(true)
  })

  it('sensor — o índice sem a cláusula `where` reprova', () => {
    // A mutação que aplica limpo hoje (só há nulos) e recusa o segundo pedido importado amanhã.
    const mutante = sql.replace(/\s+where\s+client_request_id is not null;/i, ';')

    expect(indiceUnicoParcial(mutante)).toBe(false)
  })

  it('sensor — o índice sem `unique` reprova', () => {
    const mutante = sql.replace('create unique index if not exists', 'create index if not exists')

    expect(indiceUnicoParcial(mutante)).toBe(false)
  })
})

describe('migration da 49 — account_exists é fechada', () => {
  it('é `security definer` com `search_path` vazio', () => {
    expect(definerComSearchPathVazio(sql)).toBe(true)
  })

  it('sensor — perder o `security definer` reprova', () => {
    const mutante = sql.replace('security definer\n', '')

    expect(definerComSearchPathVazio(mutante)).toBe(false)
  })

  it('sensor — `search_path` preenchido reprova', () => {
    // `set search_path = public` deixaria a função resolvível por schema injetado.
    const mutante = sql.replace("set search_path = ''", 'set search_path = public')

    expect(definerComSearchPathVazio(mutante)).toBe(false)
  })

  it('compara por `lower()` nos dois lados', () => {
    expect(comparaPorLower(sql)).toBe(true)
  })

  it('sensor — comparar cru reprova', () => {
    const mutante = sql.replace(
      'lower(u.email) = lower(trim(p_email))',
      'u.email = trim(p_email)',
    )

    expect(comparaPorLower(mutante)).toBe(false)
  })

  it('conta apagada não conta como conta existente', () => {
    expect(ignoraContaApagada(sql)).toBe(true)
  })

  it('revoga de `public`, `anon` e `authenticated`', () => {
    expect(revogaDe(sql, 'public')).toBe(true)
    expect(revogaDe(sql, 'anon')).toBe(true)
    expect(revogaDe(sql, 'authenticated')).toBe(true)
  })

  it('concede execute SÓ a `service_role`', () => {
    expect(concedeA(sql, 'service_role')).toBe(true)
    expect(concedeA(sql, 'anon')).toBe(false)
    expect(concedeA(sql, 'authenticated')).toBe(false)
  })

  it('sensor — um `grant` a `anon` É acusado', () => {
    // A mutação que transforma a função num enumerador de e-mail com a anon key do bundle.
    const mutante = `${sql}\ngrant execute on function public.account_exists(text) to anon;`

    expect(concedeA(mutante, 'anon')).toBe(true)
  })

  it('sensor — perder o `revoke` de `anon` reprova', () => {
    const mutante = sql.replace(
      'revoke all on function public.account_exists(text) from anon;',
      '',
    )

    expect(revogaDe(mutante, 'anon')).toBe(false)
  })
})

describe('migration da 49 — é aditiva e não toca em dado', () => {
  it('não faz insert, update nem delete de linha', () => {
    expect(escreveDado(sql)).toBe(false)
  })

  it('sensor do removedor de comentário — a MENÇÃO em prosa não é acusada, o USO é', () => {
    // O cabeçalho desta migration diz, em comentário, que ela "nao semeia, nao atualiza e nao
    // apaga NENHUMA linha". Uma régua que casasse menção reprovaria o arquivo que está certo.
    expect(escreveDado('-- nao faz insert into nem delete from nada\nselect 1;')).toBe(false)
    expect(escreveDado('/* insert into x */\r\nselect 1;')).toBe(false)
    expect(escreveDado('insert into public.orders (id) values (1);')).toBe(true)
    expect(escreveDado('update public.orders set total = 0;')).toBe(true)
  })

  it('não derruba as policies de INSERT — a janela de deploy é declarada, não fechada à força', () => {
    // Decisão registrada no design: entre o `db push` e o deploy da Vercel há minutos em que aba
    // já aberta ainda insere pelo caminho antigo. Quem impede o segundo gravador é o guarda que lê
    // `apps/**`, não a policy.
    expect(/drop policy[^\n]*orders/i.test(semComentario(sql))).toBe(false)
  })
})

describe('a 49 depende de um recorte da 35 que ela não escreve', () => {
  it('customer_directory exclui do ramo derivado quem já tem ficha em customers', () => {
    expect(diretorioExcluiQuemJaTemFicha(sql35)).toBe(true)
  })

  it('sensor — sem o recorte, a régua reprova', () => {
    // A partir da `49` toda convidada vira `customers`. Sem este `where not exists`, a mesma
    // pessoa apareceria DUAS vezes na tela de Clientes — uma pela tabela, outra pelos pedidos.
    const mutante = sql35.replace(
      /where not exists\s*\(\s*select 1 from public\.customers c2 where lower\(c2\.email\) = g\.email_key\s*\)/is,
      '',
    )

    expect(diretorioExcluiQuemJaTemFicha(mutante)).toBe(false)
  })
})
