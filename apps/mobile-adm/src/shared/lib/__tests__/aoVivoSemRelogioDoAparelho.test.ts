// Feature `83` · T10 — `LAV-61`: na Loja ao vivo e no cartão "Visitas hoje", nenhum número, faixa,
// faixa em andamento, dia da semana ou "hoje" vem do relógio do APARELHO — tudo vem da resposta do
// servidor (`faixa_atual`, `hoje`, `por_dia`, `ate_hora`). Um aparelho com a hora errada, ou o fuso de
// outro lugar, desenharia a faixa dourada na hora errada, e nenhum teste de componente repara: o
// relógio do jsdom e o da fixtura costumam concordar (`L-058`).
//
// A régua lê o FONTE do disco (comentário fora: CRLF primeiro, linha e bloco na MESMA passada) e acusa
// `new Date(`, `Date.now(`, `getHours`, `getDay` e `toLocaleDateString`, por token.
//
// **Escopo LITERAL** (`L-035`): os arquivos que a `83` criou no app, `core/live/**` (produção) e
// `core/stats/counterNotes.ts`. Arquivo novo da Loja ao vivo entra nesta lista na task em que nasce.
// **Allowlist de UM**: `shared/lib/useSegundosDesde.ts`, que mede a DURAÇÃO desde a chegada da
// resposta (`LAV-07`) — o próprio relógio do aparelho contra ele mesmo, nunca contra o servidor. O caso
// abaixo prova que o MESMO texto em outro arquivo seria acusado.
//
// O que a régua NÃO alcança, declarado: o relógio lido por outro nome (`performance.now`, um alias de
// `Date`) e o que mora fora do escopo (o `formatStoreHour` de `core/time`, que escreve um instante do
// servidor no fuso da loja, e é do dono do fuso).
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const CORE = resolve(SRC, '../../../packages/core/src')

const DO_APP = [
  'entities/stats/model/aoVivo.ts',
  'entities/stats/model/periodos.ts',
  'pages/AoVivoPage.tsx',
  'shared/lib/useSegundosDesde.ts',
  'shared/ui/leituraDe.ts',
  'widgets/store-access/index.ts',
  'widgets/store-access/model/barras.ts',
  'widgets/store-access/ui/CabecalhoAoVivo.tsx',
  'widgets/store-access/ui/GraficoDosAcessos.tsx',
  'widgets/store-access/ui/SecaoAcessos.tsx',
  'widgets/visits-card/index.ts',
  'widgets/visits-card/ui/CartaoVisitasHoje.tsx',
] as const
const DE_CORE = [
  ...readdirSync(resolve(CORE, 'live'))
    .filter((n) => n.endsWith('.ts'))
    .map((n) => `live/${n}`),
  'stats/counterNotes.ts',
]

const ALLOWLIST = ['app:shared/lib/useSegundosDesde.ts']

const semComentarios = (texto: string): string => texto.replace(/\r\n?/g, '\n').replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')

const FORMAS: { nome: string; re: RegExp }[] = [
  { nome: 'new Date(', re: /\bnew\s+Date\s*\(/ },
  { nome: 'Date.now(', re: /\bDate\s*\.\s*now\s*\(/ },
  { nome: 'getHours', re: /\bget(UTC)?Hours\b/ },
  { nome: 'getDay', re: /\bget(UTC)?Day\b/ },
  { nome: 'toLocaleDateString', re: /\btoLocaleDateString\b/ },
]

interface Arquivo {
  nome: string
  fonte: string
}

const ESCOPO: Arquivo[] = [
  ...DO_APP.map((rel) => ({ nome: `app:${rel}`, fonte: readFileSync(resolve(SRC, rel), 'utf8') })),
  ...DE_CORE.map((rel) => ({ nome: `core:${rel}`, fonte: readFileSync(resolve(CORE, rel), 'utf8') })),
]

const leituras = (a: Arquivo): string[] => {
  const codigo = semComentarios(a.fonte)
  return FORMAS.filter((f) => f.re.test(codigo)).map((f) => `${a.nome} [${f.nome}]`)
}
const acusacoes = (alvo: Arquivo[]): string[] => alvo.filter((a) => !ALLOWLIST.includes(a.nome)).flatMap(leituras)

describe('a Loja ao vivo não lê o relógio do aparelho (LAV-61) — âncoras', () => {
  it('o escopo foi lido: os arquivos do app e os de `core`, nomeando um de cada ponta', () => {
    expect(ESCOPO).toHaveLength(DO_APP.length + DE_CORE.length)
    expect(ESCOPO.length).toBeGreaterThanOrEqual(15)
    expect(ESCOPO.every((a) => a.fonte.length > 0)).toBe(true)
    const nomes = ESCOPO.map((a) => a.nome)
    expect(nomes).toEqual(expect.arrayContaining(['app:widgets/store-access/ui/SecaoAcessos.tsx', 'core:live/access.ts', 'core:stats/counterNotes.ts']))
  })

  it('a allowlist está VIVA: o arquivo autorizado lê mesmo o relógio (senão ela sobraria sem razão)', () => {
    const permitido = ESCOPO.find((a) => a.nome === ALLOWLIST[0])!
    expect(leituras(permitido)).toEqual(['app:shared/lib/useSegundosDesde.ts [Date.now(]'])
  })
})

describe('a Loja ao vivo não lê o relógio do aparelho (LAV-61)', () => {
  it('nenhum arquivo do escopo (fora a allowlist) lê o relógio', () => {
    expect(acusacoes(ESCOPO)).toEqual([])
  })
})

describe('sensores', () => {
  it.each([
    ['const h = new Date().getHours()', ['new Date(', 'getHours']],
    ['const agora = Date.now()', ['Date.now(']],
    ['const d = new Date(iso)', ['new Date(']],
    ['const dia = x.getUTCDay()', ['getDay']],
    ["const t = d.toLocaleDateString('pt-BR')", ['toLocaleDateString']],
  ])('acusa: %s', (codigo, formas) => {
    expect(acusacoes([{ nome: 'app:widgets/x/ui/X.tsx', fonte: codigo }])).toEqual(formas.map((f) => `app:widgets/x/ui/X.tsx [${f}]`))
  })

  it('o MESMO texto do arquivo autorizado, em outro arquivo, É acusado (a allowlist é por nome, de UM)', () => {
    const permitido = ESCOPO.find((a) => a.nome === ALLOWLIST[0])!
    expect(acusacoes([{ nome: 'app:widgets/store-access/ui/Outro.tsx', fonte: permitido.fonte }])).toEqual([
      'app:widgets/store-access/ui/Outro.tsx [Date.now(]',
    ])
  })

  it('INVERSO — comentário que cita a forma não é acusado (CRLF e LF), e o tipo `Date` sozinho também não', () => {
    expect(acusacoes([{ nome: 'app:x.ts', fonte: '// new Date() e Date.now()\r\nconst a = 1' }])).toEqual([])
    expect(acusacoes([{ nome: 'app:x.ts', fonte: '/* getHours, getDay */\nconst a = 1' }])).toEqual([])
    expect(acusacoes([{ nome: 'app:x.ts', fonte: 'const f = (d: Date): string => texto' }])).toEqual([])
    expect(acusacoes([{ nome: 'app:x.ts', fonte: '// varre apps/**\nconst a = Date.now()\n/* fim */' }])).toEqual(['app:x.ts [Date.now(]'])
  })
})
