## 02 · [supabase · packages/core · apps/backoffice · apps/store (guardas)] Backoffice: pedido montado com o link sempre, e o endereço salvo pela function

**Status:** done

`UC-10` — 94

**Objetivo.** No painel, o pedido montado aberto mostra o link para copiar sempre (também ao reabrir), Renovar só aparece depois de o link expirar (salvo o recuo sem cifra de D-28: a aberta/vista sem cifra gravada renova pelo "Gerar link novo"), o endereço da montagem vai ao cadastro da cliente pela própria gravação da proposta, e a origem do pedido passa a ser "Pedido montado"; o servidor passa a oferecer o contrato que o app consome.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines, › CI e deploy; `apps/backoffice/CLAUDE.md` › A busca de produto: um dono para as cinco telas (feature 51, AD-036), › Montar pedido para a cliente (feature 89, AD-070); `packages/core/CLAUDE.md` › Quando um código pertence a este pacote, › Pureza, › Os módulos, › Dinheiro, › customers, › proposals, › Convenções de tipo; `supabase/CLAUDE.md` › Migrations, › RLS — o molde que os guardas cobram, › Edge functions, › order-proposals e o pedido que nasce de uma proposta, › Secrets. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · spec.md — Código; §7 · spec.md — Decisões (D-04, D-05, D-14, D-17, D-20, D-25, D-28). É o rastreio da tarefa até a costura: quem executa abre esta seção quando precisa do contexto que a tarefa não repete.

**Depende de.** 01 — a regra "qual foto vai na linha" em `packages/core/src/proposals/`. Confira que existe antes de começar.
**Habilita.** 04 (`get` devolve o link enquanto aberta; Renovar só da expirada (salvo o recuo sem cifra de D-28: a aberta/vista sem cifra gravada renova pelo "Gerar link novo")), 09 (`save_address` no `save`).

### Critérios de aceite

### Pedido montado
- Cartão escuro com o link — sempre disponível enquanto o pedido montado está aberto, também ao reabri-lo depois, no app e no painel; nunca é preciso gerar um link novo para copiar —, **Enviar pelo WhatsApp** (só com telefone) e **Copiar link**; sem telefone,
  "Sem telefone — copie o link." A mensagem do WhatsApp aparece escrita.
- Copiar/WhatsApp registram "Link enviado · canal" no histórico.
- Aberta: Editar, Cancelar (folha, `inkSolid`). Renovar só aparece depois de o link atual expirar.
  Expirada: Renovar prazo (folha de confirmação; o link antigo morre). Concluída: "Ver o pedido #0262".

### Design — o que a tela faz

Do painel (`Pedido - Montar.html`, `TelaProposta`), com as decisões do gate aplicadas:

