import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Para que lado a pessoa está rolando, e se ainda está no topo.
 *
 * Serve a moldura fixa da loja: o header se recolhe ao rolar para baixo e volta ao rolar para cima
 * (padrão de Mercado Livre, Shopee, Amazon, ASOS). Num celular pequeno a moldura fixa somava 30% da
 * tela na página do produto — este hook devolve 64px deles enquanto a cliente lê.
 *
 * Mora em `shared/lib` e não dentro do `Header` porque as três armadilhas abaixo são de scroll, não
 * de cabeçalho, e escritas inline elas reaparecem no próximo consumidor.
 */

/**
 * Quanto a rolagem precisa andar contra o extremo alcançado para a direção virar.
 *
 * Sem histerese, comparar `scrollY` com o valor do frame anterior faz a barra **piscar**: rolagem
 * por inércia e jitter sub-pixel alternam o sinal a cada frame, e o header vira um estroboscópio.
 */
const FLIP_THRESHOLD = 8

/**
 * Até onde o topo é "topo". É a altura do próprio header: acima disso ele está sempre visível,
 * senão toda página começaria sem cabeçalho — e a primeira rolagem para baixo o esconderia antes de
 * a pessoa ter visto que ele existe.
 */
const TOP_ZONE = 64

export interface ScrollDirection {
  direction: 'up' | 'down'
  atTop: boolean
}

/**
 * `scrollY` saneado.
 *
 * O *rubber-band* do Safari iOS reporta valor **negativo** ao esticar no topo e valor **acima do
 * máximo** ao esticar no fim. Sem o clamp, cada esticada no fim da página lê como uma rolagem para
 * cima e traz o header de volta sozinho.
 */
const clampedScrollY = (): number => {
  const max = Math.max(
    0,
    document.documentElement.scrollHeight - document.documentElement.clientHeight,
  )
  return Math.min(Math.max(window.scrollY, 0), max)
}

export const useScrollDirection = (): ScrollDirection => {
  const { pathname } = useLocation()
  const [state, setState] = useState<ScrollDirection>({ direction: 'up', atTop: true })
  // Refs, e não estado: são lidos e escritos dentro do listener a cada frame, e virar render aqui
  // seria um re-render por pixel rolado.
  //
  // `anchor` é o **extremo alcançado na direção corrente** — o ponto mais fundo de uma descida, o
  // mais alto de uma subida. Não é "o valor do frame anterior": se fosse, uma sequência de passos de
  // 7px nunca somaria o limiar e a direção congelaria para sempre.
  const anchor = useRef(0)
  const direction = useRef<'up' | 'down'>('up')

  useEffect(() => {
    // Duas variáveis para uma coisa só, e é necessário: a guarda de agendamento (`pending`) NÃO pode
    // ser o id do frame. Com `frame = requestAnimationFrame(measure)`, um rAF que chame o callback de
    // forma síncrona faz `measure` zerar `frame` **antes** de a atribuição acontecer — o id volta
    // para a variável, a guarda passa a barrar todo scroll seguinte e a direção congela no primeiro
    // gesto. Em browser o rAF é assíncrono e isso funcionava por acidente.
    let pending = false
    let frame = 0

    const measure = () => {
      pending = false
      const y = clampedScrollY()
      const delta = y - anchor.current

      if (direction.current === 'down') {
        // Afundou mais: a âncora acompanha o extremo. Voltou o bastante: vira.
        if (delta > 0) anchor.current = y
        else if (-delta >= FLIP_THRESHOLD) {
          direction.current = 'up'
          anchor.current = y
        }
      } else {
        if (delta < 0) anchor.current = y
        else if (delta >= FLIP_THRESHOLD) {
          direction.current = 'down'
          anchor.current = y
        }
      }

      setState(prev =>
        prev.direction === direction.current && prev.atTop === y <= TOP_ZONE
          ? prev
          : { direction: direction.current, atTop: y <= TOP_ZONE },
      )
    }

    const onScroll = () => {
      // rAF: o listener pode disparar várias vezes por frame, e medir o layout em cada uma delas é
      // o caminho curto para travar a rolagem no celular.
      if (pending) return
      pending = true
      frame = window.requestAnimationFrame(measure)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (pending) window.cancelAnimationFrame(frame)
    }
  }, [])

  // O ÚNICO inicializador — roda na montagem e em toda navegação.
  //
  // Duas coisas de uma vez, e é de propósito que não haja uma medida separada na montagem:
  //
  // 1. A página pode **nascer rolada** (recarregar no meio, voltar no histórico). Uma medida de
  //    montagem que inferisse direção veria "0 → 900" e concluiria "está rolando para baixo",
  //    escondendo o header sem que gesto nenhum tivesse acontecido. Só `atTop` vale nesse momento.
  // 2. A loja não tem `ScrollRestoration`, então uma navegação que preserve a posição herdaria
  //    "escondido" — e a página nova abriria sem header.
  useEffect(() => {
    const y = clampedScrollY()
    anchor.current = y
    direction.current = 'up'
    setState({ direction: 'up', atTop: y <= TOP_ZONE })
  }, [pathname])

  return state
}
