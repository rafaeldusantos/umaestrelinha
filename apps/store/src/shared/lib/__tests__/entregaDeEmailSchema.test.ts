import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * O guarda da migration da feature `52` — a nota interna fecha, e a compatibilidade da `42` cai.
 *
 * Lê o `.sql` **do disco**, como `checkoutSchema`, `menuSchema`, `homeSections`, `faqSchema` e
 * `importSchema`. O motivo é o de sempre: **afrouxar uma migration não quebra nada**. Uma policy
 * que volta a valer para qualquer sessão, um `with check` que some, um `revoke` que deixa de
 * alcançar `anon` — tudo isso aplica limpo e passa em build, em `tsc` e em teste de componente.
 * Quem descobre é quem for procurar, e nesta loja o que está do outro lado da porta é a anotação
 * sobre quem morreu.
 *
 * Três asserções aqui guardam coisas que só se pagam no dia do deploy:
 *
 * - **O `with check` é a metade que se esquece.** Só `using` fecharia a leitura e deixaria a
 *   gravação aberta — e um teste que apenas tentasse *ler* passaria verde. É a meia-correção, e
 *   ela tem sensor próprio para cada tabela.
 * - **`to authenticated` sozinho não basta.** Toda cliente logada é `authenticated`; quem decide é
 *   `has_role`. O comentário da migration da `34` já alertava isso em 2026-08, sobre estas mesmas
 *   duas tabelas.
 * - **A régua dos drops vale nos DOIS sentidos.** As três peças de compatibilidade caem **e** as
 *   três do motor (`order_notifications`, `claim_order_notification`, `finish_order_notification`)
 *   não. Sem o segundo sentido, uma migration que derrubasse o motor junto passaria — é a mesma
 *   forma que a `41` usou ao trocar o cadeado do hero.
 *
 * Cada régua é um **predicado** (`L-033`: uma por COMANDO, nunca uma para a família), para poder
 * ser exercida contra texto mutado. Sem esse par, uma asserção que sempre passa é indistinguível de
 * uma que funciona — e o modo de falhar de um teste que lê disco é varrer o vazio e ficar verde.
 *
 * O recorte de nome é por **token exato** (`L-034`): `order_notes` não pode casar dentro de
 * `order_notes_pkey`, e `\b` não fecha nada quando o vizinho é `-`.
 *
 * O removedor de comentário normaliza **CRLF antes** (`L-031`) e faz linha e bloco na **mesma**
 * varredura. Este é um checkout Windows, e em JavaScript `.` não casa `\r`: sem a normalização o
 * stripper de linha fica inerte e o guarda passa a acusar a prosa que explica a regra — que é
 * exatamente o que o cabeçalho desta migration contém.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const CAMINHO = resolve(
  ROOT,
  'supabase/migrations/20260919120000_52-entrega-de-email-comprovada.sql',
)

const sql = readFileSync(CAMINHO, 'utf8')

/** As duas tabelas cuja policy aberta esta migration substitui. */
const TABELAS = ['order_notes', 'order_status_history'] as const

/** As três peças de transição que a `42` deixou vivas e que esta migration derruba. */
const COMPATIBILIDADE = ['order_emails', 'claim_order_email', 'finish_order_email'] as const

/** As três peças do motor, que esta migration **não** pode tocar. */
const MOTOR = [
  'order_notifications',
  'claim_order_notification',
  'finish_order_notification',
] as const

// -------------------------------------------------------------------------------------------
// O removedor de comentário, e o recorte por token exato
// -------------------------------------------------------------------------------------------

/**
 * Comentário fora — de linha **e** de bloco na MESMA varredura, com CRLF normalizado antes.
 *
 * Duas passadas têm um ponto cego já medido neste repositório (`BL-027`): um comentário de linha
 * que cite um glob de dois asteriscos abre um "bloco" aos olhos da segunda régua, que então apaga
 * código até o próximo fecha-bloco — e o guarda passa a aprovar em silêncio o que estiver lá
 * dentro.
 */
