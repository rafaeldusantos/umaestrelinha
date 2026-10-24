// Feature `74` · T28 — `MAP-45`: com o sistema pedindo menos movimento, o esqueleto e a troca de recorte
// da lista e do detalhe não se movem. Molde: `movimentoDaContaRespeitaMovimento.test.ts` (loja, `59`),
// com a régua estreita de lá — o par só conta quando ELE MESMO desliga movimento
// (`motion-reduce:transition-none`, `motion-reduce:animate-none`).
//
// Por que um guarda de fonte: jsdom não aplica CSS, então o par `motion-reduce:` é invisível a qualquer
// `render`. A régua confere a CLASSE na mesma linha do movimento — o par a três linhas de distância pode
// estar noutro elemento e não cobre nada.
//
// **Escopo LITERAL**: os arquivos de UI que a `74` criou ou reescreveu, mais `shared/ui/leitura.tsx`, de
// onde vem o `Traco` — o esqueleto da lista e do detalhe. Arquivo de UI novo da aba Pedidos entra nesta
// lista na mesma task em que nasce. Âncora de tokens e de pares MEDIDA com esta régua no fecho da T28.
//
// **Feature `75` (T27, `MAA-34`)**: o escopo ganhou os seis arquivos de UI das ações (`AvisoDaAcao`,
// `FolhaDoRastreio`, `RodapeDaAcao`, `BotaoDaAcao`, `EditarRastreio`, `LembreteDoEnvio`) e o layout que
// passou a montar o aviso (`app/layout/MobileLayout.tsx`); os outros tocados pela `75` já estavam. E a
// régua passou a ver a variante de ESTADO (`data-[state=open]:animate-in`, a do `SheetContent`): o
// movimento sob `data-[state=…]:` só é desligado pelo par NO MESMO SELETOR
// (`motion-reduce:data-[state=open]:animate-none`) — o par puro perde em especificidade para o seletor
// de atributo (R2 do design). Como o movimento da folha mora em `packages/ui` (fora do escopo), a régua
// também EXIGE os dois pares por extenso em todo arquivo do app que monta `SheetContent`.
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

const ARQUIVOS = [
  'entities/order/ui/LinhaDoPedido.tsx',
  'entities/order/ui/SituacaoDoPedido.tsx',
  'features/order-search/ui/BuscaDePedidos.tsx',
  'features/order-slice/ui/ChipsDeRecorte.tsx',
  'features/order-slice/ui/FaixaDoBloco.tsx',
  'pages/PedidoPage.tsx',
  'pages/PedidosPage.tsx',
  'shared/ui/Selo.tsx',
  'shared/ui/leitura.tsx',
  'widgets/order-detail/ui/BlocoCliente.tsx',
  'widgets/order-detail/ui/BlocoDoDetalhe.tsx',
  'widgets/order-detail/ui/BlocoEntrega.tsx',
  'widgets/order-detail/ui/BlocoItens.tsx',
  'widgets/order-detail/ui/BlocoMaterial.tsx',
  'widgets/order-detail/ui/BlocoValores.tsx',
  'widgets/order-detail/ui/CabecalhoDoPedido.tsx',
  'widgets/order-detail/ui/Historico.tsx',
  'widgets/order-detail/ui/ProximoPasso.tsx',
  'widgets/order-list/ui/ListaDePedidos.tsx',
  'widgets/recent-orders/ui/RecentOrders.tsx',
  'widgets/tab-bar/ui/TabBar.tsx',
  // Feature `75` (T27).
  'app/layout/MobileLayout.tsx',
  'features/order-actions/ui/AvisoDaAcao.tsx',
  'features/order-actions/ui/BotaoDaAcao.tsx',
  'features/order-actions/ui/EditarRastreio.tsx',
  'features/order-actions/ui/FolhaDoRastreio.tsx',
  'features/order-actions/ui/LembreteDoEnvio.tsx',
  'features/order-actions/ui/RodapeDaAcao.tsx',
] as const

/** Comentário sai antes da varredura; CRLF primeiro (`L-031`), linha e bloco na MESMA passada (`BL-027`). */
const semComentarios = (texto: string): string => texto.replace(/\r\n?/g, '\n').replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')

/**
 * O token de movimento, com os variantes à frente, por token exato. Um variante é `nome:` ou
 * `nome-[…]:` (o de estado do Radix, `data-[state=open]:` — feature `75`).
 */
