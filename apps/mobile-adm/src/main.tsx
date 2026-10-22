import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "@estrelinha/ui/styles.css";
import "./app/app.css";

// O `AuthProvider` mora DENTRO do `App`, abaixo da checagem de rede: sem conexão ele nem monta, e
// nenhuma chamada ao Supabase sai (`MAF-19`).
createRoot(document.getElementById("root")!).render(<App />);