const semComentario = (texto: string): string =>
  texto.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\/|--[^\n]*/g, '')

/** Token exato: o nome não pode continuar em letra, dígito, `_` ou `-` (`L-034`). */
const tk = (nome: string): string => `${nome}(?![-\\w])`

/**
 * Aplica uma mutação e **exige** que ela tenha mudado o texto.
 *
 * Um sensor cujo `replace` não encontra o alvo vira no-op, e a asserção que vem depois passa a
 * medir o arquivo intacto — ou seja, o sensor deixa de sensoriar sem ninguém notar. Foi o que
 * aconteceu ao injetar a mutação do `with check` no arquivo real: dois sensores vizinhos perderam o
 * alvo e reprovaram por outro motivo, o que se lê como defeito no lugar errado.
 */
const mutar = (texto: string, de: string, para: string): string => {
  const mutante = texto.replace(de, para)
  if (mutante === texto) throw new Error(`mutação não encontrou o alvo: ${de.slice(0, 60)}…`)
  return mutante
}

// -------------------------------------------------------------------------------------------
// As réguas, como predicados — uma por COMANDO (`L-033`)
// -------------------------------------------------------------------------------------------

/** Comando 1 (× 2 tabelas): a policy aberta de 2026-04 cai por `drop policy if exists`. */
const derrubaPolicyAberta = (texto: string, tabela: string): boolean =>
  new RegExp(
    `drop\\s+policy\\s+if\\s+exists\\s+"Allow all ${tabela}"\\s+on\\s+public\\.${tk(tabela)}\\s*;`,
    'i',
  ).test(semComentario(texto))

/**
 * Recorta o `create policy … on public.<tabela> …;` inteiro.
 *
 * Recorte que falha devolve `null` e **reprova** — nunca vira bloco vazio que aprova tudo. É a
 * lição de `rotasSobGuarda.test.ts`.
 */
const blocoDaPolicy = (texto: string, tabela: string): string | null =>
  semComentario(texto).match(
    new RegExp(`create\\s+policy\\s+"[^"]+"\\s+on\\s+public\\.${tk(tabela)}[\\s\\S]*?;`, 'i'),
  )?.[0] ?? null

/** Comando 2 (× 2): a policy nova é `for all to authenticated`. */
const paraTodaOperacaoDeAutenticado = (texto: string, tabela: string): boolean => {
  const bloco = blocoDaPolicy(texto, tabela)
  return bloco !== null && /\bfor\s+all\s+to\s+authenticated\b/i.test(bloco)
}

/** Comando 3 (× 2): o `using` chama `has_role`. Fecha a LEITURA. */
const usingComHasRole = (texto: string, tabela: string): boolean => {
  const bloco = blocoDaPolicy(texto, tabela)
  return (
    bloco !== null &&
    /\busing\s*\(\s*public\.has_role\s*\(\s*auth\.uid\(\)\s*,\s*'admin'\s*\)\s*\)/i.test(bloco)
  )
}

/** Comando 4 (× 2): o `with check` chama `has_role`. Fecha a GRAVAÇÃO. */
const withCheckComHasRole = (texto: string, tabela: string): boolean => {
  const bloco = blocoDaPolicy(texto, tabela)
  return (
    bloco !== null &&
    /\bwith\s+check\s*\(\s*public\.has_role\s*\(\s*auth\.uid\(\)\s*,\s*'admin'\s*\)\s*\)/i.test(
      bloco,
    )
  )
}

/** A volta do defeito, dentro da policy da tabela: `using (true)` ou `with check (true)`. */
const permiteQualquerSessao = (texto: string, tabela: string): boolean => {
  const bloco = blocoDaPolicy(texto, tabela)
  return bloco !== null && /\b(?:using|with\s+check)\s*\(\s*true\s*\)/i.test(bloco)
}

/** A mesma volta, em qualquer ponto do arquivo — a rede por baixo do recorte por tabela. */
const permiteQualquerSessaoEmAlgumLugar = (texto: string): boolean =>
  /\b(?:using|with\s+check)\s*\(\s*true\s*\)/i.test(semComentario(texto))

