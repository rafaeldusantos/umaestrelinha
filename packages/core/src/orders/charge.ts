// `PED-16` — "cobrar material" é **um clique que abre o WhatsApp com o texto pronto**.
//
// Feature `75` (`MAA-18`, `MAA-19`, `MAA-28`, A18): subiu BYTE A BYTE de
// `apps/backoffice/src/features/order-list/model/chargeMaterial.ts` — o lembrete do app do ateliê e o
// do painel montam a mesma mensagem para o mesmo pedido no mesmo instante. O arquivo do painel virou
// reexportação (`toBe`, `lembreteNoCore.test.ts`). A entrada é estrutural (`ChargeMaterialInput`): o
// `AdminOrderRow` do painel a satisfaz, e este diretório não importa `@estrelinha/supabase`.
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
//
// Todo especificador relativo leva `.ts` (alcançável pelo Deno).

import { toMaterialStatus } from '../material/material.ts'
import { queueAge } from '../material/aging.ts'
import { normalizeBrPhone } from '../notifications/phone.ts'
import { formatOrderNumber } from './format.ts'
import { queueSince } from './row.ts'

/** As colunas que o lembrete lê. */
export interface ChargeMaterialInput {
  material_status: string | null
  customer_name: string | null
  order_number: string
  created_at: string
  material_received_at: string | null
}

/**
 * O rascunho da mensagem.
 *
 * **Sem urgência fabricada e sem contagem regressiva** — é regra de produto deste repositório, não
 * preferência de redação. E sem nomear o material: a coluna `material_kinds` é curadoria pendente
 * (`BL-015`) e diz menos que a descrição, então escrever "suas cinzas" pode simplesmente estar
 * errado. "O material" é verdadeiro nos sete casos.
 */
export const chargeMaterialText = (row: ChargeMaterialInput, now?: Date): string => {
  const material = toMaterialStatus(row.material_status)
  const idade = queueAge(queueSince(row), now)
  // Sem primeiro nome, só "Oi!" (feature `82`, QA): o recuo antigo produzia "Oi, Oi!".
  const primeiroNome = (row.customer_name ?? '').trim().split(/\s+/)[0]
  const saudacao = primeiroNome ? `Oi, ${primeiroNome}!` : 'Oi!'

  if (material === 'material_enviado') {
    return (
      `${saudacao} Aqui é a Adri, da Uma Estrelinha. ` +
      `Vi que você já postou o material do pedido ${formatOrderNumber(row.order_number)}. ` +
      `Assim que ele chegar aqui eu te aviso e começo a peça. Qualquer dúvida, é só me chamar.`
    )
  }

  const quando =
    idade && idade.tier === 'stale'
      ? ' Ele foi feito faz um tempinho, então queria saber se está tudo bem por aí.'
      : ''

  return (
    `${saudacao} Aqui é a Adri, da Uma Estrelinha. ` +
    `Estou com o seu pedido ${formatOrderNumber(row.order_number)} guardado, esperando o material chegar para começar.${quando} ` +
    `Se precisar de ajuda para preparar ou postar, me conta que eu te explico com calma. ` +
    `Sem pressa nenhuma.`
  )
}

/**
 * O link do WhatsApp.
 *
 * Sem telefone, cai no `wa.me` sem número: abre o app com o texto na área de transferência da
 * conversa que a Adri escolher. É melhor que um botão desabilitado — desabilitar por ausência de
 * dado daria a impressão errada de que a cliente não tem telefone cadastrado.
 *
 * No app do ateliê o caminho sem número **não é oferecido** (A17): o corte é a condição de exibição
 * (`canChargeMaterial`, em `appAction.ts`), não esta função — ela é a mesma do painel.
 *
 * **Desde a feature 35 a listagem CARREGA o telefone.** Ele passou a viver em
 * `orders.customer_phone` (snapshot do momento da compra) e a view `order_list` o expõe, então o
 * caminho sem número virou exceção em vez de regra.
 */
export const chargeMaterialUrl = (
  row: ChargeMaterialInput,
  phone?: string | null,
  now?: Date,
): string => {
  const numero = normalizeBrPhone(phone)
  const texto = encodeURIComponent(chargeMaterialText(row, now))
  return numero ? `https://wa.me/${numero}?text=${texto}` : `https://wa.me/?text=${texto}`
}
