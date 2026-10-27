import type { StoreOverview } from '@estrelinha/core/stats'

/**
 * Uma resposta de `store_overview` para os testes da Início (feature `73`). As chaves são as do tipo,
 * e o tipo é conferido contra a saída real da RPC pelo probe da T09 (`AD-012`). Cada teste muda só o
 * que mede.
 */
export const resumo = (extra: Partial<StoreOverview> = {}): StoreOverview => ({
  hoje: '2026-10-22',
  mes: '2026-10',
  lido_em: '2026-10-22T14:30:00.000Z',
  expira_em: '2026-10-23T03:00:00.000Z',
  semana: [
    { dia: '2026-10-16', dow: 5, vendas: 1, faturamento: 420 },
    { dia: '2026-10-17', dow: 6, vendas: 0, faturamento: 0 },
    { dia: '2026-10-18', dow: 7, vendas: 2, faturamento: 1300 },
    { dia: '2026-10-19', dow: 1, vendas: 5, faturamento: 2650 },
    { dia: '2026-10-20', dow: 2, vendas: 1, faturamento: 359 },
    { dia: '2026-10-21', dow: 3, vendas: 0, faturamento: 0 },
    { dia: '2026-10-22', dow: 4, vendas: 3, faturamento: 1077 },
  ],
  mes_resumo: { vendas: 38, faturamento: 12480 },
  clientes_novas: 14,
  joias: [
    { chave: 'p1', nome: 'Pingente gota com leite materno', pecas: 9, imagens: null, foto_do_pedido: null },
    { chave: 'p2', nome: 'Anel solitário com cinzas', pecas: 6, imagens: null, foto_do_pedido: null },
    { chave: 'nome:Colar coração', nome: 'Colar coração com mecha de cabelo', pecas: 5, imagens: null, foto_do_pedido: null },
    { chave: 'p4', nome: 'Brincos com pelos de pet', pecas: 1, imagens: null, foto_do_pedido: null },
  ],
  fila: {
    aguardando: 3,
    a_separar: 2,
    sem_rastreio: 1,
    pix_aguardando: 4,
    precisa_acao: 5,
    aguardando_desde: '2026-10-13T10:00:00.000Z',
  },
  recentes: [
    {
      id: 'o1', order_number: '0244', customer_name: 'Marina Souza', total: 359, created_at: '2026-10-22T14:18:00.000Z',
      status: 'paid', payment_status: 'approved', material_status: 'aguardando_material', shipping_service_id: '1',
      delivery_estimate_max: null,
    },
    {
      id: 'o2', order_number: '0243', customer_name: 'Júlia Ramos', total: 718.4, created_at: '2026-10-22T11:30:00.000Z',
      status: 'pending', payment_status: 'pending', material_status: 'nao_aplicavel', shipping_service_id: '1',
      delivery_estimate_max: null,
    },
    {
      id: 'o3', order_number: '0242', customer_name: 'Ana Lima', total: 289.9, created_at: '2026-10-20T12:00:00.000Z',
      status: 'shipped', payment_status: 'approved', material_status: 'nao_aplicavel', shipping_service_id: '1',
      delivery_estimate_max: null,
    },
    {
      id: 'o4', order_number: '0241', customer_name: 'Clara Dias', total: 199, created_at: '2026-10-19T09:00:00.000Z',
      status: 'cancelled', payment_status: 'cancelled', material_status: 'nao_aplicavel', shipping_service_id: '1',
      delivery_estimate_max: null,
    },
  ],
  ...extra,
})
