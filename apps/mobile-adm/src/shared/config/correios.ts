/**
 * "Ver nos Correios" (feature `82`, `ENV-19`, A5): o rastreio oficial do envelope que a CLIENTE posta.
 *
 * Medido em 2026-10-26 com `curl`: o parâmetro `objetos` PREENCHE o campo do formulário dos Correios,
 * mas a página ainda pede captcha — o app só abre o link, nunca consulta a API (Out of Scope da `82`).
 * É outra pergunta que `parcelTrackingUrl` (Melhor Rastreio, o rastreio de SAÍDA, para a cliente).
 *
 * O código entra por `encodeURIComponent`: ele vem do banco (a cliente pode tê-lo digitado na loja), e
 * um `&` ou `#` nele mudaria a URL.
 */
export const CORREIOS_TRACKING_BASE = 'https://rastreamento.correios.com.br/app/index.php?objetos='

export const correiosTrackingUrl = (code: string): string => `${CORREIOS_TRACKING_BASE}${encodeURIComponent(code)}`
