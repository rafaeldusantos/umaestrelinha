import { Fragment, type ReactNode } from 'react'
import { useCategories } from '@/entities/category'
import type { CarouselTone } from '@/widgets/product-carousel/ui/ProductCarousel'
import { pickHomeCollections } from '../model/pickHomeCollections'
import HomeCollectionRow from './HomeCollectionRow'

/**
 * As fileiras de coleção da home — o miolo do board `7CF-0`.
 *
 * **O chão alterna** de uma fileira para a outra. É o que dá ritmo a uma página longa: quatro
 * fileiras no mesmo creme viram uma faixa só, e a cliente perde onde uma coleção termina e a outra
 * começa. `ground-deep` mede 1,12:1 sobre `ground` — pouco de propósito, é o mínimo que separa duas
 * superfícies claras sem virar faixa colorida.
 */
const TONES: CarouselTone[] = ['ground', 'ground-deep', 'surface', 'ground']

/**
 * Depois de qual fileira o `interlude` entra (a faixa institucional, no board).
 *
 * Índice 0: logo depois da primeira coleção, que é onde o board a põe — a respiração entre a
 * primeira fileira e o resto. No rodapé ela viraria texto de rodapé, que ninguém lê.
 */
const INTERLUDE_AFTER = 0

interface Props {
  /** Bloco que entra entre a primeira e a segunda fileira. Quem decide a ordem é a página. */
  interlude?: ReactNode
}

const HomeCollections = ({ interlude }: Props) => {
  const { data: categories } = useCategories()
  const collections = pickHomeCollections(categories)

  // Catálogo vazio (é o estado da loja logo depois de um `db reset`, antes do importador) não pode
  // engolir o `interlude`: ele é texto de marca e não depende de produto nenhum.
  if (collections.length === 0) return <>{interlude}</>

  return (
    <>
      {collections.map((collection, i) => (
        <Fragment key={collection.id}>
          <HomeCollectionRow collection={collection} tone={TONES[i % TONES.length]} />
          {i === INTERLUDE_AFTER && interlude}
        </Fragment>
      ))}
    </>
  )
}

export default HomeCollections
