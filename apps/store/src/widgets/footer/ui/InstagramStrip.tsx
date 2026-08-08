import { Instagram } from 'lucide-react'

/** O perfil da Adri — a única rede que a loja tem, e a que o board nomeia. */
export const INSTAGRAM_HANDLE = '@umaestrelinha.adri'
export const INSTAGRAM_URL = 'https://instagram.com/umaestrelinha.adri'

/**
 * A faixa do Instagram — board `67P-0`.
 *
 * Uma faixa `ink` fechando a página, com o arroba em display de 24px. Ela mora
 * dentro do `Footer` de propósito: no board ela é a última banda antes do
 * rodapé, e o rodapé é chrome do layout — montá-la na home a deixaria de fora
 * de coleção, produto, conta e políticas, que é onde a cliente mais passa.
 *
 * O contraste é o que decide as duas cores: `on-primary` sobre `ink` mede
 * 11,89:1, e o ponto do ícone é `accent` — objeto gráfico de 2,4px, onde a
 * regra é 3:1 e não 4,5:1. **Nenhum texto desta faixa é ouro.**
 */
const InstagramStrip = () => (
  <a
    href={INSTAGRAM_URL}
    target="_blank"
    rel="noreferrer"
    data-testid="instagram-strip"
    className="flex flex-col items-center gap-2.5 bg-estrelinha-ink px-6 py-11 text-center transition-colors hover:bg-estrelinha-primary-strong"
  >
    <Instagram className="h-[34px] w-[34px] text-estrelinha-on-primary" strokeWidth={1.4} />
    <span className="text-sm font-light text-estrelinha-on-primary/85">Siga-nos no Instagram</span>
    <span className="font-display text-2xl font-bold text-estrelinha-on-primary">
      {INSTAGRAM_HANDLE}
    </span>
  </a>
)

export default InstagramStrip
