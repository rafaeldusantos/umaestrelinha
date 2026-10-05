# 60 · A marca no cabeçalho dos e-mails — Validação

**Data**: 2026-10-05
**Spec**: `.specs/features/60-logo-nos-emails/spec.md`
**Diff range**: working tree sobre `c5bb8bc` (nada commitado — o projeto commita ao fim da feature)
**Verifier**: sub-agente independente (autor ≠ verificador)

## Veredito: ✅ PASS

19 de 19 ACs automatizáveis com evidência `arquivo:linha` cujo valor asserido é o da spec;
**23 mutantes injetados nos arquivos reais, 23 mortos, todos por asserção** (nenhum por
compilação); gate dos dois workspaces tocados remedido e idêntico ao que o autor declarou. As
lacunas abaixo são de precisão/registro, nenhuma bloqueia.

---

## Superfície do diff

Fora do escopo e ignorados: `.gitignore`, `package.json` (alterações pré-existentes de outra mão) e
`.claude/launch.json` (auxiliar de dev server).

| Camada | Arquivos |
| --- | --- |
| Render | `supabase/functions/send-notification/render/layout.ts` (`EMAIL_BRAND`, `brandHeader`, `ALT_STYLE`, `emailShell(…, storeUrl)`), `render/email.ts` (5º parâmetro) |
| Fiação | `send-notification/dispatch.ts:308`, `handlers.ts:234` (passam `deps.env.storePublicUrl`) |
| Templates de auth | `supabase/templates/{magic_link,confirmation,recovery}.html` (uma linha cada; nota no comentário do topo só em `magic_link`) |
| Asset | `apps/store/public/email/assinatura-v1@3x.png` (novo, SHA-256 `aa05717d…1b28`), `apps/store/vercel.json` (+ bloco `/email/(.*)`) |
| Script | `.specs/brand/uma-estrelinha/_raster-email.ps1` (novo) |
| Testes | functions: `brandHeader.test.ts` (novo), `render.test.ts`, `dispatch.test.ts`, `handlers.test.ts`; store: `emailBrandImage.test.ts` (novo), `authEmailTemplates.test.ts`, `vercelRedirects.test.ts` |
| Docs | `CLAUDE.md`, `apps/store/CLAUDE.md`, `supabase/CLAUDE.md`, `.specs/STATE.md` (`AD-045` + handoff), `.specs/brand/uma-estrelinha/README.md`, `.specs/features/60-*` |

`git diff --name-only -- packages/core/src/payment` → **zero** arquivos. `packages/**` e
`apps/backoffice/**` sem nenhuma alteração (`git status --short -- packages apps/backoffice` vazio).

---

## Tarefas

| Task | Status | Nota |
| --- | --- | --- |
| T01 `brandHeader` | ✅ | — |
| T02 PNG + guarda | ✅ | o script não pôde ser executado pelo verificador (política de execução do PowerShell desta máquina); a recusa de sobrescrever foi conferida por leitura (`_raster-email.ps1:24-26`) |
| T03 cache `/email/*` | ✅ | forma provada; entrega é pós-deploy |
| T04 `emailShell` | ✅ | asserções antigas **invertidas** (`render.test.ts:219-221`, `:446-449`), `TPL-03` reescrita com a mesma força (`:276-279`) |
| T05 origem no envio e na prévia | ✅ | origens distintas da de `render.test.ts` (`L-013`) |
| T06 templates de auth | ✅ | — |
| T07 prova no Mailpit | ✅ declarada pelo autor | não reexecutada; ver lacuna 1 |
| T08 fecho | ⚠️ em curso | `tasks.md:15` ainda diz "In Progress", e a tabela de rastreabilidade da spec segue "In Tasks" |

---

## Spec-anchored — critérios de aceite

Abreviações: `BH` = `supabase/functions/send-notification/__tests__/brandHeader.test.ts`,
`RT` = `…/__tests__/render.test.ts`, `DT` = `…/dispatch.test.ts`, `HT` = `…/handlers.test.ts`,
`EBI` = `apps/store/src/shared/lib/__tests__/emailBrandImage.test.ts`,
`AET` = `…/authEmailTemplates.test.ts`, `VR` = `…/vercelRedirects.test.ts`.

