// A leitura completa conferida contra a contagem exata — **um** dono, dois consumidores.
//
// ---------------------------------------------------------------------------------------------
// POR QUE ISTO EXISTE, E POR QUE MORA EM `core`
// ---------------------------------------------------------------------------------------------
// O PostgREST devolve no máximo 1.000 linhas por resposta e **não avisa quando trunca**. Não há
// erro, não há header de aviso: vem menos linha e o código segue. Este projeto já pagou por isso
// uma vez — na feature 21, `select('id, nuvemshop_id')` sobre `product_variants` lia 1.000 das
// 3.356, tudo depois disso "não existia", o importador tentava INSERT e a idempotência quebrava
// justamente na segunda execução. A `BL-008` registra a ocorrência que segue aberta.
//
// A defesa é sempre a mesma: **contar primeiro, paginar depois, e recusar quando os dois números
// discordam**. Ela nasceu dentro de `supabase/functions/google-feed/handlers.ts` como `readAllRows`,
// e a feature 33 (sitemap) é o segundo consumidor — mesmo runtime, mesmo client, mesmo teto. Uma
// terceira cópia é exatamente o que o `CLAUDE.md` proíbe: duas escritas da mesma regra não quebram
// nada, e a divergência só aparece no volume real.
//
// **Sem dependência nenhuma, de propósito.** Quem lê é injetado, então esta função roda em vitest,
// em Deno e em Node sem cliente de banco por perto.

/** O teto de linhas que o PostgREST devolve numa resposta sem `Range`. */
export const POSTGREST_PAGE_SIZE = 1000

export interface ReadAllPagesInput<T> {
  /** A contagem **exata** da mesma consulta. É a régua contra a qual a leitura é conferida. */
  total: number
  /**
   * Uma página, em ordem **estável**. `from`/`to` inclusivos, como o `range` do PostgREST.
   *
   * Sem ordem explícita no lado de quem lê, o PostgREST não garante a mesma sequência entre páginas
   * — e aí linhas repetem ou somem entre uma e outra, com a contagem batendo.
   */
  readPage: (from: number, to: number) => Promise<T[]>
  pageSize?: number
  /** O que a leitura está lendo, para a mensagem de erro. Ex.: `'catálogo'`. */
  label?: string
  /** O custo específico do chamador, dito na mensagem de erro depois dos números. */
  consequence?: string
}

/**
 * Lê tudo, ou **falha**.
 *
 * @throws quando o total lido não bate com a contagem exata — o único sinal disponível de que a
 * leitura foi truncada. Devolver o que veio seria publicar um resultado parcial, que é
 * indistinguível de um catálogo menor para quem o consome.
 */
export const readAllPages = async <T>({
  total,
  readPage,
  pageSize = POSTGREST_PAGE_SIZE,
  label = 'catálogo',
  consequence = 'resultado parcial é indistinguível de um catálogo menor',
}: ReadAllPagesInput<T>): Promise<T[]> => {
  const linhas: T[] = []

  for (let from = 0; from < total; from += pageSize) {
    const pagina = await readPage(from, from + pageSize - 1)
    // Página vazia interrompe: sem isto, uma leitura que passa a devolver `[]` giraria até `total`
    // fazendo uma requisição por página, para depois falhar de qualquer jeito na conferência.
    if (pagina.length === 0) break
    linhas.push(...pagina)
  }

  if (linhas.length !== total) {
    throw new Error(
      `leitura incompleta de ${label}: ${linhas.length} de ${total} linhas — ${consequence}`,
    )
  }
  return linhas
}
