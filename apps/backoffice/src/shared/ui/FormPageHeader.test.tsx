// Feature 18 / T3 — DSC-03.

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import FormPageHeader from './FormPageHeader'

const onBack = vi.fn()
const onSave = vi.fn()

const setup = (over: { isDirty?: boolean; saving?: boolean; bleed?: boolean; justSaved?: boolean } = {}) =>
  render(
    <FormPageHeader
      group="Descontos"
      parentLabel="Promoções"
      title="Kit de bottons"
      isDirty={over.isDirty ?? false}
      justSaved={over.justSaved ?? false}
      saving={over.saving ?? false}
      saveLabel="Salvar promoção"
      onBack={onBack}
      onSave={onSave}
      {...(over.bleed === undefined ? {} : { bleed: over.bleed })}
    />,
  )

/** O `<header>` renderizado — a barra fixa, que é onde a sangria mora. */
const barra = () => document.querySelector('header') as HTMLElement

beforeEach(() => {
  onBack.mockClear()
  onSave.mockClear()
})

/**
 * A sangria de 16px, e por que ela virou opcional.
 *
 * O `-mx-4` nasceu para uma PÁGINA, onde a barra fixa cobre de borda a borda o que rola por baixo
 * dela. Dentro de `coluna-secoes` de `/admin/home` — que declara `overflow-y-auto` e não tem padding
 * nenhum para a sangria cobrir — ela só estourava, e o CSS promovia o eixo x a `auto` junto: barra de
 * rolagem horizontal no formulário, medida em navegador (`clientWidth` 560 × `scrollWidth` 576).
 */
describe('FormPageHeader — a sangria é opcional', () => {
  /**
   * Um token exato da lista de classes.
   *
   * Por partição, não por regex: `'px-4'.includes('x-4')` é `true` e `-mx-4` contém `mx-4`, então
   * uma régua por substring diria "sangra" olhando para `px-40` sozinho. Partir por espaço não tem
   * essa borda — e não tem escape de metacaractere para errar, que é como a primeira escrita desta
   * régua nasceu quebrada.
   */
  const temToken = (el: HTMLElement, token: string) =>
    el.className.split(/\s+/).includes(token)

  it('por padrão SANGRA — é do que as duas telas de Descontos dependem', () => {
    setup()
    expect(temToken(barra(), '-mx-4')).toBe(true)
    expect(temToken(barra(), 'px-4')).toBe(true)
  })

  it('`bleed={false}` tira a sangria E o padding que a compensa — os dois, ou o texto desalinha', () => {
    // Tirar só o `-mx-4` deixaria 16px de padding de cada lado, e o título do formulário sairia
    // desalinhado dos cartões abaixo dele. É um par, não duas decisões.
    setup({ bleed: false })
    expect(temToken(barra(), '-mx-4')).toBe(false)
    expect(temToken(barra(), 'px-4')).toBe(false)
  })

  it('a barra continua fixa nos dois casos — a sangria não é o que a gruda no topo', () => {
    setup()
    expect(temToken(barra(), 'sticky')).toBe(true)
    expect(temToken(barra(), 'top-0')).toBe(true)
  })

  it('SENSOR: a régua é de token exato — `px-4` sozinho NÃO conta como sangria', () => {
    setup({ bleed: false })
    // Com `includes`, `-mx-4` casaria dentro de qualquer `mx-4` e `px-4` dentro de `px-40`.
    const falso = document.createElement('div')
    falso.className = 'px-40 mx-4'
    expect(temToken(falso, 'px-4')).toBe(false)
    expect(temToken(falso, '-mx-4')).toBe(false)
    expect(temToken(falso, 'mx-4')).toBe(true)
  })
})

