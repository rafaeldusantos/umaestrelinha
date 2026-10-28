// A galeria de mídia (PMD-01, PMD-03, PMD-04). Desde a feature 85 é o corpo do modal Mídia (MOD-02).
//
// Saiu da `AdminProductFormPage` para cá porque o bloco de imagens deixou de ser "uma lista de URLs
// que se arrasta": cada imagem agora carrega `alt` e `source`, tem estado de alt-text, selo de
// origem e progresso próprio de envio. Isso é comportamento, e comportamento precisa de teste —
// dentro da página de 690 linhas ele não teria como ser exercitado isoladamente.
//
// O que NÃO está aqui, de propósito: recorte de imagem. A AC 1 lista "ações de recorte e remoção",
// mas a tabela *Out of Scope* da própria spec exclui "recorte/edição destrutiva de imagem no
// navegador", e o "Done when" da T34 não o menciona. Contradição interna resolvida pela exclusão
// explícita — declarada aqui em vez de silenciada.

import { useEffect, useRef, useState } from 'react'
import { ImagePlus, GripVertical, X, Wand2, Loader2 } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import type { ProductImage } from '@estrelinha/supabase/types'
import type { UploadProgress } from '../lib/uploadProductImage'
import { buildAltText } from '../lib/buildAltText'

interface Props {
  images: ProductImage[]
  onChange: (next: ProductImage[]) => void
  /** Alimenta o `Gerar` do alt-text. Vazio ⇒ a ação fica desabilitada (PMD-01, edge case). */
  productName: string
  /**
   * O envio vem de fora (feature 85, ADI-06): o dono é `useProductImageUpload`, instanciado UMA vez
   * pela página. O Resumo e este modal enviam pelo mesmo hook, então os dois mostram o mesmo
   * progresso e o `uploading` da página não tem dois donos brigando. A galeria só chama `upload`;
   * quem anexa as URLs no fim da lista é o `onUploaded` do hook.
   */
  upload: (files: FileList | File[]) => Promise<void> | void
  progress: UploadProgress[]
  uploading: boolean
}

const KB = 1024
const MB = 1024 * KB

