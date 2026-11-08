import type React from 'react'
import { cn } from '@estrelinha/ui/lib/utils'

import { CAMPO, ROTULO } from '@/shared/ui/campo'

import { BORDA_DE_ERRO } from './bordaDeErro'

/**
 * Um campo da montagem: rótulo visível ligado ao campo por `htmlFor`, a dica curta ao lado do
 * rótulo ("Opcional"), e o campo travado (`readOnly`) quando o valor ainda vai chegar de outro lugar —
 * o CEP completando o endereço. `marca` é a linha de baixo de um campo que a leitura de um texto
 * preencheu ("Lido do texto — confira."), ligada ao campo por `aria-describedby`. `erro` põe o campo no
 * estado de erro: a frase em cor de erro abaixo dele, a borda de erro, `aria-invalid` e a frase em
 * `aria-describedby`.
 */
const Campo = ({
  id,
  rotulo,
  valor,
  aoMudar,
  placeholder,
  travado = false,
  inputMode,
  type,
  referencia,
  autoComplete,
  dica,
  marca,
  erro,
}: {
  id: string
  rotulo: string
  valor: string
  aoMudar: (v: string) => void
  placeholder?: string
  travado?: boolean
  inputMode?: 'numeric' | 'text' | 'email' | 'tel'
  type?: string
  referencia?: React.Ref<HTMLInputElement>
  autoComplete?: string
  dica?: string
  marca?: string | null
  erro?: string | null
}) => {
  const descritores = [marca ? `${id}-marca` : null, erro ? `${id}-erro` : null].filter(Boolean).join(' ')
  return (
  <div className="flex min-w-0 flex-col gap-1">
    <label htmlFor={id} className={ROTULO}>
      {rotulo}
      {dica && <span className="ml-1 font-normal text-estrelinha-ink-soft">{dica}</span>}
    </label>
    <input
      id={id}
      ref={referencia}
      type={type}
      className={cn(CAMPO, 'w-full min-w-0 read-only:bg-estrelinha-ground-deep', erro && BORDA_DE_ERRO)}
      value={valor}
      placeholder={placeholder}
      readOnly={travado}
      inputMode={inputMode}
      autoComplete={autoComplete}
      aria-invalid={erro ? true : undefined}
      aria-describedby={descritores || undefined}
      onChange={(e) => aoMudar(e.target.value)}
    />
    {marca && (
      <p id={`${id}-marca`} className="text-sm text-estrelinha-ink-soft">
        {marca}
      </p>
    )}
    {erro && (
      <p id={`${id}-erro`} role="status" className="text-sm text-estrelinha-alert">
        {erro}
      </p>
    )}
  </div>
  )
}

export default Campo

