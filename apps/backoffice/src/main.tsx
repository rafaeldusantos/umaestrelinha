import { createRoot } from "react-dom/client";
import { AuthProvider } from "@estrelinha/auth";
import App from "./app/App.tsx";
import "@estrelinha/ui/styles.css";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
