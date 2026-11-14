## 11 · [apps/store, docs] O mesmo Total na gaveta e no checkout, e o fecho da feature

**Status:** done

`CA-04 (97), CA-16, CA-17 (paridade); fecho` — 99

**Objetivo.** Fica provado, com as stores reais, que a gaveta e o checkout dão o mesmo Total para a mesma sacola, o mesmo
CEP e a mesma opção; e a documentação e as baselines do repositório registram a feature.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › "Os guardas — o que trava o quê",
"Baselines", "Estado conhecido / dívidas", "O que espera decisão da dona, não código"; `apps/store/CLAUDE.md` › "Frete
grátis — um interruptor e um dono só (feature 37)", "Carrinho, chrome e checkout"; `apps/backoffice/CLAUDE.md` ›
"Configurações › Frete — o interruptor do frete grátis"; `packages/core/CLAUDE.md` › "Os módulos"; `supabase/CLAUDE.md` ›
"Migrations". Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · spec.md — Código (Testes, Obrigações) e §8 Não resolvido.

**Depende de.** Tarefas 01..10 fechadas.

### Critérios de aceite

PRD 97 (verbatim):
- **CA-04** A mais barata vem marcada e o Total soma o frete; o Total da gaveta é igual ao do resumo do checkout com a
  mesma opção, cupom e promoção.

PRD 99 (verbatim):
- **CA-16** CEP 01310-100 (SP) ou 90010-000 (RS), sacola acima da faixa: "Frete grátis liberado", a mais barata
  "Grátis" com o valor riscado, Total sem frete — na gaveta e no checkout, com o mesmo Total.
- **CA-17** CEP 40020-000 (BA), sacola acima da faixa: "Frete grátis só para Sul e Sudeste", sem barra, frete da
  cotação somado ao Total — na gaveta e no checkout.

Fecho (CLAUDE.md raiz, "Ao fechar uma feature, atualize as baselines … e o `CLAUDE.md` do módulo que ela mexeu").

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `apps/store/src/test/sacolaECheckoutMesmoTotal.test.tsx` | VOCÊ CRIA | as stores reais (`cartStore`, `useCheckoutStore`), a cotação dublada | a paridade dos Totais |
| `CLAUDE.md` (raiz), `apps/store/CLAUDE.md`, `apps/backoffice/CLAUDE.md`, `packages/core/CLAUDE.md`, `supabase/CLAUDE.md` | VOCÊ ALTERA | — | o registro da feature |

### Decisões já tomadas

- Numeração: no `CLAUDE.md` raiz, este trabalho é o **WI 99** (pasta `.specs/work-items/99-…`), na mesma forma dos WIs
  98 e 102 já registrados lá.
- Registrar em "O que espera decisão da dona": as regiões nascem com as cinco; Sul + Sudeste é escolha dela no painel.
- Registrar em "Estado conhecido / dívidas": PR-11 (o pedido montado zera qualquer opção), a Pergunta 2 (o pedido comum
  não confere o frete no servidor), a faixa 78900–78999 por `[conhecimento]`, e a ordem de publicação migration →
  functions (`checkout`, `mercado-pago`) → bundles.
- Na tabela dos guardas, acrescentar as réguas novas (`freeShippingSingleOwner` com região e `supabase/functions`,
  `storeSettingsDefaults` com a migration da 99, `denoReach` com `region.ts`).
- Baselines: medir os workspaces tocados um por vez, exit code fora de pipe, `--testTimeout=20000` sem o `--`, e
  registrar os números medidos (nunca somados).

### Testes

- integração (stores reais): mesma sacola, CEP de SP com a faixa alcançada e Sul + Sudeste ⇒ gaveta e checkout com o
  mesmo Total sem frete (CA-16); CEP da BA ⇒ os dois com o mesmo Total com o frete cotado (CA-17); com cupom e promoção,
  o mesmo Total (CA-04).

### Obrigações

- `brandScan` e os guardas que leem prosa: ao documentar uma forma proibida, descreva-a, não a escreva (raiz, nota dos
  guardas).
- Não altere a regra nem os componentes: só o teste novo e a documentação.

### Não faça

- Não mexa em código de produto. Achado de defeito vai no retorno, não é consertado aqui.
- Não aplique migration no hospedado; não faça push.

### Pronto quando

- [ ] o teste de paridade passa nos três cenários
- [ ] os cinco `CLAUDE.md` registram a feature, os guardas, a dívida e o que espera a dona
- [ ] as baselines medidas e registradas
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
