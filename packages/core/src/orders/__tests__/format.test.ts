// `PIX-P4-03` e `PIX-P4-04` — o número do pedido tem um dono, e o legado continua legível.
//
// O que se erra aqui não quebra nada: um `#` a mais, um `#` a menos, ou um `#` sozinho numa tela
// sem pedido. As três formas renderizam, passam no `tsc` e só são vistas pela cliente.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { formatOrderNumber, stripOrderNumberPrefix } from '../format'

describe('formatOrderNumber — o dígito da sequência', () => {
  it('prefixa o número de quatro dígitos', () => {
    expect(formatOrderNumber('0244')).toBe('#0244')
  })

  it('preserva os zeros à esquerda — eles são o valor, não enfeite', () => {
    // A coluna é `text` justamente para isto. Um número tratado como inteiro mostraria `#170`
    // onde o banco tem `0170`, e a busca por `0170` deixaria de achar o pedido.
    expect(formatOrderNumber('0170')).toBe('#0170')
    expect(formatOrderNumber('0171')).toBe('#0171')
  })

  it('não trunca nem completa — cinco dígitos saem com cinco', () => {
    // O `lpad(…, 4, '0')` é do banco e é um PISO. Passado o pedido 9999 a sequência segue, e o
    // formatador não pode ter opinião sobre isso.
    expect(formatOrderNumber('10000')).toBe('#10000')
  })
})

describe('formatOrderNumber — o legado (PIX-P4-04)', () => {
  it('os 35 pedidos importados da Nuvemshop continuam legíveis', () => {
    expect(formatOrderNumber('NS-169')).toBe('#NS-169')
  })

  it('os dois pedidos anteriores à sequência continuam legíveis', () => {
    expect(formatOrderNumber('NP-MUBBLKLYGOMR')).toBe('#NP-MUBBLKLYGOMR')
  })

  it('não normaliza, não recorta prefixo e não completa zeros', () => {
    // A tentação é "arrumar" o legado aqui. Arrumá-lo faria a tela mostrar um número que não
    // existe no banco — e que a busca do painel não acha.
    expect(formatOrderNumber('NS-1')).toBe('#NS-1')
  })
})

describe('formatOrderNumber — não duplica o prefixo', () => {
  it('valor que já tem `#` sai com um `#` só', () => {
    // É o que torna a adoção segura enquanto alguma superfície ainda não migrou.
    expect(formatOrderNumber('#0244')).toBe('#0244')
  })

  it('legado que já tem `#` também', () => {
    expect(formatOrderNumber('#NS-169')).toBe('#NS-169')
  })

  it('mais de um `#` na frente colapsa em um', () => {
    // `PIX-P4-04` diz "sem ganhar um segundo". Uma régua de "já começa com `#`? devolve" deixaria
    // `##0244` passar inteiro.
    expect(formatOrderNumber('##0244')).toBe('#0244')
  })
})

describe('formatOrderNumber — ausência devolve ausência, nunca `#` pelado', () => {
  it('string vazia', () => {
    expect(formatOrderNumber('')).toBe('')
  })

  it('`null` e `undefined`', () => {
    expect(formatOrderNumber(null)).toBe('')
    expect(formatOrderNumber(undefined)).toBe('')
  })

  it('só espaço conta como ausente', () => {
    // Mesmo recorte de `surfaceArt`: valor chegado por SQL, por importação ou de um campo limpo
    // com a barra de espaço tem de contar como vazio. Sem isto a tela mostraria `#` e um branco.
    expect(formatOrderNumber('   ')).toBe('')
    expect(formatOrderNumber('\t\n')).toBe('')
  })

  it('só `#` também conta como ausente', () => {
    expect(formatOrderNumber('#')).toBe('')
    expect(formatOrderNumber('# ')).toBe('')
  })

  it('espaço em volta é aparado', () => {
    expect(formatOrderNumber('  0244  ')).toBe('#0244')
  })

  it('valor que não é string não derruba a tela', () => {
    // `strictNullChecks` é `false` neste repositório: o `tsc` não obriga ninguém a tratar o nulo,
    // e uma coluna lida de um `select` mal escrito chega como `undefined` sem aviso nenhum.
    expect(formatOrderNumber(42 as unknown as string)).toBe('')
  })
})

