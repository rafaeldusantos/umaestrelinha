// RES-03, RES-04, RES-05, RES-09, ZOM-01, ADI-01..03 — o bloco de imagens do card Resumo.
//
// O card (`FormCard title="Resumo"`) e os fatos de preço/estoque são da página (T09). Este
// componente é o ENVOLTÓRIO do corpo do card: desenha as imagens no topo e recebe os fatos como
// `children`. Ele é envoltório, e não só o bloco de cima, porque ADI-02 pede que soltar um arquivo
// em QUALQUER ponto do card envie — inclusive sobre os fatos. O véu "Solte para enviar" cobre o
// envoltório inteiro. Quem quiser estender o alvo também ao cabeçalho do card usa `useFileDrop` e
// `FileDropVeil` (o hook mora em `model/useFileDrop.ts`; o véu, abaixo) no próprio card, e não passa por aqui.
//
// O envio NÃO mora aqui: `upload` e `progress` vêm do `useProductImageUpload` da página, o mesmo
// que alimenta a galeria do modal (design, Abordagem A). Um progresso, um "envio no ar".

import { useRef, useState, type ReactNode } from 'react'
import { ImagePlus, Plus } from 'lucide-react'
import { renditionSrcSet, renditionUrl } from '@estrelinha/core/media'
import type { ProductImage } from '@estrelinha/supabase/types'
import { cn } from '@estrelinha/ui/lib/utils'
import { summaryThumbs, SUMMARY_THUMB_LIMIT } from '../model/mediaSummary'
import type { UploadProgress } from '../lib/uploadProductImage'
import { SUMMARY_IMAGE_ACCEPT, useFileDrop } from '../model/useFileDrop'


/** A miniatura mede 72px; pedir 144 serve a tela de densidade 2 sem baixar a foto inteira. */
const THUMB_RENDITION_WIDTH = 144

/** A principal ocupa a largura do card: a coluna de ~330px a partir de `lg`, a tela no celular. */
const MAIN_SIZES = '(min-width: 1024px) 330px, 100vw'

const THUMB_BOX = 'h-[72px] w-[72px]'


/**
 * O véu "Solte para enviar". `pointer-events-none`: ele não pode virar o alvo do arraste, senão o
 * `dragleave` do card dispararia ao entrar nele e o véu se apagaria sozinho. Precisa de um pai
 * `relative`.
 */
export const FileDropVeil = ({ visible }: { visible: boolean }) =>
  visible ? (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-background/90"
      role="status"
    >
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <ImagePlus className="h-5 w-5 text-primary" aria-hidden="true" />
        Solte para enviar
      </p>
    </div>
  ) : null

/**
 * Marca o "Editar mídia": o alvo estável para onde o modal devolve o foco quando quem o abriu deixou
 * de existir — a pendência "Ao menos uma imagem" some assim que a primeira foto entra
 * (BUG-20261028-foco-cai-no-body-quando-a-pendencia-de-imagem-se-resolve).
 */
export const MEDIA_FOCUS_FALLBACK_ATTR = 'data-media-focus-fallback'

/** "enviando · enviada · falhou": o mesmo vocabulário da linha de progresso da galeria. */
const STATUS_LABEL: Record<UploadProgress['status'], string> = {
  uploading: 'enviando',
  done: 'enviada',
  error: 'falhou',
}

interface Props {
  images: ProductImage[]
  upload: (files: FileList | File[]) => unknown
  progress: UploadProgress[]
  /** O índice em `images` da foto ativada (0 = principal; 8 = a 9ª, pelo ladrilho "+N"). */
  onOpenImage: (index: number) => void
  /** Abre o modal Mídia (MOD-02). */
  onOpenMedia: () => void
  /**
   * Se a região do progresso fala ao leitor. A página passa `false` com o modal Mídia aberto: lá a
   * galeria mostra o MESMO progresso, e o `aria-hidden` do Radix poupa regiões vivas — sem isto o
   * envio seria anunciado em dobro (BUG-20261028-envio-de-fotos-nao-e-anunciado-ao-leitor).
   */
  announce?: boolean
  /** Os fatos do Resumo, desenhados pela página abaixo das imagens. */
  children?: ReactNode
}

