// Feature `75` · T16 — no app do ateliê, toda ESCRITA passa pela porta (`features/order-actions/api/
// gravarAcao.ts`), e a porta só ENTREGA o client ao dono (`@estrelinha/core/order-actions`, `AD-059`).
// Ampliação de `MAP-37`/`MAA-29` (design §8.2), vizinho de `leituraSoComPapel.test.ts`.
//
// Por que existe: uma escrita escrita à mão no app seria a SEGUNDA escrita do status, do rastreio ou
// do material (o "defeito 01") — e, pior, uma escrita sem a pergunta "quem é você?" depois do zero
// linhas (`MAA-21`). Build, `tsc` e teste de componente passam com ela.
//
// **Pela AST do TypeScript** (lição do guarda da `67`). Três réguas:
//   1. em `apps/mobile-adm/src` (produção), nenhuma chamada de escrita de tabela — `update`, `insert`,
//      `upsert` em QUALQUER receptor, e `delete` cuja cadeia passa por uma chamada `from(` ou nasce no
//      identificador `supabase` —, nenhuma invocação de function (a propriedade `invoke` de
//      `functions`) fora da porta dos avisos (feature `79`, T17) — e nela só com o nome LITERAL
//      `'atelie-avisos?action=<uma das seis ações>'` —, e nenhuma `rpc(` fora de `lerComPapel.ts`;
//   2. quem importa o client são EXATAMENTE nove arquivos (os três da `74`, a porta de escrita, desde a
//      `76` os quatro de cliente e, desde a `79`, a porta dos avisos) — a mesma lista que
//      `leituraSoComPapel` compara por igualdade —, na porta de escrita o identificador `supabase` só
//      aparece como VALOR passado (nunca receptor de um acesso por ponto), e na porta dos avisos ele só
//      é receptor de `.functions.invoke(` (nada de `from`, nada de `rpc`);
//   3. metade positiva: a porta chama `runAppAction(` e `conferirPapel(`.
//
// **O `delete` tem escopo declarado**: `Set`/`Map` do app (`travas`, `termos`, `ouvintes`) usam
// `delete` legitimamente; acusá-lo em todo receptor faria o guarda nascer reprovando quatro vezes. O
// `delete` de tabela sempre passa por `from(` — a forma em que um builder fosse guardado numa variável
// já é recusada por `leituraSoComPapel` (o client só pode ser receptor de `from(` dentro de
// `lerComPapel`) e pela régua 2 aqui.
//
// Âncoras: os arquivos lidos (com as duas portas), os nove importadores achados, as duas chamadas da
// metade positiva achadas na porta de escrita e as seis invocações achadas na porta dos avisos.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const LER_COM_PAPEL = 'shared/api/lerComPapel.ts'
const PORTA = 'features/order-actions/api/gravarAcao.ts'
/** Feature `79` (T17): a porta dos avisos, que invoca a edge function `atelie-avisos`. */
const PORTA_DE_AVISOS = 'features/push-notifications/api/portaDeAvisos.ts'
/** A porta dos pedidos montados: a outra que invoca uma function (`order-proposals`). */
const PORTA_DE_PROPOSTAS = 'features/order-proposal/api/portaDePropostas.ts'
/** A porta da leitura de um texto colado (a folha "Colar texto" da montagem): invoca `customer-parse`. */
const PORTA_DE_LEITURA = 'features/order-proposal/api/portaDeLeitura.ts'
/** A porta da prévia do frete da montagem (o passo 4): invoca só a cotação da `melhor-envio`. */
const PORTA_DA_COTACAO = 'features/order-proposal/api/portaDaCotacao.ts'
/**
 * O nome aceito no `invoke`, POR PORTA: literal, a function da porta e uma das ações dela. O nome de uma
 * porta na outra é acusado.
 */
