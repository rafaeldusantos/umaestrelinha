## 01 · [supabase · packages/core · packages/supabase · apps/backoffice] Campanhas no painel — lista, nova, editar

**Status:** done

`UC-01 · UC-02` — 102

**Objetivo.** A dona cadastra, edita, encerra e apaga campanhas em `/admin/campanhas`, e o banco e `core` passam a ter o contrato da campanha que todas as outras tarefas consomem.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines · CI e deploy · Feature-Sliced Design / Alias de import; `packages/core/CLAUDE.md` › Quando um código pertence a este pacote · Pureza · Os módulos · Dinheiro; `supabase/CLAUDE.md` › Migrations · RLS — o molde que os guardas cobram; `apps/backoffice/CLAUDE.md` › A sidebar · Molde dos formulários · Descontos. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (Painel · Campanhas · lista; Painel · Campanha · nova / editar); §4 · spec.md — Código; §7 · spec.md — Decisões.

**Habilita.** Todas as tarefas: as tabelas, `packages/core/src/campaigns/` (vigência, preço de campanha, estados, recusas, conversão do fim, tetos, cores padrão, texto da vitrine), os tipos em `packages/supabase`, e `apps/backoffice/src/entities/campaign/` com a leitura das campanhas e a **porta única de escrita das marcações** (uma peça ou várias, e "tirar"), usada pelas tarefas 02 e 03.

### Critérios de aceite

### UC-01 · Cadastrar a campanha
- Novo item **Campanhas** no grupo **Descontos** do menu do painel, ao lado de Cupons e Promoções.
- A lista mostra cada campanha com nome, vigência, percentuais, quantas peças estão marcadas e o estado (Agendada,
  Em vigência, Encerrada, Desligada).
- **Nova campanha**: nome (até 40 caracteres), texto do selo (até 14 caracteres, preenchido com o nome quando cabe —
  ver RN-11), as **duas cores do selo** (RN-12; nasce com o preto e ouro do protótipo), início e fim (data e hora,
  Brasília), percentuais (até 5 valores inteiros entre 1 e 70, sem repetir) e o interruptor "Campanha ligada".
- A tela mostra a **prévia do selo** num cartão de 173 px, com o texto, as cores e o maior percentual, enquanto a
  dona digita.
- Recusas com o motivo, antes de gravar: fim antes do início; nenhum percentual; percentual fora da faixa ou
  repetido; vigência que se sobrepõe à de outra campanha ligada (RN-02); par de cores sem contraste (RN-12).

### UC-02 · Editar e encerrar
- Nome, texto do selo e fim podem mudar a qualquer momento; mudar vale na próxima página que a cliente abrir.
- **Tirar um percentual em uso é recusado**, com a contagem ("12 peças usam 15%. Mude essas peças antes de tirar o
  percentual."). Acrescentar percentual é livre.
- "Encerrar agora" põe o fim no instante atual. A campanha não é apagada se algum pedido a usou (RN-09); sem pedido,
  pode ser apagada, e as marcações saem junto.

- **RN-01 · A campanha é um cadastro, e a peça aponta para ela.** Uma tabela de campanhas (nome, texto do selo,
  início, fim, interruptor, percentuais) e a marcação da peça (peça, campanha, percentual), com chave por peça e
  campanha. O percentual marcado tem de ser um dos da campanha (conferido no banco, não só na tela). O preço
  cadastrado (`price`, `compare_price`) **nunca** é alterado pela campanha.

- **RN-02 · Uma campanha em vigência por vez.** Duas campanhas ligadas com vigências que se cruzam são recusadas no
  cadastro (e no banco). Assim a pergunta "qual o desconto desta peça agora?" tem uma resposta só. Campanhas
  encerradas e agendadas sem cruzamento convivem.

- **RN-03 · "Em vigência" tem um dono, em `core`, no horário de Brasília.** A mesma função decide para a loja, o
  checkout, as functions, o feed e o painel, com o relógio do servidor onde houver servidor e `STORE_TIME_ZONE`
  (`core/time/zone.ts`). O navegador da cliente nunca decide se a campanha está valendo.

- **RN-04 · Um dono do preço de campanha, em `core`.** A mesma função responde "quanto custa esta peça/variação
  agora" para o cartão, a página do produto, a sacola, o checkout, a function `checkout` (`unit_price`,
  `full_unit_price`), a function `mercado-pago` (que reprecifica pelo banco), o feed do Google e o JSON-LD. Uma tela
  calculando à parte daria um preço exibido e outro cobrado — o "defeito 01" no caminho do dinheiro. A função é
  alcançável pelo Deno (arquivo com `.ts` explícito, sem import de pacote). O pedido montado pela dona, no painel ou
  no app do ateliê, segue a mesma regra: durante a vigência, a peça marcada entra com o preço da campanha (a dona ainda
  pode dar um desconto combinado por cima), o cupom não vale para ela, e o preço fica travado na proposta como hoje.