| AC | Resultado da spec | Evidência (`arquivo:linha` — asserção) | Resultado |
| --- | --- | --- | --- |
| LOGO-01 | um `<img>` com `src="<origem>/email/assinatura-v1@3x.png"`, `width="202"`, `height="44"`, `alt="Uma Estrelinha"`, `display:block`/`border:0`/`margin:0 auto`; sem `UMA ESTRELINHA` | `BH:37` `contar(html,'<img')).toBe(1)`; `BH:41` `toContain(\`src="${SRC}"\`)`; `BH:45-47` width/height/alt; `BH:51` cada declaração do style; `BH:55` `not.toContain('UMA ESTRELINHA')`; nos 17 eventos: `RT:749-752` (`<img` = 1, `SRC` = 1, `MARCA_ESPERADA` literal, sem wordmark); envio real: `DT:570` sobre `fetchDouble.calls[0].body.html` (payload entregue ao provedor) | ✅ |
| LOGO-02 | style com Georgia, **17px** (desvio documentado), `0.14em`, uppercase, `#F7F3EC`; sem `height` nem `max-width` | `BH:67-75` (uma asserção por declaração); `BH:80` `not.toContain('font-size:26px')`; `BH:87` `not.toMatch(/(^|;)height:/)`; `BH:88` `not.toContain('max-width')`; literal completo em `RT:130-131` (`MARCA_ESPERADA`) | ✅ (com o `SPEC_DEVIATION` registrado na spec e em `layout.ts`) |
| LOGO-03 | origem vazia ⇒ `<span>` de hoje, idêntico, sem `<img>` | `BH:95` `toBe(WORDMARK_DE_HOJE)` para `''`, `'   '`, `null`, `undefined`; `BH:96`; nos 17: `RT:767-768`; no envio: `DT:578-579` | ✅ |
| LOGO-04 | com e sem barra final ⇒ mesmo `src` | `BH:102` `brandHeader(origem)).toBe(brandHeader(ORIGEM))` e `BH:103` `src` literal, para `/` e `//` | ✅ |
| LOGO-05 | sem `<svg` nos 17 | `BH:109`; `RT:762` (17 eventos, `toLowerCase()`) | ✅ |
| LOGO-06 | `src` sem query, fragmento ou dado | `BH:116` `src).toBe(SRC)` (igualdade exata exclui qualquer dado); `BH:117` `not.toMatch(/[?#]/)`; escape: `BH:122-123` | ✅ |
| LOGO-07 | versão texto idêntica à de antes | 4 legados: `RT:178` `text).toBe(comPrefixo(legacy(event,'txt')))` (igualdade total); 17 eventos: `RT:773-774` (ausência de `<img`/endereço) | ⚠️ ver lacuna 2 — para 13 dos 17 a prova é ausência, não igualdade; estruturalmente seguro (`textBody` não recebe a origem, `email.ts:122` intocado) |
| LOGO-08 | 4 legados: assunto e texto idênticos; HTML difere só pelo cabeçalho, divergência nomeada e aplicada à fixture | `RT:150` assunto; `RT:178` texto; `RT:158` `html).toBe(comCabecalho(legacy(event,'html')))`; âncora de 1 ocorrência `RT:133-136`; sensor `RT:161-164` | ✅ |
| LOGO-09 | prévia contém o mesmo `<img>` com a origem de `STORE_PUBLIC_URL` | `HT:870` `body.html).toContain(\`src="${ORIGEM}/email/assinatura-v1@3x.png"\`)` com origem própria do dublê; `HT:871` | ✅ |
| LOGO-10 | PNG válido, 606 × 132 = 3× o declarado lido de `layout.ts` | `EBI:245` caixa 202×44 lida como texto (`EBI:211-220`, lança se não acha); `EBI:249` `[606,132]`; `EBI:250` `recusaDimensao(PNG,CAIXA)).toBeNull()`; âncora de caminho `EBI:239` | ✅ |
| LOGO-11 | todos opacos, 4 cantos `#283A4A`, traço a ±8 de `#F7F3EC` | `EBI:256`, `EBI:260`, `EBI:264`; sensores sintéticos chamam **as mesmas** funções (`EBI:292-315`) | ✅ |
| LOGO-12 | PNG sai de script versionado que lê o SVG negativo; 202 ≥ `SIGNATURE_FLOOR` importado | `EBI:270-271` (`SIGNATURE_FLOOR` importado de `@/shared/ui/brand`, `EBI:7`); a metade do script: `_raster-email.ps1:20` lê `uma-estrelinha-assinatura-negativo.svg` | ⚠️ metade do script sem teste (decisão da matriz: "none"); conferida por leitura |
| LOGO-13 | ≤ 40 KB | `EBI:275` `BYTES.length).toBeLessThanOrEqual(40*1024)` | ✅ |
| LOGO-14 | `v1` imutável, SHA-256 fixado | `EBI:281` `toBe(SHA256_DO_V1)`; o hash no disco confere (`sha256sum` = `aa05717d…1b28`) | ✅ |
| LOGO-15 | `vercel.json` com `public, max-age=31536000, immutable` em `/email/*`; entrega `image/png` | `VR:313-315` `toEqual([{key:'Cache-Control',value:'public, max-age=31536000, immutable'}])`; `VR:319-321` nenhum rewrite em `/email`; contagem `VR:235` (5 → 6) | ✅ forma · entrega = pós-deploy |
| LOGO-20 | cada template com exatamente um `<img>` = `brandHeader('{{ .SiteURL }}')` byte a byte | `BH:152` `copiasDaTag(lerTemplate(nome))).toBe(1)` com `brandHeader` **importado** (`BH:5`, `BH:140`); âncora `BH:146-148`; sensores `BH:155-161` | ✅ |
| LOGO-21 | sem `<svg`, sem `UMA ESTRELINHA` fora do comentário; réguas antigas sem afrouxar | `AET:205` `recusaMarca(stripComment(RAW[name]))).toBeNull()`; sensor `AET:216-219`; o diff de `AET` é **só acréscimo** (linhas 184-220) | ✅ |
| LOGO-22 | fio dourado logo abaixo do `<img>`, nas duas famílias | transacional: `RT:758` (17 eventos); auth: `AET:213` | ✅ |
| LOGO-23 | (operação) `site_url` conferido + `curl` antes de colar | — | ⏭️ pós-deploy (abaixo) |
| LOGO-30 | (manual) Mailpit em 390 e 1440 | declarado pelo autor; a única medida persistida é a do desvio de `LOGO-02` (113px nos dois estados) | ⏭️ manual, não reexecutado — lacuna 1 |
| LOGO-31 | (manual) Gmail/Outlook em produção | — | ⏭️ pós-deploy |

