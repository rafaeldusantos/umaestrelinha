import { Inicial, clienteDesde, nomeDoCliente, type CabecalhoDeCliente } from '@/entities/customer'

/**
 * O cabeçalho da ficha (feature `76`, `MAC-15`, `MAC-32`): a inicial, o nome (sem nome: o e-mail) e
 * "<cidade/UF> · cliente desde <mês> <ano>". A cidade é a do pedido mais recente que a tem (A6);
 * sem ela, o separador também some. Nada aqui decide: o texto é de `clienteDesde` (o mês e o ano são
 * os do fuso da loja). Tudo quebra em vez de estourar.
 *
 * **Com a fonte do sistema grande o avatar sobe e o nome ocupa a largura inteira**: o bloco do texto
 * tem piso em `rem` limitado a 100 %, e o cabeçalho embrulha. A 200 % o avatar tomava um terço da
 * largura e "Albuquerque" partia no meio (`BUG-20261024-nome-da-ficha-quebra-no-meio-da-palavra-a-200`).
 */
const CabecalhoDaCliente = ({
  cliente,
  cidade,
}: {
  cliente: CabecalhoDeCliente
  cidade: { city: string; state: string | null } | null
}) => (
  <div data-bloco="cabecalho" className="flex flex-wrap items-center gap-x-3 gap-y-2">
    <Inicial cliente={cliente} grande />
    <div data-parte="texto" className="min-w-[min(100%,12rem)] flex-1">
      <p data-parte="nome" className="font-display text-xl font-bold [overflow-wrap:anywhere]">
        {nomeDoCliente(cliente)}
      </p>
      <p data-parte="desde" className="mt-0.5 text-sm text-estrelinha-ink-soft [overflow-wrap:anywhere]">
        {clienteDesde(cliente.created_at, cidade)}
      </p>
    </div>
  </div>
)

export default CabecalhoDaCliente
