# 60 · A marca no cabeçalho dos e-mails — Especificação

> Pedido do usuário em 2026-10-05: *"os e-mails estão sendo enviados apenas com texto 'Uma
> Estrelinha' no cabeçalho, e isso torna as mensagens com menos cara da marca"*. Decisão do usuário
> no mesmo dia: os templates de auth apontam a imagem por `{{ .SiteURL }}` (ver **A3**).

## Problem Statement

As duas famílias de e-mail da loja — os **17 transacionais** (`send-notification`, render em
`supabase/functions/send-notification/render/layout.ts`) e os **3 de auth** (GoTrue, em
`supabase/templates/*.html`) — abrem com a mesma faixa `primary-strong` (#283A4A) e, dentro dela, o
texto `UMA ESTRELINHA` em Georgia. É o único ponto de contato da marca que **não** usa o desenho da
marca: o header da loja assina com a `EstrelinhaSignature` (vetor monoline, `tone="onInk"`, 202px),
e o e-mail assina com uma fonte de sistema. Para quem acabou de comprar uma joia memorial, a
primeira mensagem da loja parece genérica.

**SVG não serve em e-mail**, e isso define a forma da solução: o Gmail remove SVG inline e recusa
`<img src="*.svg">`, e o Outlook desktop não renderiza nenhum dos dois. O que vai ao e-mail é um
**PNG rasterizado do mesmo SVG-fonte da marca**, servido por URL absoluta.

## Goals

- [ ] Os 20 e-mails (17 transacionais + 3 de auth) abrem com a **assinatura visual da marca** — o
      mesmo desenho do header da loja — no lugar do texto.
- [ ] Nenhum e-mail fica **pior** do que hoje em cliente que bloqueia imagem: com a imagem
      bloqueada, a faixa mostra o wordmark em texto, como hoje.
- [ ] O arquivo da marca tem **um dono** (o SVG-fonte de `.specs/brand/`), e o PNG é derivado dele
      por script versionado, nunca desenhado à mão.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Logo no rodapé, selo ou marca d'água | O pedido é o cabeçalho; o rodapé é texto e continua texto |
| Anexo inline por `cid:` (Resend) | Funcionaria só para os transacionais — o GoTrue não anexa nada —, e as duas famílias passariam a ter cabeçalhos construídos de jeitos diferentes |
| Variante específica de modo escuro (`<picture>`/`prefers-color-scheme`) | Suporte irregular entre clientes; o fundo opaco gravado na imagem (`LOGO-11`) resolve o caso que importa sem ramificação |
| O lockup (com "ETERNIZANDO SUAS LEMBRANÇAS") | Piso de 600px (`LOCKUP_FLOOR`); o card do e-mail tem 560px e 496px úteis. Ver **A1** |
| Mudar paleta, fio dourado, tipografia do corpo, rodapé ou preheader | A feature troca só o conteúdo da faixa |
| Send Email Hook (`BL-045`) | Outra feature; os templates de auth continuam colados no dashboard |
| Domínio próprio da loja | `STORE_PUBLIC_URL` e `site_url` continuam o que são; a feature herda o domínio que estiver configurado |

---

## Assumptions & Open Questions

| # | Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- | --- |
| **A1** | Qual degrau da marca | **Assinatura negativa** (`uma-estrelinha-assinatura-negativo.svg`), exibida a **202 × 44** | É o degrau do header da loja (`Header.tsx:175`, `width={202} tone="onInk"`), acima do piso `SIGNATURE_FLOOR = 190` — a 202px o traço mais fino rende ≥ 1px (`L-023`: o critério é o piso medido, não o nome da arte). O lockup não cabe no card | y — plano aprovado |
| **A2** | Onde o arquivo mora | `apps/store/public/email/assinatura-v1@3x.png`, servido pela loja | Asset estático com versão no nome pode ter cache `immutable`; os transacionais já dependem da origem da loja para os links de CTA, então o logo não cria modo de falha novo | y — plano aprovado |
| **A3** | Como os templates de auth chegam à imagem | `{{ .SiteURL }}/email/assinatura-v1@3x.png` | Escrever a URL por extenso seria um segundo dono do domínio, que ainda vai mudar. **Custo aceito**: o `site_url` do hospedado não é legível por comando (`supabase/CLAUDE.md`), então ele é conferido à mão antes de colar (`LOGO-23`) | **y — decisão do usuário, 2026-10-05** |
| **A4** | Resolução e fundo do arquivo | **606 × 132 px** (exatamente 3× a caixa exibida), fundo **opaco #283A4A** em todos os pixels, traço #F7F3EC | 3× cobre as telas de celular de alta densidade (~90% do acesso). Fundo opaco: se o modo escuro de um cliente clarear a faixa, um PNG transparente com traço claro some; com o fundo dentro da imagem, ela continua legível. O desenho (proporção 4,61:1) cabe em 606 × 131,5 e é centrado na vertical — a sobra é da cor da faixa, invisível | y — plano aprovado |
| **A5** | Teto de peso do arquivo | **≤ 40 KB** | Folga larga para um traço monoline em duas cores; impede que um export sem compressão (ou com fundo fotográfico) entre sem ninguém notar | n — escolha do autor |
| **A6** | Texto alternativo | `alt="Uma Estrelinha"`, com o estilo do wordmark de hoje no próprio `<img>` (Georgia, **17px** — ver o desvio em `LOGO-02` —, `letter-spacing:0.14em`, `text-transform:uppercase`, #F7F3EC) | Clientes que bloqueiam imagem (Outlook por padrão) pintam o `alt` com o estilo do elemento: o e-mail bloqueado fica igual ao de hoje. O `alt` em caixa mista é o que o leitor de tela lê bem; a caixa alta é visual | y — plano aprovado |
| **A7** | Ordem de publicação | O PNG e o `vercel.json` vão ao ar **antes** de os templates de auth serem colados de novo; a function e a loja saem no mesmo push | Regra do `CLAUDE.md`: produção se ordena pelo que está PUBLICADO. Para os transacionais, a janela entre o deploy da function e o da Vercel é de minutos e custa, no pior caso, o `alt` estilizado (`LOGO-03`) — o mesmo estado de hoje. Para o auth não há janela aceitável, porque colar é manual e pode ser feito a qualquer hora | n — escolha do autor |
| **A8** | `site_url` com barra final | Assume-se **sem** barra final; a conferência de `LOGO-23` inclui isso | `{{ .SiteURL }}/email/…` com barra final vira `//email/…`. O GoTrue não oferece função de junção no template | n — conferido no passo manual |

**Open questions:** none — todas resolvidas ou registradas acima.

---

## User Stories

### P1: A marca nos e-mails de pedido ⭐ MVP

**User Story**: Como cliente que acabou de comprar (ou cujo pedido mudou de estado), quero que o
e-mail da loja abra com a marca dela, para reconhecer de imediato quem está falando comigo.

**Why P1**: São 17 eventos (`NOTIFICATION_EVENTS`), e quatro deles saem ligados para toda compra.

**Acceptance Criteria**:

1. **`LOGO-01`** WHEN qualquer um dos 17 eventos é renderizado com a origem da loja preenchida THEN
   o HTML SHALL conter, dentro da faixa do cabeçalho, **exatamente um** `<img>` com
   `src="<origem sem barra final>/email/assinatura-v1@3x.png"`, `width="202"`, `height="44"`,
   `alt="Uma Estrelinha"`, e `display:block`, `border:0` e `margin:0 auto` no `style` — e o texto
   `UMA ESTRELINHA` SHALL deixar de existir como conteúdo do cabeçalho.
2. **`LOGO-02`** WHEN o `<img>` do cabeçalho é renderizado THEN o `style` dele SHALL conter as
   declarações do wordmark de hoje — `font-family:Georgia,'Times New Roman',serif`,
   `font-size:17px`, `letter-spacing:0.14em`, `text-transform:uppercase` e `color:#F7F3EC` —, para
   o texto alternativo herdar a aparência atual quando a imagem for bloqueada; e SHALL NOT declarar
   `height` nem `max-width` (a caixa respeita os 44px do atributo).
   > **SPEC_DEVIATION (T07, medido no Chromium):** a primeira escrita pedia `font-size:26px` e
   > carregava `max-width:100%;height:auto`. A 26px "UMA ESTRELINHA" mede **286px** numa caixa de
   > 202, e o `height:auto` vence o atributo: com a imagem inacessível a caixa quebrada crescia até
   > caber duas linhas, e a faixa ficava **mais alta que a de hoje** — o oposto do Goal "nunca pior
   > que hoje". A 17px o texto mede 187px e cabe numa linha; sem `height:auto` a faixa fica com
   > 113px nos dois estados (imagem carregada e quebrada).
3. **`LOGO-03`** WHEN a origem da loja chega **vazia** (env ausente) THEN o cabeçalho SHALL sair
   **idêntico ao de hoje** — o `<span>` com `UMA ESTRELINHA` — e SHALL NOT conter `<img>`. Um `src`
   relativo desenharia o ícone de imagem quebrada no lugar da marca.
4. **`LOGO-04`** WHEN a origem é informada com e sem barra final (`https://x.com` e
   `https://x.com/`) THEN o `src` SHALL ser o mesmo nos dois casos.
5. **`LOGO-05`** WHEN qualquer dos 17 eventos é renderizado THEN o HTML SHALL NOT conter `<svg`.
6. **`LOGO-06`** WHEN o `src` é montado THEN ele SHALL NOT conter query string, fragmento nem dado
   do pedido ou da destinatária — é o mesmo endereço para todo e-mail, e não pode virar pixel de
   rastreio de abertura — a loja não rastreia abertura de e-mail, e a política de privacidade não
   declara esse tratamento.
7. **`LOGO-07`** WHEN qualquer evento é renderizado THEN a **versão texto** SHALL ser idêntica à de
   antes desta feature.
8. **`LOGO-08`** WHEN os quatro e-mails legados (`order_received`, `order_paid`, `order_shipped`,
   `material_received`) são comparados às fixtures congeladas THEN assunto e texto SHALL continuar
   idênticos, e o HTML SHALL diferir **somente** pela troca do cabeçalho (`LOGO-01`) e pelo `#` da
   feature `58` — com a divergência nomeada e aplicada à fixture, e a fixture **não** regerada.
9. **`LOGO-09`** WHEN o painel pede a prévia de um evento (`?action=preview`) THEN o HTML devolvido
   SHALL conter o mesmo `<img>`, com a origem de `STORE_PUBLIC_URL`.

**Independent Test**: renderizar os 17 eventos com e sem origem e inspecionar a faixa; disparar um
e-mail local e abri-lo no Mailpit (`:54344`).

---

### P1: O arquivo da marca ⭐ MVP

**User Story**: Como quem mantém a loja, quero que a imagem do e-mail seja derivada do SVG-fonte da
marca e tenha um único endereço estável, para que ela não diverja do header nem quebre e-mails já
entregues.

**Why P1**: Sem o arquivo publicado, `LOGO-01` desenha imagem quebrada.

**Acceptance Criteria**:

1. **`LOGO-10`** WHEN o repositório é lido THEN `apps/store/public/email/assinatura-v1@3x.png`
   SHALL existir, ser PNG válido e medir **606 × 132 px** — exatamente **3×** o `width`/`height`
   declarados no `<img>` de `LOGO-01`, lidos do fonte de `layout.ts` e não de uma cópia.
2. **`LOGO-11`** WHEN os pixels do PNG são lidos THEN **todos** SHALL ser opacos (alfa 255), os
   quatro cantos SHALL ser #283A4A, e SHALL existir pixel de traço com cor dentro de ±8 por canal
   de #F7F3EC. (A segunda metade é o que recusa a arte **positiva** — traço #283A4A sobre fundo
   #283A4A, que passaria nas outras duas e seria invisível.)
3. **`LOGO-12`** WHEN o PNG é gerado THEN ele SHALL sair de um script versionado em
   `.specs/brand/uma-estrelinha/` que lê `uma-estrelinha-assinatura-negativo.svg`, no molde de
   `_raster-icons.ps1` — e a largura **exibida** (202) SHALL ser ≥ `SIGNATURE_FLOOR`, lido do
   módulo da marca da loja.
4. **`LOGO-13`** WHEN o arquivo é medido THEN ele SHALL ter **≤ 40 KB** (`A5`).
5. **`LOGO-14`** WHEN `assinatura-v1@3x.png` já foi publicado THEN ele SHALL NOT ser alterado nem
   removido: e-mails já entregues apontam para ele para sempre. Um guarda fixa o **SHA-256** do
   arquivo; arte nova entra como `assinatura-v2@3x.png`.
6. **`LOGO-15`** WHEN `/email/*` é servido pela loja THEN o `vercel.json` SHALL declarar
   `Cache-Control: public, max-age=31536000, immutable` para esse caminho, e o arquivo SHALL ser
   entregue com `Content-Type: image/png` — **não** o shell do SPA. A prova em produção é o tipo
   **entregue** (`curl -sD - -o /dev/null <url> | grep -i content-type`), nunca o status.

**Independent Test**: rodar o script, conferir dimensão/peso/pixels do arquivo, e um `curl` no
endereço publicado.

---

### P1: A marca nos e-mails de acesso ⭐ MVP

**User Story**: Como cliente pedindo um código de acesso ou redefinindo a senha, quero que esse
e-mail tenha a mesma cara dos e-mails de pedido, para confiar que ele é da loja.

**Why P1**: É o primeiro e-mail que a convidada recebe, e duas famílias que chegam na mesma caixa
de entrada e não se parecem são a loja falando com duas vozes (`layout.ts`, comentário do
`emailShell`).

**Acceptance Criteria**:

1. **`LOGO-20`** WHEN os três templates (`magic_link`, `confirmation`, `recovery`) são lidos THEN
   cada um SHALL conter, na faixa do cabeçalho, exatamente um `<img>` com
   `src="{{ .SiteURL }}/email/assinatura-v1@3x.png"` e os **mesmos** atributos e `style` de
   `LOGO-01`/`LOGO-02` — a tag dos templates e a do `emailShell` SHALL ser iguais depois de trocar o
   `src`, comparadas por teste que lê os dois do disco.
2. **`LOGO-21`** WHEN os três templates são lidos THEN SHALL NOT conter `<svg` nem o texto
   `UMA ESTRELINHA` como conteúdo do cabeçalho; e as réguas existentes de
   `authEmailTemplates.test.ts` (`{{ .Token }}` presente, `{{ .ConfirmationURL }}` ausente, casco
   idêntico entre os três, paleta) SHALL continuar passando sem uma asserção afrouxada.
3. **`LOGO-22`** WHEN o fio dourado sob a marca é procurado THEN ele SHALL continuar existindo, logo
   abaixo do `<img>`, nas duas famílias.
4. **`LOGO-23`** (operação) WHEN os templates vão ser colados no dashboard THEN, **antes**, o
   `site_url` do projeto hospedado SHALL ser conferido como a origem da loja, sem barra final
   (`A8`), e o `curl` de `LOGO-15` SHALL responder `image/png` (`A7`). O registro vai ao
   `validation.md`.

**Independent Test**: pedir um código de acesso na loja local e abrir no Mailpit
(`{{ .SiteURL }}` local é `http://127.0.0.1:8082`, a loja de dev).

---

### P2: Prova nos clientes de e-mail de verdade

**User Story**: Como dona da loja, quero saber que a marca aparece no Gmail e no Outlook das
clientes, e não só num teste.

**Why P2**: jsdom e vitest não renderizam e-mail; o que se prova por teste é a marcação.

**Acceptance Criteria**:

1. **`LOGO-30`** WHEN um transacional e um código de acesso são abertos no Mailpit em 390 e em 1440
   THEN a marca SHALL aparecer nítida, centrada, sem rolagem horizontal.
2. **`LOGO-31`** WHEN, em produção, um transacional e um código de acesso chegam ao **Gmail** (web
   e app, tema claro e escuro) e ao **Outlook** THEN a marca SHALL aparecer legível nos quatro; e
   com imagens bloqueadas, a faixa SHALL mostrar o wordmark em texto (`LOGO-02`).

---

## Edge Cases

- WHEN a imagem não carrega (bloqueio, offline, 404) THEN a faixa SHALL mostrar o `alt` com o estilo
  do wordmark (`LOGO-02`) sobre o fundo escuro da célula — nunca texto escuro sobre escuro.
- WHEN a origem da loja está vazia THEN o cabeçalho de hoje (`LOGO-03`).
- WHEN a origem vem com barra final THEN o mesmo `src` (`LOGO-04`).
- WHEN o modo escuro de um cliente clareia a faixa THEN o retângulo da imagem continua #283A4A, com
  a marca legível (`LOGO-11`).
- WHEN a viewport do cliente é estreita (390) THEN a imagem de 202px cabe no card sem reduzir; se
  algum cliente reduzir o card abaixo de 202px a imagem transborda — nenhum card real chega lá (o menor medido é 350px em 390), e `height:auto` foi recusado por quebrar o estado de falha (`LOGO-02`).
- WHEN alguém troca o desenho da marca THEN a troca entra como `v2` e o `v1` permanece (`LOGO-14`).

---

## Implicit-requirement dimensions

| Dimensão | Resolução |
| --- | --- |
| Input validation & bounds | `LOGO-03`, `LOGO-04`, `LOGO-06` (origem vazia, barra final, nada de dado no `src`); `LOGO-13` (peso) |
| Failure / partial-failure | `LOGO-02` + Edge Cases (imagem bloqueada ou 404 cai no wordmark em texto) |
| Idempotency / retry / duplicate | N/A porque o render é puro e o asset é estático; o reenvio de um e-mail produz o mesmo HTML |
| Auth boundaries & rate limits | N/A porque o asset é público por natureza (a marca da loja) e não carrega dado; `LOGO-06` garante que ele não vire identificador |
| Concurrency / ordering | `A7` + `LOGO-23`: o asset publicado antes de o auth apontar para ele |
| Data lifecycle / expiry | `LOGO-14`: o `v1` é eterno, porque e-mails entregues o referenciam para sempre |
| Observability | N/A porque não há código novo com caminho de erro: imagem que falha é o `alt`, e o cliente de e-mail não reporta nada à loja (e não deve — `LOGO-06`) |
| External-dependency failure | Edge Cases: bloqueio e proxy de imagem do Gmail; a Vercel fora do ar cai no `alt` |
| State-transition integrity | N/A porque não há estado |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| LOGO-01 | P1: e-mails de pedido | Tasks | Verified |
| LOGO-02 | P1: e-mails de pedido | Tasks | Verified |
| LOGO-03 | P1: e-mails de pedido | Tasks | Verified |
| LOGO-04 | P1: e-mails de pedido | Tasks | Verified |
| LOGO-05 | P1: e-mails de pedido | Tasks | Verified |
| LOGO-06 | P1: e-mails de pedido | Tasks | Verified |
| LOGO-07 | P1: e-mails de pedido | Tasks | Verified |
| LOGO-08 | P1: e-mails de pedido | Tasks | Verified |
| LOGO-09 | P1: e-mails de pedido | Tasks | Verified |
| LOGO-10 | P1: arquivo da marca | Tasks | Verified |
| LOGO-11 | P1: arquivo da marca | Tasks | Verified |
| LOGO-12 | P1: arquivo da marca | Tasks | Verified |
| LOGO-13 | P1: arquivo da marca | Tasks | Verified |
| LOGO-14 | P1: arquivo da marca | Tasks | Verified |
| LOGO-15 | P1: arquivo da marca | Tasks | Verified |
| LOGO-20 | P1: e-mails de acesso | Tasks | Verified |
| LOGO-21 | P1: e-mails de acesso | Tasks | Verified |
| LOGO-22 | P1: e-mails de acesso | Tasks | Verified |
| LOGO-23 | P1: e-mails de acesso (operação) | Pós-deploy | Pending (operação) |
| LOGO-30 | P2: prova em clientes | T07 | Verified (manual) |
| LOGO-31 | P2: prova em clientes | Pós-deploy | Pending (operação) |

**Coverage:** 21 total, 21 mapped to tasks (ver `tasks.md`), 0 unmapped

---

## Success Criteria

- [ ] Os 20 e-mails abrem com a assinatura da marca no Mailpit, em 390 e 1440.
- [ ] Gmail (web/app, claro/escuro) e Outlook mostram a marca; com imagem bloqueada, o wordmark em
      texto.
- [ ] Nenhum e-mail fica pior que hoje em nenhum dos estados de falha (origem vazia, imagem
      bloqueada, 404).
- [ ] `packages/core/src/payment/**` sem uma linha alterada; lint e tipos sem regressão contra a
      baseline.
