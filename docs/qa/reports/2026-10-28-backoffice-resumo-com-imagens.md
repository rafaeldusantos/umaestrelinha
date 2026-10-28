# QA Run Report — 2026-10-28 — backoffice: o Resumo com as imagens do produto (85)

- **Scope:** feature `85` no worktree `85-resumo-com-imagens` (árvore sem commit sobre `8d9aaf5a`): card Resumo com a foto principal e as miniaturas, zoom, envio pelo Resumo, modal Mídia no lugar da aba. Ciclo planejado no `README.md` (8 charters + canário).
- **Cadence tier:** targeted
- **Build:** `8d9aaf5a` + árvore da 85 · **Environment:** só local — painel `vite` do worktree em http://localhost:8093 contra o Supabase local (:54441); `*.supabase.co` e `**/g/collect*` abortados no contexto; painel da `master` em :8083 usado só para comparar dois achados.
- **Started:** 2026-10-28 · **Status:** closed

## Personas

| Persona | Base | Device / Network / Locale | Sessions |
|---|---|---|---|
| Adri cadastrando peças | Power User | 390×844 (e 360/412/1024/1440), wifi, pt-BR, fonte 100/130/200 % (`html { font-size }`) | 1–5, 7, 8, canário |
| Equipe com TalkBack | Accessibility | 1440×900 só teclado + árvore de acessibilidade | 6 |

## Flows in Scope

- `J-ver-e-cuidar-das-fotos-da-peca` — abrir a peça, reconhecê-la pela foto e cuidar das fotos sem trocar de aba (`../journeys/J-ver-e-cuidar-das-fotos-da-peca.md`)
- Canário: `J-cadastrar-peca-com-variacoes`, só o modal de imagem da variação.

Dados: duas peças `TESTE-85-QA-` criadas por SQL (cópia de `eb0d919d-…`, 3 fotos, uma com a variação "Folheado a ouro" apontando a foto 2), salvas pelo painel e **apagadas no fim** junto com os 14 objetos que a sessão enviou ao bucket `product-images` (apagados pela API do Storage). `ff520070-…` (9), `eb0d919d-…` (6) e `fdc81401-…` (28) só foram lidos — conferido no fim: 9/6/28 fotos, sem vídeo. Evidência em `evidence/2026-10-28-backoffice-resumo-com-imagens/`.

## Session Matrix & Results

