import { Skeleton } from '@estrelinha/ui/skeleton'

/**
 * O card em estado de carregamento.
 *
 * **Espelha a CAIXA do `ProductCard`, não o conteúdo dele.** A régua é a altura: se o esqueleto for
 * mais baixo que o card, a grade inteira salta para baixo quando os produtos chegam — que é o
 * layout shift que ele existe para evitar.
 *
 * As alturas abaixo **foram medidas no navegador**, em 1440×900, sobre um card real da coleção
 * `joia-de-leite-materno`, e somam os mesmos **431px**:
 *
 * | faixa | altura | de onde vem no `ProductCard` |
 * | --- | ---: | --- |
 * | palco da foto | 280 | `aspect-[4/5]` sobre uma coluna de 224px |
 * | respiro | 16 | `mt-4` |
 * | categoria | 18 | linha de `estrelinha-eyebrow` |
 * | nome | 40 | `min-h-[40px]` — os dois clamps reservados |
 * | preço | 24 | `text-[20px] leading-[1.2]` |
 * | Pix + parcela | 38 | duas linhas de `leading-[19px]` |
 * | 3 vãos | 15 | `gap-[5px]` |
 *
 * Isto é, sim, uma segunda escrita das medidas do card — e não há como um teste de componente
 * pegar a divergência: **jsdom devolve 0 para toda medida de layout**. O que pega é a auditoria em
 * navegador. Ao mexer na tipografia do `ProductCard`, meça os dois de novo.
 *
 * `aria-hidden`: quem anuncia o carregamento é o `aria-busy` da grade. Ler "imagem, título, preço"
 * vinte e quatro vezes seria ruído para leitor de tela.
 */
const ProductCardSkeleton = () => (
  <div aria-hidden className="flex flex-col">
    <Skeleton className="aspect-[4/5] w-full rounded-xl bg-estrelinha-ground-deep" />
    <div className="mt-4 flex flex-col gap-[5px]">
      {/* categoria */}
      <div className="flex h-[18px] items-center">
        <Skeleton className="h-[11px] w-20 rounded-pill bg-estrelinha-line" />
      </div>
      {/* nome, nas duas linhas que o card reserva */}
      <div className="flex h-[40px] flex-col justify-center gap-1.5">
        <Skeleton className="h-[13px] w-full rounded-pill bg-estrelinha-line" />
        <Skeleton className="h-[13px] w-3/5 rounded-pill bg-estrelinha-line" />
      </div>
      {/* preço */}
      <div className="flex h-[24px] items-center">
        <Skeleton className="h-[17px] w-24 rounded-pill bg-estrelinha-line" />
      </div>
      {/* Pix e parcela */}
      <div className="flex flex-col">
        <div className="flex h-[19px] items-center">
          <Skeleton className="h-[11px] w-28 rounded-pill bg-estrelinha-line" />
        </div>
        <div className="flex h-[19px] items-center">
          <Skeleton className="h-[11px] w-36 rounded-pill bg-estrelinha-line" />
        </div>
      </div>
    </div>
  </div>
)

export default ProductCardSkeleton
