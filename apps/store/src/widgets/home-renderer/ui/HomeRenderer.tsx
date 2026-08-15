import { Fragment } from 'react'
import type { HomeSection, ResolvedSection } from '@estrelinha/core/home'
import { useResolvedHome } from '../model/useResolvedHome'
import { HOME_SECTION_RENDERERS, type SectionRenderProps } from './sectionRenderers'

/**
 * O renderizador da Home — **a página deixa de conhecer seção nenhuma**.
 *
 * Um registro `tipo → componente` (em `sectionRenderers`) e uma caminhada pela lista resolvida. É o
 * que torna a composição um dado de verdade: acrescentar um bloco passa a ser uma linha no registro
 * e uma no catálogo, não uma edição na `HomePage`.
 */

const desenha = (resolvida: ResolvedSection, extras: Partial<SectionRenderProps> = {}) => {
  const Renderer = HOME_SECTION_RENDERERS[resolvida.section.type]
  if (!Renderer) return null
  return <Renderer section={resolvida.section} items={resolvida.items} {...extras} />
}

interface Props {
  sections: readonly HomeSection[]
}

const HomeRenderer = ({ sections }: Props) => {
  const resolvidas = useResolvedHome(sections)

  /**
   * As faixas que pendem de uma seção de fileiras, pelo id da hospedeira.
   *
   * O aninhamento é declarado pela **própria faixa** (`config.interlude_after`), e quem o resolve é
   * `resolveHomeSections`: sem uma seção de fileiras renderizada logo antes, `nestedUnder` vem
   * `null` e a faixa desenha **sozinha, no próprio lugar**. Uma Home reordenada nunca engole
   * conteúdo em silêncio.
   */
  const aninhadas = new Map<string, ResolvedSection>()
  for (const r of resolvidas) {
    if (r.renders && r.nestedUnder) aninhadas.set(r.nestedUnder.sectionId, r)
  }

  return (
    <div>
      {resolvidas.map(resolvida => {
        // Seção que não renderiza não produz NADA — nem moldura, nem espaçamento, nem título
        // (`HOME-03`). Quem precisa das que não renderizam é o painel, para dizer o motivo.
        if (!resolvida.renders) return null
        // A faixa aninhada sai dentro da hospedeira, e não no próprio lugar.
        if (resolvida.nestedUnder) return null

        const faixa = aninhadas.get(resolvida.section.id)

        // `Fragment` e não `<div>`: um invólucro por seção mudaria a árvore da página sem mudar uma
        // linha de estilo, e `HOME-04` mede o DOM renderizado.
        return (
          <Fragment key={resolvida.section.id}>
            {desenha(resolvida, {
              interlude: faixa ? desenha(faixa) : undefined,
              interludeAfter: faixa?.nestedUnder?.afterRow,
            })}
          </Fragment>
        )
      })}
    </div>
  )
}

export default HomeRenderer
