import { describe, expect, it } from 'vitest'
import { BOTTOM_BAR_H, BOTTOM_BAR_RESERVE, ownsBottomBar } from '../storeChrome'

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
  it('a reserva é a altura da barra mais a área segura do iPhone', () => {
    // Se estes dois divergirem, o fim do documento fica atrás da barra num aparelho com indicador
    // de home — o defeito que a mudança veio consertar.
    expect(BOTTOM_BAR_RESERVE).toBe(`calc(${BOTTOM_BAR_H} + env(safe-area-inset-bottom))`)
  })
})
