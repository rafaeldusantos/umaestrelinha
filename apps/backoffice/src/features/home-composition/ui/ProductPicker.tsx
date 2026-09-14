// O seletor de peças do bloco **Produtos em destaque** (feature 50, `DST-03`, `DST-09`).
//
// Achar uma peça entre ~680 e acrescentá-la ao fim da curadoria. Três decisões mandam aqui, e
// nenhuma é estética:
//
// 1. **Isto é uma LISTA, não uma vitrine** (`AD-019`). A tentação de mostrar miniaturas em grade é
//    enorme — "assim a dona reconhece a peça pela foto" — e é literalmente o segundo desenho da Home
//    voltando ao painel, que é o defeito que a feature 25 apagou e a 39 teve de apagar de novo no
//    menu. Quem mostra como o bloco fica é a prévia, que é a loja num iframe. `previaUnica.test.ts`
//    derruba a suíte se alguém desenhar aqui.
// 2. **O filtro é sobre a lista que a página já carregou.** `useAdminProducts` traz o catálogo
//    inteiro para os seletores de três telas; consumir essa lista não pede nada de novo à rede.
//    Trocar por busca paginada no servidor é a outra feature que o próprio hook já declara.
// 3. **A escolha CONGELA o que ela viu.** `label_snapshot` guarda o nome do momento da escolha
//    (`HOME-24`: depois do `on delete set null` não há de onde lê-lo) e `product_slug` guarda o
//    endereço, que é o que a prévia usa para saber que a peça está no ar antes de salvar
//    (`DST-24`).

import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Input } from '@estrelinha/ui/input'
import { cn } from '@estrelinha/ui/lib/utils'
import { draftKey, type DraftItem } from '../model/sectionDraft'
import type { EditorProduct } from './sectionEditors'

/**
 * Sem acento e sem caixa — "colar" tem de achar "Colar de Cinzas" (`DST-03`).
 *
 * Local **de propósito**, e o motivo está escrito em `MenuIconPicker`: a mesma dobra existe em
 * cinco features do painel, nenhuma é exportada, e importar de uma delas seria import
 * feature→feature. Unificar as seis é dívida do repositório — elas são normalização de texto, não
 * regra de domínio, e a decisão de onde moram precisa valer para todas.
 */
const dobrar = (valor: string) => valor.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/**
 * Quantas linhas a lista mostra de uma vez.
 *
 * Não é teto de escolha (o teto é `FEATURED_PRODUCTS_MAX`, e ele é recusa): é teto de **desenho**.
 * Pintar 680 linhas numa coluna de 560px não ajuda ninguém a achar nada, e o contador diz quantas
 * ficaram de fora para a busca ser o caminho, em vez da rolagem.
 */
const VISIVEIS = 20

interface Props {
  /** O catálogo que a página já carregou. */
  products: readonly EditorProduct[]
  /** Os `product_id` que já estão no bloco — quem já está aparece desabilitado. */
  escolhidos: readonly string[]
  /** Acrescenta a peça ao fim da lista. */
  onPick: (item: DraftItem) => void
}

const ProductPicker = ({ products, escolhidos, onPick }: Props) => {
  const [busca, setBusca] = useState('')
  const termo = dobrar(busca.trim())

  const encontrados = useMemo(
    () => (termo === '' ? [...products] : products.filter(p => dobrar(p.name).includes(termo))),
    [products, termo],
  )

  const escolher = (produto: EditorProduct) =>
    onPick({
      key: draftKey(),
      // O slug é congelado junto com a escolha: é ele que faz a prévia mostrar a peça **antes de
      // salvar** (`DST-24`). Sem ele o bloco em edição apareceria vazio justamente enquanto a dona
      // o monta, porque `resolveItem` decide "está no ar?" pela presença do slug.
      product_slug: produto.slug,
      product_id: produto.id,
      category_id: null,
      href: null,
      image_url: null,
      image_mobile_url: null,
      alt: null,
      // O nome do momento da escolha. Depois que a peça sai do catálogo é a única fonte que sobra
      // para o painel dizer **qual** delas se perdeu (`DST-16`).
      label_snapshot: produto.name,
    })

  return (
    <div data-testid="seletor-de-pecas" className="space-y-2 rounded-xl border border-dashed border-input p-3">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="busca-peca" className="text-xs font-semibold text-foreground">
          Acrescentar uma peça
        </label>
        <span data-testid="contador-encontrados" className="shrink-0 text-[11px] text-muted-foreground">
          {termo === ''
            ? `${products.length} no catálogo`
            : `${encontrados.length} de ${products.length}`}
        </span>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id="busca-peca"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="procure pelo nome da peça"
          className="pl-8"
        />
      </div>

      {encontrados.length === 0 ? (
        // Lista em branco se lê como tela quebrada, e a dona iria procurar o defeito noutro lugar.
        // Dizer o que aconteceu **e** o que fazer é o que separa um vazio de um erro.
        <p data-testid="busca-sem-resultado" className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Nenhuma peça com “{busca.trim()}”.</span>{' '}
          Procure por outra palavra do nome — a busca ignora acento e maiúscula.
        </p>
      ) : (
        <>
          <ul data-testid="pecas-encontradas" className="max-h-60 space-y-1 overflow-y-auto">
            {encontrados.slice(0, VISIVEIS).map(produto => {
              const jaEscolhida = escolhidos.includes(produto.id)

              return (
                <li key={produto.id}>
                  <button
                    type="button"
                    data-testid={`peca-${produto.id}`}
                    disabled={jaEscolhida}
                    onClick={() => escolher(produto)}
                    className={cn(
                      'flex min-h-11 w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs',
                      jaEscolhida
                        ? 'cursor-not-allowed border-border bg-muted/40 text-muted-foreground'
                        : 'border-input bg-card text-foreground hover:bg-muted/50',
                    )}
                  >
                    {!jaEscolhida && <Plus className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />}
                    <span className="min-w-0 flex-1 truncate">{produto.name}</span>

                    {jaEscolhida && (
                      // `DST-09` na tela: a recusa de `core` é a rede de baixo, e ela só é lida
                      // depois do clique em Salvar. Aqui a dona lê a razão **antes** de tentar.
                      <span data-testid={`ja-escolhida-${produto.id}`} className="shrink-0 text-[11px]">
                        já está no bloco
                      </span>
                    )}

                    {!jaEscolhida && !produto.is_active && (
                      // Não é recusa (`A-12`): escolher uma peça despublicada é estado legítimo —
                      // ela pode voltar ao ar amanhã. Mas escolhê-la **sem saber** faria o painel
                      // dizer "1 escolhida saiu do ar" um segundo depois, sem a dona entender por
                      // quê.
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

          {encontrados.length > VISIVEIS && (
            <p data-testid="mais-resultados" className="text-[11px] text-muted-foreground">
              Mostrando {VISIVEIS} de {encontrados.length}. Escreva mais do nome para estreitar a
              busca.
            </p>
          )}
        </>
      )}
    </div>
  )
}

export default ProductPicker
