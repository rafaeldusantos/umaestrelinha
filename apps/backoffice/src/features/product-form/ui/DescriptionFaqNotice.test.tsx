import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DescriptionFaqNotice from './DescriptionFaqNotice'

/**
 * `FAQ-27`, `FAQ-28` — o aviso do bloco que a loja não mostra.
 *
 * Este componente é a contrapartida da decisão de **filtrar no render em vez de remover na
 * importação**. O que ele evita é o pior modo de falha do projeto: a dona edita um texto invisível,
 * salva, e nada muda na loja.
 */

const COM_BLOCO =
  '<h2>Peça</h2><p>Texto.</p>' +
  '<h3>Especificações</h3><ul><li>Prata 925</li></ul>' +
  '<h3>Perguntas frequentes</h3>' +
  '<p><strong>Como envio meu material?</strong><br />Você recebe as instruções.</p>' +
  '<p><strong>Quanto tempo leva?</strong><br />Até 25 dias.</p>' +
  '<h3>Observações importantes</h3><ul><li>Ilustrativa.</li></ul>'

const SEM_BLOCO = '<h2>Peça</h2><p>Texto.</p><h3>Especificações</h3><ul><li>Prata 925</li></ul>'

const montar = (description: string) => {
  const onRemove = vi.fn()
  const onGoToFaqTab = vi.fn()
  render(
    <DescriptionFaqNotice
      description={description}
      onRemove={onRemove}
      onGoToFaqTab={onGoToFaqTab}
    />,
  )
  return { onRemove, onGoToFaqTab }
}

describe('DescriptionFaqNotice — quando aparece', () => {
  it('aparece com bloco localizável, dizendo QUANTAS perguntas há', () => {
    montar(COM_BLOCO)

    const aviso = screen.getByTestId('description-faq-notice')
    expect(aviso).toHaveTextContent('2 perguntas frequentes')
    expect(aviso).toHaveTextContent(/não.*mostra/i)
  })

  it('concorda o singular com uma pergunta só', () => {
    montar(
      '<h3>Perguntas frequentes</h3><p><strong>Uma só?</strong><br />Uma só.</p>',
    )
    expect(screen.getByTestId('description-faq-notice')).toHaveTextContent('1 pergunta frequente')
  })

  it('NÃO aparece sem bloco', () => {
    montar(SEM_BLOCO)
    expect(screen.queryByTestId('description-faq-notice')).toBeNull()
  })

  // `FAQ-06`: heading sem par extraível é texto da dona, e a loja continua exibindo.
  it('NÃO aparece quando o bloco não tem par extraível', () => {
    montar('<h3>Perguntas frequentes</h3><p>Fale com a gente pelo WhatsApp.</p>')
    expect(screen.queryByTestId('description-faq-notice')).toBeNull()
  })

  it('descrição vazia não quebra', () => {
    expect(() => montar('')).not.toThrow()
    expect(screen.queryByTestId('description-faq-notice')).toBeNull()
  })
})

describe('DescriptionFaqNotice — o que oferece', () => {
  it('leva para a aba Perguntas', () => {
    const { onGoToFaqTab } = montar(COM_BLOCO)

    fireEvent.click(screen.getByRole('button', { name: 'Ver a aba Perguntas' }))
    expect(onGoToFaqTab).toHaveBeenCalled()
  })

  it('remover devolve a descrição SEM o bloco, preservando o resto', () => {
    const { onRemove } = montar(COM_BLOCO)

    fireEvent.click(screen.getByRole('button', { name: 'Remover o bloco da descrição' }))

    expect(onRemove).toHaveBeenCalledTimes(1)
    const semBloco = onRemove.mock.calls[0][0] as string

    expect(semBloco).not.toContain('Perguntas frequentes')
    expect(semBloco).not.toContain('Como envio meu material?')
    expect(semBloco).toContain('Especificações')
    expect(semBloco).toContain('Observações importantes')
  })

  // Alterar o rascunho, e não gravar: a dona ainda pode desistir com Cancelar.
  it('remover NÃO grava — só devolve o texto para o chamador', () => {
    const { onRemove } = montar(COM_BLOCO)

    fireEvent.click(screen.getByRole('button', { name: 'Remover o bloco da descrição' }))
    expect(typeof onRemove.mock.calls[0][0]).toBe('string')
  })

  it('depois de remover, o aviso some para o texto novo', () => {
    const { onRemove } = montar(COM_BLOCO)

    fireEvent.click(screen.getByRole('button', { name: 'Remover o bloco da descrição' }))
    const semBloco = onRemove.mock.calls[0][0] as string

    // `cleanup` explícito: a RTL só desmonta entre testes, e sem isto o aviso do primeiro render
    // ficaria no documento e a asserção passaria medindo a montagem errada.
    cleanup()
    montar(semBloco)

    expect(screen.queryByTestId('description-faq-notice')).toBeNull()
  })
})
