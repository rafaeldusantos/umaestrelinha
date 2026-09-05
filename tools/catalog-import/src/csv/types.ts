/**
 * O que o CSV de vendas da Nuvemshop DEVOLVE — não o que a loja gostaria de receber.
 *
 * Mesma disciplina do `nuvemshop/types.ts`: tipo escrito à mão é **afirmação**, não verificação
 * (`AD-012`). Cada campo aqui foi confrontado com o arquivo real exportado em 2026-08-30 (70
 * pedidos, 243 linhas, 60 colunas), e a medição está em
 * `.specs/features/35-clientes-e-pedidos-nuvemshop/medicao.md`.
 *
 * Armadilhas medidas, todas visíveis nas assinaturas abaixo:
 *  - **O pedido são N linhas.** A primeira carrega tudo; as seguintes só repetem `Número do Pedido`
 *    e `E-mail` e trazem um item. Ler linha a linha dá 243 pedidos em vez de 70.
 *  - **O arquivo é Latin-1**, sem declarar. Lido como UTF-8, `Não está embalado` chega quebrado.
 *  - **`Código de rastreio do envio` vem escapado para planilha**: `="AD779152389BR"`, e vazio é `=""`.
 *  - **`Data de envío`** tem `í` (grafia espanhola). O nome da coluna é literal.
 *  - `CPF / CNPJ` vem como `-` quando não há documento — não vazio.
 */

/** Uma linha crua do arquivo, já indexada por nome de coluna. */
export type LinhaVenda = Readonly<Record<string, string>>

/** Um item do pedido. O arquivo **não** traz id de produto nem id de item — só nome e SKU. */
export interface ItemVenda {
  /** Vem com a variação entre parênteses, às vezes aninhados: `Nome (Folheado a ouro (Prata 925))`. */
  nome: string
  valor: number
  quantidade: number
  /** `null` quando vazio. **Não é chave**: 61 SKUs do catálogo apontam para mais de um produto. */
  sku: string | null
  produtoFisico: boolean
}

/**
 * Um pedido já agrupado: a linha-cabeça mais os itens de todas as linhas dele.
 *
 * As datas são ISO com offset `-03:00` (ver `parseBrDate`). Os campos que o arquivo deixa em branco
 * viram `null`, e não `''`, para que o mapeamento não precise distinguir os dois.
 */
export interface PedidoVenda {
  /** `Número do Pedido` — o número humano. Vira `NS-<numero>` em `orders.order_number`. */
  numero: number
  /** `Identificador do pedido` — o id da Nuvemshop. É a chave de idempotência. */
  nuvemshopId: number

  email: string
  data: string

  statusPedido: string
  statusPagamento: string
  statusEnvio: string

  moeda: string
  subtotal: number
  desconto: number
  frete: number
  total: number

  nomeComprador: string
  documento: string | null
  telefone: string | null

  endereco: string | null
  numeroEndereco: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  cep: string | null
  estado: string | null
  pais: string | null

  formaEntrega: string | null
  formaPagamento: string | null
  meioPagamento: string | null
  cupom: string | null

  anotacoesComprador: string | null
  anotacoesVendedor: string | null

  dataPagamento: string | null
  dataEnvio: string | null
  dataCancelamento: string | null
  motivoCancelamento: string | null
  /** Preenchido só em PIX. É o que separa `Recusado`-expirado de `Recusado`-cartão-negado. */
  vencimentoPagamento: string | null

  rastreio: string | null
  canal: string | null
  parcelas: number | null

  itens: ItemVenda[]
}

/** Uma linha do CSV de clientes. Usado só para conferência e relatório — nada é escrito (`AD-023`). */
export interface ClienteVenda {
  nome: string
  documento: string | null
  email: string
  telefone: string | null
  compras: number
}

/**
 * As 60 colunas do arquivo de vendas, na ordem exata da exportação.
 *
 * A lista existe para o parser **recusar** um arquivo diferente em vez de ler a coluna errada em
 * silêncio — que é o modo de falha caro: `Status do Envio` deslocado por uma coluna faria todo
 * pedido cair no ramo `pending` sem nada quebrar.
 */
export const COLUNAS_VENDAS: readonly string[] = [
  'Número do Pedido', 'E-mail', 'Data', 'Status do Pedido', 'Status do Pagamento',
  'Status do Envio', 'Moeda', 'Subtotal', 'Desconto', 'Valor do Frete', 'Total',
  'Nome do comprador', 'CPF / CNPJ', 'Telefone', 'Nome para a entrega',
  'Telefone para a entrega', 'Endereço', 'Número', 'Complemento', 'Bairro', 'Cidade',
  'Código postal', 'Estado', 'País', 'Forma de Entrega', 'Forma de Pagamento',
  'Cupom de Desconto', 'Anotações do Comprador', 'Anotações do Vendedor',
  'Data de pagamento', 'Data de envío', 'Nome do Produto', 'Valor do Produto',
  'Quantidade Comprada', 'SKU', 'Canal', 'Código de rastreio do envio',
  'Identificador da transação no meio de pagamento', 'Identificador do pedido',
  'Produto Fisico', 'Pessoa que registrou a venda', 'Local de venda', 'Vendedor',
  'Data e hora do cancelamento', 'Motivo do cancelamento', 'Pedido editado',
  'Saldo a cobrar / estornar', 'Estorno', 'Taxas', 'Parcelas', 'Juros',
  'Devolução dos custos', 'Total líquido', 'Meio de pagamento', 'Dados do cartão',
  'Retirar dinheiro a partir de', 'Data de estorno', 'Vencimento do pagamento',
  'Link do pedido', 'Venda original',
]

/** As 23 colunas do arquivo de clientes. */
export const COLUNAS_CLIENTES: readonly string[] = [
  'Nome completo', 'CPF/CNPJ', 'E-mail', 'Telefone de Contato', 'Gênero',
  'Data de nascimento', 'Endereço', 'Número', 'Complemento', 'Cidade', 'Bairro',
  'Estado', 'CEP', 'País', 'Total Consumido (BRL)', 'Número de Compras',
  'Última Compra', 'Data', 'Cadastrado', 'Inscrição para newsletter', 'Marketing',
  'Marketing (atualização)', 'Tags',
]

export class CsvError extends Error {}
