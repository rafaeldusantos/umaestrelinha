# Sessão CH-03 · A loja logada só mostra a campanha em vigência (e a visitante vê o mesmo de antes)

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-03-loja-logada-so-mostra-a-vigente.md` · exploratório · P0 |
| Status      | done (orçamento esgotado antes da parte logada; TC-SEC-001 e TC-SEC-002 sem execução válida — ver Fora da cobertura) |
| Persona     | PER-03 Adri, conferindo a loja · conta: `admin-loja` — `QA_ADMIN_LOJA_*` · anonima (sessão `CH-03-anon`) |
| Tour · modo | Feature · por técnica — transição de estado                            |
| Rodada      | exploração                                                             |
| Orçamento   | ~72 ações de browser de 70                                             |
| Ambiente    | painel http://localhost:8083 · loja http://localhost:8082 · build não exposto · Chromium (agent-browser 0.39.1, headless) · viewport 390 × 844 |
| Paridade    | Supabase local; `*.supabase.co` e `/g/collect` bloqueados (fotos do Storage podem faltar) |

## Missão

Achar qualquer lugar da loja ou da prévia em que a dona, logada, veja desconto de campanha que não está valendo —
"Natal" agendada, "Black Friday" encerrada, "QA103 Desligada" —, e provar que a visitante vê o selo, o preço, a
sacola e `/ofertas` da campanha em vigência exatamente como antes.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | No painel, `/admin/campanhas` → Nova campanha: "QA103 Desligada", selo, 16/11/2026 00:00 a 30/11/2026 23:59, 30 %, desligada; salvar | Primeiro o selo "QA103 Desligada" (15/14) segurou o Salvar — encurtado para "QA103 DESL". Salvou: lista mostra "QA103 Desligada · Desligada · 16/11 a 30/11/2026 · nenhuma peça · 30%". No seletor de data, clicar no dia já selecionado (16) desmarcou o início, e o calendário de "Começa em" não fechou com Esc nem clique no botão, cobrindo "Termina em" (contornado pelo teclado) | `screenshots/CH-03-01-cdes-criada.png` |
| 02 | Abrir P-AGE ("Colar Afetivo Redonda…") em Produtos → aba "Preços & variações" para marcar 30 % em "QA103 Desligada" | A aba lista só "Dia das Mães" (Nenhum) e "Natal" (15 %). "QA103 Desligada" não aparece, nem depois de recarregar — não há como marcar P-AGE nela pela tela. Preço padrão de P-AGE: R$ 379,90; variações R$ 322,92 na coluna "Na campanha" (Natal) | `screenshots/CH-03-02-page-sem-cdes.png` |
| 03 | Sem login (sessão anônima), abrir `/ofertas` | "Dia das Mães", "Peças com 10% e 15% de desconto até 30 de novembro.", Todas · 19 (10 % · 11, 15 % · 8). M-A (15 %) e P-1 (15 %) presentes; P-AGE ausente; nada de Natal, Black Friday ou QA103 | `screenshots/CH-03-03-ofertas-anon.png` |
| 04 | Sem login, abrir M-A (`/produtos/pulseira-afetiva-leite-materno-prata-925`) | Selo "DIA DAS MÃES, 15% de desconto"; R$ 325,55, De R$ 383,00 riscado; R$ 302,76 no Pix. Nada de Black Friday | `screenshots/CH-03-04-ma-anon.png` |
| 05 | Sem login, pôr M-A na sacola (Prata 925, sem base, sem gravação) | Dois cliques em "Adicionar à sacola" não puseram nada (sacola aberta: vazia, "Explorar joias"), sem mensagem; com o foco no botão e Enter, a sacola abriu com 1 item: "de R$ 383,00 por R$ 325,55" — igual à página | `screenshots/CH-03-05-sacola-anon.png` |
| 06 | Sem login, abrir P-AGE por link direto | O slug suposto (`colar-afetivo-redonda-leite-materno-prata-925`) deu "Essa página não existe."; sem orçamento para achar a peça pela navegação | — |
| 07 | Na loja, sessão do painel: "Entrar" → e-mail da conta → "Enviar código"; código pelo Mailpit; "Verificar código" | O código chegou no Mailpit e foi digitado; a navegação seguinte foi disparada logo depois do clique em "Verificar código". **No fim da sessão, `/conta` mostrava "Entrar ou criar conta": a loja não estava logada** — os passos 08–10 valem como uma segunda leitura anônima, não como a sessão de admin | — |
| 08 | `/ofertas` (sessão que se pensava logada) | Idêntico ao passo 03, peça a peça, mesmos preços (diff vazio) | `screenshots/CH-03-06-ofertas-admin.png` |
| 09 | M-A | Idêntico ao passo 04 | `screenshots/CH-03-07-ma-admin.png` |
| 10 | Home | B-1 "Joias para guardar quem a gente ama" com P-3 (15 %, de R$ 339,90 por R$ 288,92), P-1 (15 %, de R$ 329,90 por R$ 280,42), P-2 (10 %, de R$ 359,90 por R$ 323,91); links "Ver as peças com 10%/15% de desconto". Nenhum selo de Natal, Black Friday ou QA103 na Home | `screenshots/CH-03-08-home-admin.png` |
| 11 | Sair da conta e fechar | Loja já sem sessão. No painel, o item "Sair" não foi achado no menu "Sua conta" pelo texto; browser fechado (perfil só em memória, nada salvo em disco) | — |

**Edge cases tentados:** link direto para P-AGE (slug não confirmado — 404); recarregar o editor da peça (C-DES continua ausente); seletor de data com clique no dia já selecionado. Os da lista do charter com sessão (recarregar logada, duas abas sessão × anônima, sair em outra aba, voltar depois de sair) não foram tentados — a sessão de admin na loja não chegou a ser confirmada.

Observação fora da missão: a faixa de avisos do topo da loja alterna textos "Black Friday · novembro inteiro com joias em oferta · Ver ofertas" e "10%, 15% e 20% de desconto · em anéis, colares e pingentes selecionados no ateliê", com a "Black Friday" encerrada desde 13/11 e `/ofertas` mostrando "Dia das Mães". É texto da faixa de avisos (WI 101, configurado à parte), não leitura de campanha — anotado para a triagem, sem achado.

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-REG-001 | pass (parcial) | 03–05 | `screenshots/CH-03-03-ofertas-anon.png` · `CH-03-04-ma-anon.png` · `CH-03-05-sacola-anon.png` | Passos 1, 3 e 4 conferem (selo e preço de "Dia das Mães" em M-A, `/ofertas` sem P-AGE, sacola com o preço da página). Passo 2 (página de P-AGE) não conferido — slug não achado no orçamento; P-AGE ausente de `/ofertas` e da Home. Variações (coleção, 1440) não feitas. Massa sem C-DES marcada (A-1) |
| TC-SEC-001 | blocked | 07–10 | — | A entrada na loja com `admin-loja` não se confirmou (passo 07); as leituras 08–10 foram, de fato, anônimas. Orçamento esgotado antes de repetir o login (a tela oferece "Prefere usar senha?"). Passo 3 sobre a "QA103 Desligada" também bloqueado por massa (A-1) |
| TC-SEC-002 | skip | — | — | Orçamento esgotado antes da prévia de `/admin/home` |

Contagem: pass 1 · fail 0 · blocked 1 · skip 1

## Achados

### A-1 · [Painel · Produtos] Campanha desligada não aparece na aba "Preços & variações" — a dona não consegue marcar peças numa campanha antes de ligá-la

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-03 Adri (no papel de dona preparando a massa)                     |
| Jornada e passo     | J-05, preparação · passo 02 do log                                    |
| TC                  | TC-SEC-001 (pré-condição: C-DES com P-AGE)                            |
| Gravidade proposta  | medium — a dona não marca peças numa campanha desligada; o charter e o TC assumem que dá. Pode ser comportamento intencional da WI 102 (então é spec-gap da massa do plano, não bug) |
| Reproduziu          | sim (2 de 2 — antes e depois de recarregar)                           |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Painel `:8083` logada como `admin-loja`; `/admin/campanhas` → Nova campanha, desligada, vigência 16/11–30/11/2026, 30 %; salvar
2. `/admin/produtos` → buscar "Colar Afetivo Redonda" → abrir → aba "Preços & variações"
3. Procurar a seção da campanha nova

**Esperado:** uma seção "QA103 Desligada" com "Nenhum / 30%" para marcar a peça — **fonte:** charter CH-03 "Deve tentar" 1 e massa do TC-REG-001/TC-SEC-001 (C-DES com P-AGE). Nenhuma fonte de produto lida nesta sessão diz que campanha desligada não aceita marcação.

**Observado:** só "Dia das Mães" e "Natal" aparecem; a lista de campanhas diz "QA103 Desligada · nenhuma peça".

**Evidência:**

- `screenshots/CH-03-01-cdes-criada.png` — C-DES salva, desligada, "nenhuma peça"
- `screenshots/CH-03-02-page-sem-cdes.png` — aba de preço de P-AGE sem a "QA103 Desligada"
- console: nada · rede: nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| Clicar em "Adicionar à sacola" na página de M-A (anônima, 390 px) não pôs a peça nem deu retorno, duas vezes; com foco + Enter funcionou. Pode ser artefato do clique headless; não investigado | 05 | pré-existente |
| No cadastro de campanha, clicar no dia já selecionado desmarca a data, e o calendário de "Começa em" não fecha com Esc, cobrindo "Termina em" | 01 | pré-existente |

## Fora da cobertura

- TC-SEC-001 inteiro (Home, M-A, P-AGE, `/ofertas`, sacola com sessão de admin) — o login na loja não se confirmou e o orçamento (70) acabou; a tela tem "Prefere usar senha? Clique aqui", que encurta a entrada numa nova sessão
- TC-SEC-002 (prévia em `/admin/home`, Celular e Computador, B-2) — orçamento
- Página de P-AGE na loja (anônima e logada) — slug não achado; orçamento
- "QA103 Desligada" na loja — P-AGE não pôde ser marcada nela (A-1)
- Edge cases com sessão (recarregar, duas abas, sair em outra aba, voltar depois de sair) e o viewport 1440 × 900 — orçamento
- Saída do painel não confirmada pela tela ("Sair" não achado); o browser foi fechado com perfil em memória

## Debrief

- **Surpresas:** a campanha desligada não é oferecida para marcação na peça (A-1); o login por código na loja não "pegou" quando a navegação seguinte foi disparada logo após "Verificar código" — esperar pelo estado logado antes de navegar
- **Próximo charter:** repetir o CH-03 só na parte logada (TC-SEC-001 e TC-SEC-002), entrando por senha, com a C-DES já criada (está no banco: "QA103 Desligada", desligada, 16/11–30/11/2026, 30 %, selo "QA103 DESL", sem peças) e o slug de P-AGE informado no briefing
- **Padrão novo:** nada

Massa criada: campanha "QA103 Desligada" (desligada, 16/11/2026 00:00 a 30/11/2026 23:59, 30 %, selo "QA103 DESL", nenhuma peça). Uma sacola anônima com M-A (no browser da sessão `CH-03-anon`, já fechado). P-AGE não foi marcada.
