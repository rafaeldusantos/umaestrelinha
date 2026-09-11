import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { NOTIFICATION_EVENTS } from '@estrelinha/core/notifications'

/**
 * **"Já avisei esta cliente?" é uma pergunta que tem UMA resposta** — `NTF-01`.
 *
 * Até a feature 42 a resposta morava em `order_emails (order_id, type)`. Ela virou
 * `order_notifications (order_id, event, channel)`, porque a mesma mensagem passa a poder sair por
 * dois canais e "já enviei" tem de ser por canal — senão o WhatsApp da feature 43 nasceria mudo
 * (o e-mail já teria reivindicado o par) ou duplicado (se a chave ignorasse o canal).
 *
 * `order_emails` **não foi apagada**: virou uma VIEW `security_invoker` sobre a tabela nova, e as
 * RPCs antigas delegam. Isso é deliberado e tem prazo — cobre a janela entre o `db push` e o deploy
 * da Vercel, que rodam em paralelo, durante a qual a function publicada ainda chama o nome velho
 * (lição da `39`). E é exatamente aí que mora o risco: a view **continua legível**, nada impede uma
 * tela nova de voltar a lê-la, e nada quebraria se ela lesse. O build passa, o `tsc` passa, o teste
 * de componente passa — e o painel volta a mostrar um histórico que não conhece canal, silenciosa e
 * corretamente errado.
 *
 * O segundo dono possível é mais sutil: **o vocabulário dos eventos**. Se uma tela escrever
 * `'order_paid'` como literal, ela passa a ter uma cópia da lista que `core` guarda — e a próxima
 * feature que renomear ou acrescentar um evento vai encontrar duas verdades. Quem responde "que
 * eventos existem, e como se chamam" é `NOTIFICATION_EVENTS` + `NOTIFICATION_EVENT_LABELS`.
 *
 * ÂNCORA DUPLA: a varredura prova que leu arquivos **e** que a régua encontra o que procura. Só
 * contar arquivos deixa passar um regex quebrado; só procurar ocorrência deixa passar um caminho
 * errado. As duas juntas é que fecham.
 *
 * A régua nunca é o objeto medido: o escopo está escrito **literalmente** aqui, e não derivado de
 * constante que o código sob teste exporte — lição da `fieldBorder`. **Zero allowlist** para a view.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/**
 * Escopo literal: as duas pontas que têm tela, **e as edge functions**.
 *
 * `supabase/functions` entra porque é lá que o motor vive — e foi um achado de verificação da `39`
 * que ensinou a incluí-lo: um guarda com escopo `['apps']` deixou a function do sitemap pedindo uma
 * coluna proibida no `select`. Guarda com alcance menor que a regra é allowlist com outro nome.
 */
const ESCOPO = ['apps', 'supabase/functions']

const IGNORADOS = new Set(['node_modules', 'dist', '.turbo', '.temp', 'coverage', '.git'])
const EXTENSOES = ['.ts', '.tsx']

const arquivos = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (IGNORADOS.has(entry.name)) return []
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return arquivos(full)
    return entry.isFile() && EXTENSOES.some((ext) => entry.name.endsWith(ext)) ? [full] : []
  })

const eTeste = (rel: string): boolean =>
  rel.includes('__tests__/') || rel.endsWith('.test.ts') || rel.endsWith('.test.tsx')

interface Arquivo {
  rel: string
  /** As linhas **sem comentário**. É sobre estas que a régua roda. */
  linhas: string[]
}

/**
 * Remove comentários preservando a NUMERAÇÃO das linhas.
 *
 * Sem isto o guarda casa a prosa que explica o defeito — e o conserto vira "edite o comentário",
 * não "conserte o código". Este arquivo inteiro fala de `order_emails`; se a régua lesse comentário,
 * ele reprovaria a si mesmo.
 *
 * **Linha e bloco na MESMA varredura, e a ordem é a do texto** (`BL-027`, fechada em 2026-09-06).
 * Duas passadas têm um ponto cego que já custou uma reprovação de verdade: um comentário de LINHA
 * que cite um glob de dois asteriscos abre um "bloco" aos olhos da segunda régua, e ela apaga tudo
 * até o próximo fecha-bloco — inclusive CÓDIGO. O efeito é o pior possível num guarda: ele deixa de
 * enxergar um trecho e passa a aprovar o que estiver lá dentro, em silêncio.
 *
 * CRLF normalizado primeiro, e isto não é higiene — é correção. Em JavaScript `.` **não casa `\r`**,
 * então num checkout Windows (a plataforma deste projeto) um comentário de linha terminado em `\r`
 * não casava nada e o stripper ficava inerte.
 */
