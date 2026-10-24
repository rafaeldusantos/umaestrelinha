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
] as const

/** Comentário sai antes da varredura; CRLF primeiro (`L-031`), linha e bloco na MESMA passada (`BL-027`). */
const semComentarios = (texto: string): string => texto.replace(/\r\n?/g, '\n').replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')

/** O token de movimento, com os variantes à frente, por token exato. */
const CLASSE_QUE_MOVE = /(?<![-\w:])((?:[a-z][a-z0-9-]*:)*)(transition|animate)(?:-([a-z0-9]+(?:-[a-z0-9]+)*))?(?![-\w])/g

/** `animate-spin` é indicador de progresso, não enfeite: congelá-lo apagaria o único sinal de espera. */
const DISPENSADAS = ['transition-none', 'animate-none', 'animate-spin'] as const
/** O par que DESLIGA movimento — `motion-reduce:opacity-100` não desliga nada. */
const PARES = ['transition-none', 'animate-none'] as const

interface Achado {
  classe: string
  numero: number
  ehOPar: boolean
}

const movimentoDe = (codigo: string): Achado[] =>
  codigo.split('\n').flatMap((linha, i) =>
    [...linha.matchAll(CLASSE_QUE_MOVE)].map((m) => {
      const classe = m[3] ? `${m[2]}-${m[3]}` : m[2]
      return {
        classe,
        numero: i + 1,
        ehOPar: (m[1] ?? '').includes('motion-reduce:') && PARES.includes(classe as (typeof PARES)[number]),
      }
    }),
  )

const movimentoSemPar = (fonte: string): string[] => {
  const achados = movimentoDe(semComentarios(fonte))
  const linhasComPar = new Set(achados.filter((a) => a.ehOPar).map((a) => a.numero))
  return achados
    .filter((a) => !a.ehOPar)
    .filter((a) => !DISPENSADAS.includes(a.classe as (typeof DISPENSADAS)[number]))
    .filter((a) => !linhasComPar.has(a.numero))
    .map((a) => `${a.classe} (linha ${a.numero})`)
}

const FONTES = ARQUIVOS.map((caminho) => ({ caminho, fonte: readFileSync(resolve(SRC, caminho), 'utf8') }))

describe('o movimento da aba Pedidos respeita `prefers-reduced-motion` (MAP-45)', () => {
  it('ÂNCORA: os 21 arquivos foram lidos, e a varredura achou o movimento do esqueleto e da troca de recorte com os pares', () => {
    expect(FONTES).toHaveLength(21)
    expect(FONTES.every((f) => f.fonte.length > 0)).toBe(true)
    const tokens = FONTES.flatMap((f) => movimentoDe(semComentarios(f.fonte)))
    // Medido com ESTA régua no fecho da T28: 4 tokens, 2 deles o próprio par — o `animate-pulse` do
    // `Traco` (o esqueleto) e o `transition-colors` dos chips (a troca de recorte).
    expect(tokens.length).toBeGreaterThanOrEqual(4)
    expect(tokens.filter((t) => t.ehOPar).length).toBeGreaterThanOrEqual(2)
    const de = (rel: string) => movimentoDe(semComentarios(FONTES.find((f) => f.caminho === rel)!.fonte)).map((t) => t.classe)
    expect(de('shared/ui/leitura.tsx')).toEqual(expect.arrayContaining(['animate-pulse', 'animate-none']))
    expect(de('features/order-slice/ui/ChipsDeRecorte.tsx')).toEqual(expect.arrayContaining(['transition-colors', 'transition-none']))
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

  it('SENSOR: a prosa não é acusada — com CRLF, com LF e com o glob de dois asteriscos', () => {
    expect(movimentoSemPar('// transition-colors precisa de par\r\nconst x = 1')).toEqual([])
    expect(movimentoSemPar('/* animate-pulse */\nconst x = 1')).toEqual([])
    expect(movimentoSemPar('// varre apps/**\nclassName="transition-colors"\n/* fim */')).toEqual(['transition-colors (linha 2)'])
  })
})