- **RN-09 · O pedido guarda o que foi cobrado.** `order_items.unit_price` (cobrado) e `full_unit_price` (cheio) já
  existem; a campanha e o percentual da linha são gravados junto. Campanha usada em pedido não é apagada.

- **RN-11 · O texto do selo é o da campanha, e cabe.** O selo do cartão mostra o **texto do selo** em versalete e o
  percentual ("BLACK FRIDAY · −20%"). Medido no protótipo: "BLACK FRIDAY" (12 caracteres) cabe no cartão de 173 px ao
  lado do bloco do percentual; o teto de **14 caracteres** é o que cabe com folga. Nome maior que isso exige um
  texto do selo mais curto, e o painel mostra a prévia do selo em 173 px enquanto a dona digita.

- **RN-12 · As cores do selo são da campanha** (Decisão D-02). Duas cores, escolhidas no cadastro: a **cor da
  faixa** e a **cor de destaque**. O selo as usa cruzadas, como no protótipo: o texto da campanha sai na cor de
  destaque sobre a faixa, e o percentual sai na cor da faixa sobre o bloco de destaque. Por isso **um** número decide
  se o par serve: o contraste entre as duas cores, que tem de ser **≥ 4,5:1** (texto de 11–13 px). Par abaixo disso é
  recusado no cadastro com a razão medida ("3,2:1 — escolha cores com mais diferença"). A medida é a de
  `@estrelinha/core/color` (feature `34`), a mesma dos guardas. A campanha nasce com o preto #161514 e o ouro
  #C2A063 do protótipo (7,4:1). As cores do selo **não** dependem do perfil de estilo (WI 100).

