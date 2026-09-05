// Extensão explícita nos dois: um módulo de `core` só é alcançável fora do Vite quando TODO
// especificador relativo do grafo tem `.ts` — inclusive `import type`. Vite e vitest resolvem as
// duas formas, então a ausência não acusa aqui e derruba um worker Deno lá. Lição da feature 33.
export * from './material.ts'
export * from './aging.ts'
