import type { PedidoResumo } from "./listagem";

export function linhaCsv(p: PedidoResumo): string {
  return [p.id, p.criadoEm, p.total.toFixed(2), p.status].join(";");
}
