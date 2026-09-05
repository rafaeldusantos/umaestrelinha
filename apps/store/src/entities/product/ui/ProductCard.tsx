import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart, Plus } from 'lucide-react'
import type { Product } from '@estrelinha/supabase/types'
import { useCategories } from '@/entities/category/api/useCategories'
import { formatPrice } from '@estrelinha/core/formatters'
import { imagePriority, renditionSrcSet, renditionUrl } from '@estrelinha/core/media'
import { resolveInstallments } from '@estrelinha/core/payment/installments'
import { pixPrice } from '@estrelinha/core/payment/pix'
import { usePaymentSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { productPath } from '@estrelinha/core/routes'
import { TAP_44 } from '@/shared/lib/touchTarget'
import { variantLabel } from '@estrelinha/core/pricing'
import { useCartStore } from '@/entities/cart/model/cartStore'
import { useCartUiStore } from '@/entities/cart/model/cartUiStore'
import { useWishlistStore } from '@/entities/wishlist/model/wishlistStore'
import { Skeleton } from '@estrelinha/ui/skeleton'
import { useIsMobile } from '@estrelinha/ui/hooks/use-mobile'
import { toast } from 'sonner'
import {
  CARD_MAX_AXES,
  canAddSelection,
  colorAxis,
  findVariant,
  hasSellableGrid,
  initialSelection,
  needsProductPage,
  type ColorThumb,
} from '../lib/variantSelection'
import { displayCategory } from '../lib/displayCategory'
import ColorPreview from './ColorPreview'
import QuickAddDrawer from './QuickAddDrawer'
import VariantSheet from './VariantSheet'

/**
 * Selo do card.
 *
 * Só o desconto ganha geleia — é a informação que muda a decisão de compra.
 * Todo o resto é tinta, para a listagem não virar um mostruário de etiquetas
 * coloridas competindo entre si (era o problema da versão anterior).
 */
const CardBadge = ({ tone, children }: { tone: 'jam' | 'ink'; children: React.ReactNode }) => (
  <span
    className={`estrelinha-eyebrow absolute left-3.5 top-3.5 z-10 rounded-pill px-2.5 py-1 text-[11px] font-bold text-white ${
      tone === 'jam' ? 'bg-estrelinha-primary' : 'bg-estrelinha-ink'
    }`}
  >
    {children}
  </span>
)

/**
 * A posição do card na listagem, quando há uma.
 *
 * Só quem desenha uma LISTA passa o índice — é ele que decide qual foto o navegador busca primeiro
 * (`PRF-03`). Card sem índice (relacionados, favoritos, resultado de busca) cai no ramo preguiçoso
 * de `imagePriority`, que é exatamente o comportamento de hoje: o padrão seguro é não priorizar.
 */
const ProductCard = ({ product, index }: { product: Product; index?: number }) => {
  const addItem = useCartStore((s) => s.addItem)
  const toggleWishlist = useWishlistStore((s) => s.toggleItem)
  const isWishlisted = useWishlistStore((s) => s.hasItem(product.id))
  const navigate = useNavigate()
  // Uma escolha, duas superfícies: drawer sobre a imagem no desktop, bottom sheet no mobile.
  // O sheet do Radix portala para o body, então não dá para alternar só com `md:hidden`.
  const isMobile = useIsMobile()
  const [showVariants, setShowVariants] = useState(false)
  // PST-05: a escolha é um mapa de eixo → valor, não mais duas strings fixas. Começa na primeira
  // combinação disponível, para o "+" não abrir num tamanho esgotado.
  const [selected, setSelected] = useState(() => initialSelection(product, CARD_MAX_AXES))
  const [imgLoaded, setImgLoaded] = useState(false)
  /*
    COR-11: a foto que a cliente escolheu na fileira de cores. `null` = ninguém escolheu ainda, e o
    palco mostra a capa do produto.

    Guarda a URL em vez de derivá-la de `selected`: a miniatura já resolveu QUAL foto representa
    aquela cor (a primeira variação da cor que tem imagem — nem toda linha tem), e re-derivar aqui
    seria uma segunda escrita da mesma busca, livre para divergir do que a cliente clicou.
  */
  const [corEscolhida, setCorEscolhida] = useState<string | null>(null)
  const { data: categories } = useCategories()
  const { pix_enabled, pix_discount_percent, max_installments, min_installment_value } =
    usePaymentSettings()

  // PST-10: variação ativa com `options` vazio é grade meio-cadastrada — o produto vale como
  // simples, precificado por `base_price` e com saldo em `stock_total`.
  const sellableGrid = hasSellableGrid(product)
  // PST-08 / AC 6-7: com `stock_policy` diferente de `track` a loja nunca marca esgotado. Com
  // grade, o saldo que vale é o da linha, não o `stock_total` do produto.
  const isOutOfStock = sellableGrid
    ? !product.variants.some((v) => v.is_active && v.price !== null)
    : product.stock_policy === 'track' && product.stock_total === 0
  const isLowStock =
    !sellableGrid &&
    product.stock_policy === 'track' &&
    product.stock_total > 0 &&
    product.stock_total <= product.low_stock_threshold
  // PST-06 AC 3: o selo é a categoria de menor `sort_order` entre as do produto, com desempate por
  // `position` do vínculo. `category_slug` (a coluna legada) guardava só uma das N.
  const category = displayCategory(product, categories)

  // A7: o card mostra no máximo 2 eixos. Com 3 não há como fechar a escolha aqui sem escolher o
  // terceiro pelo cliente — então o "+" leva para a página do produto (PST-05 AC 2).
  const goToPage = sellableGrid && needsProductPage(product.options)

  // O CTA do drawer/sheet mostra o preço da LINHA escolhida, não o `price` da vitrine — é o valor
  // que vai ser cobrado, e é ele que muda quando o cliente troca de tamanho.
  const selectedVariant = sellableGrid ? findVariant(product.variants, selected) : null
  const selectedPrice = selectedVariant?.price ?? product.price

  /*
    COR-12: TODO número desta vitrine sai da variação escolhida, não do produto.

    Medido em 2026-08-15: em 271 dos 385 produtos com eixo de cor (70%) o preço muda com a cor.
    Como a cliente agora troca a cor no próprio card (`COR-11`), ler `product.price` aqui deixaria a
    foto de uma cor ao lado do preço de outra em 7 de cada 10 produtos — a vitrine prometendo um
    valor que o caixa não cobra.

    O "de" riscado acompanha pelo mesmo motivo: com o preço seguindo a variação e o `compare_price`
    ficando no produto, a porcentagem do selo sairia calculada entre duas linhas diferentes.
  */
  const selectedCompare = selectedVariant?.compare_price ?? product.compare_price
  const hasDiscount = selectedCompare && selectedCompare > selectedPrice

  const discountPercent = hasDiscount
    ? Math.round((1 - selectedPrice / selectedCompare!) * 100)
    : 0

  /*
    A conta saiu daqui na feature 27 e virou `@estrelinha/core/payment/pix`, junto com a página do
    produto, que passou a mostrar o mesmo número.

    A mudança não foi só de lugar: a expressão que vivia aqui arredondava o PREÇO FINAL
    (`round2(a × (1 − pct/100))`), e `resolveOrderPricing` arredonda o DESCONTO e subtrai. Medido no
    catálogo real com o `pix_discount_percent = 5` de hoje, **81 dos 259 preços distintos (31%)**
    saíam 1 centavo acima do que o caixa cobra — a vitrine prometia R$ 7,51 onde a cobrança é
    R$ 7,50. A direção era a favor da cliente, e por isso ninguém reclamou.
  */
  const precoPix = pix_enabled ? pixPrice(selectedPrice, pix_discount_percent) : null
  const installments = resolveInstallments(selectedPrice, max_installments, min_installment_value)

  const imagemEmDestaque = corEscolhida ?? product.image_url

  /*
    `PRF-03`: quem decide é `imagePriority`, e não um `index < 6` escrito aqui.

    A régua repetida em cada vitrine é o "defeito 01" outra vez — a sétima superfície nasce sem ela
    e nada acusa, porque o sintoma é lentidão, não erro. Os TRÊS mecanismos que escondiam a foto do
    medidor de LCP saem juntos daqui: o `loading="lazy"`, o `initial={{ opacity: 0 }}` do Framer e o
    `opacity-0` que espera o `onLoad`. Enquanto a imagem está invisível, o navegador não a conta.
  */
  const prioridade = imagePriority(index)

  /*
    React 18.3 não conhece `fetchPriority`: ele avisa no console e pede a grafia minúscula. O
    atributo sai certo de qualquer forma, mas o aviso apareceria em TODA vitrine da loja em
    desenvolvimento. O spread entrega a grafia que o navegador lê sem passar pela lista de props
    conhecidas do React, e some inteiro quando não há dica a dar.
  */
  const dicaLcp = (
    prioridade.fetchPriority ? { fetchpriority: prioridade.fetchPriority } : {}
  ) as Record<string, string>

  /**
   * `COR-11`: escolher a cor troca a imagem em destaque e a cor escolhida — e não navega nem abre
   * o seletor. Cor **sem foto** mantém a imagem atual: esvaziar o palco por causa de um cadastro
   * incompleto seria punir a cliente por um dado que falta em 9 dos 385 produtos.
   */
  const pickColor = (thumb: ColorThumb) => {
    const axis = colorAxis(product.options)
    if (!axis) return
    setSelected(prev => ({ ...prev, [axis.name]: thumb.value }))
    if (thumb.imageUrl) setCorEscolhida(thumb.imageUrl)
  }

  const addSelectionToCart = () => {
    if (sellableGrid) {
      if (!selectedVariant || !canAddSelection(product, selected)) {
        toast.error('Essa combinação está indisponível. Escolha outra.')
        return
      }
      addItem(product, '', '', {
        variantId: selectedVariant.id,
        variantLabel: variantLabel(product.options, selectedVariant.option_values),
        optionValues: selectedVariant.option_values,
        unitPrice: selectedVariant.price!,
      })
    } else {
      addItem(product)
    }
    setShowVariants(false)
    notifyAdded()
  }

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isOutOfStock) return

    if (goToPage) {
      navigate(productPath(product.slug))
      return
    }

    // Com grade vendável o "+" não adiciona: ele ABRE a escolha (drawer no desktop, sheet no
    // mobile). Sem grade, adiciona direto — não há o que escolher.
    if (sellableGrid) {
      setShowVariants(true)
      return
    }
    addSelectionToCart()
  }

  const notifyAdded = () =>
    toast.custom(() => (
      <div className="flex items-center gap-3 rounded-md border border-estrelinha-line bg-white p-3 shadow-estrelinha-soft">
        <img src={product.image_url} alt={product.name} className="h-12 w-12 rounded-sm object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-estrelinha-ink">{product.name}</p>
          <p className="text-xs text-estrelinha-ink-soft">Adicionado ao carrinho</p>
        </div>
        <button
          type="button"
          onClick={() => useCartUiStore.getState().openCart()}
          className="whitespace-nowrap text-xs font-semibold text-estrelinha-primary hover:underline"
        >
          Ver carrinho
        </button>
      </div>
    ))

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleWishlist(product.id)
  }

  return (
    <motion.div
      initial={prioridade.animateIn ? { opacity: 0, y: 20 } : false}
      whileInView={prioridade.animateIn ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true }}
      transition={{ duration: 0.3 }}
      className="group cursor-pointer"
    >
      <Link to={productPath(product.slug)} className="block">
        {/*
          Palco do produto: **retrato 4:5**, em pó de açúcar. A foto é a única cor.

          Era quadrado. O catálogo real é de joia fotografada de pé — pingente na corrente, pirâmide,
          placa —, e o quadrado cortava a peça em cima e embaixo para caber. O retrato é a moldura da
          loja em produção, e é a do board `7CF-0`.
        */}
        {/*
          `@container`: a fileira de cor decide quantas vagas mostra pela largura do CARD, e ela não
          acompanha a viewport — em 1024 o card da categoria tem 220px e o da home, 230px (`COR-16`).
        */}
        <div className="@container relative aspect-[4/5] overflow-hidden rounded-xl bg-estrelinha-ground-deep">
          {!imgLoaded && <Skeleton className="absolute inset-0 h-full w-full rounded-none" />}
          {/*
            `PRF-02`: a foto chega no tamanho da vaga. O card mede 171px em 390 (≈342 em DPR 2), e
            até aqui a loja servia o original de 1024px — 113 KB de média, com casos de 530 KB.

            O `src` aponta para a rendição de 480, e não para o original: ele é o que navegador sem
            `srcset` usa, e mandá-lo ao original faria o caso legado pagar o PIOR preço.

            Imagem que não é objeto do Storage (banner de host externo) volta inalterada de
            `renditionUrl` e faz `renditionSrcSet` devolver `''` — daí o `|| undefined`, que omite o
            atributo em vez de emitir um `srcset` de uma URL só.
          */}
          <img
            src={renditionUrl(imagemEmDestaque, 480)}
            srcSet={renditionSrcSet(imagemEmDestaque) || undefined}
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            alt={product.name}
            className={`h-full w-full object-cover transition-all duration-300 group-hover:scale-[1.04] ${
              imgLoaded || !prioridade.animateIn ? 'opacity-100' : 'opacity-0'
            }`}
            loading={prioridade.loading}
            {...dicaLcp}
            onLoad={() => setImgLoaded(true)}
          />

          {hasDiscount ? (
            <CardBadge tone="jam">-{discountPercent}%</CardBadge>
          ) : product.is_new ? (
            <CardBadge tone="ink">Novo</CardBadge>
          ) : isLowStock ? (
            <CardBadge tone="ink">Últimas</CardBadge>
          ) : product.is_featured ? (
            <CardBadge tone="ink">Destaque</CardBadge>
          ) : null}

          <button
            onClick={handleWishlist}
            className={`${TAP_44} absolute right-3.5 top-3.5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white transition-transform hover:scale-110`}
            aria-label={isWishlisted ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                isWishlisted ? 'fill-estrelinha-primary text-estrelinha-primary' : 'text-estrelinha-ink'
              }`}
              strokeWidth={1.8}
            />
          </button>

          {!isOutOfStock && (
            <button
              onClick={handleAddToCart}
              className={`${TAP_44} absolute bottom-3.5 right-3.5 z-10 flex h-[38px] w-[38px] items-center justify-center rounded-full bg-estrelinha-ink transition-transform hover:scale-110 active:scale-95`}
              aria-label="Adicionar ao carrinho"
            >
              <Plus className="h-[18px] w-[18px] text-white" strokeWidth={2.2} />
            </button>
          )}

          {/*
            A placa de cores (`COR-10`..`COR-15`). Ela abre o MESMO caminho do "+" — `handleAddToCart`
            —, que já faz `preventDefault` + `stopPropagation` dentro do `<Link>` e já decide entre
            drawer, sheet e página do produto. Passar outro handler aqui seria uma terceira
            superfície de escolha de variação.

            Ela nunca disputa espaço com o véu de "Esgotado": a placa exige grade vendável, e com
            grade vendável `isOutOfStock` é sempre falso (é a mesma condição, negada).
          */}
          <ColorPreview product={product} selected={selected} onPick={pickColor} />

          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[2px]">
              <span className="estrelinha-eyebrow rounded-pill bg-estrelinha-ink px-3 py-1.5 text-[11px] text-white">
                Esgotado
              </span>
            </div>
          )}

          {showVariants && !isMobile && (
            <QuickAddDrawer
              product={product}
              selected={selected}
              onChange={setSelected}
              onConfirm={addSelectionToCart}
              onDismiss={() => setShowVariants(false)}
              price={selectedPrice}
            />
          )}
        </div>

        <div className="mt-4 flex flex-col gap-[5px]">
          {category && <p className="estrelinha-eyebrow text-estrelinha-ink-soft">{category.name}</p>}
          {/*
            `COR-09`: 14px em duas linhas, com os 40px reservados.

            O preço é a primeira coisa que a cliente lê no card, e com o nome em 18px ele vinha
            depois de um bloco maior que ele. O clamp de DUAS linhas reconcilia uma divergência que
            já existia — o board sempre desenhou duas e o código sempre truncou em uma; reduzir a
            fonte sem trocar o clamp deixaria o nome cortado, só que menor. O `min-h` é o que faz os
            preços de uma fileira empatarem na mesma linha quando um nome cabe em uma linha e o
            vizinho, em duas.
          */}
          <h3 className="line-clamp-2 min-h-[40px] font-display text-[14px] font-medium leading-[20px] text-estrelinha-ink transition-colors group-hover:text-estrelinha-primary">
            {product.name}
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[20px] font-semibold leading-[1.2] text-estrelinha-primary">
              {formatPrice(selectedPrice)}
            </span>
            {hasDiscount && (
              <span className="text-[14px] font-medium text-estrelinha-ink-soft line-through">
                {formatPrice(selectedCompare!)}
              </span>
            )}
          </div>

          {/*
            Pix e parcela na vitrine — board `7CF-0`, e o que a loja em produção mostra em todo card.
            É a informação pela qual quem parcela decide, e ela vem das MESMAS settings que o caixa
            aplica (`resolveInstallments`, `pix_discount_percent`). Cravar "8%" ou "4x" aqui faria a
            vitrine prometer uma regra que o checkout não pratica.
          */}
          {(precoPix !== null || installments) && (
            <div className="flex flex-col text-[13px] leading-[19px] text-estrelinha-ink-soft">
              {precoPix !== null && <span>{formatPrice(precoPix)} com Pix</span>}
              {installments && installments.count > 1 && (
                <span>
                  {installments.count}x de {formatPrice(installments.value)} sem juros
                </span>
              )}
            </div>
          )}
        </div>
      </Link>

      {isMobile && (
        <VariantSheet
          product={product}
          categoryName={category?.name}
          open={showVariants}
          onOpenChange={setShowVariants}
          selected={selected}
          onChange={setSelected}
          onConfirm={addSelectionToCart}
          price={selectedPrice}
        />
      )}
    </motion.div>
  )
}

export default ProductCard
