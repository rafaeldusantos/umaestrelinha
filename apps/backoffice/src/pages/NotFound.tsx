import { Link } from "react-router-dom";

const NotFound = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-nana-bg text-nana-text">
    <h1 className="text-4xl font-heading font-bold">404</h1>
    <p className="text-nana-text-secondary">Página não encontrada.</p>
    <Link to="/admin" className="text-nana-violet underline">
      Voltar ao painel
    </Link>
  </div>
);

export default NotFound;
