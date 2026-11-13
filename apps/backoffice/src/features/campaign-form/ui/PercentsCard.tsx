// Os percentuais que a campanha oferece ao cadastro da peça: até cinco, de 1 a 70, em ordem
// crescente, cada um com quantas peças o usam. Tirar um percentual em uso é recusado com a contagem,
// e o link leva às peças que usam aquele percentual.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import {
  campaignPercentAddRefusal,
  campaignPercentRemovalRefusal,
  campaignPiecesLabel,
  sortedPercents,
} from '@estrelinha/core/campaigns'
import { FormCard } from '@/shared/ui'
import { campaignProductsHref } from '@/entities/campaign'

interface Props {
  percents: number[]
  onChange: (next: number[]) => void
  /** Quantas peças usam cada percentual gravado (vazio na campanha nova). */
  usage: Record<number, number>
  /** O id da campanha gravada, para o link "Ver as peças com {p}%". */
  campaignId: string | null
  /** A recusa da lista inteira (nenhum percentual), mostrada quando a dona já mexeu na tela. */
  listRefusal: string | null
}

const PercentsCard = ({ percents, onChange, usage, campaignId, listRefusal }: Props) => {
  const [valor, setValor] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [emUso, setEmUso] = useState<{ percent: number; message: string } | null>(null)

  const adicionar = () => {
    const p = Number(valor)
    const recusa = valor === '' ? 'Use um número de 1 a 70.' : campaignPercentAddRefusal(p, percents)
    if (recusa) {
      setErro(recusa)
      return
    }
    setErro(null)
    setEmUso(null)
    setValor('')
    onChange(sortedPercents([...percents, p]))
  }

  const tirar = (p: number) => {
    const recusa = campaignPercentRemovalRefusal(p, usage[p] ?? 0)
    if (recusa) {
      setEmUso({ percent: p, message: recusa })
      return
    }
    setEmUso(null)
    onChange(percents.filter(x => x !== p))
  }

  return (
    <FormCard title="Percentuais" description="São as opções que aparecem no cadastro da peça. Até 5, de 1 a 70%.">
      {percents.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum percentual ainda.</p>
      ) : (
        <ul className="flex flex-wrap gap-2" aria-label="Percentuais da campanha">
          {sortedPercents(percents).map(p => (
            <li
              key={p}
              data-testid="pilula-do-percentual"
              className="flex min-h-12 items-center gap-2 rounded-full border border-border bg-card pl-4 pr-1"
            >
              <span className="text-sm font-bold tabular-nums">{p}%</span>
              <span className="text-xs text-muted-foreground">{campaignPiecesLabel(usage[p] ?? 0)}</span>
              <Button
                type="button"
                variant="ghost"
                className="h-11 rounded-full px-3 text-xs"
                onClick={() => tirar(p)}
              >
                Tirar {p}%
              </Button>
            </li>
          ))}
        </ul>
      )}

      {emUso && (
        <div role="alert" className="space-y-1 text-sm text-destructive">
          <p>{emUso.message}</p>
          {campaignId && (
            <Link
              to={campaignProductsHref(campaignId, emUso.percent)}
              className="inline-flex min-h-11 items-center font-medium underline"
            >
              Ver as peças com {emUso.percent}%
            </Link>
          )}
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="campanha-percentual">Novo percentual</Label>
          <div className="flex items-center gap-1">
            <Input
              id="campanha-percentual"
              inputMode="numeric"
              maxLength={2}
              value={valor}
              onChange={e => {
                setValor(e.target.value.replace(/\D/g, '').slice(0, 2))
                setErro(null)
              }}
              onKeyDown={e => {
                if (e.key !== 'Enter') return
                e.preventDefault()
                adicionar()
              }}
              className="h-11 w-20 tabular-nums"
            />
            <span aria-hidden="true" className="text-sm text-muted-foreground">%</span>
          </div>
        </div>
        <Button type="button" variant="outline" className="h-11" onClick={adicionar}>
          Adicionar
        </Button>
      </div>
      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      {!erro && listRefusal && percents.length === 0 && (
        <p role="alert" className="text-sm text-destructive">{listRefusal}</p>
      )}
    </FormCard>
  )
}

export default PercentsCard