const CLASSE_QUE_MOVE = /(?<![-\w:\]])((?:[a-z][a-z0-9-]*(?:\[[^\]\s]*\])?:)*)(transition|animate)(?:-([a-z0-9]+(?:-[a-z0-9]+)*))?(?![-\w])/g
/** O variante de estado do movimento (`data-[state=open]:`), ou `''`. */
const estadoDe = (prefixo: string): string => /data-\[state=[a-z]+\]:/.exec(prefixo)?.[0] ?? ''

/** `animate-spin` é indicador de progresso, não enfeite: congelá-lo apagaria o único sinal de espera. */
const DISPENSADAS = ['transition-none', 'animate-none', 'animate-spin'] as const
/** O par que DESLIGA movimento — `motion-reduce:opacity-100` não desliga nada. */
const PARES = ['transition-none', 'animate-none'] as const

interface Achado {
  classe: string
  numero: number
  ehOPar: boolean
  /** O variante de estado (`data-[state=open]:`), ou `''`. */
  estado: string
}

const movimentoDe = (codigo: string): Achado[] =>
  codigo.split('\n').flatMap((linha, i) =>
    [...linha.matchAll(CLASSE_QUE_MOVE)].map((m) => {
      const classe = m[3] ? `${m[2]}-${m[3]}` : m[2]
      return {
        classe,
        numero: i + 1,
        ehOPar: (m[1] ?? '').includes('motion-reduce:') && PARES.includes(classe as (typeof PARES)[number]),
        estado: estadoDe(m[1] ?? ''),
      }
    }),
  )

const movimentoSemPar = (fonte: string): string[] => {
  const achados = movimentoDe(semComentarios(fonte))
  // Um par cobre a linha dele; o movimento sob `data-[state=X]:` só é coberto pelo par do MESMO estado.
  const pares = achados.filter((a) => a.ehOPar)
  const coberto = (a: Achado) => pares.some((p) => p.numero === a.numero && (a.estado === '' || p.estado === a.estado))
  return achados
    .filter((a) => !a.ehOPar)
    .filter((a) => !DISPENSADAS.includes(a.classe as (typeof DISPENSADAS)[number]))
    .filter((a) => !coberto(a))
    .map((a) => `${a.estado}${a.classe} (linha ${a.numero})`)
}

const FONTES = ARQUIVOS.map((caminho) => ({ caminho, fonte: readFileSync(resolve(SRC, caminho), 'utf8') }))

