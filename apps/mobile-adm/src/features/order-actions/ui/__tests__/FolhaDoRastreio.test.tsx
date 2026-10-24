// Feature `75` · T22 — a folha do rastreio (`MAA-10`, `MAA-11` frases, `MAA-12`, `MAA-13` fecha só
// depois do sucesso, `MAA-20`, `MAA-32`, `MAA-34`, A23). A porta (`gravarAcao`) é dublada por módulo:
// aqui se prova a FOLHA — o que ela diz, o que ela recusa sem rede, o que ela manda à porta e quando
// ela fecha. A fiação na árvore real é da T23 (`pages/__tests__/acoesDoPedido.test.tsx`).
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { LinhaDaLista } from '@/entities/order'
import { linha } from '@/test/pedidos'

import { esquecerAcoes, useAcaoDoPedido, useFolhaNoHistorico } from '../..'
import type { ResultadoDaAcao } from '../../api/gravarAcao'
import FolhaDoRastreio from '../FolhaDoRastreio'

const porta = vi.hoisted(() => ({ gravarAcao: vi.fn() }))
vi.mock('../../api/gravarAcao', () => ({ gravarAcao: porta.gravarAcao }))
vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const ID = '00000000-0000-4000-8000-000000000244'
const SEPARANDO = linha({ status: 'separating' })
const tokens = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)

let n = 0
const montarHistorico = () => {
  n += 1
  window.history.pushState({ usr: null, key: `s-${n}`, idx: 0 }, '', `/sentinela-${n}`)
  window.history.pushState({ usr: { doApp: true }, key: `p-${n}`, idx: 1 }, '', `/pedidos/${ID}`)
}

const Abridor = ({
  row,
  origem,
  aviso,
  comAbridor = true,
}: {
  row: LinhaDaLista
  origem: 'acao' | 'entrega'
  aviso?: boolean
  comAbridor?: boolean
}) => {
  const controle = useFolhaNoHistorico(row, origem, aviso)
  const acao = useAcaoDoPedido(row.id)
  return (
    <main>
      <h1>Pedido #0244</h1>
      {comAbridor && (
        <button type="button" onClick={controle.abrir}>
          abrir
        </button>
      )}
      <FolhaDoRastreio row={row} origem={origem} controle={controle} acao={acao} />
    </main>
  )
}

const montar = (row: LinhaDaLista = SEPARANDO, origem: 'acao' | 'entrega' = 'acao', aviso?: boolean) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const arvore = (comAbridor: boolean) => (
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <Abridor row={row} origem={origem} aviso={aviso} comAbridor={comAbridor} />
      </BrowserRouter>
    </QueryClientProvider>
  )
  const r = render(arvore(true))
  return { ...r, semAbridor: () => r.rerender(arvore(false)) }
}
const abrir = () => act(() => fireEvent.click(screen.getByRole('button', { name: 'abrir' })))
const folha = () => screen.queryByRole('dialog')
const campo = () => screen.getByLabelText('Código de rastreio') as HTMLInputElement
const salvar = () => screen.getByRole('button', { name: /^(Salvar|Salvando…)$/ })
const esperar = () => act(() => new Promise<void>((r) => setTimeout(r, 30)))

beforeEach(() => {
  esquecerAcoes()
  porta.gravarAcao.mockReset()
  montarHistorico()
})
afterEach(() => act(() => esquecerAcoes()))

