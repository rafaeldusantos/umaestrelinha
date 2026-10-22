/**
 * O endereço público do Backoffice (`VITE_BACKOFFICE_URL`), lido na hora da chamada — nunca cravado
 * no código, porque muda no dia do domínio próprio. Sem a env, `null`: o rodapé mantém a frase e não
 * desenha o link (o resto do app funciona).
 */
export const backofficeUrl = (): string | null => {
  const valor = (import.meta.env.VITE_BACKOFFICE_URL as string | undefined)?.trim()
  return valor ? valor : null
}
