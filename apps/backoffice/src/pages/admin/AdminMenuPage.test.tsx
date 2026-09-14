// Feature 39 / T26 — a tela onde o menu da loja é decidido, reescrita.
//
// As ACs provadas aqui: `NAV-01` (a gravação é da coluna da superfície corrente, e só dela),
// `NAV-02` (o aviso cruzado nomeia o dispositivo), `NAV-03` (o 6º, o 10º e o 20º entram — não existe
// recusa por contagem), `NAV-05` (a contagem é informação, não cota), `NAV-07` (inativa é marcada),
// `NAV-37` (o alternador troca lista, contagem e editores juntos), `NAV-38`/`NAV-39` (arraste e a
// recusa entre ramos), `NAV-40` (a tela mostra o que a loja renderiza, e **nada** declarado nela) e
// `NAV-41`/`NAV-42` (falha de leitura e de gravação são ditas).
//
// **Os dois casos de `FIXED_ENTRIES` foram SUBSTITUÍDOS, não removidos.** Eles congelavam duas
// entradas escritas no painel — `"Crie o Seu" → /crie-seu-botton` e `"Sobre" → /sobre` — e a
// primeira nunca foi rota declarada: caía na 404 da loja. Onde eles estavam, agora se prova que a
// tela **não declara item nenhum** e que o "Sobre" chega do banco, como item de link.
//
// O dublê dos dois hooks é o que permite provar **o que foi para o banco** sem subir Supabase.

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminCategory } from '@/entities/category/api/useAdminCategories'

const cat = (over: Partial<AdminCategory> & { id: string; name: string }): AdminCategory =>
  ({
    slug: over.slug ?? over.id,
    description: null, image_url: null, banner_url: null, color_accent: null, icon: null,
    active: true, sort_order: 0, parent_id: null, product_count: 0,
    menu_desktop: false, menu_mobile: false, menu_banners: null,
    ...over,
  }) as AdminCategory

/**
 * A árvore no formato do catálogo real: um guarda-chuva com as coleções dentro.
 *
 * "Materiais" está marcado nos dois dispositivos **e** tem duas filhas marcadas — é o caso que prova
 * o papel derivado da árvore (`NAV-06`): as filhas não viram entrada da barra, elas abrem no painel
 * do pai, e por isso não têm linha própria na lista.
 */
const CATALOGO = [
  cat({ id: 'joias', name: 'Joias afetivas', sort_order: 0 }),
  cat({
    id: 'materiais', name: 'Materiais', parent_id: 'joias', sort_order: 1,
    menu_desktop: true, menu_mobile: true, icon: 'gota-afetiva',
  }),
  cat({ id: 'correntes', name: 'Correntes', parent_id: 'joias', sort_order: 2, menu_desktop: true, menu_mobile: true }),
  cat({ id: 'pingentes', name: 'Pingentes', parent_id: 'joias', sort_order: 3, menu_desktop: true, menu_mobile: true }),
  // Ligada só no computador: é a linha que carrega o aviso cruzado (`NAV-02`).
  cat({ id: 'personalizados', name: 'Personalizados', parent_id: 'joias', sort_order: 4, menu_desktop: true }),
  cat({ id: 'datas', name: 'Datas especiais', parent_id: 'joias', sort_order: 5 }),
  cat({
    id: 'cinzas', name: 'Cinzas de cremação', parent_id: 'materiais', sort_order: 1,
    menu_desktop: true, menu_mobile: true, product_count: 84,
  }),
  cat({
    id: 'coto', name: 'Coto umbilical', parent_id: 'materiais', sort_order: 2,
    menu_desktop: true, product_count: 31,
  }),
  cat({ id: 'sangue', name: 'Sangue', parent_id: 'materiais', sort_order: 3, product_count: 2 }),
]

const SOBRE = {
  id: 'sobre', label: 'Sobre', href: '/sobre', icon: null,
  desktop: true, mobile: true, sort_order: 100,
}

const hook = vi.hoisted(() => ({
  updateCategory: vi.fn().mockResolvedValue(null),
  updateSortOrders: vi.fn().mockResolvedValue(null),
  fetchCategories: vi.fn(),
}))

const state = vi.hoisted(() => ({
  categories: [] as unknown[],
  error: null as string | null,
  loading: false,
}))

const db = vi.hoisted(() => ({
  links: [] as unknown[],
  readError: null as { message: string } | null,
  writeError: null as { message: string } | null,
  upsert: vi.fn(),
}))

vi.mock('@/entities/category/api/useAdminCategories', () => ({
  useAdminCategories: () => ({
    categories: state.categories,
    tree: [],
    loading: state.loading,
    error: state.error,
    ...hook,
  }),
}))

vi.mock('@estrelinha/supabase/client', () => {
  const chain = (resultado: () => { data: unknown; error: unknown }) => {
    const alvo: Record<string, unknown> = {}
    for (const metodo of ['select', 'eq', 'ilike', 'order', 'limit', 'in', 'maybeSingle']) {
      alvo[metodo] = () => alvo
    }
    alvo.upsert = (...args: unknown[]) => {
      db.upsert(...args)
      return Promise.resolve({ error: db.writeError })
    }
    alvo.then = (resolve: (v: unknown) => unknown) => Promise.resolve(resultado()).then(resolve)
    return alvo
  }

  return {
    supabase: {
      from: (tabela: string) =>
        chain(() =>
          tabela === 'store_settings'
            ? { data: db.readError ? null : { value: { links: db.links } }, error: db.readError }
            : { data: [], error: null },
        ),
    },
  }
})

vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ toast: vi.fn() }))

/**
 * `VITE_STORE_URL` é fixada aqui, e **não** lida do ambiente.
 *
 * É a lição do `storeOrigin.test.ts` (feature 27): teste que lê `import.meta.env` mede a MÁQUINA, não
 * o código — passa em quem já rodou a loja e falha no CI, onde o `.env` é gitignored. `vitest.config`
 * fixa só as duas do Supabase; esta é da prévia, e só esta tela precisa dela.
 */
vi.mock('@/shared/lib/storeOrigin', () => ({
  STORE_URL: 'http://localhost:8082',
  storeOrigin: () => 'http://localhost:8082',
}))

import AdminMenuPage from './AdminMenuPage'
import { toast } from '@estrelinha/ui/hooks/use-toast'

