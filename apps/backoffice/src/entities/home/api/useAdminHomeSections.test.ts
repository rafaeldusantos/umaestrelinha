// O que se prova aqui é **O QUE VAI PARA O SUPABASE**, não que o hook "funciona".
//
// As quatro ACs deste CRUD são todas sobre o payload: seção nova nasce desligada (`HOME-10`);
// ligar/desligar manda `{ id, active }` e nada mais (senão reescreve a seção com o cache velho da
// listagem); reordenar manda posições absolutas só das linhas alteradas, com o `type` que o upsert
// do PostgREST exige (`HOME-11`); e falha de gravação volta tipada em vez de engolida (`HOME-14`).
// Nenhuma delas se vê no estado do hook — só no objeto que foi enviado.

import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import { useAdminHomeSections } from './useAdminHomeSections'

interface Recorded {
  table: string
  select?: string
  insert?: unknown
  update?: unknown
  upsert?: unknown
  delete?: boolean
  filters: { method: string; args: unknown[] }[]
}

type Leitura = { data: unknown[] | null; error: { message: string } | null }

let calls: Recorded[] = []
let readResponse: Leitura
let writeResponse: { error: { message: string } | null }

/**
 * **Leituras controláveis** — e sem elas nada de `VIV-*` é verificável.
 *
 * As três ACs desta fase vivem na JANELA em que a releitura está no ar: é lá que o esqueleto voltaria
 * (`VIV-01`), lá que a lista seria esvaziada por uma falha (`VIV-07`) e lá que duas respostas podem
 * chegar fora de ordem (`VIV-08`). Com o dublê respondendo na hora, essa janela tem duração zero e
 * toda asserção sobre ela é verdadeira nos dois mundos.
 *
 * Com `segurarLeituras` ligado, cada leitura empilha o seu `resolve` em `pendentes` e fica no ar até
 * o teste devolver a resposta — na ordem que ele quiser.
 */
let segurarLeituras = false
let pendentes: ((r: Leitura) => void)[] = []

/**
 * **Escritas controláveis** — e sem elas `VIV-10` não é verificável.
 *
 * A gravação otimista vive inteira na janela em que a escrita está no ar: é lá que o interruptor
 * precisa já ter mudado, e lá que ele precisa voltar se o banco recusar. Com o dublê respondendo na
 * hora, essa janela tem duração zero e toda asserção sobre ela é verdadeira nos dois mundos — o
 * otimista e o pessimista. Um dublê que não enxerga a janela torna a regra inauditável.
 */
let segurarEscritas = false
let escritasPendentes: ((r: { error: { message: string } | null }) => void)[] = []

const linhas = () => [
  {
    id: 'sec-hero',
    type: 'hero',
    position: 1,
    active: true,
    config: { title_line1: 'O que você ama,' },
    created_at: 'x',
    updated_at: 'x',
    items: [],
  },
  {
    id: 'sec-banners',
    type: 'banner_grid',
    position: 2,
    active: true,
    config: { layout: 'hero_pair' },
    created_at: 'x',
    updated_at: 'x',
    items: [],
  },
  {
    id: 'sec-news',
    type: 'newsletter',
    position: 3,
    active: false,
    config: {},
    created_at: 'x',
    updated_at: 'x',
    items: [],
  },
]

const makeBuilder = (record: Recorded, resolve: () => unknown) => {
  const builder: Record<string, unknown> = {}
  for (const method of ['eq', 'in', 'order'] as const) {
    builder[method] = (...args: unknown[]) => {
      record.filters.push({ method, args })
      return builder
    }
  }
  builder.select = (arg: string) => {
    record.select = arg
    return builder
  }
  builder.maybeSingle = () =>
    Promise.resolve(
      writeResponse.error ? { data: null, error: writeResponse.error } : { data: { id: 'nova' }, error: null },
    )
  builder.then = (onFulfilled: (value: unknown) => unknown) =>
    Promise.resolve(resolve()).then(onFulfilled)
  return builder
}

beforeEach(() => {
  calls = []
  readResponse = { data: linhas(), error: null }
  writeResponse = { error: null }
  segurarLeituras = false
  pendentes = []
  segurarEscritas = false
  escritasPendentes = []

  fromMock.mockReset().mockImplementation((table: string) => {
    const record: Recorded = { table, filters: [] }
    calls.push(record)

    const resolve = () => {
      const escrita =
        record.insert !== undefined ||
        record.update !== undefined ||
        record.upsert !== undefined ||
        record.delete
      if (escrita) {
        if (!segurarEscritas) return writeResponse
        return new Promise<{ error: { message: string } | null }>(res =>
          escritasPendentes.push(res),
        )
      }
      if (!segurarLeituras) return readResponse
      return new Promise<Leitura>(res => pendentes.push(res))
    }

    const builder = makeBuilder(record, resolve) as Record<string, unknown>
    builder.insert = (rows: unknown) => {
      record.insert = rows
      return makeBuilder(record, resolve)
    }
    builder.update = (values: unknown) => {
      record.update = values
      return makeBuilder(record, resolve)
    }
    builder.upsert = (rows: unknown) => {
      record.upsert = rows
      return makeBuilder(record, resolve)
    }
    builder.delete = () => {
      record.delete = true
      return makeBuilder(record, resolve)
    }
    return builder
  })
})

