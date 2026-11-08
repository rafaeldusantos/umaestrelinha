import { formatBRL } from '@estrelinha/core/formatters'
import { normalizeAdminNote } from '@estrelinha/core/orders'
import { PROPOSAL_LINK_DAYS, proposalExpiryDate } from '@estrelinha/core/proposals'
import { toQuoteProducts, type QuoteProductPayload } from '@estrelinha/core/shipping'
import { maskCep, maskCpf, maskPhone, normalizeEmail, stripCep, stripCpf, stripPhone } from '@estrelinha/core/validators'

import type { EnderecoSalvo } from '@/entities/customer'

import { combinadoDaPrevia, COMBINADO_DESLIGADO, type DescontoCombinado } from './descontos'
import { cepCompleto, montagemVazia, type EnderecoDigitado, type Entrega, type EstadoDaMontagem } from './montagem'
import type { LinhaDaSacola } from './sacola'
import type { LeituraDoMontado } from './tipos'

export { ENDERECO_NO_LINK, SALVANDO } from './frases'

/**
 * O passo 4 · Revisar da montagem — puro: o corpo do `save` (a única gravação do app), o corpo da
 * prévia do frete, a montagem reaberta de um pedido montado (Editar) e as frases do passo. Nenhuma
 * conta de dinheiro mora aqui: o total que vai como `expected_total` é o da prévia do servidor, e o
 * servidor recalcula tudo de novo ao gravar e recusa o total que mudou.
 */

/** O endereço que vai no pedido montado, já resolvido pela entrega escolhida; `null` = a cliente preenche no link. */
export const enderecoDaEntrega = (
  estado: EstadoDaMontagem,
  entrega: Entrega | null,
  salvos: readonly EnderecoSalvo[] | undefined,
): EnderecoDigitado | null => {
  if (entrega === 'outro') return estado.endereco
  if (entrega === 'padrao' || entrega === 'salvo') {
    const lista = salvos ?? []
    const salvo =
      entrega === 'salvo' ? lista.find((e) => e.id === estado.enderecoSalvoId) : (lista.find((e) => e.is_default) ?? lista[0])
    if (!salvo) return null
    return {
      cep: salvo.cep,
      rua: salvo.street,
      numero: salvo.number,
      complemento: salvo.complement ?? '',
      bairro: salvo.neighborhood,
      cidade: salvo.city,
      uf: salvo.state,
    }
  }
  return null
}

/** O endereço tem o que a prévia do frete precisa: CEP de 8 dígitos e a rua. */
export const enderecoCotavel = (e: EnderecoDigitado | null): e is EnderecoDigitado => !!e && cepCompleto(e.cep) && e.rua.trim() !== ''

/** O corpo da cotação (`melhor-envio?action=quote`): o mesmo que a loja e o painel mandam (`toQuoteProducts`). */
export const corpoDaCotacao = (cep: string, pecas: readonly LinhaDaSacola[]): { postal_code_to: string; products: QuoteProductPayload[] } => ({
  postal_code_to: stripCep(cep),
  products: toQuoteProducts(pecas.map((l) => ({ id: l.pecaId, unitPrice: l.preco, quantity: l.quantidade, dimensions: l.medidas ?? null }))),
})

/** O corpo do `save`: exatamente as chaves do contrato da function. */
export interface CorpoDoSave {
  id?: string
  version?: number
  idempotency_key?: string
  customer_id: string | null
  customer_name: string
  customer_email: string
  customer_phone: string | null
  customer_document: string | null
  address_zip: string | null
  address_street: string | null
  address_number: string | null
  address_complement: string | null
  address_neighborhood: string | null
  address_city: string | null
  address_state: string | null
  lines: { product_id: string; variant_id: string | null; quantity: number; engraving_text: string | null }[]
  coupon_code: string | null
  manual_discount: { kind: 'amount' | 'percent'; value: number; reason: string } | null
  expected_total: number
  admin_note: string | null
  save_address: boolean
}

/** Criar leva a chave de idempotência (uma por montagem); editar leva a proposta e a versão lida. */
export type AlvoDoSave = { tipo: 'criar'; chave: string } | { tipo: 'editar'; id: string; versao: number }

const ouNulo = (v: string | null | undefined): string | null => {
  const t = (v ?? '').trim()
  return t === '' ? null : t
}

/**
 * O corpo do `save` a partir da montagem. `entrega` é a entrega já resolvida (o padrão de quem não
 * escolheu); `salvos`, os endereços da ficha; `totalEsperado`, o total da prévia — o que a Adri viu.
 * "Salvar no cadastro" só vale para o endereço digitado agora (o salvo já está na ficha).
 */