/** Tamanho legível na linha de progresso. Uso único: mora aqui, não em `@estrelinha/core`. */
const formatFileSize = (bytes: number): string =>
  bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / KB))} KB`

const ImageGallery = ({ images, onChange, productName, upload, progress, uploading }: Props) => {
  const [dragOver, setDragOver] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  /**
   * As URLs cujo alt saiu do botão `Gerar` **nesta sessão de edição** (PMD-01 AC 2).
   *
   * Não vai para o `jsonb`: a coluna guarda `{url, alt, source}` e inventar um quarto campo só para
   * a dica da tela mudaria o contrato que a `07` migrou. Digitar por cima apaga a marca — aí o alt
   * passou a ser escrito à mão.
   */
  const [generated, setGenerated] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList | File[]) => {
    if (!Array.from(files).length) return
    void upload(files)
  }

  // PMD-04 AC 8: colar com o modal Mídia aberto entra pelo mesmo caminho do arraste. O ouvinte é de
  // `window` porque o `paste` nasce no elemento focado — preso a este `div`, só funcionaria com o
  // foco dentro dele. O modal fechado é desmontado pelo Radix, então "montado" == "modal aberto".
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? [])
      if (!files.length) return
      event.preventDefault()
      handleFiles(files)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
    // Sem lista de dependências de propósito: `handleFiles` fecha sobre o `upload` da prop, e um ouvinte
    // registrado uma vez só chamaria um `upload` velho.
  })

  const removeImage = (index: number) => onChange(images.filter((_, i) => i !== index))

  const patchImage = (index: number, patch: Partial<ProductImage>) =>
    onChange(images.map((img, i) => (i === index ? { ...img, ...patch } : img)))

  const handleAltChange = (index: number, value: string) => {
    const image = images[index]
    if (image && generated.has(image.url)) {
      // Editado à mão: a dica "gerado automaticamente" deixa de valer.
      setGenerated(current => {
        const next = new Set(current)
        next.delete(image.url)
        return next
      })
    }
    patchImage(index, { alt: value.trim() === '' ? null : value })
  }

  const handleGenerateAlt = (index: number) => {
    const image = images[index]
    const alt = buildAltText(productName)
    if (!image || !alt) return
    setGenerated(current => new Set(current).add(image.url))
    patchImage(index, { alt })
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(false)
    if (event.dataTransfer.files.length > 0 && dragIdx === null) handleFiles(event.dataTransfer.files)
  }

  const handleTileDrop = (event: React.DragEvent, index: number) => {
    event.preventDefault()
    event.stopPropagation()
    if (dragIdx === null || dragIdx === index) return
    const next = [...images]
    const [moved] = next.splice(dragIdx, 1)
    next.splice(index, 0, moved)
    // A ordem É o dado: a posição 0 vira a principal, e `alt`/`source` viajam junto com a imagem.
    onChange(next)
    setDragIdx(null)
    setDragOverIdx(null)
  }

  const canGenerateAlt = buildAltText(productName) !== null

  return (
    <div className="space-y-3" data-field="images" tabIndex={-1}>
      <div className="flex items-center justify-between">
        <Label>Imagens do Produto</Label>
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label="Enviar imagens"
        className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        }`}
        onDragOver={event => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click()
        }}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Enviando...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <ImagePlus className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Arraste, cole (⌘V) ou <span className="font-medium text-primary">clique para selecionar</span>
            </p>
            {/* PMD-02 AC 6: a copy diz exatamente o que o código faz. Antes dizia "máx. 5MB" e o
                código não validava tamanho nenhum. */}
            <p className="text-xs text-muted-foreground">
              PNG, JPG ou WebP até 8 MB · convertidas para WebP 1600 px
            </p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={event => event.target.files && handleFiles(event.target.files)}
        />
      </div>

      {/* PMD-04 AC 7: nome, tamanho e estado de cada arquivo do lote, numa região viva que existe
          antes do envio (BUG-20261028-envio-de-fotos-nao-e-anunciado-ao-leitor). */}
      <div aria-live="polite" data-upload-live-region="">
        {progress.length > 0 && (
          <ul className="space-y-1" aria-label="Progresso do envio">
            {progress.map(item => (
              <li
                key={item.file}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-1.5 text-xs"
              >
                <span className="min-w-0 flex-1 truncate text-foreground">{item.file}</span>
                <span className="shrink-0 text-muted-foreground">{formatFileSize(item.size)}</span>
                <span
                  className={`shrink-0 font-medium ${
                    item.status === 'error'
                      ? 'text-destructive'
                      : item.status === 'done'
                        ? 'text-green-600'
                        : 'text-muted-foreground'
                  }`}
                >
                  {item.status === 'uploading' ? 'enviando' : item.status === 'done' ? 'enviada' : 'falhou'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {images.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Arraste para reordenar. A primeira imagem será a principal.
          </p>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(196px,1fr))]">
            {images.map((image, index) => {
              const missingAlt = !image.alt
              return (
                <div
                  key={`${image.url}-${index}`}
                  data-testid="image-tile"
                  className={`rounded-xl border-2 p-2 transition-all ${
                    dragOverIdx === index
                      ? 'border-primary shadow-lg'
                      : dragIdx === index
                        ? 'border-border opacity-50'
                        : 'border-border'
                  }`}
                  onDragOver={event => {
                    event.preventDefault()
                    if (dragIdx !== null && dragIdx !== index) setDragOverIdx(index)
                  }}
                  onDrop={event => handleTileDrop(event, index)}
                >
                  <div
                    draggable
                    onDragStart={() => setDragIdx(index)}
                    onDragEnd={() => {
                      setDragIdx(null)
                      setDragOverIdx(null)
                    }}
                    className="group relative aspect-square cursor-grab overflow-hidden rounded-lg border border-border active:cursor-grabbing"
                  >
                    <img
                      src={image.url}
                      alt={image.alt ?? `Imagem ${index + 1}`}
                      className="pointer-events-none h-full w-full object-cover"
                    />
                    <div className="absolute left-1 top-1 rounded bg-background/80 p-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    {/* MOD-07: no modal o uso é de toque, onde hover não existe. O botão é sempre
                        visível e mede 44×44; o círculo vermelho continua pequeno dentro dele. Fica no
                        canto de cima, longe dos selos "Principal"/"Mockup" (embaixo). */}
                    <button
                      type="button"
                      aria-label={`Remover imagem ${index + 1}`}
                      onClick={() => removeImage(index)}
                      className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="rounded-full bg-destructive p-1 text-destructive-foreground shadow">
                        <X className="h-3.5 w-3.5" />
                      </span>
                    </button>
                    <div className="absolute bottom-1 left-1 flex gap-1">
                      {index === 0 && (
                        <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                          Principal
                        </span>
                      )}
                      {/* PMD-03: a origem vem de `images[].source`, não de heurística sobre a URL. */}
                      {image.source === 'mockup' && (
                        <span className="rounded bg-estrelinha-admin-violet px-1.5 py-0.5 text-[10px] font-medium text-white">
                          Mockup
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 space-y-1">
                    <Input
                      aria-label={`Alt-text da imagem ${index + 1}`}
                      value={image.alt ?? ''}
                      placeholder="Descreva a imagem"
                      onChange={event => handleAltChange(index, event.target.value)}
                      // MOD-07: 44px de altura, o campo é tocado no celular.
                      className="h-11 text-xs"
                    />
                    <div className="flex items-center justify-between gap-2">
                      {missingAlt ? (
                        <span className="text-[11px] font-medium text-amber-600">faltando</span>
                      ) : generated.has(image.url) ? (
                        <span className="text-[11px] text-muted-foreground">gerado automaticamente</span>
                      ) : (
                        <span />
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-11 px-3 text-[11px]"
                        // Edge case da spec: produto sem nome nunca produz alt vazio — a ação some
                        // do alcance em vez de gravar string em branco.
                        disabled={!canGenerateAlt}
                        title={canGenerateAlt ? undefined : 'Dê um nome ao produto para gerar o alt-text'}
                        onClick={() => handleGenerateAlt(index)}
                      >
                        <Wand2 className="mr-1 h-3 w-3" /> Gerar
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageGallery
