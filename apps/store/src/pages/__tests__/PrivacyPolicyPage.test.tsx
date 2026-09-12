import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

/** `L-030`: mock do módulo inteiro. Hook novo consumido pela página derruba o render, não a asserção. */
const { settingsGeral } = vi.hoisted(() => ({
  settingsGeral: {
    whatsapp: '(51) 98655-0542',
    email: 'contato@umaestrelinha.com.br',
    store_name: 'Uma Estrelinha',
  },
}))

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useGeneralSettings: () => settingsGeral,
}))

import { PRIVACY_POLICY_PATH } from '@estrelinha/core/routes'
import PrivacyPolicyPage from '../PrivacyPolicyPage'
import { MARKETING_CONSENT_LABEL } from '@/shared/lib/consent'

beforeEach(() => {
  settingsGeral.whatsapp = '(51) 98655-0542'
  settingsGeral.email = 'contato@umaestrelinha.com.br'
})

const montar = () =>
  render(
    <MemoryRouter initialEntries={[PRIVACY_POLICY_PATH]}>
      <PrivacyPolicyPage />
    </MemoryRouter>,
  )

/**
 * `POL-10`..`POL-14` — a Política de Privacidade.
 *
 * A régua mais importante deste arquivo não é de presença, é de **veracidade**: cada afirmação que a
 * página faz sobre tratamento de dados tem de corresponder ao que a loja faz. Uma política que
 * descreve um programa de privacidade inexistente é declaração falsa assinada pela dona.
 */

describe('PrivacyPolicyPage — o endereço (POL-01)', () => {
  it('a canônica é `/politica-de-privacidade`, o slug do site em produção', () => {
    // Singular, ao contrário do irmão. Escrito à mão de propósito: a régua não pode ser o objeto
    // medido, e "padronizar" os dois é mudança de endereço.
    expect(PRIVACY_POLICY_PATH).toBe('/politica-de-privacidade')
  })
})

describe('PrivacyPolicyPage — o texto original foi preservado (POL-10)', () => {
  const FRASES_DO_SITE = [
    'Os dados cadastrais de clientes não são vendidos, trocados ou divulgados para terceiros, exceto quando essas informações são necessárias para o processo de entrega, para cobrança, ou para participação em promoções previamente solicitadas e autorizadas pelos clientes.',
    'Seus dados pessoais são peça fundamental para que seu pedido chegue em segurança, na sua casa, de acordo com nosso prazo de entrega.',
    'A loja Uma Estrelinha utiliza cookies e informações de sua navegação (sessão do browser) com o objetivo de traçar um perfil do público que visita o site e aperfeiçoar sempre nossos serviços, produtos, conteúdos e garantir as melhores ofertas e promoções para você.',
    'Durante todo este processo mantemos suas informações em sigilo absoluto.',
    'Vale lembrar que seus dados são registrados pela loja Uma Estrelinha de forma automatizada, dispensando manipulação humana.',
    'Para que estes dados permaneçam intactos, nós desaconselhamos expressamente a divulgação de sua senha a terceiros, mesmo a amigos e parentes.',
    'As alterações sobre nossa política de privacidade serão devidamente informadas neste espaço.',
  ]

  // Frase INTEIRA (`L-009`): asserir fragmento deixa a voz da dona ser reescrita sem quebrar teste.
  it.each(FRASES_DO_SITE.map((f) => [f.slice(0, 48), f]))(
    'mantém a frase "%s…"',
    (_rotulo, frase) => {
      montar()

      expect(screen.getByText(frase)).toBeInTheDocument()
    },
  )

  it('a abertura continua na primeira pessoa, com o nome da dona', () => {
    montar()

    expect(screen.getByText('Adri Muniz')).toBeInTheDocument()
    expect(
      screen.getByText(/tenho o compromisso com a sua privacidade e a segurança dos clientes/),
    ).toBeInTheDocument()
  })
})

describe('PrivacyPolicyPage — a LGPD e os direitos (POL-11)', () => {
  it('cita a lei pelo número', () => {
    montar()

    expect(
      screen.getByText(/Lei Geral de Proteção de Dados Pessoais \(Lei nº 13\.709\/2018\)/),
    ).toBeInTheDocument()
  })

  const DIREITOS = [
    'Confirmar que tratamos dados seus e acessar o que temos;',
    'Corrigir dado incompleto, desatualizado ou errado;',
    'Pedir a eliminação dos dados tratados com o seu consentimento;',
    'Saber com quem compartilhamos os seus dados;',
    'Pedir a portabilidade dos seus dados a outro fornecedor;',
    'Revogar o consentimento que você tenha dado, a qualquer momento.',
  ]

  // Um item de verificação por direito (`L-010`): resumir os seis num parágrafo é onde um deles some.
  it.each(DIREITOS.map((d) => [d]))('lista o direito "%s"', (direito) => {
    montar()

    expect(screen.getByText(direito)).toBeInTheDocument()
  })

  it('diz COMO exercê-los — o canal aparece na mesma seção', () => {
    // Direito listado sem canal é direito que a leitora não consegue exercer. As duas metades
    // juntas (`L-036`).
    montar()

    const secao = document.getElementById('os-seus-direitos')?.closest('section')
    expect(secao?.querySelector('a[href^="https://wa.me"]')).toBeTruthy()
    expect(secao?.querySelector('a[href^="mailto:"]')).toBeTruthy()
  })

  it('não promete apagar o que a lei manda guardar', () => {
    montar()

    expect(
      screen.getByText(/Alguns dados precisam ser mantidos mesmo depois de um pedido de exclusão/),
    ).toBeInTheDocument()
  })
})

