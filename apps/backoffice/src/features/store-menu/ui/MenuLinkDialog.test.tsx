// T23 — o cadastro de um item de link do menu.
//
// As ACs provadas aqui: `NAV-09` (rótulo, destino, ícone e ligação por dispositivo), `NAV-10`/`NAV-11`
// (a recusa do destino, **antes** da gravação), `NAV-12` (link é link direto: sem painel, sem
// subcategoria, sem banner) e `NAV-13` (remover não mexe na página de destino, e a tela diz isso).
//
// O caso que mais importa é o mais chato de escrever: **a recusa não fecha o diálogo**. Fechar com o
// motivo num toast faria a dona perder o que digitou e ter de reconstruir o item para tentar de novo.

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MenuLink } from '@estrelinha/core/menu'
import type { MenuLinkDraft } from '../model/useMenuLinks'
import MenuLinkDialog from './MenuLinkDialog'

const SOBRE: MenuLink = {
  id: 'sobre', label: 'Sobre', href: '/sobre', icon: null,
  desktop: true, mobile: true, sort_order: 100,
}

const onSave = vi.fn<(draft: MenuLinkDraft) => Promise<string | null>>()
const onRemove = vi.fn<(id: string) => Promise<string | null>>()
const onOpenChange = vi.fn()

const montar = (link: MenuLink | null = null) =>
  render(
    <MenuLinkDialog
      open
      onOpenChange={onOpenChange}
      link={link}
      onSave={onSave}
      onRemove={onRemove}
    />,
  )

beforeEach(() => {
  onSave.mockReset().mockResolvedValue(null)
  onRemove.mockReset().mockResolvedValue(null)
  onOpenChange.mockReset()
})

// ---------------------------------------------------------------------------
describe('NAV-09 — o cadastro', () => {
  it('nasce ligado nos dois dispositivos — quem cadastra quer ver o que criou', () => {
    montar()
    expect(screen.getByLabelText('Aparece no menu do computador')).toBeChecked()
    expect(screen.getByLabelText('Aparece no menu do celular')).toBeChecked()
  })

  it('grava rótulo, destino, ícone e as duas booleanas', async () => {
    montar()
    fireEvent.change(screen.getByLabelText('Nome no menu'), { target: { value: 'Como enviar' } })
    fireEvent.change(screen.getByLabelText('Destino'), {
      target: { value: '/como-enviar-seu-material-de-dna' },
    })
    fireEvent.click(screen.getByLabelText('Envio'))
    fireEvent.click(screen.getByLabelText('Aparece no menu do celular'))
    fireEvent.click(screen.getByText('Salvar'))

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    // Igualdade exata: é o que impede um campo novo de entrar na gravação sem ninguém decidir.
    expect(onSave.mock.calls[0][0]).toEqual({
      label: 'Como enviar',
      href: '/como-enviar-seu-material-de-dna',
      icon: 'envio',
      desktop: true,
      mobile: false,
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('editar chega com os valores do link, e mantém o id', async () => {
    montar(SOBRE)
    expect(screen.getByLabelText('Nome no menu')).toHaveValue('Sobre')
    expect(screen.getByLabelText('Destino')).toHaveValue('/sobre')

    fireEvent.change(screen.getByLabelText('Nome no menu'), { target: { value: 'Sobre nós' } })
    fireEvent.click(screen.getByText('Salvar'))

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave.mock.calls[0][0]).toMatchObject({ id: 'sobre', label: 'Sobre nós' })
  })
})

describe('NAV-10 / NAV-11 — a recusa do destino não fecha o diálogo', () => {
  it('endereço que não é rota da loja mostra o motivo e NÃO grava', async () => {
    montar()
    fireEvent.change(screen.getByLabelText('Nome no menu'), { target: { value: 'Campanha' } })
    fireEvent.change(screen.getByLabelText('Destino'), { target: { value: '/promocao' } })
    fireEvent.click(screen.getByText('Salvar'))

    expect(await screen.findByTestId('link-recusa')).toHaveTextContent('não é um endereço da loja')
    expect(onSave).not.toHaveBeenCalled()
    // O diálogo continua aberto, com o que foi digitado.
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Nome no menu')).toHaveValue('Campanha')
  })

  it('rótulo vazio é recusado antes do destino — é o que a cliente lê na barra', async () => {
    montar()
    fireEvent.change(screen.getByLabelText('Destino'), { target: { value: '/sobre' } })
    fireEvent.click(screen.getByText('Salvar'))

    expect(await screen.findByTestId('link-recusa')).toHaveTextContent('Dê um nome')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('`http://` é recusado com o motivo escrito; `https://` passa', async () => {
    montar()
    fireEvent.change(screen.getByLabelText('Nome no menu'), { target: { value: 'Instagram' } })
    fireEvent.change(screen.getByLabelText('Destino'), { target: { value: 'http://instagram.com' } })
    fireEvent.click(screen.getByText('Salvar'))

    expect(await screen.findByTestId('link-recusa')).toHaveTextContent('https://')

    fireEvent.change(screen.getByLabelText('Destino'), { target: { value: 'https://instagram.com' } })
    fireEvent.click(screen.getByText('Salvar'))
    await waitFor(() => expect(onSave).toHaveBeenCalled())
  })

  it('falha de gravação também NÃO fecha, e diz o motivo', async () => {
    onSave.mockResolvedValue('permission denied for table store_settings')
    montar(SOBRE)
    fireEvent.click(screen.getByText('Salvar'))

    expect(await screen.findByTestId('link-recusa')).toHaveTextContent('permission denied')
    expect(onOpenChange).not.toHaveBeenCalled()
  })
})

describe('NAV-12 — link é link direto', () => {
  it('não oferece painel, subcategoria nem banner', () => {
    montar(SOBRE)
    // Dar painel a um link o transformaria numa categoria sem produtos — a "segunda árvore" que a
    // feature 16 recusou, agora com uma página que não existe do outro lado.
    expect(screen.queryByText(/subcategoria/i)).toBeNull()
    expect(screen.queryByText(/banner/i)).toBeNull()
    expect(screen.queryByText(/painel/i)).toBeNull()
  })
})

describe('NAV-13 — remover tira do menu, não da loja', () => {
  it('a tela diz que a página continua existindo', () => {
    montar(SOBRE)
    expect(screen.getByText(/continua existindo na/)).toBeInTheDocument()
  })

  it('remover chama o hook com o id e fecha', async () => {
    montar(SOBRE)
    fireEvent.click(screen.getByText('Remover do menu'))

    await waitFor(() => expect(onRemove).toHaveBeenCalledWith('sobre'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('cadastro novo não oferece remover — não há o que remover', () => {
    montar()
    expect(screen.queryByText('Remover do menu')).toBeNull()
  })
})

describe('o ícone vem do MESMO conjunto que a loja desenha', () => {
  it('oferece "sem ícone" e as chaves do catálogo', () => {
    montar(SOBRE)
    expect(screen.getByLabelText('Sem ícone')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Corrente')).toBeInTheDocument()
    expect(screen.getByLabelText('Gota afetiva')).toBeInTheDocument()
  })

  it('escolher e voltar para "sem ícone" limpa o valor', async () => {
    montar(SOBRE)
    fireEvent.click(screen.getByLabelText('Corrente'))
    expect(screen.getByLabelText('Corrente')).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByLabelText('Sem ícone'))
    fireEvent.click(screen.getByText('Salvar'))

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave.mock.calls[0][0]).toMatchObject({ icon: null })
  })
})
