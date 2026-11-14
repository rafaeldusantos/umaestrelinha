## 10 · [apps/store] O checkout recebendo o CEP da sacola

**Status:** done

`UC-04 (97); CA-09 (97)` — 99

**Objetivo.** Ao seguir da gaveta para o checkout, o bloco Entrega abre com o CEP, o endereço da busca e a forma de envio
da gaveta já marcados, a linha "Trazido da sua sacola" e o foco esperando o Número.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › "O defeito 01", "Convenções que valem em
todo o repositório"; `apps/store/CLAUDE.md` › "Carrinho, chrome e checkout" (inclusive "O checkout NÃO exige conta"),
"Mobile — o que quebra e não grita". Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a
divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (Checkout · Entrega com o CEP da sacola) e §7 Decisões D-11, D-14.

**Depende de.** Tarefa 06 (`cepOrigin` no rascunho) e 09 (a gaveta grava CEP, escolha e `cepOrigin: 'sacola'`). Confira
que existem antes de começar.

### Critérios de aceite

PRD 97 (verbatim):
- **UC-04 · Seguir para o checkout**
  - "Finalizar Pedido" leva ao checkout como hoje. O bloco Entrega abre com:
    - o CEP preenchido;
    - rua, bairro, cidade e UF vindos da busca pelo CEP (`useCepLookup`, como já acontece ao digitar);
    - a forma de envio da gaveta já marcada;
    - o foco esperando o número.
  - A linha "Trazido da sua sacola · Bela Vista — São Paulo/SP", sob o campo de CEP, diz de onde veio o valor.
  - O checkout cota de novo (o cache é o mesmo, ver RN-01). Se o preço da opção mudou, vale o preço novo. Se a opção
    sumiu da cotação, a escolha é desfeita e a cliente escolhe outra, como hoje quando o CEP muda.
- **CA-09** "Finalizar Pedido" ⇒ o bloco Entrega abre com o CEP, o endereço da busca, a opção da gaveta marcada, a linha
  "Trazido da sua sacola", e o foco no Número.

### Design — o que a tela faz

Bloco Entrega aberto: campo CEP preenchido; abaixo dele "Trazido da sua sacola · Bela Vista — São Paulo/SP" (13px,
`ink-soft`, `role="status"`, precedido de um ponto de 6px em `accent`); Rua, Bairro, Cidade e UF preenchidos pela busca;
o foco no Número; a opção da gaveta marcada.

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `apps/store/src/features/checkout/ui/DeliveryBlock.tsx` (semeadura `:239-246`, preenchimento `:249-262`, troca de CEP `:265-278`) | VOCÊ ALTERA | `cepOrigin` do rascunho | a linha, o foco no Número, a regra do endereço salvo |
| `cepOrigin`, `setCepOrigin`, `deliveryOptions` | JÁ EXISTE (tarefa 06). Consuma; não altere. | | |

### Decisões já tomadas

- D-11 (Pergunta 1 da 97): vale o CEP da gaveta. Se o CEP da gaveta for igual ao do endereço salvo de quem tem conta, o
  endereço salvo inteiro entra (número e complemento) e o bloco abre recolhido como hoje; se for diferente, o endereço
  salvo não é semeado.
- D-14: a linha aparece só com `cepOrigin === 'sacola'` e some ao digitar outro CEP no checkout (o `setAddress` do
  checkout zera `cepOrigin`).
- A linha usa "Bairro — Cidade/UF" da busca; sem a busca, "Trazido da sua sacola" sozinho.
- O foco no Número acontece uma vez, quando o bloco abre com `cepOrigin === 'sacola'` e o número vazio.

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| semeadura do endereço salvo e preenchimento pela busca | `DeliveryBlock.tsx:239-262` |

### Testes

- componente: com o rascunho vindo da gaveta (CEP, escolha, `cepOrigin: 'sacola'`), o bloco abre com o CEP, a rua/bairro/
  cidade/UF da busca, a opção marcada, a linha "Trazido da sua sacola · Bairro — Cidade/UF" e o foco no Número (CA-09).
- componente: a opção da gaveta que sumiu da cotação é desfeita; preço novo vale.
- componente: digitar outro CEP no checkout tira a linha.
- componente: quem tem conta com endereço salvo de CEP igual recebe o endereço inteiro e o bloco recolhido; com CEP
  diferente, o endereço salvo não entra.
- componente: sem `cepOrigin`, o bloco é o de hoje.

### Obrigações

- `apps/store/src/pages/__tests__/CheckoutPage*.test.tsx` e `checkoutSobreviveAVoltaDaAba.test.tsx` continuam verdes
  (ajuste o arnês sem afrouxar).
- O ponto em `accent` é decoração (não é texto): `accentText` continua verde.
- `touchTarget` e `fieldBorder` verdes.

### Não faça

- Não altere a gaveta (`widgets/cart-drawer/**`), `deliveryOptions.ts`, `ShippingOptionCard.tsx`, `checkoutStore.ts` ou
  `OrderSummary.tsx`.
- Não emita `add_shipping_info` diferente de hoje.

### Pronto quando

- [ ] CA-09 provado no componente
- [ ] a regra do endereço salvo × CEP da gaveta provada
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
