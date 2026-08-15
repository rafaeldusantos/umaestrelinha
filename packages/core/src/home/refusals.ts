import { INFRA_SLUGS, ROUTE_SLUGS } from '../routes'
import { sectionMeta } from './catalog'
import type { HomeSection, HomeSectionConfig, HomeSectionItem, HomeSectionType } from './types'

/**
 * As recusas da Home.
 *
 * **Todas devolvem `string | null`, e não `{ ok, reason }`** — por um motivo do repositório, não de
 * gosto: `tsconfig.base.json` tem `strictNullChecks: false`, e nesse modo união discriminada por
 * literal booleano **não estreita**. Ler `verdict.reason` no ramo do `else` é TS2339. O formato atual
 * não tem ramo para esquecer: ou há motivo, ou não há. Mesmo formato de `menuSlotRefusal` e de
 * `reservedSlugRefusal`.
 *
 * Campo em branco devolve `null` em toda função daqui. Obrigatoriedade é cobrança do formulário —
 * devolver motivo faria a tela acusar "endereço inválido" para quem ainda não digitou nada.
 */

const vazio = (valor: string | null | undefined): boolean => (valor ?? '').trim() === ''

/**
 * O `alt` de uma imagem, quando há imagem.
 *
 * Uma regra, dois pontos de entrada (o item de banner e o `config` do hero): duplicá-la faria a mesma
 * cobrança divergir entre as duas telas no primeiro ajuste.
 *
 * **Só espaço em branco conta como vazio.** Um `alt` com um espaço passa em `required` do HTML e não
 * descreve nada — numa loja em que a peça é a homenagem de alguém, imagem sem descrição é a página
 * muda no leitor de tela.
 */
const altRefusal = (imageUrl: string | null | undefined, alt: string | null | undefined): string | null => {
  if (vazio(imageUrl)) return null
  if (vazio(alt)) return 'Descreva a imagem: quem usa leitor de tela só tem essa descrição.'
  return null
}

/**
 * Por que este tipo não pode ser acrescentado — ou `null` quando pode.
 *
 * Par do índice único parcial da migration. O painel usa isto para mostrar o bloco **esmaecido,
 * dizendo que já está**, o que responde a pergunta antes de a dona clicar e ser recusada.
 */
export const uniqueTypeRefusal = (
  type: HomeSectionType,
  sections: readonly HomeSection[],
): string | null => {
  const meta = sectionMeta(type)
  if (!meta || !meta.unique) return null
  if (!sections.some(s => s.type === type)) return null
  return `“${meta.label}” já está na Home. Este bloco só pode existir uma vez.`
}

/**
 * Por que este item não pode ser salvo — ou `null` quando pode.
 *
 * **É a única camada onde "ainda não escolhi" e "perdi o que tinha" se distinguem.** No banco os dois
 * são a mesma linha com zero destinos: o CHECK é `num_nonnulls(...) <= 1` e não `= 1`, porque o
 * próprio `on delete set null` produz o estado de zero — um CHECK de igualdade faria a **exclusão da
 * categoria falhar**. Quem sabe que houve um destino é o `label_snapshot`, congelado no momento da
 * escolha justamente para o painel poder **nomear** o que se perdeu (`HOME-24`).
 *
 * Não exige imagem: o item de destaque em coleção não carrega arte própria. Campo obrigatório de
 * cada editor é do editor.
 */
export const destinationRefusal = (item: Partial<HomeSectionItem>): string | null => {
  const destinos = [item.category_id, item.product_id, vazio(item.href) ? null : item.href].filter(
    d => d !== null && d !== undefined,
  )

  if (destinos.length > 1) {
    return 'Escolha um destino só: uma coleção, um produto ou um caminho da loja.'
  }

  if (destinos.length === 0) {
    if (!vazio(item.label_snapshot)) {
      return `O destino deste item (${item.label_snapshot.trim()}) foi apagado. Escolha outro para ele voltar a aparecer.`
    }
    return 'Escolha o destino: uma coleção, um produto ou um caminho da loja.'
  }

  return altRefusal(item.image_url, item.alt)
}

