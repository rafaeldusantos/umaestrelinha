// Como se pede uma imagem — o dono único da URL de rendição e da prioridade de carregamento.
//
// ────────────────────────────────────────────────────────────────────────────────────────────
// ESTE ARQUIVO NÃO TEM NENHUM `import`, E ISSO NÃO É ESTILO.
//
// O vizinho `./index.ts` faz `import type { ProductImage } from '@estrelinha/supabase/types'`.
// Isso é inofensivo no Vite e **fatal no Deno**: medido na feature `33`, o Deno resolve o grafo de
// TIPOS também, e um `import type` de pacote com alias derruba o worker com `Failed resolving
// types` **antes da primeira linha rodar**. A edge function `product-page` precisa desta mesma
// função para montar o `<link rel="preload">` (`PRF-06`), e a alcança por caminho relativo
// (`../../../packages/core/src/media/rendition.ts`) — nunca pelo barrel.
//
// Import novo aqui — inclusive `import type` — quebra a edge function sem quebrar nada mais:
// build, `tsc` e teste de componente continuam verdes. `rendition.test.ts` lê este arquivo do
// disco e reprova qualquer linha de import.
// ────────────────────────────────────────────────────────────────────────────────────────────
//
// O módulo existe porque a mesma pergunta — "qual URL desta foto no tamanho desta vaga?" — é feita
// por oito superfícies da loja, pela edge function do produto e pelo `preload` do `<head>`. Escrita
// oito vezes, ela é o "defeito 01" do projeto aplicado a bytes: a nona superfície nasce pedindo o
// original de 1024px numa vaga de 170px, e nada acusa — a foto aparece, só demora.

/**
 * As três larguras do `srcset`. Uma escrita só, lida pelo `srcset`, pelo `preload` e pelo guarda.
 *
 * Medida da vaga real: o card no celular mede 171px (390 de viewport − 32 do `container` ÷ 2
 * colunas − 16 do `gap`), o que pede 342px em DPR 2 e 513px em DPR 3. 720 cobre o card do desktop
 * e o palco da galeria no celular.
 */
export const RENDITION_WIDTHS = [360, 480, 720] as const

/**
 * Qualidade da rendição. O padrão do Supabase é 80.
 *
 * Medido em 2026-09-05 numa foto do catálogo: 75 entrega 12,7 KB a 360px contra 113,9 KB do
 * original, sem diferença perceptível em joia sobre fundo claro.
 */
export const RENDITION_QUALITY = 75

/** Limites do `render/image` do Supabase. Fora deles a resposta é **erro**, não foto. */
export const RENDITION_MIN_WIDTH = 1
export const RENDITION_MAX_WIDTH = 2500

/**
 * Um ano, em segundos — o `cacheControl` de toda imagem que vai para o Storage.
 *
 * O literal `'3600'` está hoje escrito duas vezes, em dois workspaces (o importador e o uploader do
 * painel). Este é o fim disso: uma hora de cache faz cada revisita repetir o download **e** repetir
 * a transformação, que é o que paga a conta do `render/image`.
 */
export const STORAGE_CACHE_CONTROL = '31536000'

/**
 * O `sizes` do palco da galeria do produto.
 *
 * Mora aqui, e não dentro de `ProductGallery`, porque a partir da `PRF-06` ele tem **dois**
 * leitores: a galeria e o `<link rel="preload" as="image">` que a edge function `product-page`
 * injeta no `<head>`. O navegador escolhe o candidato do `srcset` pelo `sizes` — com os dois
 * divergindo, ele escolhe uma largura no preload e OUTRA na galeria, e **baixa as duas fotos**.
 * Fica pior do que sem preload nenhum, e nada acusa: a página funciona, só pesa o dobro.
 */
export const GALLERY_STAGE_SIZES = '(min-width: 768px) 50vw, 100vw'

/**
 * Quantos itens da primeira leva nascem ansiosos.
 *
 * Seis cobre três linhas de duas colunas em 390px — a primeira dobra da categoria no celular.
 */
export const EAGER_IMAGE_COUNT = 6

/** O segmento que identifica um objeto público do Storage, e o que serve a rendição dele. */
const OBJECT_SEGMENT = '/storage/v1/object/public/'
const RENDER_SEGMENT = '/storage/v1/render/image/public/'

