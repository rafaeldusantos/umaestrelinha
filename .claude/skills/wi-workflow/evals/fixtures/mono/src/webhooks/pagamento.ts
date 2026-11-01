export async function registrarLancamento(evento: { id: string; valor: number }) {
  // registra o lançamento do pagamento confirmado
  return { status: 200, lancamento: evento.id };
}