**Status**: ✅ todos os ACs automatizáveis cobertos · ⚠️ 2 lacunas de precisão sinalizadas (LOGO-07, LOGO-12)

---

## Sensor de discriminação

Arnês em scratchpad: para cada mutante, guarda os bytes originais, aplica a troca e **lança se o alvo
não for encontrado exatamente uma vez ou se o resultado for igual ao original** (mutação no-op não
prova nada), roda os arquivos de teste relevantes, restaura e **compara byte a byte**. A
classificação "compilação" procura `Transform failed`/`SyntaxError`/`Unexpected token` na saída.
Ao fim, `git diff --stat` e `git status --short` foram comparados com os capturados antes da
primeira mutação: **idênticos**, e o SHA-256 do PNG continua `aa05717d…1b28`.

| # | Arquivo | Mutação | Resultado | Morte por | Quem matou |
| --- | --- | --- | --- | --- | --- |
| M01 | `layout.ts` | ramo de origem vazia removido (`if (false)`) | ✅ morto (22 falhas) | asserção | `BH:95`, `RT:767`, `DT:578` |
| M02 | `layout.ts` | `trim()` removido do ramo vazio | ✅ morto | asserção | `BH:95` (caso `'   '`) |
| M03 | `layout.ts` | `escapeHtml` removido do `src` | ✅ morto | asserção | `BH:122` |
| M04 | `layout.ts` | `EMAIL_BRAND.width` 202 → 404 | ✅ morto (functions 44 · store 3) | asserção | `BH`, `RT`, `EBI` (dimensão 3×) |
| M05 | `layout.ts` | `max-width:100%;height:auto` de volta no style | ✅ morto | asserção | `BH:87-88`, `RT` (literal) |
| M06 | `layout.ts` | `ALT_STYLE` 17px → 26px | ✅ morto | asserção | `BH:69`, `BH:80`, `RT` |
| M07 | `layout.ts` | sem `text-transform:uppercase` | ✅ morto | asserção | `BH:70`, `RT` |
| M08 | `layout.ts` | `src` montado sem `storeLink` (barra final não normalizada) | ✅ morto | asserção | `BH:102` |
| M09 | `layout.ts` | `src` ganha `?v=1` | ✅ morto | asserção | `BH:41`, `BH:116-117` |
| M10 | `layout.ts` | `alt=""` | ✅ morto | asserção | `BH:47`, `RT` |
| M11 | `layout.ts` | fio dourado removido do `emailShell` | ✅ morto (25 falhas) | asserção | `RT:758`, `RT:158` (fixtures) |
| M12 | `layout.ts` | `emailShell` chama `brandHeader(undefined)` | ✅ morto | asserção | `RT`, `DT:570`, `HT:870` |
| M13 | `email.ts` | `renderEmail` não repassa `storeUrl` | ✅ morto | asserção | `RT`, `DT:570`, `HT:870` |
| M14 | `dispatch.ts` | envio passa `undefined` | ✅ morto | asserção | `DT:570` (payload do provedor) |
| M15 | `dispatch.ts` | envio passa origem **constante** | ✅ morto | asserção | `DT:570`, `DT:578` |
| M16 | `handlers.ts` | prévia passa `undefined` | ✅ morto | asserção | `HT:870` |
| M17 | `magic_link.html` | `<img>` volta ao `<span>UMA ESTRELINHA` | ✅ morto | asserção | `BH:152`, `AET:205`, `AET:154` (casco) |
| M18 | `confirmation.html` | URL por extenso no lugar de `{{ .SiteURL }}` | ✅ morto | asserção | `BH:152`, `AET:205` |
| M19 | `recovery.html` | cópia divergente do dono (style 26px) | ✅ morto | asserção | `BH:152`, `AET:155` |
| M20 | `recovery.html` | fio dourado removido | ✅ morto | asserção | `AET:213`, `AET:155` |
| M21 | `vercel.json` | bloco `/email/(.*)` removido | ✅ morto | asserção | `VR:312`, `VR:235` |
| M22 | `vercel.json` | `/email` com `max-age=3600` | ✅ morto | asserção | `VR:313` |
| M23 | `assinatura-v1@3x.png` | um byte a mais após o `IEND` (pixels iguais, conteúdo do `v1` alterado) | ✅ morto | asserção | `EBI:281` (SHA-256) |

