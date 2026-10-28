# QA Run Report — 2026-10-27 — backoffice: SEO do produto com IA (84)

- **Scope:** feature `84` na branch `feature/84-seo-do-produto-com-ia` (árvore sem commit sobre `96757cc7`): publicar sem SEO, prévia com o valor servido, "Sugerir com IA", e reteste de D1/D2 da `prova-navegador.md`.
- **Cadence tier:** targeted
- **Build:** `96757cc7` + árvore da 84 · **Environment:** só local — painel `vite` em http://localhost:8083 contra o Supabase local (:54441); `seo-suggest` servida por `supabase functions serve` sem `ANTHROPIC_API_KEY` (503 real); 200/429/502/422 interceptados; `*.supabase.co` e `**/g/collect*` bloqueados.
- **Started:** 2026-10-27 · **Status:** closed

## Personas

| Persona | Base | Device / Network / Locale | Sessions |
|---|---|---|---|
| Adri cadastrando peças | Power User | 390×844 (e 360/412/1440), wifi, pt-BR, fonte 100/130/200 % | os cinco |

## Flows in Scope

- `J-publicar-peca-sem-escrever-seo` — publicar sem escrever SEO (`../journeys/J-publicar-peca-sem-escrever-seo.md`)
- `J-curar-seo-com-ia` — curar o SEO com a sugestão (`../journeys/J-curar-seo-com-ia.md`)

## Session Matrix & Results

| # | Charter | Journey / Scenario | Persona | Tour | Status | Issue | Fix commit |
|---|---|---|---|---|---|---|---|
| 1 | CH-seo-publicar-peca-sem-escrever-seo | J-publicar-peca-sem-escrever-seo | Adri cadastrando peças | Money | Pass | | |
| 2 | CH-seo-falhas-sem-perder-trabalho | J-curar-seo-com-ia / PNL-seo-falhas-legiveis | Adri cadastrando peças | Network | Pass | BUG-20261027-aviso-de-falha-da-sugestao-fica-depois-de-salvar (paper cut) | |
| 3 | CH-seo-sugerir-revisar-desfazer | J-curar-seo-com-ia | Adri cadastrando peças | Feature | Pass | | |
| 4 | CH-seo-sugestao-no-ar | J-curar-seo-com-ia / PNL-seo-concorrencia-no-voo | Adri cadastrando peças | Interrupt | Blocked (human decision) | BUG-20261027-segunda-sugestao-perde-o-texto-da-adri | |
| 5 | CH-seo-fonte-grande-teclado-e-leitor | J-curar-seo-com-ia | Adri cadastrando peças | Feature | Blocked (human decision) | BUG-20261027-previa-do-google-ilegivel-com-fonte-200; BUG-20261027-sugerir-e-desfazer-soltam-o-foco; BUG-20261027-sugestao-preenchida-sem-aviso-ao-leitor | |

Status legend: `Pending | Pass | Fixed | Skipped | Blocked (needs human verify) | Blocked (human decision)`. Nenhum conserto foi
aplicado neste ciclo (pedido do usuário: só QA, sem código); tudo o que falhou está em *Decisions for a Human*.

**Bundle servido conferido antes de medir:** `GET /src/features/seo-suggestion/ui/SuggestSeoButton.tsx` tem `min-h-11`
(×2, D2) e `GET /src/features/product-form/ui/SeoPreview.tsx` tem o selo em `flex-col items-start` (×2, D1).

## Session Debriefs

### CH-seo-publicar-peca-sem-escrever-seo — Adri cadastrando peças

- **Ran:** 390×844, peça nova `TESTE-84-QA- Pingente Coração com Leite Materno` (nome, descrição, uma categoria, uma
  imagem PNG, preço 289,90), sem tocar no SEO.
