import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { materialAnchor } from '@estrelinha/core/material'

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useGeneralSettings: () => ({
    whatsapp: '(51) 99999-9999',
    whatsapp_message: '',
    store_name: 'Uma Estrelinha',
  }),
}))

import {
  ATALHOS_DE_MATERIAL,
  CARTOES_DE_MATERIAL,
  FICHAS_DE_MATERIAL,
  GUIA_MATERIAL_PATH,
  PASSOS_DO_ENVIO,
  PREPARO_EM_CASA,
  useMaterialDrawerStore,
} from '@/entities/material'
import MaterialDrawer from '../MaterialDrawer'

/**
 * A gaveta — `GAV-04`, `GAV-09`..`GAV-14`, `GAV-16`, `GAV-21`.
 *
 * **O que este arquivo NÃO prova**: largura real, posição da dobra, rolagem interna e o véu sendo
 * alcançável pelo dedo. jsdom devolve 0 para toda medida de layout, então tudo aqui é proxy de forma
 * — classe, atributo, presença, ausência e ordem no DOM. A medida é prova em navegador, em 390×844 e
 * 1440, e está declarada como pendente na `tasks.md`.
 */

const abrir = (anchor: string | null = null) => {
  useMaterialDrawerStore.setState({ open: true, anchor })
  return render(<MaterialDrawer />)
}

describe('MaterialDrawer — a casca', () => {
  beforeEach(() => {
    useMaterialDrawerStore.setState({ open: false, anchor: null })
  })

  it('não renderiza nada quando fechada', () => {
    useMaterialDrawerStore.setState({ open: false, anchor: null })
    render(<MaterialDrawer />)

    expect(screen.queryByTestId('material-drawer')).toBeNull()
  })

  it('entra pela DIREITA', () => {
    abrir()
    // `GAV-04`. A régua é a classe que o variant `right` do `Sheet` produz — em `left` ela seria
    // `left-0` e `slide-in-from-left`, e o teste diria qual lado quebrou.
    const classes = screen.getByTestId('material-drawer').getAttribute('class') ?? ''
    expect(classes).toContain('right-0')
    expect(classes).toContain('slide-in-from-right')
  })

  it('a largura é tela − 48px no celular e 480px no computador', () => {
    abrir()
    // `GAV-21`. Token exato: `includes('w-[calc(100%-48px)]')` casaria um `min-w-` com o mesmo
    // sufixo, e a faixa de véu deixaria de existir sem nada acusar.
    const classes = (screen.getByTestId('material-drawer').getAttribute('class') ?? '').split(/\s+/)
    expect(classes).toContain('w-[calc(100%-48px)]')
    expect(classes).toContain('sm:max-w-[480px]')
    // E o `w-3/4` padrão do `Sheet` não pode ter sobrevivido ao merge: com ele, o celular voltaria
    // a 75% e o véu viraria 25% da tela.
    expect(classes).not.toContain('w-3/4')
    expect(classes).not.toContain('sm:max-w-sm')
  })

  it('a nota de contexto sai INTEIRA', () => {
    abrir()
    expect(
      screen.getByText(
        'Nada precisa ser enviado agora. Depois do pagamento confirmado, o endereço chega no seu WhatsApp.',
      ),
    ).toBeInTheDocument()
  })

  it('tem um fecho rotulado, de 44px', () => {
    abrir()
    const fechar = screen.getByRole('button', { name: 'Fechar' })
    const classes = (fechar.getAttribute('class') ?? '').split(/\s+/)
    expect(classes).toContain('h-11')
    expect(classes).toContain('w-11')
  })

  it('fechar desliga o store', () => {
    abrir()
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(useMaterialDrawerStore.getState().open).toBe(false)
  })
})

describe('MaterialDrawer — a ordem do corpo (GAV-09)', () => {
  beforeEach(() => {
    useMaterialDrawerStore.setState({ open: false, anchor: null })
  })

  it('nota → pergunta → chips → passos', () => {
    // A ordem é a decisão medida da feature: com os passos no topo, os chips caem abaixo da dobra
    // numa tela de 390×844 — e os chips são o motivo de a gaveta abrir. Sem este caso, uma
    // reordenação "mais lógica" desfaria a correção sem quebrar nada.
    abrir()
    const texto = screen.getByTestId('material-drawer').textContent ?? ''

    const nota = texto.indexOf('Nada precisa ser enviado agora')
    const pergunta = texto.indexOf('Qual é o seu material?')
    const primeiroChip = texto.indexOf(ATALHOS_DE_MATERIAL[0].rotuloCurto)
    const caminho = texto.indexOf('O caminho')

    expect(nota).toBeGreaterThanOrEqual(0)
    expect(pergunta).toBeGreaterThan(nota)
    expect(primeiroChip).toBeGreaterThan(pergunta)
    expect(caminho).toBeGreaterThan(primeiroChip)
  })
})

