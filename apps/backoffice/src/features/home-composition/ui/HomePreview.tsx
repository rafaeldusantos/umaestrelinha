// A Home como a cliente vai vê-la — **esquemática, não pixel-perfect** (feature 24, `HOME-13`).
//
// **Por que não os widgets reais da loja**: `apps/backoffice` não importa `apps/store`. E mesmo se
// importasse, não deveria — a loja usa os tokens `--estrelinha-*` e esta tela usa os
// `--estrelinha-admin-*`, então o componente real chegaria aqui com a paleta errada, e a separação
// entre as duas é justamente o que `importOrder.test.ts` guarda. **Tudo aqui é token do painel.**
//
// O que esta prévia precisa provar são três coisas, e nenhuma delas é cor: a **ordem** real, o
// **texto** real de cada seção, e **quais blocos a cliente não vai ver** — com o motivo, porque um
// selo mudo obrigaria a dona a voltar à lista para descobrir o porquê.

import { EyeOff } from 'lucide-react'
import { cn } from '@estrelinha/ui/lib/utils'
import { layoutSlots, sectionMeta, type ResolvedSection } from '@estrelinha/core/home'

/** O retângulo de conteúdo — o lugar de uma imagem ou de um card de produto. */
const Vaga = ({ className }: { className?: string }) => (
  <span className={cn('block rounded bg-secondary', className)} aria-hidden />
)

const Titulo = ({ children }: { children: React.ReactNode }) => (
  <span className="truncate text-[11px] font-semibold text-foreground">{children}</span>
)

/**
 * O miolo de cada tipo.
 *
 * Nada aqui inventa número. A faixa de vantagens sai em vagas neutras, e **não** com "6× sem juros"
 * escrito: os números dela vêm de `store_settings` (`HOME-44`), e desenhá-los aqui reintroduziria,
 * na prévia, o defeito exato da `MarqueeBar` — a tela prometendo uma coisa e o caixa cobrando outra.
 */
const Miolo = ({ entry }: { entry: ResolvedSection }) => {
  const { section, items } = entry
  const config = section.config ?? {}

  switch (section.type) {
    case 'hero':
      return (
        <div className="flex gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {config.eyebrow && (
              <span className="truncate text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                {config.eyebrow}
              </span>
            )}
            <span className="line-clamp-2 font-heading text-xs font-bold text-foreground">
              {[config.title_line1, config.title_line2].filter(Boolean).join(' ')}
            </span>
            {config.cta_label && (
              <span className="w-fit rounded bg-primary px-2 py-0.5 text-[9px] font-semibold text-primary-foreground">
                {config.cta_label}
              </span>
            )}
          </div>
          <span className="h-14 w-[76px] shrink-0 rounded-lg bg-secondary" aria-hidden />
        </div>
      )

    case 'trust_bar':
      return (
        <div className="flex items-center gap-2 rounded bg-foreground px-2 py-1.5">
          {[0, 1, 2, 3].map(i => (
            <span key={i} className="h-2 flex-1 rounded-full bg-background/40" aria-hidden />
          ))}
        </div>
      )

    case 'banner_grid':
      return (
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: Math.max(items.length, layoutSlots(config.layout)) }).map((_, i) => (
            <span
              key={i}
              className="flex h-10 min-w-[64px] flex-1 items-end rounded bg-secondary p-1 text-[9px] text-muted-foreground"
            >
              <span className="truncate">{items[i]?.label ?? ''}</span>
            </span>
          ))}
        </div>
      )

    case 'trending_tags':
      return (
        <div className="flex flex-wrap gap-1">
          {items.slice(0, 8).map(item => (
            <span
              key={item.id}
              className="rounded-full bg-secondary px-2 py-0.5 text-[9px] text-foreground"
            >
              {item.label}
            </span>
          ))}
        </div>
      )

    case 'brand_statement':
      return (
        <p className="line-clamp-2 rounded bg-foreground px-2 py-2 text-[10px] font-medium text-background">
          {config.title}
        </p>
      )

    case 'newsletter':
      return (
        <div className="flex flex-col gap-1">
          {config.subtitle && (
            <span className="truncate text-[9px] text-muted-foreground">{config.subtitle}</span>
          )}
          {config.cta_label && (
            <span className="w-fit rounded bg-primary px-2 py-0.5 text-[9px] font-semibold text-primary-foreground">
              {config.cta_label}
            </span>
          )}
        </div>
      )

    default:
      return (
        <div className="flex gap-1.5">
          {items.slice(0, 4).map(item => (
            <Vaga key={item.id} className="h-8 flex-1" />
          ))}
          {items.length === 0 && <Vaga className="h-8 flex-1" />}
        </div>
      )
  }
}

/** Uma fileira de coleção: o nome dela e as vagas dos produtos. */
const Fileira = ({ label }: { label: string }) => (
  <div className="flex flex-col gap-1.5 rounded-md border border-border bg-background p-2.5">
    <Titulo>{label}</Titulo>
    <div className="flex gap-1.5">
      {[0, 1, 2, 3].map(i => (
        <Vaga key={i} className="h-8 flex-1" />
      ))}
    </div>
  </div>
)

