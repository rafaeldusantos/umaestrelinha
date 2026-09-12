import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

/**
 * `vi.mock` do módulo INTEIRO, e é o que a `L-030` manda declarar em voz alta: sem
 * `importOriginal`, qualquer hook novo que esta página passar a consumir derruba o **render**, não a
 * asserção — e o erro aparece longe da causa. Hoje a página lê um hook só.
 */
const { settingsGeral } = vi.hoisted(() => ({
  settingsGeral: {
    whatsapp: '(51) 98655-0542',
    email: 'contato@umaestrelinha.com.br',
    store_name: 'Uma Estrelinha',
  },
}))

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useGeneralSettings: () => settingsGeral,
}))

import { RETURNS_POLICY_PATH } from '@estrelinha/core/routes'
import ReturnsPolicyPage from '../ReturnsPolicyPage'

beforeEach(() => {
  settingsGeral.whatsapp = '(51) 98655-0542'
  settingsGeral.email = 'contato@umaestrelinha.com.br'
  settingsGeral.store_name = 'Uma Estrelinha'
})

const montar = () =>
  render(
    <MemoryRouter initialEntries={[RETURNS_POLICY_PATH]}>
      <ReturnsPolicyPage />
    </MemoryRouter>,
  )

/**
 * `POL-05`..`POL-09` — a Política de Trocas, Devoluções e Arrependimento.
 *
 * **Uma asserção por seção, com o título inteiro** (`L-009`): asserir fragmento deixa a copy divergir
 * do texto da dona sem quebrar teste, e o texto desta página é a posição jurídica da loja.
 */

/** O endereço é literal do site em produção, e a régua o escreve por extenso. */
describe('ReturnsPolicyPage — o endereço (POL-01)', () => {
  it('a canônica é `/politicas-de-trocas-e-devolucoes`, o slug do site em produção', () => {
    // Escrito à mão, e não derivado da constante: a régua não pode ser o objeto medido. Trocar o
    // plural pelo singular aqui é mudança de endereço, e tem de aparecer neste arquivo.
    expect(RETURNS_POLICY_PATH).toBe('/politicas-de-trocas-e-devolucoes')
  })
})

describe('ReturnsPolicyPage — as dez seções, na ordem da dona (POL-05)', () => {
  const TITULOS = [
    'Joias afetivas, produtos artesanais e personalizados',
    'Importante sobre o processo artesanal',
    'E se minha joia apresentar um defeito de fabricação?',
    'E no caso das joias afetivas?',
    'Semijoias e joias de prata não personalizadas',
    'O que não é considerado defeito de fabricação?',
    'Como solicitar uma troca ou devolução?',
    'Cuidados com a peça',
    'Nosso compromisso',
  ]

  it('o título da página é o `<h1>`', () => {
    montar()

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Política de Trocas, Devoluções e Arrependimento',
      }),
    ).toBeInTheDocument()
  })

  it.each(TITULOS.map((t) => [t]))('tem a seção "%s"', (titulo) => {
    montar()

    expect(screen.getByRole('heading', { level: 2, name: titulo })).toBeInTheDocument()
  })

  it('as seções saem NA ORDEM do texto original', () => {
    montar()

    const ordem = screen
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent?.trim())

    expect(ordem).toEqual(TITULOS)
  })

  it('as duas perguntas ficam SOB as não personalizadas, como `<h3>`', () => {
    // Promovê-las a `<h2>` as soltaria do contexto, e a leitora com uma joia afetiva na mão
    // responderia a si mesma com a regra das semijoias — que é a regra errada para a peça dela.
    montar()

    const subtitulos = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent?.trim())
    expect(subtitulos).toEqual([
      'Posso desistir da compra?',
      'Posso trocar uma semijoia ou joia de prata porque mudei de ideia?',
    ])
  })
})

describe('ReturnsPolicyPage — o que a lei fixa (POL-06)', () => {
  it('cita o Código de Defesa do Consumidor pela lei, com número', () => {
    montar()

    expect(
      screen.getByText(/Código de Defesa do Consumidor \(Lei nº 8\.078\/1990\)/),
    ).toBeInTheDocument()
  })

  it('o arrependimento sai com os 7 dias E o artigo 49 — a frase inteira', () => {
    // As duas metades juntas (`L-036`): "7 dias" sem o artigo é número sem fonte, e o artigo sem o
    // prazo não responde à pergunta que a leitora tem.
    montar()

    expect(
      screen.getByText(
        /direito de arrependimento no prazo de 7 dias, contado da assinatura do contrato ou do recebimento do produto, conforme o artigo 49 do Código de Defesa do Consumidor/,
      ),
    ).toBeInTheDocument()
  })

  it('NÃO promete troca sem custo — era o que `/politicas` dizia, e a loja não cumpre', () => {
    // O parágrafo antigo: "Faremos a troca sem custo adicional." Numa peça feita com material
    // insubstituível da própria cliente, é promessa que a análise individual desmente.
    montar()

    const texto = document.body.textContent ?? ''
    expect(texto).not.toMatch(/sem custo adicional/i)
    expect(texto).toMatch(/serão analisados individualmente/i)
  })
})

