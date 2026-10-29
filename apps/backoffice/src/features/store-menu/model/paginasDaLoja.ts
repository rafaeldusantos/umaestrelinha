// Feature 86, T14 — as páginas da loja que o seletor do menu oferece (`MNM-11`).
//
// **A lista não é escrita aqui.** Os caminhos vêm de `SITEMAP_STATIC_PATHS` — as rotas fixas e
// públicas que a loja declara — e o título de cada uma vem de `staticPageMeta`, o dono do `<head>`
// das rotas fixas (`AD-048`). Uma lista própria aqui seria o segundo dono de "quais páginas a loja
// tem": no dia em que uma página nova entrasse no sitemap, o menu não a ofereceria, e no dia em que
// uma saísse, o menu ofereceria uma 404.
//
// **A Home (`/`) fica de fora**: no menu ela já é a marca, no canto da barra, e um item "Início" ao
// lado dela levaria ao mesmo lugar. Quem quiser mesmo assim digita `/` em "Outro endereço da loja".
//
// O NOME SUGERIDO é outra pergunta que o título da aba: o `<title>` da política de trocas tem 47
// caracteres ("Política de Trocas, Devoluções e Arrependimento") e o nome do item tem teto de 40
// (`MENU_LABEL_MAX`). O nome curto é vocabulário de MENU — por isso mora aqui, e só para as rotas
// conhecidas. Página nova sem nome curto cai no título sem a marca, e o campo é editável.

import { SITEMAP_STATIC_PATHS, FAQ_PATH, JEWELRY_CARE_PATH, MATERIAL_GUIDE_PATH, PRIVACY_POLICY_PATH, RETURNS_POLICY_PATH } from '@estrelinha/core/routes'
import { STORE_BRAND, staticPageMeta } from '@estrelinha/core/seo'

export interface PaginaDaLoja {
  path: string
  /** O título da página, sem a marca — o que a linha do seletor mostra. */
  titulo: string
  /** O nome que o item nasce tendo no menu (editável, até 40). */
  nomeSugerido: string
}

const NOME_CURTO: Readonly<Record<string, string>> = {
  '/sobre': 'Sobre',
  [RETURNS_POLICY_PATH]: 'Trocas e devoluções',
  [PRIVACY_POLICY_PATH]: 'Privacidade',
  [JEWELRY_CARE_PATH]: 'Cuidados com a joia',
  [MATERIAL_GUIDE_PATH]: 'Como enviar o material',
  [FAQ_PATH]: 'Perguntas frequentes',
}

const semMarca = (titulo: string): string => {
  const sufixo = ` | ${STORE_BRAND}`
  return titulo.endsWith(sufixo) ? titulo.slice(0, -sufixo.length) : titulo
}

export const PAGINAS_DA_LOJA: readonly PaginaDaLoja[] = SITEMAP_STATIC_PATHS.filter(
  path => path !== '/',
).map(path => {
  const titulo = semMarca(staticPageMeta(path).title)
  return { path, titulo, nomeSugerido: NOME_CURTO[path] ?? titulo }
})