describe('PrivacyPolicyPage — o compartilhamento é o real (POL-12)', () => {
  const COMPARTILHAMENTOS = [
    /Meio de pagamento, para processar a cobrança/,
    /Transportadora e Correios, para levar a encomenda até o seu endereço/,
    /Serviço de envio de e-mail, para mandar a confirmação do pedido/,
  ]

  it.each(COMPARTILHAMENTOS.map((c) => [c.source.slice(0, 40), c]))(
    'nomeia o compartilhamento "%s…"',
    (_rotulo, padrao) => {
      montar()

      expect(screen.getByText(padrao)).toBeInTheDocument()
    },
  )

  it('não afirma tratamento que a loja não faz', () => {
    // A régua de `FIX-04` aplicada à privacidade: a loja não faz perfilamento publicitário, não
    // vende base e não tem encarregado nomeado. Declarar qualquer um dos três seria inventar um
    // programa de privacidade — e assiná-lo com o nome da dona.
    montar()

    const texto = document.body.textContent ?? ''
    expect(texto).not.toMatch(/encarregado de (?:proteção de )?dados|\bDPO\b/i)
    expect(texto).not.toMatch(/anúncios personalizados|publicidade comportamental|remarketing/i)
  })

  it('diz que o cartão não fica guardado na loja', () => {
    montar()

    expect(
      screen.getByText(/não ficam guardados conosco/),
    ).toBeInTheDocument()
  })
})

describe('PrivacyPolicyPage — o consentimento citado é o do checkout (POL-13)', () => {
  it('cita o texto da caixa de seleção, e o cita do dono único', () => {
    montar()

    // `MARKETING_CONSENT_LABEL` é a MESMA constante que o `ContactBlock` renderiza. Se a copy do
    // checkout mudar, esta página muda junto — e se alguém reescrever a frase aqui à mão, este caso
    // reprova. É a prova de consentimento que estaria errada, não só um texto.
    expect(screen.getByText(new RegExp(MARKETING_CONSENT_LABEL.slice(0, 40)))).toBeInTheDocument()
  })

  it('diz que a caixa é OPCIONAL e que recusá-la não afeta o pedido', () => {
    montar()

    expect(screen.getByText('opcional')).toBeInTheDocument()
    expect(screen.getByText(/Deixá-la desmarcada não muda nada no seu pedido/)).toBeInTheDocument()
  })

  it('menciona o lembrete de carrinho — que é o que o consentimento de fato autoriza', () => {
    // A loja roda um `AbandonedCartTracker` que só dispara com consentimento (`PRV-05`). Uma
    // política que descreve o opt-in sem dizer isso está calada sobre o único uso dele.
    montar()

    expect(screen.getByText(/carrinho que ficou pela metade/)).toBeInTheDocument()
  })
})

describe('PrivacyPolicyPage — o material afetivo (POL-14)', () => {
  it('tem seção própria e nomeia os materiais', () => {
    montar()

    expect(
      screen.getByRole('heading', { level: 2, name: 'O material afetivo que você envia' }),
    ).toBeInTheDocument()

    const texto = document.body.textContent ?? ''
    for (const material of ['cinzas de cremação', 'leite materno', 'mecha de cabelo']) {
      expect(texto).toContain(material)
    }
  })

  it('a promessa sobre o que sobra é a MESMA do guia de envio, e linka para ele', () => {
    // O guia já diz "usamos apenas o necessário para a joia e devolvemos o restante junto com a sua
    // peça, na mesma embalagem". Uma segunda redação da mesma promessa é o "defeito 01" na sua forma
    // mais cara: duas promessas sobre material insubstituível, divergindo sem nada quebrar.
    montar()

    expect(
      screen.getByText(
        /Usamos apenas o necessário para a joia e devolvemos o restante junto com a sua peça, na mesma embalagem/,
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'guia de envio de material' })).toHaveAttribute(
      'href',
      '/como-enviar-seu-material-de-dna',
    )
  })
})

describe('PrivacyPolicyPage — o canal vem das settings (POL-09)', () => {
  it('sem número, a ação do WhatsApp some e o e-mail fica', () => {
    settingsGeral.whatsapp = ''
    montar()

    expect(screen.queryByRole('link', { name: 'Falar no WhatsApp' })).toBeNull()
    expect(screen.getByRole('link', { name: 'contato@umaestrelinha.com.br' })).toBeInTheDocument()
  })

  it('o assunto da mensagem é o desta página, não o da outra política', () => {
    montar()

    const href = decodeURIComponent(
      screen.getByRole('link', { name: 'Falar no WhatsApp' }).getAttribute('href') ?? '',
    )
    expect(href).toContain('Vim pela política de privacidade da Uma Estrelinha')
    expect(href).not.toContain('trocas e devoluções')
  })
})

describe('PrivacyPolicyPage — o tom', () => {
  it('sem emoji e sem vocabulário da loja anterior', () => {
    montar()

    const texto = document.body.textContent ?? ''
    expect(texto).not.toMatch(/🎉|🥳|✨|💜|💖|😢|👋/)
    expect(texto).not.toMatch(/botton|\bpin\b|\bpins\b|alfinete/i)
  })
})