- Cartão "Link para a cliente": validade ("Vale até {validade}" / "Venceu em {validade}" / "Link encerrado"), campo só leitura que seleciona ao focar, **Copiar link**, **Enviar pelo WhatsApp** ou "Sem telefone — copie o link", prévia da mensagem recolhível. Aberta: o link vem sempre (fim do "Gerar link novo" para copiar); a dica "Precisa de mais tempo? Renovar o prazo…" **sai** (D-17). Expirada: link morto e só "Renovar prazo". Cancelada/concluída: link morto, sem ação.
- Folha/diálogo de renovar (D-17): "O link venceu em {dd/mm}. Os preços são conferidos de novo e sai um link novo, que vale até {dd/mm}. Mande o novo para {nome}."; rótulo "Renovar prazo".
- Montagem: "Salvar no cadastro da cliente" marcada por padrão (só com cliente escolhida) passa a ir no corpo do `save`; falha: "Não consegui gravar o pedido. Nada foi enviado à cliente. Tente de novo." (D-20).
- Sem a chave da cifra configurada, ou proposta aberta antes do deploy (sem cifra): o cartão segue com "Gerar link novo", como hoje (D-28).
- O desenho não mostra carregando/erro ao obter o link de uma proposta reaberta: use os estados que a página do pedido montado do painel já tem.

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| migration nova `supabase/migrations/<prefixo livre depois do último em disco>_94-…sql` | VOCÊ CRIA |  |  |
| coluna da cifra do token em `order_proposals` | VOCÊ CRIA |  |  |
| `save_order_proposal` recriada (vigente hoje: `20261109120000_95-observacao-da-proposta.sql:32-246`) | VOCÊ RECRIA | `save_address`, a cifra | grava proposta e endereço em `addresses` na mesma transação |
| cifra AES-GCM do token (Web Crypto) e a chave em secret novo **opcional** das functions | VOCÊ CRIA em `supabase/functions/_shared/` | token | cifra / token |
| `order-proposals?action=save` | JÁ EXISTE (`handlers.ts › save`). Muda | `save_address: boolean` | como hoje |
| `order-proposals?action=renew` | JÁ EXISTE (`handlers.ts › renew`). Muda | — | recusa a não expirada **que tem cifra**; aceita a aberta/vista sem cifra (o recuo de D-28); nos dois casos troca o hash e, com a chave configurada, grava a cifra no mesmo `update` |
| `order-proposals?action=get` | JÁ EXISTE (`handlers.ts › get`). Muda | — | + `token` só com estado `open`/`viewed` e cifra presente; nunca a cifra nem o hash |
| `precificar` (`handlers.ts:314`, select `:321`, foto `:403`) | JÁ EXISTE. Muda | | pede `capa:images->0->>url` e chama a regra da foto da 01 |
| `proposalActions` (`packages/core/src/proposals/state.ts:55`) | JÁ EXISTE. Muda |  | `renew: state === 'expired' \|\| (aberta/vista && sem link disponível)` — passa a receber essa entrada (ex. `linkAvailable`, vinda do `get`); rótulo "Renovar prazo" no primeiro caso e "Gerar link novo" no segundo |
| `checkout/proposal.ts:120` (abre pelo hash) | JÁ EXISTE. Consuma; não altere |  |  |

### Decisões já tomadas

- D-04: "O `save` da `order-proposals` aceita `save_address: true`, e a RPC `save_order_proposal`, recriada em migration nova, grava o endereço em `addresses` da ficha (a escolhida ou a recém-criada) na mesma transação da proposta. O painel passa a usar o mesmo campo e deixa de escrever em `addresses` pelo navegador (um dono da escrita). Os guardas que medem a RPC vigente (`pedidoMontadoSchema`, o da `95`) passam a ler a migration nova."
- D-20: "Uma gravação só; a frase da falha parcial sai" — `ADDRESS_SAVE_FAILED` (`copy.ts:14`) sai.
- D-14/D-28: token cifrado no banco; `get` devolve o link enquanto aberta; app e painel mostram Copiar sempre; Renovar só depois de expirar (salvo o recuo sem cifra de D-28: a aberta/vista sem cifra gravada renova pelo "Gerar link novo") e continua trocando o link; **"Igual, mas o secret é opcional (sem ele, comportamento de hoje)"**; propostas sem cifra seguem com "Gerar link novo".
- D-17: "Valem as decisões do gate, com a frase nova da folha de renovar".
- D-25: "Uma origem só, \"Pedido montado\", nos dois apps" — o rótulo "Montado pelo painel" (`apps/backoffice/src/pages/admin/AdminOrderPage.origem.test.tsx:97` e a fonte dele) vira "Pedido montado".
- D-05: a `precificar` passa a pedir `images->0->>url` e chama a regra da foto de `core`.

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| Recriar RPC em migration nova | `supabase/migrations/20261109120000_95-observacao-da-proposta.sql` (a coluna nova entra em `v_fora`, `:52-55`, e no `insert`, `:201-223`) |
| Guarda da RPC recriada | `apps/store/src/shared/lib/__tests__/observacaoDaPropostaSchema.test.ts` |
| Ação nova/alterada na function | `supabase/functions/order-proposals/handlers.ts › note` |
| Probe no banco local | `.specs/features/89-pedido-montado-pelo-painel/probes/01-proposta.sql` |