const renderPage = async (
  categories: AdminCategory[] = CATALOGO,
  over: Partial<typeof state> = {},
) => {
  state.categories = categories
  state.error = over.error ?? null
  state.loading = over.loading ?? false
  const utils = render(
    <MemoryRouter>
      <AdminMenuPage />
    </MemoryRouter>,
  )
  // Os itens de link chegam por consulta própria: sem esta espera a lista ainda é só categorias.
  if (!db.readError) await screen.findByTestId('item-sobre')
  return utils
}

beforeEach(() => {
  for (const fn of Object.values(hook)) fn.mockClear()
  vi.mocked(toast).mockClear()
  db.links = [SOBRE]
  db.readError = null
  db.writeError = null
  db.upsert.mockClear()
})

const switchOf = (id: string) => within(screen.getByTestId(`item-${id}`)).getByRole('switch')

// ---------------------------------------------------------------------------
describe('NAV-40 — a tela mostra o que a LOJA renderiza, e nada declarado nela', () => {
  it('lista as entradas da barra e o item de link, na ordem da loja', async () => {
    await renderPage()

    // A ordem é a de `menuItems`: `sort_order` e, no empate, o nome — e o "Sobre" (100) por último.
    const nomes = screen
      .getAllByTestId(/^item-/)
      .map(no => no.getAttribute('data-testid'))
    expect(nomes).toEqual([
      'item-joias',
      'item-materiais',
      'item-correntes',
      'item-pingentes',
      'item-personalizados',
      'item-datas',
      'item-sobre',
    ])
  })

  it('SUBSTITUI o caso das entradas fixas: nada é declarado no painel', async () => {
    await renderPage()
    // O par do `menuSemItemFixo`, medido pelo DOM: a rota que não existe não aparece em lugar
    // nenhum, e "Sobre" só está aqui porque veio do banco como item de link.
    expect(screen.queryByText(/crie-seu-botton/)).toBeNull()
    expect(screen.queryByText(/fixo/i)).toBeNull()
    expect(screen.getByTestId('item-sobre')).toHaveTextContent('leva para /sobre')
    expect(within(screen.getByTestId('item-sobre')).getByText('Link')).toBeInTheDocument()
  })

  it('SUBSTITUI o caso da prévia desenhada à mão: quem desenha o menu é a LOJA', async () => {
    await renderPage()
    // `MenuBarPreview` era o segundo desenho da barra, com a paleta do admin. O lugar dele agora é
    // um iframe da loja — e `previaUnica.test.ts` recusa a volta do arquivo.
    expect(screen.getByTestId('palco-previa-menu')).toBeInTheDocument()
    expect(document.querySelector('iframe')).toHaveAttribute(
      'src',
      'http://localhost:8082/?preview=1',
    )
  })

  it('filha marcada de pai marcado NÃO tem linha na barra — ela é item do painel (NAV-06)', async () => {
    await renderPage()
    expect(screen.queryByTestId('item-cinzas')).toBeNull()
    // E aparece no editor de painel da entrada selecionada.
    expect(screen.getByTestId('filha-cinzas')).toBeInTheDocument()
  })
})

describe('NAV-05 — a contagem é informação, nunca cota', () => {
  it('diz quantos itens o dispositivo tem, sem "de N vagas"', async () => {
    await renderPage()
    // 4 entradas de categoria + o item de link.
    expect(screen.getByTestId('contador-itens')).toHaveTextContent('5 itens')
    expect(screen.getByTestId('contador-itens')).not.toHaveTextContent('vaga')
  })

  it('um item só diz "1 item", e não "1 itens"', async () => {
    await renderPage(CATALOGO.map(c => ({ ...c, menu_desktop: false })))
    expect(screen.getByTestId('contador-itens')).toHaveTextContent('1 item')
  })
})

describe('NAV-03 — não existe teto: o 6º, o 10º e o 20º entram', () => {
  it('ligar mais uma categoria grava, sem recusa nenhuma', async () => {
    await renderPage()
    fireEvent.click(switchOf('datas'))

    await waitFor(() =>
      expect(hook.updateCategory).toHaveBeenCalledWith('datas', { menu_desktop: true }),
    )
    expect(toast).not.toHaveBeenCalled()
  })

  it('com VINTE ligadas, a vigésima primeira também entra', async () => {
    const muitas = [
      ...CATALOGO,
      ...Array.from({ length: 16 }, (_, i) =>
        cat({ id: `extra-${i}`, name: `Coleção ${i}`, parent_id: 'joias', sort_order: 10 + i, menu_desktop: true }),
      ),
    ]
    await renderPage(muitas)
    expect(screen.getByTestId('contador-itens')).toHaveTextContent('21 itens')

    fireEvent.click(switchOf('datas'))
    await waitFor(() =>
      expect(hook.updateCategory).toHaveBeenCalledWith('datas', { menu_desktop: true }),
    )
    // A prova que importa: nenhuma recusa por contagem existe no caminho.
    expect(toast).not.toHaveBeenCalled()
  })
})

describe('NAV-01 / NAV-02 — duas curadorias, e a linha diz onde a outra está desligada', () => {
  it('ligar no computador grava SÓ `menu_desktop`', async () => {
    await renderPage()
    fireEvent.click(switchOf('datas'))
    await waitFor(() => expect(hook.updateCategory).toHaveBeenCalledWith('datas', { menu_desktop: true }))
    // A prova do "só": o payload fica em igualdade exata, e `menu_mobile` não aparece nele.
    expect(hook.updateCategory.mock.calls[0][1]).toEqual({ menu_desktop: true })
  })

  it('o aviso cruzado NOMEIA o dispositivo em que ela está desligada', async () => {
    await renderPage()
    expect(screen.getByTestId('aviso-personalizados')).toHaveTextContent('desligada no celular')
  })

  it('categoria ligada nos dois NÃO carrega aviso', async () => {
    await renderPage()
    expect(screen.queryByTestId('aviso-correntes')).toBeNull()
  })
})

