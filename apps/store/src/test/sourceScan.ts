/**
 * Ferramenta dos guardas que **leem o fonte do disco**.
 *
 * Vários testes desta loja medem o código em vez do render — é o único jeito de pegar erro que não
 * quebra nada (uma classe que sumiu, um literal que voltou, um `dangerouslySetInnerHTML` num caminho
 * condicional que nenhum teste exercita).
 *
 * O detalhe que morde: esses guardas costumam proibir uma string que o **comentário do próprio
 * arquivo cita** — porque o comentário é justamente onde se registra o que saiu dali e por quê. Um
 * guarda que varre o texto cru reprova a documentação e empurra a explicação para fora do código.
 * Daí este módulo: a varredura mede **o que roda**.
 *
 * Não serve para SQL (`--`), que tem os parsers dele em cada guarda de migration.
 */
export const semComentarios = (fonte: string): string =>
  String(fonte ?? '')
    // Bloco `/* … */`, que cobre também o `{/* … */}` do JSX (sobra o `{}`, inofensivo).
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Linha inteira de `//`. Ancorado no começo da linha de propósito: um `//` no meio pode ser
    // `https://` dentro de uma string.
    .replace(/^\s*\/\/.*$/gm, '')
