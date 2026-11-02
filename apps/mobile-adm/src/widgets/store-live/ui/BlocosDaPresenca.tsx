import { liveNotMeasuredLine, type StoreLive } from '@estrelinha/core/live'
import type { Leitura } from '@/shared/ui/leitura'
import AgoraNaLoja from './AgoraNaLoja'
import OQueEstaoFazendo from './OQueEstaoFazendo'
import JoiasSendoVistas from './JoiasSendoVistas'
import DeOndeVieram from './DeOndeVieram'
import NoCelular from './NoCelular'

/**
 * Os blocos A–E da Loja ao vivo, na ordem do protótipo, a partir da MESMA leitura de `store_live`.
 * Com a loja ainda não medida, só o cartão "Agora na loja" fala (a frase de Acessos): os outros
 * quatro não teriam o que contar.
 */
const BlocosDaPresenca = ({ leitura }: { leitura: Leitura<StoreLive> }) => {
  const naoMedida = leitura.dado ? liveNotMeasuredLine(leitura.dado) !== null : false
  return (
    <>
      <AgoraNaLoja leitura={leitura} />
      {!naoMedida && (
        <>
          <OQueEstaoFazendo leitura={leitura} />
          <JoiasSendoVistas leitura={leitura} />
          <DeOndeVieram leitura={leitura} />
          <NoCelular leitura={leitura} />
        </>
      )}
    </>
  )
}

export default BlocosDaPresenca
