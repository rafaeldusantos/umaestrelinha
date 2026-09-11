import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import { normalizeEngraving, toMaterialStatus, type MaterialStatus } from '@estrelinha/core/material'

/**
 * A cliente registra o código de rastreio da remessa **dela** — o envelope com o material (`MAT-11`).
 *
 * **Isto não é um `PATCH`, e não pode ser.** `orders` **não tem policy de `UPDATE` para cliente**, de
 * propósito (PAY-10): abrir uma exporia `payment_status`, `total` e `paid_at` a quem só precisa
 * informar um código dos Correios. A escrita passa por `set_material_tracking`, uma RPC
 * `security definer` que grava **um** campo, do próprio pedido de quem chama — molde de
 * `apply_payment_approval` e `claim_order_email`.
 *
 * A mesma RPC serve a Adri pelo painel: cliente e admin fazem a mesma coisa, e duas funções seriam
 * duas máquinas de estado que divergem no primeiro ajuste.
 *
 * **Feature 42**: registrado o código, a loja avisa a própria cliente ("anotamos o rastreio") e a
 * Adri ("material a caminho"). O aviso é CONTIDO — ver `avisarQueRegistrou` abaixo.
 */

/** `reason` vem da RPC; `null` quando deu certo. Formato `string | null` pelo motivo de sempre. */
export interface MaterialTrackingResult {
  ok: boolean
  status: MaterialStatus
  reason: string | null
}

/** Traduz o motivo técnico da RPC para o que a cliente lê. Motivo invisível é falha em silêncio. */
export const materialTrackingMessage = (reason: string | null): string => {
  switch (reason) {
    case 'empty_code':
      return 'Digite o código de rastreio do seu envio.'
    case 'not_allowed':
      // "não é seu" e "não existe" respondem igual na RPC, de propósito: distinguir os dois
      // entregaria a existência de pedidos alheios. A mensagem cobre os dois e dá a saída.
      return 'Não conseguimos registrar o código neste pedido. Entre na sua conta e tente de novo, ou nos avise que a gente registra para você.'
    case 'material_not_applicable':
      return 'Este pedido não espera material.'
    default:
      return 'Não foi possível registrar o código agora. Tente de novo, ou nos avise que a gente registra para você.'
  }
}

export const useSetMaterialTracking = (orderId: string | undefined) => {
  const qc = useQueryClient()

  return useMutation<MaterialTrackingResult, Error, string>({
    mutationFn: async (code: string): Promise<MaterialTrackingResult> => {
      // Código vazio nem sai daqui: a RPC devolveria `empty_code`, e gastar uma ida ao servidor para
      // descobrir o que a tela já sabe é ruído no caminho de quem está com o envelope na mão.
      const normalizado = normalizeEngraving(code)
      if (normalizado === null) {
        return { ok: false, status: 'nao_aplicavel', reason: 'empty_code' }
      }

      const { data, error } = await supabase.rpc('set_material_tracking', {
        p_order_id: orderId!,
        p_code: normalizado,
      })

      if (error) throw new Error(error.message)

      const resultado = (data ?? {}) as { ok?: boolean; status?: string; reason?: string | null }
      const saida = {
        ok: resultado.ok === true,
        status: toMaterialStatus(resultado.status),
        reason: resultado.reason ?? null,
      }

      // Só avisa quando o estado MUDOU de fato. Numa recusa não houve fato nenhum a comunicar.
      if (saida.ok) await avisarQueRegistrou(orderId!)

      return saida
    },
    onSuccess: (resultado) => {
      // Só invalida quando algo mudou de fato. Invalidar numa recusa recarregaria o pedido para
      // mostrar exatamente o mesmo estado.
      if (resultado.ok) qc.invalidateQueries({ queryKey: ['orders', 'id', orderId] })
    },
  })
}

/**
 * Conta à `send-notification` que a cliente registrou o rastreio (`NTF-13`).
 *
 * **Contido, e por três razões que valem escritas:**
 *
 * 1. `await` e não `void`, para que uma falha de rede não vire *unhandled rejection* depois de a
 *    tela já ter navegado — mas dentro de `try/catch`, então o resultado do registro **não depende**
 *    do aviso. A cliente acabou de digitar o código com o envelope na mão; dizer "não deu" porque um
 *    e-mail não saiu seria mentir sobre o que aconteceu.
 * 2. Manda o GATILHO (`material_tracking_set`), não o evento (`AD-032`). Quais mensagens saem — uma
 *    para ela, uma para a Adri — é decisão de `core/notifications/triggers`, com um dono e um teste.
 * 3. A porta é `?action=notify`, que autoriza por **dona do pedido** e aceita um recorte fechado de
 *    gatilhos (`CUSTOMER_TRIGGERS`). A porta `trigger` é admin-only e a cliente não é admin.
 */
async function avisarQueRegistrou(orderId: string): Promise<void> {
  try {
    await supabase.functions.invoke('send-notification?action=notify', {
      body: { order_id: orderId, trigger: 'material_tracking_set' },
    })
  } catch {
    // O estado no banco já mudou pela RPC. O aviso é o que pode faltar, e ele tem o próprio
    // registro em `order_notifications` — a Adri reenvia pelo histórico do pedido.
  }
}
