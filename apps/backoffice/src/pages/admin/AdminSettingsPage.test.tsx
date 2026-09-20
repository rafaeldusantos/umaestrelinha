// `/admin/configuracoes` — as quatro seções, e o que cada uma continua gravando.
//
// ## O que mudou na feature 55, e o que NÃO mudou
//
// A tela era oito abas horizontais; virou quatro seções com endereço próprio. Todos os casos de
// comportamento deste arquivo **sobreviveram inteiros** — `MAT-01` (o endereço do ateliê grava os
// nove campos), `FRG-02` (o interruptor do frete grátis), `FRG-12` (ligado sem faixa é recusado
// antes de escrever) e `FIX-03` (o carrinho não promete envio que não existe). O que mudou foi o
// **helper de navegação**: em vez de clicar numa aba do Radix, a tela é renderizada na rota da
// seção.
//
// Dois casos foram **invertidos** em vez de apagados — os que asseriam o remendo de CSS do
// `TabsList` (`sm:grid-cols-8` e `h-auto`). Eles provavam que a oitava aba cabia; a feature existe
// para que a contagem saia do CSS. Apagá-los deixaria sem rastro a razão pela qual a tela mudou.
//
// ## Feature 22 / T4 — o registro original deste arquivo
//
// O endereço do ateliê é CONFIGURAÇÃO, e o save manda a chave `material` com os nove campos. Mudar
// de endereço é operação da dona; com o endereço em `.tsx` seria deploy.

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_MATERIAL } from '@estrelinha/supabase/types/settings'

// `vi.hoisted` roda ANTES dos imports do módulo, então o corpo dele não pode ler `DEFAULT_MATERIAL`
// (`Cannot access '__vi_import__' before initialization`). Os nove campos vazios ficam escritos aqui,
// e o teste `os nove campos` abaixo é quem prova que a lista não divergiu do tipo.
//
// ⚠️ **`state.data` é UMA referência, reconstruída só no `beforeEach`.** Cada seção tem um
// `useEffect(..., [data])` que copia as configurações para o estado local; um dublê que devolvesse
// objeto literal novo a cada render trocaria a identidade de `data` toda vez, o efeito rodaria de
// novo, e a seção entraria em **laço infinito de render** — o teste trava sem mensagem nenhuma. Não
// é hipótese: foi o que aconteceu na primeira versão deste arquivo.
const state = vi.hoisted(() => {
  const vazio = () => ({
    recipient: '', street: '', number: '', complement: '', neighborhood: '',
    city: '', state: '', zip: '', notes: '',
  })
  const montar = (material: ReturnType<typeof vazio>) => ({
    general: {
      store_name: 'Uma Estrelinha', whatsapp: '', whatsapp_message: '',
      email: '', instagram: '', tiktok: '',
    },
    shipping: {
      free_shipping_enabled: true, free_shipping_threshold: 150,
      default_shipping_cost: 9.9, origin_zip: '', handling_days: 2,
    },
    payment: {
      pix_enabled: true, pix_discount_percent: 5, card_enabled: true,
      max_installments: 6, min_installment_value: 10,
    },
    seo: { title: '', description: '', og_image: '' },
    abandoned_cart: {
      threshold_hours: 4, auto_email_enabled: false, auto_email_hours: 24,
      reminder_coupon_code: '',
    },
    checkout: {
      order_bump_enabled: false, order_bump_product_id: null, order_bump_discount_percent: 50,
    },
    material,
  })
  return { vazio, montar, data: montar(vazio()), loading: false }
})

const mutateAsync = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useStoreSettings: () => ({ isLoading: state.loading, data: state.loading ? undefined : state.data }),
  useUpdateSettings: () => ({ mutateAsync, isPending: false }),
}))

// ⚠️ **O dublê é do CAMINHO DO ARQUIVO, e não do barrel.** Até a feature 55 este arquivo dublava
// `@/features/settings` inteiro, porque a única coisa que ele precisava de lá era o
// `CheckoutSettingsCard`. Agora **as três seções de formulário** moram naquele slice, e dublar o
// módulo inteiro apagaria justamente o que este arquivo existe para provar.
//
// Dublar o barrel também não bastaria: `SalesSection` importa
// `./CheckoutSettingsCard` diretamente (um slice não importa o próprio barrel, sob pena de ciclo),
// então dublar `@/features/settings` deixaria o card REAL entrar na árvore — e ele carrega o pool de
// produtos, que precisa de `QueryClientProvider`. O erro sai como `No QueryClient set` no render, e
// se lê como defeito do componente errado.
vi.mock('@/features/settings/ui/CheckoutSettingsCard', () => ({
  default: () => <div data-testid="checkout-card-stub" />,
  CheckoutSettingsCard: () => <div data-testid="checkout-card-stub" />,
  DISCOUNT_RANGE_MESSAGE: 'O desconto precisa ficar entre 1% e 99%.',
}))

// `NotificationsTab` (feature 53) é autocontida — ela tem o PRÓPRIO `useNotificationsDraft()`, que
// chama `useNotificationSettings`/`useMaterialSettings`, exports que o mock de
// `@estrelinha/core/hooks/useStoreSettings` acima NÃO declara. Dublar aqui mantém este arquivo
// testando só a FIAÇÃO (a seção existe e monta o componente) — o comportamento interno já está
// provado em `NotificationsTab.test.tsx`.
vi.mock('@/features/notification-settings', () => ({
  NotificationsTab: () => <div data-testid="notifications-tab-stub">stub</div>,
}))

const toast = vi.hoisted(() => vi.fn())
vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ useToast: () => ({ toast }) }))

import AdminSettingsPage from './AdminSettingsPage'
import { ToggleField } from '@/shared/ui'
import {
  SETTINGS_ROOT,
  SETTINGS_SECTIONS,
  settingsSectionPath,
  type SettingsSectionSlug,
} from '@/shared/lib/settingsSections'

/**
 * Renderiza a tela **numa rota**, que é como ela decide o que mostrar desde a feature 55.
 *
 * As duas rotas saem de `SETTINGS_ROOT` em vez de escritas à mão: um caminho literal aqui seria um
 * segundo dono do endereço, e ele divergiria do `App.tsx` sem nada acusar. Quem guarda o lado do
 * `App.tsx` é `app/__tests__/rotasDeConfiguracoes.test.ts`.
 */
const renderEm = (caminho: string) =>
  render(
    <MemoryRouter initialEntries={[caminho]}>
      <Routes>
        <Route path={SETTINGS_ROOT} element={<AdminSettingsPage />} />
        <Route path={`${SETTINGS_ROOT}/:secao`} element={<AdminSettingsPage />} />
      </Routes>
    </MemoryRouter>,
  )

