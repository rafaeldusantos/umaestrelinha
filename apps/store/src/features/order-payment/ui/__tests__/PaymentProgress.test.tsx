import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import PaymentProgress from '../PaymentProgress'

/**
 * Os dois passos nomeados — `PIX-P1-01` e `PIX-P1-07` (boards `58 A` e `58 B`).
 *
 * O que estes casos prendem é a propriedade que a spec cobra e que nenhuma outra prova alcança:
 * **nenhum passo avança por tempo decorrido**. Quem decide é a prop, e a prop só muda quando a
 * resposta chega — então o passo 1 ativo NÃO pode marcar o 2 como concluído, em nenhuma
 * circunstância, e não pode existir barra de progresso, porque uma barra precisaria de uma fração
 * que ninguém tem.
 */

const PASSO_1 = 'Registrando seu pedido'
const PASSO_1_FEITO = 'Pedido registrado'
const PASSO_2 = 'Gerando o código PIX com o banco'

/** O `<li>` daquele passo, a partir do próprio rótulo — nunca de um irmão. */
const passo = (rotulo: string) => screen.getByText(rotulo).closest('li') as HTMLElement

/**
 * A classe está lá, por **token exato** — nunca por `toContain` (`L-034`).
 *
 * `'text-estrelinha-ink-soft'.includes('text-estrelinha-ink')` é `true`: uma régua de substring
 * diria que o rótulo apagado está em `ink`, e o caso que separa o passo em curso do que vem depois
 * passaria com os dois iguais.
 */
const temClasse = (el: HTMLElement, token: string) =>
  new RegExp(`(?:^|\\s)${token}(?![-\\w])`).test(el.className)

