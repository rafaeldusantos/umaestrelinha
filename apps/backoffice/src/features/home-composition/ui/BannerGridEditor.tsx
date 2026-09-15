// O editor da grade de banners (feature 24, T28 — `HOME-22`..`HOME-24`, `HOME-27`, `HOME-30`).
//
// É a lacuna que a medição desta feature encontrou: hoje banner **só** existe se for uma categoria
// com `banner_url`, então campanha de data — "Dia das Mães", "Frete grátis esta semana" — não tem
// como existir. Aqui a dona sobe a arte dela e escolhe para onde ela leva.
//
// Três decisões mandam nesta tela, e nenhuma é estética:
//
// 1. **Quantas vagas o arranjo tem sai de `layoutSlots`**, em `core/home` (emenda `E3`). A grade da
//    loja lê a mesma medida. Respondido nos dois lugares, "quantos banners cabem em `hero_pair`"
//    divergiria no primeiro ajuste.
// 2. **A proporção avisa, nunca recorta.** `object-cover` numa proporção diferente corta o texto que
//    está DENTRO da arte, e por isso a mensagem traz o tamanho recomendado em pixels — que é o que a
//    dona precisa para reexportar — em vez de recusar o arquivo ou cortar em silêncio.
// 3. **Destino apagado é nomeado, e a arte fica.** O `label_snapshot` é congelado no momento da
//    escolha justamente porque, depois do `set null`, não há de onde ler o nome da coleção apagada.

import { useState } from 'react'
import { GripVertical, ImagePlus, LayoutGrid, PlugZap, Plus, Sparkles, Trash2, TriangleAlert } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { cn } from '@estrelinha/ui/lib/utils'
import {
  layoutRatios,
  layoutSlots,
  DEFAULT_BANNER_LAYOUT,
  type HomeBannerLayout,
} from '@estrelinha/core/home'
import { FormCard } from '@/shared/ui'
import DestinoDoItem from './DestinoDoItem'
import { uploadHomeImage } from '../lib/uploadHomeImage'
import { emptyDraftItem, type DraftItem } from '../model/sectionDraft'
import { ordinal } from '../model/sectionRefusals'
import type { SectionEditorProps } from './sectionEditors'

/** Os quatro arranjos, com o nome que a dona lê. O desenho de cada um é a contagem de vagas. */
const ARRANJOS: { layout: HomeBannerLayout; label: string }[] = [
  { layout: 'single', label: '1 imagem' },
  { layout: 'pair', label: '2 lado a lado' },
  { layout: 'hero_pair', label: '1 grande + 2' },
  { layout: 'quad', label: '4 em fila' },
]

