# 71 · Visitas únicas no Dashboard — Specification

> Origem: o painel da Nuvemshop mostra o bloco **Visitas únicas · Vendas · Faturamento · Ticket
> médio**, com as abas **Hoje / Ontem / Esta semana**. O Dashboard do painel não tem esse bloco.
> Decisões do usuário (2026-10-21): contador **próprio**, com id aleatório por navegador gravado uma
> vez por dia no banco, e **não** a API do GA4; **os quatro cards**; "Esta semana" começa na
> **segunda-feira 00:00 de Brasília** e inclui hoje; **nunca somar acessos do mesmo navegador**.
>
> Esta é a terceira escrita da spec. A primeira passou por quatro críticos independentes (números,
> privacidade, encaixe no código, tela). O que foi incorporado está nas ACs, e o que foi recusado
> está em *Críticas recusadas*, com o motivo. A terceira escrita veio do Design: as ACs que o código
> mostrou não fecharem e o que as três revisões adversariais do `design.md` acharam (bloco
> *Revisão 3*, logo abaixo).

## Revisão 3 (2026-10-22, pós-design)

| AC | O que mudou | Origem |
| --- | --- | --- |
| VIS-10 | "Atualizado às **HHhMM**" (era `HH:MM`, o único formato diferente no bloco); o timer da virada mede a **duração** `expira_em − lido_em` do servidor, com piso | `design.md` T-10, T-13 |
| VIS-14, VIS-27 | a resposta leva também `agora` (o instante do servidor, em ms) | `design.md` T-12 |
| VIS-16 | o marcador guarda o prazo **no relógio local**, convertido por duração: `Date.now() + (ate − agora)` | relógio adiantado faria uma chamada por navegação |
| VIS-17 | sem `requestIdleCallback`, `document.readyState === 'complete'` agenda direto | o `load` já passou numa troca de rota |
| VIS-22 | sai "ou falhou": a loja **espera** a leitura terminar; o servidor decide o host | `design.md` D4 |
| VIS-24 | sai "efeito injetado": `save(false)` chama o apagamento direto | `design.md` D3 |
| VIS-25 | a releitura aplica só registro válido e nunca desfaz recusa em memória | aba privada antiga |
| VIS-27 | sem IP, **libera** (a forma da `checkout`) | o balde único |
| VIS-29 | o preflight `OPTIONS` não registra linha; outro método ⇒ `405`, `inválido` | o preflight não é resposta a uma visita |
| VIS-33 | a resposta leva `lido_em`, `production_host`, `contagem_desde_dia`, `ultima_visita_dia` e `teto_dia`; Faturamento é `0` (nunca `NULL`) sem venda | o painel não decide dia nem host |
| VIS-34 | o literal mora em `store_time_zone()`; as declarações em TypeScript são **cinco**, e quatro passam a importar o dono | `design.md` D1, D2 |
| VIS-42 | o parâmetro sai por navegação `replace` do router, não por `history.replaceState` cru | o router ficaria com o parâmetro |
| **VIS-44** | **novo**: o painel diz quando o teto de 5.000 do dia foi atingido | ids forjados parariam a contagem sem sinal |
| *Assumptions* | Retenção (com `pg_cron` onde existir) e **pedidos da Nuvemshop em Vendas** (nova, `n`) | revisão de segurança e banco |
>
> A imagem da Nuvemshop que o usuário mostrou **não está no repositório**. Esta spec fixa o que o
> usuário pediu por escrito (quatro cards, três abas). O que aquele painel mostra além disso está em
> *Out of Scope*.

## Problem Statement

O Dashboard mostra pedidos e faturamento, mas não mostra **quantas pessoas visitaram a loja**. A
dona perdeu essa leitura quando saiu da Nuvemshop. O pedido é trazê-la **sem inflar o número**:
quem abre dez páginas ou volta três vezes no mesmo dia conta **uma** vez, e "Esta semana" é a
contagem de navegadores **distintos** na semana. Não é a soma dos dias.

Ao lado desse bloco, o Dashboard já responde "hoje" de um jeito errado. `useAdminStats` define
"hoje" por `new Date().toISOString().slice(0, 10)`, que é o **dia em UTC**. Em Porto Alegre (UTC−3)
esse "hoje" começa às 21h da véspera. Além disso, "Pedidos Hoje" e "Fat. Hoje" contam pedido
**criado**, inclusive PIX que nunca foi pago. Um bloco novo em horário de Brasília, contando venda
**paga**, ao lado desses dois cards daria duas respostas para "quanto vendi hoje?" na mesma tela.

## Goals

- [ ] O Dashboard mostra, nas abas Hoje, Ontem e Esta semana, quatro números: visitas únicas,
      vendas, faturamento e ticket médio. Os quatro saem de **uma** leitura e usam **uma** régua de
      dia de Brasília, definida no banco.
- [ ] Um navegador conta **no máximo uma vez** em cada período, por mais que navegue, recarregue ou
      abra abas. A fixture `seg/ter/qua` dá **2** em Esta semana, e não 4.
- [ ] Ficam de fora da contagem: quem recusou as estatísticas, robôs que executam JavaScript, a
      prévia do painel e o tráfego que não vem do host de produção. O painel não afirma uma
      cobertura que o contador não tem: diz desde quando conta, quando está parado e o que não
      enxerga.
- [ ] O que o contador guarda é o mínimo que os três períodos exigem: um código aleatório e o dia.
      Fica guardado por **8 dias**, e a Política de Privacidade descreve isso no mesmo deploy que
      liga o contador.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Ler a API de dados do GA4 | Decisão do usuário. O GA4 continua medindo a loja, sem relação com este contador |
| Importar o histórico de visitas da Nuvemshop | Não há fonte confiável nem forma de deduplicar contra o contador novo. A contagem começa no deploy (`VIS-38`) |
| Reconhecer a mesma pessoa em aparelhos ou navegadores diferentes | Exigiria login, e-mail ou impressão digital do navegador. O ⓘ declara isso (`VIS-08`) |
| Variação contra o período anterior, taxa de conversão, fonte de tráfego, páginas mais vistas | O pedido é o bloco de quatro cards. O GA4 cobre o resto |
| Gráfico de visitas por dia e histórico além de 8 dias | Fora do bloco pedido. Com a retenção de `VIS-30`, um gráfico futuro começaria do zero (ver *Assumptions*) |
| Pôr o `SalesChart` e o card "Fat. do Mês" na régua nova | Escopo desta feature é o bloco. A divergência fica declarada e vai para o backlog (ver *Assumptions*, linha "Gráfico e Fat. do Mês") |
| Corrigir o card "Pendentes", que conta pedido já pago | A aprovação não muda `orders.status`, então um pedido pago hoje aparece em Vendas e em Pendentes ao mesmo tempo. Fica registrado no backlog, sem conserto aqui |
| Expulsar do banco as linhas de quem recusou depois de contado | Ninguém conhece o id, nem a titular nem a dona. As linhas somem sozinhas em 8 dias (`VIS-30`), e a política diz isso |
| Editar `production_host` no painel | O campo continua fora da tela do GA4 (`AnalyticsPanel.tsx`). O contador só lê esse valor |

---

## Assumptions & Open Questions

Toda ambiguidade fica resolvida aqui ou registrada como assunção.

