import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@estrelinha/ui/sonner";
import { Toaster } from "@estrelinha/ui/toaster";
import { TooltipProvider } from "@estrelinha/ui/tooltip";
import RuntimeSettingsLoader from "@/app/RuntimeSettingsLoader";
import AbandonedCartTracker from "@/features/abandoned-cart/ui/AbandonedCartTracker";

import StoreLayout from "@/widgets/store-layout/ui/StoreLayout";
import HomePage from "@/pages/HomePage";
import CategoryPage from "@/pages/CategoryPage";
import ProductPage from "@/pages/ProductPage";
import WishlistPage from "@/pages/WishlistPage";
import CartPage from "@/pages/CartPage";
import CheckoutPage from "@/pages/CheckoutPage";
import OrderConfirmationPage from "@/pages/OrderConfirmationPage";
import AuthPage from "@/pages/AuthPage";
import SearchPage from "@/pages/SearchPage";
import AboutPage from "@/pages/AboutPage";
import PoliciesPage from "@/pages/PoliciesPage";
import AccountPage from "@/pages/AccountPage";
import CustomPinPage from "@/pages/CustomPinPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RuntimeSettingsLoader />
      <BrowserRouter>
        <AbandonedCartTracker />
        <Routes>
          <Route element={<StoreLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/colecao/:slug" element={<CategoryPage />} />
            <Route path="/produto/:slug" element={<ProductPage />} />
            <Route path="/carrinho" element={<CartPage />} />
            <Route path="/pedido/:id" element={<OrderConfirmationPage />} />
            <Route path="/busca" element={<SearchPage />} />
            <Route path="/sobre" element={<AboutPage />} />
            <Route path="/politicas" element={<PoliciesPage />} />
            <Route path="/conta" element={<AccountPage />} />
            <Route path="/favoritos" element={<WishlistPage />} />
            <Route path="/crie-seu-botton" element={<CustomPinPage />} />
            <Route path="/entrar" element={<AuthPage />} />
          </Route>

          {/*
            CHK-10: o checkout fica fora do `StoreLayout` porque tem header próprio (sem
            navegação de categorias) e CTA fixo no rodapé, que disputaria espaço com o
            `MobileNav`. A página monta o `AuthOverlay` por conta própria (CHK-02).
          */}
          <Route path="/checkout" element={<CheckoutPage />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