/** Comando 5 (× 2): o `revoke` tira de `anon` o alcance da tabela. */
const revogaDeAnon = (texto: string, tabela: string): boolean =>
  new RegExp(`revoke\\s+all\\s+on\\s+public\\.${tk(tabela)}\\s+from\\s+anon\\s*;`, 'i').test(
    semComentario(texto),
  )

/**
 * Comandos 6, 7 e 8: as três peças de compatibilidade caem, **por assinatura**.
 *
 * `drop function` sem assinatura é ambíguo quando há sobrecarga, e o Postgres recusa — mas com uma
 * sobrecarga só ele derruba a que houver, que pode não ser a que se queria. A assinatura é parte do
 * comando, não decoração.
 */
const DROP_DE_COMPATIBILIDADE: Record<(typeof COMPATIBILIDADE)[number], RegExp> = {
  order_emails: /drop\s+view\s+if\s+exists\s+public\.order_emails(?![-\w])\s*;/i,
  claim_order_email:
    /drop\s+function\s+if\s+exists\s+public\.claim_order_email(?![-\w])\s*\(\s*uuid\s*,\s*text\s*\)\s*;/i,
  finish_order_email:
    /drop\s+function\s+if\s+exists\s+public\.finish_order_email(?![-\w])\s*\(\s*uuid\s*,\s*text\s*,\s*text\s*\)\s*;/i,
}

const derrubaCompatibilidade = (
  texto: string,
  peca: (typeof COMPATIBILIDADE)[number],
): boolean => DROP_DE_COMPATIBILIDADE[peca].test(semComentario(texto))

/**
 * O segundo sentido da régua: **algum** `drop` alcança uma peça do motor?
 *
 * `[^;]` recorta na terminação do comando, para que um `drop` de uma peça não seja atribuído ao
 * nome que aparece no comando seguinte.
 */
const derrubaOMotor = (texto: string, peca: string): boolean =>
  new RegExp(`\\bdrop\\b[^;]*?\\b${tk(peca)}`, 'i').test(semComentario(texto))

/**
 * Escrita de DADO — `insert`, `update` ou `delete` de linha.
 *
 * Comentário fora primeiro: o cabeçalho desta migration explica em prosa que ela é idempotente e
 * não escreve dado, e uma régua que casasse menção acusaria exatamente o arquivo que está certo.
 */
const escreveDado = (texto: string): boolean =>
  /\b(insert\s+into|update\s+public\.|delete\s+from)\b/i.test(semComentario(texto))

// -------------------------------------------------------------------------------------------
// Âncoras (`L-021`) — arquivo lido E as duas tabelas encontradas
// -------------------------------------------------------------------------------------------

describe('migration da 52 — âncoras de leitura', () => {
  it('a varredura leu o arquivo, e é o certo', () => {
    // Sem âncora, um caminho errado varreria string vazia e TODA asserção de ausência abaixo
    // passaria em silêncio — a pior falha possível num teste que lê disco.
    expect(sql.length).toBeGreaterThan(2000)
    expect(sql).toContain('52 · entrega de e-mail comprovada')
  })

  it('a varredura encontra as DUAS tabelas — âncora de contagem', () => {
    // Uma régua que casasse zero tabela deixaria as asserções por tabela verdadeiras por vacuidade.
    const achadas = TABELAS.filter((t) => blocoDaPolicy(sql, t) !== null)

    expect(achadas).toEqual([...TABELAS])
    expect(achadas).toHaveLength(2)
  })

  it('a varredura encontra as TRÊS peças de compatibilidade — âncora de contagem', () => {
    const achadas = COMPATIBILIDADE.filter((p) => derrubaCompatibilidade(sql, p))

    expect(achadas).toEqual([...COMPATIBILIDADE])
    expect(achadas).toHaveLength(3)
  })
})

// -------------------------------------------------------------------------------------------
// Seção 1 — a nota interna deixa de ser pública (`DLV-15`..`DLV-20`)
// -------------------------------------------------------------------------------------------

