// Feature `83` · `LAV-07`, `LAV-51`..`LAV-53`, `LAV-67` — a seção Acessos da Loja ao vivo, pura.
//
// **Nenhum número, faixa, "agora" ou "hoje" é decidido aqui** (`LAV-61`). O banco devolve os totais
// (`periodos`), as faixas de 3 h com `null` nas futuras e nas anteriores à contagem, a faixa em
// andamento, os dias da semana e a comparação já com `null` onde ela não vale (`AD-066`). Este
// arquivo só ESCREVE: conversão, variação, frases e as colunas do gráfico. O dia da semana sai de
// aritmética sobre o TEXTO do dia (`isoWeekday`), e "hoje" é o dia igual ao `hoje` do servidor.
//
// O número de Visitas é de NAVEGADORES, nunca de "pessoas" (`VIS-41`).
//
// Só o que a Fase 1 usa (PRD §6.3): presença, funil, origem e aparelho vêm nas fases seguintes.

import { formatCount, isoWeekday, weekdayShort } from '../stats/labels.ts'
import type { MovementPeriodKey, StoreAccessComparison, StoreMovement } from '../stats/movement.ts'

/**
 * Os rótulos das 8 faixas de 3 horas. Cópia DELIBERADA da largura do SQL (`first_hour / 3`,
 * `generate_series(0, 7)`): `visitasPorHoraSchema.test.ts` lê a migration vigente e compara.
 */
export const ACCESS_BAND_LABELS = ['0h', '3h', '6h', '9h', '12h', '15h', '18h', '21h'] as const

export const ACCESS_TITLE = 'Acessos'
export const CONSENT_NOTE = 'Conta só quem aceitou cookies de estatística.'
export const BAND_NOTE = 'Faixas de 3 horas, pela hora da primeira visita.'
export const WEEK_NOTE = 'Desde segunda-feira.'
/** Resposta sem `acessos` (o banco antigo): uma frase ESTÁTICA, sem botão (`LAV-55`). */
export const CHART_UNAVAILABLE = 'O gráfico por horário ainda não está disponível.'

/** vendas ÷ visitas × 100; `null` com visitas ≤ 0. Sem arredondar — quem escreve é `formatConversion`. */
export const conversion = (vendas: number, visitas: number): number | null =>
  visitas > 0 ? (vendas / visitas) * 100 : null

const UMA_CASA = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** `null` ⇒ `'—'`; senão uma casa pt-BR: `2.1127 ⇒ '2,1%'`, `0 ⇒ '0,0%'`, `150 ⇒ '150,0%'`. */
export const formatConversion = (c: number | null): string => (c === null ? '—' : `${UMA_CASA.format(c)}%`)

/**
 * `(atual − anterior) ÷ anterior × 100`, arredondado com a metade PARA LONGE DO ZERO
 * (`+12,5 ⇒ +13`, `−12,5 ⇒ −13`; `Math.round(-12.5)` daria `−12`). `null` se algum lado é `null` ou o
 * anterior é ≤ 0 — não há percentual de zero.
 */
export const accessDelta = (atual: number | null, anterior: number | null): number | null => {
  if (atual === null || anterior === null || anterior <= 0) return null
  const x = ((atual - anterior) / anterior) * 100
  return Math.sign(x) * Math.round(Math.abs(x)) || 0
}

/** Quem é o "anterior": Hoje ⇒ `ontem até as {h}h` · Ontem ⇒ `anteontem` · Semana ⇒ `null`. */
export const comparisonLabel = (m: StoreMovement, periodo: MovementPeriodKey): string | null => {
  if (!m.acessos) return null
  if (periodo === 'hoje') return `ontem até as ${m.acessos.comparacao.hoje.ate_hora}h`
  if (periodo === 'ontem') return 'anteontem'
  return null
}

export type DeltaTone = 'alta' | 'neutra'

/** `+12% vs …` (alta) · `−5% vs …` (U+2212, neutra) · `0% vs …` (neutra). Nunca vermelho. */
export const deltaLine = (p: number, contra: string): { texto: string; tom: DeltaTone } => {
  if (p > 0) return { texto: `+${p}% vs ${contra}`, tom: 'alta' }
  if (p < 0) return { texto: `−${Math.abs(p)}% vs ${contra}`, tom: 'neutra' }
  return { texto: `0% vs ${contra}`, tom: 'neutra' }
}

export interface AccessCard {
  rotulo: 'Visitas' | 'Vendas' | 'Conversão'
  valor: string
  variacao: { texto: string; tom: DeltaTone } | null
}

