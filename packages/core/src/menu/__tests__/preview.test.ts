// Feature 39, T27 — o canal da prévia do menu (`NAV-43`, `NAV-47`).
//
// O que se prova aqui é **a forma**, que é a única coisa que o módulo decide: quem valida remetente
// é cada ponta, com a régua dela (o painel exige origem exata e a janela do iframe; a loja exige só
// ser o pai). O teste da porta de entrada de cada lado mora com cada lado.
//
// A asserção que mais importa é a do **carimbo**: `window.message` é barramento compartilhado, e o
// canal da home chega na mesma janela. Sem o carimbo, um `draft` da home viraria comando de menu.

import { describe, expect, it } from 'vitest'
import {
  MENU_PREVIEW_SOURCE,
  menuPreviewDevice,
  parseMenuPreviewMessage,
  type MenuPreviewDraft,
} from '../preview'
import { PREVIEW_DEVICES, PREVIEW_PARAM, PREVIEW_SOURCE, isPreviewWindow } from '../../home/preview'

const rascunho = (): MenuPreviewDraft => ({
  categories: [
    {
      id: 'joias',
      name: 'Joias afetivas',
      slug: 'joias',
      parent_id: null,
      sort_order: 0,
      active: true,
      menu_desktop: true,
    },
  ],
  links: [
    { id: 'sobre', label: 'Sobre', href: '/sobre', desktop: true, mobile: true, sort_order: 100 },
  ],
})

describe('NAV-47 — sem o carimbo, não é comando', () => {
  it('recusa objeto sem `source`', () => {
    expect(parseMenuPreviewMessage({ type: 'ready' })).toBeNull()
    expect(parseMenuPreviewMessage({ type: 'draft', draft: rascunho() })).toBeNull()
  })

  it('recusa o carimbo do canal da HOME — os dois convivem no mesmo `?preview=1`', () => {
    // É o caso que motiva o carimbo existir em vez de bastar o `type`: as duas pontes usam o mesmo
    // parâmetro e a mesma janela, e um `draft` de seções não pode virar um menu.
    expect(
      parseMenuPreviewMessage({ source: PREVIEW_SOURCE, type: 'draft', sections: [] }),
    ).toBeNull()
    expect(MENU_PREVIEW_SOURCE).not.toBe(PREVIEW_SOURCE)
  })

  it('recusa o que o barramento traz de fora', () => {
    for (const alheia of [
      { source: 'vite:hmr', type: 'draft', draft: rascunho() },
      { source: 'react-devtools-bridge', type: 'open', itemId: 'joias' },
    ]) {
      expect(parseMenuPreviewMessage(alheia)).toBeNull()
    }
  })

  it('recusa o que não é objeto — e não lança', () => {
    for (const lixo of [null, undefined, 0, '', 'draft', [], [{ source: MENU_PREVIEW_SOURCE }]]) {
      expect(parseMenuPreviewMessage(lixo)).toBeNull()
    }
  })
})

describe('`parse` devolve `T | null`, nunca união por booleano', () => {
  it('forma inválida é `null` — não há ramo de falha para esquecer', () => {
    // `strictNullChecks: false` não estreita união discriminada por literal booleano: ler
    // `veredito.motivo` no `else` de um `{ ok: boolean }` seria TS2339. `null` não tem esse ramo.
    expect(parseMenuPreviewMessage({ source: MENU_PREVIEW_SOURCE, type: 'bomba' })).toBeNull()
    expect(parseMenuPreviewMessage({ source: MENU_PREVIEW_SOURCE })).toBeNull()
  })
})

describe('`ready` — o aperto de mão', () => {
  it('passa, e volta normalizado', () => {
    expect(parseMenuPreviewMessage({ source: MENU_PREVIEW_SOURCE, type: 'ready', lixo: 1 })).toEqual(
      { source: MENU_PREVIEW_SOURCE, type: 'ready' },
    )
  })
})