const BannerGridEditor = ({ config, onConfigChange, items, onItemsChange, categories }: SectionEditorProps) => {
  const arranjo: HomeBannerLayout = config.layout ?? DEFAULT_BANNER_LAYOUT
  const vagas = layoutSlots(arranjo)
  const medidas = layoutRatios(arranjo)

  /** Aviso de proporção e falha de envio, por banner. A chave é a do rascunho. */
  const [recados, setRecados] = useState<Record<string, string>>({})
  const [arrastado, setArrastado] = useState<string | null>(null)

  const patch = (key: string, mudanca: Partial<DraftItem>) =>
    onItemsChange(items.map(i => (i.key === key ? { ...i, ...mudanca } : i)))

  const recado = (key: string, texto: string | null) =>
    setRecados(atual => {
      const proximo = { ...atual }
      if (texto) proximo[key] = texto
      else delete proximo[key]
      return proximo
    })

  const enviar = async (item: DraftItem, indice: number, file: File | undefined) => {
    if (!file) return
    recado(item.key, null)
    // A vaga do índice manda: a arte da vaga grande de `hero_pair` é outra proporção da das duas de
    // apoio, e é por vaga que o aviso faz sentido.
    const { url, error, warning } = await uploadHomeImage(file, medidas[indice] ?? medidas[0])
    // **Falha de envio não escreve no rascunho** (`HOME-28`): sem URL não há o que gravar.
    if (!url) {
      recado(item.key, error)
      return
    }
    recado(item.key, warning)
    patch(item.key, { image_url: url })
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

  return (
    <>
      <FormCard
        title="Arranjo no computador"
        action={<span className="text-xs text-muted-foreground">no celular, sempre em coluna</span>}
      >
        <div className="flex flex-wrap gap-2">
          {ARRANJOS.map(({ layout, label }) => {
            const escolhido = arranjo === layout
            return (
              <button
                key={layout}
                type="button"
                aria-pressed={escolhido}
                onClick={() => onConfigChange({ layout })}
                className={cn(
                  'flex min-h-11 min-w-[104px] flex-1 flex-col items-center gap-1.5 rounded-xl border p-3 text-xs',
                  escolhido
                    ? 'border-primary bg-primary/5 font-semibold text-foreground'
                    : 'border-input text-muted-foreground hover:bg-muted/50',
                )}
              >
                <LayoutGrid className="h-4 w-4" aria-hidden />
                {label}
              </button>
            )
          })}
        </div>
      </FormCard>

      <FormCard
        title="Banners"
        action={
          <span data-testid="contador-banners" className="text-xs text-muted-foreground">
            {items.length} de {vagas}
            {items.length > 1 && ' · arraste para trocar de lugar'}
          </span>
        }
      >
        {items.length === 0 && (
          // `HOME-25`: sem banner próprio a grade **não some** — ela cai na derivação de sempre. A
          // tela diz isso, porque uma lista vazia sem explicação se lê como seção quebrada.
          <div
            data-testid="banner-sem-proprio"
            className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/30 p-3"
          >
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                Sem banner próprio, quem manda é Categorias.
              </span>{' '}
              A grade sai sozinha das coleções que têm arte de banner, na ordem de Categorias — como
              está hoje. Banner desta tela tem preferência.
            </p>
          </div>
        )}

        {items.length > vagas && (
          <p
            data-testid="banner-excedente"
            className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"
          >
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Este arranjo desenha {vagas}{' '}
            {vagas === 1 ? 'banner' : 'banners'}: {items.length - vagas} não vão aparecer na loja.
            Escolha outro arranjo ou remova os que sobram.
          </p>
        )}

        {items.map((item, indice) => {
          const semDestino = !item.category_id && !item.product_id && !item.href?.trim()
          const perdido = semDestino && !!item.label_snapshot?.trim()
          const medida = medidas[indice] ?? medidas[0]

          return (
            <div
              key={item.key}
              data-testid={`banner-${indice}`}
              draggable
              onDragStart={() => setArrastado(item.key)}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                soltar(item.key)
              }}
              className="flex gap-3 border-t border-border/60 pt-4 first:border-0 first:pt-0"
            >
              <span className="flex w-4 shrink-0 justify-center pt-2">
                <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" aria-hidden />
              </span>

              <div className="flex w-[104px] shrink-0 flex-col gap-1.5">
                {item.image_url ? (
                  <img
                    data-testid={`banner-arte-${indice}`}
                    src={item.image_url}
                    alt={item.alt ?? ''}
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                ) : (
                  <span className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-input bg-muted/30">
                    <ImagePlus className="h-5 w-5 text-muted-foreground" aria-hidden />
                  </span>
                )}
                <input
                  type="file"
                  aria-label={`Arte do ${ordinal(indice + 1)} banner`}
                  accept="image/png,image/jpeg,image/webp"
                  onChange={e => enviar(item, indice, e.target.files?.[0])}
                  className="w-full text-[10px] text-muted-foreground file:mr-1 file:rounded file:border file:border-input file:bg-card file:px-1.5 file:text-[10px] file:text-foreground"
                />
                <span className="text-[10px] text-muted-foreground">
                  {medida.width} × {medida.height} px
                </span>
              </div>

              <div className="min-w-0 flex-1 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`banner-alt-${indice}`}>Descrição da imagem</Label>
                    <Input
                      id={`banner-alt-${indice}`}
                      value={item.alt ?? ''}
                      onChange={e => patch(item.key, { alt: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Leva para</Label>
                    <DestinoDoItem
                      item={item}
                      categories={categories}
                      onChange={mudanca => patch(item.key, mudanca)}
                    />
                  </div>
                </div>

                {recados[item.key] && (
                  <p
                    data-testid={`banner-recado-${indice}`}
                    role="status"
                    className="rounded-lg border border-input bg-muted/40 p-3 text-xs text-foreground"
                  >
                    {recados[item.key]}
                    {/* O aviso não bloqueia: o arquivo já subiu, e só a dona sabe se o corte importa
                        naquela peça. O que ela precisa é da medida para reexportar. */}
                  </p>
                )}

                {perdido && (
                  <p
                    data-testid={`banner-perdido-${indice}`}
                    className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"
                  >
                    <PlugZap className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>
                      <span className="font-semibold">
                        “{item.label_snapshot.trim()}” foi apagado.
                      </span>{' '}
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

        {items.length < vagas && (
          <Button
            type="button"
            variant="outline"
            onClick={() => onItemsChange([...items, emptyDraftItem()])}
            className="w-full border-dashed"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Acrescentar o {ordinal(items.length + 1)} banner
          </Button>
        )}
      </FormCard>
    </>
  )
}

export default BannerGridEditor
