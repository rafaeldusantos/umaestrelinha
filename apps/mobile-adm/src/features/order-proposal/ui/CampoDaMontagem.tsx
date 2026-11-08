import type React from 'react'

import { CAMPO, ROTULO } from '@/shared/ui/campo'

/**
 * Um campo da montagem: rótulo visível ligado ao campo por `htmlFor`, a dica curta ao lado do
 * rótulo ("Opcional"), e o campo travado (`readOnly`) quando o valor ainda vai chegar de outro lugar —
 * o CEP completando o endereço. `marca` é a linha de baixo de um campo que a leitura de um texto
 * preencheu ("Lido do texto — confira."), ligada ao campo por `aria-describedby`.
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
      aria-describedby={marca ? `${id}-marca` : undefined}
      onChange={(e) => aoMudar(e.target.value)}
    />
    {marca && (
      <p id={`${id}-marca`} className="text-sm text-estrelinha-ink-soft">
        {marca}
      </p>
    )}
  </div>
)

export default Campo

