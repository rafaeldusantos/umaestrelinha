# Sessão CH-03 (parte 2) · A loja logada só mostra a campanha em vigência — a sessão de admin

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-03-loja-logada-so-mostra-a-vigente.md` · exploratório · P0 — redespacho só de TC-SEC-001 e TC-SEC-002 (a parte 1 está em `sessions/CH-03-loja-logada-so-mostra-a-vigente.md`) |
| Status      | done |
| Persona     | PER-03 Adri, conferindo a loja · conta: `admin-loja` — `QA_ADMIN_LOJA_*` (loja e painel, mesmo browser, sessão `CH-03b`) |
| Tour · modo | Feature · por técnica — transição de estado (com sessão de admin)      |
| Rodada      | exploração                                                             |
| Orçamento   | ~93 comandos de browser de 50 contando cada `wait`, `snapshot` e `screenshot`; ~45 ações de persona (abrir, clicar, digitar). O excesso veio de duas entradas no painel (a primeira navegou antes do login concluir) e da busca pelo "Sair" na loja |
| Ambiente    | loja http://localhost:8082 · painel http://localhost:8083 · build não exposto · Chromium (agent-browser, headless) · viewport 390 × 844; prévia em Celular 390 × 844 e Computador 1024 × 768 |
| Paridade    | Supabase local; `**/*.supabase.co/**` e `**/g/collect*` bloqueados (fotos do Storage podem faltar) |

## Missão

Achar qualquer lugar da loja ou da prévia em que a dona, logada, veja desconto de campanha que não está valendo —
"Natal" agendada, "Black Friday" encerrada, "QA103 Desligada" —, e provar que a visitante vê o selo, o preço, a
sacola e `/ofertas` da campanha em vigência exatamente como antes.

Régua da visitante: a da parte 1 (passos 03–05 e 10 de `sessions/CH-03-loja-logada-so-mostra-a-vigente.md`).
Massa nova desta parte: P-AGE marcada a 30 % na "QA103 Desligada" (preparada pela thread).

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Na loja, `/conta` → "Prefere usar senha? Clique aqui" → e-mail e senha de `admin-loja` → "Entrar"; depois reabrir `/conta` | `/conta` mostra a área logada: navegação "Minha conta", "Pedidos", "SEUS PEDIDOS", e na barra de baixo "Minha conta" no lugar de "Entrar". **Estado logado confirmado antes de medir** | `screenshots/CH-03b-01-conta-logada.png` |
| 02 | Home, logada | B-1 "Joias para guardar quem a gente ama": P-3 "DIA DAS MÃES, 15%" de R$ 339,90 por R$ 288,92; P-1 "DIA DAS MÃES, 15%" de R$ 329,90 por R$ 280,42; P-2 "DIA DAS MÃES, 10%" de R$ 359,90 por R$ 323,91; links "Ver as peças com 10%/15% de desconto". Nenhum outro selo de desconto na página; nada de Natal, Black Friday ou QA103; P-AGE não aparece. Igual à parte 1 (passo 10) | `screenshots/CH-03b-02-home-b1-logada.png` |
| 03 | Página de M-A por link direto, logada | Selo "DIA DAS MÃES, 15% de desconto"; R$ 325,55, De R$ 383,00; R$ 302,76 no Pix. Nada de Black Friday (20 %). Igual à régua (parte 1, passo 04) | `screenshots/CH-03b-03-ma-logada.png` |
| 04 | Página de P-AGE por link direto, logada | Sem selo; R$ 379,90 (o preço cadastrado — o painel mostrou R$ 379,90 na parte 1), R$ 353,31 com Pix (os 7 % do Pix), 4x de R$ 94,98; sem preço riscado. Nem a "Natal" (15 % → R$ 322,92) nem a "QA103 Desligada" (30 %) | `screenshots/CH-03b-04-page-logada.png` |
| 05 | Recarregar P-AGE e trocar a cor para "Prata 925 Folheado a Ouro" | Depois de carregar tudo, e na outra cor: R$ 379,90 · R$ 353,31, sem selo | — |
| 06 | `/ofertas`, logada | "Dia das Mães", "Peças com 10% e 15% de desconto até 30 de novembro.", Todas · 19, 10% · 11, 15% · 8 — idêntico à régua. Todos os selos "DIA DAS MÃES"; P-AMBAS com 10 % (Dia das Mães), não os 15 % da Natal; P-AGE ausente; nada de QA103 | `screenshots/CH-03b-05-ofertas-logada.png` |
| 07 | Em M-A (Prata 925, sem base, sem gravação), "Adicionar à sacola" | O clique não pôs nada nem deu retorno (mesmo comportamento da parte 1); com o foco no botão e Enter a sacola abriu: 1 item, "de R$ 383,00 por R$ 325,55", selo "DIA DAS MÃES, 15% de desconto", "Faltam R$ 124,45 para o frete grátis". Igual à régua (parte 1, passo 05) | `screenshots/CH-03b-06-sacola-logada.png` |
| 08 | No mesmo browser, painel `/admin/login` com a mesma conta → `/admin/home` → aba "Prévia" (Celular, 390 × 844) | A prévia (iframe "Prévia da Home") está com a sessão da loja: a barra dela mostra "Minha conta". B-1 com P-3 15 % R$ 288,92, P-1 15 % R$ 280,42, P-2 10 % R$ 323,91. Nas fileiras (Árvore da Vida, Linha Leite Materno, Decorativos, Dente de Leite, Linha Uma Estrelinha), nenhum selo nem preço riscado; P-AGE e as peças de Natal não estão nas fileiras. A lista de seções tem um só "Joias em oferta" ("Dia das Mães · em vigência até 30/11 às 23:59"): não há B-2 | `screenshots/CH-03b-07-previa-celular.png` |
| 09 | Alternar a prévia para "Computador" | Rótulo "1024 × 768 · 5%". Mesmo conteúdo: B-1 com os três preços de Dia das Mães, 3 selos (todos DIA DAS MÃES), nada de Natal, Black Friday ou QA103; "Minha conta" na barra da prévia | `screenshots/CH-03b-08-previa-computador.png` |
| 10 | Sair: na loja, `/conta` e o menu "Abrir menu" | Nenhum "Sair" achado — `/conta` só tem "Pedidos"; o menu tem "Conta". No painel, "Sua conta" → "Sair" funcionou (voltou a "Acesse o painel de gestão"), mas a loja continuou logada ("Minha conta"). Browser fechado (perfil só em memória, nada salvo em disco) | — |

**Edge cases tentados:** recarregar a página de P-AGE logada (sem selo depois de carregar tudo); abrir P-AGE e M-A por link direto logada; trocar a variação de P-AGE; sair do painel e conferir a loja (continua logada — sessões separadas por porta, esperado).

Observação fora da missão (repetida da parte 1): a faixa de avisos da loja, e a da prévia, alternam "Black Friday · novembro inteiro com joias em oferta · Ver ofertas" com a "Black Friday" encerrada desde 13/11. É texto da faixa de avisos (WI 101), não leitura de campanha — sem achado.

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-SEC-001 | pass | 01–07 | `screenshots/CH-03b-01-conta-logada.png` · `CH-03b-02-home-b1-logada.png` · `CH-03b-03-ma-logada.png` · `CH-03b-04-page-logada.png` · `CH-03b-05-ofertas-logada.png` · `CH-03b-06-sacola-logada.png` | Login confirmado em `/conta` antes de medir. Os 5 passos conferem com a régua da visitante; P-AGE sem selo e a R$ 379,90 apesar da marcação na "Natal" (agendada) e na "QA103 Desligada" (30 %). Variações: recarregar e link direto — pass; "sair e reabrir a Home" não feita (o "Sair" da loja não foi achado — spec-gap) |
| TC-SEC-002 | pass | 08–09 | `screenshots/CH-03b-07-previa-celular.png` · `CH-03b-08-previa-computador.png` | A prévia carrega a loja com a sessão de admin ("Minha conta" no iframe). Passo 1 e 4 conferem; passo 2: nenhum selo de campanha nas fileiras — mas nenhuma peça de Natal está nas fileiras da Home, então não houve peça de Natal para olhar ali; passo 3 não se aplica (B-2 não existe). Variações "recarregar a prévia" e "tela cheia" não feitas (orçamento) |

Contagem: pass 2 · fail 0 · blocked 0 · skip 0

## Achados

nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| "Adicionar à sacola" na página de M-A não adiciona nem dá retorno com um clique; com foco + Enter adiciona. Segunda sessão em que acontece (anônima na parte 1, logada aqui), sempre no browser headless — pode ser artefato do clique automatizado | 07 | pré-existente |
| Na loja, a 390 × 844, a dona logada não acha "Sair": nem em `/conta` (só "Pedidos") nem no menu (só "Conta") | 10 | pré-existente |
| A prévia em "Computador", com o painel a 390 px, mostra o rótulo "1024 × 768 · 5%" — escala que parece pequena demais para leitura; não investigado | 09 | polimento |

## Fora da cobertura

- Variação "sair e reabrir a Home" do TC-SEC-001 e o edge case "voltar depois de sair" — o "Sair" da loja não foi achado na tela; a sessão da loja terminou com o fechamento do browser (perfil em memória), sem saída pela tela
- Duas abas, uma logada e outra anônima, e "sair em outra aba" — orçamento
- Variações "recarregar a prévia" e "tela cheia" do TC-SEC-002 — orçamento
- Peças de Natal nas fileiras da prévia — nenhuma delas está nas fileiras de coleção da Home; P-AMBAS (Natal 15 %) foi conferida em `/ofertas` logada, com os 10 % de Dia das Mães
- A página de P-AGE vista pela visitante (régua anônima) — não medida em nenhuma das duas partes; a referência usada é o preço cadastrado (R$ 379,90) lido no painel na parte 1
- Viewport 1440 × 900 na loja logada — orçamento

## Debrief

- **Surpresas:** nada sobre a missão — a vigência se mantém com a sessão de admin em todos os pontos medidos. A loja e o painel têm sessões independentes: sair do painel não tira a dona da loja
- **Próximo charter:** se a triagem quiser a variação "sair", descobrir onde fica o "Sair" da loja no celular (ou a 1440) antes de redespachar
- **Padrão novo:** nada

Massa criada: uma sacola com M-A (Prata 925, sem base, sem gravação), na conta `admin-loja` na loja — sem pedido. Nada editado no painel.
