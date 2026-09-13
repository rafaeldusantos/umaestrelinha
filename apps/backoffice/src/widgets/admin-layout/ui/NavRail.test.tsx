// Feature 47 — o trilho de ícones.
//
// O que se prova aqui é que o trilho **não tem lista própria**: os destinos, a ordem e o nome de
// cada um saem de `navGroups`/`footerNavItems`. A âncora de contagem é derivada dessa mesma fonte —
// escrever `14` à mão faria um grupo novo passar despercebido, que é a forma silenciosa deste
// defeito.

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import NavRail from './NavRail'
import { footerNavItems, navGroups } from '../model/navItems'

const destinos = [...navGroups.flatMap(grupo => grupo.items), ...footerNavItems]

const renderTrilho = (pathname = '/admin/home', onExpand = vi.fn()) =>
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <NavRail pathname={pathname} onExpand={onExpand} />
    </MemoryRouter>,
  )

describe('NavRail — FOCO-02: os mesmos destinos da sidebar, na mesma ordem', () => {
  it('ÂNCORA: a fonte de destinos não está vazia — se estivesse, tudo abaixo mediria nada', () => {
    expect(destinos.length).toBeGreaterThan(5)
  })

  it('renderiza EXATAMENTE os destinos de `navGroups` + `footerNavItems`', () => {
    renderTrilho()

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(destinos.length)
    expect(links.map(link => link.getAttribute('href'))).toEqual(destinos.map(item => item.to))
  })

  it('cada destino tem nome acessível igual ao rótulo da sidebar', () => {
    renderTrilho()

    for (const item of destinos) {
      expect(screen.getByRole('link', { name: item.label })).toHaveAttribute('href', item.to)
    }
  })

  it('nenhum rótulo VISÍVEL — recolhido é recolhido', () => {
    const { container } = renderTrilho()

    // O texto do item não pode estar desenhado em lugar nenhum do trilho em repouso; o nome vive
    // no `aria-label`, e o tooltip só monta o conteúdo quando abre.
    const texto = container.textContent ?? ''
    for (const item of destinos) {
      expect(texto).not.toContain(item.label)
    }
  })
})

describe('NavRail — FOCO-03: a navegação continua sabendo onde eu estou', () => {
  it('marca o destino da rota atual, e SÓ ele', () => {
    renderTrilho('/admin/home')

    const marcados = screen.getAllByRole('link').filter(link => link.dataset.active === 'true')
    expect(marcados).toHaveLength(1)
    expect(marcados[0]).toHaveAttribute('href', '/admin/home')
    expect(marcados[0]).toHaveAttribute('aria-current', 'page')
  })

  it('a subrota do editor de seção continua marcando a Home', () => {
    renderTrilho('/admin/home/8f3c-1a')

    const marcados = screen.getAllByRole('link').filter(link => link.dataset.active === 'true')
    expect(marcados).toHaveLength(1)
    expect(marcados[0]).toHaveAttribute('href', '/admin/home')
  })

  it('o Dashboard só é marcado na rota exata — `isNavActive`, e não prefixo cru', () => {
    renderTrilho('/admin/menu')

    const marcados = screen.getAllByRole('link').filter(link => link.dataset.active === 'true')
    expect(marcados).toHaveLength(1)
    expect(marcados[0]).toHaveAttribute('href', '/admin/menu')
  })
})

describe('NavRail — FOCO-04: um controle rotulado devolve os rótulos', () => {
  it('o botão de expandir existe, é rotulado e chama `onExpand`', () => {
    const onExpand = vi.fn()
    renderTrilho('/admin/home', onExpand)

    fireEvent.click(screen.getByRole('button', { name: 'Expandir a navegação' }))

    expect(onExpand).toHaveBeenCalledTimes(1)
  })
})

describe('NavRail — FOCO-09: alvo de 44px, e a medida com um dono só', () => {
  const fonte = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'NavRail.tsx'), 'utf8')

  it('ÂNCORA: a varredura leu o arquivo', () => {
    expect(fonte).toContain('const NavRail')
  })

  it('toda caixa clicável declara 44 × 44', () => {
    // **A enumeração é por PAPEL, não pela medida.** Filtrar as classes por `includes('h-11')` e
    // depois cobrar `h-11` nelas responderia "quantas caixas de 44 existem" — nunca "toda caixa
    // clicável tem 44", que é o que `FOCO-09` pede. Aqui a lista vem do DOM renderizado: se um
    // controle novo nascer sem a medida, ele entra na conta e reprova.
    renderTrilho()

    const clicaveis = [...screen.getAllByRole('link'), ...screen.getAllByRole('button')]
    expect(clicaveis.length).toBe(destinos.length + 1) // os destinos + o botão de expandir

    // Por TOKEN exato: `h-11` é substring de `min-h-11`, e `toContain` aceitaria a forma errada.
    const tokenExato = (token: string) => new RegExp(`(?:^|\\s)${token}(?![-\\w])`)
    for (const alvo of clicaveis) {
      expect(alvo.className).toMatch(tokenExato('h-11'))
      expect(alvo.className).toMatch(tokenExato('w-11'))
    }
  })

  it('SENSOR: a régua do alvo reprova uma caixa sem a medida', () => {
    // Sem este par, um regex que perdesse tudo passaria como "toda caixa conforme" — a asserção
    // acima mede uma propriedade que uma lista vazia satisfaz por vacuidade.
    const tokenExato = (token: string) => new RegExp(`(?:^|\\s)${token}(?![-\\w])`)

    expect(tokenExato('h-11').test('flex h-11 w-11 items-center')).toBe(true)
    expect(tokenExato('h-11').test('flex min-h-11 w-11 items-center')).toBe(false)
    expect(tokenExato('h-11').test('flex h-9 w-9 items-center')).toBe(false)
  })

  /**
   * Comentário fora, numa varredura só.
   *
   * A régua procura **uso**, nunca menção: o próprio `NavRail.tsx` explica em comentário por que
   * `TAP_44` não é importado, e uma régua ingênua acusaria justamente o arquivo que está certo.
   * Linha e bloco saem na **mesma** passada (`BL-027`), e `[^\n\r]` fecha o comentário de linha
   * antes do `\r` — em arquivo com CRLF, `[^\n]` engoliria o resto da linha seguinte.
   */
  const semComentarios = (texto: string): string =>
    texto.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

  it('`TAP_44` NÃO é importado nem copiado — a medida da loja tem dono lá', () => {
    const codigo = semComentarios(fonte)

    expect(codigo).not.toContain('TAP_44')
    expect(codigo).not.toContain('TAP_ROW')
    expect(codigo).not.toContain('@estrelinha/store')
    expect(codigo).not.toMatch(/from\s+'[^']*apps\/store/)
  })

  it('SENSOR: o removedor de comentário não cega a régua — um import de verdade É acusado', () => {
    const comImport = "import { TAP_44 } from '@estrelinha/store/shared/lib/tap'\nconst x = TAP_44"
    expect(semComentarios(comImport)).toContain('TAP_44')

    // E a menção em comentário — as duas formas, com LF e com CRLF — continua saindo.
    expect(semComentarios('// usa TAP_44 aqui\nconst y = 1')).not.toContain('TAP_44')
    expect(semComentarios('// usa TAP_44 aqui\r\nconst y = 1')).not.toContain('TAP_44')
    expect(semComentarios('/* bloco com TAP_44 */\nconst y = 1')).not.toContain('TAP_44')
    // O CRLF não pode comer a linha seguinte: o que vem depois tem de sobreviver.
    expect(semComentarios('// nota\r\nconst y = 1')).toContain('const y = 1')
  })
})
