// Feature 71 · `VIS-33` — a resposta de `public.store_movement()`. Movido do painel na feature `73`
// (`AD-056`): o app do ateliê lê o mesmo bloco, e o tipo não pode ter uma escrita por app. O painel
// reexporta daqui (`apps/backoffice/src/entities/stats/model/storeMovement.ts`).
//
// **Tipo escrito à mão é afirmação** (`AD-012`). A verificação é o probe contra o banco local: a
// lista de chaves que `useStoreMovement.test.ts` cobra foi copiada da saída REAL da RPC
// (2026-10-22, como admin, `begin … rollback`), e um `Record<keyof StoreMovement, true>` ali faz o
// `tsc` recusar o tipo com chave a mais ou a menos.
//
// Ninguém decide dia nem host: `hoje`, `ontem`, `inicio_semana` e os `*_dia` chegam como texto
// `AAAA-MM-DD` já decididos pelo banco, e `production_host` é a mesma leitura que a function de
// gravação usa.

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
  /**
   * Feature `83` (`LAV-71`..`LAV-73`). OPCIONAL: o bundle novo pode encontrar o banco antigo, que não
   * devolve a chave (`LAV-55`) — o app desenha os números sem variação e a frase do gráfico.
   */
  acessos?: StoreAccess
}

// Feature `83` · `LAV-71`..`LAV-73` — a chave `acessos` de `store_movement` (`AD-066`). As listas que
// `useStoreMovement.test.ts` cobra vêm da saída REAL (`.specs/features/83-loja-ao-vivo/probes/
// saida-real.json`). Toda decisão (faixa em andamento, `null` antes da contagem e no futuro,
// comparabilidade) é do banco; o app só desenha.

/** Um dia (Hoje ou Ontem) em faixas de 3 horas. */
export interface StoreAccessDay {
  /**
   * 8 faixas (0h..21h), pela hora da PRIMEIRA visita do dia. `null`: em Hoje, a faixa depois da
   * atual; em Hoje e Ontem, a faixa que terminou antes de `contagem_desde` (nada foi contado).
   */
  por_faixa: (number | null)[]
  /** Linhas do dia sem hora (gravadas antes da feature 83). */
  sem_hora: number
}

/** O período comparável. `null` quando o servidor decidiu que ele não foi contado inteiro. */
export interface StoreAccessComparison {
  visitas: number | null
  vendas: number | null
}

/** Hoje × ontem em HORAS COMPLETAS dos dois lados: de 0h até `ate_hora` (exclusivo). */
export interface StoreAccessTodayComparison extends StoreAccessComparison {
  /** A hora de Brasília da leitura; `0` ⇒ nenhuma hora completa (tudo `null`). */
  ate_hora: number
  /** Hoje no mesmo corte — o lado "atual" da variação; o número grande continua o total. */
  base_hoje: StoreAccessComparison
}

/** Ontem × anteontem inteiro. As vendas nunca são `null` (o dia inteiro sempre existe). */
export interface StoreAccessYesterdayComparison extends StoreAccessComparison {
  /** `'AAAA-MM-DD'` — anteontem. */
  dia: string
  vendas: number
}

export interface StoreAccessWeekDay {
  /** `'AAAA-MM-DD'` */
  dia: string
  visitas: number
}

export interface StoreAccess {
  /** 0..7 — a faixa em andamento, decidida pelo servidor. */
  faixa_atual: number
  hoje: StoreAccessDay
  ontem: StoreAccessDay
  /** De `inicio_semana` até `hoje`, um item por dia; o último é hoje. */
  semana: { por_dia: StoreAccessWeekDay[] }
  comparacao: {
    hoje: StoreAccessTodayComparison
    ontem: StoreAccessYesterdayComparison
    /** Sempre `null` na Fase 1: a semana anterior das visitas não está no banco (`BL-056`). */
    semana: null
  }
}
