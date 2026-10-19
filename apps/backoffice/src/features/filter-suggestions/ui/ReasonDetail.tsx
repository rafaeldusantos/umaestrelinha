// O motivo aberto — feature 67 (`VFL-19`, `VFL-20`, `VFL-21`, `VFL-23`, `VFL-27`).
//
// A lista das peças daquele motivo, todas selecionadas por padrão (`VFL-19`), e a barra fixa com os
// dois botões — que valem para a SELEÇÃO, nunca para o motivo inteiro: as desmarcadas continuam na
// fila. A seleção é do pai (a tela), que a guarda por motivo; uma falha deixa-a exatamente como
// estava (`VFL-23`).
//
// O aviso da troca (`VFL-27`) aparece ANTES do clique, duas vezes: o selo no cabeçalho ("N trocam a
// marcação da peça toda") e a coluna "Hoje" na própria linha ("Peça toda → troca").

import { Check } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { cn } from '@estrelinha/ui/lib/utils'
import type { SuggestionGroup } from '@estrelinha/core/filters'
import {
  FONTE_LABEL,
  pecasLabel,
  quantasTrocam,
  tituloDoMotivo,
  variacoesLabel,
  type LinhaDaPeca,
  type ValorDaFila,
} from '../model/fila'

interface Props {
  motivo: SuggestionGroup
  valor: ValorDaFila | undefined
  linhas: readonly LinhaDaPeca[]
  selecionadas: ReadonlySet<string>
  onAlternar: (productId: string) => void
  onAlternarTodas: () => void
  onAprovar: () => void
  onRecusar: () => void
  gravando: boolean
  erro: string | null
}

const HOJE: Record<LinhaDaPeca['hoje'], string> = {
  sem: 'Sem marcação',
  troca: 'Peça toda → troca',
  'por-opcao': 'Por opção',
}

// SPEC_DEVIATION: o artboard escreve "As outras cores da mesma peça não são marcadas." — o exemplo
// dele é o eixo Cor. O motivo pode ser de qualquer eixo ("Tipos de elo = Chaveiro"), então a frase
// diz "opções".
const NOTA_DO_ALVO = {
  option: 'Vale só para as variações com esse texto em cada peça. As outras opções da mesma peça não são marcadas.',
  product: 'Vale para a peça toda: todas as variações dela passam no filtro.',
}

