// A tela "Faixa de avisos" pela PÁGINA REAL: o interruptor, a lista, os campos, o envio de arte, a
// barra de salvar e a ponte da prévia. Dublados só o client do Supabase (o dublê que enxerga tabela e
// escrita), o motor de envio do Storage e a origem da loja; a página, os hooks de leitura e gravação
// e as recusas de `core` são os reais.

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Registro, Resposta } from '@/test/dubleSupabase'

type Linha = Record<string, unknown>

const { banco } = vi.hoisted(() => ({
  banco: { settings: [] as Linha[], calls: [] as unknown[] },
}))

vi.mock('@estrelinha/supabase/client', async () => {
  const { criarDuble } = await import('@/test/dubleSupabase')
  const duble = criarDuble((r): Resposta => {
    if (r.table === 'store_settings') {
      if (r.upsert) {
        const novo = r.upsert.rows as Linha
        banco.settings = [...banco.settings.filter(s => s.key !== novo.key), novo]
        return { data: null }
      }
      return { data: banco.settings }
    }
    return { data: [] }
  })
  banco.calls = duble.calls
  return { supabase: { from: duble.from } }
})

const { motor } = vi.hoisted(() => ({
  motor: { upload: vi.fn(), apagar: vi.fn() },
}))

vi.mock('@/shared/lib/uploadImage', async importOriginal => {
  const real = await importOriginal<typeof import('@/shared/lib/uploadImage')>()
  return {
    ...real,
    uploadImageBlob: (...args: unknown[]) => motor.upload(...args),
    deleteStorageImage: (...args: unknown[]) => motor.apagar(...args),
  }
})

vi.mock('@/shared/lib/storeOrigin', () => ({
  STORE_URL: 'http://localhost:8082',
  storeOrigin: () => 'http://localhost:8082',
}))

import AdminAnnouncementsPage from './AdminAnnouncementsPage'

