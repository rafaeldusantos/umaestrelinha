// Slug de produto: o endereço `/produtos/:slug`. Letras minúsculas, números e hífen.

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')

/** Forma final: sem acento, espaço/símbolo viram hífen, sem hífen nas pontas. */
export const slugify = (s: string): string => fold(s).replace(/^-+|-+$/g, '')

/**
 * Forma para o campo ENQUANTO se digita: igual à final, mas mantém o hífen do fim — senão digitar
 * "botton " (espaço) apagaria o hífen na hora e a pessoa nunca conseguiria escrever a segunda palavra.
 */
export const slugifyTyping = (s: string): string => fold(s).replace(/^-+/, '')

/**
 * Primeiro slug livre a partir de `slug`: ele mesmo, depois `-2`, `-3`… `isTaken` responde pelo banco.
 */
export const firstFreeSlug = async (
  slug: string,
  isTaken: (candidate: string) => Promise<boolean>,
  maxAttempts = 50,
): Promise<string> => {
  if (!(await isTaken(slug))) return slug
  const base = slug.replace(/-\d+$/, '')
  for (let n = 2; n < 2 + maxAttempts; n++) {
    const candidate = `${base}-${n}`
    if (!(await isTaken(candidate))) return candidate
  }
  return `${base}-${Date.now()}`
}
