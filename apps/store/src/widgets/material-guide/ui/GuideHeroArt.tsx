/**
 * A caixa aberta do hero (`5MC-0` / `6AU-0`).
 *
 * **Não é ícone, e por isso não mora em `@estrelinha/ui/icons`.** A biblioteca guarda pictogramas: uma
 * grade só, um traço só, tamanho vindo do `className`. Isto é uma **cena** — 300×230 no board, com
 * quatro pesos de traço, um vinco tracejado, a fita em ouro sólido e uma etiqueta de papel por cima.
 * Forçá-la na grade de 24 apagaria o vinco e a fita; deixá-la na biblioteca obrigaria o guarda dos
 * ícones a abrir exceção para o único arquivo que não é ícone. Mesma separação que a marca já pratica
 * em `shared/ui/brand`.
 *
 * Decorativa de ponta a ponta: `aria-hidden`, e o que ela ilustra está escrito ao lado.
 */
const GuideHeroArt = () => (
  <div className="relative flex aspect-[4/3] w-full max-w-[350px] items-center justify-center overflow-hidden rounded-lg bg-estrelinha-serenity md:max-w-[480px]">
    <svg
      viewBox="0 0 300 230"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-auto w-[72%]"
      aria-hidden
      focusable="false"
    >
      <path
        d="M28 78h244v122a12 12 0 0 1-12 12H40a12 12 0 0 1-12-12V78z"
        stroke="var(--estrelinha-primary)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M28 78l30-34h184l30 34"
        stroke="var(--estrelinha-primary)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* O vinco central: é ele que faz a caixa ler como aberta, e não como um quadrado. */}
      <path
        d="M150 44v168"
        stroke="var(--estrelinha-primary)"
        strokeWidth="1.4"
        strokeDasharray="6 7"
      />
      <path
        d="M104 112h92"
        stroke="var(--estrelinha-accent)"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M150 44l-14 24h28l-14-24z"
        fill="var(--estrelinha-serenity)"
        stroke="var(--estrelinha-accent-strong)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M258 26l3.6 8.6 9.4.8-7.1 6.1 2.1 9.1-7.9-4.9-8 4.9 2.1-9.1-7.1-6.1 9.4-.8L258 26z"
        stroke="var(--estrelinha-accent-strong)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M44 30v14M37 37h14"
        stroke="var(--estrelinha-accent)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M280 92v10M275 97h10"
        stroke="var(--estrelinha-accent)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>

    {/*
      A etiqueta inclinada. Diz, em objeto, o que a seção de postagem repete em texto: na declaração
      de conteúdo escreve-se "itens pessoais". É a única informação da cena, e ela também está escrita
      mais abaixo — quem não vê a imagem não perde nada.
    */}
    <div className="absolute bottom-5 left-4 flex -rotate-[2.5deg] flex-col gap-1 rounded-sm bg-white px-3 py-2.5 shadow-estrelinha-soft md:bottom-[30px] md:left-8 md:px-4">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-estrelinha-ink-soft md:text-[11px]">
        Declaração de conteúdo
      </span>
      <span className="font-display text-[15px] font-bold leading-[22px] text-estrelinha-primary md:text-[17px]">
        itens pessoais
      </span>
    </div>
  </div>
)

export default GuideHeroArt
