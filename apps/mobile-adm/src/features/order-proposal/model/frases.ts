import { formatOrderNumber } from '@estrelinha/core/orders'
import { documentLabel, maskCep, maskDocument } from '@estrelinha/core/validators'
import { firstName, proposalExpiryDate, type ProposalState } from '@estrelinha/core/proposals'
import { relativeAge } from '@estrelinha/core/stats'

import type { CanalDoEnvio, EventoDoMontado, MontadoNaLista, PecaResumida, PedidoMontado } from './tipos'

/**
 * As frases das telas dos pedidos montados no app. A regra (estado, prazo, link, mensagem do
 * WhatsApp, renovar) é de `@estrelinha/core/proposals`; aqui só a forma de dizer, e um lugar só para a
 * tela e o teste lerem a mesma frase.
 *
 * O tempo ("há 2 dias") é contado contra o relógio do SERVIDOR (`agora` da lista, `lido_em` do
 * detalhe) por `relativeAge` — nunca o do aparelho.
 */

const aberta = (estado: ProposalState) => estado === 'open' || estado === 'viewed'

/** "1 aberto" / "3 abertos". */
export const abertos = (n: number): string => (n === 1 ? '1 aberto' : `${n} abertos`)

/** O chip da visão: "Montados · 2 abertos"; sem aberto (ou sem a contagem), só "Montados". */
export const rotuloDoChip = (n: number | null): string => (n ? `Montados · ${abertos(n)}` : 'Montados')

/** Quantos estão abertos — Aberta e Vista somam. */
export const contarAbertos = (lista: readonly Pick<MontadoNaLista, 'state'>[]): number => lista.filter((m) => aberta(m.state)).length

/** O topo da lista: "3 pedidos montados · os mais recentes primeiro". */
export const cabecalhoDaLista = (total: number): string =>
  `${total === 1 ? '1 pedido montado' : `${total} pedidos montados`} · os mais recentes primeiro`

export const LISTA_VAZIA = 'Nenhum pedido montado ainda.'

/** "Montado há 2 dias" / "Montado agora", contra o relógio do servidor. */
export const montadoHa = (criadoEm: string, agora: string): string => `Montado ${relativeAge(criadoEm, agora)}`

/**
 * A meta do cartão, por estado: Aberta/Vista "Montado há 2 dias · vale até 05/11"; Concluída "Virou o
 * pedido #0262"; Expirada "Venceu em 31/10"; Cancelada "Cancelado · montado há 12 dias".
 */
export const metaDoCartao = (m: Pick<MontadoNaLista, 'state' | 'created_at' | 'expires_at' | 'order_number'>, agora: string): string => {
  if (aberta(m.state)) return `${montadoHa(m.created_at, agora)} · vale até ${proposalExpiryDate(m.expires_at)}`
  if (m.state === 'completed') return `Virou o pedido ${formatOrderNumber(m.order_number)}`.trim()
  if (m.state === 'expired') return `Venceu em ${proposalExpiryDate(m.expires_at)}`
  return `Cancelado · montado ${relativeAge(m.created_at, agora)}`
}

/** Uma peça: "Nome · variação". */
export const nomeDaPeca = (p: Pick<PecaResumida, 'product_name' | 'variant_label'>): string =>
  [p.product_name, p.variant_label].map((t) => (t ?? '').trim()).filter(Boolean).join(' · ')

/** As peças do cartão, juntas por " · ", e "e mais N" quando a lista trouxe só as primeiras. */
export const pecasDoCartao = (linhas: readonly PecaResumida[], total: number): string => {
  const nomes = linhas.map(nomeDaPeca).filter(Boolean)
  const resto = total - linhas.length
  return resto > 0 ? `${nomes.join(' · ')} · e mais ${resto}` : nomes.join(' · ')
}

/** O título da tela: "Pedido montado P-0042". */
export const tituloDoMontado = (numero: string | null | undefined): string => (numero ? `Pedido montado ${numero}` : 'Pedido montado')

