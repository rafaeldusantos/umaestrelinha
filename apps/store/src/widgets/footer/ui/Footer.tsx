import { Link } from 'react-router-dom'
import { Instagram, Music2, Twitter } from 'lucide-react'
import { browseCategories, useCategories } from '@/entities/category'
import { EstrelinhaSignature } from '@/shared/ui/brand'

const PAYMENTS = ['Pix', 'Visa', 'Master', 'Elo']

const SOCIALS = [
  { label: 'Instagram', href: 'https://instagram.com/nanita.store', Icon: Instagram },
  { label: 'TikTok', href: 'https://tiktok.com/@nanita.store', Icon: Music2 },
  { label: 'Twitter', href: 'https://twitter.com/nanitastore', Icon: Twitter },
]

/**
 * Coluna de links do rodapé.
 *
 * O título em Carimbo é o único acento de cor da coluna, e os links vão de
 * DOBRA — não de véu de branco. Sobre Grafite, Dobra lê a 11,72:1 e é a mesma
 * cor do descritor do lockup, então a coluna e a marca ficam na mesma família
 * em vez de o texto parecer "branco apagado".
 */
const FooterColumn = ({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) => (
  <div className="flex flex-col gap-3.5">
    <h4 className="estrelinha-eyebrow tracking-[0.1em] text-estrelinha-accent">{title}</h4>
    <ul className="flex flex-col gap-3.5">{children}</ul>
  </div>
)

const FooterLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <li>
    <Link
      to={to}
      className="text-[13px] text-estrelinha-line transition-colors hover:text-estrelinha-accent md:text-[15px]"
    >
      {children}
    </Link>
  </li>
)

const Footer = () => {
  const { data: categories } = useCategories()

  return (
    <footer className="mt-16 bg-estrelinha-ink">
      <div className="container pb-8 pt-14">
        <div className="flex flex-col gap-14 md:flex-row md:justify-between">
          <div className="flex max-w-[320px] flex-col gap-4">
            {/* **O lockup completo NÃO cabe no rodapé, e isso é medido.** O
                piso dele é 600px — abaixo disso a linha "ETERNIZANDO SUAS
                LEMBRANÇAS" (traço 1,5 em 900 de largura) rende menos de um
                pixel e some. Esta coluna tem 320px. Pedir o lockup aqui só
                renderizaria a assinatura visual com um passo a mais; então
                pede-se a assinatura, que é o que de fato aparece.

                O tom é `onInk` porque o fundo é `ink`: a marca sai em
                `on-primary` #F7F3EC. `brand` pintaria #283A4A sobre #23303A —
                1,15:1, um rodapé com um vazio no lugar da marca. */}
            <Link to="/" aria-label="Uma Estrelinha — página inicial">
              <EstrelinhaSignature width={240} tone="onInk" />
            </Link>
            <p className="text-[15px] leading-relaxed text-white/70">
              Bottons feitos à mão para gente que vive de cultura pop. Um pin por vez, desde 2023.
            </p>
            <div className="flex gap-2.5 pt-1.5">
              {SOCIALS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white/[0.08] transition-colors hover:bg-white/[0.16]"
                >
                  <Icon className="h-[18px] w-[18px] text-estrelinha-accent" strokeWidth={1.7} />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:flex md:gap-14">
            <FooterColumn title="Loja">
              <FooterLink to="/busca?sort=novidades">Novidades</FooterLink>
              <FooterLink to="/busca?sort=populares">Em alta</FooterLink>
              <FooterLink to="/busca">Coleções</FooterLink>
            </FooterColumn>

            {/* Mesma regra da grade da home: pula o guarda-chuva (ver `browseCategories`). */}
            <FooterColumn title="Categorias">
              {browseCategories(categories).slice(0, 4).map((cat) => (
                <FooterLink key={cat.slug} to={`/colecao/${cat.slug}`}>
                  {cat.name}
                </FooterLink>
              ))}
            </FooterColumn>

            <FooterColumn title="Ajuda">
              <FooterLink to="/conta">Meus pedidos</FooterLink>
              <FooterLink to="/politicas#trocas">Trocas</FooterLink>
              <FooterLink to="/politicas">Políticas</FooterLink>
              <FooterLink to="/sobre">Contato</FooterLink>
            </FooterColumn>

            <FooterColumn title="Legal">
              <FooterLink to="/politicas#termos">Termos de uso</FooterLink>
              <FooterLink to="/politicas#privacidade">Privacidade</FooterLink>
              <FooterLink to="/sobre">Sobre a Nanita</FooterLink>
            </FooterColumn>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center gap-4 border-t border-white/[0.12] pt-7 sm:flex-row sm:justify-between">
          <p className="text-[11px] text-white/50 md:text-[13px]">
            Feito com amor pela Nana — © {new Date().getFullYear()} Nanita
          </p>
          <div className="flex gap-2">
            {PAYMENTS.map((p) => (
              <span
                key={p}
                className="rounded-sm bg-white/[0.08] px-3.5 py-1.5 text-xs font-semibold text-white/80"
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