/** Todo valor de `loading` que o hook já devolveu — a segunda rede sobre "o esqueleto voltou?". */
let loadings: boolean[] = []

const montar = async () => {
  loadings = []
  const hook = renderHook(() => {
    const atual = useAdminHomeSections()
    loadings.push(atual.loading)
    return atual
  })
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
  return hook
}

/** As gravações de uma tabela, na ordem em que saíram. */
const escritas = (table: string) =>
  calls.filter(
    c =>
      c.table === table &&
      (c.insert !== undefined || c.update !== undefined || c.upsert !== undefined || c.delete),
  )

describe('useAdminHomeSections — leitura', () => {
  it('traz as desligadas também: é a única tela onde elas podem ser religadas', async () => {
    const { result } = await montar()
    expect(result.current.sections.map(s => s.id)).toEqual(['sec-hero', 'sec-banners', 'sec-news'])
    expect(result.current.sections.find(s => s.id === 'sec-news')!.active).toBe(false)
  })

  it('falha de leitura vira `error` com mensagem, e a lista NÃO finge estar vazia', async () => {
    readResponse = { data: null, error: { message: 'permission denied for table home_sections' } }
    const { result } = await montar()
    expect(result.current.error).toBe('permission denied for table home_sections')
    expect(result.current.sections).toEqual([])
  })

  it('a ordem sai de `orderSections`, e o empate de `position` desempata por id (HOME-12)', async () => {
    readResponse = {
      data: [
        { id: 'zz', type: 'banner_grid', position: 2, active: true, config: {}, items: [] },
        { id: 'aa', type: 'collection_feature', position: 2, active: true, config: {}, items: [] },
        { id: 'mm', type: 'hero', position: 1, active: true, config: {}, items: [] },
      ],
      error: null,
    }
    const { result } = await montar()
    expect(result.current.sections.map(s => s.id)).toEqual(['mm', 'aa', 'zz'])
  })
})

describe('useAdminHomeSections — criar (HOME-10)', () => {
  it('a seção nova nasce DESLIGADA, e o `false` vai explícito no payload', async () => {
    const { result } = await montar()
    await act(async () => {
      await result.current.createSection('collection_feature')
    })
    const criacao = escritas('home_sections')[0]
    expect(criacao.insert).toEqual({
      type: 'collection_feature',
      position: 4,
      active: false,
      config: {},
    })
  })

  it('entra no FIM da lista: a posição é a maior existente mais um', async () => {
    const { result } = await montar()
    await act(async () => {
      await result.current.createSection('banner_grid')
    })
    expect((escritas('home_sections')[0].insert as { position: number }).position).toBe(4)
  })
})

describe('useAdminHomeSections — ligar/desligar', () => {
  it('manda `{ active }` e NADA MAIS, filtrado pelo id', async () => {
    const { result } = await montar()
    await act(async () => {
      await result.current.setSectionActive('sec-news', true)
    })
    const escrita = escritas('home_sections')[0]
    // A asserção é de igualdade e não de "contém": o defeito que esta regra existe para impedir é
    // justamente um campo A MAIS no payload, reescrevendo a seção com o cache velho da listagem.
    expect(escrita.update).toEqual({ active: true })
    expect(escrita.filters).toEqual([{ method: 'eq', args: ['id', 'sec-news'] }])
  })

  it('desligar manda `{ active: false }`, sem `config` nem `position` de carona', async () => {
    const { result } = await montar()
    await act(async () => {
      await result.current.setSectionActive('sec-banners', false)
    })
    expect(escritas('home_sections')[0].update).toEqual({ active: false })
  })

  it('a recusa do banco volta TIPADA e LITERAL, sem reescrita (AD-029, BNR-44, HOME-14)', async () => {
    // A mensagem mudou com a feature 41: o trigger deixou de falar do hero e passou a falar da
    // ÚLTIMA SEÇÃO ATIVA, qualquer que seja o tipo. Ela tem **um dono**, e é o banco — esta camada
    // repassa a frase inteira, e o painel a exibe como veio.
    //
    // A asserção é de igualdade e não de "contém": reescrever a frase aqui, mesmo "melhorando-a",
    // criaria a segunda versão da regra que `AD-029` existe para evitar.
    const doBanco = 'A Home precisa de pelo menos uma secao ativa, e esta e a ultima.'
    writeResponse = { error: { message: doBanco } }
    const { result } = await montar()
    let devolvido: { message: string } | null = null
    await act(async () => {
      devolvido = await result.current.setSectionActive('sec-hero', false)
    })
    expect(devolvido).toEqual({ message: doBanco })
  })

  it('desligar o HERO não é recusado por esta camada — quem decide é o banco (BNR-40)', async () => {
    // O par: enquanto o painel travava o hero por tipo, a recusa nunca chegava a sair. Agora a
    // gravação acontece, e o `null` é a prova de que nada aqui a antecipa.
    const { result } = await montar()
    let devolvido: { message: string } | null = { message: 'nao rodou' }
    await act(async () => {
      devolvido = await result.current.setSectionActive('sec-hero', false)
    })
    expect(devolvido).toBeNull()
    expect(escritas('home_sections')[0].update).toEqual({ active: false })
  })
})