describe('ReturnsPolicyPage — o aviso destacado (POL-08)', () => {
  it('"Não envie a peça sem antes entrar em contato conosco" aparece, e fora do fluxo comum', () => {
    montar()

    // **A asserção é sobre o bloco de aviso, não sobre o parágrafo.** A primeira escrita deste caso
    // subia do texto até o `div` mais próximo e procurava um fio ouro ali — e passava com o aviso
    // rebaixado a `<p>` comum, porque o fio que ela encontrava era o **marcador de um `PolicyList`
    // vizinho**. Mutante real, sobrevivente, achado na verificação: o aviso perdia o destaque, que é
    // a única coisa que este requisito pede, e os 26 testes seguiam verdes.
    const aviso = screen.getByTestId('policy-note')
    expect(aviso).toHaveTextContent('Não envie a peça sem antes entrar em contato conosco.')

    // E o destaque é o do desenho: fundo `ground-deep` com o ouro no TRAÇO, nunca no texto.
    expect(aviso.className).toContain('bg-estrelinha-ground-deep')
    expect(aviso.querySelector('span[aria-hidden]')?.className).toContain('bg-estrelinha-accent')
  })

  it('o aviso é UM só — destaque que se repete deixa de destacar', () => {
    montar()

    expect(screen.getAllByTestId('policy-note')).toHaveLength(1)
  })
})

describe('ReturnsPolicyPage — os canais de atendimento vêm das settings (POL-09)', () => {
  it('o WhatsApp sai com os dígitos limpos e a mensagem da loja', () => {
    montar()

    const link = screen.getByRole('link', { name: 'Falar no WhatsApp' })
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('https://wa.me/51986550542?text='),
    )
    expect(decodeURIComponent(link.getAttribute('href') ?? '')).toContain(
      'política de trocas e devoluções da Uma Estrelinha',
    )
  })

  it('a mensagem usa o nome de loja das settings, não um literal', () => {
    settingsGeral.store_name = 'Ateliê da Adri'
    montar()

    const link = screen.getByRole('link', { name: 'Falar no WhatsApp' })
    expect(decodeURIComponent(link.getAttribute('href') ?? '')).toContain('da Ateliê da Adri')
  })

  it('o e-mail sai das settings, como `mailto:`', () => {
    settingsGeral.email = 'ola@exemplo.invalid'
    montar()

    expect(screen.getByRole('link', { name: 'ola@exemplo.invalid' })).toHaveAttribute(
      'href',
      'mailto:ola@exemplo.invalid',
    )
  })

  it('SEM número configurado, a ação do WhatsApp não existe — e o e-mail continua', () => {
    // O portão de `SOB-08`. Um botão apontando para `wa.me/` sem dígito abre conversa com ninguém, e
    // a cliente que precisa devolver uma peça acha que pediu e não pediu.
    settingsGeral.whatsapp = ''
    montar()

    expect(screen.queryByRole('link', { name: 'Falar no WhatsApp' })).toBeNull()
    expect(
      screen.getByRole('link', { name: 'contato@umaestrelinha.com.br' }),
    ).toBeInTheDocument()
  })

  it('número CURTO demais também não acende a ação', () => {
    // Nove dígitos: é o que sobra de um telefone digitado pela metade no painel. O portão é `>= 10`,
    // e um `!== ''` deixaria este caso passar.
    settingsGeral.whatsapp = '98655-054'
    montar()

    expect(screen.queryByRole('link', { name: 'Falar no WhatsApp' })).toBeNull()
  })

  it('nenhum número de telefone está cravado no JSX (PDP-24)', () => {
    settingsGeral.whatsapp = ''
    settingsGeral.email = ''
    const { container } = montar()

    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull()
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull()
  })
})

describe('ReturnsPolicyPage — o tom (POL-07)', () => {
  it('não tem emoji nenhum — inclusive o `✨` que fechava o texto original', () => {
    montar()

    const texto = document.body.textContent ?? ''
    expect(texto).not.toMatch(/🎉|🥳|✨|💜|💖|😢|👋/)
  })

  it('o fecho da dona continua lá, com a estrela DESENHADA no lugar do emoji', () => {
    const { container } = montar()

    expect(screen.getByText(/Uma Estrelinha — eternizando suas lembranças\./)).toBeInTheDocument()
    // A estrela é SVG, não caractere. Sem esta metade, apagar o ícone deixaria o fecho sem o gesto
    // que o emoji fazia — e o teste acima continuaria verde.
    expect(container.querySelector('svg[aria-hidden]')).toBeTruthy()
  })

  it('não usa vocabulário da loja anterior nem urgência fabricada', () => {
    montar()

    const texto = document.body.textContent ?? ''
    expect(texto).not.toMatch(/botton|\bpin\b|\bpins\b|alfinete/i)
    expect(texto).not.toMatch(/últimas unidades|corra|aproveite agora/i)
  })
})