describe('FormPageHeader', () => {
  it('mostra a trilha de três níveis, com a listagem como link de volta (AC 1-2)', () => {
    setup()

    const trilha = screen.getByRole('navigation', { name: 'Trilha' })
    expect(trilha).toHaveTextContent('Descontos')
    expect(trilha).toHaveTextContent('Promoções')
    expect(trilha).toHaveTextContent('Kit de bottons')

    fireEvent.click(screen.getByRole('button', { name: 'Promoções' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('o título é o nome do registro', () => {
    setup()

    expect(screen.getByRole('heading', { name: 'Kit de bottons' })).toBeInTheDocument()
  })

  it('o selo de pendência aparece só com alteração não salva (AC 3)', () => {
    setup({ isDirty: false })
    expect(screen.queryByText('Alterações não salvas')).not.toBeInTheDocument()

    setup({ isDirty: true })
    expect(screen.getByText('Alterações não salvas')).toBeInTheDocument()
  })

  it('oferece Cancelar e o primário com o atalho anunciado (AC 4)', () => {
    setup()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onBack).toHaveBeenCalledTimes(1)

    const salvar = screen.getByRole('button', { name: /Salvar promoção/ })
    expect(salvar).toHaveTextContent('⌘S')
    fireEvent.click(salvar)
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('`Ctrl+S` salva e impede o "salvar página" do navegador (AC 5)', () => {
    setup()

    // `fireEvent.keyDown` devolve `false` quando o handler chamou `preventDefault`.
    const notPrevented = fireEvent.keyDown(window, { key: 's', ctrlKey: true })

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(notPrevented).toBe(false)
  })

  it('`⌘S` (metaKey) faz o mesmo', () => {
    setup()

    fireEvent.keyDown(window, { key: 's', metaKey: true })

    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('`s` sem modificador não salva — é uma letra dentro de um campo de texto', () => {
    setup()

    fireEvent.keyDown(window, { key: 's' })

    expect(onSave).not.toHaveBeenCalled()
  })

  it('durante o save os dois botões ficam desabilitados, e o atalho não reentra (AC 6)', () => {
    setup({ saving: true })

    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Salvar promoção/ })).toBeDisabled()

    fireEvent.keyDown(window, { key: 's', ctrlKey: true })
    expect(onSave).not.toHaveBeenCalled()
  })
})

/**
 * Feature 50 — o `Salvo` (`VIV-05`, `VIV-06`, `ANI-01`, `ANI-02`, `ANI-05`).
 *
 * O cabeçalho ganhou um estado, não um comportamento: quem liga e desliga o `justSaved` é a tela
 * que salvou. O que se prova aqui é **onde cada estado mora** — pendência no selo, gravação no
 * botão —, a precedência entre eles, e a transição com o par `motion-reduce:`.
 */
describe('FormPageHeader — o `Salvo` (VIV-05, VIV-06)', () => {
  const selos = () =>
    Array.from(document.querySelectorAll('header .mt-1 > *')).map(el => el.textContent?.trim())

  it('`justSaved` mostra `Salvo`, e sem ele o cabeçalho é o de hoje', () => {
    const { unmount } = setup()
    expect(screen.queryByText('Salvo')).toBeNull()
    unmount()

    setup({ justSaved: true })
    expect(screen.getByText('Salvo')).toBeInTheDocument()
  })

  it('o `Salvo` mora no BOTÃO, e o selo ao lado do título é só da pendência', () => {
    // ⚠️ Asserção **virada** pela rodada de consertos da feature 50, não afrouxada. Ela dizia
    // `toEqual(['Kit de bottons', 'Salvo'])` — os dois selos na mesma vaga —, e defendia um mundo em
    // que `Salvo` aparecia no cabeçalho e o botão nunca. `ANI-01` pede o contrário: é **o botão de
    // salvar** que passa por `Salvando…` → `Salvo`. Manter os dois daria dois donos da mesma
    // palavra. O que `ANI-02` protege continua provado logo abaixo: o selo entra e sai sem mover o
    // título nem as ações.
    const { unmount } = setup({ isDirty: true })
    expect(selos()).toEqual(['Kit de bottons', 'Alterações não salvas'])
    unmount()

    setup({ justSaved: true })
    expect(selos()).toEqual(['Kit de bottons'])
    expect(screen.getByRole('button', { name: /Salvar promoção/ })).toHaveTextContent('Salvo')
  })

  it('ANI-02 — o selo entra e sai sem mover o título nem as ações', () => {
    // O título continua sendo o PRIMEIRO da fila nos dois estados (o selo só é acrescentado depois
    // dele), e o selo vive dentro da coluna `flex-1` — o grupo de ações é irmão dela, não filho.
    // Entrar ou sair ali não tem como empurrar `Cancelar` nem `Salvar`.
    const { unmount } = setup({ isDirty: false })
    expect(selos()).toEqual(['Kit de bottons'])
    unmount()

    setup({ isDirty: true })
    expect(selos()[0]).toBe('Kit de bottons')
    const selo = screen.getByText('Alterações não salvas')
    const acoes = screen.getByRole('button', { name: 'Cancelar' }).parentElement!
    expect(acoes.contains(selo)).toBe(false)
    expect(selo.closest('.flex-1')).not.toBeNull()
  })

  it('`isDirty` e `justSaved` juntos: vence a PENDÊNCIA — mexeu depois de salvar', () => {
    setup({ isDirty: true, justSaved: true })
    expect(screen.getByText('Alterações não salvas')).toBeInTheDocument()
    expect(screen.queryByText('Salvo')).toBeNull()
    // E o botão volta ao rótulo de repouso: dizer `Salvo` com pendência na tela seria o contrário
    // do que o cabeçalho acabou de anunciar.
    expect(screen.queryByTestId('botao-salvo')).toBeNull()
  })

  it('a transição existe E tem o par `motion-reduce:transition-none` (ANI-05, L-036)', () => {
    // Asserção sobre o LITERAL: a classe de movimento sem o par é exatamente o defeito que `ANI-05`
    // existe para impedir, e ela não se vê em nenhum comportamento de jsdom.
    setup({ justSaved: true })
    const classes = screen.getByTestId('botao-salvo').className.split(/\s+/)
    expect(classes).toContain('transition-opacity')
    expect(classes).toContain('motion-reduce:transition-none')
  })

  it('o selo de PENDÊNCIA ganhou o mesmo par — os dois se movem igual, ou nenhum', () => {
    setup({ isDirty: true })
    const classes = screen.getByText('Alterações não salvas').className.split(/\s+/)
    expect(classes).toContain('transition-opacity')
    expect(classes).toContain('motion-reduce:transition-none')
  })

  it('as duas telas de Descontos não mudam: sem o prop, nada de `Salvo` em lugar nenhum', () => {
    // O prop é opcional e o padrão é `false`. É o que faz `AdminCouponFormPage.test.tsx` e
    // `AdminPromotionFormPage.test.tsx` seguirem verdes sem uma linha de edição.
    setup({ isDirty: false })
    expect(document.querySelector('header')!.textContent).not.toContain('Salvo')
  })
})

/**
 * `ANI-01` — o botão de salvar passa por `Salvando…` → `Salvo`, **sem mover o vizinho**.
 *
 * A AC tem duas metades, e a segunda é a que não se vê: antes destes casos o `<Loader2>` **entrava
 * e saía** do botão a cada gravação — 16px mais `mr-2` aparecendo do nada —, e o `Cancelar` ao lado
 * dava um pulo a cada clique em salvar. Build, `tsc` e a suíte inteira passavam.
 *
 * ⚠️ **As asserções de largura são PROXY DE FORMA, e isso é limite do jsdom, não escolha.** Ele
 * devolve 0 para `getBoundingClientRect`, `offsetWidth` e qualquer medida de layout, então "a
 * largura não muda" não tem como ser medida aqui. O que se mede é a **causa**: nenhum nó entra ou
 * sai da fila do botão entre um estado e outro, e o rótulo que dá a medida continua ocupando a
 * célula. **A prova de verdade é navegador**, em 390×844 e 1440, e ela está na fila de pendências
 * desta feature.
 */
describe('FormPageHeader — o botão de salvar (ANI-01)', () => {
  it('os três estados: `Salvar promoção` → `Salvando…` → `Salvo`', () => {
    const salvar = () => screen.getByRole('button', { name: /Salvar promoção/ })

    const repouso = setup()
    expect(salvar()).toHaveTextContent('Salvar promoção')
    expect(screen.queryByText('Salvando…')).toBeNull()
    expect(screen.queryByText('Salvo')).toBeNull()
    repouso.unmount()

    const gravando = setup({ saving: true })
    expect(screen.getByTestId('botao-salvando')).toHaveTextContent('Salvando…')
    gravando.unmount()

    setup({ justSaved: true })
    expect(screen.getByTestId('botao-salvo')).toHaveTextContent('Salvo')
  })

  it('a vaga do GIRO existe nos dois estados — o `<Loader2>` não entra e sai da fila', () => {
    // Era assim que o botão mudava de largura: `{saving && <Loader2 className="mr-2 h-4 w-4" />}`.
    // Agora a vaga é sempre a mesma caixa, e o que muda é o conteúdo DELA.
    const parado = setup()
    const vagaParada = screen.getByTestId('vaga-do-giro')
    expect(vagaParada.className.split(/\s+/)).toEqual(
      expect.arrayContaining(['mr-2', 'h-4', 'w-4', 'shrink-0']),
    )
    expect(vagaParada.querySelector('svg')).toBeNull()
    const classesParada = vagaParada.className
    parado.unmount()

    setup({ saving: true })
    const vagaGirando = screen.getByTestId('vaga-do-giro')
    // **A mesma lista de classes**, literalmente: a vaga não pode ganhar nem perder medida.
    expect(vagaGirando.className).toBe(classesParada)
    expect(vagaGirando.querySelector('svg')).not.toBeNull()
  })

  it('o rótulo de repouso continua no DOM nos três estados — é ele que dá a medida', () => {
    // Token exato, e a mesma célula de grade nos dois: `col-start-1 row-start-1` empilha o estado
    // sobre o rótulo, então a largura da vaga é o MAIOR dos dois, nunca a soma e nunca a troca.
    const celula = (el: HTMLElement) => {
      const classes = el.className.split(/\s+/)
      return classes.includes('col-start-1') && classes.includes('row-start-1')
    }

    const repouso = setup()
    expect(screen.getByTestId('rotulo-de-repouso')).toHaveTextContent('Salvar promoção')
    expect(celula(screen.getByTestId('rotulo-de-repouso'))).toBe(true)
    repouso.unmount()

    const gravando = setup({ saving: true })
    expect(screen.getByTestId('rotulo-de-repouso')).toHaveTextContent('Salvar promoção')
    expect(celula(screen.getByTestId('botao-salvando'))).toBe(true)
    // E ele fica INVISÍVEL, não removido: `hidden` tiraria a medida junto.
    expect(screen.getByTestId('rotulo-de-repouso').className.split(/\s+/)).toContain('invisible')
    expect(screen.getByTestId('rotulo-de-repouso').className.split(/\s+/)).not.toContain('hidden')
    gravando.unmount()

    setup({ justSaved: true })
    expect(screen.getByTestId('rotulo-de-repouso')).toHaveTextContent('Salvar promoção')
    expect(celula(screen.getByTestId('botao-salvo'))).toBe(true)
  })

  it('o vizinho `Cancelar` continua no mesmo lugar da fila de ações, nos três estados', () => {
    // `ANI-06`: o que a AC proíbe é o clique cair noutro lugar. Quem estava à esquerda do botão
    // continua à esquerda, e no mesmo índice do mesmo contêiner.
    const posicaoDoCancelar = () => {
      const acoes = screen.getByRole('button', { name: 'Cancelar' }).parentElement!
      return Array.from(acoes.children).indexOf(screen.getByRole('button', { name: 'Cancelar' }))
    }

    const repouso = setup()
    expect(posicaoDoCancelar()).toBe(0)
    repouso.unmount()

    const gravando = setup({ saving: true })
    expect(posicaoDoCancelar()).toBe(0)
    gravando.unmount()

    setup({ justSaved: true })
    expect(posicaoDoCancelar()).toBe(0)
  })

  it('a transição do `Salvando…` também vem com o par `motion-reduce:` (ANI-05)', () => {
    setup({ saving: true })
    const classes = screen.getByTestId('botao-salvando').className.split(/\s+/)
    expect(classes).toContain('transition-opacity')
    expect(classes).toContain('motion-reduce:transition-none')
  })
})
