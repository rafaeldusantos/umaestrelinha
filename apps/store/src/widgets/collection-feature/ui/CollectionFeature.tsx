import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { HomeSectionConfig } from '@estrelinha/core/home'
import { renditionSrcSet, renditionUrl } from '@estrelinha/core/media'

/**
 * O destaque em coleção — a faixa larga que dá a uma coleção só o espaço de uma página inteira
 * (feature 24, `HOME-38`..`HOME-40`).
 *
 * Nenhum dos cinco boards a desenha: ela só aparece como bloco na bandeja do painel. A forma é a que
 * o `design.md` fechou — imagem de um lado, título + texto curto + CTA do outro, empilhando em
 * 390px. É a mesma gramática da grade de banners e da faixa institucional, com um peso entre as
 * duas: mais próxima do editorial que da campanha.
 *
 * **Título e texto vazios caem no nome e na descrição da própria coleção** (`HOME-38`), e isso não é
 * conveniência: a dona já escreveu esses dois textos em Categorias, e pedir que os redigite aqui
 * criaria a segunda cópia deles — a que fica velha quando ela editar a primeira.
 *
 * **A foto mora no `config`, não no item, e o motivo é o mesmo do hero**: a seção tem UMA imagem, que
 * é dela e não do destino. Guardá-la no item faria o `alt` da foto virar o rótulo do destino
 * (`ResolvedItem.label` é `alt` quando há um), e o título vazio cairia numa frase que descreve a
 * foto em vez do nome da coleção — quebrando `HOME-38` sem nada acusar. O item existe aqui só para
 * carregar a FK da categoria, que é o que faz a coleção apagada sumir da vitrine sozinha.
 */

/** O que a faixa precisa da coleção resolvida — `ResolvedItem` satisfaz. */
export interface CollectionFeatureItem {
  href: string
  label: string
  description: string | null
  imageUrl: string | null
}

interface Props {
  /** O `config` da seção `collection_feature`. */
  content: HomeSectionConfig
  /** A coleção escolhida, já resolvida. Coleção fora do ar não chega aqui — some em `resolveHomeSections`. */
  collection: CollectionFeatureItem
}

/**
 * A vaga da imagem reserva a proporção **no link, não na imagem**.
 *
 * Mesma decisão da grade de banners (`HOME-29`): arte que não carrega deixa um retângulo
 * `ground-deep` do tamanho certo, e nada abaixo se desloca.
 */
const ART_SLOT =
  'relative block w-full overflow-hidden rounded-lg bg-estrelinha-ground-deep aspect-[588/440]'

const CollectionFeature = ({ content, collection }: Props) => {
  const titulo = content.title?.trim() || collection.label
  const texto = content.text?.trim() || collection.description
  // Sem foto própria, a arte da coleção. Sem nenhuma das duas, a faixa sai só com o texto — uma
  // moldura cinza vazia diria à cliente que algo quebrou.
  const imagem = content.image_url?.trim() || collection.imageUrl
  const alt = content.image_alt?.trim() || titulo
  const rotulo = content.cta_label?.trim()

  return (
    <section className="bg-estrelinha-surface">
      {/* Empilha em coluna até o `md` (`HOME-40`): em 390px a imagem vem primeiro e o texto embaixo,
          na ordem do DOM. Lado a lado só do desktop para cima, onde há largura para os dois. */}
      <div className="container flex flex-col gap-8 py-12 md:flex-row md:items-center md:gap-16 md:py-20">
        {imagem && (
          <div className="w-full md:w-[46%] md:shrink-0">
            <Link to={collection.href} className={`group ${ART_SLOT}`}>
              {/* 46% da linha a partir do `md`, largura cheia em 390px — a mesma vaga que o
                  `ART_SLOT` reserva. A proporção segue no link, não na imagem (`HOME-29`). */}
              <img
                src={renditionUrl(imagem, 480)}
                srcSet={renditionSrcSet(imagem) || undefined}
                sizes="(min-width: 768px) 46vw, 100vw"
                alt={alt}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-5 md:flex-1">
          <h2 className="font-display text-[26px] font-semibold leading-[1.24] tracking-[-0.02em] text-estrelinha-ink md:text-[34px] md:leading-[1.3]">
            {titulo}
          </h2>

          {texto && (
            <p className="max-w-[560px] text-[15px] font-light leading-[1.6] text-estrelinha-ink-soft md:text-[17px] md:leading-[1.7]">
              {texto}
            </p>
          )}

          {/* Sem rótulo, o botão não sai — mesma regra do hero e da faixa institucional. Um rótulo
              inventado aqui seria um segundo dono de um texto que a dona edita no painel, e a
              coleção segue alcançável pela imagem e pelo menu. */}
          {rotulo && (
            <Link
              to={collection.href}
              className="inline-flex min-h-11 items-center justify-center gap-2.5 self-start rounded-sm bg-estrelinha-primary px-6 py-3.5 font-display text-[15px] font-bold text-estrelinha-on-primary transition-colors hover:bg-estrelinha-primary-strong md:text-[17px]"
            >
              {rotulo}
              <ArrowRight size={16} strokeWidth={2.5} />
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

export default CollectionFeature
