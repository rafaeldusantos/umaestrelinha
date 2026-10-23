import { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, RequireAdmin } from '@estrelinha/auth'

import { AcessoNaoConferido, CarregandoAcesso } from '@/features/access-check'
import TelaDeEntrada from '@/shared/ui/TelaDeEntrada'
import { useOnline } from '@/shared/lib/useOnline'
import LoginPage from '@/pages/LoginPage'
import RecuperarPage from '@/pages/RecuperarPage'
import InicioPage from '@/pages/InicioPage'
import PedidosPage from '@/pages/PedidosPage'
import ClientesPage from '@/pages/ClientesPage'
import DescontosPage from '@/pages/DescontosPage'
import BootGate from './BootGate'
import OfflineScreen from './OfflineScreen'
import MobileLayout from './layout/MobileLayout'
import { criarQueryClient } from './queryClient'

/**
 * O app do ateliê (feature 72).
 *
 * - **Sem rede, nada abaixo existe** (`MAF-19`): nem o `AuthProvider` monta, então nenhuma chamada ao
 *   client do Supabase sai — e nenhum dado aparece. Quando a rede volta, a árvore monta de novo e a
 *   sessão é relida do zero.
 * - **Toda rota fora do login e da recuperação está DENTRO do `RequireAdmin`** (`MAF-16`), e
 *   `rotasSobGuarda.test.ts` mede a POSIÇÃO. As rotas são as de `TABS`, e o guarda de abas compara as
 *   duas listas nos dois sentidos. A recuperação (`MAF-24`) fica FORA pela mesma razão do login:
 *   quem recupera ainda não entrou. As três rotas dela são as de `PASSOS_DA_RECUPERACAO`.
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

/** Tudo o que só existe com rede (`MAF-19`): sem ela, nem o `AuthProvider` monta. */
const Arvore = () => (
  <AuthProvider>
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
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/descontos" element={<DescontosPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </BootGate>
  </AuthProvider>
)

export default App
