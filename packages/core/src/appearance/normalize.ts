// A leitura do jsonb da chave `appearance`. Nunca lança: o valor gravado pode ser qualquer coisa
// (linha antiga, escrita à mão no banco, tipo trocado), e a loja abre no Padrão em vez de quebrar.

import { DEFAULT_STYLE_PROFILE, STYLE_PROFILES, type AppearanceSettings, type StyleProfile } from './types.ts'

/** Um dos perfis, exatamente como está escrito — ou o Padrão. Sem aparar nem trocar caixa. */
export const styleProfileOf = (value: unknown): StyleProfile =>
  typeof value === 'string' && (STYLE_PROFILES as readonly string[]).includes(value)
    ? (value as StyleProfile)
    : DEFAULT_STYLE_PROFILE

const ehObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor)

/** A configuração inteira, só com o perfil. Ausente, nula, de outro tipo ou sem perfil válido ⇒ Padrão. */
export const normalizeAppearance = (value: unknown): AppearanceSettings => ({
  profile: styleProfileOf(ehObjeto(value) ? value.profile : undefined),
})
