import {
  COLUNAS_CLIENTES,
  COLUNAS_VENDAS,
  CsvError,
  type ClienteVenda,
  type ItemVenda,
  type LinhaVenda,
  type PedidoVenda,
} from './types.ts'

// -------------------------------------------------------------------------------------------
// Bytes → texto
// -------------------------------------------------------------------------------------------

/**
 * O arquivo é **Latin-1**, e não declara isso em lugar nenhum.
 *
 * Medido nos bytes do arquivo real (2026-08-30): ele abre em `22 4e fa` — `"Núm` —, e `Não está`
 * é `4e e3 6f 20 65 73 74 e1`. Em UTF-8 nenhum desses bytes é válido sozinho, então a leitura
 * ingênua troca cada um por `U+FFFD`: a coluna vira `N�mero do Pedido`, a busca por
 * `Número do Pedido` falha, **todo** pedido lê número vazio, e os 70 viram um grupo só. Depois disso
 * nenhuma entrada do de-para casa e a mensagem de erro culpa o vocabulário em vez do encoding.
 *
 * **Não há corte de BOM aqui, e a ausência é deliberada.** A primeira versão tinha um
 * `charCodeAt(0) === 0xFEFF`, e ele é código morto: decodificando Latin-1, cada byte vira um
 * caractere de `U+0000`..`U+00FF`, então `U+FEFF` é inalcançável por construção. Um arquivo com BOM
 * de UTF-8 chegaria como `ï»¿` — mas nesse caso o arquivo inteiro seria UTF-8, e cortar três
 * caracteres não salvaria nada. Quem protege contra isso é a conferência de cabeçalho de `indexar`,
 * que falha nomeando a coluna divergente — e o nome divergente aponta direto para o encoding.
 */
export const decodificar = (bytes: Buffer): string => bytes.toString('latin1')

// -------------------------------------------------------------------------------------------
// Texto → matriz
// -------------------------------------------------------------------------------------------

/**
 * Parser de CSV com aspas, no molde do RFC 4180: `""` dentro de campo entre aspas é uma aspa
 * literal, e delimitador ou quebra de linha entre aspas são conteúdo.
 *
 * Escrito à mão em vez de trazer dependência porque o importador não tem nenhuma hoje além do
 * client do Supabase, e o formato aqui é conhecido e fechado.
 */
export const parseCsv = (texto: string, delimitador = ';'): string[][] => {
  const linhas: string[][] = []
  let linha: string[] = []
  let campo = ''
  let entreAspas = false

  for (let i = 0; i < texto.length; i += 1) {
    const c = texto[i]

    if (entreAspas) {
      if (c !== '"') { campo += c; continue }
      if (texto[i + 1] === '"') { campo += '"'; i += 1; continue }
      entreAspas = false
      continue
    }

    if (c === '"') { entreAspas = true; continue }
    if (c === delimitador) { linha.push(campo); campo = ''; continue }
    if (c === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; continue }
    if (c === '\r') continue
    campo += c
  }

  if (campo !== '' || linha.length > 0) { linha.push(campo); linhas.push(linha) }
  return linhas
}

/**
 * Confere o cabeçalho contra a lista esperada e devolve as linhas indexadas por nome de coluna.
 *
 * Recusar cedo é o ponto: uma coluna a mais desloca todas as seguintes, e `Status do Envio` lido de
 * `Cidade` faria **todo** pedido cair no ramo `pending` sem nada quebrar — nem tipo, nem teste de
 * unidade, nem o `balance`. O erro nomeia a diferença em vez de dizer "arquivo inválido".
 */
const indexar = (
  linhas: string[][],
  esperadas: readonly string[],
  rotulo: string,
): LinhaVenda[] => {
  if (linhas.length === 0) throw new CsvError(`${rotulo}: arquivo vazio`)

  const cabecalho = linhas[0].map(h => h.trim())
  if (cabecalho.length !== esperadas.length) {
    throw new CsvError(
      `${rotulo}: o arquivo tem ${cabecalho.length} colunas, esperadas ${esperadas.length}`,
    )
  }

  const divergente = esperadas.findIndex((nome, i) => cabecalho[i] !== nome)
  if (divergente !== -1) {
    throw new CsvError(
      `${rotulo}: coluna ${divergente} é "${cabecalho[divergente]}", esperada "${esperadas[divergente]}"`,
    )
  }

  return linhas
    .slice(1)
    .filter(l => l.length > 1 && l.some(c => c !== ''))
    .map(l => Object.fromEntries(cabecalho.map((nome, i) => [nome, l[i] ?? ''])))
}

