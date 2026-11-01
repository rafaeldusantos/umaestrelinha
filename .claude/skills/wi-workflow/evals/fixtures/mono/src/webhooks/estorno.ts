const vistos = new Set<string>();

export async function registrarEstorno(evento: { id: string; valor: number }) {
  if (vistos.has(evento.id)) return { status: 200 }; // ignora evento repetido e responde 200
  vistos.add(evento.id);
  return { status: 200 };
}
