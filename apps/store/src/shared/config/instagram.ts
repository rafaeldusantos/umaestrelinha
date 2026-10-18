/**
 * O perfil da Adri no Instagram — a única rede que a loja tem.
 *
 * Mora em `shared` porque dois widgets o leem (a faixa do rodapé e o convite da Home), e widget não
 * importa de widget. Uma grafia só da URL, com `www`: duas grafias do mesmo endereço são
 * duas coisas para conferir quando o perfil mudar.
 */
export const INSTAGRAM_HANDLE = '@umaestrelinha.adri'
export const INSTAGRAM_URL = 'https://www.instagram.com/umaestrelinha.adri'

/**
 * As cores da marca do Instagram — o V2 do convite (Paper, "IG A V2" e "IG B V2").
 *
 * Ficam aqui, e NÃO na paleta `estrelinha` (`App.css` × `tailwind.config.ts`): são a marca de
 * outra empresa, usadas só no convite, e entrar na paleta as ofereceria a qualquer tela da loja.
 * O precedente é o mesmo do WhatsApp — a cor do terceiro mora junto do terceiro.
 *
 * Duas escalas, porque têm trabalhos diferentes:
 * - `INSTAGRAM_GLYPH_STOPS` é o gradiente inteiro do ícone e do anel de story (amarelo → azul).
 *   É desenho, nunca fundo de texto.
 * - `INSTAGRAM_CTA_STOPS` é só o trecho escuro (magenta → roxo → azul), o fundo do botão. O
 *   amarelo e o laranja ficam de fora porque texto branco sobre eles não passa de 4,5:1 — e
 *   `instagramPalette.test.ts` calcula a razão de cada parada contra o branco.
 */
export const INSTAGRAM_GLYPH_STOPS = ['#FEDA75', '#FA7E1E', '#D62976', '#962FBF', '#4F5BD5'] as const
export const INSTAGRAM_CTA_STOPS = ['#C13584', '#833AB4', '#405DE6'] as const

/** O texto sobre o botão do Instagram. */
export const INSTAGRAM_CTA_TEXT = '#FFFFFF'

const linear = (angulo: string, paradas: readonly string[]) =>
  `linear-gradient(${angulo}, ${paradas
    .map((cor, i) => `${cor} ${Math.round((i / (paradas.length - 1)) * 100)}%`)
    .join(', ')})`

/** O anel de story do avatar: o gradiente inteiro, a 45°, como no app. */
export const INSTAGRAM_RING_GRADIENT = linear('45deg', INSTAGRAM_GLYPH_STOPS)
/** O fundo do botão "Ver o perfil no Instagram". */
export const INSTAGRAM_CTA_GRADIENT = linear('90deg', INSTAGRAM_CTA_STOPS)
