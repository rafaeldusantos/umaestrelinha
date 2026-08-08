import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'

const getNextDrop = () => {
  const now = new Date()
  const next = new Date(now)
  next.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7 || 7))
  next.setHours(18, 0, 0, 0)
  if (next <= now) next.setDate(next.getDate() + 7)
  return next
}

/**
 * Card de contagem regressiva do drop.
 *
 * É a única superfície de tinta acima da dobra e o único lugar da home onde a
 * manteiga aparece — reservada para os segundos, a unidade que muda a cada
 * tique. Manteiga sobre branco é proibida (11,1:1 só sobre tinta).
 */
const DropCountdown = () => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const target = getNextDrop()
    const tick = () => {
      const diff = target.getTime() - Date.now()
      if (diff <= 0) return
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const blocks = [
    { label: 'Dias', value: timeLeft.days, live: false },
    { label: 'Hrs', value: timeLeft.hours, live: false },
    { label: 'Min', value: timeLeft.minutes, live: false },
    { label: 'Seg', value: timeLeft.seconds, live: true },
  ]

  return (
    <div className="relative flex w-full flex-col items-center gap-5 overflow-hidden rounded-xl bg-nanita-ink px-6 py-10 md:px-9">
      {/* Dois discos de rosa quase invisíveis dão profundidade sem virar cor. */}
      <span
        className="pointer-events-none absolute -right-5 -top-5 h-[100px] w-[100px] rounded-full bg-nanita-jam/[0.15]"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute -bottom-2.5 -left-2.5 h-[60px] w-[60px] rounded-full bg-nanita-raspberry/20"
        aria-hidden
      />

      <div className="relative flex items-center gap-2.5 rounded-pill bg-nanita-glaze/[0.15] py-[5px] pl-3 pr-3.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-nanita-glaze" />
        <span className="nanita-eyebrow text-[12px] font-bold tracking-[0.12em] text-nanita-glaze">
          Drop nesta sexta
        </span>
      </div>

      <h3 className="relative text-center font-display text-[26px] font-semibold leading-[1.2] tracking-[-0.02em] text-white md:text-[30px]">
        Novos pins chegando!
      </h3>

      <div className="relative flex gap-2.5">
        {blocks.map((b) => (
          /* As QUATRO células têm o mesmo véu de branco — só o NÚMERO dos
             segundos vai de Fita. O artboard 23 é explícito nisso, e faz
             sentido: tingir a célula inteira daria à unidade que muda o peso de
             uma seção, quando ela é só o dígito vivo. */
          <div
            key={b.label}
            className="flex min-w-[56px] flex-col items-center gap-1 rounded-md bg-white/10 px-3.5 py-2.5 md:min-w-[68px]"
          >
            <span
              className={`font-display text-[24px] font-semibold leading-[1.25] tracking-[-0.02em] md:text-[30px] ${
                b.live ? 'text-nanita-butter' : 'text-white'
              }`}
            >
              {String(b.value).padStart(2, '0')}
            </span>
            <span className="text-[9px] font-medium uppercase tracking-[0.1em] text-white/50 md:text-[11px]">
              {b.label}
            </span>
          </div>
        ))}
      </div>

      {/* Carimbo, não Carmim: sobre Grafite o Carmim lê a 2,18:1 e some. É a
          variante `onInk` do botão da loja, aqui com o contorno de véu que o
          artboard desenha para separar o CTA da superfície. */}
      <button
        type="button"
        className="relative flex items-center justify-center gap-1.5 rounded-button border border-white/20 bg-nanita-glaze px-[18px] py-2.5 font-display text-[13px] font-semibold text-nanita-ink transition-transform hover:scale-[1.03] active:scale-100 md:text-[15px]"
      >
        Ativar lembrete
        <Bell size={14} strokeWidth={2} aria-hidden />
      </button>
    </div>
  )
}

export default DropCountdown
