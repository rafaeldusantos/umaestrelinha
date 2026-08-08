import { Truck } from 'lucide-react'

/**
 * Marcador de item — Fita sobre Grafite (10,17:1), a única superfície onde a
 * manteiga é legível. É o mesmo papel que ela tem no contador de drop e no selo
 * do kit: destaque temporal, nunca texto.
 */
const Mark = () => <span className="block h-1.5 w-1.5 shrink-0 rounded-full bg-estrelinha-accent" aria-hidden />

/** Régua vertical entre itens — véu de branco, não Dobra: aqui o fundo é escuro. */
const Rule = () => <span className="block h-4 w-px shrink-0 bg-white/20" aria-hidden />

const items = [
  {
    id: 'frete',
    content: (
      <>
        <Truck size={14} className="shrink-0" aria-hidden />
        Frete grátis acima de R$150
      </>
    ),
  },
  { id: 'pix', content: 'Pix com 5% OFF' },
  { id: 'parcelas', content: 'Parcele em 12×' },
  { id: 'troca', content: 'Troca em 7 dias' },
  { id: 'drops', content: 'Drops toda sexta' },
]

/**
 * Faixa de benefícios — artboards 22 e 23.
 *
 * Grafite chapado: é a linha que separa o hero do resto e devolve peso à
 * página, agora que o chão é Papel e o hero não tem faixa de cor própria.
 *
 * O texto sai em **caixa alta com tracking aberto**, que é o que permite 13px
 * numa faixa escura sem virar borrão — e o branco cheio, não véu: a faixa é
 * curta e passa rolando, então não há hierarquia interna para construir.
 */
function MarqueeBar() {
  return (
    <div className="flex h-[44px] items-center overflow-hidden bg-estrelinha-ink md:h-14">
      <div
        className="flex animate-marquee items-center gap-8 whitespace-nowrap md:gap-12 hover:[animation-play-state:paused]"
        style={{ width: 'max-content' }}
      >
        {[...items, ...items].map((item, index) => (
          <div key={`${item.id}-${index}`} className="flex items-center gap-8 md:gap-12">
            <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-white md:text-[13px]">
              <Mark />
              {item.content}
            </span>
            <Rule />
          </div>
        ))}
      </div>
    </div>
  )
}

export default MarqueeBar
