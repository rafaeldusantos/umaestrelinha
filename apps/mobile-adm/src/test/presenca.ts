import type { StoreLive } from '@estrelinha/core/live'

/**
 * Uma resposta de `store_live` para os testes do app. As chaves são as do contrato, conferidas contra
 * a saída real da RPC pelo probe da presença. Os campos DIVERGEM (o total 7 ≠ qualquer parte), e as
 * barras sobem até o total de agora (a última é igual a ele, como o servidor devolve).
 */
export const presenca = (extra: Partial<StoreLive> = {}): StoreLive => ({
  lido_em: '2026-10-22T14:30:00.000Z',
  janela_min: 5,
  production_host: 'umaestrelinha.com.br',
  contagem_desde: '2026-10-20T12:00:00.000Z',
  agora: { total: 7, olhando: 4, sacola: 2, checkout: 1 },
  compraram_30min: 0,
  minutos: [0, 1, 1, 2, 2, 3, 3, 3, 4, 4, 5, 5, 6, 9, 6, 5, 5, 4, 4, 4, 5, 5, 6, 6, 6, 7, 6, 6, 7, 7],
  joias: [],
  guia: 0,
  origens: [
    { faixa: 'instagram', n: 3 },
    { faixa: 'google', n: 2 },
    { faixa: 'whatsapp', n: 1 },
    { faixa: 'direto', n: 1 },
    { faixa: 'outros', n: 0 },
  ],
  aparelho: { celular: 6, computador: 1, tablet: 0 },
  ...extra,
})

/** Ninguém na loja, com a loja medida. */
export const presencaVazia = (extra: Partial<StoreLive> = {}): StoreLive =>
  presenca({ agora: { total: 0, olhando: 0, sacola: 0, checkout: 0 }, minutos: Array(30).fill(0), ...extra })
