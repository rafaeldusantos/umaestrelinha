# WI 102 · Campanhas de desconto — resumo da sessão

**Data**: 2026-11-13 · **Branch**: `feature/102` (local, worktree `store__feature-102`, base `master` em `eceb80c2`) · **Fase**: `done`
**Fluxo**: planejamento inline. O humano pediu que todos os gates fossem decididos pela recomendação, com um segundo agente na dúvida. A implementação correu por ondas no orquestrador (Forja implementa, Crivo revisa, um commit por tarefa), e a Validation fechou nesta sessão.

## Planejamento

- **PRD Tech Review r1**: `changes_requested_gaps`, com 12 edições aplicadas ao `prd.md` e 14 itens levados a Decisões. As principais edições:
  - vocabulário: "Encerrada" × "Desligada";
  - RN-06: arredondamento ao centavo, com meio centavo para cima, por unidade;
  - RN-10: filtros e ordenação pelo preço com desconto;
  - RN-13: só a faixa da campanha aparece, e os selos do canto saem;
  - RN-16: o frete grátis por valor conta o preço com desconto;
  - RN-17: o order bump cobra o menor preço;
  - UC-05: a loja nunca cobra mais do que mostrou;
  - UC-06: indexação em até 5 min, e `/black-friday` redireciona para `/ofertas`.
- **Handoff**: H-01 a H-12 entraram em Decisões do `spec.md`, sem nenhum item travado. Os de maior alcance:
  - H-03: `/black-friday` existe só como redirect;
  - H-04: o `ends_at` é exclusivo;
  - H-05: o `create-order` responde 422 `promotion_no_longer_valid`;
  - H-06: há um leitor só, `_shared/campaigns.ts`;
  - H-12: os prefixos de migration começam em `20261130120000`.
- **Fila**: 9 tarefas em 4 ondas (`01 | 02,04 | 03,05,06,07 | 08,09`), com posse de arquivo exclusiva em `waves.md`. A auditoria deu "serve com correção", e os 3 achados foram corrigidos antes da execução.

## O que foi feito, por tarefa

Todas as alterações estão num repositório só (`.`, monorepo). O hash é o do commit do orquestrador.

| Tarefa | Commit | Onde | O quê | Revisão |
| --- | --- | --- | --- | --- |
| T01 Campanhas no painel | `b67eca0d` | backoffice 24 · core 15 · store 3 · supabase 2 · migration | tabelas `campaigns`/`campaign_percents`/`product_campaigns` (exclusão por `tstzrange '[)'`, FK composta `restrict`, view `campaign_percent_usage`), RPC `save_campaign`, `core/campaigns` (preço RN-06, vigência, recusas, contraste), telas `/admin/campanhas` (lista, nova, editar, apagar, encerrar), sidebar e guardas | serve com correção |
| T02 Campo da campanha no produto | `a768dcca` | backoffice 7 | cartão por campanha na aba Preço e estoque, percentual por escolha única, prévia por variação, gravação só do que mudou | serve |
| T04 Selo e preço na loja | `71c9871a` | store 20 · supabase 2 | o mapeador grava o preço efetivo, faixa no cartão, selo em linha na página, miniaturas acima da faixa, `useLiveCampaign`, sem os selos do canto | serve com correção (medidas do selo e ordem dos preços pelo `spec.md`) |
| T03 Lista e edição em massa | `9e0d1434` | backoffice 17 | filtro `?campanha=&percentual=` no servidor (embed `!inner`), coluna de marcação, seção "Campanha" na edição em massa | serve com correção |
| T05 Sacola e checkout | `573d2164` | store 26 · core 8 · functions 9 · mobile-adm 4 · backoffice 1 · supabase 2 · migration | `resolveOrderPricing` com `campaign`, `couponRefusal` com base elegível, campanha fora do Compre Junto e da faixa, `create-order` e `create-payment` lendo do banco, colunas no pedido, releitura da sacola, linha "Desconto de campanha" no resumo e no e-mail | serve com correção |
| T06 Vitrine `/ofertas` | `77f20b42` | store 20 · core 15 | rota de classe `offers`, `servePage` e sitemap, redirect de `/black-friday` na SPA, no servidor e no `vercel.json`, chips por percentual, estado vazio | serve com correção (texto literal do estado vazio) |
| T07 Bloco "Joias em oferta" | `8b859c92` | store 9 · core 7 · backoffice 5 · migration | tipo `campaign_offers` (`check` e índice único recriados), widget com cartões por percentual e fileira, cartão do editor sem campos | serve com correção (tons pelo `spec.md`, import pelo barrel) |
| T08 Feed e JSON-LD | `a49146c1` | core 12 · functions 3 · store 2 | `sale_price` e `sale_price_effective_date` no feed, `priceValidUntil` no JSON-LD, campanha embutida na página servida | serve |
| T09 Pedido montado | `a1c6ea53` | backoffice 10 · mobile-adm 8 · core 5 · functions 2 | `ProposalLine.campaign`, recusa de cupom na montagem, `order-proposals` relendo a campanha, preço de campanha no painel e no app | serve com correção |

**Migrations** (aplicadas **só no banco local**): `20261130120000_102-campanhas.sql`, `20261130130000_102-campanha-no-pedido.sql`, `20261130140000_102-joias-em-oferta-na-home.sql`.

**Interrupções da corrida**: a onda 2 parou uma vez, porque os agentes da T02 e da T04 terminaram com erro sem responder. O humano mandou seguir, e as duas foram refeitas e revisadas.

## Decisões e premissas de raio largo

Estão registradas em `spec.md` › Decisões da implementação (I-01 a I-11). Em resumo:

