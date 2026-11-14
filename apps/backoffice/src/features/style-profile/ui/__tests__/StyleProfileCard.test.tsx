// O card "Perfil de estilo da loja" em Configurações › Dados da loja.
//
// jsdom não carrega o documento do iframe, então a loja vestindo o perfil não se mede aqui — quem a
// mede é o recebedor da loja. O que se mede aqui é o que a dona vê no card, o que vai para o banco,
// o que sai pelo `postMessage` e o que NÃO vai para o banco.

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ESTRELINHA_PROFILES } from '@estrelinha/ui/tokens/estrelinha'
import { STYLE_PROFILE_PREVIEW_SOURCE } from '@estrelinha/core/appearance'

const state = vi.hoisted(() => ({
  loading: false,
  /** A leitura terminou, e o `select` falhou: `fetchAllSettings` devolve os defaults com a marca. */
  readFailed: false,
  /** A leitura terminou com o `queryFn` rejeitando: não há dado nenhum. */
  rejected: false,
  data: { appearance: { profile: 'padrao' } } as Record<string, unknown>,
}))
const refetch = vi.hoisted(() => vi.fn())
const mutacao = vi.hoisted(() => ({ pending: false, paused: false }))

const mutateAsync = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const toast = vi.hoisted(() => vi.fn())
const { storeUrl } = vi.hoisted(() => ({ storeUrl: { valor: 'http://localhost:8082' as string | undefined } }))

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useStoreSettings: () => ({
    isLoading: state.loading,
    isError: state.rejected,
    data: state.loading || state.rejected ? undefined : state.readFailed ? { ...state.data, readFailed: true } : state.data,
    refetch,
  }),
  useUpdateSettings: () => ({ mutateAsync, isPending: mutacao.pending, isPaused: mutacao.paused }),
}))

vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ useToast: () => ({ toast }) }))

vi.mock('@/shared/lib/storeOrigin', () => ({
  get STORE_URL() {
    return storeUrl.valor
  },
  storeOrigin: () => (storeUrl.valor ? new URL(storeUrl.valor).origin : null),
}))

import StyleProfileCard from '../StyleProfileCard'

const comPerfilSalvo = (valor: unknown) => {
  state.data = { appearance: valor === undefined ? undefined : { profile: valor } }
}

const opcao = (nome: RegExp) => screen.getByRole('radio', { name: nome })
const cartaoDe = (perfil: string) => screen.getByTestId(`perfil-${perfil}`)
const salvar = () => screen.getByTestId('salvar-perfil-de-estilo')

beforeEach(() => {
  state.loading = false
  state.readFailed = false
  state.rejected = false
  mutacao.pending = false
  mutacao.paused = false
  refetch.mockClear()
  comPerfilSalvo('padrao')
  storeUrl.valor = 'http://localhost:8082'
  mutateAsync.mockClear()
  toast.mockClear()
  document.documentElement.removeAttribute('data-perfil')
})

