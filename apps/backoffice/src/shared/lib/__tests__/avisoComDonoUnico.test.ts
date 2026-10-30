// Feature `88` · T24 — `AVS-17`: "este gesto manda e-mail à cliente?" tem UM dono, e ele mora em
// `core` (`customerNoticeFor`, em `@estrelinha/core/notifications`).
//
// A previsão é a mesma composição que o motor aplica: os eventos do gatilho, o público, o interruptor
// do evento, a pré-condição sobre o pedido de destino e o "já enviado". Uma tela do painel que
// respondesse por conta própria — comparando o status de destino com um literal, lendo o interruptor
// de um evento, chamando a pré-condição, ou escrevendo o nome de um evento — seria o segundo dono, e
// o diálogo passaria a perguntar quando nada sai (ou a faltar quando sai) com build, `tsc` e teste de
// componente verdes.
//
// ESCOPO: a produção de `apps/backoffice/src`, menos os testes e menos `features/notification-settings`
// — a tela de Configurações → Notificações EDITA o interruptor de cada evento, e é legítimo que ela o
// leia e o nomeie. A exclusão é por NOME, declarada aqui.
//
// O QUE A RÉGUA NÃO MEDE: a régua do status casa por LINHA — uma comparação de status cuja linha não
// fale de aviso ou e-mail passa (é como a coluna "sem código" da lista compara `shipped`, para desenhar,
// não para decidir aviso). Uma decisão de aviso espalhada em várias linhas escapa dela; as outras três
// réguas e a metade positiva cobrem o caminho que o código de hoje usa.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { NOTIFICATION_EVENTS } from '@estrelinha/core/notifications'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const FORA_DO_ESCOPO = 'features/notification-settings/'

const arquivos = (dir: string): string[] =>
  readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return nome === '__tests__' ? [] : arquivos(caminho)
    return /\.tsx?$/.test(nome) && !/\.test\.tsx?$/.test(nome) ? [caminho] : []
  })

/**
 * Comentário fora, numa varredura só (`BL-027`): linha e bloco na MESMA passada, e `[^\n\r]` fecha o
 * comentário de linha antes do `\r` — com `[^\n]`, um arquivo em CRLF engoliria a linha seguinte.
 */
const semComentarios = (texto: string): string => texto.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

const TODAS = arquivos(RAIZ).map((caminho) => ({
  caminho: caminho.slice(RAIZ.length + 1).replace(/\\/g, '/'),
  codigo: semComentarios(readFileSync(caminho, 'utf8')),
}))
const FONTES = TODAS.filter((f) => !f.caminho.startsWith(FORA_DO_ESCOPO))

const nomesDeEvento = NOTIFICATION_EVENTS.join('|')