describe('stripOrderNumberPrefix — o outro lado da mesma regra (PIX-P4-05)', () => {
  it('tira o `#` que a Adri cola do WhatsApp', () => {
    expect(stripOrderNumberPrefix('#0244')).toBe('0244')
  })

  it('valor já sem prefixo passa inalterado — as três grafias caem no mesmo termo', () => {
    // É o requisito inteiro de `PIX-P4-05`: `244`, `0244` e `#0244` têm de achar o mesmo pedido.
    expect(stripOrderNumberPrefix('0244')).toBe('0244')
    expect(stripOrderNumberPrefix('244')).toBe('244')
  })

  it('legado também', () => {
    expect(stripOrderNumberPrefix('#NS-169')).toBe('NS-169')
    expect(stripOrderNumberPrefix('NS-169')).toBe('NS-169')
  })

  it('mais de um `#` e espaço depois dele', () => {
    expect(stripOrderNumberPrefix('##0244')).toBe('0244')
    expect(stripOrderNumberPrefix('# 0244')).toBe('0244')
  })

  it('ausência devolve string vazia, nunca `undefined`', () => {
    // A busca compara com `''` para decidir se há termo; um `undefined` aqui viraria a condição
    // `order_number.ilike.%undefined%`, que não acha nada e não parece defeito.
    expect(stripOrderNumberPrefix('')).toBe('')
    expect(stripOrderNumberPrefix('   ')).toBe('')
    expect(stripOrderNumberPrefix('#')).toBe('')
    expect(stripOrderNumberPrefix(null)).toBe('')
    expect(stripOrderNumberPrefix(undefined)).toBe('')
  })

  it('não toca no `#` que não está na frente', () => {
    // Nome de cliente com `#` no meio é improvável, mas recortar tudo seria uma régua que muda o
    // termo de busca das outras quatro colunas.
    expect(stripOrderNumberPrefix('Ana #2')).toBe('Ana #2')
  })

  it('é o MESMO recorte que o formatador usa — um dono, duas direções', () => {
    // Sem este par, as duas funções poderiam divergir e só a busca quebraria.
    for (const valor of ['#0244', '##0244', '# 0244', 'NS-169', '  #NS-169  ']) {
      expect(formatOrderNumber(valor)).toBe(`#${stripOrderNumberPrefix(valor)}`)
    }
  })
})

describe('o módulo é alcançável por Deno — a edge function o importa por caminho', () => {
  // `send-notification` importa `format.ts` por caminho relativo, e lá TODO especificador relativo
  // do grafo precisa de extensão explícita — `import type` incluso. A régua aqui é mais forte que
  // uma caminhada de grafo, e é a que o próprio cabeçalho do arquivo promete: ele não importa
  // **nada**. Zero import é a forma de não ter como errar a extensão.
  //
  // Molde: `core/checkout/__tests__/denoReach.test.ts`, inclusive o leitor injetável — é ele que
  // torna o sensor por mutação possível.
  const CAMINHO = join(dirname(fileURLToPath(import.meta.url)), '..', 'format.ts')
  const lerDoDisco = () => readFileSync(CAMINHO, 'utf8')

  /**
   * Remove comentário de linha **e** de bloco na MESMA varredura, com `[^\n\r]` fechando antes do
   * `\r`. Sem isto a régua casaria a prosa do cabeçalho, que fala de import sem escrever nenhum —
   * e o conserto viraria "edite o comentário" (`L-031`, `BL-027`).
   */
  const semComentario = (fonte: string): string =>
    fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

  const especificadores = (fonte: string): string[] => {
    const saida: string[] = []
    const re = /(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g
    let m: RegExpExecArray | null
    while ((m = re.exec(semComentario(fonte))) !== null) saida.push(m[1])
    return saida
  }

  it('a varredura leu o arquivo certo — âncora', () => {
    // Sem âncora, um caminho errado leria string vazia e a asserção de ausência abaixo passaria em
    // silêncio, que é a pior falha possível num teste que lê disco.
    expect(lerDoDisco()).toContain('export function formatOrderNumber')
  })

  it('não importa NADA — nem valor, nem tipo', () => {
    expect(especificadores(lerDoDisco())).toEqual([])
  })

  it('sensor — um `import type` sem extensão É acusado', () => {
    // A forma exata que derrubou o worker na `33`: o grafo de TIPOS também é resolvido pelo Deno, e
    // a falha acontece ANTES da primeira linha rodar. Vite e vitest resolvem as duas formas, então
    // nada mais neste repositório acusaria.
    const mutante = `import type { Order } from ${"'./types'"}\n${lerDoDisco()}`

    expect(especificadores(mutante)).toEqual(['./types'])
  })

  it('sensor do removedor de comentário — a MENÇÃO em prosa não é acusada, o USO é', () => {
    const emComentario = `// exemplo: from ${"'./types'"}\n${lerDoDisco()}`
    const emBloco = `/* nota: from ${"'./types'"} aqui\r\n   e na linha de baixo */\n${lerDoDisco()}`

    expect(especificadores(emComentario)).toEqual([])
    expect(especificadores(emBloco)).toEqual([])
  })

  it('sensor CRLF — comentário de linha não engole o import seguinte', () => {
    const crlf = `// nota em CRLF\r\nimport { x } from ${"'./x.ts'"}\r\n${lerDoDisco()}`

    expect(especificadores(crlf)).toEqual(['./x.ts'])
  })
})
