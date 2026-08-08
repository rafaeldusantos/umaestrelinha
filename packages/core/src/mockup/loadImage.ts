// Carrega uma imagem para composição em canvas.
// Seta crossOrigin='anonymous' ANTES do src: sem isso, um canvas que desenhou assets do
// Storage fica "tainted" e toBlob()/toDataURL() lançam SecurityError. ENG-02.
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${src}`))
    img.src = src
  })
}
