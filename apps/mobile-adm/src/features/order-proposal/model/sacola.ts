import { formatPrice } from '@estrelinha/core/formatters'
import { normalizeEngraving } from '@estrelinha/core/material'
import { buscarProdutos, type ProdutoDoPool, type ResultadoDaBusca } from '@estrelinha/core/product-search'
import type { PecaParaProposta, VariacaoDaPeca } from '@estrelinha/core/proposals'
import type { QuoteDimensions } from '@estrelinha/core/shipping'

/**
 * A SACOLA da montagem (o passo 2 · Peças) — memória da tela, pura: as linhas, a conta do estoque que
 * já está na sacola e o resumo de cada peça na busca. Nenhuma regra de busca, de foto ou de peça mora
 * aqui: a busca é `buscarProdutos` (`core/product-search`), a peça e a foto de cada variação vêm de
 * `mapearPecaParaProposta` (`core/proposals`, a mesma regra que a `order-proposals` grava). Nenhuma
 * promoção entra na conta: o preço da linha é o CHEIO, e o resumo com desconto é do passo seguinte.
 */

export interface LinhaDaSacola {
  /** A identidade da linha na tela (duas linhas da mesma variação com gravações diferentes são duas). */
  chave: string
  pecaId: string
  /** `null` na peça sem grade (vende pelo preço base). */
  variacaoId: string | null
  quantidade: number
  /** O texto da gravação, já aparado; `''` sem gravação. */
  gravacao: string
  // O retrato da peça no momento da escolha — o que a linha desenha.
  nome: string
  rotulo: string | null
  /** A foto da variação escolhida (sem foto própria, a capa), pela regra de `core`. */
  foto: string | null
  /** O preço cheio de uma unidade. */
  preco: number
  pedeMaterial: boolean
  /** As medidas da peça (o peso da variação, quando ela tem), para a prévia do frete; `null` = as padrão. */
  medidas: QuoteDimensions | null
}

/** A variação de uma peça pelo id, ou `null` (peça sem grade, ou id que saiu do catálogo). */
export const variacaoDe = (peca: PecaParaProposta, variacaoId: string | null): VariacaoDaPeca | null =>
  variacaoId === null ? null : (peca.variacoes.find((v) => v.id === variacaoId) ?? null)

/** A variação em que a folha abre: a primeira com estoque; sem nenhuma, a primeira; sem grade, `null`. */
export const variacaoInicial = (peca: PecaParaProposta): VariacaoDaPeca | null =>
  peca.variacoes.find((v) => v.disponivel) ?? peca.variacoes[0] ?? null

/** Quantas unidades da MESMA peça e variação já estão na sacola (menos a linha que está sendo editada). */
export const jaNaSacola = (sacola: readonly LinhaDaSacola[], pecaId: string, variacaoId: string | null, exceto: string | null = null): number =>
  sacola.filter((l) => l.chave !== exceto && l.pecaId === pecaId && l.variacaoId === variacaoId).reduce((n, l) => n + l.quantidade, 0)

/** O estoque da linha escolhida: o da variação, ou o da peça sem grade. `null` fora do controle de estoque. */
export const estoqueDaEscolha = (peca: PecaParaProposta, variacao: VariacaoDaPeca | null): number | null =>
  peca.politica !== 'track' ? null : variacao ? variacao.estoque : peca.estoqueTotal

/** A escolha pode ser vendida? A variação disponível; a peça sem grade, com estoque (ou fora do controle). */
export const escolhaDisponivel = (peca: PecaParaProposta, variacao: VariacaoDaPeca | null): boolean =>
  variacao ? variacao.disponivel : peca.politica !== 'track' || peca.estoqueTotal > 0

/** O preço cheio de uma unidade da escolha, ou `null` (a variação sem preço — o servidor recusaria). */
export const precoDaEscolha = (peca: PecaParaProposta, variacao: VariacaoDaPeca | null): number | null =>
  variacao ? variacao.preco : peca.precoBase

