// T20 — os itens de link do menu: `store_settings.menu -> links[]`.
//
// As ACs provadas aqui: `NAV-09` (cadastro com rótulo, destino, ícone e ligação por dispositivo),
// `NAV-10` (destino interno conferido contra as rotas declaradas, **na gravação**), `NAV-11`
// (externo exige `https://`), `NAV-13` (remover o link não mexe em mais nada) e `NAV-41`/`NAV-42`
// (falha de leitura e de gravação são ditas, nunca engolidas).
//
// O dublê do client é o que permite provar **o que foi para o banco** sem subir Supabase — e é a
// única prova que importa numa tela que grava: o payload, em igualdade exata.

import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  /** O que o `select` devolve. Trocado por teste. */
  row: null as { value: unknown } | null,
  readError: null as { message: string } | null,
  writeError: null as { message: string } | null,
  upsert: vi.fn(),
}))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: db.row, error: db.readError }),
        }),
      }),
      upsert: (...args: unknown[]) => {
        db.upsert(...args)
        return Promise.resolve({ error: db.writeError })
      },
    }),
  },
}))

import { menuLinkRefusal, parseMenuLinks, proximaPosicao, useMenuLinks } from './useMenuLinks'

const SOBRE = {
  id: 'sobre',
  label: 'Sobre',
  href: '/sobre',
  icon: null,
  desktop: true,
  mobile: true,
  sort_order: 100,
}

beforeEach(() => {
  db.row = { value: { links: [SOBRE] } }
  db.readError = null
  db.writeError = null
  db.upsert.mockClear()
})

const montar = async () => {
  const hook = renderHook(() => useMenuLinks())
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
  return hook
}

/** O `value` que a última gravação mandou para o banco. */
const gravado = () => (db.upsert.mock.calls.at(-1)![0] as { key: string; value: { links: unknown[] } })

// ---------------------------------------------------------------------------
describe('parseMenuLinks — jsonb não tem forma garantida', () => {
  it.each([
    ['null', null],
    ['array na raiz', [{ id: 'a' }]],
    ['`links` que não é lista', { links: 'sobre' }],
    ['objeto sem `links`', { outra: 1 }],
    ['string', 'sobre'],
  ])('%s devolve lista vazia, sem lançar', (_nome, valor) => {
    expect(parseMenuLinks(valor)).toEqual([])
  })

  it('item que não é objeto é descartado; o resto sobrevive', () => {
    expect(parseMenuLinks({ links: [null, 'x', SOBRE] })).toHaveLength(1)
  })

  it('campo ausente cai em valor conservador — desligado nos dois dispositivos', () => {
    const [link] = parseMenuLinks({ links: [{ label: 'Campanha', href: '/promo' }] })
    expect(link).toMatchObject({ desktop: false, mobile: false, icon: null, sort_order: 0 })
    // Id ausente vira posicional: sem ele a linha não teria chave nem alvo de edição.
    expect(link.id).toBe('link-0')
  })

  it('link com rótulo vazio NÃO é filtrado — some da loja, mas o painel precisa poder apagá-lo', () => {
    // A loja já o descarta (`menuItems`). Filtrá-lo aqui também o tornaria invisível e indeletável,
    // que é a mesma armadilha do terceiro banner.
    expect(parseMenuLinks({ links: [{ id: 'x', label: '   ', href: '/sobre' }] })).toHaveLength(1)
  })
})

describe('proximaPosicao — link novo entra depois de tudo', () => {
  it('sem links começa em 100, a casa do "Sobre" semeado', () => {
    expect(proximaPosicao([])).toBe(100)
  })

  it('com o "Sobre" em 100, o próximo é 101 — nunca no meio das categorias', () => {
    expect(proximaPosicao([SOBRE])).toBe(101)
  })
})

describe('NAV-10 / NAV-11 — a recusa do destino, e ela é a MESMA do banner', () => {
  const draft = (over: Partial<Parameters<typeof menuLinkRefusal>[0]> = {}) => ({
    label: 'Sobre', href: '/sobre', icon: null, desktop: true, mobile: false, ...over,
  })

  it('rótulo vazio é recusado — é o que a cliente lê na barra', () => {
    expect(menuLinkRefusal(draft({ label: '  ' }))).toContain('nome')
  })

  it('rota declarada passa', () => {
    expect(menuLinkRefusal(draft())).toBeNull()
  })

  it('rota que não existe é recusada, e o motivo LISTA os endereços aceitos', () => {
    const motivo = menuLinkRefusal(draft({ href: '/sobree' }))
    expect(motivo).toContain('/sobree')
    expect(motivo).toContain('/sobre')
  })

  it('`http://` externo é recusado; `https://` passa', () => {
    expect(menuLinkRefusal(draft({ href: 'http://exemplo.com' }))).toContain('https://')
    expect(menuLinkRefusal(draft({ href: 'https://exemplo.com' }))).toBeNull()
  })

  it('o veredito é `string | null` — nunca união discriminada por booleano', () => {
    // `strictNullChecks: false` não estreita união por literal booleano: ler `verdict.reason` no
    // ramo do `else` seria TS2339. O formato atual não tem ramo para esquecer.
    expect(typeof menuLinkRefusal(draft({ href: '/nao-existe' }))).toBe('string')
    expect(menuLinkRefusal(draft())).toBeNull()
  })
})

