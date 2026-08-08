import boundaries from "eslint-plugin-boundaries";

/**
 * Fronteiras de import do Feature-Sliced Design (compartilhado pelos apps).
 *
 * Regra: uma camada só pode importar de camadas ESTRITAMENTE abaixo dela.
 * Ordem (privilégio decrescente): app > pages > widgets > features > entities > shared.
 *
 * Está em modo "warn" durante a transição da Fase 2 — violações devem ser
 * corrigidas incrementalmente (extraindo features de entities, etc.).
 * Cross-imports na mesma camada são tolerados por ora.
 */
const allow = (types) => ({ allow: { to: { element: { types: { anyOf: types } } } } });

export const fsdBoundaries = {
  files: ["src/**/*.{ts,tsx}"],
  plugins: { boundaries },
  settings: {
    // Resolve o alias `@/` (por app, via tsconfig no cwd) para o boundaries
    // conseguir classificar o alvo de cada import.
    "import/resolver": {
      typescript: { alwaysTryTypes: true, project: "tsconfig.app.json" },
    },
    "boundaries/include": ["src/**/*"],
    "boundaries/elements": [
      { type: "app", pattern: "src/app/**" },
      { type: "pages", pattern: "src/pages/**" },
      { type: "widgets", pattern: "src/widgets/**" },
      { type: "features", pattern: "src/features/**" },
      { type: "entities", pattern: "src/entities/**" },
      { type: "shared", pattern: "src/shared/**" },
    ],
  },
  rules: {
    "boundaries/dependencies": [
      "warn",
      {
        default: "disallow",
        policies: [
          { from: { element: { types: "app" } }, ...allow(["app", "pages", "widgets", "features", "entities", "shared"]) },
          { from: { element: { types: "pages" } }, ...allow(["pages", "widgets", "features", "entities", "shared"]) },
          { from: { element: { types: "widgets" } }, ...allow(["widgets", "features", "entities", "shared"]) },
          { from: { element: { types: "features" } }, ...allow(["features", "entities", "shared"]) },
          { from: { element: { types: "entities" } }, ...allow(["entities", "shared"]) },
          { from: { element: { types: "shared" } }, ...allow(["shared"]) },
        ],
      },
    ],
  },
};