describe('useAdminHomeSections — reordenar (HOME-11)', () => {
  it('o upsert manda `type` junto de id e posição — sem ele o banco devolve 23502', async () => {
    // Medido no probe da T11: o upsert do PostgREST é um `insert ... on conflict`, e `type` é
    // `not null` sem default. `{ id, position }` sozinho falha.
    const { result } = await montar()
    await act(async () => {
      await result.current.reorderSectionsTo([
        { id: 'sec-news', position: 1 },
        { id: 'sec-hero', position: 2 },
      ])
    })
    expect(escritas('home_sections')[0].upsert).toEqual([
      { id: 'sec-news', type: 'newsletter', position: 1 },
      { id: 'sec-hero', type: 'hero', position: 2 },
    ])
  })

  it('manda SÓ as linhas recebidas, com posição absoluta — repetir dá o mesmo payload', async () => {
    const { result } = await montar()
    const movimento = [{ id: 'sec-banners', position: 1 }]
    await act(async () => {
      await result.current.reorderSectionsTo(movimento)
      await result.current.reorderSectionsTo(movimento)
    })
    const [primeira, segunda] = escritas('home_sections')
    expect(primeira.upsert).toEqual([{ id: 'sec-banners', type: 'banner_grid', position: 1 }])
    expect(segunda.upsert).toEqual(primeira.upsert)
  })

  it('lista vazia não vai ao banco', async () => {
    const { result } = await montar()
    await act(async () => {
      expect(await result.current.reorderSectionsTo([])).toBeNull()
    })
    expect(escritas('home_sections')).toHaveLength(0)
  })

  it('id que não está mais na lista é RECUSADO, com motivo — não vai com `type` nulo', async () => {
    const { result } = await montar()
    let devolvido: { message: string } | null = null
    await act(async () => {
      devolvido = await result.current.reorderSectionsTo([{ id: 'sumiu', position: 1 }])
    })
    expect(devolvido!.message).toContain('Recarregue a página')
    expect(escritas('home_sections')).toHaveLength(0)
  })
})

describe('useAdminHomeSections — curar', () => {
  it('grava as linhas com as MESMAS chaves, com `null` explícito no que não se aplica', async () => {
    // `insert` em lote com chaves diferentes devolve `PGRST102 All object keys must match` — medido
    // no probe da T11. Item com destino de coleção e item com destino de caminho têm de ter a mesma
    // forma.
    const { result } = await montar()
    await act(async () => {
      await result.current.curateSection('sec-banners', [
        { category_id: 'cat-1', image_url: 'a.webp', alt: 'Leite materno', label_snapshot: 'Leite materno' },
        { href: '/como-enviar', image_url: 'b.webp', alt: 'Como enviar' },
      ])
    })
    const insercao = escritas('home_section_items').find(c => c.insert !== undefined)!
    // As chaves são as MESMAS nos dois — e a asserção compara o objeto inteiro justamente para uma
    // coluna nova não entrar em um item só (`PGRST102` acontece na gravação, não no diff).
    expect(Object.keys(insercao.insert[0]).sort()).toEqual(Object.keys(insercao.insert[1]).sort())
    expect(insercao.insert).toEqual([
      {
        section_id: 'sec-banners',
        position: 1,
        category_id: 'cat-1',
        product_id: null,
        href: null,
        image_url: 'a.webp',
        image_mobile_url: null,
        alt: 'Leite materno',
        label_snapshot: 'Leite materno',
      },
      {
        section_id: 'sec-banners',
        position: 2,
        category_id: null,
        product_id: null,
        href: '/como-enviar',
        image_url: 'b.webp',
        image_mobile_url: null,
        alt: 'Como enviar',
        label_snapshot: null,
      },
    ])
  })

  it('lista vazia é "voltar ao automático": só o delete, nenhum insert', async () => {
    const { result } = await montar()
    await act(async () => {
      expect(await result.current.curateSection('sec-banners', [])).toBeNull()
    })
    const itens = escritas('home_section_items')
    expect(itens).toHaveLength(1)
    expect(itens[0].delete).toBe(true)
    expect(itens[0].filters).toEqual([{ method: 'eq', args: ['section_id', 'sec-banners'] }])
  })

  it('falha no delete aborta ANTES do insert — nenhuma seção fica sem curadoria por engano', async () => {
    writeResponse = { error: { message: 'network' } }
    const { result } = await montar()
    let devolvido: { message: string } | null = null
    await act(async () => {
      devolvido = await result.current.curateSection('sec-banners', [{ category_id: 'cat-1' }])
    })
    expect(devolvido).toEqual({ message: 'network' })
    expect(escritas('home_section_items').some(c => c.insert !== undefined)).toBe(false)
  })
})