/**
 * Por que este endereço não serve como destino — ou `null` quando serve.
 *
 * A fonte é `@estrelinha/core/routes`, a mesma da feature 23. E o que ela permite conter aqui é
 * específico: com a categoria servida na **raiz do domínio** (`AD-018`), quase todo caminho de um
 * segmento é potencialmente uma coleção, então a régua **não** pode ser "o primeiro segmento está em
 * `ROUTE_SLUGS`" — isso recusaria `/leite-materno`. O que se recusa é o que a loja comprovadamente
 * **não** serve:
 *
 * - endereço que não começa com `/`: a loja só aponta para dentro dela (`HOME-23`), e `http://…`,
 *   `mailto:` ou `busca` sem barra levariam a fora ou a lugar nenhum;
 * - `INFRA_SLUGS` (`assets`, `api`, `_vercel`): não passam pelo React Router — seriam servidos como
 *   arquivo, ou pela plataforma, e a página nunca montaria;
 * - três segmentos ou mais sob um primeiro segmento que não é rota: a canônica de categoria tem no
 *   **máximo dois** (`AD-018`), então `/a/b/c` só existiria se `a` fosse uma rota com sub-rota.
 */
export const ctaHrefRefusal = (href: string): string | null => {
  const valor = (href ?? '').trim()
  if (valor === '') return null

  if (!valor.startsWith('/')) {
    return 'O endereço precisa começar com “/”: a loja só aponta para páginas dela.'
  }
  if (/\s/.test(valor)) return 'O endereço não pode ter espaço.'

  const segmentos = valor.split('?')[0].split('#')[0].split('/').filter(Boolean)
  if (segmentos.length === 0) return null

  const primeiro = segmentos[0].toLowerCase()

  if (INFRA_SLUGS.includes(primeiro)) {
    return `“/${primeiro}” é reservado da infraestrutura e não chega à loja. Escolha outro endereço.`
  }

  if (segmentos.length > 2 && !ROUTE_SLUGS.includes(primeiro)) {
    return 'Este endereço não existe na loja: coleção tem no máximo dois níveis.'
  }

  return null
}

/**
 * Por que este `config` não pode ser salvo — ou `null` quando pode.
 *
 * Hoje cobre o limite fora da faixa do tipo (`HOME-42`) e o `alt` do hero (`HOME-18`). Tipo sem faixa
 * declarada não tem o que recusar: a faixa nasce junto com a tela que a cobra.
 */
export const configRefusal = (
  type: HomeSectionType,
  config: HomeSectionConfig,
): string | null => {
  const meta = sectionMeta(type)
  if (!meta) return null

  const cfg = config ?? {}

  if (meta.limit && cfg.limit !== undefined && cfg.limit !== null) {
    const { min, max } = meta.limit
    if (!Number.isInteger(cfg.limit) || cfg.limit < min || cfg.limit > max) {
      return `“${meta.label}” aceita de ${min} a ${max} itens.`
    }
  }

  return altRefusal(cfg.image_url, cfg.image_alt)
}

/** A vaga que a fileira declara — é dela que sai a medida recomendada. */
export interface SlotSpec {
  width: number
  height: number
}

/**
 * Quanto a proporção da arte diverge da vaga — **e isto nunca bloqueia**.
 *
 * É aviso e não recusa por uma razão concreta: `object-cover` numa proporção diferente **corta o
 * texto que está dentro da arte**, e a arte desta loja tem texto embutido. Recortar em silêncio é o
 * que a AC proíbe; recusar o upload seria trocar um problema por outro, já que só a dona sabe se o
 * corte importa naquela peça. Por isso a mensagem traz a medida recomendada **em pixels**, que é o
 * que ela precisa para reexportar.
 *
 * Tolerância de 2%: exigir igualdade exata acusaria uma arte de 1175 × 486 px, que é ruído de
 * exportação e não divergência de proporção.
 */
const TOLERANCIA = 0.02

const razao = (w: number, h: number): string => {
  const valor = (w / h).toFixed(2).replace('.', ',')
  return valor.endsWith(',00') ? valor.slice(0, -3) : valor
}

export const aspectRatioWarning = (
  width: number,
  height: number,
  slot: SlotSpec,
): string | null => {
  if (!(width > 0) || !(height > 0) || !slot || !(slot.width > 0) || !(slot.height > 0)) return null

  const arte = width / height
  const vaga = slot.width / slot.height
  if (Math.abs(arte - vaga) / vaga <= TOLERANCIA) return null

  return (
    `Esta arte é ${razao(width, height)}:1 e a vaga é ${razao(slot.width, slot.height)}:1 — ` +
    `o tamanho recomendado é ${slot.width} × ${slot.height} px.`
  )
}
