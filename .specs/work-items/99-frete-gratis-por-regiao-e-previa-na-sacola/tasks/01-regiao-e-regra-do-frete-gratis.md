## 01 · [store/packages/core] A região do CEP e a regra do frete grátis

**Status:** done

`UC-07, UC-08, UC-09, UC-10 (regra); RN-13, RN-14, RN-15, RN-19` — 99

**Objetivo.** A regra do frete grátis passa a saber o destino: a região sai do CEP num dono só, e o estado separa "o
valor atingiu a faixa" de "o frete grátis foi concedido".

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › "O defeito 01", "Convenções que valem em
todo o repositório" (o `strictNullChecks: false`), "Alias de import" (`.ts` explícito para o Deno), "Os guardas — o que
trava o quê", "Baselines"; `packages/core/CLAUDE.md` › "Pureza", "Os módulos", "Dinheiro". Divergindo desta tarefa
sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · spec.md — Código (e §7 Decisões D-01..D-04, D-06).

**Habilita.** Todas as outras tarefas: `region.ts`, o estado novo (`destination`, `granted`), `freeShippingConfigOf` e
a recusa de região.

### Critérios de aceite

PRD 99 (verbatim):
- **RN-13 · A região sai do CEP, por faixa numérica, num dono só.** Função pura em `packages/core/src/shipping/`
  (arquivo-folha sem import, alcançável pelo Deno com `.ts` explícito, no molde de `pickup.ts`): Sudeste = CEP
  01000-000 a 39999-999 (SP, RJ, ES, MG); Sul = 80000-000 a 99999-999 (PR, SC, RS); as outras três regiões pelas
  faixas dos Correios. CEP inválido ⇒ região desconhecida. Nenhuma tela e nenhuma function decide região por conta
  própria. CEP incompleto ou de região desconhecida vale, na tela, como "sem CEP" (r1, PR-02). O rótulo das regiões
  ("Sul e Sudeste") é montado num dono só a partir da configuração, em ordem fixa (Sul, Sudeste,
  Centro-Oeste, Nordeste, Norte), com "e" antes da última; com as cinco marcadas, os textos não falam de região (r1, PR-10).
- **RN-14 · A regra continua tendo um dono: `freeShippingState`.** Ela passa a receber o destino (o CEP, ou `null`
  sem CEP) e as regiões da configuração. Invariantes de hoje mantidas (desligado ⇒ nunca `reached`; faixa ≤ 0 ⇒
  inativo). Invariantes novas:
  - CEP fora das regiões ⇒ `reached: false` em qualquer subtotal, com um campo que diga "fora da região" (a faixa
    usa para escolher o desenho do UC-09);
  - sem CEP ⇒ o estado diz quanto falta, mas não é "liberado" (UC-07), salvo com as cinco regiões marcadas;
  - o estado separa "o valor atingiu a faixa" de "o frete grátis foi concedido" (este exige destino dentro das
    regiões, ou as cinco marcadas). Quem zera o frete ou diz "liberado" lê o segundo (r1, PR-01).
  `freeShippingSingleOwner.test.ts` continua valendo e ganha as asserções de região.
- **RN-15 · Campo ausente = todas as regiões.** A configuração nova nasce com as cinco regiões marcadas, e a linha
  antiga (sem o campo) vale como as cinco, então o deploy **não muda nada** para quem já usa o frete grátis. Sul +
  Sudeste é uma escolha da dona no painel para a campanha. Lista vazia com o interruptor ligado deixa o frete grátis
  inativo (como a faixa ≤ 0), e o painel recusa gravá-la (r1, PR-02).
- **RN-19 · A base do valor da faixa não muda**: o valor das peças, já com o preço da campanha, antes do cupom e do
  desconto progressivo, como hoje em cada caminho (r1, PR-05).
- **CA-19** Com as cinco regiões marcadas (o padrão), o comportamento é idêntico ao de hoje para qualquer CEP.

Nota de leitura (Decisão D-01): o "`reached: false`" de RN-14 para CEP fora é a resposta "não concedido": no estado, o
campo `reached` continua "o valor atingiu a faixa", e o concedido é `granted`, que é `false` com CEP fora em qualquer
subtotal.

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `packages/core/src/shipping/region.ts` | VOCÊ CRIA | CEP (string com ou sem máscara) / lista de slugs | `regionOfCep(cep) → RegionSlug \| null`; `FREE_SHIPPING_REGIONS` (os cinco slugs na ordem fixa); rótulo e estados de cada região; `regionsLabel(slugs) → string \| null` (null com as cinco); a frase da regra do ⓘ |
| `freeShippingState(config, subtotal, destinationCep?)` | VOCÊ ALTERA | `FreeShippingConfig` com `free_shipping_regions?`; subtotal; CEP ou `null` | o estado de hoje + `destination: 'inside' \| 'outside' \| 'unknown'`, `granted`, `regions` (as efetivas) e `regionLimited` |
| `freeShippingConfigOf(raw)` | VOCÊ CRIA (em `freeShipping.ts`) | o objeto cru de `store_settings.shipping` (ou parcial) | `FreeShippingConfig` com interruptor, faixa e regiões; regiões ausentes ⇒ as cinco; valor inválido descartado |
| `freeShippingRefusal(config)` | VOCÊ ALTERA | config | `string \| null`; ligado com lista vazia ⇒ motivo; desligado com lista vazia ⇒ `null` |
| `packages/core/src/shipping/index.ts` | VOCÊ ALTERA | — | `export * from './region.ts'` |

### Decisões já tomadas