| Assunção / decisão | Padrão escolhido | Motivo | Confirmado? |
| --- | --- | --- | --- |
| Fonte do número | Contador próprio: id aleatório por navegador, gravado no máximo uma vez por dia | Decisão do usuário (2026-10-21) | y |
| Os quatro cards e as três abas | Visitas únicas, Vendas, Faturamento, Ticket médio; Hoje, Ontem, Esta semana | Decisão do usuário (2026-10-21) | y |
| "Esta semana" | De segunda-feira 00:00 de Brasília até agora, incluindo hoje. Numa segunda-feira, Esta semana é igual a Hoje | Decisão do usuário (2026-10-21) | y |
| Nunca somar o mesmo navegador | Cada período conta ids **distintos**. Esta semana não é a soma dos dias | Decisão do usuário (2026-10-21) | y |
| **Remover "Pedidos Hoje" e "Fat. Hoje"** | **Saem do Dashboard** (`VIS-35`). Os outros quatro cards ficam | Contam dia em UTC e pedido não pago. Ao lado do bloco, dariam duas respostas para "hoje" | **s — confirmado pelo usuário em 2026-10-22** |
| **Gráfico e Fat. do Mês** | **Ficam como estão.** A divergência (dia em UTC, pedido criado, PIX pendente incluído, teto de 1.000 linhas) é declarada e vai para o backlog como próximo `BL` livre (hoje `BL-046`), junto do card "Pendentes" (`BL-047`) | Alinhar exige mudar o gráfico e o card do mês, e isso não foi pedido. A alternativa (passar os dois para `store_day` + venda paga) depende do usuário | **n — confirmar com o usuário** |
| Fuso do dia | `America/Sao_Paulo`, decidido **no banco** pela função `store_day` (`VIS-34`). O navegador da cliente e o da dona nunca decidem que dia é | O relógio do aparelho erra. O servidor é uma fonte só | y (requisito) |
| O que é uma "visita única" | Um **navegador** com id em `localStorage` que carregou a loja no período. Não é uma pessoa. Celular e computador contam 2. **Cada janela anônima conta como um navegador novo**, porque os navegadores atuais dão `localStorage` à janela privada e o apagam ao fechar | Sem login não dá para saber mais. É o critério de "usuários" do GA4 | y |
| Navegador interno do Instagram e do WhatsApp | Tem armazenamento separado do Safari/Chrome: abrir pelo link do Instagram e depois pelo navegador conta 2. **Se** o navegador interno apagar o armazenamento entre sessões, a mesma pessoa conta mais de uma vez no dia | Com cerca de 90% de celular e muito tráfego vindo do Instagram, é o caso de maior volume. O ⓘ declara a primeira parte. **A segunda tem de ser medida em aparelho real na validação**, não suposta | n — medir |
| Safari / ITP | O Safari apaga armazenamento gravado por script depois de 7 dias sem visita. Isso não afeta nenhum período, porque o mais longo tem 7 dias | Limite declarado, sem efeito nos números | y |
| Navegador sem armazenamento ou sem `crypto.randomUUID` | **Não conta** (`VIS-19`). Nunca se cria um id por página | Um id novo a cada carga transformaria cada página numa visita | y (requisito) |
| Base legal e recusa | Legítimo interesse, a mesma decisão da feature `61` (`spec.md` dela, *Assumptions*, base legal, 2026-10-05). Sem resposta ao aviso, o contador conta. Quem desliga "Estatísticas" deixa de ser contado | Uma segunda chave de recusa daria dois donos da mesma escolha | n |
| **Categoria "Estatísticas" sempre visível** | A folha de preferências mostra "Estatísticas" **mesmo com o GA4 desligado no painel** (`VIS-26`). Isso **inverte `AVS-02`** da feature `61`, como mudança declarada | O contador não depende do interruptor do GA4. Sem a inversão, com o GA4 desligado a cliente ficaria sem como recusar a contagem, e a política diz "desligue Estatísticas" | n |
| O contador independe do GA4 | Ele **não** lê `analytics.enabled`, `measurement_id` nem `canMeasure()`. Reusa só as fontes de prévia, ambiente, consentimento e `trafficType` | Desligar o GA4 não pode zerar as visitas | y (requisito) |
| Host de produção | O contador só conta no host `store_settings.analytics.production_host`, hoje `umaestrelinha.com.br`. **Até o dia do DNS a loja roda em `umaestrelinha-store-five.vercel.app` e o contador não conta nada.** O painel diz isso (`VIS-39`) | É a mesma regra do GA4 (`trafficType`). Contar no `.vercel.app` misturaria homologação | n — operação |
| Visitas da própria dona | **Contam**, e o ⓘ diz isso. A saída é o P3 (`VIS-42`, `VIS-43`) | Excluir por papel exigiria sessão administrativa na loja, que é outro app | n |
| Robôs | Duas barreiras: `navigator.webdriver` no cliente e uma lista de assinaturas em `core`, lida pelo cliente e pelo servidor (`VIS-23`). Robô que esconde que é robô passa. O número continua sendo de navegadores, não de pessoas verificadas | Nenhum filtro é perfeito | n |
| Teto por IP | É uma **cortesia, não uma fronteira**: **30 gravações por minuto por IP, por isolate** (`createRateLimiter` fica em memória). O IP vem do primeiro item de `x-forwarded-for`, que quem chama controla. Que cabeçalho traz o IP real no gateway se mede por probe no Design | Cada navegador grava cerca de 1 vez por dia, então 30 por minuto não alcança um IP compartilhado de operadora móvel. O que de fato limita o crescimento da tabela é o teto diário | n |
| Teto diário | **5.000 linhas novas por dia de Brasília**. Acima disso, o servidor não grava (desfecho `teto`) e anota o dia; o painel avisa (`VIS-44`). Sob concorrência pode passar um pouco | É cerca de 100 vezes o volume esperado (~50 por dia). Segura o crescimento por ids forjados — mas ids forjados também podem **encher** o teto e parar a contagem real daquele dia, e o aviso é o que impede o número de mentir em silêncio | n |
| Definição de **Vendas** | Lista positiva: `payment_status = 'approved'` **e** `status <> 'cancelled'`, no dia de `paid_at` (`VIS-31`). É o mesmo critério de dinheiro da tela de Clientes (`CLI-04`, migration da `34`) | Pedido criado e não pago não é venda | n |
| Pedido marcado como pago à mão | **Não conta.** Mover para `paid` no painel grava só `status`, sem `paid_at` e sem `payment_status = 'approved'`. O painel já avisa que esse pagamento não veio do Mercado Pago | Contar exigiria uma segunda definição de "pago" | **n — confirmar com o usuário** |
| Pedido pago e depois cancelado ou estornado | **Sai do período em que foi pago**, e o número de um dia fechado muda (fixture em `VIS-31`) | Lista positiva. Um estorno não é venda | n |
| **Pedidos importados da Nuvemshop** | **Contam em Vendas.** No banco local, 40 dos 44 pedidos `approved` têm `nuvemshop_id`. Até o dia do DNS, se o importador rodar, o bloco pode mostrar vendas com Visitas em `—` (o texto de `VIS-39` diz por quê) | São vendas da loja, e a tela de Clientes os conta pelo mesmo critério (`CLI-04`). Filtrar daria duas respostas para "quanto vendi?" no mesmo painel | **n — confirmar com o usuário** |
| Pedidos de homologação e de preview | **Contam em Vendas**, porque escrevem no mesmo banco. Visitas excluem esse tráfego. A conversão que a dona calcula de cabeça sai um pouco inflada | Separar exigiria marcar a origem do pedido, que não existe hoje | n |
| Definição de **Faturamento** | Soma de `orders.total` (numeric, em reais, com frete) das vendas acima | Mesma base do painel | n |
| **Ticket médio sem venda** | **`—`**, com texto `sr-only` "sem vendas no período" (`VIS-07`). O rascunho dizia `R$ 0,00` | É o precedente da tela de Clientes (`avg_ticket` NULL e travessão, migration da `34`): ticket de R$ 0,00 afirma uma média que não existe | **n — confirmar com o usuário** |
| Arredondamento do ticket | `round(soma / vendas, 2)` **no banco**, metade para longe de zero (o `round(numeric)` do Postgres). A tela só formata com `formatPrice` | `formatPrice` formata e não arredonda | y (requisito) |
| Retenção | **8 dias** (hoje e os 7 anteriores). A limpeza roda **dentro da própria gravação** (`VIS-30`), dentro da leitura do painel e, **onde `pg_cron` já estiver instalado**, num job diário (a migration não cria a extensão) | O período mais antigo que o bloco lê começa no máximo 6 dias atrás. O job sozinho não basta: no hospedado não se sabe se a extensão existe, e o molde segue em silêncio quando ela falta. No banco local ela existe (`pg_cron 1.6.4`) | n |
| Início da contagem e última visita | Dois instantes gravados fora da tabela de visitas: `started_at` (gravado uma vez, nunca recalculado) e `last_recorded_at` (atualizado a cada linha nova), mais o dia do teto (`VIS-44`). São instantes **da loja**, sem ligação com id nenhum | `min(day)` de uma tabela que é podada avança sozinho. A última visita é o que distingue "zero visitas" de "contador quebrado" | y (requisito) |
| O que o banco guarda | Só `(visitor_id uuid, day date)`. Sem hora, IP, user agent, página, referrer nem `created_at` | Minimização. Um id persistente vindo junto de um IP é dado **pseudonimizado**, não anônimo (LGPD, art. 12). Por isso nenhum texto diz "anônimo" | y (requisito) |
| Logs de borda | Os logs da plataforma registram o IP de qualquer requisição, como já fazem com toda a API da loja. O **nosso** log não registra id, IP nem user agent (`VIS-29`). A política diz "não guardo o seu IP junto dessa contagem", e não "nunca registramos" | Declarar só o que a loja controla | y |
| Duas abas na primeira carga | Onde existe `navigator.locks`, a criação do id é feita sob trava e sai um id só. Onde não existe, duas abas abertas no mesmo instante podem gerar dois ids: inflação de 1 no primeiro dia, limite aceito (`VIS-20`) | O `localStorage` não tem leitura e escrita atômicas | n |
| Recusar e aceitar de novo | A recusa apaga o id e **mantém o marcador do dia**, então reaceitar no mesmo dia não conta de novo. No dia seguinte nasce um id novo, e o mesmo navegador **pode contar 2 em Esta semana**. Limite declarado | Guardar o id depois da recusa contradiria o que a recusa promete | n |
| Política de Privacidade | Um parágrafo novo na seção "Medição de audiência" (texto no **Apêndice A**) e a frase nova da categoria "Estatísticas" na folha. **A aprovação da Adri é pré-condição do deploy**, e um guarda impede o contador de existir sem o parágrafo (`VIS-37`) | Declarar o que a loja faz, e só isso (`POL-10`) | n — aguarda a Adri |
| Título do bloco | `h2` **"Movimento da loja"** | Leitor de tela precisa de um nome para a seção. O título da Nuvemshop não está registrado | n |
| Reuso do `StatCard` | Os cards do bloco usam `StatCard` com props **aditivas e opcionais** (carregando, ⓘ). Os outros três consumidores não mudam | Um segundo desenho de card seria o defeito 01 numa moldura | n (Design confirma) |
| Decisão de arquitetura | Vira `AD-055` no fecho do Design | A última é `AD-054` | — |

