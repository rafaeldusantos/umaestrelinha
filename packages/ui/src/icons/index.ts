/**
 * Biblioteca de ícones da Uma Estrelinha.
 *
 * Os desenhos vieram dos boards do Paper (`5MC-0` — guia de material, `7CF-0` — home) e existem
 * porque **o lucide não tem vocabulário desta loja**: corrente, pingente, gravação, gota afetiva.
 * O que o lucide já resolve bem (seta, coração, `+`, lupa) continua vindo de lá — duplicar um ícone
 * genérico só cria um segundo lugar para consertar.
 *
 * **Esta é a única porta.** Importe daqui (`@estrelinha/ui/icons`), nunca do arquivo do componente:
 * dois caminhos para o mesmo ícone é o "defeito 01" do projeto em miniatura. O `PixIcon` morava
 * solto em `shared/ui/` e foi trazido para cá pelo mesmo motivo.
 *
 * **A biblioteca morava em `apps/store/src/shared/ui/icons` e mudou de casa na feature 39.** O
 * motivo é uma consequência de outra regra: o seletor de ícone do painel tem de desenhar o **mesmo
 * glifo** que a loja, e `apps/backoffice` não importa de `apps/store` (`previaUnica.test.ts`
 * derruba a suíte se importar). Sem a mudança, a alternativa real não era "reusar", era **copiar** —
 * e a cliente veria um glifo na barra e a Adri outro na tela onde o escolheu. O barrel antigo **não
 * ficou reexportando**: dois caminhos para o mesmo ícone é o defeito que o parágrafo acima descreve.
 *
 * Regras do conjunto (presas por `icons.test.ts`, que ficou na suíte da loja porque `packages/ui`
 * não tem runner de teste): grade `0 0 24 24`, traço efetivo **1,5**, contorno em `currentColor` e
 * realce em `accent-strong` — ver `types.ts` para o porquê de cada uma.
 */
export type { IconProps } from './types'
export {
  ICON_ACCENT,
  ICON_SCALE_G40,
  ICON_SCALE_G48,
  ICON_SCALE_G120,
  ICON_STROKE,
  ICON_STROKE_G40,
  ICON_STROKE_G48,
  ICON_STROKE_G120,
  ICON_VIEW_BOX,
} from './types'

export { default as AtendimentoIcon } from './AtendimentoIcon'
export { default as CaixaPacIcon } from './CaixaPacIcon'
export { default as CartaRegistradaIcon } from './CartaRegistradaIcon'
export { default as ColetaFrascoIcon } from './ColetaFrascoIcon'
export { default as CorrenteIcon } from './CorrenteIcon'
export { default as CotoUmbilicalIcon } from './CotoUmbilicalIcon'
export { default as DenteLeiteIcon } from './DenteLeiteIcon'
export { default as EnvioIcon } from './EnvioIcon'
export { default as EstrelinhaStarIcon } from './EstrelinhaStarIcon'
export { default as FlorPrensadaIcon } from './FlorPrensadaIcon'
export { default as FrascoLeiteIcon } from './FrascoLeiteIcon'
export { default as GotaAfetivaIcon } from './GotaAfetivaIcon'
export { default as GravacaoIcon } from './GravacaoIcon'
export { default as MechaAmarradaIcon } from './MechaAmarradaIcon'
export { default as MechaCabeloIcon } from './MechaCabeloIcon'
export { default as PapelAluminioIcon } from './PapelAluminioIcon'
export { default as ParcelasIcon } from './ParcelasIcon'
export { default as PassoEmbalagemIcon } from './PassoEmbalagemIcon'
export { default as PassoEscolhaIcon } from './PassoEscolhaIcon'
export { default as PassoMaterialIcon } from './PassoMaterialIcon'
export { default as PingenteIcon } from './PingenteIcon'
export { default as PixIcon } from './PixIcon'
export { default as PlacentaIcon } from './PlacentaIcon'
export { default as PlasticoFilmeIcon } from './PlasticoFilmeIcon'
export { default as PoteCinzasIcon } from './PoteCinzasIcon'
export { default as PoteTampaIcon } from './PoteTampaIcon'
export { default as SacoIdentificadoIcon } from './SacoIdentificadoIcon'
export { default as TampaVedadaIcon } from './TampaVedadaIcon'
export { default as UnhaIcon } from './UnhaIcon'

