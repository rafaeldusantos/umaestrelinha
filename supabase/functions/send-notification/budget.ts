// Os limites do motor que os DOIS ramos de entrega leem — o e-mail (`dispatch.ts`) e o aviso no
// celular (`push.ts`, feature `79`). Moram num arquivo próprio para nenhum dos dois declarar o seu:
// duas cópias de "abaixo disto não vale começar um envio" divergiriam sem nada quebrar, e o
// orçamento do caixa (`AD-008`) é um só.

/** Recorte do que guardamos em `order_notifications.error` — diagnóstico, sem virar despejo. */
export const ERROR_MAX_CHARS = 500

/**
 * Abaixo disto não vale começar um envio: o `fetch` sairia só para ser abortado, e o registro diria
 * "falhou no provedor" quando o que faltou foi tempo. Melhor a linha dizer a verdade.
 */
export const MIN_SEND_MS = 500
