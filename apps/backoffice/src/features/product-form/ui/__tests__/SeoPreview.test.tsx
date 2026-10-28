// Feature 84 — a prévia mostra o que a loja vai SERVIR (`SIA-05..09`, `SIA-16`).
//
// As expectativas são escritas por extenso a partir da spec (`{nome} | Uma Estrelinha`, o piso da
// loja), e o resultado é conferido também contra `productPageMeta` — a função que a loja usa —, para
// a prévia não virar um segundo desenho do título.

import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { STORE_BRAND, STORE_DESCRIPTION_FLOOR, descriptionFromHtml, productPageMeta } from '@estrelinha/core/seo'
import SeoPreview from '../SeoPreview'

const DESCRICAO_HTML =
  '<p>Pingente feito à mão em resina com o <strong>material</strong> que você envia, por Adri Muniz.</p>'

type Props = Parameters<typeof SeoPreview>[0]

const montar = (over: Partial<Props> = {}) =>
  render(
    <SeoPreview
      title=""
      description=""
      slug="pingente-estrela"
      name="Pingente Estrela"
      productDescription={DESCRICAO_HTML}
      onTitleChange={vi.fn()}
      onDescriptionChange={vi.fn()}
      {...over}
    />,
  )

const linhaDoTitulo = () => screen.getByTestId('seo-preview-title')
const linhaDaDescricao = () => screen.getByTestId('seo-preview-description')
const campoTitulo = () => screen.getByLabelText('Título SEO') as HTMLInputElement
const campoDescricao = () => screen.getByLabelText('Descrição SEO') as HTMLTextAreaElement

describe('SeoPreview — sem SEO, a prévia é o derivado (SIA-05)', () => {
  it('título = "{nome} | Uma Estrelinha" e descrição = a descrição do produto resumida', () => {
    montar()
    expect(within(linhaDoTitulo()).getByText('Pingente Estrela | Uma Estrelinha')).toBeInTheDocument()
    const derivada = descriptionFromHtml(DESCRICAO_HTML)
    expect(derivada).toBe(
      'Pingente feito à mão em resina com o material que você envia, por Adri Muniz.',
    )
    expect(within(linhaDaDescricao()).getByText(derivada)).toBeInTheDocument()
  })

  it('é o mesmo que a loja serve (productPageMeta)', () => {
    montar()
    const meta = productPageMeta({ name: 'Pingente Estrela', description: DESCRICAO_HTML })
    expect(within(linhaDoTitulo()).getByText(meta.title)).toBeInTheDocument()
    expect(within(linhaDaDescricao()).getByText(meta.description)).toBeInTheDocument()
  })

  it('os textos fixos antigos não aparecem', () => {
    montar({ name: '', productDescription: '' })
    expect(screen.queryByText('Título do produto')).not.toBeInTheDocument()
    expect(
      screen.queryByText('Descrição do produto para mecanismos de busca...'),
    ).not.toBeInTheDocument()
  })

  it('SEO curado é servido como está (curado vence o derivado)', () => {
    montar({ title: 'Pingente de resina com estrela', description: 'Uma descrição curada.' })
    expect(
      within(linhaDoTitulo()).getByText('Pingente de resina com estrela | Uma Estrelinha'),
    ).toBeInTheDocument()
    expect(within(linhaDaDescricao()).getByText('Uma descrição curada.')).toBeInTheDocument()
  })

  it('SIA-16: mudar o título por prop muda a prévia na hora', () => {
    const { rerender } = montar()
    rerender(
      <SeoPreview
        title="Título novo"
        description=""
        slug="pingente-estrela"
        name="Pingente Estrela"
        productDescription={DESCRICAO_HTML}
        onTitleChange={vi.fn()}
        onDescriptionChange={vi.fn()}
      />,
    )
    expect(within(linhaDoTitulo()).getByText('Título novo | Uma Estrelinha')).toBeInTheDocument()
  })
})

describe('SeoPreview — nome e descrição vazios caem no piso da loja (SIA-07)', () => {
  it('sem storeDescription: STORE_BRAND e STORE_DESCRIPTION_FLOOR', () => {
    montar({ name: '', productDescription: '' })
    expect(within(linhaDoTitulo()).getByText(STORE_BRAND)).toBeInTheDocument()
    expect(within(linhaDaDescricao()).getByText(STORE_DESCRIPTION_FLOOR)).toBeInTheDocument()
  })

  it('com storeDescription: a descrição da loja', () => {
    montar({ name: '', productDescription: '', storeDescription: 'A descrição da loja.' })
    expect(within(linhaDaDescricao()).getByText('A descrição da loja.')).toBeInTheDocument()
  })
})

describe('SeoPreview — placeholders (SIA-06)', () => {
  it('título vazio: o placeholder é o nome, sem a marca', () => {
    montar()
    expect(campoTitulo().placeholder).toBe('Pingente Estrela')
  })

  it('descrição vazia: o placeholder é a descrição derivada', () => {
    montar()
    expect(campoDescricao().placeholder).toBe(descriptionFromHtml(DESCRICAO_HTML))
  })
})

