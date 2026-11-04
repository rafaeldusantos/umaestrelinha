## 02 · [. — supabase, supabase/functions, apps/backoffice, apps/store (guardas)] Montagem e página da proposta

**Status:** done

`C-01, C-02, C-04` — 95

**Objetivo.** Quem monta o pedido escreve a observação na proposta, edita na página da proposta em qualquer status sem mexer no link da cliente, e ela passa ao pedido quando a proposta vira pedido.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz — por seção: O "defeito 01", Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy, o bloco "Alias de import"), `packages/core/CLAUDE.md`; e por seção: `apps/backoffice/CLAUDE.md › Montar pedido para a cliente (feature 89)`, `› Molde dos formulários`, `› O aviso à cliente é escolha… (feature 88)`; `supabase/CLAUDE.md › Migrations`, `› RLS — o molde que os guardas cobram`, `› checkout — o pedido nasce aqui`, `› order-proposals e o pedido que nasce de uma proposta`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §5 · plan.md — Código — /Users/rafael.santos/Projetos/uma-estrelinha/store. É o rastreio da tarefa até a costura: quem executa abre esta seção quando precisa do contexto que a tarefa não repete.

**Depende de.** 01: a tabela `order_admin_notes`, `core/orders/adminNote.ts` (`ORDER_ADMIN_NOTE_MAX`, `adminNoteRefusal`, `normalizeAdminNote`), o dono `core/order-actions/adminNote.ts` e o slice `apps/backoffice/src/features/order-admin-note/` (`OrderAdminNoteCard({ orderId })`, autossuficiente). Confira que existem antes de começar.

### Critérios de aceite

- **C-01** A montagem do pedido no Backoffice tem o campo **Observação** (textarea, só para quem administra), gravado com a proposta. Editar a observação não muda a `version` da proposta nem o que o link da cliente mostra, e a observação pode ser editada na página da proposta em qualquer status
- **C-02** Quando a proposta vira pedido, a observação passa ao pedido, na mesma transação. Dali em diante a dona é a observação do pedido: a página da proposta concluída mostra e edita a do pedido
- **C-04** A cliente nunca recebe a observação: nem na tela da loja, nem em resposta de rede (PostgREST com a sessão dela, `get-order`, `get-proposal`, Realtime, e-mails)

### Design — o que a tela faz

Sem protótipo (o humano mandou seguir sem design).

- **Montagem** (`AdminProposalBuilderPage`): seção "Observação" na coluna principal, molde de `ManualDiscountField` — textarea com `CharCounter` (teto 1000, `count={adminNoteLength(texto)}` de `core` — texto aparado, por ponto de código —, sem `maxLength` nativo, que conta UTF-16) e a linha "só você vê". Vai no save junto do resto.
- **Página da proposta** (`AdminProposalPage`): card "Observação" com o próprio Salvar, em qualquer status (aberta, expirada, cancelada). **Concluída** (`p.order_id`): o card é o do pedido — monte `OrderAdminNoteCard` da tarefa 01 com o `order_id` (ele lê e grava `order_admin_notes` sozinho).

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| coluna `order_proposals.admin_note text` com o mesmo `check` de teto (migration nova) | VOCÊ CRIA | — | nula = sem observação |
| `save_order_proposal` (recriada em migration nova) | VOCÊ CRIA (recriação) | `p jsonb` com `admin_note` | `'admin_note'` em `v_fora` (não conta como conteúdo, não sobe `version`, nenhum evento `edited`); gravada no `insert` ao criar; o `update` de conteúdo não a toca; o resto **igual à 89** |
| `create_order_from_proposal` (recriada) | VOCÊ CRIA (recriação) | igual | depois do `insert` em `orders`, `insert` em `order_admin_notes(order_id, note, updated_by, updated_by_name)` (autor = `created_by` da proposta; o nome, o que a proposta tiver, ou nulo) quando `admin_note` não é nulo, na mesma transação; assinatura igual |
| function `order-proposals` — ação nova `note` | VOCÊ CRIA | `{ id, admin_note }`, `requireAdmin` | `update` direto de `order_proposals.admin_note` pela service role, sem tocar em `version` nem em `updated_at` de conteúdo; recusa pela regra de `core`; proposta concluída ⇒ recusa com frase (a página grava no pedido) |
| `order-proposals` `save` / `get` | JÁ EXISTE. Altere. | `body.admin_note` | `admin_note` em `COLUNAS_DA_PROPOSTA`; `save` valida e repassa ao RPC |
| `checkout/proposal.ts › COLUNAS` | JÁ EXISTE. Consuma; não altere a lista. | — | continua **sem** `admin_note` |
| `order_admin_notes`, `core/orders/adminNote.ts`, `core/order-actions/adminNote.ts`, `features/order-admin-note` (`OrderAdminNoteCard`) | JÁ EXISTE (tarefa 01). Consuma; não altere. | | |

