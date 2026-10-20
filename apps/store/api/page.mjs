// Feature 69 (`AD-053`) — a entrada da função da Vercel. O bundle é gerado no build por
// `scripts/build-server.mjs` (com o shell do mesmo build embutido) e não é versionado.
export { default } from '../.server/page.mjs'