- **RN-14 · Tom.** O selo diz o texto da campanha e o percentual; a vitrine diz até quando vale, por data ("até 30 de
  novembro"). Nada de contagem regressiva, "últimas horas" ou escassez — em nenhuma superfície da campanha.

- **RN-15 · Celular primeiro.** Selo inteiro no cartão de 173 px; fonte do sistema a 200 % sem cortar o percentual;
  nenhuma rolagem horizontal; a tela de campanhas do painel em 390 sem rolagem lateral.

- **CA-01** Cadastrar "Black Friday", 13/11 00:00 a 30/11 23:59, percentuais 10, 15, 20, ligada ⇒ a lista mostra
  "Em vigência"; o cadastro da peça mostra "Black Friday: Nenhum · 10% · 15% · 20%".

- **CA-02** Recusas do cadastro: fim antes do início, percentual 0 ou 80, percentual repetido, nenhum percentual,
  vigência cruzando outra campanha ligada, texto do selo acima de 14 caracteres — cada uma com o motivo, nada gravado.

- **CA-08** Tirar o percentual 15% da campanha com peças marcadas em 15% é recusado com a contagem.

- **CA-14** O selo usa as duas cores da campanha (cruzadas: texto na cor de destaque sobre a faixa, percentual na
  cor da faixa sobre o destaque); um par abaixo de 4,5:1 é recusado no cadastro com a razão medida; sem escolha, sai
  preto #161514 e ouro #C2A063. O selo não usa nenhuma cor da paleta da loja: muda a paleta, o selo continua igual.

- **CA-15** Em 390×844 e 1440×900: o selo inteiro nos cartões de 173 e 220 px, sem rolagem horizontal; fonte a 200 %
  sem cortar o percentual; a tela de campanhas do painel sem rolagem lateral em 390.

### Design — o que a tela faz

Copie o comportamento de spec.md › Design › "Painel · Campanhas · lista" e "Painel · Campanha · nova / editar" — é a fonte; não vá ao protótipo. Em resumo obrigatório:
- Lista: tabela no computador (selo em linha · Campanha · Vigência "13/11 a 30/11/2026" · Percentuais em pílulas · Peças · Estado com as quatro pílulas), cartões no celular; botão "Nova campanha"; nota do rodapé literal; vazio, carregando e erro pelo molde do painel.
- Nova/editar: Identificação (nome até 40 com contador; texto do selo com contador "{n} / 14", digitável além de 14 com o erro literal, e acompanhando os 14 primeiros caracteres do nome enquanto vazio ou igual ao começo dele), Vigência (data e hora de Brasília, nova 00:00 e 23:59, nota literal, erros literais de fim antes do início e de vigência cruzada), Percentuais (até 5, 1–70, pílulas de 48 px em ordem crescente com o uso e "Tirar {p}%", a recusa literal de percentual em uso com o link "Ver as peças com {p}%"), Cores do selo (duas cores hex, medida de contraste com uma casa e vírgula e as três frases literais, as três combinações prontas), interruptor "Campanha ligada" com a frase literal, prévia do selo num cartão de 173 px, barra de salvar com as duas frases literais; "Encerrar agora" só na edição de campanha em vigência; Salvar desligado nos cinco casos da spec.
- Duas colunas no computador (prévia acompanha a rolagem); uma coluna abaixo de 1024 px; sem rolagem lateral em 390.

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| `campaigns`, `campaign_percents`, `product_campaigns` + exclusão + gatilho de teto + policies + view de uso por percentual | VOCÊ CRIA | — | a forma de spec.md › Decisões T11 |
| colunas `order_items.campaign_id` (`on delete restrict`) | VOCÊ CRIA | — | só a coluna e a FK; `campaign_percent`, `compare_unit_price`, `orders.campaign_discount` e a trava de cobrança são da tarefa 05 |
| `packages/core/src/campaigns/` | VOCÊ CRIA | — | `live.ts` (em vigência: ligada, início ≤ agora < fim), `price.ts` (preço de campanha em centavos, meio para cima, o menor de RN-06), `status.ts` (os quatro estados), `refusals.ts` (`string \| null`), a conversão do fim digitado ↔ `ends_at` exclusivo (H-04), tetos (nome 40, selo 14, 1–70, 5), cores padrão, o texto da vitrine ("Peças com 10%, 15% e 20% de desconto até 30 de novembro."). Toda folha com `.ts` explícito e sem import de pacote |
| tipos das tabelas | VOCÊ CRIA | — | em `packages/supabase/src/types/` (arquivo novo `campaign.ts` + barrel) |
| `apps/backoffice/src/entities/campaign/` | VOCÊ CRIA | — | leitura (lista, uma campanha, as agendadas ou em vigência na ordem do início, uso por percentual) e a porta de escrita das marcações `(productIds[], campaignId, percent \| null)` — nenhuma outra tela grava `product_campaigns` |
| rotas `/admin/campanhas`, `/admin/campanhas/nova`, `/admin/campanhas/:id` | VOCÊ CRIA | — | dentro do `RequireAdmin`; item "Campanhas" em `navItems.ts` (grupo Descontos, depois de Promoções), na mesma ordem no App.tsx |
| selo em linha e prévia do cartão de 173 px no painel | VOCÊ CRIA | texto, duas cores, percentual | `apps/backoffice/src/entities/campaign/ui/` (por `style` inline), consumido também pela tarefa 02 |
| `contrastRatio` (`packages/core/src/color/contrast.ts:59`) | JÁ EXISTE. Consuma; não altere. | duas cores hex | a razão |
| `STORE_TIME_ZONE` (`packages/core/src/time/zone.ts:10`) | JÁ EXISTE. Consuma; não altere. | — | o fuso |
| "Ver as peças" / "Ver as peças com {p}%" | VOCÊ LIGA | — | links para `/admin/produtos?campanha=<id>` e `&percentual=<p>`; o filtro que lê esses parâmetros é da tarefa 03 |

### Decisões já tomadas

- T11 (verbatim, spec.md › Decisões): `campaigns` (nome, texto do selo, duas cores, `starts_at`, `ends_at`, `active`, `check` de tetos e `ends_at > starts_at`, constraint de exclusão sobre `tstzrange(starts_at, ends_at, '[)')` com `where (active)`); `campaign_percents (campaign_id, percent)` PK composta, `check` 1–70; `product_campaigns (product_id, campaign_id, percent)` PK `(product_id, campaign_id)`, FK composta `(campaign_id, percent) → campaign_percents on delete restrict` (a recusa de UC-02 vira `23503` traduzido com a contagem), `product_id on delete cascade`; `order_items.campaign_id on delete restrict` (RN-09). Teto de 5 por gatilho. Provado por probe SQL local.
- T5: policy pública por `now()` (molde das promoções), `core/campaigns/live.ts` como dono em TS, e um guarda que lê a migration e exige o mesmo predicado (início inclusivo, fim exclusivo, `active`) nos dois lados.
- T7: preço de campanha em centavos inteiros, por unidade, meio centavo para cima; o "menor" de RN-06 compara em centavos.
- T19: no banco só o `check` de formato `^#[0-9A-Fa-f]{6}$`; o contraste é `core/color`, chamado pelo painel.
- H-04: o banco guarda `ends_at` exclusivo; o painel digita e mostra o último minuto que vale ("Termina em 30/11 23:59"): gravar soma 1 minuto, mostrar subtrai 1 minuto. A conversão tem dono em `core/campaigns`.
- H-09 (o que vale do design): a frase de recusa ao tirar percentual em uso é a do design; texto do selo digitável além de 14 com erro e Salvar desligado; Salvar desligado com fim antes do início comparando data **e** hora.
- H-10: apagar só sem pedido que usou a campanha, com `AlertDialog`; com pedido, o botão desligado com o motivo. "Encerrar agora" com confirmação (põe o fim no instante atual). Toda campanha é editável, sujeita às recusas.
- H-12: Migration: só no banco local (`supabase migration up --local`, nunca `--linked`). Nome `supabase/migrations/<prefixo>_102-<slug>.sql`; o prefixo é o próximo livre **a partir de** `20261130120000` (spec.md › Decisões H-12) — apure na hora com `ls supabase/migrations`, e se o WI 101 já tiver um prefixo igual na árvore, use o seguinte.
- A leitura pública mostra só o que a loja precisa: a campanha em vigência (e as marcações dela, de peça ativa). O painel lê tudo por `has_role`.

### Siga a forma de

| O que você vai escrever | Imite |
| --- | --- |
| policy pública por vigência e filhas por `exists` | `supabase/migrations/20260803130000_promotions-progressive.sql:182-219 — promotions_public_read` |
| gatilho de teto | `20260803130000_promotions-progressive.sql:160 — validate_promotion_tier` |
| folha de `core` alcançável pelo Deno | `packages/core/src/time/zone.ts`, `packages/core/src/buy-together/discount.ts` |
| guarda de schema | `apps/store/src/shared/lib/__tests__/compreJuntoSchema.test.ts` (uma régua por comando, `mutar()` que lança) |
| paridade SQL × TS | `apps/store/src/shared/lib/__tests__/materialTransitions.test.ts` |
| `denoReach` | `packages/core/src/coupons/__tests__/denoReach.test.ts` |
| telas de cadastro | `apps/backoffice/src/pages/admin/AdminPromotionsPage.tsx`, `AdminPromotionFormPage.tsx`, `shared/ui/FormPageHeader`, `FormCard` |
| estado por regra pura | `apps/backoffice/src/features/coupon-list/model/couponStatus.ts` |
| item da sidebar e rota | `apps/backoffice/src/widgets/admin-layout/model/navItems.ts:76-79 — grupo Descontos` |
| probes | `.specs/work-items/WI-01-compre-junto/probes/` |

### Testes

- Unidade (`core`): vigência inclui o início e exclui o fim; desligada nunca vale; os quatro estados (Desligada com fim futuro, Agendada, Em vigência, Encerrada vencendo o interruptor).
- Unidade (`core`): 20% sobre R$ 209,90 = R$ 167,92; 15% sobre R$ 199,90 = R$ 169,92; CA-06 (R$ 233,91, nunca R$ 215,91), por unidade antes da quantidade.
- Unidade (`core`): cada recusa do cadastro com o motivo — fim antes do início (data e hora), 0, 80, repetido, nenhum, mais de 5, selo acima de 14, nome vazio ou acima de 40, par abaixo de 4,5:1 com a razão escrita ("3,2:1"), hex inválido.
- Unidade (`core`): a conversão do fim (23:59 digitado ↔ 00:00 do dia seguinte gravado) e o texto da vitrine com 1, 2 e 3 percentuais.
- Guarda: `denoReach` de `core/campaigns` (grafo com `.ts` explícito, `import type` incluso, sem pacote).
- Guarda de schema da migration (uma régua por comando, sensores por mutação): tetos, exclusão com `where (active)` e `[)`, FK composta `restrict`, `cascade` do produto, `restrict` de `order_items.campaign_id`, RLS sem `grant` a `anon`, escrita por `has_role` no `using` e no `with check`, view `security_invoker`, `check` de hex, sem escrita de dado.
- Guarda de paridade: o predicado de vigência da policy igual ao de `live.ts`.
- Probe SQL contra o banco local: exclusão recusa duas ligadas que se cruzam e aceita encerrada × agendada; percentual fora da campanha recusado; tirar percentual em uso dá `23503`; teto de 5; `anon` não vê a agendada nem a desligada e vê a em vigência; marcação de peça inativa invisível ao `anon`.
- Página real (jsdom) do painel: lista com as quatro pílulas; nova com cada recusa visível e Salvar desligado; a recusa "{n} peças usam {p}%" pela contagem da view; "Encerrar agora" só em vigência; apagar desligado com pedido; a prévia trocando texto e cores.
- Probe da gravação do painel (`AD-012`): criar, editar, encerrar e apagar pela porta, contra o banco local.

### Obrigações

- `navItems.test.ts`, `focusRoutes.test.ts`, `rotasSobGuarda.test.ts` e `animacaoRespeitaMovimento.test.ts` (escopo literal: acrescente os arquivos de UI novos, âncoras subindo junto) atualizados sem afrouxar.
- `marcacaoSoPorAcao.test.ts` (suíte da loja) se alguma RPC nova for chamada.
- `fusoComDonoUnico`: o fuso só por `STORE_TIME_ZONE`.
- Alvos de 44 px (`touchTarget`), sem `transition-*` sem par `motion-reduce:`.
- `strictNullChecks: false`: recusas em `string | null`.

### Não faça

- O campo da campanha no produto (tarefa 02), o filtro e a edição em massa da lista de produtos (tarefa 03), o selo na loja (tarefa 04), o preço no checkout e nas functions (tarefa 05), a vitrine (06), o bloco da Home (07), o feed (08), o pedido montado (09).
- As colunas de pedido além de `order_items.campaign_id` (tarefa 05).
- Apagar ou alterar a promoção progressiva e os cupons.

### Pronto quando

- [ ] CA-01, CA-02, CA-08 e a recusa de contraste de CA-14 provados pela página real e pelo probe
- [ ] a migration aplicada no banco local e o probe SQL passando
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório

---

### Confira cada citação desta tarefa quando for usá-la

Todo `caminho:linha` daqui — `Siga a forma de`, `Contrato`, `Obrigações`, `Design` — foi
escrito antes de qualquer tarefa rodar, e as tarefas anteriores mexeram na mesma árvore. Abra
cada um no momento em que ele é usado — o exemplar antes de escrever o artefato, o contrato
quando a fatia o consome —, e nenhuma linha se escreve apoiada em citação não conferida: a
linha deslocou, relocalize pelo alvo que a citação nomeia e siga, registrando no retorno; o
arquivo não está mais lá, é `citação morta` — a regra abaixo manda concluir e propagar sempre
que dê para concluir, e o histórico do Git ainda serve de exemplar.

### Se algo aqui não bater com o repositório

A rota `JÁ EXISTE` não está lá, o exemplar sumiu, a tabela tem outra forma. Dá para concluir
mesmo assim: siga, feche e propague. Não dá: pare e relate até onde chegou. Não conserte
contrato por conta, não improvise, não crie o que era de outra tarefa.

**Propagar** é corrigir, nos arquivos seguintes de `tasks/`, cada afirmação que a sua descoberta
tornou falsa — só a afirmação, e nada mais do arquivo. Feito isso, a divergência está resolvida:
ela vai no seu retorno como registro, não como pendência para alguém decidir.

**Propagar é só para frente.** Afirmação de tarefa de número MENOR, já fechada, que a sua
mudança tornou falsa **não se reescreve**: reescrever o `Pronto quando` de tarefa encerrada
apaga o registro do que de fato foi verificado quando ela fechou. Registre a caducidade na
linha `Caducou` do seu retorno — a tarefa, a afirmação e o que a tornou falsa — e siga.

### Se a verificação não fechar

Leia o erro, corrija, rode de novo. Continuando sem passar, não declare pronto: relate o que
falha, com a saída. Nunca desative teste, marque skip, afrouxe asserção, ignore lint ou
silencie erro de tipo.

### O que devolver no fim

```
Tarefa: <nn>
Caso: fechou limpo | fechou com divergência | parou
Instruções lidas: <os caminhos, raiz e módulos>
Testes escritos: <um por comportamento do bloco `Testes`, com o arquivo; o que ficou sem
  cobertura, e por quê>
Verificações: <o que rodou, e o resultado>
Árvore de trabalho: <o que você alterou; nada é commitado por você>
Citações conferidas: <quantas você abriu ao usá-las; a que deslocou, e a que estava morta>
Propagado: <a tarefa, e o que você corrigiu no arquivo dela>   (só se houve divergência)
Caducou: <tarefa já fechada · a afirmação dela que ficou falsa · o que a tornou falsa>
                                                               (só se houve; não se reescreve)
Bloqueio: <motivo · até onde você chegou>                      (só se parou)
```
