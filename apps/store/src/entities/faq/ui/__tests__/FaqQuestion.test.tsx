import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import FaqQuestion, { faqAnchorId } from '../FaqQuestion'
import FaqAnswer from '../FaqAnswer'

/**
 * `FAQL-03`, `FAQL-07`, `FAQL-30` — o acordeão e a resposta.
 *
 * A asserção que carrega a feature inteira é a primeira: **a resposta está no DOM com o acordeão
 * fechado**. É ela que separa uma página que um buscador de IA consegue ler de uma que ele vê vazia.
 */

const item = (over: Partial<Parameters<typeof FaqQuestion>[0]['item']> = {}) => ({
  id: 'abc-123',
  question: 'O que são joias afetivas?',
  answer: 'São peças criadas para eternizar histórias.',
  overridden: false,
  ...over,
})

const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * Comentário fora ANTES de medir — os dois arquivos explicam a regra citando o nome da coisa
 * proibida, e uma régua ingênua acusaria a própria explicação. É a armadilha que
 * `semMaterialNaPaginaDoProduto.test.ts` já registrou.
 *
 * CRLF normalizado primeiro: em JavaScript o `.` não casa `\r`, e num checkout Windows o removedor
 * de linha ficaria inerte (`L-031`).
 */
const semComentarios = (fonte: string): string =>
  fonte
    .replace(/\r\n?/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')

const FONTE = semComentarios(readFileSync(resolve(HERE, '../FaqQuestion.tsx'), 'utf8'))
const FONTE_RESPOSTA = semComentarios(readFileSync(resolve(HERE, '../FaqAnswer.tsx'), 'utf8'))

describe('FaqQuestion', () => {
  it('mostra a pergunta', () => {
    render(<FaqQuestion item={item()} />)
    expect(screen.getByText('O que são joias afetivas?')).toBeInTheDocument()
  })

  // ⚠️ A AC inteira. Sem isto, um rastreador que não execute JS — e boa parte dos de IA não executa —
  // vê uma página de títulos sem respostas.
  it('a RESPOSTA está no DOM mesmo com o acordeão FECHADO', () => {
    render(<FaqQuestion item={item()} />)

    const detalhes = document.querySelector('details')
    expect(detalhes?.hasAttribute('open')).toBe(false)
    expect(screen.getByText('São peças criadas para eternizar histórias.')).toBeInTheDocument()
  })

  it('abre quando é o alvo da âncora', () => {
    render(<FaqQuestion item={item()} open />)
    expect(document.querySelector('details')?.hasAttribute('open')).toBe(true)
  })

  it('o id da âncora é derivado do id da entrada, não do texto', () => {
    expect(faqAnchorId('abc-123')).toBe('p-abc-123')
    render(<FaqQuestion item={item()} />)
    expect(document.querySelector('details')?.id).toBe('p-abc-123')
  })

  // A pergunta é editável pela dona no painel. Um id derivado do texto mudaria quando ela corrigisse
  // uma vírgula, e todo link já compartilhado por WhatsApp deixaria de achar a resposta.
  it('editar o TEXTO da pergunta não muda a âncora', () => {
    const { rerender } = render(<FaqQuestion item={item()} />)
    const antes = document.querySelector('details')?.id
    rerender(<FaqQuestion item={item({ question: 'O que sao joias afetivas' })} />)
    expect(document.querySelector('details')?.id).toBe(antes)
  })

  it('é um `<details>`/`<summary>`, e não um acordeão que desmonta', () => {
    render(<FaqQuestion item={item()} />)
    expect(document.querySelector('details > summary')).not.toBeNull()
  })

  // SENSOR de forma: o guarda acima passaria se alguém trocasse por Radix com `forceMount`. Este lê
  // o fonte e recusa a volta do componente que desmonta.
  it('o arquivo não importa Accordion nenhum', () => {
    expect(FONTE).not.toMatch(/from\s+['"]@estrelinha\/ui\/accordion['"]/)
    expect(FONTE).toContain('<details')
  })

  it('o alvo de toque da linha adota TAP_ROW', () => {
    expect(FONTE).toContain('TAP_ROW')
  })
})

describe('FaqAnswer', () => {
  it('parágrafo vira <p> e lista vira <ul>/<li>', () => {
    render(<FaqAnswer answer={'Para facilitar:\n- Cinzas: 50 ml\n- Leite: 10 ml'} />)

    expect(screen.getByText('Para facilitar:').tagName).toBe('P')
    expect(document.querySelectorAll('ul li')).toHaveLength(2)
    expect(screen.getByText('Cinzas: 50 ml')).toBeInTheDocument()
  })

  it('preserva os parágrafos da resposta', () => {
    render(<FaqAnswer answer={'Primeiro.\n\nSegundo.'} />)
    expect(document.querySelectorAll('p')).toHaveLength(2)
  })

  it('resposta vazia não desenha caixa nenhuma', () => {
    const { container } = render(<FaqAnswer answer="   " />)
    expect(container).toBeEmptyDOMElement()
  })

  // A resposta é `text` no banco — medido: 0 de 3.476 do catálogo têm tag. Quem monta HTML cru aqui
  // abriria a porta que a descrição do produto paga um sanitizador inteiro para manter fechada.
  it('não existe dangerouslySetInnerHTML no componente', () => {
    expect(FONTE_RESPOSTA).not.toContain('dangerouslySetInnerHTML')
  })

  // SENSOR do removedor de comentário: sem ele a régua acima acusaria a própria prosa que explica a
  // regra — os dois arquivos citam o nome da coisa proibida de propósito.
  it('o removedor de comentário funciona, com LF e com CRLF', () => {
    const comLF = '// dangerouslySetInnerHTML não entra aqui\nexport const x = 1\n'
    const comCRLF = comLF.replace(/\n/g, '\r\n')
    expect(semComentarios(comLF)).not.toContain('dangerouslySetInnerHTML')
    expect(semComentarios(comCRLF)).not.toContain('dangerouslySetInnerHTML')
    // E não come o código ao redor.
    expect(semComentarios(comLF)).toContain('export const x = 1')
  })

  it('a régua ainda acusa o uso de verdade', () => {
    expect(semComentarios('const a = <div dangerouslySetInnerHTML={{ __html: x }} />')).toContain(
      'dangerouslySetInnerHTML',
    )
  })
})