/**
 * `DST-13` — o `delete` passou e o `insert` não.
 *
 * É a única falha desta função que **muda a Home antes de falhar**: a seção fica sem peça nenhuma,
 * some da loja, e a mensagem crua do PostgREST não diz nada disso. A dona salvaria de novo achando
 * que não salvou.
 *
 * A notícia nasce em `curateSection` porque é ela que sabe que o `delete` passou — quem chama
 * recebe um `HomeWriteError` e não tem como distinguir esta falha da do `update`.
 */
describe('useAdminHomeSections — a curadoria que apagou e não reinseriu (DST-13)', () => {
  /**
   * O mesmo respiro do `VIV-10`: `await` sobre o *thenable* do builder chama o `.then` numa
   * microtarefa, então sem isto `escritasPendentes` ainda está vazio quando a asserção roda.
   */
  const respirar = () =>
    act(async () => {
      await new Promise(r => setTimeout(r, 0))
    })

  it('a recusa DIZ que a lista ficou vazia, e o motivo do banco continua inteiro', async () => {
    // As duas metades importam, e por razões diferentes: sem a frase a dona não sabe que a Home
    // mudou; sem o motivo do banco ninguém sabe POR QUE não entrou (permissão? coluna? restrição?).
    segurarEscritas = true
    const { result } = await montar()

    // Capturado num array, e não numa variável: atribuição dentro de callback não é vista pelo
    // fluxo de tipos do TS, e `devolvido.message` viraria erro de compilação sobre `never`.
    const capturado: ({ message: string } | null)[] = []
    let promessa: Promise<{ message: string } | null> = Promise.resolve(null)
    act(() => {
      promessa = result.current.curateSection('sec-banners', [{ product_id: 'p-1' }])
    })
    await respirar()

    // O `delete` passa…
    expect(escritasPendentes).toHaveLength(1)
    escritasPendentes[0]({ error: null })
    await respirar()

    // …e o `insert` falha. É aqui, e só aqui, que a seção fica sem peça.
    expect(escritasPendentes).toHaveLength(2)
    await act(async () => {
      escritasPendentes[1]({ error: { message: 'new row violates row-level security policy' } })
      capturado.push(await promessa)
    })

    expect(capturado[0]!.message).toBe(
      'A lista ficou vazia — as peças foram removidas e as novas não entraram. Salve de novo. ' +
        'Motivo do banco: new row violates row-level security policy',
    )
  })

  it('o par: falha no DELETE não ganha a frase — nada foi removido, a lista está de pé', async () => {
    // Sem este caso, "a recusa diz que a lista ficou vazia" seria verdade num mundo em que toda
    // falha de curadoria dissesse isso — inclusive a que não apagou nada. A frase é sobre a
    // CONSEQUÊNCIA, e prefixá-la onde ela não aconteceu seria mentir na direção contrária.
    //
    // A asserção de igualdade literal está no caso `falha no delete aborta ANTES do insert`, acima
    // (`toEqual({ message: 'network' })`); aqui se mede o que ela não tem.
    writeResponse = { error: { message: 'network' } }
    const { result } = await montar()
    const capturado: ({ message: string } | null)[] = []
    await act(async () => {
      capturado.push(await result.current.curateSection('sec-banners', [{ product_id: 'p-1' }]))
    })
    expect(capturado[0]!.message).not.toContain('ficou vazia')
  })

  it('gravou: nenhuma mensagem — a frase não é decoração da função', async () => {
    const { result } = await montar()
    const capturado: ({ message: string } | null)[] = []
    await act(async () => {
      capturado.push(await result.current.curateSection('sec-banners', [{ product_id: 'p-1' }]))
    })
    expect(capturado[0]).toBeNull()
  })
})

/**
 * `DST-14` — salvar duas vezes o mesmo rascunho produz o mesmo estado.
 *
 * A outra metade (a página **não reescreve** a curadoria quando ela não mudou) está em
 * `AdminHomePage.test.tsx`, no caso `curadoria intocada NÃO é reescrita`. Esta aqui é a que sobra:
 * quando a reescrita acontece mesmo assim, ela **substitui** em vez de somar — e o número de itens
 * é o mesmo das duas vezes.
 *
 * A idempotência é verdadeira por construção (delete-then-insert), e é exatamente por isso que ela
 * precisa de asserção: construção não é asserção, e um `insert` que deixasse de ser precedido pelo
 * `delete` dobraria a lista sem nada quebrar.
 */
describe('useAdminHomeSections — curar duas vezes o mesmo rascunho (DST-14)', () => {
  const rascunho = [
    { product_id: 'p-1', label_snapshot: 'Pingente de cinzas' },
    { product_id: 'p-2', label_snapshot: 'Colar de leite materno' },
  ]

  it('a segunda gravação SUBSTITUI: mesma lista, mesmo número de itens, sem duplicar', async () => {
    const { result } = await montar()

    await act(async () => {
      await result.current.curateSection('sec-banners', rascunho)
    })
    await act(async () => {
      await result.current.curateSection('sec-banners', rascunho)
    })

    const itens = escritas('home_section_items')
    // Duas rodadas de delete-then-insert, nesta ordem. Um `insert` sem o `delete` antes é o que
    // somaria as duas listas.
    expect(itens.map(c => (c.delete ? 'delete' : 'insert'))).toEqual([
      'delete',
      'insert',
      'delete',
      'insert',
    ])

    const insercoes = itens.filter(c => c.insert !== undefined).map(c => c.insert as unknown[])
    // **O número**, asserido: duas peças da primeira vez, duas da segunda — nunca quatro.
    expect(insercoes.map(i => i.length)).toEqual([2, 2])
    expect(insercoes[0]).toEqual(insercoes[1])
    expect((insercoes[1] as { position: number }[]).map(i => i.position)).toEqual([1, 2])
  })
})

