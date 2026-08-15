// O editor das seções de texto (feature 24, T29 — `HOME-41`..`HOME-44`).
//
// Um editor para quatro tipos, e não quatro editores quase iguais: a faixa institucional, os chips
// de tema, a newsletter e a faixa de vantagens fazem a MESMA pergunta — que texto vai aqui, e quantos
// itens cabem. O que muda entre elas é a lista de campos, que é dado.
//
// **A faixa de vantagens é o caso que dá nome à regra e não tem campo nenhum** (`HOME-44`). Os
// números dela — frete grátis, parcelas, desconto no Pix — saem de `store_settings`, a mesma fonte
// que o caixa cobra. Dar campo de texto aqui reintroduziria o defeito da `MarqueeBar`, que prometia
// "Parcele em 12×" enquanto `max_installments` já era 6 — com a diferença de que agora quem digitaria
// o número errado seria a dona. Então a tela **diz onde o número mora**, em vez de deixá-la procurar.

import { Link } from 'react-router-dom'
import { Settings2 } from 'lucide-react'
import { Input } from '@estrelinha/ui/input'
import { Textarea } from '@estrelinha/ui/textarea'
import { Label } from '@estrelinha/ui/label'
import { sectionMeta, type HomeSectionConfig, type HomeSectionType } from '@estrelinha/core/home'
import { FormCard } from '@/shared/ui'
import type { SectionEditorProps } from './sectionEditors'

interface CampoTexto {
  key: keyof HomeSectionConfig
  label: string
  multilinha?: boolean
}

/**
 * Os campos de cada tipo — **dado, não quatro componentes**.
 *
 * A ordem é a de leitura da seção na loja: o que a cliente lê primeiro aparece primeiro aqui.
 */
const CAMPOS: Partial<Record<HomeSectionType, CampoTexto[]>> = {
  brand_statement: [
    { key: 'eyebrow', label: 'Sobretítulo' },
    { key: 'title', label: 'Título' },
    { key: 'paragraph', label: 'Texto', multilinha: true },
    { key: 'author_name', label: 'Assinatura — nome' },
    { key: 'author_role', label: 'Assinatura — o que faz' },
  ],
  trending_tags: [
    { key: 'title', label: 'Título' },
    { key: 'subtitle', label: 'Subtítulo' },
  ],
  newsletter: [
    { key: 'title', label: 'Título' },
    { key: 'subtitle', label: 'Subtítulo' },
    { key: 'cta_label', label: 'Botão — texto' },
  ],
}

/**
 * Quem tem o link de "ver todos" / de escape (`HOME-41`, `HOME-43`).
 *
 * A newsletter fica de fora porque o botão dela **não navega**: ele abre o cadastro ali mesmo.
 */
const COM_LINK: HomeSectionType[] = ['brand_statement', 'trending_tags']

const TextSectionEditor = ({ section, config, onConfigChange }: SectionEditorProps) => {
  const meta = sectionMeta(section.type)

  if (section.type === 'trust_bar') {
    return (
      <FormCard title="Faixa de vantagens">
        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/30 p-3">
          <Settings2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-foreground">
              Esta faixa não tem texto para escrever aqui.
            </p>
            <p className="text-xs text-muted-foreground">
              O valor do frete grátis, o número de parcelas e o desconto no Pix saem de{' '}
              <Link to="/admin/configuracoes" className="font-medium text-primary underline">
                Configurações
              </Link>{' '}
              — a mesma fonte que o caixa cobra. Assim a faixa nunca promete uma coisa e a compra
              cobra outra.
            </p>
          </div>
        </div>
      </FormCard>
    )
  }

  const campos = CAMPOS[section.type] ?? []
  const temLink = COM_LINK.includes(section.type)
  const faixa = meta?.limit ?? null

  return (
    <FormCard title={meta?.label ?? section.type}>
      {campos.map(campo => (
        <div key={campo.key} className="space-y-1.5">
          <Label htmlFor={`texto-${campo.key}`}>{campo.label}</Label>
          {campo.multilinha ? (
            <Textarea
              id={`texto-${campo.key}`}
              rows={4}
              value={(config[campo.key] as string) ?? ''}
              onChange={e => onConfigChange({ [campo.key]: e.target.value })}
            />
          ) : (
            <Input
              id={`texto-${campo.key}`}
              value={(config[campo.key] as string) ?? ''}
              onChange={e => onConfigChange({ [campo.key]: e.target.value })}
            />
          )}
        </div>
      ))}

      {temLink && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="texto-link-label">Link — texto</Label>
            <Input
              id="texto-link-label"
              value={config.link_label ?? ''}
              onChange={e => onConfigChange({ link_label: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="texto-link-href">Link — destino</Label>
            <Input
              id="texto-link-href"
              placeholder="/busca"
              value={config.link_href ?? ''}
              onChange={e => onConfigChange({ link_href: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Uma página da loja. Endereço que a loja não serve é recusado ao salvar.
            </p>
          </div>
        </div>
      )}

      {faixa && (
        <div className="space-y-1.5">
          <Label htmlFor="texto-limite">Quantos itens mostrar</Label>
          <Input
            id="texto-limite"
            type="number"
            min={faixa.min}
            max={faixa.max}
            // Vazio vira `null`, não `0`: "sem limite" é uma resposta legítima, e `0` seria uma
            // seção que não mostra nada. Quem lê trata `null` como "não corte".
            value={config.limit ?? ''}
            onChange={e =>
              onConfigChange({ limit: e.target.value === '' ? null : Number(e.target.value) })
            }
            className="max-w-[140px]"
          />
          {/* A faixa sai de `sectionMeta`, não de dois números digitados aqui: quem recusa ao salvar
              é `configRefusal`, e a dica precisa dizer a MESMA coisa que a recusa. */}
          <p className="text-xs text-muted-foreground">
            De {faixa.min} a {faixa.max}. Deixe vazio para não cortar.
          </p>
        </div>
      )}
    </FormCard>
  )
}

export default TextSectionEditor
