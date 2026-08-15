import { ICON_ACCENT, ICON_STROKE, ICON_VIEW_BOX, type IconProps } from './types'

/**
 * Balão de conversa — o atendimento humano no WhatsApp.
 *
 * Sem o logotipo verde do WhatsApp: `whatsapp #25D366` é reservado ao **botão** do WhatsApp
 * (`DESIGN.md` §2), e um logotipo de terceiro dentro de uma faixa de vantagens da loja rouba o eixo
 * da leitura. O que a linha promete é *atendimento humano* — o canal está escrito ao lado.
 */
const AtendimentoIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <path
      d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.7-5.2A8.5 8.5 0 1 1 21 11.5Z"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinejoin="round"
    />
    <path
      d="M9 9.5c0 3 2.5 5.5 5.5 5.5"
      stroke={ICON_ACCENT}
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
    />
  </svg>
)

export default AtendimentoIcon
