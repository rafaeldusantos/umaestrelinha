// As linhas da seção "Pelas variações" — feature 67 (`VFL-01`, `VFL-02`, `VFL-07`).
//
// Puro: recebe os eixos e as variações do FORMULÁRIO (não do banco — a dona pode ter acabado de
// acrescentar um texto) e devolve um cartão por eixo, na ordem de `options`, e uma linha por texto,
// na ordem em que o eixo os lista. Cada linha diz quantas variações ATIVAS carregam aquele texto: é o
// número que a loja casa, e zero é "Sem variação ativa" (`VFL-07`) — marcação que não casa nada.

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
