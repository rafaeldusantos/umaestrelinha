import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@estrelinha/ui/dialog'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@estrelinha/ui/select'
import { Slider } from '@estrelinha/ui/slider'
import { FlaskConical, ImagePlus, Loader2, X } from 'lucide-react'
import { toast } from '@estrelinha/ui/hooks/use-toast'
import { loadImage } from '@estrelinha/core'
import type { ArtZone, MockupBlendMode, MockupTemplate } from '@estrelinha/supabase/types'
import { uploadMockupAsset, type MockupTemplateInput } from '@/entities/mockup'
import { FieldGroup, ToggleField } from '@/shared/ui'
import ArtZoneEditor from './ArtZoneEditor'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  template?: MockupTemplate | null
  onSave: (data: MockupTemplateInput) => Promise<Error | null>
}

const BLEND_OPTIONS: { value: MockupBlendMode; label: string }[] = [
  { value: 'multiply', label: 'Multiply (sombras)' },
  { value: 'screen', label: 'Screen (brilhos)' },
  { value: 'overlay', label: 'Overlay (contraste)' },
  { value: 'soft-light', label: 'Soft light (suave)' },
  { value: 'normal', label: 'Normal (sem blend)' },
]

const DEFAULT_ZONE: ArtZone = { shape: 'ellipse', cx: 0.5, cy: 0.5, rx: 0.35, ry: 0.35, rotation: 0 }

