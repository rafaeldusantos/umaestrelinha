## 08 · [supabase · backoffice · store (teste)] Painel — o relatório de Adesão com o desconto concedido

**Status:** done

`UC-06` — 92

**Objetivo.** O relatório de Adesão mostra o valor pago (líquido) das peças levadas junto e a coluna "desconto concedido" (preço cheio − pago), sem mudar a régua de contagem pela marca.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy; `apps/backoffice/CLAUDE.md` › Molde dos formulários, Compre Junto › a aba "Compre junto" do produto, Compre Junto › Adesão, Pedidos e a fila de material; `supabase/CLAUDE.md` › Migrations, O Compre Junto, A marca "acompanha", O relatório de adesão, RLS, Edge functions, mercado-pago, checkout, send-notification; `.specs/LESSONS.md` › L-013, L-014, L-015. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (Painel — Adesão) e §4 — Código. É o rastreio da tarefa até a costura: quem executa abre esta seção quando precisa do contexto que a tarefa não repete.

**Depende de.** 04 — `order_items.full_unit_price` e `unit_price` = cobrado. Confira que existe antes de começar.
**Habilita.** nada.

### Critérios de aceite

**UC-06 · O relatório de Adesão mostra o desconto concedido**

- CA-06.1 O relatório segue contando as peças pela marca "acompanha" [gate: Q-08; código: `AD-072`]
- CA-06.2 O "valor" de cada peça é o pago, líquido do desconto, e há uma coluna "desconto concedido": tudo o que as peças levadas junto deixaram de custar (preço cheio − preço pago), qualquer que seja o desconto que venceu na linha [gate: Q-08; handoff: H-02; código: `compre-junto-adesao.sql:22, 66`]

### Design — o que a tela faz

- O protótipo ("Uma Estrelinha - Backoffice", `Compre Junto - Listas e adesão.html` › Adesão) não tem a coluna; siga o padrão da tela (H-01): "Desconto concedido" na tabela (1440) e nos cartões (abaixo de 1024), nos recortes por joia e por lista; o indicador de valor segue "pelo preço pago em cada peça".

Este recorte é a fonte: não vá ao design buscar o que não está aqui. Detalhe visual que ele não menciona resolve-se pelo design system do repositório.

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| `buy_together_adoption` recriada (migration nova, `create or replace function`) com `desconto_concedido` nos totais, em `por_joia` e em `por_lista` | VOCÊ CRIA | — | chave nova no `jsonb` |
| a tela de Adesão (`apps/backoffice/src/features/buy-together-adoption`) | VOCÊ ALTERA | — | — |

Só o que ESTA tarefa cria ou consome. `JÁ EXISTE` é afirmação a conferir no código.

### Decisões já tomadas

- D-15 (H-02): "desconto concedido" = soma de `(full_unit_price − unit_price) * quantity` das linhas marcadas, qualquer que seja o desconto que venceu na linha; linha sem `full_unit_price` (pedido antigo) conta 0. O valor (`unit_price * quantity`) fica igual.
- D-07: o guarda `compreJuntoAdesaoSchema.test.ts` passa a ler a migration VIGENTE da função (molde de como ele acha o `store_movement` vigente, perto de `:94-101`), não o arquivo `20261107120000` pelo nome; o probe `05-adesao.sh` ganha fixtura com desconto.
- Migration só no banco local (`supabase migration up --local`); aditiva; o prefixo é o maior existente em `supabase/migrations/` + 1 hora (nunca repetir prefixo — `version` é a chave de `schema_migrations`).
- Toda regra com dois leitores mora em `packages/core`; o desconto nunca é calculado na tela.
- Tom memorial (RNF-06): sem "economize", sem exclamação, sem urgência.

### Siga a forma de

| O que você vai escrever | Imite |
| --- | --- |
| Recriar RPC com a guarda lendo a vigente | `apps/store/src/shared/lib/__tests__/compreJuntoAdesaoSchema.test.ts:94-101`; `pagamentoMarcaPagoSchema.test.ts` |
| A RPC atual | `supabase/migrations/20261107120000_compre-junto-adesao.sql` |

Abra o arquivo antes de escrever o seu.

### Testes

- guarda de schema: a régua do `compreJuntoAdesaoSchema` aplicada à migration vigente, mais a soma de `desconto_concedido` com o recuo para nulo; `mutar()` que lança.
- página real (painel): a coluna aparece na tabela e nos cartões com o valor da RPC.
- integração (Supabase local): o probe `05-adesao.sh` (cópia em `.specs/work-items/92-desconto-da-compra-casada/probes/`) com um pedido com desconto devolve o valor líquido e o desconto concedido.

Escrever estes testes é parte da tarefa.

### Obrigações

- `AD-017`: a migration `20261107120000` não se edita; a correção vem em migration nova.
- `marcacaoSoPorAcao.test.ts` lista RPCs: recriar com o mesmo nome não muda a lista.
- Prefixo da migration: o maior existente + 1 hora (a 04 e a 07 também criam migrations).

### Não faça

- Não mude a régua de contagem pela marca (CA-06.1).
- Não crie coluna de desconto casado por linha (D-15).
- Não mexa no painel do pedido (06) nem no app (07).

### Pronto quando

- [ ] a RPC devolve `desconto_concedido` e o valor líquido (probe local)
- [ ] o guarda lê a migration vigente
- [ ] a tela mostra a coluna
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório (`CLAUDE.md` › Comandos e `.specs/project/PROJECT.md` › Comandos de verificação)

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
