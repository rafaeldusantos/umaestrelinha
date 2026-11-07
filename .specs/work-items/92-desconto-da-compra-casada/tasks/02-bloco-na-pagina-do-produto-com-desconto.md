## 02 · [core · store] Loja — o bloco Compre Junto na página do produto, com o desconto

**Status:** done

`UC-02` — 92

**Objetivo.** A cliente vê, já no bloco da página da joia, o preço levando junto ("de/por") de cada peça, a linha "Desconto do Compre Junto" e o total do conjunto já descontado, também na barra fixa do celular.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy; `packages/core/CLAUDE.md` (inteiro); `apps/store/CLAUDE.md` › O bloco Compre Junto, O botão único leva o conjunto, Carrinho, chrome e checkout, A sacola v4 e a marca "acompanha", Minha conta e o detalhe do pedido; `.specs/LESSONS.md` › L-013, L-014, L-015. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (Loja — Bloco Compre Junto) e §4 — Código. É o rastreio da tarefa até a costura: quem executa abre esta seção quando precisa do contexto que a tarefa não repete.

**Depende de.** 01 — `discount_percent` no banco, `AddonConfig.discountPercent` e a função do preço com desconto exportada pelo barrel de `core/buy-together`. Confira que existe antes de começar.
**Habilita.** `bundleTotal` devolvendo o total e o desconto do conjunto — usado pelo teste de paridade bloco = sacola da 04.

### Critérios de aceite

**UC-02 · A cliente vê o desconto no bloco da página do produto**

- CA-02.1 Cada peça com desconto mostra riscado o preço de hoje da variação escolhida e o preço levando junto ("de/por"), e a frase "N% a menos levando junto"; numa lista, as peças da escolha também mostram "de/por" [gate: Q-02, Q-06; PRD Tech Review r1]
- CA-02.2 Com peças marcadas, o total do conjunto já vem descontado, com uma linha "Desconto do Compre Junto − R$ X" acima dele, e o preço no PIX é calculado sobre o total descontado [gate: Q-02; pedido: Q-05 do WI 91]
- CA-02.3 O bloco diz que o desconto vale enquanto a joia estiver no mesmo pedido [gate: Q-11 (d)]
- CA-02.4 Sem promoção nem cupom valendo para essas peças, o total do bloco é o total da sacola com só a joia e as peças marcadas. Com promoção que dê preço menor que o desconto casado, ou com cupom, a sacola mostra o menor, e a diferença aparece só ali [código: RNF-04 do WI-01, revisada; PRD Tech Review r1]
- CA-02.5 A barra fixa do celular mostra o mesmo total descontado [código: o botão único do WI-01]

**Requisitos não-funcionais**

- RNF-05 Mobile primeiro: o "de/por" no bloco e a linha do desconto na sacola e no checkout em 390×844 sem rolagem horizontal e sem quebrar em pílula [código: `CLAUDE.md` raiz › "Mobile é o caso principal"]
- RNF-06 Tom memorial: sem "economize!", sem exclamação, sem urgência nem contagem [código: `CLAUDE.md` raiz, `tomDoCompreJunto.test.ts`]

### Design — o que a tela faz

- Parágrafo do bloco: "Peças que eu escolhi para acompanhar esta joia. Marque as que quiser levar." (sem frase sobre desconto — H-03).
- Linha do adicional com desconto: o preço da variação escolhida riscado, o preço levando junto, e embaixo "{N}% a menos levando junto". Leitor de tela: "de {cheio} por {junto}"; o nome acessível da caixa termina com ", N% a menos levando junto".
- Peças de uma lista (faixa que rola dentro dela, e na folha da forma B): cada cartão com o "de/por", sem a frase.
- Total, com pelo menos uma peça marcada: "Desconto do Compre Junto" e "− R$ X" acima de "Total do conjunto" (já descontado), e "R$ Y no PIX" sobre o total descontado. A nota "O botão de compra leva a joia e as peças marcadas. Cada uma entra na sacola como uma linha própria, e você pode tirar qualquer uma depois." ganha " O desconto vale enquanto a joia estiver no mesmo pedido." quando há desconto.
- Só peças sem desconto marcadas: o total sem a linha e sem a frase.
- Barra fixa: o total descontado e "Conjunto · N peças"; no computador, a nota "A joia e 1 peça marcada · R$ X" com o total descontado.
- Protótipo: Claude Design, projeto "Uma Estrelinha - Loja", `Produto - Compre Junto com desconto.html` (exibição "De / por"; o "Selo" foi descartado).

