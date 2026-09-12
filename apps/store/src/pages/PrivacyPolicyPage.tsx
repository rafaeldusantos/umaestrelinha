// Feature 45 / `POL-01`, `POL-04`, `POL-10`..`POL-14` — a Política de Privacidade.
//
// **O texto base é o que a loja publica hoje** em `umaestrelinha.com.br/politica-de-privacidade/`,
// e ele foi preservado parágrafo a parágrafo (`POL-10`): é a Adri falando na primeira pessoa, e a voz
// dela não é copy a reescrever. O que esta página acrescenta é o que faltava para a política deixar
// de ser genérica — e **só o que a loja de fato faz**:
//
// - a **LGPD** e os direitos da titular, com o canal para exercê-los (`POL-11`);
// - **com quem** o dado é compartilhado, nomeado (`POL-12`) — pagamento, entrega e e-mail. Nada
//   além: afirmar tratamento que a loja não pratica é a mesma classe de defeito que a newsletter
//   prometendo e-mail que ninguém envia (`FIX-04`);
// - o **consentimento de marketing** citado do lugar onde ele é pedido (`POL-13`);
// - o **material afetivo** (`POL-14`), que é a coisa mais íntima que chega a esta loja e sobre a
//   qual o texto original é calado.
//
// O que esta página NÃO faz: inventar encarregado de dados, prazo de retenção ou base legal que a
// operação não tenha. Uma política que descreve um programa de privacidade inexistente é pior que
// uma política curta — ela é declaração falsa assinada pela dona.

import { Link } from 'react-router-dom'
import { MATERIAL_GUIDE_PATH, PRIVACY_POLICY_PATH } from '@estrelinha/core/routes'
import PolicyContact from '@/shared/ui/PolicyContact'
import PolicyDocument, { PolicyList, PolicySection } from '@/shared/ui/PolicyDocument'
import { MARKETING_CONSENT_LABEL } from '@/shared/lib/consent'
import { useCanonical } from '@/shared/lib/useCanonical'

// O endereço vem de `@estrelinha/core/routes` pelo mesmo motivo do irmão — ver `ReturnsPolicyPage`.

/**
 * Os direitos da titular, na ordem do art. 18 da LGPD.
 *
 * Um item por direito, e não um parágrafo que os resuma (`L-010`): a AC enumera uma lista, e resumo
 * é onde um deles desaparece sem ninguém notar.
 */
const DIREITOS_LGPD = [
  'Confirmar que tratamos dados seus e acessar o que temos;',
  'Corrigir dado incompleto, desatualizado ou errado;',
  'Pedir a eliminação dos dados tratados com o seu consentimento;',
  'Saber com quem compartilhamos os seus dados;',
  'Pedir a portabilidade dos seus dados a outro fornecedor;',
  'Revogar o consentimento que você tenha dado, a qualquer momento.',
]

/**
 * Com quem o dado é compartilhado — `POL-12`.
 *
 * Cada linha descreve um compartilhamento que **acontece de verdade** no caminho de um pedido desta
 * loja. Nenhuma menciona publicidade, perfilamento ou venda de base: a primeira frase da política
 * original já diz que isso não existe aqui, e repeti-lo como ressalva enfraqueceria a afirmação.
 */
const COM_QUEM_COMPARTILHAMOS = [
  'Meio de pagamento, para processar a cobrança — os dados do seu cartão são digitados no ambiente dele e não ficam guardados conosco;',
  'Transportadora e Correios, para levar a encomenda até o seu endereço;',
  'Serviço de envio de e-mail, para mandar a confirmação do pedido e os avisos sobre ele.',
]