const semComentarios = (fonte: string): string[] =>
  fonte
    .replace(/\r\n/g, '\n')
    .replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (trecho) => trecho.replace(/[^\n]/g, ' '))
    .split('\n')

const varridos: Arquivo[] = ESCOPO.flatMap((d) => arquivos(join(ROOT, d))).map((caminho) => ({
  rel: relative(ROOT, caminho).split('\\').join('/'),
  linhas: semComentarios(readFileSync(caminho, 'utf8')),
}))

/** Só o que a loja e o painel de fato executam — teste pode nomear o que quiser. */
const producao = varridos.filter((a) => !eTeste(a.rel))

interface Ocorrencia {
  arquivo: string
  linha: number
  texto: string
}

const procurar = (padrao: RegExp, alvo: Arquivo[] = producao): Ocorrencia[] => {
  const achados: Ocorrencia[] = []
  for (const { rel, linhas } of alvo) {
    linhas.forEach((texto, i) => {
      if (padrao.test(texto)) achados.push({ arquivo: rel, linha: i + 1, texto: texto.trim() })
    })
  }
  return achados
}

const local = (o: Ocorrencia) => `${o.arquivo}:${o.linha} → ${o.texto}`

// ───────────────────────────────────────────────────────────────────────────
// Âncoras
// ───────────────────────────────────────────────────────────────────────────

describe('notificações com um dono — âncoras da varredura', () => {
  it('a varredura enxerga os dois apps E as edge functions', () => {
    // Caminho errado varre zero arquivo e faz TODA asserção abaixo passar por vacuidade.
    expect(varridos.length).toBeGreaterThan(400)
    expect(varridos.some((a) => a.rel.startsWith('apps/store/src/'))).toBe(true)
    expect(varridos.some((a) => a.rel.startsWith('apps/backoffice/src/'))).toBe(true)
    // A terceira ponta, nomeada por um arquivo que precisa existir: é onde o motor vive.
    expect(varridos.some((a) => a.rel === 'supabase/functions/send-notification/dispatch.ts')).toBe(true)
  })

  it('a varredura separa produção de teste, e sobra produção de verdade', () => {
    expect(producao.length).toBeGreaterThan(200)
    expect(producao.some((a) => a.rel.endsWith('.test.ts'))).toBe(false)
    expect(producao.some((a) => a.rel.includes('__tests__/'))).toBe(false)
  })

  it('a régua ENCONTRA o nome novo onde ele tem de estar — a outra metade da âncora', () => {
    // Sem isto, um regex quebrado (ou um rename que passasse batido) deixaria todo o resto passar
    // sem nada ser medido.
    //
    // Os dois lados são DIFERENTES, e a distinção importa: quem lê a TABELA é o painel (o histórico
    // do pedido); o motor nunca a nomeia — ele fala só com as RPCs `claim_`/`finish_`, porque a
    // reivindicação atômica não se expressa em `supabase-js` (`AD-006`). Ancorar o motor no nome da
    // tabela era suposição minha, e esta âncora a derrubou ao ser escrita.
    const tabela = procurar(/\border_notifications\b/)
    expect(tabela.length).toBeGreaterThanOrEqual(1)
    expect(tabela.some((o) => o.arquivo.startsWith('apps/backoffice/src/'))).toBe(true)

    const rpcs = procurar(/\b(claim|finish)_order_notification\b/)
    expect(rpcs.some((o) => o.arquivo === 'supabase/functions/send-notification/dispatch.ts')).toBe(true)
  })

  it('comentário é REMOVIDO, com CRLF e com LF — sensor do stripper', () => {
    const crlf = semComentarios('const a = 1\r\n// order_emails aqui\r\nconst b = 2\r\n')
    const lf = semComentarios('const a = 1\n// order_emails aqui\nconst b = 2\n')
    const bloco = semComentarios('const a = 1\r\n/**\r\n * order_emails\r\n */\r\nconst b = 2\r\n')

    for (const linhas of [crlf, lf, bloco]) {
      expect(linhas.some((l) => l.includes('order_emails'))).toBe(false)
      // E o código em volta sobrevive — um stripper que apagasse tudo passaria no teste acima.
      expect(linhas.some((l) => l.includes('const a = 1'))).toBe(true)
      expect(linhas.some((l) => l.includes('const b = 2'))).toBe(true)
    }

    // A numeração não desliza: o bloco de 5 linhas continua com 5 linhas (+ a final vazia).
    expect(bloco).toHaveLength(6)
  })

  it('comentário de LINHA que cita um glob não engole o código abaixo — sensor do ponto cego', () => {
    const fonte = [
      "const antes = 1",
      "// varre apps/**/*.ts e supabase/functions/**/*.ts",
      "const from = supabase.from('order_emails')",
      "const depois = 3",
    ].join('\r\n')

    const linhas = semComentarios(fonte)

    // O comentário sumiu…
    expect(linhas.some((l) => l.includes('varre apps'))).toBe(false)
    // …e o CÓDIGO abaixo dele continua visível, que é o ponto: se ele desaparecesse, o guarda
    // aprovaria a leitura proibida em silêncio.
    expect(linhas.some((l) => l.includes("from('order_emails')"))).toBe(true)
    expect(linhas.some((l) => l.includes('const depois = 3'))).toBe(true)
  })
})

