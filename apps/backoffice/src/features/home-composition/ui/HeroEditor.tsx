// O editor da chamada principal (feature 24, T27 — `HOME-16`..`HOME-20`).
//
// É a primeira dobra, e é o texto que a dona mais quer mudar. Duas coisas o separam de um
// formulário qualquer:
//
// 1. **O título são DUAS linhas, em duas cores** (`ink` e `primary`). Não é decoração: é o que dá o
//    pico de contraste do hero sem precisar de um terceiro tamanho de fonte. Por isso os dois campos
//    aparecem marcados como 1ª e 2ª, e não como um `<textarea>` de duas linhas — a quebra é
//    estrutural, e um enter num campo só a perderia.
// 2. **O `alt` é obrigatório para salvar.** Numa loja em que a peça é a homenagem de alguém, imagem
//    sem descrição é a página muda no leitor de tela. Quem cobra é `configRefusal`, a MESMA função
//    que o resto da Home usa — a cobrança não pode divergir entre dois formulários.

import { useState } from 'react'
import { ImagePlus, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Textarea } from '@estrelinha/ui/textarea'
import { Label } from '@estrelinha/ui/label'
import { HERO_ART_SLOT } from '@estrelinha/core/home'
import { bySortOrder, categoryHref } from '@estrelinha/core/menu'
import type { AdminCategory } from '@/entities/category'
import { FormCard } from '@/shared/ui'
import { uploadHomeImage } from '../lib/uploadHomeImage'
import type { SectionEditorProps } from './sectionEditors'

/** O teto do parágrafo. Acima disso a primeira dobra vira bloco de texto e o CTA cai. */
const PARAGRAFO_MAX = 240

const OUTRO = '__outro'

/**
 * O destino do CTA.
 *
 * Uma lista de coleções mais um campo livre — e não um campo livre só: digitar o caminho de uma
 * coleção à mão é onde nasce o 404 que `HOME-20` existe para impedir. O caminho de cada coleção sai
 * de `categoryHref`, a mesma função que monta o link na loja, então a canônica de dois segmentos
 * (`/pai/filha`) vem de graça.
 */
const DestinoDoCta = ({
  categories,
  value,
  onChange,
}: {
  categories: readonly AdminCategory[]
  value: string
  onChange: (next: string) => void
}) => {
  const opcoes = [...categories]
    .filter(c => c.active !== false)
    .sort(bySortOrder)
    .map(c => ({ href: categoryHref(categories, c.id), nome: c.name }))

  const conhecido = opcoes.some(o => o.href === value)
  const [livre, setLivre] = useState(!!value && !conhecido)

  return (
    <div className="space-y-2">
      <select
        id="hero-cta-destino"
        value={livre ? OUTRO : value}
        onChange={e => {
          if (e.target.value === OUTRO) {
            setLivre(true)
            return
          }
          setLivre(false)
          onChange(e.target.value)
        }}
        className="h-10 w-full rounded-lg border border-input bg-card px-3 text-[13px]"
      >
        <option value="">Escolha um destino</option>
        {opcoes.map(o => (
          <option key={o.href} value={o.href}>
            Coleção · {o.nome}
          </option>
        ))}
        <option value={OUTRO}>Outro endereço da loja…</option>
      </select>

      {livre && (
        <Input
          aria-label="Endereço do botão"
          placeholder="/como-enviar"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      )}
    </div>
  )
}