const montar = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/admin/faixa-de-avisos']}>
        <Routes>
          <Route path="/admin/faixa-de-avisos" element={<AdminAnnouncementsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const escritas = () => (banco.calls as Registro[]).filter(c => c.table === 'store_settings' && c.upsert)
const salvar = () => screen.getByTestId('salvar-faixa')
// "Texto" é também o rótulo de uma opção do tipo do aviso: o campo é o que não é rádio.
const campo = (rotulo: string) =>
  screen.getAllByLabelText(rotulo).find(el => (el as HTMLInputElement).type !== 'radio') as HTMLInputElement
const digitar = (rotulo: string, valor: string) => fireEvent.change(campo(rotulo), { target: { value: valor } })
const adicionar = () => fireEvent.click(screen.getByRole('button', { name: '+ Adicionar aviso' }))
const pronto = () => screen.findByRole('switch', { name: 'Faixa ligada' })

const AVISO_DE_IMAGEM = {
  id: 'img-1',
  kind: 'image',
  imageDesktop: 'https://x.test/d.webp',
  imageMobile: 'https://x.test/m.webp',
  alt: '',
  href: '',
}

beforeEach(() => {
  banco.settings = []
  banco.calls.length = 0
  motor.upload.mockReset()
  motor.apagar.mockReset()
  motor.apagar.mockResolvedValue(undefined)
})

describe('gravar a faixa', () => {
  it('grava { enabled, items } em igualdade exata pelo upsert da chave announcements', async () => {
    montar()
    await pronto()
    fireEvent.click(screen.getByRole('switch', { name: 'Faixa ligada' }))
    adicionar()
    digitar('Trecho em destaque', 'Frete grátis')
    digitar('Texto', 'acima de R$ 300')
    digitar('Rótulo do link', 'Ver ofertas')
    digitar('Destino', '/ofertas')
    fireEvent.click(salvar())

    await waitFor(() => expect(escritas()).toHaveLength(1))
    expect(escritas()[0].upsert).toEqual({
      rows: {
        key: 'announcements',
        value: {
          enabled: true,
          items: [
            {
              id: expect.stringMatching(/^aviso-/),
              kind: 'text',
              highlight: 'Frete grátis',
              text: 'acima de R$ 300',
              linkLabel: 'Ver ofertas',
              href: '/ofertas',
            },
          ],
        },
      },
      options: { onConflict: 'key' },
    })
  })

  it('o que se grava é só o tipo escolhido: trocar de tipo e voltar não leva os campos do outro', async () => {
    montar()
    await pronto()
    adicionar()
    digitar('Texto', 'Peças feitas à mão')
    fireEvent.click(screen.getByRole('radio', { name: 'Imagem' }))
    digitar('Texto alternativo', 'arte da campanha')
    fireEvent.click(screen.getByRole('radio', { name: 'Texto' }))
    // O texto escrito antes continua no rascunho.
    expect(campo('Texto').value).toBe('Peças feitas à mão')
    fireEvent.click(salvar())

    await waitFor(() => expect(escritas()).toHaveLength(1))
    const valor = (escritas()[0].upsert!.rows as Linha).value as { items: Linha[] }
    expect(Object.keys(valor.items[0]).sort()).toEqual(['highlight', 'href', 'id', 'kind', 'linkLabel', 'text'])
  })

  it('aviso sem destino é aceito como texto, sem link', async () => {
    montar()
    await pronto()
    adicionar()
    digitar('Texto', 'Cada peça leva cerca de 20 dias')
    expect(screen.getByTestId('resumo-aviso-0')).toHaveTextContent('Texto · sem link')
    expect(salvar()).toBeEnabled()
    fireEvent.click(salvar())
    await waitFor(() => expect(escritas()).toHaveLength(1))
    const valor = (escritas()[0].upsert!.rows as Linha).value as { items: Linha[] }
    expect(valor.items[0].href).toBe('')
  })
})

describe('o destino é um caminho da loja', () => {
  it('endereço externo é recusado no campo, antes de qualquer rede, e o Salvar fica desabilitado', async () => {
    montar()
    await pronto()
    adicionar()
    digitar('Texto', 'Novidades')
    digitar('Destino', 'https://outra-loja.com')

    expect(screen.getByTestId('recusa-href-0')).toHaveTextContent(
      '1º aviso: O endereço precisa começar com “/”: a loja só aponta para páginas dela.',
    )
    expect(salvar()).toBeDisabled()
    expect(screen.getByText('Corrija o que está marcado para salvar.')).toBeInTheDocument()
    fireEvent.click(salvar())
    expect(escritas()).toHaveLength(0)
  })

  it('`//host` é recusado com a frase de quem leva para fora da loja', async () => {
    montar()
    await pronto()
    adicionar()
    digitar('Texto', 'Novidades')
    digitar('Destino', '//outra-loja.com')
    expect(screen.getByTestId('recusa-href-0')).toHaveTextContent(
      '1º aviso: Este endereço leva para fora da loja. Use um caminho da loja, começando com uma só “/” — por exemplo, “/ofertas”.',
    )
    expect(salvar()).toBeDisabled()
  })
})

describe('as recusas e os contadores', () => {
  it('rótulo sem destino é recusado no campo do rótulo', async () => {
    montar()
    await pronto()
    adicionar()
    digitar('Texto', 'Novidades')
    digitar('Rótulo do link', 'Ver')
    expect(screen.getByTestId('recusa-linkLabel-0')).toHaveTextContent(
      '1º aviso: Sem destino, o rótulo do link não aparece.',
    )
    expect(salvar()).toBeDisabled()
  })

  it('imagem sem texto alternativo é recusada no campo dele', async () => {
    banco.settings = [{ key: 'announcements', value: { enabled: true, items: [AVISO_DE_IMAGEM] } }]
    montar()
    await pronto()
    fireEvent.click(await screen.findByTestId('resumo-aviso-0'))
    expect(screen.getByTestId('recusa-alt-0')).toHaveTextContent(
      '1º aviso: Descreva a arte: é o que o leitor de tela e o Google leem.',
    )
    digitar('Texto alternativo', 'Frete grátis acima de R$ 300')
    expect(screen.queryByTestId('recusa-alt-0')).toBeNull()
  })

  it('os contadores são de 40, 60 e 20, e o campo que passa do teto é recusado', async () => {
    montar()
    await pronto()
    adicionar()
    expect(screen.getByTestId('contador-highlight-0')).toHaveTextContent('0/40')
    expect(screen.getByTestId('contador-text-0')).toHaveTextContent('0/60')
    expect(screen.getByTestId('contador-linkLabel-0')).toHaveTextContent('0/20')

    digitar('Trecho em destaque', 'a'.repeat(41))
    expect(screen.getByTestId('contador-highlight-0')).toHaveTextContent('41/40')
    expect(screen.getByTestId('recusa-highlight-0')).toHaveTextContent('1º aviso: o trecho em destaque passa de 40 caracteres.')
    expect(salvar()).toBeDisabled()
  })

  it('com o trecho acima do teto E o rótulo sem destino, a frase do rótulo vai ao campo do rótulo', async () => {
    montar()
    await pronto()
    adicionar()
    digitar('Trecho em destaque', 'a'.repeat(41))
    digitar('Rótulo do link', 'Ver')
    expect(screen.getByTestId('recusa-linkLabel-0')).toHaveTextContent('1º aviso: Sem destino, o rótulo do link não aparece.')
    expect(screen.queryByTestId('recusa-highlight-0')).toBeNull()
  })

  it('com trecho e texto vazios e rótulo preenchido, a frase do aviso vazio vai ao campo do texto', async () => {
    montar()
    await pronto()
    adicionar()
    digitar('Rótulo do link', 'Ver')
    expect(screen.getByTestId('recusa-text-0')).toHaveTextContent(
      '1º aviso: escreva o trecho em destaque ou o texto. Um aviso vazio não aparece na loja.',
    )
    expect(screen.queryByTestId('recusa-linkLabel-0')).toBeNull()
  })

  it('o teto conjunto recusa os três campos juntos acima de 90', async () => {
    montar()
    await pronto()
    adicionar()
    digitar('Trecho em destaque', 'a'.repeat(40))
    digitar('Texto', 'b'.repeat(40))
    digitar('Rótulo do link', 'c'.repeat(15))
    digitar('Destino', '/ofertas')
    expect(screen.getByTestId('recusa-text-0')).toHaveTextContent(
      '1º aviso: juntos, o trecho em destaque, o texto e o rótulo do link passam de 90 caracteres',
    )
    expect(salvar()).toBeDisabled()
  })

  it('recolhido, o aviso recusado mostra a recusa abaixo do cabeçalho', async () => {
    montar()
    await pronto()
    adicionar()
    digitar('Texto', 'Novidades')
    digitar('Destino', 'https://x.com')
    fireEvent.click(screen.getByTestId('resumo-aviso-0'))
    expect(screen.getByTestId('recusa-recolhida-0')).toHaveTextContent('1º aviso: O endereço precisa começar com “/”')
  })
})

describe('a lista de avisos', () => {
  it('"+ Adicionar aviso" some com 5, e o contador diz N de 5', async () => {
    montar()
    await pronto()
    expect(screen.getByTestId('contagem-avisos')).toHaveTextContent('0 de 5')
    for (let i = 0; i < 5; i += 1) adicionar()
    expect(screen.getByTestId('contagem-avisos')).toHaveTextContent('5 de 5')
    expect(screen.queryByRole('button', { name: '+ Adicionar aviso' })).toBeNull()
  })

  it('subir, descer e tirar mudam a ordem e a contagem', async () => {
    banco.settings = [
      {
        key: 'announcements',
        value: {
          enabled: true,
          items: ['Primeiro', 'Segundo', 'Terceiro'].map((t, i) => ({
            id: `a${i}`,
            kind: 'text',
            highlight: '',
            text: t,
            linkLabel: '',
            href: '',
          })),
        },
      },
    ]
    montar()
    await pronto()
    const titulos = () => screen.getAllByTestId(/^resumo-aviso-\d$/).map(b => b.textContent)
    await waitFor(() => expect(titulos()).toHaveLength(3))
    expect(screen.getByRole('button', { name: 'Subir o aviso 1' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Descer o aviso 3' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Descer o aviso 1' }))
    expect(titulos().map(t => t!.split('Texto ·')[0])).toEqual(['Segundo', 'Primeiro', 'Terceiro'])

    fireEvent.click(screen.getByRole('button', { name: 'Subir o aviso 3' }))
    expect(titulos().map(t => t!.split('Texto ·')[0])).toEqual(['Segundo', 'Terceiro', 'Primeiro'])

    fireEvent.click(screen.getByRole('button', { name: 'Tirar o aviso 1' }))
    expect(titulos().map(t => t!.split('Texto ·')[0])).toEqual(['Terceiro', 'Primeiro'])
    expect(screen.getByTestId('contagem-avisos')).toHaveTextContent('2 de 5')
  })

  it('um aviso aberto por vez', async () => {
    montar()
    await pronto()
    adicionar()
    adicionar()
    // O recém-criado abre; o anterior fecha.
    expect(screen.getByTestId('resumo-aviso-1')).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByTestId('resumo-aviso-0')).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(screen.getByTestId('resumo-aviso-0'))
    expect(screen.getByTestId('resumo-aviso-0')).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByTestId('resumo-aviso-1')).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getAllByLabelText('Tipo do aviso')).toHaveLength(1)
  })
})

