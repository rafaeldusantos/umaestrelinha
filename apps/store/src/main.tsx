import { createRoot } from "react-dom/client";
import { initMercadoPago } from "@mercadopago/sdk-react";
import { AuthProvider } from "@nanapin/auth";
import App from "./app/App.tsx";
import "@nanapin/ui/styles.css";
import "./app/App.css";

// Bricks do Mercado Pago — só inicializa com a public key presente
// (dev sem a env continua funcionando; o passo de pagamento exige a key).
if (import.meta.env.VITE_MP_PUBLIC_KEY) {
  initMercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY, { locale: "pt-BR" });
}

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
