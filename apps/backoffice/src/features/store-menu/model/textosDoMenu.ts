// Feature 86 — frases da tela do menu que mais de um arquivo lê (o componente e a página, ou o
// componente e o teste). Moram em `model/` porque um `.tsx` que exporta constante **e** React quebra
// o Fast Refresh do Vite (o mesmo motivo de `superficie.ts`).

export type MenuPickerMode = 'raiz' | 'submenu'

/** O motivo de uma categoria não poder ser escolhida no seletor — `MNM-10` × `MNM-25`. */
export const MOTIVO_USADA: Record<MenuPickerMode, string> = {
  raiz: 'Já está no menu',
  submenu: 'Já está neste submenu',
}

/** A frase da confirmação sobre o submenu que sai junto (`MNM-20`). `null` sem submenu. */
export const fraseDoSubmenu = (filhos: number): string | null =>
  filhos === 0
    ? null
    : filhos === 1
      ? 'O item do submenu sai junto.'
      : `Os ${filhos} itens do submenu saem junto.`

/**
 * O aviso das subcategorias que não couberam no submenu de um item novo (`MNM-09` × `MNM-24`,
 * revisto em 2026-10-28). `null` quando todas couberam. O teto vem de `core` (`MENU_SUBMENU_LIMIT`).
 */
export const fraseDasSubcategoriasDeFora = (deFora: number, teto: number): string | null =>
  deFora <= 0
    ? null
    : deFora === 1
      ? `A outra subcategoria não entrou: o submenu tem o máximo de ${teto} itens.`
      : `As outras ${deFora} subcategorias não entraram: o submenu tem o máximo de ${teto} itens.`

/** O que o seletor diz sobre as filhas de uma categoria que vai ao menu principal. */
export const fraseDasFilhasQueEntram = (ativas: number, teto: number): string | null =>
  ativas <= 0
    ? null
    : ativas > teto
      ? `${teto} das ${ativas} subcategorias entram no submenu`
      : ativas === 1
        ? '1 subcategoria entra no submenu'
        : `${ativas} subcategorias entram no submenu`