**Open questions:** cinco linhas pedem resposta do usuário antes de `tasks.md`: a remoção dos cards
antigos, o gráfico e o Fat. do Mês, o pedido marcado como pago à mão, o ticket sem venda e os pedidos
da Nuvemshop em Vendas. Uma pede
medição em aparelho (navegador interno do Instagram) e outra pede a Adri (texto da política). Todas
as demais estão resolvidas ou registradas acima.

---

## Críticas recusadas

| Crítica | Por que foi recusada |
| --- | --- |
| Trocar o id toda semana (privacidade, item 5) | Com retenção de 8 dias, o banco já não consegue ligar um id entre semanas: as linhas antigas somem. A rotação acrescentaria ao cliente uma segunda regra de relógio (a fronteira da semana), que é exatamente o que `VIS-16` evita |
| Guardar um agregado diário sem id para um gráfico futuro (privacidade, item 4) | O gráfico está fora de escopo. Criar agora uma tabela para uma tela que ninguém pediu é escopo antecipado. O custo (o gráfico começaria do zero) está declarado |
| Ligar o contador ao interruptor do GA4 (encaixe A2a, tela B5a) | Desligar o GA4 no painel zeraria as visitas, e o usuário escolheu um contador **independente** do GA4. A saída escolhida é a outra que os críticos ofereceram: a categoria "Estatísticas" sempre visível (`VIS-26`) |
| Marcador por `sessionStorage` em vez de `localStorage` (dados, alternativa do item 2) | Faria uma chamada a cada aba nova. O marcador com o instante de expiração devolvido pelo servidor (`VIS-16`) resolve a virada do dia sem relógio local decidindo o dia, e a idempotência do servidor cobre o erro de relógio |
| Interruptor em `store_settings` desligado por padrão, em vez da ordem de publicação (privacidade, alternativa do item 3) | Seria um terceiro estado a explicar ("contador desligado"), além de "parado por host" e "sem visitas". A ordem de publicação vira guarda de teste (`VIS-37`) |
| Separar visitas por papel (dona × cliente) | A loja não tem sessão administrativa. O P3 resolve sem tocar em autorização |

---

## User Stories

### P1: Ver o movimento do período ⭐ MVP

**User Story**: Como dona da loja, quero abrir o Dashboard e ver, em Hoje, Ontem e Esta semana,
quantas visitas únicas a loja teve, quantas vendas, quanto faturou e o ticket médio, para saber se
o movimento está bom.

**Why P1**: é o pedido.

**Acceptance Criteria**:

1. **VIS-01** WHEN a dona abre o Dashboard (`/admin`) THEN o painel SHALL mostrar, como **primeira
   seção depois do `PageHeader`**, um bloco com:
   - título `h2` "Movimento da loja";
   - as abas **Hoje**, **Ontem** e **Esta semana**, nessa ordem, com **Hoje** selecionada;
   - na aba aberta, quatro cards nesta ordem: **Visitas únicas**, **Vendas**, **Faturamento**,
     **Ticket médio**.
2. **VIS-02** WHEN a dona troca de aba THEN o painel SHALL:
   - mostrar os valores daquele período **sem nova chamada** à leitura (a contagem de chamadas da
     RPC continua em 1);
   - deixar `aria-selected="true"` em **exatamente uma** aba, vindo do componente de abas e nunca
     escrito à mão;
   - dar à `tablist` o nome `aria-label="Período"`;
   - mover a seleção entre as abas com as setas ←/→.
3. **VIS-03** WHEN um período é calculado THEN os limites SHALL ser intervalos **meio-abertos**,
   decididos no banco por `store_day` (`VIS-34`):
   - **Hoje** = [00:00 de hoje, agora];
   - **Ontem** = [00:00 de ontem, 00:00 de hoje);
   - **Esta semana** = [00:00 da segunda-feira da semana corrente, agora].

   Fixtures obrigatórias (instante UTC ⇒ dia de Brasília):
   - `2026-10-21T02:59:59.900Z` ⇒ **20/10**;
   - `2026-10-21T03:00:00Z` ⇒ **21/10**;
   - `2026-10-19T02:30:00Z` (domingo, 23h30 em Brasília) ⇒ **18/10**, na semana iniciada em 12/10,
     e **não** na de 19/10.
4. **VIS-04** WHEN o painel lê o bloco THEN SHALL chamar **uma** RPC (`VIS-33`) **sem** passar data
   nem `p_agora`, e os três períodos SHALL vir dessa resposta. O teste assere as chaves exatas do
   argumento da chamada.
5. **VIS-05** WHILE a leitura não terminou THEN cada um dos quatro cards SHALL mostrar um esqueleto
   e o bloco SHALL ter `aria-busy="true"`. Nenhum `0`, `R$ 0,00` ou `—` SHALL aparecer. O teste
   segura a resposta e confere a ausência dos três.
6. **VIS-06** WHEN a leitura falha THEN o bloco SHALL:
   - mostrar **uma** mensagem, "Não foi possível carregar os números do período.";
   - mostrar **um** botão "Tentar de novo", com alvo de 44px;
   - **não** desenhar nenhum dos quatro valores.

   WHEN a dona toca em "Tentar de novo" THEN a RPC SHALL ser chamada de novo.
7. **VIS-07** WHEN os valores chegam THEN SHALL ser escritos assim:
   - **Visitas únicas** e **Vendas**: inteiro com separador de milhar pt-BR (`1.234`);
   - **Faturamento**: `formatPrice` (`R$ 1.234,56`);
   - **Ticket médio**: `formatPrice` do valor **que o banco devolveu**.

   WHEN o período não tem venda THEN Vendas SHALL ser `0`, Faturamento `R$ 0,00`, e Ticket médio
   SHALL ser `—` com o texto `sr-only` "sem vendas no período". WHEN o contador está ativo e o
   período não tem visita THEN Visitas SHALL ser `0`. (Contador parado ou nunca usado: `VIS-39`.)