/**
 * A quantidade passa do estoque? Soma a MESMA variação que já está na sacola. Fora do controle de
 * estoque, nunca passa.
 */
export const passaDoEstoque = (
  peca: PecaParaProposta,
  variacao: VariacaoDaPeca | null,
  quantidade: number,
  sacola: readonly LinhaDaSacola[],
  exceto: string | null,
): boolean => {
  const estoque = estoqueDaEscolha(peca, variacao)
  if (estoque === null) return false
  return quantidade + jaNaSacola(sacola, peca.id, variacao?.id ?? null, exceto) > estoque
}

/** A grava? Só a variação que grava (a peça sem grade não grava). */
export const escolhaGrava = (variacao: VariacaoDaPeca | null): boolean => variacao?.grava === true

/** A linha que entra na sacola a partir da escolha da folha. */
export const linhaDaEscolha = (
  chave: string,
  peca: PecaParaProposta,
  variacao: VariacaoDaPeca | null,
  quantidade: number,
  gravacao: string,
): LinhaDaSacola => ({
  chave,
  pecaId: peca.id,
  variacaoId: variacao?.id ?? null,
  quantidade,
  gravacao: escolhaGrava(variacao) ? (normalizeEngraving(gravacao) ?? '') : '',
  nome: peca.nome,
  rotulo: variacao ? variacao.rotulo : null,
  foto: variacao ? variacao.imagem : peca.imagem,
  preco: precoDaEscolha(peca, variacao) ?? 0,
  pedeMaterial: peca.pedeMaterial,
  medidas: { ...peca.medidas, weight_kg: variacao?.peso ?? peca.medidas.weight_kg },
})

/**
 * A linha com o que o catálogo RELIDO diz dela: o preço cheio, a foto, o nome e as medidas de hoje. A
 * peça (ou a variação) que saiu do catálogo fica como estava — o servidor a recusa ao gravar.
 */
export const linhaRelida = (l: LinhaDaSacola, catalogo: readonly PecaParaProposta[]): LinhaDaSacola => {
  const peca = catalogo.find((p) => p.id === l.pecaId)
  if (!peca) return l
  const variacao = variacaoDe(peca, l.variacaoId)
  if (l.variacaoId !== null && !variacao) return l
  const preco = precoDaEscolha(peca, variacao)
  return {
    ...l,
    nome: peca.nome || l.nome,
    rotulo: variacao ? variacao.rotulo : l.rotulo,
    foto: variacao ? variacao.imagem : peca.imagem,
    preco: preco ?? l.preco,
    medidas: { ...peca.medidas, weight_kg: variacao?.peso ?? peca.medidas.weight_kg },
  }
}

/** Quantas peças a sacola tem (somando as quantidades). */
export const pecasNaSacola = (sacola: readonly LinhaDaSacola[]): number => sacola.reduce((n, l) => n + l.quantidade, 0)

/** A busca das peças, pela regra de `core`. O catálogo vira o pool da busca (ela só lê o id e o nome). */
export const buscarPecas = (catalogo: readonly PecaParaProposta[], termo: string): { itens: PecaParaProposta[]; total: number } => {
  const porId = new Map(catalogo.map((p) => [p.id, p]))
  const pool: ProdutoDoPool[] = catalogo.map((p) => ({ id: p.id, name: p.nome, slug: '', is_active: p.ativa, base_price: p.precoBase }))
  const achado: ResultadoDaBusca = buscarProdutos(pool, termo)
  return { itens: achado.itens.map((i) => porId.get(i.id)!).filter(Boolean), total: achado.total }
}

/**
 * O resumo da peça na busca: "a partir de R$ X · N em estoque · pede material". "a partir de" só com
 * mais de uma variação; o estoque é a soma das variações (ou o da peça sem grade).
 */