Este recorte é a fonte: não vá ao design buscar o que não está aqui. Detalhe visual que ele não menciona resolve-se pelo design system do repositório.

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| `bundleTotal` (`packages/core/src/buy-together/total.ts`) | VOCÊ ALTERA | joia × quantidade, peças marcadas com preço e percentual | total do conjunto já descontado e o desconto do conjunto |
| a função do preço com desconto (folha de 01, pelo barrel): `buyTogetherDiscountedPrice(unitPrice, percent)` em `packages/core/src/buy-together/discount.ts` | JÁ EXISTE (01). Consuma; não altere. | preço, percentual (`null`/ausente = sem desconto) | preço |
| `AddonConfig.discountPercent` (declarado OPCIONAL, `discountPercent?: number \| null`: ausente = sem desconto; quem monta `AddonConfig` — `toConfig` — passa a preenchê-lo) | JÁ EXISTE (01). Consuma. | — | — |
| `useBuyTogetherData` (`BUY_TOGETHER_SELECT`, `toConfig`) | VOCÊ ALTERA (pede `discount_percent` e mapeia) | — | — |
| o barrel `core/buy-together/index.ts` e `purity.test.ts` | NÃO TOQUE (são da 03 nesta onda) | — | — |

Só o que ESTA tarefa cria ou consome. `JÁ EXISTE` é afirmação a conferir no código.

### Decisões já tomadas

- D-04: o bloco calcula só a joia e as peças com o desconto casado; promoção e cupom ficam na sacola.
- D-16 (H-03): "Desconto do Compre Junto" em todo lugar, também no bloco; sem a frase do cabeçalho.
- O "de" é o preço de hoje da variação escolhida, nunca `compare_price` (CA-02.1).
- A conta do preço com desconto é da função de 01: `bundleTotal` e as linhas a chamam, sem conta própria.
- Migration só no banco local (`supabase migration up --local`); aditiva; o prefixo é o maior existente em `supabase/migrations/` + 1 hora (nunca repetir prefixo — `version` é a chave de `schema_migrations`).
- Toda regra com dois leitores mora em `packages/core`; o desconto nunca é calculado na tela.
- Tom memorial (RNF-06): sem "economize", sem exclamação, sem urgência.

### Siga a forma de

| O que você vai escrever | Imite |
| --- | --- |
| Estado do bloco | `apps/store/src/entities/product/model/useBuyTogether.ts` (`price`, `fromPrice`, `taken`, `total`) |
| Linha do adicional | `apps/store/src/entities/product/ui/buy-together/AddonRow.tsx` |
| Total e PIX do conjunto | `apps/store/src/entities/product/ui/buy-together/BuyTogetherBlock.tsx`; `packages/core/src/buy-together/total.ts › bundlePix` |
| Teste de página real | `apps/store/src/pages/__tests__/ProductPageBuyTogether.test.tsx` |

Abra o arquivo antes de escrever o seu.

### Testes

- unidade (`core`): `bundleTotal` com uma corrente de 10% e o estojo de 15% devolve o total descontado e o desconto do conjunto; sem percentual, o mesmo de hoje.
- componente: a linha mostra "de/por" e "N% a menos levando junto"; a peça da lista mostra "de/por"; a peça sem desconto mostra só o preço.
- componente: com peça com desconto marcada, aparecem "Desconto do Compre Junto − R$ X", o total descontado, o PIX sobre ele e a frase da nota; só peça sem desconto, nenhuma das duas.
- página real: a barra fixa mostra o mesmo total do bloco.
- acessibilidade: o nome acessível da caixa inclui o percentual; o "de/por" lido como "de … por …".

Escrever estes testes é parte da tarefa.

### Obrigações

- RNF-05: "de/por" e a linha do desconto em 390×844 sem rolagem horizontal; grade da linha com `minmax(0,1fr)`; o texto do leitor de tela não pode empurrar a página (o `.sr` precisa de ancestral posicionado dentro da faixa que rola — achado no protótipo).
- Guardas da loja que leem este arquivo: `tomDoCompreJunto.test.ts` (escopo atual, sem exclamação/urgência), `semMaterialNaPaginaDoProduto.test.ts`, `touchTarget.test.ts`, `accentText.test.ts`.

### Não faça

- Não mexa na sacola, no checkout nem em `pricing.ts` (tarefa 03).
- Não edite o barrel de `core/buy-together` nem `purity.test.ts` (tarefa 03, mesma onda).
- Não mostre o desconto no feed do Google nem no JSON-LD (Fora do PRD).
- Não implemente o "Selo" (descartado no gate).

### Pronto quando

- [ ] o bloco mostra "de/por", a linha do desconto e o total descontado nos testes de componente e de página
- [ ] `bundleTotal` chama a função de 01, sem conta própria
- [ ] sem percentual, o bloco é idêntico ao de hoje
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
