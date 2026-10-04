import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * "Em que pé está este pedido?" tem UM dono — `SIT-11`, feature `59`.
 *
 * ---------------------------------------------------------------------------------------------
 * O que este guarda existe para impedir
 * ---------------------------------------------------------------------------------------------
 *
 * A conta antiga tinha a SUA tabela de rótulos, indexada por `orders.status`. Conhecia cinco dos
 * seis valores do banco (um deles nem existia lá) e mandava o resto para o padrão — e, como pagar
 * não muda `orders.status`, um pedido pago aparecia "Pendente". Nenhuma ferramenta acusava: o build
 * passa, o `tsc` passa (`Record<string, …>` aceita qualquer chave) e o teste de componente passa.
 *
 * Hoje quem responde é `orderSituation` (`@estrelinha/core/orders`), lido pela lista da conta,
 * pelo detalhe e pelas pendências, e desenhado por `OrderSituationBadge`. **Sem este guarda, a
 * próxima tela nasce com a própria tabela de novo**, e a loja volta a ter duas respostas para a
 * mesma pergunta — a primeira tela que esquecer um valor escreve "Pendente" num pedido pago.
 *
 * ---------------------------------------------------------------------------------------------
 * A régua — uma por FORMA (`L-033`)
 * ---------------------------------------------------------------------------------------------
 *
 * 1. **Entrada de mapa**: uma chave do vocabulário de status (do banco, de pagamento ou da régua
 *    do selo) apontando para um RÓTULO — texto que começa por maiúscula, direto ou dentro de
 *    `{ label: … }`. É a forma de `statusConfig` e de qualquer `Record<status, string>`.
 * 2. **`case` de `switch`**: `case 'shipped': return 'Enviado'` — o mesmo mapa escrito como
 *    controle de fluxo.
 *
 * O que distingue rótulo de dado é a **maiúscula**: `status: 'pending'` é dado (e a chave nem é do
 * vocabulário), `pending: 'pending'` também; `pending: 'Pendente'` é rótulo.
 *
 * ---------------------------------------------------------------------------------------------
 * Escopo e âncora
 * ---------------------------------------------------------------------------------------------
 *
 * O escopo é a LOJA, escrito literalmente: o painel (`apps/backoffice`) tem o vocabulário dele —
 * "Em Separação", "Estornado" —, que responde outra pergunta ("o que a Adri faz com este pedido?")
 * e não é o selo da cliente. ÂNCORA DUPLA: arquivos lidos **e** a régua encontrando o que procura
 * no dono, que mora fora do escopo e é lido à parte. Zero allowlist.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** Escopo literal — a régua nunca é o objeto medido. */
const ESCOPO = 'apps/store/src'

/** O dono, fora do escopo, lido à parte para a âncora provar que a régua casa. */
const DONO = 'packages/core/src/orders/situation.ts'

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
 * CRLF normalizado PRIMEIRO (em JavaScript `.` não casa `\r`, e num checkout Windows o removedor
 * de linha ficaria inerte — `L-031`), e linha e bloco na MESMA varredura (`BL-027`): em duas
 * passadas, um comentário de linha que cite um glob de dois asteriscos abre um bloco que apaga
 * CÓDIGO até o próximo fecha-bloco, e um guarda cuja asserção é uma ausência passa a aprovar em
 * silêncio o que estiver lá dentro.
 */
const semComentarios = (fonte: string): string[] =>
  fonte
    .replace(/\r\n/g, '\n')
    .replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (trecho) => trecho.replace(/[^\n]/g, ' '))
    .split('\n')

const lerArquivo = (caminho: string): Arquivo => ({
  rel: relative(ROOT, caminho).split('\\').join('/'),
  linhas: semComentarios(readFileSync(caminho, 'utf8')),
})

const varridos: Arquivo[] = arquivos(join(ROOT, ESCOPO)).map(lerArquivo)

/** Só o que a loja executa — teste pode nomear o que quiser, inclusive este arquivo. */
const producao = varridos.filter((a) => !eTeste(a.rel))

/**
 * As chaves que identificam um status: o vocabulário de `orders.status`, o de `payment_status`, o
 * `confirmed` que a conta antiga inventou, e as chaves da própria régua do selo (uma cópia de
 * `SITUATION_LABELS` em `apps/store` usaria estas).
 */
