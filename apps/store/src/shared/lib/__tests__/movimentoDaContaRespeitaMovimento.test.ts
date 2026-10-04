import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Feature 59 — `ACB-03`: toda animação das telas novas da conta e do detalhe do pedido respeita
 * `prefers-reduced-motion`.
 *
 * Por que um guarda que lê o fonte, e não um teste de componente: jsdom não aplica CSS, então o par
 * `motion-reduce:` é invisível para qualquer `render`. A régua confere a CLASSE, na mesma linha do
 * movimento — o par a três linhas de distância não cobre nada, porque ele pode estar em outro
 * elemento.
 *
 * **O escopo é LITERAL e estreito de propósito**, no molde do guarda do painel
 * (`apps/backoffice/src/shared/lib/__tests__/animacaoRespeitaMovimento.test.ts`): são as catorze telas
 * que esta feature criou ou reescreveu. A loja carrega outras classes de movimento de antes, e um
 * guarda sobre `apps/store/**` nasceria reprovando por elas — guarda que nasce vermelho é guarda que
 * alguém desliga. Arquivo de UI novo da conta entra nesta lista na mesma task em que nasce.
 */
const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

const ARQUIVOS = [
  'entities/order/ui/OrderItemsSummary.tsx',
  'entities/order/ui/OrderJourney.tsx',
  'entities/order/ui/OrderPaymentDelivery.tsx',
  'entities/order/ui/OrderSituationBadge.tsx',
  'entities/order/ui/OrderTrackingCard.tsx',
  'features/edit-address/ui/AddressCard.tsx',
  'features/edit-profile/ui/ProfileCard.tsx',
  'widgets/order-action/ui/OrderActionPanel.tsx',
  'widgets/order-attention/ui/AttentionList.tsx',
  'widgets/order-help/ui/OrderHelp.tsx',
  'widgets/order-list/ui/OrderList.tsx',
  'widgets/order-material/ui/OrderMaterialBlock.tsx',
  'pages/AccountPage.tsx',
  'pages/OrderConfirmationPage.tsx',
] as const

/**
 * Comentário sai antes da varredura — a prosa que EXPLICA a regra cita as classes. CRLF é
 * normalizado primeiro (`L-031`: em JavaScript `.` não casa `\r`), e linha e bloco saem na MESMA
 * passada, para um glob com dois asteriscos dentro de um comentário de linha não abrir um bloco
 * falso que apaga código (`BL-027`).
 */
const semComentarios = (texto: string): string =>
  texto.replace(/\r\n?/g, '\n').replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')

/** O token de movimento, com os variantes à frente (`hover:`, `motion-reduce:`…), por token exato. */
const CLASSE_QUE_MOVE =
  /(?<![-\w:])((?:[a-z][a-z0-9-]*:)*)(transition|animate)(?:-([a-z0-9]+(?:-[a-z0-9]+)*))?(?![-\w])/g

/** `animate-spin` é indicador de progresso, não enfeite: congelá-lo apagaria o único sinal de espera. */
const DISPENSADAS = ['transition-none', 'animate-none', 'animate-spin'] as const

interface Achado {
  classe: string
  linha: string
  numero: number
  ehOPar: boolean
}

/** A régua, escrita uma vez e chamada por asserções e sensores (`L-015`). */
const movimentoDe = (codigo: string): Achado[] => {
  const achados: Achado[] = []
  codigo.split('\n').forEach((linha, indice) => {
    for (const m of linha.matchAll(CLASSE_QUE_MOVE)) {
      const variantes = m[1] ?? ''
      achados.push({
        classe: m[3] ? `${m[2]}-${m[3]}` : m[2],
        linha,
        numero: indice + 1,
        ehOPar: variantes.includes('motion-reduce:'),
      })
    }
  })
  return achados
}

/**
 * O par só conta quando ELE MESMO é uma classe de movimento depois de `motion-reduce:` — o que de
 * fato desliga alguma coisa (`motion-reduce:transition-none`, `motion-reduce:animate-none`). A régua
 * do painel, de onde esta foi copiada, aceita qualquer `motion-reduce:` na linha, e com isso
 * `motion-reduce:opacity-100` passaria sem desligar movimento nenhum (achado da verificação
 * independente da `59`, rodada 2).
 */
