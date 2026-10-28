# QA Run Report — 2026-10-27 — backoffice: SEO do produto com IA (84) — reteste

- **Scope:** reteste em navegador dos cinco bugs consertados depois da rodada `2026-10-27-backoffice-seo-com-ia.md` (working tree sem commit, inclusive a `SIA-12` reescrita), mais regressão curta das jornadas que passaram e caça de paper cuts nos pontos tocados.
- **Cadence tier:** targeted
- **Build:** `96757cc7` + árvore da 84 (sem commit) · **Environment:** só local — painel `vite` em http://localhost:8083 (já estava de pé) contra o Supabase local (:54441); `seo-suggest` servida por `supabase functions serve seo-suggest --env-file <scratchpad sem ANTHROPIC_API_KEY>` só para o 503 real (encerrada em seguida); 200/429/502/422/rede caída interceptados em `**/functions/v1/seo-suggest`; `*.supabase.co` e `**/g/collect*` bloqueados no contexto. Login real com `admin@umaestrelinha.dev` (seed).
- **Started:** 2026-10-27 · **Status:** closed

## Método

- Chromium pelo Playwright, 1440×900 e 390×844; a prévia também em 360 e a 130 % e 200 % (`html { font-size }`).
- **Bundle servido conferido antes de medir:** `GET /src/features/seo-suggestion/ui/SuggestSeoButton.tsx` traz `aria-disabled` com `aria-disabled:cursor-not-allowed aria-disabled:opacity-50`; `GET /src/features/product-form/ui/SeoPreview.tsx` traz `line-clamp-2 break-words`, `max-w-full break-words` e `min-w-0`; `GET …/model/useSeoSuggestion.ts` traz `originRef` (4 ocorrências).
- Peça criada pela tela como a persona faz: `TESTE-84-RT- Pingente Coração com Leite Materno` (nome, descrição, categoria "Joias afetivas", imagem PNG, preço 289,90), sem tocar no SEO.
- Foco lido por `document.activeElement` e `:focus-visible` com o botão focado por **Shift+Tab** a partir do Título SEO e acionado por **Enter**; a resposta 200 atrasada 1,5 s para ler o estado em voo.

## Session Matrix & Results

| # | Bug / jornada | Persona | Status |
|---|---|---|---|
| 1 | BUG-20261027-segunda-sugestao-perde-o-texto-da-adri | Adri cadastrando peças | Fixed (retestado) |
| 2 | BUG-20261027-sugerir-e-desfazer-soltam-o-foco | Equipe com teclado / leitor | Fixed (retestado) |
| 3 | BUG-20261027-sugestao-preenchida-sem-aviso-ao-leitor | Equipe com leitor de tela | Fixed (retestado) |
| 4 | BUG-20261027-previa-do-google-ilegivel-com-fonte-200 | Adri, celular, fonte grande | Blocked (human decision) — reaberto parcial |
| 5 | BUG-20261027-aviso-de-falha-da-sugestao-fica-depois-de-salvar | Adri cadastrando peças | Fixed (retestado) |
| 6 | Regressão: J-publicar-peca-sem-escrever-seo | Adri cadastrando peças | Pass |
| 7 | Regressão: J-curar-seo-com-ia (falhas, descarte, duplo toque, alvos) | Adri cadastrando peças | Pass |

## Retestes

### 1 — A segunda sugestão e o texto da Adri

Passos originais (texto à mão → Sugerir A → Sugerir B → Desfazer), nas duas larguras:

| | 1440×900 | 390×844 |
|---|---|---|
| campos depois de A | Sugestão A… | idem |
| "Desfazer" durante o voo de B | 0 (some) | 0 |
| campos depois de B | Sugestão B… | idem |
| "Desfazer" depois de B | 1 | 1 |
| campos depois de Desfazer | **"Meu título escrito" / "Minha descrição escrita à mão."** | idem |
| "Desfazer" depois de usado | 0 | 0 |
| sugerir → editar à mão ⇒ "Desfazer" | 1 → 0 | 1 → 0 |

Série nascida de campos vazios: nenhum "Desfazer" (0), como a `SIA-12` nova manda. Evidência: `evidence/2026-10-27-backoffice-seo-com-ia-reteste/1440-desfazer-volta-ao-texto.png`, `…/390-desfazer-volta-ao-texto.png`.

### 2 — O foco ao sugerir, ao desfazer e no 503