const CHAVES = [
  'pending',
  'paid',
  'separating',
  'shipped',
  'delivered',
  'cancelled',
  'confirmed',
  'approved',
  'rejected',
  'refunded',
  'expired',
  'awaiting_material',
  'in_production',
  'pix_expired',
  'payment_rejected',
  'awaiting_payment',
].join('|')

/** Um rótulo: texto entre aspas que começa por maiúscula (com acento, inclusive). */
const ROTULO = `['"\`][A-ZÁÉÍÓÚÂÊÔÃÕÇ]`

/** Forma 1 — entrada de mapa: `chave: 'Rótulo'` ou `chave: { label: 'Rótulo'`. Chave com ou sem aspas. */
const ENTRADA_DE_MAPA = new RegExp(
  `(?:^|[\\s{,(])['"]?(?:${CHAVES})['"]?\\s*:\\s*(?:\\{\\s*label\\s*:\\s*)?${ROTULO}`,
)

/** Forma 2 — `case 'chave': return 'Rótulo'`. */
const CASE_DE_SWITCH = new RegExp(`case\\s+['"](?:${CHAVES})['"]\\s*:\\s*return\\s+${ROTULO}`)

interface Ocorrencia {
  arquivo: string
  linha: number
  texto: string
}

const procurar = (regua: RegExp, alvo: Arquivo[] = producao): Ocorrencia[] =>
  alvo.flatMap((a) =>
    a.linhas.flatMap((texto, i) =>
      regua.test(texto) ? [{ arquivo: a.rel, linha: i + 1, texto: texto.trim() }] : [],
    ),
  )

const comoTexto = (o: Ocorrencia[]) => o.map((x) => `${x.arquivo}:${x.linha} — ${x.texto}`)

const sintetico = (rel: string, fonte: string): Arquivo => ({ rel, linhas: semComentarios(fonte) })

// ───────────────────────────────────────────────────────────────────────────
// Âncoras
// ───────────────────────────────────────────────────────────────────────────

describe('situação do pedido — âncoras da varredura', () => {
  it('a varredura enxerga a loja, e sobra produção de verdade', () => {
    // Caminho errado varre zero arquivo e faz TODA asserção de ausência passar por vacuidade.
    expect(varridos.length).toBeGreaterThan(400)
    expect(producao.length).toBeGreaterThan(200)
    expect(producao.some((a) => a.rel === 'apps/store/src/pages/AccountPage.tsx')).toBe(true)
    expect(producao.some((a) => a.rel.includes('__tests__/'))).toBe(false)
  })

  it('a régua ENCONTRA a tabela no dono — âncora da forma', () => {
    // `SITUATION_LABELS` mora em `core`, fora do escopo. Se a régua não o casasse, as asserções de
    // ausência abaixo passariam por não saber reconhecer o que procuram.
    const dono = lerArquivo(join(ROOT, DONO))
    const achados = procurar(ENTRADA_DE_MAPA, [dono])

    expect(achados.length).toBeGreaterThanOrEqual(9)
    expect(achados.some((o) => o.texto.startsWith("delivered: 'Entregue'"))).toBe(true)
  })

  it('comentário é REMOVIDO, com CRLF e com LF — sensor do removedor', () => {
    const crlf = semComentarios("const a = 1\r\n// pending: 'Pendente'\r\nconst b = 2\r\n")
    const lf = semComentarios("const a = 1\n// pending: 'Pendente'\nconst b = 2\n")
    const bloco = semComentarios("const a = 1\r\n/**\r\n * shipped: 'Enviado'\r\n */\r\nconst b = 2\r\n")

    for (const linhas of [crlf, lf, bloco]) {
      expect(linhas.some((l) => ENTRADA_DE_MAPA.test(l))).toBe(false)
      // E o código em volta sobrevive — um removedor que apagasse tudo passaria acima.
      expect(linhas.some((l) => l.includes('const a = 1'))).toBe(true)
      expect(linhas.some((l) => l.includes('const b = 2'))).toBe(true)
    }
    // A numeração não desliza: 5 linhas de fonte + a final vazia.
    expect(bloco).toHaveLength(6)
  })

  it('comentário de linha que cita um glob NÃO cega o código abaixo (BL-027)', () => {
    // Montado por concatenação: escrito colado, o abre-bloco cru contaminaria a varredura dos
    // vizinhos que leem este arquivo.
    const glob = 'apps/' + '*'.repeat(2)
    const arquivo = sintetico(
      'apps/store/src/widgets/sintetico/Sintetico.tsx',
      [
        `// esta tela varre ${glob}`,
        "const ROTULOS = { shipped: 'Enviado' }",
        '/* bloco de verdade */',
        '',
      ].join('\n'),
    )

    expect(procurar(ENTRADA_DE_MAPA, [arquivo]).map((o) => o.linha)).toEqual([2])
  })
})

