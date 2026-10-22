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
