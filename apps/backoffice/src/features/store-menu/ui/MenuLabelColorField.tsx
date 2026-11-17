// A cor do texto de um item principal numa superfície — o seletor de cor, o código e "Usar a cor
// padrão", com a medida de contraste. A medida e a frase são de `core` (`menuLabelColorApproval`,
// `menuLabelColorSurfaceRefusal`): esta tela só mostra.

import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { cn } from '@estrelinha/ui/lib/utils'
import {
  MENU_LABEL_HEX,
  menuLabelColorApproval,
  menuLabelColorSurfaceRefusal,
  type MenuSurface,
} from '@estrelinha/core/menu'
import { BOTAO_CONTORNO } from './estilos'

interface Props {
  /** Prefixo dos ids e dos `data-testid` (`cor-barra`, `cor-folha`). */
  id: string
  label: string
  surface: MenuSurface
  /** O código digitado; `''` = a cor padrão. */
  value: string
  /** O que o seletor mostra enquanto não há cor escolhida. */
  placeholderColor: string
  onChange: (value: string) => void
}

const MenuLabelColorField = ({ id, label, surface, value, placeholderColor, onChange }: Props) => {
  const valida = MENU_LABEL_HEX.test(value)
  const recusa = valida ? menuLabelColorSurfaceRefusal(value, surface) : null
  const aprovacao = valida ? menuLabelColorApproval(value, surface) : null
  // O `onChange` do React só avisa quando o valor difere do último que ELE viu no campo; quem escreve
  // `value` direto e depois dispara o `input` (autopreenchimento, automação) passa calado, e o campo
  // vazio fica mostrando "sem cor" com a cor anterior ainda no estado. O `input` nativo avisa sempre.
  const digitado = (e: { currentTarget: HTMLInputElement }) => onChange(e.currentTarget.value.trim().toUpperCase())

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="color"
          data-testid={`${id}-seletor`}
          aria-label={`${label} — seletor`}
          value={valida ? value.toLowerCase() : placeholderColor}
          onChange={e => onChange(e.target.value.toUpperCase())}
          className="h-11 w-11 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1"
        />
        <Input
          id={id}
          value={value}
          maxLength={7}
          placeholder="Padrão"
          onChange={digitado}
          onInput={digitado}
          className="h-11 w-32 min-w-0 border-input font-mono uppercase"
        />
        <Button
          type="button"
          variant="outline"
          data-testid={`${id}-padrao`}
          disabled={value === ''}
          onClick={() => onChange('')}
          className={cn('h-auto min-h-11 max-w-full whitespace-normal', BOTAO_CONTORNO)}
        >
          Usar a cor padrão
        </Button>
      </div>
      {recusa ? (
        <p data-testid={`${id}-medida`} className="text-sm text-destructive">
          {recusa}
        </p>
      ) : (
        aprovacao && (
          <p data-testid={`${id}-medida`} className="text-sm text-emerald-700">
            {aprovacao}
          </p>
        )
      )}
    </div>
  )
}

export default MenuLabelColorField
