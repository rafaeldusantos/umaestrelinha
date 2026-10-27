import { readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * As réguas das migrations de visitas — o endereço COMUM da `71` e da `83`.
 *
 * Até a `83`, estas funções moravam dentro de `visitasSchema.test.ts` e mediam só a migration da
 * `71`. A `83` RECRIA `store_movement` e `record_store_visit` numa migration nova (`AD-017`), e um
 * guarda que lesse só a `71` passaria a medir uma versão que já não é a vigente — as réguas de venda
 * e de visita deixariam passar uma regressão na `83` com a suíte verde (o `PRF-05`: peça certa,
 * endereço errado). Por isso elas MUDARAM DE ENDEREÇO, sem mudar de régua, e são aplicadas aos dois
 * arquivos: `visitasSchema.test.ts` (a `71` e a vigente) e `visitasPorHoraSchema.test.ts` (a `83`).
 *
 * Cada régua é um **predicado** sobre o texto do `.sql`, para poder ser exercida também contra texto
 * mutado. Nenhum dos dois guardas importa este arquivo para "conferir a si mesmo": o objeto medido é
 * sempre o `.sql` lido do disco.
 */

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../..')
export const PASTA_DE_MIGRATIONS = resolve(ROOT, 'supabase/migrations')

/** O `.sql` do disco, com CRLF normalizado ANTES de qualquer régua (`L-031`). */
export const lerMigration = (arquivo: string): string =>
  readFileSync(resolve(PASTA_DE_MIGRATIONS, arquivo), 'utf8').replace(/\r\n/g, '\n')

// -------------------------------------------------------------------------------------------
// Utilidades
// -------------------------------------------------------------------------------------------

/** Linha e bloco na MESMA varredura, com `[^\n\r]` fechando antes do `\r` (`L-031`, `BL-027`). */
export const semComentario = (texto: string): string =>
  texto.replace(/\/\*[\s\S]*?\*\/|--[^\n\r]*/g, '')

/** Mutação que não encontra o alvo **lança** — no-op silencioso não prova régua nenhuma. */
export const mutar = (texto: string, de: string | RegExp, para: string): string => {
  // Substituição por FUNÇÃO: o texto de troca é literal, e `$$` não vira `$` (corpos SQL têm `$$`).
  const mutante = texto.replace(de as string, () => para)
  if (mutante === texto) throw new Error(`mutação não encontrou o alvo: ${String(de).slice(0, 70)}…`)
  return mutante
}

/**
 * O bloco de uma função, do `create or replace function public.<nome>` até o `$$;` que a fecha.
 * Recorte que falha devolve `null` e **reprova** — nunca vira string vazia que aprova tudo.
 */
export const blocoDaFuncao = (texto: string, nome: string): string | null => {
  const codigo = semComentario(texto)
  const inicio = codigo.search(new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${nome}\\s*\\(`, 'i'))
  if (inicio < 0) return null
  const fim = codigo.indexOf('$$;', inicio)
  if (fim < 0) return null
  return codigo.slice(inicio, fim + 3)
}

/** Troca DENTRO do bloco de uma função (e só nele), sobre o texto SEM comentário. Lança se não acontece. */
export const mutarNoBloco = (texto: string, nome: string, de: string | RegExp, para: string): string => {
  const comandos = semComentario(texto)
  const b = blocoDaFuncao(comandos, nome)
  if (!b) throw new Error(`bloco não encontrado: ${nome}`)
  return mutar(comandos, b, mutar(b, de, para))
}

/** O `create table` de uma tabela, até o `);` que o fecha. `null` reprova. */
export const blocoDaTabela = (texto: string, nome: string): string | null => {
  const codigo = semComentario(texto)
  const inicio = codigo.search(new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${nome}\\s*\\(`, 'i'))
  if (inicio < 0) return null
  const fim = codigo.indexOf(');', inicio)
  if (fim < 0) return null
  return codigo.slice(inicio, fim + 2)
}

