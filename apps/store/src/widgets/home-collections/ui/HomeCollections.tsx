import { Fragment, type ReactNode } from 'react'
import type { CarouselTone } from '@/widgets/product-carousel/ui/ProductCarousel'
import HomeCollectionRow from './HomeCollectionRow'

/**
 * As fileiras de coleção da home — o miolo do board `7CF-0`.
 *
 * **O chão alterna** de uma fileira para a outra. É o que dá ritmo a uma página longa: quatro
 * fileiras no mesmo creme viram uma faixa só, e a cliente perde onde uma coleção termina e a outra
 * começa. `ground-deep` mede 1,12:1 sobre `ground` — pouco de propósito, é o mínimo que separa duas
 * superfícies claras sem virar faixa colorida.
 *
 * **A lista chega resolvida** (feature 24): a curadoria da dona quando ela escolheu a dedo, ou a
 * derivação de sempre (`pickHomeCollections`, raízes ativas por `sort_order`) quando não. As fileiras
 * não escolhem mais o que mostrar — e é isso que faz `HOME-32` valer sem nenhuma regra nova aqui: a
 * vaga que sobra **fica vazia**, porque completar com o automático poria na Home coleção que a dona
 * não escolheu.
 */
const TONES: CarouselTone[] = ['ground', 'ground-deep', 'surface', 'ground']

/**
 * Depois de qual fileira o `interlude` entra (a faixa institucional, no board).
 *
 * Índice 0: logo depois da primeira coleção, que é onde o board a põe — a respiração entre a
 * primeira fileira e o resto. No rodapé ela viraria texto de rodapé, que ninguém lê.
 *
 * **Quem carrega o número é a própria faixa** (`config.interlude_after`), e por isso ele chega por
 * prop: um dono só. Se as fileiras dissessem "minha interlude é a seção X", desligar a X deixaria a
 * fileira apontando para um fantasma.
 */
const INTERLUDE_AFTER = 0

/** O que a fileira precisa de um item resolvido — `ResolvedItem` satisfaz. */
export interface HomeCollectionItem {
  id: string
  label: string
  slug: string
  description: string | null
  href: string
  imageUrl: string | null
}

interface Props {
  /** As coleções já resolvidas, na ordem em que devem aparecer. */
  collections: readonly HomeCollectionItem[]
  /** Bloco que entra entre duas fileiras. Quem decide a ordem é a composição. */
  interlude?: ReactNode
  /** Depois de qual fileira o bloco entra. Ausente cai na 1ª, que é onde a Home o põe hoje. */
  interludeAfter?: number
}

const HomeCollections = ({ collections, interlude, interludeAfter = INTERLUDE_AFTER }: Props) => {
  // Catálogo vazio (é o estado da loja logo depois de um `db reset`, antes do importador) não pode
  // engolir o `interlude`: ele é texto de marca e não depende de produto nenhum.
  if (collections.length === 0) return <>{interlude}</>

  return (
    <>
      {collections.map((collection, i) => (
        <Fragment key={collection.id}>
          <HomeCollectionRow
            collection={{
              id: collection.id,
              name: collection.label,
              slug: collection.slug,
              description: collection.description,
              href: collection.href,
              bannerUrl: collection.imageUrl,
            }}
            tone={TONES[i % TONES.length]}
          />
          {i === interludeAfter && interlude}
        </Fragment>
      ))}
    </>
  )
}

export default HomeCollections