- **I-01:** o mapeador da loja sobrescreve `price`/`compare_price` com o preço efetivo, e o preço de tabela segue em `campaign.list_prices`.
- **I-02:** uma peça só é "de campanha" quando a campanha baixa o preço dela.
- **I-03:** a variação calcula sobre o próprio `compare_price`.
- **I-04:** o cupom de frete grátis passa em peça de campanha, e o pedido mínimo é conferido sobre a base elegível.
- **I-05:** o 422 do `create-order` vai com `total: null`, e a loja recalcula o total.
- **I-06:** o resumo traz a linha genérica "Desconto de campanha", também no e-mail.
- **I-07:** `/ofertas` é uma terceira classe de rota, e o grafo Deno de `core/seo` subiu de 15 para 22 arquivos.
- **I-08:** erro de leitura da campanha nunca vira "sem campanha"; o feed responde 503 e a montagem responde 502.
- **I-09:** a vigência no feed vai em UTC `Z`, e o JSON-LD leva o último dia em Brasília.
- **I-10:** o bloco `campaign_offers` é único também no banco e não reserva espaço enquanto carrega.
- **I-11:** no painel e no app, a vigência exibida usa o relógio do painel e o `atelie_clock`, e o servidor confere de novo.

Premissas menores, todas no `implement-log.md`:

- Frases de recusa que o design não dava (T01 · 10).
- "Encerrar agora" grava o fim pelo relógio do painel (T01 · 9).
- A cópia de uma peça nasce sem campanha (T02 · 3).
- No rótulo "Tirar da {nome}", o artigo é fixo (T03 · 7).
- O botão "Ver as coleções" do estado vazio de `/ofertas` leva a `/` (T06 · 9).
- Os chips de percentual usam `rounded-pill` (T06 · 10).

## Desvios em relação ao PRD e à costura

- **A costura não foi aberta em parte da execução:** pela regra 5 do procedimento, as tarefas copiavam do "Design" resumido. Duas revisões derrubaram premissas tiradas disso: as medidas do selo em linha e a ordem dos preços na página (T04), e os tons dos cartões da Home (T07). Os dois pontos foram corrigidos pelo `spec.md` antes do commit, e nenhum desvio ficou em aberto.
- **Repetição deliberada de layout:** a `OffersPage` repete o layout de listagem da `CategoryPage` (T06 · 7). Extrair um widget compartilhado ficou fora, pelo risco sobre os guardas que leem o fonte da `CategoryPage`.
- **Desfazer da edição em massa:** o desfazer cobre só o patch de `products`; a marcação de campanha não volta pelo toast (T03 · 6).
- **Movimento reduzido:** o guarda `animacaoRespeitaMovimento` ganhou só o arquivo novo da T03. A T07 também não entrou nele, por posse do arquivo na onda dela.

## Gates executados (Validation 1, `qa-report.md`)

| Gate | Resultado |
| --- | --- |
| Testes | `core`, `functions` e `mobile-adm` com exit 0 · loja com 7374/7374 nas duas rodadas, mas exit 1 por um erro de worker (`Timeout calling "onTaskUpdate"`), sem teste reprovado · painel com 5354/5355, o lote de 60 de `AdminOrdersPage.aviso` estourando o teto de 45 s (o WI não tocou esse caminho) · os dois arquivos do painel isolados com 48/48 · máquina com load average 83, com outras sessões rodando |
| Tipos | loja 0 · servidor da loja 0 · mobile-adm 0 · painel 7 e `core` 11, todos herdados |
| Lint | loja 2/2 · painel 23/5 · mobile-adm 0/0 (igual ao baseline) |
| Build | PASS nos três apps com as variáveis públicas do local. Sem elas o worktree falha, porque não tem `.env` |
| Probe 05 (checkout, AD-012) | a 1ª execução falhou por defeitos do script (nenhuma peça sem grade no banco local, e-mail recusado, `ok` sobre valor vazio). O agente da T05 corrigiu só o script, e a 2ª execução deu **0 falhas**: campanha do servidor gravada, 422 no corpo forjado, depois do fim sem campanha, pago depois do fim pela campanha gravada, cupom só na peça comum. Limpeza feita e edge runtime encerrado |
| Cobertura | 17/17 critérios cobertos. CA-11 e CA-15 só pela forma; a medida de layout fica com a QA |
| Veredito | **PASS**, sem fix task |

## Pendências conhecidas

- **QA real-user**:
  - medir CA-11 e CA-15 em 390×844 e 1440×900, com fonte a 200 % e sem rolagem horizontal;
  - medir o deslocamento de layout quando o bloco da Home aparece;
  - conferir o selo contra o protótipo;
  - testar o "Ver todas" do bloco da Home no celular (hoje só aparece a partir de `md`).
- **Publicação**: as três migrations estão só no banco local. Push na `master` aplica migration em produção, então é preciso perguntar antes. A ordem de publicação é migrations → functions (`checkout`, `mercado-pago`, `order-proposals`, `google-feed`, `send-notification`) → bundles.
- **Merge com o WI 101**, que corre em paralelo: conferir os prefixos de migration, `navItems`, `core/page`, `server/page.ts` e `store_settings` (H-12).
- **Build no worktree**: depende das variáveis `VITE_*`, porque o worktree não tem `.env`.
- **Contenção**: a suíte da loja e o lote de 60 do painel reprovam por timeout sob carga alta. Remedir com a máquina livre antes de atualizar as baselines do `CLAUDE.md`, o que ainda não foi feito.
- **Fora do WI** (H-07): o servidor não confere o frete grátis por valor no caminho comum. É pré-existente.
