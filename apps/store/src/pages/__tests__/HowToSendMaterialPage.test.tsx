// Feature 31 — o guia de material redesenhado (`5MC-0` / `6AU-0`).
//
// Herda a régua da feature 22 e acrescenta a da 31. Quatro coisas aqui não são cosméticas:
//
// 1. **Toda âncora de `MATERIAL_KINDS` existe na página.** É contrato com a página do produto, que
//    monta `/como-enviar-seu-material-de-dna#cinzas` desde a feature 22. Âncora quebrada **não dá
//    404**: a página abre, não rola, e ninguém descobre.
// 2. **O endereço nunca aparece pela metade.** Endereço incompleto não é layout feio: é cinzas
//    postadas para um lugar que não existe.
// 3. **Os cinco vídeos abrem em tela cheia, e o iframe só existe depois do clique.** É a decisão de
//    privacidade e de peso da seção nova — cinco players embutidos carregariam o YouTube em quem só
//    passou pela página.
// 4. **O registro continua memorial.** Sem emoji, sem urgência fabricada.

import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MATERIAL_KINDS } from '@estrelinha/core/material'
import { ROUTE_SLUGS, legacyRedirectTo } from '@estrelinha/core/routes'

const state = vi.hoisted(() => ({
  material: {
    recipient: '', street: '', number: '', complement: '', neighborhood: '',
    city: '', state: '', zip: '', notes: '',
  },
  whatsapp: '5551999999999',
}))

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useMaterialSettings: () => state.material,
  useGeneralSettings: () => ({
    store_name: 'Uma Estrelinha',
    whatsapp: state.whatsapp,
    whatsapp_message: '',
    email: '',
    instagram: '',
    tiktok: '',
  }),
}))

import HowToSendMaterialPage, { HOW_TO_SEND_PATH } from '../HowToSendMaterialPage'
import {
  ANCORAS_DO_GUIA,
  ATALHOS_DE_MATERIAL,
  MATERIAIS_SEM_ANCORA,
  VIDEOS_DE_PREPARO,
} from '@/widgets/material-guide'

const abrir = () =>
  render(
    <MemoryRouter>
      <HowToSendMaterialPage />
    </MemoryRouter>,
  )

beforeEach(() => {
  state.material = {
    recipient: '', street: '', number: '', complement: '', neighborhood: '',
    city: '', state: '', zip: '', notes: '',
  }
  state.whatsapp = '5551999999999'
  document.head.querySelector('link[rel="canonical"]')?.remove()
})

describe('guia de material — endereçamento (AD-018 + feature 31)', () => {
  it('o slug da rota está em `ROUTE_SLUGS`', () => {
    // Sem isto, uma categoria com este slug seria encoberta pela rota, em silêncio e em produção.
    expect(ROUTE_SLUGS).toContain('como-enviar-seu-material-de-dna')
    expect(HOW_TO_SEND_PATH).toBe('/como-enviar-seu-material-de-dna')
  })

  it('o endereço antigo continua reservado E redireciona para o novo', () => {
    // As duas metades importam. Sem o redirect, a URL que está no rodapé de todo e-mail já enviado
    // vira 404. Sem a reserva, uma categoria ocuparia o slug e engoliria o redirect.
    expect(ROUTE_SLUGS).toContain('como-enviar-o-material')
    expect(legacyRedirectTo('/como-enviar-o-material')).toBe(HOW_TO_SEND_PATH)
  })

  it('o redirect de caminho fixo não sequestra rota mais funda', () => {
    // A entrada nova não tem `:slug`. Se a busca por padrão a alcançasse, `/como-enviar-o-material/x`
    // produziria um destino com `:slug` literal na URL.
    expect(legacyRedirectTo('/como-enviar-o-material/qualquer-coisa')).toBeNull()
  })

  it('declara a canônica dela', () => {
    abrir()
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    expect(canonical?.getAttribute('href')).toContain(HOW_TO_SEND_PATH)
  })
})

