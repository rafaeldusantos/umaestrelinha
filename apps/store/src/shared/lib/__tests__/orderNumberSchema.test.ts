import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * O guarda da migration da feature `58` — o número do pedido passa a ser do banco.
 *
 * Lê o `.sql` **do disco**, como `checkoutSchema`, `menuSchema`, `homeSections` e `importSchema`, e
 * pelo mesmo motivo: **afrouxar uma migration não quebra nada**. A sequência nascendo em outro
 * número, o `lpad` perdendo a largura, o `default` sumindo — as três aplicam limpo, passam em
 * build, em `tsc` e em teste de componente. Quem descobre é a Adri, com dois pedidos disputando o
 * mesmo número, ou a cliente, com `#170` num e-mail e `0170` na tela.
 *
 * Três asserções aqui guardam coisas que **só se pagam no dia do deploy**:
 *
 * - **`if not exists` na sequência** é o que torna a reexecução segura. Sem ele, a segunda passada
 *   ou falha (e trava o `db push`) ou — na forma "consertada" com `drop`/`setval` — joga a contagem
 *   de volta para 170 e a próxima venda morre com violação de unicidade contra um pedido que já
 *   existe. O modo de falha aparece **semanas depois**, no primeiro `db reset` de quem não sabia.
 * - **`lpad(…, 4, '0')`** é o que faz o zero à esquerda ser valor. A coluna é `text` desde 2026-04
 *   justamente para isso: sem o `lpad`, o pedido nasce `170` e a busca por `0170` não o acha.
 * - **O índice único continua existindo** — ele é a última linha de defesa da numeração, e não é
 *   escrito por esta migration. Um guarda que só olhasse o arquivo novo ficaria verde no dia em que
 *   alguém derrubasse a constraint noutro lugar.
 *
 * Cada régua é um **predicado**, para poder ser exercida contra texto mutado. Sem esse par, uma
 * asserção que sempre passa é indistinguível de uma que funciona — e o modo de falhar de um teste
 * que lê disco é varrer o vazio e ficar verde.
 *
 * `mutar()` **lança** quando a string alvo não é encontrada: mutação que vira no-op em silêncio
 * prova o `replace`, e mais nada (lição do `mutar()` da `52`).
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const CAMINHO = resolve(ROOT, 'supabase/migrations/20260921120000_58-order-number-sequence.sql')
/** A migration de 2026-04, que esta feature NÃO altera e da qual a numeração depende. */
const CAMINHO_ORIGEM = resolve(
  ROOT,
  'supabase/migrations/20260415090935_create_orders_and_order_items.sql',
)

const sql = readFileSync(CAMINHO, 'utf8')
const sqlOrigem = readFileSync(CAMINHO_ORIGEM, 'utf8')

/** O nome da sequência, escrito UMA vez — as réguas o interpolam. */
const SEQUENCIA = 'orders_number_seq'

// -------------------------------------------------------------------------------------------
// Utilidades
// -------------------------------------------------------------------------------------------

/**
 * Remove comentário de linha **e** de bloco na MESMA varredura, com `[^\n\r]` fechando **antes**
 * do `\r` — senão a linha comentada de um arquivo CRLF engole a linha seguinte e a régua passa
 * cega sobre o comando real de baixo (`L-031`, `BL-027`).
 *
 * Sem isto a régua casa **menção**, não **uso**, e acusa exatamente o arquivo que está certo: o
 * cabeçalho desta migration diz em prosa que ela não escreve dado, nomeando os três comandos.
 */
const semComentario = (texto: string): string =>
  texto.replace(/\/\*[\s\S]*?\*\/|--[^\n\r]*/g, '')

/** Mutação que não encontra o alvo **lança** — no-op silencioso não prova régua nenhuma. */
const mutar = (texto: string, de: string | RegExp, para: string): string => {
  const mutante = texto.replace(de as string, para)
  if (mutante === texto) throw new Error(`mutação não encontrou o alvo: ${String(de).slice(0, 70)}…`)
  return mutante
}

