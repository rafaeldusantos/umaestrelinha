import { useEffect, useState } from 'react'
import { Input } from '@estrelinha/ui/input'
import { cn } from '@estrelinha/ui/lib/utils'

/**
 * Base dos inputs mascarados. Não é exportada pelo barrel: os consumidores usam `MoneyInput`,
 * `WeightInput` ou `DimensionInput`.
 *
 * ## As duas decisões que definem este componente
 *
 * **1. É controlado por NÚMERO, não por string.** `value: number | null` e
 * `onChange(v: number | null)`. A máscara existe só na camada de apresentação. O alternativo —
 * controlar por string e converter no submit — espalha `parseFloat` por toda tela consumidora e é
 * exatamente como nasce um `NaN` chegando ao banco.
 *
 * **2. O texto digitado tem estado próprio enquanto o campo está em foco.** Sem isso, digitar
 * `1` num campo de moeda viraria `1,00` no mesmo instante e o cursor pularia para o fim — não dá
 * para digitar `14,90`, porque a formatação atropela cada tecla. Então: enquanto há foco, o texto
 * é da pessoa; ao sair, ele é reformatado a partir do número.
 *
 * O prefixo e o sufixo ficam em slot fixo FORA do input, e nunca entram no valor: `R$` dentro do
 * campo é onde o cursor se perde e onde o `parse` precisa adivinhar.
 */
export interface MaskedNumberInputProps {
  value: number | null
  onChange: (value: number | null) => void
  /** Converte o texto digitado em número. Devolve `null` quando não há número — nunca `NaN`. */
  parse: (input: string) => number | null
  /** Converte o número na string exibida quando o campo NÃO está em foco. */
  format: (value: number | null) => string
  prefix?: string
  suffix?: string
  placeholder?: string
  disabled?: boolean
  id?: string
  className?: string
  'aria-label'?: string
  'data-testid'?: string
  /** Edição inline da listagem (13/T39): a célula abre já com o cursor dentro. */
  autoFocus?: boolean
  /** Disparado DEPOIS da reformatação interna — a célula usa isto para gravar ao sair. */
  onBlur?: () => void
}

export const MaskedNumberInput = ({
  value,
  onChange,
  parse,
  format,
  prefix,
  suffix,
  placeholder,
  disabled,
  id,
  className,
  'aria-label': ariaLabel,
  'data-testid': testId,
  autoFocus,
  onBlur,
}: MaskedNumberInputProps) => {
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState('')

  // Fora de foco, o texto é derivado do número — inclusive quando o valor muda por fora
  // (reidratação do formulário, ação em massa na grade).
  useEffect(() => {
    if (!focused) setDraft(format(value))
  }, [value, focused, format])

  const handleChange = (raw: string) => {
    setDraft(raw)
    const parsed = parse(raw)

    // Campo esvaziado é intenção explícita de "sem valor" e propaga como null.
    if (raw.trim() === '') {
      onChange(null)
      return
    }

    // Texto sem número NÃO propaga: mantém o último valor válido. Propagar `null` aqui apagaria
    // o preço de um produto porque a pessoa colou algo errado por engano.
    if (parsed === null) return

    onChange(parsed)
  }

  return (
    <div
      className={cn(
        'flex items-center rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring',
        disabled && 'opacity-50',
        className,
      )}
    >
      {prefix && (
        // `select-none` + slot de largura fixa: o cursor nunca caminha por cima do símbolo.
        <span
          aria-hidden="true"
          className="shrink-0 select-none pl-3 pr-1 text-sm text-muted-foreground"
        >
          {prefix}
        </span>
      )}
      <Input
        id={id}
        aria-label={ariaLabel}
        data-testid={testId}
        inputMode="decimal"
        disabled={disabled}
        placeholder={placeholder}
        value={draft}
        onFocus={() => setFocused(true)}
        autoFocus={autoFocus}
        onBlur={() => { setFocused(false); setDraft(format(value)); onBlur?.() }}
        onChange={e => handleChange(e.target.value)}
        className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      {suffix && (
        <span
          aria-hidden="true"
          className="shrink-0 select-none pl-1 pr-3 text-sm text-muted-foreground"
        >
          {suffix}
        </span>
      )}
    </div>
  )
}
