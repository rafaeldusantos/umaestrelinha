import { useRef } from 'react'

/**
 * A recusa que a porta de escrita LANÇOU, enquanto ela vale (feature `75`, R11; design §3.5).
 *
 * A página passa esta recusa à MESMA vigia da leitura (`useRecusaDePapel`). Mas ela não pode valer
 * para sempre: guardada em estado, uma recusa que a reconferência desmentiu (o papel voltou `admin`)
 * deixaria a página presa na falha, sem dado, mesmo depois de uma releitura boa. A régua é a da
 * leitura da lista (`useListaDePedidos`, `MAP-36`): a recusa vale enquanto a leitura da página é a
 * MESMA de quando ela chegou (`dataUpdatedAt`); uma releitura que confirma o papel a apaga, e a
 * releitura recusada põe o próprio `42501` no erro da leitura.
 */
export const useRecusaDaAcao = (erro: unknown, lidaEm: number): unknown => {
  const marca = useRef<{ erro: unknown; lidaEm: number } | null>(null)
  if (!erro) marca.current = null
  else if (marca.current?.erro !== erro) marca.current = { erro, lidaEm }
  return marca.current && marca.current.lidaEm === lidaEm ? marca.current.erro : null
}
