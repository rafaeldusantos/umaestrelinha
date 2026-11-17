// Feature 86, T15 — editar um item do menu.
//
// ACs: `MNM-14` (o interruptor "Usar o nome da categoria", o nome próprio com contador de 40),
// `MNM-16` (vazio e só espaços recusados com motivo, sem chamar `onSave`), `MNM-17` (o ícone do item
// principal), `MNM-26` (o item de submenu também tem o interruptor, e não tem ícone) e `MNM-33` (a
// caixa de banners do item principal, de categoria ou de link).

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MenuBanners, MenuCategory, MenuNode, MenuRootNode } from '@estrelinha/core/menu'

vi.mock('@estrelinha/supabase/client', () => {
  const alvo: Record<string, unknown> = {}
  for (const metodo of ['select', 'eq', 'ilike', 'order', 'limit', 'in']) alvo[metodo] = () => alvo
  alvo.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve)
  return { supabase: { from: () => alvo, storage: { from: () => ({ upload: vi.fn() }) } } }
})

/** Q05: o envio da arte e o apagar do órfão, dublados — o editor decide QUANDO apagar. */
const storage = vi.hoisted(() => ({
  enviadas: 0,
  apagadas: [] as string[],
}))
vi.mock('../lib/uploadBannerImage', () => ({
  BANNER_BUCKET: 'home-images',
  BANNER_FOLDER: 'menu',
  uploadBannerImage: async () => {
    storage.enviadas += 1
    return { url: `http://storage.local/home-images/menu/arte-${storage.enviadas}.webp`, error: null }
  },
  deleteBannerImage: async (url: string) => {
    storage.apagadas.push(url)
  },
}))

import MenuItemEditor from './MenuItemEditor'
import { bannersGravados } from '../model/bannersGravados'

const CATEGORIAS: MenuCategory[] = [
  { id: 'joias', name: 'Joias', slug: 'joias', parent_id: null, sort_order: 0, active: true },
  { id: 'aneis', name: 'Anéis', slug: 'aneis', parent_id: 'joias', sort_order: 1, active: true },
]

const raizDeCategoria = (over: Partial<MenuRootNode> = {}): MenuRootNode => ({
  id: 'n-joias',
  target: { kind: 'category', category_id: 'joias' },
  label: null,
  desktop: true,
  mobile: true,
  icon: 'corrente',
  banners: { desktop: [{ target: { kind: 'category', id: 'aneis' } }], mobile: [] },
  children: [],
  ...over,
})

const raizDeLink = (over: Partial<MenuRootNode> = {}): MenuRootNode => ({
  id: 'n-sobre',
  target: { kind: 'link', href: '/sobre' },
  label: 'Sobre',
  desktop: true,
  mobile: true,
  icon: null,
  banners: null,
  children: [],
  ...over,
})

const filho = (over: Partial<MenuNode> = {}): MenuNode => ({
  id: 'n-aneis',
  target: { kind: 'category', category_id: 'aneis' },
  label: null,
  desktop: true,
  mobile: true,
  ...over,
})

const onSave = vi.fn<
  (e: { label: string | null; icon?: string | null; labelColors?: { bar: string | null; sheet: string | null } }) => Promise<string | null>
>()
const onSaveBanners = vi.fn().mockResolvedValue(null)
const onRemove = vi.fn()
const onOpenChange = vi.fn()

const Palco = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
)

const montar = (node: MenuNode | MenuRootNode, ehRaiz = true) =>
  render(
    <Palco>
      <MenuItemEditor
        open
        onOpenChange={onOpenChange}
        node={node}
        ehRaiz={ehRaiz}
        categories={CATEGORIAS}
        onSave={onSave}
        onSaveBanners={onSaveBanners}
        onRemove={onRemove}
      />
    </Palco>,
  )

const salvar = () => fireEvent.click(screen.getByTestId('editor-salvar'))

beforeEach(() => {
  storage.enviadas = 0
  storage.apagadas = []
  onSave.mockReset().mockResolvedValue(null)
  onSaveBanners.mockClear()
  onRemove.mockReset()
  onOpenChange.mockReset()
})

