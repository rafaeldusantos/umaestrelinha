import type { StoreMovement } from '@estrelinha/core/stats'

/**
 * Uma resposta de `store_movement` para os testes da página Início (feature `73`). As chaves são as
 * do tipo, conferido contra a saída real da RPC (`useStoreMovement.test.ts`, `AD-012`). Cada teste
 * muda só o que mede.
 */
export const movimento = (extra: Partial<StoreMovement> = {}): StoreMovement => ({
  hoje: '2026-10-22',
  ontem: '2026-10-21',
  inicio_semana: '2026-10-19',
  expira_em: '2026-10-23T03:00:00.000Z',
  lido_em: '2026-10-22T14:30:00.000Z',
  production_host: 'umaestrelinha.com.br',
  contagem_desde: null,
  contagem_desde_dia: null,
  ultima_visita: null,
  ultima_visita_dia: null,
  teto_dia: null,
  periodos: {
    hoje: { visitas: 41, vendas: 3, faturamento: 1077, ticket: 359 },
    ontem: { visitas: 12, vendas: 0, faturamento: 0, ticket: null },
    semana: { visitas: 230, vendas: 9, faturamento: 4321.5, ticket: 480.17 },
  },
  ...extra,
})
