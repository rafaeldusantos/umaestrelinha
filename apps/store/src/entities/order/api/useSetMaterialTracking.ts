import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import { toMaterialStatus, type MaterialStatus } from '@estrelinha/core/material'
import { writeMaterialTracking } from '@estrelinha/core/order-actions'

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
 *
 * **Feature `82`, Fase 5 (T19, `BL-054`)**: a sequência "RPC → aviso" e a normalização do código moram
 * no dono da escrita (`writeMaterialTracking`, `core/order-actions`), o mesmo que o painel e o app do
 * ateliê chamam — três escritores do mesmo campo, uma forma no banco (sem espaço, sem invisível, sem
 * hífen e sem ponto, em maiúsculas). O client da loja e a notificadora da cliente (`?action=notify`)
 * são injetados. Vazio depois de normalizar não sai daqui: o dono devolve `empty_code` sem rede.
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
      return 'Não foi possível registrar o código neste pedido. Entre na sua conta e tente de novo, ou me avise que eu registro para você.'
    case 'material_not_applicable':
      return 'Este pedido não espera material.'
    default:
      return 'Não foi possível registrar o código agora. Tente de novo, ou me avise que eu registro para você.'
  }
}

export const useSetMaterialTracking = (orderId: string | undefined) => {
  const qc = useQueryClient()

  return useMutation<MaterialTrackingResult, Error, string>({
    mutationFn: async (code: string): Promise<MaterialTrackingResult> => {
      const r = await writeMaterialTracking({ client: supabase, notify: avisarQueRegistrou }, { id: orderId!, code })
      switch (r.tipo) {
        case 'ok':
          // O aviso já saiu dentro do dono, e só no `ok`: numa recusa não houve fato a comunicar.
          return { ok: true, status: toMaterialStatus(r.status), reason: null }
        case 'recusado':
          return { ok: false, status: 'nao_aplicavel', reason: r.reason }
        case 'nao-permitido':
          return { ok: false, status: 'nao_aplicavel', reason: 'not_allowed' }
        default: {
          // A falha da RPC continua sendo erro — é o registro que não aconteceu.
          const erro = (r as { erro: unknown }).erro as { message?: string } | null
          throw new Error(erro?.message ?? 'set_material_tracking falhou')
        }
      }
    },
    onSuccess: (resultado) => {
      // Só invalida quando algo mudou de fato. Invalidar numa recusa recarregaria o pedido para
      // mostrar exatamente o mesmo estado.
      if (!resultado.ok) return
      qc.invalidateQueries({ queryKey: ['orders', 'id', orderId] })
      // Feature 59 (`MAT-05`): a lista da conta também precisa reler — é dela que sai a pendência
      // "Aguardo o seu material". Sem isto ela seguiria cobrando o código que a cliente acabou
      // de informar até o cache vencer. O prefixo alcança `['orders', 'customer', id]`.
      qc.invalidateQueries({ queryKey: ['orders', 'customer'] })
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
async function avisarQueRegistrou(orderId: string): Promise<boolean> {
  try {
    await supabase.functions.invoke('send-notification?action=notify', {
      body: { order_id: orderId, trigger: 'material_tracking_set' },
    })
    return true
  } catch {
    // O estado no banco já mudou pela RPC. O aviso é o que pode faltar, e ele tem o próprio
    // registro em `order_notifications` — a Adri reenvia pelo histórico do pedido.
    return false
  }
}
