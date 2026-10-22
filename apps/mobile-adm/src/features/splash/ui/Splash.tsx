import lockup from '../assets/uma-estrelinha-lockup-negativo.svg?raw'

/**
 * A splash desenhada do app do ateliê (feature 72, `MAF-05`..`MAF-07`).
 *
 * O Android desenha antes a placa do manifest (ícone sobre `primary-strong`); esta é a tela que o
 * app mostra enquanto a sessão é resolvida. Ela não tem tempo próprio: quem decide quando sai é o
 * piso de `useMinimumDuration` e a sessão.
 *
 * **EXCEÇÃO DECLARADA À ESCADA DA MARCA** — decisão do usuário em 2026-10-22. O LOCKUP completo tem
 * piso de 600 px (`apps/store/CLAUDE.md`, *Ícones e marca*), e aqui ele sai a **300 px**, como no
 * protótipo. A 300 px o traço da assinatura mede ~1,9 px CSS, que num celular (DPR 2–3) são 4–6
 * pixels físicos: o mesmo raciocínio da exceção do header do checkout a 180 px.
 *
 * **O SVG é INLINE, nunca `<img>`**: a splash não pode ter estado de carregamento — ela É o estado
 * de carregamento. A cópia em `../assets` é comparada byte a byte com o SVG-fonte de
 * `.specs/brand/uma-estrelinha` por `lockupDaSplashPareado.test.ts`.
 *
 * Contraste: o rótulo é `on-primary` sobre `primary-strong`. `accent` só preenche a barra; nunca é
 * texto. Todo movimento tem o par `motion-reduce:` na mesma linha — com movimento reduzido o lockup
 * aparece sem deslocamento e a barra fica cheia e parada.
 */
const Splash = () => (
  <div
    role="status"
    aria-label="Abrindo o painel do ateliê"
    className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 bg-estrelinha-primary-strong px-4"
  >
    <div
      data-testid="splash-lockup"
      className="w-[300px] max-w-full animate-splash-lockup motion-reduce:animate-none [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
      dangerouslySetInnerHTML={{ __html: lockup }}
    />
    <div className="flex flex-col items-center gap-4">
      <div data-testid="splash-trilho" className="h-1 w-[120px] overflow-hidden rounded-pill bg-estrelinha-on-primary/20">
        <div
          data-testid="splash-progresso"
          className="h-full w-full origin-left rounded-pill bg-estrelinha-accent animate-splash-progresso motion-reduce:animate-none"
        />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-estrelinha-on-primary">Ateliê · painel</p>
    </div>
  </div>
)

export default Splash