// -------------------------------------------------------------------------------------------
// Campo → valor
// -------------------------------------------------------------------------------------------

/** `''` e `'-'` viram `null`. O `-` é o que o arquivo põe em `CPF / CNPJ` sem documento. */
export const texto = (valor: string | undefined): string | null => {
  const v = (valor ?? '').trim()
  return v === '' || v === '-' ? null : v
}

/** Decimal com ponto, como o arquivo escreve (`189.9`, `0.00`). `''` vira `null`. */
export const parseDecimal = (valor: string | undefined): number | null => {
  const v = (valor ?? '').trim()
  if (v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export const parseInteiro = (valor: string | undefined): number | null => {
  const n = parseDecimal(valor)
  return n === null ? null : Math.trunc(n)
}

/** Só os dígitos. Telefone vem `+5551993913065` ou `51981986902`; documento, com ou sem máscara. */
export const somenteDigitos = (valor: string | undefined): string | null => {
  const d = (valor ?? '').replace(/\D/g, '')
  return d === '' ? null : d
}

/**
 * Desfaz o escape de planilha do `Código de rastreio do envio`.
 *
 * O arquivo grava `="AD779152389BR"` para o Excel não comer os zeros à esquerda, e `=""` quando não
 * há rastreio. Gravar cru poria uma fórmula de planilha no campo que o painel mostra para a cliente,
 * e o `=""` viraria um rastreio de dois caracteres — que **não** é vazio para o filtro
 * `tracking_code.is.null` do tile "Enviado sem rastreio".
 */
export const desescaparPlanilha = (valor: string | undefined): string | null => {
  const v = (valor ?? '').trim()
  if (v === '') return null
  const m = v.match(/^="(.*)"$/s)
  const conteudo = (m ? m[1] : v).trim()
  return conteudo === '' ? null : conteudo
}

/**
 * `dd/mm/yyyy hh:mm:ss` ou `dd/mm/yyyy` → ISO com offset **`-03:00`**.
 *
 * O offset é literal e isso é deliberado. O Brasil não tem horário de verão desde 2019, e o arquivo
 * cobre 2025–2026 — então `America/Sao_Paulo` é UTC−3 em **todas** as datas dele. Emitir sem offset
 * faria o Postgres ler como UTC e gravar todo pedido **três horas adiantado**: um pedido das 08:54
 * viraria 05:54 na tela, sem nada quebrar.
 */
export const parseBrDate = (valor: string | undefined): string | null => {
  const v = (valor ?? '').trim()
  if (v === '') return null

  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/)
  if (!m) return null

  const [, dia, mes, ano, hh = '00', mm = '00', ss = '00'] = m
  return `${ano}-${mes}-${dia}T${hh}:${mm}:${ss}-03:00`
}

// -------------------------------------------------------------------------------------------
// Linhas → pedidos
// -------------------------------------------------------------------------------------------

const item = (linha: LinhaVenda): ItemVenda | null => {
  const nome = (linha['Nome do Produto'] ?? '').trim()
  if (nome === '') return null
  return {
    nome,
    valor: parseDecimal(linha['Valor do Produto']) ?? 0,
    quantidade: parseInteiro(linha['Quantidade Comprada']) ?? 1,
    sku: texto(linha['SKU']),
    produtoFisico: (linha['Produto Fisico'] ?? '').trim() === 'Sim',
  }
}

const cabeca = (linha: LinhaVenda, itens: ItemVenda[]): PedidoVenda => ({
  numero: parseInteiro(linha['Número do Pedido']) ?? 0,
  nuvemshopId: parseInteiro(linha['Identificador do pedido']) ?? 0,

  email: (linha['E-mail'] ?? '').trim(),
  data: parseBrDate(linha['Data']) ?? '',

  statusPedido: (linha['Status do Pedido'] ?? '').trim(),
  statusPagamento: (linha['Status do Pagamento'] ?? '').trim(),
  statusEnvio: (linha['Status do Envio'] ?? '').trim(),

  moeda: (linha['Moeda'] ?? '').trim(),
  subtotal: parseDecimal(linha['Subtotal']) ?? 0,
  desconto: parseDecimal(linha['Desconto']) ?? 0,
  frete: parseDecimal(linha['Valor do Frete']) ?? 0,
  total: parseDecimal(linha['Total']) ?? 0,

  nomeComprador: (linha['Nome do comprador'] ?? '').trim(),
  documento: somenteDigitos(texto(linha['CPF / CNPJ']) ?? ''),
  telefone: somenteDigitos(linha['Telefone']),

  endereco: texto(linha['Endereço']),
  numeroEndereco: texto(linha['Número']),
  complemento: texto(linha['Complemento']),
  bairro: texto(linha['Bairro']),
  cidade: texto(linha['Cidade']),
  cep: texto(linha['Código postal']),
  estado: texto(linha['Estado']),
  pais: texto(linha['País']),

  formaEntrega: texto(linha['Forma de Entrega']),
  formaPagamento: texto(linha['Forma de Pagamento']),
  meioPagamento: texto(linha['Meio de pagamento']),
  cupom: texto(linha['Cupom de Desconto']),

  anotacoesComprador: texto(linha['Anotações do Comprador']),
  anotacoesVendedor: texto(linha['Anotações do Vendedor']),

  dataPagamento: parseBrDate(linha['Data de pagamento']),
  dataEnvio: parseBrDate(linha['Data de envío']),
  dataCancelamento: parseBrDate(linha['Data e hora do cancelamento']),
  motivoCancelamento: texto(linha['Motivo do cancelamento']),
  vencimentoPagamento: parseBrDate(linha['Vencimento do pagamento']),

  rastreio: desescaparPlanilha(linha['Código de rastreio do envio']),
  canal: texto(linha['Canal']),
  parcelas: parseInteiro(linha['Parcelas']),

  itens,
})

/**
 * Agrupa as linhas em pedidos. **Esta é a regra que o arquivo não conta.**
 *
 * A linha com `Data` preenchida ABRE um pedido e carrega tudo; as seguintes com o mesmo
 * `Número do Pedido` só repetem número e e-mail, e trazem um item. Medido no arquivo real: **243
 * linhas, 70 pedidos, 173 continuações**. Ler linha a linha produz 243 pedidos, cada um com o
 * subtotal do pedido inteiro — e o `balance` fecharia, porque 243 lidos = 243 gravados.
 *
 * Continuação sem cabeça **aborta**: significa que o arquivo foi cortado ou reordenado, e seguir
 * gravaria um item órfão de pedido nenhum.
 */
export const agruparPedidos = (linhas: LinhaVenda[]): PedidoVenda[] => {
  const pedidos: PedidoVenda[] = []
  const porNumero = new Map<string, { cabeca: LinhaVenda; itens: ItemVenda[] }>()
  const ordem: string[] = []

  for (const linha of linhas) {
    const numero = (linha['Número do Pedido'] ?? '').trim()
    if (numero === '') throw new CsvError('linha sem "Número do Pedido"')

    const abre = (linha['Data'] ?? '').trim() !== ''

    if (abre) {
      if (porNumero.has(numero)) {
        throw new CsvError(`pedido ${numero} aparece com duas linhas-cabeça`)
      }
      porNumero.set(numero, { cabeca: linha, itens: [] })
      ordem.push(numero)
    }

    const grupo = porNumero.get(numero)
    if (!grupo) {
      throw new CsvError(`pedido ${numero}: linha de item sem linha-cabeça antes dela`)
    }

    const it = item(linha)
    if (it) grupo.itens.push(it)
  }

  for (const numero of ordem) {
    const grupo = porNumero.get(numero)
    if (grupo) pedidos.push(cabeca(grupo.cabeca, grupo.itens))
  }

  return pedidos
}

// -------------------------------------------------------------------------------------------
// Entradas públicas
// -------------------------------------------------------------------------------------------

export const lerVendas = (bytes: Buffer): PedidoVenda[] =>
  agruparPedidos(indexar(parseCsv(decodificar(bytes)), COLUNAS_VENDAS, 'vendas'))

export const lerClientes = (bytes: Buffer): ClienteVenda[] =>
  indexar(parseCsv(decodificar(bytes)), COLUNAS_CLIENTES, 'clientes').map(l => ({
    nome: (l['Nome completo'] ?? '').trim(),
    documento: somenteDigitos(texto(l['CPF/CNPJ']) ?? ''),
    email: (l['E-mail'] ?? '').trim(),
    telefone: somenteDigitos(l['Telefone de Contato']),
    compras: parseInteiro(l['Número de Compras']) ?? 0,
  }))