describe('MNM-14 — "Usar o nome da categoria" e o nome próprio', () => {
  it('item de categoria sem rótulo abre com o interruptor LIGADO, mostrando o nome atual', () => {
    montar(raizDeCategoria())
    expect(screen.getByTestId('usar-nome-da-categoria')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText(/Hoje: “Joias”/)).toBeInTheDocument()
    expect(screen.queryByTestId('nome-do-item')).toBeNull()
  })

  it('com o interruptor ligado, salvar grava `label: null` — nunca uma cópia do nome', async () => {
    montar(raizDeCategoria({ label: 'Joias da casa' }))
    expect(screen.getByTestId('usar-nome-da-categoria')).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(screen.getByTestId('usar-nome-da-categoria'))
    salvar()
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave.mock.calls[0][0]).toEqual({ label: null, icon: 'corrente', labelColors: { bar: null, sheet: null } })
  })

  it('desligar abre o nome próprio, pré-preenchido com o nome da categoria, com contador de 40', () => {
    montar(raizDeCategoria())
    fireEvent.click(screen.getByTestId('usar-nome-da-categoria'))
    expect(screen.getByTestId('nome-do-item')).toHaveValue('Joias')
    expect(screen.getByTestId('contador-nome-item')).toHaveTextContent('5/40')
  })

  it('o nome próprio é gravado aparado', async () => {
    montar(raizDeCategoria())
    fireEvent.click(screen.getByTestId('usar-nome-da-categoria'))
    fireEvent.change(screen.getByTestId('nome-do-item'), { target: { value: '  Para presentear ' } })
    salvar()
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave.mock.calls[0][0]).toEqual({ label: 'Para presentear', icon: 'corrente', labelColors: { bar: null, sheet: null } })
  })

  it('item de LINK não tem o interruptor: o nome é sempre próprio', () => {
    montar(raizDeLink())
    expect(screen.queryByTestId('usar-nome-da-categoria')).toBeNull()
    expect(screen.getByTestId('nome-do-item')).toHaveValue('Sobre')
  })
})

