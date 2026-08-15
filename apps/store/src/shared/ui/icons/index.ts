/**
 * Biblioteca de ícones da Uma Estrelinha.
 *
 * Os desenhos vieram dos boards do Paper (`5MC-0` — guia de material, `7CF-0` — home) e existem
 * porque **o lucide não tem vocabulário desta loja**: corrente, pingente, gravação, gota afetiva.
 * O que o lucide já resolve bem (seta, coração, `+`, lupa) continua vindo de lá — duplicar um ícone
 * genérico só cria um segundo lugar para consertar.
 *
 * **Esta é a única porta.** Importe daqui (`@/shared/ui/icons`), nunca do arquivo do componente:
 * dois caminhos para o mesmo ícone é o "defeito 01" do projeto em miniatura. O `PixIcon` morava
 * solto em `shared/ui/` e foi trazido para cá pelo mesmo motivo.
 *
 * Regras do conjunto (presas por `__tests__/icons.test.tsx`): grade `0 0 24 24`, traço efetivo
 * **1,5**, contorno em `currentColor` e realce em `accent-strong` — ver `types.ts` para o porquê de
 * cada uma.
 */
export type { IconProps } from './types'
export { ICON_ACCENT, ICON_STROKE, ICON_VIEW_BOX } from './types'

export { default as AtendimentoIcon } from './AtendimentoIcon'
export { default as CorrenteIcon } from './CorrenteIcon'
export { default as EnvioIcon } from './EnvioIcon'
export { default as EstrelinhaStarIcon } from './EstrelinhaStarIcon'
export { default as GotaAfetivaIcon } from './GotaAfetivaIcon'
export { default as GravacaoIcon } from './GravacaoIcon'
export { default as ParcelasIcon } from './ParcelasIcon'
export { default as PassoEmbalagemIcon } from './PassoEmbalagemIcon'
export { default as PassoEscolhaIcon } from './PassoEscolhaIcon'
export { default as PassoMaterialIcon } from './PassoMaterialIcon'
export { default as PingenteIcon } from './PingenteIcon'
export { default as PixIcon } from './PixIcon'

import AtendimentoIcon from './AtendimentoIcon'
import CorrenteIcon from './CorrenteIcon'
import EnvioIcon from './EnvioIcon'
import EstrelinhaStarIcon from './EstrelinhaStarIcon'
import GotaAfetivaIcon from './GotaAfetivaIcon'
import GravacaoIcon from './GravacaoIcon'
import ParcelasIcon from './ParcelasIcon'
import PassoEmbalagemIcon from './PassoEmbalagemIcon'
import PassoEscolhaIcon from './PassoEscolhaIcon'
import PassoMaterialIcon from './PassoMaterialIcon'
import PingenteIcon from './PingenteIcon'
import PixIcon from './PixIcon'
import type { IconProps } from './types'

/**
 * Registro por nome — para quem escolhe o ícone a partir de **dado**, não de código: o item de menu
 * que guarda `icon: 'corrente'`, a vantagem da faixa de confiança, o passo do guia.
 *
 * `PixIcon` fica de fora do registro de propósito: ele é a marca oficial do arranjo (grade de 16,
 * preenchido, não monoline) e não obedece às regras do conjunto. Continua exportado nomeadamente.
 */
export const ESTRELINHA_ICONS = {
  atendimento: AtendimentoIcon,
  corrente: CorrenteIcon,
  envio: EnvioIcon,
  estrela: EstrelinhaStarIcon,
  'gota-afetiva': GotaAfetivaIcon,
  gravacao: GravacaoIcon,
  parcelas: ParcelasIcon,
  'passo-embalagem': PassoEmbalagemIcon,
  'passo-escolha': PassoEscolhaIcon,
  'passo-material': PassoMaterialIcon,
  pingente: PingenteIcon,
} satisfies Record<string, (props: IconProps) => JSX.Element>

export type EstrelinhaIconName = keyof typeof ESTRELINHA_ICONS
