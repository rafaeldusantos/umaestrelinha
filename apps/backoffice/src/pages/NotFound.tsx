import { Link } from "react-router-dom";

const NotFound = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-estrelinha-admin-bg text-estrelinha-admin-text">
    <h1 className="text-4xl font-heading font-bold">404</h1>
    <p className="text-estrelinha-admin-text-secondary">Página não encontrada.</p>
    <Link to="/admin" className="text-estrelinha-admin-violet underline">
      Voltar ao painel
    </Link>
  </div>
);

export default NotFound;