// Arte de amostra gerada em canvas (cacheada) para a prévia realista — evita adicionar assets.
let sampleArtPromise: Promise<HTMLImageElement> | null = null
const getSampleArt = (): Promise<HTMLImageElement> => {
  if (sampleArtPromise) return sampleArtPromise
  sampleArtPromise = new Promise((resolve, reject) => {
    const size = 600
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return reject(new Error('canvas 2d indisponível'))
    const grad = ctx.createLinearGradient(0, 0, size, size)
    grad.addColorStop(0, '#7C3AED')
    grad.addColorStop(1, '#EC4899')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size * 0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#7C3AED'
    ctx.font = `bold ${size * 0.16}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('ARTE', size / 2, size / 2)
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('falha ao gerar arte de amostra'))
    img.src = canvas.toDataURL('image/png')
  })
  return sampleArtPromise
}

const MockupTemplateDialog = ({ open, onOpenChange, template, onSave }: Props) => {
  const isEdit = !!template
  const [name, setName] = useState('')
  const [blendMode, setBlendMode] = useState<MockupBlendMode>('multiply')
  const [shadingGain, setShadingGain] = useState(1)
  const [isActive, setIsActive] = useState(true)
  const [sortOrder, setSortOrder] = useState(0)
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null)
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null)
  const [artZone, setArtZone] = useState<ArtZone>(DEFAULT_ZONE)

  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)
  const [overlayImage, setOverlayImage] = useState<HTMLImageElement | null>(null)
  const [sampleArt, setSampleArt] = useState<HTMLImageElement | null>(null)
  // Arte enviada só para testar a prévia (não é salva nem enviada ao Storage).
  const [testArt, setTestArt] = useState<HTMLImageElement | null>(null)
  const [uploadingBg, setUploadingBg] = useState(false)
  const [uploadingOverlay, setUploadingOverlay] = useState(false)
  const [saving, setSaving] = useState(false)

  const bgInputRef = useRef<HTMLInputElement>(null)
  const overlayInputRef = useRef<HTMLInputElement>(null)
  const testArtInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getSampleArt().then(setSampleArt).catch(() => setSampleArt(null))
  }, [])

  // Sincroniza o form com a template em edição (ou reseta para criar) ao abrir.
  useEffect(() => {
    if (!open) return
    setTestArt(null)
    if (template) {
      setName(template.name)
      setBlendMode(template.blend_mode)
      setShadingGain(template.shading_gain ?? 1)
      setIsActive(template.is_active)
      setSortOrder(template.sort_order)
      setBackgroundUrl(template.background_url)
      setOverlayUrl(template.overlay_url)
      setArtZone(template.art_zone)
      loadImage(template.background_url).then(setBgImage).catch(() => setBgImage(null))
      if (template.overlay_url) loadImage(template.overlay_url).then(setOverlayImage).catch(() => setOverlayImage(null))
      else setOverlayImage(null)
    } else {
      setName('')
      setBlendMode('multiply')
      setShadingGain(1)
      setIsActive(true)
      setSortOrder(0)
      setBackgroundUrl(null)
      setOverlayUrl(null)
      setArtZone(DEFAULT_ZONE)
      setBgImage(null)
      setOverlayImage(null)
    }
  }, [template, open])

  const handleTestArtFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    try {
      setTestArt(await loadImage(URL.createObjectURL(file)))
    } catch {
      toast({ title: 'Não foi possível carregar a arte de teste', variant: 'destructive' })
    }
  }

  const handleBgFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setUploadingBg(true)
    // Preview imediato a partir do arquivo (same-origin, sem depender de CORS do Storage).
    loadImage(URL.createObjectURL(file)).then(setBgImage).catch(() => {})
    const url = await uploadMockupAsset(file, 'background')
    setUploadingBg(false)
    if (url) setBackgroundUrl(url)
    else toast({ title: 'Erro ao enviar o fundo', variant: 'destructive' })
  }

  const handleOverlayFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setUploadingOverlay(true)
    loadImage(URL.createObjectURL(file)).then(setOverlayImage).catch(() => {})
    const url = await uploadMockupAsset(file, 'overlay')
    setUploadingOverlay(false)
    if (url) setOverlayUrl(url)
    else toast({ title: 'Erro ao enviar o overlay', variant: 'destructive' })
  }

  const clearOverlay = () => {
    setOverlayUrl(null)
    setOverlayImage(null)
    if (overlayInputRef.current) overlayInputRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!name.trim()) return toast({ title: 'Informe um nome', variant: 'destructive' })
    if (!backgroundUrl) return toast({ title: 'O fundo é obrigatório', variant: 'destructive' })
    setSaving(true)
    const err = await onSave({
      name: name.trim(),
      background_url: backgroundUrl,
      overlay_url: overlayUrl,
      art_zone: artZone,
      blend_mode: blendMode,
      shading_gain: shadingGain,
      is_active: isActive,
      sort_order: sortOrder,
    })
    setSaving(false)
    if (err) toast({ title: 'Erro ao salvar', variant: 'destructive' })
    else {
      toast({ title: isEdit ? 'Mockup atualizado!' : 'Mockup criado!' })
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{isEdit ? 'Editar mockup' : 'Novo mockup'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Coluna: campos */}
          <div className="space-y-4">
            <FieldGroup label="Nome" htmlFor="mockup-name">
              <Input id="mockup-name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Botton frontal 45mm" />
            </FieldGroup>

            <FieldGroup
              label="Fundo (obrigatório)"
              hint="PNG/JPG. Prefira a foto do botton EM BRANCO (sem estampa): a iluminação do mockup é medida desta foto."
            >
              <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleBgFile(e.target.files[0])} />
              <button
                type="button"
                onClick={() => bgInputRef.current?.click()}
                className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border p-3 text-left transition-colors hover:border-primary/50"
              >
                {uploadingBg ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : backgroundUrl ? (
                  <img src={backgroundUrl} alt="Fundo" className="h-10 w-10 rounded-lg object-cover" />
                ) : (
                  <ImagePlus className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="text-sm text-muted-foreground">{backgroundUrl ? 'Trocar fundo' : 'Enviar fundo'}</span>
              </button>
            </FieldGroup>

            <FieldGroup
              label="Overlay (opcional)"
              hint="PNG transparente com brilhos/reflexos extras (ex.: glints de metal); aplicado com o blend escolhido."
            >
              <input ref={overlayInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleOverlayFile(e.target.files[0])} />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => overlayInputRef.current?.click()}
                  className="flex flex-1 items-center gap-3 rounded-xl border border-dashed border-border p-3 text-left transition-colors hover:border-primary/50"
                >
                  {uploadingOverlay ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : overlayUrl ? (
                    <img src={overlayUrl} alt="Overlay" className="h-10 w-10 rounded-lg border border-border object-cover" />
                  ) : (
                    <ImagePlus className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground">{overlayUrl ? 'Trocar overlay' : 'Enviar overlay'}</span>
                </button>
                {overlayUrl && (
                  <Button type="button" variant="ghost" size="icon" onClick={clearOverlay} aria-label="Remover overlay">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </FieldGroup>

            <div className="grid grid-cols-2 gap-3">
              <FieldGroup label="Blend">
                <Select value={blendMode} onValueChange={v => setBlendMode(v as MockupBlendMode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BLEND_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldGroup>
              <FieldGroup label="Ordem" htmlFor="mockup-order">
                <Input id="mockup-order" type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} />
              </FieldGroup>
            </div>

            <FieldGroup
              label={`Relevo do botton (${Math.round(shadingGain * 100)}%)`}
              hint="Sombreamento do domo medido da foto do fundo. 0% desliga; 100% = luz real da foto."
            >
              <Slider
                value={[shadingGain]}
                min={0}
                max={2}
                step={0.05}
                onValueChange={([v]) => setShadingGain(v)}
              />
            </FieldGroup>

            <ToggleField label="Ativo" description="Disponível na loja e no estúdio" checked={isActive} onChange={setIsActive} />
          </div>

          {/* Coluna: editor da art-zone + prévia realista */}
          <div>
            {bgImage ? (
              <>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">Área da arte</p>
                    <p className="text-xs text-muted-foreground">Arraste o centro para mover; os pontos brancos ajustam raio e rotação.</p>
                  </div>
                  {/* Arte só para a prévia — reflete cada mudança do form sem salvar nada. */}
                  <input
                    ref={testArtInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => e.target.files?.[0] && handleTestArtFile(e.target.files[0])}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => testArtInputRef.current?.click()}
                    title="Testar a prévia com uma arte sua (não é salva no template)"
                  >
                    <FlaskConical className="mr-1 h-3.5 w-3.5" /> Arte de teste
                  </Button>
                </div>
                <ArtZoneEditor
                  background={bgImage}
                  value={artZone}
                  onChange={setArtZone}
                  art={testArt ?? sampleArt}
                  overlay={overlayImage}
                  blendMode={blendMode}
                  shadingGain={shadingGain}
                />
              </>
            ) : (
              <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground">
                Envie um fundo para posicionar a arte
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" className="gradient-cta text-white" onClick={handleSubmit} disabled={saving || uploadingBg || uploadingOverlay}>
            {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar mockup'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MockupTemplateDialog