/** O caminho sem a query — é nele, e não na query, que o segmento do Storage precisa aparecer. */
const semQuery = (url: string): string => {
  const corte = url.indexOf('?')
  return corte < 0 ? url : url.slice(0, corte)
}

/**
 * Só objeto público do Storage **deste** projeto vira rendição.
 *
 * Banner de campanha em host de terceiro, ativo local de `/assets` e string vazia (produto sem
 * foto) saem por aqui: reescrever a URL de outro host seria inventar um endpoint que não existe.
 */
const transformavel = (url: string): boolean =>
  typeof url === 'string' && semQuery(url).indexOf(OBJECT_SEGMENT) >= 0

/** Fora de `1..2500` o Supabase responde erro. Grampear devolve foto onde devolveria falha. */
const grampear = (width: number): number => {
  const inteiro = Math.round(width)
  // `NaN` primeiro: ele reprova nas DUAS comparações abaixo, e sem este ramo sairia `width=NaN`.
  if (Number.isNaN(inteiro)) return RENDITION_MIN_WIDTH
  if (inteiro < RENDITION_MIN_WIDTH) return RENDITION_MIN_WIDTH
  return inteiro > RENDITION_MAX_WIDTH ? RENDITION_MAX_WIDTH : inteiro
}

/**
 * A URL da rendição de `url` na largura pedida.
 *
 * Entrada que não é objeto público do Storage volta **INALTERADA**, e nunca lança — é o que faz o
 * `<img>` de um banner externo continuar carregando como hoje, sem caminho especial na tela.
 */
export const renditionUrl = (url: string, width: number): string => {
  if (!transformavel(url)) return url

  const corte = url.indexOf('?')
  const caminho = corte < 0 ? url : url.slice(0, corte)
  const cauda = corte < 0 ? '' : url.slice(corte + 1)

  // `replace` com padrão de string troca só a PRIMEIRA ocorrência — que é a que interessa.
  const render = caminho.replace(OBJECT_SEGMENT, RENDER_SEGMENT)
  const params = 'width=' + grampear(width) + '&quality=' + RENDITION_QUALITY

  return cauda === '' ? render + '?' + params : render + '?' + cauda + '&' + params
}

/**
 * O `srcset` das três larguras: `"…360w, …480w, …720w"`.
 *
 * `''` para entrada não transformável — e string vazia é o que faz a superfície omitir o atributo
 * inteiro (`srcSet={x || undefined}`), em vez de emitir um `srcset` que o navegador não usaria.
 */
export const renditionSrcSet = (
  url: string,
  widths: readonly number[] = RENDITION_WIDTHS,
): string => {
  if (!transformavel(url)) return ''
  return widths.map((w) => renditionUrl(url, w) + ' ' + grampear(w) + 'w').join(', ')
}

/**
 * A prioridade de carregamento de uma imagem pela posição dela na listagem.
 *
 * `animateIn` é o terceiro campo porque o LCP não morria só de `loading="lazy"`: três mecanismos
 * empilhados escondiam a foto do medidor — o `lazy`, o `initial={{ opacity: 0 }}` do Framer e o
 * `opacity-0` que espera o `onLoad`. **Enquanto a imagem está invisível o navegador não a conta**,
 * e o relógio corre.
 */
export interface ImagePriority {
  loading: 'eager' | 'lazy'
  /** Só o primeiro. Mais de um `high` dilui a dica, e o navegador passa a ignorar todas. */
  fetchPriority?: 'high'
  /** `false` nos primeiros: nem o Framer nem o `opacity-0` podem escondê-los do medidor. */
  animateIn: boolean
}

/**
 * Uma função, e não a comparação `index < 6` repetida em cada superfície (`PRF-03` AC 4).
 *
 * A régua escrita em seis vitrines é o "defeito 01" outra vez: a sétima nasce sem ela, e nada
 * acusa — a página fica lenta, não quebrada.
 *
 * Índice ausente (superfície que não é listagem) cai no ramo `lazy`, que é o padrão seguro:
 * `undefined < 6` é `false`, e o comportamento passa a ser o de hoje.
 */
export const imagePriority = (index: number): ImagePriority => {
  if (!(index >= 0 && index < EAGER_IMAGE_COUNT)) return { loading: 'lazy', animateIn: true }
  if (index === 0) return { loading: 'eager', fetchPriority: 'high', animateIn: false }
  return { loading: 'eager', animateIn: false }
}
