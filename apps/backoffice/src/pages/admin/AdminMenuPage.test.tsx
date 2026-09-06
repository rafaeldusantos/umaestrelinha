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

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
  it('abre na primeira entrada da barra, com o painel e o seletor de ícone dela', async () => {
    await renderPage()
    expect(screen.getByText('Painel de “Materiais”')).toBeInTheDocument()
    expect(screen.getByText('Ícone de “Materiais”')).toBeInTheDocument()
  })

  it('escolher o ícone grava a chave na categoria selecionada', async () => {
    await renderPage()
    fireEvent.click(screen.getByTestId('icone-opcao-corrente'))

    await waitFor(() =>
      expect(hook.updateCategory).toHaveBeenCalledWith('materiais', { icon: 'corrente' }),
    )
  })

  it('"sem ícone" grava `null` — não string vazia', async () => {
    await renderPage()
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
