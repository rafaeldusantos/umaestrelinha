## 06 · [supabase · packages/core · apps/backoffice · apps/store] Link de cartão — botão no painel e tela de pagamento na loja

**Status:** done

`UC-05` — 98

**Objetivo.** A Adri gera no painel um link de pagamento por cartão para o mesmo pedido, e a cliente paga por ele sem login, pelo valor travado.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz — §O "defeito 01", §Os guardas, §Convenções, §Baselines, §CI e deploy), `supabase/CLAUDE.md` › `checkout`, `order-proposals`, `mercado-pago`, Migrations, RLS; `apps/store/CLAUDE.md` › O pedido montado `/pedido-montado`, O cartão espera POR CIMA do checkout, As parcelas do cartão, O PIX tem endereço (AD-042); `apps/backoffice/CLAUDE.md` › Montar pedido para a cliente (89); `packages/core/CLAUDE.md` › `checkout`, `proposals`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · spec.md — Código (O que nasce: credencial do link, porta admin, leitura pelo token, terceira prova de posse, tela da loja; Decisão 5).

**Depende de.** 03 — a regra de fechar a cobrança aberta e a recusa de pedido cancelado/pago na `create-payment`; 04 — o valor travado. Confira que existe antes de começar.

### Critérios de aceite

**UC-05**
- CA-05.1 A ação existe para pedido com pagamento por cartão pendente, recusado ou vencido e não cancelado; não vale para pedido feito com PIX [gate Q-01; r1 link-de-cartao-x-cancelamento]
- CA-05.2 O link abre na loja uma tela de pagamento por cartão do mesmo pedido, sem refazer a compra e sem pedir login [r1 credencial-do-link-de-cartao]
- CA-05.3 O valor cobrado é o da compra, travado [gate Q-08]
- CA-05.4 A Adri copia o link para mandar pelo WhatsApp [gate Q-01]
- CA-05.5 Pagamento aprovado por esse link tem o mesmo efeito de um pagamento aprovado no checkout [conhecimento]
- CA-05.6 O link vale até o pedido ser pago ou cancelado, ou até a Adri gerar outro; gerar um link novo invalida o anterior [r1 credencial-do-link-de-cartao]
- CA-05.7 Aberto com o pedido já pago ou cancelado, o link mostra a situação do pedido e não oferece pagamento [r1 credencial-do-link-de-cartao]
- CA-05.8 Gerar o link de cartão não adia o cancelamento automático do pedido [r1 link-de-cartao-x-cancelamento]

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| Credencial do link (hash, gerado por, quando, revogado; um vivo por pedido), sem policy | VOCÊ CRIA (migration) | | |
| Porta admin "gerar link de cartão" (invalida o anterior e fecha a cobrança aberta) | VOCÊ CRIA (ação admin, `requireAdmin`) | `order_id` | `{ link }` (token só na resposta) |
| Leitura pública do pedido pelo token (resumo sem dado pessoal; pago/cancelado ⇒ situação), com teto por IP | VOCÊ CRIA em `supabase/functions/checkout/handlers.ts` (molde `get-proposal`) | token | resumo |
| Terceira prova de posse na `create-payment`, só `method: 'card'` | VOCÊ CRIA em `mercado-pago/handlers.ts:320-379` e `apps/store/src/features/checkout/api/useCreatePayment.ts` | token | |
| Tela da loja do link (token no fragmento, `replaceState`, Brick, espera, aprovação, recusa, situação) | VOCÊ CRIA em `apps/store/src/pages/` + `features/` | | |
| Botão "Gerar link de cartão" + copiar, no bloco Pagamento | VOCÊ CRIA no painel | | |
| Valor travado | JÁ EXISTE (04). Consuma | | |

### Decisões já tomadas

- Credencial própria: token no fragmento, hash no banco, um vivo por pedido — independente de conta e do acesso de 7 dias da convidada; gerar outro invalida o anterior.
- Só para pedido de cartão pendente, recusado ou vencido e não cancelado; não vale para pedido de PIX; não adia o cancelamento automático.
- Reaproveita o Brick do checkout; é **segunda superfície de pagamento declarada** (revisa AD-042): `pagamentoComDonoUnico.test.ts` passa a nomear o dono do cartão por link.
- O `page_view` sai sem o fragmento.
- Cobra o valor travado da 04.

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| Credencial em fragmento + hash | `packages/core/src/checkout/guestAccess.ts › newAccessToken`/`hashAccessToken`; `packages/core/src/proposals/link.ts`; `apps/store/src/features/proposal-checkout/model/proposalToken.ts` |
| Leitura pública por token | `supabase/functions/checkout/handlers.ts › get-proposal` |
| Tela de pagamento por link | `apps/store/src/pages/ProposalCheckoutPage.tsx` (rota em `App.tsx` › `/pedido-montado`) |
| Brick e espera | `apps/store/src/features/checkout/ui/CardPaymentBrick.tsx`, `PaymentBlock.tsx`; `features/order-payment/ui/PaymentProgress.tsx`, `PaymentApproved.tsx` |

