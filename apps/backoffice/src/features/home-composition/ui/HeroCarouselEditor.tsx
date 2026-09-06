// O editor do **Banner principal** (feature 41 — `BNR-07`..`BNR-16`, `BNR-47`, `BNR-48`, `BNR-50`).
//
// A Adri monta a arte pronta no Canva, com a frase da campanha desenhada nela. O que falta é a tela
// para subir essa arte e dizer para onde ela leva — em qualquer posição da Home, quantas vezes ela
// quiser.
//
// Quatro decisões mandam nesta tela, e nenhuma é estética:
//
// 1. **Duas artes por slide, um anúncio só.** Dois itens fariam a dona escolher o destino duas vezes
//    e divergir na terceira edição. O que muda entre 1440×540 e o retrato do celular é o recorte.
// 2. **Quem diz "está reaproveitando a arte do computador" é `core`**, não esta tela (`AD-030`). O
//    painel do menu já reescreveu esse predicado uma vez, por truthiness da string crua, e um
//    `"   "` fazia a loja reaproveitar enquanto a tela dizia que estava tudo certo.
// 3. **A proporção avisa, nunca recorta.** `object-cover` numa proporção diferente corta o texto que
//    está DENTRO da arte. A mensagem traz a medida em pixels, que é o que ela precisa para
//    reexportar.
// 4. **Nada aqui desenha o carrossel.** A prévia é a loja num iframe (`AD-019`), e `previaUnica`
//    derruba a suíte se um segundo desenho voltar ao painel.