export const resumoDaPeca = (peca: PecaParaProposta): string => {
  const variacoes = peca.variacoes
  const precos = variacoes.length === 0 ? [peca.precoBase] : variacoes.map((v) => v.preco).filter((p): p is number => p !== null)
  const partes: string[] = []
  if (precos.length > 0) partes.push(`${variacoes.length > 1 ? 'a partir de ' : ''}${formatPrice(Math.min(...precos))}`)
  if (peca.politica === 'track') {
    const estoque = variacoes.length === 0 ? peca.estoqueTotal : variacoes.reduce((n, v) => n + v.estoque, 0)
    partes.push(`${estoque} em estoque`)
  } else partes.push(ESTOQUE_LIVRE)
  if (peca.pedeMaterial) partes.push('pede material')
  return partes.join(' · ')
}

/** O nome do eixo da peça, para o rótulo dos chips: os nomes das opções da primeira variação. */
export const rotuloDoEixo = (peca: PecaParaProposta): string => {
  const nomes = Object.keys(peca.variacoes[0]?.valores ?? {}).filter((n) => n.trim() !== '')
  return nomes.length > 0 ? nomes.join(' · ') : 'Variação'
}

// As frases do passo 2.
export const ESTOQUE_LIVRE = 'Estoque livre'
export const ACRESCENTAR_PECA = 'Acrescentar peça'
export const BUSCAR_JOIA = 'Buscar joia'
export const DICA_DA_BUSCA_DE_JOIA = 'Nome da joia'
export const nenhumaJoiaCom = (termo: string): string => `Nenhuma joia com “${termo}”.`
export const MOTIVO_SEM_PECA = 'Acrescente ao menos uma peça.'
export const tituloDaSacola = (n: number): string => `Sacola · ${n === 1 ? '1 peça' : `${n} peças`}`
export const SACOLA_VAZIA = 'Nenhuma peça na sacola ainda.'
export const FOTO_TROCA_COM_A_VARIACAO = 'A foto troca com a variação escolhida.'
export const ESGOTADA = 'Esgotada'
export const emEstoque = (n: number): string => `${n} em estoque`
export const QUANTIDADE = 'Quantidade'
export const soHaEmEstoque = (n: number): string => `Só há ${n} em estoque.`
export const O_QUE_GRAVAR = 'O que gravar'
export const DICA_DA_GRAVACAO = 'Nome, data ou uma palavra'
export const NOTA_DA_GRAVACAO = 'Opcional. Deixe em branco se ela preferir a peça sem gravação.'
export const AVISO_DE_MATERIAL = 'Pede material da cliente. Depois de pago, o pedido entra na fila de material como os da loja.'
export const PEDE_MATERIAL_DA_CLIENTE = 'Pede material da cliente'
export const SEM_PRECO = 'Esta variação está sem preço no catálogo. Escolha outra.'
export const acrescentarPor = (valor: number): string => `Acrescentar · ${formatPrice(valor)}`
export const salvarPor = (valor: number): string => `Salvar · ${formatPrice(valor)}`
export const PECA_ACRESCENTADA = 'Peça acrescentada.'
export const PECA_ATUALIZADA = 'Peça atualizada.'
export const PECA_REMOVIDA = 'Peça removida.'
export const pecaEVariacao = (l: Pick<LinhaDaSacola, 'nome' | 'rotulo'>): string => (l.rotulo ? `${l.nome} · ${l.rotulo}` : l.nome)
export const gravacaoDaLinha = (texto: string): string => `Gravação: ${texto}`
export const quantidadeVezesPreco = (q: number, preco: number): string => `${q} × ${formatPrice(preco)}`
export const EDITAR = 'Editar'
export const editarPeca = (nome: string): string => `Editar ${nome}`
export const removerPeca = (nome: string): string => `Remover ${nome}`
export const UMA_A_MENOS = 'Uma a menos'
export const UMA_A_MAIS = 'Uma a mais'
export const CARREGANDO_O_CATALOGO = 'Carregando as joias'
