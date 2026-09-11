import { Check } from 'lucide-react'
import { ESTRELINHA_ICONS } from '@estrelinha/ui/icons'
import type { AvisoDaFicha } from '../model/guide'

/**
 * O aviso de uma ficha de material, nos dois tons.
 *
 * **Nasceu dentro de `MaterialFicha.tsx` e saiu de lá na feature `44`**, antes de a gaveta consumi-lo
 * — e a ordem importa: se a gaveta tivesse copiado o bloco, o tom `alerta` teria ganhado dois donos
 * no dia em que ela nasceu, e os hex divergiriam na primeira vez que alguém ajustasse um deles. É o
 * defeito 01 na sua forma mais barata de evitar e mais cara de descobrir: duas cópias de uma cor não
 * quebram build, `tsc` nem teste de componente.
 *
 * **Dois tons, e a diferença é o remédio**, não a intensidade: `calma` é informação que tranquiliza
 * ("se descongelar no caminho, a joia não é afetada") e sai sobre `serenity`; `alerta` é um erro que
 * estraga o material ("nunca use fita adesiva") e sai sobre o rosa de advertência, com a barra à
 * esquerda. A barra separa os dois de relance, antes de a frase ser lida — um tom só faria a cliente
 * ler as duas coisas com o mesmo peso, e a que importa é a segunda.
 *
 * `surface` muda **só o respiro**, nunca a cor: a página tem a largura de uma coluna de leitura e a
 * gaveta tem 310px no celular. Mesma decisão e mesmo nome de `VariantPicker`, que já distingue
 * `page` de `card` neste app.
 */
interface Props {
  aviso: AvisoDaFicha
  surface: 'pagina' | 'gaveta'
}

const RESPIRO = {
  pagina: {
    alerta: 'px-5 py-4 text-[14px] leading-6 md:px-[22px] md:py-5',
    calma: 'px-5 py-4 text-[14px] leading-6 md:px-[26px] md:py-[22px]',
  },
  gaveta: {
    alerta: 'px-4 py-3.5 text-[13px] leading-5',
    calma: 'px-4 py-3.5 text-[13px] leading-5',
  },
} as const

const MaterialAviso = ({ aviso, surface }: Props) => {
  const Icone = aviso.icone ? ESTRELINHA_ICONS[aviso.icone] : null

  if (aviso.tom === 'alerta') {
    return (
      <p
        className={`flex h-full items-start gap-3 rounded-[2px] border-l-[3px] border-[#9E4A3E] bg-[#F7EDE8] font-light text-estrelinha-ink ${RESPIRO[surface].alerta}`}
      >
        <span
          aria-hidden
          className="mt-px flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-[#9E4A3E] text-[13px] font-bold text-[#9E4A3E]"
        >
          !
        </span>
        <span>{aviso.texto}</span>
      </p>
    )
  }

  return (
    <p
      className={`flex h-full items-start gap-3 rounded-md bg-estrelinha-serenity font-light text-estrelinha-ink ${RESPIRO[surface].calma}`}
    >
      {Icone ? (
        <Icone className="mt-0.5 h-[22px] w-[22px] shrink-0 text-estrelinha-primary" aria-hidden />
      ) : (
        <Check className="mt-0.5 h-[22px] w-[22px] shrink-0 text-estrelinha-primary" aria-hidden />
      )}
      <span>{aviso.texto}</span>
    </p>
  )
}

export default MaterialAviso