describe('migration da 52 — a policy aberta de 2026-04 cai', () => {
  it.each(TABELAS)('"Allow all %s" cai por `drop policy if exists`', (tabela) => {
    expect(derrubaPolicyAberta(sql, tabela)).toBe(true)
  })

  it('sensor — sem o `drop policy` de `order_notes`, a régua reprova', () => {
    const mutante = mutar(
      semComentario(sql),
      'drop policy if exists "Allow all order_notes" on public.order_notes;',
      '',
    )

    expect(derrubaPolicyAberta(mutante, 'order_notes')).toBe(false)
    // E a irmã continua provada: a mutação é de um comando, não do arquivo.
    expect(derrubaPolicyAberta(mutante, 'order_status_history')).toBe(true)
  })

  it('sensor — sem o `drop policy` de `order_status_history`, a régua reprova', () => {
    const mutante = mutar(
      semComentario(sql),
      'drop policy if exists "Allow all order_status_history" on public.order_status_history;',
      '',
    )

    expect(derrubaPolicyAberta(mutante, 'order_status_history')).toBe(false)
    expect(derrubaPolicyAberta(mutante, 'order_notes')).toBe(true)
  })
})

describe('migration da 52 — a policy nova decide por `has_role`', () => {
  it.each(TABELAS)('a policy de %s é `for all to authenticated`', (tabela) => {
    expect(paraTodaOperacaoDeAutenticado(sql, tabela)).toBe(true)
  })

  it('sensor — a policy alcançando `public` em vez de `authenticated` reprova', () => {
    const mutante = mutar(semComentario(sql), 'for all to authenticated', 'for all to public')

    expect(paraTodaOperacaoDeAutenticado(mutante, 'order_notes')).toBe(false)
  })

  it.each(TABELAS)('o `using` de %s chama `public.has_role` com o papel admin', (tabela) => {
    expect(usingComHasRole(sql, tabela)).toBe(true)
  })

  it.each(TABELAS)('o `with check` de %s chama `public.has_role` com o papel admin', (tabela) => {
    expect(withCheckComHasRole(sql, tabela)).toBe(true)
  })

  it('SENSOR DA MEIA-CORREÇÃO — o `with check` omitido em `order_notes` reprova', () => {
    // A mutação mais perigosa desta migration: ela fecha a LEITURA e deixa a GRAVAÇÃO aberta.
    // Um teste que apenas tentasse ler ficaria verde com ela aplicada.
    const bloco = blocoDaPolicy(sql, 'order_notes')
    expect(bloco).not.toBeNull()
    const mutante = mutar(
      semComentario(sql),
      bloco,
      bloco.replace(/\s*with\s+check\s*\([\s\S]*?\)\s*;$/i, ';'),
    )

    expect(withCheckComHasRole(mutante, 'order_notes')).toBe(false)
    // E o `using` continua de pé — é isso que faz dela uma MEIA-correção, e não uma quebra óbvia.
    expect(usingComHasRole(mutante, 'order_notes')).toBe(true)
  })

  it('SENSOR DA MEIA-CORREÇÃO — o `with check` omitido em `order_status_history` reprova', () => {
    const bloco = blocoDaPolicy(sql, 'order_status_history')
    expect(bloco).not.toBeNull()
    const mutante = mutar(
      semComentario(sql),
      bloco,
      bloco.replace(/\s*with\s+check\s*\([\s\S]*?\)\s*;$/i, ';'),
    )

    expect(withCheckComHasRole(mutante, 'order_status_history')).toBe(false)
    expect(usingComHasRole(mutante, 'order_status_history')).toBe(true)
  })

  it('sensor — o `using` sem `has_role` reprova', () => {
    const mutante = mutar(
      semComentario(sql),
      "using (public.has_role(auth.uid(), 'admin'))\n\twith check (public.has_role(auth.uid(), 'admin'));",
      'using (true)\n\twith check (true);',
    )

    expect(usingComHasRole(mutante, 'order_notes')).toBe(false)
  })
})

