import { describe, expect, it } from 'vitest'
import {
  BOTTOM_BAR_H,
  BUY_BAR_H,
  bottomBarHeight,
  bottomBarReserve,
  ownsBottomBar,
} from '../storeChrome'

describe('ownsBottomBar — quem dispensa o MobileNav', () => {
  it('a página do produto traz a própria barra', () => {
    // `AD-018`: o caminho canônico do produto passou a ser `/produtos/:slug`.
    expect(ownsBottomBar('/produtos/joia-de-leite-materno')).toBe(true)
  })

  it('a rota LEGADA do singular não dispensa as abas — ela redireciona antes de renderizar', () => {
    expect(ownsBottomBar('/produto/joia-de-leite-materno')).toBe(false)
  })

  it('as demais rotas da loja seguem com as abas', () => {
    for (const path of ['/', '/joias-afetivas', '/carrinho', '/conta', '/busca', '/favoritos']) {
      expect(ownsBottomBar(path)).toBe(false)
    }
  })

  it('a subcategoria de dois segmentos também segue com as abas', () => {
    // Com categoria na raiz do domínio, uma URL de duas partes é o caso comum — e nenhuma delas
    // traz barra própria.
    expect(ownsBottomBar('/joias-afetivas/joia-de-leite-materno')).toBe(false)
  })

  it('não confunde uma rota que só COMEÇA parecida', () => {
    // Sem a barra final, `/produtos-novos` casaria com `startsWith('/produtos')` e a página perderia
    // as abas sem ter barra nenhuma no lugar.
    expect(ownsBottomBar('/produtos-novos')).toBe(false)
  })

  it('a listagem sem slug não é página de produto', () => {
    expect(ownsBottomBar('/produtos')).toBe(false)
  })
})

describe('altura da barra de rodapé', () => {
  it('a reserva é a altura da barra DESTA rota mais a área segura do iPhone', () => {
    // Se estes dois divergirem, o fim do documento fica atrás da barra num aparelho com indicador
    // de home — o defeito que a reserva veio consertar.
    for (const path of ['/', '/produtos/joia-de-leite-materno']) {
      expect(bottomBarReserve(path)).toBe(
        `calc(${bottomBarHeight(path)} + env(safe-area-inset-bottom))`,
      )
    }
  })

  it('a altura da reserva sai do MESMO predicado que escolhe a barra', () => {
    // O "defeito 01" aplicado ao rodapé: com duas leituras da mesma pergunta, a página do produto
    // reservaria 64px para uma barra de 88 e a última faixa do rodapé sumiria atrás dela.
    // A régua é a EQUIVALÊNCIA, não a lista de rotas — ela não pode ser afrouxada citando caminhos.
    for (const path of [
      '/',
      '/joias-afetivas',
      '/carrinho',
      '/produtos',
      '/produtos-novos',
      '/produto/joia-de-leite-materno',
      '/produtos/joia-de-leite-materno',
      '/produtos/pingente-com-cinzas',
    ]) {
      expect(bottomBarHeight(path)).toBe(ownsBottomBar(path) ? BUY_BAR_H : BOTTOM_BAR_H)
    }
  })

  it('a barra de compra é MAIS ALTA que a das abas — é o que motivou a reserva por rota', () => {
    // Sensor: enquanto as duas forem iguais, uma reserva incondicional passaria nos casos acima e a
    // derivação por rota pareceria desnecessária. Este caso é o que registra que elas divergem.
    const px = (rem: string) => parseFloat(rem) * 16
    expect(px(BUY_BAR_H)).toBeGreaterThan(px(BOTTOM_BAR_H))
    expect(px(BUY_BAR_H)).toBe(88)
    expect(px(BOTTOM_BAR_H)).toBe(64)
  })

  it('as duas somadas continuam abaixo dos 133px que a regra de uma-barra-por-vez impede', () => {
    // Não é aritmética ociosa: a barra crescer é exatamente o caminho de volta para o rodapé que
    // comia 30% de um iPhone SE.
    expect(parseFloat(BUY_BAR_H) * 16).toBeLessThan(133)
  })
})