// ───────────────────────────────────────────────────────────────────────────
// A regra
// ───────────────────────────────────────────────────────────────────────────

describe('nenhuma tabela de rótulos de status na loja (SIT-11)', () => {
  it('nenhuma entrada de mapa status → rótulo em apps/store', () => {
    expect(
      comoTexto(procurar(ENTRADA_DE_MAPA)),
      'o rótulo vem de `orderSituation` (@estrelinha/core/orders) — desenhe com `OrderSituationBadge`',
    ).toEqual([])
  })

  it('nenhum `case` de status devolvendo rótulo em apps/store', () => {
    expect(comoTexto(procurar(CASE_DE_SWITCH))).toEqual([])
  })

  it('`statusConfig` não existe mais na loja — o nome do defeito', () => {
    expect(comoTexto(procurar(/\bstatusConfig\b/))).toEqual([])
  })
})

// ───────────────────────────────────────────────────────────────────────────
// Sensores — a régua pega o defeito, e só o defeito
// ───────────────────────────────────────────────────────────────────────────

describe('situação do pedido — sensores', () => {
  it('a tabela antiga da conta SERIA acusada, linha por linha — sensor por mutação', () => {
    const conta = sintetico(
      'apps/store/src/pages/AccountPage.tsx',
      [
        'const statusConfig: Record<string, { label: string }> = {',
        "  pending: { label: 'Pendente', icon: Clock },",
        "  confirmed: { label: 'Confirmado', icon: CheckCircle2 },",
        "  shipped: { label: 'Enviado', icon: Truck },",
        "  delivered: { label: 'Entregue', icon: CheckCircle2 },",
        "  cancelled: { label: 'Cancelado', icon: XCircle },",
        '}',
      ].join('\n'),
    )

    expect(procurar(ENTRADA_DE_MAPA, [conta]).map((o) => o.linha)).toEqual([2, 3, 4, 5, 6])
    expect(procurar(/\bstatusConfig\b/, [conta])).toHaveLength(1)
  })

  it('as outras grafias também — chave entre aspas, mapa numa linha, chave da régua do selo', () => {
    const variantes = sintetico(
      'apps/store/src/widgets/sintetico/Variantes.tsx',
      [
        "const A = { 'paid': 'Pago' }",
        'const B = { delivered: "Entregue", shipped: "A caminho" }',
        "const C = { in_production: 'Em produção' }",
        'const D = { refunded: `Reembolsado` }',
      ].join('\n'),
    )

    expect(procurar(ENTRADA_DE_MAPA, [variantes]).map((o) => o.linha)).toEqual([1, 2, 3, 4])
  })

  it('o `switch` de rótulo SERIA acusado — sensor da segunda forma', () => {
    const fonte = sintetico(
      'apps/store/src/widgets/sintetico/Switch.ts',
      [
        'switch (status) {',
        "  case 'shipped': return 'Enviado'",
        "  case \"delivered\": return 'Entregue'",
        '}',
      ].join('\n'),
    )

    expect(procurar(CASE_DE_SWITCH, [fonte]).map((o) => o.linha)).toEqual([2, 3])
  })

  it('o INVERSO: dado, comparação e consumo do dono não são acusados', () => {
    // Uma régua que casasse tudo seria tão inútil quanto uma que não casa nada — e reprovaria o
    // código correto, empurrando quem consertou de volta para a forma velha.
    const legitimo = sintetico(
      'apps/store/src/widgets/sintetico/Legitimo.tsx',
      [
        "const filtro = { status: 'pending', payment_status: 'approved' }",
        "const mapa = { pending: 'pending', shipped: 'shipped' }",
        "if (order.status === 'delivered') mostrar()",
        "case 'shipped': return true",
        'const { label } = orderSituation(order)',
        '<OrderSituationBadge order={order} events={order.status_events} />',
        "const titulo = { pagamento: 'Pagamento pendente' }",
      ].join('\n'),
    )

    expect(procurar(ENTRADA_DE_MAPA, [legitimo])).toEqual([])
    expect(procurar(CASE_DE_SWITCH, [legitimo])).toEqual([])
  })
})
