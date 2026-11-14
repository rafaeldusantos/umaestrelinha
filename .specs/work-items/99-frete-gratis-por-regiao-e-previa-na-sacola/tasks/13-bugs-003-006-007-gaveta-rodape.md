## 13 · [apps/store] BUG-003, BUG-006, BUG-007 — Sacola (gaveta) · rodapé da sacola

**Status:** done

`BUG-003, BUG-006, BUG-007 (QA rodada 1)` — 99

**Objetivo.** O rodapé da gaveta fica dentro do teto de 270 px a 390 × 844 com o frete escolhido, com o ícone do "Finalizar Pedido" e o espaçamento da linha recolhida do frete como no protótipo v2.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › "Convenções que valem em todo o
repositório" (mobile), "Os guardas — o que trava o quê" (`touchTarget`, `accentText`, `contrast`); `apps/store/CLAUDE.md` ›
"Design system", "Carrinho, chrome e checkout", "Mobile — o que quebra e não grita". Divergindo desta tarefa sobre COMO
fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** Tarefas 01..11 fechadas (`done`). Confira que o código delas existe antes de começar.

### Critérios de aceite

### BUG-003 — [Sacola · rodapé] Com o frete escolhido, o rodapé mede 276 px no celular e passa do teto de 270 px

### BUG-003 · [Sacola · rodapé] Com o frete escolhido, o rodapé mede 276 px no celular e passa do teto de 270 px

#### Resumo

Luana, no celular, calcula o frete na sacola e escolhe o PAC: a lista recolhe numa linha. Com isso, o rodapé fixo da
gaveta (do frete escolhido até "Finalizar Pedido") ocupa 276 px da tela, 6 px acima do teto que o Work Item fixou para
que as peças continuem à vista. Ela conclui sem esforço a mais: as peças continuam visíveis acima. Mas o critério de
aceite do rodapé compacto não fecha.