- **Findings:**
  - Checklist "6 de 6" com "SEO automático (nome e descrição)", sem "Ir →"; "Salvar e publicar" habilitado.
  - Aba SEO antes de salvar: prévia `TESTE-84-QA- Pingente Coração com Leite Materno | Uma Estrelinha` + "automático";
    descrição derivada + "automático"; placeholders = nome e descrição; contador `0/60 · 64 com a marca`.
  - *Salvar e publicar*: toast "Produto criado — O produto já está na loja.", sem erro, aba não mudou, URL `/editar`.
    **Banco local:** `is_active = t`, `seo_title IS NULL`, `seo_description IS NULL`.
  - Leitura independente: F5 → mesma prévia derivada, nada sujo.
  - Só a descrição preenchida: checklist "SEO parcial — o resto vem do nome e da descrição"; prévia mistura curado e
    derivado (título segue "automático").
  - Garbage: título e descrição só com espaços → checklist "automático", *Salvar rascunho* grava `is_active = f` e os
    dois `NULL` (aparados).
- **Bugs filed/updated:** nenhum.
- **Scenarios settled:** PNL-seo-publicar-sem-seo → pass; PNL-seo-checklist-nao-trava → pass; PNL-seo-previa-e-o-servido → pass (na fonte normal).
- **Paper cuts:** o cabeçalho de "Novo produto" mostra o selo "Publicado" antes de qualquer save (anterior à 84, não registrado).
- **Surprises:** nenhuma.

### CH-seo-falhas-sem-perder-trabalho — Adri cadastrando peças

- **Ran:** 390×844, peça de teste com "Título que eu escrevi" / "Descrição que eu escrevi à mão.".
- **Findings:**
  - **503 real** (function servida sem a chave; log `result: not_configured`): "Sugestão por IA não está configurada.",
    botão desabilitado e assim fica depois de ir à Geral e voltar; campos intocados; salvar habilitado.
  - 429, 502, 422 `off_rules`/`refusal`/`truncated` e **rede abortada**: cada um com a frase de `copy.ts`; os dois
    campos intocados; "Sugerir com IA" e "Salvar e publicar" habilitados. Rede caída cai na frase do 502 (é o desenho).
  - Escreveu à mão e salvou: banco com o texto dela. **A frase da falha ficou na tela** depois da edição e do save.
- **Bugs filed/updated:** BUG-20261027-aviso-de-falha-da-sugestao-fica-depois-de-salvar (Friction, Low).
- **Scenarios settled:** PNL-seo-falhas-legiveis → pass (o paper cut não quebra o esperado).
- **Paper cuts:** frase velha de falha ao lado do texto já salvo.
- **Surprises:** o "Restaurar rascunho" do formulário apareceu depois do F5 com o SEO sujo — o trabalho não se perde.

### CH-seo-sugerir-revisar-desfazer — Adri cadastrando peças

- **Ran:** 390×844, 200 interceptado com título "Pingente de Leite Materno Coração Prata 925" (43) e descrição de 149
  caracteres terminando em "Envio para todo o Brasil.".
- **Findings:**
  - Os dois campos recebem a sugestão; prévia `… | Uma Estrelinha`; contador `43/60 · 60 com a marca`; `149/160 caracteres`.
  - Corpo enviado: `productId, name, description (HTML), categoryIds, relatedIds: [], requiresMaterial` — nada além.
  - Desfazer devolve exatamente os dois textos anteriores e some; some ao digitar no título; some no save.
  - Sugestão sobre sugestão, edição, *Salvar rascunho*, F5: o título aceito volta do banco, prévia sem selo.
- **Bugs filed/updated:** nenhum nesta sessão (os de foco e anúncio foram medidos na sessão 5).
- **Scenarios settled:** PNL-seo-sugerir-revisar-salvar → pass.
- **Paper cuts:** o botão chama-se só "Desfazer" — o editor da descrição (aba Geral) tem outro "Desfazer"; como as abas
  desmontam, não há colisão na árvore hoje.

### CH-seo-sugestao-no-ar — Adri cadastrando peças

- **Ran:** 1440×900, respostas atrasadas 2,5 s.
- **Findings:**
  - Digitar no título com a sugestão no ar: resposta descartada, "Você editou o SEO enquanto a sugestão chegava; mantive
    o seu texto.", texto dela fica.
  - Duplo clique: **uma** chamada.
  - Trocar para Geral e voltar: resposta descartada, sem frase, botão volta a "Sugerir com IA".
  - *Salvar rascunho* com a sugestão no ar: grava o que está nos campos; a resposta não entra depois.
  - **Texto escrito à mão → sugestão A → sugestão B → Desfazer: volta a A**, o texto dela não volta.
