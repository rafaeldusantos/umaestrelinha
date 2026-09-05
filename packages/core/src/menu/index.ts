// Extensão explícita, e ela é carregável, não cosmética (feature 33).
//
// Sem o `.ts`, `import('@estrelinha/core/menu')` falha fora de um bundler com
// `Cannot find module …/menu/menu` — medido em 2026-08-29 com node v24. O Deno das edge functions
// tem a mesma exigência, e quem precisa alcançar este módulo de lá é a function do sitemap: o dono
// da canônica de categoria é `categoryHref`, e ele mora aqui. Sem esta linha, a function seria
// empurrada a remontar `/pai/filha` à mão — o "defeito 01" nascendo dentro da feature que existe
// para enumerar canônicas.
//
// Vite e vitest resolvem as duas formas, então nada acusa a ausência. `core/shopping` e
// `core/routes` já nasceram assim, pelo mesmo motivo.
export * from './menu.ts'
export * from './icons.ts'
export * from './target.ts'
export * from './banners.ts'
