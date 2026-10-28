import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@estrelinha/ui/sonner";
import { Toaster } from "@estrelinha/ui/toaster";
import { TooltipProvider } from "@estrelinha/ui/tooltip";
import { RequireAdmin } from "@estrelinha/auth";

import AdminLayout from "@/widgets/admin-layout/ui/AdminLayout";
import AdminLoginPage from "@/pages/admin/AdminLoginPage";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminProductsPage from "@/pages/admin/AdminProductsPage";
import AdminProductFormPage from "@/pages/admin/AdminProductFormPage"
import AdminQuickGridPage from '@/pages/admin/AdminQuickGridPage';
import AdminOrdersPage from "@/pages/admin/AdminOrdersPage";
import AdminOrderPage from "@/pages/admin/AdminOrderPage";
import AdminCategoriesPage from "@/pages/admin/AdminCategoriesPage";
import AdminFiltersPage from "@/pages/admin/AdminFiltersPage";
import AdminFilterValuePage from "@/pages/admin/AdminFilterValuePage";
import AdminFilterSuggestionsPage from "@/pages/admin/AdminFilterSuggestionsPage";
import AdminFaqsPage from "@/pages/admin/AdminFaqsPage";
import AdminHomePage from "@/pages/admin/AdminHomePage";
import AdminMenuPage from "@/pages/admin/AdminMenuPage";
import AdminStoreFaqPage from "@/pages/admin/AdminStoreFaqPage";
import AdminGooglePage from "@/pages/admin/AdminGooglePage";
import AdminClientsPage from "@/pages/admin/AdminClientsPage";
import AdminClientPage from "@/pages/admin/AdminClientPage";
import AdminSettingsPage from "@/pages/admin/AdminSettingsPage";
import AdminAccountPage from "@/pages/admin/AdminAccountPage";
import AdminCouponsPage from "@/pages/admin/AdminCouponsPage";
import AdminCouponFormPage from "@/pages/admin/AdminCouponFormPage";
import AdminPromotionsPage from "@/pages/admin/AdminPromotionsPage";
import AdminPromotionFormPage from "@/pages/admin/AdminPromotionFormPage";
import AdminAbandonedCartsPage from "@/pages/admin/AdminAbandonedCartsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            element={
              <RequireAdmin loginPath="/admin/login">
                <AdminLayout />
              </RequireAdmin>
            }
          >
            <Route path="/admin" element={<AdminDashboard />} />

            {/* Vendas — mesma ordem da sidebar (widgets/admin-layout/model/navItems.ts) */}
            <Route path="/admin/pedidos" element={<AdminOrdersPage />} />
            {/* O pedido é TELA desde a feature 34 (PED-24), pela mesma regra dos Descontos: o modal
                de cinco abas não sobrevivia ao F5 e não virava link. Não entra em `navGroups` — é
                alcançada de dentro de Pedidos, mesma régua da grade rápida e do editor de seção. */}
            <Route path="/admin/pedidos/:id" element={<AdminOrderPage />} />
            <Route path="/admin/carrinhos-abandonados" element={<AdminAbandonedCartsPage />} />
            <Route path="/admin/clientes" element={<AdminClientsPage />} />
            {/* Idem para a ficha da cliente (CLI-08). */}
            <Route path="/admin/clientes/:id" element={<AdminClientPage />} />

            {/* Descontos — cupom e promoção são a mesma pergunta (feature 17).
                Os editores são telas em rota própria desde a feature 18, como as de produto. */}
            <Route path="/admin/cupons" element={<AdminCouponsPage />} />
            <Route path="/admin/cupons/novo" element={<AdminCouponFormPage />} />
            <Route path="/admin/cupons/:id/editar" element={<AdminCouponFormPage />} />
            <Route path="/admin/promocoes" element={<AdminPromotionsPage />} />
            <Route path="/admin/promocoes/nova" element={<AdminPromotionFormPage />} />
            <Route path="/admin/promocoes/:id/editar" element={<AdminPromotionFormPage />} />

            {/* Catálogo */}
            <Route path="/admin/produtos" element={<AdminProductsPage />} />
            <Route path="/admin/produtos/grade-rapida" element={<AdminQuickGridPage />} />
            <Route path="/admin/produtos/novo" element={<AdminProductFormPage />} />
            <Route path="/admin/produtos/:id/editar" element={<AdminProductFormPage />} />
            <Route path="/admin/categorias" element={<AdminCategoriesPage />} />
            {/* Feature 66 — os filtros da loja. Três rotas IRMÃS AUTO-FECHADAS (a regra de
                Configurações, abaixo: `rotasSobGuarda.test.ts` exige um `</Route>` só). A rota-mãe e a
                do grupo são a MESMA tela — o grupo aberto é a URL, e no celular ela decide se aparece a
                lista ou o editor. A marcação em massa de um valor é outra tela, alcançada de dentro do
                grupo; nenhuma das duas subrotas entra em `navGroups`. */}
            <Route path="/admin/filtros" element={<AdminFiltersPage />} />
            {/* Feature 67 — a fila de sugestões, mais uma irmã auto-fechada. O caminho estático vence
                `:groupId` no ranking do react-router v6 (`app/__tests__/rotaDasSugestoes.test.tsx`). */}
            <Route path="/admin/filtros/sugestoes" element={<AdminFilterSuggestionsPage />} />
            <Route path="/admin/filtros/:groupId" element={<AdminFiltersPage />} />
            <Route path="/admin/filtros/:groupId/valores/:valueId" element={<AdminFilterValuePage />} />
            <Route path="/admin/perguntas" element={<AdminFaqsPage />} />

            {/* Loja — o que a cliente vê. A ordem segue `navGroups`, e `navItems.test.ts` lê este
                arquivo do disco para provar que segue. */}
            <Route path="/admin/home" element={<AdminHomePage />} />
            {/* O editor de seção é a MESMA tela: a rota troca só a coluna da esquerda e conserva a
                prévia à direita. Duas rotas irmãs com o mesmo `element` mantêm `AdminHomePage`
                montado — o react-router reconcilia por posição, e a prévia não pisca ao abrir uma
                seção. `/admin/home/:sectionId` não entra em `navGroups`: não é destino de primeiro
                nível, mesma régua da grade rápida. */}
            <Route path="/admin/home/:sectionId" element={<AdminHomePage />} />
            <Route path="/admin/menu" element={<AdminMenuPage />} />
            <Route path="/admin/perguntas-frequentes" element={<AdminStoreFaqPage />} />
            {/* Feature 61 — as integrações com o Google numa tela só, com uma seção por endereço
                (`AD-046`, molde de Configurações). As três são IRMÃS AUTO-FECHADAS pelo mesmo motivo
                escrito abaixo, em Configurações: `rotasSobGuarda.test.ts` exige UM `</Route>` no
                arquivo. A rota-mãe renderiza a seção Analytics por si — é ela que mora em
                `navGroups`. O endereço antigo do Shopping (feature 30) vira redirect (`ANL-02`):
                links salvos não quebram. `rotasDoGoogle.test.ts` guarda as três. */}
            <Route path="/admin/google" element={<AdminGooglePage />} />
            <Route path="/admin/google/:secao" element={<AdminGooglePage />} />
            <Route path="/admin/google-shopping" element={<Navigate to="/admin/google/shopping" replace />} />

            {/* Configurações vem logo depois de `Loja` na sidebar, e a ordem das rotas acompanha. */}
            {/* Feature 55 — as oito abas viraram quatro seções, e cada uma ganhou endereço.
                A rota-mãe continua existindo por si (sem redirect): é ELA que está em
                `navGroups`, e um `<Navigate>` daqui trocaria o endereço da sidebar por um que ela
                não conhece.

                ⚠️ **As duas são IRMÃS AUTO-FECHADAS, e não um `<Route>` aninhado com filhos** — que
                é justamente a forma idiomática do react-router para este caso. `rotasSobGuarda.test.ts`
                (o guarda de autorização do painel inteiro) recorta o bloco do `RequireAdmin` por
                `indexOf('</Route>')` e assere que existe **exatamente um** no arquivo. Aninhar aqui
                faria aquele recorte fechar no lugar errado e o guarda encolher — ele passaria a medir
                um pedaço do arquivo em vez das rotas todas. Duas rotas irmãs com o mesmo `element`
                também mantêm a página montada ao trocar de seção, como já acontece em
                `/admin/home` e `/admin/home/:sectionId`. */}
            <Route path="/admin/configuracoes" element={<AdminSettingsPage />} />
            <Route path="/admin/configuracoes/:secao" element={<AdminSettingsPage />} />
            {/* Usuários do painel virou seção de Configurações (2026-10-28); o endereço antigo
                continua valendo para link salvo e para o e-mail de redefinição. */}
            <Route path="/admin/usuarios" element={<Navigate to="/admin/configuracoes/usuarios-do-painel" replace />} />
            <Route path="/admin/conta" element={<AdminAccountPage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
