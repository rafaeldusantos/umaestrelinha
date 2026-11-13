# Sessão CH-05 · O pedido montado e o feed do Google

| Campo       | Valor |
| ----------- | ----- |
| Charter     | `test-plans/charters/CH-05-pedido-montado-e-feed.md` · exploratório · P1 |
| Status      | done |
| Persona     | PER-01 Adri · conta: `admin-loja` (conta de dev do `seed.sql`, seção 5 — `QA_ADMIN_LOJA_*` não definidas nesta máquina) |
| Tour · modo | Money · por cenário (J-05) |
| Rodada      | exploração |
| Orçamento   | 50 ações de browser de 50 (mais 6 só para sair das duas contas) |
| Ambiente    | painel `http://localhost:8093/admin` · app do ateliê `http://localhost:8094` · loja `http://localhost:8092` · feed `http://127.0.0.1:54441/functions/v1/google-feed` · build não exposto · Chromium (agent-browser 0.39.1, headless) · viewports 1440 × 900 (painel) · 390 × 844 (app) |
| Paridade    | Supabase local; `*.supabase.co` e `**/g/collect*` bloqueados por rota; functions com chaves externas inválidas (pagamento não concluído, por regra); feed do Google ligado só no banco local |

Nota: as URLs de Entrada do charter (`:8083`, `:8084`) são do WI 101; a sessão usou `:8093`/`:8094`, como o `ambiente` manda.

## Missão

Como a dona fechando um pedido pelo WhatsApp, achar qualquer diferença de centavo entre o preço que o painel ou o
app montam, o que o link de checkout cobra, o que a loja mostra e o que o anúncio do Google diz.

## Passos

| #  | A persona tentou | Viu | Evidência |
| -- | ---------------- | --- | --------- |
| 01 | No painel (1440 × 900), em Montar pedido, buscou M-A e escolheu a variação Ouro Branco | Na lista da busca, "Pulseira Afetiva Lisa… R$ 385,00" (preço de tabela); ao escolher, as 3 variações com "R$ 308,00"; na proposta, "Black Friday · −20%" e R$ 308,00 | — |
| 02 | Acrescentou M-E (Ouro Branco) e aplicou `QA10` | M-E a R$ 340,00 sem selo; Resumo: 2 peças R$ 648,00 · Cupom QA10 − R$ 34,00 (10 % só de M-E) · Total das peças R$ 614,00 · No PIX R$ 571,02 | `screenshots/CH-05-02-cupom-so-na-comum.png` |
| 03 | Escolheu a cliente (Joana QA Oitenta e Nove — a 1ª tentada, sem nome, travava em "Informe o nome da cliente.") e deu **duplo clique** em "Criar link do pedido" | Abriu "Pedido montado P-0045", "Vale até 20/11/2026", peças R$ 308,00 e R$ 340,00, Subtotal R$ 648,00 · Cupom − R$ 34,00 · Total das peças R$ 614,00. Na lista de Pedidos montados, uma só proposta nova (P-0045) | `screenshots/CH-05-03-proposta-p0045.png` |
| 04 | Abriu o link da proposta na loja (nova aba) e **recarregou** | "Seu pedido — Montado pela Adri": M-A R$ 308,00 (riscado R$ 385,00), M-E R$ 340,00; Subtotal R$ 648,00 · Cupom QA10 −R$ 34,00 · Frete R$ 19,90 · Desconto PIX (7 %) −R$ 42,98 · Total R$ 590,92; cartão "4x de R$ 158,48". Depois do reload, os mesmos valores. Nada pago | `screenshots/CH-05-04-link-na-loja.png` |
| 05 | Nova montagem só com M-A (Ouro Rose) e cupom digitado em minúsculas, `qa10` | Campo normalizou para QA10; alerta "Este cupom não vale para peças da Black Friday." | `screenshots/CH-05-06-cupom-recusado.png` |
| 06 | Ligou "Desconto combinado", trocou para %, 5 %, motivo "Fechado no WhatsApp" | Aceito por cima da campanha: − R$ 15,40 (5 % de R$ 308,00), Total das peças R$ 292,60, No PIX R$ 272,12. **Não salvo** — a massa da rodada permite um só pedido montado (o P-0045) | `screenshots/CH-05-07-combinado-sobre-campanha.png` |
| 07 | No app do ateliê (390 × 844), entrou, escolheu a cliente Bia QA e, no passo Peças, buscou M-B | Lista: "Pulseira Afetiva com Leite Materno em Prata 925 a partir de R$ 325,55" (= 15 % sobre R$ 383,00); M-A "a partir de R$ 308,00"; M-E R$ 340,00 | `screenshots/CH-05-08-app-lista-390.png` |
| 08 | Tocou em M-B para escolher a variação | O primeiro resultado ficou sob a barra fixa dos passos ("Passo 1…4") e o toque não chegou à peça; a segunda tentativa já estourava o orçamento — variação por variação no app não foi vista | — |
| 09 | Abriu o feed local do Google e leu os itens de M-A, M-B, M-E e M-C | 3.228 itens, 31 com `g:sale_price`. M-A: 3 variações `385.00 BRL` / `308.00 BRL`. M-B: 12 variações, cada uma com 15 % sobre o próprio preço (383→325.55, 397→337.45, 411→349.35, 439→373.15, 453→385.05, 467→396.95, 502→426.70, 558→474.30). Vigência `2026-11-13T03:00:00Z/2026-12-01T03:00:00Z` em todas (início 13/11 00:00 BRT; fim exclusivo = 30/11 23:59 + 1 min BRT). M-E: `340.00 BRL` sem `g:sale_price`. M-C: `374.00` / `336.60` | — |
| 10 | Saiu da conta no app e no painel; fechou o browser | Voltou a `/login` e `/admin/login` | — |

