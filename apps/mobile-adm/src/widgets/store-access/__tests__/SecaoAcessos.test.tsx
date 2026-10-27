// Feature `83` · T07 — `LAV-50`..`LAV-55`, `LAV-63`, `LAV-67`: a seção Acessos.
//
// A seção recebe a leitura por prop e nunca chama RPC; "trocar de período não lê" é provado pelo
// `<App />` real na T08 (aqui seria verdade por construção). As fixturas (`test/movimento.ts`) fazem
// os campos candidatos divergirem (`L-013`), e cada texto é conferido INTEIRO (`L-009`).
process.env.TZ = 'UTC'

import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { MovementPeriodKey, StoreMovement } from '@estrelinha/core/stats'
import { FALHA_DE_LEITURA, TENTAR_DE_NOVO, type Leitura } from '@/shared/ui/leitura'
import { acessos, movimento, movimentoComAcessos } from '@/test/movimento'
import SecaoAcessos from '../ui/SecaoAcessos'

const comDado = (m: StoreMovement): Leitura<StoreMovement> => ({ dado: m, falhou: false, tentarDeNovo: vi.fn() })

const montar = (leitura: Leitura<StoreMovement>, periodoInicial: MovementPeriodKey = 'hoje') =>
  render(<SecaoAcessos leitura={leitura} periodoInicial={periodoInicial} />)

const secao = () => screen.getByRole('region', { name: 'Acessos' })
const botao = (rotulo: string) => screen.getByRole('button', { name: rotulo })
const escolher = (rotulo: string) => fireEvent.click(botao(rotulo))
/** Token exato (`L-034`): `toContain` casaria `text-estrelinha-ink` dentro de `text-estrelinha-ink-soft`. */
const temClasse = (el: Element, token: string) => el.className.split(/\s+/).includes(token)
const colunas = () => within(screen.getByTestId('grafico')).getAllByTestId('coluna')
const pulsando = (el: Element) => el.querySelectorAll('.animate-pulse').length

describe('o seletor (LAV-50)', () => {
  it('h2 "Acessos" e os três períodos, na ordem do dono', () => {
    montar(comDado(movimentoComAcessos()))
    expect(within(secao()).getByRole('heading', { level: 2 }).textContent).toBe('Acessos')
    const botoes = within(secao()).getAllByRole('button')
    expect(botoes.map((b) => b.textContent)).toEqual(['Hoje', 'Ontem', 'Semana'])
  })

  it('o período inicial vem da prop (Ontem pressionado), e trocar pressiona o tocado', () => {
    montar(comDado(movimentoComAcessos()), 'ontem')
    expect(botao('Ontem').getAttribute('aria-pressed')).toBe('true')
    expect(botao('Hoje').getAttribute('aria-pressed')).toBe('false')
    escolher('Semana')
    expect(botao('Semana').getAttribute('aria-pressed')).toBe('true')
    expect(botao('Ontem').getAttribute('aria-pressed')).toBe('false')
  })

  it('cada botão tem o alvo de 44 px (token `min-h-11`), e o ligado é `surface` + `ink`', () => {
    montar(comDado(movimentoComAcessos()))
    for (const b of ['Hoje', 'Ontem', 'Semana']) expect(temClasse(botao(b), 'min-h-11')).toBe(true)
    expect(temClasse(botao('Hoje'), 'bg-estrelinha-surface')).toBe(true)
    expect(temClasse(botao('Hoje'), 'text-estrelinha-ink')).toBe(true)
    expect(temClasse(botao('Ontem'), 'text-estrelinha-ink-soft')).toBe(true)
    expect(temClasse(botao('Ontem'), 'bg-estrelinha-surface')).toBe(false)
  })
})

