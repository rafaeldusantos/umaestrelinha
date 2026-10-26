import { ACCESS_DENIED_CODE } from '@estrelinha/core/hooks/useStoreOverview'

/**
 * A recusa de acesso, no formato ÚNICO do app (feature `75`, levada para cá na `79`, T16).
 *
 * Toda porta do app que descobre "esta conta não tem o papel" LANÇA isto — `{ code: '42501' }`, lido
 * por `isAccessDenied` e desenhado pelo episódio único da `72`/`74`. Duas portas hoje: a de escrita do
 * pedido (`features/order-actions/api/gravarAcao.ts`) e a dos avisos no celular
 * (`features/push-notifications/api/portaDeAvisos.ts`). Uma declaração só: duas escritas do formato
 * divergiriam sem nada quebrar, e a tela deixaria de reconhecer a recusa de uma delas.
 */
export const recusa = () => Object.assign(new Error('acesso restrito ao painel'), { code: ACCESS_DENIED_CODE })
