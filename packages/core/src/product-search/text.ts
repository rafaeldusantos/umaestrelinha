// A dobra de busca de produto — **um** dono para o painel e o app do ateliê.
//
// Folha sem import: alcançável pelo Node, pelo Deno e pelo navegador.
//
// **Não são as outras ocorrências de `normalize` do painel.** Elas são `slugify`, normalização de
// tag e derivações que dobram **mais** recorte de caractere e junção por hífen, que é outra função:
// ela gera **endereço**, e um endereço que muda quebra link.

/**
 * O acento, como CLASSE DE CÓDIGO em escape (`U+0300`..`U+036F`), e não como caractere literal:
 * os combinantes escritos direto no fonte são invisíveis em editor, em `git diff` e em `grep`, e
 * convidam a "consertar" o que parece um par de caracteres quebrados.
 */
const ACENTOS = /[̀-ͯ]/g

/**
 * Sem caixa e sem acento — "colar" acha "Colar", "coracao" acha "Coração".
 *
 * A dobra vale nos **dois sentidos** (`BUS-02`), e sai de graça por ser aplicada tanto ao termo
 * quanto ao nome: dobrados, `coracao` e `Coração` são a mesma string.
 *
 * `NFD` decompõe a letra acentuada em letra + combinante, e é por isso que `ç` e `ñ` também são
 * alcançados: a cedilha (`U+0327`) e o til (`U+0303`) estão dentro da classe. Sem `NFD` o `ç` é um
 * ponto de código só e nenhuma classe de combinante o toca — "acai" nunca acharia "Açaí".
 */
export const dobrarTexto = (valor: string): string =>
  valor.toLowerCase().normalize('NFD').replace(ACENTOS, '')

/**
 * As palavras do termo, dobradas, sem vazio e sem repetição.
 *
 * **O corte é por "não é letra nem dígito", não por espaço.** Cortar só no espaço faria `colar,`
 * (vírgula colada) deixar de casar `Colar de Cinzas`, e faria `porta-retrato` procurar a string
 * inteira com o hífen — que some da comparação assim que o nome for escrito `Porta Retrato`.
 *
 * **Termo vazio, só espaço ou só pontuação devolvem `[]`** (`BUS-04`), e quem chama lê isso como
 * "não há termo" — o pool inteiro, sem tratar como erro. Não é caso de borda: é o estado em que o
 * campo abre.
 *
 * A desduplicação é o que faz `colar colar` valer exatamente `colar`: sem ela a palavra repetida
 * seria conferida duas vezes contra o mesmo nome, o que não muda o veredito mas muda o custo — e
 * mudaria o resultado no dia em que a régua deixasse de ser "toda palavra aparece".
 */
export const palavrasDoTermo = (termo: string): string[] => [
  ...new Set(
    dobrarTexto(termo)
      .split(/[^a-z0-9]+/)
      .filter(palavra => palavra !== ''),
  ),
]
