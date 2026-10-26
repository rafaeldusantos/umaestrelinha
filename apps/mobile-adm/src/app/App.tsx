import { useLayoutEffect, useRef, useState } from 'react'
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, RequireAdmin, useAuthContext } from '@estrelinha/auth'

import { AcessoNaoConferido, CarregandoAcesso } from '@/features/access-check'
import TelaDeEntrada from '@/shared/ui/TelaDeEntrada'
import { useOnline } from '@/shared/lib/useOnline'
import LoginPage from '@/pages/LoginPage'
import RecuperarPage from '@/pages/RecuperarPage'
import InicioPage from '@/pages/InicioPage'
import PedidosPage from '@/pages/PedidosPage'
import PedidoPage from '@/pages/PedidoPage'
import ClientesPage from '@/pages/ClientesPage'
import ClientePage from '@/pages/ClientePage'
import DescontosPage from '@/pages/DescontosPage'
import AvisosPage from '@/pages/AvisosPage'
import BootGate from './BootGate'
import OfflineScreen from './OfflineScreen'
import MobileLayout from './layout/MobileLayout'
import { criarQueryClient } from './queryClient'
import { esquecerTermos } from '@/shared/lib/useTermoDaEntrada'
import { esquecerAcoes } from '@/features/order-actions'

/**
 * O app do ateliê (feature 72).
 *
 * - **Sem rede, nada abaixo existe** (`MAF-19`): nem o `AuthProvider` monta, então nenhuma chamada ao
 *   client do Supabase sai — e nenhum dado aparece. Quando a rede volta, a árvore monta de novo e a
 *   sessão é relida do zero.
 * - **Toda rota fora do login e da recuperação está DENTRO do `RequireAdmin`** (`MAF-16`), e
 *   `rotasSobGuarda.test.ts` mede a POSIÇÃO. As rotas são as de `TABS`, e o guarda de abas compara as
 *   duas listas nos dois sentidos. `/pedidos/:id` (feature `74`, `MAP-54`) e `/clientes/:id` (feature
 *   `76`, `MAC-36`) são SUBROTAS de aba — sem aba própria, e a aba pai fica marcada nelas (`MAP-55`). A recuperação (`MAF-24`) fica FORA pela mesma razão do login:
 *   quem recupera ainda não entrou. As três rotas dela são as de `PASSOS_DA_RECUPERACAO`.
 * - `/avisos` (feature `79`, `MAN-17`) é rota DA CONTA: sem aba, alcançada pelo menu da conta, e dentro
 *   do guarda como todas (`ROTAS_DA_CONTA` em `abasSaoAsRotas.test.ts`).
 * - O papel NÃO CONFERIDO (`MAF-23`) tem tela própria no guarda (`unknownFallback`): nunca o
 *   `Navigate` ao login, que desenharia a recusa falsa.
 * - O acesso é o MESMO do Backoffice (`AD-056`): mesmas contas, mesmo papel, mesmo `RequireAdmin`.
 * - O cache (`criarQueryClient`, feature `73`): `42501` não repete; falha de rede repete uma vez.
 */
const App = () => {
  const [queryClient] = useState(criarQueryClient)
  const online = useOnline()

  // O provider do cache fica ACIMA do ramo de "sem conexão" (achado da prova em navegador da `73`):
  // o `onlineManager` do React Query só ouve `online`/`offline` enquanto algum `QueryClient` está
  // montado. Com o provider dentro do ramo, o `offline` chegava, o provider desmontava, e o `online`
  // da volta já não era ouvido — o React Query seguia achando que estava sem rede e PAUSAVA toda
  // leitura: a Início voltava com os números velhos e nunca mais relia.
  return <QueryClientProvider client={queryClient}>{online ? <Arvore /> : <OfflineScreen />}</QueryClientProvider>
}

/**
 * A troca de conta LIMPA o cache inteiro (feature `74`, emenda E6, R6, `MAP-37`). Nenhuma chave do
 * app é por usuário — a lista, o detalhe e o resumo do selo (`['store-overview']`) —, então, sem isto,
 * a conta que entra depois de outra veria por um instante o que a anterior leu (e o selo, o número
 * dela), enquanto a própria leitura não volta. TODAS as chaves voltam ao estado inicial — a forma que
 * não esquece chave nenhuma.
 *
 * SPEC_DEVIATION (E6 diz `queryClient.clear()` nos dois casos), medido na T27:
 * - **Saiu (id → `null`)**: `clear()`, como E6. O `RequireAdmin` desmonta as páginas, e nada pode ser
 *   relido sem sessão — `resetQueries()` aqui RELERIA as consultas ainda montadas no mesmo instante, e
 *   a resposta encheria de novo o cache que acabou de ser esvaziado (medido: a conta que voltava via
 *   a lista de antes).
 * - **Trocou (A → B, sem `SIGNED_OUT`)**: `resetQueries()`. A página e o layout seguem MONTADOS, e
 *   `clear()` tira as consultas do cache sem avisar quem as observa — o selo continuava com o número
 *   da conta A. O reset devolve toda consulta ao estado sem dado, cancela em silêncio a leitura em voo
 *   e relê as que estão na tela, já com a conta nova.
 *
 * Só quando o `user.id` muda de um valor NÃO nulo — para outro id (troca sem `SIGNED_OUT`) ou para
 * `null` (saiu). Entrar de um estado sem sessão não limpa nada (não havia conta a esquecer), e o
 * `SIGNED_IN` da volta da aba traz o MESMO id (`72`): o cache fica e a tela não pisca. Efeito de
 * LAYOUT para limpar antes da pintura em que a conta nova aparece.
 */
const LimparCacheNaTrocaDeConta = () => {
  const { user } = useAuthContext()
  const queryClient = useQueryClient()
  const anterior = useRef<string | null>(null)
  const id = user?.id ?? null
  useLayoutEffect(() => {
    if (anterior.current !== null && anterior.current !== id) {
      // B02: o termo da busca guardado por entrada também é da conta que saiu.
      esquecerTermos()
      // Feature `75` (A20): a trava, a confirmação e o erro de cada pedido também são da conta que saiu.
      esquecerAcoes()
      if (id === null) queryClient.clear()
      else void queryClient.resetQueries()
    }
    anterior.current = id
  }, [id, queryClient])
  return null
}

/** Tudo o que só existe com rede (`MAF-19`): sem ela, nem o `AuthProvider` monta. */
const Arvore = () => (
  <AuthProvider>
    <LimparCacheNaTrocaDeConta />
    <BootGate>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/recuperar" element={<RecuperarPage passo="email" />} />
          <Route path="/recuperar/codigo" element={<RecuperarPage passo="codigo" />} />
          <Route path="/recuperar/senha" element={<RecuperarPage passo="senha" />} />
          <Route element={<RequireAdmin loginPath="/login" fallback={<CarregandoAcesso />} unknownFallback={<TelaDeEntrada><AcessoNaoConferido /></TelaDeEntrada>}><MobileLayout /></RequireAdmin>}>
            <Route path="/" element={<InicioPage />} />
            <Route path="/pedidos" element={<PedidosPage />} />
            <Route path="/pedidos/:id" element={<PedidoPage />} />
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/clientes/:id" element={<ClientePage />} />
            <Route path="/descontos" element={<DescontosPage />} />
            <Route path="/avisos" element={<AvisosPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </BootGate>
  </AuthProvider>
)

export default App