describe('`draft` — as duas fontes do menu, cruas', () => {
  it('passa com categorias e links', () => {
    const mensagem = parseMenuPreviewMessage({
      source: MENU_PREVIEW_SOURCE,
      type: 'draft',
      draft: rascunho(),
    })

    expect(mensagem?.type).toBe('draft')
    expect(mensagem?.type === 'draft' && mensagem.draft.categories).toHaveLength(1)
    expect(mensagem?.type === 'draft' && mensagem.draft.links[0].label).toBe('Sobre')
  })

  it('links ausente vira `[]` — loja sem item de link é estado normal (NAV-15)', () => {
    const mensagem = parseMenuPreviewMessage({
      source: MENU_PREVIEW_SOURCE,
      type: 'draft',
      draft: { categories: [] },
    })

    expect(mensagem?.type === 'draft' && mensagem.draft.links).toEqual([])
    expect(mensagem?.type === 'draft' && mensagem.draft.categories).toEqual([])
  })

  it('links de forma errada vira `[]` em vez de derrubar o rascunho inteiro', () => {
    const mensagem = parseMenuPreviewMessage({
      source: MENU_PREVIEW_SOURCE,
      type: 'draft',
      draft: { categories: [], links: 'sobre' },
    })
    expect(mensagem?.type === 'draft' && mensagem.draft.links).toEqual([])
  })

  it('sem `categories`, ou com `draft` que não é objeto, é recusado', () => {
    // Rascunho sem categorias não é "loja vazia": é forma errada. Aceitá-lo apagaria a barra da
    // prévia toda vez que uma mensagem chegasse pela metade.
    expect(
      parseMenuPreviewMessage({ source: MENU_PREVIEW_SOURCE, type: 'draft', draft: { links: [] } }),
    ).toBeNull()
    expect(
      parseMenuPreviewMessage({ source: MENU_PREVIEW_SOURCE, type: 'draft', draft: [] }),
    ).toBeNull()
    expect(parseMenuPreviewMessage({ source: MENU_PREVIEW_SOURCE, type: 'draft' })).toBeNull()
  })
})

describe('`open` — qual painel abrir', () => {
  it('id de entrada passa', () => {
    expect(
      parseMenuPreviewMessage({ source: MENU_PREVIEW_SOURCE, type: 'open', itemId: 'joias' }),
    ).toEqual({ source: MENU_PREVIEW_SOURCE, type: 'open', itemId: 'joias' })
  })

  it('`null` passa — é como o painel FECHA o que está aberto', () => {
    expect(
      parseMenuPreviewMessage({ source: MENU_PREVIEW_SOURCE, type: 'open', itemId: null }),
    ).toEqual({ source: MENU_PREVIEW_SOURCE, type: 'open', itemId: null })
  })

  it('string vazia lê como `null`, e o que não é string nem `null` é recusado', () => {
    expect(
      parseMenuPreviewMessage({ source: MENU_PREVIEW_SOURCE, type: 'open', itemId: '' }),
    ).toEqual({ source: MENU_PREVIEW_SOURCE, type: 'open', itemId: null })
    expect(
      parseMenuPreviewMessage({ source: MENU_PREVIEW_SOURCE, type: 'open', itemId: 7 }),
    ).toBeNull()
    expect(parseMenuPreviewMessage({ source: MENU_PREVIEW_SOURCE, type: 'open' })).toBeNull()
  })
})

describe('NAV-45 — a superfície É o dispositivo do palco', () => {
  it('cada superfície tem medida no catálogo genérico, e o celular é 390', () => {
    expect(menuPreviewDevice('mobile')).toBe('mobile')
    expect(menuPreviewDevice('desktop')).toBe('desktop')
    expect(PREVIEW_DEVICES[menuPreviewDevice('mobile')].width).toBe(390)
  })

  it('superfície desconhecida cai no celular — ~90% dos acessos da loja', () => {
    expect(menuPreviewDevice('relógio' as never)).toBe('mobile')
  })
})

describe('os genéricos são REUSADOS, não redeclarados', () => {
  it('o parâmetro do modo prévia é um só, e é o da feature 25', () => {
    // Se `core/menu` declarasse o próprio `?menu=1`, esta asserção continuaria passando e a loja
    // teria dois donos de "esta janela é uma prévia". A prova de que não há segundo é a ausência de
    // qualquer export de parâmetro neste módulo — o `purity.test.ts` guarda o grafo, e aqui se
    // guarda o comportamento: as duas pontes ligam pelo MESMO parâmetro.
    expect(PREVIEW_PARAM).toBe('preview')
    expect(isPreviewWindow(`?${PREVIEW_PARAM}=1`, true)).toBe(true)
  })

  it('`?preview=1` FORA de iframe não liga nada — o parâmetro é adivinhável', () => {
    expect(isPreviewWindow(`?${PREVIEW_PARAM}=1`, false)).toBe(false)
  })
})
