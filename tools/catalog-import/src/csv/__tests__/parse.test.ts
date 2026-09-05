import fs from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  agruparPedidos,
  decodificar,
  desescaparPlanilha,
  lerClientes,
  lerVendas,
  parseBrDate,
  parseCsv,
  somenteDigitos,
  texto,
} from '../parse.ts'
import { COLUNAS_VENDAS, CsvError } from '../types.ts'

/**
 * O parser do CSV de vendas, contra a **fixture sintética** que reproduz a FORMA do arquivo real.
 *
 * Cada caso aqui existe por uma armadilha medida em `.specs/features/35-.../medicao.md`, e não por
 * completude teórica. As duas que mais custam são silenciosas: o encoding (que faz todo pedido
 * perder o número) e o agrupamento (que faz 243 linhas virarem 243 pedidos com o `balance` fechando).
 *
 * ÂNCORA DE CONTAGEM (`L-021`): a suíte começa provando que leu o que deveria ler. Sem isso, um
 * caminho de fixture errado varre zero registro e passa em VERDE.
 */

const bytesVendas = fs.readFileSync(new URL('../../__fixtures__/vendas.csv', import.meta.url))
const bytesClientes = fs.readFileSync(new URL('../../__fixtures__/clientes.csv', import.meta.url))

const PEDIDOS_NA_FIXTURE = 9
const ITENS_NA_FIXTURE = 10
const CLIENTES_NA_FIXTURE = 4

const pedidos = lerVendas(bytesVendas)
const porNumero = (n: number) => {
  const p = pedidos.find(x => x.numero === n)
  if (!p) throw new Error(`fixture sem pedido ${n}`)
  return p
}

describe('âncora de contagem da fixture', () => {
  it('leu os 9 pedidos e os 10 itens da fixture', () => {
    expect(pedidos).toHaveLength(PEDIDOS_NA_FIXTURE)
    expect(pedidos.reduce((a, p) => a + p.itens.length, 0)).toBe(ITENS_NA_FIXTURE)
  })

  it('leu as 4 linhas do arquivo de clientes', () => {
    expect(lerClientes(bytesClientes)).toHaveLength(CLIENTES_NA_FIXTURE)
  })
})

describe('encoding — o arquivo é Latin-1 e não declara', () => {
  it('decodifica os acentos íntegros', () => {
    const texto = decodificar(bytesVendas)
    expect(texto).toContain('Não está embalado')
    expect(texto).toContain('Número do Pedido')
    expect(texto).toContain('Data de envío')
  })

  it('SENSOR: ler como UTF-8 quebra o cabeçalho e o vocabulário', () => {
    // A régua tem de distinguir as duas leituras. Em UTF-8 os bytes `fa`, `e3` e `e1` são
    // inválidos sozinhos e viram U+FFFD — a coluna deixa de se chamar `Número do Pedido`, e é
    // por isso que a leitura ingênua faz os 9 pedidos virarem um grupo só.
    const errado = bytesVendas.toString('utf8')
    expect(errado).not.toContain('Número do Pedido')
    expect(errado).not.toContain('Não está embalado')
    expect(errado).toContain('�')
  })

  it('um arquivo em UTF-8 falha ALTO na conferência de cabeçalho, não em silêncio', () => {
    // É o que substitui o "corte de BOM": decodificando Latin-1, `U+FEFF` é inalcançável por
    // construção, então aquele `if` seria código morto. Quem protege é o cabeçalho — e a mensagem
    // aponta direto para a causa, em vez de deixar o import ler a coluna errada.
    const utf8 = Buffer.from(decodificar(bytesVendas), 'utf8')
    expect(() => lerVendas(utf8)).toThrow(CsvError)
    expect(() => lerVendas(utf8)).toThrow(/esperada "Número do Pedido"/)
  })
})

describe('parseCsv', () => {
  it('respeita aspas: delimitador e aspas escapadas viram conteúdo', () => {
    expect(parseCsv('a;"b;c";"d""e"')).toEqual([['a', 'b;c', 'd"e']])
  })

  it('aceita cabeçalho com e sem aspas', () => {
    expect(parseCsv('"Nome";Valor\nx;1')).toEqual([['Nome', 'Valor'], ['x', '1']])
  })

  it('ignora o \\r do fim de linha do Windows', () => {
    expect(parseCsv('a;b\r\nc;d')).toEqual([['a', 'b'], ['c', 'd']])
  })

  it('a fixture carrega um campo com ponto-e-vírgula E aspas dentro', () => {
    expect(porNumero(135).anotacoesComprador).toBe('Ela pediu: "com brilho"; sem corrente')
  })
})