const INVOCACAO_ACEITA: Record<string, RegExp> = {
  [PORTA_DE_AVISOS]: /^atelie-avisos\?action=(config|status|subscribe|events|unsubscribe|test)$/,
  // `preview`: o resumo vivo da montagem (o passo 3) — não grava nada. `save`: "Criar link" e o Editar
  // da montagem (o passo 4) — a ÚNICA gravação da montagem.
  [PORTA_DE_PROPOSTAS]: /^order-proposals\?action=(list|get|renew|cancel|log-sent|note|preview|save)$/,
  // A function tem uma ação só: o nome literal, sem `?action=`.
  [PORTA_DE_LEITURA]: /^customer-parse$/,
  // A cotação, e só ela: `create`, `print` e `tracking` da mesma function são do painel.
  [PORTA_DA_COTACAO]: /^melhor-envio\?action=quote$/,
}
/** As invocações de cada porta (uma por ação) — a âncora da régua 2. */
const INVOCACOES_POR_PORTA: Record<string, number> = { [PORTA_DE_AVISOS]: 6, [PORTA_DE_PROPOSTAS]: 8, [PORTA_DE_LEITURA]: 1, [PORTA_DA_COTACAO]: 1 }
const IMPORTAM_O_CLIENT = [
  LER_COM_PAPEL,
  'entities/order/api/useListaDePedidos.ts',
  'entities/order/api/usePedido.ts',
  PORTA,
  // Feature `76` (T20, G2): os quatro de cliente. Leem — nenhum escreve —, e a régua 1 acima prova isso.
  'entities/customer/api/useListaDeClientes.ts',
  'entities/customer/api/useCliente.ts',
  'entities/customer/api/usePedidosDoCliente.ts',
  'entities/customer/api/buscarClientePorEmail.ts',
  // A montagem de um pedido: a busca, a ficha por e-mail e os endereços salvos. Só lê.
  'entities/customer/api/clientesDaMontagem.ts',
  // Feature `79` (T17): a porta dos avisos. Não lê tabela nem chama RPC — só invoca `atelie-avisos`.
  PORTA_DE_AVISOS,
  // A porta dos pedidos montados. Não lê tabela nem chama RPC — só invoca `order-proposals`.
  PORTA_DE_PROPOSTAS,
  // A porta da leitura do texto colado. Não lê tabela nem chama RPC — só invoca `customer-parse`.
  PORTA_DE_LEITURA,
  // O catálogo da montagem (as peças e as variações). Só lê, dentro de `lerComPapel`.
  'entities/product/api/catalogoDaMontagem.ts',
  // A porta da cotação do passo 4. Não lê tabela nem chama RPC — só invoca `melhor-envio?action=quote`.
  PORTA_DA_COTACAO,
]
const COMANDOS_DE_TABELA = new Set(['update', 'insert', 'upsert'])

const arquivos = (dir: string): string[] =>
  readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return nome === '__tests__' || nome === 'test' ? [] : arquivos(caminho)
    return /\.(ts|tsx)$/.test(nome) && !/\.test\.tsx?$/.test(nome) ? [caminho] : []
  })

const parse = (rel: string, texto: string) =>
  ts.createSourceFile(rel, texto, ts.ScriptTarget.Latest, true, rel.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)

const visitar = (no: ts.Node, f: (n: ts.Node) => void) => {
  f(no)
  no.forEachChild((filho) => visitar(filho, f))
}

const importaOClient = (fonte: ts.SourceFile): boolean =>
  fonte.statements.some(
    (s) => ts.isImportDeclaration(s) && ts.isStringLiteral(s.moduleSpecifier) && s.moduleSpecifier.text === '@estrelinha/supabase/client',
  )

/** A cadeia do receptor passa por uma chamada `from(` (`x.from(…)…`) ou nasce em `supabase`? */
const cadeiaDeTabela = (receptor: ts.Expression): boolean => {
  let e: ts.Expression = receptor
  for (;;) {
    if (ts.isCallExpression(e)) {
      const c = e.expression
      if (ts.isPropertyAccessExpression(c) && c.name.text === 'from') return true
      if (ts.isIdentifier(c) && c.text === 'from') return true
      e = c
    } else if (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e) || ts.isNonNullExpression(e) || ts.isParenthesizedExpression(e)) {
      e = e.expression
    } else {
      return ts.isIdentifier(e) && e.text === 'supabase'
    }
  }
}

