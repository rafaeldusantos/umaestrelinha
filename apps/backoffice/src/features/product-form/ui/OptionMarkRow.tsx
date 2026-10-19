// Uma linha da seção "Pelas variações" — uma OPÇÃO da peça ("Cor = Prata 925") — feature 67.
//
// À esquerda a miniatura, o texto e quantas variações ativas o carregam; à direita os valores
// marcados nesta opção (chips "Grupo › Valor"), as sugestões tracejadas e o "Marcar". Três estados
// de chip, e nenhum é decorativo:
//
// - marcado: tocar tira (`VFL-06` é o save quem grava);
// - já vale para a peça toda (`VFL-04`): desabilitado, com o motivo em texto — a marcação da peça
//   toda vence a da opção na loja;
// - sem variação ativa (`VFL-07`): apagado e removível, com a frase dizendo que não casa nada.

import { Check, X } from 'lucide-react'
import { cn } from '@estrelinha/ui/lib/utils'
import type { Suggestion } from '@estrelinha/core/filters'
import type { AdminFilterGroup } from '@/entities/filter'
import type { LinhaDeOpcao } from '../model/optionRows'
import { variacoesAtivasLabel } from '../model/optionRows'
import MarkPopover from './MarkPopover'
import SuggestionStrip from './SuggestionStrip'

interface Props {
  linha: LinhaDeOpcao
  grupos: readonly AdminFilterGroup[]
  /** Os valores marcados NESTA opção. */
  marcados: readonly string[]
  naPecaToda: ReadonlySet<string>
  /** "Grupo › Valor" de cada valor do catálogo. */
  rotulos: ReadonlyMap<string, string>
  /** Só o nome do valor, para a faixa de sugestão. */
  nomes: ReadonlyMap<string, string>
  sugestoes: readonly Suggestion[]
  motivo: (s: Suggestion) => string
  onToggle: (valueId: string) => void
  onAceitar: (s: Suggestion) => void
  onRecusar: (s: Suggestion) => void
  podeRecusar: boolean
  recusando: boolean
}

const CHIP = 'inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm'

const OptionMarkRow = ({
  linha,
  grupos,
  marcados,
  naPecaToda,
  rotulos,
  nomes,
  sugestoes,
  motivo,
  onToggle,
  onAceitar,
  onRecusar,
  podeRecusar,
  recusando,
}: Props) => {
  const rotulo = `${linha.option_name} = ${linha.option_value}`
  const semAtiva = linha.ativas === 0
  return (
    <div
      role="group"
      aria-label={rotulo}
      data-testid={`opcao-${linha.option_name}-${linha.option_value}`}
      className="grid gap-3 border-t border-border p-4 first:border-t-0 sm:grid-cols-[220px_minmax(0,1fr)]"
    >
      <div className="flex min-w-0 items-center gap-3">
        {linha.foto ? (
          <img src={linha.foto} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" loading="lazy" />
        ) : (
          <span aria-hidden className="h-10 w-10 shrink-0 rounded-md bg-muted" />
        )}
        <div className="min-w-0">
          <p className="break-words text-sm font-medium text-foreground">{linha.option_value}</p>
          {semAtiva ? (
            <span className="mt-1 inline-block rounded-full bg-estrelinha-admin-amber/10 px-2 py-0.5 text-[11px] font-semibold text-estrelinha-admin-amber">
              Sem variação ativa
            </span>
          ) : (
            <p className="text-xs text-muted-foreground">{variacoesAtivasLabel(linha.ativas)}</p>
          )}
        </div>
      </div>

      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap gap-2">
          {marcados.map(id => {
            const nome = rotulos.get(id) ?? 'Valor apagado'
            if (naPecaToda.has(id)) {
              return (
                <span key={id} className="inline-flex flex-col">
                  <button type="button" disabled aria-pressed className={cn(CHIP, 'border-border bg-muted text-muted-foreground')}>
                    {nome}
                  </button>
                  <span className="mt-1 text-xs text-muted-foreground">Já vale para a peça toda</span>
                </span>
              )
            }
            if (semAtiva) {
              return (
                <button
                  key={id}
                  type="button"
                  aria-label={`Remover ${nome}`}
                  onClick={() => onToggle(id)}
                  className={cn(CHIP, 'border-transparent bg-muted text-muted-foreground')}
                >
                  {nome}
                  <X aria-hidden className="h-4 w-4" />
                </button>
              )
            }
            return (
              <button
                key={id}
                type="button"
                aria-pressed
                onClick={() => onToggle(id)}
                className={cn(CHIP, 'border-primary bg-primary font-medium text-primary-foreground')}
              >
                <Check aria-hidden className="h-4 w-4" />
                {nome}
              </button>
            )
          })}
          {sugestoes.map(s => (
            <span
              key={`sug-${s.value_id}`}
              data-testid="chip-sugerido"
              className={cn(CHIP, 'border-dashed border-primary bg-card text-primary')}
            >
              {rotulos.get(s.value_id) ?? ''}
            </span>
          ))}
          <MarkPopover
            rotulo={rotulo}
            grupos={grupos}
            marcados={new Set(marcados)}
            naPecaToda={naPecaToda}
            onToggle={onToggle}
          />
        </div>
        {semAtiva && marcados.some(id => !naPecaToda.has(id)) && (
          <p className="text-xs text-muted-foreground">
            {linha.total === 0
              ? 'Marcada, mas não casa nada na loja: nenhuma variação tem este texto.'
              : `Marcada, mas não casa nada na loja enquanto as ${linha.total} ${linha.total === 1 ? 'variação estiver desativada' : 'variações estiverem desativadas'}.`}
          </p>
        )}
        {sugestoes.map(s => (
          <SuggestionStrip
            key={`faixa-${s.value_id}`}
            texto={`Sugestão: ${nomes.get(s.value_id) ?? ''} — ${motivo(s)}`}
            aviso={s.replacesWholeMark ? 'Aceitar troca a marcação da peça toda por esta opção.' : null}
            onAceitar={() => onAceitar(s)}
            onRecusar={() => onRecusar(s)}
            podeRecusar={podeRecusar}
            recusando={recusando}
          />
        ))}
      </div>
    </div>
  )
}

export default OptionMarkRow