/** As formas proibidas, cada uma com nome — a régua é escrita uma vez e chamada pela asserção e pelo sensor. */
const REGUAS: Record<string, (codigo: string) => boolean> = {
  // Um status de destino comparado a um literal NA MESMA LINHA que fala de aviso ou e-mail.
  'status comparado para decidir o aviso': (codigo) =>
    codigo
      .split(/\r?\n/)
      .some(
        (linha) =>
          /status\s*[!=]==?\s*['"](?:shipped|delivered|cancelled)['"]|['"](?:shipped|delivered|cancelled)['"]\s*[!=]==?\s*[\w.?]*status/.test(linha) &&
          /avis|notif|e-?mail|customer|cliente/i.test(linha),
      ),
  // O interruptor de um evento lido à mão: pelo resolvedor de `core` ou pelo caminho cru `events…enabled`.
  'interruptor do evento lido à mão': (codigo) =>
    /\bresolveEventSettings\s*\(/.test(codigo) || /\.events\b[^\n\r;]*\.enabled\b/.test(codigo),
  // A pré-condição do motor chamada direto — é uma das peças que `customerNoticeFor` compõe.
  'pré-condição chamada à mão': (codigo) => /\b(?:orderStateFailure|preconditionFailure)\s*\(/.test(codigo),
  // O nome de um evento escrito como literal (a lista vem de `core`, nunca daqui).
  'evento listado por nome': (codigo) => new RegExp(`['"\`](?:${nomesDeEvento})['"\`]`).test(codigo),
}

const culpados = (regra: (codigo: string) => boolean) =>
  FONTES.filter((f) => regra(f.codigo)).map((f) => f.caminho)

/** A metade positiva: os três pontos de entrada CHAMAM a previsão de `core`. */
const PONTOS_DE_ENTRADA = [
  'features/order-notice/model/useGestoComAviso.ts',
  'pages/admin/AdminOrderPage.tsx',
  'pages/admin/AdminOrdersPage.tsx',
]
const chamaAPrevisao = (codigo: string) => /\bcustomerNoticeFor\s*\(/.test(codigo)

describe('o aviso à cliente tem UM dono — AVS-17', () => {
  it('ÂNCORA: a varredura leu a produção do painel, separou o escopo e achou os três pontos', () => {
    expect(FONTES.length).toBeGreaterThan(150)
    expect(TODAS.some((f) => f.caminho.startsWith(FORA_DO_ESCOPO))).toBe(true)
    expect(FONTES.some((f) => f.caminho.startsWith(FORA_DO_ESCOPO))).toBe(false)
    expect(FONTES.some((f) => /\.test\.tsx?$/.test(f.caminho) || f.caminho.includes('__tests__/'))).toBe(false)
    for (const p of PONTOS_DE_ENTRADA) expect(FONTES.map((f) => f.caminho)).toContain(p)
    // A régua de evento tem nomes a casar: uma lista vazia montaria um regex que casa qualquer aspa.
    expect(NOTIFICATION_EVENTS.length).toBeGreaterThan(10)
  })

  it.each(Object.keys(REGUAS))('nenhum arquivo do painel: %s', (nome) => {
    expect(culpados(REGUAS[nome])).toEqual([])
  })

  it.each(PONTOS_DE_ENTRADA)('%s chama `customerNoticeFor` (em código, não em comentário)', (caminho) => {
    const fonte = FONTES.find((f) => f.caminho === caminho)!
    expect(chamaAPrevisao(fonte.codigo)).toBe(true)
  })

  it('o diálogo de cancelamento RECEBE a previsão da página, e não a calcula', () => {
    const pagina = FONTES.find((f) => f.caminho === 'pages/admin/AdminOrderPage.tsx')!
    const dialogo = FONTES.find((f) => f.caminho === 'features/order-management/ui/OrderCancelDialog.tsx')!
    expect(pagina.codigo).toMatch(/<OrderCancelDialog[\s\S]*?\baviso=\{/)
    expect(chamaAPrevisao(dialogo.codigo)).toBe(false)
  })

  describe('SENSOR — cada forma proibida reprova num texto sintético, e os inversos passam', () => {
    const sQ = String.fromCharCode(39) // aspa simples, montada para a prosa deste arquivo não carregar a forma
    const estado = ['ship', 'ped'].join('')
    const evento = NOTIFICATION_EVENTS.find((e) => e.startsWith('order_s'))!

    it('o status comparado numa linha de aviso', () => {
      const r = REGUAS['status comparado para decidir o aviso']
      expect(r(`const avisa = depois.status === ${sQ}${estado}${sQ} && temEmail`)).toBe(true)
      expect(r(`if (${sQ}${estado}${sQ} === novo.status) notificar()`)).toBe(true)
      // Inverso: a coluna "sem código" da lista compara para DESENHAR (linha sem aviso nem e-mail).
      expect(r(`) : o.status === ${sQ}${estado}${sQ} ? (`)).toBe(false)
      // Inverso: o próximo passo do pedido (`nextStep`) não compara status com literal de aviso.
      expect(r('const passo = nextStep(order, retirada)')).toBe(false)
    })

    it('o interruptor lido à mão', () => {
      const r = REGUAS['interruptor do evento lido à mão']
      expect(r('const ligado = resolveEventSettings(cfg, e, canal).enabled')).toBe(true)
      expect(r('if (settings.events[e].email.enabled) perguntar()')).toBe(true)
      expect(r('if (settings?.events?.[e]?.email?.enabled) perguntar()')).toBe(true)
      // Inversos: outros interruptores do painel (GA, Google Shopping) não são de notificação.
      expect(r('checked={analytics.enabled}')).toBe(false)
      expect(r('settings.enabled ? "Integração ligada" : "Integração desligada"')).toBe(false)
    })

    it('a pré-condição chamada à mão', () => {
      const r = REGUAS['pré-condição chamada à mão']
      expect(r('if (orderStateFailure(e, depois) === null) avisar()')).toBe(true)
      expect(r('const motivo = preconditionFailure(e, pedido)')).toBe(true)
      expect(r('const previsto = customerNoticeFor(t, depois, cfg, enviados)')).toBe(false)
    })

    it('o evento por nome', () => {
      const r = REGUAS['evento listado por nome']
      expect(r(`const e = ${sQ}${evento}${sQ}`)).toBe(true)
      expect(r(`const e = "${evento}"`)).toBe(true)
      expect(r(`const e = \`${evento}\``)).toBe(true)
      // Inverso: o NOME do evento vem do catálogo de `core`.
      expect(r('NOTIFICATION_EVENT_NAMES[e]')).toBe(false)
    })

    it('a metade positiva: a chamada só em comentário NÃO conta (CRLF e LF)', () => {
      expect(chamaAPrevisao(semComentarios('// customerNoticeFor(t, d, s, e)\r\nconst x = 1'))).toBe(false)
      expect(chamaAPrevisao(semComentarios('/* customerNoticeFor(t, d, s, e) */\nconst x = 1'))).toBe(false)
      expect(chamaAPrevisao(semComentarios('const x = 1 // ok\r\nconst p = customerNoticeFor(t, d, s, e)'))).toBe(true)
    })

    it('o removedor de comentário não engole a linha seguinte em CRLF, nem o código de um glob', () => {
      expect(semComentarios('// nota\r\nresolveEventSettings(a, b, c)')).toContain('resolveEventSettings(')
      expect(semComentarios("const g = 'src/**/x'\nresolveEventSettings(a, b, c)")).toContain('resolveEventSettings(')
    })
  })
})