| Momento | 1440×900 | 390×844 |
|---|---|---|
| durante "Sugerindo…" | `BUTTON` "Sugerindo…" | idem |
| depois da resposta 200 | `BUTTON` "Sugerir com IA", `:focus-visible` | idem |
| depois de "Desfazer" | `BUTTON` "Sugerir com IA", `:focus-visible` | idem |
| 503 real (`not_configured` no log da function) | `BUTTON` "Sugerir com IA", `:focus-visible`; Tab seguinte → Título SEO | idem |

Em nenhuma das 8 leituras o foco caiu no `<body>` (antes: `BODY` nas três). Em voo e no 503 o botão tem `aria-disabled="true"`, **sem** o atributo `disabled`, opacidade 0,5 e cursor `not-allowed`; a árvore de acessibilidade o expõe como `button "Sugerindo…" [disabled]` / `button "Sugerir com IA" [disabled]` — parece e é anunciado como indisponível. Enter + Espaço + clique durante o voo: **1** requisição. No 503, Enter e clique de novo: **0** requisições a mais; "Salvar e publicar" segue habilitado; a dica fica depois de ir à Geral e voltar. Sem nome, o botão volta ao `disabled` nativo com "Preencha o nome do produto primeiro." Evidência: `…/390-503-foco-no-botao.png`, `…/1440-503-foco-no-botao.png`.

### 3 — O sucesso anunciado

Depois do 200, nas duas larguras, o `[role=status]` lê "Sugestão aplicada ao título e à descrição. Revise antes de salvar." (também a partir de campos vazios). Vazio depois do "Desfazer" e da edição manual. Leitor de tela real não usado (árvore de acessibilidade: `status: Sugestão aplicada…`).

### 4 — A prévia a 200 % (reaberto, parcial)

| Viewport/fonte | Caixa | Título | Selos "automático" | Lido na tela |
|---|---|---|---|---|
| 360/200 % | 166 px | 100 px, 2 linhas, cortado | dentro (33/33 px) | "TESTE / -84-…" |
| 390/200 % | 196 px | 130 px, 2 linhas, cortado | dentro (33/33 px) | "TESTE- / 84-RT-…" |
| 360/130 % | 233 px | 190 px, 2 linhas, cortado | dentro | — |
| 390/130 % | 263 px | 220 px, 2 linhas, cortado | dentro | "TESTE-84-RT- / Pingente Coração co…" |
| 390/100 % | 292 px | 258 px, 2 linhas, cortado | dentro | — |
| 1440/100 % | 710 px | 676 px, 1 linha, inteiro | dentro | — |

Passou: o selo não sai mais da caixa (a 360/200 % estava ~21 px fora). Não passou: a 200 % o título mostra ~10–12 caracteres e a descrição "Um / pingente…" — o esperado do bug é "legíveis, embrulhando", e a persona continua sem conseguir conferir o que o Google mostra. O gargalo é a largura da caixa (166–196 px), não mais o `truncate`. Detalhe novo: a 200 % o selo quebra no meio da palavra ("automáti / co") pelo `break-words`. Evidência: `…/390-200-previa.png`, `…/360-200-previa.png`, `…/390-130-previa.png`.

### 5 — A frase de falha depois de editar e salvar

Em 390 e 1440: 502 → editar o Título SEO à mão ⇒ região vazia; 429 → "Salvar rascunho" (toast "Rascunho salvo — O produto fica fora da loja até você publicar.") ⇒ região vazia. Banco local: `seo_title = 'Título que eu escrevi agora'`, `seo_description = 'Descrição que eu escrevi à mão.'`.

## Regressão

- **Publicar sem SEO (390):** checklist "6 de 6" com "SEO automático (nome e descrição)"; prévia derivada com os dois selos "automático"; *Salvar e publicar* → "Produto criado — O produto já está na loja.", URL `/editar`. Banco local: `is_active = t`, `seo_title IS NULL`, `seo_description IS NULL`.
- **Prévia:** a sugestão aplicada aparece na prévia ("Sugestão A de Leite Materno em Prata | Uma Estrelinha").
- **Falhas (390 e 1440):** 429, 422 `off_rules`/`refusal`/`truncated`, rede abortada e 502 — cada um com a frase de `copy.ts`, os dois campos intocados, "Sugerir com IA" e "Salvar e publicar" habilitados.
- **Descarte por edição em voo:** os campos ficam com o texto dela e a frase "Você editou o SEO enquanto a sugestão chegava; mantive o seu texto." **Troca de aba em voo:** a sugestão é descartada, campos intocados.
- **Duplo toque:** 1 requisição (Enter + Espaço + clique em voo).
- **Rolagem horizontal:** `scrollWidth` 390/1440 na aba SEO a 100 %. A 200 % em 390 o `scrollWidth` é 616, causado pelo `SlugField` (anterior à 84); a 360/200 % também pelos botões do cabeçalho do formulário (anteriores à 84). Nenhum elemento da 84 passa da borda.
- **Alvos:** "Sugerir com IA" 153,8 × 44; "Desfazer" 113,4 × 44.

