## 04 · [supabase · packages/core · apps/store] Preço travado ao pagar de novo — create-payment e a rota do PIX

**Status:** done

`UC-01` — 98

**Objetivo.** Pagar de novo cobra o mesmo valor da primeira cobrança calculada pela loja, sem recusar por promoção encerrada ou cupom esgotado.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz — §O "defeito 01", §Os guardas, §Convenções, §Baselines, §CI e deploy), `supabase/CLAUDE.md` › `mercado-pago`, `checkout`, `order-proposals`, Migrations, RLS; `packages/core/CLAUDE.md` › Dinheiro, `payment`, `proposals`; `apps/store/CLAUDE.md` › O PIX tem endereço (AD-042), O pedido montado. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · spec.md — Código (O que muda: `create-payment` regrava total e 422; O que nasce: valor travado da primeira cobrança; Decisão 4).

**Depende de.** 03 — a recusa de pedido cancelado/pago na `create-payment`. Confira que existe antes de começar.
**Habilita.** o valor travado que a 06 cobra pelo link de cartão.

### Critérios de aceite

**UC-01**
- CA-01.4 Gerar um código novo invalida o anterior no meio de pagamento [código: supabase/functions/mercado-pago/handlers.ts:1004-1006]
- CA-01.5 Pagar de novo cobra o mesmo valor da primeira cobrança do pedido: promoção encerrada, cupom esgotado ou preço mudado no catálogo não alteram o valor nem recusam a cobrança. Pedido montado pelo painel cobra o valor da proposta, como hoje [r1 preco-travado-pedido-de-catalogo]
- CA-01.6 Um pedido gravado fora da loja (sem cobrança calculada pela loja) nunca é cobrado pelo valor gravado nele [r1 preco-travado-pedido-de-catalogo]

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| Tabela do valor travado da primeira cobrança (total, desconto, frete, cupom, itens), escrita só pela service role, sem policy para `authenticated`/`anon` | VOCÊ CRIA | | |
| `create-payment`: na primeira cobrança calcula e grava o travado; da segunda em diante cobra o travado sem reler catálogo, promoção ou cupom e sem o 422 de teto | VOCÊ ALTERA `supabase/functions/mercado-pago/handlers.ts` (`:435-716` cálculo, `:722-770` teto, `:785-805` regravação, `:676-687` cupom esgotado) | | |
| `lockedProposalCharge` | JÁ EXISTE. Imite; não altere. `mercado-pago/handlers.ts › lockedProposalCharge` | | |
| `PriceChangedContact` | JÁ EXISTE. `apps/store/src/pages/OrderPaymentPage.tsx:121-153` | | |

### Decisões já tomadas

- O valor travado é o da **primeira cobrança calculada pelo servidor**, guardado em tabela só da service role — **nunca `orders.total`** (as policies de INSERT de `orders` seguem abertas, BL-030).
- Pedido montado (feature 89) continua cobrando pela proposta (`lockedProposalCharge`).
- Pedido sem cobrança gravada (inclusive os pendentes de antes da publicação) é calculado como hoje; o 422 "o valor mudou" e `PriceChangedContact` ficam só para esse caso.
- `packages/core/src/payment/**` não muda por acaso: se precisar tocar, justifique no retorno.

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| Cobrança travada no servidor | `supabase/functions/mercado-pago/handlers.ts › lockedProposalCharge` |
| Tabela sem policy (service role) | a tabela `order_proposals` da migration da feature 89 (`supabase/migrations/20261103120000_89-pedido-montado.sql`) |

Abra o arquivo antes de escrever o seu.

### Testes

- Unidade (functions, dublê): primeira cobrança grava o travado; a segunda cobra o travado com promoção encerrada, cupom esgotado e preço mudado, sem 422.
- Unidade (functions, dublê): gerar um código novo cancela a order anterior no MP antes de abrir outra (CA-01.4), também no caminho do valor travado.
- Unidade: pedido sem cobrança gravada é calculado como hoje (o 422 continua).
- Integração local (function servida): pagar de novo cobra o travado; a cliente logada não lê nem grava a tabela nova; um `orders.total` forjado não muda o valor cobrado.
- Página real (loja): a rota do PIX não mostra "o valor mudou" no pagar de novo com valor travado.

### Obrigações

- Migration nova em `supabase/migrations/` com o próximo prefixo livre (apure na hora: `ls supabase/migrations | tail`; o prefixo é a chave em `schema_migrations`, nunca repita). Aplique **só** no local (`supabase migration up --local`); nunca `--linked`, nunca `db push`. Migration aplicada é imutável (AD-017): recrie em migration nova.
- RLS de tabela nova: RLS ligada, `revoke all … from anon` (e `public`), policy `to authenticated` com `has_role(auth.uid(),'admin')` no `using` **e** no `with check`, nenhum `grant` — molde `supabase/migrations/20261108120000_95-observacao-do-pedido.sql`. Nada novo em colunas de `orders` que a cliente não deva ler (`get-order` devolve `orders` quase inteira, `supabase/functions/checkout/handlers.ts:710-715`; a cliente lê `select('*')`).
- Toda RPC nova chamada por código entra na lista literal de `apps/store/src/shared/lib/__tests__/marcacaoSoPorAcao.test.ts` (com `create function` conferido na migration).
- Prove o que grava por probe contra o banco local (AD-012), numa transação desfeita, em `.specs/work-items/98-pagamento-que-falhou/probes/`.
- Gate: suíte de functions, core e loja, um workspace por vez. Ordem de publicação: migration → `mercado-pago` → bundle da loja.

- **Exceção desta tarefa à regra de RLS acima:** a tabela do valor travado desta tarefa tem RLS ligada e **nenhuma policy** (nem para admin) e nenhum `grant` — só a service role lê e grava, molde `supabase/migrations/20261103120000_89-pedido-montado.sql` ("RLS ligada e NENHUMA policy").

### Não faça

- Não leia `orders.total` como valor travado.
- Não crie o link de cartão (06) nem mude a regra de quem vê "Pagar com PIX" (05).

### Pronto quando

- [ ] pagar de novo cobra o valor da primeira cobrança, provado contra a function servida localmente
- [ ] gerar um código novo continua cancelando a order anterior (CA-01.4)
- [ ] nenhum valor travado legível ou gravável pela cliente
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