describe('os três cartões (LAV-51)', () => {
  const grupo = (nome: string) => screen.getByRole('group', { name: nome })
  const variacao = (nome: string) => within(grupo(nome)).queryByTestId('variacao')

  it('Hoje: o total no número grande, e a variação de horas completas (`base_hoje` × ontem até as 11h)', () => {
    montar(comDado(movimentoComAcessos()))
    expect(variacao('Visitas, hoje, 41')?.textContent).toBe('+200% vs ontem até as 11h')
    expect(variacao('Vendas, hoje, 3')?.textContent).toBe('+100% vs ontem até as 11h')
    expect(variacao('Conversão, hoje, 7,3%')?.textContent).toBe('−33% vs ontem até as 11h')
    expect(temClasse(variacao('Visitas, hoje, 41')!, 'text-estrelinha-done')).toBe(true)
    expect(temClasse(variacao('Conversão, hoje, 7,3%')!, 'text-estrelinha-ink-soft')).toBe(true)
    expect(temClasse(variacao('Conversão, hoje, 7,3%')!, 'text-estrelinha-done')).toBe(false)
  })

  it('Ontem: contra anteontem; vendas e conversão sem base (anteontem com 0 vendas) ficam sem linha', () => {
    montar(comDado(movimentoComAcessos()), 'ontem')
    expect(variacao('Visitas, ontem, 12')?.textContent).toBe('+50% vs anteontem')
    expect(variacao('Vendas, ontem, 0')).toBeNull()
    expect(variacao('Conversão, ontem, 0,0%')).toBeNull()
  })

  it('Semana: os três números, nenhuma linha de variação', () => {
    montar(comDado(movimentoComAcessos()), 'semana')
    for (const nome of ['Visitas, esta semana, 230', 'Vendas, esta semana, 9', 'Conversão, esta semana, 3,9%']) {
      expect(variacao(nome)).toBeNull()
    }
  })

  it('o número escrito em pt-BR e a Conversão "—" com visitas zero', () => {
    const m = movimentoComAcessos({
      periodos: {
        hoje: { visitas: 0, vendas: 2, faturamento: 10, ticket: 5 },
        ontem: { visitas: 12, vendas: 0, faturamento: 0, ticket: null },
        semana: { visitas: 12345, vendas: 9, faturamento: 1, ticket: 1 },
      },
    })
    montar(comDado(m))
    expect(grupo('Conversão, hoje, —')).toBeTruthy()
    expect(variacao('Conversão, hoje, —')).toBeNull()
    escolher('Semana')
    expect(grupo('Visitas, esta semana, 12.345')).toBeTruthy()
  })

  it('exatamente três cartões, nesta ordem, e nenhum "Com sacola"', () => {
    montar(comDado(movimentoComAcessos()))
    const cartoes = within(screen.getByTestId('cartoes-dos-acessos')).getAllByRole('group')
    expect(cartoes.map((c) => c.getAttribute('aria-label'))).toEqual(['Visitas, hoje, 41', 'Vendas, hoje, 3', 'Conversão, hoje, 7,3%'])
    expect(secao().textContent).not.toMatch(/sacola/i)
  })

  it('a grade: `auto-fit` com piso em rem e a Conversão em largura inteira (tokens exatos, LAV-63)', () => {
    montar(comDado(movimentoComAcessos()))
    const grade = screen.getByTestId('cartoes-dos-acessos')
    expect(temClasse(grade, 'grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))]')).toBe(true)
    expect(temClasse(grade, '[&>*:last-child]:col-span-full')).toBe(true)
    expect(temClasse(grade, 'grid-cols-2')).toBe(false)
  })

  it('cada número em display 22/700 `primary`', () => {
    montar(comDado(movimentoComAcessos()))
    const numero = within(grupo('Visitas, hoje, 41')).getByText('41')
    for (const t of ['font-display', 'text-[22px]', 'font-bold', 'text-estrelinha-primary']) expect(temClasse(numero, t)).toBe(true)
  })
})

