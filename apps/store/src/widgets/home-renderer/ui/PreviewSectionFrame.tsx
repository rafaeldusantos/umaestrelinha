// Feature 25 — o invólucro que **só existe em modo prévia**.
//
// Ele dá duas coisas que a prévia do painel precisa e a loja não tem: um alvo com o id da seção
// (para o clique voltar como `select`) e uma caixa onde desenhar o contorno de "é esta que você está
// editando".
//
// **Por que não existe fora do modo prévia**: `homeComposition.test.tsx` (a T1 da feature 24) mede o
// **DOM renderizado** da Home, e a regra do gate é "não perde asserção, só ganha". Um invólucro por
// seção mudaria a árvore da página sem mudar uma linha de estilo — exatamente o tipo de alteração que
// aquele teste existe para pegar. Aqui o `HomeRenderer` continua emitindo `Fragment` quando ninguém
// pediu prévia.
//
// A cor é o roxo do PAINEL, cravada, e não um token da loja: isto é cromo de ferramenta desenhado por
// cima da loja, e pintá-lo com `accent` ou `primary` faria a dona ler o contorno como parte da
// vitrine.

import type { ReactNode } from 'react'
import { PREVIEW_SECTION_ATTR } from '@estrelinha/core/home'

/** O roxo de `--estrelinha-admin-primary`. Cromo do painel, nunca da marca. */
const PAINEL = '#6C3CE9'

interface Props {
  sectionId: string
  /** O nome da seção, para a etiqueta do contorno. */
  label: string
  highlighted: boolean
  children: ReactNode
}

const PreviewSectionFrame = ({ sectionId, label, highlighted, children }: Props) => (
  <div
    {...{ [PREVIEW_SECTION_ATTR]: sectionId }}
    data-testid={`previa-secao-${sectionId}`}
    style={{
      position: 'relative',
      // `outline` e não `border`: borda entraria no fluxo e empurraria o conteúdo 2px, mudando o
      // layout que a prévia existe para mostrar com fidelidade.
      outline: highlighted ? `2px solid ${PAINEL}` : undefined,
      outlineOffset: '-2px',
    }}
  >
    {children}
    {highlighted && (
      <span
        aria-hidden
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          padding: '3px 8px',
          borderRadius: '5px 0 0 0',
          backgroundColor: PAINEL,
          color: '#FFFFFF',
          fontSize: 11,
          fontWeight: 600,
          lineHeight: '14px',
          pointerEvents: 'none',
        }}
      >
        {label}
      </span>
    )}
  </div>
)

export default PreviewSectionFrame
