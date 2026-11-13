## 08 · [packages/core · supabase · apps/store] Feed do Google e JSON-LD do produto — o preço da campanha

**Status:** done

`RN-07 · CA-10` — 102

**Objetivo.** O feed do Google e o JSON-LD da página do produto trazem o preço da campanha e a vigência, iguais ao que a página mostra.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines · CI e deploy · Feature-Sliced Design / Alias de import; `packages/core/CLAUDE.md` › `shopping` · Pureza; `apps/store/CLAUDE.md` › O HTML servido (`api/page`); `supabase/CLAUDE.md` › Edge functions. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · spec.md — Código (Feed; Página servida); §7 · spec.md — Decisões (T6, T7, H-06, H-11).

**Depende de.** 01 — `core/campaigns`. 05 — `supabase/functions/_shared/campaigns.ts` (o leitor único das functions). Confira que existem antes de começar. (A 06 também mexe em `core/page/serve.ts` e `apps/store/server/page.ts`; ela já fechou numa onda anterior.)

### Critérios de aceite

- **RN-04 · Um dono do preço de campanha, em `core`.** A mesma função responde "quanto custa esta peça/variação
  agora" para o cartão, a página do produto, a sacola, o checkout, a function `checkout` (`unit_price`,
  `full_unit_price`), a function `mercado-pago` (que reprecifica pelo banco), o feed do Google e o JSON-LD. Uma tela
  calculando à parte daria um preço exibido e outro cobrado — o "defeito 01" no caminho do dinheiro. A função é
  alcançável pelo Deno (arquivo com `.ts` explícito, sem import de pacote). O pedido montado pela dona, no painel ou
  no app do ateliê, segue a mesma regra: durante a vigência, a peça marcada entra com o preço da campanha (a dona ainda
  pode dar um desconto combinado por cima), o cupom não vale para ela, e o preço fica travado na proposta como hoje.

- **RN-06 · Desconto não soma com o "de/por".** Peça com `compare_price` maior que o preço: o preço cheio é o
  `compare_price`; o cobrado é o **menor** entre o preço de hoje e o cheio com o desconto da campanha. Nunca os dois
  descontos multiplicados. O preço com desconto é arredondado para o centavo mais próximo (meio centavo para cima), por unidade: 15%
  sobre R$ 199,90 é R$ 169,92. A loja, o servidor e o Google mostram o mesmo centavo.

- **RN-07 · O feed do Google acompanha.** `<g:price>` = o cheio, `<g:sale_price>` = o com desconto e
  `<g:sale_price_effective_date>` = a vigência, pela mesma regra de `offerPricing`. A página de destino mostra o
  mesmo número (preço divergente é motivo de reprovação no Merchant Center). `shoppingParity.test.ts` continua
  valendo.

- **CA-04** A mesma peça antes do início e depois do fim: preço de sempre, sem selo, fora da vitrine — na loja e no
  servidor.

- **CA-10** O feed traz `sale_price` igual ao preço da página e `sale_price_effective_date` igual à vigência, para cada
  variação de peça marcada.

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| `offerPricing` (`packages/core/src/shopping/pricing.ts:48`) | VOCÊ MUDA | a campanha (percentual e vigência) | preço cheio, preço com desconto pelo "menor" de RN-06, e a vigência |
| `g:sale_price_effective_date` em `shopping/xml.ts` | VOCÊ CRIA | a vigência | o intervalo ISO 8601 |
| `google-feed` (`supabase/functions/google-feed/index.ts`) | VOCÊ MUDA | a campanha pelo leitor único, com o relógio da function | o feed |
| o JSON-LD do produto servido (`packages/core/src/page/serve.ts` ramo de produto, `apps/store/server/page.ts` select do produto) | VOCÊ MUDA | o embed das marcações vigentes (pela RLS) | o preço da página |
| `supabase/functions/_shared/campaigns.ts` | JÁ EXISTE (tarefa 05). Consuma; não altere. | `liveCampaignMarks(client, now, productIds)` (client e relógio injetados) | `{ error, campaign: { id, name } \| null, percentOf: Map<productId, percent> }` |

### Decisões já tomadas

- H-06: as functions leem a campanha só por `_shared/campaigns.ts`, decidindo por `core/campaigns/live.ts`.
- T7: centavos por unidade, meio para cima, pela função de `core/campaigns/price.ts`.
- `google-feed` usa a chave de serviço (a RLS não filtra): a vigência é decidida pelo leitor único com o relógio da function; `api/page` usa a chave publicável e a RLS já filtra.
- H-11: o cache de 300 s na virada é aceito.

### Siga a forma de

| O que você vai escrever | Imite |
| --- | --- |
| a oferta com dono único | `packages/core/src/shopping/pricing.ts:48 — offerPricing`; `shopping/offer.ts:176-188` |
| paridade feed × JSON-LD | `packages/core/src/shopping/__tests__/shoppingParity.test.ts` |

### Testes

- `core/shopping`: `offerPricing` com campanha dá `salePrice` igual ao da página e a vigência; sem campanha, idêntico a hoje; CA-06 (o menor).
- `shoppingParity.test.ts` continua valendo, com casos de campanha.
- `xml.ts` emite `g:sale_price_effective_date` só com campanha.
- Handler do `google-feed`: com o relógio dentro da vigência, `sale_price` e `sale_price_effective_date` por variação marcada; fora, nada.
- `serve.ts`/`page.test.ts`: o JSON-LD do produto marcado com o preço da campanha; `paginaDeOpcaoComDonoUnico` verde.
- `packages/core/src/seo/__tests__/denoReach.test.ts` (âncora cravada de **15** arquivos no grafo, com `shopping/pricing.ts`): ao `offerPricing` passar a importar `core/campaigns`, o grafo cresce — suba a âncora para o número verdadeiro e confira que todo arquivo novo do grafo tem `.ts` explícito e nenhum import de pacote; `wiringResolve` verde.

### Obrigações

- `.ts` explícito no grafo de `core/shopping` e de `core/campaigns`, `import type` incluso.
- Nesta onda, só esta tarefa edita `core/shopping/*`, `core/page/*`, `apps/store/server/*` e `google-feed`.

### Não faça

- A vitrine `/ofertas` (tarefa 06, já fechada — não reescreva o ramo dela); o preço da loja e do checkout (tarefas 04 e 05); o leitor `_shared/campaigns.ts` (tarefa 05).

### Pronto quando

- [ ] CA-10 provado pelo handler do feed e pela paridade
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