describe('NAV-37 — o alternador troca lista, contagem e editores juntos', () => {
  it('no celular a lista perde a entrada que só existe no computador', async () => {
    await renderPage()
    expect(switchOf('personalizados')).toBeChecked()

    fireEvent.click(screen.getByTestId('superficie-mobile'))

    expect(screen.getByTestId('contador-itens')).toHaveTextContent('4 itens')
    expect(switchOf('personalizados')).not.toBeChecked()
    // O aviso nomeia o dispositivo onde ela está DESLIGADA, e por isso diz a mesma coisa nas duas
    // abas: é uma propriedade da categoria, não do que está sendo olhado. Fazê-lo mudar de texto com
    // a aba obrigaria a dona a ler duas frases diferentes sobre o mesmo fato.
    expect(screen.getByTestId('aviso-personalizados')).toHaveTextContent('desligada no celular')
  })

  it('o editor de painel acompanha: "Coto umbilical" está no painel do computador e não no do celular', async () => {
    await renderPage()
    expect(screen.getByTestId('contador-painel')).toHaveTextContent('2 de 3')

    fireEvent.click(screen.getByTestId('superficie-mobile'))
    expect(screen.getByTestId('contador-painel')).toHaveTextContent('1 de 3')
  })

  it('ligar no celular grava a coluna do celular', async () => {
    await renderPage()
    fireEvent.click(screen.getByTestId('superficie-mobile'))
    fireEvent.click(switchOf('personalizados'))

    await waitFor(() =>
      expect(hook.updateCategory).toHaveBeenCalledWith('personalizados', { menu_mobile: true }),
    )
  })

  it('e a PRÉVIA acompanha: o quadro passa de 1024 para 390 (NAV-45)', async () => {
    // O alternador é UM só, e ele governa a prévia junto (`NAV-37`). Um segundo alternador dentro do
    // palco deixaria a Adri editar a curadoria do celular olhando a barra do computador.
    await renderPage()
    expect(document.querySelector('iframe')).toHaveAttribute('width', '1024')

    fireEvent.click(screen.getByTestId('superficie-mobile'))

    expect(document.querySelector('iframe')).toHaveAttribute('width', '390')
    expect(document.querySelector('iframe')).toHaveAttribute('data-device', 'mobile')
    expect(screen.getByTestId('dispositivo-previa')).toHaveTextContent('Celular')
  })
})

describe('NAV-07 — categoria marcada e inativa', () => {
  it('é sinalizada como fora da loja', async () => {
    await renderPage(CATALOGO.map(c => (c.id === 'correntes' ? { ...c, active: false } : c)))
    expect(screen.getByTestId('item-correntes')).toHaveTextContent('não aparece na loja')
  })

  it('a contagem mostra o que a loja RENDERIZA — a inativa não entra nela', async () => {
    await renderPage(CATALOGO.map(c => (c.id === 'correntes' ? { ...c, active: false } : c)))
    // Ela continua na lista, com o selo, porque esta é a única tela onde pode ser desligada.
    expect(screen.getByTestId('contador-itens')).toHaveTextContent('4 itens')
    expect(switchOf('correntes')).toBeChecked()
  })
})

describe('NAV-38 / NAV-39 — o arraste', () => {
  const drop = (targetId: string, draggedId: string) =>
    fireEvent.drop(screen.getByTestId(`item-${targetId}`), {
      dataTransfer: { getData: () => draggedId, setData: vi.fn() },
    })

  it('soltar entre irmãs grava apenas as linhas que mudaram de posição', async () => {
    await renderPage()
    drop('correntes', 'pingentes')

    await waitFor(() => expect(hook.updateSortOrders).toHaveBeenCalled())
    const [moves] = hook.updateSortOrders.mock.calls[0] as [{ id: string; sort_order: number }[]]
    expect(moves.length).toBeLessThan(5)
  })

  it('avisa que a ordem vale também para a grade da home e o rodapé', async () => {
    await renderPage()
    drop('correntes', 'pingentes')

    await waitFor(() => expect(toast).toHaveBeenCalled())
    expect(vi.mocked(toast).mock.calls[0][0].description).toContain('grade da home')
  })

  it('soltar em outro ramo NÃO grava — mudar de pai é a tela de Categorias', async () => {
    await renderPage()
    // "cinzas" pende de "Materiais"; "correntes" pende de "Joias afetivas".
    drop('correntes', 'cinzas')

    await waitFor(() => expect(toast).toHaveBeenCalled())
    expect(vi.mocked(toast).mock.calls[0][0]).toMatchObject({ variant: 'destructive' })
    expect(hook.updateSortOrders).not.toHaveBeenCalled()
  })

  it('não há alça de arraste em categoria fora do menu', async () => {
    await renderPage()
    expect(screen.getByTestId('item-correntes')).toHaveAttribute('draggable', 'true')
    expect(screen.getByTestId('item-datas')).toHaveAttribute('draggable', 'false')
  })
})

describe('NAV-41 — falha de leitura é superfície explícita, por FONTE', () => {
  it('categorias: mostra o erro e um botão de tentar de novo', async () => {
    render(
      <MemoryRouter>
        <AdminMenuPage />
      </MemoryRouter>,
    )
    state.categories = []
    state.error = 'Could not find the table'
    render(
      <MemoryRouter>
        <AdminMenuPage />
      </MemoryRouter>,
    )

    const faixa = (await screen.findAllByTestId('menu-erro'))[0]
    expect(faixa).toHaveTextContent('Could not find the table')
    state.error = null
  })

  it('itens de link: a falha da OUTRA fonte tem faixa própria', async () => {
    // Duas leituras, duas faixas: dizer só "não carregou" deixaria a dona sem saber se o problema é
    // a árvore de categorias ou a chave de configuração.
    db.readError = { message: 'permission denied for table store_settings' }
    state.categories = CATALOGO
    state.error = null
    render(
      <MemoryRouter>
        <AdminMenuPage />
      </MemoryRouter>,
    )

    expect(await screen.findByTestId('menu-erro-links')).toHaveTextContent('permission denied')
    // E a lista de categorias continua utilizável — uma fonte quebrada não derruba a outra.
    expect(screen.getByTestId('item-correntes')).toBeInTheDocument()
  })
})

describe('NAV-42 — falha de gravação diz o que não salvou', () => {
  it('o toast nomeia o que falhou', async () => {
    hook.updateCategory.mockResolvedValueOnce({ message: 'PGRST204' })
    await renderPage()

    fireEvent.click(switchOf('datas'))
    await waitFor(() => expect(toast).toHaveBeenCalled())
    expect(vi.mocked(toast).mock.calls[0][0]).toMatchObject({
      title: 'Não foi possível salvar a entrada do menu',
      variant: 'destructive',
    })
  })
})

