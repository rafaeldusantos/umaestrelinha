import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { isPreviewWindow } from "@estrelinha/core/home";
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
import HowToSendMaterialPage from "@/pages/HowToSendMaterialPage";
import AccountPage from "@/pages/AccountPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

/**
 * Feature 25 — a loja dentro do iframe de `/admin/home`.
 *
 * Lido aqui, do `window`, e não por `useSearchParams`: este componente está **acima** das `Routes`.
 * A mesma função responde no `useHomePreview`, então as duas pontas não podem divergir.
 */
const previewMode =
  typeof window !== "undefined" &&
  isPreviewWindow(window.location.search, window.parent !== window);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RuntimeSettingsLoader />
      <BrowserRouter>
        {/*
          Navegar a prévia não pode virar carrinho abandonado: a dona conferindo a vitrine dispararia
          rastreio de uma sessão que não é de cliente nenhuma, e o e-mail de recuperação sairia para
          o endereço dela (`PRV-05`).
        */}
        {!previewMode && <AbandonedCartTracker />}
        <Routes>
          {/*
            A tabela de rotas de `AD-018` — o formato que a loja em produção publica e que o Google
            indexou: produto em `/produtos/:slug`, categoria **na raiz do domínio** (`/:slug`) e
            subcategoria em `/:pai/:filha`.

            **O React Router v6 ranqueia por ESPECIFICIDADE, não pela ordem destas linhas**: segmento
            estático pontua acima de dinâmico, e dinâmico acima de splat. É por isso que `/conta`
            vence `/:slug`, `/produtos/:slug` vence `/:parentSlug/:slug` e `path="*"` só pega o que
            sobra — reordenar este arquivo não muda nada, e apagar `/conta` daqui faria a rota virar
            uma categoria em silêncio.

            **E é exatamente essa a armadilha que `AD-018` registra**: com categoria na raiz, o
            namespace de rota e o de slug de categoria são o MESMO. Rota nova de um segmento entra em
            `ROUTE_SLUGS` (`@estrelinha/core/routes`), senão uma categoria homônima some sem aviso.

            As três rotas legadas navegam para o canônico (`legacy`). Em produção quem responde é o
            301 do edge, antes da SPA carregar; aqui é o espelho para `pnpm dev` e para o vitest, que
            não têm edge nenhum — sem ele a rota legada só quebraria no dia do cutover.
          */}
          <Route element={<StoreLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/produtos/:slug" element={<ProductPage />} />
            <Route path="/produto/:slug" element={<ProductPage legacy />} />
            <Route path="/colecao/:slug" element={<CategoryPage legacy />} />
            <Route path="/categoria/:slug" element={<CategoryPage legacy />} />
            <Route path="/carrinho" element={<CartPage />} />
            <Route path="/pedido/:id" element={<OrderConfirmationPage />} />
            <Route path="/busca" element={<SearchPage />} />
            <Route path="/sobre" element={<AboutPage />} />
            <Route path="/politicas" element={<PoliciesPage />} />
            <Route path="/como-enviar-o-material" element={<HowToSendMaterialPage />} />
            <Route path="/conta" element={<AccountPage />} />
            <Route path="/favoritos" element={<WishlistPage />} />
            <Route path="/entrar" element={<AuthPage />} />
            <Route path="/:slug" element={<CategoryPage />} />
            <Route path="/:parentSlug/:slug" element={<CategoryPage />} />
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
