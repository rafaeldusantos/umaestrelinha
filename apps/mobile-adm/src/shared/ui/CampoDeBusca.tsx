import { useEffect, useRef, useState } from 'react'

import { useDebounce } from '@/shared/lib/useDebounce'

import { Search } from 'lucide-react'

/**
 * O campo de busca das listas do ateliê (feature `74`, `MAP-10`, `MAP-11`, `MAP-42`; extraído na `76`
 * para a lista de pedidos e a de clientes terem UM debounce — duas escritas dele seriam o defeito 01
 * em miniatura).
 *
 * - **O termo sai só depois de `atraso`** sem tecla nova: uma tecla não dispara consulta. A primeira
 *   montagem não emite nada, e o `inicial` não é reemitido.
 * - **O termo é estado da página, nunca do endereço** (A13): um nome de cliente no histórico do
 *   navegador é dado pessoal guardado onde ninguém pediu.
 * - `inicial`: o termo que a página já tem ao montar (o voltar do detalhe) — lido só na montagem.
 * - Rótulo acessível (`sr-only`), `role="search"` e 46 px de altura — a pílula do protótipo (acima do piso de 44).
 * - **O foco sobe o campo ao topo da tela** (conserto do QA da `76`): com o teclado aberto e a fonte grande,
 *   a primeira linha de resultado ficava fora da tela.
 * - **Enter tira o foco do campo** (`MAC-34`): fecha o teclado do celular e deixa a lista inteira à
 *   vista. Não busca na hora — o termo já sai pelo debounce.
 */
/** O tempo que o teclado virtual leva para terminar de abrir. */
export const SUBIDA_APOS_TECLADO_MS = 300

const CampoDeBusca = ({
  id,
  rotulo,
  placeholder,
  atraso,
  aoBuscar,
  inicial = '',
}: {
  id: string
  rotulo: string
  placeholder: string
  atraso: number
  aoBuscar: (termo: string) => void
  inicial?: string
}) => {
  const [texto, setTexto] = useState(inicial)
  const termo = useDebounce(texto, atraso)
  const emitido = useRef(inicial)
  const atual = useRef(aoBuscar)
  atual.current = aoBuscar

  // O teclado leva um instante para abrir: só então o campo sobe ao topo, para os resultados caberem.
  const subida = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => () => clearTimeout(subida.current), [])

  useEffect(() => {
    if (termo === emitido.current) return
    emitido.current = termo
    atual.current(termo)
  }, [termo])

  return (
    // A pílula do protótipo: 46 px, a lupa dentro à esquerda, `surface` com a borda de campo (`field`,
    // 3,63:1). A lupa é decoração: o nome do campo é o `<label>` (sr-only).
    <div role="search" className="relative min-w-0">
      <label htmlFor={id} className="sr-only">
        {rotulo}
      </label>
      <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-estrelinha-ink-soft" strokeWidth={1.5} />
      <input
        id={id}
        type="search"
        inputMode="search"
        autoComplete="off"
        enterKeyHint="search"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onFocus={(e) => {
          const campo = e.currentTarget
          clearTimeout(subida.current)
          subida.current = setTimeout(() => {
            if (document.activeElement === campo) campo.scrollIntoView?.({ block: 'start' })
          }, SUBIDA_APOS_TECLADO_MS)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        placeholder={placeholder}
        className="h-[46px] w-full min-w-0 rounded-pill border border-estrelinha-field bg-estrelinha-surface pl-11 pr-4 text-[15px] text-estrelinha-ink placeholder:text-estrelinha-ink-soft"
      />
    </div>
  )
}

export default CampoDeBusca
