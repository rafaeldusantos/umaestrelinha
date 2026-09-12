import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { JEWELRY_CARE_PATH } from '@estrelinha/core/routes'
import JewelryCarePage from '../JewelryCarePage'

/**
 * Cuidados com sua joia afetiva — texto copiado do site em produção em 2026-09-12.
 *
 * **Uma asserção por seção, com o título inteiro** (`L-009`), mesma régua das outras duas páginas de
 * documento: asserir fragmento deixa a copy da dona divergir do texto real sem quebrar teste.
 */

const montar = () =>
  render(
    <MemoryRouter initialEntries={[JEWELRY_CARE_PATH]}>
      <JewelryCarePage />
    </MemoryRouter>,
  )

describe('JewelryCarePage — o endereço', () => {
  it('a canônica é `/cuidados-com-sua-joia-afetiva`, o slug do site em produção', () => {
    // Escrito à mão, e não derivado da constante: a régua não pode ser o objeto medido.
    expect(JEWELRY_CARE_PATH).toBe('/cuidados-com-sua-joia-afetiva')
  })
})

describe('JewelryCarePage — as quatro seções, na ordem do texto original', () => {
  const TITULOS = [
    'Cuidados gerais com a joia',
    'Sua joia de resina bonita por mais tempo',
    'Se sua joia contém peças de Prata 925',
    'Se sua joia contém peças banhadas a ouro ou prata',
  ]

  it('o título da página é o `<h1>`', () => {
    montar()

    expect(
      screen.getByRole('heading', { level: 1, name: 'Cuidados com sua joia afetiva' }),
    ).toBeInTheDocument()
  })

  it.each(TITULOS.map((t) => [t]))('tem a seção "%s"', (titulo) => {
    montar()

    expect(screen.getByRole('heading', { level: 2, name: titulo })).toBeInTheDocument()
  })

  it('as seções saem NA ORDEM do texto original', () => {
    montar()

    const ordem = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent?.trim())
    expect(ordem).toEqual(TITULOS)
  })
})

describe('JewelryCarePage — os cuidados gerais', () => {
  it('lista as seis orientações da ficha', () => {
    montar()

    for (const item of [
      'Evite dormir com ela.',
      'Evite molhar tomando banho de chuveiro, mar ou piscina.',
      'Não pratique exercícios físicos usando a joia.',
      'Tenha sempre o maior carinho do mundo para manusear sua joia.',
    ]) {
      expect(screen.getByText(item)).toBeInTheDocument()
    }
  })
})

describe('JewelryCarePage — Prata 925 e peças banhadas', () => {
  it('explica a oxidação como processo natural, não como defeito', () => {
    montar()

    expect(
      screen.getByText(/A oxidação é o processo de escurecimento da joia/),
    ).toBeInTheDocument()
    expect(screen.getByText('natural', { selector: 'strong' })).toBeInTheDocument()
  })

  it('cita os milésimos de banho das peças folheadas', () => {
    montar()

    expect(
      screen.getByText(/possuem um banho de 8 milésimos/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/possuem 40 milésimos de banho/),
    ).toBeInTheDocument()
  })
})

describe('JewelryCarePage — o tom', () => {
  it('não tem emoji nenhum', () => {
    montar()

    const texto = document.body.textContent ?? ''
    expect(texto).not.toMatch(/🎉|🥳|✨|💜|💖|😢|👋/)
  })

  it('não usa vocabulário da loja anterior nem urgência fabricada', () => {
    montar()

    const texto = document.body.textContent ?? ''
    expect(texto).not.toMatch(/botton|\bpin\b|\bpins\b|alfinete/i)
    // `\bcorra\b`, e não `corra` solto: o texto legítimo tem "para que o desgaste natural ocorra de
    // uma forma mais lenta" — sem fronteira de palavra, a régua acusaria "ocorra" como urgência.
    expect(texto).not.toMatch(/últimas unidades|\bcorra\b|aproveite agora/i)
  })

  it('não repete a grafia antiga "jóia" — só "joia", como no resto da loja', () => {
    montar()

    const texto = document.body.textContent ?? ''
    expect(texto).not.toMatch(/jóia/i)
  })
})