describe('o que a folha diz (MAA-10, MAA-11 — texto por extenso)', () => {
  it.each([
    [
      'separating, pelo rodapé',
      linha({ status: 'separating' }),
      'acao',
      'Marcar como enviado',
      'A cliente recebe o e-mail de postagem assim que você salvar o código.',
      '',
    ],
    [
      'shipped sem código, pelo rodapé',
      linha({ status: 'shipped', tracking_code: null }),
      'acao',
      'Salvar rastreio',
      'A cliente recebe o e-mail de postagem assim que você salvar o código.',
      '',
    ],
    [
      'shipped com código, pela Entrega, sem saber se o aviso de postagem saiu',
      linha({ status: 'shipped', tracking_code: 'BR123456789BR' }),
      'entrega',
      'Alterar rastreio',
      'O código aparece no pedido dela.',
      'BR123456789BR',
    ],
    ['delivered sem código, pela Entrega', linha({ status: 'delivered', tracking_code: null }), 'entrega', 'Salvar rastreio', 'O código aparece no pedido dela.', ''],
    [
      'delivered com código, pela Entrega',
      linha({ status: 'delivered', tracking_code: 'BR987654321BR' }),
      'entrega',
      'Alterar rastreio',
      'O código aparece no pedido dela.',
      'BR987654321BR',
    ],
  ] as const)('%s: título, frase e valor inicial de `trackingSheet`', async (_n, row, origem, titulo, frase, valor) => {
    montar(row, origem)
    expect(folha()).toBeNull()
    await abrir()
    expect(screen.getByRole('dialog', { name: titulo })).toBeInTheDocument()
    expect(screen.getByText(frase)).toBeInTheDocument()
    expect(campo().value).toBe(valor)
  })

  // BUG-20261024-folha-afirma-aviso-que-falhou: a frase 2 só com o aviso de postagem SAÍDO.
  it.each([
    ['saiu', true, 'A cliente já recebeu o aviso de postagem. O código novo aparece no pedido dela, mas não gera outro e-mail.'],
    ['falhou', false, 'O código aparece no pedido dela.'],
  ] as const)('shipped com código e o aviso de postagem que %s ⇒ a frase de `trackingSheet` para ele', async (_n, aviso, frase) => {
    montar(linha({ status: 'shipped', tracking_code: 'BR123456789BR' }), 'entrega', aviso)
    await abrir()
    expect(screen.getByRole('dialog', { name: 'Alterar rastreio' })).toBeInTheDocument()
    expect(screen.getByText(frase)).toBeInTheDocument()
    if (!aviso) expect(screen.queryByText(/já recebeu/)).toBeNull()
  })

  it('o campo: rótulo, placeholder, teclado de texto em maiúsculas, sem preenchimento automático', async () => {
    montar()
    await abrir()
    const c = campo()
    expect(c).toHaveAttribute('placeholder', 'Ex.: AN123456789BR')
    expect(c).toHaveAttribute('autocapitalize', 'characters')
    expect(c).toHaveAttribute('inputmode', 'text')
    expect(c).toHaveAttribute('autocomplete', 'off')
  })

  it('o foco vai ao campo ao abrir (MAA-32)', async () => {
    montar()
    await abrir()
    await esperar()
    expect(document.activeElement).toBe(campo())
  })

  it('normaliza enquanto ela digita: maiúsculas, sem espaços (MAA-12, A8)', async () => {
    montar()
    await abrir()
    fireEvent.change(campo(), { target: { value: ' an 123 456 789 br ' } })
    expect(campo().value).toBe('AN123456789BR')
  })
})

describe('o código curto (MAA-12)', () => {
  it('a frase de `trackingCodeRefusal` NO campo, e ZERO chamadas à porta', async () => {
    montar()
    await abrir()
    fireEvent.change(campo(), { target: { value: 'an 123' } })
    await act(async () => {
      fireEvent.click(salvar())
    })
    const frase = screen.getByText('Confira o código — ele costuma ter 13 caracteres.')
    expect(campo()).toHaveAttribute('aria-invalid', 'true')
    expect(campo().getAttribute('aria-describedby')).toBe(frase.id)
    expect(frase.id).not.toBe('')
    expect(porta.gravarAcao).not.toHaveBeenCalled()
    expect(folha()).toBeInTheDocument()
  })

  it('sem recusa, o campo não é inválido', async () => {
    montar()
    await abrir()
    expect(campo()).not.toHaveAttribute('aria-invalid', 'true')
  })
})

