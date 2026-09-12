// Feature 45 / `POL-01`, `POL-04`..`POL-09` — a Política de Trocas, Devoluções e Arrependimento.
//
// **O texto é da dona e veio pronto.** Ele não é copy de marketing a ser melhorada: é a posição da
// loja sobre cancelamento, defeito e arrependimento, e cada frase dele tem consequência com a
// cliente. As únicas coisas que esta página muda em relação ao original são as duas que o
// repositório exige:
//
// 1. **O `✨` do fecho virou estrela desenhada** (`POL-07`). `copyInstitucional.test.tsx` recusa emoji
//    nesta loja, e a recusa é do negócio e não do teste — emoji comemorativo ao lado de "quando
//    alguém que amamos parte" é a loja rindo na frente de quem perdeu alguém. Mesmo desvio que a
//    feature 29 fez na Sobre (`SOB-10`).
// 2. **"pelo WhatsApp ou canal de atendimento informado no site" virou o canal de verdade**
//    (`POL-09`), lido de `store_settings`. Cravar número ou e-mail no JSX é o defeito que `PDP-24`
//    consertou nesta mesma família de páginas: a página passa a mentir no dia em que a dona muda o
//    contato no painel, e nada acusa.
//
// O que a página NÃO faz: prometer prazo, custo ou resultado que a análise individual vai decidir. O
// texto antigo de `/politicas` dizia "Faremos a troca sem custo adicional", e numa peça feita com
// material insubstituível da própria cliente isso é promessa que a Adri não tem como cumprir.

import { RETURNS_POLICY_PATH } from '@estrelinha/core/routes'
import { EstrelinhaStarIcon } from '@estrelinha/ui/icons'
import PolicyContact from '@/shared/ui/PolicyContact'
import PolicyDocument, {
  PolicyList,
  PolicyNote,
  PolicySection,
  PolicySubsection,
} from '@/shared/ui/PolicyDocument'
import { useCanonical } from '@/shared/lib/useCanonical'

// O endereço vem de `@estrelinha/core/routes`, e **não** é declarado aqui: quem linka para esta
// página (o rodapé, um `widget`; o índice, outra `page`) não pode importar deste módulo — o rodapé
// pela regra de camadas, e o índice porque puxar o módulo irmão por uma string arrastaria o chunk
// inteiro desta política para dentro do chunk dele, desfazendo o `PRF-16` em silêncio.

const NAO_E_DEFEITO = [
  'Oxidação natural da prata, que pode ocorrer devido ao contato com o ambiente, suor, produtos químicos e outros fatores;',
  'Desgaste natural de banhos ou folheações, causado pelo uso, atrito, contato com água, perfumes, cremes e produtos químicos;',
  'Pequenas marcas decorrentes do uso normal da peça;',
  'Danos provocados por quedas, impactos ou utilização inadequada;',
  'Alterações decorrentes da falta dos cuidados recomendados.',
]

const O_QUE_INFORMAR = [
  'Nome completo;',
  'Número do pedido;',
  'Data da compra;',
  'Motivo da solicitação;',
  'Fotos ou vídeos da peça, quando necessário.',
]

const EVITE = [
  'Quedas e impactos;',
  'Exposição prolongada ao sol e calor;',
  'Piscina e água do mar;',
  'Banhos utilizando a joia;',
  'Perfumes, cremes e produtos químicos diretamente sobre a peça;',
  'Produtos abrasivos durante a limpeza.',
]