export const corpoDoSave = (
  estado: EstadoDaMontagem,
  entrada: { entrega: Entrega | null; salvos: readonly EnderecoSalvo[] | undefined; totalEsperado: number; alvo: AlvoDoSave },
): CorpoDoSave => {
  const cadastrada = estado.modo === 'cadastrada' && estado.cliente !== null
  const c = estado.cliente
  const endereco = enderecoDaEntrega(estado, entrada.entrega, entrada.salvos)
  const cep = endereco ? stripCep(endereco.cep) : ''
  const combinado = combinadoDaPrevia(estado.combinado)
  const corpo: CorpoDoSave = {
    customer_id: cadastrada ? c.fichaId : null,
    customer_name: cadastrada ? (c.name ?? '').trim() : estado.contato.nome.trim(),
    customer_email: normalizeEmail((cadastrada ? c.email : estado.contato.email).trim()),
    customer_phone: ouNulo(stripPhone(cadastrada ? (c.phone ?? '') : estado.contato.whatsapp)),
    customer_document: cadastrada ? null : ouNulo(stripCpf(estado.contato.documento)),
    address_zip: cep === '' ? null : cep,
    address_street: ouNulo(endereco?.rua),
    address_number: ouNulo(endereco?.numero),
    address_complement: ouNulo(endereco?.complemento),
    address_neighborhood: ouNulo(endereco?.bairro),
    address_city: ouNulo(endereco?.cidade),
    address_state: ouNulo(endereco?.uf.toUpperCase()),
    lines: estado.pecas.map((l) => ({
      product_id: l.pecaId,
      variant_id: l.variacaoId,
      quantity: l.quantidade,
      engraving_text: l.gravacao === '' ? null : l.gravacao,
    })),
    coupon_code: estado.cupom?.codigo ?? null,
    manual_discount: combinado ? { ...combinado, reason: estado.combinado.motivo.trim() } : null,
    expected_total: entrada.totalEsperado,
    admin_note: normalizeAdminNote(estado.observacao) || null,
    save_address: entrada.entrega === 'outro' && estado.salvarNoCadastro,
  }
  return entrada.alvo.tipo === 'editar'
    ? { id: entrada.alvo.id, version: entrada.alvo.versao, ...corpo }
    : { idempotency_key: entrada.alvo.chave, ...corpo }
}

/** O valor do desconto combinado gravado, como o campo o mostra. */
const valorDoCampo = (tipo: 'amount' | 'percent', valor: number): string =>
  tipo === 'amount' ? formatBRL(valor) : String(valor).replace('.', ',')

/**
 * A montagem reaberta de um pedido montado (Editar): peças (com o preço travado; a prévia confere o de
 * hoje), cliente — a ficha, quando o pedido tem uma; senão a cliente nova com o contato gravado —,
 * entrega (o endereço gravado, ou "a cliente preenche no link"), desconto combinado e observação. O
 * cupom volta como CÓDIGO: quem reabre o confere de novo pela prévia (a regra pode ter mudado).
 */
export const montagemDoMontado = (leitura: LeituraDoMontado): { estado: EstadoDaMontagem; cupom: string | null } => {
  const p = leitura.proposal
  const vazia = montagemVazia()
  const comEndereco = stripCep(p.address_zip ?? '') !== ''
  const endereco: EnderecoDigitado = {
    cep: comEndereco ? maskCep(p.address_zip ?? '') : '',
    rua: p.address_street ?? '',
    numero: p.address_number ?? '',
    complemento: p.address_complement ?? '',
    bairro: p.address_neighborhood ?? '',
    cidade: p.address_city ?? '',
    uf: p.address_state ?? '',
  }
  const pecas: LinhaDaSacola[] = [...p.items]
    .sort((a, b) => Number(a.position) - Number(b.position))
    .map((i) => ({
      chave: `gravada-${i.position}`,
      pecaId: i.product_id,
      variacaoId: i.variant_id ?? null,
      quantidade: Number(i.quantity),
      gravacao: i.engraving_text ?? '',
      nome: i.product_name,
      rotulo: i.variant_label ?? null,
      foto: i.product_image ?? null,
      preco: Number(i.list_price ?? i.unit_price),
      pedeMaterial: i.requires_material === true,
      medidas: null,
    }))
  const tipo = p.manual_discount_kind === 'percent' ? 'percent' : 'amount'
  const combinado: DescontoCombinado =
    p.manual_discount_kind && p.manual_discount_value != null
      ? { ligado: true, tipo, valor: valorDoCampo(tipo, Number(p.manual_discount_value)), motivo: p.manual_discount_reason ?? '' }
      : COMBINADO_DESLIGADO
  const comum = {
    ...vazia,
    entrega: (comEndereco ? 'outro' : 'link') as Entrega,
    endereco: comEndereco ? endereco : vazia.endereco,
    // O endereço gravado já é do pedido; salvá-lo de novo na ficha é decisão de quem edita.
    salvarNoCadastro: false,
    pecas,
    combinado,
    observacao: p.admin_note ?? '',
  }
  const estado: EstadoDaMontagem = p.customer_id
    ? {
        ...comum,
        modo: 'cadastrada',
        cliente: { id: p.customer_id, name: p.customer_name, email: p.customer_email, phone: p.customer_phone, fichaId: p.customer_id, pedidos: 0 },
      }
    : {
        ...comum,
        modo: 'nova',
        contato: {
          nome: p.customer_name ?? '',
          email: p.customer_email ?? '',
          whatsapp: p.customer_phone ? maskPhone(p.customer_phone) : '',
          documento: p.customer_document ? maskCpf(p.customer_document) : '',
        },
      }
  return { estado, cupom: p.coupon_code ?? null }
}