describe('o painel e o ícone da entrada selecionada', () => {
  /**
   * Vai para a aba do seletor de ícone.
   *
   * Desde a feature 47 os três editores da entrada moram num card com abas (`FOCO-28`): o seletor
   * continua alcançável, um clique atrás. `mouseDown` porque o `Tabs` do Radix ativa no mousedown.
   */
  const abaDoIcone = () => {
    const aba = screen.getByRole('tab', { name: 'Ícone' })
    fireEvent.mouseDown(aba)
    fireEvent.click(aba)
  }

  it('abre na primeira entrada da barra, com o painel e o seletor de ícone dela', async () => {
    await renderPage()
    // A aba inicial é Painel (`FOCO-30`), e o painel é o da entrada selecionada.
    expect(screen.getByText('Painel de “Materiais”')).toBeInTheDocument()

    abaDoIcone()
    expect(screen.getByText('Ícone de “Materiais”')).toBeInTheDocument()
  })

  it('escolher o ícone grava a chave na categoria selecionada', async () => {
    await renderPage()
    abaDoIcone()
    fireEvent.click(screen.getByTestId('icone-opcao-corrente'))

    await waitFor(() =>
      expect(hook.updateCategory).toHaveBeenCalledWith('materiais', { icon: 'corrente' }),
    )
  })

  it('"sem ícone" grava `null` — não string vazia', async () => {
    await renderPage()
    abaDoIcone()
    fireEvent.click(screen.getByTestId('icone-nenhum'))

    await waitFor(() => expect(hook.updateCategory).toHaveBeenCalledWith('materiais', { icon: null }))
  })

  it('marcar uma subcategoria grava a coluna da superfície corrente', async () => {
    await renderPage()
    fireEvent.click(within(screen.getByTestId('filha-sangue')).getByRole('checkbox'))

    await waitFor(() =>
      expect(hook.updateCategory).toHaveBeenCalledWith('sangue', { menu_desktop: true }),
    )
  })

  it('sem nenhuma entrada ligada, a coluna direita explica em vez de ficar vazia', async () => {
    await renderPage(CATALOGO.map(c => ({ ...c, menu_desktop: false, menu_mobile: false })))
    expect(screen.getByTestId('sem-entrada-selecionada')).toHaveTextContent('Ligue uma categoria')
  })
})

describe('o item de link', () => {
  it('ligar/desligar o link grava só a superfície corrente, e a chave `menu` inteira volta', async () => {
    await renderPage()
    fireEvent.click(switchOf('sobre'))

    await waitFor(() => expect(db.upsert).toHaveBeenCalled())
    const [payload] = db.upsert.mock.calls[0] as [{ key: string; value: { links: unknown[] } }]
    expect(payload.key).toBe('menu')
    expect(payload.value.links[0]).toMatchObject({ id: 'sobre', desktop: false, mobile: true })
  })

  it('"Adicionar um link" abre o cadastro', async () => {
    await renderPage()
    fireEvent.click(screen.getByTestId('adicionar-link'))
    expect(await screen.findByText('Adicionar um link ao menu')).toBeInTheDocument()
  })

  it('clicar no nome de um link abre a edição dele', async () => {
    await renderPage()
    fireEvent.click(within(screen.getByTestId('item-sobre')).getByText('Sobre'))
    expect(await screen.findByText('Editar item de link')).toBeInTheDocument()
  })
})

/**
 * O card da entrada e o aviso de gravação — FOCO-29, 31, 33, 34 (feature 47).
 *
 * Os casos renderizam a PÁGINA real: o fio que costuma faltar é o entre o componente e quem o monta
 * — apagar `<MenuEntryEditor/>` daqui tem de reprovar, e é isso que estes casos travam.
 */