import { useState } from 'react'
import { GripVertical, ImagePlus, Maximize, PlugZap, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { cn } from '@estrelinha/ui/lib/utils'
import {
  HERO_CAROUSEL_MAX_SLIDES,
  HERO_CAROUSEL_SLOTS,
  HERO_CAROUSEL_WIDTHS,
  heroCarouselWidth,
  heroSlideArt,
  type HomeBannerWidth,
} from '@estrelinha/core/home'
import { FormCard } from '@/shared/ui'
import DestinoDoItem from './DestinoDoItem'
import { uploadHomeImage } from '../lib/uploadHomeImage'
import { emptyDraftItem, type DraftItem } from '../model/sectionDraft'
import { ordinal } from '../model/sectionRefusals'
import type { SectionEditorProps } from './sectionEditors'

/** As duas larguras, com o nome que a dona lê e o que cada uma faz na página. */
const LARGURAS: Record<HomeBannerWidth, { label: string; apoio: string }> = {
  full: { label: 'Largura cheia', apoio: 'de borda a borda da tela' },
  wide: { label: 'Dentro da margem', apoio: 'alinhado ao resto da página' },
}

/** As duas vagas de arte, na ordem em que a tela as pede. */
const VAGAS = [
  { campo: 'image_url' as const, dispositivo: 'computador', slot: HERO_CAROUSEL_SLOTS.desktop },
  { campo: 'image_mobile_url' as const, dispositivo: 'celular', slot: HERO_CAROUSEL_SLOTS.mobile },
]

const HeroCarouselEditor = ({
  config,
  onConfigChange,
  items,
  onItemsChange,
  categories,
  products,
}: SectionEditorProps) => {
  const largura = heroCarouselWidth(config)

  /** Aviso de proporção e falha de envio, por vaga. A chave é `${key}:${campo}`. */
  const [recados, setRecados] = useState<Record<string, string>>({})
  const [arrastado, setArrastado] = useState<string | null>(null)

  const patch = (key: string, mudanca: Partial<DraftItem>) =>
    onItemsChange(items.map(i => (i.key === key ? { ...i, ...mudanca } : i)))

  const recado = (chave: string, texto: string | null) =>
    setRecados(atual => {
      const proximo = { ...atual }
      if (texto) proximo[chave] = texto
      else delete proximo[chave]
      return proximo
    })

  const enviar = async (
    item: DraftItem,
    vaga: (typeof VAGAS)[number],
    file: File | undefined,
  ) => {
    if (!file) return
    const chave = `${item.key}:${vaga.campo}`
    recado(chave, null)

    const { url, error, warning } = await uploadHomeImage(file, vaga.slot)
    // **Falha de envio não escreve no rascunho** (`BNR-15`): sem URL não há o que gravar, e o resto
    // do que a dona preencheu continua na tela.
    if (!url) {
      recado(chave, error)
      return
    }
    recado(chave, warning)
    patch(item.key, { [vaga.campo]: url })
  }

  const soltar = (destinoKey: string) => {
    if (!arrastado || arrastado === destinoKey) return
    const de = items.findIndex(i => i.key === arrastado)
    const para = items.findIndex(i => i.key === destinoKey)
    if (de < 0 || para < 0) return
    const proximo = [...items]
    const [movido] = proximo.splice(de, 1)
    proximo.splice(para, 0, movido)
    onItemsChange(proximo)
    setArrastado(null)
  }

  const excedentes = items.length - HERO_CAROUSEL_MAX_SLIDES

  return (
    <>
      <FormCard
        title="Largura na página"
        action={<span className="text-xs text-muted-foreground">no celular, sempre cheia</span>}
      >
        <div className="flex flex-wrap gap-2">
          {HERO_CAROUSEL_WIDTHS.map(valor => {
            const escolhida = largura === valor
            return (
              <button
                key={valor}
                type="button"
                aria-pressed={escolhida}
                data-testid={`largura-${valor}`}
                onClick={() => onConfigChange({ width: valor })}
                className={cn(
                  'flex min-h-11 min-w-[140px] flex-1 flex-col items-center gap-1 rounded-xl border p-3 text-xs',
                  escolhida
                    ? 'border-primary bg-primary/5 font-semibold text-foreground'
                    : 'border-input text-muted-foreground hover:bg-muted/50',
                )}
              >
                <Maximize className="h-4 w-4" aria-hidden />
                {LARGURAS[valor].label}
                <span className="text-[10px] font-normal text-muted-foreground">
                  {LARGURAS[valor].apoio}
                </span>
              </button>
            )
          })}
        </div>
      </FormCard>

      <FormCard
        title="Banners"
        action={
          <span data-testid="contador-slides" className="text-xs text-muted-foreground">
            {items.length} de {HERO_CAROUSEL_MAX_SLIDES}
            {items.length > 1 && ' · arraste para trocar de ordem'}
          </span>
        }
      >
        {items.length === 0 && (
          // Sem slide o bloco **não aparece na loja**, e a tela diz isso: uma lista vazia sem
          // explicação se lê como seção quebrada, e a dona iria procurar o defeito noutro lugar.
          <p
            data-testid="carrossel-vazio"
            className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground"
          >
            <span className="font-semibold text-foreground">Nenhum banner ainda.</span> Enquanto este
            bloco estiver vazio ele não aparece na loja — sem faixa em branco e sem espaço reservado.
          </p>
        )}

        {excedentes > 0 && (
          // A contrapartida da recusa ao salvar: o estado é alcançável por escrita direta, e um
          // estado gravado que nenhuma tela mostra é como dado errado sobrevive por meses.
          <p
            data-testid="slides-excedentes"
            className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"
          >
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Cabem {HERO_CAROUSEL_MAX_SLIDES} banners neste bloco, e há {items.length}. Remova{' '}
            {excedentes === 1 ? 'o que sobra' : `os ${excedentes} que sobram`}, ou acrescente um
            segundo bloco “Banner principal” para {excedentes === 1 ? 'ele' : 'eles'}.
          </p>
        )}

        {items.map((item, indice) => {
          const semDestino = !item.category_id && !item.product_id && !item.href?.trim()
          const perdido = semDestino && !!item.label_snapshot?.trim()
          const excedente = indice >= HERO_CAROUSEL_MAX_SLIDES

          return (
            <div
              key={item.key}
              data-testid={`slide-${indice}`}
              draggable
              onDragStart={() => setArrastado(item.key)}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                soltar(item.key)
              }}
              className={cn(
                'flex gap-3 border-t border-border/60 pt-4 first:border-0 first:pt-0',
                excedente && 'opacity-70',
              )}
            >
              <span className="flex w-4 shrink-0 justify-center pt-2">
                <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" aria-hidden />
              </span>

              <div className="min-w-0 flex-1 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  {VAGAS.map(vaga => {
                    // **A resposta vem de `core`, e é a MESMA que a loja usa.** Ler `item[campo]`
                    // cru aqui chamaria `"   "` de arte, e a loja não chamaria.
                    const { image, imageReused } = heroSlideArt(item, vaga.dispositivo === 'computador' ? 'desktop' : 'mobile')
                    const propria = !imageReused && !!image
                    const chave = `${item.key}:${vaga.campo}`

                    return (
                      <div key={vaga.campo} className="space-y-1.5">
                        <span
                          data-testid={`arte-${vaga.campo}-${indice}`}
                          className={cn(
                            'inline-block rounded px-2 py-1 text-[10px] font-semibold',
                            propria
                              ? 'bg-estrelinha-admin-emerald/10 text-estrelinha-admin-emerald'
                              : 'bg-estrelinha-admin-amber/10 text-estrelinha-admin-amber',
                          )}
                        >
                          arte do {vaga.dispositivo} · {propria ? 'enviada' : 'falta'}
                        </span>

                        {image ? (
                          <img
                            data-testid={`miniatura-${vaga.campo}-${indice}`}
                            src={image}
                            alt=""
                            className="aspect-video w-full rounded-lg border border-border object-cover"
                          />
                        ) : (
                          <span className="flex aspect-video w-full items-center justify-center rounded-lg border border-dashed border-input bg-muted/30">
                            <ImagePlus className="h-5 w-5 text-muted-foreground" aria-hidden />
                          </span>
                        )}

                        <input
                          type="file"
                          aria-label={`Arte do ${vaga.dispositivo} do ${ordinal(indice + 1)} banner`}
                          accept="image/png,image/jpeg,image/webp"
                          onChange={e => enviar(item, vaga, e.target.files?.[0])}
                          className="w-full text-[10px] text-muted-foreground file:mr-1 file:rounded file:border file:border-input file:bg-card file:px-1.5 file:text-[10px] file:text-foreground"
                        />
                        <span className="block text-[10px] text-muted-foreground">
                          {vaga.slot.width} × {vaga.slot.height} px
                        </span>

                        {imageReused && (
                          // `BNR-47`: a loja renderiza com a arte do outro dispositivo em vez de
                          // sumir com o banner. Sem este aviso a dona acharia que enviou as duas.
                          <p
                            data-testid={`arte-reaproveitada-${vaga.campo}-${indice}`}
                            className="text-[10px] font-medium text-estrelinha-admin-amber"
                          >
                            A loja vai reaproveitar a arte do{' '}
                            {vaga.dispositivo === 'computador' ? 'celular' : 'computador'}.
                          </p>
                        )}

                        {recados[chave] && (
                          <p
                            data-testid={`recado-${vaga.campo}-${indice}`}
                            role="status"
                            className="rounded-lg border border-input bg-muted/40 p-2 text-[11px] text-foreground"
                          >
                            {recados[chave]}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`slide-alt-${indice}`}>Descrição da imagem</Label>
                    <Input
                      id={`slide-alt-${indice}`}
                      value={item.alt ?? ''}
                      placeholder="o que a arte diz"
                      onChange={e => patch(item.key, { alt: e.target.value })}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      A frase da campanha está dentro da imagem: quem usa leitor de tela só tem esta
                      descrição.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Leva para</Label>
                    <DestinoDoItem
                      item={item}
                      categories={categories}
                      products={products}
                      onChange={mudanca => patch(item.key, mudanca)}
                      rotulo={`Leva para · ${ordinal(indice + 1)} banner`}
                    />
                  </div>
                </div>

                {perdido && (
                  <p
                    data-testid={`slide-perdido-${indice}`}
                    className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"
                  >
                    <PlugZap className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>
                      <span className="font-semibold">“{item.label_snapshot.trim()}” foi apagado.</span>{' '}
                      Enquanto este banner estiver sem destino, ele não aparece na loja — a arte fica
                      guardada aqui, e nenhuma cliente cai num link quebrado.
                    </span>
                  </p>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onItemsChange(items.filter(i => i.key !== item.key))}
                  className="text-muted-foreground"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remover banner
                </Button>
              </div>
            </div>
          )
        })}

        {/* O botão NÃO é apagado no teto (`BNR-13`): `disabled` some num atalho de teclado e não diz
            por quê. Quem recusa é a régua de `core`, no salvar, com o motivo e a saída em texto. */}
        <Button
          type="button"
          variant="outline"
          data-testid="acrescentar-slide"
          onClick={() => onItemsChange([...items, emptyDraftItem()])}
          className="w-full border-dashed"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Acrescentar o {ordinal(items.length + 1)} banner
        </Button>
      </FormCard>
    </>
  )
}

export default HeroCarouselEditor
