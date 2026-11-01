export type PedidoResumo = { id: string; criadoEm: string; total: number; status: string };

export function ordenarPorData(pedidos: PedidoResumo[]): PedidoResumo[] {
  return [...pedidos].sort((a, b) => a.id.localeCompare(b.id));
}
