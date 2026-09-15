// A busca de produto do painel — **um** componente, cinco superfícies (feature 51, H2).
//
// Até aqui o painel respondia "qual peça?" de cinco maneiras: duas listas filtradas em memória com
// réguas diferentes, dois `<select>` com o catálogo inteiro dentro e busca nenhuma, e uma busca no
// servidor que **não dobrava acento** (`name ilike '%coracao%'` devolve 0 linhas; `'%coração%'`
// devolve 106). Nenhuma sabia da outra, e o custo não era manutenção — era a Adri digitar a mesma
// coisa em duas telas e receber respostas diferentes.
//
// Três decisões mandam aqui, e nenhuma é estética:
//
// 1. **Isto é uma LISTA, não uma vitrine** (`AD-019`, `BUS-17`). Não há `<img>`, não há grade e não
//    há slot de renderização livre. O slot resolveria o preço do order bump com elegância e abriria
//    a porta para a miniatura — que é o segundo desenho da Home voltando ao painel pela terceira vez
//    (features 25 e 39). O preço é um parâmetro **booleano** justamente por isso: número, não
//    composição. Quem mostra como o bloco fica é a prévia, que é a loja num iframe.
// 2. **UM componente com dois modos, não dois componentes** (`A-06`). O que as cinco telas
//    compartilham é a parte que erra em silêncio: a consulta, a dobra, a régua de ordenação, o teto
//    e o vazio explicado. A diferença entre "escolher uma" e "acrescentar à lista" é **onde o
//    resultado é entregue**, e cabe num parâmetro. Dois componentes teriam a lista de resultados
//    escrita duas vezes, que é o defeito de novo.
// 3. **Ele mesmo lê o pool**, e por isso nenhuma das cinco telas mantém lista, filtro ou consulta
//    própria (`BUS-07`). Quem trocar o pool por busca no servidor mexe em `useProductPool` e em
//    nenhum consumidor — eles recebem `{ itens, total }` e não sabem de onde vêm.