describe('salvar (MAA-13, MAA-20)', () => {
  it('manda à porta o rastreio DIGITADO, com a origem — e fecha SÓ depois do sucesso', async () => {
    let soltar: (r: ResultadoDaAcao) => void = () => {}
    porta.gravarAcao.mockImplementationOnce(() => new Promise<ResultadoDaAcao>((ok) => (soltar = ok)))
    montar()
    await abrir()
    fireEvent.change(campo(), { target: { value: 'an123456789br' } })
    await act(async () => {
      fireEvent.click(salvar())
    })
    expect(porta.gravarAcao).toHaveBeenCalledTimes(1)
    expect(porta.gravarAcao.mock.calls[0][1]).toEqual({ tipo: 'rastreio', codigo: 'AN123456789BR', origem: 'acao' })
    // No ar: "Salvando…", travado, e a folha continua.
    expect(salvar()).toHaveTextContent('Salvando…')
    expect(salvar()).toHaveAttribute('aria-disabled', 'true')
    expect(folha()).toBeInTheDocument()
    // Um segundo toque não sai.
    await act(async () => {
      fireEvent.click(salvar())
    })
    expect(porta.gravarAcao).toHaveBeenCalledTimes(1)
    await act(async () => {
      soltar({ tipo: 'ok', emailSent: true, materialMudou: false })
    })
    await esperar()
    expect(folha()).toBeNull()
  })

  it('com FALHA a folha continua aberta, com o erro (`role="alert"`), e "Salvar" volta', async () => {
    porta.gravarAcao.mockResolvedValueOnce({ tipo: 'falhou', erro: new Error('rede') })
    montar()
    await abrir()
    fireEvent.change(campo(), { target: { value: 'AN123456789BR' } })
    await act(async () => {
      fireEvent.click(salvar())
    })
    await esperar()
    expect(folha()).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Não consegui salvar. Tente de novo.')
    expect(salvar()).toHaveTextContent(/^Salvar$/)
    expect(salvar()).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('com "mudou" a folha continua aberta com a frase — nunca diz que salvou', async () => {
    porta.gravarAcao.mockResolvedValueOnce({ tipo: 'mudou' })
    montar()
    await abrir()
    fireEvent.change(campo(), { target: { value: 'AN123456789BR' } })
    await act(async () => {
      fireEvent.click(salvar())
    })
    await esperar()
    expect(folha()).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Este pedido mudou enquanto você olhava.')
  })

  it('a parcial do rastreio FECHA a folha: o código ficou salvo, e o "Tentar de novo" é do rodapé (MAA-15 a)', async () => {
    porta.gravarAcao.mockResolvedValueOnce({ tipo: 'parcial', etapa: 'rastreio', causa: 'falhou' })
    montar()
    await abrir()
    fireEvent.change(campo(), { target: { value: 'AN123456789BR' } })
    await act(async () => {
      fireEvent.click(salvar())
    })
    await esperar()
    expect(folha()).toBeNull()
  })

  // Rodada 1 do Verificador (N05 + N25): "enquanto salva, nada fecha" não tinha régua. Cada caminho de
  // fechar é disparado com a gravação NO AR, e a folha tem de continuar, com "Salvando…". Um caso por
  // caminho: o Escape e o fundo passam pelo `onOpenChange`, "Agora não" pelo próprio `onClick` — um
  // mutante em um deles não pode ser morto pelo caso do outro.
  const comGravacaoNoAr = async () => {
    let soltar: (r: ResultadoDaAcao) => void = () => {}
    porta.gravarAcao.mockImplementationOnce(() => new Promise<ResultadoDaAcao>((ok) => (soltar = ok)))
    montar()
    await abrir()
    await esperar()
    fireEvent.change(campo(), { target: { value: 'AN123456789BR' } })
    await act(async () => {
      fireEvent.click(salvar())
    })
    expect(salvar()).toHaveTextContent('Salvando…')
    return (r: ResultadoDaAcao) => soltar(r)
  }
  const fundo = () =>
    [...document.querySelectorAll('[data-state="open"]')].find(
      (el) => el.getAttribute('role') !== 'dialog' && tokens(el).includes('bg-black/80'),
    ) as HTMLElement
  const tocarNoFundo = () => {
    const f = fundo()
    expect(f).toBeTruthy()
    fireEvent.pointerDown(f)
    fireEvent.pointerUp(f)
    fireEvent.click(f)
  }
  const continuaSalvando = async () => {
    await esperar()
    expect(folha()).toBeInTheDocument()
    expect(salvar()).toHaveTextContent('Salvando…')
    expect(salvar()).toHaveAttribute('aria-disabled', 'true')
  }
  const fechaDepoisDoSucesso = async (soltar: (r: ResultadoDaAcao) => void) => {
    await act(async () => {
      soltar({ tipo: 'ok', emailSent: true, materialMudou: false })
    })
    await esperar()
    expect(folha()).toBeNull()
  }

  it('com a gravação no ar, o ESCAPE não fecha a folha; depois do sucesso ela fecha (MAA-13)', async () => {
    const soltar = await comGravacaoNoAr()
    await act(async () => {
      fireEvent.keyDown(folha()!, { key: 'Escape' })
    })
    await continuaSalvando()
    await fechaDepoisDoSucesso(soltar)
  })

  it('com a gravação no ar, tocar no FUNDO não fecha a folha; depois do sucesso ela fecha (MAA-13)', async () => {
    const soltar = await comGravacaoNoAr()
    await act(async () => {
      tocarNoFundo()
    })
    await continuaSalvando()
    await fechaDepoisDoSucesso(soltar)
  })

  it('com a gravação no ar, "Agora não" não fecha a folha; depois do sucesso ela fecha (MAA-13)', async () => {
    const soltar = await comGravacaoNoAr()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Agora não' }))
    })
    await continuaSalvando()
    await fechaDepoisDoSucesso(soltar)
  })

  // Os inversos: sem gravação no ar, os mesmos gestos FECHAM — senão os casos acima seriam verdadeiros
  // com o gesto simplesmente sem efeito no jsdom.
  it.each([
    ['o Escape', () => fireEvent.keyDown(folha()!, { key: 'Escape' })],
    ['o fundo', tocarNoFundo],
  ] as const)('sem gravação no ar, %s fecha a folha sem ir à porta', async (_n, gesto) => {
    montar()
    await abrir()
    await esperar()
    await act(async () => {
      gesto()
    })
    await esperar()
    expect(folha()).toBeNull()
    expect(porta.gravarAcao).not.toHaveBeenCalled()
  })

  it('"Agora não" fecha sem ir à porta', async () => {
    montar()
    await abrir()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Agora não' }))
    })
    await esperar()
    expect(folha()).toBeNull()
    expect(porta.gravarAcao).not.toHaveBeenCalled()
  })
})