describe('PaymentProgress — passo 1: registrando o pedido', () => {
  it('nomeia o passo em curso e o que vem depois', () => {
    render(<PaymentProgress step="order" amount={46.55} />)

    expect(screen.getByText('Passo 1 de 2')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Estamos registrando seu pedido' })).toBeInTheDocument()
    expect(screen.getByText(PASSO_1)).toBeInTheDocument()
    expect(screen.getByText(PASSO_2)).toBeInTheDocument()
  })

  it('o passo 1 ativo NÃO marca o 2 como concluído', () => {
    // A metade que importa: os dois rótulos aparecem nas duas telas, então "o passo 2 existe" não
    // distingue nada. O que distingue é o selo — e o selo do passo 1 concluído (`Pedido
    // registrado`) não pode existir aqui.
    render(<PaymentProgress step="order" amount={46.55} />)

    expect(screen.queryByText(PASSO_1_FEITO)).not.toBeInTheDocument()
    expect(passo(PASSO_1).querySelector('.animate-spin')).toBeInTheDocument()
    expect(passo(PASSO_2).querySelector('.animate-spin')).toBeNull()
  })

  it('o rótulo em curso é o único em `ink`; o que vem depois fica em `ink-soft`', () => {
    render(<PaymentProgress step="order" amount={46.55} />)

    expect(temClasse(screen.getByText(PASSO_1), 'text-estrelinha-ink')).toBe(true)
    expect(temClasse(screen.getByText(PASSO_1), 'font-semibold')).toBe(true)
    expect(temClasse(screen.getByText(PASSO_2), 'text-estrelinha-ink-soft')).toBe(true)
    expect(temClasse(screen.getByText(PASSO_2), 'font-semibold')).toBe(false)
  })

  it('e no passo 2 a distinção se INVERTE — sem isso, a metade fácil provaria as duas', () => {
    // `L-029`: asserção positiva dos dois lados. Um componente que pintasse o passo 1 sempre em
    // `ink` passaria no caso acima e mentiria na tela seguinte.
    render(<PaymentProgress step="code" amount={46.55} orderNumber="0244" />)

    expect(temClasse(screen.getByText(PASSO_1_FEITO), 'text-estrelinha-ink-soft')).toBe(true)
    expect(temClasse(screen.getByText(PASSO_2), 'text-estrelinha-ink')).toBe(true)
    expect(temClasse(screen.getByText(PASSO_2), 'font-semibold')).toBe(true)
  })

  it('não cita número de pedido — ele ainda não existe', () => {
    render(<PaymentProgress step="order" amount={46.55} />)

    expect(screen.queryByText('Pedido')).not.toBeInTheDocument()
    expect(screen.queryByText(/guardado em Minha conta/)).not.toBeInTheDocument()
  })
})

describe('PaymentProgress — passo 2: gerando o código', () => {
  it('nomeia o passo em curso e marca o anterior como concluído', () => {
    render(<PaymentProgress step="code" amount={46.55} orderNumber="0244" />)

    expect(screen.getByText('Passo 2 de 2')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Gerando seu código PIX' })).toBeInTheDocument()
    expect(screen.getByText(PASSO_1_FEITO)).toBeInTheDocument()
    expect(passo(PASSO_2).querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('cita o número do pedido — é o que responde "perdi minha compra?"', () => {
    render(<PaymentProgress step="code" amount={46.55} orderNumber="0244" />)

    expect(screen.getByText('#0244')).toBeInTheDocument()
    expect(screen.getByText(/guardado em Minha conta/)).toBeInTheDocument()
  })

  it('o número sai pelo formatador — um `#`, mesmo com o valor já prefixado', () => {
    // A régua do dono único mede a ausência do `#` colado à mão; esta mede o outro lado, que é a
    // saída chegando certa quando a origem já traz o prefixo.
    render(<PaymentProgress step="code" amount={46.55} orderNumber="#0244" />)

    expect(screen.getByText('#0244')).toBeInTheDocument()
    expect(screen.queryByText('##0244')).not.toBeInTheDocument()
  })

  it('o legado continua legível — `NS-169` não vira outra coisa', () => {
    render(<PaymentProgress step="code" amount={46.55} orderNumber="NS-169" />)

    expect(screen.getByText('#NS-169')).toBeInTheDocument()
  })

  it('sem número, a linha do pedido não aparece — nunca um `#` pelado', () => {
    render(<PaymentProgress step="code" amount={46.55} />)

    expect(screen.queryByText(/guardado em Minha conta/)).not.toBeInTheDocument()
    expect(screen.getByText(PASSO_1_FEITO)).toBeInTheDocument()
  })
})

describe('PaymentProgress — a espera longa (PIX-P1-07)', () => {
  it('sem `slow`, a linha não existe', () => {
    render(<PaymentProgress step="code" amount={46.55} orderNumber="0244" />)

    expect(screen.queryByText(/espera está mais longa/i)).not.toBeInTheDocument()
  })

  it('com `slow`, a linha entra ACRESCENTANDO — os dois passos continuam na tela', () => {
    // A AC diz "sem substituir os passos". Sem a segunda metade desta asserção, um componente que
    // trocasse os passos pela linha passaria — e a pessoa perderia a única coisa que a tela tinha
    // para dizer onde ela está.
    render(<PaymentProgress step="code" amount={46.55} orderNumber="0244" slow />)

    expect(screen.getByText(/espera está mais longa/i)).toBeInTheDocument()
    expect(screen.getByText(PASSO_1_FEITO)).toBeInTheDocument()
    expect(screen.getByText(PASSO_2)).toBeInTheDocument()
  })

  it('a linha afirma que o pedido está guardado — é o que evita o recarregamento', () => {
    render(<PaymentProgress step="code" amount={46.55} orderNumber="0244" slow />)

    // Recortado pela PRÓPRIA linha: a nota de rodapé do passo 2 também diz isso, e uma busca no
    // documento inteiro passaria com a linha de espera ausente.
    const linha = screen.getByText(/espera está mais longa/i).closest('p') as HTMLElement
    expect(linha.textContent).toMatch(/pedido já está guardado/i)
  })

  it('a espera longa também vale no passo 1', () => {
    render(<PaymentProgress step="order" amount={46.55} slow />)

    expect(screen.getByText(/espera está mais longa/i)).toBeInTheDocument()
    expect(screen.getByText(PASSO_1)).toBeInTheDocument()
  })
})

describe('PaymentProgress — o que ela NÃO faz', () => {
  it.each([
    ['passo 1', 'order' as const],
    ['passo 2', 'code' as const],
  ])('%s: nenhuma barra de progresso — a fração teria de ser inventada', (_nome, step) => {
    const { container } = render(
      <PaymentProgress step={step} amount={46.55} orderNumber="0244" slow />,
    )

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(container.querySelector('progress')).toBeNull()
    // A terceira forma: um `<div>` com largura em porcentagem, que é como se desenha uma barra
    // falsa sem nenhum dos dois acima.
    expect(container.querySelector('[style*="width"]')).toBeNull()
  })

  it.each([
    ['passo 1', 'order' as const],
    ['passo 2', 'code' as const],
  ])('%s: diz o valor e afirma que nada foi cobrado', (_nome, step) => {
    render(<PaymentProgress step={step} amount={46.55} orderNumber="0244" />)

    expect(screen.getByText('R$ 46,55')).toBeInTheDocument()
    expect(screen.getByText(/[Nn]ada foi cobrado ainda/)).toBeInTheDocument()
  })

  it('nenhuma classe de cor fora da paleta Uma Estrelinha', () => {
    const { container } = render(
      <PaymentProgress step="code" amount={46.55} orderNumber="0244" slow />,
    )

    expect(container.innerHTML).not.toMatch(
      /bg-(yellow|blue|purple|green|red)-|text-(green|red|yellow|blue|purple)-[0-9]/,
    )
  })

  it('nenhuma urgência fabricada — sem contagem regressiva e sem exclamação', () => {
    // `DESIGN.md` §1: nada apressa, nada comemora. A tela é de espera, que é exatamente onde a
    // tentação de inventar pressa aparece.
    const { container } = render(
      <PaymentProgress step="code" amount={46.55} orderNumber="0244" slow />,
    )

    expect(container.textContent).not.toMatch(/!|últim|corr[ea]|rápido|apress/i)
  })

  it('os dois passos vivem numa LISTA — a ordem é semântica, não só visual', () => {
    const { container } = render(<PaymentProgress step="order" amount={46.55} />)
    const lista = container.querySelector('ol') as HTMLElement

    expect(lista).toBeInTheDocument()
    expect(within(lista).getByText(PASSO_1)).toBeInTheDocument()
    expect(within(lista).getByText(PASSO_2)).toBeInTheDocument()
  })
})
