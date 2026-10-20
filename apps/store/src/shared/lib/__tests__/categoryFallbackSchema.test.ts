import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * O guarda da migration da feature `69` — `category_fallback`, a porta que responde "para onde vai
 * a URL de uma categoria desligada?" (SSV-14..17).
 *
 * Lê o `.sql` **do disco**, no molde de `checkoutSchema` e `minhaContaSchema`. Afrouxar esta função
 * não quebra nada: ela é `security definer`, então atravessa a RLS que esconde a linha inativa — e
 * um `select *`, um `search_path` aberto ou um `grant` a mais aplicam limpo, passam em build, em
 * `tsc` e em teste de componente. Quem descobre é quem chamou a RPC com a chave publicável e recebeu
 * mais do que um id.
 *
 * Uma régua por comando (`L-033`), cada uma um **predicado** exercido também contra texto mutado.
 * `mutar()` **lança** quando a mutação não muda nada — mutação que vira no-op prova o `replace` e
 * mais nada (lição do `mutar()` da `52`). As mutações partem do SQL **sem comentário**: o cabeçalho
 * explica o contrato em prosa, e mutar o arquivo cru consumiria a menção em vez do uso.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const CAMINHO = resolve(ROOT, 'supabase/migrations/20261020120000_69-categoria-inativa.sql')

// CRLF normalizado ANTES de qualquer régua: um checkout no Windows não pode mudar o veredito.
const sql = readFileSync(CAMINHO, 'utf8').replace(/\r\n/g, '\n')

/**
 * O sentinela de "inativa sem ancestral ativo" (⇒ `/`). Escrito LITERALMENTE, e não importado: é o
 * contrato fixado em "Interfaces fixadas" do `tasks.md` da `69`, e a régua nunca pode ser o objeto
 * medido — importar a constante de `core` faria uma troca dos dois lados passar.
 */
const SENTINELA = '00000000-0000-0000-0000-000000000000'

/** As quatro colunas que a função pode ler (SSV-17). */
const COLUNAS_PERMITIDAS = ['id', 'slug', 'parent_id', 'active'] as const

// -------------------------------------------------------------------------------------------
// Utilidades
// -------------------------------------------------------------------------------------------

/** Linha e bloco na MESMA varredura, com `[^\n\r]` fechando antes do `\r` (`L-031`, `BL-027`). */
const semComentario = (texto: string): string =>
  texto.replace(/\/\*[\s\S]*?\*\/|--[^\n\r]*/g, '')

/** Mutação que não encontra o alvo **lança** — no-op silencioso não prova régua nenhuma. */
const mutar = (texto: string, de: string | RegExp, para: string): string => {
  const mutante = texto.replace(de as string, para)
  if (mutante === texto) throw new Error(`mutação não encontrou o alvo: ${String(de).slice(0, 70)}…`)
  return mutante
}

const comandos = semComentario(sql)

/**
 * O bloco da função, do `create or replace function` até o `$$;` que fecha o corpo. Recorte que
 * falha devolve `null` e **reprova** — nunca vira string vazia que aprova tudo.
 */
const blocoDaFuncao = (texto: string): string | null => {
  const codigo = semComentario(texto)
  const inicio = codigo.search(/create\s+or\s+replace\s+function\s+public\.category_fallback\b/i)
  if (inicio < 0) return null
  const fim = codigo.indexOf('$$;', inicio)
  if (fim < 0) return null
  return codigo.slice(inicio, fim + 3)
}

/** O cabeçalho da função — tudo entre a assinatura e o `as $$` que abre o corpo. */
const cabecalho = (texto: string): string | null => {
  const bloco = blocoDaFuncao(texto)
  if (bloco === null) return null
  const corpo = bloco.search(/\bas\s+\$\$/i)
  return corpo < 0 ? null : bloco.slice(0, corpo)
}

// -------------------------------------------------------------------------------------------
// As réguas, como predicados — uma por comando
// -------------------------------------------------------------------------------------------

const assinatura = (texto: string): boolean =>
  /create\s+or\s+replace\s+function\s+public\.category_fallback\s*\(\s*p_slug\s+text\s*\)\s*returns\s+uuid\b/i.test(
    semComentario(texto),
  )

const ehSecurityDefiner = (texto: string): boolean =>
  /\bsecurity\s+definer\b/i.test(cabecalho(texto) ?? '')

const searchPathVazio = (texto: string): boolean =>
  /\bset\s+search_path\s*=\s*''/i.test(cabecalho(texto) ?? '')

const ehStable = (texto: string): boolean => /\bstable\b/i.test(cabecalho(texto) ?? '')

/** `revoke all on function public.category_fallback(text) from public;` */
const revogaDePublic = (texto: string): boolean =>
  /revoke\s+all\s+on\s+function\s+public\.category_fallback\s*\(\s*text\s*\)\s+from\s+public\s*;/i.test(
    semComentario(texto),
  )