describe('o card mostra as duas opções', () => {
  it('título, texto e o grupo de duas opções com o rótulo acessível', () => {
    render(<StyleProfileCard />)

    expect(screen.getByRole('heading', { level: 2, name: 'Perfil de estilo da loja' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'Muda só as cores da loja. Textos, blocos da Home, preços e menu continuam iguais, e voltar ao Padrão é a mesma escolha.',
      ),
    ).toBeInTheDocument()

    const grupo = screen.getByRole('radiogroup', { name: 'Perfil de estilo' })
    expect(within(grupo).getAllByRole('radio')).toHaveLength(2)
    expect(within(cartaoDe('padrao')).getByText('Padrão')).toBeInTheDocument()
    expect(within(cartaoDe('padrao')).getByText('Ardósia e ouro, a cara de sempre da loja.')).toBeInTheDocument()
    expect(within(cartaoDe('black-friday')).getByText('Black Friday')).toBeInTheDocument()
    expect(within(cartaoDe('black-friday')).getByText('Preto e ouro, para a campanha.')).toBeInTheDocument()
  })

  it('cada opção tem quatro amostras, na ordem e com as cores do dono dos perfis', () => {
    render(<StyleProfileCard />)

    // Os hex escritos à mão aqui, e o objeto do dono ao lado: os dois têm de concordar.
    const esperado = {
      padrao: ['#283A4A', '#34495E', '#B8945F', '#F1EBE1'],
      'black-friday': ['#0D0C0B', '#1C1A18', '#C2A063', '#F0EADF'],
    } as const

    for (const perfil of ['padrao', 'black-friday'] as const) {
      const amostras = within(cartaoDe(perfil)).getAllByTestId('amostra-de-cor')
      const cores = amostras.map(a => a.getAttribute('data-cor'))
      expect(cores).toEqual(esperado[perfil])
      expect(cores).toEqual(
        (['primary-strong', 'primary', 'accent', 'ground-deep'] as const).map(t => ESTRELINHA_PROFILES[perfil][t]),
      )
    }
  })

  it('o perfil salvo vem marcado e com o selo "Em uso"; o outro, não', () => {
    comPerfilSalvo('black-friday')
    render(<StyleProfileCard />)

    expect(opcao(/Black Friday/)).toBeChecked()
    expect(opcao(/Padrão/)).not.toBeChecked()
    expect(within(cartaoDe('black-friday')).getByText('Em uso')).toBeInTheDocument()
    expect(within(cartaoDe('padrao')).queryByText('Em uso')).toBeNull()
  })

  it.each([['roxo'], [42], [undefined]])('o valor gravado %s aparece como Padrão, em uso', valor => {
    comPerfilSalvo(valor)
    render(<StyleProfileCard />)

    expect(opcao(/Padrão/)).toBeChecked()
    expect(within(cartaoDe('padrao')).getByText('Em uso')).toBeInTheDocument()
    expect(within(cartaoDe('black-friday')).queryByText('Em uso')).toBeNull()
  })

  it('enquanto a configuração carrega, as opções ficam desabilitadas', () => {
    state.loading = true
    render(<StyleProfileCard />)

    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled()
  })

  it('enquanto a configuração carrega, nenhum perfil leva o selo "Em uso" e Salvar fica desabilitado', () => {
    state.loading = true
    render(<StyleProfileCard />)

    expect(screen.queryByText('Em uso')).toBeNull()
    expect(salvar()).toBeDisabled()
  })

  it('com a configuração carregada, as opções ficam habilitadas', () => {
    render(<StyleProfileCard />)
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeEnabled()
  })
})

describe('a leitura da configuração que falha não afirma um perfil salvo', () => {
  const casos = [
    ['o `select` respondendo erro (os defaults com a marca)', () => (state.readFailed = true)],
    ['o `queryFn` rejeitando (sem dado nenhum)', () => (state.rejected = true)],
  ] as const

  it.each(casos)('%s ⇒ nenhum "Em uso", opções e Salvar desabilitados, e um aviso com "Tentar de novo"', (_nome, falhar) => {
    comPerfilSalvo('black-friday')
    falhar()
    render(<StyleProfileCard />)

    expect(screen.queryByText('Em uso')).toBeNull()
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled()
    expect(salvar()).toBeDisabled()

    const aviso = screen.getByRole('alert')
    expect(aviso).toHaveTextContent('Não foi possível ler o perfil salvo da loja.')
    expect(aviso).toHaveTextContent('Enquanto ele não carregar, as opções ficam desabilitadas.')
  })

  it('"Tentar de novo" relê a configuração', () => {
    state.readFailed = true
    render(<StyleProfileCard />)

    const botao = screen.getByRole('button', { name: 'Tentar de novo' })
    expect(botao.className).toMatch(/(?:^|\s)h-11(?![-\w])/)
    fireEvent.click(botao)
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('o par: com a leitura boa, "Em uso" no perfil salvo, opções habilitadas e nenhum aviso de falha', () => {
    comPerfilSalvo('black-friday')
    render(<StyleProfileCard />)

    expect(within(cartaoDe('black-friday')).getByText('Em uso')).toBeInTheDocument()
    expect(within(cartaoDe('padrao')).queryByText('Em uso')).toBeNull()
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeEnabled()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).toBeNull()
  })

  it('a releitura que dá certo devolve o card: o salvo em uso, e o Padrão salvável', () => {
    comPerfilSalvo('black-friday')
    state.readFailed = true
    const { rerender } = render(<StyleProfileCard />)
    expect(screen.queryByText('Em uso')).toBeNull()

    state.readFailed = false
    rerender(<StyleProfileCard />)

    expect(opcao(/Black Friday/)).toBeChecked()
    expect(within(cartaoDe('black-friday')).getByText('Em uso')).toBeInTheDocument()
    fireEvent.click(opcao(/Padrão/))
    expect(salvar()).toBeEnabled()
  })
})

describe('salvar sem conexão', () => {
  it('a gravação parada à espera da rede diz que não salvou, e o botão não gira', () => {
    const { rerender } = render(<StyleProfileCard />)
    fireEvent.click(opcao(/Black Friday/))
    mutacao.pending = true
    mutacao.paused = true
    rerender(<StyleProfileCard />)

    const aviso = screen.getByTestId('perfil-sem-conexao')
    expect(aviso).toHaveAttribute('role', 'status')
    expect(aviso).toHaveTextContent(
      'Sem conexão. O perfil ainda não foi salvo: ele é gravado quando a conexão voltar, com esta página aberta.',
    )
    expect(salvar()).toBeDisabled()
    expect(salvar().querySelector('.animate-spin')).toBeNull()
    expect(toast).not.toHaveBeenCalled()
    // "Em uso" segue no perfil anterior
    expect(within(cartaoDe('padrao')).getByText('Em uso')).toBeInTheDocument()
  })

  it('o par: gravando com a rede de pé, o botão gira e o aviso de conexão não aparece', () => {
    mutacao.pending = true
    render(<StyleProfileCard />)

    expect(screen.queryByTestId('perfil-sem-conexao')).toBeNull()
    expect(salvar().querySelector('.animate-spin')).not.toBeNull()
  })

  it('com a rede de volta, a frase de sucesso do card continua', async () => {
    render(<StyleProfileCard />)
    fireEvent.click(opcao(/Black Friday/))
    await act(async () => {
      fireEvent.click(salvar())
    })
    expect(screen.queryByTestId('perfil-sem-conexao')).toBeNull()
    expect(toast.mock.calls[0][0].title).toBe('Perfil salvo. Quem abrir a loja vê o perfil novo em até 1 hora.')
  })
})

describe('Salvar grava só o perfil, na chave `appearance`', () => {
  it('desabilitado enquanto o escolhido é o salvo', () => {
    render(<StyleProfileCard />)
    expect(salvar()).toBeDisabled()
  })

  it('escolher Black Friday e salvar grava `{ profile: "black-friday" }` e só ela', async () => {
    render(<StyleProfileCard />)

    fireEvent.click(opcao(/Black Friday/))
    expect(salvar()).toBeEnabled()
    await act(async () => {
      fireEvent.click(salvar())
    })

    expect(mutateAsync).toHaveBeenCalledTimes(1)
    expect(mutateAsync.mock.calls[0][0]).toStrictEqual({ key: 'appearance', value: { profile: 'black-friday' } })
  })

  it('voltar ao Padrão é marcar Padrão e salvar: grava `{ profile: "padrao" }`', async () => {
    comPerfilSalvo('black-friday')
    render(<StyleProfileCard />)

    fireEvent.click(opcao(/Padrão/))
    await act(async () => {
      fireEvent.click(salvar())
    })

    expect(mutateAsync).toHaveBeenCalledTimes(1)
    expect(mutateAsync.mock.calls[0][0]).toStrictEqual({ key: 'appearance', value: { profile: 'padrao' } })
  })

  it('clicar no cartão inteiro escolhe a opção', () => {
    render(<StyleProfileCard />)
    fireEvent.click(within(cartaoDe('black-friday')).getByText('Preto e ouro, para a campanha.'))
    expect(opcao(/Black Friday/)).toBeChecked()
  })

  it('a mensagem de sucesso é a do card, e não a frase das outras seções', async () => {
    render(<StyleProfileCard />)
    fireEvent.click(opcao(/Black Friday/))
    await act(async () => {
      fireEvent.click(salvar())
    })

    expect(toast).toHaveBeenCalledTimes(1)
    expect(toast.mock.calls[0][0].title).toBe('Perfil salvo. Quem abrir a loja vê o perfil novo em até 1 hora.')
    expect(toast.mock.calls[0][0].title).not.toBe('Configurações salvas')
  })

  it('a gravação que falha avisa com o erro, pelo molde das outras seções', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('sem rede'))
    render(<StyleProfileCard />)
    fireEvent.click(opcao(/Black Friday/))
    await act(async () => {
      fireEvent.click(salvar())
    })

    expect(toast.mock.calls[0][0]).toMatchObject({ title: 'Erro ao salvar', description: 'sem rede', variant: 'destructive' })
  })
})