8. **VIS-08** WHEN a dona aciona o ⓘ de **Visitas únicas** THEN o painel SHALL:
   - usar um `<button>` com `aria-label="O que conta como visita única"` e `aria-expanded`, com alvo
     de 44px sem aumentar o desenho;
   - abrir um **Popover**, nunca um Tooltip (o Tooltip do Radix não abre por toque), por toque,
     clique, Enter ou Espaço;
   - fechar com Esc (o foco volta ao botão) e com toque fora;
   - mostrar **exatamente** o texto abaixo, que vive numa constante única do painel:

   > Cada navegador conta uma vez no período: uma vez por dia em Hoje e em Ontem, e uma vez na
   > semana em Esta semana. Celular e computador contam como dois. Abrir a loja pelo Instagram e
   > depois pelo navegador do celular também conta como dois, e cada janela anônima conta como um
   > navegador novo. Quem recusa as estatísticas no aviso de cookies não é contado. As suas próprias
   > visitas à loja também contam.

9. **VIS-09** WHEN uma aba está aberta THEN uma linha abaixo das abas SHALL dizer o período, montada
   **das datas que o banco devolveu** e **sem** passá-las por `new Date('AAAA-MM-DD')`:
   - Hoje ⇒ "Hoje, 21/10";
   - Ontem ⇒ "Ontem, 20/10";
   - Esta semana ⇒ "De 19/10 a 21/10";
   - numa segunda-feira ⇒ "Semana iniciada hoje, 19/10".

   Fixture: com o fuso do processo de teste em UTC e `hoje = '2026-10-21'`, a linha diz **21/10**,
   e não 20/10.
10. **VIS-10** WHEN acontece um destes eventos THEN o bloco SHALL ler de novo:
    - (a) o bloco monta;
    - (b) a janela volta a ter foco;
    - (c) `Date.now()` alcança o `expira_em` da última resposta;
    - (d) chega o aviso de tempo real de mudança em `orders` que o Dashboard já assina. Nenhuma
      inscrição nova é criada.

    Trocar de aba **nunca** dispara leitura. Abaixo do bloco SHALL aparecer "Atualizado às HHhMM"
    (ex.: "Atualizado às 15h32"), com a hora de Brasília da última leitura bem-sucedida. O prazo de
    (c) SHALL ser medido como **duração** do servidor (`expira_em − lido_em`, a partir da chegada da
    resposta, com piso de 1 s), nunca contra o relógio do navegador da dona. Fixture com relógio
    falso: no instante `expira_em` acontece uma nova chamada, e a linha passa de "Hoje, 21/10" a
    "Hoje, 22/10". Fixture com o relógio da dona adiantado 2 h: **uma** chamada na virada, nunca um
    laço. Uma releitura que falha com valores já na tela SHALL manter os valores (o "Atualizado às"
    continua com a hora da última leitura boa).
11. **VIS-11** WHEN o bloco é visto em 390×844 THEN:
    - os cards SHALL ficar em duas colunas;
    - com `R$ 99.999,99` e `9.999` visitas, nenhum valor SHALL quebrar linha nem passar da borda do
      card;
    - nenhum rótulo SHALL passar de duas linhas;
    - o `body` SHALL ter zero rolagem horizontal;
    - abas, ⓘ e "Tentar de novo" SHALL ter 44px de alvo.

    A prova é **em navegador**, em 390 e 1440. O jsdom só trava os proxies: `TabsList` com `h-auto`
    e gatilho com `min-h-11`, por token exato.

**Independent Test**: no banco local, gravar visitas e pedidos pagos em dias conhecidos e chamar a
RPC com `p_agora` fixo: cada período devolve os números da fixture. No painel, com a RPC dublada:
cada aba mostra os valores esperados, o esqueleto aparece enquanto a resposta é segurada, e o erro
mostra uma mensagem e um botão.

---

### P1: Contar cada navegador uma vez ⭐ MVP

**User Story**: Como dona da loja, quero que quem abre dez páginas, recarrega ou volta no mesmo dia
conte uma vez só, e que a semana conte cada navegador uma vez, para o número não me enganar.

**Why P1**: é a exigência central do pedido.

**Acceptance Criteria**:

1. **VIS-12** WHEN um navegador passa por todas as condições de `VIS-22` e não tem id THEN a loja
   SHALL criar um id com `crypto.randomUUID()` e gravá-lo na chave `estrelinha-visitor` como
   `{ v: 1, id, ate, em }`. Os campos `ate` e `em` começam nulos e vêm de `VIS-16`.
   - O id SHALL NOT derivar de nenhum dado pessoal nem do GA.
   - O id SHALL NOT ir em nenhuma outra requisição.
   - **Só o módulo do contador** SHALL citar a chave. Um guarda no molde de
     `orderAccessSingleOwner.test.ts`, varrendo `apps/**`, garante isso.
