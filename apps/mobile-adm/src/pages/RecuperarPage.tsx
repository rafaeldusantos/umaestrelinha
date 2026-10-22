import { useLocation } from 'react-router-dom'
import { RecoveryFlow, type Passo } from '@/features/recovery'
import TelaDeEntrada from '@/shared/ui/TelaDeEntrada'

/**
 * Um passo da recuperação por código (feature 72, `MAF-24`), numa rota própria fora do guarda.
 *
 * `key={location.key}`: cada entrada do histórico monta o passo de novo, a partir do estado DELA —
 * o voltar e o avançar mostram o passo como ele estava, e nada de um passo vaza para o outro.
 */
const RecuperarPage = ({ passo }: { passo: Passo }) => {
  const location = useLocation()
  return (
    <TelaDeEntrada>
      <RecoveryFlow key={location.key} passo={passo} />
    </TelaDeEntrada>
  )
}

export default RecuperarPage
