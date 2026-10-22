// Feature 71 · `VIS-10 (d)` — o canal de pedidos do Dashboard tem UM dono.
//
// O Dashboard relê os números quando um pedido muda, e com o bloco "Movimento da loja" passam a ser
// duas releituras (as estatísticas e o movimento). A spec proíbe uma inscrição nova: o aviso é o
// mesmo, e quem o recebe é este hook, chamado uma vez pela página — que repassa às duas.
//
// O callback mais recente vive num `ref`, e o efeito do canal tem dependência VAZIA. Com uma seta
// inline no Dashboard, depender de `onChange` desfaria e recriaria o canal a cada render; e um
// efeito vazio que capturasse o `onChange` da primeira montagem chamaria uma seta velha, com o
// estado de um render que já passou.
//
// O segundo canal de `orders` (`useAdminOrders`, da lista de pedidos) é de outra tela e fica onde
// está — migrá-lo mudaria aquela tela sem pedido (design, seção 14).

import { useEffect, useRef } from 'react'
import { supabase } from '@estrelinha/supabase/client'

/** O nome do canal. Um só, para o Dashboard não abrir dois. */
export const ORDERS_REALTIME_CHANNEL = 'admin-orders-realtime'

export const useOrdersRealtime = (onChange: () => void): void => {
  const atual = useRef(onChange)

  // Sem dependência: a cada render o `ref` passa a apontar para a seta daquele render. Declarado
  // ANTES do efeito do canal, então na montagem o `ref` já está certo quando o canal abre.
  useEffect(() => {
    atual.current = onChange
  })

  useEffect(() => {
    const canal = supabase
      .channel(ORDERS_REALTIME_CHANNEL)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        atual.current()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [])
}