Abra o arquivo antes de escrever o seu.

### Testes

- Unidade (functions): token inválido, substituído ou de pedido pago/cancelado ⇒ recusa; método diferente de cartão ⇒ recusa; gerar novo invalida o anterior.
- Integração local (function servida): o link cobra o valor travado; a leitura pelo token não traz dado pessoal.
- Página real (loja): a tela com o pedido pendente mostra o Brick; pago ou cancelado mostra a situação sem pagamento.
- Página real (painel): o botão aparece só para pedido de cartão não pago e não cancelado, e copia o link.

### Obrigações

- Migration nova em `supabase/migrations/` com o próximo prefixo livre (apure na hora: `ls supabase/migrations | tail`; o prefixo é a chave em `schema_migrations`, nunca repita). Aplique **só** no local (`supabase migration up --local`); nunca `--linked`, nunca `db push`. Migration aplicada é imutável (AD-017): recrie em migration nova.
- RLS de tabela nova: RLS ligada, `revoke all … from anon` (e `public`), policy `to authenticated` com `has_role(auth.uid(),'admin')` no `using` **e** no `with check`, nenhum `grant` — molde `supabase/migrations/20261108120000_95-observacao-do-pedido.sql`. Nada novo em colunas de `orders` que a cliente não deva ler (`get-order` devolve `orders` quase inteira, `supabase/functions/checkout/handlers.ts:710-715`; a cliente lê `select('*')`).
- Toda RPC nova chamada por código entra na lista literal de `apps/store/src/shared/lib/__tests__/marcacaoSoPorAcao.test.ts` (com `create function` conferido na migration).
- Prove o que grava por probe contra o banco local (AD-012), numa transação desfeita, em `.specs/work-items/98-pagamento-que-falhou/probes/`.
- Módulo de `packages/core` que uma edge function importe: todo especificador relativo com `.ts` explícito, `import type` incluso; sem React, Supabase como valor, alias ou `node:`; nunca escreva a forma proibida de import em comentário (o bundler do `supabase start` lê comentário). `strictNullChecks` é `false`: veredito devolve `string | null` ou discrimina por literal de string.
- O `tsc` da loja (`npx tsc --noEmit -p apps/store/tsconfig.app.json`, baseline 0) cobre `supabase/functions/mercado-pago/handlers.ts` e o grafo que ele importa (`_shared/*`, `send-notification/dispatch.ts`, os módulos de `packages/core`): um teste da loja importa o handler real (`apps/store/src/pages/__tests__/OrderPaymentPagePrecoTravado.test.tsx`, tarefa 04). Toda linha nova nesse grafo conta na baseline de tipos da loja. Com `strictNullChecks` falso, o padrão de recusa das functions `if (!auth.ok) return json({ error: auth.error }, auth.status)` dá TS2339 ali: leia o ramo da recusa com o tipo dele, como `closeCharge` faz (`const recusa = auth as { status: number; error: string }`). Rode também esse `tsc` no fecho.
- Rota nova da loja: `lazy`, `usePageMeta`, `NON_INDEXABLE_PATHS`, `ROUTE_SLUGS`, `APP_ROUTE_PATTERNS` (guardas `reservedSlugs`, `routes`, `sitemapRoutes`, `routeSplitting`, `metaPorRota`, `rotasDeApp`, `seo.test.ts`, `paginasFixasServidas`).
- `chaveDeServidorForaDoNavegador.test.ts`: nada de service role nos apps.
- Ordem de publicação: migration → functions (`checkout`, `mercado-pago`, a porta) → bundles.
- Gate: suítes de functions, core, loja e backoffice, um workspace por vez.

- **Exceção desta tarefa à regra de RLS acima:** a tabela da credencial do link desta tarefa tem RLS ligada e **nenhuma policy** (nem para admin) e nenhum `grant` — só a service role lê e grava, molde `supabase/migrations/20261103120000_89-pedido-montado.sql` ("RLS ligada e NENHUMA policy").

### Não faça

- Não abra cartão na rota `/pedido/:id/pagamento`; não ofereça o link à cliente por conta própria (só a Adri gera).
- Não adie o cancelamento automático.

### Pronto quando

- [ ] o link gerado no painel abre a tela sem login e cobra o valor travado contra a function servida localmente
- [ ] o link antigo morre ao gerar outro; pedido pago ou cancelado não oferece pagamento
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho de `CLAUDE.md` §Comandos/§Baselines (tipos do app tocado e de `packages/core`, na seção Comandos de verificação de `.specs/project/PROJECT.md`)

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
