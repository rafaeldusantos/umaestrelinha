import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAccessDenied } from '@estrelinha/core/hooks/useStoreOverview'

import { buscarClientePorEmail, clienteHref } from '@/entities/customer'

/**
 * "Ver cliente" do detalhe do pedido (feature `76`, `MAC-21`, A11): procura a pessoa pelo e-mail do
 * pedido e abre a ficha. Estados: `ocioso → abrindo → (nao-achou | falhou | navegou)`.
 *
 * - **Dois toques no mesmo tique ⇒ uma leitura.** A trava é um `useRef`, e não `useState`: o `state`
 *   só muda no render seguinte, e dois cliques no mesmo evento passariam os dois.
 * - **A recusa (`42501`) NÃO vira `falhou`**: ela é devolvida a quem chamou (`aoRecusa`), que a passa à
 *   vigia da página (a mesma da lista e do detalhe), e o botão volta a `ocioso`. Dizer "não consegui
 *   abrir agora" a uma conta que perdeu o acesso mandaria a Adri tentar de novo para sempre.
 * - Rede e servidor ⇒ `falhou` (com "tente de novo"); nenhuma pessoa ⇒ `nao-achou`, sem navegar.
 * - Sucesso ⇒ `navigate(clienteHref(id), { state: { doApp: true } })`: o `doApp` é o que faz o "Voltar"
 *   da ficha devolver ao pedido (o molde do detalhe do pedido).
 */
export type EstadoDeAbrirCliente = 'ocioso' | 'abrindo' | 'nao-achou' | 'falhou' | 'navegou'

export const useAbrirCliente = (email: string, aoRecusa?: (erro: unknown) => void) => {
  const navigate = useNavigate()
  const [estado, setEstado] = useState<EstadoDeAbrirCliente>('ocioso')
  const emVoo = useRef(false)
  // O callback mais recente, lido no fim da leitura sem recriar `abrir` a cada render.
  const aoRecusaAtual = useRef(aoRecusa)
  aoRecusaAtual.current = aoRecusa

  const abrir = useCallback(async () => {
    if (emVoo.current) return
    emVoo.current = true
    setEstado('abrindo')
    try {
      const achado = await buscarClientePorEmail(email)
      if (!achado) {
        setEstado('nao-achou')
        return
      }
      setEstado('navegou')
      navigate(clienteHref(achado.id), { state: { doApp: true } })
    } catch (erro) {
      if (isAccessDenied(erro)) {
        setEstado('ocioso')
        aoRecusaAtual.current?.(erro)
      } else {
        setEstado('falhou')
      }
    } finally {
      emVoo.current = false
    }
  }, [email, navigate])

  return { estado, abrir }
}
