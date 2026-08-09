import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

// O importador grava no banco com service role. `packages/` nasceu fora do `pnpm lint` (BL-002) e
// por isso o código de dinheiro nunca passou por ESLint; este workspace declara `lint` desde o
// primeiro commit para não repetir aquilo.
export default tseslint.config(
  { ignores: [".cache", "reports"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
  },
);
