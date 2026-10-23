// Feature 71 · `VIS-10 (d)` — o canal de pedidos de uma tela tem UM dono. Movido do painel na
// feature `73`, com o NOME do canal por parâmetro: o painel abre `admin-orders-realtime` (o
// Dashboard) e o app do ateliê abre o dele (a Início). O Supabase deduplica canal por nome dentro de
// um client, e os dois apps têm clients diferentes; o nome distinto deixa o canal identificável.
//
// O callback mais recente vive num `ref`, e o efeito do canal depende só do NOME. Com uma seta
// inline na página, depender de `onChange` desfaria e recriaria o canal a cada render; e um efeito
// vazio que capturasse o `onChange` da primeira montagem chamaria uma seta velha.

import { useEffect, useRef } from 'react'
import { supabase } from '@estrelinha/supabase/client'

export const useOrdersRealtime = (channelName: string, onChange: () => void): void => {
  const atual = useRef(onChange)

  // Sem dependência: a cada render o `ref` passa a apontar para a seta daquele render. Declarado
  // ANTES do efeito do canal, então na montagem o `ref` já está certo quando o canal abre.
  useEffect(() => {
    atual.current = onChange
  })

  useEffect(() => {
    const canal = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        atual.current()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [channelName])
}