/** O par comparado de um período: o lado atual e o anterior. `null` em Semana ou sem `acessos`. */
const parComparado = (
  m: StoreMovement,
  periodo: MovementPeriodKey,
): { atual: StoreAccessComparison; anterior: StoreAccessComparison } | null => {
  const a = m.acessos
  if (!a) return null
  // Hoje: horas completas dos DOIS lados — o número grande é o total, a variação é `base_hoje`.
  if (periodo === 'hoje') return { atual: a.comparacao.hoje.base_hoje, anterior: a.comparacao.hoje }
  if (periodo === 'ontem') {
    const p = m.periodos.ontem
    return { atual: { visitas: p.visitas, vendas: p.vendas }, anterior: a.comparacao.ontem }
  }
  return null
}

const conversaoDe = (par: StoreAccessComparison): number | null =>
  par.visitas === null || par.vendas === null ? null : conversion(par.vendas, par.visitas)

/** Os três cartões de um período, na ordem: Visitas, Vendas, Conversão. */
export const accessCards = (m: StoreMovement, periodo: MovementPeriodKey): AccessCard[] => {
  const p = m.periodos[periodo]
  const par = parComparado(m, periodo)
  const contra = comparisonLabel(m, periodo)
  const linha = (d: number | null) => (d === null || contra === null ? null : deltaLine(d, contra))
  const conv = conversion(p.vendas, p.visitas)
  return [
    { rotulo: 'Visitas', valor: formatCount(p.visitas), variacao: par ? linha(accessDelta(par.atual.visitas, par.anterior.visitas)) : null },
    { rotulo: 'Vendas', valor: formatCount(p.vendas), variacao: par ? linha(accessDelta(par.atual.vendas, par.anterior.vendas)) : null },
    {
      rotulo: 'Conversão',
      valor: formatConversion(conv),
      variacao: par && conv !== null ? linha(accessDelta(conversaoDe(par.atual), conversaoDe(par.anterior))) : null,
    },
  ]
}

export type AccessHighlight = 'atual' | 'passada' | 'futura' | 'sem_contagem'

export interface AccessColumn {
  rotulo: string
  valor: number | null
  destaque: AccessHighlight
}

export interface AccessChart {
  titulo: 'Visitas por horário' | 'Visitas por dia'
  colunas: AccessColumn[]
  nota: string
  semHora: string | null
}

/** `'{n} visitas deste dia foram contadas antes da contagem por horário.'` · singular com 1 · `null` com 0. */
export const noHourNote = (n: number): string | null => {
  if (n <= 0) return null
  if (n === 1) return '1 visita deste dia foi contada antes da contagem por horário.'
  return `${formatCount(n)} visitas deste dia foram contadas antes da contagem por horário.`
}

/**
 * O gráfico do período; `null` sem `acessos` (o app desenha `CHART_UNAVAILABLE`).
 *
 * Hoje: a faixa `faixa_atual` é `'atual'`; um `null` DEPOIS dela é `'futura'`, ANTES dela é
 * `'sem_contagem'` (a faixa terminou antes de a contagem começar — nunca `0`). Ontem: `null` é
 * `'sem_contagem'`, o resto `'passada'`. Semana: uma coluna por dia; o dia igual a `m.hoje` é
 * `'atual'`, com o rótulo `'hoje'`.
 */
export const accessChart = (m: StoreMovement, periodo: MovementPeriodKey): AccessChart | null => {
  const a = m.acessos
  if (!a) return null
  if (periodo === 'semana') {
    return {
      titulo: 'Visitas por dia',
      colunas: a.semana.por_dia.map(({ dia, visitas }) =>
        dia === m.hoje
          ? { rotulo: 'hoje', valor: visitas, destaque: 'atual' as const }
          : { rotulo: weekdayShort(isoWeekday(dia)), valor: visitas, destaque: 'passada' as const },
      ),
      nota: WEEK_NOTE,
      semHora: null,
    }
  }
  const dia = a[periodo]
  const colunas = ACCESS_BAND_LABELS.map((rotulo, i): AccessColumn => {
    const valor = dia.por_faixa[i] ?? null
    if (periodo === 'hoje') {
      if (i === a.faixa_atual) return { rotulo, valor, destaque: 'atual' }
      if (valor === null) return { rotulo, valor, destaque: i > a.faixa_atual ? 'futura' : 'sem_contagem' }
      return { rotulo, valor, destaque: 'passada' }
    }
    return { rotulo, valor, destaque: valor === null ? 'sem_contagem' : 'passada' }
  })
  return { titulo: 'Visitas por horário', colunas, nota: BAND_NOTE, semHora: noHourNote(dia.sem_hora) }
}

/**
 * A linha de frescor do cabeçalho, pela DURAÇÃO desde a chegada da resposta (nunca contra o relógio
 * de parede do aparelho): `< 2 s` ⇒ `Atualizado agora` · `< 60 s` ⇒ `Atualizado há {s} s` · senão
 * `Atualizado há {m} min`.
 */
export const freshnessLine = (segundos: number): string => {
  if (segundos < 2) return 'Atualizado agora'
  if (segundos < 60) return `Atualizado há ${Math.floor(segundos)} s`
  return `Atualizado há ${Math.floor(segundos / 60)} min`
}
