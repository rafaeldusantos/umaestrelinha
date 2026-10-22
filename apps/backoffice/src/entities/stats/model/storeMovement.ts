// Feature 71 · `VIS-33` — a resposta de `public.store_movement()`.
//
// **Tipo escrito à mão é afirmação** (`AD-012`). A verificação é o probe contra o banco local: a
// lista de chaves que `useStoreMovement.test.ts` cobra foi copiada da saída REAL da RPC
// (2026-10-22, como admin, `begin … rollback`), e um `Record<keyof StoreMovement, true>` ali faz o
// `tsc` recusar o tipo com chave a mais ou a menos.
//
// O painel não decide dia nem host: `hoje`, `ontem`, `inicio_semana` e os `*_dia` chegam como
// texto `AAAA-MM-DD` já decididos pelo banco, e `production_host` é a mesma leitura que a function
// de gravação usa.

export type MovementPeriodKey = 'hoje' | 'ontem' | 'semana'

export interface MovementPeriod {
  visitas: number
  vendas: number
  /** `0` sem venda, nunca `null` (o banco faz `coalesce`). */
  faturamento: number
  /** `round(faturamento / vendas, 2)` no banco; `null` sem venda. */
  ticket: number | null
}

export interface StoreMovement {
  /** `'AAAA-MM-DD'` */
  hoje: string
  ontem: string
  inicio_semana: string
  /** ISO — a próxima 00:00 de Brasília. */
  expira_em: string
  /** ISO — o instante desta leitura (o `p_agora` da RPC). */
  lido_em: string
  /** `''` quando vazio. */
  production_host: string
  contagem_desde: string | null
  contagem_desde_dia: string | null
  ultima_visita: string | null
  ultima_visita_dia: string | null
  teto_dia: string | null
  periodos: Record<MovementPeriodKey, MovementPeriod>
}