import AtendimentoIcon from './AtendimentoIcon'
import CaixaPacIcon from './CaixaPacIcon'
import CartaRegistradaIcon from './CartaRegistradaIcon'
import ColetaFrascoIcon from './ColetaFrascoIcon'
import CorrenteIcon from './CorrenteIcon'
import CotoUmbilicalIcon from './CotoUmbilicalIcon'
import DenteLeiteIcon from './DenteLeiteIcon'
import EnvioIcon from './EnvioIcon'
import EstrelinhaStarIcon from './EstrelinhaStarIcon'
import FlorPrensadaIcon from './FlorPrensadaIcon'
import FrascoLeiteIcon from './FrascoLeiteIcon'
import GotaAfetivaIcon from './GotaAfetivaIcon'
import GravacaoIcon from './GravacaoIcon'
import MechaAmarradaIcon from './MechaAmarradaIcon'
import MechaCabeloIcon from './MechaCabeloIcon'
import PapelAluminioIcon from './PapelAluminioIcon'
import ParcelasIcon from './ParcelasIcon'
import PassoEmbalagemIcon from './PassoEmbalagemIcon'
import PassoEscolhaIcon from './PassoEscolhaIcon'
import PassoMaterialIcon from './PassoMaterialIcon'
import PingenteIcon from './PingenteIcon'
import PixIcon from './PixIcon'
import PlacentaIcon from './PlacentaIcon'
import PlasticoFilmeIcon from './PlasticoFilmeIcon'
import PoteCinzasIcon from './PoteCinzasIcon'
import PoteTampaIcon from './PoteTampaIcon'
import SacoIdentificadoIcon from './SacoIdentificadoIcon'
import TampaVedadaIcon from './TampaVedadaIcon'
import UnhaIcon from './UnhaIcon'
import type { IconProps } from './types'
import type { MenuIconKey } from '@estrelinha/core/menu'

/**
 * Registro por nome — para quem escolhe o ícone a partir de **dado**, não de código: o item de menu
 * que guarda `icon: 'corrente'`, a vantagem da faixa de confiança, o passo do guia.
 *
 * `PixIcon` fica de fora do registro de propósito: ele é a marca oficial do arranjo (grade de 16,
 * preenchido, não monoline) e não obedece às regras do conjunto. Continua exportado nomeadamente.
 */
export const ESTRELINHA_ICONS = {
  atendimento: AtendimentoIcon,
  'caixa-pac': CaixaPacIcon,
  'carta-registrada': CartaRegistradaIcon,
  'coleta-frasco': ColetaFrascoIcon,
  corrente: CorrenteIcon,
  'coto-umbilical': CotoUmbilicalIcon,
  'dente-leite': DenteLeiteIcon,
  envio: EnvioIcon,
  estrela: EstrelinhaStarIcon,
  'flor-prensada': FlorPrensadaIcon,
  'frasco-leite': FrascoLeiteIcon,
  'gota-afetiva': GotaAfetivaIcon,
  gravacao: GravacaoIcon,
  'mecha-amarrada': MechaAmarradaIcon,
  'mecha-cabelo': MechaCabeloIcon,
  'papel-aluminio': PapelAluminioIcon,
  parcelas: ParcelasIcon,
  'passo-embalagem': PassoEmbalagemIcon,
  'passo-escolha': PassoEscolhaIcon,
  'passo-material': PassoMaterialIcon,
  pingente: PingenteIcon,
  placenta: PlacentaIcon,
  'plastico-filme': PlasticoFilmeIcon,
  'pote-cinzas': PoteCinzasIcon,
  'pote-tampa': PoteTampaIcon,
  'saco-identificado': SacoIdentificadoIcon,
  'tampa-vedada': TampaVedadaIcon,
  unha: UnhaIcon,
} satisfies Record<string, (props: IconProps) => JSX.Element>

export type EstrelinhaIconName = keyof typeof ESTRELINHA_ICONS

/**
 * O desenho de cada chave do catálogo do menu (feature 39) — a outra metade de
 * `MENU_ICON_KEYS`, que mora em `@estrelinha/core/menu`.
 *
 * **A divisão não é arrumação.** A chave é dado: ela vem de `categories.icon`, é gravada pelo painel
 * e lida pela loja, e por isso precisa viver num pacote que rode em Node, em Deno e no browser —
 * `core` não pode ter um `import React` no grafo, porque isso derruba a edge function em runtime, e
 * não em build. O desenho é React e vive aqui. `MENU_ICON_COMPONENTS` é o único ponto onde os dois
 * se encontram.
 *
 * `Record<MenuIconKey, …>` é o que **prova** a cobertura em tempo de compilação: chave nova em
 * `MENU_ICON_KEYS` sem desenho aqui não compila. O guarda `menuIconCatalog.test.ts` fecha o outro
 * sentido — desenho aqui sem chave lá.
 *
 * É `ESTRELINHA_ICONS` reapresentado sob o tipo do catálogo, e não uma segunda tabela: duas listas
 * do mesmo mapeamento divergiriam no primeiro ícone novo, em silêncio.
 */
export const MENU_ICON_COMPONENTS: Record<MenuIconKey, (props: IconProps) => JSX.Element> =
  ESTRELINHA_ICONS
