import type { UseQueryResult } from '@tanstack/react-query'
import type { Leitura } from './leitura'

/**
 * O que um bloco sabe de uma query. Com recusa por papel (`42501`), nenhum número — nem o dado de
 * antes: o bloco diz que não carregou enquanto o papel é reconferido (`MAI-22`).
 *
 * Morava em `InicioPage.tsx` (feature `73`) e subiu na `83`: a Loja ao vivo monta a mesma leitura do
 * movimento, e duas escritas divergiriam sobre quando um número pode aparecer. Arquivo próprio, ao
 * lado de `leitura.tsx` (o design dizia dentro dele): lá só moram componentes e constantes
 * (`react-refresh/only-export-components`, e o lint do app é 0/0).
 */
export const leituraDe = <T, E>(q: UseQueryResult<T, E>, recusada: boolean): Leitura<T> => ({
  dado: recusada ? undefined : (q.data ?? undefined),
  falhou: recusada || (q.isError && !q.data),
  tentarDeNovo: () => {
    void q.refetch()
  },
})