/** As definições de um `create table`, separadas por vírgula de NÍVEL ZERO (o `check (id)` fica inteiro). */
export const definicoes = (bloco: string): string[] => {
  const corpo = bloco.slice(bloco.indexOf('(') + 1, bloco.lastIndexOf(')'))
  const partes: string[] = []
  let nivel = 0
  let atual = ''
  for (const c of corpo) {
    if (c === '(') nivel++
    if (c === ')') nivel--
    if (c === ',' && nivel === 0) {
      partes.push(atual.trim())
      atual = ''
    } else atual += c
  }
  if (atual.trim()) partes.push(atual.trim())
  return partes
}

/** `[nome, tipo]` de cada coluna (o que não começa por `primary key`/`constraint`/`unique`/`check`). */
export const colunas = (texto: string, tabela: string): string[][] | null => {
  const b = blocoDaTabela(texto, tabela)
  if (!b) return null
  return definicoes(b)
    .filter((d) => !/^(primary\s+key|constraint|unique|check)\b/i.test(d))
    .map((d) => {
      const [nome, tipo] = d.split(/\s+/)
      return [nome.toLowerCase(), tipo.toLowerCase()]
    })
}

/** Os papéis de todos os `grant`/`revoke` sobre um objeto (função ou tabela). */
export const papeis = (texto: string, verbo: 'grant' | 'revoke', tipo: 'function' | 'table', nome: string): string[] => {
  const prep = verbo === 'grant' ? 'to' : 'from'
  const re = new RegExp(
    `\\b${verbo}\\s+[\\w\\s,]+?\\s+on\\s+${tipo}\\s+public\\.${nome}(?:\\s*\\([^)]*\\))?\\s+${prep}\\s+([^;]+);`,
    'gi',
  )
  const saida: string[] = []
  let m: RegExpExecArray | null
  const codigo = semComentario(texto)
  while ((m = re.exec(codigo)) !== null) {
    for (const p of m[1].split(',')) saida.push(p.trim().toLowerCase())
  }
  return saida
}

export const revogadaDosTres = (texto: string, tipo: 'function' | 'table', nome: string): boolean => {
  const r = papeis(texto, 'revoke', tipo, nome)
  return ['public', 'anon', 'authenticated'].every((p) => r.includes(p))
}

export const temSecurityDefiner = (texto: string, nome: string): boolean => {
  const b = blocoDaFuncao(texto, nome)
  return !!b && /\bsecurity\s+definer\b/i.test(b)
}

export const temSearchPathVazio = (texto: string, nome: string): boolean => {
  const b = blocoDaFuncao(texto, nome)
  return !!b && /set\s+search_path\s*=\s*''/i.test(b)
}

/** Nomes que, dentro de um corpo, só podem aparecer qualificados por `public.` (`store_hour` desde a `83`). */
export const QUALIFICAVEIS = [
  'store_time_zone',
  'store_day',
  'store_day_start',
  'store_week_start',
  'store_hour',
  'store_production_host',
  'prune_store_visits',
  'has_role',
  'store_visits',
  'store_visit_counter',
  'store_settings',
  'orders',
]

/** O corpo (`as $$ … $$`) de uma função, sem o cabeçalho. `null` reprova. */
export const corpoDaFuncao = (texto: string, nome: string): string | null => {
  const b = blocoDaFuncao(texto, nome)
  if (!b) return null
  const abre = b.search(/\bas\s+\$\$/i)
  if (abre < 0) return null
  return b.slice(abre)
}

/** As chamadas/referências sem `public.` dentro do corpo de uma função. */
export const semQualificacao = (texto: string, nome: string): string[] | null => {
  const corpo = corpoDaFuncao(texto, nome)
  if (corpo === null) return null
  const re = new RegExp(`(?<![\\w.])(${QUALIFICAVEIS.join('|')})\\b`, 'gi')
  return corpo.match(re) ?? []
}