/** A linha de baixo do título: "Montado agora · vale até 09/11" na aberta; "Montado há 2 dias" nas outras. */
export const subtituloDoMontado = (estado: ProposalState, criadoEm: string, expiraEm: string, agora: string): string =>
  aberta(estado) ? `${montadoHa(criadoEm, agora)} · vale até ${proposalExpiryDate(expiraEm)}` : montadoHa(criadoEm, agora)

export const VOLTAR_PARA_MONTADOS = 'Voltar para Montados'
export const NAO_ENCONTREI_O_MONTADO = 'Não encontrei este pedido montado.'

// O cartão do link
export const linkPara = (nome: string | null | undefined): string => {
  const primeiro = firstName(nome)
  return primeiro ? `Link para ${primeiro}` : 'Link para a cliente'
}
export const ENVIAR_PELO_WHATSAPP = 'Enviar pelo WhatsApp'
export const COPIAR_LINK = 'Copiar link'
export const SEM_TELEFONE = 'Sem telefone — copie o link.'
export const valeAte = (expiraEm: string): string =>
  `Vale até ${proposalExpiryDate(expiraEm)}. Quem tem o link pode pagar este pedido — não pode ver a conta dela.`
export const MENSAGEM_DO_WHATSAPP = 'Mensagem do WhatsApp'
export const LINK_SEM_CIFRA = 'O link deste pedido não pode ser mostrado de novo. Gere um link novo — o anterior para de funcionar.'

// Os avisos do envio (o título e a linha de baixo)
export const abrindoWhatsapp = (nome: string | null | undefined) => ({
  titulo: 'Abrindo o WhatsApp…',
  texto: firstName(nome) ? `Conversa com ${firstName(nome)}, com a mensagem pronta.` : 'A conversa abre com a mensagem pronta.',
})
export const linkCopiado = (nome: string | null | undefined) => ({
  titulo: 'Link copiado.',
  texto: firstName(nome) ? `Cole na conversa com ${firstName(nome)}.` : 'Cole na conversa com a cliente.',
})
export const NAO_COPIOU = 'Não consegui copiar o link. Toque e segure o link para copiar.'
export const ENVIO_NAO_REGISTRADO = 'O link saiu, mas não consegui registrar o envio no histórico.'

// As faixas por estado
export const faixaConcluida = (nome: string | null | undefined) => ({
  antes: `${firstName(nome) || 'A cliente'} concluiu no link. O pedido `,
  depois: ' segue na fila como qualquer pedido da loja.',
})
export const faixaExpirada = (expiraEm: string): string =>
  `O link venceu em ${proposalExpiryDate(expiraEm)}. Renovar confere os preços de novo e gera um link novo.`
export const FAIXA_CANCELADA = 'Cancelado. Quem abrir o link lê que este pedido não está mais disponível.'

// Os cartões
export const CLIENTE = 'Cliente'
export const ENDERECO_NO_LINK = 'A cliente preenche o endereço no link.'

const limpo = (v: string | null | undefined) => (v ?? '').trim()

/**
 * O endereço de entrega numa linha: "Rua das Flores, 10 · Apto 2 · Centro · Porto Alegre/RS · CEP
 * 91240-010". Sem rua, a cliente preenche no link.
 */
export const enderecoDoMontado = (
  p: Pick<PedidoMontado, 'address_street' | 'address_number' | 'address_complement' | 'address_neighborhood' | 'address_city' | 'address_state' | 'address_zip'>,
): string => {
  const rua = [limpo(p.address_street), limpo(p.address_number)].filter(Boolean).join(', ')
  if (!rua) return ENDERECO_NO_LINK
  const cidade = [limpo(p.address_city), limpo(p.address_state)].filter(Boolean).join('/')
  const cep = limpo(p.address_zip) ? `CEP ${maskCep(limpo(p.address_zip))}` : ''
  return [rua, limpo(p.address_complement), limpo(p.address_neighborhood), cidade, cep].filter(Boolean).join(' · ')
}

