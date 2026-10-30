// Feature `88` — o portão de aviso à cliente (C6). A página do pedido, a lista e o diálogo de
// cancelamento importam daqui, nunca de caminho profundo.
export { useNoticeGate, FALHA_INESPERADA, type NoticeGate } from './model/useNoticeGate'
export type { NoticeEmail, NoticeRequest } from './model/types'
export { NoticeEmails } from './ui/NoticeEmails'
// O caminho inteiro de um gesto que pode avisar a cliente: previsão, portão, uma gravação por vez e a
// frase do desfecho (`AVS-01`, `AVS-06`, `AVS-07`). A página do pedido e a lista o reaproveitam.
export {
  useGestoComAviso,
  fraseDoResultado,
  notaDaDonaPara,
  OUTRA_GRAVACAO,
  type Gesto,
  type GestoComAviso,
  type DesfechoDaGravacao,
} from './model/useGestoComAviso'
export { abrirPrevia } from './model/previa'
