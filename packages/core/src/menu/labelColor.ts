// A cor do rótulo de um item principal do menu — uma para cada superfície.
//
// A dona escolhe a cor livre (`#RRGGBB`): uma para a barra escura do computador e outra para a folha
// branca do celular. Cor não escolhida naquela superfície é `null`, e a loja desenha o rótulo como
// sempre desenhou. Submenu e "ver tudo em X" não têm cor própria.
//
// **A régua de contraste mora aqui, e não na tela**: o painel recusa antes de gravar e mostra a
// medida, e a loja só desenha o que já passou. Duas escritas da régua divergiriam sem nada quebrar.
//
// **Os fundos são cópia deliberada.** O dono dos valores é `ESTRELINHA_PROFILES`
// (`packages/ui/src/tokens/estrelinha.ts`), que este módulo não pode importar: `core/menu` é
// alcançado pelo Deno e não importa `@estrelinha/ui`. Um guarda da suíte da loja lê os dois e compara.
//
// Folha alcançável pelo Deno: todo import é relativo com `.ts` explícito, `import type` incluso.

import { contrastRatio } from '../color/contrast.ts'
import { formatContrast } from '../campaigns/text.ts'
import { STYLE_PROFILES, type StyleProfile } from '../appearance/types.ts'
import { STYLE_PROFILE_LABELS } from '../appearance/copy.ts'
import type { MenuSurface } from './menu.ts'

/** As duas cores do rótulo. `null` = a cor de sempre daquela superfície. */
export interface MenuLabelColors {
  /** A barra do computador (fundo escuro, o `primary` do perfil). */
  bar: string | null
  /** A folha do celular (fundo branco). */
  sheet: string | null
}

/** O único formato aceito. Fora dele a cor é lida como "sem cor". */
export const MENU_LABEL_HEX = /^#[0-9A-Fa-f]{6}$/

/**
 * O que o painel diz quando o código digitado não é `#RRGGBB`. Gravado, ele seria lido como "sem
 * cor" — e a dona veria o rótulo voltar ao padrão sem saber por quê.
 */
export const MENU_LABEL_COLOR_FORMAT = 'Use o formato #RRGGBB na cor do texto, ou toque em “Usar a cor padrão”.'

/** O piso de contraste do rótulo (texto de corpo, WCAG 1.4.3). */
export const MENU_LABEL_CONTRAST_MIN = 4.5

/** O fundo da barra do computador em cada perfil: o `primary` dele. */
export const MENU_LABEL_BAR_BACKGROUNDS: Readonly<Record<StyleProfile, string>> = {
  padrao: '#34495E',
  'black-friday': '#1C1A18',
}

/** O fundo da folha do celular: branco, nos dois perfis. */
export const MENU_LABEL_SHEET_BACKGROUND = '#FFFFFF'

const ehObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor)

const corOuNada = (valor: unknown): string | null =>
  typeof valor === 'string' && MENU_LABEL_HEX.test(valor) ? valor : null

/** As cores gravadas, tolerante: campo ausente, de outro tipo ou fora de `#RRGGBB` ⇒ `null`. */
export const menuLabelColorsOf = (bruto: unknown): MenuLabelColors => ({
  bar: ehObjeto(bruto) ? corOuNada(bruto.bar) : null,
  sheet: ehObjeto(bruto) ? corOuNada(bruto.sheet) : null,
})

/** A cor do rótulo nesta superfície: a da barra no computador, a da folha no celular. */
export const menuLabelColorFor = (cores: unknown, surface: MenuSurface): string | null => {
  const lidas = menuLabelColorsOf(cores)
  return surface === 'desktop' ? lidas.bar : lidas.sheet
}

/** A pior medida de uma cor na superfície, e onde ela acontece. `null` sem cor válida. */
const piorMedida = (
  cor: unknown,
  surface: MenuSurface,
): { razao: number; perfil: StyleProfile | null } | null => {
  const valida = corOuNada(cor)
  if (!valida) return null
  if (surface === 'mobile') {
    return { razao: contrastRatio(valida, MENU_LABEL_SHEET_BACKGROUND), perfil: null }
  }
  let pior: { razao: number; perfil: StyleProfile | null } | null = null
  for (const perfil of STYLE_PROFILES) {
    const razao = contrastRatio(valida, MENU_LABEL_BAR_BACKGROUNDS[perfil])
    if (!pior || razao < pior.razao) pior = { razao, perfil }
  }
  return pior
}

const ONDE: Record<MenuSurface, string> = {
  desktop: 'na barra do computador',
  mobile: 'na lista do celular',
}

/**
 * A cor de UMA superfície serve? `null` quando serve ou quando não há cor. A barra é medida contra o
 * `primary` de todos os perfis, e a frase traz o pior deles.
 */
export const menuLabelColorSurfaceRefusal = (cor: unknown, surface: MenuSurface): string | null => {
  const medida = piorMedida(cor, surface)
  if (!medida || medida.razao >= MENU_LABEL_CONTRAST_MIN) return null
  const valor = formatContrast(medida.razao, MENU_LABEL_CONTRAST_MIN)
  if (surface === 'desktop') {
    const perfil = STYLE_PROFILE_LABELS[medida.perfil].name
    return `A cor do texto ${ONDE.desktop} mede ${valor} sobre a barra no perfil ${perfil}: o nome fica difícil de ler. Escolha uma cor mais clara (o mínimo é 4,5:1).`
  }
  return `A cor do texto ${ONDE.mobile} mede ${valor} sobre o fundo branco: o nome fica difícil de ler. Escolha uma cor mais escura (o mínimo é 4,5:1).`
}

/** A cor serve: a frase verde da tela ("8,4:1 Contraste bom para ler o nome."), ou `null`. */
export const menuLabelColorApproval = (cor: unknown, surface: MenuSurface): string | null => {
  const medida = piorMedida(cor, surface)
  if (!medida || medida.razao < MENU_LABEL_CONTRAST_MIN) return null
  return `${formatContrast(medida.razao, MENU_LABEL_CONTRAST_MIN)} Contraste bom para ler o nome ${ONDE[surface]}.`
}

/** As duas cores de um item, antes de gravar: a barra primeiro, depois a folha. */
export const menuLabelColorRefusal = (cores: unknown): string | null => {
  const lidas = menuLabelColorsOf(cores)
  return (
    menuLabelColorSurfaceRefusal(lidas.bar, 'desktop') ??
    menuLabelColorSurfaceRefusal(lidas.sheet, 'mobile')
  )
}
