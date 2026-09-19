// Feature 55 — o aviso informativo compartilhado (`CFG-26`, `CFG-27`).

import { render, screen } from '@testing-library/react'
import { PackageOpen } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { InfoBanner } from '../InfoBanner'

describe('InfoBanner — a cor é o token semântico do painel (CFG-26)', () => {
  it('usa `estrelinha-admin-amber` no fundo, na borda e no texto', () => {
    // O token existe no preset, acompanha o modo escuro sozinho, e `adminTokens.test.ts` já prova
    // que este par (texto cheio sobre o próprio fundo de 10%) passa 4,5:1 nos dois temas.
    render(<InfoBanner data-testid="aviso">Um aviso</InfoBanner>)
    const caixa = screen.getByTestId('aviso')

    expect(caixa.className).toContain('bg-estrelinha-admin-amber/10')
    expect(caixa.className).toContain('border-estrelinha-admin-amber/20')
    expect(caixa.querySelector('.text-estrelinha-admin-amber')).not.toBeNull()
  })

  it('NÃO usa a paleta `amber` crua do Tailwind nem hex literal', () => {
    // É de onde o `EventCard` vinha: `amber-50`/`amber-300`/`amber-900` mais quatro classes `dark:`
    // mantidas à mão. Fora do sistema de tokens, `adminTokens.test.ts` não alcança — e o dark só
    // acompanha enquanto alguém lembrar.
    render(<InfoBanner data-testid="aviso">Um aviso</InfoBanner>)
    const html = screen.getByTestId('aviso').outerHTML

    expect(html).not.toMatch(/(?:^|["\s])(?:bg|text|border)-amber-\d/)
    expect(html).not.toMatch(/#[0-9a-fA-F]{6}/)
    expect(html).not.toContain('dark:')
  })
})

describe('InfoBanner — extração, não redesenho (CFG-27)', () => {
  it('mostra o texto e um ícone', () => {
    render(<InfoBanner data-testid="aviso" icon={PackageOpen}>Endereço do ateliê</InfoBanner>)

    expect(screen.getByText('Endereço do ateliê')).toBeInTheDocument()
    expect(screen.getByTestId('aviso').querySelector('svg')).not.toBeNull()
  })

  it('o ícone é decorativo — quem carrega o sentido é o texto', () => {
    render(<InfoBanner data-testid="aviso">Um aviso</InfoBanner>)
    expect(screen.getByTestId('aviso').querySelector('svg')).toHaveAttribute('aria-hidden')
  })

  it('tem ícone padrão quando o chamador não passa um', () => {
    render(<InfoBanner data-testid="aviso">Um aviso</InfoBanner>)
    expect(screen.getByTestId('aviso').querySelector('svg')).not.toBeNull()
  })

  it('o texto do corpo continua sendo UM nó — o link não parte a frase', () => {
    // É o que mantém válidas as asserções que já provam essas mensagens por
    // `getByText('a frase inteira')`. Um `<Link>` no meio do parágrafo as quebraria todas.
    render(
      <InfoBanner data-testid="aviso" action={<a href="/admin/configuracoes/frete-e-material">ir</a>}>
        O endereço do ateliê ainda não foi preenchido.
      </InfoBanner>,
    )

    expect(screen.getByText('O endereço do ateliê ainda não foi preenchido.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ir' })).toHaveAttribute(
      'href',
      '/admin/configuracoes/frete-e-material',
    )
  })

  it('sem `action`, nada de slot vazio', () => {
    render(<InfoBanner data-testid="aviso">Um aviso</InfoBanner>)
    expect(screen.getByTestId('aviso').querySelector('a')).toBeNull()
  })

  it('o `role` só existe quando o chamador pede', () => {
    // Um aviso que já está na tela quando ela abre não precisa ser anunciado; o que aparece depois
    // da carga, sim. Quem sabe a diferença é o chamador.
    const { rerender } = render(<InfoBanner data-testid="aviso">Um aviso</InfoBanner>)
    expect(screen.getByTestId('aviso')).not.toHaveAttribute('role')

    rerender(<InfoBanner data-testid="aviso" role="status">Um aviso</InfoBanner>)
    expect(screen.getByTestId('aviso')).toHaveAttribute('role', 'status')
  })
})