/** Bloco de seção que a cliente **não** vai ver — com o motivo, nunca um selo mudo (`HOME-13`). */
const ForaDoAr = ({ entry }: { entry: ResolvedSection }) => (
  <div
    data-testid={`previa-fora-${entry.section.id}`}
    className="flex items-center gap-2.5 rounded-md border border-dashed border-input bg-muted/30 p-3"
  >
    <EyeOff className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    <div className="flex min-w-0 flex-1 flex-col">
      <span className="truncate text-[11px] font-semibold text-muted-foreground">
        {sectionMeta(entry.section.type)?.label ?? entry.section.type} — não aparece
      </span>
      <span className="line-clamp-2 text-[10px] text-muted-foreground">
        {entry.hiddenReason ?? 'a cliente não vê este bloco'}
      </span>
    </div>
  </div>
)

const Bloco = ({ entry }: { entry: ResolvedSection }) => (
  <div
    data-testid={`previa-${entry.section.id}`}
    className="flex flex-col gap-1.5 rounded-md border border-border bg-background p-2.5"
  >
    <Titulo>{entry.section.config?.title ?? sectionMeta(entry.section.type)?.label}</Titulo>
    <Miolo entry={entry} />
  </div>
)

interface Props {
  resolved: ResolvedSection[]
  /** A seção em edição, contornada na prévia (`T30`). */
  highlightId?: string | null
}

const HomePreview = ({ resolved, highlightId = null }: Props) => {
  // A faixa institucional entra DENTRO das fileiras, e a prévia precisa mostrá-la lá — senão ela
  // diria uma ordem que a loja não obedece, que é o defeito que esta tela existe para pegar.
  const aninhadaEm = new Map<string, ResolvedSection>()
  for (const entry of resolved) {
    if (entry.nestedUnder) aninhadaEm.set(entry.nestedUnder.sectionId, entry)
  }
  const jaDesenhadas = new Set([...aninhadaEm.values()].map(e => e.section.id))

  return (
    <div className="rounded-2xl border border-border bg-card">
      <header className="flex items-baseline justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="font-heading text-sm font-bold text-foreground">Prévia da Home</h2>
        <span className="text-xs text-muted-foreground">esquema, não é a loja</span>
      </header>

      <div className="flex flex-col gap-2 p-4">
        {resolved.map(entry => {
          if (jaDesenhadas.has(entry.section.id)) return null

          const dentro = aninhadaEm.get(entry.section.id)
          const contornada = highlightId === entry.section.id

          if (!entry.renders) {
            return (
              <div
                key={entry.section.id}
                className={cn('rounded-md', contornada && 'ring-2 ring-ring ring-offset-2')}
              >
                <ForaDoAr entry={entry} />
              </div>
            )
          }

          // Fileiras de coleção com faixa aninhada saem em três partes — as fileiras até a de
          // índice `afterRow`, a faixa, e o resto —, que é exatamente como a loja as desenha.
          if (entry.section.type === 'collection_rows' && dentro) {
            const corte = (dentro.nestedUnder?.afterRow ?? 0) + 1
            const antes = entry.items.slice(0, corte)
            const depois = entry.items.slice(corte)
            return (
              <div
                key={entry.section.id}
                data-testid={`previa-${entry.section.id}`}
                className={cn(
                  'flex flex-col gap-2',
                  contornada && 'rounded-md ring-2 ring-ring ring-offset-2',
                )}
              >
                {antes.map(item => (
                  <Fileira key={item.id} label={item.label} />
                ))}
                <div
                  data-testid={`previa-${dentro.section.id}`}
                  className="rounded-md border border-border bg-background p-2.5"
                >
                  <Miolo entry={dentro} />
                </div>
                {depois.length > 0 && (
                  <p
                    data-testid={`previa-resto-${entry.section.id}`}
                    className="truncate rounded-md border border-border bg-background p-2.5 text-[10px] text-muted-foreground"
                  >
                    Mais {depois.length} {depois.length === 1 ? 'fileira' : 'fileiras'} —{' '}
                    {depois.map(item => item.label).join(' · ')}
                  </p>
                )}
              </div>
            )
          }

          if (entry.section.type === 'collection_rows') {
            return (
              <div
                key={entry.section.id}
                data-testid={`previa-${entry.section.id}`}
                className={cn(
                  'flex flex-col gap-2',
                  contornada && 'rounded-md ring-2 ring-ring ring-offset-2',
                )}
              >
                {entry.items.map(item => (
                  <Fileira key={item.id} label={item.label} />
                ))}
              </div>
            )
          }

          return (
            <div
              key={entry.section.id}
              className={cn('rounded-md', contornada && 'ring-2 ring-ring ring-offset-2')}
            >
              <Bloco entry={entry} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default HomePreview