describe('AdminMenuPage — o editor da entrada num lugar só', () => {
  it('FOCO-28: com uma entrada selecionada, as três abas aparecem na tela', async () => {
    await renderPage()

    const card = screen.getByTestId('editor-da-entrada')
    expect(within(card).getAllByRole('tab').map(t => t.textContent?.replace(/\d+$/, '').trim())).toEqual([
      'Painel',
      'Banners',
      'Ícone',
    ])
  })

  it('FOCO-29: a coluna da DIREITA tem só o palco — o seletor de ícone saiu de lá', async () => {
    await renderPage()

    const direita = screen.getByTestId('coluna-previa-menu')
    expect(within(direita).getByTestId('palco-previa-menu')).toBeInTheDocument()
    // O seletor de ícone agora mora dentro do card, na coluna da esquerda.
    expect(within(direita).queryByTestId('editor-da-entrada')).toBeNull()
    expect(within(direita).queryByRole('tab')).toBeNull()
  })

  it('FOCO-29: o card fica na coluna da ESQUERDA, junto da lista', async () => {
    await renderPage()

    const esquerda = screen.getByTestId('coluna-entradas')
    expect(within(esquerda).getByTestId('editor-da-entrada')).toBeInTheDocument()
  })

  /**
   * O texto da linha tem TETO.
   *
   * jsdom devolve 0 para toda medida de layout, então o que dá para provar aqui é a **declaração**;
   * a medida veio de navegador, em 390px: a linha do nome saía com 384px dentro de uma coluna de
   * 342, e o `<main>` do painel — que é `overflow-auto` — ganhava rolagem horizontal.
   *
   * A causa é sutil e vale escrita: o botão da linha é um flex COLUNA com `items-start`, e nesse
   * arranjo cada filho é dimensionado pelo próprio conteúdo em vez de esticado. `truncate` não tem
   * de quem cortar, e o `min-w-0` do botão não ajuda — ele dá piso zero ao BOTÃO, e quem estava sem
   * TETO era o filho.
   */
  it('os dois textos da linha têm `max-w-full` — `items-start` não estica ninguém', async () => {
    await renderPage()

    const linha = screen.getByTestId('item-sobre')
    // O botão que abre a entrada: o flex coluna com `items-start`.
    const botao = within(linha)
      .getAllByRole('button')
      .find(b => b.className.includes('flex-col') && b.className.includes('items-start'))

    expect(botao).toBeDefined()

    const filhos = Array.from(botao!.children) as HTMLElement[]
    expect(filhos.length).toBeGreaterThan(0)
    // Token exato: `max-w-full` é substring de nada aqui, mas a régua por partição não tem borda.
    for (const filho of filhos) {
      expect(filho.className.split(/\s+/)).toContain('max-w-full')
    }

    // SENSOR: a régua é de token, não de substring — um `max-w-fu` qualquer não passaria.
    const falso = document.createElement('span')
    falso.className = 'max-w-full-bobagem truncate'
    expect(falso.className.split(/\s+/)).not.toContain('max-w-full')
  })

  it('FOCO-33: "Salvando…" aparece no CABEÇALHO, ao lado do alternador de dispositivo', async () => {
    // Uma gravação que não resolve enquanto o teste olha: é o único jeito de observar o estado
    // intermediário sem cravar tempo.
    let concluir: (v: unknown) => void = () => {}
    hook.updateCategory.mockReturnValueOnce(new Promise(r => { concluir = r }))
    await renderPage()

    fireEvent.click(within(screen.getByTestId('filha-sangue')).getByRole('checkbox'))

    const aviso = await screen.findByTestId('salvando')
    expect(aviso).toHaveTextContent('Salvando…')
    // No cabeçalho: o mesmo contêiner de ações onde vive o alternador de dispositivo.
    expect(aviso.closest('[data-testid="superficie-desktop"]')).toBeNull()
    expect(
      aviso.parentElement?.querySelector('[data-testid="superficie-desktop"]'),
    ).not.toBeNull()

    concluir({ error: null })
  })

  it('FOCO-34: terminado, o aviso SOME do DOM — não fica um espaço reservado', async () => {
    let concluir: (v: unknown) => void = () => {}
    hook.updateCategory.mockReturnValueOnce(new Promise(r => { concluir = r }))
    await renderPage()

    fireEvent.click(within(screen.getByTestId('filha-sangue')).getByRole('checkbox'))
    await screen.findByTestId('salvando')

    concluir({ error: null })

    // Ausência do nó, e não classe de invisibilidade: um `opacity-0` deixaria os vizinhos
    // deslocados para sempre.
    await waitFor(() => expect(screen.queryByTestId('salvando')).toBeNull())
  })

  it('FOCO-33: não sobrou aviso de gravação no FIM do documento', async () => {
    let concluir: (v: unknown) => void = () => {}
    hook.updateCategory.mockReturnValueOnce(new Promise(r => { concluir = r }))
    const { container } = await renderPage()

    fireEvent.click(within(screen.getByTestId('filha-sangue')).getByRole('checkbox'))
    await screen.findByTestId('salvando')

    // Era um `<p>` solto depois de três editores: com o corpo rolando, ele nascia fora da vista.
    const paragrafos = Array.from(container.querySelectorAll('p')).filter(p =>
      p.textContent?.includes('Salvando'),
    )
    expect(paragrafos).toEqual([])

    concluir({ error: null })
  })

  it('FOCO-31: sem entrada selecionada, a mensagem de hoje continua no lugar do card', async () => {
    await renderPage(CATALOGO.map(c => ({ ...c, menu_desktop: false, menu_mobile: false })))

    expect(screen.getByTestId('sem-entrada-selecionada')).toBeInTheDocument()
    expect(screen.queryByTestId('editor-da-entrada')).toBeNull()
  })
})

/**
 * As abas de vista no celular — FOCO-35, 36, 37 (feature 47).
 *
 * jsdom não mede layout, então "apenas a coluna escolhida aparece" se prova pelas **classes
 * declaradas**: `hidden lg:flex` é a forma que esconde abaixo de `lg` e devolve as duas colunas
 * acima dele.
 */
describe('AdminMenuPage — Entradas | Prévia abaixo de `lg`', () => {
  const vistaAba = (qual: 'entradas' | 'previa') => screen.getByTestId(`vista-${qual}`)

  it('FOCO-35: o alternador existe, com as duas vistas', async () => {
    await renderPage()

    const abas = within(screen.getByTestId('abas-vista')).getAllByRole('tab')
    expect(abas.map(a => a.textContent)).toEqual(['Entradas', 'Prévia'])
  })

  it('FOCO-36: ele NÃO existe a partir de `lg` — escolher entre duas coisas à vista', async () => {
    await renderPage()
    // `lg:hidden` é o que faz o alternador sumir onde as duas colunas cabem.
    expect(screen.getByTestId('abas-vista').className).toContain('lg:hidden')
  })

  it('abre em Entradas — é onde se edita', async () => {
    await renderPage()

    expect(vistaAba('entradas')).toHaveAttribute('aria-selected', 'true')
    expect(vistaAba('previa')).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByTestId('coluna-entradas').className).not.toContain('hidden')
    expect(screen.getByTestId('coluna-previa-menu').className).toContain('hidden lg:flex')
  })

  it('escolher Prévia troca a coluna exibida, e voltar desfaz', async () => {
    await renderPage()

    fireEvent.click(vistaAba('previa'))

    expect(vistaAba('previa')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('coluna-previa-menu').className).not.toContain('hidden')
    expect(screen.getByTestId('coluna-entradas').className).toContain('hidden lg:flex')

    fireEvent.click(vistaAba('entradas'))

    expect(screen.getByTestId('coluna-entradas').className).not.toContain('hidden')
    expect(screen.getByTestId('coluna-previa-menu').className).toContain('hidden lg:flex')
  })

  it('os alvos do alternador medem ≥ 44px', async () => {
    await renderPage()

    for (const aba of within(screen.getByTestId('abas-vista')).getAllByRole('tab')) {
      expect(aba.className).toMatch(/(?:^|\s)min-h-11(?![-\w])/)
    }
  })

  /**
   * `FOCO-37` — os dois alternadores desta tela têm formas DIFERENTES.
   *
   * A régua é escrita como **predicado** e chamada duas vezes: pela asserção e pelo sensor. Sem
   * isso, o sensor mediria uma régua parecida com a da asserção em vez da mesma.
   */
  const ehPilulaSegmentada = (classe: string): boolean =>
    /(?:^|\s)bg-muted(?![-\w])/.test(classe) && /rounded/.test(classe)

  const ehBarraSublinhada = (classe: string): boolean =>
    /border-b/.test(classe) && !/(?:^|\s)bg-muted(?![-\w])/.test(classe)

  it('FOCO-37: o de DISPOSITIVO é pílula; o de VISTA é barra sublinhada', async () => {
    await renderPage()

    const dispositivo = screen.getByRole('group', { name: 'Dispositivo do menu' })
    const vista = screen.getByTestId('abas-vista')

    expect(ehPilulaSegmentada(dispositivo.className)).toBe(true)
    expect(ehBarraSublinhada(vista.className)).toBe(true)
    // E não são a mesma forma: um diz o que estou editando, o outro o que estou vendo.
    expect(ehPilulaSegmentada(vista.className)).toBe(false)
  })

  it('SENSOR: dois controles com a MESMA forma reprovam na mesma régua', async () => {
    await renderPage()

    const dispositivo = screen.getByRole('group', { name: 'Dispositivo do menu' }).className
    // O que a tela teria se o alternador de vista tivesse copiado o molde da Home (pílula):
    const vistaComoPilula = 'mb-4 flex gap-1 rounded-xl bg-muted p-1 lg:hidden'

    expect(ehPilulaSegmentada(dispositivo)).toBe(true)
    expect(ehPilulaSegmentada(vistaComoPilula)).toBe(true)
    // As duas pílulas: é exatamente o par que `FOCO-37` recusa.
    expect(ehBarraSublinhada(vistaComoPilula)).toBe(false)
  })
})

