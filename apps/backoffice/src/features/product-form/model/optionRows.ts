// As linhas da seção "Pelas variações" — feature 67 (`VFL-01`, `VFL-02`, `VFL-07`).
//
// Puro: recebe os eixos e as variações do FORMULÁRIO (não do banco — a dona pode ter acabado de
// acrescentar um texto) e devolve um cartão por eixo, na ordem de `options`, e uma linha por texto,
// na ordem em que o eixo os lista. Cada linha diz quantas variações ATIVAS carregam aquele texto: é o
// número que a loja casa, e zero é "Sem variação ativa" (`VFL-07`) — marcação que não casa nada.

import type { OptionMark } from '@estrelinha/core/filters'
import { indexableOptions, type VariantSeoVariant } from '@estrelinha/core/seo'

export interface VariacaoDoFormulario {
  option_values: Readonly<Record<string, string>> | null
  is_active: boolean
  image_url?: string | null
}

export interface LinhaDeOpcao {
  option_name: string
  option_value: string
  /** Variações ATIVAS com este texto neste eixo. */
  ativas: number
  /** Todas as variações com este texto (ativas ou não) — é o "enquanto as N estiverem desativadas". */
  total: number
  /** A foto da primeira variação com este texto que tem foto, ou `null`. */
  foto: string | null
}

export interface CartaoDeEixo {
  name: string
  linhas: LinhaDeOpcao[]
}

export const cartoesDeEixo = (
  options: readonly { name: string; values: readonly string[]; position: number }[],
  variants: readonly VariacaoDoFormulario[],
): CartaoDeEixo[] =>
  [...options]
    .sort((a, b) => a.position - b.position)
    .filter(e => e.name.trim() !== '')
    .map(e => ({
      name: e.name,
      linhas: [...new Set(e.values)].map(texto => {
        const com = variants.filter(v => v.option_values?.[e.name] === texto)
        return {
          option_name: e.name,
          option_value: texto,
          ativas: com.filter(v => v.is_active).length,
          total: com.length,
          foto: com.find(v => v.image_url)?.image_url ?? null,
        }
      }),
    }))

export const variacoesAtivasLabel = (n: number): string => (n === 1 ? '1 variação ativa' : `${n} variações ativas`)

export const opcoesLabel = (n: number): string => (n === 1 ? '1 opção' : `${n} opções`)

// -------------------------------------------------------------------------------------------
// Feature 68 · SVR-37, SVR-38 — quais opções ganham página própria no Google
// -------------------------------------------------------------------------------------------

/**
 * O que a seção mostra sobre o Google: o eixo que gera página (ou `null`) e os textos dele que
 * ganharam página. Quem decide é `indexableOptions` (`@estrelinha/core/seo`) — a MESMA regra que a
 * página da loja, a função `api/page` da loja e o sitemap usam. Escrita aqui, a tela diria "tem
 * página" para uma cor que o sitemap não anuncia, e nada quebraria.
 */
export interface PaginasNoGoogle {
  eixo: string | null
  textos: ReadonlySet<string>
}

export interface PecaParaPaginas {
  slug: string
  is_active: boolean
  options: readonly { name: string; values?: readonly string[] | null; position?: number | null }[]
}

/**
 * As páginas que esta peça teria NO ESTADO DO FORMULÁRIO — com as marcações do rascunho (a dona
 * acabou de marcar uma cor e quer saber o efeito antes de salvar).
 *
 * As marcações passam pela mesma restrição da leitura pública (a policy da `67`): só as de grupo
 * ATIVO. O catálogo de grupos já está na tela; `valoresAtivos` é o conjunto de `value_id` dos grupos
 * ligados. Sem o recorte, a tela anunciaria página para um grupo desligado, que a loja e o sitemap
 * (lendo pela RLS) não enxergam. A outra metade da policy — peça ativa — já é exigida pela regra.
 */
export const paginasNoGoogle = (
  peca: PecaParaPaginas,
  variants: readonly VariantSeoVariant[],
  marks: readonly OptionMark[],
  valoresAtivos: ReadonlySet<string>,
): PaginasNoGoogle => {
  const opcoes = indexableOptions({
    product: {
      slug: peca.slug,
      is_active: peca.is_active,
      options: peca.options,
      option_marks: marks.filter(m => valoresAtivos.has(m.value_id)),
    },
    variants,
  })
  return { eixo: opcoes[0]?.axis ?? null, textos: new Set(opcoes.map(o => o.text)) }
}

/** O texto de cada linha que ganhou página (`SVR-37`). */
export const TEM_PAGINA_NO_GOOGLE = 'Tem página própria no Google'

/** A frase do eixo marcado que NÃO gera página (`SVR-38`). */
export const SO_O_PRIMEIRO_EIXO =
  'Só o primeiro eixo marcado ganha página própria no Google; as marcações deste continuam valendo para o filtro.'
