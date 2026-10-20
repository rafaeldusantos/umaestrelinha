// Feature 70 (SMV-05, SMV-06) — o `robots.txt` servido é GERADO no build, a partir do modelo.
//
// A linha `Sitemap:` era escrita à mão em `public/robots.txt`, e era o segundo dono da origem da
// loja (`AD-022`), ao lado da env `STORE_PUBLIC_URL`: no dia do domínio próprio, trocar uma e
// esquecer a outra faria o `robots.txt` apontar para um host e o sitemap declarar outro — e o Google
// IGNORA referência de sitemap entre domínios, em silêncio. Agora a linha sai da env, num lugar só.
//
// **A linha SAIU do modelo, em vez de virar marcador**, e a escolha é de dano: um marcador que o
// passo do build deixasse de substituir seria publicado como `Sitemap: __ALGO__/sitemap.xml` — uma
// URL relativa que o Google ignora sem avisar. Sem linha nenhuma no modelo, o único jeito de a linha
// existir é este gerador tê-la escrito; e o gerador RECUSA um modelo que já traga uma (seria o
// segundo dono voltando por edição).
//
// O arquivo continua ESTÁTICO em `dist/` (`AD-022`): `robots.txt` em 5xx faz o Google parar de
// rastrear o site inteiro, e um arquivo do build nunca responde 5xx.
//
// Separado do script (`build-robots.mjs`) para ter teste, no molde de `shell.mjs`.

/** A origem de `pnpm dev:store` e de `vite preview` — o recuo FORA da Vercel. */
export const ORIGEM_LOCAL = 'http://localhost:8082'

const LINHA_SITEMAP = /^\s*sitemap\s*:/i

/**
 * A origem que a linha `Sitemap:` declara, sem barra final — ou LANÇA com o motivo.
 *
 * Na Vercel (`VERCEL` definido) a env é obrigatória: um `robots.txt` apontando para `localhost` em
 * produção tiraria a loja da busca (SMV-06). Fora dela, o recuo é a origem local. Definida, ela
 * precisa ser http(s) absoluta e SEM caminho — um sitemap fora da raiz só pode declarar URLs do
 * próprio subdiretório.
 */
export const origemDoRobots = env => {
  const bruta = String(env.STORE_PUBLIC_URL ?? '').trim()
  if (bruta === '') {
    if (env.VERCEL) {
      throw new Error(
        'STORE_PUBLIC_URL não está definida no build da Vercel. A linha `Sitemap:` do robots.txt sai ' +
          'dela — sem a env, o robots.txt apontaria para outra origem. Defina-a nas envs do projeto ' +
          '(sem barra final) e refaça o deploy.',
      )
    }
    return ORIGEM_LOCAL
  }
  let url
  try {
    url = new URL(bruta)
  } catch {
    throw new Error(`STORE_PUBLIC_URL não é uma URL absoluta: ${bruta}`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`STORE_PUBLIC_URL precisa ser http ou https: ${bruta}`)
  }
  if (url.pathname !== '/' || url.search !== '' || url.hash !== '') {
    throw new Error(`STORE_PUBLIC_URL precisa ser só a origem, sem caminho nem query: ${bruta}`)
  }
  return url.origin
}

/** O modelo + UMA linha `Sitemap:` absoluta no fim. Modelo que já traga uma LANÇA. */
export const gerarRobots = (modelo, origem) => {
  if (modelo.split(/\r?\n/).some(linha => LINHA_SITEMAP.test(linha))) {
    throw new Error(
      'public/robots.txt já traz uma linha `Sitemap:`. Ela é escrita pelo build a partir de ' +
        'STORE_PUBLIC_URL — tire-a do modelo.',
    )
  }
  return `${modelo.replace(/\s+$/, '')}\n\nSitemap: ${origem}/sitemap.xml\n`
}