**Profundidade**: acima da leve (23 mutantes; o caminho de e-mail não é dinheiro nem auth, mas o
template de auth é a porta de login).
**Resultado**: **23/23 mortos, 0 sobreviventes, 0 mortes por compilação** — ✅ PASS.

**Sobre os pixels do PNG**: não foram mutados (o SHA-256 mataria qualquer mutação antes das réguas
de pixel). O que se conferiu foi que os sensores sintéticos (`EBI:292-320`) chamam **as mesmas
funções** das asserções reais (`recusaDimensao`, `recusaTransparencia`, `recusaCantos`,
`recusaSemTraco`, `decodePng`), incluindo o inverso (PNG certo passa nas quatro) — então as réguas
de pixel discriminam por construção, não por suposição.

**Regra do payload**: os mutantes de fiação (M12–M15) foram mortos pela asserção sobre
`fetchDouble.calls[0].body.html` — o HTML **entregue ao dublê do Resend** —, não pela chamada de
`renderEmail`. M15 (origem constante) prova que a asserção não é verdadeira por acidente: a origem
do teste é diferente de qualquer constante plausível.

---

## Gate

Remedido pelo verificador, um workspace por vez, exit code fora de pipe:

| Medida | Resultado | Entrada (medida pelo autor antes de editar) | Delta |
| --- | --- | --- | --- |
| functions | **798/15, exit 0** | 677/14 | **+121/+1** |
| store (`--testTimeout=20000`) | **4311/258, exit 0** | 4287/257 | **+24/+1** |
| `tsc` store | **0 erros, exit 0** | 0 | — |
| `packages/core/src/payment/**` | **0 arquivos** | — | — |

Backoffice (3026/166), core (2554/102) e catalog-import (512/23), lint e `pnpm build` **não foram
remedidos** — nenhum arquivo desses workspaces está no diff; os números são os do autor. Nenhuma
contagem caiu; a única asserção alterada fora de acréscimo foram as três invertidas/reescritas de
`render.test.ts` (`:219`, `:276-279`, `:446-449`), todas **mais fortes** que antes (exigem a marca
exata e a ausência do texto).

