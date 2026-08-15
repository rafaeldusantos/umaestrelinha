import { Fragment, type ReactNode } from 'react'
import { sectionMeta, type HomeSection, type ResolvedSection } from '@estrelinha/core/home'
import { useResolvedHome } from '../model/useResolvedHome'
import { HOME_SECTION_RENDERERS, type SectionRenderProps } from './sectionRenderers'
import PreviewSectionFrame from './PreviewSectionFrame'

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

export interface HomeRendererPreview {
  /** O bloco contornado. `null` não contorna nenhum. */
  highlightId: string | null
}

interface Props {
  sections: readonly HomeSection[]
  /**
   * Presente **só** na prévia do painel (feature 25).
   *
   * Sem ela, cada seção continua saindo num `Fragment` — que é o que `homeComposition.test.tsx` mede.
   * Com ela, cada seção ganha um invólucro com o próprio id, que é o alvo do clique e a caixa do
   * contorno.
   */
  preview?: HomeRendererPreview
}

const HomeRenderer = ({ sections, preview }: Props) => {
  const resolvidas = useResolvedHome(sections)

  /**
   * O invólucro da prévia — ou o próprio nó, quando ninguém pediu prévia.
   *
   * A faixa institucional aninhada passa por aqui **também**, e é de propósito: ela desenha dentro da
   * seção de fileiras, e sem invólucro próprio o clique nela abriria o editor das fileiras. Como o
   * invólucro dela fica mais interno, o `closest()` do lado do clique acha o certo primeiro.
   */
  const envolve = (resolvida: ResolvedSection, node: ReactNode): ReactNode => {
    if (!preview || !node) return node
    return (
      <PreviewSectionFrame
        sectionId={resolvida.section.id}
        label={sectionMeta(resolvida.section.type)?.label ?? resolvida.section.type}
        highlighted={preview?.highlightId === resolvida.section.id}
      >
        {node}
      </PreviewSectionFrame>
    )
  }

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
        // linha de estilo, e `HOME-04` mede o DOM renderizado. Na prévia do painel `envolve` põe o
        // invólucro de volta — lá a árvore pode mudar, porque lá quem olha é a dona, não a cliente.
        return (
          <Fragment key={resolvida.section.id}>
            {envolve(
              resolvida,
              desenha(resolvida, {
                interlude: faixa ? envolve(faixa, desenha(faixa)) : undefined,
                interludeAfter: faixa?.nestedUnder?.afterRow,
              }),
            )}
          </Fragment>
        )
      })}
    </div>
  )
}

export default HomeRenderer
