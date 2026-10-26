import "@testing-library/jest-dom";
import { beforeEach } from "vitest";

import { instalarIntersectionObserver } from "./intersecao";
import { push } from "./push";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// jsdom não tem ResizeObserver, e o `Select` do Radix depende dele — sem o stub, qualquer teste que
// renderize uma tela com combobox morre em `ResizeObserver is not defined` antes da asserção.
// Mesmo stub que `apps/store/src/test/setup.ts` já tinha; o backoffice não tinha porque até agora
// nenhum teste dele renderizava uma página inteira.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, "ResizeObserver", { writable: true, value: ResizeObserverStub });
globalThis.ResizeObserver =
  globalThis.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver);

// Feature `74` (R7): jsdom não tem IntersectionObserver, e a sentinela da lista depende dele. O dublê
// não dispara sozinho — o teste decide quando a sentinela aparece (`@/test/intersecao`).
instalarIntersectionObserver();

// Feature `74`: jsdom não implementa `window.scrollTo` (só loga "Not implemented"). A lista restaura a
// rolagem ao voltar (`useRolagemRestaurada`); os testes que medem isso trocam por um `vi.fn`.
Object.defineProperty(window, "scrollTo", { writable: true, configurable: true, value: () => {} });
beforeEach(async () => {
  instalarIntersectionObserver();
  // Feature `79` (T18): o Web Push falso volta ao jsdom puro (sem os três) e a porta falsa esvazia.
  // Import ESTÁTICO de propósito: `push.ts` não importa o client do supabase.
  push.reset();
  // O episódio da recusa é do módulo; cada caso começa sem o do vizinho. O import é DINÂMICO de
  // propósito: um import estático aqui carregaria o client do supabase antes do `vi.mock` do arquivo
  // de teste, e o dublê deixaria de valer.
  const { esquecerReconferencia } = await import("@/features/access-check/model/useRecusaDePapel");
  esquecerReconferencia();
});