/**
 * A altura de tela — FOCO-13, feature 47.
 *
 * O corpo desta tela não tinha altura, então a prévia rolava junto com os três editores e saía da
 * vista justamente enquanto se edita olhando para ela. O molde é o de `/admin/home`, **literalmente**
 * — e é por isso que a régua lê as DUAS páginas do disco e as compara: se uma mudar a altura e a
 * outra não, a régua reprova antes de as duas telas divergirem em silêncio.
 */
describe('AdminMenuPage — o corpo tem altura de tela (FOCO-13)', () => {
  const AQUI = dirname(fileURLToPath(import.meta.url))

  /**
   * O removedor de comentário — linha e bloco na MESMA varredura.
   *
   * As duas páginas CITAM a altura antiga em prosa, para explicar por que ela saiu. Sem isto,
   * `alturaDe` extrai a citação em vez da declaração e acusa o arquivo que está certo — a régua que
   * mede MENÇÃO em vez de USO, que este repositório já pagou duas vezes na feature 47.
   */
  const semComentarios = (texto: string): string =>
    texto.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

  const fonteMenu = semComentarios(readFileSync(resolve(AQUI, 'AdminMenuPage.tsx'), 'utf8'))
  const fonteHome = semComentarios(readFileSync(resolve(AQUI, 'AdminHomePage.tsx'), 'utf8'))

  const alturaDe = (fonte: string) => fonte.match(/lg:h-\[calc\(100vh-[^\]]*\)\]/)?.[0] ?? ''

  it('ÂNCORA: a varredura achou a declaração de altura nas DUAS páginas', () => {
    expect(alturaDe(fonteHome)).not.toBe('')
    expect(alturaDe(fonteMenu)).not.toBe('')
  })

  it('a altura do menu é a MESMA da Home — mesmo molde, um número só', () => {
    expect(alturaDe(fonteMenu)).toBe(alturaDe(fonteHome))
  })

  it('a altura desconta só o `p-6` do `<main>`, e mora na RAIZ das duas telas', () => {
    // O `11rem` de antes era desconto de cabeçalho ADIVINHADO, e o comentário desta tela registrava
    // isso como dívida: os dois `PageHeader` têm subtítulos de comprimentos diferentes, e o desta
    // é o mais longo do painel. Com a altura na raiz e a grade em `flex-1`, o cabeçalho toma o que
    // ele mede — não o que alguém supôs que ele mediria.
    expect(alturaDe(fonteHome)).toBe('lg:h-[calc(100vh-3rem)]')

    for (const fonte of [fonteHome, fonteMenu]) {
      expect(fonte).toContain('lg:flex lg:h-[calc(100vh-3rem)] lg:flex-col')
      expect(fonte).not.toContain('100vh-11rem')
    }
  })

  it('a coluna de edição é 560 nas DUAS telas — mesmo molde, um número só', () => {
    // `FOCO-13` diz que esta tela é o molde literal de `/admin/home`. Duas larguras diferentes
    // seriam o defeito 01 aplicado a layout: nada quebra, e as duas divergem na próxima mexida.
    const larguraDe = (fonte: string) =>
      fonte.match(/lg:grid-cols-\[(\d+)px_minmax\(0,1fr\)\]/)?.[1] ?? ''

    expect(larguraDe(fonteHome)).toBe('560')
    expect(larguraDe(fonteMenu)).toBe(larguraDe(fonteHome))
    // SENSOR: a declaração da `47` reprova na MESMA régua — o extrator acha, e o número é outro.
    expect(larguraDe('<div className="grid gap-6 lg:grid-cols-[440px_minmax(0,1fr)]">')).toBe('440')
  })

  it('a grade toma o que sobra, nas duas telas', () => {
    // `min-h-0` é o que permite à grade encolher abaixo do próprio conteúdo; sem ele ela empurra a
    // raiz para além da janela e as colunas voltam a rolar com o documento.
    const gradeDe = (fonte: string) => fonte.match(/className="grid[^"]*lg:grid-cols-\[[^"]*"/)?.[0] ?? ''

    for (const fonte of [fonteHome, fonteMenu]) {
      const grade = gradeDe(fonte)
      expect(grade).not.toBe('')
      expect(grade).toContain('lg:flex-1')
      expect(grade).toContain('lg:min-h-0')
      // A altura não pode voltar para cá: somada à da raiz, ela descontaria o cabeçalho duas vezes.
      expect(grade).not.toContain('lg:h-[calc(')
    }
  })

  it('a coluna da esquerda rola dentro de si, e o `min-h-0` é o que faz isso valer', () => {
    // Lê as DUAS formas de declarar classe — `className="literal"` e `className={cn('literal', …)}`.
    // A coluna passou à segunda quando ganhou o `hidden lg:flex` das abas de vista (`FOCO-35`), e a
    // âncora abaixo é quem transformou isso em suíte vermelha em vez de régua medindo string vazia.
    const trecho = fonteMenu.match(/data-testid="coluna-entradas"[\s\S]{0,300}?>/)?.[0] ?? ''
    const coluna = [...trecho.matchAll(/'([^']*)'|className="([^"]*)"/g)]
      .map(captura => captura[1] ?? captura[2])
      .join(' ')

    expect(coluna).not.toBe('')
    expect(coluna).toContain('lg:overflow-y-auto')
    // Sem `min-h-0`, um filho de flex/grid não encolhe abaixo do próprio conteúdo: a coluna
    // empurraria a grade em vez de rolar, e o `overflow` nunca dispararia.
    expect(coluna).toContain('min-h-0')
    expect(coluna).toContain('min-w-0')
  })

  it('SENSOR: o removedor de comentário — a régua mede USO, nunca menção', () => {
    expect(alturaDe(semComentarios('// era lg:h-[calc(100vh-11rem)]\nconst x = 1'))).toBe('')
    expect(alturaDe(semComentarios('/* lg:h-[calc(100vh-11rem)] */\nconst x = 1'))).toBe('')
    // Com CRLF, e sem comer a linha seguinte: a declaração de verdade CONTINUA sendo lida.
    expect(alturaDe(semComentarios('// nota\r\n<div className="lg:h-[calc(100vh-3rem)]">'))).toBe(
      'lg:h-[calc(100vh-3rem)]',
    )
  })

  it('SENSOR: a declaração original — grade SEM altura — reprova na mesma régua', () => {
    const antiga = '<div className="grid gap-6 lg:grid-cols-[440px_minmax(0,1fr)]">'
    expect(alturaDe(antiga)).toBe('')
    expect(antiga).not.toContain('lg:overflow-y-auto')
  })

  it('SENSOR: a forma da feature 47 — altura na grade, com o `11rem` — reprova nas mesmas réguas', () => {
    // O sensor passa pelo **extrator**, não compara literais escritos aqui: é o que garante que ele
    // mede a mesma régua da asserção, e não uma parecida.
    const daQuarentaESete = `  return (
    <div>
      <div className="grid gap-6 lg:h-[calc(100vh-11rem)] lg:grid-cols-[440px_minmax(0,1fr)]">`

    expect(alturaDe(daQuarentaESete)).toBe('lg:h-[calc(100vh-11rem)]')
    expect(alturaDe(daQuarentaESete)).not.toBe('lg:h-[calc(100vh-3rem)]')
    expect(daQuarentaESete).not.toContain('lg:flex-col')
  })
})