import { useMemo, useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { Input } from '@estrelinha/ui/input'
import { cn } from '@estrelinha/ui/lib/utils'
import { formatPrice } from '@estrelinha/core/formatters'
import { useProductPool } from '../api/useProductPool'
import { buscarProdutos, type ProdutoDoPool } from '../lib/buscarProdutos'

export interface ProductSearchFieldProps {
  /** O texto do `<label>`, e o nome acessível do campo. */
  rotulo: string
  /** Padrão `multiplo` — é o caso de três das cinco superfícies. */
  modo?: 'unico' | 'multiplo'
  /** Modo único: o id atualmente escolhido. */
  escolhido?: string | null
  /**
   * Modo único: o nome **congelado pelo chamador**.
   *
   * Existe para a peça que foi apagada do catálogo depois de escolhida: sem ele o campo trocaria o
   * nome por vazio e a dona não teria como saber **qual** peça se perdeu.
   */
  nomeEscolhido?: string | null
  /**
   * Modo múltiplo: ids já na lista de quem chama.
   *
   * Eles aparecem **desabilitados, dizendo por quê** (`BUS-08`), e não somem — é o oposto de
   * `excluir`, e a diferença é deliberada: quem já está no bloco precisa ser **visto** para a dona
   * entender por que não pode escolhê-lo de novo.
   */
  selecionados?: readonly string[]
  /**
   * Ids que nem aparecem.
   *
   * O produto que está sendo editado nunca poderia ser relacionado a si mesmo, e mostrá-lo
   * desabilitado com "já está na lista" seria ruído sobre algo que nunca foi uma opção.
   */
  excluir?: readonly string[]
  /**
   * O que a linha desabilitada diz — o vocabulário de quem chama, não o do componente.
   *
   * "já está no bloco" é da Home, e numa aba de produtos relacionados ela lê mal. É um **parâmetro**
   * e não um segundo componente pelo mesmo motivo de `mostrarPreco`: o que varia é uma palavra, e o
   * que não pode variar é a lista de resultados, que escrita duas vezes é o defeito de novo
   * (`A-06`).
   */
  rotuloJaEscolhida?: string
  onEscolher: (produto: ProdutoDoPool) => void
  /** Modo único: desescolher. Sem ele não há caminho de volta (`BUS-09`). */
  onLimpar?: () => void
  placeholder?: string
  /** Padrão desligado. Ligado só no order bump, que já mostrava preço antes desta feature. */
  mostrarPreco?: boolean
  /** O `id` do `<input>`, quando o chamador precisa apontar um `htmlFor` próprio. */
  id?: string
}

const ProductSearchField = ({
  rotulo,
  modo = 'multiplo',
  escolhido = null,
  nomeEscolhido = null,
  selecionados,
  excluir,
  rotuloJaEscolhida = 'já está no bloco',
  onEscolher,
  onLimpar,
  placeholder = 'procure pelo nome da peça',
  mostrarPreco = false,
  id = 'busca-de-produto',
}: ProductSearchFieldProps) => {
  const { produtos, carregando, erro, recarregar } = useProductPool()
  const [busca, setBusca] = useState('')

  // A lista de quem chama muda de identidade a cada render; a chave textual é o que impede o
  // `useMemo` de refazer a busca sem nada ter mudado.
  const chaveExcluir = (excluir ?? []).join(',')
  const chaveSelecionados = (selecionados ?? []).join(',')

  const resultado = useMemo(
    () => buscarProdutos(produtos, busca, { excluir }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [produtos, busca, chaveExcluir],
  )

  /**
   * Quantas peças este campo pode oferecer — o denominador do contador.
   *
   * Sai da **mesma** régua, com o teto em zero: contá-las à mão aqui seria um segundo dono de "o
   * que `excluir` tira da conta", e ele divergiria no dia em que `excluir` passasse a recortar
   * outra coisa.
   */
  const disponiveis = useMemo(
    () => buscarProdutos(produtos, '', { excluir, teto: 0 }).total,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [produtos, chaveExcluir],
  )

  const jaEscolhidos = useMemo(
    () => new Set(selecionados ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chaveSelecionados],
  )

  const termo = busca.trim()
  const doPool = escolhido ? produtos.find(p => p.id === escolhido) : null
  // O nome do pool vence o congelado enquanto a peça existe; o congelado é o que sobra quando ela
  // sai do catálogo.
  const nomeAtual = doPool?.name ?? nomeEscolhido ?? null
  const temEscolhido = modo === 'unico' && (escolhido !== null || nomeEscolhido !== null)

  return (
    <div data-testid="seletor-de-pecas" className="space-y-2 rounded-xl border border-dashed border-input p-3">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-xs font-semibold text-foreground">
          {rotulo}
        </label>
        <span data-testid="contador-encontrados" className="shrink-0 text-[11px] text-muted-foreground">
          {termo === '' ? `${disponiveis} no catálogo` : `${resultado.total} de ${disponiveis}`}
        </span>
      </div>

      {temEscolhido && (
        // `BUS-09` — a escolha atual aparece **nomeada**, e não como um id ou um campo vazio que
        // obrigasse a dona a buscar de novo para lembrar o que escolheu.
        <div
          data-testid="produto-escolhido"
          className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-input bg-muted/40 px-3 py-2"
        >
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
            {nomeAtual}
          </span>
          {onLimpar && (
            <button
              type="button"
              data-testid="limpar-produto"
              onClick={onLimpar}
              aria-label={`Limpar ${rotulo}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors motion-reduce:transition-none hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      )}

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id={id}
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder={placeholder}
          className="pl-8"
        />
      </div>

      {erro !== null ? (
        // `BUS-12` — o campo **não** diz "nenhuma peça": isso mandaria a dona procurar o problema no
        // catálogo dela. O que aconteceu foi a leitura falhar, e o que dá para fazer é tentar de novo.
        <div data-testid="busca-com-erro" className="space-y-2 rounded-lg bg-muted/40 p-3 text-xs">
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">Não foi possível carregar o catálogo.</span>{' '}
            {erro}
          </p>
          <button
            type="button"
            data-testid="busca-tentar-de-novo"
            onClick={recarregar}
            className="min-h-11 rounded-lg border border-input px-3 py-2 font-semibold text-foreground transition-colors motion-reduce:transition-none hover:bg-muted/60"
          >
            Tentar de novo
          </button>
        </div>
      ) : carregando ? (
        // O campo fica utilizável e a lista diz que está carregando — um vazio aqui se leria como
        // "não achei", e a dona reescreveria o termo contra um catálogo que ainda não chegou.
        <p data-testid="busca-carregando" className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
          Carregando o catálogo…
        </p>
      ) : resultado.total === 0 ? (
        // Lista em branco se lê como tela quebrada, e a dona iria procurar o defeito noutro lugar.
        // Dizer o que aconteceu **e** o que fazer é o que separa um vazio de um erro.
        <p data-testid="busca-sem-resultado" className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Nenhuma peça com “{termo}”.</span>{' '}
          Procure por outra palavra do nome — a busca ignora acento e maiúscula.
        </p>
      ) : (
        <>
          <ul data-testid="pecas-encontradas" className="max-h-60 space-y-1 overflow-y-auto">
            {resultado.itens.map(produto => {
              const jaEscolhida = jaEscolhidos.has(produto.id)

              return (
                <li key={produto.id}>
                  <button
                    type="button"
                    data-testid={`peca-${produto.id}`}
                    disabled={jaEscolhida}
                    onClick={() => onEscolher(produto)}
                    className={cn(
                      'flex min-h-11 w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors motion-reduce:transition-none',
                      jaEscolhida
                        ? 'cursor-not-allowed border-border bg-muted/40 text-muted-foreground'
                        : 'border-input bg-card text-foreground hover:bg-muted/50',
                    )}
                  >
                    {!jaEscolhida && <Plus className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />}
                    <span className="min-w-0 flex-1 truncate">{produto.name}</span>

                    {mostrarPreco && (
                      // Número, nunca composição: o parâmetro é booleano exatamente para não virar
                      // um slot de renderização livre, que reabriria a porta da miniatura.
                      <span data-testid={`preco-${produto.id}`} className="shrink-0 tabular-nums">
                        {formatPrice(produto.base_price ?? 0)}
                      </span>
                    )}

                    {jaEscolhida && (
                      // A recusa de quem grava é a rede de baixo, e ela só é lida depois do clique
                      // em Salvar. Aqui a dona lê a razão **antes** de tentar.
                      <span data-testid={`ja-escolhida-${produto.id}`} className="shrink-0 text-[11px]">
                        {rotuloJaEscolhida}
                      </span>
                    )}

                    {!jaEscolhida && !produto.is_active && (
                      // Não é recusa: escolher uma peça despublicada é estado legítimo — ela pode
                      // voltar ao ar amanhã. Mas escolhê-la **sem saber** faria o painel dizer "1
                      // escolhida saiu do ar" um segundo depois, sem a dona entender por quê.
                      <span
                        data-testid={`fora-do-ar-${produto.id}`}
                        className="shrink-0 rounded bg-estrelinha-admin-amber/10 px-1.5 py-0.5 text-[10px] font-semibold text-estrelinha-admin-amber"
                      >
                        fora do ar
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>

          {resultado.total > resultado.itens.length && (
            <p data-testid="mais-resultados" className="text-[11px] text-muted-foreground">
              Mostrando {resultado.itens.length} de {resultado.total}. Escreva mais do nome para
              estreitar a busca.
            </p>
          )}
        </>
      )}
    </div>
  )
}

export default ProductSearchField