/** O molde dos antigos `abrirMaterial`/`abrirFrete`/`abrirCarrinho`: agora é a rota da seção. */
const abrirFreteEMaterial = () => renderEm(settingsSectionPath('frete-e-material'))
const abrirVendas = () => renderEm(settingsSectionPath('vendas'))
const abrirDadosDaLoja = () => renderEm(settingsSectionPath('dados-da-loja'))

const linhaDoRail = (slug: string) => screen.getByTestId(`settings-section-link-${slug}`)

/**
 * Classe presente por **token exato**.
 *
 * `className.includes('hidden')` casa `overflow-hidden`, que o card do rail carrega sempre — a
 * primeira escrita deste arquivo asseria "a lista não está escondida" contra um elemento cuja
 * classe base contém a palavra, e o caso reprovava com a tela certa na frente. É `L-034`: a borda
 * de palavra não fecha nada quando o vizinho é hífen.
 */
const temClasse = (elemento: Element, token: string): boolean =>
  elemento.className.split(/\s+/).includes(token)

const painel = () => screen.getByTestId('settings-panel')
const navDeSecoes = () => screen.getByTestId('settings-section-nav')

beforeEach(() => {
  state.data = state.montar({ ...DEFAULT_MATERIAL })
  state.loading = false
  mutateAsync.mockClear()
  toast.mockClear()
})

// ───────────────────────────────────────────────────────────────────────────────
// Navegação — o que a feature 55 acrescentou
// ───────────────────────────────────────────────────────────────────────────────

describe('Configurações › o rail e as quatro seções (CFG-01, CFG-02)', () => {
  it('a rota-mãe abre a PRIMEIRA seção, com ela marcada no rail', () => {
    renderEm(SETTINGS_ROOT)

    expect(linhaDoRail(SETTINGS_SECTIONS[0].slug)).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('Geral')).toBeInTheDocument()
    expect(screen.getByText('SEO')).toBeInTheDocument()
  })

  it('CFG-02: a rota-mãe NÃO desenha um índice de seções no painel', () => {
    // O rail já é a lista. Repeti-la ao lado seria a mesma lista duas vezes na mesma tela — e é
    // exatamente o que um "painel de índice" pareceria razoável fazer.
    renderEm(SETTINGS_ROOT)

    const painel = screen.getByTestId('settings-panel')
    for (const secao of SETTINGS_SECTIONS) {
      expect(within(painel).queryByText(secao.description)).toBeNull()
    }
  })

  it('CFG-03: escolher uma seção troca o painel e o marcador', () => {
    renderEm(SETTINGS_ROOT)
    expect(screen.queryByTestId('aviso-endereco-material')).toBeNull()

    fireEvent.click(linhaDoRail('frete-e-material'))

    expect(screen.getByTestId('aviso-endereco-material')).toBeInTheDocument()
    expect(linhaDoRail('frete-e-material')).toHaveAttribute('aria-current', 'page')
    expect(linhaDoRail('dados-da-loja')).not.toHaveAttribute('aria-current')
  })

  it('CFG-04..CFG-06: cada seção mostra os cards dela, e só eles', () => {
    const { unmount } = abrirDadosDaLoja()
    expect(screen.getByText('Geral')).toBeInTheDocument()
    expect(screen.getByText('SEO')).toBeInTheDocument()
    expect(screen.queryByText('Frete')).toBeNull()
    unmount()

    const vendas = abrirVendas()
    expect(screen.getByText('Pagamento')).toBeInTheDocument()
    expect(screen.getByTestId('checkout-card-stub')).toBeInTheDocument()
    expect(screen.getByText('Carrinho abandonado')).toBeInTheDocument()
    expect(screen.queryByText('SEO')).toBeNull()
    vendas.unmount()

    abrirFreteEMaterial()
    expect(screen.getByText('Frete')).toBeInTheDocument()
    expect(screen.getByText('Material')).toBeInTheDocument()
    expect(screen.queryByText('Pagamento')).toBeNull()
  })

  it('CFG-07: a seção Notificações monta `NotificationsTab` — nunca um segundo desenho aqui', () => {
    renderEm(settingsSectionPath('notificacoes'))

    expect(screen.getByTestId('notifications-tab-stub')).toBeInTheDocument()
    // E abrir a seção não dispara gravação nenhuma: a aba é autocontida, com o próprio
    // `useUpdateSettings`.
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('CFG-08: o cabeçalho é o MESMO nó antes e depois de trocar de seção', () => {
    // Se o `PageHeader` remontasse, o título piscaria a cada clique. As duas rotas irmãs com o mesmo
    // `element` deixam a página montada — é a mesma propriedade que `/admin/home` e
    // `/admin/home/:sectionId` exploram.
    renderEm(SETTINGS_ROOT)
    const antes = screen.getByRole('heading', { name: 'Configurações' })

    fireEvent.click(linhaDoRail('vendas'))

    expect(screen.getByRole('heading', { name: 'Configurações' })).toBe(antes)
  })

  it('CFG-08: e ele está FORA do painel — identidade não é posição', () => {
    // ⚠️ O caso acima sozinho é **verdadeiro nos dois mundos**: o React reconcilia por posição e
    // tipo, então `toBe` continua valendo com o cabeçalho DENTRO do painel. A verificação
    // independente moveu o `<PageHeader>` para dentro de `settings-panel` e os 112 casos ficaram
    // verdes.
    //
    // O que isso custaria: o título entraria na coluna de `max-w-3xl` — e, na rota-mãe abaixo de
    // `lg`, **sumiria de vez**, porque o painel carrega `hidden lg:block`. A lista de 4 seções no
    // celular abriria sem título nenhum.
    //
    // Identidade prova que ele não remonta; só a POSIÇÃO prova que ele não se move.
    renderEm(SETTINGS_ROOT)

    expect(painel()).not.toContainElement(screen.getByRole('heading', { name: 'Configurações' }))
  })

  it('CFG-11: o cabeçalho da página SOME no celular quando uma seção está aberta', () => {
    // Sem isto, em 390px dentro de uma seção a Adri veria DOIS cabeçalhos empilhados: a seta de
    // voltar com "Frete e Material", e logo abaixo "⚙ Configurações". A tabela de visibilidade do
    // `design.md` tem quatro linhas, e esta era a que nenhum caso cobria.
    abrirFreteEMaterial()
    const cabecalho = screen.getByRole('heading', { name: 'Configurações' }).closest('div')!
      .parentElement!.parentElement!

    expect(temClasse(cabecalho, 'hidden')).toBe(true)
    expect(temClasse(cabecalho, 'lg:flex')).toBe(true)
  })
})

describe('Configurações › endereço por seção (CFG-15..CFG-18)', () => {
  it('CFG-16: abrir a URL de uma seção abre aquela seção, sem passo intermediário', () => {
    renderEm(settingsSectionPath('notificacoes'))

    expect(screen.getByTestId('notifications-tab-stub')).toBeInTheDocument()
    expect(linhaDoRail('notificacoes')).toHaveAttribute('aria-current', 'page')
  })

  it('CFG-15: cada linha do rail aponta para o endereço da seção dela', () => {
    renderEm(SETTINGS_ROOT)

    for (const secao of SETTINGS_SECTIONS) {
      expect(linhaDoRail(secao.slug)).toHaveAttribute('href', settingsSectionPath(secao.slug))
    }
  })

  it('CFG-18: slug inexistente se comporta como a rota-mãe', () => {
    // Sem inventar tela de erro para um caso que só acontece por URL digitada à mão — a lojista
    // continua num estado funcional.
    renderEm(`${SETTINGS_ROOT}/marketing`)

    expect(linhaDoRail(SETTINGS_SECTIONS[0].slug)).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('Geral')).toBeInTheDocument()
    // E, como na rota-mãe, o celular vê só a lista.
    expect(temClasse(painel(), 'hidden')).toBe(true)
  })

  it('CFG-17: a rota-mãe renderiza conteúdo — não redireciona', () => {
    // Ela é o endereço que vive em `footerNavItems`. Um redirect a trocaria por um que a sidebar
    // não nomeia.
    renderEm(SETTINGS_ROOT)
    expect(screen.getByTestId('settings-panel')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Configurações' })).toBeInTheDocument()
  })
})

describe('Configurações › celular: lista → seção → voltar (CFG-10..CFG-12)', () => {
  it('CFG-10: na rota-mãe o painel fica escondido abaixo de `lg`, e a lista aparece', () => {
    // jsdom devolve 0 para toda medida de layout, então o que se mede aqui é a CLASSE — proxy de
    // forma, declarado como tal no `design.md`. A prova de que o layout resultante é o certo é a
    // sessão de navegador.
    renderEm(SETTINGS_ROOT)

    expect(temClasse(painel(), 'hidden')).toBe(true)
    expect(temClasse(painel(), 'lg:block')).toBe(true)
    expect(temClasse(navDeSecoes(), 'hidden')).toBe(false)
  })

  it('SENSOR: a régua de token exato não confunde `hidden` com `overflow-hidden`', () => {
    // O card do rail carrega `overflow-hidden` sempre. Um `includes('hidden')` declararia a lista
    // escondida em toda rota — e o caso acima reprovaria com a tela certa na frente.
    const falso = { className: 'overflow-hidden rounded-2xl' } as unknown as Element

    expect(temClasse(falso, 'hidden')).toBe(false)
    expect(temClasse(falso, 'overflow-hidden')).toBe(true)
  })

  it('CFG-11: dentro de uma seção o painel aparece e a lista some — abaixo de `lg`', () => {
    abrirFreteEMaterial()

    expect(temClasse(painel(), 'hidden')).toBe(false)
    expect(temClasse(navDeSecoes(), 'hidden')).toBe(true)
    expect(temClasse(navDeSecoes(), 'lg:block')).toBe(true)
  })

  it('CFG-11: dentro de uma seção há um cabeçalho de voltar, só no celular', () => {
    abrirFreteEMaterial()

    const voltar = screen.getByRole('button', { name: 'Voltar' })
    expect(voltar).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Frete e Material' })).toBeInTheDocument()
  })

  it('CFG-12: a seta de voltar leva de volta à lista', () => {
    abrirFreteEMaterial()
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))

    // De volta à rota-mãe: a lista reaparece, o painel volta a ser só do desktop, e o cabeçalho de
    // voltar deixa de existir.
    expect(temClasse(navDeSecoes(), 'hidden')).toBe(false)
    expect(temClasse(painel(), 'hidden')).toBe(true)
    expect(screen.queryByRole('button', { name: 'Voltar' })).toBeNull()
  })

  it('na rota-mãe NÃO há cabeçalho de voltar — não há de onde voltar', () => {
    renderEm(SETTINGS_ROOT)
    expect(screen.queryByRole('button', { name: 'Voltar' })).toBeNull()
  })

  it('CFG-14: a seta de voltar mede 44px — o alvo é o dedo', () => {
    // `size="icon"` do design system é `h-10 w-10` (40px), **abaixo** do piso. O `backTo` do
    // `PageHeader` nunca teve consumidor antes desta feature, então subir a medida lá não move um
    // pixel em nenhuma outra tela — e quem o usa é justamente um cabeçalho de celular.
    abrirFreteEMaterial()
    const voltar = screen.getByRole('button', { name: 'Voltar' })

    expect(temClasse(voltar, 'h-11')).toBe(true)
    expect(temClasse(voltar, 'w-11')).toBe(true)
    // O par: a medida antiga não sobreviveu à fusão de classes do `cn`.
    expect(temClasse(voltar, 'h-10')).toBe(false)
  })
})