/**
 * O SQL **sem comentário**, que é a base de toda mutação de comando.
 *
 * Mutar o arquivo cru é armadilha, e ela mordeu na primeira escrita deste guarda: `mutar()` só
 * lança quando NADA muda, e a prosa do cabeçalho cita os comandos para explicá-los — então a
 * primeira ocorrência de `start with 170` é a do comentário, o `replace` a consome, o comando fica
 * intacto e o sensor "passa" provando nada. Quem acusou foi o próprio sensor, ao ver a régua
 * continuar verdadeira depois da mutação.
 */
const comandos = semComentario(sql)

// -------------------------------------------------------------------------------------------
// As réguas, como predicados — uma por COMANDO (`L-033`)
// -------------------------------------------------------------------------------------------

/** A sequência é criada de forma reexecutável. */
const criaSequenciaAditiva = (texto: string): boolean =>
  new RegExp(
    `create\\s+sequence\\s+if\\s+not\\s+exists\\s+public\\.${SEQUENCIA}\\b`,
    'i',
  ).test(semComentario(texto))

/**
 * Ela começa em **170** — o número que continua a contagem da Nuvemshop (maior importado: 169).
 *
 * A régua lê o número do mesmo comando que cria a sequência, e não em qualquer lugar do arquivo:
 * um `170` solto numa outra linha satisfaria uma régua frouxa sem a sequência começar em lugar
 * nenhum.
 */
const comecaEm = (texto: string, numero: number): boolean =>
  new RegExp(
    `create\\s+sequence\\s+if\\s+not\\s+exists\\s+public\\.${SEQUENCIA}\\s+start\\s+with\\s+${numero}\\s*;`,
    'i',
  ).test(semComentario(texto))

/**
 * O `default` da coluna: `lpad(nextval(<a sequência>)::text, 4, '0')`, dentro de um
 * `alter column order_number set default`.
 *
 * As quatro peças são conferidas **juntas**, num único recorte: `lpad` com a largura errada,
 * `lpad` com outro caractere de preenchimento e `nextval` de outra sequência produzem, cada um,
 * uma numeração que aplica limpo e mente. Separadas, cada régua passaria com a vizinha quebrada.
 */
const defaultDaColuna = (texto: string): boolean =>
  new RegExp(
    `alter\\s+column\\s+order_number\\s+set\\s+default\\s+lpad\\(\\s*nextval\\(\\s*'public\\.${SEQUENCIA}'::regclass\\s*\\)::text\\s*,\\s*4\\s*,\\s*'0'\\s*\\)`,
    'i',
  ).test(semComentario(texto))

/** Escrita de DADO — `insert`, `update` ou `delete` de linha. */
const escreveDado = (texto: string): boolean =>
  /\b(insert\s+into|update\s+public\.|delete\s+from)\b/i.test(semComentario(texto))

/** `grant … to <papel>` alcançando um papel. */
const concedeA = (texto: string, papel: string): boolean =>
  new RegExp(`grant[^;]*on\\s+sequence\\s+public\\.${SEQUENCIA}\\s+to\\s+${papel}\\s*;`, 'i').test(
    semComentario(texto),
  )

/** O índice único de `order_number`, criado em 2026-04 e do qual a numeração depende. */
const temIndiceUnico = (texto: string): boolean =>
  /add\s+constraint\s+orders_order_number_key\s+unique\s*\(\s*order_number\s*\)/i.test(
    semComentario(texto),
  )

/** A migration derruba a constraint de unicidade. */
const derrubaIndiceUnico = (texto: string): boolean =>
  /drop\s+constraint[^;]*orders_order_number_key/i.test(semComentario(texto))

// -------------------------------------------------------------------------------------------

describe('migration da 58 — âncoras de leitura', () => {
  it('a varredura leu os DOIS arquivos, e são os certos', () => {
    // Sem âncora, um caminho errado varreria string vazia e TODA asserção de ausência abaixo
    // passaria em silêncio — a pior falha possível num teste que lê disco.
    expect(sql.length).toBeGreaterThan(1000)
    expect(sql).toContain('Feature 58')
    expect(sqlOrigem.length).toBeGreaterThan(1000)
    expect(sqlOrigem).toContain('orders_order_number_key')
  })

  it('a varredura encontra os TRÊS comandos da migration — âncora de contagem', () => {
    // A segunda metade da âncora dupla: os arquivos foram lidos **e** a forma esperada está lá.
    const comandos = semComentario(sql)
      .split(';')
      .map(c => c.trim())
      .filter(c => c !== '')

    expect(comandos).toHaveLength(3)
  })
})

