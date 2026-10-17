/**
 * O metadado de cada página da loja — feature 62.
 *
 * **Um dono, dois consumidores**: o hook `usePageMeta` da loja (o `<head>` atualizado na navegação)
 * e a edge function `product-page` (o `<head>` servido para quem não executa JavaScript). Escritas
 * em dois lugares, o título que o WhatsApp mostra e o que a aba mostra divergiriam sem nada quebrar
 * — o "defeito 01".
 *
 * Imports por arquivo e com `.ts`: a edge function chega aqui por caminho relativo (Deno).
 */
import {
  FAQ_PATH,
  JEWELRY_CARE_PATH,
  MATERIAL_GUIDE_PATH,
  NON_INDEXABLE_PATHS,
  PRIVACY_POLICY_PATH,
  RETURNS_POLICY_PATH,
} from '../routes/routes.ts'
import { STORE_BRAND, brandedTitle } from './brand.ts'
import { descriptionFromHtml, summarize } from './text.ts'

export interface PageMeta {
  /** O `<title>` inteiro, já com a marca quando cabe (A2). */
  title: string
  description: string
  /** `false` ⇒ `<meta name="robots" content="noindex">` (A8). */
  indexable: boolean
}

/**
 * O piso da descrição da loja. É o que vale quando `store_settings.seo.description` está vazio, e o
 * que a Home mostra antes de a configuração existir. O valor que a dona edita continua no painel —
 * este é o chão, não um segundo dono do campo.
 */
export const STORE_DESCRIPTION_FLOOR =
  'Joias feitas à mão em resina com o material que você envia: cinzas, leite materno, dente de ' +
  'leite e mecha de cabelo. Feitas por Adri Muniz, em Porto Alegre.'

interface Fixa {
  /** Sem a marca — `brandedTitle` a acrescenta. */
  titulo: string
  descricao: string
}

/**
 * As rotas de caminho fixo, uma entrada cada.
 *
 * As chaves são EXATAMENTE `SITEMAP_STATIC_PATHS` ∪ `NON_INDEXABLE_PATHS` — `pages.test.ts` confere
 * nos dois sentidos. A indexabilidade **não** é declarada aqui: ela é derivada de
 * `NON_INDEXABLE_PATHS`, que já é o dono dessa classificação (com o motivo escrito).
 *
 * A Home (`/`) tem título e descrição da configuração (`homePageMeta`); a entrada daqui é o piso.
 */
const FIXAS: Readonly<Record<string, Fixa>> = {
  '/': {
    titulo: `${STORE_BRAND} - Joias afetivas artesanais em resina`,
    descricao: STORE_DESCRIPTION_FLOOR,
  },
  '/sobre': {
    titulo: `Sobre a ${STORE_BRAND}`,
    descricao:
      'A história da Uma Estrelinha: joias afetivas feitas à mão em resina por Adri Muniz, em ' +
      'Porto Alegre, com o material que você envia.',
  },
  [RETURNS_POLICY_PATH]: {
    titulo: 'Política de Trocas, Devoluções e Arrependimento',
    descricao:
      'Como funcionam trocas, devoluções e o direito de arrependimento nas joias afetivas e ' +
      'personalizadas da Uma Estrelinha.',
  },
  [PRIVACY_POLICY_PATH]: {
    titulo: 'Política de Privacidade',
    descricao:
      'Quais dados a Uma Estrelinha guarda, para que são usados e com quem são compartilhados — ' +
      'inclusive o material afetivo que você envia.',
  },
  [JEWELRY_CARE_PATH]: {
    titulo: 'Cuidados com sua joia afetiva',
    descricao:
      'Como limpar, guardar e conservar sua joia de resina, de prata 925 ou banhada a ouro para ' +
      'que ela dure muitos anos.',
  },
  [FAQ_PATH]: {
    titulo: 'Perguntas frequentes',
    descricao:
      'As dúvidas que mais chegam até a Uma Estrelinha — do material que você envia até os ' +
      'cuidados com a peça pronta.',
  },
  [MATERIAL_GUIDE_PATH]: {
    titulo: 'Como enviar seu material com segurança',
    descricao:
      'Passo a passo para preparar e enviar cinzas, leite materno, cabelo, dente de leite ou coto ' +
      'umbilical para virar uma joia afetiva.',
  },
  '/carrinho': { titulo: 'Sua sacola', descricao: 'Os itens da sua sacola na Uma Estrelinha.' },
  '/checkout': { titulo: 'Finalizar compra', descricao: 'Finalize sua compra na Uma Estrelinha.' },
  '/pedido/:id': { titulo: 'Seu pedido', descricao: 'Acompanhe o seu pedido na Uma Estrelinha.' },
  '/pedido/:id/pagamento': {
    titulo: 'Pagamento do pedido',
    descricao: 'Pague o seu pedido na Uma Estrelinha.',
  },
  '/conta': { titulo: 'Minha conta', descricao: 'Seus pedidos na Uma Estrelinha.' },
  '/conta/dados': { titulo: 'Meus dados', descricao: 'Seus dados de cadastro na Uma Estrelinha.' },
  '/favoritos': { titulo: 'Meus favoritos', descricao: 'As joias que você guardou para ver depois.' },
  '/entrar': { titulo: 'Entrar', descricao: 'Acesse sua conta na Uma Estrelinha.' },
  '/busca': { titulo: 'Busca', descricao: 'Busque joias afetivas na Uma Estrelinha.' },
}

