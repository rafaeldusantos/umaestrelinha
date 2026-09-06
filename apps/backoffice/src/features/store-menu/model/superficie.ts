import type { MenuSurface } from '@estrelinha/core/menu'

/**
 * O nome do dispositivo como a Adri o lê — **um dono só**.
 *
 * Quatro superfícies da tela escrevem "computador" e "celular": o alternador, o aviso cruzado da
 * lista, o texto do editor de painel e o do editor de banner. Com a palavra repetida em quatro
 * arquivos, trocar o vocabulário (para "desktop", ou "no telefone") deixaria três deles para trás —
 * e a tela passaria a chamar a mesma coisa de dois nomes, sem nada quebrar.
 *
 * Mora em `model/` e não ao lado do componente porque um `.tsx` que exporta constante **e** React
 * quebra o Fast Refresh do Vite: o módulo inteiro é reavaliado a cada edição, e o estado da tela se
 * perde no meio da configuração.
 */
export const NOME_DA_SUPERFICIE: Record<MenuSurface, string> = {
  desktop: 'computador',
  mobile: 'celular',
}

/** A outra superfície — o aviso cruzado é sobre ela. */
export const outraSuperficie = (surface: MenuSurface): MenuSurface =>
  surface === 'desktop' ? 'mobile' : 'desktop'