**Origem:** sessão CH-08 · CH-07 · local (loja em http://localhost:8082)

#### Impacto

- **Nível:** Cosmético. São 6 px a mais, as peças continuam visíveis, e nada atrapalha concluir nem confiar
- **Persona mais atingida:** PER-01 Luana (390 × 844) — outras: nenhuma
- **Jornada e passo:** J-01, passo 3 (escolhe o frete)
- **Frequência:** sempre (2 leituras na CH-08 e a mesma medida na CH-07)
- **Contorno:** nenhum necessário
- **Gravidade proposta na sessão:** low — mantida. É o CA-23 que não fecha. A severidade é pelo impacto na persona, não
  pelo critério

#### Ambiente

- **URL:** http://localhost:8082 (gaveta da sacola aberta sobre a página do produto)
- **Tela:** Sacola (gaveta) · **Componente:** rodapé da sacola (linha do frete escolhido, "Tem um cupom?", totais,
  "Finalizar Pedido")
- **Branch / build:** `feature/99` (worktree `store__feature-99`), dev server; build não exposto
- **Browser:** Chromium headless (playwright-cli 0.1.24) · **Viewport:** 390 × 844, fonte da raiz 16 px (100 %)
- **Rede:** local; cotação interceptada com a fixture A · **Idioma:** pt-BR

#### Passos

1. Na loja `http://localhost:8082`, anônima, com a sacola vazia, a cotação interceptada pela fixture A e o viewport em
   390 × 844
2. Ponha na sacola uma peça abaixo de R$ 450 (por exemplo, "Pingente Afetivo mini Coração com Cinzas de Cremação", R$ 179,90)
3. Na gaveta, digite 01310-100, toque em "Calcular" e toque no PAC para recolher a lista
4. Meça a altura do rodapé fixo da gaveta, da linha recolhida do frete até "Finalizar Pedido"

#### Esperado

Rodapé com no máximo 270 px com o frete escolhido e a fonte a 100 %, sem nota abaixo do Total e sem rolagem horizontal.

**Fonte:** PRD 99 CA-23, M-06, M-07; TC-CFR-001 passo 2 (a meta diz "acima é `fail`")

#### Observado

Rodapé de 276 px (`getBoundingClientRect().height` 276, `clientHeight` 275), de y 568 a 844. Ele se compõe de:

- linha recolhida do frete: 65 px, com o prazo em duas linhas;
- "Tem um cupom?": 44 px;
- Subtotal, "Frete · PAC R$ 21,40" e Total;
- "Finalizar Pedido": 48 px.

Não há nota abaixo do Total, e o `scrollWidth` é 390. Sem CEP, o mesmo rodapé mede 255 px.

#### Evidência

- `screenshots/CH-07-05-frete-recolhido.png`: o rodapé com o frete escolhido recolhido, a 390. A CH-07 mediu 276 px
  nesse estado
- medida do DOM na CH-08, passo 08 (duas leituras, 276 e 276)

#### Ocorrências

| Sessão | Persona      | Passo                       | Evidência                                    |
| ------ | ------------ | --------------------------- | -------------------------------------------- |
| CH-08  | PER-01 Luana | 08 (PAC recolhido, 100 %)   | DOM (sem screenshot do estado)               |
| CH-07  | PER-01 Luana | 05 (PAC recolhido)          | `screenshots/CH-07-05-frete-recolhido.png`   |

#### Relacionados

- **TC:** TC-CFR-001
- **Charter:** CH-08, CH-07
- **Critério:** CA-23 (PRD 99)
- **Protótipo:** `Black Friday - Sacola v2.html` › rodapé (régua de apoio do `item.md`: ~265 px com o frete recolhido)
- **Bugs:** BUG-007 (o espaçamento da mesma linha recolhida)

### BUG-006 — [Sacola · Finalizar Pedido] O ícone da sacola no botão tem 16 px, o protótipo pede 20 px

### BUG-006 · [Sacola · Finalizar Pedido] O ícone da sacola no botão tem 16 px, o protótipo pede 20 px

#### Resumo

No rodapé da gaveta, o botão "Finalizar Pedido" está como no desenho na altura, no raio, na cor e no texto. Só o ícone
da sacola dentro dele é menor: 16 px em vez de 20 px.

**Origem:** sessão CH-07 · local (loja em http://localhost:8082)

#### Impacto

- **Nível:** Cosmético. É um ícone 4 px menor, sem efeito em entender nem tocar o botão
- **Persona mais atingida:** PER-01 Luana (390 × 844) — outras: nenhuma
- **Jornada e passo:** J-01, passo 5 (vai ao checkout)
- **Frequência:** sempre (2 leituras)
- **Contorno:** nenhum necessário
- **Gravidade proposta na sessão:** low — mantida

#### Ambiente

- **URL:** http://localhost:8082 (gaveta da sacola)
- **Tela:** Sacola (gaveta) · **Componente:** rodapé da sacola — botão "Finalizar Pedido"
- **Branch / build:** `feature/99` (worktree `store__feature-99`), dev server; build não exposto
- **Browser:** Chromium headless (playwright-cli 0.1.24, DPR 1) · **Viewport:** 390 × 844
- **Rede:** local; cotação interceptada com a fixture A · **Idioma:** pt-BR

#### Passos

1. Na loja `http://localhost:8082`, anônima, a 390 × 844, ponha uma peça na sacola
2. Com a gaveta aberta, meça o ícone do botão "Finalizar Pedido"

#### Esperado

Ícone de sacola de 20 px, a 10 px do texto.

**Fonte:** protótipo `Black Friday - Sacola v2.html` › `bf-sacola-v2.jsx` `.cta2` (`<DSG.Icon name="sacola" size={20} />`);
`spec.md` › Design › "Finalizar Pedido"; TC-UI-002

#### Observado

O svg do ícone mede 16 px. Altura 48 px, raio 12, fundo `primary` e texto 15 700 batem.

#### Evidência

- `screenshots/CH-07-01-abaixo-sem-cep.png`: o rodapé com o botão "Finalizar Pedido" a 390

#### Design × implementado

| Propriedade     | Protótipo    | Observado    | Confere |
| --------------- | ------------ | ------------ | ------- |
| Ícone da sacola | 20 px        | 16 px        | não     |
| Altura          | 48 px        | 48 px        | sim     |
| Raio            | md (12 px)   | 12 px        | sim     |
| Fundo           | `primary`    | `primary`    | sim     |
| Texto           | 15px 700     | 15px 700     | sim     |

#### Relacionados

- **TC:** TC-UI-002
- **Charter:** CH-07
- **Critério:** CA-01 (PRD 97); M-07
- **Protótipo:** Claude Design `4abe021d-…` › `Black Friday - Sacola v2.html` › rodapé · `.cta2`
- **Bugs:** BUG-003, BUG-007 (o mesmo rodapé da sacola)

### BUG-007 — [Sacola · frete escolhido] A linha recolhida do frete usa 12 px entre ícone, texto e valor, não 10 px

### BUG-007 · [Sacola · frete escolhido] A linha recolhida do frete usa 12 px entre ícone, texto e valor, não 10 px

#### Resumo

Depois de escolher o PAC na sacola, Luana vê o frete recolhido numa linha, com o ícone, o serviço, o prazo, o CEP e o
valor. Padding, tipografia e cores estão como no desenho. O espaço entre ícone, texto e valor é que é de 12 px, e não de
10 px. Isso deixa menos largura para o texto do prazo, que nesta linha quebra em duas.

**Origem:** sessão CH-07 · local (loja em http://localhost:8082)

#### Impacto

- **Nível:** Cosmético. É espaçamento, sem efeito em entender nem tocar a linha
- **Persona mais atingida:** PER-01 Luana (390 × 844) — outras: nenhuma
- **Jornada e passo:** J-01, passo 4 (escolhe o frete)
- **Frequência:** sempre (2 leituras: PAC pago e PAC grátis)
- **Contorno:** nenhum necessário
- **Gravidade proposta na sessão:** low — mantida

#### Ambiente

- **URL:** http://localhost:8082 (gaveta da sacola)
- **Tela:** Sacola (gaveta) · **Componente:** rodapé da sacola — linha do frete escolhido (recolhida)
- **Branch / build:** `feature/99` (worktree `store__feature-99`), dev server; build não exposto
- **Browser:** Chromium headless (playwright-cli 0.1.24, DPR 1) · **Viewport:** 390 × 844
- **Rede:** local; cotação interceptada com a fixture A · **Idioma:** pt-BR

#### Passos

1. Na loja `http://localhost:8082`, anônima, a 390 × 844, ponha uma peça na sacola
2. Na gaveta, digite 01310-100, toque em "Calcular" e toque no PAC
3. Meça o espaço entre o ícone, o texto e o valor da linha recolhida

#### Esperado

10 px entre ícone, texto e valor.

**Fonte:** protótipo `Black Friday - Sacola v2.html` › `bf-sacola-v2.css` `.fr2-res{gap:10px}`; TC-UI-002

#### Observado

`column-gap: 12px`. Padding 7/20, título 13,5/18 600, prazo 12/16 `ink-soft`, valor 14 700 `primary` e borda inferior
`line` batem.

#### Evidência

- `screenshots/CH-07-05-frete-recolhido.png`: a linha do frete escolhido recolhida a 390

#### Design × implementado

| Propriedade               | Protótipo        | Observado        | Confere |
| ------------------------- | ---------------- | ---------------- | ------- |
| Espaço entre ícone, texto e valor | 10 px    | 12 px            | não     |
| Padding                   | 7px 20px         | 7px 20px         | sim     |
| Título                    | 13,5/18 600      | 13,5/18 600      | sim     |
| Prazo e CEP               | 12/16 `ink-soft` | 12/16 `ink-soft` | sim     |
| Valor                     | 14px 700 `primary` | 14px 700 `primary` | sim   |

#### Relacionados

- **TC:** TC-UI-002
- **Charter:** CH-07
- **Critério:** CA-05 (PRD 97); M-05
- **Protótipo:** Claude Design `4abe021d-…` › `Black Friday - Sacola v2.html` › frete recolhido · `.fr2-res`
- **Bugs:** BUG-003 (a altura do rodapé, de que esta linha faz parte), BUG-006 (o mesmo rodapé da sacola)

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `apps/store/src/widgets/cart-drawer/ui/CartDrawer.tsx` (o rodapé: cupom, totais, "Finalizar Pedido") | VOCÊ ALTERA | | o rodapé ≤ 270 px a 390 × 844 com o frete escolhido; ícone de 20 px |
| `apps/store/src/widgets/cart-drawer/ui/CartShipping.tsx` (a linha recolhida do frete escolhido) | VOCÊ ALTERA | | 10 px entre ícone, texto e valor |
| `useCartShipping` (`widgets/cart-drawer/model/useCartShipping.ts`) | JÁ EXISTE. Consuma; não altere | | |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-003 · [Sacola · rodapé] Com o frete escolhido, o rodapé mede 276 px no celular e passa do teto de 270 px · low
- **Bug**: BUG-006 · [Sacola · Finalizar Pedido] O ícone da sacola no botão tem 16 px, o protótipo pede 20 px · low
- **Bug**: BUG-007 · [Sacola · frete escolhido] A linha recolhida do frete usa 12 px entre ícone, texto e valor, não 10 px · low
- **Lote**: mesmo componente — o rodapé da gaveta (`apps/store/src/widgets/cart-drawer/ui/CartDrawer.tsx`, com a linha do frete escolhido em `CartShipping.tsx`); a linha recolhida (BUG-007) e o botão (BUG-006) entram na altura medida no BUG-003
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA
- A régua é o protótipo v2 (`Black Friday - Sacola v2.html`, `bf-sacola-v2.css`, projeto Claude Design `4abe021d-d77e-4fe7-affd-524180315fa3`) e o CA-23 do PRD 99: rodapé ≤ 270 px a 100 %; a 200 % rola por dentro sem cortar CEP nem valor. As medidas citadas nos bugs vêm do protótipo, conferidas na sessão CH-07.
- Os alvos de toque continuam ≥ 44 px (CA-13): reduzir altura não pode encolher alvo abaixo disso; o botão continua 48 px.
- jsdom não mede layout: a altura se prova pela classe declarada no teste (token exato) e no reteste em navegador.

### Testes

- componente: o ícone do "Finalizar Pedido" declara 20 px (token exato) (BUG-006).
- componente: a linha recolhida do frete declara 10 px de espaço entre ícone, texto e valor (token exato) (BUG-007).
- componente: as classes de altura/espaçamento do rodapé que somam o teto (token exato), sem afrouxar as asserções de `sacolaMedida.test.tsx` (BUG-003).

### Obrigações

- `touchTarget`, `accentText` e `contrast` verdes; `widgets/cart-drawer/ui/__tests__/*` verdes.

### Não faça

- Não altere `FreeShippingBand.tsx` nem `shared/ui/InfoTip.tsx` (são da tarefa 14).
- Não mude comportamento da prévia de frete (CEP, opções, pré-marcação, totais).
- Não reintroduza a nota abaixo do Total.

### Pronto quando

- [ ] BUG-003: o rodapé a 390 × 844, 100 %, com o frete escolhido, mede ≤ 270 px (medida da sua leitura das classes; o reteste mede no navegador)
- [ ] BUG-006: ícone do "Finalizar Pedido" de 20 px
- [ ] BUG-007: 10 px entre ícone, texto e valor na linha recolhida
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