describe('o aviso de quanto tempo leva', () => {
  it('diz 5 minutos para produto e categoria, 1 hora para o resto, e quem está com a loja aberta', () => {
    render(<StyleProfileCard />)
    const aviso = screen.getByTestId('aviso-perfil-de-estilo')
    expect(aviso.textContent).toContain(
      'Depois de salvar, quem abrir a loja já vê o perfil novo nas páginas de produto e de categoria em até 5 minutos, e nas outras páginas em até 1 hora.',
    )
    expect(aviso.textContent).toContain('Quem já está com a loja aberta vê ao trocar de página.')
  })
})

/** Token exato: `\b` não fecha nada quando o vizinho é hífen, e `h-3` é prefixo de `h-3.5`. */
const temClasse = (el: Element, token: string) =>
  new RegExp(`(?:^|\\s)${token.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}(?![-\\w./\\[])`).test(el.getAttribute('class') ?? '')

describe('as opções nas medidas do protótipo', () => {
  it('a opção tem borda de 2 px; a marcada em violeta com o fundo violeta a 3 %, a outra na borda neutra', () => {
    comPerfilSalvo('black-friday')
    render(<StyleProfileCard />)

    const marcada = cartaoDe('black-friday')
    const outra = cartaoDe('padrao')
    for (const cartao of [marcada, outra]) {
      expect(temClasse(cartao, 'border-2')).toBe(true)
      expect(temClasse(cartao, 'border')).toBe(false)
    }
    expect(temClasse(marcada, 'border-estrelinha-admin-violet')).toBe(true)
    expect(temClasse(marcada, 'bg-estrelinha-admin-violet/[0.03]')).toBe(true)
    expect(temClasse(marcada, 'border-primary')).toBe(false)
    expect(temClasse(marcada, 'bg-primary/5')).toBe(false)

    expect(temClasse(outra, 'border-border')).toBe(true)
    expect(temClasse(outra, 'border-estrelinha-admin-violet')).toBe(false)
    expect(temClasse(outra, 'bg-estrelinha-admin-violet/[0.03]')).toBe(false)
  })

  it('a marca segue a escolha, não o salvo', () => {
    render(<StyleProfileCard />)
    fireEvent.click(opcao(/Black Friday/))

    expect(temClasse(cartaoDe('black-friday'), 'border-estrelinha-admin-violet')).toBe(true)
    expect(temClasse(cartaoDe('padrao'), 'border-estrelinha-admin-violet')).toBe(false)
  })

  it('a miniatura: cabeçalho de 22 px, departamentos de 12 px, três blocos de 34 px com hachura e botão de 14 px', () => {
    render(<StyleProfileCard />)

    for (const perfil of ['padrao', 'black-friday'] as const) {
      const cartao = cartaoDe(perfil)
      expect(temClasse(within(cartao).getByTestId('miniatura-cabecalho'), 'h-[22px]')).toBe(true)
      expect(temClasse(within(cartao).getByTestId('miniatura-departamentos'), 'h-3')).toBe(true)
      expect(temClasse(within(cartao).getByTestId('miniatura-botao'), 'h-3.5')).toBe(true)

      const blocos = within(cartao).getAllByTestId('miniatura-bloco')
      expect(blocos).toHaveLength(3)
      for (const bloco of blocos) {
        expect(temClasse(bloco, 'h-[34px]')).toBe(true)
        expect(temClasse(bloco, 'border-dashed')).toBe(false)
        // A hachura é uma classe só, e a cor dela é a do perfil, pela variável do próprio bloco.
        expect(
          temClasse(bloco, 'bg-[repeating-linear-gradient(135deg,var(--hachura)_0_2px,transparent_2px_6px)]'),
        ).toBe(true)
        expect(bloco.style.getPropertyValue('--hachura')).toBe(ESTRELINHA_PROFILES[perfil]['ground-deep'])
      }
    }
  })

  it('as amostras têm raio de 6 px e gap de 4 px', () => {
    render(<StyleProfileCard />)

    const amostras = within(cartaoDe('padrao')).getAllByTestId('amostra-de-cor')
    for (const amostra of amostras) {
      expect(temClasse(amostra, 'rounded-[6px]')).toBe(true)
      expect(temClasse(amostra, 'rounded')).toBe(false)
    }
    const fileira = amostras[0].parentElement!
    expect(temClasse(fileira, 'gap-1')).toBe(true)
    expect(temClasse(fileira, 'gap-1.5')).toBe(false)
  })

  it('o nome do perfil sai em peso 600', () => {
    render(<StyleProfileCard />)

    for (const [perfil, nome] of [['padrao', 'Padrão'], ['black-friday', 'Black Friday']] as const) {
      const rotulo = within(cartaoDe(perfil)).getByText(nome)
      expect(temClasse(rotulo, 'font-semibold')).toBe(true)
      expect(temClasse(rotulo, 'font-bold')).toBe(false)
    }
  })
})