describe('MNM-16 — vazio e só espaços são recusados, e nada é gravado', () => {
  it('categoria com nome próprio só de espaços', async () => {
    montar(raizDeCategoria({ label: 'X' }))
    fireEvent.change(screen.getByTestId('nome-do-item'), { target: { value: '   ' } })
    salvar()
    expect(await screen.findByTestId('editor-recusa')).toHaveTextContent(
      'Digite o nome do item, ou use o nome da categoria.',
    )
    expect(onSave).not.toHaveBeenCalled()
  })

  it('link com nome vazio', async () => {
    montar(raizDeLink())
    fireEvent.change(screen.getByTestId('nome-do-item'), { target: { value: '' } })
    salvar()
    expect(await screen.findByTestId('editor-recusa')).toHaveTextContent('Digite o nome do item no menu.')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('41 caracteres é recusado pela régua de core', async () => {
    montar(raizDeLink())
    fireEvent.change(screen.getByTestId('nome-do-item'), { target: { value: 'a'.repeat(41) } })
    salvar()
    expect(await screen.findByTestId('editor-recusa')).toHaveTextContent('até 40 caracteres')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('40 caracteres passa', async () => {
    montar(raizDeLink())
    fireEvent.change(screen.getByTestId('nome-do-item'), { target: { value: 'a'.repeat(40) } })
    salvar()
    await waitFor(() => expect(onSave).toHaveBeenCalled())
  })

  it('a falha da gravação aparece no editor e ele continua aberto', async () => {
    onSave.mockResolvedValueOnce('O menu mudou em outra janela — recarregue.')
    montar(raizDeLink())
    salvar()
    expect(await screen.findByTestId('editor-recusa')).toHaveTextContent('O menu mudou em outra janela')
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('gravou: o editor fecha', async () => {
    montar(raizDeLink())
    salvar()
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })
})

describe('MNM-17 — o ícone do item principal', () => {
  it('escolher outro ícone entra no patch', async () => {
    montar(raizDeCategoria())
    fireEvent.click(screen.getByTestId('icone-opcao-gota-afetiva'))
    salvar()
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave.mock.calls[0][0]).toEqual({ label: null, icon: 'gota-afetiva', labelColors: { bar: null, sheet: null } })
  })

  it('"Sem ícone" grava `null`', async () => {
    montar(raizDeCategoria())
    fireEvent.click(screen.getByTestId('icone-nenhum'))
    salvar()
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave.mock.calls[0][0]).toEqual({ label: null, icon: null, labelColors: { bar: null, sheet: null } })
  })
})

describe('a cor do texto do item principal', () => {
  const corBarra = () => screen.getByLabelText('Na barra do computador (fundo escuro)')
  const corFolha = () => screen.getByLabelText('Na lista do celular (fundo branco)')
  const tem = (el: Element, t: string) => el.className.split(/\s+/).includes(t)

  it('mostra os dois campos, cada um com o seletor de cor, o código e "Usar a cor padrão"', () => {
    montar(raizDeCategoria())
    expect(screen.getByText('Cor do texto')).toBeInTheDocument()
    expect(corBarra()).toHaveValue('')
    expect(corFolha()).toHaveValue('')
    for (const id of ['cor-barra', 'cor-folha']) {
      const seletor = screen.getByTestId(`${id}-seletor`)
      expect(seletor).toHaveAttribute('type', 'color')
      expect(tem(seletor, 'h-11') && tem(seletor, 'w-11') && tem(seletor, 'border-input')).toBe(true)
      expect(screen.getByTestId(`${id}-padrao`)).toHaveTextContent('Usar a cor padrão')
    }
    expect(tem(corBarra(), 'h-11') && tem(corBarra(), 'border-input')).toBe(true)
    expect(tem(corFolha(), 'h-11') && tem(corFolha(), 'border-input')).toBe(true)
  })

  it('abre com as cores gravadas do item', () => {
    montar(raizDeCategoria({ labelColors: { bar: '#F7F3EC', sheet: '#23303A' } }))
    expect(corBarra()).toHaveValue('#F7F3EC')
    expect(corFolha()).toHaveValue('#23303A')
  })

  it('grava as duas cores no patch, junto do nome e do ícone', async () => {
    montar(raizDeCategoria())
    fireEvent.change(corBarra(), { target: { value: '#f7f3ec' } })
    fireEvent.change(screen.getByTestId('cor-folha-seletor'), { target: { value: '#23303a' } })
    salvar()
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave.mock.calls[0][0]).toEqual({
      label: null,
      icon: 'corrente',
      labelColors: { bar: '#F7F3EC', sheet: '#23303A' },
    })
  })

  it('mostra a medida de contraste de core: verde quando passa, vermelha com a frase quando não', () => {
    montar(raizDeCategoria())
    fireEvent.change(corBarra(), { target: { value: '#F7F3EC' } })
    const verde = screen.getByTestId('cor-barra-medida')
    expect(verde).toHaveTextContent('8,4:1')
    expect(tem(verde, 'text-emerald-700')).toBe(true)

    fireEvent.change(corBarra(), { target: { value: '#B8945F' } })
    const vermelha = screen.getByTestId('cor-barra-medida')
    expect(vermelha).toHaveTextContent('3,3:1')
    expect(vermelha).toHaveTextContent('Padrão')
    expect(tem(vermelha, 'text-destructive')).toBe(true)

    fireEvent.change(corFolha(), { target: { value: '#777777' } })
    expect(screen.getByTestId('cor-folha-medida')).toHaveTextContent('4,4:1')
  })

  it('a cor ilegível é recusada antes da rede, com a razão e a medida', async () => {
    montar(raizDeCategoria())
    fireEvent.change(corBarra(), { target: { value: '#222222' } })
    salvar()
    const recusa = await screen.findByTestId('editor-recusa')
    expect(recusa).toHaveTextContent('1,1:1')
    expect(recusa).toHaveTextContent('Black Friday')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('código fora do formato #RRGGBB não é gravado como "sem cor" escondido: recusa e pede o formato', async () => {
    montar(raizDeCategoria())
    fireEvent.change(corFolha(), { target: { value: '#12' } })
    salvar()
    expect(await screen.findByTestId('editor-recusa')).toHaveTextContent('#RRGGBB')
    expect(onSave).not.toHaveBeenCalled()
  })

  describe('apagar o código inteiro é "sem cor" naquela superfície', () => {
    /**
     * Os dois jeitos de o campo ficar vazio: o teclado (o navegador troca o valor e avisa) e o
     * preenchimento por fora — autopreenchimento, automação —, que escreve `value` direto no campo e
     * só depois dispara o `input`.
     */
    const apagarPeloTeclado = (campo: HTMLElement) => fireEvent.change(campo, { target: { value: '' } })
    const apagarPorFora = (campo: HTMLElement) => {
      ;(campo as HTMLInputElement).value = ''
      fireEvent.input(campo)
    }

    for (const [como, apagar] of [
      ['pelo teclado', apagarPeloTeclado],
      ['por preenchimento vazio', apagarPorFora],
    ] as const) {
      it(`${como}: o campo fica vazio, sem a recusa da cor apagada e com o seletor no preto da lista`, () => {
        montar(raizDeCategoria())
        fireEvent.change(corFolha(), { target: { value: '#E8C77A' } })
        expect(screen.getByTestId('cor-folha-medida')).toHaveTextContent('1,6:1')

        apagar(corFolha())

        expect(corFolha()).toHaveValue('')
        expect(screen.queryByTestId('cor-folha-medida')).toBeNull()
        expect(screen.getByTestId('cor-folha-seletor')).toHaveValue('#000000')
        expect(screen.getByTestId('cor-folha-padrao')).toBeDisabled()
      })

      it(`${como}: digitar no OUTRO campo não devolve o código apagado`, () => {
        montar(raizDeCategoria())
        fireEvent.change(corFolha(), { target: { value: '#E8C77A' } })
        apagar(corFolha())

        fireEvent.change(corBarra(), { target: { value: '#F' } })

        expect(corFolha()).toHaveValue('')
        expect(screen.queryByTestId('cor-folha-medida')).toBeNull()
        expect(screen.getByTestId('cor-folha-seletor')).toHaveValue('#000000')
      })

      it(`${como}: Salvar grava a lista sem cor, e a barra com a que ficou`, async () => {
        montar(raizDeCategoria({ labelColors: { bar: '#F7F3EC', sheet: '#23303A' } }))
        fireEvent.change(corFolha(), { target: { value: '#E8C77A' } })
        apagar(corFolha())
        salvar()
        await waitFor(() => expect(onSave).toHaveBeenCalled())
        expect(onSave.mock.calls[0][0]).toEqual({
          label: null,
          icon: 'corrente',
          labelColors: { bar: '#F7F3EC', sheet: null },
        })
      })

      it(`${como}: apagadas as duas, o item fica sem cor nenhuma`, async () => {
        montar(raizDeCategoria({ labelColors: { bar: '#F7F3EC', sheet: '#23303A' } }))
        apagar(corBarra())
        apagar(corFolha())
        expect(screen.getByTestId('cor-barra-seletor')).toHaveValue('#ffffff')
        salvar()
        await waitFor(() => expect(onSave).toHaveBeenCalled())
        expect(onSave.mock.calls[0][0]).toEqual({
          label: null,
          icon: 'corrente',
          labelColors: { bar: null, sheet: null },
        })
      })
    }
  })

  it('"Usar a cor padrão" volta a `null`', async () => {
    montar(raizDeCategoria({ labelColors: { bar: '#F7F3EC', sheet: '#23303A' } }))
    fireEvent.click(screen.getByTestId('cor-barra-padrao'))
    expect(corBarra()).toHaveValue('')
    expect(screen.queryByTestId('cor-barra-medida')).toBeNull()
    salvar()
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave.mock.calls[0][0]).toEqual({
      label: null,
      icon: 'corrente',
      labelColors: { bar: null, sheet: '#23303A' },
    })
  })
})

describe('MNM-26 — item de submenu', () => {
  it('tem "Usar o nome da categoria", e NÃO tem ícone nem banners', () => {
    montar(filho(), false)
    expect(screen.getByTestId('usar-nome-da-categoria')).toBeInTheDocument()
    expect(screen.queryByTestId('busca-icone')).toBeNull()
    expect(screen.queryByTestId('caixa-banners')).toBeNull()
  })

  it('não tem a cor do texto: o submenu fica no padrão', () => {
    montar(filho(), false)
    expect(screen.queryByText('Cor do texto')).toBeNull()
    expect(screen.queryByTestId('cor-barra-seletor')).toBeNull()
    expect(screen.queryByTestId('cor-folha-seletor')).toBeNull()
  })

  it('o patch do filho não leva `icon` nem `labelColors`', async () => {
    montar(filho(), false)
    salvar()
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave.mock.calls[0][0]).toEqual({ label: null })
  })
})

describe('MNM-33 — a caixa de banners', () => {
  it('mostra a contagem por dispositivo', () => {
    montar(raizDeCategoria())
    expect(screen.getByTestId('contagem-banners')).toHaveTextContent('1 no computador · 0 no celular')
  })

  // FOCO-32 (feature 47), portado do `MenuEntryEditor` apagado na T20 da 86: a contagem e o dado
  // contado saem do MESMO predicado. Uma segunda leitura aqui diria "2" com o editor mostrando 3.
  it('o número exibido é EXATAMENTE o que `bannersGravados` devolve, nos dois dispositivos', () => {
    const banners: MenuBanners = {
      desktop: [{ target: { kind: 'category', id: 'aneis' } }, { target: { kind: 'category', id: 'joias' } }],
      mobile: [{ target: { kind: 'category', id: 'aneis' } }],
    }
    montar(raizDeCategoria({ banners }))
    const pc = bannersGravados(banners, 'desktop').length
    const cel = bannersGravados(banners, 'mobile').length
    expect([pc, cel]).toEqual([2, 1])
    expect(screen.getByTestId('contagem-banners')).toHaveTextContent(
      `${pc} no computador · ${cel} no celular`,
    )
  })

  it('não existe contagem paralela no arquivo', () => {
    const fonte = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), 'MenuItemEditor.tsx'),
      'utf8',
    ).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

    expect(fonte).toContain('bannersGravados(')
    // As formas que uma segunda leitura teria: ler o jsonb cru do nó, ou chamar o dono de `core`
    // de novo e refazer o filtro aqui.
    expect(fonte).not.toMatch(/banners\s*(?:\?\.|\[)\s*['"]?(?:desktop|mobile)/)
    expect(fonte).not.toContain('menuBannerSlots')
  })

  it('item de LINK também tem banners', () => {
    montar(raizDeLink())
    expect(screen.getByTestId('contagem-banners')).toHaveTextContent('0 no computador · 0 no celular')
  })

  it('"Editar banners" abre o editor da 39, com o dispositivo escolhível, e "Voltar" retorna', () => {
    montar(raizDeCategoria())
    fireEvent.click(screen.getByTestId('editar-banners'))
    expect(screen.getByTestId('contador-banners')).toHaveTextContent('1 de 2')
    fireEvent.click(screen.getByTestId('banners-mobile'))
    expect(screen.getByTestId('banners-mobile')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('contador-banners')).toHaveTextContent('0 de 2')
    fireEvent.click(screen.getByTestId('voltar-ao-item'))
    expect(screen.getByTestId('caixa-banners')).toBeInTheDocument()
  })

  it('salvar banners entrega a quem abriu, pelo nó', async () => {
    montar(raizDeCategoria())
    fireEvent.click(screen.getByTestId('editar-banners'))
    fireEvent.click(screen.getByTestId('adicionar-banner'))
    fireEvent.click(screen.getByText('Salvar banners'))
    await waitFor(() => expect(onSaveBanners).toHaveBeenCalledTimes(1))
    expect(onSaveBanners.mock.calls[0][0].desktop).toHaveLength(2)
  })
})

/**
 * Q05 do QA da `86` (`BUG-20261028-banner-em-edicao-some-ao-trocar-de-aba-ou-esc`) — a dona monta um
 * banner, envia a arte, toca "Celular" para conferir e volta: o banner tinha sumido ("0 de 2"). Com
 * Esc, o editor inteiro fechava e o banner sumia, sem aviso, e a arte enviada ficava órfã no Storage.
 */
describe('Q05 — o banner em edição não some sem aviso', () => {
  const montarBannerNovoComArte = async () => {
    montar(raizDeLink())
    fireEvent.click(screen.getByTestId('editar-banners'))
    fireEvent.click(screen.getByTestId('adicionar-banner'))
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'TESTE Banner' } })
    const arquivo = new File(['x'], 'arte.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Arte do computador do banner 1'), { target: { files: [arquivo] } })
    await waitFor(() => expect(screen.getByTestId('arte-image_desktop-0')).toHaveTextContent('640 × 380'))
  }

  const esc = () => fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })

  it('trocar Computador → Celular → Computador mantém o banner, o título e a arte', async () => {
    await montarBannerNovoComArte()
    fireEvent.click(screen.getByTestId('banners-mobile'))
    expect(screen.getByTestId('contador-banners')).toHaveTextContent('0 de 2')
    fireEvent.click(screen.getByTestId('banners-desktop'))
    expect(screen.getByTestId('contador-banners')).toHaveTextContent('1 de 2')
    expect(screen.getByLabelText('Título')).toHaveValue('TESTE Banner')
    expect(screen.getByTestId('arte-image_desktop-0')).toHaveTextContent('640 × 380')
  })

  it('o rascunho dos DOIS dispositivos vai junto no "Salvar banners"', async () => {
    await montarBannerNovoComArte()
    fireEvent.click(screen.getByTestId('banners-mobile'))
    fireEvent.click(screen.getByTestId('adicionar-banner'))
    fireEvent.click(screen.getByText('Salvar banners'))
    await waitFor(() => expect(onSaveBanners).toHaveBeenCalledTimes(1))
    const gravado = onSaveBanners.mock.calls[0][0] as MenuBanners
    expect(gravado.desktop).toHaveLength(1)
    expect(gravado.desktop[0]).toMatchObject({ title: 'TESTE Banner', image_desktop: expect.stringContaining('arte-1') })
    expect(gravado.mobile).toHaveLength(1)
    expect(storage.apagadas).toEqual([])
  })

  it('Esc com alteração não salva PERGUNTA; "Continuar editando" mantém tudo', async () => {
    await montarBannerNovoComArte()
    esc()
    const pergunta = await screen.findByTestId('descartar-banners')
    expect(pergunta).toHaveTextContent('Descartar as alterações do banner?')
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    fireEvent.click(screen.getByTestId('continuar-editando-banners'))
    await waitFor(() => expect(screen.queryByTestId('descartar-banners')).toBeNull())
    expect(screen.getByTestId('contador-banners')).toHaveTextContent('1 de 2')
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(storage.apagadas).toEqual([])
  })

  // R03 (QA r2) — "Continuar editando" deixava o foco no <body>: quem navega por teclado ou leitor
  // perdia o lugar dentro da folha. O foco volta ao controle que abriu a pergunta.
  it('R03 — Esc no campo → "Continuar editando" devolve o foco ao MESMO campo', async () => {
    await montarBannerNovoComArte()
    const titulo = screen.getByLabelText('Título')
    titulo.focus()
    expect(document.activeElement).toBe(titulo)
    esc()
    await screen.findByTestId('descartar-banners')
    fireEvent.click(screen.getByTestId('continuar-editando-banners'))
    await waitFor(() => expect(screen.queryByTestId('descartar-banners')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Título')))
    expect(document.activeElement).not.toBe(document.body)
  })

  it('R03 — "Voltar" → "Continuar editando" devolve o foco ao "Voltar"', async () => {
    await montarBannerNovoComArte()
    const voltar = screen.getByTestId('voltar-ao-item')
    voltar.focus()
    fireEvent.click(voltar)
    await screen.findByTestId('descartar-banners')
    fireEvent.click(screen.getByTestId('continuar-editando-banners'))
    await waitFor(() => expect(screen.queryByTestId('descartar-banners')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('voltar-ao-item')))
  })

  it('R03 — sem controle de origem à mão, o foco cai no primeiro campo do banner, nunca no <body>', async () => {
    await montarBannerNovoComArte()
    ;(document.activeElement as HTMLElement | null)?.blur()
    fireEvent.keyDown(screen.getByTestId('editor-do-item'), { key: 'Escape' })
    await screen.findByTestId('descartar-banners')
    fireEvent.click(screen.getByTestId('continuar-editando-banners'))
    await waitFor(() => expect(screen.queryByTestId('descartar-banners')).toBeNull())
    await waitFor(() => expect(document.activeElement).not.toBe(document.body))
    expect(screen.getByTestId('editor-do-item').contains(document.activeElement)).toBe(true)
  })

  it('Esc → "Descartar" fecha o editor e APAGA do Storage a arte enviada e não gravada', async () => {
    await montarBannerNovoComArte()
    esc()
    fireEvent.click(await screen.findByTestId('confirmar-descartar-banners'))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(storage.apagadas).toEqual(['http://storage.local/home-images/menu/arte-1.webp'])
    expect(onSaveBanners).not.toHaveBeenCalled()
  })

  it('"Voltar" com alteração também pergunta antes de descartar', async () => {
    await montarBannerNovoComArte()
    fireEvent.click(screen.getByTestId('voltar-ao-item'))
    expect(await screen.findByTestId('descartar-banners')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('confirmar-descartar-banners'))
    expect(await screen.findByTestId('caixa-banners')).toBeInTheDocument()
    await waitFor(() => expect(storage.apagadas).toHaveLength(1))
  })

  it('sem alteração, Esc fecha direto (sem pergunta)', async () => {
    montar(raizDeCategoria())
    fireEvent.click(screen.getByTestId('editar-banners'))
    esc()
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(screen.queryByTestId('descartar-banners')).toBeNull()
  })

  it('a arte trocada antes de salvar também sai do Storage ao salvar (só a gravada fica)', async () => {
    await montarBannerNovoComArte()
    const arquivo = new File(['y'], 'outra.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Arte do computador do banner 1'), { target: { files: [arquivo] } })
    await waitFor(() => expect(storage.enviadas).toBe(2))
    fireEvent.click(screen.getByText('Salvar banners'))
    await waitFor(() => expect(onSaveBanners).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(storage.apagadas).toEqual(['http://storage.local/home-images/menu/arte-1.webp']))
  })
})

