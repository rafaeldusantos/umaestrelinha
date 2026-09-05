// Extensão explícita: `core/color` é candidato a ser lido fora do Vite (Deno resolve o grafo,
// inclusive o de tipos, e um `export * from './contrast'` sem `.ts` derruba o worker antes da
// primeira linha rodar). Lição medida na feature 33 com `core/menu`.
export * from './contrast.ts'