2. **VIS-13** WHEN a loja registra a visita THEN SHALL fazer um `POST` à function de visitas com:
   - corpo **exatamente** `{"id":"<uuid>"}` (o teste compara as chaves por igualdade, não por "contém
     `id`");
   - só a **chave publicável** nos cabeçalhos, nunca o JWT da sessão, mesmo com a cliente logada.
     Por isso não se usa `supabase.functions.invoke`.

   O teste, com sessão ativa, assere que `Authorization` não é o token da sessão.
3. **VIS-14** WHEN o servidor recebe um id válido THEN SHALL:
   - gravar `(id, store_day(now()))` com `on conflict do nothing`, de modo que N chamadas no mesmo
     dia, inclusive simultâneas, deixem **uma** linha e respondam todas `200`;
   - responder `{ "dia": "AAAA-MM-DD", "ate": <epoch em ms da próxima 00:00 de Brasília>, "agora":
     <epoch em ms do instante do servidor> }`, os dois números inteiros.

   O dia vem **sempre** do banco, e o cliente nunca envia data. Probe no banco local: duas chamadas
   simultâneas com o mesmo id deixam 1 linha.
4. **VIS-15** WHEN um período é contado THEN as visitas SHALL ser `count(distinct visitor_id)` no
   período, **nunca** a soma das contagens diárias. Fixtures obrigatórias:
   - id A em 19/10 (seg), 20/10 (ter) e 21/10 (qua), e id B só em 21/10. Com
     `p_agora = 2026-10-21T18:00:00Z`: **Hoje = 2, Ontem = 1, Esta semana = 2**, e não 4.
   - id C em 18/10 (dom) e 19/10 (seg). Com `p_agora = 2026-10-19T15:00:00Z`: **Hoje = 1, Ontem = 1,
     Esta semana = 1**. O domingo é da semana anterior.
5. **VIS-16** WHEN o servidor responde `200` ou `429` com `ate` e `agora` THEN a loja SHALL gravar
   no marcador o prazo **convertido para o relógio local por duração**, `ate = Date.now() + (ate do
   servidor − agora do servidor)`, e `em = Date.now()`. A loja SHALL NOT chamar de novo enquanto
   `em ≤ Date.now() < ate`, e SHALL chamar de novo quando `Date.now() ≥ ate` (virou o dia) ou
   `Date.now() < em` (o relógio voltou). Resposta sem `ate`/`agora` numéricos conta como falha
   (`VIS-18`). Fixture: aparelho adiantado 2 h e 5 navegações depois de um `200` ⇒ no máximo 1
   chamada.
   - O cliente **nunca** calcula o dia de Brasília.
   - O marcador é só uma otimização. Quem impede a duplicata é o servidor (`VIS-14`).
   - Relógio errado só custa uma chamada a mais ou um atraso, e isso fica declarado no código.
6. **VIS-17** WHEN a loja monta ou o `pathname` muda THEN SHALL conferir se precisa registrar
   (montagem no `App.tsx`, fora das `Routes` e só fora da prévia).
   - A chamada SHALL sair **fora do caminho crítico**: dentro de `requestIdleCallback`; onde ele não
     existir, `setTimeout(…, 0)` — direto quando `document.readyState === 'complete'` (a troca de
     rota acontece depois do `load`, e um ouvinte novo de `load` nunca dispararia), ou depois do
     evento `load` quando a página ainda carrega.
   - **Nenhum** `fetch` SHALL acontecer de forma síncrona na montagem.
   - A navegação e a pintura SHALL NOT esperar a chamada.

   O teste dubla o agendador e assere zero chamadas antes de ele disparar.
7. **VIS-18** WHEN a gravação falha THEN a loja SHALL seguir sem nenhum erro visível e sem gravar o
   marcador:
   - com `400`, `5xx` ou falha de rede, **a mesma aba** SHALL tentar **no máximo mais uma vez**, na
     próxima navegação;
   - com `429`, vale `VIS-16`: grava o marcador e não tenta mais naquele dia.
8. **VIS-19** WHEN o `localStorage` lança na leitura ou na escrita, ou quando `crypto.randomUUID`
   não existe, THEN a loja SHALL NOT registrar visita e SHALL NOT manter id em memória.
9. **VIS-20** WHEN `navigator.locks` existe THEN a criação do id SHALL acontecer dentro de
   `navigator.locks.request('estrelinha-visitor', …)`, **relendo a chave dentro da trava** antes de
   criar. Assim, duas abas abertas juntas produzem um id só. WHEN `navigator.locks` não existe THEN
   a loja cria o id sem trava, e o limite de `Assumptions` vale. O teste dubla a trava e assere a
   releitura dentro dela.
10. **VIS-21** WHEN o servidor recebe um destes corpos THEN SHALL responder `400` e **nada** SHALL
    ser gravado:
    - JSON inválido;
    - `id` que não é UUID v4 (comparação sem diferenciar maiúsculas);
    - **qualquer chave além de `id`**.

    O teste usa um corpo hostil por caso, no molde de `melhor-envio`.

**Independent Test**: no banco local, chamar a RPC de gravação com o mesmo id N vezes no mesmo dia e
em dias diferentes (`p_agora` injetado), e conferir 1 linha por dia e a contagem distinta de cada
período. Na loja, com o `fetch` dublado: navegar 5 rotas gera 1 chamada, e o mesmo teste com o
relógio passando de `ate` gera a segunda.

---

### P1: Não contar o que não é visita, e respeitar a recusa ⭐ MVP

**User Story**: Como dona, quero que robôs, a prévia do painel, o tráfego de fora do endereço da
loja e quem recusou as estatísticas fiquem de fora. Como cliente, quero que recusar desligue a
contagem e apague o código do meu navegador.

**Why P1**: sem isso o número é enganoso desde o primeiro dia, e a recusa vira promessa vazia.

**Acceptance Criteria**:

1. **VIS-22** WHEN alguma destas condições vale THEN a loja SHALL NOT chamar o servidor e SHALL NOT
   gravar o marcador:
   - o build não é de produção (`import.meta.env.PROD`, pela mesma fonte que a medição do GA4 usa);
   - é janela de prévia (`isPreviewWindow`, a mesma fonte do GA4);
   - a leitura de `store_settings` ainda não terminou (a loja **espera**). Uma leitura que falhou
     cai nos defaults do hook compartilhado e é indistinguível de sucesso; aí a loja decide com eles,
     e **o servidor** é quem decide pelo host gravado no banco (`VIS-23`). O pior caso é uma chamada a
     mais por dia, respondida `interno`;
   - `trafficType(location.hostname, production_host) === 'internal'`;
   - a cliente recusou as estatísticas (`VIS-25`);
   - existe a marca de `VIS-42`;
   - `navigator.webdriver === true`;
   - o user agent está na lista de robôs (`VIS-23`).

   A decisão SHALL NOT ler `analytics.enabled`, `measurement_id` nem `canMeasure()`. Fixture
   obrigatória: `enabled = false` e `measurement_id = ''`, com tudo o mais liberado, ⇒ **a chamada
   acontece**. E o par: `production_host = 'umaestrelinha.com.br'` em `localhost` ⇒ **nenhuma**
   chamada.
2. **VIS-23** WHEN o servidor recebe a requisição THEN, antes de gravar, SHALL:
   - responder `200` com desfecho `robô`, sem gravar, quando o user agent casa a lista de robôs;
   - responder `200` com desfecho `interno`, sem gravar, quando não há cabeçalho `Origin` ou quando
     `trafficType(hostDoOrigin, production_host) === 'internal'`. O `production_host` é lido de
     `store_settings.analytics` pela própria function.

   A lista de robôs SHALL ter **um** dono em `packages/core`, num arquivo sem import nenhum (porque
   o Deno o alcança por caminho com `.ts`), e SHALL conter por extenso, cada uma com fixture:
   `Googlebot`, `Storebot-Google`, `Google-InspectionTool`, `AdsBot-Google`,
   `Mediapartners-Google`, `Chrome-Lighthouse`, `HeadlessChrome`, `Google Page Speed`, `bingbot`,
   `Applebot`, `facebookexternalhit`, `meta-externalagent`, `GPTBot`, `ClaudeBot`, `PetalBot`,
   `AhrefsBot`, `SemrushBot`, `YandexBot`, `DuckDuckBot`, `Baiduspider`.

   Sensores inversos: Safari de iPhone, Chrome de Android, o navegador interno do Instagram, o do
   WhatsApp e um aparelho **Cubot** (`CUBOT_X30`) SHALL NOT ser classificados como robô. A âncora de
   contagem da lista é **20**.
3. **VIS-24** WHEN a cliente salva a recusa ("Salvar escolhas" com Estatísticas desligada) THEN, na
   **mesma ação** (`save(false)`, ao lado de `clearGaCookies`):
   - o `id` da chave `estrelinha-visitor` SHALL ser apagado, mantendo só `ate` e `em`, de modo que
     reaceitar no mesmo dia não conte de novo;
   - nenhuma chamada SHALL acontecer depois disso.

   `save(false)` chama o apagamento **direto**: `entities` importar de `shared` é o sentido
   permitido, como já faz com `clearGaCookies`. O teste usa o store real, sem dublê, e a prova de
   "nenhuma chamada depois" monta o contador com esse store. Uma resposta que chega **depois** da
   recusa SHALL NOT trazer o id de volta.
4. **VIS-25** WHEN a recusa é feita em **outra aba** THEN a decisão de chamar SHALL refletir essa
   recusa antes da próxima chamada: a decisão relê a escolha do armazenamento no instante da
   chamada (um mecanismo só). A releitura SHALL aplicar **só** um registro válido; armazenamento
   ausente ou que lança SHALL manter a escolha em memória — senão uma recusa feita numa aba privada
   que não grava voltaria a "aceito". Fixtures: a aba A está aberta com `statistics: true` em
   memória, a aba B grava a recusa, e a virada do dia na aba A ⇒ **nenhuma** chamada; gravação que
   lança + recusa + navegar ⇒ a recusa continua valendo.
5. **VIS-26** WHEN a folha "Preferências de cookies" abre THEN a categoria **Estatísticas** SHALL
   aparecer **independentemente de `analytics.enabled`**, e "Salvar escolhas" SHALL gravar a escolha
   do interruptor.
   - É **mudança declarada de `AVS-02`** (feature `61`). O caso "medição DESLIGADA ⇒ a folha não
     mostra Estatísticas" de `CookieNotice.test.tsx` SHALL ser **invertido**, nunca apagado, e
     ganhar ao lado a asserção de que a escolha é gravada com a medição desligada.
   - O texto da categoria passa a ser o do Apêndice A, **sem** "anônima".
6. **VIS-27** WHEN um IP passa de **30 gravações por minuto** (por isolate) THEN o servidor SHALL
   responder `429` com `{ dia, ate, agora }`, sem gravar. WHEN a requisição não traz IP THEN ela
   SHALL ser **liberada** (a forma de `clientIp` na `checkout`): um balde único deixaria 30 visitantes
   sem cabeçalho esgotarem o teto da loja inteira. Se o relógio do banco não puder ser lido nesse
   caminho, o `429` sai sem relógio e o desfecho continua `limite`.
   - `createRateLimiter` e `clientIp` SHALL mudar para `supabase/functions/_shared/`, e a `checkout`
     SHALL **reexportar** os dois. O teste usa `toBe`, nunca `toEqual`.

   WHEN o dia de Brasília já tem **5.000** linhas THEN o servidor SHALL responder `200` com desfecho
   `teto`, sem gravar. O limitador é injetado e testado por unidade.
7. **VIS-28** WHEN a tabela de visitas é acessada direto pelo PostgREST como `anon` ou
   `authenticated` THEN o acesso SHALL falhar com `42501`. As condições:
   - a tabela tem RLS ligada, `revoke all` de `public`, `anon` e `authenticated`, e nenhuma policy;
   - só `service_role` executa a RPC de gravação;
   - as colunas são **exatamente** `visitor_id uuid` e `day date`, com chave primária nas duas.

   Um guarda de migration, no molde de `minhaContaSchema.test.ts` (uma régua por comando,
   `mutar()` que lança), recusa coluna extra, `grant` a `anon` e escrita de dado. Probe no banco
   local: `anon` e um `authenticated` não-admin são recusados.
8. **VIS-29** WHEN a function responde a qualquer requisição que não seja o preflight `OPTIONS`
   THEN SHALL registrar **uma** linha de log com o desfecho, que é um destes: `gravada`, `repetida`,
   `robô`, `interno`, `inválido`, `limite`, `teto`, `erro`. Método que não é `POST` ⇒ `405`,
   `inválido`.
   - A linha SHALL NOT conter id, IP nem user agent.
   - O handler SHALL NOT ler `Authorization`.
   - A lógica mora em `handlers.ts` com dependências injetadas (`AD-004`), o CORS vem de
     `_shared/http.ts`, e há `verify_jwt = false` no `config.toml` com a justificativa escrita.
9. **VIS-30** WHEN a RPC de gravação roda THEN, na mesma transação, SHALL apagar as linhas com
   `day < store_day(p_agora) − 7`. Probe no banco local: depois de uma gravação com `p_agora`
   injetado, não sobra linha com mais de 7 dias, e as dos últimos 8 dias continuam lá.

**Independent Test**: cada recusa acima tem um caso que prova **zero** linhas gravadas e, no cliente,
zero chamadas e marcador intacto. Para a prova local, semear **no banco local**
`store_settings.analytics.production_host = 'localhost'` (por psql na 54442) ou chamar a function
direto com o cabeçalho `Origin` correspondente.

---

### P1: Vendas, faturamento e ticket na mesma régua de dia ⭐ MVP

**User Story**: Como dona, quero que Vendas, Faturamento e Ticket médio usem o mesmo dia de Brasília
das visitas e contem só pedido pago, para o bloco não me dizer que vendi o que ainda não recebi.

**Why P1**: os quatro cards são o pedido, e um card de vendas que conta pedido não pago repete o
defeito que motivou a feature.

**Acceptance Criteria**:

1. **VIS-31** WHEN um período é lido THEN **Vendas** SHALL contar os pedidos com
   `payment_status = 'approved'`, `status <> 'cancelled'` e `store_day(paid_at)` dentro do período.
   Fixtures obrigatórias:
   - (a) criado às 23h50 de 20/10 e pago às 00h10 de 21/10 (Brasília) ⇒ conta em **Hoje (21/10)**,
     não em Ontem;
   - (b) criado e não pago ⇒ **não** conta;
   - (c) pago em 20/10 e cancelado em 21/10 ⇒ **sai** de Ontem;
   - (d) `payment_status = 'refunded'` ⇒ **não** conta;
   - (e) `status = 'paid'` marcado à mão, com `payment_status = 'pending'` e `paid_at` nulo ⇒
     **não** conta;
   - (f) `paid_at = 2026-10-21T02:59:59.900Z` ⇒ **Ontem (20/10)**.
2. **VIS-32** WHEN há vendas THEN **Faturamento** SHALL ser a soma de `orders.total` em `numeric` e
   **Ticket médio** SHALL ser `round(faturamento / vendas, 2)`, as duas contas feitas **no banco**.
   Fixtures:
   - 3 vendas que somam R$ 100,00 ⇒ **33,33**;
   - R$ 10,00 e R$ 10,01 ⇒ **10,01**;
   - 0 vendas ⇒ **NULL**, que a tela desenha conforme `VIS-07`.
3. **VIS-33** WHEN o painel chama a RPC de leitura THEN ela SHALL devolver **só escalares**, nunca
   id:
   - para cada período: `visitas`, `vendas`, `faturamento` e `ticket`;
   - `hoje`, `ontem` e `inicio_semana` como texto `AAAA-MM-DD`;
   - `expira_em` (o instante da próxima 00:00 de Brasília) e `lido_em` (o instante desta leitura);
   - `production_host` (o mesmo valor que a function de gravação usa, `''` quando vazio);
   - `contagem_desde` e `ultima_visita` (instantes ou NULL), com `contagem_desde_dia` e
     `ultima_visita_dia` (o dia de Brasília de cada um, decidido no banco);
   - `teto_dia` (`VIS-44`).

   Faturamento sem venda SHALL ser `0`, nunca `NULL`.

   A RPC SHALL:
   - ser `security definer`, com `search_path = ''` e `has_role(auth.uid(), 'admin')` **dentro**
     dela;
   - receber `p_agora timestamptz default now()`;
   - ter `execute` concedido só a `authenticated`.

   Um `authenticated` não-admin SHALL receber `42501`, e `anon` SHALL ser recusado. Fixture: mais
   de **1.000** visitas e mais de **1.000** pedidos pagos na semana ⇒ contagens exatas, porque a
   agregação é no banco e nenhuma linha atravessa a rede.
4. **VIS-34** WHEN uma migration desta feature decide um dia THEN SHALL usar **uma** régua:
   `store_day(timestamptz) returns date` e a inversa `store_day_start(date) returns timestamptz`, as
   duas lendo o fuso de `store_time_zone()`, chamadas pela gravação, pela leitura e pelo predicado
   de venda. O guarda da migration SHALL recusar:
   - `'America/Sao_Paulo'` fora da definição de `store_time_zone`, ou mais de uma vez;
   - `current_date`;
   - `now()::date`;
   - `date_trunc('week'` aplicado a `timestamptz` (a semana é truncada sobre a **data local**);
   - offset fixo `-03`.

   O fuso é **cópia deliberada** entre SQL e TypeScript. O guarda lê o literal da migration e o
   compara com o dono em `packages/core`. Hoje são **cinco** declarações em TypeScript:
   `core/orders/situation.ts`, o `copy.ts` e o `AnalyticsSecretField.tsx` do GA no painel, o
   `orderMeta.ts` da loja e o `parse.ts` do importador. As quatro de `apps/` e `packages/` SHALL
   passar a importar o dono, e o guarda SHALL recusar o literal fora dele, sem allowlist. A do
   importador fica fora do escopo do guarda, declarada.
5. **VIS-35** *(confirmado pelo usuário em 2026-10-22: "pode seguir o padrão")* WHEN o
   Dashboard abre THEN:
   - os cards **Pedidos Hoje** e **Fat. Hoje** SHALL NOT existir;
   - os quatro restantes (**Fat. do Mês**, **Produtos Ativos**, **Clientes Novos**, **Pendentes**)
     SHALL ficar numa grade `grid-cols-2 lg:grid-cols-4`, conferida por token exato;
   - `useAdminStats` SHALL deixar de calcular `ordersToday` e `revenueToday`, sem campo morto.

**Independent Test**: no banco local, as fixturas de `VIS-31` e `VIS-32` com `p_agora` injetado
devolvem os números exatos. No painel, o Dashboard renderizado não contém "Pedidos Hoje" nem "Fat.
Hoje".

---

### P1: A política diz o que o contador faz ⭐ MVP

**User Story**: Como cliente, quero que a Política de Privacidade diga que a loja guarda um código
no meu navegador e por quanto tempo, e como recusar.

**Why P1**: o contador começa a contar no primeiro acesso depois do deploy. Sem o texto, a loja
trataria um identificador persistente sem declará-lo.

**Acceptance Criteria**:

1. **VIS-36** WHEN a página `/politica-de-privacidade` renderiza THEN a seção "Medição de audiência"
   SHALL ter **quatro** parágrafos: os três atuais, sem mudança, e o parágrafo do **Apêndice A**,
   palavra por palavra.
   - O guarda de `PrivacyPolicyPage.test.tsx` passa de três para quatro parágrafos e assere o
     **literal** do novo.
   - A asserção dos três antigos continua ao lado.
2. **VIS-37** WHEN o módulo do contador existe na loja THEN o parágrafo do Apêndice A SHALL existir
   na `PrivacyPolicyPage`. Um guarda lê os dois arquivos do disco e reprova o contador sem o
   parágrafo. A aprovação do texto pela Adri é pré-condição do deploy e fica registrada no handoff.

**Independent Test**: apagar o parágrafo da política reprova o guarda de `VIS-37`. Trocar uma
palavra reprova o de `VIS-36`.

---

### P2: Não afirmar uma cobertura que o contador não tem

**User Story**: Como dona, quero saber desde quando o contador conta, se ele está parado e quando
foi a última visita registrada, para não concluir "a semana foi ruim" por causa do dia do deploy ou
de uma configuração errada.

**Why P2**: o bloco funciona sem isso, mas fica enganoso na primeira semana e mudo quando quebra.

**Acceptance Criteria**:

1. **VIS-38** WHEN o início do período aberto é anterior a `contagem_desde` THEN o card de Visitas
   únicas SHALL ter o subtítulo "Contando desde DD/MM às HHhMM", com o horário de Brasília. Fixture
   com `contagem_desde = 2026-10-21T18:32:00Z` (15h32 em Brasília) e `p_agora = 2026-10-22T13:00:00Z`:
   - **Ontem** e **Esta semana** mostram "Contando desde 21/10 às 15h32";
   - **Hoje** (que começa em 22/10 00:00) **não** mostra.
2. **VIS-39** WHEN `contagem_desde` é NULL (nenhuma visita registrada ainda) THEN o valor de Visitas
   únicas SHALL ser `—`, **nunca** `0`, com um destes textos:
   - com `production_host` preenchido: "Nenhuma visita registrada ainda. O contador só conta na loja
     em {production_host}.";
   - com `production_host` vazio: "O contador está parado: falta configurar o endereço de produção
     da loja."
3. **VIS-40** WHEN `ultima_visita` não é NULL THEN abaixo do bloco SHALL aparecer "Última visita
   registrada:" seguido de uma destas formas:
   - "hoje às HHhMM";
   - "ontem às HHhMM";
   - "em DD/MM às HHhMM".

   O horário é de Brasília, e "hoje" e "ontem" se comparam com o `hoje` **devolvido pelo banco**,
   nunca com o relógio do navegador.
4. **VIS-41** WHEN o bloco renderiza THEN nenhum texto dele SHALL chamar o número de "pessoas" nem
   de "usuários". O rótulo é **Visitas únicas**. O teste varre os literais do bloco.
5. **VIS-44** WHEN o teto diário de `VIS-27` foi atingido num dia que está dentro do período aberto
   THEN abaixo do bloco SHALL aparecer "Em DD/MM o limite de 5.000 visitas por dia foi atingido, e
   a contagem desse dia parou ali." O dia vem do banco (`teto_dia`, `VIS-33`). Fixture no banco
   local (em transação desfeita): 5.000 linhas num dia e uma chamada nova ⇒ desfecho `teto` e o dia
   anotado; a linha aparece em Hoje e em Esta semana e some em Ontem.

**Independent Test**: com a RPC dublada devolvendo `contagem_desde` nulo e depois preenchido, os
textos de `VIS-38` e `VIS-39` aparecem e somem exatamente nos períodos da fixture.

---

### P3: Não contar o meu navegador

**User Story**: Como dona, quero um jeito de a loja não contar as minhas visitas, para a minha
navegação não inflar um número de cerca de 50 por dia.

**Why P3**: ajuda, mas o ⓘ já avisa que as visitas dela contam (`VIS-08`), e a ausência não esconde
nenhum erro.

**Acceptance Criteria**:

1. **VIS-42** WHEN qualquer rota da loja abre com `?nao-contar=1` THEN a loja SHALL:
   - gravar `estrelinha-nao-contar` = `'1'`;
   - apagar o `id` de `estrelinha-visitor`, mantendo `ate` e `em`;
   - tirar o parâmetro da URL por uma navegação `replace` do router (sem entrada nova no histórico,
     e com o router sabendo da troca), preservando os outros;
   - mostrar o aviso "Este navegador não é mais contado nas visitas da loja."

   WHEN a rota abre com `?nao-contar=0` THEN a loja SHALL apagar a marca, tirar o parâmetro e
   mostrar "Este navegador voltou a ser contado nas visitas da loja." Com a marca presente, vale
   `VIS-22`: nenhuma chamada. Risco declarado: um link com `?nao-contar=1` repassado a uma cliente a
   tira da contagem. Tirar o parâmetro da URL impede que ela repasse o link adiante. O nome do
   parâmetro e o construtor do link SHALL ter **um** dono em `packages/core`, lido pela loja e pelo
   painel.
2. **VIS-43** WHEN a dona abre o menu da conta no painel THEN, ao lado de "Abrir a loja", SHALL
   haver **"Abrir a loja sem contar"**, que abre `storeOrigin()` + `/?nao-contar=1` em nova aba. O
   item some sem `VITE_STORE_URL`, igual a "Abrir a loja".

**Independent Test**: abrir a loja com `?nao-contar=1` deixa a URL sem o parâmetro, mostra o aviso
e, em seguida, nenhuma navegação chama o servidor.

---

## Edge Cases

- WHEN duas chamadas com o mesmo id chegam ao mesmo tempo THEN SHALL existir **uma** linha e as duas
  respostas SHALL ser `200` (`VIS-14`).
- WHEN a aba fica aberta da noite para a manhã THEN a primeira navegação depois de `ate` SHALL
  registrar a visita do dia novo (`VIS-16`), e o Dashboard aberto SHALL trocar "Hoje, 21/10" por
  "Hoje, 22/10" no instante `expira_em` (`VIS-10`).
- WHEN o relógio do aparelho volta no tempo THEN a loja SHALL chamar de novo, e o servidor
  deduplica (`VIS-16`).
- WHEN `production_host` está vazio THEN tudo é interno (`trafficType`): nada é gravado, e o painel
  diz que o contador está parado (`VIS-39`).
- WHEN a loja ainda roda no `.vercel.app` com `production_host = 'umaestrelinha.com.br'` THEN nada é
  gravado, e o painel diz em que endereço o contador conta (`VIS-39`). É o estado esperado até o dia
  do DNS, não um defeito.
- WHEN a leitura de `store_settings` falha na loja THEN o contador decide com o `DEFAULT_ANALYTICS`
  de recuo, e o servidor responde `interno` se o host gravado no banco não casar (`VIS-22`, `VIS-23`).
- WHEN ids forjados enchem o teto do dia THEN a contagem real daquele dia para, e o painel diz isso
  (`VIS-44`).
- WHEN uma venda foi paga ontem e cancelada hoje THEN Ontem SHALL diminuir (`VIS-31` c).
- WHEN o período tem venda e zero visita THEN os dois números SHALL aparecer como vierem. Isso é
  sinal de falha do contador, não prova: quem compra pode ter recusado as estatísticas. A última
  visita (`VIS-40`) é o que a dona confere.
- WHEN a cliente recusa e aceita de novo no mesmo dia THEN SHALL NOT contar de novo naquele dia
  (`VIS-24`). Em Esta semana pode contar 2 a partir do dia seguinte, limite declarado.
- WHEN o mesmo id chega depois de 8 dias sem visita THEN conta como novo para o banco, o que é
  irrelevante, porque nenhum período tem mais de 7 dias.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| VIS-01 | P1: Ver o movimento do período | Execute | Verified (r3) |
| VIS-02 | P1: Ver o movimento do período | Execute | Verified (r3) |
| VIS-03 | P1: Ver o movimento do período | Execute | Verified (r3) |
| VIS-04 | P1: Ver o movimento do período | Execute | Verified (r3) |
| VIS-05 | P1: Ver o movimento do período | Execute | Verified (r3) |
| VIS-06 | P1: Ver o movimento do período | Execute | Verified (r3) |
| VIS-07 | P1: Ver o movimento do período | Execute | Verified (r3) |
| VIS-08 | P1: Ver o movimento do período | Execute | Verified (r3) |
| VIS-09 | P1: Ver o movimento do período | Execute | Verified (r3) |
| VIS-10 | P1: Ver o movimento do período | Execute | Verified (r3) |
| VIS-11 | P1: Ver o movimento do período | Execute | Verified (r3) |
| VIS-12 | P1: Contar cada navegador uma vez | Execute | Verified (r3) |
| VIS-13 | P1: Contar cada navegador uma vez | Execute | Verified (r3) |
| VIS-14 | P1: Contar cada navegador uma vez | Execute | Verified (r3) |
| VIS-15 | P1: Contar cada navegador uma vez | Execute | Verified (r3) |
| VIS-16 | P1: Contar cada navegador uma vez | Execute | Needs fix — **G9** da r3 (o `ate` que `store_clock` devolve nas respostas `robô`, `interno` e `limite` sem prova no produtor; nenhum defeito medido) |
| VIS-17 | P1: Contar cada navegador uma vez | Execute | Verified (r3) |
| VIS-18 | P1: Contar cada navegador uma vez | Execute | Verified (r3) |
| VIS-19 | P1: Contar cada navegador uma vez | Execute | Verified (r3) |
| VIS-20 | P1: Contar cada navegador uma vez | Execute | Verified (r3) |
| VIS-21 | P1: Contar cada navegador uma vez | Execute | Verified (r3) |
| VIS-22 | P1: Não contar o que não é visita | Execute | Verified (r3) |
| VIS-23 | P1: Não contar o que não é visita | Execute | Verified (r3) |
| VIS-24 | P1: Não contar o que não é visita | Execute | Verified (r3) |
| VIS-25 | P1: Não contar o que não é visita | Execute | Verified (r3) |
| VIS-26 | P1: Não contar o que não é visita | Execute | Verified (r3) |
| VIS-27 | P1: Não contar o que não é visita | Execute | Needs fix — **G9** da r3 (o `ate` que `store_clock` devolve nas respostas `robô`, `interno` e `limite` sem prova no produtor; nenhum defeito medido) |
| VIS-28 | P1: Não contar o que não é visita | Execute | Verified (r3) |
| VIS-29 | P1: Não contar o que não é visita | Execute | Verified (r3) |
| VIS-30 | P1: Não contar o que não é visita | Execute | Verified (r3) |
| VIS-31 | P1: Vendas na mesma régua | Execute | Verified (r3) |
| VIS-32 | P1: Vendas na mesma régua | Execute | Verified (r3) |
| VIS-33 | P1: Vendas na mesma régua | Execute | Verified (r3) |
| VIS-34 | P1: Vendas na mesma régua | Execute | Verified (r3) |
| VIS-35 | P1: Vendas na mesma régua *(assunção pendente)* | Execute | Verified (r3) — confirmado pelo usuário em 2026-10-22 |
| VIS-36 | P1: A política diz o que o contador faz | Execute | Verified (r3) |
| VIS-37 | P1: A política diz o que o contador faz | Execute | Verified (r3) |
| VIS-38 | P2: Não afirmar cobertura | Execute | Verified (r3) |
| VIS-39 | P2: Não afirmar cobertura | Execute | Verified (r3) |
| VIS-40 | P2: Não afirmar cobertura | Execute | Verified (r3) |
| VIS-41 | P2: Não afirmar cobertura | Execute | Verified (r3) |
| VIS-44 | P2: Não afirmar cobertura | Execute | Verified (r3) |
| VIS-42 | P3: Não contar o meu navegador | Execute | Verified (r3) |
| VIS-43 | P3: Não contar o meu navegador | Execute | Verified (r3) |

**Coverage:** 44 total, 44 mapped to tasks (ver `tasks.md`, *Requirement Traceability*), 0 unmapped. Status atualizado em 2026-10-22, no fecho, com a rodada 3 da verificação (`validation.md`): 42 de 44 provadas no valor da spec; `VIS-16` e `VIS-27` com a lacuna de cobertura G9 aberta.

---

## Implicit-Requirement Dimensions

| Dimension | Resolution |
| --- | --- |
| Input validation & bounds | `VIS-21` (UUID v4, corpo com só `id`), `VIS-23` (robô, `Origin`), `VIS-27` (tetos) |
| Failure / partial-failure states | `VIS-05` (carregando), `VIS-06` (erro da leitura), `VIS-18` (falha da gravação), `VIS-19` (sem armazenamento), `VIS-22` (configuração não lida ou falha) |
| Idempotency / retry / duplicate handling | `VIS-14` (uma linha por id e dia), `VIS-15` (distinto por período), `VIS-16` (marcador como otimização), `VIS-18` (no máximo mais uma tentativa por aba) |
| Auth boundaries & rate limits | `VIS-13` (nunca o JWT da sessão), `VIS-27` (cortesia por IP e teto diário), `VIS-28` (tabela fechada), `VIS-33` (leitura só por admin, dentro da RPC) |
| Concurrency / ordering | `VIS-14` (chamadas simultâneas), `VIS-20` (duas abas), `VIS-25` (recusa em outra aba), `VIS-34` (uma fronteira de dia) |
| Data lifecycle / expiry | `VIS-30` (8 dias, dentro da gravação), `VIS-24` (recusa apaga o id), `started_at` gravado uma vez (`VIS-38`) |
| Observability | `VIS-29` (desfecho no log, sem id, IP nem user agent), `VIS-40` (última visita à vista da dona), `VIS-44` (teto atingido à vista da dona) |
| External-dependency failure | N/A because o contador não depende de serviço externo, só do banco e de uma function da própria loja. A falha delas está em `VIS-06` e `VIS-18` |
| State-transition integrity | N/A because não há máquina de estados: a linha `(id, dia)` é inserida, nunca alterada, e apagada só pela retenção |

---

## Success Criteria

- [ ] A fixture `seg/ter/qua` dá Hoje 2, Ontem 1, Esta semana **2**, no teste e no banco local
      (`VIS-15`).
- [ ] As fixtures de fronteira (`02:59:59.900Z` e `03:00:00Z`, domingo 23h30, PIX das 23h50 pago às
      00h10) caem no dia certo pela **mesma** função `store_day`, na gravação e na leitura.
- [ ] Zero linhas gravadas por: robô, prévia, host de homologação, recusa de estatísticas, marca de
      não contar, id inválido, corpo com chave extra, navegador sem armazenamento, `webdriver`.
- [ ] Com o GA4 desligado no painel, o contador conta **e** a cliente consegue recusá-lo pela folha.
- [ ] Dentro do bloco, uma régua de dia e uma definição de venda. Fora dele, cada divergência que
      resta no Dashboard (gráfico, Fat. do Mês, Pendentes) tem nome e número no backlog.
- [ ] 390×844 e 1440, em navegador: sem rolagem horizontal, abas, ⓘ e "Tentar de novo" com 44px, e
      `R$ 99.999,99` cabendo no card.
- [ ] As chaves `estrelinha-visitor` e `estrelinha-nao-contar` entram na lista "Chaves em uso hoje"
      do `CLAUDE.md` raiz, e a feature `71` entra no parágrafo de numeração.
- [ ] Gate "sem regressão" em lint, tipos e testes dos cinco workspaces, **incluindo a suíte da
      loja**, cujos guardas varrem os dois apps. `packages/core/src/payment/**` sem uma linha
      alterada.

---

## Apêndice A — textos para a aprovação da Adri

**Parágrafo novo da seção "Medição de audiência"** (quarto parágrafo, depois do que fala em
"Estatísticas"):

> Além disso, conto quantas visitas a loja recebe a cada dia. Para isso, o seu navegador guarda um
> código aleatório, que não identifica você pelo nome e não tem relação com os seus pedidos. Em cada
> dia em que você visita a loja, o meu servidor registra esse código e a data — e nada mais: não
> guardo o seu IP junto dessa contagem, nem as páginas que você viu. Esses registros são apagados
> depois de 8 dias e não são compartilhados com ninguém, nem com o Google. Desligar “Estatísticas”
> também desliga essa contagem e apaga o código do seu navegador; limpar os dados do site no
> navegador tem o mesmo efeito.

**Frase nova da categoria "Estatísticas"** na folha de preferências (no lugar de "Ajudam a entender
como a loja é visitada, de forma anônima, para melhorá-la."):

> Ajudam a entender como a loja é visitada, para melhorá-la, sem identificar você pelo nome.
