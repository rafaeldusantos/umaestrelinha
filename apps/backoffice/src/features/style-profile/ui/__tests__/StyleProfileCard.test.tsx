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
  data: { appearance: { profile: 'padrao' } } as Record<string, unknown>,
}))

const mutateAsync = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const toast = vi.hoisted(() => vi.fn())
const { storeUrl } = vi.hoisted(() => ({ storeUrl: { valor: 'http://localhost:8082' as string | undefined } }))

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useStoreSettings: () => ({ isLoading: state.loading, data: state.loading ? undefined : state.data }),
  useUpdateSettings: () => ({ mutateAsync, isPending: false }),
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

  it('com a configuração carregada, as opções ficam habilitadas', () => {
    render(<StyleProfileCard />)
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeEnabled()
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