**Edge cases tentados:** duplo clique em "Criar link do pedido" (uma proposta só) · recarregar o link de checkout (mesmo total) · cupom em minúsculas (normalizado, recusado com o nome da campanha) · trocar o tipo do desconto combinado de R$ para % (campo troca de valor para percentual, mensagem "Escreva o motivo do desconto combinado." até informar o motivo)

## Casos

| TC | Veredito | Passo | Evidência | Nota |
| -- | -------- | ----- | --------- | ---- |
| TC-FUNC-019 | pass | 01–07 | `screenshots/CH-05-02-cupom-so-na-comum.png` · `CH-05-03-proposta-p0045.png` · `CH-05-04-link-na-loja.png` · `CH-05-06-cupom-recusado.png` · `CH-05-07-combinado-sobre-campanha.png` | passos 1, 2, 3, 5 conferidos ao centavo; passo 4: o combinado foi aceito sobre a campanha, mas a proposta com ele não foi salva (massa: um só pedido montado); passo 6: só o "a partir de R$ 325,55" da lista do app — a variação mais cara no app ficou de fora (Fora da cobertura). Variações: duplo clique e recarregar o link conferidos |
| TC-INT-001 | pass | 09, 04, 07 | — | `g:price`/`g:sale_price`/vigência certos em todas as variações de M-A e M-B; fim exclusivo 01/12 03:00 UTC (I-09); M-E sem `g:sale_price`; M-C com o menor. Comparação com a loja: M-A R$ 308,00 no link de checkout; M-B R$ 325,55 (a menor) no app — a PDP de M-B variação por variação não foi aberta |

Contagem: pass 2 · fail 0 · blocked 0 · skip 0

## Achados

nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta |
| ----------------------- | ------------ | --------------- |
| Na busca de peças do painel (Montar pedido), o resultado mostra o preço de tabela ("Pulseira Afetiva Lisa… R$ 385,00") enquanto, ao escolher, a variação e a proposta mostram R$ 308,00; no app do ateliê a mesma lista já mostra "a partir de R$ 308,00". Nenhuma fonte lida define o preço da lista de busca | 01, 07 | polimento |

## Fora da cobertura

- Variação a variação de M-B no app do ateliê (a mais cara e a mais barata), voltar no meio da montagem e trocar a variação depois do combinado — orçamento esgotado; o toque no primeiro resultado da busca caiu na barra fixa dos passos (passo 08) e a nova tentativa não cabia
- Salvar uma proposta com desconto combinado sobre a campanha e abrir o link — a massa da rodada permite um só pedido montado (o P-0045, já criado)
- Página do produto M-B na loja, variação por variação, contra o feed — orçamento
- Abrir a mesma proposta em duas abas — orçamento
- Concluir o pagamento — fora do escopo e proibido no ambiente

## Debrief

- **Surpresas:** a primeira cliente buscada (só e-mail) trava a criação com "Informe o nome da cliente." — fora da Mudança, não investigado
- **Próximo charter:** M-B no app do ateliê a 390 × 844 — variação cara e barata, gesto de voltar e troca de variação depois do combinado; conferir também se a barra fixa dos passos cobre o primeiro resultado da busca para o toque real (aqui só se viu pela recusa do clique automatizado, não está confirmado como achado)
- **Padrão novo:** nada