/**
 * `DST-15` — duas pessoas salvam a mesma seção.
 *
 * O que a AC promete tem duas metades, e a segunda é a que a dona vê: **a última gravação vence**
 * (a curadoria é substituída inteira, não fundida) e **a tela de quem perdeu passa a mostrar o que
 * o banco devolveu** na releitura que segue a própria gravação.
 *
 * A asserção é de CONTEÚDO, nunca de contagem de chamadas: "reléu" é verdade nos dois mundos — o
 * que separa é a lista com que a tela termina ser a do banco e não a do rascunho local.
 */
describe('useAdminHomeSections — duas admins na mesma seção (DST-15)', () => {
  /** A curadoria que a OUTRA pessoa gravou, e que é o que o banco tem quando esta relê. */
  const doBanco = () =>
    linhas().map(l =>
      l.id === 'sec-banners'
        ? {
            ...l,
            items: [
              {
                id: 'item-da-outra',
                section_id: 'sec-banners',
                position: 1,
                product_id: 'p-da-outra',
                product: { slug: 'peca-da-outra' },
                label_snapshot: 'Peça da outra pessoa',
              },
            ],
          }
        : l,
    )

  it('a perdedora passa a ver o que o BANCO devolveu, não o que ela acabou de mandar', async () => {
    const { result } = await montar()
    // Esta sessão grava a lista dela; entre a gravação e a releitura, a outra pessoa gravou a dela.
    readResponse = { data: doBanco(), error: null }

    await act(async () => {
      await result.current.curateSection('sec-banners', [
        { product_id: 'p-minha', label_snapshot: 'Peça minha' },
      ])
    })

    const banners = result.current.sections.find(s => s.id === 'sec-banners')!
    expect(banners.items.map(i => i.product_id)).toEqual(['p-da-outra'])
    expect(banners.items.map(i => i.label_snapshot)).toEqual(['Peça da outra pessoa'])
    // E o que ESTA sessão mandou não sobrevive na tela — é o ponto inteiro da AC.
    expect(banners.items.some(i => i.product_id === 'p-minha')).toBe(false)
  })

  it('a última gravação VENCE: a segunda curadoria substitui a lista inteira, não funde', async () => {
    // O par do caso acima. Sem ele, "a tela mostra o banco" seria verdade num mundo em que as duas
    // curadorias se somassem no banco — e aí ninguém venceria: as duas ficariam.
    const { result } = await montar()

    await act(async () => {
      await result.current.curateSection('sec-banners', [{ product_id: 'p-da-primeira' }])
    })
    await act(async () => {
      await result.current.curateSection('sec-banners', [{ product_id: 'p-da-segunda' }])
    })

    const insercoes = escritas('home_section_items')
      .filter(c => c.insert !== undefined)
      .map(c => c.insert as { product_id: string }[])
    expect(insercoes).toHaveLength(2)
    // A última gravação manda a lista dela **inteira**, precedida do `delete` que apaga a anterior.
    expect(insercoes[1].map(i => i.product_id)).toEqual(['p-da-segunda'])
    expect(escritas('home_section_items').filter(c => c.delete).length).toBe(2)
  })
})

describe('useAdminHomeSections — salvar conteúdo (HOME-14)', () => {
  it('manda só o `config` da própria linha', async () => {
    const { result } = await montar()
    await act(async () => {
      await result.current.updateSectionConfig('sec-hero', { title_line1: 'Nova chamada' })
    })
    const escrita = escritas('home_sections')[0]
    expect(escrita.update).toEqual({ config: { title_line1: 'Nova chamada' } })
    expect(escrita.filters).toEqual([{ method: 'eq', args: ['id', 'sec-hero'] }])
  })

  it('falha de gravação volta com a mensagem do banco, não engolida', async () => {
    writeResponse = { error: { message: 'PGRST204 column does not exist' } }
    const { result } = await montar()
    let devolvido: { message: string } | null = null
    await act(async () => {
      devolvido = await result.current.updateSectionConfig('sec-hero', { title_line1: 'x' })
    })
    expect(devolvido).toEqual({ message: 'PGRST204 column does not exist' })
  })
})

