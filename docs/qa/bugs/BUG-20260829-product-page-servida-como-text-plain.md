# BUG-20260829 — A página do produto responde 200, e o navegador mostra o código-fonte

- **Achado em**: 2026-08-29, na primeira execução real das edge functions da
  [`30-google-shopping`](../../../.specs/features/30-google-shopping/spec.md) contra o projeto
  hospedado
- **Severidade**: **alta** — atinge as 3.233 ofertas do Google Shopping e toda visita humana a
  `/produtos/:slug` depois do cutover
- **Onde**: `supabase/functions/product-page` + a decisão [`AD-020`](../../../.specs/STATE.md)
- **Status**: ✅ **CORRIGIDO** em 2026-08-29, no mesmo dia, pelo override de `Content-Type` no
  `vercel.json` (`AD-021`). **Medido em produção** depois do deploy `dabe2a6`:

  ```
  HTTP/1.1 200 OK
  Content-Type: text/html; charset=utf-8      ← era text/plain
  Content-Security-Policy: frame-ancestors 'self' …
  Referrer-Policy: strict-origin-when-cross-origin
  ```

  Conferido em **três** produtos, com corpos de tamanhos diferentes (4816b · 4790b · 5649b — o
  JSON-LD varia por produto), e o shell servido é o do build novo (`index-DwSK8A-F.js`).
  **A Vercel sobrescreve sim o `Content-Type` de resposta proxiada.**

## O sintoma

`GET https://umaestrelinha-store-five.vercel.app/produtos/<slug>` devolve **HTTP 200**, com o shell
certo, o JSON-LD certo (`"@type":"Product"`, `"@type":"Offer"`, `"price":"239.90"`) injetado no
`<head>`. E mesmo assim a página **não funciona**:

```
HTTP/1.1 200 OK
Content-Type: text/plain            ← o código define text/html; charset=utf-8
X-Content-Type-Options: nosniff
Cache-Control: public, s-maxage=300, stale-while-revalidate=86400
```

`text/plain` + `nosniff` é a combinação que **proíbe** o navegador de interpretar o corpo como HTML.
A cliente vê o código-fonte da página como texto. O Googlebot vê um documento de texto, não um
produto.

## A causa, medida e não suposta

A plataforma da Supabase reescreve **especificamente** `text/html` no domínio compartilhado
`*.supabase.co`. Não é a Vercel, não é o `rewrite`, não é o código: a chamada **direta** à function
já volta assim. A comparação entre as duas functions irmãs isola a variável:

| Function | Content-Type que o código define | O que chega |
| --- | --- | --- |
| `google-feed` (`handlers.ts:62`) | `text/plain; charset=utf-8` | **idêntico** — charset preservado |
| `product-page` (`handlers.ts:104`) | `text/html; charset=utf-8` | **`text/plain`**, sem charset, `nosniff` acrescentado |

O `Cache-Control` da `product-page` atravessa intacto na mesma resposta. Ou seja: os headers da
function **são** respeitados — só o `text/html` é trocado. É proteção anti-XSS de domínio
compartilhado, e é da plataforma.

## Por que ninguém pegou

**Nenhum degrau da malha olha para o content-type.**

- `shoppingParity.test.ts` compara as duas serializações — mede o **corpo**, e o corpo está certo.
- Os testes de `product-page` exercitam `handleProductPage` com dependências injetadas: medem o
  `Response` que a function **constrói**, não o que o gateway **entrega**.
- O passo `conferir secrets` do CI valida nomes de secret.
- E o ritual de fecho que o `CLAUDE.md` prescreve — *"Rodar o `curl -I` das duas é o que fecha"* —
  **teria declarado isto verde**: o status é 200.

É a classe de defeito que o projeto mais paga caro, num lugar novo: **a asserção e a entrega têm
donos diferentes, e só a asserção é testada.** Nenhum teste do repositório pode pegar este defeito,
porque ele nasce fora do processo que os testes carregam.

## Por que é pior que o 502 que ele substituiu

Antes deste conserto a rota devolvia **502** — falha óbvia, que qualquer verificação acusa. Agora
devolve **200 com corpo correto**. Toda checagem de status code passa; o que quebra é invisível para
a máquina e total para o humano.

## O que NÃO resolve

- **Trocar o content-type no código.** Ele já está certo (`handlers.ts:104`). Quem reescreve é o
  gateway.
- **Tirar o `nosniff`.** Não é nosso, vem junto.
- **Mudar o `rewrite` da Vercel.** A resposta já chega errada antes da Vercel.