/**
 * Feature 48 — o editor abre DENTRO da linha clicada (`FOCO-48`, `FOCO-49`).
 *
 * O defeito: o editor da entrada morava ABAIXO da lista. Com 38 categorias no catálogo real isso o
 * punha a ~1.400px de rolagem do clique — escolher outra categoria trocava o conteúdo de um card
 * fora da vista, em silêncio, e a dona não tinha como saber que algo havia mudado.
 *
 * **Estes casos renderizam a PÁGINA, e é o ponto.** Montar `<MenuSlotList editor={<algo/>} />` aqui
 * provaria que a lista sabe hospedar um editor e passaria com `editor={…}` apagado de
 * `AdminMenuPage` — a Adri ficaria sem editor nenhum, com a suíte verde. Quem monta a árvore tem de
 * ser a página.
 */
describe('AdminMenuPage — o painel abre na linha (feature 48)', () => {
  const liDe = (id: string) => screen.getByTestId(`item-${id}`).closest('li')

  it('FOCO-48: o painel é filho do MESMO <li> da entrada selecionada', async () => {
    await renderPage()

    // `materiais` é a primeira entrada de categoria da barra — a seleção padrão da tela.
    const painel = screen.getByTestId('painel-da-entrada')
    expect(liDe('materiais')).toContainElement(painel)
    expect(within(painel).getByTestId('editor-da-entrada')).toBeInTheDocument()
  })

  it('FOCO-48: o editor está DENTRO da lista — não é mais um card irmão abaixo dela', async () => {
    await renderPage()

    // A régua que mata a forma antiga: fora da `<ul>`, o editor volta a ser o card de baixo.
    const lista = screen.getByTestId('item-materiais').closest('ul')
    expect(lista).toContainElement(screen.getByTestId('editor-da-entrada'))
  })

  it('FOCO-48: clicar em outra entrada MOVE o painel para o <li> dela', async () => {
    await renderPage()
    fireEvent.click(within(screen.getByTestId('item-joias')).getByText('Joias afetivas'))

    const painel = screen.getByTestId('painel-da-entrada')
    expect(liDe('joias')).toContainElement(painel)
    expect(liDe('materiais')).not.toContainElement(painel)
  })

  it('FOCO-48: há UM painel aberto, nunca dois', async () => {
    await renderPage()
    fireEvent.click(within(screen.getByTestId('item-joias')).getByText('Joias afetivas'))

    expect(screen.getAllByTestId('painel-da-entrada')).toHaveLength(1)
    expect(screen.getAllByTestId('editor-da-entrada')).toHaveLength(1)
  })

  it('FOCO-48: trocar de entrada leva o painel à vista, com `block: nearest`', async () => {
    // **jsdom não implementa `scrollIntoView`** — sem este dublê o método é `undefined`, o `?.` do
    // código engole a chamada e o caso mediria a ausência de layout em vez da regra.
    const scrollIntoView = vi.fn()
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      value: scrollIntoView,
      writable: true,
      configurable: true,
    })

    await renderPage()
    scrollIntoView.mockClear()
    fireEvent.click(within(screen.getByTestId('item-joias')).getByText('Joias afetivas'))

    // `nearest` e não `start`: com a linha já visível não há pulo nenhum — rolar sempre faria a
    // lista dar um salto a cada clique, que é trocar um defeito por outro.
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', behavior: 'smooth' })
  })

  it('FOCO-49: o aviso de vazio é da CURADORIA, e some assim que UMA categoria está na barra', async () => {
    await renderPage()

    // Com entrada na barra não há aviso — e o painel existe no lugar dele.
    expect(screen.queryByTestId('sem-entrada-selecionada')).toBeNull()
    expect(screen.getByTestId('painel-da-entrada')).toBeInTheDocument()
  })

  it('FOCO-49: sem nenhuma categoria na barra, o aviso aparece e não há painel', async () => {
    await renderPage(CATALOGO.map(c => ({ ...c, menu_desktop: false, menu_mobile: false })))

    expect(screen.getByTestId('sem-entrada-selecionada')).toHaveTextContent('Ligue uma categoria')
    expect(screen.queryByTestId('painel-da-entrada')).toBeNull()
    expect(screen.queryByTestId('editor-da-entrada')).toBeNull()
  })
})