/** As chaves da tabela — lidas pelo guarda bidirecional, nunca para decidir nada em runtime. */
export const STATIC_PAGE_META_PATHS: readonly string[] = Object.keys(FIXAS)

const indexavel = (path: string): boolean => !NON_INDEXABLE_PATHS.some(r => r.path === path)

/**
 * O metadado de uma rota fixa, pela chave **do `App.tsx`** (`/pedido/:id`, não `/pedido/abc`).
 *
 * Caminho desconhecido LANÇA: quem chama passa uma constante de rota, e um erro de digitação que
 * caísse em silêncio num título genérico seria exatamente o defeito que esta feature remove.
 */
export const staticPageMeta = (path: string): PageMeta => {
  const fixa = FIXAS[path]
  if (!fixa) throw new Error(`staticPageMeta: rota sem metadado declarado: ${path}`)
  return { title: brandedTitle(fixa.titulo), description: fixa.descricao, indexable: indexavel(path) }
}

/** O que a configuração da loja diz (`store_settings.seo`). Ausente ou vazio cai no piso. */
export interface StoreSeoInput {
  title?: string | null
  description?: string | null
}

const texto = (valor: string | null | undefined): string =>
  String(valor ?? '').replace(/\s+/g, ' ').trim()

/** A Home lê os campos que a dona edita no painel (A6), com o piso de `FIXAS['/']`. */
export const homePageMeta = (seo?: StoreSeoInput | null): PageMeta => {
  const piso = staticPageMeta('/')
  return {
    title: texto(seo?.title) || piso.title,
    description: texto(seo?.description) || piso.description,
    indexable: true,
  }
}

export interface ProductMetaInput {
  name: string
  description?: string | null
  seo_title?: string | null
  seo_description?: string | null
}

/**
 * O metadado de um produto (`MTA-02`, `MTA-03`).
 *
 * Título: `seo_title` → `name`, com a marca quando cabe. Descrição: `seo_description` **íntegra**
 * (A5) → a descrição do produto sem o bloco de FAQ, como texto, em até 160 (A4) → a descrição da loja
 * → o piso. Nunca string vazia.
 */
export const productPageMeta = (
  product: ProductMetaInput,
  storeDescription?: string | null,
): PageMeta => ({
  title: brandedTitle(texto(product.seo_title) || product.name),
  description:
    texto(product.seo_description) ||
    descriptionFromHtml(product.description) ||
    texto(storeDescription) ||
    STORE_DESCRIPTION_FLOOR,
  indexable: true,
})

export interface CategoryMetaInput {
  name: string
  description?: string | null
}

/**
 * O metadado de uma categoria (`MTA-04`, A7). Sem coluna de SEO curado (Out of Scope da `36`): a
 * descrição é a da categoria, como texto — vazia em 35 de 35 hoje — ou uma frase derivada do nome.
 */
export const categoryPageMeta = (category: CategoryMetaInput): PageMeta => {
  const nome = texto(category.name)
  return {
    title: brandedTitle(nome),
    description:
      descriptionFromHtml(category.description) ||
      summarize(`${nome}: joias afetivas feitas à mão em resina por Adri Muniz, em Porto Alegre.`),
    indexable: true,
  }
}

/** A 404 da loja (`MTA-05`): título próprio, `noindex`. */
export const notFoundPageMeta = (): PageMeta => ({
  title: brandedTitle('Página não encontrada'),
  description: 'A página que você procurou não existe na Uma Estrelinha.',
  indexable: false,
})

/** A busca: o termo no título quando há termo, sempre `noindex` (`NON_INDEXABLE_PATHS`). */
export interface FaqQuestionMetaInput {
  question: string
  /** A resposta em TEXTO — `faqAnswerPlainText`, a mesma que o JSON-LD declara. */
  answerText: string
}

/**
 * Uma pergunta da página de perguntas frequentes, no endereço próprio dela.
 *
 * O título é a pergunta — é o que a pessoa digitou no buscador — e a descrição é o começo da
 * resposta, que é o que o resultado da busca e o card do WhatsApp mostram embaixo.
 */
export const faqQuestionPageMeta = (item: FaqQuestionMetaInput): PageMeta => {
  const pergunta = texto(item.question)
  return {
    title: brandedTitle(pergunta),
    description: summarize(item.answerText) || staticPageMeta(FAQ_PATH).description,
    indexable: true,
  }
}

export const searchPageMeta = (termo?: string | null): PageMeta => {
  const base = staticPageMeta('/busca')
  const limpo = texto(termo)
  return limpo === '' ? base : { ...base, title: brandedTitle(`Busca: ${limpo}`) }
}