- **Bugs filed/updated:** BUG-20261027-segunda-sugestao-perde-o-texto-da-adri (Trust-Damage, Medium).
- **Scenarios settled:** PNL-seo-concorrencia-no-voo → pass; PNL-seo-desfazer → blocked-decision.
- **Suggested next charter:** a mesma corrida no celular com toque real.

### CH-seo-fonte-grande-teclado-e-leitor — Adri cadastrando peças

- **Ran:** 360/390/412 a 100/130/200 % e 1440 a 200 % (`html { font-size }`), teclado e árvore de acessibilidade.
- **Reteste D2 — PASSA.** "Sugerir com IA" e "Desfazer" ficam dentro do contêiner do bloco em todas as larguras
  (390/200: contêiner 97→293, botões 97→293, alturas 114 e 88; 360/200: 97→263; 390/130: 199×57 e 147×57; 1440/200:
  306×88); rótulo embrulha; nada passa do cartão.
- **Reteste D1 — PASSA EM PARTE.** O selo "automático" foi para baixo do texto e escala (12 → 15,6 → 24 px), então não
  come mais a largura. Mas o título da prévia continua `truncate` em uma linha: "TESTE-…" a 390/200 % (130 px),
  "TEST…" a 360/200 % (100 px); descrição "Um pinge…". A 360/200 % o selo (154 px) passa ~21 px da caixa da prévia.
- Rolagem do body: 390 a 100 % `scrollWidth` 390; a 130 % **402**; a 200 % **616**. Culpado medido: o `<input>`/prefixo
  `umaestrelinha.com.br/produtos/` do `SlugField` (anterior à 84, fora). A 360/200 % também "Salvar rascunho"/"Salvar e
  publicar" passam da borda (cabeçalho, anterior).
- Teclado: Tab até "Sugerir com IA", Enter → `activeElement = BODY` durante e depois da resposta; Enter no "Desfazer"
  → `BODY`. O Tab seguinte retoma perto, sem anel visível no meio. Enter no Título SEO não envia o formulário.
- Região `role="status"`: frase em toda falha; **vazia no sucesso** (390 e 1440).
- **Bugs filed/updated:** BUG-20261027-previa-do-google-ilegivel-com-fonte-200; BUG-20261027-sugerir-e-desfazer-soltam-o-foco;
  BUG-20261027-sugestao-preenchida-sem-aviso-ao-leitor.
- **Scenarios settled:** PNL-seo-fonte-grande-e-telas → fail; PNL-seo-leitor-de-tela-e-teclado → fail.

## Paper Cuts

| Persona | Where (journey/step) | Felt | Sharpness | Outcome |
|---|---|---|---|---|
| Adri cadastrando peças | J-curar-seo-com-ia, depois de uma falha | "Salvei e ainda diz que a sugestão não veio?" | dull | BUG-20261027-aviso-de-falha-da-sugestao-fica-depois-de-salvar |
| Adri cadastrando peças | J-curar-seo-com-ia, segunda sugestão | "Cadê o que eu tinha escrito?" | sharp | BUG-20261027-segunda-sugestao-perde-o-texto-da-adri |
| Adri cadastrando peças | J-publicar-peca-sem-escrever-seo, Novo produto | selo "Publicado" num produto que nunca foi salvo | dull | anterior à 84, só registrado aqui |

## Runtime Errors Observed

- `Failed to load resource` 503/429/502/422 e `net::ERR_FAILED` no console a cada resposta de falha — são as falhas
  provocadas pela sessão, sem exceção de JS não tratada.

## Human Verifications Needed

- [ ] Probe contra a Claude API real (fora deste ciclo, sem chave; comando em `prova-navegador.md`, *Pendente*).
- [ ] TalkBack/VoiceOver reais e Android real na aba SEO (o anúncio do sucesso e o foco foram medidos só pela árvore).

## Decisions for a Human