/** Os papéis que recebem `execute`, colhidos de TODO `grant` sobre a função. */
const papeisComExecute = (texto: string): string[] => {
  const re = /grant\s+execute\s+on\s+function\s+public\.category_fallback\s*\(\s*text\s*\)\s+to\s+([^;]+);/gi
  const papeis: string[] = []
  for (const m of semComentario(texto).matchAll(re)) {
    papeis.push(...m[1].split(',').map((p) => p.trim().toLowerCase()))
  }
  return papeis.sort()
}

/**
 * As colunas de `categories` que o corpo lê. A tabela só é alcançada pelo apelido `c`, e o corpo
 * referencia toda coluna qualificada por ele — então `c.<coluna>` é o inventário inteiro. `select *`
 * e `c.*` são acusados à parte, porque não deixam nome para conferir.
 */
const colunasLidas = (texto: string): string[] | null => {
  const bloco = blocoDaFuncao(texto)
  if (bloco === null) return null
  const nomes = [...bloco.matchAll(/\bc\.([a-z_]+)\b/gi)].map((m) => m[1].toLowerCase())
  return [...new Set(nomes)].sort()
}

const leTudo = (texto: string): boolean => {
  const bloco = blocoDaFuncao(texto) ?? ''
  return /select\s+(?:[a-z_]+\.)?\*/i.test(bloco)
}

/** A tabela é alcançada SÓ pelo apelido `c` — senão o inventário acima não seria o inteiro. */
const tabelaSoPeloApelido = (texto: string): boolean => {
  const bloco = blocoDaFuncao(texto) ?? ''
  const usos = [...bloco.matchAll(/public\.categories\b(\s+[a-z_]+)?/gi)]
  return usos.length > 0 && usos.every((m) => (m[1] ?? '').trim().toLowerCase() === 'c')
}

const escreveDado = (texto: string): boolean =>
  /\b(insert\s+into|update\s+public\.|delete\s+from|truncate)\b/i.test(semComentario(texto))

/** O sentinela no corpo, tipado como uuid. */
const sentinelaNoCorpo = (texto: string): boolean =>
  (blocoDaFuncao(texto) ?? '').includes(`'${SENTINELA}'::uuid`)

/** A subida por `parent_id` tem teto — sem ele, um ciclo A → B → A gira para sempre. */
const tetoDeProfundidade = (texto: string): boolean =>
  /profundidade\s*<\s*\d+/i.test(blocoDaFuncao(texto) ?? '')

/** O alvo é a categoria INATIVA — com `is not true`, a mesma régua da policy (`null` não é público). */
const alvoEhInativa = (texto: string): boolean =>
  /where\s+c\.slug\s*=\s*p_slug\s+and\s+c\.active\s+is\s+not\s+true/i.test(blocoDaFuncao(texto) ?? '')

/** O ancestral devolvido é ATIVO, e o mais próximo. */
const devolveAtivaMaisProxima = (texto: string): boolean =>
  /where\s+k\.active\s+is\s+true\s+order\s+by\s+k\.profundidade\s+limit\s+1/i.test(
    blocoDaFuncao(texto) ?? '',
  )

const temComentario = (texto: string): boolean =>
  /comment\s+on\s+function\s+public\.category_fallback\s*\(\s*text\s*\)\s+is/i.test(semComentario(texto))

// -------------------------------------------------------------------------------------------

describe('migration da 69 — âncoras de leitura', () => {
  it('a varredura leu o arquivo certo', () => {
    // Sem âncora, um caminho errado varreria string vazia e TODA asserção de ausência abaixo
    // passaria em silêncio — a pior falha possível num teste que lê disco.
    expect(sql.length).toBeGreaterThan(1000)
    expect(sql).toContain('69 · categoria inativa')
  })

  it('o recorte da função acha o bloco — e devolve null sem ele', () => {
    expect(blocoDaFuncao(sql)).not.toBeNull()
    expect(cabecalho(sql)).not.toBeNull()
    expect(blocoDaFuncao('select 1;')).toBeNull()
  })

  it('a assinatura é `category_fallback(p_slug text) returns uuid`', () => {
    expect(assinatura(sql)).toBe(true)
  })

  it('sensor — devolver texto em vez de uuid reprova', () => {
    expect(assinatura(mutar(comandos, /returns uuid/i, 'returns text'))).toBe(false)
  })
})

describe('migration da 69 — a função é fechada', () => {
  it('é `security definer`', () => {
    expect(ehSecurityDefiner(sql)).toBe(true)
  })

  it('sensor — perder o `security definer` reprova', () => {
    expect(ehSecurityDefiner(mutar(comandos, /\nsecurity definer/i, ''))).toBe(false)
  })

  it("tem `search_path = ''`", () => {
    expect(searchPathVazio(sql)).toBe(true)
  })

  it('sensor — `search_path` preenchido reprova', () => {
    // Com `public` no caminho, um schema injetado resolveria `categories` por outra tabela.
    expect(searchPathVazio(mutar(comandos, "set search_path = ''", 'set search_path = public'))).toBe(false)
  })

  it('é `stable`', () => {
    expect(ehStable(sql)).toBe(true)
  })

  it('sensor — virar `volatile` reprova', () => {
    expect(ehStable(mutar(comandos, /\nstable\n/i, '\nvolatile\n'))).toBe(false)
  })
})

