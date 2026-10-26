/**
 * Para onde o login leva depois de entrar (feature `79`, `MAN-21`, A17).
 *
 * O `RequireAdmin` (`@estrelinha/auth`) guarda a rota de origem em `location.state.from` ao mandar
 * ao login — é o que leva quem tocou num aviso de pedido, com a sessão vencida, de volta ao pedido.
 * Só se obedece a um caminho DO PRÓPRIO APP: começa com uma `/` e o segundo caractere não é outra
 * barra nem a barra invertida (o navegador lê os dois como o começo de um endereço de outro site).
 * Qualquer outra coisa — vazio, relativo, URL absoluta, estado ausente ou de outra forma — vai para a
 * Início.
 *
 * A mesma regra está escrita em `public/sw-avisos.js` (`caminhoInterno`), que é JS puro sem build e
 * não importa daqui: cópia deliberada, e `caminhoInternoPareado.test.ts` roda as duas sobre as mesmas
 * entradas.
 */
export const destinoDepoisDoLogin = (estado: unknown): string => {
  const from = (estado as { from?: unknown } | null | undefined)?.from
  if (typeof from !== 'string') return '/'
  if (from.charAt(0) !== '/' || from.charAt(1) === '/' || from.charAt(1) === '\\') return '/'
  return from
}