---

## Qualidade de código

| Princípio | Status |
| --- | --- |
| Código mínimo | ✅ — uma função, uma constante, um parâmetro |
| Mudanças cirúrgicas | ✅ — uma linha por chamador, uma por template |
| Sem escopo extra | ✅ — o `envOr('STORE_PUBLIC_URL','http://localhost:8080')` de `index.ts:66` foi registrado e deixado, como o design manda |
| Padrões do projeto | ✅ — âncoras de contagem, recorte que lança, sensores chamando a régua, "descreva a forma proibida" (o comentário de `magic_link.html` não escreve `<svg`) |
| Spec-anchored | ✅ — valores esperados literais da spec, nunca derivados de `EMAIL_BRAND` (`BH:12-13`, `RT:124-125`) |
| Todo teste mapeia a um AC | ✅ |
| Diretrizes | `CLAUDE.md` (guardas, baselines), `supabase/CLAUDE.md` |

Observação menor: `ALT_STYLE` (`layout.ts:133`) é declarado **depois** de `brandHeader`, que o usa.
Funciona (só é lido quando a função roda, depois da carga do módulo), mas lê de baixo para cima.

---

## Casos de borda

- [x] Imagem bloqueada / 404 → `alt` estilizado claro sobre a célula escura (`LOGO-02`; medido pelo autor no Chromium)
- [x] Origem vazia → cabeçalho de hoje (`LOGO-03`, M01/M02)
- [x] Barra final → mesmo `src` (`LOGO-04`, M08)
- [x] Modo escuro clareando a faixa → fundo gravado no PNG (`LOGO-11`)
- [x] Troca de arte → `v2`; o `v1` é travado por SHA (`LOGO-14`, M23) e pelo script
- [ ] Gmail/Outlook reais → pós-deploy (`LOGO-31`)

---

## Lacunas, em ordem

1. **`LOGO-30` não tem registro persistido das medidas em 390 e 1440** — a prova no Mailpit foi
   declarada pelo autor, e o único número escrito é o do desvio de `LOGO-02` (113px nos dois
   estados). A spec pede a marca "nítida, centrada, sem rolagem horizontal" nos dois viewports; não
   há `scrollWidth` nem captura registrada. **Menor** — não muda o veredito, mas deveria entrar no
   handoff. Não reexecutado aqui.
2. **`LOGO-07` para 13 dos 17 eventos é provado por ausência** (`RT:771-775`), não por igualdade com
   o texto de antes. A igualdade total existe só nos 4 legados (`RT:178`). O risco é estrutural e
   baixo — `textBody` não recebe a origem e a linha de `email.ts:122` não mudou — mas a régua não
   pegaria, por exemplo, uma linha nova no texto que não contenha `<img` nem `email/assinatura`.
3. **`LOGO-12`, metade do script, sem teste** (decisão declarada na matriz). Conferido por leitura:
   o script lê o SVG negativo (`_raster-email.ps1:20`) e recusa sobrescrever (`:24-26`). Não foi
   executado pelo verificador — a política de execução do PowerShell da máquina o bloqueia, e ela
   não foi contornada.
4. **Higiene de documento**: `tasks.md:15` diz "In Progress" e a rastreabilidade da `spec.md` segue
   "In Tasks"; o handoff do `STATE.md` diz "Verifier pendente". Atualizar no fecho.

Nenhuma é *fix task* de código.

---

## Pendências de operação pós-deploy

Nenhuma delas é automática, e a ordem importa (`A7`: o arquivo publicado **antes** de o auth apontar
para ele).

1. **Entrega do arquivo** (`LOGO-15`, `LOGO-23`) — depois do deploy da loja:
   `curl -sD - -o /dev/null <origem-da-loja>/email/assinatura-v1@3x.png | grep -i content-type`
   tem de responder **`image/png`**, nunca `text/html` (o shell do SPA). O status 200 não prova nada.
   Conferir também `cache-control: public, max-age=31536000, immutable`.
2. **`site_url` do projeto hospedado** (`LOGO-23`, `A8`) — no dashboard do Supabase, conferir que é
   a origem da loja **sem barra final** (com barra, `{{ .SiteURL }}/email/…` vira `//email/…`). Não
   há comando que leia isso.
