// A porta do painel para desfazer o pagamento registrado à mão: o dono da escrita
// (`core/order-actions`) com o client do painel. Sem notificadora — desfazer não manda e-mail.

import { supabase } from '@estrelinha/supabase/client'
import {
  undoManualPayment,
  type UndoManualPaymentInput,
  type UndoManualPaymentOutcome,
} from '@estrelinha/core/order-actions'

export const desfazerRegistro = (input: UndoManualPaymentInput): Promise<UndoManualPaymentOutcome> =>
  undoManualPayment({ client: supabase }, input)