const ReturnsPolicyPage = () => {
  useCanonical(RETURNS_POLICY_PATH)

  return (
    <PolicyDocument
      titulo="Política de Trocas, Devoluções e Arrependimento"
      paginaAtual="Trocas e devoluções"
      abertura={
        <>
          <p>
            Na Uma Estrelinha, cada peça é produzida com cuidado, utilizando materiais selecionados e
            técnicas artesanais para transformar histórias e sentimentos em lembranças únicas.
          </p>
          <p>
            Sabemos que, especialmente no caso das joias afetivas, você não está enviando apenas um
            material. Está confiando a nós uma parte importante da sua história.
          </p>
          <p>
            Por isso, buscamos trabalhar com transparência, responsabilidade e respeito ao
            consumidor, seguindo as normas aplicáveis do Código de Defesa do Consumidor (Lei nº
            8.078/1990).
          </p>
          <p>
            Abaixo, explicamos como funcionam as situações de troca, devolução e arrependimento.
          </p>
        </>
      }
    >
      <PolicySection titulo="Joias afetivas, produtos artesanais e personalizados">
        <p>
          As joias afetivas da Uma Estrelinha são produzidas artesanalmente e de forma personalizada,
          utilizando o material afetivo enviado pelo próprio cliente.
        </p>
        <p>
          Cada peça é confeccionada especificamente para você e, por sua natureza personalizada, não
          é um produto de fabricação em massa ou destinado à revenda.
        </p>
        <p>
          Por isso, pedidos de cancelamento, devolução ou desistência relacionados a produtos
          personalizados serão analisados individualmente, considerando a natureza da peça, o estágio
          de produção e a legislação aplicável.
        </p>
        <p>
          Antes de iniciar a produção, recomendamos que você tenha certeza sobre o modelo, acabamento,
          tamanho e demais características escolhidas.
        </p>
      </PolicySection>

      <PolicySection titulo="Importante sobre o processo artesanal">
        <p>
          Por serem peças produzidas manualmente, podem existir pequenas diferenças entre uma joia e
          outra.
        </p>
        <p>
          Pequenas bolhas de ar, variações naturais de tonalidade, pequenas diferenças de
          posicionamento do material afetivo e micro marcas inerentes ao processo artesanal não
          caracterizam, por si só, defeito de fabricação.
        </p>
        <p>
          Essas características fazem parte da singularidade de uma peça artesanal e tornam cada joia
          única.
        </p>
      </PolicySection>

      <PolicySection titulo="E se minha joia apresentar um defeito de fabricação?">
        <p>
          Se você identificar algum problema que possa caracterizar defeito ou vício de fabricação,
          entre em contato conosco assim que possível.
        </p>
        <p>
          A peça será encaminhada para análise técnica, para que possamos identificar a causa do
          problema e indicar a solução adequada, de acordo com a legislação aplicável.
        </p>
        <p>
          Dependendo do caso, poderemos realizar o reparo, refazer a peça quando tecnicamente
          possível ou adotar outra solução prevista na legislação.
        </p>
      </PolicySection>

      <PolicySection titulo="E no caso das joias afetivas?">
        <p>
          Nas joias afetivas, a análise também precisa considerar o material afetivo que foi enviado
          para a produção.
        </p>
        <p>
          Como se trata de um material único e, muitas vezes, insubstituível, a possibilidade de
          refazer uma peça dependerá da quantidade de material que ainda estiver disponível e das
          características do problema identificado.
        </p>
        <p>Por isso, entre em contato conosco antes de realizar qualquer procedimento na peça.</p>
      </PolicySection>

      <PolicySection titulo="Semijoias e joias de prata não personalizadas">
        <p>
          As semijoias e joias de prata que não possuem personalização seguem as regras aplicáveis às
          compras realizadas pela internet.
        </p>

        <PolicySubsection titulo="Posso desistir da compra?">
          <p>
            Nas compras realizadas fora do estabelecimento comercial, como pela internet, o
            consumidor possui o direito de arrependimento no prazo de 7 dias, contado da assinatura
            do contrato ou do recebimento do produto, conforme o artigo 49 do Código de Defesa do
            Consumidor.
          </p>
          <p>
            Caso queira exercer esse direito, entre em contato conosco dentro do prazo legal para
            receber as orientações sobre o procedimento de devolução.
          </p>
          <p>
            O produto deverá ser devolvido em condições compatíveis com a sua natureza,
            preferencialmente em sua embalagem original e acompanhado dos acessórios que o acompanham.
          </p>
          <p>O exercício do direito de arrependimento será tratado conforme a legislação vigente.</p>
        </PolicySubsection>

        <PolicySubsection titulo="Posso trocar uma semijoia ou joia de prata porque mudei de ideia?">
          <p>
            A troca por preferência pessoal, como mudança de modelo, cor ou estilo, não se confunde
            com a garantia legal por defeito.
          </p>
          <p>
            Para produtos não personalizados, eventual troca por mera preferência seguirá as
            condições informadas pela Uma Estrelinha no momento da compra, sem prejuízo dos direitos
            assegurados pela legislação.
          </p>
        </PolicySubsection>
      </PolicySection>

      <PolicySection titulo="O que não é considerado defeito de fabricação?">
        <p>Algumas alterações são naturais e podem ocorrer com o uso da peça. Por exemplo:</p>
        <PolicyList itens={NAO_E_DEFEITO} />
        <p>Essas situações podem não caracterizar defeito de fabricação e serão avaliadas individualmente.</p>
      </PolicySection>

      <PolicySection titulo="Como solicitar uma troca ou devolução?">
        <p>
          Para solicitar uma troca, devolução ou análise de possível defeito, entre em contato conosco
          por um destes canais:
        </p>
        <PolicyContact assunto="política de trocas e devoluções" />
        <p>Informe:</p>
        <PolicyList itens={O_QUE_INFORMAR} />
        <p>Após recebermos as informações, orientaremos você sobre os próximos passos.</p>
        {/* `POL-08`. É a instrução operacional mais cara da página: peça que chega ao ateliê sem
            aviso não tem pedido a que se ligar, e o material dentro dela é insubstituível. */}
        <PolicyNote>Não envie a peça sem antes entrar em contato conosco.</PolicyNote>
      </PolicySection>

      <PolicySection titulo="Cuidados com a peça">
        <p>
          Para preservar sua joia por mais tempo, recomendamos seguir as orientações de conservação
          fornecidas pela Uma Estrelinha.
        </p>
        <p>Evite:</p>
        <PolicyList itens={EVITE} />
        <p>
          Os cuidados adequados ajudam a preservar tanto a resina quanto os metais e acabamentos da
          joia.
        </p>
      </PolicySection>

      <PolicySection titulo="Nosso compromisso">
        <p>A Uma Estrelinha nasceu para eternizar histórias.</p>
        <p>
          Por isso, sabemos que cada material enviado para nós tem um significado especial e merece
          ser tratado com cuidado, responsabilidade e respeito.
        </p>
        <p>
          Nossa prioridade é oferecer uma experiência segura, transparente e acolhedora, desde o
          momento da compra até a entrega da sua joia.
        </p>
        <p>
          Em qualquer situação não prevista nesta política, serão observadas as disposições da
          legislação brasileira vigente, especialmente o Código de Defesa do Consumidor.
        </p>
        {/* O `✨` do texto original vira a estrela desenhada — `POL-07`, mesmo desvio de `SOB-10`. */}
        <p className="flex items-center gap-2.5 font-display text-[19px] italic leading-8 text-estrelinha-primary md:text-[22px]">
          Uma Estrelinha — eternizando suas lembranças.
          <EstrelinhaStarIcon
            aria-hidden
            className="h-[22px] w-[22px] shrink-0 text-estrelinha-accent-strong"
          />
        </p>
      </PolicySection>
    </PolicyDocument>
  )
}

export default ReturnsPolicyPage