describe('migration da 58 — a sequência', () => {
  it('é criada com `if not exists`', () => {
    expect(criaSequenciaAditiva(sql)).toBe(true)
  })

  it('sensor — sem `if not exists`, a régua reprova', () => {
    // A mutação que quebra a reexecução: o segundo `db reset` morre, ou — na forma "consertada"
    // com `drop` — a contagem volta a 170 e a próxima venda colide com um pedido que já existe.
    const mutante = mutar(comandos, 'create sequence if not exists', 'create sequence')

    expect(criaSequenciaAditiva(mutante)).toBe(false)
  })

  it('começa em 170 — a contagem continua a da Nuvemshop', () => {
    expect(comecaEm(sql, 170)).toBe(true)
  })

  it('sensor — outro número inicial reprova', () => {
    // `start with 1` aplicaria limpo e o primeiro pedido nasceria `0001`, disputando o espaço de
    // numeração que a Adri já usou.
    const mutante = mutar(comandos, 'start with 170', 'start with 1')

    expect(comecaEm(mutante, 170)).toBe(false)
  })

  it('sensor — a sequência sem `start with` nenhum reprova', () => {
    // Sem a cláusula ela começa em 1 por padrão do Postgres, silenciosamente.
    const mutante = mutar(comandos, ' start with 170;', ';')

    expect(comecaEm(mutante, 170)).toBe(false)
    expect(criaSequenciaAditiva(mutante)).toBe(true)
  })
})

describe('migration da 58 — o `default` da coluna', () => {
  it('é `lpad(nextval(…)::text, 4, \'0\')` em `order_number`', () => {
    expect(defaultDaColuna(sql)).toBe(true)
  })

  it('sensor — sem o `lpad`, a régua reprova', () => {
    // A mutação que faz o pedido nascer `170` em vez de `0170`. Nada quebra: o e-mail diz um
    // número e a busca do painel por `0170` não acha nada.
    const mutante = mutar(
      comandos,
      /set default lpad\(nextval\('public\.orders_number_seq'::regclass\)::text, 4, '0'\)/,
      "set default nextval('public.orders_number_seq'::regclass)::text",
    )

    expect(defaultDaColuna(mutante)).toBe(false)
  })

  it('sensor — outra largura reprova', () => {
    const mutante = mutar(comandos, "::text, 4, '0')", "::text, 3, '0')")

    expect(defaultDaColuna(mutante)).toBe(false)
  })

  it('sensor — outro caractere de preenchimento reprova', () => {
    // `lpad(…, 4, ' ')` produz `" 170"`, com espaço — que atravessa o `text` e chega à tela.
    const mutante = mutar(comandos, "::text, 4, '0')", "::text, 4, ' ')")

    expect(defaultDaColuna(mutante)).toBe(false)
  })

  it('sensor — o `default` apontando para outra sequência reprova', () => {
    const mutante = mutar(comandos, "nextval('public.orders_number_seq'", "nextval('public.outra_seq'")

    expect(defaultDaColuna(mutante)).toBe(false)
  })

  it('sensor — o `default` removido da coluna reprova', () => {
    const mutante = mutar(
      comandos,
      'alter column order_number set default',
      'alter column order_number drop default',
    )

    expect(defaultDaColuna(mutante)).toBe(false)
  })
})

