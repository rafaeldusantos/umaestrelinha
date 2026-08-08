import { useEffect, useRef } from 'react'
import { composeMockup, clampArtZone } from '@nanapin/core'
import type { ArtZone, MockupBlendMode } from '@nanapin/supabase/types'

interface Props {
  background: HTMLImageElement
  value: ArtZone
  onChange: (zone: ArtZone) => void
  /** When provided, a live composeMockup preview is rendered below the editor (COL-04). */
  art?: HTMLImageElement | null
  overlay?: HTMLImageElement | null
  blendMode?: MockupBlendMode
  shadingGain?: number
  className?: string
}

type DragMode = 'move' | 'rx' | 'ry' | 'rotate'

const PREVIEW_MAX = 360

/**
 * Editor interativo da art-zone: arrasta o centro (mover), handles de borda (rx/ry) e um
 * handle de rotação sobre o preview do fundo. Emite `ArtZone` normalizado (via clampArtZone).
 * O SVG usa viewBox na resolução natural do fundo, então a geometria da elipse casa 1:1 com
 * o clip de composeMockup (resolveArtZone → px). Reusa a pointer math do CustomPinPage.
 */
const ArtZoneEditor = ({ background, value, onChange, art, overlay, blendMode, shadingGain, className }: Props) => {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<DragMode | null>(null)
  // Ref com o valor mais recente: evita closures obsoletas durante o drag por window listeners.
  const valueRef = useRef(value)
  valueRef.current = value

  const bgW = background.naturalWidth || background.width || 1
  const bgH = background.naturalHeight || background.height || 1

  // Geometria em px (viewBox) para posicionar a elipse e os handles.
  const cxPx = value.cx * bgW
  const cyPx = value.cy * bgH
  const rxPx = value.rx * bgW
  const ryPx = value.ry * bgH
  const rad = (value.rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const local = (x: number, y: number) => ({ x: cxPx + x * cos - y * sin, y: cyPx + x * sin + y * cos })
  const rxHandle = local(rxPx, 0)
  const ryHandle = local(0, ryPx)
  const rotHandle = local(0, -ryPx - Math.max(bgW, bgH) * 0.06)
  const handleR = Math.max(bgW, bgH) * 0.02

  const applyDrag = (mode: DragMode, clientX: number, clientY: number) => {
    const rect = surfaceRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0 || rect.height === 0) return
    const nx = (clientX - rect.left) / rect.width
    const ny = (clientY - rect.top) / rect.height
    const px = nx * bgW
    const py = ny * bgH
    const v = valueRef.current
    const vcx = v.cx * bgW
    const vcy = v.cy * bgH
    const r = (v.rotation * Math.PI) / 180
    const c = Math.cos(r)
    const s = Math.sin(r)

    let next: ArtZone
    switch (mode) {
      case 'move':
        next = { ...v, cx: nx, cy: ny }
        break
      case 'rx': {
        const localX = (px - vcx) * c + (py - vcy) * s
        next = { ...v, rx: Math.abs(localX) / bgW }
        break
      }
      case 'ry': {
        const localY = -(px - vcx) * s + (py - vcy) * c
        next = { ...v, ry: Math.abs(localY) / bgH }
        break
      }
      case 'rotate':
        next = { ...v, rotation: (Math.atan2(py - vcy, px - vcx) * 180) / Math.PI + 90 }
        break
    }
    onChange(clampArtZone(next))
  }

  const startDrag = (mode: DragMode) => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = mode
    applyDrag(mode, e.clientX, e.clientY)
    const move = (ev: PointerEvent) => {
      if (dragRef.current) applyDrag(dragRef.current, ev.clientX, ev.clientY)
    }
    const up = () => {
      dragRef.current = null
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // Prévia realista ao vivo via composeMockup (só quando há arte de amostra) — COL-04.
  // Reage a TODO o estado do cadastro (fundo, zona, overlay, blend, relevo). Coalescida
  // por frame (rAF): a composição com sombreamento custa ~20-30ms e o drag dos handles
  // dispara a cada pointermove.
  useEffect(() => {
    const canvas = previewRef.current
    if (!art || !canvas) return
    const raf = requestAnimationFrame(() => {
      try {
        const result = composeMockup({ background, art, overlay, artZone: value, blendMode, shadingGain })
        const scale = Math.min(1, PREVIEW_MAX / Math.max(bgW, bgH))
        canvas.width = Math.round(bgW * scale)
        canvas.height = Math.round(bgH * scale)
        const ctx = canvas.getContext('2d')
        if (ctx) ctx.drawImage(result.canvas, 0, 0, canvas.width, canvas.height)
      } catch {
        // Falha de composição não deve quebrar o editor; o fundo/preview seguem visíveis.
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [art, background, overlay, blendMode, shadingGain, value, bgW, bgH])

  return (
    <div className={className}>
      <div
        ref={surfaceRef}
        className="relative w-full overflow-hidden rounded-xl border border-border bg-muted select-none"
        style={{ aspectRatio: `${bgW} / ${bgH}`, touchAction: 'none' }}
      >
        <img
          src={background.src}
          alt="Fundo do template"
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
        <svg
          viewBox={`0 0 ${bgW} ${bgH}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full text-primary"
        >
          <ellipse
            cx={cxPx}
            cy={cyPx}
            rx={rxPx}
            ry={ryPx}
            transform={`rotate(${value.rotation} ${cxPx} ${cyPx})`}
            fill="rgba(124,58,237,0.12)"
            stroke="currentColor"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
          {/* linhas-guia até os handles de raio e rotação */}
          <line x1={cxPx} y1={cyPx} x2={rxHandle.x} y2={rxHandle.y} stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" opacity={0.5} />
          <line x1={cxPx} y1={cyPx} x2={ryHandle.x} y2={ryHandle.y} stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" opacity={0.5} />
          <line x1={cxPx} y1={cyPx} x2={rotHandle.x} y2={rotHandle.y} stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" opacity={0.5} />

          <circle cx={cxPx} cy={cyPx} r={handleR} fill="currentColor" stroke="white" strokeWidth={2} vectorEffect="non-scaling-stroke" style={{ cursor: 'move' }} onPointerDown={startDrag('move')} />
          <circle cx={rxHandle.x} cy={rxHandle.y} r={handleR} fill="white" stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke" style={{ cursor: 'ew-resize' }} onPointerDown={startDrag('rx')} />
          <circle cx={ryHandle.x} cy={ryHandle.y} r={handleR} fill="white" stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke" style={{ cursor: 'ns-resize' }} onPointerDown={startDrag('ry')} />
          <circle cx={rotHandle.x} cy={rotHandle.y} r={handleR} fill="white" stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke" style={{ cursor: 'grab' }} onPointerDown={startDrag('rotate')} />
        </svg>
      </div>

      {art && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Prévia realista — atualiza com fundo, área, overlay, blend e relevo
          </p>
          <canvas ref={previewRef} className="mx-auto max-w-full rounded-xl border border-border" />
        </div>
      )}
    </div>
  )
}

export default ArtZoneEditor
