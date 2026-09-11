import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FICHAS_DE_MATERIAL } from '../../model/guide'
import MaterialAviso from '../MaterialAviso'

/**
 * O TOM do aviso — `GAV-11`, e o buraco que a verificação independente achou.
 *
 * `MaterialAviso` foi extraído de `MaterialFicha` **justamente** para o tom não ter dois donos, e
 * saiu sem uma asserção sequer sobre o tom. O mutante que provou o buraco: trocar
 * `if (aviso.tom === 'alerta')` por `if (false)` deixava a suíte inteira verde — e o único aviso
 * `alerta` do guia ("nunca use fita adesiva") perdia barra, rosa e ícone, virando visualmente
 * idêntico ao aviso que **tranquiliza**.
 *
 * A diferença entre os dois tons **é o remédio**, não a intensidade: `calma` é informação que
 * acalma, `alerta` é um erro que estraga o material que não tem segunda via. Lê-los com o mesmo peso
 * é perder exatamente o que importa.
 */

const CALMA = { tom: 'calma', texto: 'Se descongelar no caminho, a joia não é afetada.' } as const
const ALERTA = { tom: 'alerta', texto: 'Nunca use fita adesiva no material.' } as const

describe('MaterialAviso — os dois tons são visualmente distintos', () => {
  it('`alerta` sai sobre o rosa de advertência, com a barra à esquerda', () => {
    render(<MaterialAviso aviso={ALERTA} surface="pagina" />)
    const classes = (screen.getByText(ALERTA.texto).closest("p")!.getAttribute("class") ?? '').split(/\s+/)

    expect(classes).toContain('bg-[#F7EDE8]')
    expect(classes).toContain('border-l-[3px]')
    expect(classes).toContain('border-[#9E4A3E]')
  })

  it('`alerta` traz o sinal de exclamação; `calma` NÃO traz', () => {
    const { unmount } = render(<MaterialAviso aviso={ALERTA} surface="pagina" />)
    expect(screen.getByText('!')).toBeInTheDocument()
    unmount()

    render(<MaterialAviso aviso={CALMA} surface="pagina" />)
    expect(screen.queryByText('!')).toBeNull()
  })

  it('`calma` sai sobre `serenity`, SEM barra e SEM o rosa', () => {
    render(<MaterialAviso aviso={CALMA} surface="pagina" />)
    const classes = (screen.getByText(CALMA.texto).closest("p")!.getAttribute("class") ?? '').split(/\s+/)

    expect(classes).toContain('bg-estrelinha-serenity')
    expect(classes).not.toContain('bg-[#F7EDE8]')
    expect(classes).not.toContain('border-l-[3px]')
  })

  it('o tom decide a COR, e a superfície decide só o respiro', () => {
    // O par que impede o conserto errado: se alguém tentar diferenciar as superfícies pela cor,
    // este caso reprova. `surface` existe porque a página tem uma coluna de leitura e a gaveta tem
    // 310px no celular — nunca porque o aviso significa coisas diferentes nos dois lugares.
    const { unmount } = render(<MaterialAviso aviso={ALERTA} surface="pagina" />)
    const naPagina = (screen.getByText(ALERTA.texto).closest("p")!.getAttribute("class") ?? '').split(/\s+/)
    unmount()

    render(<MaterialAviso aviso={ALERTA} surface="gaveta" />)
    const naGaveta = (screen.getByText(ALERTA.texto).closest("p")!.getAttribute("class") ?? '').split(/\s+/)

    for (const cor of ['bg-[#F7EDE8]', 'border-[#9E4A3E]', 'border-l-[3px]']) {
      expect(naPagina).toContain(cor)
      expect(naGaveta).toContain(cor)
    }
    // E o respiro é mesmo diferente — senão o parâmetro seria decoração.
    expect(naPagina).not.toEqual(naGaveta)
  })

  it('o catálogo real tem avisos dos DOIS tons — senão este arquivo mede um caso morto', () => {
    // Âncora: se o guia perdesse todo aviso `alerta`, os casos acima continuariam verdes contra
    // objetos literais e ninguém notaria que a distinção deixou de existir na loja.
    const todos = FICHAS_DE_MATERIAL.flatMap(f => f.avisos)
    expect(todos.some(a => a.tom === 'alerta')).toBe(true)
    expect(todos.some(a => a.tom === 'calma')).toBe(true)
  })
})
