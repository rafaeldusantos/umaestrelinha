import { useLocation } from 'react-router-dom'

/** Onde a navegação chegou — o destino de um link da Início, lido do endereço. */
const Destino = () => {
  const { pathname, search } = useLocation()
  return <p data-testid="destino">{`${pathname}${search}`}</p>
}

export default Destino