const HeroEditor = ({ config, onConfigChange, categories }: SectionEditorProps) => {
  const [enviando, setEnviando] = useState(false)
  /** Falha de envio e aviso de proporção, no mesmo lugar em que a dona olha a arte. */
  const [recadoDaArte, setRecadoDaArte] = useState<string | null>(null)

  const paragrafo = config.paragraph ?? ''

  const enviar = async (file: File | undefined) => {
    if (!file) return
    setEnviando(true)
    setRecadoDaArte(null)
    const { url, error, warning } = await uploadHomeImage(file)
    setEnviando(false)

    // **Falha de envio não toca no `config`** (`HOME-28`): sem URL não há o que gravar, e a seção
    // não fica com foto pela metade. O que a dona já preencheu continua onde estava.
    if (!url) {
      setRecadoDaArte(error)
      return
    }
    setRecadoDaArte(warning)
    onConfigChange({ image_url: url })
  }

  return (
    <>
      <FormCard title="Texto">
        <div className="space-y-1.5">
          <Label htmlFor="hero-eyebrow">Sobretítulo</Label>
          <Input
            id="hero-eyebrow"
            value={config.eyebrow ?? ''}
            onChange={e => onConfigChange({ eyebrow: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Label htmlFor="hero-titulo-1">Título</Label>
            <span className="text-xs text-muted-foreground">
              duas linhas, duas cores — é o que dá o pico de contraste
            </span>
          </div>
          <Input
            id="hero-titulo-1"
            aria-label="Título — 1ª linha"
            value={config.title_line1 ?? ''}
            onChange={e => onConfigChange({ title_line1: e.target.value })}
          />
          <Input
            aria-label="Título — 2ª linha"
            value={config.title_line2 ?? ''}
            onChange={e => onConfigChange({ title_line2: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Label htmlFor="hero-paragrafo">Parágrafo</Label>
            <span data-testid="hero-contador" className="text-xs text-muted-foreground">
              {paragrafo.length} / {PARAGRAFO_MAX}
            </span>
          </div>
          <Textarea
            id="hero-paragrafo"
            rows={3}
            maxLength={PARAGRAFO_MAX}
            value={paragrafo}
            onChange={e => onConfigChange({ paragraph: e.target.value })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="hero-cta-texto">Botão — texto</Label>
            <Input
              id="hero-cta-texto"
              value={config.cta_label ?? ''}
              onChange={e => onConfigChange({ cta_label: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hero-cta-destino">Botão — destino</Label>
            <DestinoDoCta
              categories={categories}
              value={config.cta_href ?? ''}
              onChange={next => onConfigChange({ cta_href: next })}
            />
            <p className="text-xs text-muted-foreground">
              Uma coleção ou uma página da loja. Endereço que a loja não serve é recusado ao salvar.
            </p>
          </div>
        </div>
      </FormCard>

      <FormCard
        title="Arte"
        action={
          <span className="text-xs text-muted-foreground">
            {HERO_ART_SLOT.width} × {HERO_ART_SLOT.height} px
          </span>
        }
      >
        {config.image_url ? (
          <img
            data-testid="hero-foto"
            src={config.image_url}
            alt={config.image_alt ?? ''}
            className="aspect-[350/260] w-full rounded-xl object-cover"
          />
        ) : (
          <div className="flex aspect-[350/260] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-input bg-muted/30 p-4 text-center">
            <ImagePlus className="h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="text-xs text-muted-foreground">
              Uma foto de peça real. Sem foto, entra a arte da marca.
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="hero-arquivo">{config.image_url ? 'Trocar a foto' : 'Enviar uma foto'}</Label>
          <input
            id="hero-arquivo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={enviando}
            onChange={e => enviar(e.target.files?.[0])}
            className="w-full text-xs text-muted-foreground file:mr-3 file:min-h-11 file:rounded-lg file:border file:border-input file:bg-card file:px-3 file:text-sm file:text-foreground"
          />
        </div>

        {recadoDaArte && (
          <p
            data-testid="hero-recado-arte"
            role="status"
            className="rounded-lg border border-input bg-muted/40 p-3 text-xs text-foreground"
          >
            {recadoDaArte}
          </p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="hero-alt">Descrição da imagem *</Label>
          <Input
            id="hero-alt"
            value={config.image_alt ?? ''}
            onChange={e => onConfigChange({ image_alt: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Obrigatória quando há foto. Quem usa leitor de tela só tem essa descrição.
          </p>
        </div>

        {/* `HOME-19`: remover a foto **volta à arte da marca**, sem deixar buraco. A vaga da figura é
            a mesma para as duas na loja, então a troca não move um pixel do que vem abaixo. */}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Sem foto, entra a arte da marca</p>
              <p className="text-xs text-muted-foreground">
                É o padrão da loja hoje — nunca fica buraco.
              </p>
            </div>
          </div>
          {config.image_url && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setRecadoDaArte(null)
                onConfigChange({ image_url: null, image_alt: null })
              }}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remover foto
            </Button>
          )}
        </div>
      </FormCard>
    </>
  )
}

export default HeroEditor