const movimentoSemPar = (fonte: string): string[] => {
  const achados = movimentoDe(semComentarios(fonte))
  const linhasComPar = new Set(achados.filter(a => a.ehOPar).map(a => a.numero))
  return achados
    .filter(a => !a.ehOPar)
    .filter(a => !DISPENSADAS.includes(a.classe as (typeof DISPENSADAS)[number]))
    .filter(a => !linhasComPar.has(a.numero))
    .map(a => `${a.classe} (linha ${a.numero})`)
}

const FONTES = ARQUIVOS.map(caminho => ({
  caminho,
  fonte: readFileSync(resolve(RAIZ, caminho), 'utf8'),
}))

describe('o movimento da conta e do detalhe do pedido respeita `prefers-reduced-motion` (ACB-03)', () => {
  it('ÂNCORA: os catorze arquivos foram lidos, e a varredura ACHOU movimento e pares neles', () => {
    expect(FONTES).toHaveLength(14)
    expect(FONTES.every(f => f.fonte.length > 0)).toBe(true)

    const tokens = FONTES.flatMap(f => movimentoDe(semComentarios(f.fonte)))
    // Medido com ESTA régua no fecho da feature (rodada 2 da verificação): 52 tokens, 26 deles o
    // próprio par. A primeira escrita dizia 26/13 — metade do disco —, e com ela perder metade do
    // movimento passaria. Âncora folgada para de acusar.
    expect(tokens.length).toBeGreaterThanOrEqual(52)
    expect(tokens.filter(t => t.ehOPar).length).toBeGreaterThanOrEqual(26)
  })

  it('nenhum arquivo em escopo declara movimento sem o par `motion-reduce:` na mesma linha', () => {
    const culpados = FONTES.flatMap(f => movimentoSemPar(f.fonte).map(c => `${f.caminho}: ${c}`))
    expect(culpados).toEqual([])
  })

  it('SENSOR: a classe sem par REPROVA, e a mesma COM par passa', () => {
    expect(movimentoSemPar('className="transition-colors"')).toEqual(['transition-colors (linha 1)'])
    expect(movimentoSemPar('className="transition-colors motion-reduce:transition-none"')).toEqual([])
    expect(movimentoSemPar('className="animate-fade-in"')).toEqual(['animate-fade-in (linha 1)'])
  })

  it('SENSOR: variante na frente não desculpa, e o par em OUTRA linha não cobre', () => {
    expect(movimentoSemPar('className="hover:transition-colors"')).toEqual([
      'transition-colors (linha 1)',
    ])
    expect(movimentoSemPar('<a className="transition-colors" />\n<b className="motion-reduce:transition-none" />')).toEqual([
      'transition-colors (linha 1)',
    ])
  })

  it('SENSOR: `motion-reduce:` que não desliga movimento NÃO é par', () => {
    expect(movimentoSemPar('className="transition-opacity motion-reduce:opacity-100"')).toEqual([
      'transition-opacity (linha 1)',
    ])
    expect(movimentoSemPar('className="transition-opacity motion-reduce:transition-none"')).toEqual([])
  })

  it('SENSOR: token exato — `animate-spin` é dispensado, `animate-spinner` não; `transitional` não é movimento', () => {
    expect(movimentoSemPar('className="animate-spin"')).toEqual([])
    expect(movimentoSemPar('className="animate-spinner"')).toEqual(['animate-spinner (linha 1)'])
    expect(movimentoSemPar('const transitional = 1')).toEqual([])
  })

  it('SENSOR: a prosa que explica a regra não é acusada — com CRLF, com LF e com o glob de dois asteriscos', () => {
    expect(movimentoSemPar('// a classe transition-colors precisa de par\r\nconst x = 1')).toEqual([])
    expect(movimentoSemPar('/* animate-fade-in */\nconst x = 1')).toEqual([])
    // O glob num comentário de linha não pode abrir um bloco que engula o código abaixo.
    expect(
      movimentoSemPar('// varre apps/**\nclassName="transition-colors"\n/* fim */'),
    ).toEqual(['transition-colors (linha 2)'])
  })
})