describe('cabeçalho — recusa arquivo diferente em vez de ler a coluna errada', () => {
  const cabecalho = COLUNAS_VENDAS.join(';')

  it('falha nomeando a contagem quando faltam colunas', () => {
    const bytes = Buffer.from('a;b;c\n1;2;3\n', 'latin1')
    expect(() => lerVendas(bytes)).toThrow(CsvError)
    expect(() => lerVendas(bytes)).toThrow(/3 colunas, esperadas 60/)
  })

  it('falha nomeando a coluna divergente quando uma muda de nome', () => {
    const trocado = cabecalho.replace('Status do Envio', 'Status de Envio')
    const bytes = Buffer.from(`${trocado}\n${COLUNAS_VENDAS.map(() => '').join(';')}x\n`, 'latin1')
    expect(() => lerVendas(bytes)).toThrow(/é "Status de Envio", esperada "Status do Envio"/)
  })
})

describe('agrupamento — o pedido são N linhas', () => {
  it('a linha com Data abre o pedido; as seguintes são itens dele', () => {
    const p = porNumero(135)
    expect(p.itens).toHaveLength(2)
    expect(p.itens[0].nome).toBe('Joia Afetiva de Teste (Folheado a ouro (Prata 925))')
    expect(p.itens[1].nome).toBe('Corrente de Teste em Aço Inoxidável')
  })

  it('o item da linha-cabeça também entra — não é só cabeçalho', () => {
    expect(porNumero(138).itens).toHaveLength(1)
    expect(porNumero(138).itens[0].valor).toBe(380)
  })

  it('preserva a ordem do arquivo', () => {
    expect(pedidos.map(p => p.numero)).toEqual([133, 134, 135, 136, 137, 138, 139, 140, 170])
  })

  it('aborta quando um item aparece sem linha-cabeça antes dele', () => {
    const linha = Object.fromEntries(COLUNAS_VENDAS.map(c => [c, '']))
    expect(() => agruparPedidos([{ ...linha, 'Número do Pedido': '999', 'Nome do Produto': 'x' }]))
      .toThrow(/999: linha de item sem linha-cabeça/)
  })

  it('aborta quando o mesmo pedido traz duas linhas-cabeça', () => {
    const linha = Object.fromEntries(COLUNAS_VENDAS.map(c => [c, '']))
    const cabeca = { ...linha, 'Número do Pedido': '7', Data: '01/01/2026' }
    expect(() => agruparPedidos([cabeca, cabeca])).toThrow(/7 aparece com duas linhas-cabeça/)
  })

  it('aborta quando a linha não tem número de pedido', () => {
    const linha = Object.fromEntries(COLUNAS_VENDAS.map(c => [c, '']))
    expect(() => agruparPedidos([{ ...linha, Data: '01/01/2026' }])).toThrow(/sem "Número do Pedido"/)
  })
})

describe('campos', () => {
  it('a chave de idempotência é `Identificador do pedido`, não o número humano', () => {
    expect(porNumero(135).numero).toBe(135)
    expect(porNumero(135).nuvemshopId).toBe(2018794574)
  })

  it('`-` em CPF / CNPJ vira null, não a string literal', () => {
    expect(porNumero(134).documento).toBeNull()
    expect(texto('-')).toBeNull()
  })

  it('documento e telefone ficam só com dígitos', () => {
    expect(porNumero(135).documento).toBe('22222222222')
    expect(porNumero(135).telefone).toBe('5551900000135')
    expect(somenteDigitos('')).toBeNull()
  })

  it('telefone ausente vira null', () => {
    expect(porNumero(134).telefone).toBeNull()
  })

  it('o e-mail é preservado como veio, inclusive em caixa alta', () => {
    // A normalização por `lower()` é do banco (a view e o trigger). O parser não decide isso.
    expect(porNumero(135).email).toBe('MAIUSCULA@EXEMPLO.INVALID')
  })

  it('dinheiro é lido como número, com o ponto do arquivo', () => {
    const p = porNumero(135)
    expect(p.subtotal).toBe(359.8)
    expect(p.desconto).toBe(31.98)
    expect(p.frete).toBe(0)
    expect(p.total).toBe(327.82)
  })

  it('a soma dos itens fecha com o subtotal na fixture', () => {
    for (const p of pedidos) {
      const soma = p.itens.reduce((a, i) => a + i.valor * i.quantidade, 0)
      expect(Math.abs(soma - p.subtotal)).toBeLessThan(0.011)
    }
  })
})

