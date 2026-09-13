import type { FaqPageGroup } from '@estrelinha/core/faq'
import { useOverflowAffordance } from '@/shared/lib/useOverflowAffordance'
import { TAP_ROW } from '@/shared/lib/touchTarget'
import { faqSubjectId } from '../lib/anchors'

/**
 * Os assuntos da página, em duas formas e **uma fonte só** — `FAQL-06`.
 *
 * Faixa rolável até `md`, coluna fixa a partir de `lg`. Duas listas separadas divergiriam no
 * primeiro assunto novo: uma ganharia a entrada e a outra não, e ninguém descobriria até alguém
 * abrir a página no outro tamanho.
 *
 * **Os dois NAVEGAM, nenhum filtra.** Quem filtra é a busca. Dois filtros na mesma tela dariam dois
 * donos de "o que estou vendo agora" — e a cliente que usasse os dois ficaria com um resultado que
 * nenhum dos controles explica.
 *
 * A contagem sai do dado. Assunto sem pergunta ativa nem chega aqui: `resolveFaqPage` já o
 * descartou, então um link que não leva a lugar nenhum é impossível por construção.
 */
const FaqSubjectNav = ({ groups }: { groups: readonly FaqPageGroup[] }) => {
  const faixa = useOverflowAffordance(groups.length)

  if (groups.length === 0) return null

  return (
    <>
      {/* Celular: faixa rolável, com a afordância de rolagem da BL-028 — degradê e seta só do lado
          em que há conteúdo além da dobra. */}
      <div className="relative lg:hidden">
        <div
          /*
           * `useOverflowAffordance` tipa o ref como `HTMLElement` porque o `Header` o prende num
           * `<nav>`. Aqui o elemento que rola é um `<div>`, e a conversão é o preço.
           *
           * A alternativa — fazer a faixa ser outro `<nav aria-label="Assuntos">` — daria dois
           * elementos de navegação com o mesmo nome no DOM. Em navegador só um existe (o outro é
           * `display:none` pelo `lg:hidden`, e sai da árvore de acessibilidade), mas **jsdom não
           * aplica as classes do Tailwind**: os dois ficariam expostos, e o `getByRole` do teste
           * passaria a achar dois. Trocar semântica para satisfazer o tipo e quebrar o teste é o
           * negócio errado.
           */
          ref={faixa.ref as React.RefObject<HTMLDivElement>}
          className="flex flex-row items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {groups.map(grupo => (
            <a
              key={grupo.category}
              href={`#${faqSubjectId(grupo.category)}`}
              className={`${TAP_ROW} flex shrink-0 items-center rounded-full border border-estrelinha-line bg-estrelinha-surface px-4 text-[13px] text-estrelinha-ink-soft transition-colors hover:border-estrelinha-field hover:text-estrelinha-ink`}
            >
              {grupo.label}
            </a>
          ))}
        </div>
        {faixa.antes && (
          <button
            type="button"
            aria-label="Ver assuntos anteriores"
            onClick={() => faixa.rolar(-1)}
            className="absolute left-0 top-0 flex h-full w-9 items-center justify-start bg-gradient-to-r from-estrelinha-ground to-transparent text-estrelinha-ink"
          >
            <span aria-hidden>‹</span>
          </button>
        )}
        {faixa.depois && (
          <button
            type="button"
            aria-label="Ver mais assuntos"
            onClick={() => faixa.rolar(1)}
            className="absolute right-0 top-0 flex h-full w-9 items-center justify-end bg-gradient-to-l from-estrelinha-ground to-transparent text-estrelinha-ink"
          >
            <span aria-hidden>›</span>
          </button>
        )}
      </div>

      {/* Computador: coluna fixa, com a contagem de cada assunto. */}
      <nav aria-label="Assuntos" className="hidden lg:flex lg:flex-col lg:gap-0.5">
        <span className="px-3.5 pb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-estrelinha-ink-soft">
          Assuntos
        </span>
        {groups.map(grupo => (
          <a
            key={grupo.category}
            href={`#${faqSubjectId(grupo.category)}`}
            className="flex flex-row items-center justify-between rounded-sm px-4 py-2.5 text-[14.5px] text-estrelinha-ink-soft transition-colors hover:bg-estrelinha-ground-deep hover:text-estrelinha-ink"
          >
            <span>{grupo.label}</span>
            <span className="text-[12.5px]">{grupo.items.length}</span>
          </a>
        ))}
      </nav>
    </>
  )
}

export default FaqSubjectNav
