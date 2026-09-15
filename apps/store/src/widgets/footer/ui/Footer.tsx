import { Link } from 'react-router-dom'
import { Instagram } from 'lucide-react'
import { browseCategories, useCategories } from '@/entities/category'
import { categoryHref } from '@estrelinha/core/menu'
import {
  FAQ_PATH,
  JEWELRY_CARE_PATH,
  MATERIAL_GUIDE_PATH,
  PRIVACY_POLICY_PATH,
  RETURNS_POLICY_PATH,
} from '@estrelinha/core/routes'
import { EstrelinhaSignature } from '@/shared/ui/brand'
import { TAP_ROW } from '@/shared/lib/touchTarget'
import InstagramStrip, { INSTAGRAM_URL } from './InstagramStrip'

/**
 * As bandeiras que o CAIXA processa — não as que vieram no conjunto da arte.
 *
 * Conferido contra a conta do Mercado Pago da loja em 2026-09-14
 * (`GET /v1/payment_methods`): `visa`, `master`, `amex` e `elo` ativos, mais o
 * Pix que o `PixPayment` emite. **Hipercard e o cartão Bradesco ficaram de
 * fora**, e a ausência é a decisão: a conta não os processa, e anunciar
 * bandeira que o caixa recusa é o defeito da `MarqueeBar` de novo — a loja
 * prometendo uma coisa e o caixa cobrando outra, sem nada acusar. Quem só tem
 * Hipercard chegaria ao pagamento pelo rodapé e levaria a recusa lá.
 *
 * **A arte é servida por NÓS** (`public/pagamentos/`), e não pelo CDN de onde
 * ela veio: endereço de terceiro muda sem avisar, e o rodapé ficaria com cinco
 * quadrados quebrados sem um erro em lugar nenhum. De quebra, o
 * `Referrer-Policy` da loja deixa de anunciar cada visita a um host alheio.
 */
const PAYMENTS = [
  { alt: 'Visa', src: '/pagamentos/visa.png' },
  { alt: 'Mastercard', src: '/pagamentos/mastercard.png' },
  { alt: 'American Express', src: '/pagamentos/amex.png' },
  { alt: 'Elo', src: '/pagamentos/elo.png' },
  { alt: 'Pix', src: '/pagamentos/pix.png' },
]

/**
 * **Uma rede só, e é de propósito.** O board nomeia o Instagram da Adri; os
 * perfis de TikTok e Twitter que estavam aqui eram da loja anterior. Inventar
 * um arroba para preencher a fileira publicaria um link quebrado com cara de
 * oficial.
 */
const SOCIALS = [{ label: 'Instagram', href: INSTAGRAM_URL, Icon: Instagram }]

/**
 * Coluna de links do rodapé.
 *
 * O título é `ink` em display (`68V-0`), e não mais um eyebrow em acento: sobre
 * o chão claro, `accent` mede 2,66:1 e é **proibido como texto**. Os links vão
 * de `ink-soft`, o piso de 6,00:1.
 */
const FooterColumn = ({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) => (
  <div className="flex flex-col gap-3.5">
    <h4 className="font-display text-[16px] leading-5 text-estrelinha-ink">{title}</h4>
    <ul className="flex flex-col">{children}</ul>
  </div>
)

const FooterLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <li>
    <Link
      to={to}
      className={`${TAP_ROW} text-[13px] font-light text-estrelinha-ink-soft transition-colors hover:text-estrelinha-primary md:text-[13.5px]`}
    >
      {children}
    </Link>
  </li>
)

/**
 * O rodapé — board `68V-0`.
 *
 * **Ele deixou de ser escuro.** A `5MC-0` desenha o rodapé em `ground`, com
 * títulos `ink` em display e links `ink-soft`; o escuro passou para as duas
 * bandas acima dele (a faixa do Instagram, em `ink`, e a newsletter, em
 * `primary-strong`). É o fecho de página do board: duas bandas escuras e o
 * rodapé claro embaixo.
 *
 * A `6AU-0` (mobile) desenha o rodapé em `ink` — mas ela **não tem** nenhuma
 * das duas bandas, e é o rodapé que carrega o fecho escuro sozinho. Como as
 * duas bandas existem nesta loja nos dois tamanhos, o rodapé claro é o desenho
 * coerente com elas. Um rodapé que troca de superfície entre breakpoints seria
 * duas paletas para o mesmo bloco — exatamente o que a `palette.test.ts`
 * existe para impedir, em outra escala.
 *
 * Consequência que o `Footer.test.tsx` guarda: **o tom da marca inverteu junto**
 * — de `onInk` para `brand`. Pedir `onInk` sobre `ground` daria #F7F3EC sobre
 * #FAF8F4, 1,03:1: um rodapé com um vazio no lugar do logo. É o mesmo defeito
 * de antes, com os dois valores trocados de lado.
 */