### A segunda sugestão perde o texto escrito à mão (BUG-20261027-segunda-sugestao-perde-o-texto-da-adri)
- What's broken: depois de duas sugestões seguidas, o "Desfazer" devolve a primeira sugestão; o texto dela não volta.
- Why not auto-fixed: a spec manda (`SIA-12`, "some na próxima sugestão"); mudar é decisão de produto, e o ciclo não conserta código.
- Options: 1. guardar o par de **antes da primeira** sugestão até edição manual ou save (o Desfazer sempre volta ao texto dela) — pequena mudança no hook, emenda à `SIA-12`; 2. manter e avisar no botão ("Sugerir de novo substitui a sugestão") — mais texto na tela.
- Recommendation: opção 1 — é o medo declarado da persona e não custa tela.

### Foco no body e sucesso não anunciado (BUG-20261027-sugerir-e-desfazer-soltam-o-foco, BUG-20261027-sugestao-preenchida-sem-aviso-ao-leitor)
- What's broken: o foco cai no `<body>` ao sugerir (botão desabilitado no voo) e ao desfazer (botão some); o sucesso deixa a região viva vazia.
- Options: 1. `aria-disabled` no lugar de `disabled` durante o voo + foco no Título SEO depois do Desfazer + frase de sucesso na região; 2. só a frase de sucesso.
- Recommendation: opção 1, no molde dos consertos de foco do mobile-adm.

### Prévia ilegível a 200 % (BUG-20261027-previa-do-google-ilegivel-com-fonte-200)
- Options: 1. título da prévia com `line-clamp-2`/embrulhar em vez de `truncate`, selo com `max-w-full`; 2. aceitar (o Google também corta).
- Recommendation: opção 1 — a prévia existe para ser lida, e o corte do Google acontece a ~600 px, não a 100.

### A frase velha de falha (BUG-20261027-aviso-de-falha-da-sugestao-fica-depois-de-salvar)
- Options: 1. limpar a mensagem no `noteManualEdit` e no `reset`; 2. manter.
- Recommendation: opção 1.

## Learnings

- Medir a fonte grande também em **360**: a 390 o selo cabia raspando na caixa; a 360 ele sai.
- O conserto de D1 tratou o sintoma (selo comendo a largura), não a régua da prova ("legível, embrulhando"): o reteste
  precisa reler o *esperado* da prova, não só o defeito.
- `page.route` com estado em `page.__mode` permitiu percorrer as sete respostas sem recarregar, e o `beforeunload` do
  formulário precisa de `page.on('dialog')` antes de qualquer F5 com o SEO sujo.

## Limpeza

Produto `TESTE-84-QA-…` (`8177cbde-…`) apagado do banco local; o objeto `product-images/products/874a2556-….webp`
removido pelo Storage local (0 linhas restantes); `supabase functions serve` encerrado; navegador fechado; o log de
console desta sessão removido de `.playwright-mcp/`; o dev server em :8083 já estava de pé e ficou. Nada foi feito
contra o projeto hospedado.

## Final Status

- **Exit gate (full automated suite):** `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` → `Test Files 235 passed (235) · Tests 4110 passed (4110)`, exit 0. Só o backoffice (o ciclo não mudou código); os outros workspaces não foram remedidos.
- **Issues by user impact:** Blocks-Completion 0 · Data-Loss 0 · Trust-Damage 1 · Friction 4 · Cosmetic 0
- **Coverage:** 2/2 jornadas andadas pela persona, 5/5 charters; probe real, Android e leitor reais fora (declarado).
- **Verdict:** ready with blocked items — publicar sem SEO, a prévia e as falhas funcionam; antes do merge, decidir o Desfazer depois de duas sugestões e o foco/anúncio, e completar D1.

Bugs: BUG-20261027-segunda-sugestao-perde-o-texto-da-adri (Medium, Trust-Damage) · BUG-20261027-sugerir-e-desfazer-soltam-o-foco (Medium, Friction) · BUG-20261027-sugestao-preenchida-sem-aviso-ao-leitor (Low, Friction) · BUG-20261027-previa-do-google-ilegivel-com-fonte-200 (Low, Friction) · BUG-20261027-aviso-de-falha-da-sugestao-fica-depois-de-salvar (Low, Friction)