describe('guia de material — toda âncora de material tem destino', () => {
  it('nenhum `MaterialKind` fica sem âncora no dado', () => {
    // A régua antes do render: se um material novo entrar em `MATERIAL_KINDS` sem entrar no guia,
    // isto reprova aqui, com o nome dele na mensagem.
    expect(MATERIAIS_SEM_ANCORA).toEqual([])
  })

  it.each(MATERIAL_KINDS)('`%s` tem um alvo de rolagem renderizado', kind => {
    abrir()
    const anchor = kind.replace(/_/g, '-')
    expect(document.getElementById(anchor), `âncora ausente: ${anchor}`).not.toBeNull()
  })

  it('todo atalho do seletor aponta para uma âncora que existe na página', () => {
    abrir()
    // Âncora dupla: contou os atalhos e conferiu cada destino. Um atalho para um `id` que ninguém
    // renderiza sai como rolagem que não acontece — sem erro no console, sem 404.
    expect(ATALHOS_DE_MATERIAL.length).toBeGreaterThanOrEqual(10)

    const quebrados = ATALHOS_DE_MATERIAL.filter(
      atalho => document.getElementById(atalho.anchor) === null,
    ).map(atalho => atalho.anchor)

    expect(quebrados).toEqual([])
  })

  it('os atalhos são links de verdade, e não botões com rolagem no clique', () => {
    abrir()
    // Link de verdade põe o endereço na barra, sobrevive ao F5 e pode ser copiado para o WhatsApp —
    // que é exatamente o uso: a Adri manda "olha o item das cinzas".
    const atalhos = screen.getByRole('navigation', { name: /atalhos por material/i })
    const links = within(atalhos).getAllByRole('link')

    expect(links).toHaveLength(ATALHOS_DE_MATERIAL.length)
    expect(links[0]).toHaveAttribute('href', `#${ATALHOS_DE_MATERIAL[0].anchor}`)
  })

  it('a lista de âncoras não tem repetição — dois `id` iguais quebram a rolagem', () => {
    expect(new Set(ANCORAS_DO_GUIA).size).toBe(ANCORAS_DO_GUIA.length)
  })
})