const PrivacyPolicyPage = () => {
  useCanonical(PRIVACY_POLICY_PATH)

  return (
    <PolicyDocument
      titulo="Política de Privacidade"
      paginaAtual="Política de privacidade"
      abertura={
        <>
          <p>
            Eu, <strong>Adri Muniz</strong>, representante da loja <strong>Uma Estrelinha</strong>,
            tenho o compromisso com a sua privacidade e a segurança dos clientes durante todo o
            processo de navegação e compra pelo site.
          </p>
          <p>
            Esta política explica quais dados a loja recebe, para que eles servem, com quem são
            compartilhados e o que você pode pedir a respeito deles, de acordo com a Lei Geral de
            Proteção de Dados Pessoais (Lei nº 13.709/2018).
          </p>
        </>
      }
    >
      <PolicySection titulo="O que a loja guarda">
        <p>
          Guardamos o que é necessário para atender você e entregar o seu pedido: nome, e-mail,
          telefone ou WhatsApp, endereço de entrega, os dados exigidos para a emissão da cobrança e o
          histórico dos pedidos que você fez aqui.
        </p>
        <p>
          Vale lembrar que seus dados são registrados pela loja Uma Estrelinha de forma automatizada,
          dispensando manipulação humana.
        </p>
      </PolicySection>

      <PolicySection titulo="Para que os seus dados são usados">
        <p>
          Seus dados pessoais são peça fundamental para que seu pedido chegue em segurança, na sua
          casa, de acordo com nosso prazo de entrega.
        </p>
        <p>
          Eles também são usados para falar com você sobre o pedido — confirmação, andamento da
          produção, envio e entrega — e para responder às suas dúvidas pelos canais de atendimento.
        </p>
      </PolicySection>

      <PolicySection titulo="Com quem os seus dados são compartilhados">
        <p>
          Os dados cadastrais de clientes não são vendidos, trocados ou divulgados para terceiros,
          exceto quando essas informações são necessárias para o processo de entrega, para cobrança,
          ou para participação em promoções previamente solicitadas e autorizadas pelos clientes.
        </p>
        <p>Na prática, isso significa compartilhar o mínimo necessário com:</p>
        <PolicyList itens={COM_QUEM_COMPARTILHAMOS} />
      </PolicySection>

      <PolicySection titulo="O material afetivo que você envia">
        <p>
          Quando a sua joia é feita com material afetivo — cinzas de cremação, leite materno, mecha de
          cabelo, pelo de pet, dente de leite, coto umbilical, flores —, esse material é usado
          exclusivamente para produzir a sua peça.
        </p>
        <p>
          Ele não é usado na peça de outra pessoa. Usamos apenas o necessário para a joia e
          devolvemos o restante junto com a sua peça, na mesma embalagem — como está explicado no{' '}
          <Link
            to={MATERIAL_GUIDE_PATH}
            className="font-medium text-estrelinha-primary underline underline-offset-4 hover:text-estrelinha-primary-strong"
          >
            guia de envio de material
          </Link>
          .
        </p>
        <p>
          Sabemos o que esse material representa. Ele chega aqui com a história de alguém, e é tratado
          com o mesmo cuidado que essa história merece.
        </p>
      </PolicySection>

      <PolicySection titulo="Lembretes e novidades por e-mail">
        <p>
          No checkout existe uma caixa de seleção, <strong>opcional</strong>, com o texto: “
          {MARKETING_CONSENT_LABEL}”
        </p>
        <p>
          Marcá-la é o que nos autoriza a escrever para você sobre a loja e a lembrá-la de um carrinho
          que ficou pela metade. Deixá-la desmarcada não muda nada no seu pedido — você continua
          recebendo os e-mails sobre a compra, que não são publicidade.
        </p>
        <p>
          Você pode cancelar quando quiser, pelos canais de atendimento ou pelo link de cancelamento
          do próprio e-mail.
        </p>
      </PolicySection>

      <PolicySection titulo="Cookies e navegação">
        <p>
          A loja Uma Estrelinha utiliza cookies e informações de sua navegação (sessão do browser) com
          o objetivo de traçar um perfil do público que visita o site e aperfeiçoar sempre nossos
          serviços, produtos, conteúdos e garantir as melhores ofertas e promoções para você.
        </p>
        <p>
          Parte dessas informações fica guardada apenas no seu próprio navegador — é o que mantém a
          sua sacola e a sua lista de favoritos entre uma visita e outra. Limpar os dados do site no
          navegador apaga essas informações.
        </p>
      </PolicySection>

      <PolicySection titulo="Segurança e sigilo">
        <p>Durante todo este processo mantemos suas informações em sigilo absoluto.</p>
        <p>
          Para que estes dados permaneçam intactos, nós desaconselhamos expressamente a divulgação de
          sua senha a terceiros, mesmo a amigos e parentes.
        </p>
      </PolicySection>

      <PolicySection titulo="Os seus direitos">
        <p>A Lei Geral de Proteção de Dados Pessoais garante a você, a qualquer momento:</p>
        <PolicyList itens={DIREITOS_LGPD} />
        <p>
          Para exercer qualquer um deles, fale com a gente. Respondemos pelo mesmo canal em que você
          escrever.
        </p>
        <PolicyContact assunto="política de privacidade" />
        <p>
          Alguns dados precisam ser mantidos mesmo depois de um pedido de exclusão, quando a lei
          obriga — é o caso dos registros fiscais de uma compra já realizada.
        </p>
      </PolicySection>

      <PolicySection titulo="Alterações nesta política">
        <p>As alterações sobre nossa política de privacidade serão devidamente informadas neste espaço.</p>
      </PolicySection>
    </PolicyDocument>
  )
}

export default PrivacyPolicyPage