describe('Configurações › CFG-14: os CONTROLES de uma seção também chegam a 44px', () => {
  // A AC nomeia três coisas: a lista, o botão de voltar e **os controles de uma seção**. A terceira
  // não tinha asserção nenhuma — e não estava implementada: o `Switch` do design system é `h-6 w-11`
  // (24px de altura) e o `<Button>` padrão é `h-10` (40px). A feature 53 já tinha topado com isso e
  // criado o `switchClassName`; esta feature editou aquele comentário sem usar o prop.
  it('o interruptor tem a área clicável estendida', () => {
    abrirFreteEMaterial()
    const interruptorDoFrete = screen.getByRole('switch', { name: /Oferecer frete grátis/i })

    // O pseudo-elemento não é mensurável em jsdom (nem em `getBoundingClientRect` num navegador):
    // o que se prova aqui é que a classe que o desenha chegou ao DOM.
    expect(temClasse(interruptorDoFrete, 'relative')).toBe(true)
    expect(interruptorDoFrete.className).toContain('before:-top-[10px]')
    expect(interruptorDoFrete.className).toContain('before:-bottom-[10px]')
  })

  it('os dois interruptores de Vendas também', () => {
    abrirVendas()
    for (const nome of [/PIX habilitado/i, /Cartão de crédito habilitado/i]) {
      const controle = screen.getByRole('switch', { name: nome })
      expect(controle.className, String(nome)).toContain('before:-top-[10px]')
    }
  })

  it('o botão de salvar de cada card mede 44px', () => {
    // Por token exato: `h-11` é substring de `min-h-11`, e o `<Button>` padrão traz `h-10`.
    abrirFreteEMaterial()

    for (const id of ['salvar-frete', 'salvar-material']) {
      const botao = screen.getByTestId(id)
      expect(temClasse(botao, 'h-11'), id).toBe(true)
      expect(temClasse(botao, 'h-10'), id).toBe(false)
    }
  })
})