/** Régua 1 num arquivo — os sensores chamam a MESMA função. */
const escritasProibidas = (rel: string, texto: string): string[] => {
  const fonte = parse(rel, texto)
  const achados: string[] = []
  visitar(fonte, (n) => {
    if (!ts.isCallExpression(n) || !ts.isPropertyAccessExpression(n.expression)) return
    const acesso = n.expression
    const nome = acesso.name.text
    const linha = fonte.getLineAndCharacterOfPosition(n.getStart()).line + 1
    if (COMANDOS_DE_TABELA.has(nome)) achados.push(`${rel}:${linha} ${nome}`)
    else if (nome === 'delete' && cadeiaDeTabela(acesso.expression)) achados.push(`${rel}:${linha} delete`)
    else if (nome === 'invoke' && ts.isPropertyAccessExpression(acesso.expression) && acesso.expression.name.text === 'functions') {
      const nomeDaFunction = n.arguments[0]
      const regra = INVOCACAO_ACEITA[rel]
      const aceita =
        regra !== undefined &&
        nomeDaFunction !== undefined &&
        ts.isStringLiteral(nomeDaFunction) &&
        regra.test(nomeDaFunction.text)
      if (!aceita) achados.push(`${rel}:${linha} functions.invoke`)
    }
    else if (nome === 'rpc' && rel !== LER_COM_PAPEL) achados.push(`${rel}:${linha} rpc`)
  })
  return achados
}

/** Régua 2 (segunda metade) — na porta, `supabase` nunca é receptor de um acesso por ponto. */
const clientComoReceptor = (rel: string, texto: string): { referencias: number; receptor: string[] } => {
  const fonte = parse(rel, texto)
  const r = { referencias: 0, receptor: [] as string[] }
  visitar(fonte, (n) => {
    if (!ts.isIdentifier(n) || n.text !== 'supabase' || ts.isImportSpecifier(n.parent)) return
    r.referencias++
    const p = n.parent
    if ((ts.isPropertyAccessExpression(p) || ts.isElementAccessExpression(p)) && p.expression === n) {
      r.receptor.push(`${rel}:${fonte.getLineAndCharacterOfPosition(n.getStart()).line + 1}`)
    }
  })
  return r
}

/**
 * Régua 2 (feature `79`) — na porta dos avisos, toda referência a `supabase` é o receptor de
 * `supabase.functions.invoke(`. Devolve as invocações achadas (a âncora) e os outros usos.
 */
const clientNaPortaDeAvisos = (rel: string, texto: string): { invocacoes: number; outros: string[] } => {
  const fonte = parse(rel, texto)
  const r = { invocacoes: 0, outros: [] as string[] }
  visitar(fonte, (n) => {
    if (!ts.isIdentifier(n) || n.text !== 'supabase' || ts.isImportSpecifier(n.parent)) return
    const p = n.parent
    const ehInvoke =
      ts.isPropertyAccessExpression(p) &&
      p.expression === n &&
      p.name.text === 'functions' &&
      ts.isPropertyAccessExpression(p.parent) &&
      p.parent.name.text === 'invoke' &&
      ts.isCallExpression(p.parent.parent) &&
      p.parent.parent.expression === p.parent
    if (ehInvoke) r.invocacoes++
    else r.outros.push(`${rel}:${fonte.getLineAndCharacterOfPosition(n.getStart()).line + 1}`)
  })
  return r
}

/** As funções chamadas pelo nome (`f(`), para a metade positiva. */
const chamados = (rel: string, texto: string): Set<string> => {
  const fonte = parse(rel, texto)
  const nomes = new Set<string>()
  visitar(fonte, (n) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) nomes.add(n.expression.text)
  })
  return nomes
}

