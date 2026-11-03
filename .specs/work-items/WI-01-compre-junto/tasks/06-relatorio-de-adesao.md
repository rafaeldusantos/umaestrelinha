## 06 · [supabase, apps/backoffice] Relatório de adesão ao Compre Junto (aba Adesão) e fecho da documentação

**Status:** done

`UC-06` — WI-01

**Objetivo.** A dona abre a aba Adesão do menu Compre Junto e vê, por período, quantos pedidos tiveram peças compradas junto, quantas peças e quanto valeram, por joia principal e por lista; e a documentação e as baselines do repositório fecham com a feature.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` da raiz › O "defeito 01", › Os guardas, › Convenções, › Baselines, › CI e deploy, › Feature-Sliced Design; `packages/core/CLAUDE.md` › Quando um código pertence ao pacote, › Pureza, › Os módulos; `apps/backoffice/CLAUDE.md` › O fornecedor da peça, › `/admin/perguntas`, › O editor de Produtos em destaque, › A busca de produto, › O movimento do painel; `supabase/CLAUDE.md` › Migrations, › RLS — o molde que os guardas cobram (e, na tarefa do pedido, › `checkout`). Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (Painel — Adesão), §4 — Código, §7 — Decisões

**Depende de.** a tarefa 05 deixou as colunas de `order_items` prontas e a 01 a página do menu Compre Junto.
**Habilita.** nada — fecha a fila.

### Critérios de aceite

**UC-06 · A dona acompanha a adesão ao Compre Junto**
Uma tela do painel mostra como o Compre Junto está sendo usado.
- CA-06.1 Num período escolhido, o relatório mostra quantos pedidos tiveram peças compradas junto, quantas peças adicionais foram vendidas e o valor delas. Uma peça conta como "comprada junto" quando entrou na sacola pelo bloco do Compre Junto e o principal dela está no mesmo pedido. O pedido guarda, no momento da compra, de qual principal e de qual lista a peça veio, e editar a lista depois não muda o relatório. [gate Q-09; conhecimento; PRD Tech Review r1]
- CA-06.2 O relatório abre por produto principal e por lista, mostrando quais adicionais mais saem [gate Q-09; conhecimento]
- CA-06.3 Conta só pedidos pagos e não cancelados, pela mesma régua de venda do Dashboard [código: `AD-055`]
- CA-06.4 O período do relatório é de 7, 30 ou 90 dias (padrão 30). O relatório mostra, além dos três números, a parte dos pedidos pagos que tiveram Compre Junto e a média de peças por pedido; cada linha traz a peça que mais sai, com a variação; o recorte por lista traz uma linha "Peça escolhida direto no produto" para os adicionais do tipo produto; sem pedido com Compre Junto no período, o relatório diz isso por escrito. [gate principal 2026-11-02 · relatorio-recortes]
- CA-06.5 As peças adicionais vendidas somam a quantidade da linha do pedido marcada como comprada junto. [gate principal 2026-11-02 · pecas-do-relatorio-por-unidade-ou-linha]


### Design — o que a tela faz

### Painel — Adesão (UC-06)

- **Esqueleto:** seletor de período (7/30/90 dias, padrão 30); três indicadores; nota da regra; cartão "Por joia principal" / "Por lista" com alternador; tabela no desktop, cartões no celular, com barra proporcional de valor.
- **Dados:** "Pedidos com Compre Junto" ("X% dos N pedidos pagos"); "Peças levadas junto" ("n,n por pedido, em média"); "Valor das peças levadas junto" ("pelo preço pago em cada peça"); nota "Conta pedidos pagos e não cancelados, no dia de Brasília — a mesma régua do Dashboard. Uma peça conta quando entrou na sacola pelo Compre Junto e a joia dela está no mesmo pedido."; por joia: joia principal, Pedidos, Peças, Valor com barra, "Peça que mais sai"; por lista: Lista, Peças, Valor com barra, "Peça que mais sai" (sem coluna Pedidos), com a variação ("Corrente Veneziana em Prata 925 · 45 cm"); linha "Peça escolhida direto no produto" no recorte por lista.
- **Estados:** lista sem venda no período aparece com 0 peças e R$ 0,00, peça que mais sai "—". Não desenhados: vazio (decidido: texto escrito, CA-06.4), carregando, erro, divisão por 0 pedidos.

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| colunas de `order_items` (principal, lista): `accompanies_product_ids text[]` e `accompanies_list_ids uuid[]`, **arrays alinhados por posição** (uma linha pode acompanhar mais de um principal; elemento nulo na lista = peça escolhida direto no produto; nulas na peça comum). Por joia/por lista: desaninhar os dois juntos (`unnest(a, b)`); peças e valor: a linha conta UMA vez. `payment_status`, `status` | JÁ EXISTE (tarefa 05). Consuma; não altere | — | — |
| RPC admin do relatório (`has_role` ⇒ `42501` como primeiro comando, `security definer`, `search_path = ''`, `execute` só a `authenticated`, período em dias de Brasília, régua do `AD-055`: `payment_status = 'approved'` **e** `status <> 'cancelled'`) | VOCÊ CRIA (migration, só local) | período em dias | indicadores, por joia, por lista, peça que mais sai, linha "direto no produto" |
| hook, página e aba "Adesão" do menu Compre Junto; rota/nav se a aba precisar | VOCÊ CRIA / ALTERA a página da tarefa 01 | período | tela |
| `marcacaoSoPorAcao.test.ts` (lista literal `RPCS`, 157-207), `rotasSobGuarda`, `navItems`, `focusRoutes` | VOCÊ ALTERA | — | — |
| `CLAUDE.md` da raiz (baselines, guardas novos, "Estado conhecido") e `.specs/STATE.md` (AD novo da lista ≠ coleção, número livre apurado na hora) — **só você** os edita nesta fila; `apps/store/CLAUDE.md` (nota da forma do bloco, vinda da tarefa 07) e `apps/backoffice/CLAUDE.md` (a aba Adesão) | VOCÊ ALTERA | — | — |

### Decisões já tomadas

- (#6, `relatorio-recortes`) "Como no protótipo (7/30/90, indicadores extras, linha "direto no produto"), mais um estado vazio escrito por nós" → CA-06.4
- (#7, `pecas-do-relatorio-por-unidade-ou-linha`) "Somar a quantidade da linha marcada (simples; pode contar a unidade avulsa nesse caso raro)" → CA-06.5
- (#14, `relatorio-de-adesao-rpc-e-regua-ad-055`) **D-relatorio** — RPC admin única (`has_role` ⇒ `42501` primeiro, `security definer`, `search_path=''`), régua do AD-055 por fragmento comparado em teste, período em dias de Brasília no banco; entra em `marcacaoSoPorAcao.test.ts`; rota nova ⇒ `rotasSobGuarda`, `navItems`, `focusRoutes`
- (#17, `guardas-que-a-feature-toca`) **D-guardas** — por tarefa: `semMaterialNaPaginaDoProduto` (escopo literal, incluir o widget novo), `marcacaoSoPorAcao` (RPC nova), `animacaoRespeitaMovimento`, `rotasSobGuarda`/`navItems`/`focusRoutes`, `buscaDeProdutoComDonoUnico`, fixtures com `buy_together_ids`, e o guarda de schema novo (uma régua por comando, `mutar()` que lança)

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| RPC admin de leitura com período | `supabase/migrations/20261104130000_presenca-leitura.sql` (18, 40 `has_role` primeiro, 109-110 régua de venda) e `20261023120000_73-resumo-do-atelie.sql` (29); relógio em `20261021120000_71-visitas-unicas.sql` (25, 42, 51: `store_time_zone`, `store_day_start`) |
| guarda da RPC | `apps/store/src/shared/lib/__tests__/overviewSchema.test.ts` e `visitasSchema.test.ts` (uma régua por comando, régua de venda por fragmento comparado) |
| página com período, indicadores e tabela/cartões | `apps/backoffice/src/pages/admin/AdminDashboard.tsx` e `widgets/store-movement` (bloco com indicadores e ⓘ) |
| aba na página de Listas | a página da tarefa 01 |

### Testes

- RPC do relatório: `42501` sem papel antes de qualquer leitura; só pedidos pagos e não cancelados; recorte por joia principal e por lista; "peça que mais sai" com a variação; linha "direto no produto"; soma da quantidade da linha marcada; editar a lista depois não muda o histórico (nível: probe `psql` no banco local e guarda de schema por régua, com o fragmento da régua do `AD-055` comparado ao do Dashboard).
- Página da aba Adesão: período 7/30/90 (padrão 30), indicadores, estado vazio escrito, tabela no desktop e cartões no celular (nível: página real; a medida em navegador).
- RPC nova na lista literal de `marcacaoSoPorAcao`; rota/nav nos guardas do painel (nível: guardas existentes estendidos).
- Baselines e guardas do `CLAUDE.md` com números medidos (nível: medição por workspace, exit fora de pipe).

### Obrigações

- A régua de venda é a do `AD-055` por fragmento **comparado em teste** com o do Dashboard; o período é em dias de Brasília no banco (`store_day_start`), nunca `current_date`/`now()::date`. Entra em `marcacaoSoPorAcao.test.ts` (RPC nova) — e o gate de uma feature do painel inclui a suíte da loja.
- Peças = soma de `quantity` da linha marcada; editar a lista depois **não** muda o histórico (o pedido guarda principal e lista no momento da compra).
- Recusa sem papel: `42501` antes de qualquer leitura (probe `psql`).
- Estado vazio escrito (sem pedido com Compre Junto no período) e divisão por zero tratada.
- `semPessoas`-style: o número é de pedidos e peças, nunca "pessoas".
- **Fecho da feature** (só você escreve o `CLAUDE.md` da raiz e o `STATE.md`): atualize as baselines de `CLAUDE.md` medindo cada workspace **um por vez**, exit fora de pipe, com `--testTimeout=20000` sem o `--`, contra a entrada medida com a árvore parada; registre os guardas novos na tabela de guardas; atualize `Estado conhecido` (ordem de publicação: migration de tabelas → migration de conversão → painel → loja/checkout → `drop column` só depois do painel publicado; a contagem de `buy_together_ids` em produção é conferida pelo usuário antes do deploy; **migration nova nunca vai à `master` sem pergunta**) e o `.specs/STATE.md`.
- Mobile primeiro: tabela no desktop, cartões no celular, sem rolagem horizontal; prova em navegador a 390 e 1440.

### Não faça

- Qualquer alteração em `order_items` ou em `checkout` (tarefa 05).
- Desconto, ranking de clientes, "pessoas".
- Período livre, exportação, ordenação por coluna (não pedidos).
- A escolha da forma do bloco (tarefa 07).
- Escrever em `.specs/features/**` ou aplicar migration em produção.

### Pronto quando

- [ ] a aba Adesão mostra pedidos, peças e valor do período, por joia e por lista, só de pedidos pagos e não cancelados, e a regra bate com a do Dashboard (teste de fragmento)
- [ ] sem papel a RPC recusa com `42501` (probe)
- [ ] estado vazio escrito; editar uma lista não muda o histórico
- [ ] baselines e guardas do `CLAUDE.md`, `STATE.md` e os `CLAUDE.md` de módulo atualizados com números medidos
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório tocado (tipos do workspace e a suíte do workspace com `--testTimeout=20000` sem o `--`; e a suíte da loja quando o painel mudou), sem comandos copiados aqui: estão em `CLAUDE.md` › Comandos e › Baselines e em `.specs/project/PROJECT.md` › Comandos de verificação


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
