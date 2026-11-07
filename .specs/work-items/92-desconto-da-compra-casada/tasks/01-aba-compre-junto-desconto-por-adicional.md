## 01 · [core · supabase · backoffice] Painel — aba "Compre junto" do produto: o desconto por adicional

**Status:** done

`UC-01` — 92

**Objetivo.** A dona dá a cada adicional de uma joia um percentual de 1 a 50%, vê ao lado por quanto a peça sai com a joia, e o percentual fica gravado no banco, recusado fora da faixa.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy; `packages/core/CLAUDE.md` (inteiro); `apps/backoffice/CLAUDE.md` › Molde dos formulários, Compre Junto › a aba "Compre junto" do produto, Compre Junto › Adesão, Pedidos e a fila de material; `supabase/CLAUDE.md` › Migrations, O Compre Junto, A marca "acompanha", O relatório de adesão, RLS, Edge functions, mercado-pago, checkout, send-notification; `.specs/LESSONS.md` › L-013, L-014, L-015. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (Painel — aba Compre junto do produto) e §4 — Código. É o rastreio da tarefa até a costura: quem executa abre esta seção quando precisa do contexto que a tarefa não repete.

**Depende de.** nada (primeira tarefa). Confira que existe antes de começar.
**Habilita.** a coluna `product_buy_together.discount_percent`, `discountPercent` em `AddonConfig`, a recusa e as constantes 1/50 em `core/buy-together/rules.ts`, e a **função única do preço com desconto** (`round(preço × (100 − p)) / 100`, por unidade) numa folha nova de `core/buy-together`, exportada pelo barrel — consumida por 02 e 03.

### Critérios de aceite

**UC-01 · A dona dá um desconto a um adicional**

- CA-01.1 Cada adicional tem um campo de percentual. Vazio quer dizer sem desconto, e o adicional continua funcionando como no WI-01 [pedido: Q-04; gate: P-01]
- CA-01.2 Um percentual fora de 1% a 50%, ou não inteiro, é recusado antes de gravar, com a frase do motivo. Gravação direta no banco também é recusada [gate: Q-05; código: o molde é `buy-together/rules.ts:20-38` + `check` da migration]
- CA-01.3 Mudar só o percentual conta como alteração: o "Salvar" grava, e sem mudança o salvar não escreve [código: `addons.ts:139-155`]
- CA-01.4 Gravar o desconto de uma joia não muda o Compre Junto de outra [código: `persistAddons.ts:5-7`]
- CA-01.5 Ao lado do campo, uma prévia diz por quanto a peça sai com esta joia ("a corrente sai a R$ X com esta joia"); quando as variações liberadas da peça, ou as peças da lista, têm preços diferentes, a prévia fala da faixa ("de R$ X a R$ Y") [gate: Q-11 (c); PRD Tech Review r1]

### Design — o que a tela faz

- O bloco "Desconto ao levar junto" fica por último em cada adicional (hoje desabilitado, com "10" fixo e a etiqueta "WI 92 · depois" — tirar a etiqueta e o estado desabilitado). Campo com sufixo "%", nome acessível "Desconto em percentual"; em 1440 o texto à esquerda e o campo numa coluna de 120; abaixo de 1024 empilha.
- A ajuda do protótipo ("Concorre com promoções e cupom pela regra de sempre: vale o menor preço.") está ERRADA: o desconto acumula com o cupom (CA-03.6). Ajuda: "Percentual sobre esta peça quando a joia principal estiver no mesmo pedido. Vale o menor preço se a peça também estiver em promoção."
- O design não mostra o estado vazio, a recusa nem a prévia: siga o padrão do painel (`apps/backoffice/CLAUDE.md` › Molde dos formulários). A recusa aparece no campo com a frase vinda de `core`; a prévia fica ao lado/abaixo do campo ("a corrente sai a R$ X com esta joia"; com preços diferentes, "de R$ X a R$ Y").

Este recorte é a fonte: não vá ao design buscar o que não está aqui. Detalhe visual que ele não menciona resolve-se pelo design system do repositório.

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| `product_buy_together.discount_percent integer null`, `check (discount_percent is null or discount_percent between 1 and 50)` | VOCÊ CRIA (migration nova) | — | coluna lida pela loja (policy pública de leitura já existe, `20261105120000_compre-junto.sql` › policy de leitura) |
| folha nova em `packages/core/src/buy-together/` com a função do preço com desconto (preço da unidade, percentual) → preço arredondado a centavo; e as constantes `BUY_TOGETHER_DISCOUNT_MIN = 1`, `BUY_TOGETHER_DISCOUNT_MAX = 50` e a recusa `string \| null` (em `rules.ts`) | VOCÊ CRIA | preço, percentual | preço; frase da recusa ou `null` |
| `AddonConfig.discountPercent: number \| null` | VOCÊ CRIA (`availability.ts › AddonConfig`) | — | lido por 02 e 03 |
| `DbProductBuyTogether.discount_percent` | VOCÊ CRIA (`packages/supabase/src/types/buyTogether.ts`) | — | — |
| o barrel `packages/core/src/buy-together/index.ts` | VOCÊ ALTERA (só o export da folha nova) | — | — |
| `product_buy_together` (tabela, RLS de escrita admin) | JÁ EXISTE. Consuma; não altere a policy. | — | — |