### Decisões já tomadas

- A migration da 89 está em produção e é imutável: as duas RPCs são **recriadas** em migration nova (prefixo maior que o maior de `supabase/migrations/`, apurado na hora), aplicada **só no local**.
- `'admin_note'` vai em `v_fora` de `save_order_proposal`: sem isso, todo save e todo `renew` (que não manda a nota) pareceriam mudança e subiriam `version`.
- Editar a nota em qualquer status é uma **ação própria** (`note`), porque `save` recusa `not_open`/`expired`. Molde: a ação `cancel`.
- Depois da conversão, o dono é `order_admin_notes`; a coluna da proposta fica **congelada** (não é limpa) e a página da proposta concluída usa o card do pedido.
- Duplicar uma proposta **não copia** a observação (N3): `draftFromProposal` no modo duplicar deixa `adminNote` vazio (o desconto e o motivo continuam sendo copiados).
- Teto 1000, aparado, por ponto de código — a regra de `core` da tarefa 01.
- `order-proposals` não sobe no edge runtime local (`supabase/CLAUDE.md › order-proposals`): a ação nova se prova por teste de unidade.

### Siga a forma de

| O que você vai escrever | Imite |
| --- | --- |
| recriar RPC já aplicada mudando só o necessário | `supabase/migrations/20261027120000_inicio-fotos-das-joias.sql` + `apps/store/src/shared/lib/__tests__/fotoDasJoiasSchema.test.ts` |
| guarda da migration nova | `apps/store/src/shared/lib/__tests__/pedidoMontadoSchema.test.ts` (a "vigente" das duas RPCs passa a ser a da migration nova) |
| ação nova na function | `supabase/functions/order-proposals/handlers.ts › cancel` |
| campo com contador e "só você vê" | `apps/backoffice/src/features/order-proposal/ui/ManualDiscountField.tsx` |
| teste que recusa coluna interna na loja | `supabase/functions/checkout/__tests__/proposal.test.ts` — o caso do motivo interno e o do `*` |

### Testes

- Function `order-proposals`: `save` repassa a observação ao RPC e recusa acima do teto antes do RPC; a ação `note` grava em aberta, expirada e cancelada sem subir versão e sem evento `edited`, e recusa em concluída; conta sem papel recusada; `get` devolve a observação.
- Function `checkout`: `get-proposal` nunca devolve `admin_note`.
- Painel: o payload do save em igualdade exata de chaves com `admin_note` (`draft.test.ts`); duplicar não copia a observação; a montagem real envia a observação; a página da proposta edita em proposta não aberta; a proposta concluída mostra e edita a observação do **pedido**.
- Guarda: a migration nova — coluna com o teto importado de `core`, `'admin_note'` em `v_fora`, `create_order_from_proposal` copiando para `order_admin_notes`, o resto das duas RPCs igual à 89, nenhum `grant` a `anon`; `pedidoMontadoSchema` lendo a vigente nova.
- Probe no banco local (transação desfeita): `save` só de conteúdo com a nota gravada não sobe versão nem apaga a nota; `renew` não apaga; `create_order_from_proposal` copia a nota para `order_admin_notes`, e proposta sem nota não cria linha.

### Obrigações

- O `check` da coluna e o guarda usam `ORDER_ADMIN_NOTE_MAX` de `core` (importado no guarda, nunca número cravado).
- Toda RPC nova que um app ou function chame entra na lista literal de `apps/store/src/shared/lib/__tests__/marcacaoSoPorAcao.test.ts` (as recriadas mantêm o nome).
- A function importa `core` por caminho relativo com `.ts` explícito.
- Payload de gravação provado por igualdade exata de chaves; gravar não pisca; mobile primeiro (390×844, sem rolagem horizontal).
- Gate "sem regressão" por workspace tocado (backoffice, functions, store, core) — `CLAUDE.md › Baselines`.

### Não faça

- Editar `20261103120000_89-pedido-montado.sql`.
- Pôr `admin_note` em `checkout/proposal.ts › COLUNAS`.
- Mudar o slice `features/order-admin-note` ou `core/order-actions/adminNote.ts` (tarefa 01), a folha em lote, o export CSV.
- Qualquer coisa em `apps/mobile-adm` (tarefa 03).
- `supabase db push`, `--linked`, commit.

### Pronto quando

- [ ] a montagem grava a observação com a proposta
- [ ] editar a observação, em qualquer status não concluído, não sobe `version` nem gera `edited`
- [ ] a proposta concluída mostra e edita a observação do pedido, e a conversão copia a nota na mesma transação
- [ ] `get-proposal` não devolve `admin_note`
- [ ] duplicar não copia a observação
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
