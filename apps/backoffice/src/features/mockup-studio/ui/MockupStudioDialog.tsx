// Estúdio de mockup ampliado (PMD-05).
//
// O que mudou na T35 é a CASCA: o painel sai de `max-w-3xl` (768 px) para os 1360 px do artboard,
// em três colunas — origem/mockups (264 px), palco (452 px) e ajustes/saída (300 px). A engine de
// composição (`@estrelinha/core/mockup`, `renderPlan`) **não é tocada**: 1360 px é layout, não
// algoritmo, e é isso que torna esta task barata. Os 9 testes de `renderPlan` são o gate disso.

import { useState, useEffect, useRef, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@estrelinha/ui/dialog'
import { Button } from '@estrelinha/ui/button'
import { Slider } from '@estrelinha/ui/slider'
import { Switch } from '@estrelinha/ui/switch'
import { ImagePlus, Loader2, Check, Sparkles, AlertTriangle, ZoomIn, ZoomOut } from 'lucide-react'
import { toast } from '@estrelinha/ui/hooks/use-toast'
import { useMockups, composeMockup, loadImage } from '@estrelinha/core'
import type { MockupTemplate, ProductImage } from '@estrelinha/supabase/types'
import { uploadImageBlob, type ImageFormat } from '@/features/product-form/lib/uploadProductImage'
import { summarizeUploads } from '../lib/renderPlan'
import { applyPlan, estimateSeconds, type ApplyOpts, type RenderResult } from '../lib/applyPlan'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  /** A galeria atual. O estúdio devolve a lista JÁ aplicada, não um punhado de URLs soltas. */
  images: ProductImage[]
  /** Alimenta o alt-text dos renders (PMD-05 AC 6). */
  productName: string
  onApply: (next: ProductImage[]) => void
}

/** PMD-05 AC 5. */
const RESOLUTIONS = [1200, 1600, 2000] as const
const FORMATS: { value: ImageFormat; label: string }[] = [
  { value: 'image/webp', label: 'WebP' },
  { value: 'image/png', label: 'PNG' },
]

interface LoadedAssets {
  bg: HTMLImageElement
  overlay: HTMLImageElement | null
}

interface Adjust {
  scale: number
  offsetX: number // fração de bgW (-0.5..0.5)
  offsetY: number // fração de bgH (-0.5..0.5)
  rotation: number // graus (-180..180)
}

const DEFAULT_ADJUST: Adjust = { scale: 1, offsetX: 0, offsetY: 0, rotation: 0 }
const STAGE_MAX = 452

/**
 * O relevo é o sombreamento procedural do domo, e `shading_gain: 0` **é** "desligado" no tipo do
 * template. Sem relevo o composto sai chapado — o que a AC 2 exige é avisar, não recusar.
 */
const hasRelief = (template: MockupTemplate) => template.shading_gain > 0

type RenderState = 'pronto' | 'compondo' | 'com aviso'

const SliderRow = ({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void
}) => (
  <div className="flex items-center gap-2">
    <span className="w-20 shrink-0 text-xs text-muted-foreground">{label}</span>
    <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} className="flex-1" />
  </div>
)

