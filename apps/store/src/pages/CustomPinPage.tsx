import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { Slider } from '@estrelinha/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@estrelinha/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@estrelinha/ui/tabs'
import { ImagePlus, Type, Download, RotateCcw, ZoomIn, ZoomOut, Move, Trash2, Palette, Sparkles, ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/entities/cart/model/cartStore'
import { toast } from '@estrelinha/ui/hooks/use-toast'
import type { Product } from '@estrelinha/supabase/types'
import { useMockups } from '@estrelinha/core'
import { MockupPreviewCarousel } from '@/features/mockup-preview'

const PIN_SIZES = [
  { label: '3,5 cm', value: 3.5, px: 200, price: 4.90 },
  { label: '4,5 cm', value: 4.5, px: 260, price: 5.90 },
  { label: '5,5 cm', value: 5.5, px: 320, price: 7.90 },
  { label: '7,5 cm', value: 7.5, px: 420, price: 9.90 },
]

const FONTS = [
  'DM Sans', 'Syne', 'Arial', 'Georgia', 'Courier New', 'Impact', 'Comic Sans MS',
]

const SOLID_COLORS = [
  '#F5F3FF', '#E8E0F0', '#FFFFFF', '#1E1A3E', '#7C3AED', '#A855F7',
  '#F0057A', '#FF4DCA', '#00E5FF', '#FFD700', '#FF6B35', '#2DD4BF',
  '#F43F5E', '#84CC16', '#3B82F6', '#000000',
]

const GRADIENTS = [
  { name: 'Violeta', css: 'linear-gradient(135deg, #7C3AED, #A855F7)', stops: [['#7C3AED', 0], ['#A855F7', 1]] },
  { name: 'Sunset', css: 'linear-gradient(135deg, #F0057A, #FFD700)', stops: [['#F0057A', 0], ['#FFD700', 1]] },
  { name: 'Oceano', css: 'linear-gradient(135deg, #3B82F6, #00E5FF)', stops: [['#3B82F6', 0], ['#00E5FF', 1]] },
  { name: 'Sakura', css: 'linear-gradient(135deg, #FF4DCA, #F5F3FF)', stops: [['#FF4DCA', 0], ['#F5F3FF', 1]] },
  { name: 'Floresta', css: 'linear-gradient(135deg, #84CC16, #2DD4BF)', stops: [['#84CC16', 0], ['#2DD4BF', 1]] },
  { name: 'Fogo', css: 'linear-gradient(135deg, #F43F5E, #FF6B35)', stops: [['#F43F5E', 0], ['#FF6B35', 1]] },
  { name: 'Noite', css: 'linear-gradient(135deg, #1E1A3E, #7C3AED)', stops: [['#1E1A3E', 0], ['#7C3AED', 1]] },
  { name: 'Arco-íris', css: 'linear-gradient(135deg, #F43F5E, #FFD700, #84CC16, #3B82F6, #A855F7)', stops: [['#F43F5E', 0], ['#FFD700', 0.25], ['#84CC16', 0.5], ['#3B82F6', 0.75], ['#A855F7', 1]] },
] as const

// Emoji stickers that render on canvas
const STICKER_CATEGORIES = [
  {
    name: '🌟 Populares',
    items: ['⭐', '✨', '💖', '🔥', '🎵', '🌈', '💎', '🦄', '🌸', '🍀', '🎀', '👑'],
  },
  {
    name: '🎮 Geek',
    items: ['🎮', '🕹️', '👾', '🤖', '🚀', '🛸', '⚡', '💀', '🧠', '🔮', '🗡️', '🛡️'],
  },
  {
    name: '🐱 Animais',
    items: ['🐱', '🐶', '🐰', '🦊', '🐻', '🐼', '🦋', '🐝', '🐙', '🦜', '🐸', '🦉'],
  },
  {
    name: '🍕 Comida',
    items: ['🍕', '🍩', '🧁', '🍦', '☕', '🍓', '🌮', '🍔', '🎂', '🍪', '🥑', '🍣'],
  },
  {
    name: '💬 Símbolos',
    items: ['❤️', '💜', '💙', '💚', '🖤', '🤍', '☮️', '✌️', '🎯', '♻️', '☯️', '🏳️‍🌈'],
  },
]

interface TextLayer {
  id: string
  text: string
  x: number
  y: number
  fontSize: number
  fontFamily: string
  color: string
  bold: boolean
  rotation: number
}

type BgType = 'solid' | 'gradient' | 'custom'

interface BgState {
  type: BgType
  solidColor: string
  gradientIdx: number
  customColor1: string
  customColor2: string
}

const CustomPinPage = () => {
  const navigate = useNavigate()
  const addItem = useCartStore(s => s.addItem)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [sizeIdx, setSizeIdx] = useState(1)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [imgScale, setImgScale] = useState(1)
  const [imgOffset, setImgOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState<'image' | string | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const [textLayers, setTextLayers] = useState<TextLayer[]>([])
  const [selectedText, setSelectedText] = useState<string | null>(null)
  const [newText, setNewText] = useState('')
  const [newFont, setNewFont] = useState('DM Sans')
  const [newColor, setNewColor] = useState('#FFFFFF')
  const [newFontSize, setNewFontSize] = useState(24)
  const [newBold, setNewBold] = useState(true)

  const [bg, setBg] = useState<BgState>({
    type: 'solid',
    solidColor: '#E8E0F0',
    gradientIdx: 0,
    customColor1: '#7C3AED',
    customColor2: '#FF4DCA',
  })

  const { data: mockups } = useMockups()
  const hasMockups = (mockups ?? []).length > 0
  const [showPreview, setShowPreview] = useState(false)

  const pinPx = PIN_SIZES[sizeIdx].px
  const canvasSize = 440
  const radius = pinPx / 2
  const center = canvasSize / 2

  const fillBackground = useCallback((ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
    if (bg.type === 'solid') {
      ctx.fillStyle = bg.solidColor
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
    } else {
      let stops: [string, number][]
      if (bg.type === 'gradient') {
        stops = GRADIENTS[bg.gradientIdx].stops as unknown as [string, number][]
      } else {
        stops = [[bg.customColor1, 0], [bg.customColor2, 1]]
      }
      const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
      stops.forEach(([color, pos]) => grad.addColorStop(pos, color))
      ctx.fillStyle = grad
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
    }
  }, [bg])

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasSize * dpr
    canvas.height = canvasSize * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvasSize, canvasSize)

    ctx.save()
    ctx.beginPath()
    ctx.arc(center, center, radius, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()

    fillBackground(ctx, center, center, radius)

    if (image) {
      const w = image.width * imgScale
      const h = image.height * imgScale
      ctx.drawImage(image, center - w / 2 + imgOffset.x, center - h / 2 + imgOffset.y, w, h)
    }

    textLayers.forEach(layer => {
      ctx.save()
      ctx.translate(center + layer.x, center + layer.y)
      ctx.rotate((layer.rotation * Math.PI) / 180)
      ctx.font = `${layer.bold ? 'bold ' : ''}${layer.fontSize}px "${layer.fontFamily}"`
      ctx.fillStyle = layer.color
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'
      ctx.lineWidth = layer.fontSize > 20 ? 3 : 2
      ctx.strokeText(layer.text, 0, 0)
      ctx.fillText(layer.text, 0, 0)
      ctx.restore()
    })

    ctx.restore()

    ctx.beginPath()
    ctx.arc(center, center, radius, 0, Math.PI * 2)
    ctx.strokeStyle = '#C4B5FD'
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(center, center, radius + 2, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(124,58,237,0.15)'
    ctx.lineWidth = 6
    ctx.stroke()

    if (selectedText) {
      const layer = textLayers.find(l => l.id === selectedText)
      if (layer) {
        ctx.save()
        ctx.translate(center + layer.x, center + layer.y)
        ctx.rotate((layer.rotation * Math.PI) / 180)
        ctx.font = `${layer.bold ? 'bold ' : ''}${layer.fontSize}px "${layer.fontFamily}"`
        const metrics = ctx.measureText(layer.text)
        const tw = metrics.width + 12
        const th = layer.fontSize + 10
        ctx.setLineDash([4, 4])
        ctx.strokeStyle = '#7C3AED'
        ctx.lineWidth = 2
        ctx.strokeRect(-tw / 2, -th / 2, tw, th)
        ctx.restore()
      }
    }
  }, [image, imgScale, imgOffset, textLayers, sizeIdx, selectedText, center, radius, pinPx, fillBackground])

  useEffect(() => { drawCanvas() }, [drawCanvas])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const img = new Image()
    img.onload = () => {
      setImage(img)
      const scale = Math.max(pinPx / img.width, pinPx / img.height) * 1.1
      setImgScale(scale)
      setImgOffset({ x: 0, y: 0 })
    }
    img.src = URL.createObjectURL(file)
  }

  const addText = () => {
    if (!newText.trim()) return
    const layer: TextLayer = {
      id: crypto.randomUUID(),
      text: newText,
      x: 0, y: 0,
      fontSize: newFontSize,
      fontFamily: newFont,
      color: newColor,
      bold: newBold,
      rotation: 0,
    }
    setTextLayers(prev => [...prev, layer])
    setSelectedText(layer.id)
    setNewText('')
  }

  const addSticker = (emoji: string) => {
    const layer: TextLayer = {
      id: crypto.randomUUID(),
      text: emoji,
      x: (Math.random() - 0.5) * radius * 0.8,
      y: (Math.random() - 0.5) * radius * 0.8,
      fontSize: 40,
      fontFamily: 'Arial',
      color: '#000000',
      bold: false,
      rotation: 0,
    }
    setTextLayers(prev => [...prev, layer])
    setSelectedText(layer.id)
  }

  const updateSelectedLayer = (patch: Partial<TextLayer>) => {
    if (!selectedText) return
    setTextLayers(prev => prev.map(l => l.id === selectedText ? { ...l, ...patch } : l))
  }

  const removeSelectedLayer = () => {
    if (!selectedText) return
    setTextLayers(prev => prev.filter(l => l.id !== selectedText))
    setSelectedText(null)
  }

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getCanvasPos(e)
    const scaleRatio = canvasSize / canvasRef.current!.getBoundingClientRect().width
    const cx = (pos.x * scaleRatio) - center
    const cy = (pos.y * scaleRatio) - center

    for (let i = textLayers.length - 1; i >= 0; i--) {
      const l = textLayers[i]
      const dx = cx - l.x
      const dy = cy - l.y
      if (Math.abs(dx) < l.fontSize * 2 && Math.abs(dy) < l.fontSize) {
        setSelectedText(l.id)
        setDragging(l.id)
        setDragStart({ x: pos.x * scaleRatio - l.x, y: pos.y * scaleRatio - l.y })
        return
      }
    }

    setSelectedText(null)
    setDragging('image')
    setDragStart({ x: pos.x * scaleRatio - imgOffset.x, y: pos.y * scaleRatio - imgOffset.y })
  }

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragging) return
    const pos = getCanvasPos(e)
    const scaleRatio = canvasSize / canvasRef.current!.getBoundingClientRect().width
    const px = pos.x * scaleRatio
    const py = pos.y * scaleRatio

    if (dragging === 'image') {
      setImgOffset({ x: px - dragStart.x, y: py - dragStart.y })
    } else {
      setTextLayers(prev => prev.map(l =>
        l.id === dragging ? { ...l, x: px - dragStart.x, y: py - dragStart.y } : l
      ))
    }
  }

  const handlePointerUp = () => setDragging(null)

  const handleExport = () => {
    const prev = selectedText
    setSelectedText(null)
    setTimeout(() => {
      const dataUrl = generateExportDataUrl()
      const link = document.createElement('a')
      link.download = `meu-botton-${PIN_SIZES[sizeIdx].label.replace(',', '')}.png`
      link.href = dataUrl
      link.click()
      setSelectedText(prev)
    }, 50)
  }

  const generateExportDataUrl = (): string => {
    const exportCanvas = document.createElement('canvas')
    const size = pinPx * 2
    exportCanvas.width = size
    exportCanvas.height = size
    const ctx = exportCanvas.getContext('2d')!
    const r = size / 2

    // No editor o botton tem diâmetro `pinPx` dentro de um canvas de `canvasSize`;
    // aqui o canvas inteiro É o botton (diâmetro `size`). A conversão de coordenadas
    // do editor para o export é, portanto, size/pinPx — usar size/canvasSize encolhe
    // a arte em relação ao círculo e ignora o zoom aplicado no editor.
    const ratio = size / pinPx

    ctx.beginPath()
    ctx.arc(r, r, r, 0, Math.PI * 2)
    ctx.clip()
    fillBackground(ctx, r, r, r)

    if (image) {
      const w = image.width * imgScale * ratio
      const h = image.height * imgScale * ratio
      const ox = imgOffset.x * ratio
      const oy = imgOffset.y * ratio
      ctx.drawImage(image, r - w / 2 + ox, r - h / 2 + oy, w, h)
    }

    textLayers.forEach(layer => {
      ctx.save()
      ctx.translate(r + layer.x * ratio, r + layer.y * ratio)
      ctx.rotate((layer.rotation * Math.PI) / 180)
      const fs = layer.fontSize * ratio
      ctx.font = `${layer.bold ? 'bold ' : ''}${fs}px "${layer.fontFamily}"`
      ctx.fillStyle = layer.color
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'
      ctx.lineWidth = (layer.fontSize > 20 ? 3 : 2) * ratio
      ctx.strokeText(layer.text, 0, 0)
      ctx.fillText(layer.text, 0, 0)
      ctx.restore()
    })

    return exportCanvas.toDataURL('image/png')
  }

  const handleAddToCart = () => {
    const dataUrl = generateExportDataUrl()
    const sizeInfo = PIN_SIZES[sizeIdx]
    const customProduct: Product = {
      id: `custom-${Date.now()}`,
      name: 'Botton Personalizado',
      slug: `botton-personalizado-${Date.now()}`,
      price: sizeInfo.price,
      compare_price: null,
      category_id: 'custom',
      category_slug: 'personalizado',
      description: `Botton personalizado ${sizeInfo.label}`,
      image_url: dataUrl,
      // Produto sintético (A3): a "imagem" é o próprio render do canvas, e `source: 'mockup'` é o
      // que ela é de fato — não veio de upload nem de import.
      images: [{ url: dataUrl, alt: `Botton personalizado ${sizeInfo.label}`, source: 'mockup' }],
      // A3: o pin personalizado segue sintético — sem grade e sem controle de saldo. `none` é
      // exatamente o modo dele: a loja nunca o marca como esgotado.
      options: [],
      variants: [],
      stock_policy: 'none',
      category_links: [],
      stock_total: 999,
      low_stock_threshold: 0,
      is_new: true,
      is_featured: false,
      tags: ['personalizado'],
    }
    addItem(customProduct, sizeInfo.label, 'Personalizado')
    toast({
      title: '✨ Botton adicionado ao carrinho!',
      description: `${sizeInfo.label} — R$ ${sizeInfo.price.toFixed(2).replace('.', ',')}`,
    })
  }

  const resetAll = () => {
    setImage(null)
    setImgScale(1)
    setImgOffset({ x: 0, y: 0 })
    setTextLayers([])
    setSelectedText(null)
    setBg({ type: 'solid', solidColor: '#E8E0F0', gradientIdx: 0, customColor1: '#7C3AED', customColor2: '#FF4DCA' })
  }

  const selectedLayer = textLayers.find(l => l.id === selectedText)

  return (
    <div className="min-h-screen bg-[var(--white)] py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-nanita-ink mb-2">
            Crie Seu Botton ✨
          </h1>
          <p className="text-nanita-plum text-lg">
            Monte seu botton personalizado com imagem, stickers e texto
          </p>
        </div>

        <div className="grid md:grid-cols-[1fr_400px] gap-8">
          {/* Canvas preview */}
          <div className="flex flex-col items-center gap-6">
            <div className="bg-white border border-nanita-border rounded-2xl p-6 shadow-sm w-full flex flex-col items-center">
              {hasMockups && (
                <div className="mb-4 grid w-full max-w-xs grid-cols-2 gap-1 rounded-xl bg-nanita-sugar p-1">
                  <button
                    type="button"
                    onClick={() => setShowPreview(false)}
                    className={`rounded-lg py-1.5 text-sm font-medium transition-all ${!showPreview ? 'bg-white text-nanita-jam shadow-sm' : 'text-nanita-plum'}`}
                  >
                    Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPreview(true)}
                    className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-sm font-medium transition-all ${showPreview ? 'bg-white text-nanita-jam shadow-sm' : 'text-nanita-plum'}`}
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Prévia real
                  </button>
                </div>
              )}

              {/* Editor — sempre montado (preserva drawCanvas); oculto na prévia */}
              <div className={showPreview && hasMockups ? 'hidden' : 'flex w-full flex-col items-center'}>
                <p className="text-xs text-nanita-plum mb-3 flex items-center gap-1">
                  <Move className="w-3.5 h-3.5" /> Arraste a imagem ou textos para posicionar
                </p>
                <canvas
                  ref={canvasRef}
                  style={{ width: Math.min(pinPx + 40, 380), height: Math.min(pinPx + 40, 380), cursor: dragging ? 'grabbing' : 'grab' }}
                  className="touch-none"
                  onMouseDown={handlePointerDown}
                  onMouseMove={handlePointerMove}
                  onMouseUp={handlePointerUp}
                  onMouseLeave={handlePointerUp}
                  onTouchStart={handlePointerDown}
                  onTouchMove={handlePointerMove}
                  onTouchEnd={handlePointerUp}
                />
                <p className="text-sm text-nanita-plum mt-3 font-medium">
                  Tamanho real: {PIN_SIZES[sizeIdx].label}
                </p>
              </div>

              {/* Prévia real — mockups realistas, display-only (STR-03: download/carrinho seguem a arte chapada) */}
              {showPreview && hasMockups && (
                <MockupPreviewCarousel artDataUrl={generateExportDataUrl()} />
              )}
            </div>

            {/* Price & actions */}
            <div className="bg-white border border-nanita-border rounded-2xl p-5 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-nanita-plum text-sm">Botton {PIN_SIZES[sizeIdx].label}</span>
                <span className="font-heading text-2xl font-bold text-nanita-jam">
                  R$ {PIN_SIZES[sizeIdx].price.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <Button
                onClick={handleAddToCart}
                className="w-full bg-nanita-jam text-white rounded-xl gap-2 h-11 text-base font-semibold"
                disabled={!image && textLayers.length === 0 && bg.type === 'solid' && bg.solidColor === '#E8E0F0'}
              >
                <ShoppingCart className="w-5 h-5" /> Adicionar ao Carrinho
              </Button>
              <div className="flex gap-2">
                <Button onClick={handleExport} variant="outline" className="flex-1 border-2 border-nanita-jam text-nanita-jam hover:bg-nanita-sugar rounded-xl gap-2 text-sm" disabled={!image && textLayers.length === 0 && bg.type === 'solid' && bg.solidColor === '#E8E0F0'}>
                  <Download className="w-4 h-4" /> Baixar PNG
                </Button>
                <Button variant="outline" onClick={resetAll} className="border-2 border-nanita-border text-nanita-plum hover:bg-nanita-sugar rounded-xl gap-2 text-sm">
                  <RotateCcw className="w-4 h-4" /> Limpar
                </Button>
              </div>
            </div>
          </div>

          {/* Controls with tabs */}
          <div className="space-y-4">
            {/* Size */}
            <div className="bg-white border border-nanita-border rounded-2xl p-4 space-y-3">
              <Label className="font-heading font-semibold text-nanita-ink">Tamanho do Botton</Label>
              <div className="grid grid-cols-4 gap-2">
                {PIN_SIZES.map((s, i) => (
                  <button
                    key={s.value}
                    onClick={() => {
                      setSizeIdx(i)
                      if (image) {
                        const scale = Math.max(PIN_SIZES[i].px / image.width, PIN_SIZES[i].px / image.height) * 1.1
                        setImgScale(scale)
                      }
                    }}
                    className={`rounded-xl py-2 text-sm font-medium transition-all flex flex-col items-center ${
                      sizeIdx === i
                        ? 'bg-nanita-jam text-white shadow-md'
                        : 'bg-nanita-sugar text-nanita-ink hover:bg-nanita-border'
                    }`}
                  >
                    <span>{s.label}</span>
                    <span className={`text-[10px] ${sizeIdx === i ? 'text-white/80' : 'text-nanita-plum'}`}>R$ {s.price.toFixed(2).replace('.', ',')}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tabbed controls */}
            <Tabs defaultValue="image" className="w-full">
              <TabsList className="w-full grid grid-cols-4 bg-nanita-sugar rounded-xl h-9">
                <TabsTrigger value="image" className="text-xs rounded-lg gap-1 data-[state=active]:bg-white"><ImagePlus className="w-3.5 h-3.5" /> Imagem</TabsTrigger>
                <TabsTrigger value="bg" className="text-xs rounded-lg gap-1 data-[state=active]:bg-white"><Palette className="w-3.5 h-3.5" /> Fundo</TabsTrigger>
                <TabsTrigger value="stickers" className="text-xs rounded-lg gap-1 data-[state=active]:bg-white"><Sparkles className="w-3.5 h-3.5" /> Stickers</TabsTrigger>
                <TabsTrigger value="text" className="text-xs rounded-lg gap-1 data-[state=active]:bg-white"><Type className="w-3.5 h-3.5" /> Texto</TabsTrigger>
              </TabsList>

              {/* Image tab */}
              <TabsContent value="image" className="mt-3">
                <div className="bg-white border border-nanita-border rounded-2xl p-4 space-y-3">
                  <Button
                    variant="outline"
                    className="w-full border-2 border-dashed border-nanita-border hover:border-nanita-jam rounded-xl gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus className="w-4 h-4" /> {image ? 'Trocar imagem' : 'Escolher imagem'}
                  </Button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  {image && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <ZoomOut className="w-4 h-4 text-nanita-plum" />
                        <Slider value={[imgScale]} onValueChange={([v]) => setImgScale(v)} min={0.1} max={3} step={0.05} className="flex-1" />
                        <ZoomIn className="w-4 h-4 text-nanita-plum" />
                      </div>
                      <p className="text-xs text-nanita-plum text-center">Zoom: {Math.round(imgScale * 100)}%</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Background tab */}
              <TabsContent value="bg" className="mt-3">
                <div className="bg-white border border-nanita-border rounded-2xl p-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-nanita-plum font-medium">Cores sólidas</Label>
                    <div className="grid grid-cols-8 gap-1.5">
                      {SOLID_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setBg(prev => ({ ...prev, type: 'solid', solidColor: c }))}
                          className={`w-full aspect-square rounded-lg border-2 transition-all hover:scale-110 ${
                            bg.type === 'solid' && bg.solidColor === c ? 'border-nanita-jam shadow-md scale-110' : 'border-nanita-border'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Label className="text-xs text-nanita-plum">Personalizada:</Label>
                      <Input
                        type="color"
                        value={bg.solidColor}
                        onChange={e => setBg(prev => ({ ...prev, type: 'solid', solidColor: e.target.value }))}
                        className="w-8 h-8 p-0.5 cursor-pointer rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="border-t border-nanita-border pt-3 space-y-2">
                    <Label className="text-xs text-nanita-plum font-medium">Gradientes</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {GRADIENTS.map((g, i) => (
                        <button
                          key={g.name}
                          onClick={() => setBg(prev => ({ ...prev, type: 'gradient', gradientIdx: i }))}
                          className={`rounded-xl h-10 border-2 transition-all hover:scale-105 ${
                            bg.type === 'gradient' && bg.gradientIdx === i ? 'border-nanita-jam shadow-md scale-105' : 'border-nanita-border'
                          }`}
                          style={{ background: g.css }}
                          title={g.name}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-nanita-border pt-3 space-y-2">
                    <Label className="text-xs text-nanita-plum font-medium">Gradiente personalizado</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={bg.customColor1}
                        onChange={e => setBg(prev => ({ ...prev, type: 'custom', customColor1: e.target.value }))}
                        className="w-10 h-8 p-0.5 cursor-pointer rounded-lg"
                      />
                      <div className="flex-1 h-8 rounded-lg border border-nanita-border" style={{ background: `linear-gradient(90deg, ${bg.customColor1}, ${bg.customColor2})` }} />
                      <Input
                        type="color"
                        value={bg.customColor2}
                        onChange={e => setBg(prev => ({ ...prev, type: 'custom', customColor2: e.target.value }))}
                        className="w-10 h-8 p-0.5 cursor-pointer rounded-lg"
                      />
                    </div>
                    {bg.type !== 'custom' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs rounded-xl"
                        onClick={() => setBg(prev => ({ ...prev, type: 'custom' }))}
                      >
                        Aplicar gradiente personalizado
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Stickers tab */}
              <TabsContent value="stickers" className="mt-3">
                <div className="bg-white border border-nanita-border rounded-2xl p-4 space-y-3 max-h-[340px] overflow-y-auto">
                  {STICKER_CATEGORIES.map(cat => (
                    <div key={cat.name} className="space-y-1.5">
                      <Label className="text-xs text-nanita-plum font-medium">{cat.name}</Label>
                      <div className="grid grid-cols-6 gap-1.5">
                        {cat.items.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => addSticker(emoji)}
                            className="text-2xl aspect-square rounded-xl bg-nanita-sugar hover:bg-nanita-border hover:scale-110 transition-all flex items-center justify-center"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <p className="text-[10px] text-nanita-plum text-center pt-1">Clique para adicionar ao botton. Arraste para posicionar.</p>
                </div>
              </TabsContent>

              {/* Text tab */}
              <TabsContent value="text" className="mt-3">
                <div className="bg-white border border-nanita-border rounded-2xl p-4 space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={newText}
                      onChange={e => setNewText(e.target.value)}
                      placeholder="Seu texto aqui..."
                      className="flex-1"
                      onKeyDown={e => e.key === 'Enter' && addText()}
                    />
                    <Button onClick={addText} size="sm" className="bg-nanita-jam text-white rounded-xl px-4" disabled={!newText.trim()}>
                      +
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={newFont} onValueChange={setNewFont}>
                      <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FONTS.map(f => <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-1">
                      <Input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="w-10 h-8 p-0.5 cursor-pointer" />
                      <Input type="number" value={newFontSize} onChange={e => setNewFontSize(+e.target.value)} min={8} max={72} className="h-8 text-xs flex-1" />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Edit selected text/sticker */}
            {selectedLayer && (
              <div className="bg-nanita-sugar border border-nanita-jam/30 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-heading font-semibold text-nanita-ink text-sm">Editando: "{selectedLayer.text}"</Label>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={removeSelectedLayer}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <Input
                  value={selectedLayer.text}
                  onChange={e => updateSelectedLayer({ text: e.target.value })}
                  className="text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Select value={selectedLayer.fontFamily} onValueChange={v => updateSelectedLayer({ fontFamily: v })}>
                    <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONTS.map(f => <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-1">
                    <Input type="color" value={selectedLayer.color} onChange={e => updateSelectedLayer({ color: e.target.value })} className="w-10 h-8 p-0.5 cursor-pointer" />
                    <Input type="number" value={selectedLayer.fontSize} onChange={e => updateSelectedLayer({ fontSize: +e.target.value })} min={8} max={120} className="h-8 text-xs flex-1" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-nanita-plum">Rotação: {selectedLayer.rotation}°</Label>
                  <Slider value={[selectedLayer.rotation]} onValueChange={([v]) => updateSelectedLayer({ rotation: v })} min={-180} max={180} step={1} />
                </div>
              </div>
            )}

            {/* Layers list */}
            {textLayers.length > 0 && (
              <div className="bg-white border border-nanita-border rounded-2xl p-4 space-y-2">
                <Label className="text-xs text-nanita-plum font-medium">Elementos ({textLayers.length})</Label>
                {textLayers.map(l => (
                  <button
                    key={l.id}
                    onClick={() => setSelectedText(l.id === selectedText ? null : l.id)}
                    className={`w-full text-left text-sm px-3 py-1.5 rounded-lg transition-all ${
                      l.id === selectedText
                        ? 'bg-nanita-jam/10 text-nanita-jam font-medium'
                        : 'text-nanita-ink hover:bg-nanita-sugar'
                    }`}
                  >
                    {l.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomPinPage
