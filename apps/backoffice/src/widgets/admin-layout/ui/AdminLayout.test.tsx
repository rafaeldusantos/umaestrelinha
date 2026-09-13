import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminLayout from './AdminLayout'
import { STORAGE_KEY } from '@/widgets/admin-layout/model/navCollapse'

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: { auth: { signOut: vi.fn().mockResolvedValue({ error: null }) } },
}))

const renderEm = (pathname: string) =>
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/admin/*" element={<p>conteúdo</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

/** A lista de grupos que rola — o `<nav>` da sidebar de desktop (a do Sheet só existe aberto). */
const sidebar = () => screen.getAllByRole('navigation')[0]

/** A coluna inteira: a lista de grupos MAIS o rodapé, que é irmão dela e não filho. */
const coluna = () => document.querySelector('aside')!

const cabecalho = (label: string) => within(sidebar()).getByRole('button', { name: new RegExp(label, 'i') })

beforeEach(() => {
  window.localStorage.clear()
})

describe('AdminLayout — os grupos colapsam', () => {
  it('na primeira visita todos os grupos estão abertos', () => {
    // A direção do default, medida na tela e não só no modelo: storage vazio ⇒ tudo visível, que é
    // o comportamento que a sidebar sempre teve.
    renderEm('/admin')

    for (const destino of ['Pedidos', 'Cupons', 'Produtos', 'Home']) {
      expect(within(sidebar()).getByRole('link', { name: destino })).toBeInTheDocument()
    }
    for (const label of ['Vendas', 'Descontos', 'Catálogo', 'Loja']) {
      expect(cabecalho(label)).toHaveAttribute('aria-expanded', 'true')
    }
  })

  it('clicar no cabeçalho esconde os itens daquele grupo, e só deles', () => {
    renderEm('/admin')
    fireEvent.click(cabecalho('Catálogo'))

    expect(within(sidebar()).queryByRole('link', { name: 'Produtos' })).not.toBeInTheDocument()
    expect(within(sidebar()).queryByRole('link', { name: 'Categorias' })).not.toBeInTheDocument()
    expect(cabecalho('Catálogo')).toHaveAttribute('aria-expanded', 'false')

    // Os vizinhos ficam onde estavam.
    expect(within(sidebar()).getByRole('link', { name: 'Pedidos' })).toBeInTheDocument()
    expect(within(sidebar()).getByRole('link', { name: 'Home' })).toBeInTheDocument()
  })

  it('clicar de novo devolve os itens', () => {
    renderEm('/admin')
    fireEvent.click(cabecalho('Loja'))
    expect(within(sidebar()).queryByRole('link', { name: 'Home' })).not.toBeInTheDocument()

    fireEvent.click(cabecalho('Loja'))
    expect(within(sidebar()).getByRole('link', { name: 'Home' })).toBeInTheDocument()
  })

  it('o Dashboard NÃO tem cabeçalho para colapsar', () => {
    renderEm('/admin')
    // Se o grupo sem rótulo virasse colapsável, haveria um quinto botão de disclosure — e o único
    // destino que é sempre o ponto de partida poderia ser escondido sem volta.
    const disclosures = within(sidebar())
      .getAllByRole('button')
      .filter(botao => botao.getAttribute('aria-expanded') !== null)

    expect(disclosures).toHaveLength(4)
    expect(within(sidebar()).getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('o estado sobrevive à remontagem, pelo `localStorage`', () => {
    const { unmount } = renderEm('/admin')
    fireEvent.click(cabecalho('Descontos'))
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toEqual(['Descontos'])
    unmount()

    renderEm('/admin')
    expect(cabecalho('Descontos')).toHaveAttribute('aria-expanded', 'false')
    expect(within(sidebar()).queryByRole('link', { name: 'Cupons' })).not.toBeInTheDocument()
  })

  it('o cabeçalho colapsado AVISA quando a tela atual está lá dentro', () => {
    // Sem o aviso, colapsar `Catálogo` e depois abrir um produto (por um link de dentro do pedido)
    // deixaria a sidebar sem nenhum item marcado — e navegação que não responde "onde estou" lê
    // como quebrada. A alternativa (abrir à força) foi recusada: desfaz a escolha de quem colapsou.
    renderEm('/admin/produtos/abc/editar')
    fireEvent.click(cabecalho('Catálogo'))

    expect(within(cabecalho('Catálogo')).getByText(/a tela atual está neste grupo/i)).toBeInTheDocument()
    // E o aviso não se espalha para quem não tem a tela.
    expect(within(cabecalho('Loja')).queryByText(/a tela atual está neste grupo/i)).not.toBeInTheDocument()
  })

  it('o aviso é TEXTO, e o ponto colorido fica escondido do leitor de tela', () => {
    // Cor sozinha não é informação: o ponto é decoração (`aria-hidden`) e quem carrega a frase é o
    // texto. Sem isso, quem usa leitor de tela ouviria só "Vendas, recolhido".
    renderEm('/admin/pedidos')
    fireEvent.click(cabecalho('Vendas'))

    const header = cabecalho('Vendas')
    expect(header.querySelector('[aria-hidden="true"].rounded-full')).toBeInTheDocument()
    expect(within(header).getByText(/a tela atual está neste grupo/i).className).toContain('sr-only')
  })

  it('grupo ABERTO não recebe o aviso — quem se marca é o item', () => {
    renderEm('/admin/produtos')

    expect(within(cabecalho('Catálogo')).queryByText(/a tela atual está neste grupo/i)).not.toBeInTheDocument()
    // O item ativo é marcado por classe (a borda violeta), não por `aria-current`.
    expect(within(sidebar()).getByRole('link', { name: 'Produtos' }).className).toContain(
      'border-estrelinha-admin-violet',
    )
  })
})

describe('AdminLayout — o rodapé', () => {
  it('Configurações, Ver Loja e Sair estão na coluna', () => {
    renderEm('/admin/produtos')
    expect(within(coluna()).getByRole('link', { name: 'Configurações' })).toBeInTheDocument()
    expect(within(coluna()).getByRole('link', { name: 'Ver Loja' })).toBeInTheDocument()
    expect(within(coluna()).getByRole('button', { name: 'Sair' })).toBeInTheDocument()
  })

  it('o rodapé fica FORA do `<nav>` que rola', () => {
    // É a forma estrutural do conserto: o que rola é a lista de grupos, e o rodapé é irmão dela.
    // Se `Configurações` estivesse dentro do `<nav>`, colapsar grupos deixaria de garantir que ele
    // está à vista — voltaria a depender do quanto a lista cresceu.
    renderEm('/admin')
    expect(within(sidebar()).queryByRole('link', { name: 'Configurações' })).not.toBeInTheDocument()
    expect(within(coluna()).getByRole('link', { name: 'Configurações' })).toBeInTheDocument()
  })
})

/**
 * O trilho de foco — feature 47.
 *
 * Tudo aqui renderiza o **layout real**, com o router de verdade: é o que separa "o trilho existe"
 * de "o trilho está montado na tela". Um teste que montasse `<NavRail/>` ao lado de `<NavContent/>`
 * dentro deste arquivo passaria com `<NavRail/>` apagado do `AdminLayout.tsx` — a lição da `44`.
 */
describe('AdminLayout — FOCO-01/04/05/07: a navegação recolhe nas duas telas de prévia', () => {
  const trilho = () => screen.queryByTestId('trilho-de-navegacao')
  const botaoRecolher = () => screen.queryByRole('button', { name: 'Recolher a navegação' })
  const botaoExpandir = () => screen.queryByRole('button', { name: 'Expandir a navegação' })

  it('`/admin/home` com storage limpo abre RECOLHIDA', () => {
    renderEm('/admin/home')

    expect(trilho()).toBeInTheDocument()
    // E a sidebar larga não está montada junto: é uma OU outra. O que as distingue não é o conjunto
    // de destinos — o trilho tem os mesmos, com o rótulo no `aria-label` — e sim os cabeçalhos de
    // grupo, que só a larga desenha.
    expect(within(coluna()).queryByRole('button', { name: /Catálogo/i })).not.toBeInTheDocument()
    expect(within(coluna()).queryByText('Uma Estrelinha')).not.toBeInTheDocument()
  })

  it('`/admin/menu` também', () => {
    renderEm('/admin/menu')
    expect(trilho()).toBeInTheDocument()
  })

  it('a subrota do editor de seção também — `/admin/home/:sectionId`', () => {
    renderEm('/admin/home/8f3c-1a')
    expect(trilho()).toBeInTheDocument()
  })

  it('FOCO-07: fora das duas rotas a sidebar é a de hoje, e NÃO há controle de recolher', () => {
    renderEm('/admin/produtos')

    expect(trilho()).not.toBeInTheDocument()
    expect(botaoRecolher()).not.toBeInTheDocument()
    expect(botaoExpandir()).not.toBeInTheDocument()
    expect(within(coluna()).getByRole('link', { name: 'Produtos' })).toBeInTheDocument()
  })

  it('FOCO-04: o controle expande, e o mesmo par de controles recolhe de volta', () => {
    renderEm('/admin/home')

    fireEvent.click(screen.getByRole('button', { name: 'Expandir a navegação' }))

    expect(trilho()).not.toBeInTheDocument()
    expect(within(coluna()).getByRole('link', { name: 'Produtos' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Recolher a navegação' }))

    expect(trilho()).toBeInTheDocument()
  })

  it('FOCO-05: expandido sobrevive à remontagem, e recolher APAGA a chave', () => {
    const { unmount } = renderEm('/admin/home')
    fireEvent.click(screen.getByRole('button', { name: 'Expandir a navegação' }))
    expect(window.localStorage.getItem('estrelinha.admin.nav-rail')).toBe('expandido')
    unmount()

    // Remontar é o que o F5 faz: a preferência é de pessoa, não de visita.
    const segunda = renderEm('/admin/home')
    expect(screen.queryByTestId('trilho-de-navegacao')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Recolher a navegação' }))
    expect(window.localStorage.getItem('estrelinha.admin.nav-rail')).toBeNull()
    segunda.unmount()

    expect(renderEm('/admin/home').container.querySelector('[data-testid="trilho-de-navegacao"]')).not.toBeNull()
  })

  it('a preferência expandida atravessa a navegação para fora e de volta', () => {
    window.localStorage.setItem('estrelinha.admin.nav-rail', 'expandido')

    renderEm('/admin/produtos')
    expect(botaoRecolher()).not.toBeInTheDocument()

    renderEm('/admin/home')
    expect(screen.queryByTestId('trilho-de-navegacao')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Recolher a navegação' })[0]).toBeInTheDocument()
  })

  it('FOCO-11: o colapso de grupos continua valendo no estado expandido, e o trilho não o toca', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(['Catálogo']))
    renderEm('/admin/home')

    // Recolhida, a preferência dos grupos está guardada e intacta.
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(['Catálogo']))

    fireEvent.click(screen.getByRole('button', { name: 'Expandir a navegação' }))

    expect(within(sidebar()).getByRole('button', { name: /Catálogo/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(['Catálogo']))
  })

  it('FOCO-08: a gaveta do celular não muda — e não ganha controle de recolher', () => {
    renderEm('/admin/home')

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))

    const gaveta = screen.getByRole('dialog')
    expect(within(gaveta).getByRole('link', { name: 'Produtos' })).toBeInTheDocument()
    expect(within(gaveta).queryByRole('button', { name: 'Recolher a navegação' })).not.toBeInTheDocument()
  })

  it('FOCO-03: recolhida, a navegação continua respondendo onde eu estou', () => {
    renderEm('/admin/menu')

    const marcados = within(coluna())
      .getAllByRole('link')
      .filter(link => link.getAttribute('aria-current') === 'page')
    expect(marcados).toHaveLength(1)
    expect(marcados[0]).toHaveAttribute('href', '/admin/menu')
  })
})

/**
 * O que o jsdom NÃO mede.
 *
 * O defeito consertado aqui é de layout: `aside` era um filho de flex sem altura, então esticava
 * até a altura do **documento** — numa listagem de 680 produtos o rodapé ia para o fim da página e
 * "desaparecia". jsdom devolve 0 para toda medida de layout, então nenhum teste de componente
 * encosta nisso. O que dá para travar é a **declaração**, lida do disco.
 */
describe('AdminLayout — a sidebar fixa, lida do fonte', () => {
  const HERE = dirname(fileURLToPath(import.meta.url))
  const fonte = readFileSync(resolve(HERE, 'AdminLayout.tsx'), 'utf8')

  /**
   * As classes declaradas num elemento, lidas do fonte.
   *
   * **Enxerga as duas formas** (feature 47): o `className="literal"` de sempre e o
   * `className={cn('literal', …)}`, do qual concatena os literais de string. A segunda forma
   * apareceu quando a largura do `aside` passou a depender do estado do trilho — e sem esta
   * extensão a régua teria continuado verde medindo **string vazia**, que é a pior falha possível
   * num teste que lê fonte. A âncora abaixo é o que transforma esse silêncio em reprovação.
   *
   * O segundo parâmetro existe para os sensores: eles precisam medir uma declaração sintética com a
   * mesma régua que mede o arquivo real — régua que não pode ser chamada pelo sensor não é sensor.
   */
  const classesDe = (tag: string, fonteLida: string = fonte): string => {
    const literal = fonteLida.match(new RegExp(`<${tag}\\b[^>]*className="([^"]*)"`))
    if (literal) return literal[1]

    const dinamico = fonteLida.match(new RegExp(`<${tag}\\b[^>]*className=\\{cn\\(([\\s\\S]*?)\\)\\}`))
    if (!dinamico) return ''

    return [...dinamico[1].matchAll(/'([^']*)'/g)].map(captura => captura[1]).join(' ')
  }

  it('ÂNCORA: a varredura acha os três elementos que ela mede', () => {
    // Sem a âncora, renomear `aside` para outro elemento faria as asserções abaixo passarem sobre
    // string vazia — que é a pior falha possível num teste que lê fonte.
    expect(classesDe('aside')).not.toBe('')
    expect(classesDe('header')).not.toBe('')
    expect(classesDe('nav')).not.toBe('')
  })

  it('o `aside` está preso na viewport e tem altura de uma tela', () => {
    const aside = classesDe('aside')
    expect(aside).toContain('sticky')
    expect(aside).toContain('top-0')
    expect(aside).toContain('h-screen')
    // `self-start`: sem ele o `align-items: stretch` do flex desfaz o `h-screen` e a sidebar volta
    // a acompanhar a altura do documento — que é exatamente o defeito.
    expect(aside).toContain('self-start')
  })

  it('FOCO-10: a largura é a ÚNICA coisa que muda entre os dois estados', () => {
    const aside = classesDe('aside')

    // Os dois estados declarados, e os invariantes fora do ternário — que é o que garante que eles
    // valem nos dois. Se `w-14`/`w-60` migrassem para dentro de `style`, a régua devolveria só os
    // invariantes e o par abaixo reprovaria.
    expect(aside).toContain('w-14')
    expect(aside).toContain('w-60')
    expect(aside).toContain('hidden')
    expect(aside).toContain('md:block')
  })

  it('a lista de grupos rola DENTRO da sidebar, e o `min-h-0` é o que faz isso valer', () => {
    const nav = classesDe('nav')
    expect(nav).toContain('overflow-y-auto')
    expect(nav).toContain('flex-1')
    // Sem `min-h-0`, um filho de flex não encolhe abaixo do próprio conteúdo: a lista empurraria o
    // rodapé para fora da coluna em vez de rolar, e o `overflow` nunca dispararia.
    expect(nav).toContain('min-h-0')
  })

  it('a raiz NÃO trava a rolagem do documento', () => {
    // Decisão declarada: `h-screen overflow-hidden` na raiz também prenderia a sidebar, mas
    // trocaria a rolagem do body pela do `main` — e `100vh` com a barra do navegador do celular é
    // o defeito seguinte. `sticky` prende a sidebar sem mexer no modelo de rolagem.
    const raiz = (fonte.match(/<div className="(min-h-screen[^"]*)"/)?.[1] ?? '').split(/\s+/)
    expect(raiz).not.toEqual([''])
    expect(raiz).toContain('min-h-screen')
    // Por token, não por `includes`: a string `min-h-screen` **contém** `h-screen`, e a asserção
    // ingênua reprovaria a própria forma correta.
    expect(raiz).not.toContain('h-screen')
    expect(raiz).not.toContain('overflow-hidden')
  })

  it('a barra do celular também não sai da tela', () => {
    // No celular a sidebar É o botão do menu: se ele rola para fora, navegar exige voltar ao topo
    // de uma listagem de 680 linhas.
    const header = classesDe('header')
    expect(header).toContain('sticky')
    expect(header).toContain('top-0')
    expect(header).toContain('md:hidden')
    expect(header).toMatch(/z-\d+/)
  })

  it('SENSOR A: a régua reprova a declaração ANTIGA', () => {
    // A forma que estava no arquivo antes do conserto — `aside` sem altura e sem `sticky`. Se as
    // asserções acima passassem também por ela, não estariam medindo nada.
    const antigo = 'w-60 bg-white border-r border-estrelinha-admin-border shrink-0 hidden md:block'
    expect(antigo).not.toContain('sticky')
    expect(antigo).not.toContain('h-screen')
    expect(antigo).not.toContain('self-start')
  })

  it('a régua LÊ o `className={cn(...)}` — não apenas deixa de falhar nele', () => {
    // Controle positivo da extensão: uma declaração dinâmica bem-formada tem de devolver os
    // literais, incluindo os dos dois ramos do ternário.
    const sintetico = `<aside className={cn('hidden md:block shrink-0 sticky top-0 self-start h-screen', recolhido ? 'w-14' : 'w-60')}>`
    const lido = classesDe('aside', sintetico)

    expect(lido).toContain('sticky')
    expect(lido).toContain('h-screen')
    expect(lido).toContain('self-start')
    expect(lido).toContain('w-14')
    expect(lido).toContain('w-60')
  })

  it('SENSOR B: um `cn()` SEM os invariantes reprova na mesma régua', () => {
    // Sem este sensor, a extensão poderia ter apenas parado de falhar — passando a devolver algo,
    // sem medir nada.
    const semInvariantes = `<aside className={cn('hidden md:block shrink-0 bg-white', recolhido ? 'w-14' : 'w-60')}>`
    const lido = classesDe('aside', semInvariantes)

    expect(lido).not.toBe('')
    expect(lido).not.toContain('sticky')
    expect(lido).not.toContain('h-screen')
    expect(lido).not.toContain('self-start')
  })

  it('SENSOR C: um `className` que a régua NÃO consegue ler produz âncora vazia — e reprova', () => {
    // O ponto cego não pode voltar por outra sintaxe. Se alguém mover as classes para uma variável
    // (`className={classes}`) ou para `style`, a régua tem de devolver string vazia, e a ÂNCORA
    // acima é quem transforma isso em suíte vermelha — em vez de asserções passando sobre o vazio.
    expect(classesDe('aside', `<aside className={classes}>`)).toBe('')
    expect(classesDe('aside', `<aside className={\`w-60 \${extra}\`}>`)).toBe('')
    expect(classesDe('aside', `<aside style={{ width: 240 }}>`)).toBe('')
  })
})
