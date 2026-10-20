// Feature 69 — a leitura do shell que o build da função `api/page` embute (`build-server.mjs`).
//
// Separada do script para ter teste: empacotar um shell ausente, vazio ou que não é o da loja
// serviria uma página em branco em toda URL, e nada além deste arquivo acusaria (o build passa).
import { existsSync, readFileSync } from 'node:fs'

/** O `index.html` deste build, ou LANÇA com o motivo. */
export const lerShell = caminho => {
  if (!existsSync(caminho)) {
    throw new Error(
      `${caminho} não existe. Rode o \`vite build\` antes — a função embute o shell do mesmo build.`,
    )
  }
  const shell = readFileSync(caminho, 'utf8')
  if (!shell.includes('id="root"')) {
    throw new Error(`${caminho} não parece o shell da loja (sem \`id="root"\`).`)
  }
  return shell
}
