// T24 — quais subcategorias abrem no painel de uma entrada do menu.
//
// **Este arquivo nasceu de uma lacuna de verificação**: o `MenuPanelEditor` era o único componente
// novo do painel sem teste, e a metade da `NAV-23` que diz "a tela SHALL dizer isso em texto" não
// tinha asserção em lugar nenhum do repositório — o literal existia no componente e nenhum teste o
// nomeava. Apagá-lo não quebraria nada, e a dona passaria a ver uma lista de caixas de seleção sem
// nada explicando o que desmarcar significa: a leitura óbvia de "tirar do painel" é "tirar da loja".
//
// As ACs cobertas: `NAV-23` (desmarcar não tira a categoria da loja, e a tela diz isso), `NAV-22`
// (só a filha marcada entra no painel), `NAV-24` (o corte é o tamanho de UMA coluna do mega menu) e
// a curadoria por dispositivo — a caixa lê **só** a booleana da superfície corrente.

import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MENU_PANEL_COLUMN_SIZE } from '@estrelinha/core/menu'
import type { AdminCategory } from '@/entities/category/api/useAdminCategories'

import MenuPanelEditor from './MenuPanelEditor'

const cat = (over: Partial<AdminCategory> & { id: string; name: string }): AdminCategory =>
  ({
    slug: over.slug ?? over.id,
    description: null, image_url: null, banner_url: null, color_accent: null, icon: null,
    active: true, sort_order: 0, parent_id: null, product_count: 0,
    menu_desktop: false, menu_mobile: false, menu_banners: null,
    ...over,
  }) as AdminCategory

const HOST = cat({ id: 'joias', name: 'Joias', menu_desktop: true, menu_mobile: true })

/**
 * Uma árvore com as três combinações que importam: marcada nas duas, **só no computador** e em
 * nenhuma. É o que permite provar que a tela lê a coluna da superfície corrente, e não a outra.
 */
const ARVORE: AdminCategory[] = [
  HOST,
  cat({
    id: 'correntes', name: 'Correntes', parent_id: 'joias', sort_order: 1,
    menu_desktop: true, menu_mobile: true, product_count: 12,
  }),
  cat({
    id: 'pingentes', name: 'Pingentes', parent_id: 'joias', sort_order: 2,
    menu_desktop: true, menu_mobile: false, product_count: 1,
  }),
  cat({ id: 'aneis', name: 'Anéis', parent_id: 'joias', sort_order: 3 }),
  // Filha de OUTRO pai: não pertence a este painel, e é o que impede a contagem de virar
  // "quantas categorias existem".
  cat({ id: 'velas', name: 'Velas', parent_id: 'casa', sort_order: 1, menu_desktop: true }),
]

const onToggleChild = vi.fn<(id: string, next: boolean) => void>()

const montar = (
  surface: 'desktop' | 'mobile' = 'desktop',
  categories: AdminCategory[] = ARVORE,
  host: AdminCategory = HOST,
) => {
  onToggleChild.mockReset()
  return render(
    <MenuPanelEditor
      surface={surface}
      host={host}
      categories={categories}
      onToggleChild={onToggleChild}
    />,
  )
}

const caixaDe = (id: string) => within(screen.getByTestId(`filha-${id}`)).getByRole('checkbox')

// ---------------------------------------------------------------------------
describe('NAV-23 — desmarcar tira do MENU, não da loja, e a tela diz isso', () => {
  it('o texto nomeia onde a categoria continua existindo, e onde ela some', () => {
    // Sem esta frase a tela parece estar oferecendo apagar uma categoria — e o custo do mal-entendido
    // é a dona não usar a curadoria, ou usá-la com medo.
    montar()
    expect(screen.getByText(/continua existindo na loja/)).toBeInTheDocument()
    expect(screen.getByText(/página, busca, rodapé e grade/)).toBeInTheDocument()
    expect(screen.getByText(/só não aparece no menu do computador/)).toBeInTheDocument()
  })

  it('no celular a mesma frase nomeia o CELULAR — a consequência é por dispositivo', () => {
    montar('mobile')
    expect(screen.getByText(/só não aparece no menu do celular/)).toBeInTheDocument()
  })

  it('e diz que o arranjo das colunas é calculado, com a medida que a loja usa', () => {
    // `NAV-24`: o número sai de `MENU_PANEL_COLUMN_SIZE`, nunca escrito à mão aqui — é a mesma medida
    // que decide quando o mega menu abre a segunda coluna.
    montar()
    expect(screen.getByText(new RegExp(`até ${MENU_PANEL_COLUMN_SIZE} por coluna`))).toBeInTheDocument()
  })
})

describe('a caixa lê e escreve SÓ a booleana da superfície corrente', () => {
  it('no computador, "Pingentes" está marcada', () => {
    montar('desktop')
    expect(caixaDe('pingentes')).toBeChecked()
    expect(caixaDe('aneis')).not.toBeChecked()
  })

  it('no celular, a MESMA filha aparece desmarcada — são duas curadorias', () => {
    // Se a tela lesse a coluna errada (ou uma derivada das duas), este caso e o de cima diriam a
    // mesma coisa, e a curadoria por dispositivo seria decorativa.
    montar('mobile')
    expect(caixaDe('pingentes')).not.toBeChecked()
    expect(caixaDe('correntes')).toBeChecked()
  })

  it('marcar emite o id e `true`; desmarcar emite `false` — e nada mais é decidido aqui', () => {
    montar('desktop')

    fireEvent.click(caixaDe('aneis'))
    expect(onToggleChild).toHaveBeenCalledWith('aneis', true)

    fireEvent.click(caixaDe('correntes'))
    expect(onToggleChild).toHaveBeenLastCalledWith('correntes', false)
    expect(onToggleChild).toHaveBeenCalledTimes(2)
  })

  it('o rótulo acessível nomeia o dispositivo em que a caixa mexe', () => {
    // O `aria-label` é o que separa as duas abas para quem usa leitor de tela: sem o dispositivo no
    // nome, as duas telas soam idênticas.
    montar('mobile')
    expect(screen.getByLabelText('Pôr Pingentes no painel do celular')).toBeInTheDocument()
    expect(screen.getByLabelText('Tirar Correntes no painel do celular')).toBeInTheDocument()
  })
})

