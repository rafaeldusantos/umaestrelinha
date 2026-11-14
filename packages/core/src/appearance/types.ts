// O perfil de estilo da loja: a paleta que a loja inteira veste. Uma configuração só, gravada em
// `store_settings` na chave `appearance` como `{ profile }`. Sem migration: a ausência da linha é o
// Padrão, e um valor que não seja um dos perfis abaixo também.
//
// Muda só as cores. Textos, blocos, preços e menu não leem esta chave.

/** Os perfis, na ordem em que o painel os oferece. */
export const STYLE_PROFILES = ['padrao', 'black-friday'] as const

export type StyleProfile = (typeof STYLE_PROFILES)[number]

/** O perfil de quem nunca escolheu, e o recuo de todo valor desconhecido. */
export const DEFAULT_STYLE_PROFILE: StyleProfile = 'padrao'

/**
 * O atributo do `<html>` que carrega o perfil. Escrito pelo servidor no HTML servido e pela loja
 * depois da carga; as folhas de estilo da paleta o selecionam. Quem escreve ou lê o atributo importa
 * esta constante em vez de repetir o nome.
 */
export const STYLE_PROFILE_ATTRIBUTE = 'data-perfil'

/** A forma da chave `appearance` de `store_settings`. */
export interface AppearanceSettings {
  profile: StyleProfile
}

/** A chave ausente: o Padrão. */
export const DEFAULT_APPEARANCE: AppearanceSettings = { profile: DEFAULT_STYLE_PROFILE }