describe('a forma (MAA-31, MAA-32, MAA-34, R2)', () => {
  it('"Agora não" e "Salvar" com `min-h-12` (token exato); sem o X do canto', async () => {
    montar()
    await abrir()
    expect(tokens(screen.getByRole('button', { name: 'Agora não' }))).toContain('min-h-12')
    expect(tokens(salvar())).toContain('min-h-12')
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
  })

  it('o movimento da folha DESLIGA com menos movimento, no seletor de estado (R2 — o par puro não basta)', async () => {
    montar()
    await abrir()
    const t = tokens(folha())
    expect(t).toContain('motion-reduce:data-[state=open]:animate-none')
    expect(t).toContain('motion-reduce:data-[state=closed]:animate-none')
  })

  // B02 (prova em navegador da T31): com `prefers-reduced-motion: reduce`, o Chromium ainda listava UMA
  // animação ao abrir e ao fechar a folha — o `fade` do FUNDO (`SheetOverlay`), que o `SheetContent`
  // monta por dentro e que não recebia classe. O design (§13, item 5) mede por `getAnimations()` vazio.
  it('o FUNDO da folha também desliga o movimento com menos movimento, nos dois estados (B02)', async () => {
    montar()
    await abrir()
    const fundo = [...document.querySelectorAll('[data-state="open"]')].find(
      (el) => el.getAttribute('role') !== 'dialog' && tokens(el).includes('bg-black/80'),
    )
    expect(fundo).toBeTruthy()
    const t = tokens(fundo!)
    expect(t).toContain('motion-reduce:data-[state=open]:animate-none')
    expect(t).toContain('motion-reduce:data-[state=closed]:animate-none')
  })

  it('o `bottom` da folha é o deslocamento do teclado virtual (0 sem teclado; 336 com ele)', async () => {
    montar()
    await abrir()
    expect(folha()!.style.bottom).toBe('0px')
  })

  it('com o teclado aberto (`visualViewport` reduzido), a folha sobe a altura dele', async () => {
    const ouvintes: Record<string, () => void> = {}
    const vv = {
      height: 508,
      offsetTop: 0,
      addEventListener: (t: string, f: () => void) => (ouvintes[t] = f),
      removeEventListener: () => {},
    }
    const antes = Object.getOwnPropertyDescriptor(window, 'visualViewport')
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: vv })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 })
    try {
      montar()
      await abrir()
      expect(folha()!.style.bottom).toBe('336px')
    } finally {
      if (antes) Object.defineProperty(window, 'visualViewport', antes)
      else delete (window as { visualViewport?: unknown }).visualViewport
    }
  })
})