describe('o aviso do prazo no tom neutro do protótipo', () => {
  it('fundo `elevated`, sem borda, raio de 10 px, texto `text-secondary` a 12,5 px, e o relógio', () => {
    render(<StyleProfileCard />)
    const aviso = screen.getByTestId('aviso-perfil-de-estilo')

    expect(temClasse(aviso, 'bg-estrelinha-admin-elevated')).toBe(true)
    expect(temClasse(aviso, 'rounded-[10px]')).toBe(true)
    expect(aviso.className).not.toMatch(/(?:^|\s)border(?:-|\s|$)/)
    expect(aviso.className).not.toContain('estrelinha-admin-amber')

    const texto = aviso.querySelector('p')!.parentElement!
    expect(temClasse(texto, 'text-estrelinha-admin-text-secondary')).toBe(true)
    expect(temClasse(texto, 'text-[12.5px]')).toBe(true)
    expect(temClasse(texto, 'text-xs')).toBe(false)

    const icone = aviso.querySelector('svg')!
    expect(icone.getAttribute('class')).toContain('lucide-clock')
    expect(temClasse(icone, 'text-estrelinha-admin-text-secondary')).toBe(true)
  })

  it('o par: o aviso de "sem conexão" do mesmo card continua no âmbar do `InfoBanner`', () => {
    const { rerender } = render(<StyleProfileCard />)
    fireEvent.click(opcao(/Black Friday/))
    mutacao.pending = true
    mutacao.paused = true
    rerender(<StyleProfileCard />)

    const aviso = screen.getByTestId('perfil-sem-conexao')
    expect(temClasse(aviso, 'bg-estrelinha-admin-amber/10')).toBe(true)
    expect(temClasse(aviso, 'border-estrelinha-admin-amber/20')).toBe(true)
    expect(temClasse(aviso, 'bg-estrelinha-admin-elevated')).toBe(false)
  })
})