### Testes

- Unidade (functions): `get` devolve o token só com a proposta aberta e cifra presente; nem a cifra nem o hash saem; o log não carrega nenhum dos dois.
- Unidade (functions): `save` passa `save_address` à RPC; `renew` em três casos — recusa a aberta com cifra; aceita a aberta sem cifra e, com a chave configurada, ela sai com cifra; renova a expirada (hash e cifra no mesmo `update`); sem a chave, `save`/`renew` gravam só o hash e `get` não devolve token.
- Unidade (functions): a foto gravada segue variação → `images[0]` → `image_url`.
- Unidade (core): `proposalActions` só deixa renovar a expirada, ou a aberta sem link disponível — com sensor de que a aberta com link **não** renova.
- Página real (painel): o cartão mostra o link vindo do `get`, sem "Gerar link novo"; sem token no `get`, "Gerar link novo" chama `renew` e passa a mostrar o link novo; Renovar só com a expirada, com a frase nova; a montagem manda `save_address` e não escreve em `addresses`; a origem "Pedido montado".
- Integração local (probe): a RPC recriada grava proposta e endereço na mesma transação (falha ⇒ nada), respeita `addresses_one_default` (`20261004120000_59-minha-conta.sql:150-151`), não sobe a versão só pela cifra e pela observação, não cria segunda ficha; `get-proposal`/checkout abre pelo hash; peça sem foto por variação grava `images[0]`.
- Guardas: `pedidoMontadoSchema` (`tokenSoHash`, `:153-156`, passa a hash + cifra, nunca o token em claro; a vigente é a migration nova, `:293`, `:309-312`) e `observacaoDaPropostaSchema` (`:33-38`, `:182-191`) migrados para a vigente nova, com sensores.

### Obrigações

- Migration só no banco local (`supabase migration up --local`, nunca `--linked`); prefixo único depois do último em disco (apure na hora).
- O secret da chave: no `[edge_runtime.secrets]` de `supabase/config.toml` e no `.env.example` da raiz, **opcional** (não entra na lista obrigatória de `.github/workflows/supabase-deploy.yml:165-190`).
- Atualize `supabase/CLAUDE.md:216` (SEG-01: o banco guarda hash e cifra) e a seção do `order-proposals`.
- `apps/backoffice/src/features/order-proposal/model/linkMemory.ts` e a chave `estrelinha.admin.proposal-link.*` perdem a razão de existir: remova junto com `LINK_NOT_IN_MEMORY` (`copy.ts:20`) quando o link vier sempre do `get` — mas mantenha o recuo "Gerar link novo" para proposta sem cifra.
- Apague `gravarEnderecoDaCliente` (`apps/backoffice/src/entities/customer/api/useCustomerSearch.ts:145-165`) e a chamada em `AdminProposalBuilderPage.tsx:110-128`.
- Prove a gravação contra o banco local (`AD-012`). O gate inclui as suítes da loja e do painel.

### Não faça

- Não crie a ação `preview` (08) nem mude `list` (04).
- Não toque no app (`apps/mobile-adm/**`).
- Não exiba nem registre o token em log.

### Pronto quando

- [ ] o painel mostra o link de uma proposta aberta reaberta e copia sem gerar link novo
- [ ] Renovar só na expirada, com a frase nova, salvo o recuo sem cifra de D-28
- [ ] o endereço vai ao cadastro pela gravação da proposta, e uma falha não deixa nada gravado
- [ ] a origem "Pedido montado" no painel
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório (e a seção Comandos de verificação do `.specs/project/PROJECT.md`)

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