const lidos = arquivos(SRC).map((caminho) => ({ rel: relative(SRC, caminho).split('\\').join('/'), texto: readFileSync(caminho, 'utf8') }))
const textoDe = (rel: string) => lidos.find((l) => l.rel === rel)!.texto

describe('toda escrita do app passa pela porta (MAA-29, AD-059)', () => {
  it('âncora: o app foi lido, com as portas e os catorze importadores do client', () => {
    expect(lidos.length).toBeGreaterThan(80)
    for (const rel of IMPORTAM_O_CLIENT) expect(lidos.map((l) => l.rel)).toContain(rel)
  })

  it('régua 1: nenhuma escrita de tabela, nenhuma function fora das portas dos avisos e dos montados e nenhuma RPC fora de lerComPapel — no app inteiro', () => {
    expect(lidos.flatMap((l) => escritasProibidas(l.rel, l.texto))).toEqual([])
  })

  it('régua 2: só catorze arquivos importam o client — por igualdade', () => {
    const importam = lidos.filter((l) => importaOClient(parse(l.rel, l.texto))).map((l) => l.rel).sort()
    expect(importam).toEqual([...IMPORTAM_O_CLIENT].sort())
  })

  it('régua 2: na porta, `supabase` só é VALOR passado — nunca receptor', () => {
    const r = clientComoReceptor(PORTA, textoDe(PORTA))
    // Âncora: as três passagens (`client: supabase` da ação e o primeiro argumento da notificadora, e
    // `{ client: supabase }` da observação do pedido).
    expect(r.referencias).toBe(3)
    expect(r.receptor).toEqual([])
  })

  it.each(Object.entries(INVOCACOES_POR_PORTA))(
    'régua 2: na porta %s, `supabase` só é receptor de `.functions.invoke(` — uma invocação por ação',
    (porta, invocacoes) => {
      const r = clientNaPortaDeAvisos(porta, textoDe(porta))
      // Âncora: uma invocação por ação (avisos: config, status, subscribe, events, unsubscribe, test;
      // montados: list, get, renew, cancel, log-sent, note, preview, save; cotação: quote).
      expect(r.invocacoes).toBe(invocacoes)
      expect(r.outros).toEqual([])
    },
  )

  it('régua 3 (metade positiva): a porta chama `runAppAction(` e `conferirPapel(`', () => {
    const nomes = chamados(PORTA, textoDe(PORTA))
    expect(nomes.has('runAppAction')).toBe(true)
    expect(nomes.has('conferirPapel')).toBe(true)
  })
})