Só o que ESTA tarefa cria ou consome. `JÁ EXISTE` é afirmação a conferir no código.

### Decisões já tomadas

- D-05 (precedência dentro da joia) e a regra do desconto na sacola NÃO são desta tarefa (são da 03).
- A função do preço com desconto é o dono único da conta: a prévia do painel a chama; 02 e 03 vão chamá-la ("defeito 01").
- O percentual é inteiro de 1 a 50; vazio = sem desconto (gate da descoberta, Q-05: "De 1% a 50%, inteiro").
- A ajuda do campo diz que vale o menor preço com promoção; o cupom acumula (CA-03.6) — não escreva que concorre com o cupom.
- Migration só no banco local (`supabase migration up --local`); aditiva; o prefixo é o maior existente em `supabase/migrations/` + 1 hora (nunca repetir prefixo — `version` é a chave de `schema_migrations`).
- Toda regra com dois leitores mora em `packages/core`; o desconto nunca é calculado na tela.
- Tom memorial (RNF-06): sem "economize", sem exclamação, sem urgência.

### Siga a forma de

| O que você vai escrever | Imite |
| --- | --- |
| Coluna aditiva com `check` de intervalo | `supabase/migrations/20261105120000_compre-junto.sql:66` — o `check (position between 0 and 2)` |
| Recusa com teto em constante | `packages/core/src/buy-together/rules.ts › listNameRefusal` / `addonCountRefusal` |
| Folha de `core` alcançável pelo Deno | `packages/core/src/buy-together/marks.ts` (sem import) |
| Rascunho, diff e gravação do adicional | `apps/backoffice/src/features/product-form/model/addons.ts › addonsChanged`, `› addonsFromRow`; `persistAddons.ts › linha`, `› addonsRefusal` |
| Prévia de preço no painel | `apps/backoffice/src/features/promotion-form/ui/PromotionShowcaseCard.tsx` (sem a palavra "economiza") |
| Guarda de schema da migration | `apps/store/src/shared/lib/__tests__/compreJuntoSchema.test.ts` (uma régua por comando, `mutar()` que lança, tetos importados de `core`) |
| Página real do painel | `apps/backoffice/src/pages/admin/AdminProductFormPage.compreJunto.test.tsx` |

Abra o arquivo antes de escrever o seu.

### Testes

- unidade (`core`): a função do preço arredonda a centavo por unidade (79 com 10% = 71,10; 25 com 15% = 21,25) e devolve o preço sem mudança com percentual nulo.
- unidade (`core`): a recusa devolve frase para 0, 51 e 10,5 e `null` para 1, 50 e vazio.
- guarda de schema (store `shared/lib/__tests__`): a migration nova tem `add column if not exists`, o `check` com os tetos importados de `core`, não escreve dado e não abre `grant` a `anon`; sensor por mutação.
- unidade (painel): mudar só o percentual marca o rascunho como alterado; o payload gravado inclui `discount_percent` (igualdade exata).
- página real (painel): o campo recusa 51 com a frase, antes de gravar; a prévia mostra "R$ X" e, com variações de preços diferentes ou numa lista, "de R$ X a R$ Y".
- integração (Supabase local): gravação direta com 0, 51 e 10,5 é recusada pelo banco; o painel grava o percentual por HTTP (estender `.specs/work-items/WI-01-compre-junto/probes/03-adicionais-no-produto.sh` numa cópia em `.specs/work-items/92-desconto-da-compra-casada/probes/`).

Escrever estes testes é parte da tarefa.

### Obrigações

- RNF-03: a folha nova e `rules.ts` só com imports relativos `.ts` (`import type` incluso), sem pacote; atualizar a lista e a contagem de `packages/core/src/buy-together/__tests__/purity.test.ts` para o arquivo novo (a régua de pureza caminha o grafo).
- `AD-012`: provar a gravação por probe HTTP contra o banco local (porta 54441), não pelo tipo.
- O guarda `compreJuntoSemColunaAntiga.test.ts` (painel) recusa `buy_together_ids`: não use a coluna antiga.
- `useBuyTogetherLists.ts` lê só `base_price` (`apps/backoffice/src/features/buy-together-lists/api/useBuyTogetherLists.ts:16`): acrescente os preços das variações que a faixa da prévia precisa.
- Mobile primeiro: o campo e a prévia em 390 sem rolagem horizontal; alvo de toque ≥ 44.

### Não faça

- Não calcule desconto na sacola, no checkout nem no servidor (tarefas 03 e 04).
- Não mexa no bloco da loja (tarefa 02) nem em `pricing.ts` (tarefa 03).
- Não crie percentual por peça dentro de uma lista (Fora do PRD).
- Não crie validade de/até nem desconto por quantidade de adicionais (Fora do PRD).

### Pronto quando

- [ ] o campo grava 1–50 inteiro e o banco recusa fora disso (probe)
- [ ] a prévia e a faixa aparecem com os valores certos
- [ ] a prévia chama a função de 01, sem conta própria
- [ ] a função do preço com desconto e as constantes estão exportadas pelo barrel de `core/buy-together`
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
