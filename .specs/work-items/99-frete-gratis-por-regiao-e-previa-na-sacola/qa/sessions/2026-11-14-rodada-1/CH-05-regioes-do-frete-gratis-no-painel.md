# Sessão CH-05 · As regiões do frete grátis no painel, valendo na loja

| Campo       | Valor |
| ----------- | ----- |
| Charter     | `test-plans/charters/CH-05-regioes-do-frete-gratis-no-painel.md` · exploratório · P0 |
| Status      | done |
| Persona     | PER-03 Adri · conta: `admin-loja` (`QA_ADMIN_LOJA_*`) no painel · `anonima` na loja |
| Tour · modo | Multi-Tab · por cenário (J-03) |
| Rodada      | exploração |
| Orçamento   | ~57 ações de browser de 50 (contadas as interações e navegações; leituras de snapshot não contam). O excesso veio de ~8 ações perdidas na cotação interceptada que não respondia (ver Surpresas) e da restauração obrigatória da massa |
| Ambiente    | painel http://localhost:8083 · loja http://localhost:8082 · build não exposto · Chromium (headless) · viewport 1440 × 900 |
| Paridade    | cotação do Melhor Envio interceptada com a fixture A; `*.supabase.co` e `/g/collect` bloqueados. A sessão da loja começou no `agent-browser` (`--session CH-05-loja`) e passou ao `playwright-cli -s=CH-05-loja` porque o `network route --body` do `agent-browser` não manda cabeçalho CORS (ver Surpresas) |

## Missão

Como Adri, com o painel numa aba e a loja na outra, configurar a campanha "R$ 450, só Sul e Sudeste", tentar as
configurações que não fazem sentido, e confirmar que cada salvar vale na loja sem deploy — sem deixar a loja numa
configuração que ninguém pediu.

## Passos

| #  | A persona tentou | Viu | Evidência |
| -- | ---------------- | --- | --------- |
| 00 | Entrar no painel pelo link de Frete e Material | Tela de login; depois de entrar, caiu no Dashboard e não na página do link (abriu de novo pela URL) | — |
| 01 | Olhar o card Frete no estado inicial (interruptor desligado, R$ 150,00, cinco regiões) | "Regiões com frete grátis" com Norte, Nordeste, Centro-Oeste, Sudeste, Sul, as cinco marcadas e desabilitadas com o aviso "Guardadas. Voltam a valer quando você ligar o frete grátis." Ligado: ajuda "O frete grátis vale só para entregas nas regiões marcadas. A região é conferida pelo CEP." e, sob cada caixa, as UFs (AC, AP, AM, PA, RO, RR, TO · AL, BA, CE, MA, PB, PE, PI, RN, SE · DF, GO, MT, MS · SP, RJ, MG, ES · PR, SC, RS) | `screenshots/CH-05-01-cinco-regioes.png` |
| 02 | Ligar, faixa R$ 450,00, cinco regiões, salvar; recarregar o painel | "Configurações salvas"; recarregado: ligado, 450,00, as cinco marcadas | — |
| 03 | Na loja (anônima), olhar a faixa do topo | "Frete grátis · acima de R$ 450,00 para Sul e Sudeste" com as cinco regiões salvas. Conferido no painel (só leitura): é um aviso de texto fixo da Faixa de avisos, escrito à mão — não vem da configuração do frete | `screenshots/CH-05-02-barra-cinco-regioes.png` |
| 04 | Sacola de R$ 499,80 (2 × Pingente Amor de Gato), sem CEP | "Frete grátis liberado" | `screenshots/CH-05-03-sacola-sem-cep-cinco.png` |
| 05 | Calcular 40020-000 (BA) | Primeira tentativa (route do `agent-browser`): "Não consegui consultar o frete agora…" — ambiente, ver Surpresas. Com a route do `playwright-cli` + CORS: "Frete grátis liberado", PAC "Grátis" (R$ 21,40 riscado), SEDEX R$ 38,90, total R$ 499,80 | `screenshots/CH-05-04-ba-cinco-regioes.png` |
| 06 | Trocar para 69900-000 (AC) | "Frete grátis liberado", PAC "Grátis", total R$ 499,80 | — |
| 07 | No painel, desmarcar as cinco com o interruptor ligado e salvar | Recusado: "Escolha ao menos uma região para o frete grátis, ou desligue o frete grátis." (só aparece ao salvar) | `screenshots/CH-05-05-recusa-sem-regiao.png` |
| 08 | Abrir o painel numa segunda aba (Multi-Tab) | Ligado, 450,00, as cinco marcadas — nada foi gravado | — |
| 09 | Na primeira aba (ainda sem nenhuma região), desligar o interruptor e salvar | "Configurações salvas"; caixas desmarcadas e desabilitadas | — |
| 10 | Na loja, recarregar e abrir a sacola (CEP 69900-000 guardado) | Nenhuma faixa de frete grátis na sacola; PAC R$ 21,40 cobrado, total R$ 521,20; nenhum "Grátis" | `screenshots/CH-05-06-desligado-sem-gratis.png` |
| 11 | No painel, ligar, marcar só Sudeste e Sul (faixa 450,00), salvar, recarregar | "Configurações salvas"; recarregado: ligado, 450,00, só Sudeste e Sul | `screenshots/CH-05-07-sul-sudeste-salvo.png` |
| 12 | Na loja, recarregar e abrir a sacola (CEP 69900-000) | "Frete grátis só para Sul e Sudeste", PAC R$ 21,40 cobrado, total R$ 521,20. ⓘ: "Para este CEP, o frete é o da cotação. Compras a partir de R$ 450,00 têm frete grátis para entregas no Sul (PR, SC, RS) e no Sudeste (SP, RJ, MG, ES). A região é conferida pelo CEP." | `screenshots/CH-05-08-ac-so-sul-sudeste.png` |
| 13 | Trocar para 01310-100 (SP) | "Frete grátis liberado", "Frete para 01310-100 · São Paulo/SP", PAC "Grátis", total R$ 499,80 — sem deploy | `screenshots/CH-05-09-sp-liberado.png` |
| 14 | Sair do painel | Volta a `/admin/login` | — |

