## 08 · [apps/store] A faixa v2 do frete grátis na gaveta (`FreeShippingBand`)

**Status:** done

`M-01, M-02, M-03 (uso); UC-07, UC-08, UC-09; CA-14, CA-15; RN-17` — 99

**Objetivo.** A faixa do frete grátis vira uma linha compacta com ⓘ e ganha os desenhos de região (liberado, para Sul e
Sudeste sem CEP, só para Sul e Sudeste fora), num componente isolado que a gaveta monta na tarefa 09.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › "Convenções que valem em todo o
repositório", "Os guardas — o que trava o quê" (`accentText`, `contrast`, `touchTarget`, `freeShippingSingleOwner`);
`apps/store/CLAUDE.md` › "Design system", "Carrinho, chrome e checkout", "Frete grátis — um interruptor e um dono só
(feature 37)", "Mobile — o que quebra e não grita". Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções
manda, e a divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (A faixa do frete grátis) e §7 Decisões D-01, D-06, D-10, D-17.

**Depende de.** Tarefa 01 (estado com `reached`/`granted`/`destination`/`regions`, `regionsLabel`, a frase da regra) e
02 (`InfoTip`). Confira que existem antes de começar.
**Habilita.** A tarefa 09 monta `FreeShippingBand` em `CartDrawer.tsx`.

### Critérios de aceite

PRD 99 (verbatim):
- **M-01 · A faixa do frete grátis vira uma linha.** "Faltam R$ 48,17 para o frete grátis" com o ⓘ ao lado, o valor
  "R$ 401,83 / R$ 450,00" à direita e a barra embaixo. A frase "Vale para…" sai da faixa e vai para o ⓘ.
- **M-02 · Faixa alcançada ganha destaque.** Fundo em ouro (`accent`), texto em `ink` (regra de contraste da marca:
  dentro de superfície ouro, texto sólido `ink`), um ✓ e "Frete grátis liberado" em negrito. Sem barra (cheia, ela não
  diz nada).
- **UC-07 · A faixa sem CEP**
  - Faltando: "Faltam R$ X para o frete grátis" + ⓘ + valor/faixa + barra. O ⓘ diz: "Compras a partir de R$ 450,00 têm
    frete grátis para entregas no Sul (PR, SC, RS) e no Sudeste (SP, RJ, MG, ES). A região é conferida pelo CEP." —
    os valores e as regiões vêm da configuração, nunca escritos na copy.
  - Faixa alcançada sem CEP: destaque em ouro, "Frete grátis para Sul e Sudeste" + ⓘ ("… Informe o CEP abaixo para
    confirmar."). **Não** diz "liberado" sem saber o destino. Com as cinco regiões marcadas, a faixa alcançada diz
    "Frete grátis liberado" mesmo sem CEP, como hoje (r1, PR-01).
- **UC-08 · A faixa com CEP de uma região da campanha**
  - Faltando: igual ao UC-07.
  - Alcançada: "Frete grátis liberado" com destaque; ⓘ: "Entrega em São Paulo/SP, região Sudeste. A forma de envio mais
    barata sai sem custo." A opção mais barata aparece "Grátis" com o valor riscado, e o Total não soma frete. *(Aqui:
    a faixa; a opção e o Total são da tarefa 09.)*
