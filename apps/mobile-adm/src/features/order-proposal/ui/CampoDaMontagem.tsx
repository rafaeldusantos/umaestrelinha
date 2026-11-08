import type React from 'react'

import { CAMPO, ROTULO } from '@/shared/ui/campo'

/**
 * Um campo da montagem: rótulo visível ligado ao campo por `htmlFor`, a dica curta ao lado do
 * rótulo ("Opcional"), e o campo travado (`readOnly`) quando o valor ainda vai chegar de outro lugar —
 * o CEP completando o endereço.
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
}) => (
  <div className="flex min-w-0 flex-col gap-1">
    <label htmlFor={id} className={ROTULO}>
      {rotulo}
      {dica && <span className="ml-1 font-normal text-estrelinha-ink-soft">{dica}</span>}
    </label>
    <input
      id={id}
      ref={referencia}
      type={type}
      className={`${CAMPO} w-full min-w-0 read-only:bg-estrelinha-ground-deep`}
      value={valor}
      placeholder={placeholder}
      readOnly={travado}
      inputMode={inputMode}
      autoComplete={autoComplete}
      onChange={(e) => aoMudar(e.target.value)}
    />
  </div>
)

export default Campo