/** O motivo do bloqueio do passo 4: a soma dos bloqueios dos outros passos, e o resumo que ainda não veio. */
export const motivoDaRevisao = (motivos: (string | null)[], temResumo: boolean): string | null =>
  motivos.find((m): m is string => m !== null) ?? (temResumo ? null : MOTIVO_SEM_RESUMO)

// As frases do passo 4.
export const ALTERAR = 'Alterar'
export const alterar = (bloco: string): string => `Alterar ${bloco.toLowerCase()}`
export const CLIENTE_DA_REVISAO = 'Cliente'
export const ENTREGA_DA_REVISAO = 'Entrega'
export const FICHA_NOVA = 'Ficha nova · criada com o link'
export const SEM_EMAIL = 'sem e-mail'
export const SEM_TELEFONE_NA_REVISAO = 'sem telefone'
export const PREVIA_DO_FRETE = 'Prévia. A cliente escolhe a entrega no link.'
export const COTANDO = 'Cotando o frete…'
export const COTACAO_FALHOU = 'Não consegui cotar agora. Pode criar o link assim mesmo — a cliente cota na loja.'
export const SEM_ENTREGA_PARA_O_CEP = 'Nenhuma entrega disponível para este CEP.'
export const GRATIS = 'grátis'
export const OBSERVACAO_DA_MONTAGEM = 'Observação interna'
export const NOTA_DA_OBSERVACAO = 'Opcional. Só para quem administra — a cliente nunca vê.'
export const CRIAR_LINK = 'Criar link'
export const CRIANDO_O_LINK = 'Criando o link…'
export const SALVAR_ALTERACOES = 'Salvar alterações'
export const EDITAR_PEDIDO_MONTADO = 'Editar pedido montado'
export const CARREGANDO_O_MONTADO = 'Carregando o pedido montado'
export const MOTIVO_SEM_RESUMO = 'Conferindo o resumo…'
export const LINK_CRIADO = 'Link criado.'
export const agoraEhSoMandar = (nome: string): string => `Agora é só mandar para ${nome.trim().split(/\s+/)[0] || 'a cliente'}.`
export const ALTERACOES_SALVAS = 'Alterações salvas.'
export const O_LINK_CONTINUA = 'O link continua o mesmo.'
export const NOTA_DO_EDITAR = 'Os preços ficam travados como estão aqui. Editar mantém o link que a cliente já recebeu.'

/**
 * "Os preços ficam travados como estão aqui. O link vale 7 dias, até 09/11. Nada é gravado antes de
 * você criar o link." O dia vem do relógio do SERVIDOR (`lido_em`); sem ele, a frase sai sem o dia.
 */
export const notaDaRevisao = (agoraDoServidor: string | null): string => {
  const ate = agoraDoServidor ? proposalExpiryDate(new Date(new Date(agoraDoServidor).getTime() + PROPOSAL_LINK_DAYS * 86_400_000).toISOString()) : ''
  const prazo = ate ? `O link vale ${PROPOSAL_LINK_DAYS} dias, até ${ate}.` : `O link vale ${PROPOSAL_LINK_DAYS} dias.`
  return `Os preços ficam travados como estão aqui. ${prazo} Nada é gravado antes de você criar o link.`
}

/** "Prata · 2 un. · gravação “Helena”" — a variação, a quantidade e a gravação de uma linha da sacola. */
export const detalheDaLinha = (l: Pick<LinhaDaSacola, 'rotulo' | 'quantidade' | 'gravacao'>): string =>
  [l.rotulo, `${l.quantidade} un.`, l.gravacao ? `gravação “${l.gravacao}”` : null].filter(Boolean).join(' · ')

/** O prazo de uma opção de entrega, em dias úteis. */
export const prazoDaOpcao = (q: { delivery_time: number; delivery_range?: { min: number; max: number } }): string => {
  const min = q.delivery_range?.min ?? q.delivery_time
  const max = q.delivery_range?.max ?? q.delivery_time
  return min === max ? `${max} ${max === 1 ? 'dia útil' : 'dias úteis'}` : `${min} a ${max} dias úteis`
}