const Footer = () => {
  const { data: categories } = useCategories()

  return (
    <footer className="mt-16 bg-estrelinha-ground">
      <InstagramStrip />

      <div className="container pb-8 pt-14">
        <div className="flex flex-col gap-14 md:flex-row md:justify-between">
          <div className="flex max-w-[320px] flex-col gap-4">
            {/* **O lockup completo NÃO cabe no rodapé, e isso é medido.** O
                piso dele é 600px — abaixo disso a linha "ETERNIZANDO SUAS
                LEMBRANÇAS" (traço 1,5 em 900 de largura) rende menos de um
                pixel e some. Esta coluna tem 320px. Pedir o lockup aqui só
                renderizaria a assinatura visual com um passo a mais; então
                pede-se a assinatura, que é o que de fato aparece.

                O tom é `brand` porque o fundo voltou a ser claro: a marca sai
                em `primary-strong` #283A4A sobre `ground` #FAF8F4, 11,03:1. */}
            <Link to="/" aria-label="Uma Estrelinha — página inicial">
              <EstrelinhaSignature width={240} />
            </Link>
            <p className="font-display text-[18px] leading-[26px] text-estrelinha-ink">
              Adri Muniz, eternizando suas lembranças
            </p>
            <p className="text-[13.5px] font-light leading-[22px] text-estrelinha-ink-soft">
              Joias afetivas artesanais em resina, feitas à mão com leite materno, cabelos, pelos de
              pet ou cinzas de cremação. Cada história que chega até aqui vira afeto em forma de
              joia.
            </p>
            <div className="flex gap-2.5 pt-1.5">
              {SOCIALS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-estrelinha-line bg-estrelinha-surface transition-colors hover:bg-estrelinha-ground-deep"
                >
                  <Icon className="h-[18px] w-[18px] text-estrelinha-primary" strokeWidth={1.7} />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:flex md:gap-14">
            <FooterColumn title="Loja">
              <FooterLink to="/busca?sort=novidades">Novidades</FooterLink>
              <FooterLink to="/busca?sort=populares">Em destaque</FooterLink>
              <FooterLink to="/busca">Coleções</FooterLink>
            </FooterColumn>

            {/* Mesma regra da grade da home: pula o guarda-chuva (ver `browseCategories`). */}
            <FooterColumn title="Categorias">
              {browseCategories(categories).slice(0, 4).map((cat) => (
                <FooterLink key={cat.slug} to={categoryHref(categories ?? [], cat.id)}>
                  {cat.name}
                </FooterLink>
              ))}
            </FooterColumn>

            <FooterColumn title="Ajuda">
              <FooterLink to="/conta">Meus pedidos</FooterLink>
              {/* Feature 46. Primeiro item de ajuda depois de "meus pedidos": é a página que responde
                  a dúvida de quem ainda NÃO comprou, e por isso ela vem antes das instruções de uso
                  do material, que só interessam a quem já comprou. */}
              <FooterLink to={FAQ_PATH}>Perguntas frequentes</FooterLink>
              {/* Feature 22: a pergunta que a operação mais responde. Fica em "Ajuda", e não em
                  "Institucional", porque é instrução de uso — a cliente procura isso com o envelope
                  na mão, não navegando pela loja. */}
              <FooterLink to={MATERIAL_GUIDE_PATH}>Como enviar o material</FooterLink>
              {/* Endereço literal do site em produção, lido em 2026-09-12 — mesma régua das duas
                  políticas abaixo. */}
              <FooterLink to={JEWELRY_CARE_PATH}>Cuidados com sua joia afetiva</FooterLink>
              {/* Feature 45 (`POL-17`). Era `/politicas#trocas`, e as três âncoras do rodapé
                  apontavam para `id` que `PoliciesPage` **nunca teve**: o `ScrollToTop` levava ao
                  topo da política, que é melhor que o meio da página e continua sendo link que não
                  vai aonde diz. Agora é uma página, com um endereço que chega ao servidor. */}
              <FooterLink to={RETURNS_POLICY_PATH}>Trocas e devoluções</FooterLink>
              {/* "Políticas" (o índice `/politicas`) e "Contato" (que só duplicava "Sobre nós", na
                  coluna ao lado, com outro rótulo) saíram por decisão do usuário em 2026-09-12. O
                  índice foi removido de vez — `PoliciesPage` não existe mais, ver `routes.ts`. */}
            </FooterColumn>

            <FooterColumn title="Institucional">
              {/* **"Termos de uso" SAIU daqui** (`POL-18`), e a ausência é a decisão.
                  `/politicas#termos` não tinha âncora **nem seção**: era um rótulo institucional
                  levando a uma página que não fala de termos. O `apps/store/CLAUDE.md` registrou o
                  caso como "consertar exige decisão de conteúdo, não `id`" — e a decisão é não
                  inventar termos de uso, que é redigir contrato no lugar da dona. O link volta no dia
                  em que existir o texto. */}
              <FooterLink to={PRIVACY_POLICY_PATH}>Política de privacidade</FooterLink>
              <FooterLink to="/sobre">Sobre nós</FooterLink>
            </FooterColumn>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center gap-4 border-t border-estrelinha-line pt-7 sm:flex-row sm:justify-between">
          <p className="text-[12px] font-light text-estrelinha-ink-soft">
            Joias afetivas · leite materno, cinzas, cabelos, dentes e placenta · ©{' '}
            {new Date().getFullYear()} Uma Estrelinha. Todos os direitos reservados.
          </p>
          {/* A moldura é a mesma pílula de antes (`surface` + `line`), e ela faz trabalho: a arte de
              quatro das cinco bandeiras vem com fundo BRANCO opaco e a do Pix vem transparente —
              soltas sobre `ground` #FAF8F4 seriam quatro retângulos brancos e um logo sem chão. O
              ladrilho branco some dentro das quatro e dá ao Pix o mesmo piso. A Amex é a exceção
              que confirma: a arte dela preenche a vaga inteira em azul, que é como o cartão é.

              A vaga é 52 × 32 para a proporção 150:93 da arte, e `object-contain` garante que uma
              arte de outra proporção encolha em vez de esticar. */}
          <ul
            aria-label="Formas de pagamento aceitas"
            className="flex flex-wrap items-center justify-center gap-2"
          >
            {PAYMENTS.map(({ alt, src }) => (
              <li
                key={alt}
                className="flex h-8 w-[52px] items-center justify-center overflow-hidden rounded-sm border border-estrelinha-line bg-estrelinha-surface"
              >
                <img
                  src={src}
                  alt={alt}
                  width={150}
                  height={93}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-contain"
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}

export default Footer