describe('useAdminHomeSections — o Banner principal (BNR-02, BNR-52)', () => {
  it('a seção nova nasce DESLIGADA, seja qual for o tipo', async () => {
    // `HOME-10`/`BNR-02`: a Adri monta o bloco inteiro antes de a cliente ver, e "publicar" é um
    // clique explícito — não o efeito colateral de criar. Sem isto, acrescentar um Banner principal
    // vazio abriria uma faixa em branco no topo da loja no instante do clique.
    const { result } = await montar()
    await act(async () => {
      await result.current.createSection('hero_carousel')
    })

    const insercao = escritas('home_sections').find(c => c.insert !== undefined)!
    expect(insercao.insert).toMatchObject({ type: 'hero_carousel', active: false })
  })

  it('desligar uma seção NÃO toca os itens dela (BNR-52)', async () => {
    // Religar tem de trazer a campanha de volta inteira. Se `setSectionActive` escrevesse itens, a
    // dona perderia a curadoria ao usar o interruptor — e descobriria só ao religar.
    const { result } = await montar()
    await act(async () => {
      await result.current.setSectionActive('sec-banners', false)
    })

    expect(escritas('home_section_items')).toEqual([])
    const update = escritas('home_sections').find(c => c.update !== undefined)!
    expect(Object.keys(update.update as object)).toEqual(['active'])
  })
})

/**
 * Feature 50 — **a releitura para de apagar a tela** (`VIV-01`, `VIV-07`, `VIV-08`, `VIV-11`).
 *
 * O defeito consertado aqui não é de payload: é de ESTADO. `fetchSections` era ao mesmo tempo
 * "carregar" e "revalidar", e ligava `loading` nas duas. A página troca a árvore inteira por
 * `<TableSkeleton/>` enquanto `loading` — o que desmonta o `<iframe>` da prévia, que remonta
 * recarregando a loja. O que piscava não era o navegador: era o React.
 *
 * Toda asserção abaixo é feita com a leitura **no ar** (`segurarLeituras`). É a única janela em que
 * a diferença entre os dois modos existe; com o dublê respondendo na hora, ela dura zero e qualquer
 * asserção sobre ela passa nos dois mundos.
 */

/** Dispara a ação, espera a releitura pendurar, e devolve o que a tela mostrava naquele instante. */
const enquantoRele = async (
  result: { current: ReturnType<typeof useAdminHomeSections> },
  acao: () => Promise<unknown>,
) => {
  segurarLeituras = true
  loadings = []
  const medido: { loading: boolean | null; ids: string[] } = { loading: null, ids: [] }
  let promessa!: Promise<unknown>

  await act(async () => {
    promessa = acao()
    await waitFor(() => expect(pendentes).toHaveLength(1))
    medido.loading = result.current.loading
    medido.ids = result.current.sections.map(s => s.id)
  })

  return {
    medido,
    responder: async (resposta: Leitura) => {
      await act(async () => {
        pendentes.shift()!(resposta)
        await promessa
      })
    },
  }
}

describe('useAdminHomeSections — a primeira carga NÃO muda (VIV-11)', () => {
  it('`inicial` LIGA o esqueleto, e o `fetch` sem argumento é `inicial`', async () => {
    segurarLeituras = true
    const hook = renderHook(() => useAdminHomeSections())

    await waitFor(() => expect(pendentes).toHaveLength(1))
    expect(hook.result.current.loading).toBe(true)

    await act(async () => {
      pendentes.shift()!({ data: linhas(), error: null })
    })
    await waitFor(() => expect(hook.result.current.loading).toBe(false))
    expect(hook.result.current.sections).toHaveLength(3)
  })

  it('falha na leitura INICIAL esvazia a lista — o comportamento de hoje, e ele fica', async () => {
    // O par de `VIV-07`: na primeira carga não há o que preservar, e uma lista vazia com a faixa de
    // erro por cima é a superfície que a tela já desenha.
    readResponse = { data: null, error: { message: 'permission denied' } }
    const { result } = await montar()
    expect(result.current.error).toBe('permission denied')
    expect(result.current.sections).toEqual([])
  })
})

describe('useAdminHomeSections — toda escrita relê em `revalidar` (VIV-01, L-010)', () => {
  /**
   * **Um caso por porta**, e não um caso por amostra.
   *
   * São seis portas de escrita, e cada uma tem a sua chamada de releitura. Provar uma e confiar nas
   * outras cinco é exatamente o que deixa uma delas para trás sem nada acusar — `L-010`.
   */
  const portas: [string, (h: ReturnType<typeof useAdminHomeSections>) => Promise<unknown>][] = [
    ['createSection', h => h.createSection('newsletter')],
    ['updateSectionConfig', h => h.updateSectionConfig('sec-hero', { title_line1: 'x' })],
    ['setSectionActive', h => h.setSectionActive('sec-news', true)],
    ['deleteSection', h => h.deleteSection('sec-news')],
    ['reorderSectionsTo', h => h.reorderSectionsTo([{ id: 'sec-news', position: 1 }])],
    ['curateSection', h => h.curateSection('sec-banners', [{ category_id: 'cat-1' }])],
  ]

  for (const [nome, acao] of portas) {
    it(nome + ' relê SEM ligar o esqueleto, e sem largar as linhas', async () => {
      const { result } = await montar()
      const { medido, responder } = await enquantoRele(result, () => acao(result.current))

      // A janela exata em que o esqueleto voltaria: a gravação passou, a releitura está no ar.
      expect(medido.loading).toBe(false)
      expect(medido.ids).toEqual(['sec-hero', 'sec-banners', 'sec-news'])
      // A segunda rede: nenhum render intermediário com `loading` ligado.
      expect(loadings).not.toContain(true)

      await responder({ data: linhas(), error: null })
      expect(result.current.loading).toBe(false)
    })
  }

  it('a releitura em modo `revalidar` chamada à mão também não liga o esqueleto', async () => {
    const { result } = await montar()
    const { medido, responder } = await enquantoRele(result, () =>
      result.current.fetchSections('revalidar'),
    )
    expect(medido.loading).toBe(false)
    await responder({ data: linhas(), error: null })
  })
})

