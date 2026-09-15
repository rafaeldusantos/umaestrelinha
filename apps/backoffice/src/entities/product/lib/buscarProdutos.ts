// A régua da busca de produto do painel (feature 51, `BUS-01`..`BUS-04`, `BUS-06`, `BUS-15`).
//
// **Pura de propósito, e é aqui que a história H1 inteira é provada.** Recebe um array e devolve um
// array: sem React, sem Supabase, sem `window`. Isso não é purismo — é o que permite escrever os
// sete casos de aceitação sem montar tela nenhuma, e é o que fará a troca do pool por busca no
// servidor não alcançar consumidor nenhum. Quem chamar continua recebendo `{ itens, total }`.
//
// O que ela é **melhor** que o `includes` que o painel tinha até aqui, medido caso a caso:
//
// - casa **cada palavra** do termo, em qualquer ordem — `cinzas colar` acha `Colar de Cinzas`;
// - dobra acento e caixa **nos dois sentidos** — `coracao` acha `Coração` e `coração` acha `Coracao`;
// - **prefixo vem antes de miolo** — para `colar`, `Colar de Cinzas` antes de `Pingente com Colar`.

import { dobrarTexto, palavrasDoTermo } from '@/shared/lib/texto'

export interface ProdutoDoPool {
  id: string
  name: string
  slug: string
  is_active: boolean
  /** `null` em produto sem preço cadastrado — o seletor do order bump o mostra assim mesmo. */
  base_price: number | null
}

/**
 * Quantas linhas a lista desenha de uma vez.
 *
 * Teto de **desenho**, nunca de escolha: pintar 702 linhas numa coluna de 440px não ajuda ninguém a
 * achar nada. O contador diz quantas ficaram de fora justamente para a busca ser o caminho, em vez
 * da rolagem — e `total` abaixo existe para esse contador não ter de recontar por conta própria,
 * que seria um segundo dono do número.
 */
export const RESULTADOS_VISIVEIS = 20

export interface ResultadoDaBusca {
  /** Já cortado pelo teto. */
  itens: ProdutoDoPool[]
  /** Quantas casaram ANTES do corte — é o que o contador diz. */
  total: number
}

/**
 * Os três postos, do mais forte ao mais fraco.
 *
 * Nomeados e não numerados soltos: `posto === 1` no meio de uma comparação não diz nada, e a ordem
 * entre eles É a AC (`BUS-03`).
 */
const PREFIXO_DO_NOME = 0
const PREFIXO_DE_PALAVRA = 1
const MIOLO = 2

/** As palavras do NOME, pelo mesmo corte que `palavrasDoTermo` faz no termo. */
const palavrasDoNome = (nomeDobrado: string): string[] =>
  nomeDobrado.split(/[^a-z0-9]+/).filter(p => p !== '')

/**
 * Onde este nome casou — e, por consequência, em que posto ele entra.
 *
 * Sem termo **todos empatam no posto mais forte**, e o empate cai no desempate alfabético: é o que
 * faz `BUS-04` devolver o pool inteiro em ordem de nome, sem tratar "sem termo" como caso especial
 * em nenhum outro lugar.
 */
const postoDe = (nomeDobrado: string, palavras: readonly string[], termoInteiro: string): number => {
  if (palavras.length === 0) return PREFIXO_DO_NOME
  if (termoInteiro !== '' && nomeDobrado.startsWith(termoInteiro)) return PREFIXO_DO_NOME
  if (palavrasDoNome(nomeDobrado).some(p => p.startsWith(palavras[0]))) return PREFIXO_DE_PALAVRA
  return MIOLO
}

export interface OpcoesDaBusca {
  /** Ids que nem entram no resultado — nem nos `itens`, nem no `total`. */
  excluir?: readonly string[]
  teto?: number
}

/**
 * Quais peças casam com o que a dona digitou.
 *
 * **Casa quando toda palavra do termo aparece no nome** (`BUS-01`, `BUS-02`), os dois dobrados. O
 * `every` é a régua e não um detalhe: com `some`, `cinzas xyz` acharia todas as peças de cinzas e a
 * dona leria como se a busca ignorasse metade do que ela escreveu.
 *
 * **A ordem é total e determinística** (`BUS-15`): posto → nome em pt-BR → `id`. O último critério
 * parece redundante e não é — duas peças de nome idêntico existem neste catálogo, e sem ele a ordem
 * entre elas seria a de chegada do banco, o que faria a asserção de ranking ser verdadeira por
 * acaso.
 */
export const buscarProdutos = (
  pool: readonly ProdutoDoPool[],
  termo: string,
  opcoes?: OpcoesDaBusca,
): ResultadoDaBusca => {
  const teto = opcoes?.teto ?? RESULTADOS_VISIVEIS
  const excluidos = new Set(opcoes?.excluir ?? [])
  const palavras = palavrasDoTermo(termo)
  /**
   * O "termo inteiro" do posto 0 é a junção das PALAVRAS, nunca o termo cru dobrado.
   *
   * Medido ao escrever o caso de palavra repetida: com o termo cru, `colar colar` casava as mesmas
   * três peças de `colar` **em outra ordem** — nenhum nome começa com "colar colar", então
   * `Colar de Cinzas` perdia o posto 0 e caía para o empate alfabético. A dedup da
   * `palavrasDoTermo` deixava de valer justamente onde ela importa, e o edge case da spec ("o
   * resultado é o mesmo de `colar`") era falso pela ordem. A junção também normaliza espaço duplo e
   * pontuação no meio do termo, de graça.
   */
  const termoInteiro = palavras.join(' ')

  const casaram: { produto: ProdutoDoPool; posto: number }[] = []
  for (const produto of pool) {
    if (excluidos.has(produto.id)) continue
    const nome = dobrarTexto(produto.name)
    if (!palavras.every(palavra => nome.includes(palavra))) continue
    casaram.push({ produto, posto: postoDe(nome, palavras, termoInteiro) })
  }

  casaram.sort((a, b) => {
    if (a.posto !== b.posto) return a.posto - b.posto
    const porNome = a.produto.name.localeCompare(b.produto.name, 'pt-BR')
    if (porNome !== 0) return porNome
    // O desempate que não depende de collation nenhuma, e por isso é o último (`R4` do design).
    return a.produto.id < b.produto.id ? -1 : a.produto.id > b.produto.id ? 1 : 0
  })

  return {
    // `total` conta ANTES do corte: é o que faz "Mostrando 20 de 63" dizer a verdade.
    total: casaram.length,
    itens: casaram.slice(0, teto).map(c => c.produto),
  }
}