describe('o movimento da aba Pedidos respeita `prefers-reduced-motion` (MAP-45)', () => {
  it('ÂNCORA: os 28 arquivos foram lidos, e a varredura achou o movimento do esqueleto e da troca de recorte com os pares', () => {
    expect(FONTES).toHaveLength(28)
    expect(FONTES.every((f) => f.fonte.length > 0)).toBe(true)
    const tokens = FONTES.flatMap((f) => movimentoDe(semComentarios(f.fonte)))
    // Medido com ESTA régua no fecho da T28: 4 tokens, 2 deles o próprio par — o `animate-pulse` do
    // `Traco` (o esqueleto) e o `transition-colors` dos chips (a troca de recorte). Na T27 da `75`:
    // 6 tokens, 4 pares — os dois pares de estado da folha (o movimento dela mora em `packages/ui`).
    // No B02 (T31): 8 tokens, 6 pares — os dois pares de estado do FUNDO da folha (`overlayClassName`).
    expect(tokens.length).toBeGreaterThanOrEqual(8)
    expect(tokens.filter((t) => t.ehOPar).length).toBeGreaterThanOrEqual(6)
    const de = (rel: string) => movimentoDe(semComentarios(FONTES.find((f) => f.caminho === rel)!.fonte)).map((t) => t.classe)
    expect(de('shared/ui/leitura.tsx')).toEqual(expect.arrayContaining(['animate-pulse', 'animate-none']))
    expect(de('features/order-slice/ui/ChipsDeRecorte.tsx')).toEqual(expect.arrayContaining(['transition-colors', 'transition-none']))
    // Feature `75`: os dois pares de estado da folha são VISTOS pela régua (a âncora da variante nova) —
    // e, desde o B02, os dois do fundo também: dois de cada estado.
    const daFolha = movimentoDe(semComentarios(FONTES.find((f) => f.caminho === 'features/order-actions/ui/FolhaDoRastreio.tsx')!.fonte))
    expect(daFolha.filter((t) => t.ehOPar).map((t) => t.estado).sort()).toEqual([
      'data-[state=closed]:',
      'data-[state=closed]:',
      'data-[state=open]:',
      'data-[state=open]:',
    ])
  })

  it('todo arquivo que monta `SheetContent` passa os DOIS pares de estado, por token exato (R2, `MAA-34`)', () => {
    const comFolha = FONTES.filter((f) => /<SheetContent\b/.test(semComentarios(f.fonte)))
    expect(comFolha.map((f) => f.caminho)).toEqual(['features/order-actions/ui/FolhaDoRastreio.tsx'])
    for (const f of comFolha) {
      const tokens = semComentarios(f.fonte).split(/[\s"'`{}]+/)
      expect(tokens).toContain('motion-reduce:data-[state=open]:animate-none')
      expect(tokens).toContain('motion-reduce:data-[state=closed]:animate-none')
    }
  })

  it('nenhum arquivo em escopo declara movimento sem o par `motion-reduce:` na mesma linha', () => {
    const culpados = FONTES.flatMap((f) => movimentoSemPar(f.fonte).map((c) => `${f.caminho}: ${c}`))
    expect(culpados).toEqual([])
  })

  it('SENSOR: a classe sem par REPROVA, e a mesma COM par passa', () => {
    expect(movimentoSemPar('className="animate-pulse"')).toEqual(['animate-pulse (linha 1)'])
    expect(movimentoSemPar('className="animate-pulse motion-reduce:animate-none"')).toEqual([])
    expect(movimentoSemPar('className="transition-colors"')).toEqual(['transition-colors (linha 1)'])
  })

  it('SENSOR: o par a três linhas de distância NÃO cobre, e variante na frente não desculpa', () => {
    expect(movimentoSemPar('<a className="transition-colors" />\n\n\n<b className="motion-reduce:transition-none" />')).toEqual([
      'transition-colors (linha 1)',
    ])
    expect(movimentoSemPar('className="hover:transition-colors"')).toEqual(['transition-colors (linha 1)'])
  })

  it('SENSOR: `motion-reduce:` que não desliga movimento NÃO é par', () => {
    expect(movimentoSemPar('className="transition-opacity motion-reduce:opacity-100"')).toEqual(['transition-opacity (linha 1)'])
  })

  it('SENSOR: token exato — `animate-spin` é dispensado, `animate-spinner` não', () => {
    expect(movimentoSemPar('className="animate-spin"')).toEqual([])
    expect(movimentoSemPar('className="animate-spinner"')).toEqual(['animate-spinner (linha 1)'])
  })

  it('SENSOR (`75`): `motion-reduce:animate-none` PURO ao lado de `data-[state=open]:animate-in` REPROVA; o par do mesmo estado passa', () => {
    expect(movimentoSemPar('className="data-[state=open]:animate-in motion-reduce:animate-none"')).toEqual([
      'data-[state=open]:animate-in (linha 1)',
    ])
    expect(movimentoSemPar('className="data-[state=open]:animate-in motion-reduce:data-[state=open]:animate-none"')).toEqual([])
    // O par de OUTRO estado não cobre.
    expect(movimentoSemPar('className="data-[state=open]:animate-in motion-reduce:data-[state=closed]:animate-none"')).toEqual([
      'data-[state=open]:animate-in (linha 1)',
    ])
    // Token exato: `animate-none` com o par de estado não vira movimento.
    expect(movimentoDe('motion-reduce:data-[state=open]:animate-none')).toEqual([
      { classe: 'animate-none', numero: 1, ehOPar: true, estado: 'data-[state=open]:' },
    ])
  })

  it('SENSOR: a prosa não é acusada — com CRLF, com LF e com o glob de dois asteriscos', () => {
    expect(movimentoSemPar('// transition-colors precisa de par\r\nconst x = 1')).toEqual([])
    expect(movimentoSemPar('/* animate-pulse */\nconst x = 1')).toEqual([])
    expect(movimentoSemPar('// varre apps/**\nclassName="transition-colors"\n/* fim */')).toEqual(['transition-colors (linha 2)'])
  })
})
