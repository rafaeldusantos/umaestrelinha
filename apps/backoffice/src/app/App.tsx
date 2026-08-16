import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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
import AdminCategoriesPage from "@/pages/admin/AdminCategoriesPage";
import AdminFaqsPage from "@/pages/admin/AdminFaqsPage";
import AdminHomePage from "@/pages/admin/AdminHomePage";
import AdminMenuPage from "@/pages/admin/AdminMenuPage";
import AdminClientsPage from "@/pages/admin/AdminClientsPage";
import AdminSettingsPage from "@/pages/admin/AdminSettingsPage";
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
            <Route path="/admin/carrinhos-abandonados" element={<AdminAbandonedCartsPage />} />
            <Route path="/admin/clientes" element={<AdminClientsPage />} />

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

            <Route path="/admin/configuracoes" element={<AdminSettingsPage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
