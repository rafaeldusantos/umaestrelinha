// O corpo de um aviso aberto: o tipo e os campos do tipo escolhido.
//
// As recusas vêm de `core` (`announcementRefusals`), já com o prefixo "Nº aviso: ", e cada uma aparece
// no campo a que se refere — o lugar é escolhido por `recusasPorCampo`, a frase nunca é escrita aqui.

import { ImagePlus, Loader2 } from 'lucide-react'
import {
  ANNOUNCEMENT_ART_SLOTS,
  ANNOUNCEMENT_HIGHLIGHT_MAX,
  ANNOUNCEMENT_LINK_LABEL_MAX,
  ANNOUNCEMENT_TEXT_MAX,
} from '@estrelinha/core/announcements'
import { Input } from '@estrelinha/ui/input'
import { CharCounter, FieldGroup } from '@/shared/ui'
import type { AvisoRascunho, CampoDoAviso } from '../model/rascunho'

export type CampoDeArte = 'imageDesktop' | 'imageMobile'

interface Props {
  aviso: AvisoRascunho
  indice: number
  /** A recusa de `core` de cada campo recusado; todas aparecem juntas. */
  recusas: Partial<Record<CampoDoAviso, string>>
  /** A mensagem de falha do envio, por vaga. */
  recados: Partial<Record<CampoDeArte, string>>
  enviando: Partial<Record<CampoDeArte, boolean>>
  onChange: (patch: Partial<AvisoRascunho>) => void
  onUpload: (campo: CampoDeArte, file: File | undefined) => void
}

const VAGAS: { campo: CampoDeArte; slot: { width: number; height: number }; dispositivo: string }[] = [
  { campo: 'imageDesktop', slot: ANNOUNCEMENT_ART_SLOTS.desktop, dispositivo: 'computador' },
  { campo: 'imageMobile', slot: ANNOUNCEMENT_ART_SLOTS.mobile, dispositivo: 'celular' },
]

const AnnouncementFields = ({ aviso, indice, recusas, recados, enviando, onChange, onUpload }: Props) => {
  const id = (campo: string) => `aviso-${indice}-${campo}`
  const recusaEm = (campo: CampoDoAviso) =>
    recusas[campo] ? (
      <p data-testid={`recusa-${campo}-${indice}`} role="alert" className="text-xs font-medium text-destructive">
        {recusas[campo]}
      </p>
    ) : null
  const recusado = (campo: CampoDoAviso) => (recusas[campo] ? true : undefined)

  const destino = (
    <FieldGroup label="Destino" htmlFor={id('href')} hint="Sem destino, o aviso é só texto.">
      <Input
        id={id('href')}
        value={aviso.href}
        placeholder="/ofertas"
        aria-invalid={recusado('href')}
        onChange={e => onChange({ href: e.target.value })}
      />
      {recusaEm('href')}
    </FieldGroup>
  )

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-foreground">Tipo do aviso</legend>
        <div role="radiogroup" aria-label="Tipo do aviso" className="flex flex-wrap gap-2">
          {(
            [
              ['text', 'Texto'],
              ['image', 'Imagem'],
            ] as const
          ).map(([valor, rotulo]) => (
            <label
              key={valor}
              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm ${
                aviso.kind === valor ? 'border-primary bg-primary/5 font-semibold text-foreground' : 'border-border text-muted-foreground'
              }`}
            >
              <input
                type="radio"
                name={id('tipo')}
                value={valor}
                checked={aviso.kind === valor}
                onChange={() => onChange({ kind: valor })}
                className="h-5 w-5 accent-primary"
              />
              {rotulo}
            </label>
          ))}
        </div>
      </fieldset>

      {aviso.kind === 'text' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <FieldGroup
            label="Trecho em destaque"
            htmlFor={id('highlight')}
            counter={<CharCounter value={aviso.highlight} count={aviso.highlight.trim().length} limit={ANNOUNCEMENT_HIGHLIGHT_MAX} data-testid={`contador-highlight-${indice}`} />}
          >
            <Input
              id={id('highlight')}
              value={aviso.highlight}
              aria-invalid={recusado('highlight')}
              onChange={e => onChange({ highlight: e.target.value })}
            />
            {recusaEm('highlight')}
          </FieldGroup>
          <FieldGroup
            label="Texto"
            htmlFor={id('text')}
            counter={<CharCounter value={aviso.text} count={aviso.text.trim().length} limit={ANNOUNCEMENT_TEXT_MAX} data-testid={`contador-text-${indice}`} />}
          >
            <Input
              id={id('text')}
              value={aviso.text}
              aria-invalid={recusado('text')}
              onChange={e => onChange({ text: e.target.value })}
            />
            {recusaEm('text')}
          </FieldGroup>
          <FieldGroup
            label="Rótulo do link"
            htmlFor={id('linkLabel')}
            counter={<CharCounter value={aviso.linkLabel} count={aviso.linkLabel.trim().length} limit={ANNOUNCEMENT_LINK_LABEL_MAX} data-testid={`contador-linkLabel-${indice}`} />}
          >
            <Input
              id={id('linkLabel')}
              value={aviso.linkLabel}
              placeholder="Ver ofertas"
              aria-invalid={recusado('linkLabel')}
              onChange={e => onChange({ linkLabel: e.target.value })}
            />
            {recusaEm('linkLabel')}
          </FieldGroup>
          {destino}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {VAGAS.map(vaga => {
            const url = aviso[vaga.campo]
            const proporcao = { aspectRatio: `${vaga.slot.width} / ${vaga.slot.height}` }
            return (
              <div key={vaga.campo} className="min-w-0 space-y-1.5">
                <label htmlFor={id(vaga.campo)} className="block text-sm font-medium text-foreground">
                  Enviar arte · {vaga.slot.width} × {vaga.slot.height}
                </label>
                {url ? (
                  <img
                    data-testid={`miniatura-${vaga.campo}-${indice}`}
                    src={url}
                    alt=""
                    style={proporcao}
                    className="w-full rounded-lg border border-border object-contain"
                  />
                ) : (
                  <span
                    style={proporcao}
                    className="flex w-full items-center justify-center rounded-lg border border-dashed border-input bg-muted/30"
                  >
                    <ImagePlus className="h-5 w-5 text-muted-foreground" aria-hidden />
                  </span>
                )}
                <input
                  id={id(vaga.campo)}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={e => onUpload(vaga.campo, e.target.files?.[0])}
                  className="min-h-11 w-full text-xs text-muted-foreground file:mr-2 file:rounded file:border file:border-input file:bg-card file:px-2 file:py-1 file:text-xs file:text-foreground"
                />
                <span className="block text-[11px] text-muted-foreground">Arte do {vaga.dispositivo}, inteira, sem corte.</span>
                {enviando[vaga.campo] && (
                  <p role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Enviando…
                  </p>
                )}
                {recados[vaga.campo] && (
                  <p data-testid={`recado-${vaga.campo}-${indice}`} role="alert" className="text-xs font-medium text-destructive">
                    {recados[vaga.campo]}
                  </p>
                )}
                {recusaEm(vaga.campo)}
              </div>
            )
          })}
          <FieldGroup label="Texto alternativo" htmlFor={id('alt')} hint="O que está escrito na arte.">
            <Input
              id={id('alt')}
              value={aviso.alt}
              aria-invalid={recusado('alt')}
              onChange={e => onChange({ alt: e.target.value })}
            />
            {recusaEm('alt')}
          </FieldGroup>
          {destino}
        </div>
      )}
    </div>
  )
}

export default AnnouncementFields
