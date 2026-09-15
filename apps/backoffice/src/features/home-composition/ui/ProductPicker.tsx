// O seletor de peças do bloco **Produtos em destaque** (feature 50, `DST-03`, `DST-09`).
//
// **Desde a feature 51 ele é um invólucro fino**, e o que sobrou aqui é exatamente o que NÃO é
// busca: a montagem do `DraftItem`. A busca em si — a dobra de acento, o casamento por palavra, a
// ordenação, o teto de 20, o vazio explicado, o "já está no bloco" e o "fora do ar" — mora em
// `ProductSearchField`, em `entities/product`, e é a mesma nas cinco telas do painel. Antes disso
// eram cinco réguas diferentes, e duas delas discordavam de verdade: `coracao` achava 106 peças
// aqui e nenhuma no editor de banner do menu.
//
// **A montagem do `DraftItem` fica aqui de propósito.** Congelar `product_slug` e `label_snapshot`
// é regra da Home (`DST-24`, `HOME-24`), não de busca — levá-la para o componente compartilhado
// obrigaria as outras quatro telas a conhecer um formato que nenhuma delas usa.

import { ProductSearchField } from '@/entities/product'
import { draftKey, type DraftItem } from '../model/sectionDraft'

interface Props {
  /** Os `product_id` que já estão no bloco — quem já está aparece desabilitado. */
  escolhidos: readonly string[]
  /** Acrescenta a peça ao fim da lista. */
  onPick: (item: DraftItem) => void
}

const ProductPicker = ({ escolhidos, onPick }: Props) => (
  <ProductSearchField
    id="busca-peca"
    rotulo="Acrescentar uma peça"
    modo="multiplo"
    selecionados={escolhidos}
    onEscolher={produto =>
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
    }
  />
)

export default ProductPicker