const MockupStudioDialog = ({ open, onOpenChange, images, productName, onApply }: Props) => {
  const { data: templates } = useMockups()
  const activeTemplates = useMemo(() => templates ?? [], [templates])
  const productImages = useMemo(() => images.map(img => img.url), [images])

  const [artImage, setArtImage] = useState<HTMLImageElement | null>(null)
  const [artSrc, setArtSrc] = useState<string | null>(null) // url quando a arte vem do produto
  const [artLabel, setArtLabel] = useState<string | null>(null)
  const [loadingArt, setLoadingArt] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [adjusts, setAdjusts] = useState<Record<string, Adjust>>({})
  const [assets, setAssets] = useState<Record<string, LoadedAssets>>({})
  const [failedIds, setFailedIds] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  /** Qual template o palco mostra. O filmstrip troca; os ajustes da direita agem sobre ele. */
  const [stageId, setStageId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [showBefore, setShowBefore] = useState(false)
  /** Camadas que o engine sabe desligar: relevo (`shadingGain: 0`) e overlay (`overlay: null`). */
  const [layers, setLayers] = useState({ relevo: true, overlay: true })
  const [resolution, setResolution] = useState<number>(1600)
  const [format, setFormat] = useState<ImageFormat>('image/webp')
  const [applyOpts, setApplyOpts] = useState<Omit<ApplyOpts, 'productName'>>({
    mode: 'append',
    firstAsPrimary: false,
    generateAlt: true,
  })
  const artInputRef = useRef<HTMLInputElement>(null)
  const stageCanvasRef = useRef<HTMLCanvasElement>(null)
  const loadingRef = useRef<Set<string>>(new Set())

  // Reset ao abrir.
  useEffect(() => {
    if (!open) return
    setArtImage(null); setArtSrc(null); setArtLabel(null)
    setSelectedIds([]); setAdjusts({}); setAssets({}); setGenerating(false)
    setFailedIds([]); setStageId(null); setZoom(1); setShowBefore(false)
    setLayers({ relevo: true, overlay: true })
    setResolution(1600); setFormat('image/webp')
    setApplyOpts({ mode: 'append', firstAsPrimary: false, generateAlt: true })
    loadingRef.current.clear()
  }, [open])

  // Carrega os assets (fundo + overlay) dos templates selecionados para prévia e geração.
  useEffect(() => {
    let cancelled = false
    for (const id of selectedIds) {
      if (assets[id] || loadingRef.current.has(id)) continue
      const t = activeTemplates.find(x => x.id === id)
      if (!t) continue
      loadingRef.current.add(id)
      Promise.all([loadImage(t.background_url), t.overlay_url ? loadImage(t.overlay_url) : Promise.resolve(null)])
        .then(([bg, overlay]) => {
          loadingRef.current.delete(id)
          if (!cancelled) setAssets(prev => ({ ...prev, [id]: { bg, overlay } }))
        })
        .catch(() => {
          loadingRef.current.delete(id)
          if (!cancelled) setFailedIds(prev => (prev.includes(id) ? prev : [...prev, id]))
        })
    }
    return () => { cancelled = true }
  }, [selectedIds, activeTemplates, assets])

  const stageTemplate = activeTemplates.find(t => t.id === stageId) ?? null
  const stageAsset = stageId ? assets[stageId] : undefined
  const stageAdjust = (stageId && adjusts[stageId]) || DEFAULT_ADJUST

  // Palco: o composto grande. Mesma chamada de `composeMockup` de sempre — o que muda é o tamanho
  // do canvas e quais camadas entram.
  useEffect(() => {
    const canvas = stageCanvasRef.current
    if (!canvas || !stageAsset || !stageTemplate || !artImage) return
    const bgW = stageAsset.bg.naturalWidth || stageAsset.bg.width
    const bgH = stageAsset.bg.naturalHeight || stageAsset.bg.height
    const scale = Math.min(1, STAGE_MAX / Math.max(bgW || 1, bgH || 1)) * zoom
    canvas.width = Math.max(1, Math.round(bgW * scale))
    canvas.height = Math.max(1, Math.round(bgH * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    try {
      if (showBefore) {
        // "Antes" é o fundo cru, sem arte — a comparação que o admin precisa para julgar o render.
        ctx.drawImage(stageAsset.bg, 0, 0, canvas.width, canvas.height)
        return
      }
      const result = composeMockup({
        background: stageAsset.bg,
        art: artImage,
        overlay: layers.overlay ? stageAsset.overlay : null,
        artZone: stageTemplate.art_zone,
        blendMode: stageTemplate.blend_mode,
        shadingGain: layers.relevo ? stageTemplate.shading_gain : 0,
        transform: {
          scale: stageAdjust.scale,
          offsetX: stageAdjust.offsetX * bgW,
          offsetY: stageAdjust.offsetY * bgH,
          rotation: stageAdjust.rotation,
        },
      })
      ctx.drawImage(result.canvas, 0, 0, canvas.width, canvas.height)
    } catch {
      // composição falhou → mantém o canvas anterior; a geração reportará a falha (APP-05)
    }
  }, [stageAsset, stageTemplate, artImage, stageAdjust, zoom, showBefore, layers])

  const renderState = (id: string): RenderState => {
    if (failedIds.includes(id)) return 'com aviso'
    if (!assets[id]) return 'compondo'
    const template = activeTemplates.find(t => t.id === id)
    return template && !hasRelief(template) ? 'com aviso' : 'pronto'
  }

  const handleArtUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setLoadingArt(true)
    try {
      const img = await loadImage(URL.createObjectURL(file))
      setArtImage(img); setArtSrc(null); setArtLabel(file.name)
    } catch {
      toast({ title: 'Não foi possível carregar a arte', variant: 'destructive' })
    }
    setLoadingArt(false)
  }

  const selectExistingArt = async (url: string) => {
    setLoadingArt(true)
    try {
      const img = await loadImage(url)
      setArtImage(img); setArtSrc(url); setArtLabel(null)
    } catch {
      toast({ title: 'Não foi possível carregar a imagem', variant: 'destructive' })
    }
    setLoadingArt(false)
  }

  const toggleTemplate = (id: string) => {
    setSelectedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      setStageId(current => (next.includes(id) ? id : current === id ? (next[0] ?? null) : current))
      return next
    })
    setAdjusts(prev => (prev[id] ? prev : { ...prev, [id]: DEFAULT_ADJUST }))
  }

  const setStageAdjust = (patch: Partial<Adjust>) => {
    if (!stageId) return
    setAdjusts(prev => ({ ...prev, [stageId]: { ...(prev[stageId] ?? DEFAULT_ADJUST), ...patch } }))
  }

  /** PMD-05 AC 4: replica o ajuste do palco nos demais mockups selecionados. */
  const applyAdjustToAll = () => {
    setAdjusts(prev => {
      const next = { ...prev }
      for (const id of selectedIds) next[id] = { ...stageAdjust }
      return next
    })
  }

  /**
   * A ação primária. Só aqui alguma coisa sai do navegador — é o que sustenta a AC 8: fechar o
   * estúdio antes disto não deixa rastro no Storage nem no produto.
   */
  const handleApply = async () => {
    if (!artImage || selectedIds.length === 0) return
    setGenerating(true)
    const results: (string | null)[] = []
    /** Rótulo por posição, para o alt-text casar com o render certo. */
    const labels: string[] = []
    for (const id of selectedIds) {
      const t = activeTemplates.find(x => x.id === id)
      if (!t) { results.push(null); labels.push(''); continue }
      labels.push(t.name)
      let asset = assets[id]
      if (!asset) {
        try {
          asset = { bg: await loadImage(t.background_url), overlay: t.overlay_url ? await loadImage(t.overlay_url) : null }
        } catch {
          results.push(null); continue
        }
      }
      try {
        const bgW = asset.bg.naturalWidth || asset.bg.width
        const bgH = asset.bg.naturalHeight || asset.bg.height
        const adj = adjusts[id] ?? DEFAULT_ADJUST
        const result = composeMockup({
          background: asset.bg,
          art: artImage,
          overlay: asset.overlay,
          artZone: t.art_zone,
          blendMode: t.blend_mode,
          shadingGain: t.shading_gain,
          transform: { scale: adj.scale, offsetX: adj.offsetX * bgW, offsetY: adj.offsetY * bgH, rotation: adj.rotation },
        })
        const blob = await result.toBlob('image/png')
        // A resolução e o formato escolhidos valem no ARQUIVO gravado; a composição continua no
        // tamanho do fundo, que é o que preserva a nitidez antes do downscale.
        results.push(await uploadImageBlob(blob, { maxDimension: resolution, format }))
      } catch (e) {
        console.error('Falha ao gerar mockup', e)
        results.push(null)
      }
    }

    const { urls, failed } = summarizeUploads(results)
    setGenerating(false)

    if (failed > 0) {
      toast({
        title: `${urls.length} de ${results.length} mockups gerados`,
        description: `${failed} falhou(aram) no envio.`,
        variant: urls.length > 0 ? 'default' : 'destructive',
      })
    } else {
      toast({ title: `${urls.length} mockup(s) gerado(s)!` })
    }

    if (urls.length > 0) {
      // O rótulo acompanha o índice do render que deu certo — `summarizeUploads` só filtra nulos.
      const renders: RenderResult[] = results
        .map((url, i) => ({ url, label: labels[i] ?? '' }))
        .filter((r): r is RenderResult => r.url !== null)
      onApply(applyPlan(images, renders, { ...applyOpts, productName }))
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* PMD-05 AC 1: a largura do desenho. `max-w-[95vw]` porque o backoffice é ferramenta de
          desktop, mas 1360 px fixos numa tela de 1280 esconderiam a coluna da direita. */}
      <DialogContent className="w-[1360px] max-w-[95vw] h-[886px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-nana-violet" /> Estúdio de mockup
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 gap-4">
          {/* ── Coluna esquerda: origem e mockups ─────────────────────────── */}
          <div data-testid="studio-source" className="flex w-[264px] shrink-0 flex-col gap-4 overflow-y-auto pr-1">
            <section className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Arte de origem</p>
              <input ref={artInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleArtUpload(e.target.files[0])} />
              <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => artInputRef.current?.click()} disabled={loadingArt}>
                {loadingArt ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-1 h-4 w-4" />}
                Enviar nova arte
              </Button>
              {artLabel && <p className="truncate text-xs text-muted-foreground">{artLabel}</p>}
              {productImages.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs text-muted-foreground">Ou use uma imagem do produto:</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {productImages.map((url, i) => (
                      <button
                        key={`${url}-${i}`}
                        type="button"
                        aria-label={`Usar imagem ${i + 1} do produto`}
                        onClick={() => selectExistingArt(url)}
                        className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${artSrc === url ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'}`}
                      >
                        <img src={url} alt={`Imagem ${i + 1}`} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Mockups a aplicar</p>
              {activeTemplates.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  Nenhum mockup ativo. Crie um em Mockups.
                </p>
              ) : (
                <ul className="space-y-1">
                  {activeTemplates.map(t => {
                    const selected = selectedIds.includes(t.id)
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleTemplate(t.id)}
                          className={`flex w-full items-center gap-2 rounded-lg border p-1.5 text-left transition-colors ${selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                        >
                          {/* Thumb de 38 px, como o artboard. */}
                          <img src={t.background_url} alt="" className="h-[38px] w-[38px] shrink-0 rounded object-cover" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium text-foreground">{t.name}</span>
                            {/* PMD-05 AC 2: o estado do relevo, por template. */}
                            {hasRelief(t) ? (
                              <span className="block text-[11px] text-muted-foreground">relevo medido</span>
                            ) : (
                              <span className="flex items-center gap-1 text-[11px] text-amber-600">
                                <AlertTriangle className="h-3 w-3" /> relevo não medido — sai chapado
                              </span>
                            )}
                          </span>
                          {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>

          {/* ── Coluna central: palco ─────────────────────────────────────── */}
          <div data-testid="studio-stage" className="flex min-w-0 flex-1 flex-col gap-2 overflow-hidden">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <Button type="button" variant="outline" size="sm" aria-label="Diminuir zoom" onClick={() => setZoom(z => Math.max(0.5, Number((z - 0.25).toFixed(2))))}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
                <Button type="button" variant="outline" size="sm" aria-label="Aumentar zoom" onClick={() => setZoom(z => Math.min(3, Number((z + 0.25).toFixed(2))))}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
              <Button
                type="button"
                variant={showBefore ? 'default' : 'outline'}
                size="sm"
                aria-pressed={showBefore}
                onClick={() => setShowBefore(v => !v)}
              >
                {showBefore ? 'Antes' : 'Depois'}
              </Button>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-xl border border-border bg-muted/40">
              {!artImage ? (
                <p className="p-6 text-center text-sm text-muted-foreground">Escolha uma arte para começar.</p>
              ) : !stageTemplate ? (
                <p className="p-6 text-center text-sm text-muted-foreground">Selecione um mockup à esquerda.</p>
              ) : !stageAsset ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <canvas ref={stageCanvasRef} data-testid="studio-canvas" className="max-h-full max-w-full" />
              )}
            </div>

            {/* PMD-05 AC 3: as camadas. Fundo e Arte são entradas obrigatórias do engine — aparecem
                como fixas em vez de ganharem um interruptor que não faria nada. */}
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-3 py-2 text-xs">
              <span className="font-medium text-foreground">Camadas</span>
              <span className="text-muted-foreground">Fundo · sempre</span>
              <span className="text-muted-foreground">Arte · sempre</span>
              <label className="flex items-center gap-1.5">
                <Switch
                  aria-label="Camada Relevo"
                  checked={layers.relevo && !!stageTemplate && hasRelief(stageTemplate)}
                  disabled={!stageTemplate || !hasRelief(stageTemplate)}
                  onCheckedChange={v => setLayers(l => ({ ...l, relevo: v }))}
                />
                Relevo{stageTemplate && !hasRelief(stageTemplate) ? ' · não medido' : ''}
              </label>
              <label className="flex items-center gap-1.5">
                <Switch
                  aria-label="Camada Overlay"
                  checked={layers.overlay && !!stageTemplate?.overlay_url}
                  disabled={!stageTemplate?.overlay_url}
                  onCheckedChange={v => setLayers(l => ({ ...l, overlay: v }))}
                />
                Overlay{stageTemplate && !stageTemplate.overlay_url ? ' · sem overlay' : ''}
              </label>
            </div>

            {/* Filmstrip dos renders, com estado. */}
            <ul aria-label="Renders" className="flex shrink-0 gap-2 overflow-x-auto">
              {selectedIds.map(id => {
                const t = activeTemplates.find(x => x.id === id)
                if (!t) return null
                const state = renderState(id)
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => setStageId(id)}
                      aria-pressed={stageId === id}
                      className={`w-[92px] rounded-lg border p-1 text-left ${stageId === id ? 'border-primary' : 'border-border'}`}
                    >
                      <img src={t.background_url} alt="" className="h-14 w-full rounded object-cover" />
                      <span className="mt-1 block truncate text-[10px] text-muted-foreground">{t.name}</span>
                      <span
                        className={`block text-[10px] font-medium ${state === 'com aviso' ? 'text-amber-600' : state === 'compondo' ? 'text-muted-foreground' : 'text-green-600'}`}
                      >
                        {state}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* ── Coluna direita: ajustes e saída ───────────────────────────── */}
          <div data-testid="studio-controls" className="flex w-[300px] shrink-0 flex-col gap-4 overflow-y-auto pl-1">
            <section className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Ajuste da arte</p>
              {!stageTemplate ? (
                <p className="text-xs text-muted-foreground">Selecione um mockup para ajustar.</p>
              ) : (
                <div className="space-y-1.5">
                  <SliderRow label="Escala" value={stageAdjust.scale} min={0.5} max={2.5} step={0.05} onChange={v => setStageAdjust({ scale: v })} />
                  <SliderRow label="Horizontal" value={stageAdjust.offsetX} min={-0.5} max={0.5} step={0.01} onChange={v => setStageAdjust({ offsetX: v })} />
                  <SliderRow label="Vertical" value={stageAdjust.offsetY} min={-0.5} max={0.5} step={0.01} onChange={v => setStageAdjust({ offsetY: v })} />
                  <SliderRow label={`Rotação ${stageAdjust.rotation}°`} value={stageAdjust.rotation} min={-180} max={180} step={1} onChange={v => setStageAdjust({ rotation: v })} />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={selectedIds.length < 2}
                    onClick={applyAdjustToAll}
                  >
                    Aplicar a todos
                  </Button>
                </div>
              )}
            </section>

            {/* PMD-05 AC 5 */}
            <section className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Saída</p>
              <div className="flex gap-1" role="group" aria-label="Resolução">
                {RESOLUTIONS.map(value => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={resolution === value ? 'default' : 'outline'}
                    aria-pressed={resolution === value}
                    className="flex-1"
                    onClick={() => setResolution(value)}
                  >
                    {value} px
                  </Button>
                ))}
              </div>
              <div className="flex gap-1" role="group" aria-label="Formato">
                {FORMATS.map(({ value, label }) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={format === value ? 'default' : 'outline'}
                    aria-pressed={format === value}
                    className="flex-1"
                    onClick={() => setFormat(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </section>

            {/* PMD-05 AC 6 */}
            <section className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Ao aplicar</p>
              <div className="flex gap-1" role="group" aria-label="Modo de aplicação">
                <Button
                  type="button"
                  size="sm"
                  variant={applyOpts.mode === 'append' ? 'default' : 'outline'}
                  aria-pressed={applyOpts.mode === 'append'}
                  className="flex-1"
                  onClick={() => setApplyOpts(o => ({ ...o, mode: 'append' }))}
                >
                  Anexar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={applyOpts.mode === 'replace' ? 'default' : 'outline'}
                  aria-pressed={applyOpts.mode === 'replace'}
                  className="flex-1"
                  onClick={() => setApplyOpts(o => ({ ...o, mode: 'replace' }))}
                >
                  Substituir
                </Button>
              </div>
              <label className="flex items-center gap-2 text-xs text-foreground">
                <Switch
                  aria-label="Definir 1ª como principal"
                  checked={applyOpts.firstAsPrimary}
                  onCheckedChange={v => setApplyOpts(o => ({ ...o, firstAsPrimary: v }))}
                />
                Definir 1ª como principal
              </label>
              <label className="flex items-center gap-2 text-xs text-foreground">
                <Switch
                  aria-label="Gerar alt-text de cada render"
                  checked={applyOpts.generateAlt}
                  onCheckedChange={v => setApplyOpts(o => ({ ...o, generateAlt: v }))}
                />
                Gerar alt-text de cada render
              </label>
            </section>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border pt-3">
          {/* PMD-05 AC 7: a promessa explícita de que nada foi salvo ainda. */}
          <p className="text-xs text-muted-foreground">
            {!artImage
              ? 'Escolha uma arte.'
              : selectedIds.length === 0
                ? 'Selecione ao menos um mockup.'
                : `${selectedIds.length} renders em ${resolution} px · leva ~${estimateSeconds(selectedIds.length)} s · nada é salvo antes de você aplicar`}
          </p>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              type="button"
              className="gradient-cta text-white"
              onClick={handleApply}
              disabled={!artImage || selectedIds.length === 0 || generating}
            >
              {generating ? (
                <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Gerando...</>
              ) : (
                `Aplicar ${selectedIds.length} imagens ao produto`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MockupStudioDialog
