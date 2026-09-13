import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * O guarda da migration da feature 48 — a invariante "o painel nunca fica sem admin".
 *
 * Lê o `.sql` **do disco**, como `materialTransitions`, `homeSections`, `menuSchema` e `faqSchema`.
 * O motivo é o de sempre: **afrouxar uma migration não quebra nada**. Um trigger que passa a decidir
 * por identidade, um `count` que perde o `id <> old.id`, o advisory lock que some — tudo isso aplica
 * limpo e passa em build, em `tsc` e em teste de componente. Quem descobre é quem tentar entrar no
 * painel depois que a última linha de admin sumiu, e aí **não há tela para consertar**: `has_role`
 * devolve false para todo mundo e toda policy de admin do schema fecha junto.
 *
 * Mora na suíte da loja pelo mesmo motivo que `homeSections` e `materialTransitions`: é onde os
 * guardas que leem migration já vivem, por acidente de origem — não porque guardem a loja.
 *
 * Cada régua é um **predicado**, para poder ser exercida contra texto mutado. Sem esse par, uma
 * asserção que sempre passa é indistinguível de uma que funciona — e o modo de falhar de um teste
 * que lê disco é varrer o vazio e ficar verde.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const CAMINHO = resolve(ROOT, 'supabase/migrations/20260913120000_48-usuarios-do-painel.sql')

const sql = readFileSync(CAMINHO, 'utf8')

/**
 * O SQL **sem os comentários de linha**.
 *
 * Toda régua de ausência abaixo precisa disto, e não é zelo: a migration EXPLICA por escrito que
 * decide por contagem "nunca pela identidade da linha", e cita `for update` para dizer por que NÃO
 * o usa. Sem tirar os comentários, a prosa que documenta a regra derrubaria a própria regra — e a
 * saída óbvia (apagar a prosa) é a errada, porque é ali que mora o "não fiz de propósito".
 *
 * `[^\r\n]` fecha antes do `\r`: o repositório roda em Windows e os dois finais aparecem (`L-031`).
 */
const semComentarios = (texto: string): string => texto.replace(/--[^\r\n]*/g, '')

const codigo = semComentarios(sql)
const codigoMinusculo = codigo.toLowerCase()

// -------------------------------------------------------------------------------------------
// As réguas, como predicados — uma POR COMANDO, nunca uma para a família (L-033)
// -------------------------------------------------------------------------------------------

/** A função existe, é `plpgsql` e fixa o `search_path`. */
const funcaoDeclarada = (texto: string): boolean =>
  /create or replace function\s+public\.guard_last_admin\(\)/i.test(texto) &&
  /language\s+plpgsql/i.test(texto) &&
  /set\s+search_path\s*=\s*public/i.test(texto)

/** O trigger dispara **antes** de `update` e de `delete`, por linha, e chama a função. */
const triggerDeclarado = (texto: string): boolean =>
  /create trigger\s+trg_user_roles_last_admin_guard\s+before\s+update\s+or\s+delete\s+on\s+public\.user_roles\s+for each row\s+execute function\s+public\.guard_last_admin\(\)/is.test(
    texto,
  )

/** Idempotente: o `drop trigger if exists` precede o `create trigger`. */
const triggerIdempotente = (texto: string): boolean => {
  const drop = texto.search(/drop trigger if exists\s+trg_user_roles_last_admin_guard/i)
  const cria = texto.search(/create trigger\s+trg_user_roles_last_admin_guard/i)
  return drop !== -1 && cria !== -1 && drop < cria
}

/**
 * A decisão é por **contagem dos admins restantes**, e o `id <> old.id` é o que a torna correta.
 *
 * Sem o recorte, a linha que está sendo apagada ainda conta (o trigger é `before`), o total nunca
 * chega a zero, e o guarda **nunca dispara** — com a suíte verde e a migration aplicando limpa.
 */
const contaRestantes = (texto: string): boolean =>
  /select\s+count\(\*\)\s+into\s+restantes\s+from\s+public\.user_roles\s+where\s+role\s*=\s*'admin'\s+and\s+id\s*<>\s*old\.id/is.test(
    texto,
  )

/** A recusa é disparada pela contagem chegando a zero — não por comparar a linha com alguém. */
const recusaPorContagem = (texto: string): boolean =>
  /if\s+restantes\s*=\s*0\s+then/i.test(texto)

/** `errcode = '23514'`, para o PostgREST reportar como violação de constraint. */
const errcodeDeCheck = (texto: string): boolean => /using\s+errcode\s*=\s*'23514'/i.test(texto)

/** O advisory lock serializa a mutação de papel — é o que fecha `USR-16` para duas ao mesmo tempo. */
const serializaPorAdvisoryLock = (texto: string): boolean =>
  /perform\s+pg_advisory_xact_lock\s*\(/i.test(texto)

/** A concessão de admin (INSERT) **não** passa pelo trigger — é o que a feature existe para fazer. */
const naoAlcancaInsert = (texto: string): boolean =>
  !/create trigger[\s\S]*?\binsert\b[\s\S]*?on\s+public\.user_roles/i.test(texto)

/** Nenhum `grant` alcança `anon`. */
const grantParaAnon = (texto: string): boolean => /grant[\s\S]{0,200}?\bto\b[\s\S]{0,40}?\banon\b/i.test(texto)

/** Nenhuma escrita de DADO — a migration é estrutural. */
const escreveDado = (texto: string): boolean =>
  /^\s*(insert\s+into|update\s+public\.|delete\s+from)\s/im.test(texto)

// -------------------------------------------------------------------------------------------

describe('migration 48 — a varredura enxerga o arquivo (âncora dupla)', () => {
  it('o arquivo foi lido e tem conteúdo', () => {
    // Primeira âncora: um caminho errado devolveria string vazia e TODAS as réguas de ausência
    // abaixo passariam — que é a pior falha possível num teste que lê disco.
    expect(sql.length).toBeGreaterThan(1500)
  })

  it('os comandos esperados foram ENCONTRADOS', () => {
    // Segunda âncora: contar que o arquivo existe não basta. Se a migration for reescrita para
    // outra coisa, as réguas de ausência continuariam verdes sobre um arquivo que não guarda nada.
    expect(funcaoDeclarada(codigo)).toBe(true)
    expect(triggerDeclarado(codigo)).toBe(true)
    expect(codigoMinusculo).toContain('comment on function public.guard_last_admin()')
  })
})

describe('migration 48 — o trigger', () => {
  it('declara a função com `plpgsql` e `search_path` fixo', () => {
    expect(funcaoDeclarada(codigo)).toBe(true)
  })

  it('dispara BEFORE UPDATE OR DELETE, por linha, sobre `public.user_roles`', () => {
    expect(triggerDeclarado(codigo)).toBe(true)
  })

  it('é idempotente — o `drop ... if exists` vem antes do `create`', () => {
    expect(triggerIdempotente(codigo)).toBe(true)
  })

  it('NÃO alcança `insert` — conceder admin é a operação que a feature existe para permitir', () => {
    expect(naoAlcancaInsert(codigo)).toBe(true)
  })

  it('carrega `comment on function` explicando por que existe', () => {
    expect(codigoMinusculo).toContain('comment on function public.guard_last_admin()')
  })
})

describe('migration 48 — decide por CONTAGEM, nunca por identidade (USR-16)', () => {
  it('conta os admins restantes recortando a própria linha com `id <> old.id`', () => {
    // Sem o recorte o trigger é `before`, a linha ainda conta, o total nunca chega a zero, e o
    // guarda NUNCA dispara — com a migration aplicando limpa.
    expect(contaRestantes(codigo)).toBe(true)
  })

  it('a recusa é disparada pela contagem chegando a zero', () => {
    expect(recusaPorContagem(codigo)).toBe(true)
  })

  it('não compara a linha com um id, e-mail ou nome fixo', () => {
    // A régua que impede o guarda de proteger "a conta da Adri" em vez da invariante. Um guarda por
    // identidade envelhece no dia em que a conta dela mudar, e barra a troca legítima de quem
    // administra a loja.
    expect(codigo).not.toMatch(/old\.user_id\s*=\s*'[0-9a-f-]{36}'/i)
    expect(codigo).not.toMatch(/\badmin@[\w.-]+/i)
  })

  it('usa `errcode = 23514` para o PostgREST reportar como violação de constraint', () => {
    expect(errcodeDeCheck(codigo)).toBe(true)
  })

  it('serializa por advisory lock — duas remoções simultâneas não passam as duas', () => {
    expect(serializaPorAdvisoryLock(codigo)).toBe(true)
  })
})

describe('migration 48 — o que ela NÃO pode fazer', () => {
  it('nenhum `grant` alcança `anon`', () => {
    expect(grantParaAnon(codigo)).toBe(false)
  })

  it('não escreve dado nenhum — é estrutural', () => {
    expect(escreveDado(codigo)).toBe(false)
  })
})

// -------------------------------------------------------------------------------------------
// Sensores por mutação — cada régua acima medida contra o texto DOENTE
//
// Sem eles, uma régua que sempre devolve `true` (ou `false`, nas de ausência) é indistinguível de
// uma que funciona. As mutações são as que alguém faria de verdade ao "simplificar" a migration.
// -------------------------------------------------------------------------------------------

describe('migration 48 — os sensores', () => {
  it('o removedor de comentário é exercido de verdade — o arquivo TEM prosa', () => {
    // Âncora do próprio removedor: se a migration perdesse os comentários, os sensores de ausência
    // abaixo passariam por outro motivo, e ninguém saberia.
    expect(sql.length).toBeGreaterThan(codigo.length)
  })

  it('remove comentário com CRLF e com LF, na mesma varredura (L-031)', () => {
    expect(semComentarios('-- nada\r\nselect 1;')).toBe('\r\nselect 1;')
    expect(semComentarios('-- nada\nselect 1;')).toBe('\nselect 1;')
  })

  it('SENSOR — a régua da contagem reprova quando o `id <> old.id` some', () => {
    const doente = codigo.replace(/and\s+id\s*<>\s*old\.id/i, '')
    expect(contaRestantes(doente)).toBe(false)
  })

  it('SENSOR — a régua da contagem reprova quando vira comparação por identidade', () => {
    const doente = codigo.replace(
      /select\s+count\(\*\)\s+into\s+restantes[\s\S]*?old\.id;/i,
      "select 1 into restantes where old.user_id <> '00000000-0000-0000-0000-000000000000';",
    )
    expect(contaRestantes(doente)).toBe(false)
  })

  it('SENSOR — a régua do trigger reprova quando ele passa a ser só `before delete`', () => {
    // A mutação que deixa rebaixar o último admin por `update`, mantendo o `delete` protegido.
    const doente = codigo.replace(/before\s+update\s+or\s+delete/i, 'before delete')
    expect(triggerDeclarado(doente)).toBe(false)
  })

  it('SENSOR — a régua de idempotência reprova quando o `drop` some', () => {
    const doente = codigo.replace(/drop trigger if exists[^;]*;/i, '')
    expect(triggerIdempotente(doente)).toBe(false)
  })

  it('SENSOR — a régua do advisory lock reprova quando ele some', () => {
    const doente = codigo.replace(/perform\s+pg_advisory_xact_lock[^;]*;/i, '')
    expect(serializaPorAdvisoryLock(doente)).toBe(false)
  })

  it('SENSOR — a régua do errcode reprova quando ele vira genérico', () => {
    const doente = codigo.replace(/using\s+errcode\s*=\s*'23514'/i, '')
    expect(errcodeDeCheck(doente)).toBe(false)
  })

  it('SENSOR — a régua de `insert` ACUSA um trigger que alcance insert', () => {
    const doente = codigo.replace(
      /before\s+update\s+or\s+delete\s+on\s+public\.user_roles/i,
      'before insert or update or delete on public.user_roles',
    )
    expect(naoAlcancaInsert(doente)).toBe(false)
  })

  it('SENSOR — a régua do `grant` ACUSA uma concessão a `anon`', () => {
    expect(grantParaAnon(`${codigo}\ngrant execute on function public.guard_last_admin() to anon;`)).toBe(
      true,
    )
  })

  it('SENSOR — a régua de escrita de dado ACUSA um `insert into`', () => {
    expect(escreveDado(`${codigo}\ninsert into public.user_roles (user_id, role) values ('x','admin');`)).toBe(
      true,
    )
  })

  it('SENSOR — a régua da função reprova quando o `search_path` some', () => {
    const doente = codigo.replace(/set\s+search_path\s*=\s*public/i, '')
    expect(funcaoDeclarada(doente)).toBe(false)
  })
})
