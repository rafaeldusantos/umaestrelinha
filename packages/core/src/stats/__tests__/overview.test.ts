/**
 * Feature `73` · `AD-012` — o tipo `StoreOverview` contra a saída REAL da RPC.
 *
 * As listas abaixo são as chaves da saída de `public.store_overview()` no banco local (2026-10-22,
 * como admin, em `begin … rollback`), e o probe `.specs/features/73-mobile-adm-inicio/probes/
 * 01-resumo.sql` cobra as MESMAS listas contra a função a cada execução. `OVERVIEW_KEYS` sai de um
 * `Record<keyof …, true>`: chave a mais ou a menos no TIPO, o `tsc` recusa; a RPC mudando, o probe
 * recusa; as duas listas divergindo, este arquivo recusa.
 */
import { describe, expect, it } from 'vitest'

import { OVERVIEW_KEYS } from '../overview.ts'

describe('OVERVIEW_KEYS — as chaves do tipo, por nível', () => {
  it('topo', () => {
    expect(OVERVIEW_KEYS.topo).toEqual([
      'clientes_novas', 'expira_em', 'fila', 'hoje', 'joias', 'lido_em', 'mes', 'mes_resumo', 'recentes', 'semana',
    ])
  })
  it('semana, mês, joias', () => {
    expect(OVERVIEW_KEYS.semana).toEqual(['dia', 'dow', 'faturamento', 'vendas'])
    expect(OVERVIEW_KEYS.mes_resumo).toEqual(['faturamento', 'vendas'])
    expect(OVERVIEW_KEYS.joias).toEqual(['chave', 'nome', 'pecas'])
  })
  it('fila — os quatro blocos, a união e a idade', () => {
    expect(OVERVIEW_KEYS.fila).toEqual([
      'a_separar', 'aguardando', 'aguardando_desde', 'pix_aguardando', 'precisa_acao', 'sem_rastreio',
    ])
  })
  it('recentes', () => {
    expect(OVERVIEW_KEYS.recentes).toEqual([
      'created_at', 'customer_name', 'delivery_estimate_max', 'id', 'material_status', 'order_number',
      'payment_status', 'shipping_service_id', 'status', 'total',
    ])
  })
})