const ReasonDetail = ({
  motivo,
  valor,
  linhas,
  selecionadas,
  onAlternar,
  onAlternarTodas,
  onAprovar,
  onRecusar,
  gravando,
  erro,
}: Props) => {
  const n = selecionadas.size
  const total = linhas.length
  const trocam = quantasTrocam(motivo)
  const todas = total > 0 && n === total
  const porOpcao = motivo.target === 'option'

  return (
    // SEM `overflow` aqui (D1 da prova em navegador): `overflow-hidden` fazia do `section` o contêiner
    // de rolagem do `sticky` abaixo, e a barra grudava no fim do próprio `section` — 13.993px numa
    // janela de 900 com um motivo de 224 peças. O canto arredondado de baixo é da própria barra.
    <section aria-label="Motivo aberto" className="flex flex-col rounded-2xl border border-border bg-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Motivo · {FONTE_LABEL[motivo.source]}
          </p>
          <h2 className="mt-1 break-words font-heading text-lg font-semibold text-foreground">{tituloDoMotivo(motivo, valor)}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{porOpcao ? NOTA_DO_ALVO.option : NOTA_DO_ALVO.product}</p>
        </div>
        {trocam > 0 && (
          <span className="rounded-full bg-estrelinha-admin-amber/10 px-3 py-1 text-xs font-semibold text-estrelinha-admin-amber">
            {trocam === 1 ? '1 troca a marcação da peça toda' : `${trocam} trocam a marcação da peça toda`}
          </span>
        )}
      </header>

      <div className="flex min-h-11 items-center gap-3 border-b border-border bg-muted/40 px-4">
        <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3 text-sm font-medium text-foreground">
          <input type="checkbox" className="h-5 w-5 shrink-0" checked={todas} onChange={onAlternarTodas} />
          <span>
            {pecasLabel(total)} · {n} {n === 1 ? 'selecionada' : 'selecionadas'}
          </span>
        </label>
        {porOpcao && (
          <span className="hidden w-32 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:block">
            Variações que casam
          </span>
        )}
        <span className="hidden w-36 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:block">
          Hoje
        </span>
      </div>

      <ul className="divide-y divide-border" aria-label="Peças do motivo">
        {linhas.map(l => {
          const id = l.produto.id
          const marcada = selecionadas.has(id)
          const casamLabel = `${l.casam} de ${l.ativas}`
          return (
            <li key={id} data-testid={`peca-${id}`} className={cn(marcada && 'bg-muted/30')}>
              <label className="flex min-h-[60px] cursor-pointer items-center gap-3 px-4 py-2">
                <input
                  type="checkbox"
                  className="h-5 w-5 shrink-0"
                  aria-label={l.produto.name}
                  checked={marcada}
                  onChange={() => onAlternar(id)}
                />
                {l.produto.thumb ? (
                  <img src={l.produto.thumb} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-md object-cover" />
                ) : (
                  <span aria-hidden className="h-10 w-10 shrink-0 rounded-md bg-muted" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-medium text-foreground">{l.produto.name}</span>
                  <span className="block break-words text-xs text-muted-foreground">
                    {variacoesLabel(l.ativas)}
                    {porOpcao && l.tambem.length > 0 ? ` · ${l.sugestao.option_name} também: ${l.tambem.join(', ')}` : ''}
                  </span>
                  {/* No celular as duas colunas viram a segunda linha. */}
                  <span
                    className={cn(
                      'block text-xs md:hidden',
                      l.hoje === 'troca' ? 'font-medium text-estrelinha-admin-amber' : 'text-muted-foreground',
                    )}
                  >
                    {porOpcao ? `${casamLabel} variações · ` : ''}
                    {HOJE[l.hoje].toLocaleLowerCase('pt-BR')}
                  </span>
                </span>
                {porOpcao && (
                  <span data-testid="casam" className="hidden w-32 shrink-0 text-sm text-foreground md:block">
                    {casamLabel}
                  </span>
                )}
                <span
                  data-testid="hoje"
                  className={cn(
                    'hidden w-36 shrink-0 text-sm md:block',
                    l.hoje === 'troca' ? 'font-medium text-estrelinha-admin-amber' : 'text-muted-foreground',
                  )}
                >
                  {HOJE[l.hoje]}
                </span>
              </label>
            </li>
          )
        })}
      </ul>

      <div
        data-testid="barra-do-motivo"
        className="sticky bottom-0 z-10 mt-auto flex flex-wrap items-center gap-3 rounded-b-2xl border-t border-border bg-card p-4 pb-[calc(16px+env(safe-area-inset-bottom))]"
      >
        <div className="min-w-0 flex-1 basis-full sm:basis-auto">
          <p className="text-sm font-semibold text-foreground">
            {n} de {total} {n === 1 ? 'selecionada' : 'selecionadas'}
          </p>
          <p className="text-xs text-muted-foreground">
            Os dois botões valem para as selecionadas. As desmarcadas continuam na fila.
          </p>
          {erro && (
            <p role="alert" className="mt-1 text-xs font-medium text-destructive">
              {erro}
            </p>
          )}
        </div>
        <Button type="button" variant="outline" className="h-12" disabled={gravando || n === 0} onClick={onRecusar}>
          Recusar {n}
        </Button>
        <Button type="button" className="h-12 flex-1 sm:flex-none" disabled={gravando || n === 0} onClick={onAprovar}>
          <Check aria-hidden className="mr-2 h-4 w-4" />
          Aprovar {n} {porOpcao ? 'nesta opção' : 'na peça toda'}
        </Button>
      </div>
    </section>
  )
}

export default ReasonDetail