describe('a contagem "N de M" bate com a ÁRVORE', () => {
  it('conta as filhas deste pai, e só as marcadas na superfície corrente', () => {
    // `M` são as três filhas de "Joias" — "Velas", que pende de outro pai, não entra. `N` são as
    // marcadas no computador: "Correntes" e "Pingentes".
    montar('desktop')
    expect(screen.getByTestId('contador-painel')).toHaveTextContent('2 de 3')
  })

  it('no celular o mesmo painel conta 1 de 3', () => {
    montar('mobile')
    expect(screen.getByTestId('contador-painel')).toHaveTextContent('1 de 3')
  })

  it('a entrada sem filha nenhuma diz que é link direto, sem painel e sem seta (NAV-25)', () => {
    const sozinha = cat({ id: 'datas', name: 'Datas', menu_desktop: true })
    montar('desktop', [sozinha], sozinha)

    expect(screen.getByTestId('painel-sem-filhas')).toHaveTextContent('não tem subcategorias')
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.getByTestId('contador-painel')).toHaveTextContent('0 de 0')
  })

  it('filha inativa aparece na lista, marcada como quem não chega à loja', () => {
    // Ela é editável de propósito: esconder a linha deixaria uma marcação gravada sem onde ser
    // desfeita — o mesmo defeito do banner excedente, na outra tela.
    const inativa = cat({ id: 'antigas', name: 'Antigas', parent_id: 'joias', active: false })
    montar('desktop', [...ARVORE, inativa])

    expect(screen.getByTestId('filha-antigas')).toHaveTextContent('inativa — não aparece na loja')
    expect(screen.getByTestId('contador-painel')).toHaveTextContent('2 de 4')
  })

  it('a contagem de peças de cada filha sai no singular quando é uma', () => {
    montar('desktop')
    expect(screen.getByTestId('filha-correntes')).toHaveTextContent('12 produtos')
    expect(screen.getByTestId('filha-pingentes')).toHaveTextContent('1 produto')
    expect(screen.getByTestId('filha-aneis')).toHaveTextContent('0 produtos')
  })
})

describe('NAV-24 — a lista corta no tamanho de UMA coluna do mega menu', () => {
  const muitas = [
    HOST,
    ...Array.from({ length: MENU_PANEL_COLUMN_SIZE + 2 }, (_, i) =>
      cat({ id: `f-${i}`, name: `Filha ${i}`, parent_id: 'joias', sort_order: i }),
    ),
  ]

  it('mostra as primeiras e oferece as outras, dizendo QUANTAS ficaram', () => {
    montar('desktop', muitas)

    expect(screen.getAllByRole('checkbox')).toHaveLength(MENU_PANEL_COLUMN_SIZE)
    expect(screen.getByTestId('mostrar-todas-filhas')).toHaveTextContent('mostrar as outras 2')
    // O corte é de exibição, não de curadoria: a contagem continua falando da árvore inteira.
    expect(screen.getByTestId('contador-painel')).toHaveTextContent(
      `0 de ${MENU_PANEL_COLUMN_SIZE + 2}`,
    )
  })

  it('o clique abre o resto, e o botão sai de cena', () => {
    montar('desktop', muitas)
    fireEvent.click(screen.getByTestId('mostrar-todas-filhas'))

    expect(screen.getAllByRole('checkbox')).toHaveLength(MENU_PANEL_COLUMN_SIZE + 2)
    expect(screen.queryByTestId('mostrar-todas-filhas')).toBeNull()
  })

  it('com exatamente uma coluna cheia, não há botão nenhum', () => {
    // A borda que produz "mostrar as outras 0", que é uma oferta vazia.
    const cheia = [
      HOST,
      ...Array.from({ length: MENU_PANEL_COLUMN_SIZE }, (_, i) =>
        cat({ id: `c-${i}`, name: `Cheia ${i}`, parent_id: 'joias', sort_order: i }),
      ),
    ]
    montar('desktop', cheia)
    expect(screen.queryByTestId('mostrar-todas-filhas')).toBeNull()
  })

  it('a ordem é a da árvore (`sort_order`), não a de chegada', () => {
    const fora = [
      HOST,
      cat({ id: 'z', name: 'Zebra', parent_id: 'joias', sort_order: 9 }),
      cat({ id: 'a', name: 'Abelha', parent_id: 'joias', sort_order: 1 }),
    ]
    montar('desktop', fora)

    const nomes = screen.getAllByRole('checkbox').map(c => c.getAttribute('aria-label'))
    expect(nomes).toEqual([
      'Pôr Abelha no painel do computador',
      'Pôr Zebra no painel do computador',
    ])
  })
})
