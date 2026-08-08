import "@testing-library/jest-dom";

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

// jsdom lacks ResizeObserver (used by input-otp and other UI primitives)
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, "ResizeObserver", { writable: true, value: ResizeObserverStub });
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver);

// jsdom não tem IntersectionObserver, e o `whileInView` do framer-motion depende dele — é o que
// anima a entrada do `ProductCard`. Sem o stub, qualquer teste que renderize um card morre em
// `IntersectionObserver is not defined` antes de chegar à asserção.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: number[] = [];
}
Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: IntersectionObserverStub,
});
globalThis.IntersectionObserver =
  globalThis.IntersectionObserver ??
  (IntersectionObserverStub as unknown as typeof IntersectionObserver);

// Vazamento de timer do input-otp@1.4.2 (usado nos steps de código do AuthOverlay).
//
// O pacote agenda TRÊS timers num useEffect que não devolve cleanup — em dist/index.mjs:
//   function ht(r){ let s=setTimeout(r,0), e=setTimeout(r,10), u=setTimeout(r,50); return [s,e,u] }
// O callback chama setters do React. Se um deles disparar depois do teardown do jsdom,
// `getCurrentEventPriority` acessa `window`, que já não existe, e o ReferenceError sobe como
// unhandled error — derrubando o exit code da suíte inteira mesmo com todos os testes passando.
//
// Só reproduz sob carga (o paralelismo do `turbo run test` atrasa os timers para depois do
// teardown), o que fazia o `pnpm test` alternar entre exit 0 e 1 sem mudança de código.
//
// Ceder ~100ms no fim de cada ARQUIVO — não de cada teste — dá aos três timers a chance de
// disparar enquanto o ambiente ainda está vivo. Custo: ~100ms × nº de arquivos de teste.
// Remover quando o input-otp passar a limpar esses timers no unmount.
afterAll(async () => {
  await new Promise((resolve) => setTimeout(resolve, 100));
});
