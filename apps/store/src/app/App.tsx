import { lazy, Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { isPreviewWindow } from "@estrelinha/core/home";
import { Toaster as Sonner } from "@estrelinha/ui/sonner";
import { TooltipProvider } from "@estrelinha/ui/tooltip";
import ChunkErrorBoundary from "@/app/ChunkErrorBoundary";
import RuntimeSettingsLoader from "@/app/RuntimeSettingsLoader";
import { createQueryClient } from "@/app/queryClient";
import ScrollToTop from "@/app/ScrollToTop";
import AbandonedCartTracker from "@/features/abandoned-cart/ui/AbandonedCartTracker";
import RouteFallback from "@/shared/ui/RouteFallback";

// A moldura NÃO é preguiçosa: ela aparece em toda rota da loja, e adiar o header seria trocar um
// download por dois. Quem é preguiçosa é a página dentro do `Outlet` dela.
import StoreLayout from "@/widgets/store-layout/ui/StoreLayout";

/*
 * `PRF-10` — **uma página, um chunk**.
 *
 * Antes disto a loja era UM arquivo de 1,17 MB (278 KB brotli medidos em 2026-09-05): quem abria a
 * home baixava e interpretava o checkout, o Pix, o QR code, o login por OTP e o guia de material. E
 * como era arquivo único, **todo deploy invalidava os 278 KB inteiros** no cache de quem já visitou.
 *
 * O que NÃO muda: a tabela de rotas de `AD-018` e o ranqueamento por especificidade do React Router.
 * `lazy` troca o valor de `element`, nunca o `path` — `routes.test.ts`, `reservedSlugs.test.ts` e
 * `sitemapRoutes.test.ts` continuam lendo este arquivo com a mesma régua.
 *
 * `NotFound` entra na lista e **também** é importado pela `CategoryPage`, que o renderiza no caminho
 * de slug inexistente (`URL-04`). Isso põe a 404 no chunk da categoria além do próprio, e é o
 * comportamento correto: quem chega numa URL errada já está baixando a categoria.
 */
const HomePage = lazy(() => import("@/pages/HomePage"));
const CategoryPage = lazy(() => import("@/pages/CategoryPage"));
const ProductPage = lazy(() => import("@/pages/ProductPage"));
const WishlistPage = lazy(() => import("@/pages/WishlistPage"));
const CartPage = lazy(() => import("@/pages/CartPage"));
const CheckoutPage = lazy(() => import("@/pages/CheckoutPage"));
const OrderConfirmationPage = lazy(() => import("@/pages/OrderConfirmationPage"));
const AuthPage = lazy(() => import("@/pages/AuthPage"));
const SearchPage = lazy(() => import("@/pages/SearchPage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const PoliciesPage = lazy(() => import("@/pages/PoliciesPage"));
const HowToSendMaterialPage = lazy(() => import("@/pages/HowToSendMaterialPage"));
const AccountPage = lazy(() => import("@/pages/AccountPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

/**
 * `PRF-07`: o cliente nasce com `staleTime` de 5 minutos, e o porquê está em `queryClient.ts`.
 * Sem ele, toda consulta nascia velha e voltar a uma categoria já vista refazia 307 KB de JSON.
 */
const queryClient = createQueryClient();

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
      {/*
        PRF-13: o `Toaster` do Radix saiu daqui. Ele vinha montado ao lado do Sonner e **não tinha um
        único consumidor na loja** — os sete avisos de hoje (adicionar ao carrinho, cupom, partilha,
        recuperação de carrinho, checkout) saem todos por `sonner`. Dois sistemas de aviso montados,
        um deles morto, no chunk inicial. `toasterUnico.test.tsx` guarda a ausência: sem ele, um
        `useToast` novo voltaria a montar o segundo sistema sem ninguém notar.
      */}
      <Sonner />
      <RuntimeSettingsLoader />
      <BrowserRouter>
        {/*
          Página nova abre no topo. Fica aqui, e não no `StoreLayout`, porque o checkout e o 404
          estão fora dele — dentro do layout, as duas rotas herdariam a rolagem da página anterior.
        */}
        <ScrollToTop />
        {/*
          Navegar a prévia não pode virar carrinho abandonado: a dona conferindo a vitrine dispararia
          rastreio de uma sessão que não é de cliente nenhuma, e o e-mail de recuperação sairia para
          o endereço dela (`PRV-05`).
        */}
        {!previewMode && <AbandonedCartTracker />}
        {/*
          O limite de erro fica ACIMA do `Suspense`: quem falha é o `import()` de dentro dele, e um
          limite irmão não pegaria. Sem ele, um chunk que não baixa — rede que caiu, ou um deploy novo
          com hashes novos enquanto a aba está aberta — deixa TELA BRANCA.

          O `Suspense` daqui atende as rotas que vivem FORA do `StoreLayout` (o checkout e a 404), que
          ocupam a tela inteira. As de dentro do layout têm o `Suspense` do próprio `StoreLayout`, em
          volta do `Outlet`: ali o header e o rodapé já estão na tela, e trocá-los pelo fallback seria
          justamente o deslocamento de layout que `PRF-10` proíbe.
        */}
        <ChunkErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
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
                <Route
                  path="/como-enviar-seu-material-de-dna"
                  element={<HowToSendMaterialPage />}
                />
                {/*
                  Feature 31: o guia mudou de endereço e o antigo continua resolvendo. Em produção quem
                  responde é o 301 do edge (`vercel.json`), antes de a SPA carregar; isto é o espelho para
                  `pnpm dev` e para o vitest, que não têm edge nenhum — sem ele a URL que está no rodapé
                  de todo e-mail já enviado só quebraria no dia do cutover. `replace` para o botão
                  "voltar" não cair de novo no redirect.
                */}
                <Route
                  path="/como-enviar-o-material"
                  element={<Navigate to="/como-enviar-seu-material-de-dna" replace />}
                />
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
          </Suspense>
        </ChunkErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