## Caminhos possíveis (decisão em aberto)

1. **Domínio próprio para as Edge Functions da Supabase.** Fora do domínio compartilhado a proteção
   não se aplica. Custo: recurso de plano + DNS.
2. **Mover a injeção para a própria Vercel** (função serverless/edge no app da loja, servindo
   `/produtos/:slug`). O content-type passa a ser nosso, o `rewrite` para host externo desaparece —
   e some junto a incerteza que a `AD-020` declarou e nunca confirmou (*"não confirmei que a Vercel
   cacheia proxy para host externo"*). Custo: uma segunda implementação do mesmo passo, e `AD-020`
   precisa ser revista para o dono continuar sendo `@estrelinha/core/shopping`.
3. **Forçar o header no `vercel.json`** para o caminho `/produtos/:slug`. É o mais barato, e exige
   que a Vercel sobrescreva o `Content-Type` de uma resposta proxiada. **Implementado, ainda não
   provado** — ver a medição abaixo.

## O que a medição de 2026-08-29 diz sobre o caminho 3

Duas medições, e elas **discordam** — o que por si só é o achado mais útil aqui.

**`vercel dev` (local, com o `vercel.json` novo):** a rota proxiada voltou `text/plain` e **sem
nenhum header do `vercel.json`** — nem o `Referrer-Policy`, nem o CSP da regra global. As rotas não
proxiadas (`/`, `/sobre`) receberam os três normalmente. Sinal: no emulador, header de config não
alcança resposta proxiada.

**Produção (com o `vercel.json` ANTIGO, sem a regra nova):** a mesma rota proxiada voltou **com**
`Content-Security-Policy`, `Referrer-Policy` e `X-Content-Type-Options` da regra global — e com
`Content-Type: text/plain` do upstream.

```
HTTP/1.1 200 OK                                    ← produção, /produtos/:slug
Content-Security-Policy: frame-ancestors 'self' …  ← veio do vercel.json
Referrer-Policy: strict-origin-when-cross-origin   ← veio do vercel.json
Content-Type: text/plain                           ← veio do upstream
```

**Conclusão, e o limite dela.** Em produção a Vercel **aplica** headers de config a respostas
proxiadas — então o caminho 3 não está descartado. O que continua sem resposta é a pergunta
específica: **`Content-Type` é sobrescrevível, ou é reservado e o upstream sempre vence?** Nenhuma
das duas medições responde, porque a produção nunca rodou a regra nova.

**E `vercel dev` NÃO serve para decidir isto.** Ele diverge da produção exatamente nesta dimensão —
usá-lo como prova daria a resposta errada. Registrado porque a tentação de confiar nele é grande e
custaria uma decisão de arquitetura tomada sobre emulador.

**O que fechou**: publicar o `vercel.json` novo e medir. **O caminho 3 funciona** — ver o Status no
topo. `vercel dev` teria feito descartá-lo.

## O que a mesma medição descobriu de quebra: o cache não existe

Quatro batidas seguidas na mesma URL, depois do conserto:

```
batida 1: 1,185s  X-Vercel-Cache: MISS
batida 2: 1,744s  X-Vercel-Cache: MISS
batida 3: 0,870s  X-Vercel-Cache: MISS
batida 4: 1,270s  X-Vercel-Cache: MISS
```

**A Vercel não cacheia `rewrite` para host externo**, apesar do `s-maxage=300` que a function
manda. É exatamente a incerteza que a `AD-020` declarou por escrito — *"não confirmei que a Vercel
cacheia proxy para host externo, e se não cachear a decisão precisa ser revista antes do cutover"* —
e a condição que ela mesma pôs **foi atingida**.

Consequência real: **toda visita a produto paga ~1s** e atravessa a edge function, que por sua vez
busca o shell e consulta o banco. Não é só o rastreador do Google. Isso não é regressão deste
conserto — era assim antes, e só agora foi medido —, mas é o argumento que faltava para a
[`BL-017`](../../../.specs/BACKLOG.md): uma função **da própria Vercel** é cacheada nativamente, e o
proxy externo deixa de existir.

## Estado deixado

- `STORE_PUBLIC_URL` gravado no projeto hospedado como
  `https://umaestrelinha-store-five.vercel.app` (domínio **provisório** — tem de mudar antes de
  ligar o feed, senão os `<g:link>` das ofertas apontam para o `.vercel.app`).
- `product-page` e `google-feed` redeployadas em 2026-08-29.
- O 502 anterior está **corrigido**: o shell é buscado e o JSON-LD é injetado. O que resta é a
  entrega.
