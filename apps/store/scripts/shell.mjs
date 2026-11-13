// Feature 69 — a leitura do shell que o build da função `api/page` embute (`build-server.mjs`).
//
// Separada do script para ter teste: empacotar um shell ausente, vazio ou que não é o da loja
// serviria uma página em branco em toda URL, e nada além deste arquivo acusaria (o build passa).
import { existsSync, readFileSync, rmSync } from 'node:fs'

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

/**
 * Tira o `index.html` da saída publicada quando o build roda na Vercel (`VERCEL` definido), depois de
 * o shell estar embutido no bundle. Lá o filesystem serve `/` antes do catch-all, e a Home sairia sem
 * o veredito da faixa de avisos no `<html>`; sem o arquivo, ela passa pela função como toda página.
 * Fora da Vercel o arquivo fica, para o `vite preview` continuar servindo a loja. Devolve se tirou.
 */
export const tirarShellDaSaida = (caminho, env) => {
  if (!env.VERCEL) return false
  rmSync(caminho, { force: true })
  return true
}
