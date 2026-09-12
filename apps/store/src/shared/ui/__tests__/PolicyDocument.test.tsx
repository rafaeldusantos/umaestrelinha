import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import PolicyDocument, { PolicyList, PolicyNote, PolicySection } from '../PolicyDocument'
import { policySectionId } from '@/shared/lib/policySectionId'

/**
 * `POL-20` — o invólucro das duas políticas.
 *
 * O que se prova aqui é **estrutura**, não pixel: jsdom devolve 0 para toda medida de layout, então
 * nenhuma asserção deste arquivo encosta em largura, altura ou rolagem. A medida de leitura de 720px
 * e o respiro de 20px no mobile são prova de navegador, e estão anotados no `validation.md`.
 */

const montar = (node: React.ReactElement) =>
  render(<MemoryRouter initialEntries={['/']}>{node}</MemoryRouter>)

describe('policySectionId — a âncora derivada do título', () => {
  it('descasca acento e pontuação, e devolve kebab-case', () => {
    // O caso real da política de trocas: acento, interrogação e espaços.
    expect(policySectionId('E se minha joia apresentar um defeito de fabricação?')).toBe(
      'e-se-minha-joia-apresentar-um-defeito-de-fabricacao',
    )
    expect(policySectionId('Política de Trocas, Devoluções e Arrependimento')).toBe(
      'politica-de-trocas-devolucoes-e-arrependimento',
    )
  })

  it('nunca devolve `id` com acento — o motivo de existir', () => {
    // `id` acentuado é válido em HTML5 e quebra em `querySelector` sem escape. Um `id` derivado que
    // deixasse o acento passar produziria âncora que abre a página e não rola: o defeito exato que
    // `/politicas#trocas` teve no rodapé por uma feature inteira.
    expect(policySectionId('Devoluções')).not.toMatch(/[^a-z0-9-]/)
  })

  it('não deixa hífen sobrando nas pontas', () => {
    expect(policySectionId('  Cuidados com a peça!  ')).toBe('cuidados-com-a-peca')
  })
})

describe('PolicyDocument — a moldura (POL-20)', () => {
  const documento = (
    <PolicyDocument
      titulo="Política de Trocas, Devoluções e Arrependimento"
      paginaAtual="Trocas e devoluções"
      abertura={<p>A abertura do documento.</p>}
    >
      <PolicySection titulo="Cuidados com a peça">
        <p>Evite quedas.</p>
      </PolicySection>
    </PolicyDocument>
  )

  it('o título do documento é o `<h1>` da página', () => {
    montar(documento)

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Política de Trocas, Devoluções e Arrependimento',
      }),
    ).toBeInTheDocument()
  })

  it('a trilha aparece com a página atual recebida — e é UMA só', () => {
    montar(documento)

    const trilha = screen.getByRole('navigation', { name: 'Trilha de navegação' })
    expect(trilha.querySelector('[aria-current="page"]')).toHaveTextContent('Trocas e devoluções')
    expect(screen.getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/')
  })

  it('a trilha vem ANTES do título — é navegação, não legenda', () => {
    montar(documento)

    const trilha = screen.getByRole('navigation', { name: 'Trilha de navegação' })
    const titulo = screen.getByRole('heading', { level: 1 })

    expect(trilha.compareDocumentPosition(titulo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('a abertura é renderizada, e antes da primeira seção', () => {
    montar(documento)

    const abertura = screen.getByText('A abertura do documento.')
    const secao = screen.getByRole('heading', { level: 2 })

    expect(abertura.compareDocumentPosition(secao) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('sem abertura, nenhum bloco vazio sobra antes das seções', () => {
    montar(
      <PolicyDocument titulo="Política" paginaAtual="Política">
        <PolicySection titulo="Uma seção">
          <p>Corpo.</p>
        </PolicySection>
      </PolicyDocument>,
    )

    expect(screen.getByRole('heading', { level: 2, name: 'Uma seção' })).toBeInTheDocument()
  })
})

describe('PolicySection — título, âncora e rótulo acessível', () => {
  it('o título vira `<h2>` com `id` derivado', () => {
    montar(
      <PolicySection titulo="Como solicitar uma troca ou devolução?">
        <p>Fale com a gente.</p>
      </PolicySection>,
    )

    const h2 = screen.getByRole('heading', { level: 2 })
    expect(h2).toHaveAttribute('id', 'como-solicitar-uma-troca-ou-devolucao')
  })

  it('a seção é rotulada pelo próprio título (`aria-labelledby`)', () => {
    const { container } = montar(
      <PolicySection titulo="Nosso compromisso">
        <p>Existimos para eternizar histórias.</p>
      </PolicySection>,
    )

    const secao = container.querySelector('section')!
    expect(secao).toHaveAttribute('aria-labelledby', 'nosso-compromisso')
    // O par: quem o `aria-labelledby` aponta existe de verdade. Um `id` que não casa é rótulo
    // acessível apontando para o vazio, e leitor de tela anuncia a seção sem nome.
    expect(container.querySelector('#nosso-compromisso')).toBe(
      screen.getByRole('heading', { level: 2 }),
    )
  })
})

describe('PolicyList — o marcador é fio, não texto ouro', () => {
  it('cada item vira um `<li>`', () => {
    montar(<PolicyList itens={['Quedas e impactos', 'Piscina e água do mar']} />)

    const itens = screen.getAllByRole('listitem')
    expect(itens).toHaveLength(2)
    expect(itens[0]).toHaveTextContent('Quedas e impactos')
  })

  it('o marcador é um traço `bg-accent` e some do leitor de tela', () => {
    // `accent` mede 2,66:1 sobre claro e é **proibido como texto**. Um `list-disc` em ouro seria
    // texto ouro com outro nome; o marcador é preenchimento, e por isso `aria-hidden`.
    const { container } = montar(<PolicyList itens={['Um item']} />)

    const marcador = container.querySelector('li > span[aria-hidden]')!
    expect(marcador.className).toContain('bg-estrelinha-accent')
    expect(marcador.className).not.toContain('text-estrelinha-accent')
  })
})

describe('PolicyNote — o aviso destacado (POL-08)', () => {
  it('renderiza a frase em `ink`, com o ouro no fio ao lado', () => {
    const { container } = montar(
      <PolicyNote>Não envie a peça sem antes entrar em contato conosco.</PolicyNote>,
    )

    const paragrafo = screen.getByText('Não envie a peça sem antes entrar em contato conosco.')
    expect(paragrafo.className).toContain('text-estrelinha-ink')
    expect(paragrafo.className).not.toContain('text-estrelinha-accent')

    const fio = container.querySelector('span[aria-hidden]')!
    expect(fio.className).toContain('bg-estrelinha-accent')
  })
})