describe('NAV-09 — o cadastro', () => {
  it('link novo entra com id próprio, destino normalizado e as duas booleanas', async () => {
    const { result } = await montar()

    let motivo: string | null = 'ainda não'
    await act(async () => {
      motivo = await result.current.saveLink({
        label: '  Como enviar  ',
        href: 'como-enviar-seu-material-de-dna/',
        icon: 'envio',
        desktop: true,
        mobile: false,
      })
    })

    expect(motivo).toBeNull()
    const { links } = gravado().value
    expect(links).toHaveLength(2)
    expect(links[1]).toMatchObject({
      label: 'Como enviar',
      // Uma barra na frente, nenhuma no fim: `vercel.json` declara `trailingSlash: false`.
      href: '/como-enviar-seu-material-de-dna',
      icon: 'envio',
      desktop: true,
      mobile: false,
      sort_order: 101,
    })
    expect((links[1] as { id: string }).id).not.toBe('')
  })

  it('destino inválido NÃO chega ao banco — a recusa vem antes da escrita', async () => {
    const { result } = await montar()

    let motivo: string | null = null
    await act(async () => {
      motivo = await result.current.saveLink({
        label: 'Campanha', href: '/nao-existe', icon: null, desktop: true, mobile: true,
      })
    })

    expect(motivo).toContain('não é um endereço da loja')
    // A prova que importa: nada foi gravado.
    expect(db.upsert).not.toHaveBeenCalled()
  })

  it('editar preserva o id e a posição — mover não é efeito colateral de renomear', async () => {
    const { result } = await montar()

    await act(async () => {
      await result.current.saveLink({
        id: 'sobre', label: 'Sobre nós', href: '/sobre', icon: 'estrela', desktop: true, mobile: true,
      })
    })

    const { links } = gravado().value
    expect(links).toHaveLength(1)
    expect(links[0]).toMatchObject({ id: 'sobre', label: 'Sobre nós', sort_order: 100 })
  })
})

describe('NAV-13 — remover, e ligar por dispositivo', () => {
  it('remover tira só aquele link, e a chave `menu` mantém o resto', async () => {
    db.row = { value: { links: [SOBRE], outra_coisa: 'preservar' } }
    const { result } = await montar()

    await act(async () => { await result.current.removeLink('sobre') })

    expect(gravado().value).toEqual({ links: [], outra_coisa: 'preservar' })
    expect(gravado().key).toBe('menu')
  })

  it('ligar numa superfície NÃO toca na outra', async () => {
    const { result } = await montar()

    await act(async () => { await result.current.setLinkSurface('sobre', 'mobile', false) })

    const { links } = gravado().value
    expect(links[0]).toMatchObject({ desktop: true, mobile: false })
  })
})

describe('NAV-41 / NAV-42 — a falha é dita, nunca engolida', () => {
  it('falha de leitura devolve erro E lista vazia — a tela mostra a falha, não "sem links"', async () => {
    db.readError = { message: 'Could not connect' }
    const { result } = await montar()

    expect(result.current.error).toBe('Could not connect')
    expect(result.current.links).toEqual([])
  })

  it('linha ausente NÃO é erro: é a loja que ainda não configurou nada', async () => {
    db.row = null
    const { result } = await montar()

    expect(result.current.error).toBeNull()
    // E o default é `{ links: [] }`, nunca um "Sobre" inventado: quem semeia é a migration, e
    // repetir a semente aqui o faria ressuscitar depois de apagado.
    expect(result.current.links).toEqual([])
  })

  it('falha de gravação volta com o motivo — quem chamou tem o que dizer em tela', async () => {
    const { result } = await montar()
    db.writeError = { message: 'permission denied for table store_settings' }

    let motivo: string | null = null
    await act(async () => { motivo = await result.current.removeLink('sobre') })

    expect(motivo).toContain('permission denied')
  })
})