describe('migration da 52 — `using (true)` não volta', () => {
  it.each(TABELAS)('a policy de %s não permite qualquer sessão', (tabela) => {
    expect(permiteQualquerSessao(sql, tabela)).toBe(false)
  })

  it('o arquivo inteiro não carrega `using (true)` nem `with check (true)`', () => {
    expect(permiteQualquerSessaoEmAlgumLugar(sql)).toBe(false)
  })

  it('sensor — a volta do `using (true)` É acusada, na tabela e no arquivo', () => {
    const mutante = mutar(
      semComentario(sql),
      "using (public.has_role(auth.uid(), 'admin'))\n\twith check (public.has_role(auth.uid(), 'admin'));",
      'using (true)\n\twith check (true);',
    )

    expect(permiteQualquerSessao(mutante, 'order_notes')).toBe(true)
    expect(permiteQualquerSessaoEmAlgumLugar(mutante)).toBe(true)
  })

  it('sensor do removedor de comentário — a prosa que explica o defeito não é acusada', () => {
    // O cabeçalho desta migration descreve o molde antigo. Uma régua que casasse menção
    // reprovaria exatamente o arquivo que está certo — e o conserto viraria "edite o comentário".
    expect(permiteQualquerSessaoEmAlgumLugar('-- antes era using (true)\nselect 1;')).toBe(false)
    expect(permiteQualquerSessaoEmAlgumLugar('-- antes era using (true)\r\nselect 1;')).toBe(false)
    expect(permiteQualquerSessaoEmAlgumLugar('/* using (true) */\r\nselect 1;')).toBe(false)
    expect(
      permiteQualquerSessaoEmAlgumLugar('create policy "x" on public.y for all using (true);'),
    ).toBe(true)
  })
})

describe('migration da 52 — `anon` perde o alcance às duas tabelas', () => {
  it.each(TABELAS)('`revoke all on public.%s from anon`', (tabela) => {
    expect(revogaDeAnon(sql, tabela)).toBe(true)
  })

  it('sensor — sem o `revoke`, a régua reprova, e só a da tabela mutada', () => {
    const mutante = mutar(semComentario(sql), 'revoke all on public.order_notes from anon;', '')

    expect(revogaDeAnon(mutante, 'order_notes')).toBe(false)
    expect(revogaDeAnon(mutante, 'order_status_history')).toBe(true)
  })

  it('sensor de token exato — `order_notes_pkey` não conta como `order_notes` (`L-034`)', () => {
    // `\b` não fecha nada quando o vizinho é `_` ou `-`; o recorte tem de ser `(?![-\w])`.
    expect(revogaDeAnon('revoke all on public.order_notes_pkey from anon;', 'order_notes')).toBe(
      false,
    )
    expect(
      derrubaPolicyAberta(
        'drop policy if exists "Allow all order_notes" on public.order_notes_pkey;',
        'order_notes',
      ),
    ).toBe(false)
  })
})

// -------------------------------------------------------------------------------------------
// Seção 2 — a compatibilidade da 42 cai, e o motor não (`DLV-23`, `DLV-24`)
// -------------------------------------------------------------------------------------------

describe('migration da 52 — as três peças de compatibilidade caem', () => {
  it.each(COMPATIBILIDADE)('%s cai por `drop … if exists`, com a assinatura', (peca) => {
    expect(derrubaCompatibilidade(sql, peca)).toBe(true)
  })

  it('sensor — sem o `drop` da view, a régua reprova', () => {
    const mutante = mutar(semComentario(sql), 'drop view if exists public.order_emails;', '')

    expect(derrubaCompatibilidade(mutante, 'order_emails')).toBe(false)
    expect(derrubaCompatibilidade(mutante, 'claim_order_email')).toBe(true)
  })

  it('sensor — o `drop function` sem a assinatura reprova', () => {
    const mutante = mutar(
      semComentario(sql),
      'drop function if exists public.claim_order_email(uuid, text);',
      'drop function if exists public.claim_order_email;',
    )

    expect(derrubaCompatibilidade(mutante, 'claim_order_email')).toBe(false)
  })

  it('sensor — a assinatura ERRADA reprova', () => {
    const mutante = mutar(
      semComentario(sql),
      'drop function if exists public.finish_order_email(uuid, text, text);',
      'drop function if exists public.finish_order_email(uuid, text);',
    )

    expect(derrubaCompatibilidade(mutante, 'finish_order_email')).toBe(false)
  })
})

