# Sessão CH-01 · Pôr a Black Friday no ar

| Campo       | Valor |
| ----------- | ----- |
| Charter     | `test-plans/charters/CH-01-por-a-black-friday-no-ar.md` · exploratório · P0 |
| Status      | done |
| Persona     | PER-01 Adri · conta: `admin-loja` (conta de dev do `supabase/seed.sql`, seção 5 — `QA_ADMIN_LOJA_*` não definidas; valor nunca escrito) |
| Tour · modo | Feature · por cenário (J-01) — rodada de confirmação, sem tour novo |
| Rodada      | confirmação (rodada 2) |
| Orçamento   | ~60 ações de browser de 50 (contando navegação, clique, preenchimento, screenshot e eval; leituras de snapshot e esperas fora da conta). Estourou ~10 por duas buscas do painel que não filtraram (ver Debrief) |
| Ambiente    | painel http://localhost:8093/admin · loja http://localhost:8092 · build não exposto · Chromium (agent-browser 0.39.1, sessão `CH-01`) · viewports 1440 × 900 e 390 × 844 · rotas abortadas: `*.supabase.co`, `**/g/collect*` |
| Paridade    | Supabase local; "Black Friday" lida como "Dia das Mães" (a BF está encerrada desde 13/11 16:17); bloco "Joias em oferta" e campanha já existentes (não criados nesta sessão) |

## Missão

Como a dona, pôr a Black Friday no ar sozinha — cadastro, marcação das quatro peças e o bloco da Home — e chegar
à loja vendo as peças em oferta, procurando qualquer ponto em que a tela diga uma coisa e grave outra (data, hora,
percentual, preço).

Nesta rodada (confirmação): marcar a massa M-C 10 % e M-B 15 % na "Dia das Mães"; reconferir TC-FUNC-003
(falhou na rodada 1 pelo BUG-002) e executar TC-JOURNEY-003 (sem execução na rodada 1).

## Passos

| #  | A persona tentou | Viu | Evidência |
| -- | ---------------- | --- | --------- |
| 01 | Entrou no painel como `admin-loja`, abriu M-C (Pulseira Afetiva Esferas com Leite Materno em Prata 925) › Preços & variações, e escolheu **10%** em "Desconto na Dia das Mães" (1440) | Cartão "Dia das Mães · 13/11 a 30/11/2026 · Em vigência"; prévia **R$ 374,00 riscado → R$ 336,60**, selo "DIA DAS MÃES, 10% de desconto"; tabela "Variação 1 · Preço R$ 374,00 · Na campanha R$ 336,60"; nota "A loja mostra este preço até 30/11 às 23:59…". Nunca R$ 314,91 | `screenshots/CH-01-r2-01-mc-10-previa.png` |
| 02 | Salvou M-C e recarregou a página | "Produto atualizado"; após recarregar, 10% continua marcado e a prévia segue R$ 374,00 → R$ 336,60; campo Preço continua **349,90** (cadastrado não mudou) | — |
| 03 | Abriu M-B (Pulseira Afetiva com Leite Materno em Prata 925, 12 variações), escolheu **15%** na "Dia das Mães" | Prévia R$ 383,00 → R$ 325,55; tabela com as 12 variações, cada uma a 15 % do próprio preço (558→474,30 · 502→426,70 · 467→396,95 · 453→385,05 · 439→373,15 · 411→349,35 · 397→337,45 · 383→325,55) | `screenshots/CH-01-r2-02-mb-15-tabela.png` |
| 04 | Salvou M-B | "Produto atualizado"; Preço segue **383,00** | — |
| 05 | Na loja, abriu a página de M-C em 1440 | Selo "DIA DAS MÃES, 10% de desconto"; **R$ 336,60**, "De R$ 374,00 · 4x de R$ 84,15 sem juros", R$ 313,04 com Pix | `screenshots/CH-01-r2-03-pdp-mc-1440.png` |
| 06 | A mesma página em 390 | Mesmos valores; barra fixa de compra "R$ 336,60 · De R$ 374,00" | `screenshots/CH-01-r2-04-pdp-mc-390.png` |
| 07 | Abriu `/ofertas` em 390 | Título "Dia das Mães"; 4 cartões: M-C De R$ 374,00 → R$ 336,60 (10%) · M-B De R$ 439,00 → R$ 373,15 (15%) · M-D De R$ 340,00 → R$ 289,00 (15%) · M-A (Lisa) De R$ 385,00 → **R$ 346,50** (10%) | `screenshots/CH-01-r2-05-ofertas-390.png` |
| 08 | Abriu a página de M-B em 390 e trocou de variação | Variação inicial (Não · Prata 925 · Não) R$ 325,55 "De R$ 383,00"; trocando para Sim · Folheado a Ouro Rose · Não: R$ 426,70 "De R$ 502,00" — batem com a tabela do painel | `screenshots/CH-01-r2-06-pdp-mb-390.png` |
| 09 | No painel, `/admin/home` (1440): procurou o bloco "Joias em oferta" e abriu o editor | Na lista: "Joias em oferta — o título e os percentuais vêm da campanha em vigência · No ar", switch ligado; na bandeja "Joias em oferta · já está na Home" desligado (não duplica). Editor: "Este bloco não tem campos…"; prévia com região "Dia das Mães", "Peças selecionadas com 10% e 15% de desconto", links "Ver as peças com 10% / 15% de desconto" e as 4 peças | `screenshots/CH-01-r2-07-editor-bloco-1440.png` |
| 10 | Abriu a lista de Campanhas | Natal · 01/12 a 24/12/2026 · 10% 15% · 4 · Agendada — **Dia das Mães · 13/11 a 30/11/2026 · 10% 15% · 4 · Em vigência** — Black Friday · 13/11 a 13/11/2026 · 3 · Encerrada | `screenshots/CH-01-r2-08-lista-campanhas.png` |
| 11 | Abriu a Home da loja em 390 | Bloco "DIA DAS MÃES / Dia das Mães", texto dos percentuais, links 10 % e 15 %, "Algumas das peças em oferta" com as 4 peças nos mesmos preços de `/ofertas`; "Ver todas" | `screenshots/CH-01-r2-09-home-bloco-390.png` |
| 12 | Saiu da conta e fechou o browser | Voltou a `/admin/login` | — |

