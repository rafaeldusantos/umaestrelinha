import { Instagram } from 'lucide-react'
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '@/shared/config/instagram'

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
 *
 * O arroba é uma palavra só: com a fonte do celular a 200 % em 390 ele passava da borda e o body
 * rolava de lado (`BUG-20261027-rodape-da-loja-rola-de-lado-com-fonte-200`). `max-w-full` com
 * `overflow-wrap: anywhere` o deixa quebrar dentro da faixa.
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
    <span className="max-w-full font-display text-2xl font-bold text-estrelinha-on-primary [overflow-wrap:anywhere]">
      {INSTAGRAM_HANDLE}
    </span>
  </a>
)

export default InstagramStrip
