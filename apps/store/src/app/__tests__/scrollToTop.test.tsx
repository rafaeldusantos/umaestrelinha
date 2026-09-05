import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import {
  Link,
  MemoryRouter,
  Route,
  Routes,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'
import ScrollToTop from '../ScrollToTop'

/**
 * Página nova abre no topo — e as três exceções que provam que a regra é sobre **destino**, não
 * sobre re-render.
 *
 * O que se mede aqui é comportamento de roteador, então o teste navega de verdade (clique em
 * `Link`, `navigate(-1)`, `setParams`) em vez de renderizar o componente com props fabricadas: o
 * `navigationType` só existe porque houve navegação, e é ele que separa "cliquei num link" de
 * "apertei voltar".
 *
 * **jsdom devolve 0 para toda medida de layout e não implementa rolagem** — logo, o que se assere é
 * a CHAMADA, nunca a posição resultante. Prova de que a página realmente abre no topo é de
 * navegador, em 390 e 1440.
 */

const rolarPara = vi.fn()
const trazerParaVista = vi.fn()

beforeEach(() => {
  rolarPara.mockClear()
  trazerParaVista.mockClear()
  // jsdom não implementa nenhum dos dois: `window.scrollTo` existe mas só emite "Not implemented",
  // e `Element.prototype.scrollIntoView` nem existe (chamá-lo seria `TypeError`).
  Object.defineProperty(window, 'scrollTo', {
    writable: true,
    configurable: true,
    value: rolarPara,
  })
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    writable: true,
    configurable: true,
    value: trazerParaVista,
  })
})

const Categoria = () => (
  <div>
    <p>pagina:categoria</p>
    <Link to="/produtos/estrelinha">ir ao produto</Link>
    <Link to="/politicas#privacidade">ir a politica com ancora viva</Link>
    <Link to="/politicas#trocas">ir a politica com ancora morta</Link>
  </div>
)

const Produto = () => {
  const navigate = useNavigate()
  return (
    <div>
      <p>pagina:produto</p>
      <button onClick={() => navigate(-1)}>voltar</button>
      <button onClick={() => navigate('/politicas', { replace: true })}>redirecionar</button>
    </div>
  )
}

/** `PoliciesPage` tem `id` em uma seção só — é o que separa âncora viva de âncora morta. */
const Politicas = () => (
  <div>
    <p>pagina:politicas</p>
    <section id="privacidade">Privacidade</section>
  </div>
)

/** O gesto da `SearchPage`: cada tecla reescreve `?q=` com `replace`, sem trocar de página. */
const Busca = () => {
  const [params, setParams] = useSearchParams()
  return (
    <div>
      <p>pagina:busca q={params.get('q') ?? ''}</p>
      <button onClick={() => setParams({ q: 'a' }, { replace: true })}>digitar</button>
    </div>
  )
}

const montar = (inicial = '/categoria') =>
  render(
    <MemoryRouter initialEntries={[inicial]}>
      <ScrollToTop />
      <Routes>
        <Route path="/categoria" element={<Categoria />} />
        <Route path="/produtos/:slug" element={<Produto />} />
        <Route path="/politicas" element={<Politicas />} />
        <Route path="/busca" element={<Busca />} />
      </Routes>
    </MemoryRouter>,
  )

describe('ScrollToTop', () => {
  it('não rola nada na primeira montagem — quem chega por URL já está onde o navegador o pôs', () => {
    montar()

    expect(screen.getByText('pagina:categoria')).toBeInTheDocument()
    expect(rolarPara).not.toHaveBeenCalled()
  })

  it('rola ao topo ao seguir um link para outra página (PUSH)', () => {
    montar()
    fireEvent.click(screen.getByText('ir ao produto'))

    expect(screen.getByText('pagina:produto')).toBeInTheDocument()
    expect(rolarPara).toHaveBeenCalledWith(0, 0)
  })

  it('rola ao topo num redirecionamento (REPLACE) — a cliente acabou de chegar na página', () => {
    montar()
    fireEvent.click(screen.getByText('ir ao produto'))
    rolarPara.mockClear()

    fireEvent.click(screen.getByText('redirecionar'))

    expect(screen.getByText('pagina:politicas')).toBeInTheDocument()
    expect(rolarPara).toHaveBeenCalledWith(0, 0)
  })

  it('NÃO rola no botão voltar (POP) — restaurar a posição é do navegador', () => {
    montar()
    fireEvent.click(screen.getByText('ir ao produto'))
    rolarPara.mockClear()

    fireEvent.click(screen.getByText('voltar'))

    expect(screen.getByText('pagina:categoria')).toBeInTheDocument()
    expect(rolarPara).not.toHaveBeenCalled()
  })

  it('vai até a âncora quando o alvo existe, em vez de ir ao topo', () => {
    montar()
    fireEvent.click(screen.getByText('ir a politica com ancora viva'))

    expect(trazerParaVista).toHaveBeenCalledTimes(1)
    expect(rolarPara).not.toHaveBeenCalled()
  })

  it('vai ao topo quando a âncora não casa com id nenhum — é o caso dos links do rodapé hoje', () => {
    montar()
    fireEvent.click(screen.getByText('ir a politica com ancora morta'))

    expect(trazerParaVista).not.toHaveBeenCalled()
    expect(rolarPara).toHaveBeenCalledWith(0, 0)
  })

  it('NÃO rola quando só a query string muda — digitar na busca não pode dar um pulo por tecla', () => {
    montar('/busca')
    expect(rolarPara).not.toHaveBeenCalled()

    // Duas teclas: a primeira é a que importa, porque é ela que troca o `navigationType` de `POP`
    // para `REPLACE`. Um efeito que dependesse do tipo de navegação saltaria exatamente aqui.
    fireEvent.click(screen.getByText('digitar'))
    fireEvent.click(screen.getByText('digitar'))

    expect(screen.getByText('pagina:busca q=a')).toBeInTheDocument()
    expect(rolarPara).not.toHaveBeenCalled()
  })
})

describe('ScrollToTop — montagem', () => {
  /**
   * Guarda: o componente existir não adianta nada se ninguém o montar, e é uma falha que passa em
   * build, em `tsc` e em todo teste acima. Ele tem de estar **dentro do `BrowserRouter`** (fora, os
   * hooks de rota lançariam) e **fora do `StoreLayout`**, senão o checkout e o 404 ficam sem.
   */
  it('está montado no App, dentro do BrowserRouter', () => {
    const app = readFileSync(resolve(__dirname, '../App.tsx'), 'utf-8')

    // Âncora: sem ela, um caminho errado leria string vazia e as asserções abaixo passariam sozinhas.
    expect(app).toContain('<BrowserRouter>')
    expect(app).toContain('</BrowserRouter>')

    expect(app).toContain('import ScrollToTop from "@/app/ScrollToTop";')

    const dentro = app.slice(app.indexOf('<BrowserRouter>'), app.indexOf('</BrowserRouter>'))
    expect(dentro).toContain('<ScrollToTop />')
    // Antes das `Routes`: montado depois, ele seria irmão posterior e a ordem de efeito mudaria.
    expect(dentro.indexOf('<ScrollToTop />')).toBeLessThan(dentro.indexOf('<Routes>'))
  })
})
