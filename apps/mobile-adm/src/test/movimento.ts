import type { StoreAccess, StoreMovement } from '@estrelinha/core/stats'

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

/**
 * Feature `83`: a chave `acessos` de `store_movement` (`LAV-71`..`LAV-73`), coerente com
 * `movimento()`: hoje (22/10, quinta) às 11h30 de Brasília ⇒ faixa 3 (9h); as faixas de hoje somam os
 * 41 de `periodos.hoje.visitas`, as de ontem os 12, e o último dia da semana é hoje com 41 (a soma
 * dos dias, 243, passa dos 230 da semana: quem voltou em outro dia conta em cada barra, `VIS-15`). Os campos
 * candidatos DIVERGEM (`L-013`): o total de hoje (41) × `base_hoje` (30) × ontem até a mesma hora (10).
 */
export const acessos = (extra: Partial<StoreAccess> = {}): StoreAccess => ({
  faixa_atual: 3,
  hoje: { por_faixa: [5, 0, 12, 24, null, null, null, null], sem_hora: 0 },
  ontem: { por_faixa: [1, 0, 2, 3, 4, 1, 1, 0], sem_hora: 0 },
  semana: {
    por_dia: [
      { dia: '2026-10-19', visitas: 190 },
      { dia: '2026-10-20', visitas: 0 },
      { dia: '2026-10-21', visitas: 12 },
      { dia: '2026-10-22', visitas: 41 },
    ],
  },
  comparacao: {
    hoje: { ate_hora: 11, visitas: 10, vendas: 1, base_hoje: { visitas: 30, vendas: 2 } },
    ontem: { dia: '2026-10-20', visitas: 8, vendas: 0 },
    semana: null,
  },
  ...extra,
})

/** `movimento()` com a chave `acessos` da `83`. */
export const movimentoComAcessos = (extra: Partial<StoreMovement> = {}): StoreMovement =>
  movimento({ acessos: acessos(), ...extra })