## Paper Cuts

| Persona | Onde | Sentido | Sharpness | Outcome |
|---|---|---|---|---|
| Adri, fonte 200 % | prévia do Google | selo "automáti / co" quebrado no meio | dull | junto do BUG-20261027-previa-do-google-ilegivel-com-fonte-200 (reaberto) |
| Adri | aba SEO, depois de apagar o Nome | "Preencha o nome…" convive com "Sugestão aplicada… Revise antes de salvar." e com "Desfazer" | dull | só registrado: a frase é verdadeira e o "Desfazer" funciona; editar o Nome não é editar o SEO |

## Bugs novos

Nenhum.

## Runtime Errors Observed

- `Failed to load resource` 503/429/502/422 e `net::ERR_FAILED` no console a cada falha provocada; nenhuma exceção de JS não tratada.

## Human Verifications Needed

- [ ] TalkBack/VoiceOver reais: o anúncio do sucesso e o "indisponível" do botão em voo (medidos pela árvore de acessibilidade).
- [ ] Probe contra a Claude API real (fora deste ciclo, sem chave).

## Decisions for a Human

### A prévia a 200 % ainda não se lê (BUG-20261027-previa-do-google-ilegivel-com-fonte-200)
- What's broken: o selo cabe; o título mostra ~10–12 caracteres em duas linhas a 200 % (caixa de 166–196 px).
- Options: 1. sem `line-clamp` no título e na descrição da prévia (embrulha inteiro; a prévia cresce em fonte grande); 2. aceitar duas linhas; 3. ganhar largura tirando recuo/padding da caixa no celular (ajuda pouco a 200 %).
- Recommendation: opção 1 — a prévia existe para ser lida; o corte de verdade do Google é por pixels a ~600 px, que a caixa do celular não reproduz de qualquer jeito. Considerar `break-normal`/hífen no selo junto.

## Limpeza

Produto `TESTE-84-RT-…` (`45588ff8-b398-4890-b6eb-6e1d71faabd2`) apagado do banco local (0 linhas `TESTE-84%`); o objeto `product-images/products/37240a3d-42f7-48c6-97b1-3d5e83ec0bb1.webp` removido pela API do Storage local ("Successfully deleted"; 0 em `storage.objects`); `supabase functions serve` encerrado; navegador fechado; o log de console desta sessão removido de `.playwright-mcp/`; o dev server em :8083 já estava de pé e ficou. Nada contra o projeto hospedado.

## Final Status

- **Exit gate (full automated suite):** `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` → `Test Files 235 passed (235) · Tests 4142 passed (4142)`, exit 0 (exit capturado fora de pipe). Só o backoffice: o reteste não mudou código, e os outros workspaces não foram remedidos.
- **Issues by user impact:** Blocks-Completion 0 · Data-Loss 0 · Trust-Damage 0 abertos (1 retestado) · Friction 1 aberto parcial (3 retestados) · Cosmetic 0
- **Verdict:** ready with blocked items — quatro dos cinco bugs passam no navegador real em 390 e 1440; a prévia a 200 % espera decisão.

## Reteste 2 — a prévia a 200 % (BUG-20261027-previa-do-google-ilegivel-com-fonte-200)

Depois da decisão pela opção 1 (prévia sem `line-clamp`, com `break-words`; selo `whitespace-nowrap` + `max-w-full`), retestado no :8083 local com o bundle servido conferido, numa peça sem SEO de nome com 68 caracteres, sem salvar nada. Em 360/390/412 a 200 % (caixa de 166/196/218 px) o título aparece inteiro em 17/14/11 linhas e a descrição em 20/15/12; a 130 % em 5/5/4 e 6/5/5; a 1440/100 % em 1 e 2 linhas. Em todos `scrollHeight` = `clientHeight` (±1 de arredondamento), sem reticências, e o `innerText` é o texto completo. O selo "automático" ocupa uma linha e cabe na caixa nos 7 casos. Nenhum elemento da prévia passa da viewport; a rolagem horizontal restante (402 a 130 %, 616 a 200 %) vem do `SlugField`, anterior à 84. **Passou — bug consertado e retestado.** Ficam como observação: a 200 % palavras longas partem no fim da linha ("umbilica / l") e a URL da prévia segue com reticências. Evidência em `evidence/2026-10-27-backoffice-seo-com-ia-reteste-2/`. Navegador fechado, log de console removido, :8083 deixado de pé.
