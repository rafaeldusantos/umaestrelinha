import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { AdminFaqPageItem } from '../api/useAdminFaqPage'
import FaqPageRow from './FaqPageRow'

/**
 * Um assunto da página, com as perguntas dele — `FAQL-20`.
 *
 * **O arraste é o HTML5 nativo** (`draggable` + `dataTransfer`), e não `@dnd-kit`. O pacote está
 * instalado, mas as duas listas reordenáveis que já existem no painel — `HomeSectionRow` e
 * `CategoryTable` — usam o nativo. Uma segunda mecânica de arraste no mesmo produto é dívida de
 * interação: a dona aprenderia dois gestos para a mesma ação.
 *
 * A ordem só é **gravada ao soltar**, com a lista inteira do assunto — nunca um `update` por
 * movimento do mouse.
 */
const FaqPageGroupCard = ({
  label,
  items,
  onEditar,
  onRemover,
  onReordenar,
  onMoverParaCa,
}: {
  label: string
  items: readonly AdminFaqPageItem[]
  onEditar: (item: AdminFaqPageItem) => void
  onRemover: (item: AdminFaqPageItem) => void
  onReordenar: (faqIdsNaOrdem: string[]) => void
  onMoverParaCa: (faqId: string) => void
}) => {
  const [aberto, setAberto] = useState(true)
  const [arrastando, setArrastando] = useState<string | null>(null)

  /** Solta sobre outra linha: reordena dentro do assunto, ou puxa de outro assunto. */
  const soltarSobre = (alvoId: string) => {
    const origem = arrastando
    setArrastando(null)
    if (!origem || origem === alvoId) return

    const ids = items.map(i => i.faq_id)
    if (!ids.includes(origem)) {
      onMoverParaCa(origem)
      return
    }

    // O destino é o índice do alvo na lista ORIGINAL, não na lista já sem a origem.
    //
    // A diferença só aparece arrastando para BAIXO: remover a origem antes desloca o alvo uma casa
    // para cima, e o item largado cai **antes** dele em vez de no lugar dele. O gesto passa a se
    // comportar diferente conforme a direção, que é o tipo de coisa que a dona sente como "não foi
    // para onde eu soltei" e não consegue descrever.
    const destino = ids.indexOf(alvoId)
    const semOrigem = ids.filter(id => id !== origem)
    semOrigem.splice(destino, 0, origem)
    onReordenar(semOrigem)
  }

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex flex-row items-center gap-3 px-5 h-[52px] border-b border-border/60">
        <button
          type="button"
          onClick={() => setAberto(a => !a)}
          aria-expanded={aberto}
          aria-label={`${aberto ? 'Recolher' : 'Abrir'} ${label}`}
          className="flex flex-row items-center gap-3 flex-1 text-left"
        >
          <ChevronDown
            aria-hidden
            className={`w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform ${aberto ? '' : '-rotate-90'}`}
          />
          <span className="text-sm font-semibold text-foreground">{label}</span>
          <span className="text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? 'pergunta' : 'perguntas'}
          </span>
        </button>
        {aberto && items.length > 1 && (
          <span className="text-xs text-muted-foreground">Arraste para mudar a ordem na página</span>
        )}
      </header>

      {aberto && (
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            // Soltar no vazio do grupo puxa a pergunta de outro assunto para o fim deste.
            e.preventDefault()
            const origem = e.dataTransfer.getData('text/plain')
            if (origem && !items.some(i => i.faq_id === origem)) onMoverParaCa(origem)
          }}
        >
          {items.map(item => (
            <FaqPageRow
              key={item.faq_id}
              item={item}
              onEditar={onEditar}
              onRemover={onRemover}
              onDragStart={setArrastando}
              onDragOver={e => e.preventDefault()}
              onDrop={soltarSobre}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export default FaqPageGroupCard
