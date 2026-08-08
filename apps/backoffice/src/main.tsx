import { createRoot } from "react-dom/client";
import { AuthProvider } from "@nanapin/auth";
import App from "./app/App.tsx";
import "@nanapin/ui/styles.css";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
