import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6 text-center">
      <div className="flex flex-col gap-2">
        <p className="estrelinha-eyebrow text-estrelinha-ink-soft">Erro 404</p>
        <h1 className="font-display text-[38px] font-semibold leading-[1.1] tracking-[-0.03em] text-estrelinha-ink md:text-[52px]">
          Esse pin não existe.
        </h1>
        <p className="mx-auto max-w-[420px] text-[16px] leading-relaxed text-estrelinha-ink-soft">
          A página que você procurou saiu de catálogo ou nunca existiu. Bora achar outra coisa
          para colecionar?
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          to="/"
          className="rounded-sm bg-estrelinha-primary px-[30px] py-[15px] font-display text-[16px] font-semibold text-white transition-transform hover:scale-[1.02]"
        >
          Voltar pra home
        </Link>
        <Link
          to="/busca"
          className="rounded-sm border-2 border-estrelinha-ink px-7 py-3.5 font-display text-[16px] font-semibold text-estrelinha-ink transition-colors hover:bg-estrelinha-ground-deep"
        >
          Ver coleções
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