describe('migration da 69 — quem executa', () => {
  it('revoga tudo de `public`', () => {
    expect(revogaDePublic(sql)).toBe(true)
  })

  it('sensor — perder o `revoke` de `public` reprova', () => {
    expect(revogaDePublic(mutar(comandos, /revoke all on function[^;]*;/i, ''))).toBe(false)
  })

  it('concede `execute` exatamente a `anon` e `authenticated`', () => {
    expect(papeisComExecute(sql)).toEqual(['anon', 'authenticated'])
  })

  it('sensor — perder `anon` reprova (a loja servida chama com a chave publicável)', () => {
    expect(papeisComExecute(mutar(comandos, 'to anon, authenticated', 'to authenticated'))).toEqual([
      'authenticated',
    ])
  })

  it('sensor — um `grant` a mais É acusado', () => {
    const mutante = `${comandos}\ngrant execute on function public.category_fallback(text) to public;`

    expect(papeisComExecute(mutante)).toEqual(['anon', 'authenticated', 'public'])
  })
})

describe('migration da 69 — lê só quatro colunas, e escreve nada', () => {
  it('as colunas lidas são exatamente `id`, `slug`, `parent_id` e `active`', () => {
    // Igualdade, não "contém": uma régua de presença aprovaria a quinta coluna, que é o vazamento.
    expect(colunasLidas(sql)).toEqual([...COLUNAS_PERMITIDAS].sort())
  })

  it('sensor — ler `name` É acusado', () => {
    const mutante = mutar(comandos, 'select c.id, c.parent_id\n', 'select c.id, c.parent_id, c.name\n')

    expect(colunasLidas(mutante)).toContain('name')
    expect(colunasLidas(mutante)).not.toEqual([...COLUNAS_PERMITIDAS].sort())
  })

  it('não lê com `*`', () => {
    expect(leTudo(sql)).toBe(false)
  })

  it('sensor — `select c.*` É acusado', () => {
    expect(leTudo(mutar(comandos, 'select c.id, c.parent_id\n', 'select c.*\n'))).toBe(true)
  })

  it('a tabela é alcançada só pelo apelido `c` — é o que torna o inventário inteiro', () => {
    expect(tabelaSoPeloApelido(sql)).toBe(true)
  })

  it('sensor — outro apelido para a tabela reprova', () => {
    const mutante = mutar(comandos, 'from public.categories c\n    join alvo', 'from public.categories x\n    join alvo')

    expect(tabelaSoPeloApelido(mutante)).toBe(false)
  })

  it('não faz insert, update, delete nem truncate', () => {
    expect(escreveDado(sql)).toBe(false)
  })

  it('sensor do removedor de comentário — a MENÇÃO não é acusada, o USO é', () => {
    expect(escreveDado('-- nao faz insert into nem delete from nada\nselect 1;')).toBe(false)
    expect(escreveDado('/* update public.x */\r\nselect 1;')).toBe(false)
    expect(escreveDado(`${comandos}\nupdate public.categories set active = true;`)).toBe(true)
  })
})

describe('migration da 69 — o contrato do retorno', () => {
  it('o sentinela é o literal da interface, tipado como uuid', () => {
    expect(sentinelaNoCorpo(sql)).toBe(true)
  })

  it('sensor — trocar o sentinela reprova', () => {
    const mutante = mutar(comandos, `'${SENTINELA}'::uuid`, "'00000000-0000-0000-0000-000000000001'::uuid")

    expect(sentinelaNoCorpo(mutante)).toBe(false)
  })

  it('o alvo é a categoria INATIVA (`active is not true`)', () => {
    expect(alvoEhInativa(sql)).toBe(true)
  })

  it('sensor — sem o recorte de inativa, a régua reprova (a ativa deixaria de devolver null)', () => {
    const mutante = mutar(comandos, /\n\s+and c\.active is not true/i, '')

    expect(alvoEhInativa(mutante)).toBe(false)
  })

  it('devolve o ancestral ATIVO mais próximo', () => {
    expect(devolveAtivaMaisProxima(sql)).toBe(true)
  })

  it('sensor — ordenar ao contrário (o mais distante) reprova', () => {
    const mutante = mutar(comandos, 'order by k.profundidade limit 1', 'order by k.profundidade desc limit 1')

    expect(devolveAtivaMaisProxima(mutante)).toBe(false)
  })

  it('a subida tem teto de profundidade', () => {
    expect(tetoDeProfundidade(sql)).toBe(true)
  })

  it('sensor — sem o teto, a régua reprova', () => {
    const mutante = mutar(comandos, /\n\s+and k\.profundidade < \d+/i, '')

    expect(tetoDeProfundidade(mutante)).toBe(false)
  })

  it('a função tem `comment on function` explicando o contrato', () => {
    expect(temComentario(sql)).toBe(true)
    expect(sql).toContain(SENTINELA)
  })

  it('sensor — sem o `comment on`, a régua reprova', () => {
    expect(temComentario(mutar(comandos, /comment on function/i, '-- x'))).toBe(false)
  })
})
