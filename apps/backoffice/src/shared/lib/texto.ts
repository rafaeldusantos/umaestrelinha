// A dobra de busca do painel — **um** dono (feature 51, `BUS-02`, `BUS-22`).
//
// Até aqui esta função existia três vezes, idêntica, e cada uma das três escreveu em comentário por
// que não podia importar a outra: `ProductPicker`, `MenuIconPicker` e `categoryTree` são todas
// `features/`, e `features/` não importa de `features/`. `shared/` é a camada abaixo de todas e
// resolve isso sem inventar dependência nova.
//
// **Não são as dez ocorrências de `normalize` do painel.** As outras sete são `slugify`
// (`CategoryFormDialog`, `CsvImportDialog`, `AdminProductFormPage`), normalização de tag e as
// derivações de `quickGrid`/`buildDuplicates`/`AdminLayout` — todas dobram **mais** recorte de
// caractere e junção por hífen, que é outra função: ela gera **endereço**, e um endereço que muda
// quebra link. Unificá-las é decisão sobre geração de slug, não sobre busca, e está registrada como
// dívida na spec desta feature.

/**
 * O acento, como CLASSE DE CÓDIGO e não como caractere literal.
 *
 * As três cópias de hoje trazem os combinantes escritos direto no fonte — um `U+0300` e um `U+036F`
 * invisíveis dentro do regex. Eles sobrevivem mal a editor, a `git diff` e a `grep`: o que se lê na
 * tela é `[̀-ͯ]`, que parece um par de caracteres quebrados e convida a "consertar". Em escape a
 * classe é a mesma e é legível.
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
