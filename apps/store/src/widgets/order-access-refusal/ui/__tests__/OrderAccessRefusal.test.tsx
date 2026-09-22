import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthUiStore } from '@/features/auth'

import OrderAccessRefusal from '../OrderAccessRefusal'

/**
 * "Não conseguimos abrir este pedido" — a recusa compartilhada por `/pedido/:id` e por
 * `/pedido/:id/pagamento`.
 *
 * ---------------------------------------------------------------------------------------------
 * Por que este arquivo existe
 * ---------------------------------------------------------------------------------------------
 *
 * Ele **não existia** quando a feature `58` deu ao widget o segundo consumidor, e um comentário em
 * `OrderPaymentPage.test.tsx` afirmava que existia. *Comentário que afirma cobertura inexistente é
 * pior que comentário nenhum*, porque encerra a investigação — é o defeito que a `51` nomeou, e ele
 * escondeu um CTA morto: o botão "Entrar com código" liga uma flag numa store, e a rota do
 * pagamento não montava ninguém que a lesse.
 *
 * O que se mede aqui são os **três ramos** do widget, que decidem qual saída a pessoa recebe. Eles
 * não são cosméticos: mandar para "Minha conta" quem nunca entrou numa é um beco sem saída, e
 * oferecer código por e-mail a quem já está logada é pedir uma prova que ela já deu.
 *
 * A store é a **real**; só o desenho do overlay fica de fora (ele arrasta o SDK de OTP, e quem o
 * monta são as páginas — provado lá, em cada uma).
 */
vi.mock('@/features/auth', async () => {
  const real = await vi.importActual<typeof import('@/features/auth/model/authUiStore')>(
    '@/features/auth/model/authUiStore',
  )
  return { useAuthUiStore: real.useAuthUiStore }
})

const authState: { user: { id: string } | null } = { user: null }
vi.mock('@estrelinha/auth', () => ({ useAuthContext: () => authState }))

const montar = (props: { isError: boolean; returnTo?: string }) =>
  render(
    <MemoryRouter>
      <OrderAccessRefusal {...props} />
    </MemoryRouter>,
  )

beforeEach(() => {
  authState.user = null
  useAuthUiStore.setState({ isOpen: false, step: 'entry', email: '', returnTo: null })
})

describe('OrderAccessRefusal — erro de leitura e pedido inexistente não se confundem', () => {
  it('erro de rede nomeia o erro e manda para a lista, sem pedir prova nenhuma', () => {
    // Quem só perdeu a conexão não pode ser mandado a provar que o pedido é dela.
    montar({ isError: true })

    expect(
      screen.getByRole('heading', { name: 'Não conseguimos abrir este pedido' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir para Minha conta' })).toHaveAttribute(
      'href',
      '/conta',
    )
    expect(screen.queryByRole('button', { name: 'Entrar com código' })).not.toBeInTheDocument()
  })

  it('pedido que não existe diz outra coisa — o par do caso acima', () => {
    montar({ isError: false })

    expect(screen.getByRole('heading', { name: 'Pedido não encontrado' })).toBeInTheDocument()
  })

  it('erro de rede vale mesmo SEM sessão — a régua é o erro, não a identidade', () => {
    // Sem este caso, um ramo que decidisse só por `user` passaria nos dois de cima: a fixture de
    // erro seria indistinguível da de sessão presente.
    authState.user = null
    montar({ isError: true })

    expect(screen.getByRole('link', { name: 'Ir para Minha conta' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Entrar com código' })).not.toBeInTheDocument()
  })
})

describe('OrderAccessRefusal — a saída depende de quem está do outro lado (feature 49)', () => {
  it('COM sessão, o caminho é a lista de pedidos da conta', () => {
    authState.user = { id: 'usr-1' }
    montar({ isError: false })

    expect(screen.getByText('Confira o link ou veja a lista completa em Minha conta.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir para Minha conta' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Entrar com código' })).not.toBeInTheDocument()
  })

  it('SEM sessão, o caminho é o código por e-mail — e nunca "Minha conta"', () => {
    // A convidada da feature `49` tem conta e nunca entrou nela: mandá-la para `/conta` é um beco.
    montar({ isError: false })

    expect(
      screen.getByText(
        'O acesso a este pedido pode ter expirado. Entre com o código enviado para o seu e-mail para ver seus pedidos.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar com código' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ir para Minha conta' })).not.toBeInTheDocument()
  })

  it('o botão LIGA o acesso, com o destino de volta que recebeu', () => {
    // A metade que o widget controla. A outra — alguém montar o overlay que lê este estado — é da
    // PÁGINA, e é medida em cada uma delas: uma flag ligada sem leitor é o CTA morto que a
    // verificação independente da `58` encontrou nesta mesma tela.
    montar({ isError: false, returnTo: '/pedido/ord-1' })

    screen.getByRole('button', { name: 'Entrar com código' }).click()

    expect(useAuthUiStore.getState()).toMatchObject({ isOpen: true, returnTo: '/pedido/ord-1' })
  })

  it('sem destino de volta o acesso abre igual — só sem destino', () => {
    montar({ isError: false })

    screen.getByRole('button', { name: 'Entrar com código' }).click()

    expect(useAuthUiStore.getState().isOpen).toBe(true)
    expect(useAuthUiStore.getState().returnTo).toBeNull()
  })

  it('o alvo de toque do botão não fica abaixo do piso de 44px', () => {
    // `min-h-11` é a medida, por TOKEN EXATO: jsdom devolve 0 para layout, então a classe é o que
    // se pode medir aqui. `h-11` é substring de `min-h-11`, e a régua não pode confundir os dois.
    montar({ isError: false })

    const classes = screen.getByRole('button', { name: 'Entrar com código' }).className.split(/\s+/)
    expect(classes).toContain('min-h-11')
  })
})