describe('guia de material — o conteúdo dos artboards', () => {
  it('tem o título da página e os quatro passos', () => {
    abrir()
    expect(
      screen.getByRole('heading', { level: 1, name: /como enviar seu material com segurança/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /do pedido à joia, em quatro passos/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('Escolha sua joia')).toBeInTheDocument()
    expect(screen.getByText('Poste e envie o código')).toBeInTheDocument()
  })

  it('as três fichas ricas trazem quantidade e preparo', () => {
    abrir()
    // A quantidade é o que as pessoas mais erram: vago aqui vira material demais enviado — ou de
    // menos, e a peça não sai.
    for (const [anchor, quantidade] of [
      ['leite-materno', '10 ml'],
      ['cabelo', '1 mecha'],
      ['cinzas', 'a que desejar'],
    ] as const) {
      const ficha = document.getElementById(anchor) as HTMLElement
      expect(ficha, `ficha ausente: ${anchor}`).not.toBeNull()
      expect(within(ficha).getByText(quantidade)).toBeInTheDocument()
      expect(within(ficha).getByText(/como preparar e embalar/i)).toBeInTheDocument()
    }
  })

  it('o aviso que estraga material está na ficha de cabelos, e é o de tom de alerta', () => {
    abrir()
    const ficha = document.getElementById('cabelo') as HTMLElement
    expect(within(ficha).getByText(/nunca use fita adesiva/i)).toBeInTheDocument()
  })

  it('a declaração de conteúdo mostra o que escrever e o que nunca escrever', () => {
    abrir()
    // É o trecho que mais evita problema real: quem escreve "cinzas" na etiqueta tem a encomenda
    // retida. Os dois cartões são exemplos literais, prontos para copiar.
    expect(screen.getByText('Itens pessoais')).toBeInTheDocument()
    expect(screen.getByText('Lembranças')).toBeInTheDocument()
    expect(screen.getByText('Cinzas / restos humanos')).toBeInTheDocument()
  })

  it('o preparo em casa cobre placenta e sangue, com os seis passos de cada', () => {
    abrir()
    for (const anchor of ['placenta', 'sangue-desidratado']) {
      const bloco = document.getElementById(anchor) as HTMLElement
      expect(bloco, `bloco ausente: ${anchor}`).not.toBeNull()
      expect(within(bloco).getAllByRole('listitem')).toHaveLength(6)
    }
  })

  it('o checklist tem as seis conferidas, e não é formulário', () => {
    abrir()
    const titulo = screen.getByRole('heading', { name: /antes de fechar a caixa/i })
    const secao = titulo.closest('section') as HTMLElement

    expect(within(secao).getAllByRole('listitem')).toHaveLength(6)
    // Marcar aqui não guarda estado em lugar nenhum; um controle que esquece o que a cliente marcou é
    // pior do que nenhum controle — ela fecharia a caixa confiando numa memória que a página não tem.
    expect(within(secao).queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('não usa emoji nem linguagem festiva — o registro é memorial', () => {
    abrir()
    const texto = document.body.textContent ?? ''
    expect(texto).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u)
    expect(texto).not.toMatch(/últimas unidades|corra|aproveite já|imperdível/i)
  })
})

describe('guia de material — os vídeos de preparo', () => {
  it('lista os cinco vídeos', () => {
    abrir()
    expect(VIDEOS_DE_PREPARO).toHaveLength(5)
    for (const video of VIDEOS_DE_PREPARO) {
      expect(screen.getByText(video.titulo)).toBeInTheDocument()
    }
  })

  it('nenhum iframe existe antes do clique', () => {
    abrir()
    // A razão de o player não morar no cartão: cinco iframes carregariam cinco vezes o script do
    // YouTube em quem só passou pela página — peso e rastreio antes de qualquer clique.
    expect(document.querySelectorAll('iframe')).toHaveLength(0)
  })

  it('abrir um vídeo monta o player daquele vídeo, no domínio sem cookie', async () => {
    abrir()

    const alvo = VIDEOS_DE_PREPARO[0]
    fireEvent.click(screen.getByRole('button', { name: new RegExp(alvo.titulo, 'i') }))

    const iframe = await screen.findByTitle(alvo.titulo)
    expect(iframe.tagName).toBe('IFRAME')
    expect(iframe).toHaveAttribute('src', expect.stringContaining('youtube-nocookie.com'))
    expect(iframe).toHaveAttribute('src', expect.stringContaining(alvo.id))
  })

  it('o diálogo oferece o link de fora — o embed pode não tocar', async () => {
    abrir()

    const alvo = VIDEOS_DE_PREPARO[0]
    fireEvent.click(screen.getByRole('button', { name: new RegExp(alvo.titulo, 'i') }))

    // Extensão de bloqueio, rede corporativa, política do navegador: sem este link a cliente vê um
    // retângulo preto e conclui que o vídeo não existe.
    const externo = await screen.findByRole('link', { name: /abrir no youtube/i })
    expect(externo).toHaveAttribute('href', `https://youtu.be/${alvo.id}`)
    expect(externo).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('a ficha com vídeo abre o MESMO diálogo, com o vídeo daquele material', async () => {
    abrir()

    const ficha = document.getElementById('leite-materno') as HTMLElement
    fireEvent.click(within(ficha).getByRole('button', { name: /ver o vídeo/i }))

    const iframe = await screen.findByTitle(/leite materno/i)
    expect(iframe).toHaveAttribute('src', expect.stringContaining('H4XRcc0ZoUA'))
  })
})

describe('guia de material — o endereço nunca aparece pela metade', () => {
  it('endereço não configurado ⇒ NENHUM endereço, e o convite a falar com a loja', () => {
    abrir()
    expect(screen.getByText(/confirme o endereço com a gente/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /falar pelo whatsapp/i })).toBeInTheDocument()
  })

  it('só logradouro, sem cidade, ainda é "pela metade" — e não é exibido', () => {
    state.material = { ...state.material, street: 'Rua das Flores', number: '100' }
    abrir()

    expect(screen.getByText(/confirme o endereço com a gente/i)).toBeInTheDocument()
    expect(screen.queryByText(/Rua das Flores/)).not.toBeInTheDocument()
  })

  it('endereço completo é exibido, com destinatário, CEP e observação', () => {
    state.material = {
      recipient: 'Adri Muniz',
      street: 'Rua das Flores',
      number: '100',
      complement: 'sala 2',
      neighborhood: 'Centro',
      city: 'Porto Alegre',
      state: 'RS',
      zip: '90000100',
      notes: 'Recebo de segunda a sexta.',
    }
    abrir()

    expect(screen.getByText('Adri Muniz')).toBeInTheDocument()
    expect(screen.getByText('Rua das Flores, 100')).toBeInTheDocument()
    expect(screen.getByText('sala 2 · Centro')).toBeInTheDocument()
    expect(screen.getByText('Porto Alegre/RS · 90000100')).toBeInTheDocument()
    expect(screen.getByText('Recebo de segunda a sexta.')).toBeInTheDocument()
    expect(screen.queryByText(/confirme o endereço com a gente/i)).not.toBeInTheDocument()
  })

  it('sem WhatsApp configurado, nem o convite nem a faixa viram link quebrado', () => {
    state.whatsapp = ''
    abrir()

    expect(screen.getByText(/confirme o endereço com a gente/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /falar pelo whatsapp/i })).not.toBeInTheDocument()
    // A faixa do fim também some inteira, em vez de mostrar um botão que abre conversa com ninguém.
    expect(screen.queryByRole('link', { name: /falar com a adri/i })).not.toBeInTheDocument()
  })
})