describe('o gráfico (LAV-52)', () => {
  const alturas = () => colunas().map((c) => (within(c).getByTestId('barra') as HTMLElement).style.height)
  const valores = () => colunas().map((c) => within(c).getByTestId('valor').textContent)
  const rotulos = () => colunas().map((c) => within(c).getByTestId('rotulo').textContent)

  it('Hoje: "Visitas por horário", 8 faixas, a atual (9h) em `accent` com rótulo `ink`, as futuras sem número em `line` de 4 px', () => {
    montar(comDado(movimentoComAcessos()))
    expect(within(screen.getByTestId('grafico')).getByRole('heading', { level: 3 }).textContent).toBe('Visitas por horário')
    expect(rotulos()).toEqual(['0h', '3h', '6h', '9h', '12h', '15h', '18h', '21h'])
    expect(valores()).toEqual(['5', '0', '12', '24', '', '', '', ''])
    expect(alturas()).toEqual(['18px', '4px', '42px', '84px', '4px', '4px', '4px', '4px'])
    const barras = colunas().map((c) => within(c).getByTestId('barra'))
    expect(temClasse(barras[3], 'bg-estrelinha-accent')).toBe(true)
    expect(temClasse(within(colunas()[3]).getByTestId('rotulo'), 'text-estrelinha-ink')).toBe(true)
    for (const i of [0, 1, 2]) {
      expect(temClasse(barras[i], 'bg-estrelinha-primary')).toBe(true)
      expect(temClasse(within(colunas()[i]).getByTestId('rotulo'), 'text-estrelinha-ink-soft')).toBe(true)
    }
    for (const i of [4, 5, 6, 7]) expect(temClasse(barras[i], 'bg-estrelinha-line')).toBe(true)
    expect(barras.filter((b) => temClasse(b, 'bg-estrelinha-accent'))).toHaveLength(1)
  })

  it('Hoje: a faixa `null` ANTES da atual (antes da contagem) é trilho sem número, nunca "0"', () => {
    montar(comDado(movimentoComAcessos({ acessos: acessos({ hoje: { por_faixa: [null, 0, 12, 24, null, null, null, null], sem_hora: 0 } }) })))
    const primeira = colunas()[0]
    expect(primeira.getAttribute('data-destaque')).toBe('sem_contagem')
    expect(within(primeira).getByTestId('valor').textContent).toBe('')
    expect(primeira.getAttribute('aria-label')).toBe('0h: antes da contagem')
    expect(temClasse(within(primeira).getByTestId('barra'), 'bg-estrelinha-line')).toBe(true)
    expect((within(primeira).getByTestId('barra') as HTMLElement).style.height).toBe('4px')
    expect(colunas()[4].getAttribute('aria-label')).toBe('12h: ainda não chegou')
  })

  it('Ontem: as 8 em `primary`, nenhuma dourada, nenhuma sem número', () => {
    montar(comDado(movimentoComAcessos()), 'ontem')
    expect(valores()).toEqual(['1', '0', '2', '3', '4', '1', '1', '0'])
    expect(alturas()).toEqual(['21px', '4px', '42px', '63px', '84px', '21px', '21px', '4px'])
    const barras = colunas().map((c) => within(c).getByTestId('barra'))
    expect(barras.every((b) => temClasse(b, 'bg-estrelinha-primary'))).toBe(true)
    expect(screen.getByTestId('grafico').querySelectorAll('.bg-estrelinha-accent')).toHaveLength(0)
    expect(colunas().every((c) => c.getAttribute('data-destaque') === 'passada')).toBe(true)
  })

  it('Semana: "Visitas por dia", um dia por coluna até hoje, o último "hoje" em `accent`', () => {
    montar(comDado(movimentoComAcessos()), 'semana')
    expect(within(screen.getByTestId('grafico')).getByRole('heading', { level: 3 }).textContent).toBe('Visitas por dia')
    expect(rotulos()).toEqual(['seg', 'ter', 'qua', 'hoje'])
    expect(valores()).toEqual(['190', '0', '12', '41'])
    const ultima = within(colunas()[3]).getByTestId('barra')
    expect(temClasse(ultima, 'bg-estrelinha-accent')).toBe(true)
    expect(temClasse(within(colunas()[3]).getByTestId('rotulo'), 'text-estrelinha-ink')).toBe(true)
    expect(colunas()[3].getAttribute('aria-label')).toBe('hoje: 41 visitas')
  })

  it('todos os valores zero ⇒ toda barra com 4 px e o valor "0"', () => {
    montar(comDado(movimentoComAcessos({ acessos: acessos({ ontem: { por_faixa: [0, 0, 0, 0, 0, 0, 0, 0], sem_hora: 0 } }) })), 'ontem')
    expect(alturas()).toEqual(Array(8).fill('4px'))
    expect(valores()).toEqual(Array(8).fill('0'))
  })

  it('com a fonte grande o gráfico rola DENTRO do cartão: `overflow-x-auto` e piso de coluna em rem (tokens exatos)', () => {
    montar(comDado(movimentoComAcessos()))
    expect(temClasse(screen.getByTestId('colunas'), 'overflow-x-auto')).toBe(true)
    for (const c of colunas()) expect(temClasse(c, 'min-w-[1.875rem]')).toBe(true)
  })

  // Achado do gate adversarial do Lote 2: com piso de 2.75rem (44 px) as 8 faixas somavam
  // 8×44 + 7×6 = 394 px, e o cartão tem 324 px úteis em 390 — a faixa 21h (onde o dourado aparece à
  // noite) ficava atrás da rolagem com a fonte NORMAL. jsdom não mede layout, então a régua é a conta
  // com as classes do próprio fonte: piso e vão lidos do DOM, a 16 px por rem (fonte a 100 %).
  // Largura útil no menor celular medido (360): 360 − 32 (`px-4` do `<main>`) − 2 (borda) − 32 (`p-4`).
  it('com a fonte normal as 8 faixas cabem no cartão de 360 px, sem rolagem (LAV-52)', () => {
    montar(comDado(movimentoComAcessos()))
    const util360 = 360 - 32 - 2 - 32
    const lista = screen.getByTestId('colunas')
    expect(temClasse(lista, 'gap-1.5')).toBe(true)
    const vao = 6
    const cols = colunas()
    expect(cols).toHaveLength(8)
    const pisos = cols.map((c) => {
      const m = c.className.match(/(?:^|\s)min-w-\[([\d.]+)rem\](?=\s|$)/)
      expect(m).not.toBeNull()
      return Number(m![1]) * 16
    })
    const total = pisos.reduce((a, b) => a + b, 0) + vao * (cols.length - 1)
    expect(total).toBeLessThanOrEqual(util360)
  })

  it('nenhuma transição nem animação no gráfico (LAV-64)', () => {
    montar(comDado(movimentoComAcessos()))
    const tudo = [screen.getByTestId('grafico'), ...screen.getByTestId('grafico').querySelectorAll('*')]
    expect(tudo.filter((el) => /(^|\s)(transition|animate)-?/.test(el.getAttribute('class') ?? ''))).toEqual([])
  })
})