describe('useAdminHomeSections — releitura que falha não apaga a tela (VIV-07)', () => {
  it('grava o `error` e MANTÉM as linhas que já estavam lá', async () => {
    const { result } = await montar()
    const { responder } = await enquantoRele(result, () =>
      result.current.setSectionActive('sec-news', true),
    )

    await responder({ data: null, error: { message: 'network' } })

    expect(result.current.error).toBe('network')
    // A asserção que separa os dois mundos: a faixa de erro aparece SOBRE a lista, não no lugar dela.
    expect(result.current.sections.map(s => s.id)).toEqual(['sec-hero', 'sec-banners', 'sec-news'])
  })
})

describe('useAdminHomeSections — duas releituras em voo (VIV-08, A-11)', () => {
  /**
   * O caso que importa é a releitura da **primeira** gravação respondendo **depois** da segunda.
   *
   * Uma asserção de "chamou duas vezes" seria verdadeira nos dois mundos — o que separa é o
   * CONTEÚDO com que a tela termina.
   */
  it('a resposta da PRIMEIRA leitura, chegando por último, é descartada', async () => {
    const { result } = await montar()

    const velha: Leitura = {
      data: [{ id: 'sec-velha', type: 'hero', position: 1, active: true, config: {}, items: [] }],
      error: null,
    }
    const nova: Leitura = {
      data: [
        { id: 'sec-nova', type: 'newsletter', position: 1, active: true, config: {}, items: [] },
      ],
      error: null,
    }

    segurarLeituras = true
    await act(async () => {
      const a = result.current.setSectionActive('sec-news', true)
      await waitFor(() => expect(pendentes).toHaveLength(1))
      const b = result.current.setSectionActive('sec-news', false)
      await waitFor(() => expect(pendentes).toHaveLength(2))

      // A SEGUNDA responde primeiro…
      pendentes[1]!(nova)
      // …e a PRIMEIRA, lenta, chega por último. Sem o token, é ela quem ficaria na tela.
      pendentes[0]!(velha)
      await Promise.all([a, b])
    })

    expect(result.current.sections.map(s => s.id)).toEqual(['sec-nova'])
  })

  it('o ERRO de uma leitura superada também é descartado — nem a lista nem a faixa mudam', async () => {
    const { result } = await montar()
    const boa: Leitura = { data: linhas(), error: null }

    segurarLeituras = true
    await act(async () => {
      const a = result.current.setSectionActive('sec-news', true)
      await waitFor(() => expect(pendentes).toHaveLength(1))
      const b = result.current.setSectionActive('sec-news', false)
      await waitFor(() => expect(pendentes).toHaveLength(2))

      pendentes[1]!(boa)
      pendentes[0]!({ data: null, error: { message: 'a que ficou para trás' } })
      await Promise.all([a, b])
    })

    expect(result.current.error).toBeNull()
    expect(result.current.sections).toHaveLength(3)
  })
})

/**
 * O interruptor otimista — `VIV-10`.
 *
 * O que se prova aqui não é "o estado muda": é **quando** ele muda. As três asserções vivem dentro
 * da janela em que a escrita está no ar, e é por isso que o dublê precisa segurá-la — com a resposta
 * chegando na hora, "otimista" e "pessimista" produzem exatamente a mesma tela no fim.
 */
