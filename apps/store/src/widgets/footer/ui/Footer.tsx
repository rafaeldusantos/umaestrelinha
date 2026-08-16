import { Link } from 'react-router-dom'
import { Instagram } from 'lucide-react'
import { browseCategories, useCategories } from '@/entities/category'
import { categoryHref } from '@estrelinha/core/menu'
import { MATERIAL_GUIDE_PATH } from '@estrelinha/core/routes'
import { EstrelinhaSignature } from '@/shared/ui/brand'
import { TAP_ROW } from '@/shared/lib/touchTarget'
import InstagramStrip, { INSTAGRAM_URL } from './InstagramStrip'

const PAYMENTS = ['Pix', 'Visa', 'Master', 'Elo']

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
              {/* Feature 22: a pergunta que a operação mais responde. Fica em "Ajuda", e não em
                  "Institucional", porque é instrução de uso — a cliente procura isso com o envelope
                  na mão, não navegando pela loja. */}
              <FooterLink to={MATERIAL_GUIDE_PATH}>Como enviar o material</FooterLink>
              <FooterLink to="/politicas#trocas">Trocas e devoluções</FooterLink>
              <FooterLink to="/politicas">Políticas</FooterLink>
              <FooterLink to="/sobre">Contato</FooterLink>
            </FooterColumn>

            <FooterColumn title="Institucional">
              <FooterLink to="/politicas#termos">Termos de uso</FooterLink>
              <FooterLink to="/politicas#privacidade">Política de privacidade</FooterLink>
              <FooterLink to="/sobre">Sobre nós</FooterLink>
            </FooterColumn>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center gap-4 border-t border-estrelinha-line pt-7 sm:flex-row sm:justify-between">
          <p className="text-[12px] font-light text-estrelinha-ink-soft">
            Joias afetivas · leite materno, cinzas, cabelos, dentes e placenta · ©{' '}
            {new Date().getFullYear()} Uma Estrelinha. Todos os direitos reservados.
          </p>
          <div className="flex gap-2">
            {PAYMENTS.map((p) => (
              <span
                key={p}
                className="rounded-sm border border-estrelinha-line bg-estrelinha-surface px-3.5 py-1.5 text-xs font-semibold text-estrelinha-ink-soft"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