**Edge cases tentados:** recarregar depois de salvar (passo 02). Nenhum outro — rodada de confirmação.

## Casos

| TC | Veredito | Passo | Evidência | Nota |
| -- | -------- | ----- | --------- | ---- |
| TC-FUNC-003 | pass | 01–08 | `screenshots/CH-01-r2-01-mc-10-previa.png` · `CH-01-r2-03-pdp-mc-1440.png` · `CH-01-r2-04-pdp-mc-390.png` · `CH-01-r2-05-ofertas-390.png` · `CH-01-r2-02-mb-15-tabela.png` · `CH-01-r2-06-pdp-mb-390.png` | BUG-002 corrigido: 10 % sobre o "de" R$ 374,00 = R$ 336,60 no painel, cartão e página (390 e 1440). M-B 15 % por variação certo (12 de 12 no painel, 2 conferidas na página). M-A a 10 % = R$ 346,50 no cartão em 390. Preço cadastrado intacto. Passos 1–3/6 com M-A e M-D não refeitos (marcações já existentes da massa) |
| TC-JOURNEY-003 | pass | 09–11 | `screenshots/CH-01-r2-07-editor-bloco-1440.png` · `CH-01-r2-08-lista-campanhas.png` · `CH-01-r2-05-ofertas-390.png` · `CH-01-r2-09-home-bloco-390.png` | Lido com "Dia das Mães" no lugar da BF: bloco ligado e único, editor sem campos, lista "Dia das Mães · 4", `/ofertas` com as 4 peças com selo, Home com o bloco. Passo 1 (cadastrar a campanha) não refeito — a campanha já existe e a regra da rodada proíbe criar; tempos por passo não cronometrados |

Contagem: pass 2 · fail 0 · blocked 0 · skip 0

## Achados

nada

## Spec-gaps

nada

## Fora da cobertura

- TC-FUNC-001 (cadastro da campanha) e o passo 1 da TC-JOURNEY-003 — a rodada proíbe criar campanha; a "Dia das Mães" já estava cadastrada
- Edge cases do charter (duplo clique em Salvar, voltar no formulário, duas abas, sair sem salvar) — rodada de confirmação
- Fonte a 200 % e alvo de toque ≥ 44 px — não pedidos nesta confirmação (são do CH-08)
- Página de M-A e M-D em 1440 — só os cartões em 390 foram lidos
- Tempo por passo da jornada (60 s / 30 s / 5 s / 10 s) — não cronometrado

## Debrief

- **Surpresas:** sugestões de backlog (não são regressão nem critical/high, ficam fora dos Achados pela regra da rodada):
  1. Cartão de M-B em `/ofertas` e na Home mostra "De R$ 439,00 → R$ 373,15" (variação Não · Prata 925 · Sim), mas a página da peça abre em "De R$ 383,00 → R$ 325,55" — o cartão não mostra a variação inicial nem a mais barata. Os dois preços estão certos para a sua variação (passos 07, 08)
  2. Na tabela da prévia de M-C, a coluna "Preço" mostra R$ 374,00 (o "de"), enquanto o campo Preço da peça diz 349,90 — o rótulo pode confundir a dona sobre qual preço é o cadastrado (passo 01)
  3. Home da loja em 390: o corpo rola na horizontal (largura do documento 748 px numa janela de 390; rolagem de 358 px). Os candidatos são o carrossel de banners do topo ("2 de 2") e a faixa de Categorias — fora da superfície da Mudança; o bloco "Joias em oferta" não aparece entre os elementos que transbordam. Merece conferência no CH-08 / CFR (passo 11)
  4. Página da peça em 390: a barra fixa de compra cobre o último grupo de opções (o clique automatizado em "Sim" do 3º grupo foi recusado por estar coberto); a persona precisa rolar antes de tocar
- **Ambiente:** a busca da lista de Produtos do painel por preencher + Enter não filtrou em duas tentativas; abrir `/admin/produtos?busca=<termo>` filtrou. Pode ser da automação — não registrado como achado. Custou ~10 ações
- **Próximo charter:** os charters que dependem de M-B (15 %) e M-C (10 %) na "Dia das Mães" já podem rodar — a massa está gravada
- **Padrão novo:** nada
