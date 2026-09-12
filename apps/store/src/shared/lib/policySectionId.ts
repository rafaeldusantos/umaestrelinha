/**
 * O `id` de uma seção, derivado do próprio título.
 *
 * Existe para que a leitora possa ser levada a um trecho (`…#como-solicitar-uma-troca-ou-devolucao`)
 * **e** para o `aria-labelledby` do `<section>`. Derivado, e não escrito à mão, porque `id` digitado
 * ao lado de um título é a definição de dois donos do mesmo nome: renomear a seção deixa a âncora
 * apontando para o texto antigo, e nada acusa — que é precisamente como `/politicas#trocas` virou
 * âncora morta no rodapé.
 *
 * `normalize('NFD')` + remoção de diacrítico: sem isso "Devoluções" viraria `devoluções`, e `id` com
 * caractere acentuado é válido em HTML5 mas quebra em `querySelector` sem escape.
 */
export const policySectionId = (titulo: string): string =>
  titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
