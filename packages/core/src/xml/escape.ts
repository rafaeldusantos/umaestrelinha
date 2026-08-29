// O escape de XML do projeto — **um** dono, dois consumidores.
//
// Nasceu na feature 30, dentro de `shopping/xml.ts`, quando só o feed do Merchant Center serializava
// XML. A feature 33 (sitemap) é o segundo consumidor, e é essa a razão de o arquivo existir aqui:
// duas escritas do mesmo escape não quebram nada — build, `tsc` e teste de componente passam com as
// duas divergindo — e a divergência aparece como documento malformado num rastreador, semanas
// depois. É o "defeito 01" do repositório aplicado a seis linhas de `replace`.
//
// **Sem import nenhum, e com extensão explícita em quem o importa**: os dois consumidores rodam em
// Deno (`supabase/functions/{google-feed,sitemap}`), que resolve por caminho relativo com extensão.

/**
 * Escape de conteúdo textual de XML.
 *
 * Os caracteres de controle C0 (exceto tab, LF e CR) **não têm representação** em XML 1.0 — nem
 * escapados. Removê-los é a única saída que produz documento bem-formado, e a descrição de 679
 * produtos vem de uma origem que não os proíbe.
 */
export const escapeXml = (value: string): string =>
  String(value ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