describe('sensores — a régua acusa a escrita à mão e não acusa o que não é escrita', () => {
  const ARQ = 'entities/order/api/usePedido.ts'
  const imp = `import { supabase } from '@estrelinha/supabase/client'\n`

  it.each(['update', 'insert', 'upsert'])('acusa `supabase.from(…).%s(` dentro de lerComPapel (a leitura permitida não desculpa)', (cmd) => {
    const codigo = `${imp}export const f = () => lerComPapel(async () => supabase.from('orders').${cmd}({ status: 'shipped' }).eq('id', 'x'))`
    expect(escritasProibidas(ARQ, codigo)).toEqual([`${ARQ}:2 ${cmd}`])
  })

  it('acusa `delete` de tabela e a cadeia quebrada em linhas (LF e CRLF)', () => {
    const linhas = [imp.trim(), `export const f = () => supabase`, `  .from('orders')`, `  .delete()`, `  .eq('id', 'x')`]
    expect(escritasProibidas(ARQ, linhas.join('\n'))).toEqual([`${ARQ}:2 delete`])
    expect(escritasProibidas(ARQ, linhas.join('\r\n'))).toEqual([`${ARQ}:2 delete`])
  })

  it('acusa a function e a RPC fora de lerComPapel, e o `.rpc(` DENTRO de lerComPapel não', () => {
    expect(escritasProibidas(ARQ, `${imp}export const f = () => supabase.functions.invoke('send-notification?action=trigger', {})`)).toEqual([
      `${ARQ}:2 functions.invoke`,
    ])
    expect(escritasProibidas(ARQ, `${imp}export const f = () => supabase.rpc('set_material_status', {})`)).toEqual([`${ARQ}:2 rpc`])
    expect(escritasProibidas(LER_COM_PAPEL, `${imp}const f = () => supabase.rpc('atelie_clock')`)).toEqual([])
  })

  it('acusa o client APELIDADO escrevendo (a régua é o comando, não o nome do receptor)', () => {
    expect(escritasProibidas(ARQ, `const db = supabase\nexport const f = () => db.from('orders').update({})`)).toEqual([`${ARQ}:2 update`])
  })

  it('NÃO acusa o que é comentário — inclusive o glob de dois asteriscos (é AST)', () => {
    // O glob vai num comentário de LINHA: num de bloco, a sequência dele FECHA o comentário — no
    // TypeScript de verdade também, e o resto viraria código.
    const comentario = `// apps/**/x: supabase.from('orders').update({}) seria errado\n/* supabase.rpc('x') */\nexport const n = 1`
    expect(escritasProibidas(ARQ, comentario)).toEqual([])
    expect(escritasProibidas(ARQ, comentario.replace(/\n/g, '\r\n'))).toEqual([])
  })

  it('INVERSO: a leitura `.from(…).select(…)` do hook e o `delete` de Set/Map não são acusados', () => {
    expect(escritasProibidas(ARQ, `${imp}export const f = () => lerComPapel(async () => supabase.from('order_list').select('id').eq('id', 'x'))`)).toEqual([])
    expect(escritasProibidas(ARQ, `const termos = new Map<string, string>()\nexport const f = (k: string) => termos.delete(k)`)).toEqual([])
  })

  it('a régua 2 enxerga o client como receptor na porta, e aceita só a passagem como valor', () => {
    expect(clientComoReceptor(PORTA, `${imp}const x = supabase.from('orders')`).receptor).toEqual([`${PORTA}:2`])
    expect(clientComoReceptor(PORTA, `${imp}const x = supabase['rpc']`).receptor).toEqual([`${PORTA}:2`])
    expect(clientComoReceptor(PORTA, `${imp}const deps = { client: supabase }\nf(supabase)`)).toEqual({ referencias: 2, receptor: [] })
  })

  it('feature 79: na porta dos avisos, só o literal `atelie-avisos?action=<ação>` é aceito', () => {
    const inv = (nome: string) => `${imp}export const f = () => supabase.functions.invoke(${nome}, { body: {} })`
    // Inverso: as seis ações, na porta.
    for (const acao of ['config', 'status', 'subscribe', 'events', 'unsubscribe', 'test']) {
      expect(escritasProibidas(PORTA_DE_AVISOS, inv(`'atelie-avisos?action=${acao}'`))).toEqual([])
    }
    // Outra function, ação fora das seis, o nome nu, o nome montado e o nome numa variável: acusados.
    for (const nome of ["'send-notification?action=trigger'", "'atelie-avisos?action=apagar'", "'atelie-avisos'", '`atelie-avisos?action=${acao}`', 'NOME']) {
      expect(escritasProibidas(PORTA_DE_AVISOS, inv(nome))).toEqual([`${PORTA_DE_AVISOS}:2 functions.invoke`])
    }
    // O mesmo literal aceito, FORA da porta dos avisos: acusado.
    expect(escritasProibidas(ARQ, inv("'atelie-avisos?action=config'"))).toEqual([`${ARQ}:2 functions.invoke`])
  })

  it('na porta dos montados, só `order-proposals?action=<ação dela>`; o nome de uma porta na outra é acusado', () => {
    const inv = (nome: string) => `${imp}export const f = () => supabase.functions.invoke(${nome}, { body: {} })`
    for (const acao of ['list', 'get', 'renew', 'cancel', 'log-sent', 'note', 'preview', 'save']) {
      expect(escritasProibidas(PORTA_DE_PROPOSTAS, inv(`'order-proposals?action=${acao}'`))).toEqual([])
    }
    for (const nome of ["'order-proposals?action=apagar'", "'order-proposals'", "'atelie-avisos?action=config'", '`order-proposals?action=${acao}`']) {
      expect(escritasProibidas(PORTA_DE_PROPOSTAS, inv(nome))).toEqual([`${PORTA_DE_PROPOSTAS}:2 functions.invoke`])
    }
    expect(escritasProibidas(PORTA_DE_AVISOS, inv("'order-proposals?action=list'"))).toEqual([`${PORTA_DE_AVISOS}:2 functions.invoke`])
    expect(escritasProibidas(ARQ, inv("'order-proposals?action=list'"))).toEqual([`${ARQ}:2 functions.invoke`])
  })

  it('na porta da leitura do texto, só `customer-parse` literal; com ação, noutra porta ou em template, acusado', () => {
    const inv = (nome: string) => `${imp}export const f = () => supabase.functions.invoke(${nome}, { body: {} })`
    expect(escritasProibidas(PORTA_DE_LEITURA, inv("'customer-parse'"))).toEqual([])
    for (const nome of ["'customer-parse?action=parse'", "'order-proposals?action=list'", '`customer-parse`', 'nome']) {
      expect(escritasProibidas(PORTA_DE_LEITURA, inv(nome))).toEqual([`${PORTA_DE_LEITURA}:2 functions.invoke`])
    }
    expect(escritasProibidas(PORTA_DE_PROPOSTAS, inv("'customer-parse'"))).toEqual([`${PORTA_DE_PROPOSTAS}:2 functions.invoke`])
    expect(escritasProibidas(ARQ, inv("'customer-parse'"))).toEqual([`${ARQ}:2 functions.invoke`])
  })

  it('na porta da cotação, só `melhor-envio?action=quote` literal; as ações do painel, noutra porta ou em template, acusado', () => {
    const inv = (nome: string) => `${imp}export const f = () => supabase.functions.invoke(${nome}, { body: {} })`
    expect(escritasProibidas(PORTA_DA_COTACAO, inv("'melhor-envio?action=quote'"))).toEqual([])
    for (const nome of ["'melhor-envio?action=create'", "'melhor-envio'", "'order-proposals?action=save'", '`melhor-envio?action=${acao}`']) {
      expect(escritasProibidas(PORTA_DA_COTACAO, inv(nome))).toEqual([`${PORTA_DA_COTACAO}:2 functions.invoke`])
    }
    expect(escritasProibidas(PORTA_DE_PROPOSTAS, inv("'melhor-envio?action=quote'"))).toEqual([`${PORTA_DE_PROPOSTAS}:2 functions.invoke`])
    expect(escritasProibidas(ARQ, inv("'melhor-envio?action=quote'"))).toEqual([`${ARQ}:2 functions.invoke`])
  })

  it('feature 79: a régua 2 da porta dos avisos enxerga `from`, `rpc` e o client passado adiante', () => {
    expect(clientNaPortaDeAvisos(PORTA_DE_AVISOS, `${imp}const x = supabase.from('push_subscriptions')`).outros).toEqual([`${PORTA_DE_AVISOS}:2`])
    expect(clientNaPortaDeAvisos(PORTA_DE_AVISOS, `${imp}const x = supabase.rpc('claim_push_test')`).outros).toEqual([`${PORTA_DE_AVISOS}:2`])
    expect(clientNaPortaDeAvisos(PORTA_DE_AVISOS, `${imp}f(supabase)`).outros).toEqual([`${PORTA_DE_AVISOS}:2`])
    expect(clientNaPortaDeAvisos(PORTA_DE_AVISOS, `${imp}const x = supabase.functions.invoke('atelie-avisos?action=config')`)).toEqual({ invocacoes: 1, outros: [] })
  })

  it('a metade positiva enxerga a ausência', () => {
    expect(chamados(PORTA, `export const g = () => outraCoisa()`).has('runAppAction')).toBe(false)
    expect(chamados(PORTA, `// runAppAction(deps)\nexport const g = 1`).has('runAppAction')).toBe(false)
  })
})