describe('useAdminHomeSections — o interruptor responde na hora (VIV-10)', () => {
  /** O estado do hook, render a render — a rede que pega o "pisca e volta". */
  const montarObservando = async (id: string) => {
    const vistos: boolean[] = []
    const hook = renderHook(() => {
      const atual = useAdminHomeSections()
      const alvo = atual.sections.find(s => s.id === id)
      if (alvo) vistos.push(alvo.active)
      return atual
    })
    await waitFor(() => expect(hook.result.current.loading).toBe(false))
    return { ...hook, vistos }
  }

  /**
   * Deixa o dublê registrar a escrita.
   *
   * `await` sobre um *thenable* (que é o que o builder do Supabase é) chama o `.then` dele numa
   * **microtarefa**, não na hora. Sem este respiro, `escritasPendentes` ainda está vazio quando a
   * asserção roda — e o teste reprovaria medindo o dublê, não o hook.
   */
  const respirar = () => act(async () => {
    await new Promise(r => setTimeout(r, 0))
  })

  /** A leitura que um banco de verdade devolveria depois da gravação. */
  const leituraCom = (id: string, active: boolean) => ({
    data: linhas().map(l => (l.id === id ? { ...l, active } : l)),
    error: null,
  })

  it('o estado da linha muda ANTES da resposta do servidor', async () => {
    segurarEscritas = true
    const { result } = await montarObservando('sec-hero')
    expect(result.current.sections.find(s => s.id === 'sec-hero')!.active).toBe(true)

    let promessa: Promise<unknown> = Promise.resolve()
    act(() => {
      promessa = result.current.setSectionActive('sec-hero', false)
    })
    await respirar()

    // A escrita está no ar — ninguém respondeu nada ainda.
    expect(escritasPendentes).toHaveLength(1)
    // E o interruptor já se mexeu. Sem o otimismo, esta asserção seria `true` aqui.
    expect(result.current.sections.find(s => s.id === 'sec-hero')!.active).toBe(false)

    readResponse = leituraCom('sec-hero', false)
    await act(async () => {
      escritasPendentes[0]({ error: null })
      await promessa
    })
    expect(result.current.sections.find(s => s.id === 'sec-hero')!.active).toBe(false)
  })

  it('a gravação sai mesmo assim, com `{ active }` e nada mais', async () => {
    // O par do caso acima: otimismo que não grava é uma tela que mente. Sem esta asserção, apagar a
    // chamada ao banco deixaria o primeiro caso verde.
    const { result } = await montarObservando('sec-hero')
    await act(async () => {
      await result.current.setSectionActive('sec-hero', false)
    })
    expect(escritas('home_sections')[0].update).toEqual({ active: false })
  })

  it('a recusa do banco VOLTA o interruptor, e a mensagem é a dele (23514, DST-19)', async () => {
    segurarEscritas = true
    const { result } = await montarObservando('sec-hero')

    let promessa: Promise<{ message: string } | null> = Promise.resolve(null)
    act(() => {
      promessa = result.current.setSectionActive('sec-hero', false)
    })
    await respirar()
    expect(escritasPendentes).toHaveLength(1)
    // Durante o voo o interruptor já está desligado — é o que a dona vê.
    expect(result.current.sections.find(s => s.id === 'sec-hero')!.active).toBe(false)

    const recusa = 'A Home precisa de pelo menos uma seção ativa.'
    let erro: { message: string } | null = null
    await act(async () => {
      escritasPendentes[0]({ error: { message: recusa } })
      erro = await promessa
    })

    // Voltou ao que era, e o motivo sobe LITERAL — esta camada não reescreve a frase do banco.
    expect(result.current.sections.find(s => s.id === 'sec-hero')!.active).toBe(true)
    expect(erro).toEqual({ message: recusa })
  })

  it('a recusa NÃO relê: a tela não pode ser trocada por uma gravação que não aconteceu', async () => {
    writeResponse = { error: { message: 'violates check constraint' } }
    const { result } = await montarObservando('sec-hero')
    const leiturasAntes = calls.filter(c => c.table === 'home_sections' && c.select).length

    await act(async () => {
      await result.current.setSectionActive('sec-hero', false)
    })

    expect(calls.filter(c => c.table === 'home_sections' && c.select).length).toBe(leiturasAntes)
  })

  it('a revalidação que chega depois NÃO pisca o interruptor de volta e de novo', async () => {
    // O defeito que o otimismo cria quando mal feito: ligar, ver ligado, ver desligado por um quadro
    // (a releitura velha), e ver ligado de novo.
    //
    // ⚠️ A janela precisa ser SEGURADA para esta AC existir. Com a releitura respondendo na hora, o
    // estado final é o mesmo nos dois mundos e a asserção seria verdadeira com o otimismo apagado —
    // medido: o mutante sobreviveu à primeira escrita deste caso. Quem separa os dois mundos é o
    // valor **enquanto a releitura está no ar**.
    const { result, vistos } = await montarObservando('sec-hero')
    vistos.length = 0
    segurarLeituras = true

    let promessa: Promise<unknown> = Promise.resolve()
    act(() => {
      promessa = result.current.setSectionActive('sec-hero', false)
    })
    await respirar()

    // A gravação passou; a releitura ainda não voltou. O interruptor já está no estado novo.
    expect(pendentes).toHaveLength(1)
    expect(result.current.sections.find(s => s.id === 'sec-hero')!.active).toBe(false)

    await act(async () => {
      pendentes[0](leituraCom('sec-hero', false))
      await promessa
    })

    // E a sequência inteira: nenhum `true` depois do clique.
    expect(result.current.sections.find(s => s.id === 'sec-hero')!.active).toBe(false)
    expect(vistos.length).toBeGreaterThan(0)
    expect(vistos).not.toContain(true)
  })

  it('id que não está na lista não inventa linha nenhuma', async () => {
    // O recuo do otimismo: sem a guarda, a reconciliação escreveria `active` numa linha que o
    // `map` não encontra — nada quebraria, e a volta em caso de falha ficaria sem referência.
    const { result } = await montarObservando('sec-hero')
    const antes = result.current.sections.map(s => [s.id, s.active])

    writeResponse = { error: { message: 'não existe' } }
    await act(async () => {
      await result.current.setSectionActive('sec-fantasma', true)
    })

    expect(result.current.sections.map(s => [s.id, s.active])).toEqual(antes)
  })
})