/**
 * O documento da cliente, com o rótulo do comprimento ("CPF 123.456.789-09"), ou `null` sem ele. O
 * pedido montado é a única tela do app que o mostra: é o que a cliente vai confirmar no link.
 */
export const documentoDoMontado = (p: PedidoMontado): string | null => {
  const documento = limpo(p.customer_document)
  return documento ? `${documentLabel(documento)} ${maskDocument(documento)}` : null
}
export const pecas = (n: number): string => (n === 1 ? '1 peça' : `${n} peças`)
export const quantidade = (n: number): string => `${n} un.`
export const TOTAL_DOS_ITENS = 'Total dos itens'
export const FRETE_NO_LINK = 'Frete: a cliente escolhe no link.'
export const HISTORICO = 'Histórico'
export const OBSERVACAO_INTERNA = 'Observação interna'
export const FRASE_DA_OBSERVACAO = 'Só quem administra vê. A cliente não recebe.'
export const SEM_OBSERVACAO = 'Nenhuma observação.'

const EVENTOS: readonly (readonly [EventoDoMontado['kind'], string])[] = [
  // A criação diz "Pedido montado", a mesma origem que o painel mostra (`PROPOSAL_ORIGIN_LABEL`).
  ['created', 'Pedido montado'],
  ['edited', 'Editado'],
  ['link_sent', 'Link enviado'],
  ['viewed', 'Aberto pela cliente'],
  ['renewed', 'Prazo renovado · link novo, o anterior parou de funcionar'],
  ['cancelled', 'Cancelado por você'],
  ['completed', 'Concluído pela cliente'],
]
const CANAIS: readonly (readonly [CanalDoEnvio, string])[] = [
  ['whatsapp', 'WhatsApp'],
  ['copy', 'copiado'],
]

/**
 * "Link enviado · WhatsApp", "Link enviado · copiado", "Pedido montado"… A conclusão leva o número do
 * pedido que ela virou ("Concluído pela cliente · pedido #0262"), quando a leitura o traz.
 */
export const rotuloDoEvento = (e: Pick<EventoDoMontado, 'kind' | 'channel'>, numeroDoPedido?: string | null): string => {
  const base = EVENTOS.find(([k]) => k === e.kind)?.[1] ?? 'Atualizado'
  const canal = e.channel ? CANAIS.find(([c]) => c === e.channel)?.[1] : null
  if (canal) return `${base} · ${canal}`
  const pedido = e.kind === 'completed' ? formatOrderNumber(numeroDoPedido) : ''
  return pedido ? `${base} · pedido ${pedido}` : base
}

// As ações
export const CANCELAR_ESTE_PEDIDO = 'Cancelar este pedido'
export const cancelarTitulo = (numero: string): string => `Cancelar ${numero}?`
export const CANCELAR_FRASE = 'Quem abrir o link vai ler que este pedido não está mais disponível. Não dá para desfazer.'
export const MANTER = 'Manter'
export const CANCELAR_PEDIDO = 'Cancelar pedido'
export const CANCELADO = { titulo: 'Pedido montado cancelado.', texto: 'O link deixou de funcionar.' }

export const renovarTitulo = (numero: string): string => `Renovar o prazo de ${numero}?`
export const AGORA_NAO = 'Agora não'
export const RENOVAR = 'Renovar'
export const RENOVADO = { titulo: 'Prazo renovado.', texto: 'O link antigo parou de funcionar. Mande o novo.' }
export const PRECOS_MUDARAM_CONFIRMAR = 'Renovar com o total novo'
export const totalNovo = (total: string): string => `O total dos itens passa a ser ${total}.`

export const verOPedido = (numeroDoPedido: string | null | undefined): string => `Ver o pedido ${formatOrderNumber(numeroDoPedido)}`.trim()

export const FALHOU = 'Não consegui fazer isso agora. Tente de novo.'
export const SALVAR = 'Salvar'
export const SALVANDO = 'Salvando…'
export const EDITAR_OBSERVACAO = 'Editar observação'
export const OBSERVACAO_SALVA = 'Observação salva.'
