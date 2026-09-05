/**
 * A idade de um pedido na fila do material — `PED-13`, decisão `D1` da feature 34.
 *
 * ---------------------------------------------------------------------------------------------
 * POR QUE MORA EM `core`
 * ---------------------------------------------------------------------------------------------
 * Um segundo consumidor é previsível, não hipotético: a página "meu pedido" da loja também precisa
 * dizer à cliente há quanto tempo a peça espera. Pela consequência 1 do defeito 01 do repositório,
 * isso já basta para a regra nascer com dono único.
 *
 * **A tela nunca compara datas.** Ela lê `tier` e escolhe a cor. Trocar o corte é mexer numa
 * constante deste arquivo, e não caçar `> 7` espalhado por componente.
 *
 * ---------------------------------------------------------------------------------------------
 * TRÊS DEGRAUS, NÃO UM GRADIENTE
 * ---------------------------------------------------------------------------------------------
 * Um degradê contínuo pinta tudo de alguma cor — e aí nada é alarme. Só o terceiro degrau ganha
 * âmbar; os dois primeiros são espera normal e não pedem nada de ninguém.
 */

/**
 * O corte de "parado", em dias.
 *
 * **8, e o número tem origem**: o PAC nacional dos Correios entrega em 4 a 7 dias úteis. Abaixo
 * disso a espera é o próprio prazo do envelope, e alarmar seria ruído — a Adri olharia âmbar num
 * pedido em que ninguém fez nada de errado, e em duas semanas pararia de olhar âmbar.
 *
 * ⚠️ Marcado como **a confirmar com a Adri** na spec da feature 34. Se mudar, muda aqui e em
 * nenhum outro lugar.
 */
export const STALE_AFTER_DAYS = 8

/** O primeiro degrau termina aqui: até 3 dias inteiros, a espera é indistinguível de "chegou hoje". */
export const FRESH_UNTIL_DAYS = 3

export type QueueTier = 'fresh' | 'warm' | 'stale'

export interface QueueAge {
  /** Dias inteiros decorridos. Nunca negativo — data futura conta como 0. */
  days: number
  tier: QueueTier
}

const MS_POR_DIA = 24 * 60 * 60 * 1000

/**
 * Há quanto tempo este pedido espera, e em que degrau isso o põe.
 *
 * `since` nulo devolve `null` — **não** `{ days: 0 }`. Um pedido que nunca entrou na fila e um que
 * entrou hoje são coisas diferentes, e devolver zero para os dois faria a tela pintar "há 0 dias"
 * em pedido que não espera nada. Quem chama decide o que fazer com a ausência.
 *
 * @param now injetável para o teste não depender do relógio da máquina.
 */
export const queueAge = (
  since: string | Date | null | undefined,
  now: Date = new Date(),
): QueueAge | null => {
  if (since === null || since === undefined || since === '') return null

  const inicio = since instanceof Date ? since : new Date(since)
  if (Number.isNaN(inicio.getTime())) return null

  // `Math.floor` e não `round`: às 23h do primeiro dia ainda faz "há 0 dias", que é verdade. O
  // arredondamento faria a fila envelhecer meio dia antes do tempo, e o degrau mudaria de cor numa
  // hora que ninguém consegue explicar.
  //
  // O piso em 0 cobre relógio adiantado e data de gravação no futuro: idade negativa não existe, e
  // um `-3` cairia em `fresh` por acidente em vez de por decisão.
  const days = Math.max(0, Math.floor((now.getTime() - inicio.getTime()) / MS_POR_DIA))

  return { days, tier: tierFor(days) }
}

/** O degrau puro, para quem já tem a contagem em mãos (o CSV, que exporta `dias_parado`). */
export const tierFor = (days: number): QueueTier => {
  if (days >= STALE_AFTER_DAYS) return 'stale'
  if (days > FRESH_UNTIL_DAYS) return 'warm'
  return 'fresh'
}

/**
 * O texto do degrau, em português.
 *
 * O terceiro diz **"parado há"**, e os outros dois dizem "há". A diferença é deliberada: "parado"
 * é a palavra que transforma um número em cobrança, e ela só aparece quando há o que cobrar.
 */
export const queueAgeLabel = (age: QueueAge): string => {
  const unidade = age.days === 1 ? 'dia' : 'dias'
  return age.tier === 'stale' ? `parado há ${age.days} ${unidade}` : `há ${age.days} ${unidade}`
}