const ProductMediaSummary = ({
  images,
  upload,
  progress,
  onOpenImage,
  onOpenMedia,
  announce = true,
  children,
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const { dragging, handlers } = useFileDrop(upload)
  // Por URL, e não por índice: reordenar no modal não pode transferir a falha para outra foto.
  const [broken, setBroken] = useState<ReadonlySet<string>>(() => new Set())
  const quebrar = (url: string) => setBroken(atual => new Set(atual).add(url))

  const { main, thumbs, rest } = summaryThumbs(images)
  const total = images.length
  const semDescricao = images.filter(image => !image.alt?.trim()).length
  const abrirSeletor = () => inputRef.current?.click()

  // Edge case "imagem que não carrega": o ladrilho continua lá, com o número dela, e a grade não
  // perde a forma.
  const quebrada = (numero: number) => (
    <span className="flex h-full w-full items-center justify-center bg-muted text-sm font-medium text-muted-foreground">
      {numero}
    </span>
  )

  return (
    <div className="relative space-y-4" data-testid="product-media-summary" {...handlers}>
      {main ? (
        <div className="space-y-2">
          {/* RES-03 + ZOM-01: a principal é um botão que abre o visualizador na imagem 1. */}
          <button
            type="button"
            onClick={() => onOpenImage(0)}
            aria-label={`Ampliar imagem 1 de ${total}`}
            className="block aspect-square w-full overflow-hidden rounded-xl border border-border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {broken.has(main.url) ? (
              quebrada(1)
            ) : (
              <img
                src={main.url}
                srcSet={renditionSrcSet(main.url) || undefined}
                sizes={MAIN_SIZES}
                alt={main.alt?.trim() || 'Imagem 1'}
                className="h-full w-full object-cover"
                onError={() => quebrar(main.url)}
              />
            )}
          </button>

          {/* RES-04: as imagens 2 a 8, embrulhando — nunca rolagem horizontal. */}
          <ul className="flex flex-wrap gap-2" aria-label="Outras imagens">
            {thumbs.map((image, i) => {
              const numero = i + 2
              return (
                <li key={`${image.url}-${numero}`}>
                  <button
                    type="button"
                    onClick={() => onOpenImage(numero - 1)}
                    aria-label={`Ampliar imagem ${numero} de ${total}`}
                    className={cn(
                      THUMB_BOX,
                      'block overflow-hidden rounded-lg border border-border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    )}
                  >
                    {broken.has(image.url) ? (
                      quebrada(numero)
                    ) : (
                      <img
                        src={renditionUrl(image.url, THUMB_RENDITION_WIDTH)}
                        alt={image.alt?.trim() || `Imagem ${numero}`}
                        loading="lazy"
                        className="h-full w-full object-cover"
                        onError={() => quebrar(image.url)}
                      />
                    )}
                  </button>
                </li>
              )
            })}

            {/* RES-09: da 9ª em diante, o ladrilho "+N" abre o visualizador na 9ª (índice 8). */}
            {rest > 0 && (
              <li>
                <button
                  type="button"
                  onClick={() => onOpenImage(1 + SUMMARY_THUMB_LIMIT)}
                  aria-label={`Ver mais ${rest} ${rest === 1 ? 'imagem' : 'imagens'}`}
                  className={cn(
                    THUMB_BOX,
                    'flex items-center justify-center rounded-lg bg-foreground/80 text-base font-semibold text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                >
                  +{rest}
                </button>
              </li>
            )}

            {/* ADI-01: acrescentar sem sair do Resumo. */}
            <li>
              <button
                type="button"
                onClick={abrirSeletor}
                aria-label="Adicionar imagens"
                className={cn(
                  THUMB_BOX,
                  'flex flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
              >
                <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                {/* A 200 % de fonte a palavra passa de 72px: ela trunca DENTRO do ladrilho, que não
                    cresce, e o nome acessível ("Adicionar imagens") segue inteiro
                    (BUG-20261028-resumo-corta-fatos-e-adicionar-com-fonte-200). */}
                <span className="block max-w-full truncate px-1">Adicionar</span>
              </button>
            </li>
          </ul>
        </div>
      ) : (
        // RES-05: sem imagem, o lugar da principal vira o convite para enviar.
        <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border p-4 text-center">
          <ImagePlus className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">Nenhuma imagem ainda</p>
          <button
            type="button"
            onClick={abrirSeletor}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Adicionar imagens
          </button>
          <p className="text-xs text-muted-foreground">ou arraste os arquivos para cá</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={SUMMARY_IMAGE_ACCEPT}
        className="hidden"
        data-testid="summary-file-input"
        onChange={event => {
          const files = event.target.files
          if (files && files.length) void upload(Array.from(files))
          // Limpa para que escolher o MESMO arquivo de novo dispare `change` outra vez.
          event.target.value = ''
        }}
      />

      {/* ADI-03: uma linha por arquivo, o mesmo progresso que o modal mostra. A região viva existe
          sempre, vazia sem envio — uma região que nasce junto com o texto não é anunciada
          (BUG-20261028-envio-de-fotos-nao-e-anunciado-ao-leitor). Com o modal aberto quem fala é
          só a região do modal (o `aria-hidden` do Radix poupa regiões vivas, por isso `announce`).
          Sem `role="status"`: a página já tem uma (a frase da sugestão de SEO), e duas confundiriam
          quem procura "a" mensagem da página; `aria-live` sozinho já anuncia. */}
      <div aria-live={announce ? 'polite' : 'off'} data-upload-live-region="">
        {progress.length > 0 && (
          <ul className="space-y-1" aria-label="Progresso do envio">
            {progress.map(item => (
              <li
                key={item.file}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-1.5 text-xs"
              >
                <span className="min-w-0 flex-1 truncate text-foreground">{item.file}</span>
                <span
                  className={cn(
                    'shrink-0 font-medium',
                    item.status === 'error'
                      ? 'text-destructive'
                      : item.status === 'done'
                        ? 'text-green-600'
                        : 'text-muted-foreground',
                  )}
                >
                  {STATUS_LABEL[item.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenMedia}
        {...{ [MEDIA_FOCUS_FALLBACK_ATTR]: '' }}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {semDescricao > 0 ? `Editar mídia · ${semDescricao} sem descrição` : 'Editar mídia'}
      </button>

      {children}

      <FileDropVeil visible={dragging} />
    </div>
  )
}

export default ProductMediaSummary
