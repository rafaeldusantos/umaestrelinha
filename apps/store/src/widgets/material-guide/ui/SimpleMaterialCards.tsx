import { ESTRELINHA_ICONS } from '@/shared/ui/icons'
import { CARTOES_DE_MATERIAL } from '../model/guide'

/**
 * "Materiais de preparo simples" (`5MC-0`).
 *
 * Cartão em vez de ficha porque o preparo cabe em duas linhas: embrulhar e identificar. Dar a eles a
 * mesma caixa das três fichas ricas prometeria uma profundidade que não existe — e esconderia, por
 * ruído, quais são os materiais que de fato precisam de atenção.
 *
 * Cada cartão carrega a **âncora** do material: é o destino do link da página do produto.
 */
const SimpleMaterialCards = () => (
  <div className="flex flex-col gap-6 border-t border-estrelinha-line pt-6 md:gap-8 md:pt-14">
    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <h3 className="font-display text-[21px] font-normal leading-[30px] text-estrelinha-ink md:text-[28px] md:leading-[34px]">
        Materiais de preparo simples
      </h3>
      <p className="text-[14px] font-light leading-[22px] text-estrelinha-ink-soft">
        Sempre em saco plástico identificado com seu nome completo.
      </p>
    </div>

    <ul className="grid gap-4 md:grid-cols-3 md:gap-6">
      {CARTOES_DE_MATERIAL.map(cartao => {
        const Icone = ESTRELINHA_ICONS[cartao.icone]
        return (
          <li
            key={cartao.anchor}
            id={cartao.anchor}
            className="flex scroll-mt-24 flex-col gap-4 rounded-md bg-estrelinha-ground p-6 md:gap-[18px] md:p-8"
          >
            <Icone className="h-10 w-10 shrink-0 text-estrelinha-primary md:h-11 md:w-11" aria-hidden />
            <h4 className="text-[17px] font-semibold leading-6 text-estrelinha-ink md:text-[19px]">
              {cartao.titulo}
            </h4>
            <ul className="flex flex-col gap-2.5">
              {cartao.itens.map(item => (
                <li key={item} className="flex items-start gap-2.5">
                  <span
                    aria-hidden
                    className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-estrelinha-accent"
                  />
                  <span className="text-[16px] font-light leading-[26px] text-estrelinha-ink-soft md:text-[17px]">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        )
      })}
    </ul>
  </div>
)

export default SimpleMaterialCards