describe('"Ver a loja com este perfil" — a prévia sem salvar', () => {
  const abrirPrevia = () => fireEvent.click(screen.getByRole('button', { name: 'Ver a loja com este perfil' }))
  const dialogo = () => screen.getByRole('dialog')

  it('abre o modal com o perfil escolhido, UM iframe de `previewSrc`, e não grava nada', () => {
    render(<StyleProfileCard />)
    fireEvent.click(opcao(/Black Friday/))
    abrirPrevia()

    expect(within(dialogo()).getByRole('heading', { name: 'A loja com o perfil Black Friday' })).toBeInTheDocument()
    expect(within(dialogo()).getByText('Prévia, sem salvar. A loja publicada não muda.')).toBeInTheDocument()

    const iframes = dialogo().querySelectorAll('iframe')
    expect(iframes).toHaveLength(1)
    expect(iframes[0].getAttribute('src')).toBe('http://localhost:8082/?preview=1')
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('o botão está habilitado mesmo sem mudança', () => {
    render(<StyleProfileCard />)
    expect(screen.getByRole('button', { name: 'Ver a loja com este perfil' })).toBeEnabled()
  })

  it('manda `draft` com o perfil escolhido para a origem EXATA da loja, ao carregar e ao receber o `ready`', () => {
    render(<StyleProfileCard />)
    fireEvent.click(opcao(/Black Friday/))
    abrirPrevia()

    const iframe = dialogo().querySelector('iframe') as HTMLIFrameElement
    const janela = iframe.contentWindow as Window
    const postMessage = vi.spyOn(janela, 'postMessage')

    fireEvent.load(iframe)
    expect(postMessage).toHaveBeenCalledWith(
      { source: STYLE_PROFILE_PREVIEW_SOURCE, type: 'draft', profile: 'black-friday' },
      'http://localhost:8082',
    )
    for (const chamada of postMessage.mock.calls) expect(chamada[1]).not.toBe('*')

    postMessage.mockClear()
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { source: STYLE_PROFILE_PREVIEW_SOURCE, type: 'ready' },
          origin: 'http://localhost:8082',
          source: janela,
        }),
      )
    })
    expect(postMessage).toHaveBeenCalledWith(
      { source: STYLE_PROFILE_PREVIEW_SOURCE, type: 'draft', profile: 'black-friday' },
      'http://localhost:8082',
    )
  })

  it('o `ready` de outra origem, ou de outra janela, não é respondido', () => {
    render(<StyleProfileCard />)
    abrirPrevia()
    const iframe = dialogo().querySelector('iframe') as HTMLIFrameElement
    const janela = iframe.contentWindow as Window
    const postMessage = vi.spyOn(janela, 'postMessage')

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { source: STYLE_PROFILE_PREVIEW_SOURCE, type: 'ready' },
          origin: 'http://intruso.example',
          source: janela,
        }),
      )
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { source: STYLE_PROFILE_PREVIEW_SOURCE, type: 'ready' },
          origin: 'http://localhost:8082',
          source: window,
        }),
      )
    })
    expect(postMessage).not.toHaveBeenCalled()
  })

  it('fechar não grava, não muda o escolhido nem o salvo', () => {
    render(<StyleProfileCard />)
    fireEvent.click(opcao(/Black Friday/))
    abrirPrevia()

    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Fechar' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(mutateAsync).not.toHaveBeenCalled()
    expect(opcao(/Black Friday/)).toBeChecked()
    expect(within(cartaoDe('padrao')).getByText('Em uso')).toBeInTheDocument()
  })

  it('Esc também fecha sem gravar', () => {
    render(<StyleProfileCard />)
    abrirPrevia()
    fireEvent.keyDown(dialogo(), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('o painel não veste o perfil: nem o `<html>` nem o card ganham o atributo do perfil', () => {
    render(<StyleProfileCard />)
    fireEvent.click(opcao(/Black Friday/))
    abrirPrevia()
    expect(document.documentElement.hasAttribute('data-perfil')).toBe(false)
    expect(document.querySelector('[data-perfil]')).toBeNull()
  })

  it('sem `VITE_STORE_URL`, o passo de configuração aparece no lugar do palco', () => {
    storeUrl.valor = undefined
    render(<StyleProfileCard />)
    abrirPrevia()

    expect(dialogo().querySelector('iframe')).toBeNull()
    expect(within(dialogo()).getByTestId('previa-perfil-sem-loja')).toBeInTheDocument()
    expect(within(dialogo()).getByText('VITE_STORE_URL')).toBeInTheDocument()
  })

  it('a alternância Computador/Celular troca o quadro sem trocar o `src`', () => {
    render(<StyleProfileCard />)
    abrirPrevia()
    const iframe = dialogo().querySelector('iframe') as HTMLIFrameElement
    const src = iframe.getAttribute('src')
    // Abre no celular, como os outros palcos: é onde a cliente vê a loja.
    expect(iframe.getAttribute('data-device')).toBe('mobile')

    fireEvent.click(within(dialogo()).getByRole('button', { name: /Computador/ }))
    const depois = dialogo().querySelector('iframe') as HTMLIFrameElement
    expect(depois.getAttribute('data-device')).toBe('desktop')
    expect(depois).toBe(iframe)
    expect(depois.getAttribute('src')).toBe(src)
  })
})