// BUG-20261024-folha-fecha-e-foco-cai-no-body (QA da `75`, C03): a folha é um `<Sheet>` controlado,
// sem `SheetTrigger` — o Radix só devolve o foco ao gatilho que ele conhece, e aqui não há gatilho.
// Fechar por qualquer caminho deixava `document.activeElement` no `<body>`: o leitor de tela recomeçava
// do topo. A régua é o controle que ABRIU (focado como o teclado e o TalkBack focam), um caso por
// caminho de fechar — o Escape e o voltar não passam pelo mesmo código que "Agora não".
describe('o foco ao fechar volta a quem abriu (BUG-20261024-folha-fecha-e-foco-cai-no-body)', () => {
  const abrirComFoco = async () => {
    const abridor = screen.getByRole('button', { name: 'abrir' })
    act(() => abridor.focus())
    expect(document.activeElement).toBe(abridor)
    await abrir()
    await esperar()
    expect(document.activeElement).toBe(campo())
    return abridor
  }

  it.each([
    ['"Agora não"', () => fireEvent.click(screen.getByRole('button', { name: 'Agora não' }))],
    ['o Escape', () => fireEvent.keyDown(folha()!, { key: 'Escape' })],
    ['o voltar do navegador', () => window.history.back()],
  ] as const)('fechar por %s devolve o foco ao controle que abriu, nunca ao <body>', async (_n, gesto) => {
    montar()
    const abridor = await abrirComFoco()
    await act(async () => {
      gesto()
    })
    await esperar()
    expect(folha()).toBeNull()
    // O Radix devolve o foco num `setTimeout` depois de desmontar o conteúdo: espera-se o desfecho.
    await waitFor(() => expect(document.activeElement).toBe(abridor))
    expect(document.activeElement).not.toBe(document.body)
  })

  // Revalidação V12: o Safari do iPhone NÃO foca o botão tocado — ao abrir, `document.activeElement`
  // é o `<body>`. Guardar o `<body>` como "quem abriu" devolveria o foco a ele ao fechar: o C03 de novo.
  // Sem abridor de verdade, o foco vai ao título da página.
  it('aberta com o foco no <body> (o toque do Safari no iPhone): ao fechar o foco vai ao título, nunca ao <body>', async () => {
    montar()
    act(() => (document.activeElement as HTMLElement | null)?.blur())
    expect(document.activeElement).toBe(document.body)
    await abrir()
    await esperar()
    expect(document.activeElement).toBe(campo())
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Agora não' }))
    })
    await esperar()
    expect(folha()).toBeNull()
    const titulo = screen.getByRole('heading', { level: 1, name: 'Pedido #0244' })
    await waitFor(() => expect(document.activeElement).toBe(titulo))
    expect(document.activeElement).not.toBe(document.body)
  })

  it('depois de "Salvar" com sucesso, o foco volta ao controle que abriu', async () => {
    porta.gravarAcao.mockResolvedValueOnce({ tipo: 'ok', emailSent: true, materialMudou: false })
    montar()
    const abridor = await abrirComFoco()
    fireEvent.change(campo(), { target: { value: 'AN123456789BR' } })
    await act(async () => {
      fireEvent.click(salvar())
    })
    await esperar()
    expect(folha()).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(abridor))
  })

  it('se o controle que abriu SAIU da tela (o rodapé some depois do envio), o foco vai ao título da página', async () => {
    let soltar: (r: ResultadoDaAcao) => void = () => {}
    porta.gravarAcao.mockImplementationOnce(() => new Promise<ResultadoDaAcao>((ok) => (soltar = ok)))
    const { semAbridor } = montar()
    await abrirComFoco()
    fireEvent.change(campo(), { target: { value: 'AN123456789BR' } })
    await act(async () => {
      fireEvent.click(salvar())
    })
    // O pedido relido não oferece mais o controle de origem: ele sai do DOM com a folha aberta.
    act(() => semAbridor())
    expect(screen.queryByRole('button', { name: 'abrir' })).toBeNull()
    await act(async () => {
      soltar({ tipo: 'ok', emailSent: true, materialMudou: false })
    })
    await esperar()
    expect(folha()).toBeNull()
    const titulo = screen.getByRole('heading', { level: 1, name: 'Pedido #0244' })
    await waitFor(() => expect(document.activeElement).toBe(titulo))
    expect(titulo).toHaveAttribute('tabindex', '-1')
  })
})