/** O código fora dos corpos de `create function` (o `do $$` do agendamento continua visível). */
export const foraDasFuncoes = (texto: string): string => {
  let codigo = semComentario(texto)
  for (;;) {
    const inicio = codigo.search(/create\s+or\s+replace\s+function\s/i)
    if (inicio < 0) return codigo
    const fim = codigo.indexOf('$$;', inicio)
    if (fim < 0) return codigo
    codigo = codigo.slice(0, inicio) + codigo.slice(fim + 3)
  }
}

// -------------------------------------------------------------------------------------------
// A migration VIGENTE (`L-035`): a última, por prefixo, que cria a função
// -------------------------------------------------------------------------------------------

/** Todas as migrations do disco, em ordem de prefixo. */
export const todasAsMigrations = (): string[] =>
  readdirSync(PASTA_DE_MIGRATIONS)
    .filter((n) => n.endsWith('.sql'))
    .sort()

/**
 * A última migration (por prefixo) que CRIA `public.<nome>` — no código, nunca na prosa. É a que o
 * banco tem depois de aplicar todas. `null` reprova.
 */
export const migrationVigenteDe = (nome: string, arquivos: string[] = todasAsMigrations()): string | null => {
  const re = new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${nome}\\s*\\(`, 'i')
  const criam = arquivos.filter((a) => re.test(semComentario(lerMigration(a))))
  return criam.length ? criam[criam.length - 1] : null
}

// -------------------------------------------------------------------------------------------
// As réguas de `store_movement` (VIS-15, VIS-31..VIS-34, VIS-44)
// -------------------------------------------------------------------------------------------

/** `has_role(auth.uid(), 'admin')` DENTRO do corpo, recusando com 42501. */
export const portaoDeAdmin = (texto: string): boolean =>
  /if\s+not\s+public\.has_role\s*\(\s*auth\.uid\(\)\s*,\s*'admin'\s*\)\s+then\s+raise\s+exception\s+'[^']*'\s+using\s+errcode\s*=\s*'42501'/i.test(
    corpoDaFuncao(texto, 'store_movement') ?? '',
  )

/** Os três períodos contam ids DISTINTOS — nunca a soma dos dias (VIS-15). */
export const visitasDistintas = (texto: string): boolean => {
  const c = corpoDaFuncao(texto, 'store_movement') ?? ''
  return (
    /count\s*\(\s*distinct\s+visitor_id\s*\)\s+filter\s*\(\s*where\s+day\s*=\s*v_hoje\s*\)/i.test(c) &&
    /count\s*\(\s*distinct\s+visitor_id\s*\)\s+filter\s*\(\s*where\s+day\s*=\s*v_ontem\s*\)/i.test(c) &&
    /count\s*\(\s*distinct\s+visitor_id\s*\)\s+filter\s*\(\s*where\s+day\s+between\s+v_semana\s+and\s+v_hoje\s*\)/i.test(c)
  )
}

/** O `select … from public.orders …;` do corpo — o predicado de venda. `null` reprova. */
export const consultaDePedidos = (texto: string): string | null => {
  const c = corpoDaFuncao(texto, 'store_movement')
  if (!c) return null
  const fim = c.search(/from\s+public\.orders\b/i)
  if (fim < 0) return null
  const inicio = c.lastIndexOf('select', fim)
  const ponto = c.indexOf(';', fim)
  return c.slice(inicio, ponto + 1)
}

/** Venda é lista positiva: `approved` E não `cancelled`. */
export const listaPositiva = (texto: string): boolean => {
  const q = consultaDePedidos(texto) ?? ''
  return /payment_status\s*=\s*'approved'/i.test(q) && /status\s*<>\s*'cancelled'/i.test(q)
}

/**
 * O piso do predicado de `orders` usa `store_day_start(<piso>)` (D5) — nunca `paid_at::date`. O piso
 * é da migration: `v_desde` na `71`; `least(v_desde, v_anteontem)` na `83`, que precisa de anteontem
 * para a comparação de Ontem.
 */
export const PISO_DA_71 = 'v_desde'
export const PISO_DA_83 = 'least\\(\\s*v_desde\\s*,\\s*v_anteontem\\s*\\)'
export const pelaRegua = (texto: string, piso: string = PISO_DA_71): boolean =>
  new RegExp(`o\\.paid_at\\s*>=\\s*public\\.store_day_start\\(\\s*${piso}\\s*\\)`, 'i').test(consultaDePedidos(texto) ?? '')

/** Todo `sum(` do faturamento está dentro de `coalesce(…, 0)`. */
export const somasComPiso = (texto: string): boolean => {
  const c = corpoDaFuncao(texto, 'store_movement') ?? ''
  const somas = (c.match(/\bsum\s*\(/gi) ?? []).length
  const comCoalesce = (c.match(/coalesce\s*\(\s*sum\s*\(/gi) ?? []).length
  return somas > 0 && somas === comCoalesce
}

/** Quantos tickets `round(v_f_<p> / v_n_<p>, 2)`, com o MESMO sufixo nos três lugares. */
export const tickets = (texto: string): number =>
  (corpoDaFuncao(texto, 'store_movement')?.match(/case\s+when\s+v_n_(\w+)\s*>\s*0\s+then\s+round\s*\(\s*v_f_\1\s*\/\s*v_n_\1\s*,\s*2\s*\)\s+end/gi) ?? []).length

/** Cada período devolve AS SUAS variáveis (visitas, vendas, faturamento e ticket com o sufixo `<p>`). */
export const periodoCasado = (texto: string, p: 'hoje' | 'ontem' | 'semana'): boolean => {
  const c = corpoDaFuncao(texto, 'store_movement') ?? ''
  const m = c.match(new RegExp(`'${p}'\\s*,\\s*jsonb_build_object\\(([\\s\\S]*?)\\n\\s*\\)`, 'i'))
  if (!m) return false
  const b = m[1]
  return (
    new RegExp(`'visitas'\\s*,\\s*v_v_${p}\\s*,`, 'i').test(b) &&
    new RegExp(`'vendas'\\s*,\\s*v_n_${p}\\s*,`, 'i').test(b) &&
    new RegExp(`'faturamento'\\s*,\\s*v_f_${p}\\s*,`, 'i').test(b) &&
    new RegExp(`'ticket'\\s*,\\s*case\\s+when\\s+v_n_${p}\\s*>\\s*0\\s+then\\s+round\\s*\\(\\s*v_f_${p}\\s*/\\s*v_n_${p}\\s*,\\s*2\\s*\\)\\s+end`, 'i').test(b)
  )
}

/**
 * As seis expressões de período da consulta de pedidos: Hoje `>= v_ini_hoje`; Ontem
 * `[v_ini_ontem, v_ini_hoje)`, aberto à direita; Semana `>= v_ini_semana` — cada uma DUAS vezes
 * (contagem e soma). `filtros` é o total de `filter (` da consulta: 6 na `71`; 9 na `83`, que soma
 * as três da comparação (anteontem e as duas horas completas), medidas pelo probe e pela régua (7).
 */
export const FILTROS_DA_71 = 6
export const FILTROS_DA_83 = 9
export const fronteiras = (texto: string, filtros: number = FILTROS_DA_71): boolean => {
  const q = consultaDePedidos(texto) ?? ''
  const conta = (re: RegExp) => (q.match(re) ?? []).length
  return (
    conta(/filter\s*\(\s*where\s+o\.paid_at\s*>=\s*v_ini_hoje\s*\)/gi) === 2 &&
    conta(/filter\s*\(\s*where\s+o\.paid_at\s*>=\s*v_ini_ontem\s+and\s+o\.paid_at\s*<\s*v_ini_hoje\s*\)/gi) === 2 &&
    conta(/filter\s*\(\s*where\s+o\.paid_at\s*>=\s*v_ini_semana\s*\)/gi) === 2 &&
    conta(/\bfilter\s*\(/gi) === filtros
  )
}

/** Poda com `least(v_hoje, store_day(now()))` — um `p_agora` futuro não apaga o presente. */
export const podaSegura = (texto: string): boolean =>
  /perform\s+public\.prune_store_visits\s*\(\s*least\s*\(\s*v_hoje\s*,\s*public\.store_day\(\s*now\(\)\s*\)\s*\)\s*\)/i.test(corpoDaFuncao(texto, 'store_movement') ?? '')

/** O campo `<campo>` da resposta é `public.store_day(<variavel>)::text` — o dia de Brasília. */
export const diaDe = (texto: string, campo: string, variavel: string): boolean =>
  new RegExp(`'${campo}'\\s*,\\s*public\\.store_day\\(\\s*${variavel}\\s*\\)\\s*::\\s*text\\s*,`, 'i').test(
    corpoDaFuncao(texto, 'store_movement') ?? '',
  )

/** `teto_dia` sai só quando o dia do teto está no período aberto (`>= v_desde`). */
export const tetoNoPeriodo = (texto: string): boolean =>
  /'teto_dia'\s*,\s*case\s+when\s+v_teto\s*>=\s*v_desde\s+then\s+v_teto::text\s+end/i.test(corpoDaFuncao(texto, 'store_movement') ?? '')

// -------------------------------------------------------------------------------------------
// As réguas de `record_store_visit` (VIS-14, VIS-27, VIS-38, VIS-40, VIS-44)
// -------------------------------------------------------------------------------------------

/** O dia vem de `store_day(p_agora)` e o prazo de `store_day_start(v_dia + 1)`. */
export const diaEPrazo = (texto: string, nome: string): boolean => {
  const b = blocoDaFuncao(texto, nome) ?? ''
  return (
    /v_dia\s+date\s*:=\s*public\.store_day\(\s*p_agora\s*\)/i.test(b) &&
    /v_ate\s+timestamptz\s*:=\s*public\.store_day_start\(\s*v_dia\s*\+\s*1\s*\)/i.test(b)
  )
}

/** O teto é 5.000 linhas no dia (VIS-27). */
export const tetoDe5000 = (texto: string): boolean =>
  /\(\s*select\s+count\(\*\)\s+from\s+public\.store_visits\s+where\s+day\s*=\s*v_dia\s*\)\s*>=\s*5000\b/i.test(blocoDaFuncao(texto, 'record_store_visit') ?? '')

/** A cláusula `do update set …` do upsert do contador, espaços normalizados; `null` reprova. */
export const setDoUpsert = (texto: string): string | null => {
  const c = blocoDaFuncao(texto, 'record_store_visit') ?? ''
  const m = c.match(
    /insert\s+into\s+public\.store_visit_counter\s*\(\s*id\s*,\s*started_at\s*,\s*last_recorded_at\s*\)\s*values\s*\(\s*true\s*,\s*p_agora\s*,\s*p_agora\s*\)\s*on\s+conflict\s*\(\s*id\s*\)\s*do\s+update\s+set\s+([^;]*);/i,
  )
  return m ? m[1].replace(/\s+/g, ' ').trim().toLowerCase() : null
}
export const SET_CERTO = 'last_recorded_at = greatest(public.store_visit_counter.last_recorded_at, excluded.last_recorded_at)'

/** O upsert do contador mora DENTRO do `if found` — linha repetida não mexe nos instantes. */
export const upsertDentroDoFound = (texto: string): boolean => {
  const c = blocoDaFuncao(texto, 'record_store_visit') ?? ''
  const found = c.search(/if\s+found\s+then/i)
  const upsert = c.search(/insert\s+into\s+public\.store_visit_counter/i)
  const senao = c.indexOf("v_desfecho := 'repetida'", found)
  return found > -1 && upsert > found && upsert < senao
}

/** Poda ANTES de gravar (VIS-30). */
export const podaAntesDeGravar = (texto: string): boolean => {
  const c = blocoDaFuncao(texto, 'record_store_visit') ?? ''
  const poda = c.search(/perform\s+public\.prune_store_visits\(\s*v_dia\s*\)/i)
  const grava = c.search(/insert\s+into\s+public\.store_visits/i)
  return poda > -1 && grava > -1 && poda < grava
}
