/**
 * Contrato dos ícones desenhados para a Uma Estrelinha.
 *
 * Mesma assinatura do `PixIcon` que já existia em `shared/ui`: **sem `width`/`height`**, porque o
 * tamanho vem por `className` — exatamente como nos ícones lucide ao lado dos quais eles vivem. Um
 * ícone que carrega tamanho próprio brigaria com o `h-4 w-4` do vizinho e a linha ficaria torta.
 */
export interface IconProps {
  className?: string
  'aria-hidden'?: boolean
}

/**
 * A grade é UMA: `viewBox="0 0 24 24"`, e todo traço mede **1,5** nessa grade.
 *
 * É o que faz um conjunto de ícones parecer um conjunto. Dois desenhos com pesos diferentes lado a
 * lado leem como dois autores, e o defeito não quebra nada — só fica feio, que é a pior categoria de
 * defeito para pegar em review. `icons.test.tsx` lê estes arquivos do disco e falha quando aparece
 * outra grade ou outro peso.
 *
 * Os quatro ícones do guia de material nasceram numa grade de 40 no Paper; em vez de reescrever
 * coordenada por coordenada (que deforma o desenho sem quebrar nada visível — a mesma lição do
 * `paths.ts` da marca), eles entram dentro de um `<g transform="scale(0.6)">` com traço 2,5:
 * 2,5 × 0,6 = **1,5**, o mesmo peso dos demais.
 */
export const ICON_VIEW_BOX = '0 0 24 24'
export const ICON_STROKE = 1.5
/** Traço declarado dentro de um grupo `scale(0.6)` para render em 1,5 na grade de 24. */
export const ICON_STROKE_G40 = 2.5
/** Escala do grupo que traz um desenho de grade 40 para a grade de 24. */
export const ICON_SCALE_G40 = 0.6

/**
 * O detalhe dourado é **fixo**, e é `accent-strong`, não `accent`.
 *
 * O contorno estrutural herda `currentColor` (o ícone acompanha o texto ao lado), mas o realce sai
 * sempre no mesmo ouro para o conjunto não mudar de humor a cada superfície. `accent` (#B8945F)
 * mede 2,66:1 sobre o chão claro e **reprova** até como elemento gráfico, que pede 3:1;
 * `accent-strong` (#A07E4C) mede 3,55:1 e passa. Ver `DESIGN.md` §2.
 */
export const ICON_ACCENT = 'var(--estrelinha-accent-strong)'
