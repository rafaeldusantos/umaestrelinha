## 07 · [apps/store] As superfícies que anunciam o frete grátis

**Status:** done

`UC-11; CA-24` — 99

**Objetivo.** A barra de confiança da Home, o aviso do `AuthOverlay` e o cálculo de frete da página do produto dizem a
região quando anunciam o frete grátis, lida da configuração.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › "O defeito 01", "Os guardas — o que trava
o quê" (`freeShippingSingleOwner`); `apps/store/CLAUDE.md` › "Frete grátis — um interruptor e um dono só (feature 37)"
(inclusive a decisão de 2026-09-11 sobre a página do produto). Divergindo desta tarefa sobre COMO fazer, o arquivo de
instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · spec.md — Código (e §7 Decisões D-06, D-16).

**Depende de.** Tarefa 01 (`regionsLabel`) e 03 (`useFreeShipping`, o estado com `regions`/`regionLimited`). Confira que
existem antes de começar.

### Critérios de aceite

PRD 99 (verbatim):
- **UC-11 · As outras superfícies que anunciam o frete grátis**
  - Barra de confiança da Home (`TrustBar`), cálculo de frete da página do produto (`features/shipping-calc`) e aviso do
    `AuthOverlay`: quando anunciam o frete grátis, dizem a região ("Frete grátis acima de R$ 450,00 · para Sul e
    Sudeste"), lida da mesma configuração. A faixa de avisos (WI 101) é texto livre da dona e fica fora: ela escreve a
    região no aviso (r1, PR-07).
  - A página do produto **não** zera nem risca o frete: com o frete grátis ativo, mostra só uma linha de texto com a
    faixa e a região (r1, PR-06).
- **CA-24** Barra de confiança, cálculo da página do produto e `AuthOverlay` mostram a região quando anunciam o frete
  grátis, lida da configuração; a página do produto não zera nem risca frete (r1, PR-06).
- **RN-17 · Tom.** "Frete grátis só para Sul e Sudeste" é informação, não recusa: sem exclamação, sem "infelizmente".
  O ⓘ explica em uma ou duas frases.

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `apps/store/src/widgets/home-sections/ui/TrustBar.tsx` (`:27`, `:48-50`) | VOCÊ ALTERA | o estado de `useFreeShipping` | "… · para Sul e Sudeste" com regiões limitadas; o texto de hoje com as cinco |
| `apps/store/src/features/auth/ui/AuthOverlay.tsx` (`:49-52`) | VOCÊ ALTERA | idem | idem |
| `apps/store/src/features/shipping-calc/ui/ShippingCalc.tsx` | VOCÊ ALTERA | idem | com o frete grátis ativo, uma linha de texto com a faixa e a região; nenhum preço riscado nem "Grátis" novo |
| `regionsLabel`, `useFreeShipping` | JÁ EXISTE (tarefas 01, 03). Consuma; não altere. | | |

### Decisões já tomadas

- D-06: com as cinco regiões, o rótulo é `null` e o texto é o de hoje (sem região).
- D-16: a página do produto só mostra o texto; a faixa de avisos fica fora.
- Formato: "Frete grátis acima de R$ 450,00 · para Sul e Sudeste" (o valor por `formatPrice`, nunca cravado).
- `ShippingCalc`: a linha aparece com o interruptor ligado e a faixa > 0; não depende do CEP consultado.

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| anúncio derivado da config | `TrustBar.tsx:48-50`, `AuthOverlay.tsx:50-52` |

### Testes

- componente: `TrustBar` com Sul + Sudeste diz "· para Sul e Sudeste"; com as cinco, o texto de hoje; desligado, sem
  anúncio.
- componente: `AuthOverlay`, os mesmos três casos.
- componente: `ShippingCalc` com o frete grátis ativo mostra a linha com faixa e região; com a cotação, nenhuma opção sai
  "Grátis" riscada (só a retirada continua "Grátis" como hoje); desligado, sem a linha.

### Obrigações

- `freeShippingSingleOwner.test.ts`: nenhum valor cravado em copy; nada lê os campos crus; a âncora de ≥ 7 usos de
  `useFreeShipping` continua valendo (a página do produto passa a ser mais um uso).
- Tom (RN-17): sem "!".

### Não faça

- Não mexa na gaveta, no checkout nem no painel.
- Não leve o CEP da página do produto para a sacola (fora, Pergunta 4 da 97).

### Pronto quando

- [ ] as três superfícies dizem a região com regiões limitadas e o texto de hoje com as cinco
- [ ] a página do produto não zera nem risca frete
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