describe('as frases do atraso e do tom', () => {
  it('o interruptor mostra a ajuda do atraso, e a ajuda de tom está no card dos avisos', async () => {
    montar()
    await pronto()
    expect(
      screen.getByText('Pode levar até uma hora para a faixa aparecer ou sumir em todas as páginas da loja.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Desligada, a faixa some e o cabeçalho volta para o topo.')).toBeInTheDocument()
    const card = screen.getByTestId('card-avisos')
    expect(
      within(card).getByText('Sem contagem regressiva, sem “últimas unidades” e sem exclamação: o tom da loja vale aqui também.'),
    ).toBeInTheDocument()
  })

  it('depois de salvar, a barra diz a frase do atraso', async () => {
    montar()
    await pronto()
    fireEvent.click(screen.getByRole('switch', { name: 'Faixa ligada' }))
    fireEvent.click(salvar())
    expect(
      await screen.findByText('Salvo. Pode levar até uma hora para a faixa aparecer ou sumir em todas as páginas da loja.'),
    ).toBeInTheDocument()
  })
})

describe('o envio da arte', () => {
  const arquivo = () => new File(['x'], 'arte.png', { type: 'image/png' })

  it('cada arte vai ao motor de envio, na pasta da faixa, e a URL cai no campo certo', async () => {
    motor.upload.mockResolvedValueOnce('https://cdn.test/home-images/announcements/d.webp')
    motor.upload.mockResolvedValueOnce('https://cdn.test/home-images/announcements/m.webp')
    montar()
    await pronto()
    adicionar()
    fireEvent.click(screen.getByRole('radio', { name: 'Imagem' }))

    fireEvent.change(campo('Enviar arte · 1440 × 48'), { target: { files: [arquivo()] } })
    await waitFor(() => expect(screen.getByTestId('miniatura-imageDesktop-0')).toBeInTheDocument())
    fireEvent.change(campo('Enviar arte · 780 × 96'), { target: { files: [arquivo()] } })
    await waitFor(() => expect(screen.getByTestId('miniatura-imageMobile-0')).toBeInTheDocument())

    expect(motor.upload).toHaveBeenCalledTimes(2)
    expect(motor.upload.mock.calls[0][1]).toEqual({ bucket: 'home-images', folder: 'announcements' })
    expect(screen.getByTestId('miniatura-imageDesktop-0')).toHaveAttribute('src', 'https://cdn.test/home-images/announcements/d.webp')
    expect(screen.getByTestId('miniatura-imageMobile-0')).toHaveAttribute('src', 'https://cdn.test/home-images/announcements/m.webp')
    // A miniatura tem a proporção da vaga.
    expect(screen.getByTestId('miniatura-imageDesktop-0').style.aspectRatio).toBe('1440 / 48')

    digitar('Texto alternativo', 'Frete grátis')
    fireEvent.click(salvar())
    await waitFor(() => expect(escritas()).toHaveLength(1))
    const valor = (escritas()[0].upsert!.rows as Linha).value as { items: Linha[] }
    expect(valor.items[0]).toEqual({
      id: expect.stringMatching(/^aviso-/),
      kind: 'image',
      imageDesktop: 'https://cdn.test/home-images/announcements/d.webp',
      imageMobile: 'https://cdn.test/home-images/announcements/m.webp',
      alt: 'Frete grátis',
      href: '',
    })
  })

  it('com só a arte do computador, a tela cobra a arte do celular e a descrição ao mesmo tempo', async () => {
    motor.upload.mockResolvedValueOnce('https://cdn.test/home-images/announcements/d.webp')
    montar()
    await pronto()
    adicionar()
    fireEvent.click(screen.getByRole('radio', { name: 'Imagem' }))

    fireEvent.change(campo('Enviar arte · 1440 × 48'), { target: { files: [arquivo()] } })
    await waitFor(() => expect(screen.getByTestId('miniatura-imageDesktop-0')).toBeInTheDocument())

    expect(screen.queryByTestId('recusa-imageDesktop-0')).toBeNull()
    expect(screen.getByTestId('recusa-imageMobile-0').textContent).toBe('1º aviso: envie a arte do celular.')
    expect(screen.getByTestId('recusa-alt-0').textContent).toBe(
      '1º aviso: Descreva a arte: é o que o leitor de tela e o Google leem.',
    )
    expect(screen.getByText('Corrija o que está marcado para salvar.')).toBeInTheDocument()
    expect(salvar()).toBeDisabled()

    // Recolhido, o cabeçalho também diz as duas pendências.
    fireEvent.click(screen.getByTestId('resumo-aviso-0'))
    const recolhida = screen.getByTestId('recusa-recolhida-0').textContent
    expect(recolhida).toContain('1º aviso: envie a arte do celular.')
    expect(recolhida).toContain('1º aviso: Descreva a arte: é o que o leitor de tela e o Google leem.')
  })

  it('a falha de envio mostra a mensagem no campo', async () => {
    motor.upload.mockResolvedValueOnce(null)
    montar()
    await pronto()
    adicionar()
    fireEvent.click(screen.getByRole('radio', { name: 'Imagem' }))
    fireEvent.change(campo('Enviar arte · 780 × 96'), { target: { files: [arquivo()] } })
    expect(await screen.findByTestId('recado-imageMobile-0')).toHaveTextContent('arte.png: falha ao enviar')
  })
})