describe('rodapé e alvos', () => {
  it('"Remover do menu" chama quem abriu', () => {
    montar(raizDeLink())
    fireEvent.click(screen.getByTestId('editor-remover'))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('os botões do rodapé medem ≥ 44px; o interruptor tem a área de toque de 44', () => {
    montar(raizDeCategoria())
    const tem = (el: Element, t: string) => el.className.split(/\s+/).includes(t)
    for (const id of ['editor-remover', 'editor-salvar', 'editar-banners']) {
      expect(tem(screen.getByTestId(id), 'min-h-11')).toBe(true)
    }
    expect(tem(screen.getByRole('button', { name: 'Cancelar' }), 'min-h-11')).toBe(true)
    expect(tem(screen.getByTestId('usar-nome-da-categoria'), 'before:-top-[10px]')).toBe(true)
  })
})

/**
 * Q06b do QA da `86` — a 200 % em 390, na vista de banners, o par Computador | Celular ia até
 * x = 479 e o diálogo rolava de lado. Os botões com texto quebram linha (o `Button` é
 * `whitespace-nowrap`). Régua de token exato; a medida em navegador está no bug.
 */
describe('Q06b — com a fonte grande, o editor do item cabe na largura', () => {
  const tem = (el: Element, t: string) => el.className.split(/\s+/).includes(t)
  const quebra = (el: Element, rotulo: string) => {
    for (const t of ['whitespace-normal', 'h-auto', 'max-w-full']) expect(tem(el, t), `${rotulo}: ${t}`).toBe(true)
  }

  it('os botões com texto do item quebram linha', () => {
    montar(raizDeCategoria())
    for (const id of ['editor-remover', 'editor-salvar', 'editar-banners']) quebra(screen.getByTestId(id), id)
    quebra(screen.getByRole('button', { name: 'Cancelar' }), 'Cancelar')
  })

  it('na vista de banners, o par Computador | Celular embrulha dentro da largura', () => {
    montar(raizDeCategoria())
    fireEvent.click(screen.getByTestId('editar-banners'))
    const par = screen.getByRole('group', { name: 'Dispositivo dos banners' })
    expect(tem(par, 'flex-wrap')).toBe(true)
    expect(tem(par, 'max-w-full')).toBe(true)
    expect(tem(par, 'min-w-0')).toBe(true)
    quebra(screen.getByTestId('voltar-ao-item'), 'voltar')
  })

  it('no celular o respiro da folha é compacto (`p-4`, não o `p-6` do diálogo, que a 200 % come 96 px da largura)', () => {
    montar(raizDeCategoria())
    expect(tem(screen.getByTestId('editor-do-item'), 'max-sm:p-4')).toBe(true)
  })

  it('SENSOR: a régua acusa o par sem embrulhar', () => {
    const antigo = document.createElement('div')
    antigo.className = 'flex gap-0.5 rounded-xl bg-muted p-0.5'
    expect(tem(antigo, 'flex-wrap')).toBe(false)
  })
})

/**
 * Defeito relatado em 2026-10-29: "Remover do menu" era `variant="ghost"` com texto vermelho, e o
 * hover do ghost pinta `bg-accent` (o ROSA do painel) — fundo rosa com texto vermelho. O pedido é o
 * `.btn.danger` do protótipo (borda e texto vermelhos) com hover de FUNDO vermelho e texto BRANCO.
 * O mesmo vale para os botões de contorno (Cancelar, Editar banners), que herdavam o hover rosa.
 */
describe('o rodapé do editor não pinta de rosa no hover', () => {
  const tem = (el: Element, t: string) => el.className.split(/\s+/).includes(t)

  it('"Remover do menu": borda e texto vermelhos; hover com fundo vermelho e texto branco', () => {
    montar(raizDeCategoria())
    const b = screen.getByTestId('editor-remover')
    expect(tem(b, 'hover:bg-accent')).toBe(false)
    expect(tem(b, 'hover:text-accent-foreground')).toBe(false)
    expect(tem(b, 'text-destructive')).toBe(true)
    expect(tem(b, 'border-destructive')).toBe(true)
    expect(tem(b, 'hover:bg-red-700')).toBe(true)
    expect(tem(b, 'hover:text-white')).toBe(true)
    expect(tem(b, 'hover:bg-destructive')).toBe(false)
    // A forma antiga — texto vermelho também no hover — não pode ficar ao lado.
    expect(tem(b, 'hover:text-destructive')).toBe(false)
  })

  it('Cancelar e Editar banners: hover rosado claro com o texto mantido; Salvar é o CTA', () => {
    montar(raizDeCategoria())
    for (const b of [screen.getByRole('button', { name: 'Cancelar' }), screen.getByTestId('editar-banners')]) {
      expect(tem(b, 'hover:bg-accent')).toBe(false)
      expect(tem(b, 'hover:bg-estrelinha-admin-card-hover')).toBe(true)
      expect(tem(b, 'hover:text-estrelinha-admin-text')).toBe(true)
    }
    expect(tem(screen.getByTestId('editor-salvar'), 'gradient-cta')).toBe(true)
  })

  it('SENSOR: a forma do defeito reprova na mesma régua', () => {
    const antigo = document.createElement('button')
    antigo.className =
      'hover:bg-accent hover:text-accent-foreground h-auto min-h-11 max-w-full whitespace-normal text-destructive hover:text-destructive'
    expect(tem(antigo, 'hover:bg-accent')).toBe(true)
    expect(tem(antigo, 'hover:bg-destructive')).toBe(false)
  })
})
