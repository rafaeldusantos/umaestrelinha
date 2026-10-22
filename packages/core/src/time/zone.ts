// Feature 71 · VIS-34 — o fuso da loja, declarado UMA vez em TypeScript.
//
// É cópia deliberada da função SQL `public.store_time_zone()` (migration da 71): só o banco decide
// a que dia de Brasília um instante pertence, e o TypeScript usa esta constante só para ESCREVER a
// hora de um instante que o banco devolveu. O guarda da migration (`visitasSchema.test.ts`) importa
// esta constante e a compara com o literal do SQL.
//
// ⚠️ Este arquivo não importa nada: é folha alcançável pelo Deno por caminho relativo.

export const STORE_TIME_ZONE = 'America/Sao_Paulo'