**Edge cases tentados:**

- Duas abas do painel: a segunda aba, aberta depois da recusa, prova que nada foi gravado. Depois do salvar na primeira, a segunda ficou com o estado velho (ligado, cinco) sem aviso; o salvar a partir dela não foi tentado (orçamento) e a aba foi fechada sem salvar
- Desligar com a lista vazia: gravável, como o TC pede

## Casos

| TC          | Veredito | Passo | Evidência | Nota |
| ----------- | -------- | ----- | --------- | ---- |
| TC-FUNC-018 | pass | 01, 07, 08, 11, 12, 13 | `screenshots/CH-05-05-recusa-sem-regiao.png` · `CH-05-07-sul-sudeste-salvo.png` · `CH-05-08-ac-so-sul-sudeste.png` · `CH-05-09-sp-liberado.png` | Passo 4 conferido com 69900-000 (AC, Norte) no lugar de 40020-000 (BA), para caber no orçamento: os dois ficam fora de Sul e Sudeste. Variações (faixa zero, salvar nas duas abas, 390 × 844) não rodadas |
| TC-FUNC-019 | pass | 02, 04, 05, 06, 09, 10, 11 | `screenshots/CH-05-03-sacola-sem-cep-cinco.png` · `CH-05-04-ba-cinco-regioes.png` · `CH-05-06-desligado-sem-gratis.png` | Passo 4 conferido com 69900-000 (CEP guardado na sacola) no lugar de 01310-100. ⓘ do estado "cinco regiões" e a variação da barra de confiança na Home não conferidos (a faixa do topo é um aviso manual, ver passo 03) |

Contagem: pass 2 · fail 0 · blocked 0 · skip 0

## Achados

nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta |
| ----------------------- | ------------ | --------------- |
| A Faixa de avisos da loja tem um aviso de texto fixo "Frete grátis · acima de R$ 450,00 para Sul e Sudeste" que aparece seja qual for a configuração do frete (com as cinco regiões salvas, dizia "Sul e Sudeste"). Nada liga o aviso manual à configuração, e o painel diz "Quando desligado, a loja não anuncia frete grátis em nenhuma tela" | 03 | pré-existente |
| Login no painel por link profundo (`/admin/configuracoes/frete-e-material`) leva ao Dashboard depois de entrar, não à página pedida | 00 | pré-existente |

## Fora da cobertura

- Faixa em zero com o interruptor ligado — orçamento
- Salvar em duas abas com regiões diferentes e recarregar as duas — orçamento (só a leitura em duas abas foi feita)
- Voltar do navegador com alterações não salvas — orçamento
- Marcar e desmarcar a mesma caixa várias vezes; duplo clique em "Salvar" — orçamento
- A seção em 390 × 844 (sem rolagem horizontal, alvo das caixas) — orçamento
- 40020-000 depois de Sul + Sudeste (usado 69900-000, também fora da região); ⓘ no estado das cinco regiões; barra de confiança da Home — orçamento
- "Calculando" com resposta lenta — fora do alcance pedido pelo ambiente

## Debrief

- **Surpresas:** o `agent-browser network route "**/functions/v1/melhor-envio*" --body …` intercepta o POST, mas a resposta mockada sai sem `Access-Control-Allow-Origin` e o fetch da loja (8082 → 54441, cross-origin) falha: a sacola mostra "Não consegui consultar o frete agora…" em vez das opções. Com o `playwright-cli route … --content-type application/json --header "Access-Control-Allow-Origin: *" --header "Access-Control-Allow-Headers: *"` a fixture A chega. Todo charter que cota frete no `agent-browser` vai cair nisso. Também: duas esperas fixas curtas (1,2–1,5 s) usadas para ler o aviso do salvar
- **Próximo charter:** os edge cases que ficaram (duas abas salvando, duplo clique, faixa zero, 390 × 844) num charter curto do painel
- **Padrão novo:** nada

Estado final de `store_settings.shipping` deixado pelo painel: interruptor do frete grátis ligado, faixa R$ 450,00, só Sudeste e Sul marcados (recarregado e conferido no passo 11; a loja confirma nos passos 12–13). Retirada no escritório e custo padrão (R$ 19,90) não tocados.
