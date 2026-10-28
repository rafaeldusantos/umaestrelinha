# QA Run Report — 2026-10-28 — backoffice: o Resumo com as imagens do produto (85) — reteste

- **Scope:** reteste em navegador dos quatro bugs consertados depois da rodada `2026-10-28-backoffice-resumo-com-imagens.md` (working tree sem commit), mais regressão curta do Resumo, do zoom e do modal Mídia.
- **Cadence tier:** targeted
- **Build:** `8d9aaf5a` + árvore da 85 (sem commit) · **Environment:** só local — painel `vite` do worktree em http://localhost:8093 (já de pé) contra o Supabase local (:54441); `*.supabase.co` e `**/g/collect*` abortados no contexto. Login real `admin@umaestrelinha.dev`.
- **Started:** 2026-10-28 · **Status:** closed

## Método

- Chromium pelo Playwright, 390×844 (e 360/412 para a fonte); fonte grande por `html { font-size: 200% }`.
- **Bundle servido conferido antes de medir** (`GET /src/...`): `ProductMediaSummary.tsx` com `aria-live`, `announce`, `overflow-hidden`, `max-w-full truncate`, `MEDIA_FOCUS_FALLBACK_ATTR`; `ProductMediaDialog.tsx` com `isConnected`; `useProductImageUpload.ts` com `UPLOAD_DONE_LINGER_MS`; `ImageGallery.tsx` com `aria-live`; `AdminProductFormPage.tsx` com `break-words` e `announce`.
- Medidas por `getBoundingClientRect` e `Range.getClientRects`; foco por `document.activeElement` e `:focus-visible`; regiões vivas por `[aria-live]` lidas a cada passo.
- Dados: os envios foram feitos em `/admin/produtos/novo` **sem salvar** (não foi preciso criar peça `TESTE-85-QA-`). Os 4 objetos que a sessão enviou ao bucket `product-images` foram apagados pela API do Storage no fim (conferido: 0 objetos depois de 04:53:30Z). `ff520070-…` (9) e `eb0d919d-…` (6) só lidos — conferido no fim: 9/6 fotos. Uma falha de envio foi forçada interceptando o 1º POST de upload com 500.

## Session Matrix & Results

| # | Bug / jornada | Persona | Status |
|---|---|---|---|
| 1 | BUG-20261028-resumo-corta-fatos-e-adicionar-com-fonte-200 | Adri, fonte do sistema grande | Fixed (retestado) |
| 2 | BUG-20261028-foco-cai-no-body-quando-a-pendencia-de-imagem-se-resolve | Equipe com teclado / TalkBack | Fixed (retestado) |
| 3 | BUG-20261028-envio-de-fotos-nao-e-anunciado-ao-leitor | Equipe com TalkBack | Fixed (retestado no DOM; leitor real pendente) |
| 4 | BUG-20261028-linhas-de-envio-ficam-na-tela | Adri cadastrando peças | Fixed (retestado) |
| 5 | Regressão: Resumo em 390, zoom, modal Mídia | Adri cadastrando peças | Pass |

## Retestes

### 1 — Fonte 200 %: "Não controla" e "Adicionar"

`eb0d919d-…`, Resumo:

| largura | card (x) | "Não controla" | borda direita máx. do `<dl>` | ladrilho | rótulo visível |
|---|---|---|---|---|---|
| 360/200 % | 48–312 | 153–263 | 272 | 185–257, 72×72 | até 255, "Adi…" |
| 390/200 % | 48–342 | 124–293 | 293 | 185–257, 72×72 | até 255, "Adi…" |
| 412/200 % | 48–364 | 146–315 | 315 | 185–257, 72×72 | até 255, "Adi…" |

Antes: "Não controla" terminava em x = 377 e o conteúdo do ladrilho media 87 px. Agora o valor desce para a linha de baixo, alinhado à direita e dentro do card; o ladrilho corta o próprio conteúdo (`overflow: hidden`, rótulo com reticências); nome acessível "Adicionar imagens". A 100 % nada muda. Evidência: `.playwright-mcp/85-reteste-01-resumo-390-fonte200.png`, `85-reteste-02-adicionar-390-fonte200.png`.

### 2 — Foco quando a pendência se resolve

`/admin/produtos/novo`: Tab até a pendência "Ao menos uma imagem", Enter (foco dentro do modal), envio de 1 PNG até "enviada", Esc ⇒ foco em **"Editar mídia · 1 sem descrição"** com `:focus-visible` (antes: `<body>`). Par sem envio: Esc ⇒ foco volta à pendência. O Esc duplo depois de `setInputFiles` persiste no Playwright (observação já aberta). Evidência: `85-reteste-03-foco-depois-da-pendencia-390.png`.

### 3 — Envio anunciado ao leitor

| momento | Resumo | modal |
|---|---|---|
| modal fechado, antes do envio | `aria-live="polite"`, vazia | — |
| modal fechado, enviando/enviada | `polite` com "arquivo · enviando/enviada" | — |
| modal aberto | `aria-live="off"` | `polite` (vazia antes; "arquivo 1 KB enviando/enviada" durante) |

Só uma região de envio fala por vez; nenhuma sob `aria-hidden`. A outra `polite` presente é o Toaster do app. Leitor de tela real (TalkBack/VoiceOver) não exercitado.

### 4 — Linhas de envio

- 1 PNG pelo Resumo: "enviada" sai 4,35 s depois do fim do lote.
- Lote de 2 com o 1º upload forçado a 500: no fim "rt85-verde.png · falhou" + "rt85-azul.png · enviada"; aos 3 s as duas; aos 5 s só "falhou"; aos 15 s "falhou" segue.

Evidência: `85-reteste-04-enviada-resumo-390.png`, `85-reteste-05-enviada-e-falhou-390.png`, `85-reteste-06-so-falhou-fica-390.png`.

### 5 — Regressão curta (390×844, `ff520070-…`, 9 fotos)

- Principal de 290 px em y 393–683, acima da dobra; miniaturas 72×72; `scrollWidth` 390 (sem rolagem lateral).
- Zoom: foco em "Ampliar imagem 1 de 9", Enter abre, Esc fecha ⇒ foco volta a "Ampliar imagem 1 de 9".
- Modal Mídia: 20 botões, nenhum controle abaixo de 44×44; "Concluir" ⇒ foco volta a "Editar mídia".

Evidência: `85-reteste-07-regressao-resumo-390.png`, `85-reteste-08-regressao-modal-390.png`.

(Evidências em `.playwright-mcp/` na raiz do repositório principal `store/`.)

## Paper Cuts

| Persona | Onde | Felt | Sharpness | Outcome |
|---|---|---|---|---|
| Adri, fonte 200 % | ladrilho "Adicionar" do Resumo | o rótulo vira "Adi…" | baixa (o "+" e o nome acessível dizem o que é) | registrado, sem bug |
| Equipe com leitor | modal Mídia, fim do envio | o sucesso é anunciado pela região viva e também pelo toast `assertive` "1 imagem(ns) enviada(s)!" (da galeria de antes da 85) | baixa | registrado, sem bug |

## Final Status

Os quatro bugs passam no reteste em navegador; ficam `fixed — retestado`, e viram `verified` com o commit. Regressão curta limpa. Pendente: leitor de tela real para o bug 3 e o Esc duplo depois de escolher arquivo (observação da rodada anterior). Suíte automatizada não reexecutada nesta rodada (reteste sem mudança de código).
