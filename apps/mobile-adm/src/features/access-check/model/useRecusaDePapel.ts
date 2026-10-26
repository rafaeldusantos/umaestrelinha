import { useEffect } from 'react'
import { useAuthContext } from '@estrelinha/auth'
import { isAccessDenied } from '@estrelinha/core/hooks/useStoreOverview'

/** A leitura foi recusada por PAPEL (`42501` de uma RPC admin) — e não por rede. O dono é `core`. */
export const ehRecusaDePapel = isAccessDenied

/**
 * Para QUEM a recusa já foi reconferida neste episódio (o id da conta), ou `null`. Fora do React de
 * propósito, no molde de `tentativa.ts`: `retryAdminCheck` põe o `loading` do provider, o
 * `RequireAdmin` troca a tela pelo `fallback` e a página que chamou DESMONTA. Um `useRef` morreria
 * com ela, e na remontagem — com o mesmo `42501` ainda no cache — a vigia reconferiria de novo, e de
 * novo: com o papel ainda `admin` (a recusa era da função, não da conta), a tela ficava em laço entre
 * o "Conferindo…" e a Início (achado da T18, pelo `<App />` real).
 *
 * O episódio acaba quando uma leitura da tela VOLTA BOA (a próxima recusa, de verdade, volta a
 * reconferir) ou quando a conta muda. **Não** acaba pela mera ausência de erro: na remontagem a
 * consulta sem dado recomeça, e o React Query apaga o erro dela enquanto lê — o `42501` seguinte
 * reconferiria de novo, e de novo (`BUG-20261024-recusa-com-papel-admin-vira-tempestade`: ~140
 * requisições por segundo, a tela presa na splash).
 */
let reconferidoPara: string | null = null

/**
 * Só para testes: o episódio é do MÓDULO (vive enquanto a página do navegador vive), e a suíte inteira
 * de um arquivo compartilha o módulo. Sem esquecer entre os casos, a recusa de um deixaria a vigia
 * muda no seguinte — que agora só reabre com uma leitura boa, e não pela mera ausência de erro.
 */
export const esquecerReconferencia = (): void => {
  reconferidoPara = null
}

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
 * `leituraBoa`: alguma leitura da tela voltou com dado e sem erro. Cada página diz o que isso é para
 * ela; sem o segundo argumento o episódio só acaba com a troca de conta.
 *
 * Devolve se há recusa — com ela, a tela não desenha número nenhum (nem zero, nem o dado anterior).
 */
export const useRecusaDePapel = (erros: readonly unknown[], leituraBoa = false): boolean => {
  const { user, retryAdminCheck } = useAuthContext()
  const conta = user?.id ?? null
  const recusada = erros.some(ehRecusaDePapel)

  useEffect(() => {
    if (!recusada) {
      // Só uma leitura que deu CERTO encerra o episódio; "ainda lendo" não é fim de recusa.
      if (leituraBoa && reconferidoPara === conta) reconferidoPara = null
      return
    }
    if (conta === null || reconferidoPara === conta) return
    reconferidoPara = conta
    void retryAdminCheck()
  }, [recusada, leituraBoa, conta, retryAdminCheck])

  return recusada
}
