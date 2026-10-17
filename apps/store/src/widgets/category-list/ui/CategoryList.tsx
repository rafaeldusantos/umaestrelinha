import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { HomeSection, ResolvedItem } from '@estrelinha/core/home'
import { imagePriority, renditionSrcSet, renditionUrl } from '@estrelinha/core/media'
import { cn } from '@estrelinha/ui/lib/utils'
import { useOverflowAffordance } from '@/shared/lib/useOverflowAffordance'
import { TAP_44 } from '@/shared/lib/touchTarget'

/**
 * O bloco **Lista de categorias** (feature 64) — a fileira de círculos.
 *
 * Cada item é a arte que a dona enviou, o rótulo embaixo e um link para a coleção. **O círculo é da
 * arte, não da tela**: a vaga é um quadrado sem fundo, sem borda e sem recorte, e a imagem entra
 * inteira com `object-contain` (A-05, A-06). Uma arte de fundo opaco aparece como quadrado, e é o
 * certo (LCT-35): a loja não "conserta" recortando — quem orienta a arte circular é o painel.
 *
 * **A arte é opcional.** Sem ela, a loja desenha o círculo: a cor principal, com o rótulo DENTRO —
 * e não repete o rótulo embaixo, que diria o mesmo nome duas vezes.
 *
 * Tudo o que este arquivo recebe já chega decidido por `resolveHomeSections` → `categoryListItem`
 * (`core/home/categoryList.ts`): o rótulo (título > `alt` > nome ao vivo da coleção), a arte (nunca
 * o `banner_url` da coleção) e quem saiu do ar. Aqui não se escreve `title || nome` nenhum.
 */

/** As larguras pedidas ao dono da rendição: 80 e 104 em 1× e 2×. */
const LARGURAS = [80, 104, 160, 208] as const

/** O círculo mede 80 no celular e 104 a partir de `md`. */
const SIZES = '(min-width: 768px) 104px, 80px'

/**
 * A vaga: quadrada, e **só** isso. Nenhuma cor de fundo, borda, sombra, raio ou recorte — com
 * qualquer um deles, a cor e a forma deixariam de ser as da arte (LCT-05).
 */
const VAGA = 'h-20 w-20 md:h-[104px] md:w-[104px]'

/**
 * O círculo de quem não tem arte: a cor principal, o rótulo dentro em `on-primary` (o par de texto
 * que `contrast.test.ts` já mede). Mesmo tamanho da vaga, para o item não desalinhar dos vizinhos.
 */
const CIRCULO_SEM_ARTE =
  'flex shrink-0 items-center justify-center rounded-full bg-estrelinha-primary px-2 text-center'

const ROTULO_NO_CIRCULO =
  'line-clamp-3 font-body text-[12px] font-semibold leading-[15px] text-estrelinha-on-primary [overflow-wrap:anywhere] md:text-[14px] md:leading-[18px]'

/**
 * A seta do computador. **`TAP_44` vem PRIMEIRO** — o `relative` dele disputa com o `absolute`
 * daqui o mesmo grupo de posição no `twMerge`, e por último ele apagaria a posição da seta
 * (`alvoDeToqueNaoRoubaPosicao.test.ts` calcula a fusão e recusa a volta).
 *
 * `top-[52px]` + `-translate-y-1/2` põe o centro da seta no centro do círculo de 104, medido do topo
 * do rolador; o título fica fora do invólucro `relative` para não deslocar essa âncora.
 */
const SETA =
  'absolute top-[52px] -translate-y-1/2 hidden md:flex h-9 w-9 items-center justify-center rounded-full border border-estrelinha-line bg-estrelinha-surface text-estrelinha-ink'

interface ItemProps {
  item: ResolvedItem
  index: number
  primeiro: boolean
  ultimo: boolean
}