describe('Configurações › o celular empilha em coluna única (CFG-13)', () => {
  // jsdom devolve 0 para toda medida de layout, então o que se mede é a CLASSE: a grade só ganha
  // colunas a partir de `sm`, e abaixo disso o fluxo normal empilha.
  //
  // ⚠️ **A primeira escrita desta régua filtrava o defeito para fora da própria amostra.** Ela
  // colhia só os `div` que JÁ tinham `(sm|md|lg):grid-cols-` e depois asseria que nenhum deles tinha
  // `grid-cols-` pelado — um `grid-cols-2` fixo nunca entrava na lista, então o `toEqual([])` jamais
  // o veria. A verificação independente trocou `sm:grid-cols-2` por `grid-cols-2` em
  // `StoreDataSection` e a suíte ficou verde. **A amostra é toda grade**, e a régua decide depois.
  const gradesDe = (raiz: HTMLElement): HTMLElement[] =>
    Array.from(raiz.querySelectorAll('div')).filter(d =>
      d.className.split(/\s+/).some(c => c === 'grid' || /grid-cols-/.test(c)),
    )

  /** As colunas que valem ABAIXO de `sm` — as sem prefixo de breakpoint. São elas que não podem existir. */
  const colunasNoCelular = (elemento: HTMLElement): string[] =>
    elemento.className.split(/\s+/).filter(c => /^grid-cols-/.test(c))

  it('nenhuma grade de campo tem colunas ABAIXO de `sm`', () => {
    for (const abrir of [abrirDadosDaLoja, abrirFreteEMaterial, abrirVendas]) {
      const { unmount } = abrir()
      const grades = gradesDe(painel())

      // Âncora: sem ela, uma tela sem grade nenhuma passaria neste laço sem executar uma asserção.
      expect(grades.length).toBeGreaterThan(0)

      for (const grade of grades) {
        expect(colunasNoCelular(grade), grade.className).toEqual([])
      }
      unmount()
    }
  })

  it('SENSOR: a régua VÊ uma grade fixa — chamando as duas funções de verdade', () => {
    // O sensor antigo exercitava só o `filter` interno sobre um array escrito à mão, e por isso não
    // encostava no colhedor — que era justamente onde o defeito morava. Este monta DOM e chama as
    // duas funções, na ordem em que a asserção acima as chama.
    const raiz = document.createElement('div')
    raiz.innerHTML =
      '<div class="grid gap-4 grid-cols-2"></div><div class="grid gap-4 sm:grid-cols-2"></div>'

    const grades = gradesDe(raiz)
    expect(grades).toHaveLength(2)
    expect(colunasNoCelular(grades[0])).toEqual(['grid-cols-2'])
    expect(colunasNoCelular(grades[1])).toEqual([])
  })
})

describe('Configurações › nenhum campo foi removido (Success Criteria)', () => {
  // O primeiro *Success Criterion* da spec é "sem nenhum campo removido ou alterado", e ele não
  // tinha teste: a verificação independente apagou o campo `Imagem Open Graph (URL)` e a suíte
  // ficou verde. O inventário é escrito por extenso de propósito — derivá-lo do componente seria
  // provar que ele é igual a si mesmo.
  // Tipado pelo slug, não por `string`: um slug renomeado no registro vira erro de compilação aqui
  // em vez de um `it.each` que renderiza a rota-mãe e "passa".
  const CAMPOS: Partial<Record<SettingsSectionSlug, string[]>> = {
    'dados-da-loja': [
      'Nome da loja',
      'WhatsApp (com DDD)',
      'E-mail de contato',
      // Feature 57 (`AVD-07`): o endereco que recebe os avisos internos, separado do publico.
      'E-mail para avisos internos',
      'Instagram (@usuario)',
      'TikTok (@usuario)',
      'Mensagem padrão do WhatsApp',
      // Feature 56 (`LEG-19`): o teto saiu do RÓTULO e virou contador na linha dele. O inventário
      // acompanha o texto novo e continua guardando a mesma coisa — que o campo não sumiu.
      'Título padrão',
      'Descrição padrão',
      'Imagem Open Graph (URL)',
    ],
    'frete-e-material': [
      'Frete grátis a partir de',
      'Custo de frete padrão',
      'Destinatário',
      'Logradouro',
      'Número',
      'Complemento',
      'Bairro',
      'Cidade',
      'UF',
      'CEP',
      'Observação para quem envia',
    ],
    vendas: [
      'Desconto no PIX (%)',
      'Máximo de parcelas',
      'Valor mínimo da parcela',
      'Marcar como abandonado após (horas)',
    ],
  }

  it.each(Object.keys(CAMPOS) as SettingsSectionSlug[])(
    'a seção %s mostra todos os campos que ela tinha',
    slug => {
    const { unmount } = renderEm(settingsSectionPath(slug))

    for (const rotulo of CAMPOS[slug]!) {
      expect(screen.getByLabelText(rotulo), rotulo).toBeInTheDocument()
    }
    unmount()
    },
  )

  it('e os três interruptores continuam de pé', () => {
    const { unmount } = abrirFreteEMaterial()
    expect(screen.getByRole('switch', { name: /Oferecer frete grátis/i })).toBeInTheDocument()
    unmount()

    abrirVendas()
    expect(screen.getByRole('switch', { name: /PIX habilitado/i })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /Cartão de crédito habilitado/i })).toBeInTheDocument()
  })
})

describe('Configurações › `InfoBanner` nos quatro lugares (CFG-26, CFG-27)', () => {
  it('o aviso do Carrinho abandonado usa o componente compartilhado', () => {
    abrirVendas()
    const aviso = screen.getByTestId('aviso-carrinho-abandonado')

    expect(aviso.className).toContain('bg-estrelinha-admin-amber/10')
    // `CFG-27` — extração, não redesenho: o texto e o ícone são os de antes.
    expect(aviso).toHaveTextContent(/A loja não envia lembrete automático de carrinho/)
    expect(aviso.querySelector('svg')).not.toBeNull()
  })

  it('nenhum aviso de Configurações ficou com a caixa cinza ad hoc', () => {
    // As três caixas `bg-muted` viraram uma só. A régua é de token exato — `bg-muted/30` é outra
    // classe e continua legítima em outros lugares do painel.
    for (const abrir of [abrirFreteEMaterial, abrirVendas]) {
      const { unmount } = abrir()
      const cinzas = Array.from(painel().querySelectorAll('div')).filter(d =>
        d.className.split(/\s+/).includes('bg-muted'),
      )
      expect(cinzas).toEqual([])
      unmount()
    }
  })
})