describe('MaterialDrawer — os chips (GAV-10)', () => {
  beforeEach(() => {
    useMaterialDrawerStore.setState({ open: false, anchor: null })
  })

  it('há um chip por entrada de `ATALHOS_DE_MATERIAL` — e são 10', () => {
    // Âncora de contagem: uma lista que encolhesse passaria com "todos os chips presentes".
    abrir()
    expect(ATALHOS_DE_MATERIAL).toHaveLength(10)

    for (const atalho of ATALHOS_DE_MATERIAL) {
      expect(screen.getByRole('button', { name: atalho.rotuloCurto })).toBeInTheDocument()
    }
  })

  it('os chips usam `rotuloCurto`, não o título completo', () => {
    abrir()
    expect(screen.getByRole('button', { name: 'Unhas' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Unhas (humanas ou de pet)' })).toBeNull()
  })

  it('nenhum chip nasce escolhido — a loja não responde pela cliente', () => {
    abrir()
    for (const atalho of ATALHOS_DE_MATERIAL) {
      expect(
        screen.getByRole('button', { name: atalho.rotuloCurto }).getAttribute('aria-pressed'),
      ).toBe('false')
    }
  })

  it('escolher grava a âncora e NÃO fecha a gaveta', () => {
    abrir()
    fireEvent.click(screen.getByRole('button', { name: 'Cinzas' }))

    expect(useMaterialDrawerStore.getState().anchor).toBe('cinzas')
    expect(useMaterialDrawerStore.getState().open).toBe(true)
  })

  it('o chip escolhido diz isso por `aria-pressed`, não só por cor', () => {
    abrir('cinzas')
    expect(screen.getByRole('button', { name: 'Cinzas' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Placenta' }).getAttribute('aria-pressed')).toBe(
      'false',
    )
  })

  it('o chip escolhido também MUDA DE CARA — `aria-pressed` sozinho não basta', () => {
    // Achado da verificação independente: colapsar os dois ramos de classe deixava a suíte verde,
    // e a cliente tocava num chip que não mudava de aparência. `aria-pressed` serve o leitor de
    // tela; a cor serve todo mundo, e `GAV-10` pede as duas.
    abrir('cinzas')
    const escolhido = (
      screen.getByRole('button', { name: 'Cinzas' }).getAttribute('class') ?? ''
    ).split(/\s+/)
    const outro = (
      screen.getByRole('button', { name: 'Placenta' }).getAttribute('class') ?? ''
    ).split(/\s+/)

    // Token exato: `includes('bg-estrelinha-primary')` casaria `bg-estrelinha-primary-strong`.
    expect(escolhido).toContain('bg-estrelinha-primary')
    expect(escolhido).toContain('text-estrelinha-on-primary')
    expect(outro).not.toContain('bg-estrelinha-primary')
    expect(outro).toContain('bg-estrelinha-surface')
  })
})

describe('MaterialDrawer — o rodapé (GAV-16)', () => {
  beforeEach(() => {
    useMaterialDrawerStore.setState({ open: false, anchor: null })
  })

  it('sem escolha, aponta para o guia sem âncora', () => {
    abrir()
    expect(
      screen.getByRole('link', { name: /Ver o guia completo/i }).getAttribute('href'),
    ).toBe(GUIA_MATERIAL_PATH)
  })

  it('com escolha, aponta para a âncora daquele material', () => {
    abrir('cinzas')
    expect(
      screen.getByRole('link', { name: /Ver o guia completo/i }).getAttribute('href'),
    ).toBe(`${GUIA_MATERIAL_PATH}#cinzas`)
  })

  it('âncora desconhecida NÃO vaza para o rodapé', () => {
    // O rodapé usa `escolhido?.anchor`, e não o `anchor` cru: um estado que não corresponde a
    // entrada nenhuma viraria `#material-que-nao-existe` no link do guia — endereço que abre a
    // página e não rola, sem 404 e sem nada no console.
    abrir('material-que-nao-existe')
    expect(
      screen.getByRole('link', { name: /Ver o guia completo/i }).getAttribute('href'),
    ).toBe(GUIA_MATERIAL_PATH)
  })

  it('toda entrada tem destino alcançável no rodapé', () => {
    // A âncora é contrato desde a feature 22, e âncora quebrada NÃO dá 404: a página abre, não
    // rola, e ninguém descobre. Um caso por entrada (lição `L-010`).
    for (const atalho of ATALHOS_DE_MATERIAL) {
      const { unmount } = abrir(atalho.anchor)
      expect(
        screen.getByRole('link', { name: /Ver o guia completo/i }).getAttribute('href'),
      ).toBe(`${GUIA_MATERIAL_PATH}#${atalho.anchor}`)
      unmount()
    }
  })
})

describe('MaterialDrawer — os quatro passos (GAV-09)', () => {
  beforeEach(() => {
    useMaterialDrawerStore.setState({ open: false, anchor: null })
  })

  it('renderiza os quatro, com título e apoio', () => {
    abrir()
    expect(PASSOS_DO_ENVIO).toHaveLength(4)

    for (const passo of PASSOS_DO_ENVIO) {
      expect(screen.getByText(passo.titulo)).toBeInTheDocument()
      expect(screen.getByText(passo.texto)).toBeInTheDocument()
    }
  })
})

describe('MaterialDrawer — o corpo por material (GAV-11..GAV-13)', () => {
  beforeEach(() => {
    useMaterialDrawerStore.setState({ open: false, anchor: null })
  })

  it('ficha rica: quantidade com valor E nota, recipientes, passos e avisos', () => {
    const cinzas = FICHAS_DE_MATERIAL.find(f => f.kind === 'cinzas')!
    abrir('cinzas')
    const corpo = within(screen.getByTestId('material-drawer-body'))

    expect(corpo.getByText(cinzas.titulo)).toBeInTheDocument()
    expect(corpo.getByText(cinzas.quantidade.valor)).toBeInTheDocument()
    expect(corpo.getByText(cinzas.quantidade.nota)).toBeInTheDocument()
    expect(corpo.getByText(cinzas.listaTitulo)).toBeInTheDocument()

    for (const item of cinzas.lista) expect(corpo.getByText(item)).toBeInTheDocument()
    for (const passo of cinzas.passos) expect(corpo.getByText(passo.texto)).toBeInTheDocument()
    for (const aviso of cinzas.avisos) expect(corpo.getByText(aviso.texto)).toBeInTheDocument()
  })

  it('ficha com DOIS avisos mostra os dois — não só o primeiro', () => {
    // Achado da verificação independente: a gaveta só era testada com `cinzas`, que tem UM aviso.
    // `ficha.avisos.slice(0, 1)` passava com a suíte inteira verde, e a cliente perdia metade do
    // que o guia diz — inclusive o aviso que estraga o material.
    const comDois = FICHAS_DE_MATERIAL.find(f => f.avisos.length > 1)
    expect(comDois).toBeDefined()

    abrir(materialAnchor(comDois!.kind))
    const corpo = within(screen.getByTestId('material-drawer-body'))
    for (const aviso of comDois!.avisos) {
      expect(corpo.getByText(aviso.texto)).toBeInTheDocument()
    }
  })

  it('cada ficha rica mostra TODOS os seus avisos', () => {
    // O caso acima prende o número; este prende a classe inteira (lição `L-010`).
    for (const ficha of FICHAS_DE_MATERIAL) {
      const { unmount } = abrir(materialAnchor(ficha.kind))
      const corpo = within(screen.getByTestId('material-drawer-body'))
      for (const aviso of ficha.avisos) {
        expect(corpo.getByText(aviso.texto)).toBeInTheDocument()
      }
      unmount()
    }
  })

  it('cartão simples: itens, e NENHUM bloco de quantidade ou recipientes', () => {
    // `GAV-12`. Bloco ausente não pode virar bloco vazio — "QUANTIDADE —" seria a loja fingindo
    // uma precisão que não tem.
    const dente = CARTOES_DE_MATERIAL.find(c => c.anchor === 'dente-leite')!
    abrir('dente-leite')
    const corpo = within(screen.getByTestId('material-drawer-body'))

    for (const item of dente.itens) expect(corpo.getByText(item)).toBeInTheDocument()
    expect(corpo.queryByText('Quantidade')).toBeNull()
    expect(corpo.queryByText('Recipientes aceitos')).toBeNull()
  })

  it('preparo em casa: o aviso e TODOS os passos', () => {
    const placenta = PREPARO_EM_CASA.find(p => p.anchor === 'placenta')!
    abrir('placenta')
    const corpo = within(screen.getByTestId('material-drawer-body'))

    expect(corpo.getByText(placenta.aviso)).toBeInTheDocument()
    for (const passo of placenta.passos) expect(corpo.getByText(passo)).toBeInTheDocument()
  })

  it('toda entrada de `ATALHOS_DE_MATERIAL` produz um corpo — nenhuma cai no vazio', () => {
    // O chip existe porque a entrada existe; se a resolução por âncora não cobrisse uma das três
    // origens, o chip correspondente abriria a gaveta sem resposta, em silêncio.
    for (const atalho of ATALHOS_DE_MATERIAL) {
      const { unmount } = abrir(atalho.anchor)
      expect(screen.getByTestId('material-drawer-body')).toBeInTheDocument()
      unmount()
    }
  })

  it('`Outro material` oferece a saída para o WhatsApp', () => {
    // Edge Case da spec que a primeira entrega não implementou, achado pela verificação
    // independente: o cartão manda "fale com a gente antes de enviar" — mandar fazer uma coisa sem
    // oferecer como fazê-la é pior do que não mandar.
    abrir('outro')
    const link = screen.getByTestId('material-drawer-whatsapp')
    expect(link.getAttribute('href')).toContain('https://wa.me/51999999999?text=')
  })

  it('os outros CARTÕES SIMPLES não oferecem WhatsApp — o preparo está escrito', () => {
    // O par, e ele tem de medir um **cartão simples**: a primeira escrita abria `cinzas`, que é
    // ficha rica e nem passa pelo ramo do WhatsApp — o caso passava por inalcançabilidade, não por
    // regra. Achado da rodada 2 da verificação independente: trocar a condição para
    // `cartao.kind !== null` punha o botão em Dentes de leite, Coto e Flores com a suíte verde.
    for (const anchor of ['dente-leite', 'coto-umbilical', 'flores']) {
      const { unmount } = abrir(anchor)
      expect(screen.getByTestId('material-drawer-body')).toBeInTheDocument()
      expect(screen.queryByTestId('material-drawer-whatsapp')).toBeNull()
      unmount()
    }
  })

  it('ficha rica também não oferece WhatsApp', () => {
    abrir('cinzas')
    expect(screen.queryByTestId('material-drawer-whatsapp')).toBeNull()
  })

  it('âncora desconhecida não renderiza corpo, e não quebra a gaveta', () => {
    abrir('material-que-nao-existe')
    expect(screen.queryByTestId('material-drawer-body')).toBeNull()
    expect(screen.getByText('Qual é o seu material?')).toBeInTheDocument()
  })
})

describe('MaterialDrawer — o vídeo (GAV-14, GAV-23)', () => {
  beforeEach(() => {
    useMaterialDrawerStore.setState({ open: false, anchor: null })
  })

  it('NENHUM iframe antes do toque', () => {
    // Quem só abriu a gaveta não carrega script do YouTube.
    //
    // A asserção é no `document`, e não no `container` do render: o `Sheet` monta em portal, então
    // `container.querySelectorAll('iframe')` daria zero mesmo com o player na tela — uma asserção
    // que passa sempre é pior que nenhuma.
    abrir('cinzas')
    expect(document.querySelectorAll('iframe')).toHaveLength(0)
  })

  it('depois do toque, o player é `youtube-nocookie`', () => {
    abrir('cinzas')
    fireEvent.click(screen.getByRole('button', { name: /toque para assistir aqui/i }))

    const iframe = document.querySelector('iframe')
    expect(iframe).not.toBeNull()
    expect(iframe!.getAttribute('src')).toContain('youtube-nocookie.com/embed/')
  })

  it('a saída externa existe nos DOIS estados', () => {
    // `GAV-23`. Quem bloqueia iframe não veria nada sem ela.
    abrir('cinzas')
    expect(screen.getByRole('link', { name: 'abrir no YouTube' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /toque para assistir aqui/i }))
    expect(screen.getByRole('link', { name: 'abrir no YouTube' })).toBeInTheDocument()
  })

  it('material SEM vídeo não renderiza bloco nenhum', () => {
    abrir('unhas')
    expect(screen.queryByTestId('material-drawer-video')).toBeNull()
  })

  it('a capa tem `alt` que NOMEIA o vídeo', () => {
    // A Adri escreve o título dentro da arte da capa. `alt=""` trataria como decoração uma imagem
    // que carrega informação — e se a capa falhar, quem usa leitor de tela fica sem nada.
    abrir('cinzas')
    const img = document.querySelector('[data-testid="material-drawer-video"] img')
    expect(img?.getAttribute('alt')).toBe('Capa do vídeo: Como enviar cinzas de cremação')
  })

  it('a capa é `hqdefault`, que existe para todo vídeo', () => {
    // `maxresdefault` NÃO existe para todo vídeo, e quando falta o YouTube devolve uma imagem
    // cinza de 120px em vez de um 404 — a capa ficaria borrada e nada acusaria.
    //
    // A busca é no `document` e não no `container` do render: o `Sheet` do Radix monta em portal,
    // e no `container` não há nada. Foi assim que este caso reprovou da primeira vez.
    abrir('cinzas')
    const img = document.querySelector('[data-testid="material-drawer-video"] img')
    expect(img).not.toBeNull()
    expect(img!.getAttribute('src')).toContain('/hqdefault.jpg')
  })
})
