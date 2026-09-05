// `PED-16` — "cobrar material" é **um clique que abre o WhatsApp com o texto pronto**.
//
// ---------------------------------------------------------------------------------------------
// POR QUE NÃO É UMA RÉGUA AUTOMÁTICA
// ---------------------------------------------------------------------------------------------
// Está em `Out of Scope` da spec, e o motivo não é técnico: **régua automática de cobrança é
// política de relacionamento num negócio memorial**. Boa parte de quem abre esta loja acabou de
// perder alguém, e um e-mail automático dizendo "estamos esperando seu material" no décimo dia é a
// diferença entre um lembrete e uma cobrança. Quem decide o tom, e se manda, é a Adri.
//
// O que o código faz é tirar o trabalho de digitar. O texto é um rascunho — o WhatsApp abre com ele
// preenchido e **ninguém envia nada até ela apertar enviar**.

import { toMaterialStatus } from '@estrelinha/core/material'
import { queueAge } from '@estrelinha/core/material'
import type { AdminOrderRow } from '@/entities/order/api/orderQuery'
import { queueSince } from '@/entities/order/api/orderQuery'

/**
 * O rascunho da mensagem.
 *
 * **Sem urgência fabricada e sem contagem regressiva** — é regra de produto deste repositório, não
 * preferência de redação. E sem nomear o material: a coluna `material_kinds` é curadoria pendente
 * (`BL-015`) e diz menos que a descrição, então escrever "suas cinzas" pode simplesmente estar
 * errado. "O material" é verdadeiro nos sete casos.
 */
export const chargeMaterialText = (row: AdminOrderRow, now?: Date): string => {
  const material = toMaterialStatus(row.material_status)
  const idade = queueAge(queueSince(row), now)
  const primeiroNome = (row.customer_name ?? '').trim().split(/\s+/)[0] || 'Oi'

  if (material === 'material_enviado') {
    return (
      `Oi, ${primeiroNome}! Aqui é a Adri, da Uma Estrelinha. ` +
      `Vi que você já postou o material do pedido #${row.order_number}. ` +
      `Assim que ele chegar aqui eu te aviso e começo a peça. Qualquer dúvida, é só me chamar.`
    )
  }

  const quando =
    idade && idade.tier === 'stale'
      ? ' Ele foi feito faz um tempinho, então queria saber se está tudo bem por aí.'
      : ''

  return (
    `Oi, ${primeiroNome}! Aqui é a Adri, da Uma Estrelinha. ` +
    `Estou com o seu pedido #${row.order_number} guardado, esperando o material chegar para começar.${quando} ` +
    `Se precisar de ajuda para preparar ou postar, me conta que eu te explico com calma. ` +
    `Sem pressa nenhuma.`
  )
}

/** Só dígitos, com o 55 do Brasil na frente quando falta. */
export const whatsappNumber = (phone: string | null | undefined): string | null => {
  const digitos = (phone ?? '').replace(/\D/g, '')
  if (digitos.length < 10) return null
  return digitos.startsWith('55') ? digitos : `55${digitos}`
}

/**
 * O link do WhatsApp.
 *
 * Sem telefone, cai no `wa.me` sem número: abre o app com o texto na área de transferência da
 * conversa que a Adri escolher. É melhor que um botão desabilitado — desabilitar por ausência de
 * dado daria a impressão errada de que a cliente não tem telefone cadastrado.
 *
 * **Desde a feature 35 a listagem CARREGA o telefone.** Ele passou a viver em
 * `orders.customer_phone` (snapshot do momento da compra) e a view `order_list` o expõe, então o
 * caminho sem número virou exceção em vez de regra. Antes disso era o comportamento de **todo**
 * pedido de convidada — que é a maioria: por `AD-023` a convidada não tem linha em `customers`, e
 * era de lá que o telefone teria de vir.
 */
export const chargeMaterialUrl = (
  row: AdminOrderRow,
  phone?: string | null,
  now?: Date,
): string => {
  const numero = whatsappNumber(phone)
  const texto = encodeURIComponent(chargeMaterialText(row, now))
  return numero ? `https://wa.me/${numero}?text=${texto}` : `https://wa.me/?text=${texto}`
}