describe('Configurações › a contagem saiu do CSS (a promessa da feature)', () => {
  it('não existe mais `tablist` na tela', () => {
    // ⚠️ Este caso é a INVERSÃO do que este arquivo asseria até a feature 55
    // (`expect(screen.getByRole('tablist')...)`). Aquela asserção estava certa naquele dia: a tela
    // era um `<Tabs>`. Apagá-la deixaria sem rastro por que a tela mudou; invertida, ela recusa a
    // volta.
    renderEm(SETTINGS_ROOT)
    expect(screen.queryByRole('tablist')).toBeNull()
    expect(screen.queryAllByRole('tab')).toHaveLength(0)
  })

  it('nenhuma classe da navegação depende da CONTAGEM de seções', () => {
    // A outra inversão. O `TabsList` levava `grid-cols-3 sm:grid-cols-8` — a oitava aba só coube
    // depois de um remendo de CSS documentado no código como conserto local, e a nona pediria
    // outro. Uma quinta seção aqui não pode pedir remendo nenhum.
    renderEm(SETTINGS_ROOT)

    expect(navDeSecoes().className).not.toMatch(/grid-cols-\d/)
    for (const secao of SETTINGS_SECTIONS) {
      expect(linhaDoRail(secao.slug).className).not.toMatch(/grid-cols-\d/)
    }
  })
})