| # | Charter | Journey / Scenario | Persona | Tour | Status | Issue | Fix commit |
|---|---|---|---|---|---|---|---|
| 1 | CH-midia-ver-e-cuidar-da-peca-no-celular | J-ver-e-cuidar-das-fotos-da-peca | Adri cadastrando peças | Money | Pass | BUG-20261028-linhas-de-envio-ficam-na-tela (paper cut) | |
| 2 | CH-midia-regressoes-da-pagina | PNL-midia-regressoes-da-pagina | Adri cadastrando peças | Back-Button | Blocked (human decision) | BUG-20261028-produto-abre-com-alteracoes-nao-salvas (anterior); BUG-20261028-modal-de-imagem-da-variacao-solta-o-foco (anterior) | |
| 3 | CH-midia-falhas-de-envio | PNL-midia-falha-de-envio | Adri cadastrando peças | Network | Pass | BUG-20261028-lote-com-falhas-so-mostra-o-ultimo-motivo | |
| 4 | CH-midia-muitas-fotos | PNL-midia-muitas-fotos | Adri cadastrando peças | Feature | Pass | BUG-20261028-ordenar-fotos-so-arrastando (anterior) | |
| 5 | CH-midia-celular-e-fonte-grande | PNL-midia-modal-alvos-44-em-390; PNL-midia-fonte-grande-e-telas | Adri cadastrando peças | Feature | Blocked (human decision) | BUG-20261028-resumo-corta-fatos-e-adicionar-com-fonte-200 | |
| 6 | CH-midia-teclado-e-leitor | PNL-midia-teclado-e-leitor; PNL-midia-zoom-percorrer | Equipe com TalkBack | Feature | Blocked (human decision) | BUG-20261028-foco-cai-no-body-quando-a-pendencia-de-imagem-se-resolve; BUG-20261028-envio-de-fotos-nao-e-anunciado-ao-leitor; BUG-20261028-ordenar-fotos-so-arrastando; BUG-20261026-fechar-do-modal-em-ingles (re-found) | |
| 7 | CH-midia-produto-sem-imagem | PNL-midia-produto-sem-imagem | Adri cadastrando peças | Feature | Pass | (foco: ver #6) | |
| 8 | CH-midia-arrastar-arquivo | PNL-midia-arrastar-arquivo | Adri cadastrando peças | Feature | Blocked (needs human verify) | — (sintético passa; arrasto nativo do SO só humano) | |
| canário | CH-variacoes-cadastrar-pecas-repetidas (modal de imagem da variação) | PNL-variacoes-imagem-na-linha-e-envio | Adri cadastrando peças | — | Pass | BUG-20261028-modal-de-imagem-da-variacao-solta-o-foco (anterior) | |

Status legend: `Pending | Pass | Fixed | Skipped | Blocked (needs human verify) | Blocked (human decision)`. Nenhum
conserto aplicado (pedido: só QA, sem código); o que falhou está em *Decisions for a Human*.

## Session Debriefs

### 1. CH-midia-ver-e-cuidar-da-peca-no-celular — Adri cadastrando peças

- **Ran:** 390×844, `sessionStorage` limpo, peça TESTE A (3 fotos); depois 1024 e 1440.
- **Findings:**
  - **RES-01/02/06/07:** Resumo antes das abas em 390; a partir de `lg`, Publicação (y 138) → Resumo (496) → Pronto para publicar (1309). Um só no DOM. Sem "Prévia na loja". Link "Abrir na loja ↗" → `:8082/produtos/teste-85-qa-a` (o rótulo é "Abrir na loja ↗", não "Abrir ↗" como na spec — só texto). Abas: Geral, Perguntas, Preços & variações, SEO, Relacionados.
  - **Dobra:** principal 292×292, termina em **684** (390×844) — passa. 1440×900: **874** (dentro). 1024×768: **811** (abaixo da dobra; Goal, não AC — relatado, não reprovado). `scrollWidth` = viewport nas três.
  - **Zoom (ZOM-01..06):** abre na tocada ("2 / 3", alt embaixo); →/← circulares; gesto touch −30 px não troca, −60/+60 trocam; fundo, Esc e Fechar fecham com o foco na imagem de origem; Fechar/Anterior/Próxima 44×44.
  - **ADI-01/03/04:** `accept="image/png,image/jpeg,image/webp"`, `multiple`. Com o POST do Storage segurado: linha "arquivo · enviando" no Resumo, os dois Salvar desabilitados; abrir o modal no meio mostra o mesmo progresso; os arquivos entram um por vez (o segundo só ganha linha quando começa). Fotos novas no fim, alt vazio ("faltando"), `source: upload`.
  - **Modal (MOD-02..05):** inventário completo — envio, colar, arrastar para ordenar (o Resumo muda ao vivo), remover (a seguinte vira "Principal"), alt com "faltando", Gerar (local: preenche com o nome da peça, sem rede), selo só de mockup, vídeo. Concluir e Esc não descartam; foco volta a "Editar mídia". "Vídeo · sim".
  - **Fim verdadeiro:** Salvar rascunho → banco local com as 4 imagens na ordem, o alt escrito e `video_url`; reabrir com `sessionStorage` limpo mostra o mesmo Resumo, "Vídeo sim" e **nada sujo**.
- **Bugs filed/updated:** BUG-20261028-linhas-de-envio-ficam-na-tela.
- **Scenarios settled:** PNL-midia-resumo-mostra-a-peca → pass; PNL-midia-zoom-percorrer → pass; PNL-midia-adicionar-pelo-resumo → pass; PNL-midia-modal-edicao-completa → pass.
- **Paper cuts:** depois de "Remover imagem 1" o foco vai para o próprio diálogo (não some, mas recomeça do título); "Adicionar" embrulha sozinho numa segunda linha quando há 3 miniaturas (correto, só alto).
- **Surprises:** a peça TESTE recém-criada abriu com "Alterações não salvas"; depois de salva pelo painel, não mais (ver #2).

### 2. CH-midia-regressoes-da-pagina — Adri cadastrando peças

- **Ran:** 1440×900, peça TESTE B (variação "Folheado a ouro" com a foto 2).
- **Findings:**
  - Remover a foto 2 no modal tira a imagem da linha da variação **ao vivo**; Salvar rascunho grava `product_variants.image_url = NULL` (conferido no banco). Passa (MOD-03).
  - `?tab=midia` cai na aba Geral, sem erro; nenhum link com "midia" na página. Passa (MOD-01).
  - Enviar foto pelo modal da variação: entra no fim do Resumo (3 → "Imagens 3") e fica escolhida na linha.
  - **Guarda de saída:** reproduzido o bug anterior (abrir `ff520070` sem tocar já diz "Alterações não salvas" e grava rascunho). Mesma peça TESTE depois de um save pelo painel abre limpa. Console: `[tiptap warn]: Duplicate extension names found: ['link']`.
  - Fechar o modal "Imagem de <variação>" (Esc ou escolhendo) deixa o foco no BODY — igual na `master` (:8083).
- **Bugs filed/updated:** BUG-20261028-produto-abre-com-alteracoes-nao-salvas (Re-found); BUG-20261028-modal-de-imagem-da-variacao-solta-o-foco (novo, anterior à 85).
- **Scenarios settled:** PNL-midia-regressoes-da-pagina → fail (só pelo bug anterior; o que é da 85 passa); PNL-variacoes-imagem-na-linha-e-envio → pass.

### 3. CH-midia-falhas-de-envio — Adri cadastrando peças

- **Ran:** 390×844, peça TESTE A.
- **Findings:**
  - GIF + PDF + HEIC soltos no Resumo: véu "Solte para enviar" aparece; três linhas "falhou", nenhuma requisição ao Storage, nenhuma foto fantasma, Salvar habilitado. Toast só do último ("foto.heic: formato não aceito — use PNG, JPG ou WebP").
  - Lote de 3 PNG com o 2º POST abortado: 1º e 3º entram (6 miniaturas), 2º "falhou", toast "teste85-verde.png: falha ao enviar", Salvar volta a habilitar.
  - Offline com um lote de 2: os dois "falhou", toast só do último; ao voltar a rede, Salvar habilitado, nenhuma foto a mais.
  - Fechar a aba no meio do envio: não forçado; o equivalente (recarregar com envios já feitos) deixou objetos no Storage sem dono, como o `side_effects` da jornada prevê.
- **Bugs filed/updated:** BUG-20261028-lote-com-falhas-so-mostra-o-ultimo-motivo.
- **Scenarios settled:** PNL-midia-falha-de-envio → pass (com o Friction acima).
- **Paper cuts:** "falha ao enviar" offline não diz "sem conexão — tente de novo".

### 4. CH-midia-muitas-fotos — Adri cadastrando peças

- **Ran:** 390×844, `ff520070` (9) e `fdc81401` (28), sem salvar (rascunho de sessão apagado).
- **Findings:**
  - 9 fotos: 7 miniaturas 72×72 + "+1" com nome "Ver mais 1 imagem" (singular, consertado); abre em "9 / 9", → dá a volta para "1 / 9"; Esc devolve o foco ao "+1".
  - 28 fotos: "+20", "Ver mais 20 imagens", zoom em "9 / 28", 20 × → volta a "1 / 28"; principal termina em 630; `scrollWidth` 390.
  - Modal com 28: 28 ladrilhos, sem rolagem lateral (388/388); arrastar o 28º para o 1º muda a principal do Resumo ao vivo. Área rolável 632 px para 13.208 px de conteúdo.
  - Imagem que não carrega (URL abortada): ladrilho com o número "2" num fundo neutro, grade intacta.
- **Bugs filed/updated:** BUG-20261028-ordenar-fotos-so-arrastando (anterior à 85).
- **Scenarios settled:** PNL-midia-muitas-fotos → pass.

### 5. CH-midia-celular-e-fonte-grande — Adri cadastrando peças

- **Ran:** 390×844 a 100 % (peças de 5, 6 e 28 fotos); 360/390/412 × 100/130/200 %.
- **Findings:**
  - **Re-medida de MOD-07 (390, 100 %): passa.** Remover imagem n **44×44** (visível sem hover, opacidade 1), Gerar **81×44**, campo de alt **328×44**, vídeo 348×44, Concluir 348×44, X 44×44. Antes (T12): 18×18, 73×24, 328×32. Modal 390×844, `scrollWidth` 388 = `clientWidth`. Igual com 6 e com 28 fotos (menor alvo 44×44).
  - Resumo a 130 %: inteiro nas três larguras. A 200 %: "Não controla" cortado pela borda do card (x 377) e o rótulo "Adicionar" vazando do ladrilho (87 px em 72).
  - Rolagem lateral do documento: 130 % → 418, 200 % → 642, causada pela aba Geral (prefixo do SlugField, sugestões de filtro "Aceitar"), anterior — não do Resumo.
  - Zoom a 200 %: contador e alt legíveis, setas e Fechar 88×88, sem rolagem.
  - Modal a 200 %: controles ≥ 44, sem rolagem lateral; mas cabeçalho + rodapé deixam só 312 px de 844 para a lista.
- **Bugs filed/updated:** BUG-20261028-resumo-corta-fatos-e-adicionar-com-fonte-200.
- **Scenarios settled:** PNL-midia-modal-alvos-44-em-390 → pass; PNL-midia-fonte-grande-e-telas → fail.
- **Paper cuts:** modal a 200 % com 37 % da altura para o conteúdo.

### 6. CH-midia-teclado-e-leitor — Equipe com TalkBack

- **Ran:** 1440×900, só teclado, peça TESTE A.
- **Findings:**
  - Cada imagem é botão "Ampliar imagem n de N", anel de foco visível. Tab até a 3ª, Enter → zoom com foco em "Fechar"; → muda; Tab preso (Anterior/Próxima/Fechar); Esc devolve o foco a "Ampliar imagem 3 de 4". Passa.
  - Modal: foco entra em "Enviar imagens"; Tab preso (dá a volta); Esc e Concluir devolvem o foco a "Editar mídia". Passa (conserto da T12 confirmado).
  - Pendência de imagens por teclado abre o modal com o foco dentro (não troca de aba); sem envio, Esc volta à pendência. **Com envio**, a pendência some e o foco cai no BODY.
  - Véu "Solte para enviar" não rouba foco; arrastar texto/link não mostra véu nem envia.
  - Progresso do envio sem região viva (Resumo e modal); falha anunciada pelo toast `assertive`.
  - Ordem só por arrasto: nenhum controle de ordem no Tab.
  - X do modal Mídia se anuncia "Close".
- **Bugs filed/updated:** BUG-20261028-foco-cai-no-body-quando-a-pendencia-de-imagem-se-resolve; BUG-20261028-envio-de-fotos-nao-e-anunciado-ao-leitor; BUG-20261028-ordenar-fotos-so-arrastando; BUG-20261026-fechar-do-modal-em-ingles (Re-found).
- **Scenarios settled:** PNL-midia-teclado-e-leitor → fail; PNL-midia-zoom-percorrer → pass.

### 7. CH-midia-produto-sem-imagem — Adri cadastrando peças

- **Ran:** 390×844, `/admin/produtos/novo`, sem salvar.
- **Findings:** "Nenhuma imagem ainda" + "Adicionar imagens" + "ou arraste os arquivos para cá" no lugar da principal; "Imagens 0 · Vídeo não". A pendência "Ao menos uma imagem" abre o **modal** (aba continua Geral). A primeira foto vira "Ampliar imagem 1 de 1" e a pendência some; zoom com 1 imagem sem setas. Remover a única foto volta ao vazio sem quebrar o card (mas a linha "enviada" fica).
- **Bugs filed/updated:** (os de #1 e #6).
- **Scenarios settled:** PNL-midia-produto-sem-imagem → pass.
- **Paper cuts:** o cabeçalho de "Novo produto" mostra o selo "Publicado" (anterior, já anotado no ciclo da 84).

### 8. CH-midia-arrastar-arquivo — Adri cadastrando peças

- **Ran:** 1440 e 390, `DragEvent`/`ClipboardEvent` sintéticos.
- **Findings:** dragenter/dragover com arquivo → "Solte para enviar"; dragleave tira o véu; drop envia igual ao botão (inclusive o caminho de falha da #3). Texto/link arrastado: sem véu, sem envio. No modal, soltar e colar um PNG entram (4 → 5 → 6) pelo mesmo progresso.
- **Scenarios settled:** PNL-midia-arrastar-arquivo → blocked-verify (o arrasto nativo do Finder/Explorer não é reproduzível no Playwright).

### Canário — modal de imagem da variação

- 390×844 com 28 fotos: modal "Imagem de Menina 4 - Folheado a Ouro" de y 16 a 828, sem rolagem lateral, "Adicionar imagens" presente. Envio pelo modal da variação escolhe a foto e entra no fim do Resumo. Foco no BODY ao fechar (anterior).

## Paper Cuts

| Persona | Where (journey/step) | Felt | Sharpness | Outcome |
|---|---|---|---|---|
| Adri | enviar 2 fotos | "mandei duas, aparece uma só" — a 2ª linha só surge quando a 1ª termina | dull | watching |
| Adri | remover no modal | o foco volta ao título do modal, não ao vizinho | dull | watching |
| Adri | modal a 200 % | sobra pouco espaço para a lista | dull | watching |
| Adri | rede caída | "falha ao enviar" não diz que foi a conexão | dull | watching |
| Adri | 1024×768 | a principal termina 43 px abaixo da dobra | dull | Goal, relatado |
| Adri | Resumo | "Abrir na loja ↗" vs. "Abrir ↗" da spec | dull | texto |

## Runtime Errors Observed

- `[tiptap warn]: Duplicate extension names found: ['link']` a cada abertura da página — anotado no Re-found de BUG-20261028-produto-abre-com-alteracoes-nao-salvas.
- Erros de rede do supabase-js só nos envios abortados de propósito (esperado).

## Human Verifications Needed

- [ ] Arrastar do Finder/Explorer um PNG e um PDF sobre o Resumo e sobre o modal: o véu aparece, some ao sair, o PNG entra e o PDF dá o toast (linha 8).
- [ ] No Android real: gesto com o dedo no zoom (> 48 px troca), arrastar para ordenar no modal com o dedo (provavelmente não funciona — ver BUG-20261028-ordenar-fotos-so-arrastando), fonte do sistema a 130/200 %.
- [ ] TalkBack real: anúncio de "Ampliar imagem n de N", "Ver mais N imagens" e do envio (linha 6).
- [ ] **Esc duplo depois de escolher arquivo no modal:** no Playwright, após `setInputFiles` no modal Mídia, o primeiro Esc não fecha (o segundo fecha; clicando antes dentro do modal, um basta). Confirmar com o seletor de arquivo real do sistema; se repetir, registrar.

## Decisions for a Human

### Resumo corta texto a 200 % (BUG-20261028-resumo-corta-fatos-e-adicionar-com-fonte-200)
- What's broken: "Não controla" cortado e "Adicionar" vazando do ladrilho a 200 % (`evidence/2026-10-28-backoffice-resumo-com-imagens/85-qa-21-resumo-card-390-fonte200.png`).
- Why not auto-fixed: pedido do ciclo (só QA).
- Options: 1. fatos em duas linhas (rótulo em cima, valor embaixo) abaixo de certa largura — muda o desenho; 2. `min-w-0` + quebra no valor e ladrilho "Adicionar" só com o ícone e `aria-label` — mínimo.
- Recommendation: 2.

### Foco perdido ao resolver a pendência (BUG-20261028-foco-cai-no-body-quando-a-pendencia-de-imagem-se-resolve)
- Options: 1. ao fechar, se o gatilho sumiu, focar "Editar mídia"; 2. sempre focar "Editar mídia" ao fechar.
- Recommendation: 1 (mantém a volta à pendência quando ela continua).

### Envio não anunciado (BUG-20261028-envio-de-fotos-nao-e-anunciado-ao-leitor)
- Options: 1. `aria-live="polite"` na lista do Resumo e do modal; 2. um `role=status` com o resumo ("2 fotos enviadas").
- Recommendation: 2 (menos ruído que anunciar cada linha).

### Linhas de envio que ficam (BUG-20261028-linhas-de-envio-ficam-na-tela)
- Options: 1. apagar as linhas "enviada" alguns segundos depois; 2. manter só as "falhou" até a próxima ação.
- Recommendation: 2.

### Lote com várias falhas (BUG-20261028-lote-com-falhas-so-mostra-o-ultimo-motivo)
- Options: 1. um toast só, com a lista ("3 arquivos não aceitos: …"); 2. o motivo na própria linha ("falhou — formato não aceito").
- Recommendation: 2.

### Ordem só por arrasto (BUG-20261028-ordenar-fotos-so-arrastando) — anterior à 85
- Options: 1. botão "Tornar principal" em cada foto; 2. "Mover para cima/baixo".
- Recommendation: 1 (é o que a Adri quer ao ordenar, e resolve teclado e celular).

### Foco do modal da variação (BUG-20261028-modal-de-imagem-da-variacao-solta-o-foco) e "Close" (BUG-20261026-fechar-do-modal-em-ingles) — anteriores
- Recommendation: tarefa própria, fora da 85.

### Abre com "Alterações não salvas" (BUG-20261028-produto-abre-com-alteracoes-nao-salvas) — anterior
- Recommendation: investigar a normalização do editor (aviso de extensão `link` duplicada) antes de mexer na guarda.

## Learnings

- O `run_code` do Playwright MCP não guarda estado entre chamadas (`globalThis` some): portão de rede para segurar o POST tem de ler uma flag da página (`window.__go`), senão a requisição fica presa até recarregar.
- O MCP intercepta `filechooser`; para enviar arquivo, `setInputFiles` direto no `input[type=file]`, e o arquivo precisa morar em `store/.playwright-mcp`.
- Arrasto HTML5 sintético só funciona com pausas entre `dragstart` e `drop` (o React precisa renderizar o `dragIdx`); `locator.dragTo` não reordenou.
- Peça criada por SQL abre "suja"; depois de um save pelo painel, não — bom contraponto para o bug da guarda.

## Final Status

- **Exit gate (full automated suite):** `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` → `Test Files 240 passed (240) · Tests 4267 passed (4267)`, exit 0 (só o workspace tocado; outra sessão editava testes no mesmo worktree).
- **Issues by user impact:** Blocks-Completion 0 · Data-Loss 0 · Trust-Damage 1 (anterior: produto abre sujo) · Friction 7 novos (3 anteriores à 85) + 1 re-found ("Close") · Cosmetic 0
- **Coverage:** 1 jornada + canário; 8/8 charters e o canário andados; 13 cenários com veredito (9 pass, 3 fail, 1 blocked-verify).
- **Verdict:** ready with blocked items — o fluxo principal da 85 passa de ponta a ponta (MOD-07 re-medido em 44 px); antes do merge, decidir os dois Friction da própria 85 com custo baixo (fonte 200 % no Resumo e foco ao resolver a pendência) e fazer as verificações humanas.