- D-01: `reached` = o valor atingiu a faixa (semântica de hoje). `granted = reached && (destination === 'inside' ||
  !regionLimited)`. `regionLimited` = as regiões efetivas não são as cinco. Sem CEP ⇒ `destination: 'unknown'`.
- D-02: campo ausente = as cinco; lista vazia com ligado = estado inativo (como faixa ≤ 0); CEP incompleto ou
  desconhecido ⇒ `unknown`.
- D-04: faixas (5 dígitos iniciais): Sudeste 01000–39999; Sul 80000–99999; Nordeste 40000–65999; Norte 66000–69999,
  76800–76999, 77000–77999, 78900–78999; Centro-Oeste 70000–76799, 78000–78899, 79000–79999; fora disso desconhecida
  (ex.: 00000–00999). Slugs `norte`, `nordeste`, `centro-oeste`, `sudeste`, `sul`; rótulos "Norte", "Nordeste",
  "Centro-Oeste", "Sudeste", "Sul"; estados: Norte (AC, AP, AM, PA, RO, RR, TO), Nordeste (AL, BA, CE, MA, PB, PE, PI,
  RN, SE), Centro-Oeste (DF, GO, MT, MS), Sudeste (SP, RJ, MG, ES), Sul (PR, SC, RS).
- D-06: rótulo em ordem fixa **Sul, Sudeste, Centro-Oeste, Nordeste, Norte**, "e" antes da última: Sul + Sudeste ⇒
  "Sul e Sudeste" (como no PRD e no protótipo); com as cinco, `null`.
- A frase da regra (ⓘ), montada da config: "Compras a partir de R$ 450,00 têm frete grátis para entregas no Sul (PR,
  SC, RS) e no Sudeste (SP, RJ, MG, ES). A região é conferida pelo CEP." — o valor vem de `formatPrice` da faixa; com as
  cinco regiões, "Compras a partir de R$ 450,00 têm frete grátis." (sem região). O artigo é "no" para todas ("no
  Norte", "no Nordeste", "no Centro-Oeste", "no Sudeste", "no Sul").
- Recusa nova: "Escolha ao menos uma região para o frete grátis, ou desligue o frete grátis." (tom da loja, sem "!").
- `strictNullChecks: false`: veredito `string | null`; `destination` é união de literais de string.

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| folha sem import alcançável pelo Deno | `packages/core/src/shipping/pickup.ts` (inteiro) e `__tests__/pickup.test.ts` |
| estado com invariantes e objeto inativo congelado | `freeShipping.ts` › `INATIVO`, `freeShippingState` |
| recusa `string \| null` | `freeShipping.ts` › `freeShippingRefusal` |
| guarda de alcance | `packages/core/src/shipping/__tests__/denoReach.test.ts` › `ENTRADAS` |

### Testes

- unidade (core): CEP → região na primeira e na última posição de cada faixa (inclusive RO 76800/76999 e 78900/78999,
  TO 77000/77999, DF/GO 70000/76799, MT 78000/78899, MS 79000/79999, SP 01000, MG 39999, PR 80000, RS 99999); CEP com
  máscara; vazio, incompleto, com letras e 00000-000 ⇒ desconhecida.
- unidade (core): rótulo das regiões ("Sul e Sudeste" para `['sudeste','sul']` em qualquer ordem de entrada; uma só; três; as cinco ⇒ nenhum) e a frase da regra.
- unidade (core): o estado — desligado nunca concede, com ou sem CEP; cinco regiões sem CEP igual a hoje (CA-19, campo a
  campo); regiões limitadas sem CEP abaixo diz quanto falta e não concede; acima sem CEP `reached` e não `granted`;
  CEP de SP e de RS acima concedido; CEP da BA `outside` e não concedido em qualquer subtotal; regiões ausentes valem
  as cinco; lista vazia com ligado ⇒ inativo; o inativo continua congelado.
- unidade (core): `freeShippingConfigOf` com o objeto completo, sem `free_shipping_regions`, com lista inválida, com
  `null`.
- unidade (core): a recusa — ligado sem região recusa; desligado sem região passa; as recusas de hoje intactas.
- guarda: `denoReach` (shipping) passa a ter `region.ts` em `ENTRADAS`, com sensor de import sem `.ts`.

### Obrigações

- `freeShipping.test.ts:84`, `:114`, `:123` comparam a forma do estado com `toEqual`: reescreva com os campos novos,
  **ganhando** casos; nunca troque por `toMatchObject`.
- `region.ts` sem import nenhum; `freeShipping.ts` importa `./region.ts` com a extensão.
- Comentários não escrevem por extenso a forma de import proibida (o bundler do `supabase start` morre por comentário);
  descreva-a.
- `packages/core/src/proposals/__tests__/purity.test.ts` precisa continuar verde (o grafo de `proposals` passa a incluir
  `region.ts`).

### Não faça

- Não mude chamadores (`useFreeShipping`, `cartStore`, `DeliveryBlock`, `OrderSummary`, `CartDrawer`, `proposals`,
  functions): são das tarefas 03, 04, 06, 09. Mantenha a assinatura compatível (o terceiro parâmetro é opcional).
- Não toque `packages/core/src/payment/**`.
- Não crie migration nem tipo em `packages/supabase` (tarefa 03): `FreeShippingConfig` declara o campo opcional.

### Pronto quando

- [ ] `regionOfCep` responde as cinco regiões e `null` nas bordas listadas
- [ ] com as cinco regiões, `freeShippingState` devolve o mesmo que hoje para qualquer CEP e sem CEP, mais os campos novos coerentes
- [ ] com Sul + Sudeste: SP/RS acima concedido; BA `outside`; sem CEP acima `reached` e não `granted`
- [ ] a recusa de região existe e o desligado com lista vazia passa
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