- **UC-09 · A faixa com CEP fora da campanha**
  - Uma linha neutra, sem barra e sem "faltam": "Frete grátis só para Sul e Sudeste" + ⓘ ("Para Salvador/BA, o frete é
    o da cotação. …"). O frete cobrado é o da cotação, em qualquer valor de sacola.
  - Trocar para um CEP da campanha volta a faixa normal na hora.
- **CA-14** Sem CEP, sacola abaixo da faixa: "Faltam R$ X para o frete grátis", barra, ⓘ com a regra e as regiões
  lidas da configuração; nenhum "liberado".
- **CA-15** Sem CEP, sacola acima da faixa: destaque em ouro, "Frete grátis para Sul e Sudeste", nenhum "liberado".
- **RN-17 · Tom.** "Frete grátis só para Sul e Sudeste" é informação, não recusa: sem exclamação, sem "infelizmente".
  O ⓘ explica em uma ou duas frases.
- **RN-18** (trecho): com cupom de frete grátis aplicado, a faixa da região some (r1, PR-04).

### Design — o que a tela faz

- Abaixo da faixa (sem CEP, ou com CEP que não está fora): fundo `ground-deep`, padding 9px 20px 11px, 7px entre linha e
  barra. Linha (altura mínima 22px): à esquerda "Faltam R$ 48,17 para o frete grátis" + ⓘ (12,5px/18, 600, `primary`);
  à direita "R$ 401,83 / R$ 450,00" (11px, 500, `ink-soft`, não encolhe). Barra de 5px, trilho branco, preenchimento
  `primary`, raio 999, `role="progressbar"` 0–100 com rótulo "Progresso para o frete grátis"; a largura anima em 400ms
  (sem animação com menos movimento).
- Acima, sem CEP, regiões limitadas: fundo `accent`, padding 10px 20px, sem barra, `role="status"`; selo de 20px
  (círculo `ink` com ✓ de 12px em `accent`); "Frete grátis para Sul e Sudeste" + ⓘ (13px, 700, `ink`). Balão: a regra +
  " Informe o CEP abaixo para confirmar."
- Acima, CEP da campanha (ou as cinco regiões, com ou sem CEP): o mesmo destaque, "Frete grátis liberado" + ⓘ. Balão com
  CEP: "Entrega em São Paulo/SP, região Sudeste. A forma de envio mais barata sai sem custo." (cidade/UF da busca do CEP;
  sem a busca, "Entrega na região Sudeste. A forma de envio mais barata sai sem custo."); com as cinco e sem CEP, a regra.
- CEP fora, qualquer subtotal: fundo `ground-deep`, padding 10px 20px, sem barra e sem valor/faixa, `role="status"`;
  "Frete grátis só para Sul e Sudeste" + ⓘ (12,5px, 500, `ink-soft`). Balão: "Para Salvador/BA, o frete é o da cotação. "
  + a regra (sem a busca: "Para este CEP, o frete é o da cotação. " + a regra).
- Interruptor desligado ou cupom de frete grátis aplicado: a faixa não é renderizada.
- O ⓘ com rótulo "Sobre o frete grátis".

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `apps/store/src/widgets/cart-drawer/ui/FreeShippingBand.tsx` | VOCÊ CRIA | o estado do frete grátis (de `useFreeShipping(subtotal, cep)`), o subtotal, a cidade/UF opcional, se há cupom de frete grátis, um alvo de colisão opcional para o balão | a faixa nos quatro desenhos (ou nada) |
| `InfoTip` (`apps/store/src/shared/ui/InfoTip.tsx`) | JÁ EXISTE (tarefa 02). Consuma; não altere. | | |
| `regionsLabel`, a frase da regra (`freeShippingRuleText(config)`, em `freeShipping.ts`), `regionOfCep` | JÁ EXISTE (tarefa 01). Consuma; não altere. | | |

### Decisões já tomadas

- D-01: "liberado" só com `granted`; `destination === 'outside'` ⇒ o desenho neutro; `reached && !granted` sem CEP ⇒ "para
  Sul e Sudeste".
- D-06: o rótulo "Sul e Sudeste" vem de `regionsLabel`; nenhum nome de região cravado na copy.
- D-10: a cidade/UF vem da busca do CEP (quem busca é a tarefa 09; aqui é prop); a UF nunca decide a região.
- D-17: com cupom de frete grátis, a faixa some.
- O selo: círculo `ink` (`bg-estrelinha-ink`) com o ✓ em `accent` desenhado por traço (`stroke-estrelinha-accent`/
  `stroke-current` com a cor do traço), nunca por `text-estrelinha-accent` (que cai na régua de `accentText.test.ts:30`);
  o texto da faixa ouro é `text-estrelinha-ink` sólido (PR-16).

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| a faixa de hoje (para remover sem perder comportamento) | `CartDrawer.tsx:184-216` |
| texto `ink` sólido sobre `accent` | `apps/store/src/shared/lib/__tests__/accentText.test.ts:164-182` |

### Testes

- componente: os quatro desenhos (abaixo; alcançada sem CEP com regiões limitadas; liberada com CEP de SP e com as cinco
  sem CEP; fora com CEP da BA) com os textos exatos e os valores da configuração.
- componente: nenhum "liberado" sem CEP com regiões limitadas (CA-14, CA-15).
- componente: o balão de cada desenho com o texto da regra montado da configuração (outra faixa e outras regiões mudam o
  texto).
- componente: sem faixa com o interruptor desligado e com cupom de frete grátis.
- componente: a barra com `role="progressbar"` e o valor; sem barra nos desenhos alcançado e fora; o par `motion-reduce:`
  da barra; o destaque com `bg-estrelinha-accent` e `text-estrelinha-ink` sem opacidade.

### Obrigações

- `accentText.test.ts`, `contrast.test.ts`, `arbitraryTextColor.test.ts` verdes (só tokens).
- `freeShippingSingleOwner.test.ts`: nenhum valor cravado; nada lê os campos crus.
- Tom (RN-17): sem "!", sem "infelizmente". O "Faltam … para frete grátis!" de hoje não volta.

### Não faça

- Não monte a faixa na gaveta nem altere `CartDrawer.tsx` (tarefa 09).
- Não faça a busca do CEP aqui (prop).

### Pronto quando

- [ ] os quatro desenhos e a ausência de faixa provados com os textos exatos
- [ ] o balão de cada desenho com a regra da configuração
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