describe('Configurações › trocar de seção descarta a edição (Edge Case)', () => {
  it('editar, sair da seção e voltar mostra de novo o que está no servidor', () => {
    // Mesma paridade de antes: nenhuma das oito abas avisava sobre edição não salva, e o Radix
    // desmontava a aba inativa. A montagem condicional por slug é o que mantém isso verdadeiro —
    // quatro painéis escondidos com CSS manteriam os quatro rascunhos vivos, e nada acusaria.
    abrirDadosDaLoja()
    const campo = () => screen.getByDisplayValue(/Uma Estrelinha|Outro nome/)

    fireEvent.change(campo(), { target: { value: 'Outro nome' } })
    expect(campo()).toHaveValue('Outro nome')

    fireEvent.click(linhaDoRail('vendas'))
    fireEvent.click(linhaDoRail('dados-da-loja'))

    expect(campo()).toHaveValue('Uma Estrelinha')
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('a seção que sai é DESMONTADA — não escondida', () => {
    // A asserção que prende a propriedade, e não só o sintoma: com as quatro seções montadas e
    // escondidas por CSS, o caso acima poderia continuar passando (o campo voltaria por outro
    // motivo) enquanto a prévia de e-mail seguisse viva atrás.
    abrirDadosDaLoja()
    expect(screen.getByText('Geral')).toBeInTheDocument()

    fireEvent.click(linhaDoRail('notificacoes'))

    expect(screen.queryByText('Geral')).toBeNull()
    expect(screen.queryByText('SEO')).toBeNull()
    expect(screen.getByTestId('notifications-tab-stub')).toBeInTheDocument()
  })

  it('sair de Notificações desmonta a aba — é o que fecha a prévia de e-mail (Edge Case)', () => {
    // A prévia aberta é estado LOCAL da `NotificationsTab`. A *Edge Case* pede que ela feche ao
    // trocar de seção, e o mecanismo é este: a seção sai do DOM, o estado vai junto. Sem a montagem
    // condicional, a aba continuaria montada atrás do painel visível e a prévia sobreviveria —
    // incluindo o `<iframe>` que ela carrega.
    renderEm(settingsSectionPath('notificacoes'))
    expect(screen.getByTestId('notifications-tab-stub')).toBeInTheDocument()

    fireEvent.click(linhaDoRail('frete-e-material'))

    expect(screen.queryByTestId('notifications-tab-stub')).toBeNull()
  })
})

describe('Configurações › estado de carga (Edge Case)', () => {
  it('mostra o carregando antes de desenhar os cards', () => {
    state.loading = true
    abrirDadosDaLoja()

    expect(screen.getByTestId('settings-carregando')).toBeInTheDocument()
    expect(screen.queryByText('Geral')).toBeNull()
  })

  it.each<SettingsSectionSlug>(['dados-da-loja', 'vendas', 'frete-e-material'])(
    'a seção %s mostra o carregando, não os cards',
    slug => {
      // As três têm o mesmo ramo `if (isLoading)`, e só uma tinha asserção.
      state.loading = true
      renderEm(settingsSectionPath(slug))

      expect(screen.getByTestId('settings-carregando')).toBeInTheDocument()
      expect(screen.queryByTestId('salvar-geral')).toBeNull()
      expect(screen.queryByTestId('salvar-frete')).toBeNull()
      expect(screen.queryByTestId('salvar-pagamento')).toBeNull()
    },
  )

  it('o rail NÃO pisca durante a carga — ele é navegação', () => {
    // Mudança deliberada de alcance: até a feature 55 o `isLoading` trocava a tela inteira,
    // cabeçalho incluso, por um spinner. A *Edge Case* pede o carregando "antes de desenhar os
    // cards", e é onde ele passou a ficar.
    state.loading = true
    abrirDadosDaLoja()

    expect(screen.getByTestId('settings-section-nav')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Configurações' })).toBeInTheDocument()
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// Comportamento — os casos que atravessaram a feature 55 sem perder asserção
// ───────────────────────────────────────────────────────────────────────────────

describe('Configurações › Material (MAT-01)', () => {
  it('o card existe, ao lado de Frete — é outra remessa, e por isso outro endereço', () => {
    // Era um caso sobre duas ABAS vizinhas; virou um caso sobre dois CARDS na mesma seção, que é o
    // que a feature 55 decidiu: as duas remessas da loja moram juntas.
    abrirFreteEMaterial()
    expect(screen.getByText('Material')).toBeInTheDocument()
    expect(screen.getByText('Frete')).toBeInTheDocument()
  })

  it('salva a chave `material` com os nove campos', async () => {
    abrirFreteEMaterial()

    fireEvent.change(screen.getByPlaceholderText('Adri Muniz'), {
      target: { value: 'Adriana Muniz' },
    })
    fireEvent.change(screen.getByPlaceholderText('Rua …'), {
      target: { value: 'Rua das Flores' },
    })
    fireEvent.click(screen.getByTestId('salvar-material'))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))

    const [enviado] = mutateAsync.mock.calls[0]
    expect(enviado.key).toBe('material')
    expect(enviado.value.recipient).toBe('Adriana Muniz')
    expect(enviado.value.street).toBe('Rua das Flores')
    expect(Object.keys(enviado.value).sort()).toEqual(
      ['city', 'complement', 'neighborhood', 'notes', 'number', 'recipient', 'state', 'street', 'zip'],
    )
  })

  it('campo não preenchido vai como string vazia, nunca `undefined`', async () => {
    // `undefined` sumiria do JSON gravado, e a leitura seguinte cairia no default sem ninguém notar.
    abrirFreteEMaterial()
    fireEvent.click(screen.getByTestId('salvar-material'))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    for (const [campo, valor] of Object.entries(mutateAsync.mock.calls[0][0].value)) {
      expect(valor, `campo ${campo}`).toBe('')
    }
  })

  it('a UF é normalizada para duas letras maiúsculas, e o CEP fica só com dígitos', async () => {
    abrirFreteEMaterial()

    fireEvent.change(screen.getByPlaceholderText('RS'), { target: { value: 'rss' } })
    fireEvent.change(screen.getByPlaceholderText('00000000'), { target: { value: '90.000-100' } })
    fireEvent.click(screen.getByTestId('salvar-material'))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(mutateAsync.mock.calls[0][0].value.state).toBe('RS')
    expect(mutateAsync.mock.calls[0][0].value.zip).toBe('90000100')
  })

  it('o que já está gravado aparece no formulário', () => {
    state.data = state.montar({ ...DEFAULT_MATERIAL, recipient: 'Adri', street: 'Av. Ipiranga' })
    abrirFreteEMaterial()

    expect(screen.getByDisplayValue('Adri')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Av. Ipiranga')).toBeInTheDocument()
  })

  it('avisa que endereço vazio não é exibido na loja', () => {
    // É a regra que impede material insubstituível de ser postado para um endereço pela metade.
    abrirFreteEMaterial()
    expect(screen.getByText(/não mostra endereço nenhum/i)).toBeInTheDocument()
  })

  it('CFG-26: o aviso usa o `InfoBanner` compartilhado, no token do painel', () => {
    abrirFreteEMaterial()
    const aviso = screen.getByTestId('aviso-endereco-material')

    expect(aviso.className).toContain('bg-estrelinha-admin-amber/10')
    expect(aviso.outerHTML).not.toMatch(/(?:^|["\s])bg-muted(?![-\w])/)
  })
})

/**
 * Feature 37 — o card **Frete** ganhou interruptor (`FRG-02`, `FRG-12`).
 *
 * Antes so existia o campo do valor, e zera-lo era a unica saida aparente para desligar o
 * beneficio. Nao desligava: tres superficies da loja liam o zero como "nao temos frete gratis" e
 * escondiam o texto, enquanto quatro faziam `subtotal >= 0` — sempre verdadeiro — e ZERAVAM O
 * FRETE no caixa.
 */
const interruptor = () => screen.getByRole('switch', { name: /Oferecer frete grátis/i })

/**
 * O rótulo perdeu o `(R$)` na feature 55 (`CFG-25`): o prefixo do `MoneyInput` carrega a unidade.
 * O `htmlFor` do `FieldGroup` continua ligando o rótulo ao campo, então `getByLabelText` segue
 * sendo a consulta certa.
 */
const campoValor = () => screen.getByLabelText('Frete grátis a partir de')
const salvarFrete = () => fireEvent.click(screen.getByTestId('salvar-frete'))

describe('Configurações › Frete — o interruptor (FRG-02)', () => {
  it('o interruptor existe e reflete o valor gravado', () => {
    abrirFreteEMaterial()
    expect(interruptor()).toBeChecked()
  })

  it('nasce DESLIGADO quando o banco diz desligado', () => {
    state.data = { ...state.montar({ ...DEFAULT_MATERIAL }) }
    state.data.shipping = { ...state.data.shipping, free_shipping_enabled: false }
    abrirFreteEMaterial()
    expect(interruptor()).not.toBeChecked()
  })

  it('desligar PRESERVA o valor da faixa, e o campo fica desabilitado exibindo o numero', () => {
    // Desligar nao apaga a configuracao dela: a Adri precisa ver o numero guardado para decidir se
    // quer religar com ele. O valor exibido agora é mascarado em pt-BR (`CFG-23`) — o NÚMERO
    // guardado é o mesmo, e é o caso abaixo que prova isso.
    abrirFreteEMaterial()
    fireEvent.click(interruptor())

    expect(campoValor()).toBeDisabled()
    expect(campoValor()).toHaveValue('150,00')
  })

  it('desligar e salvar manda `free_shipping_enabled: false` COM o threshold intacto', async () => {
    abrirFreteEMaterial()
    fireEvent.click(interruptor())
    salvarFrete()

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(mutateAsync).toHaveBeenCalledWith({
      key: 'shipping',
      value: expect.objectContaining({
        free_shipping_enabled: false,
        free_shipping_threshold: 150,
      }),
    })
  })

  it('religar e salvar manda `free_shipping_enabled: true`', async () => {
    state.data = { ...state.montar({ ...DEFAULT_MATERIAL }) }
    state.data.shipping = { ...state.data.shipping, free_shipping_enabled: false }
    abrirFreteEMaterial()
    fireEvent.click(interruptor())
    salvarFrete()

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(mutateAsync).toHaveBeenCalledWith({
      key: 'shipping',
      value: expect.objectContaining({ free_shipping_enabled: true }),
    })
  })
})

describe('Configurações › Frete — ligado sem faixa e RECUSADO (FRG-12)', () => {
  it('ligado com o valor zerado nao chega a escrever no banco', async () => {
    abrirFreteEMaterial()
    fireEvent.change(campoValor(), { target: { value: '0' } })
    salvarFrete()

    // A prova e a AUSENCIA de escrita, nao o toast: um toast de erro com o upsert acontecendo
    // atras deixaria o banco com a configuracao impossivel gravada.
    await waitFor(() => expect(toast).toHaveBeenCalled())
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('a recusa explica o motivo, sem linguagem festiva', async () => {
    abrirFreteEMaterial()
    fireEvent.change(campoValor(), { target: { value: '0' } })
    salvarFrete()

    await waitFor(() => expect(toast).toHaveBeenCalled())
    const chamada = toast.mock.calls[0][0]
    expect(chamada.variant).toBe('destructive')
    expect(chamada.description).toMatch(/valor/i)
    expect(chamada.description).not.toMatch(/🎉|corra|agora/i)
  })

  it('DESLIGADO com o valor zerado e gravavel — a faixa nao importa quando nao ha faixa', async () => {
    abrirFreteEMaterial()
    fireEvent.click(interruptor())
    fireEvent.change(campoValor(), { target: { value: '0' } })
    salvarFrete()

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(mutateAsync).toHaveBeenCalledWith({
      key: 'shipping',
      value: expect.objectContaining({ free_shipping_enabled: false }),
    })
  })

  it('ligado com valor valido grava normalmente', async () => {
    abrirFreteEMaterial()
    fireEvent.change(campoValor(), { target: { value: '199,90' } })
    salvarFrete()

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(mutateAsync).toHaveBeenCalledWith({
      key: 'shipping',
      value: expect.objectContaining({
        free_shipping_enabled: true,
        free_shipping_threshold: 199.9,
      }),
    })
  })
})

describe('Configurações › os campos de dinheiro usam o input mascarado (CFG-23..CFG-25)', () => {
  it('os três campos em reais mostram o prefixo `R$`, e o rótulo não o repete', () => {
    abrirFreteEMaterial()

    expect(screen.getByLabelText('Frete grátis a partir de')).toBeInTheDocument()
    expect(screen.getByLabelText('Custo de frete padrão')).toBeInTheDocument()
    expect(screen.queryByLabelText(/\(R\$\)/)).toBeNull()
    // O prefixo é um slot fixo ao lado do input, e não entra no valor.
    expect(screen.getAllByText('R$').length).toBeGreaterThanOrEqual(2)
  })

  it('CFG-24: o valor gravado é o mesmo NÚMERO que o campo cru gravava', async () => {
    // A máscara é de apresentação. O que chega ao banco não pode mudar de unidade nem de precisão,
    // e um `null` do campo vazio gravaria `null` onde antes ia `0`.
    abrirFreteEMaterial()
    fireEvent.change(screen.getByLabelText('Custo de frete padrão'), { target: { value: '' } })
    salvarFrete()

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(mutateAsync.mock.calls[0][0].value.default_shipping_cost).toBe(0)
  })

  it('CFG-24: o MESMO vale para a faixa do frete grátis — um caso por campo', async () => {
    // O `design.md` prometia "um caso por campo" e o arquivo tinha um só. As duas mutações
    // sobreviveram à verificação independente: `v ?? 0 → v` grava `null` no jsonb onde ia `0`.
    //
    // ⚠️ O interruptor precisa estar DESLIGADO para este caso medir o que ele diz medir. Com ele
    // ligado, `freeShippingRefusal` recusa antes da escrita — e recusa tanto com `0` quanto com
    // `null` (`null <= 0` é `true`), então o caminho ligado é **verdadeiro nos dois mundos** e não
    // distingue mutação nenhuma. É pelo caminho que GRAVA que a forma do dado aparece.
    abrirFreteEMaterial()
    fireEvent.click(interruptor())
    fireEvent.change(campoValor(), { target: { value: '' } })
    salvarFrete()

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    // Zero, e não `null`: é o número que `freeShippingState` compara com o subtotal.
    expect(mutateAsync.mock.calls[0][0].value.free_shipping_threshold).toBe(0)
  })

  it('CFG-24: e a parcela mínima esvaziada também grava zero', async () => {
    abrirVendas()
    fireEvent.change(screen.getByLabelText('Valor mínimo da parcela'), { target: { value: '' } })
    fireEvent.click(screen.getByTestId('salvar-pagamento'))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(mutateAsync.mock.calls[0][0].value.min_installment_value).toBe(0)
  })

  it('CFG-23: `Valor mínimo da parcela` também é mascarado', () => {
    // ⚠️ `getByLabelText(...).toBeInTheDocument()` sozinho é **verdadeiro nos dois mundos**: ele
    // prova que existe um campo rotulado, não que ele é um `MoneyInput`. O que distingue é o slot
    // fixo do prefixo, que só o componente mascarado desenha.
    abrirVendas()
    const campo = screen.getByLabelText('Valor mínimo da parcela')

    expect(campo).toBeInTheDocument()
    expect(campo.closest('div')).toHaveTextContent('R$')
    // E ele não é o `<input type="number">` cru que estava ali antes.
    expect(campo).not.toHaveAttribute('type', 'number')
  })

  it('CFG-25: porcentagem e contagem NÃO viram campo de dinheiro', () => {
    // `MoneyInput` prefixa `R$` e formataria `5` como `5,00` reais — outra grandeza. O desconto do
    // Pix é percentual e o máximo de parcelas é contagem.
    abrirVendas()

    expect(screen.getByLabelText('Desconto no PIX (%)')).toHaveAttribute('type', 'number')
    expect(screen.getByLabelText('Máximo de parcelas')).toHaveAttribute('type', 'number')
    expect(screen.getByLabelText('Marcar como abandonado após (horas)')).toHaveAttribute(
      'type',
      'number',
    )
  })

  it('CFG-24: a parcela mínima grava o mesmo número de hoje', async () => {
    abrirVendas()
    fireEvent.change(screen.getByLabelText('Valor mínimo da parcela'), { target: { value: '25,50' } })
    fireEvent.click(screen.getByTestId('salvar-pagamento'))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(mutateAsync.mock.calls[0][0].value.min_installment_value).toBe(25.5)
  })
})

/**
 * Feature 42 — o card **Carrinho abandonado** para de mentir (`FIX-03`, defeito D3).
 *
 * Ele tinha "Enviar email de lembrete automaticamente", horas e cupom — e NENHUM código lia
 * `auto_email_enabled` para enviar nada. Um interruptor sem motor invalida o painel inteiro como
 * fonte de verdade: a dona liga, nada acontece, e ninguém sabe dizer por quê. Os campos seguem no
 * tipo e no JSONB; o que sai é a tela prometer.
 */

/** O controle que saiu, exatamente como era — o sensor abaixo o reinjeta num fixture. */
const ROTULO_DO_INTERRUPTOR = 'Enviar email de lembrete automaticamente'
const ROTULO_DAS_HORAS = 'Enviar lembrete após (horas)'
const ROTULO_DO_CUPOM = 'Cupom de incentivo (opcional)'

describe('Configurações › Carrinho — sem interruptor sem motor (FIX-03)', () => {
  it('mostra só o prazo de abandono, e diz que a loja não envia lembrete automático', () => {
    abrirVendas()

    expect(screen.getByText('Marcar como abandonado após (horas)')).toBeInTheDocument()
    expect(screen.getByText(/A loja não envia lembrete automático de carrinho/)).toBeInTheDocument()
    expect(screen.getByText(/BL-030/)).toBeInTheDocument()

    expect(screen.queryByText(ROTULO_DO_INTERRUPTOR)).toBeNull()
    expect(screen.queryByRole('switch', { name: ROTULO_DO_INTERRUPTOR })).toBeNull()
    expect(screen.queryByText(ROTULO_DAS_HORAS)).toBeNull()
    expect(screen.queryByText(ROTULO_DO_CUPOM)).toBeNull()
    // O card não promete envio nenhum — nem "na Fase 2".
    expect(screen.queryByText(/recuperação automática por email/)).toBeNull()
  })

  it('SENSOR: a mesma régua reprova um fixture com o controle de volta', () => {
    // Prova que `queryByText(...).toBeNull()` acima não passa por acidente: o mesmo `ToggleField`,
    // com o mesmo rótulo, renderizado num componente mínimo, é encontrado pela mesma consulta.
    const Fixture = () => (
      <ToggleField label={ROTULO_DO_INTERRUPTOR} checked={false} onChange={() => {}} />
    )
    render(<Fixture />)

    expect(screen.queryByText(ROTULO_DO_INTERRUPTOR)).not.toBeNull()
    expect(screen.queryByRole('switch', { name: ROTULO_DO_INTERRUPTOR })).not.toBeNull()
  })
})

describe('Configurações › Dados da loja — Geral e SEO gravam separado', () => {
  it('a chave `general` é gravada com os campos de contato', async () => {
    abrirDadosDaLoja()
    fireEvent.click(screen.getByTestId('salvar-geral'))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(mutateAsync.mock.calls[0][0].key).toBe('general')
    expect(mutateAsync.mock.calls[0][0].value.store_name).toBe('Uma Estrelinha')
  })

  it('a chave `seo` é gravada por um botão PRÓPRIO — os dois cards não se misturam', async () => {
    abrirDadosDaLoja()
    fireEvent.click(screen.getByTestId('salvar-seo'))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(mutateAsync).toHaveBeenCalledTimes(1)
    expect(mutateAsync.mock.calls[0][0].key).toBe('seo')
  })

  it('o WhatsApp fica só com dígitos e o `@` some das redes', async () => {
    abrirDadosDaLoja()

    fireEvent.change(screen.getByLabelText('WhatsApp (com DDD)'), {
      target: { value: '(51) 99999-9999' },
    })
    fireEvent.change(screen.getByLabelText('Instagram (@usuario)'), {
      target: { value: '@umaestrelinha' },
    })
    fireEvent.click(screen.getByTestId('salvar-geral'))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(mutateAsync.mock.calls[0][0].value.whatsapp).toBe('51999999999')
    expect(mutateAsync.mock.calls[0][0].value.instagram).toBe('umaestrelinha')
  })
})

// ───────────────────────────────────────────────────────────────────────────
// Feature 56 — o mesmo padrão nas outras seções
// ───────────────────────────────────────────────────────────────────────────

describe('Configuracoes > AVD-07, AVD-08 — o e-mail dos avisos internos', () => {
  it('o campo existe, e e SEPARADO do e-mail de contato', () => {
    abrirDadosDaLoja()

    const contato = screen.getByLabelText('E-mail de contato') as HTMLInputElement
    const avisos = screen.getByLabelText('E-mail para avisos internos') as HTMLInputElement

    // Dois nos distintos. Uma assercao de "existe" em cada um passaria com os dois sendo o MESMO
    // input, que e exatamente o estado que esta feature existe para desfazer.
    expect(contato).not.toBe(avisos)
    expect(contato.id).not.toBe(avisos.id)
  })

  it('a dica diz o que o VAZIO faz — senao ele se le como configuracao faltando', () => {
    // Sem a frase, a Adri preencheria os dois com o mesmo endereco so para ter certeza, e a
    // separacao que a feature entrega nao serviria para nada.
    abrirDadosDaLoja()

    const dica = screen.getByText(/Vazio, eles v[ãa]o para o e-mail de contato acima/)
    expect(dica).toBeInTheDocument()
  })

  it('editar o campo novo NAO mexe no de contato', () => {
    abrirDadosDaLoja()

    fireEvent.change(screen.getByLabelText('E-mail para avisos internos'), {
      target: { value: 'avisos@loja.com' },
    })

    expect((screen.getByLabelText('E-mail para avisos internos') as HTMLInputElement).value).toBe(
      'avisos@loja.com',
    )
    // O par que prende a independencia: um `setGeneral` que escrevesse na chave errada passaria na
    // assercao de cima e quebraria o e-mail publico da loja.
    expect((screen.getByLabelText('E-mail de contato') as HTMLInputElement).value).not.toBe(
      'avisos@loja.com',
    )
  })

  it('salvar Geral envia `notifications_email` junto — o campo nao e decorativo', () => {
    abrirDadosDaLoja()

    fireEvent.change(screen.getByLabelText('E-mail para avisos internos'), {
      target: { value: 'avisos@loja.com' },
    })
    fireEvent.click(screen.getByTestId('salvar-geral'))

    // A metade que a assercao de tela nao alcanca: o valor precisa chegar ao `upsert`. Sem ela, um
    // campo controlado que nunca entrasse no objeto salvo passaria em tudo acima.
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'general',
        value: expect.objectContaining({ notifications_email: 'avisos@loja.com' }),
      }),
    )
  })
})

describe('Configurações › LEG-19 — o teto saiu do rótulo e virou contador', () => {
  /** Rótulo visível → o teto que ele anunciava antes desta feature. */
  const CAMPOS_COM_TETO: Array<{ abrir: () => unknown; rotulo: string; limite: number }> = [
    { abrir: abrirDadosDaLoja, rotulo: 'Título padrão', limite: 60 },
    { abrir: abrirDadosDaLoja, rotulo: 'Descrição padrão', limite: 160 },
    { abrir: abrirDadosDaLoja, rotulo: 'Mensagem padrão do WhatsApp', limite: 300 },
    { abrir: abrirFreteEMaterial, rotulo: 'Observação para quem envia', limite: 400 },
  ]

  it.each(CAMPOS_COM_TETO)('o campo $rotulo mostra o contador $limite', ({ abrir, rotulo, limite }) => {
    const { unmount } = abrir() as { unmount: () => void }

    // O rótulo NÃO carrega mais o número. Escrito como asserção própria porque é a metade que muda:
    // sem ela, acrescentar o contador e deixar o parêntese no rótulo diria o teto duas vezes.
    const label = screen.getByText(rotulo)
    expect(label.textContent).not.toMatch(/caracteres/)

    // E o contador está na linha DELE, com o teto certo. A busca é dentro do pai compartilhado, e
    // não na tela inteira: `getByText('0/60')` acharia o contador de outro campo que por acaso
    // tivesse o mesmo teto, e a asserção passaria medindo o vizinho.
    expect(label.parentElement!.textContent).toContain(`/${limite}`)

    unmount()
  })

  it('o contador ACOMPANHA o que é digitado — ele não é um rótulo estático com outro nome', () => {
    // Sem este caso, um `<span>0/60</span>` cravado passaria em tudo acima.
    abrirDadosDaLoja()
    const label = screen.getByText('Título padrão')
    expect(label.parentElement!.textContent).toContain('0/60')

    fireEvent.change(screen.getByLabelText('Título padrão'), {
      target: { value: 'Joias afetivas' },
    })

    expect(label.parentElement!.textContent).toContain('14/60')
  })
})

describe('Configurações › LEG-20 — o botão de salvar tem um dono, e ele é largura cheia no celular', () => {
  const botoesDeSalvar = () => screen.getAllByRole('button', { name: /salvar altera/i })

  it.each([
    ['dados-da-loja', abrirDadosDaLoja],
    ['frete-e-material', abrirFreteEMaterial],
    ['vendas', abrirVendas],
  ] as const)('os botões de salvar da seção %s são `w-full sm:w-auto` e `h-11`', (_slug, abrir) => {
    const { unmount } = abrir() as { unmount: () => void }

    const botoes = botoesDeSalvar()
    expect(botoes.length).toBeGreaterThan(0)

    for (const botao of botoes) {
      const classes = botao.className.split(/\s+/)
      // As duas metades da AC, cada uma com asserção POSITIVA (`L-029`): a largura cheia no celular
      // e o recuo a partir de `sm`. Só a primeira deixaria o botão esticado em 1440.
      expect(classes, botao.textContent!).toContain('w-full')
      expect(classes, botao.textContent!).toContain('sm:w-auto')
      // Por token exato: `h-11` é substring de `min-h-11` (`L-034`).
      expect(classes, botao.textContent!).toContain('h-11')
    }

    unmount()
  })
})
