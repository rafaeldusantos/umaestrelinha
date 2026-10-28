// ADI-02 — soltar arquivo num elemento, e o `accept` do seletor do Resumo.
//
// Saiu de `ui/ProductMediaSummary.tsx` para cá porque um arquivo de componente que exporta também
// hook e constante quebra o Fast Refresh (`react-refresh/only-export-components`).

import { useCallback, useRef, useState, type DragEvent } from 'react'

/** O mesmo `accept` da galeria: o seletor do Resumo não pode aceitar o que a galeria recusa. */
export const SUMMARY_IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp'

/** Só arraste que carrega ARQUIVO interessa: texto ou link solto no card não é envio (design). */
const carregaArquivo = (event: DragEvent): boolean =>
  Array.from(event.dataTransfer?.types ?? []).includes('Files')

export interface FileDrop {
  dragging: boolean
  handlers: {
    onDragEnter: (event: DragEvent) => void
    onDragOver: (event: DragEvent) => void
    onDragLeave: (event: DragEvent) => void
    onDrop: (event: DragEvent) => void
  }
}

/**
 * ADI-02 — soltar arquivo num elemento. Os `handlers` vão no elemento que recebe o arraste;
 * `dragging` liga o véu.
 *
 * Conta entradas e saídas em vez de um booleano: o `dragleave` dispara a cada filho que o cursor
 * cruza dentro do card, e um booleano piscaria o véu a cada miniatura.
 */
export const useFileDrop = (upload: (files: FileList | File[]) => unknown): FileDrop => {
  const [dragging, setDragging] = useState(false)
  const depth = useRef(0)

  const onDragEnter = useCallback((event: DragEvent) => {
    if (!carregaArquivo(event)) return
    event.preventDefault()
    depth.current += 1
    setDragging(true)
  }, [])

  const onDragOver = useCallback((event: DragEvent) => {
    if (!carregaArquivo(event)) return
    // Sem o `preventDefault` no `dragover` o navegador não entrega o `drop` — abre o arquivo na aba.
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
    setDragging(true)
  }, [])

  const onDragLeave = useCallback((event: DragEvent) => {
    if (!carregaArquivo(event)) return
    depth.current = Math.max(0, depth.current - 1)
    if (depth.current === 0) setDragging(false)
  }, [])

  const onDrop = useCallback(
    (event: DragEvent) => {
      if (!carregaArquivo(event)) return
      event.preventDefault()
      depth.current = 0
      setDragging(false)
      const files = event.dataTransfer?.files
      if (files && files.length) void upload(files)
    },
    [upload],
  )

  return { dragging, handlers: { onDragEnter, onDragOver, onDragLeave, onDrop } }
}