const Item = ({ item, index, primeiro, ultimo }: ItemProps) => {
  /*
   * A foto que não carrega (404 do Storage) some **só ela**: a vaga mantém o tamanho e o rótulo
   * continua — o item não desloca vizinho nem mostra ícone de imagem quebrada (LCT-36).
   */
  const [falhou, setFalhou] = useState(false)
  const url = item.imageUrl

  // Só o `loading` sai do dono da prioridade (LCT-06). A dica `fetchPriority` NÃO é repassada: um
  // círculo de 80px nunca é o LCP, e "high" no primeiro disputaria a dica com a arte do Banner
  // principal logo acima, que é (design R4).
  const { loading } = imagePriority(index)

  return (
    <li
      className={cn(
        'w-24 shrink-0 snap-start md:w-[148px]',
        // Margem automática, e não `justify-center` no `<ul>`: ela se resolve em ZERO quando a
        // fileira estoura, então centraliza quando cabe e nunca corta o começo (LCT-34, A-09).
        primeiro && 'ml-auto',
        ultimo && 'mr-auto',
      )}
    >
      <Link
        to={item.href}
        className="flex flex-col items-center gap-2.5 text-center md:gap-3.5"
      >
        {url ? (
          <>
            <img
              src={renditionUrl(url, 208)}
              srcSet={renditionSrcSet(url, LARGURAS) || undefined}
              sizes={SIZES}
              alt=""
              width={104}
              height={104}
              loading={loading}
              decoding="async"
              onError={() => setFalhou(true)}
              style={falhou ? { visibility: 'hidden' } : undefined}
              className={cn(VAGA, 'object-contain')}
            />
            <span className="line-clamp-2 w-full text-center font-body text-[14px] font-medium leading-[18px] text-estrelinha-ink [overflow-wrap:anywhere] md:text-[16px] md:leading-[21px]">
              {item.label}
            </span>
          </>
        ) : (
          // Sem arte: o círculo na cor da loja, com o rótulo dentro. O texto é o nome acessível do
          // link, então nada se perde para leitor de tela.
          <span data-circulo-sem-arte="" className={cn(VAGA, CIRCULO_SEM_ARTE)}>
            <span className={ROTULO_NO_CIRCULO}>{item.label}</span>
          </span>
        )}
      </Link>
    </li>
  )
}

interface Props {
  section: HomeSection
  items: ResolvedItem[]
}

const CategoryList = ({ section, items }: Props) => {
  // Chamado AQUI, e não acima: cada seção tem o próprio estado de setas (LCT-38).
  const faixa = useOverflowAffordance(items.length)
  const titulo = section.config?.title?.trim()

  if (items.length === 0) return null

  return (
    <section className="bg-estrelinha-ground py-8 md:py-12">
      {titulo && (
        <h2 className="container mb-5 font-display text-[22px] font-semibold leading-[28px] tracking-[-0.02em] text-estrelinha-ink md:mb-7 md:px-12 md:text-[28px] md:leading-[34px]">
          {titulo}
        </h2>
      )}

      <div className="relative md:container md:px-0">
        {/*
          O rolador é `<nav>`: o hook devolve um ref de `HTMLElement`, que `<ul>` e `<div>` não
          aceitam, e ele observa o primeiro filho — o `<ul>` — para notar a lista crescer. No
          celular ele vai até a borda e o quarto item fica cortado, que é a pista de que há mais
          (LCT-08). Os 48px de cada lado no computador são a raia das setas: nas pontas da rolagem
          nenhum item fica debaixo de uma.

          `scroll-smooth` faz a seta deslizar, e `motion-reduce:scroll-auto` desliga isso para quem
          pediu menos movimento — a mesma decisão do `Header`, num lugar só (LCT-32).
        */}
        <nav
          ref={faixa.ref}
          aria-label="Categorias"
          className="overflow-x-auto snap-x snap-mandatory scroll-smooth motion-reduce:scroll-auto scroll-px-4 px-4 [scrollbar-width:none] md:scroll-px-12 md:px-12 [&::-webkit-scrollbar]:hidden"
        >
          {/*
            `w-max min-w-full`: quando a fileira estoura é o `<ul>` que transborda, e aí o recuo
            final do rolador entra na área rolável — com o `<ul>` em 100% eram os itens que
            transbordavam, e o recuo ficava de fora (medido em 1440: 8 itens rolavam 8px). Quando
            cabe, `min-w-full` devolve a largura toda às margens automáticas que centralizam.
          */}
          <ul className="flex w-max min-w-full items-start gap-2">
            {items.map((item, i) => (
              <Item
                key={item.id}
                item={item}
                index={i}
                primeiro={i === 0}
                ultimo={i === items.length - 1}
              />
            ))}
          </ul>
        </nav>

        {faixa.antes && (
          <button
            type="button"
            onClick={() => faixa.rolar(-1)}
            aria-label="Categorias anteriores"
            className={cn(TAP_44, SETA, 'left-1')}
          >
            <ChevronLeft size={20} strokeWidth={1.8} aria-hidden />
          </button>
        )}
        {faixa.depois && (
          <button
            type="button"
            onClick={() => faixa.rolar(1)}
            aria-label="Próximas categorias"
            className={cn(TAP_44, SETA, 'right-1')}
          >
            <ChevronRight size={20} strokeWidth={1.8} aria-hidden />
          </button>
        )}
      </div>
    </section>
  )
}

export default CategoryList
