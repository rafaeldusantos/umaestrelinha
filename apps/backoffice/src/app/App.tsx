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
import AdminMockupsPage from "@/pages/admin/AdminMockupsPage";
import AdminOrdersPage from "@/pages/admin/AdminOrdersPage";
import AdminCategoriesPage from "@/pages/admin/AdminCategoriesPage";
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
            <Route path="/admin/mockups" element={<AdminMockupsPage />} />

            {/* Loja — o que a cliente vê */}
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