describe('migration da 52 — o motor da 42 NÃO é tocado (o segundo sentido)', () => {
  it.each(MOTOR)('nenhum `drop` alcança %s', (peca) => {
    expect(derrubaOMotor(sql, peca)).toBe(false)
  })

  it.each(MOTOR)('sensor — um `drop` de %s É acusado', (peca) => {
    // Sem este sentido, uma migration que derrubasse o motor junto com a compatibilidade passaria
    // numa régua que só olhasse a queda das três peças de transição.
    const mutante = `${sql}\ndrop function if exists public.${peca}(uuid, text, text);\n`

    expect(derrubaOMotor(mutante, peca)).toBe(true)
  })

  it('sensor — `order_notes` não é confundido com `order_notifications` (`L-034`)', () => {
    // O prefixo é comum (`order_not…`), e é exatamente a classe de erro que o token exato fecha.
    expect(derrubaOMotor(sql, 'order_notifications')).toBe(false)
    expect(derrubaOMotor('drop table if exists public.order_notes;', 'order_notifications')).toBe(
      false,
    )
  })
})

// -------------------------------------------------------------------------------------------
// A migration é idempotente e não escreve dado
// -------------------------------------------------------------------------------------------

describe('migration da 52 — zero escrita de dado', () => {
  it('não faz insert, update nem delete de linha', () => {
    expect(escreveDado(sql)).toBe(false)
  })

  it('sensor — um `insert`/`update`/`delete` de verdade É acusado', () => {
    expect(escreveDado(`${sql}\ninsert into public.order_notes (note) values ('x');`)).toBe(true)
    expect(escreveDado(`${sql}\nupdate public.order_notes set note = 'x';`)).toBe(true)
    expect(escreveDado(`${sql}\ndelete from public.order_notes;`)).toBe(true)
  })

  it('sensor do removedor de comentário — a MENÇÃO em prosa não é acusada, o USO é', () => {
    // CRLF e LF na mesma régua: em JavaScript `.` não casa `\r`, e num checkout Windows um
    // stripper que não normalize fica inerte.
    expect(escreveDado('-- nao faz insert into nem delete from nada\nselect 1;')).toBe(false)
    expect(escreveDado('-- nao faz insert into nem delete from nada\r\nselect 1;')).toBe(false)
    expect(escreveDado('/* insert into x */\r\nselect 1;')).toBe(false)
    expect(escreveDado('insert into public.order_notes (note) values (1);')).toBe(true)
  })

  it('todo `drop` é `if exists`, e toda `create policy` vem depois do `drop` dela', () => {
    const texto = semComentario(sql)
    const drops = texto.match(/\bdrop\s+(?:policy|view|function|table|index)\b[^;]*;/gi) ?? []

    // Âncora: a régua abaixo só significa alguma coisa se houver `drop` para medir.
    expect(drops.length).toBeGreaterThanOrEqual(7)
    expect(drops.every((d) => /\bif\s+exists\b/i.test(d))).toBe(true)

    for (const tabela of TABELAS) {
      const posicaoDoDrop = texto.search(
        new RegExp(`drop\\s+policy\\s+if\\s+exists\\s+"admin full ${tabela}"`, 'i'),
      )
      const posicaoDoCreate = texto.search(
        new RegExp(`create\\s+policy\\s+"admin full ${tabela}"`, 'i'),
      )

      expect(posicaoDoDrop).toBeGreaterThan(-1)
      expect(posicaoDoCreate).toBeGreaterThan(posicaoDoDrop)
    }
  })
})