describe('a ponte da prévia', () => {
  it('manda o rascunho com a origem exata da loja, e "mostre o aviso N" no anterior/próximo', async () => {
    banco.settings = [
      {
        key: 'announcements',
        value: {
          enabled: true,
          items: ['Primeiro', 'Segundo'].map((t, i) => ({ id: `a${i}`, kind: 'text', highlight: '', text: t, linkLabel: '', href: '' })),
        },
      },
    ]
    montar()
    await pronto()
    const iframe = document.querySelector('iframe') as HTMLIFrameElement
    const postMessage = vi.fn()
    Object.defineProperty(iframe, 'contentWindow', { value: { postMessage }, configurable: true })

    expect(screen.getByTestId('aviso-n-de-m')).toHaveTextContent('Aviso 1 de 2')
    fireEvent.click(screen.getByRole('button', { name: 'Próximo aviso' }))
    expect(screen.getByTestId('aviso-n-de-m')).toHaveTextContent('Aviso 2 de 2')
    expect(postMessage).toHaveBeenCalledWith(
      { source: 'estrelinha-announcements-preview', type: 'show', index: 1 },
      'http://localhost:8082',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Aviso anterior' }))
    expect(postMessage).toHaveBeenLastCalledWith(
      { source: 'estrelinha-announcements-preview', type: 'show', index: 0 },
      'http://localhost:8082',
    )

    // Mexer no rascunho manda a faixa inteira, com atraso curto e com a origem exata.
    fireEvent.click(screen.getByRole('switch', { name: 'Faixa ligada' }))
    await act(async () => {
      await new Promise(r => setTimeout(r, 300))
    })
    const rascunhos = postMessage.mock.calls.filter(([m]) => m.type === 'draft')
    expect(rascunhos.length).toBeGreaterThan(0)
    const [mensagem, origem] = rascunhos[rascunhos.length - 1]
    expect(origem).toBe('http://localhost:8082')
    expect(mensagem).toEqual({
      source: 'estrelinha-announcements-preview',
      type: 'draft',
      announcements: {
        enabled: false,
        items: [
          { id: 'a0', kind: 'text', highlight: '', text: 'Primeiro', linkLabel: '', href: '' },
          { id: 'a1', kind: 'text', highlight: '', text: 'Segundo', linkLabel: '', href: '' },
        ],
      },
    })
  })

  it('o aviso recém-acrescentado vai à frente DEPOIS do rascunho que o contém', async () => {
    banco.settings = [
      {
        key: 'announcements',
        value: { enabled: true, items: [{ id: 'a0', kind: 'text', highlight: '', text: 'Primeiro', linkLabel: '', href: '' }] },
      },
    ]
    montar()
    await pronto()
    const iframe = document.querySelector('iframe') as HTMLIFrameElement
    const postMessage = vi.fn()
    Object.defineProperty(iframe, 'contentWindow', { value: { postMessage }, configurable: true })
    await act(async () => {
      await new Promise(r => setTimeout(r, 300))
    })
    postMessage.mockClear()

    adicionar()
    await act(async () => {
      await new Promise(r => setTimeout(r, 300))
    })
    const tipos = postMessage.mock.calls.map(([m]) => m.type)
    const ultimoRascunho = tipos.lastIndexOf('draft')
    expect(ultimoRascunho).toBeGreaterThanOrEqual(0)
    // Depois do rascunho com dois avisos, o "mostre" do segundo — a loja só o aceita com ele na lista.
    expect(postMessage.mock.calls[ultimoRascunho + 1]?.[0]).toEqual({
      source: 'estrelinha-announcements-preview',
      type: 'show',
      index: 1,
    })
  })

  it('desligada, a prévia diz que a loja abre sem a faixa e não oferece navegação', async () => {
    montar()
    await pronto()
    const regiao = screen.getByRole('region', { name: 'Prévia da faixa' })
    expect(within(regiao).getByText('A faixa está desligada: a loja abre sem ela.')).toBeInTheDocument()
    expect(within(regiao).queryByRole('button', { name: 'Próximo aviso' })).toBeNull()
  })
})