describe('migration da 58 — quem pode puxar o próximo número', () => {
  it('concede `usage` à `service_role`, que é quem grava pedido', () => {
    // Sem isto o insert morre com "permission denied for sequence" — a venda inteira, por uma
    // permissão que nada no código acusa.
    expect(concedeA(sql, 'service_role')).toBe(true)
  })

  it('nenhum `grant` EXPLÍCITO alcança `anon`', () => {
    // **O que esta asserção mede, e o que ela NÃO mede.** Ela mede o arquivo: nenhum `grant` deste
    // repositório nomeia o papel público. Ela **não** mede o banco — e o banco discorda:
    // `has_sequence_privilege('anon','public.orders_number_seq','USAGE')` devolve **verdadeiro**,
    // porque `anon` herda `usage` das *default privileges* do schema `public` (medido contra o
    // Postgres local em 2026-09-22, na verificação independente desta feature).
    //
    // Quem barra a inserção forjada é a **RLS**, não a permissão da sequência: `set local role
    // anon; insert into orders …` morre com "new row violates row-level security policy", porque
    // não há policy de `INSERT` para `anon`. A régua fica como está — um `grant` explícito aqui
    // continua sendo defeito —, e o que mudou foi a **afirmação**: ler "o papel público não
    // alcança a sequência" era `AD-012` dentro do guarda que existe contra ele.
    expect(concedeA(sql, 'anon')).toBe(false)
    expect(concedeA(sql, 'public')).toBe(false)
  })

  it('sensor — um `grant` a `anon` É acusado', () => {
    const mutante = `${sql}\ngrant usage, select on sequence public.orders_number_seq to anon;`

    expect(concedeA(mutante, 'anon')).toBe(true)
    // E a régua do papel legítimo continua valendo: a mutação é de um comando, não do arquivo.
    expect(concedeA(mutante, 'service_role')).toBe(true)
  })

  it('sensor — sem o `grant` à `service_role`, a régua reprova', () => {
    const mutante = mutar(
      comandos,
      'grant usage, select on sequence public.orders_number_seq to service_role;',
      '',
    )

    expect(concedeA(mutante, 'service_role')).toBe(false)
  })
})

describe('migration da 58 — é aditiva e não toca em dado', () => {
  it('não faz insert, update nem delete de linha', () => {
    // Renumerar pedido existente reescreveria número já citado em e-mail enviado e em link de
    // pedido. É a linha da spec em *Out of Scope*, aqui como asserção.
    expect(escreveDado(sql)).toBe(false)
  })

  it('sensor do removedor de comentário — a MENÇÃO em prosa não é acusada, o USO é', () => {
    // O cabeçalho desta migration nomeia os três comandos para dizer que não os usa. Uma régua que
    // casasse menção reprovaria exatamente o arquivo que está certo — aconteceu duas vezes neste
    // repositório, com formas diferentes.
    expect(escreveDado('-- nao faz insert into nem delete from nada\nselect 1;')).toBe(false)
    expect(escreveDado('/* insert into x */\r\nselect 1;')).toBe(false)
    expect(escreveDado('-- nota em CRLF\r\ninsert into public.orders (id) values (1);')).toBe(true)
    expect(escreveDado('-- nota em LF\ninsert into public.orders (id) values (1);')).toBe(true)
    expect(escreveDado('update public.orders set order_number = 1;')).toBe(true)
    expect(escreveDado('delete from public.orders;')).toBe(true)
  })

  it('sensor — um `update` de renumeração É acusado', () => {
    const mutante = `${sql}\nupdate public.orders set order_number = lpad(id::text, 4, '0');`

    expect(escreveDado(mutante)).toBe(true)
  })
})

describe('a 58 depende de uma constraint de 2026-04 que ela não escreve', () => {
  it('o índice único de `order_number` continua existindo', () => {
    // A última linha de defesa da numeração: `nextval` não colide, mas o importador, o seed e
    // qualquer escrita direta podem. Esta asserção lê a migration de ORIGEM.
    expect(temIndiceUnico(sqlOrigem)).toBe(true)
  })

  it('sensor — sem a constraint na origem, a régua reprova', () => {
    const mutante = mutar(
      semComentario(sqlOrigem),
      'add constraint orders_order_number_key unique (order_number)',
      'add constraint orders_order_number_key check (order_number is not null)',
    )

    expect(temIndiceUnico(mutante)).toBe(false)
  })

  it('a migration da 58 não derruba a constraint', () => {
    expect(derrubaIndiceUnico(sql)).toBe(false)
  })

  it('sensor — um `drop constraint` na 58 É acusado', () => {
    // Com a sequência em cena, a constraint parece redundante — e é exatamente por isso que ela
    // sairia "de limpeza". `nextval` protege a sequência, não a coluna.
    const mutante = `${sql}\nalter table public.orders drop constraint orders_order_number_key;`

    expect(derrubaIndiceUnico(mutante)).toBe(true)
  })
})