describe('as notas (LAV-53, LAV-54, LAV-67)', () => {
  const NOTA_FAIXA = 'Faixas de 3 horas, pela hora da primeira visita.'
  const NOTA_SEMANA = 'Desde segunda-feira.'
  const CONSENTIMENTO = 'Conta só quem aceitou cookies de estatística.'
  const tem = (t: string) => within(secao()).queryByText(t, { exact: true }) !== null

  it('a nota das faixas em Hoje e Ontem, a da semana só em Semana', () => {
    montar(comDado(movimentoComAcessos()))
    expect([tem(NOTA_FAIXA), tem(NOTA_SEMANA)]).toEqual([true, false])
    escolher('Ontem')
    expect([tem(NOTA_FAIXA), tem(NOTA_SEMANA)]).toEqual([true, false])
    escolher('Semana')
    expect([tem(NOTA_FAIXA), tem(NOTA_SEMANA)]).toEqual([false, true])
  })

  it('visitas sem hora: a nota no dia que as tem (plural e singular), ausente nos outros', () => {
    const SEM_HORA = '2 visitas deste dia foram contadas antes da contagem por horário.'
    montar(
      comDado(
        movimentoComAcessos({
          acessos: acessos({
            hoje: { por_faixa: [5, 0, 12, 22, null, null, null, null], sem_hora: 2 },
            ontem: { por_faixa: [1, 0, 2, 3, 4, 1, 0, 0], sem_hora: 1 },
          }),
        }),
      ),
    )
    expect(tem(SEM_HORA)).toBe(true)
    escolher('Ontem')
    expect(tem(SEM_HORA)).toBe(false)
    expect(tem('1 visita deste dia foi contada antes da contagem por horário.')).toBe(true)
    escolher('Semana')
    expect(tem('1 visita deste dia foi contada antes da contagem por horário.')).toBe(false)
    expect(tem(SEM_HORA)).toBe(false)
  })

  it('"Contando desde" nos períodos que começam antes da contagem; o teto nos que contêm o dia', () => {
    const CONTANDO = 'Contando desde 21/10 às 12h00'
    const TETO = 'Em 22/10 o limite de 5.000 visitas por dia foi atingido, e a contagem desse dia parou ali.'
    montar(
      comDado(
        movimentoComAcessos({ contagem_desde: '2026-10-21T15:00:00Z', contagem_desde_dia: '2026-10-21', teto_dia: '2026-10-22' }),
      ),
    )
    expect([tem(CONTANDO), tem(TETO)]).toEqual([false, true])
    escolher('Ontem')
    expect([tem(CONTANDO), tem(TETO)]).toEqual([true, false])
    escolher('Semana')
    expect([tem(CONTANDO), tem(TETO)]).toEqual([true, true])
  })

  it('o contador parado: a frase com `contagem_desde` nulo, ausente com a contagem em curso', () => {
    const PARADO = 'Nenhuma visita registrada ainda. O contador só conta na loja em umaestrelinha.com.br.'
    const { unmount } = montar(comDado(movimentoComAcessos({ contagem_desde: null, contagem_desde_dia: null })))
    expect(tem(PARADO)).toBe(true)
    unmount()
    montar(comDado(movimentoComAcessos({ contagem_desde: '2026-10-10T12:00:00Z', contagem_desde_dia: '2026-10-10' })))
    expect(tem(PARADO)).toBe(false)
  })

  it('a seção TERMINA com a nota de consentimento, em 12 px `ink-soft`', () => {
    montar(comDado(movimentoComAcessos()))
    const ultimo = secao().lastElementChild!
    expect(ultimo.textContent).toBe(CONSENTIMENTO)
    expect(temClasse(ultimo, 'text-xs')).toBe(true)
    expect(temClasse(ultimo, 'text-estrelinha-ink-soft')).toBe(true)
  })
})