// ───────────────────────────────────────────────────────────────────────────
// VIV-02, VIV-03, VIV-04 — `/admin/menu` para de recarregar (feature 50)
// ───────────────────────────────────────────────────────────────────────────
//
// **A AC central é `VIV-03`, e só uma asserção a prova: IDENTIDADE DE NÓ.** `toBeInTheDocument`
// passa nos dois mundos — o iframe remontado também está presente, e é ele que recarrega a loja e
// perde a posição de rolagem. O que separa é `expect(depois).toBe(antes)`.
//
// Aqui o `<iframe>` é o de verdade: `MenuLivePreview` não é dublado nesta suíte.

describe('AdminMenuPage — gravar não desmonta a tela (VIV-02, VIV-03)', () => {
  it('ligar uma categoria mantém o MESMO nó `<iframe>` — não remonta, não recarrega', async () => {
    await renderPage()
    const antes = document.querySelector('iframe')
    expect(antes).not.toBeNull()

    fireEvent.click(switchOf('personalizados'))

    await waitFor(() => expect(hook.updateCategory).toHaveBeenCalled())
    expect(document.querySelector('iframe')).toBe(antes)
  })

  it('e o esqueleto NÃO volta: as duas colunas continuam de pé depois da gravação', async () => {
    await renderPage()

    fireEvent.click(switchOf('personalizados'))
    await waitFor(() => expect(hook.updateCategory).toHaveBeenCalled())

    expect(screen.queryByTestId('skeleton-row')).toBeNull()
    expect(screen.getByTestId('coluna-entradas')).toBeInTheDocument()
    expect(screen.getByTestId('coluna-previa-menu')).toBeInTheDocument()
  })

  it('o par: na PRIMEIRA carga o esqueleto continua aparecendo (VIV-11)', async () => {
    // Sem ele, "não mostra esqueleto" seria verdade num mundo em que o esqueleto deixou de existir.
    state.categories = CATALOGO
    state.error = null
    state.loading = true
    render(
      <MemoryRouter>
        <AdminMenuPage />
      </MemoryRouter>,
    )

    expect(screen.getAllByTestId('skeleton-row').length).toBeGreaterThan(0)
    expect(screen.queryByTestId('coluna-entradas')).toBeNull()
  })

  it('reordenar também não remonta a prévia', async () => {
    await renderPage()
    const antes = document.querySelector('iframe')

    fireEvent.drop(screen.getByTestId('item-correntes'), {
      dataTransfer: { getData: () => 'pingentes', setData: vi.fn() },
    })

    await waitFor(() => expect(hook.updateSortOrders).toHaveBeenCalled())
    expect(document.querySelector('iframe')).toBe(antes)
  })
})

describe('AdminMenuPage — `Salvando…` dá lugar a `Salvo` (VIV-04)', () => {
  it('terminado, o aviso vira `Salvo` e some sozinho em ~2 s', async () => {
    vi.useFakeTimers()
    try {
      let concluir: (v: unknown) => void = () => {}
      hook.updateCategory.mockReturnValueOnce(new Promise(r => { concluir = r }))

      state.categories = CATALOGO
      state.error = null
      state.loading = false
      render(
        <MemoryRouter>
          <AdminMenuPage />
        </MemoryRouter>,
      )
      await act(async () => {})

      fireEvent.click(switchOf('personalizados'))
      expect(screen.getByTestId('salvando')).toHaveTextContent('Salvando…')
      // Nunca os dois ao mesmo tempo: a vaga é uma só.
      expect(screen.queryByTestId('salvo')).toBeNull()

      await act(async () => {
        concluir(null)
      })

      expect(screen.queryByTestId('salvando')).toBeNull()
      expect(screen.getByTestId('salvo')).toHaveTextContent('Salvo')

      // Um instante antes ele ainda está lá — senão "some em 2 s" valeria para qualquer duração.
      act(() => {
        vi.advanceTimersByTime(1900)
      })
      expect(screen.getByTestId('salvo')).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(200)
      })
      expect(screen.queryByTestId('salvo')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('gravação RECUSADA não mostra `Salvo` — o selo é recibo, não otimismo', async () => {
    hook.updateCategory.mockResolvedValueOnce({ message: 'permission denied' })
    await renderPage()

    fireEvent.click(switchOf('personalizados'))

    await waitFor(() => expect(hook.updateCategory).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByTestId('salvando')).toBeNull())
    expect(screen.queryByTestId('salvo')).toBeNull()
  })

  it('os dois selos declaram a transição COM o par `motion-reduce:` (ANI-05, L-036)', async () => {
    let concluir: (v: unknown) => void = () => {}
    hook.updateCategory.mockReturnValueOnce(new Promise(r => { concluir = r }))
    await renderPage()

    fireEvent.click(switchOf('personalizados'))
    const emCurso = (await screen.findByTestId('salvando')).className.split(/\s+/)
    expect(emCurso).toContain('transition-opacity')
    expect(emCurso).toContain('motion-reduce:transition-none')

    await act(async () => {
      concluir(null)
    })

    const pronto = screen.getByTestId('salvo').className.split(/\s+/)
    expect(pronto).toContain('transition-opacity')
    expect(pronto).toContain('motion-reduce:transition-none')
  })

  it('o `Salvo` fica no CABEÇALHO, na vaga do `Salvando…` — ao lado do alternador (FOCO-33)', async () => {
    let concluir: (v: unknown) => void = () => {}
    hook.updateCategory.mockReturnValueOnce(new Promise(r => { concluir = r }))
    await renderPage()

    fireEvent.click(switchOf('personalizados'))
    const vagaDoSalvando = (await screen.findByTestId('salvando')).parentElement

    await act(async () => {
      concluir(null)
    })

    const selo = screen.getByTestId('salvo')
    expect(selo.parentElement).toBe(vagaDoSalvando)
    expect(selo.parentElement?.querySelector('[data-testid="superficie-desktop"]')).not.toBeNull()
  })
})
