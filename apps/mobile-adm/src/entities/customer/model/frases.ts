import { formatPrice } from '@estrelinha/core/formatters'
import { calendarParts, formatOrderNumber } from '@estrelinha/core/orders'
import { monthName, relativeAge } from '@estrelinha/core/stats'

/**
 * TODAS as frases da aba Clientes, num arquivo só (feature `76`, `MAC-35`) — a lista, a ficha, os
 * vazios e as falhas. O registro é memorial: nenhuma exclamação, nenhum emoji, nenhuma urgência, e
 * nenhum ranking ("melhores", "VIP"). "A cliente" no feminino, como o resto do repositório.
 *
 * O termo da busca aparece só na frase vazia — nunca no endereço (`MAC-28`).
 */

const plural = (n: number, um: string, varios: string): string => `${n} ${n === 1 ? um : varios}`

/**
 * A linha de contagem: o `count` do SERVIDOR com recorte e busca aplicados, nunca `linhas.length`.
 * A frase é a mesma com e sem filtro; o segundo argumento existe para o chamador dizer a verdade e
 * para uma frase futura diferente não exigir mudar as chamadas.
 */
export const contagemDaLista = (total: number, _comFiltro = false): string =>
  `${plural(total, 'cliente', 'clientes')} · das atividades mais recentes para as mais antigas`

/**
 * O subtítulo da linha (A8): N = `orders_paid`, "última" = `last_order_at` contra o instante do BANCO
 * da leitura (`lidoEm`), nunca o relógio do aparelho. Quem nunca pagou: "Sem compra paga ainda".
 */
export const subtituloDaLinha = (
  c: { orders_paid: number; last_order_at: string | null },
  lidoEm: string,
): string => {
  if (!(c.orders_paid > 0)) return 'Sem compra paga ainda'
  const compras = plural(c.orders_paid, 'compra', 'compras')
  const idade = c.last_order_at ? relativeAge(c.last_order_at, lidoEm) : ''
  return idade ? `${compras} · última ${idade}` : compras
}

export const VAZIO_SEM_CLIENTE = 'Ainda não há clientes.'
export const VAZIO_EM_ABERTO = 'Ninguém com pedido em aberto agora.'
/** O recorte "Compraram mais de uma vez" sem ninguém (a spec nomeia dois vazios de recorte; este é o terceiro). */
export const VAZIO_SEM_RECORRENTE = 'Ninguém comprou mais de uma vez ainda.'
/** O botão que desfaz o recorte e a busca de uma lista vazia. */
export const LIMPAR_CLIENTES = 'Limpar'
/** O que a região viva da lista diz quando não há ninguém: curto, a frase com o termo é a do `<p>` visível. */
export const SEM_RESULTADO_FALADO = 'Nenhum resultado.'
/** O aviso de que "Limpar" desfez a busca e o recorte: o botão some, e a região viva diz o que aconteceu. */
export const LIMPOU_CLIENTES = 'Busca e recorte desfeitos.'
/** Aspas curvas; o termo vai aparado, como foi buscado. */
export const vazioDaBusca = (termo: string): string => `Não achei ninguém com “${termo.trim()}”.`

/** Depois de "Ver mais pedidos": quantos pedidos a lista tem agora (anunciado na região viva do bloco). */
export const maisPedidosNaLista = (total: number): string => `Agora são ${total} pedidos na lista.`

export const FALHA_DA_LISTA = 'Não consegui carregar as clientes.'
export const FALHA_DOS_PEDIDOS = 'Não consegui carregar os pedidos.'
export const NAO_ENCONTREI_CLIENTE = 'Não encontrei esta cliente.'
export const FALHA_AO_ABRIR_CLIENTE = 'Não consegui abrir agora. Tente de novo.'

export const LEGENDA_DOS_NUMEROS = 'Contam só os pedidos pagos.'

/**
 * `Porto Alegre/RS · cliente desde março 2026`; sem cidade, só `cliente desde março 2026` (nenhum
 * separador solto). O mês e o ano são os do fuso da loja (`calendarParts`), não os do aparelho.
 */
export const clienteDesde = (
  criadoEm: string,
  cidade: { city: string; state?: string | null } | null,
): string => {
  const partes = calendarParts(criadoEm)
  const desde = partes ? `cliente desde ${monthName(`${partes.year}-${String(partes.month).padStart(2, '0')}`)} ${partes.year}` : ''
  const nomeDaCidade = (cidade?.city ?? '').trim()
  const estado = (cidade?.state ?? '').trim()
  const lugar = nomeDaCidade === '' ? '' : estado === '' ? nomeDaCidade : `${nomeDaCidade}/${estado}`
  return [lugar, desde].filter((p) => p !== '').join(' · ')
}

/** O ticket médio: `null` quando nunca houve pedido pago — travessão, nunca "R$ 0,00" (`MAC-16`). */
export const ticketMedio = (valor: number | null | undefined): string =>
  valor === null || valor === undefined ? '—' : formatPrice(valor)

/** `Pedidos · 5`; `Nenhum pedido ainda.` com zero. O total vem do cabeçalho, não de `linhas.length`. */
export const tituloDosPedidos = (total: number): string => (total > 0 ? `Pedidos · ${total}` : 'Nenhum pedido ainda.')

/** `#0244 · Pingente Gota`; sem item, só o número. */
export const rotuloDoPedido = (p: { order_number: string; item?: string | null }): string => {
  const numero = formatOrderNumber(p.order_number)
  const item = (p.item ?? '').trim()
  return item === '' ? numero : `${numero} · ${item}`
}
