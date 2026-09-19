// Feature 53 (T04) — as duas réguas de precondição da spec (`ABN-08`, `ABN-09`), puras e testáveis
// isoladamente. Um consumidor só (esta aba) — por isso ficam aqui, e não em `packages/core`
// (`packages/core/CLAUDE.md`: "não pertence... regra com um consumidor só que ninguém prevê
// duplicar").

import type { MaterialSettings } from '@estrelinha/supabase/types/settings'

/**
 * O endereço do ateliê está vazio? (`ABN-08`)
 *
 * Ligar `material_instructions` com o logradouro vazio produziria um e-mail com
 * `{{endereco_atelie}}` em branco — pior do que não mandar nada, no campo cujo propósito é dizer
 * para onde postar o material afetivo.
 */
export function materialAddressMissing(material: MaterialSettings): boolean {
  return material.street.trim() === ''
}

/**
 * O `admin_public_url` reportado por `?action=config-check` tem cara de ambiente local? (`ABN-09`)
 *
 * String vazia conta como "não é de produção" — ausência não é "não sei", é o mesmo problema que uma
 * URL de localhost: o link do e-mail sairia quebrado ou apontando para a máquina de ninguém.
 */
export function adminUrlLooksLocal(adminPublicUrl: string): boolean {
  return !adminPublicUrl.startsWith('https://') || /localhost|127\.0\.0\.1/.test(adminPublicUrl)
}
