import { esquecerAvisos } from './avisos'
import { esquecerErros } from './erros'
import { esquecerTravas } from './travas'

/**
 * A GERAÇÃO das ações: sobe a cada `esquecerAcoes`. A ação que começou numa geração e termina noutra
 * é de uma conta que já saiu — `useAcaoDoPedido` não desenha nada dela (nem aviso, nem erro) e não
 * solta a trava que a conta nova pode ter posto no mesmo pedido.
 */
let geracao = 0
export const geracaoDasAcoes = (): number => geracao

/**
 * Esquece as travas, o aviso e os erros das ações (feature `75`, A20). Chamado por
 * `LimparCacheNaTrocaDeConta` (`app/App.tsx`), ao lado de `esquecerTermos`: nada disso é por usuário,
 * e a conta que entra não pode herdar a trava, o erro ou a confirmação da que saiu.
 */
export const esquecerAcoes = (): void => {
  geracao += 1
  esquecerTravas()
  esquecerAvisos()
  esquecerErros()
}