describe('SeoPreview — selo "automático" só no derivado (SIA-08)', () => {
  it('os dois derivados: selo no título e na descrição', () => {
    montar()
    expect(within(linhaDoTitulo()).getByText('automático')).toBeInTheDocument()
    expect(within(linhaDaDescricao()).getByText('automático')).toBeInTheDocument()
  })

  it('os dois curados: nenhum selo', () => {
    montar({ title: 'Título curado', description: 'Descrição curada.' })
    expect(screen.queryByText('automático')).not.toBeInTheDocument()
  })

  it('título curado e descrição derivada: selo só na descrição', () => {
    montar({ title: 'Título curado' })
    expect(within(linhaDoTitulo()).queryByText('automático')).not.toBeInTheDocument()
    expect(within(linhaDaDescricao()).getByText('automático')).toBeInTheDocument()
  })

  it('título derivado e descrição curada: selo só no título', () => {
    montar({ description: 'Descrição curada.' })
    expect(within(linhaDoTitulo()).getByText('automático')).toBeInTheDocument()
    expect(within(linhaDaDescricao()).queryByText('automático')).not.toBeInTheDocument()
  })

  it('espaço só no campo conta como derivado', () => {
    montar({ title: '   ' })
    expect(within(linhaDoTitulo()).getByText('automático')).toBeInTheDocument()
  })
  // Prova em navegador da 84 (D1): com a fonte a 200 % em 390 o selo AO LADO comia a largura e o título
  // virava "J…". O selo vai para baixo (coluna) e escala com a fonte da página (rem, não 10px fixos).
  const tokens = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/)
  it.each([
    ['título', linhaDoTitulo],
    ['descrição', () => screen.getByTestId('seo-preview-description')],
  ])('linha do %s: selo em coluna, texto com a largura inteira (token exato)', (_n, linha) => {
    montar()
    expect(tokens(linha())).toContain('flex-col')
    const texto = linha().querySelector('p')!
    expect(tokens(texto)).toContain('w-full')
    const selo = within(linha()).getByText('automático')
    expect(tokens(selo)).toContain('text-xs')
    expect(tokens(selo).some(t => /^text-\[\d+px\]$/.test(t))).toBe(false)
  })
})

// Conserto do QA (BUG-20261027-previa-do-google-ilegivel-com-fonte-200): a 390/200 % o título de uma
// linha com reticências virava "TESTE-…", e a 360/200 % o selo passava ~21px da caixa da prévia.
// jsdom não mede layout: a régua é o token exato (`L-034`), e a medida fica na prova em navegador.
describe('SeoPreview — a prévia embrulha em vez de cortar (fonte grande)', () => {
  const tokensDe = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/)
  const caixa = () => linhaDoTitulo().parentElement!

  // Reteste do QA: com `line-clamp-2` o título a 390/200 % ainda era "TESTE- / 84-RT-…". Sem corte nenhum.
  it.each([
    ['título', linhaDoTitulo],
    ['descrição', linhaDaDescricao],
  ])('o texto da %s embrulha inteiro: `break-words`, sem `truncate` nem `line-clamp-*`', (_n, linha) => {
    montar({ title: 'Um título de SEO bem comprido para a prévia embrulhar' })
    const t = tokensDe(linha().querySelector('p')!)
    expect(t).toContain('break-words')
    expect(t).not.toContain('truncate')
    expect(t.some(x => x.startsWith('line-clamp-'))).toBe(false)
  })

  it.each([
    ['título', linhaDoTitulo],
    ['descrição', linhaDaDescricao],
  ])('o selo da linha do %s não passa da caixa e não parte a palavra: `max-w-full` e `whitespace-nowrap`', (_n, linha) => {
    montar()
    const selo = within(linha()).getByText('automático')
    expect(tokensDe(selo)).toContain('max-w-full')
    expect(tokensDe(selo)).toContain('whitespace-nowrap')
    expect(tokensDe(selo)).not.toContain('break-words')
  })

  it('a caixa da prévia pode encolher (`min-w-0`)', () => {
    montar()
    expect(tokensDe(caixa())).toContain('min-w-0')
    expect(caixa()).toHaveTextContent('Preview no Google')
  })
})

describe('SeoPreview — contador do título e tetos (SIA-09)', () => {
  it('"N/60 · M com a marca": o digitado e o servido', () => {
    const title = 'Pingente de resina com estrela' // 30
    montar({ title })
    expect(screen.getByText(`30/60 · ${`${title} | Uma Estrelinha`.length} com a marca`)).toBeInTheDocument()
    expect(screen.getByText('30/60 · 47 com a marca')).toBeInTheDocument()
  })

  it('título que já traz a marca: o mesmo número dos dois lados', () => {
    montar({ title: 'Pingente | Uma Estrelinha' })
    expect(screen.getByText('25/60 · 25 com a marca')).toBeInTheDocument()
  })

  it('maxLength: 60 no título e 160 na descrição', () => {
    montar()
    expect(campoTitulo().maxLength).toBe(60)
    expect(campoDescricao().maxLength).toBe(160)
  })
})
