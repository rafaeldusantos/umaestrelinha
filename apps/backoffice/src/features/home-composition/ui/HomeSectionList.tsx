// A lista de seções da Home, arrastável (feature 24).
//
// Molde do `MenuSlotList`: cartão com cabeçalho contador, linhas arrastáveis por `dataTransfer`, e
// o rodapé reservado para a bandeja de blocos (`HomeBlockTray`, T23). A bandeja vive DENTRO deste
// cartão, e não num modal do botão "Adicionar seção": é onde se lê quais tipos são únicos e já
// estão na lista, o que responde a pergunta **antes** de a dona clicar e ser recusada.

import type { ReactNode } from 'react'
import { reorderSections, type ResolvedSection } from '@estrelinha/core/home'
import HomeSectionRow from './HomeSectionRow'

interface Props {
  /** Já resolvida por `resolveHomeSections` — a mesma regra que a loja usa para desenhar. */
  resolved: ResolvedSection[]
  onToggle: (id: string, next: boolean) => void
  onOpen: (id: string) => void
  /** Recebe **posições absolutas, só das linhas que mudaram** (`reorderSections`). */
  onReorder: (moves: { id: string; position: number }[]) => void
  /** A bandeja de blocos, no rodapé do cartão. */
  footer?: ReactNode
}

/**
 * Quais linhas aparecem **recuadas**, e por quê.
 *
 * A faixa institucional declara ela mesma o aninhamento (`config.interlude_after`), e o
 * renderizador da loja a põe dentro da seção de fileiras **renderizada** imediatamente anterior.
 * Esta lista repete essa caminhada — e não uma regra própria — porque uma lista que mostrasse a
 * faixa como irmã diria uma ordem que a loja não obedece.
 *
 * Por que não basta ler `nestedUnder`: ele só vem preenchido quando a seção **renderiza**. Uma faixa
 * desligada tem `nestedUnder: null` e ainda assim precisa aparecer no lugar onde vai entrar quando
 * for religada — senão ligar a faixa faria a linha "pular" de lugar sem nada ter mudado.
 */
const aninhadas = (resolved: readonly ResolvedSection[]): Set<string> => {
  const dentro = new Set<string>()
  let ultimaRenderizada: ResolvedSection | null = null

  for (const entry of resolved) {
    const declara = typeof entry.section.config?.interlude_after === 'number'
    if (declara && ultimaRenderizada?.section.type === 'collection_rows') {
      dentro.add(entry.section.id)
    }
    if (entry.renders) ultimaRenderizada = entry
  }

  return dentro
}

const HomeSectionList = ({ resolved, onToggle, onOpen, onReorder, footer }: Props) => {
  const dentro = aninhadas(resolved)
  const noAr = resolved.filter(e => e.section.active).length

  const handleDrop = (targetId: string, draggedId: string) => {
    if (!draggedId) return
    // `reorderSections` devolve `null` quando um dos ids sumiu da lista (a listagem estava velha) e
    // `[]` quando a seção foi solta sobre ela mesma. Nos dois casos não há o que gravar.
    const moves = reorderSections(
      resolved.map(e => e.section),
      draggedId,
      targetId,
    )
    if (moves && moves.length > 0) onReorder(moves)
  }

  return (
    <div className="rounded-2xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-heading text-sm font-bold text-foreground">Seções da Home</h2>
        <span data-testid="contador-secoes" className="text-xs text-muted-foreground">
          {resolved.length} {resolved.length === 1 ? 'seção' : 'seções'} · {noAr} no ar
        </span>
      </header>

      <ul>
        {resolved.map(entry => (
          <HomeSectionRow
            key={entry.section.id}
            entry={entry}
            nested={dentro.has(entry.section.id)}
            onToggle={onToggle}
            onOpen={onOpen}
            onDrop={handleDrop}
          />
        ))}
      </ul>

      {footer}
    </div>
  )
}

export default HomeSectionList