// ───────────────────────────────────────────────────────────────────────────
// A regra: a VIEW de compatibilidade não tem leitor
// ───────────────────────────────────────────────────────────────────────────

describe('NTF-01 — `order_emails` é view de transição, e nenhuma tela pode lê-la', () => {
  it('ZERO leituras de `order_emails` em produção — sem allowlist', () => {
    // Escrito sem allowlist de propósito: uma exceção "temporária" aqui é uma tela que continua
    // mostrando histórico sem canal para sempre. Quem precisa da auditoria lê `order_notifications`.
    const leituras = procurar(/\border_emails\b/)

    expect(leituras.map(local)).toEqual([])
  })

  it('ZERO chamadas às RPCs antigas — elas existem só para a function publicada da janela de deploy', () => {
    // `claim_order_email` / `finish_order_email` delegam para as novas e vão sair numa migration
    // posterior. Código novo que as chamasse ficaria órfão nesse dia, em silêncio.
    const antigas = procurar(/\b(claim|finish)_order_email\b/)

    expect(antigas.map(local)).toEqual([])
  })

  it('a coluna `type` da view não é lida como campo de notificação', () => {
    // A view expõe `event AS type` para o código velho. Uma tela nova que leia `.type` de uma linha
    // de notificação está lendo a view, ainda que pelo nome novo da tabela.
    const cru = procurar(/\btype:\s*string\b.*\/\/\s*notifica/i)

    expect(cru.map(local)).toEqual([])
  })
})

// ───────────────────────────────────────────────────────────────────────────
// A regra: o vocabulário dos eventos tem um dono
// ───────────────────────────────────────────────────────────────────────────

describe('FIX-02 / NTF-03 — o nome dos eventos vem de `core`, não de literal na tela', () => {
  /**
   * A lista é lida de `core` (não escrita à mão aqui) porque é ela que precisa ser protegida — mas
   * o ESCOPO da varredura é literal, que é o que a lição da `fieldBorder` cobra: a régua não pode
   * ser o objeto medido, e aqui o objeto medido é o código dos apps, não a constante.
   */
  const literais = NOTIFICATION_EVENTS.map((e) => e as string)

  it('nenhum arquivo de `apps/**` escreve um nome de evento como literal', () => {
    const padrao = new RegExp(`['"\`](${literais.join('|')})['"\`]`)
    const achados = procurar(padrao).filter((o) => o.arquivo.startsWith('apps/'))

    expect(achados.map(local)).toEqual([])
  })

  it('e a régua de fato casaria um literal, se houvesse — sensor', () => {
    const padrao = new RegExp(`['"\`](${literais.join('|')})['"\`]`)

    expect(padrao.test("const x = 'order_paid'")).toBe(true)
    expect(padrao.test('const x = "material_received"')).toBe(true)
    expect(padrao.test("const x = 'order_pago'")).toBe(false)
  })

  it('os dois rótulos MORTOS não voltaram — eles nunca foram eventos do banco', () => {
    // `order_confirmed` e `payment_approved` eram chaves de um `Record<string, string>` no
    // histórico do pedido, e nenhuma das duas existia no `check` da migration. Os eventos reais
    // caíam no fallback, e a admin lia "E-mail order_received enviado".
    const mortos = procurar(/['"`](order_confirmed|payment_approved)['"`]/).filter((o) =>
      o.arquivo.startsWith('apps/'),
    )

    expect(mortos.map(local)).toEqual([])
    expect(literais).not.toContain('order_confirmed')
    expect(literais).not.toContain('payment_approved')
  })
})
