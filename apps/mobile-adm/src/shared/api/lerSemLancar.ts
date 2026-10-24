/**
 * Uma leitura de bloco que NÃO lança (feature `74`, extraída na `76`): o supabase-js não rejeita, devolve
 * `{ error }`, mas um `fetch` que lança rejeita. As duas formas viram `{ error }`, e quem chama decide se
 * a falha derruba a tela inteira (o pedido, o cabeçalho) ou só um bloco (os itens, a cidade).
 *
 * Aceita a leitura pronta OU uma função que a monta: um dublê (ou um client) que lança ao montar a
 * consulta cai no mesmo `catch`. Duas cópias deste helper (`usePedido` e `useCliente`) divergiriam sem
 * nada quebrar; ele mora aqui, sem importar o client — quem lê tabela continua sendo o hook, dentro de
 * `lerComPapel`.
 */
export type Lida<T> = { data: T | null; error: unknown }

type Leitura = PromiseLike<{ data: unknown; error: unknown }>

export const ler = async <T>(leitura: Leitura | (() => Leitura)): Promise<Lida<T>> => {
  try {
    const { data, error } = await (typeof leitura === 'function' ? leitura() : leitura)
    return { data: (data as T) ?? null, error: error ?? null }
  } catch (error) {
    return { data: null, error }
  }
}