describe('os estados, exclusivos (LAV-55, L-063)', () => {
  it('carregando: `aria-busy`, traços, seletor travado — e nenhum número, nenhuma falha, nenhum consentimento', () => {
    montar({ dado: undefined, falhou: false, tentarDeNovo: vi.fn() })
    expect(secao().getAttribute('aria-busy')).toBe('true')
    expect(pulsando(secao())).toBeGreaterThanOrEqual(4)
    for (const b of ['Hoje', 'Ontem', 'Semana']) expect((botao(b) as HTMLButtonElement).disabled).toBe(true)
    expect(secao().textContent).not.toMatch(/\d/)
    expect(within(secao()).queryByText(FALHA_DE_LEITURA)).toBeNull()
    expect(within(secao()).queryByText(TENTAR_DE_NOVO)).toBeNull()
    expect(within(secao()).queryByText('Conta só quem aceitou cookies de estatística.')).toBeNull()
  })

  it('falha sem dado: a frase e "Tentar de novo" (relê) — sem `aria-busy`, sem traço, sem número', () => {
    const tentarDeNovo = vi.fn()
    montar({ dado: undefined, falhou: true, tentarDeNovo })
    expect(within(secao()).getByText(FALHA_DE_LEITURA)).toBeTruthy()
    fireEvent.click(within(secao()).getByRole('button', { name: TENTAR_DE_NOVO }))
    expect(tentarDeNovo).toHaveBeenCalledTimes(1)
    expect(secao().hasAttribute('aria-busy')).toBe(false)
    expect(pulsando(secao())).toBe(0)
    expect(secao().textContent).not.toMatch(/\d/)
    expect(screen.queryByTestId('grafico')).toBeNull()
  })

  it('com dado: os números, sem `aria-busy`, sem traço, sem a frase de falha', () => {
    montar(comDado(movimentoComAcessos()))
    expect(screen.getByRole('group', { name: 'Visitas, hoje, 41' })).toBeTruthy()
    expect(secao().hasAttribute('aria-busy')).toBe(false)
    expect(pulsando(secao())).toBe(0)
    expect(within(secao()).queryByText(FALHA_DE_LEITURA)).toBeNull()
    for (const b of ['Hoje', 'Ontem', 'Semana']) expect((botao(b) as HTMLButtonElement).disabled).toBe(false)
  })

  it('com dado e a releitura falhada (`falhou` com dado): os números continuam, sem a frase de falha', () => {
    montar({ dado: movimentoComAcessos(), falhou: false, tentarDeNovo: vi.fn() })
    expect(screen.getByRole('group', { name: 'Vendas, hoje, 3' })).toBeTruthy()
    expect(within(secao()).queryByText(FALHA_DE_LEITURA)).toBeNull()
  })

  it('sem a chave `acessos` (banco antigo): os números sem variação e a frase estática do gráfico, SEM botão', () => {
    montar(comDado(movimento()))
    expect(screen.getByRole('group', { name: 'Visitas, hoje, 41' })).toBeTruthy()
    expect(screen.queryAllByTestId('variacao')).toHaveLength(0)
    const grafico = screen.getByTestId('grafico')
    expect(grafico.textContent).toBe('O gráfico por horário ainda não está disponível.')
    expect(within(grafico).queryAllByRole('button')).toHaveLength(0)
    expect(within(secao()).queryByText(FALHA_DE_LEITURA)).toBeNull()
    expect(within(secao()).queryByText(TENTAR_DE_NOVO)).toBeNull()
  })
})
