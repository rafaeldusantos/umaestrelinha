import Selo from '@/shared/ui/Selo'

export const ROTULO_EM_ABERTO = 'Em aberto'

/**
 * O selo "Em aberto" (feature `76`, `MAC-03`, `MAC-09`): a cliente tem ao menos um pedido em andamento.
 * Tom `progress` (o "em andamento" da `74`), **nunca** o âmbar de alerta — ter pedido aberto não é
 * problema nenhum. Quem decide se aparece é a linha, lendo `orders_open` — a MESMA coluna que o
 * recorte "Com pedido em aberto" filtra.
 */
const SeloEmAberto = () => (
  <Selo tom="progress" dados={{ 'data-selo': 'em-aberto' }}>
    {ROTULO_EM_ABERTO}
  </Selo>
)

export default SeloEmAberto