describe('desescaparPlanilha — o rastreio vem escapado para Excel', () => {
  it('tira o `="…"` e devolve o código', () => {
    expect(desescaparPlanilha('="AD779152389BR"')).toBe('AD779152389BR')
    expect(porNumero(138).rastreio).toBe('AD000000000BR')
  })

  it('`=""` é AUSÊNCIA de rastreio, não uma string de dois caracteres', () => {
    // O tile "Enviado sem rastreio" filtra `tracking_code.is.null`. Gravar `=""` faria o pedido
    // sumir daquele tile parecendo que a cliente foi avisada.
    expect(desescaparPlanilha('=""')).toBeNull()
    expect(porNumero(139).rastreio).toBe('AN000000000BR')
    expect(porNumero(135).rastreio).toBeNull()
  })

  it('aceita o valor cru, sem escape', () => {
    expect(desescaparPlanilha('AD1BR')).toBe('AD1BR')
    expect(desescaparPlanilha('')).toBeNull()
  })
})

describe('parseBrDate — offset -03:00 explícito', () => {
  it('converte com hora', () => {
    expect(parseBrDate('20/08/2026 08:54:42')).toBe('2026-08-20T08:54:42-03:00')
  })

  it('converte sem hora, à meia-noite', () => {
    expect(parseBrDate('20/08/2026')).toBe('2026-08-20T00:00:00-03:00')
  })

  it('o offset preserva a hora do relógio da loja', () => {
    // Sem o `-03:00` o Postgres leria como UTC e gravaria TRÊS HORAS adiantado: um pedido das
    // 08:54 apareceria como 05:54 na tela, sem nada quebrar.
    expect(new Date(parseBrDate('20/08/2026 08:54:42') as string).toISOString())
      .toBe('2026-08-20T11:54:42.000Z')
  })

  it('vazio e formato desconhecido viram null', () => {
    expect(parseBrDate('')).toBeNull()
    expect(parseBrDate('2026-08-20')).toBeNull()
  })

  it('as datas do pedido saem nos campos certos', () => {
    const p = porNumero(138)
    expect(p.data).toBe('2026-08-08T22:16:18-03:00')
    expect(p.dataPagamento).toBe('2026-08-08T00:00:00-03:00')
    expect(p.dataEnvio).toBe('2026-08-10T00:00:00-03:00')
    expect(p.dataCancelamento).toBeNull()
  })

  it('`Data de envío` é lida apesar do í espanhol no nome da coluna', () => {
    expect(porNumero(139).dataEnvio).toBe('2026-05-02T00:00:00-03:00')
  })
})

describe('os três eixos de status chegam crus e em português', () => {
  it('o pedido pago a separar', () => {
    const p = porNumero(135)
    expect(p.statusPedido).toBe('Aberto')
    expect(p.statusPagamento).toBe('Confirmado')
    expect(p.statusEnvio).toBe('Não está embalado')
  })

  it('o PIX vencido carrega `Vencimento` e não carrega `Data de pagamento`', () => {
    const p = porNumero(136)
    expect(p.statusPagamento).toBe('Recusado')
    expect(p.vencimentoPagamento).not.toBeNull()
    expect(p.dataPagamento).toBeNull()
  })

  it('o cartão negado carrega `Parcelas` e não carrega `Vencimento`', () => {
    const p = porNumero(137)
    expect(p.statusPagamento).toBe('Recusado')
    expect(p.parcelas).toBe(3)
    expect(p.vencimentoPagamento).toBeNull()
  })

  it('o cancelado traz motivo e data de cancelamento', () => {
    const p = porNumero(140)
    expect(p.statusPedido).toBe('Cancelado')
    expect(p.statusEnvio).toBe('Pronto para enviar')
    expect(p.motivoCancelamento).toBe('Venda de teste')
    expect(p.dataCancelamento).toBe('2026-04-14T20:30:36-03:00')
  })
})

describe('lerClientes', () => {
  it('traz nome, e-mail, documento e a contagem de compras', () => {
    const clientes = lerClientes(bytesClientes)
    const semPedido = clientes.find(c => c.email === 'sem.pedido@exemplo.invalid')
    expect(semPedido?.compras).toBe(0)
    expect(semPedido?.documento).toBeNull()
    expect(clientes.find(c => c.email === 'pix.vencido@exemplo.invalid')?.documento)
      .toBe('33333333333')
  })
})