3. **Colar os 3 templates** (`magic_link`, `confirmation`, `recovery`) em `/auth/templates`, **sem o
   comentário do topo** — e só depois dos passos 1 e 2. Os 17 transacionais não precisam de nada no
   dashboard: saem com o deploy da function.
4. **Prova nos clientes** (`LOGO-31`) — um transacional e um código de acesso no **Gmail web e app,
   tema claro e escuro**, e no **Outlook**; e os dois **com imagens bloqueadas**, onde a faixa tem de
   mostrar o wordmark em texto claro sobre escuro, numa linha só.
5. Registrar o resultado de 1–4 neste arquivo.

---

## Rastreabilidade

| Requisito | Antes | Agora |
| --- | --- | --- |
| LOGO-01 … LOGO-06, LOGO-08 … LOGO-11, LOGO-13 … LOGO-15 (forma), LOGO-20 … LOGO-22 | In Tasks | ✅ Verified |
| LOGO-07, LOGO-12 | In Tasks | ✅ Verified, com lacuna de precisão sinalizada |
| LOGO-30 | In Tasks | ⏭️ declarado pelo autor, sem registro de medida |
| LOGO-15 (entrega), LOGO-23, LOGO-31 | In Tasks | ⏭️ pós-deploy |

## Resumo

**Geral**: ✅ Pronto para commit.
**Spec-anchored**: 19/19 ACs automatizáveis com evidência; 2 lacunas de precisão.
**Sensor**: 23/23 mortos, todos por asserção.
**Gate**: functions 798/15 · store 4311/258 · tsc 0 — exit 0.

---

## Fecho das lacunas (autor, 2026-10-05, depois do PASS)

**Lacuna 1 — as medidas de `LOGO-30`, registradas.** Medidas pelo autor na T07, Chromium do painel
de navegador, Supabase local reiniciado (`supabase stop` + `start`, sem `--all`) para o GoTrue
carregar os templates novos, loja de dev em `:8082` servindo o PNG (`200 · image/png · 16634 bytes`).
Os transacionais foram renderizados pelo `renderEmail` real (Node, fora do Vite) e postos no Mailpit
pela API dele, porque o envio local sai pelo Resend; os de auth vieram do **GoTrue de verdade**
(`/auth/v1/otp` e `/auth/v1/recover`), com `{{ .SiteURL }}` resolvido para
`http://127.0.0.1:8082` — sem barra dupla.

A página de visualização do Mailpit não declara `<meta viewport>` e desenha em 980px mesmo com a
emulação de celular; a medida de 390 injeta a meta, como um app de e-mail móvel faz.

| E-mail | Viewport | Imagem | Caixa | Centro img × card | `scrollWidth` |
| --- | --- | --- | --- | --- | --- |
| `order_paid` com origem | 390 | carregou (606 × 132) | 202 × 44 | 195 × 195 | 390 |
| `order_paid` com origem | 1440 | carregou | 202 × 44 | 720 × 720 | 1440 (card 560) |
| `order_paid` imagem inacessível | 980 (sem meta) | não carregou | **202 × 44**, faixa **113px** — igual à carregada | — | 980 |
| `order_paid` sem origem | — | sem `<img>`: o wordmark em texto de antes | — | — | — |
| recuperação de senha (GoTrue) | 390 | carregou | 202 × 44 | 195 | 390 |
| código de acesso (GoTrue) | 390 | carregou | 202 × 44 | — | — |

O estado "imagem inacessível" é o que produziu o desvio de `LOGO-02`: na primeira escrita a caixa
quebrada crescia muito além da faixa. Depois do conserto ela fica em 202 × 44 e a faixa não muda de
altura entre os dois estados.

**Lacuna 2 — `LOGO-07` por ausência em 13 eventos: aceita, não fechada.** `textBody` não recebe a
origem e a feature não tocou nele; a igualdade total já vale nos 4 legados.

**Lacuna 3 — o script fica sem teste**, como a matriz declara: o produto dele é o que o guarda mede.

**Lacuna 4 — documentos atualizados**: `tasks.md` (Done), rastreabilidade da `spec.md` (Verified,
menos os manuais) e o handoff do `STATE.md`.

**Nota de qualidade aplicada**: `ALT_STYLE` subiu para antes de `brandHeader` (só ordem de
declaração; functions remedido, 798/15, exit 0).
