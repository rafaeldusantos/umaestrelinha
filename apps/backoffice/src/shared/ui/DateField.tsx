// O campo de data do backoffice (feature 18 / T2, DSC-05).
//
// Substitui `<input type="date">` nas telas de Descontos. O nativo não é "o padrão do navegador": é
// um controle DIFERENTE em cada navegador — ordem dos campos, idioma do calendário e formato de
// digitação mudam entre Chrome, Firefox e Safari, e no Firefox do Windows ele nem abre calendário.
// `AdminOrdersPage` já usava `Popover` + `Calendar` desde a feature 07; esta é a mesma composição,
// virada componente para as quatro vigências do grupo `Descontos`.
//
// O valor de entrada e de saída é `YYYY-MM-DD` — a mesma string que o `zod` dos dois formulários já
// guardava quando o campo era nativo. Assim a troca não toca em schema, payload nem teste de save.

import { CalendarIcon, X } from 'lucide-react'
import { ptBR } from 'date-fns/locale'
import { Button } from '@estrelinha/ui/button'
import { Label } from '@estrelinha/ui/label'
import { Calendar } from '@estrelinha/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@estrelinha/ui/popover'
import { cn } from '@estrelinha/ui/lib/utils'
import { dateFromDateOnly, dateOnlyFromDate, formatDateOnly, type DateOnly } from '../lib/dateOnly'

interface Props {
  label: string
  /** `2026-08-31` ou `''`. */
  value: DateOnly
  onChange: (value: DateOnly) => void
  /**
   * O que o botão diz quando não há data.
   *
   * Não é decoração: `Vale desde já` / `Sem fim` são a resposta que a vigência vazia DÁ. Um
   * placeholder genérico ("dd/mm/aaaa") deixaria a pessoa sem saber se o campo em branco é uma
   * pendência ou uma escolha.
   */
  placeholder: string
  hint?: string
  className?: string
}

const DateField = ({ label, value, onChange, placeholder, hint, className }: Props) => {
  const selected = dateFromDateOnly(value)

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <div className="flex items-center gap-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              // O rótulo acessível é o `label`: é assim que os testes e o leitor de tela chegam ao
              // campo pelo nome que a tela mostra, e não pelo valor que ele carrega hoje.
              aria-label={label}
              className={cn(
                'w-full justify-start rounded-xl text-left font-normal',
                !value && 'text-muted-foreground',
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
              {value ? formatDateOnly(value) : placeholder}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              locale={ptBR}
              selected={selected}
              defaultMonth={selected}
              onSelect={date => onChange(dateOnlyFromDate(date))}
              className="pointer-events-auto p-3"
            />
          </PopoverContent>
        </Popover>
        {/* Só existe com data escolhida: um `X` permanente ao lado de um campo vazio é um alvo de
            clique que não faz nada. Limpar grava nulo (AC 4). */}
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Limpar ${label}`}
            onClick={() => onChange('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export default DateField
