import { useEffect } from 'react'
import { useAuthContext } from '@estrelinha/auth'
import { ACCESS_DENIED_CODE } from '@estrelinha/core/hooks/useStoreOverview'

/** A leitura foi recusada por PAPEL (`42501` de uma RPC admin) — e não por rede. */
export const ehRecusaDePapel = (erro: unknown): boolean =>
  (erro as { code?: unknown } | null | undefined)?.code === ACCESS_DENIED_CODE

/**
 * Para QUEM a recusa já foi reconferida neste episódio (o id da conta), ou `null`. Fora do React de
 * propósito, no molde de `tentativa.ts`: `retryAdminCheck` põe o `loading` do provider, o
 * `RequireAdmin` troca a tela pelo `fallback` e a página que chamou DESMONTA. Um `useRef` morreria
 * com ela, e na remontagem — com o mesmo `42501` ainda no cache — a vigia reconferiria de novo, e de
 * novo: com o papel ainda `admin` (a recusa era da função, não da conta), a tela ficava em laço entre
 * o "Conferindo…" e a Início (achado da T18, pelo `<App />` real).
 *
 * O episódio acaba quando nenhuma leitura está mais recusada (a próxima recusa, de verdade, volta a
 * reconferir) ou quando a conta muda.
 */
let reconferidoPara: string | null = null

/**
 * A vigia da recusa (feature `73`, `MAI-22`, `MAI-24`).
 *
 * Recebe os erros das leituras da tela. No PRIMEIRO `42501`, reconfere o papel (`retryAdminCheck`)
 * UMA vez: o `AuthProvider` relê o papel, e o `RequireAdmin` leva ao Login com a recusa da `72`
 * ("Esta conta não tem acesso ao painel.", com "Sair"). Nenhuma frase nova de recusa: a tela é a da
 * `72` (emenda do design, §8).
 *
 * - Erro de rede (sem `code`, ou outro código) **não** chama nada: é falha de leitura, e o bloco diz
 *   que não carregou (`MAI-24`). Tratá-lo como recusa mostraria "sem acesso" a uma admin no 3G.
 * - Uma vez por episódio de recusa, e não por montagem (ver `reconferidoPara`): se o papel voltar
 *   `admin`, repetir entraria em laço com o `AuthProvider`.
 *
 * Devolve se há recusa — com ela, a tela não desenha número nenhum (nem zero, nem o dado anterior).
 */
export const useRecusaDePapel = (erros: readonly unknown[]): boolean => {
  const { user, retryAdminCheck } = useAuthContext()
  const conta = user?.id ?? null
  const recusada = erros.some(ehRecusaDePapel)

  useEffect(() => {
    if (!recusada) {
      if (reconferidoPara === conta) reconferidoPara = null
      return
    }
    if (conta === null || reconferidoPara === conta) return
    reconferidoPara = conta
    void retryAdminCheck()
  }, [recusada, conta, retryAdminCheck])

  return recusada
}
