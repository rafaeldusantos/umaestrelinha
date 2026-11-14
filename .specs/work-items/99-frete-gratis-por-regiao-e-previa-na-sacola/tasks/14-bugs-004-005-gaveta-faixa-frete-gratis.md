## 14 · [apps/store] BUG-004, BUG-005 — Sacola (gaveta) · faixa do frete grátis

**Status:** done

`BUG-004, BUG-005 (QA rodada 1)` — 99

**Objetivo.** A faixa do frete grátis da gaveta fica como no protótipo v2: o balão do ⓘ dentro da gaveta, a 12 px de cada borda, e a faixa "Frete grátis liberado" com 42 px.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › "Convenções que valem em todo o
repositório", "Os guardas — o que trava o quê" (`accentText`, `contrast`, `touchTarget`, `freeShippingSingleOwner`);
`apps/store/CLAUDE.md` › "Design system", "Carrinho, chrome e checkout", "Frete grátis — um interruptor e um dono só
(feature 37)", "Mobile — o que quebra e não grita". Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções
manda, e a divergência vai no retorno.

**Depende de.** Tarefas 01..11 fechadas (`done`). Confira que o código delas existe antes de começar.

### Critérios de aceite

### BUG-004 — [Sacola · ⓘ do frete grátis] O balão abre com 288 px preso ao ⓘ, e não a 12 px de cada borda da gaveta

### BUG-004 · [Sacola · ⓘ do frete grátis] O balão abre com 288 px preso ao ⓘ, e não a 12 px de cada borda da gaveta

#### Resumo

Luana toca no ⓘ da faixa do frete grátis para ler a regra. O texto aparece inteiro, mas num balão de 288 px preso à
posição do ⓘ. O desenho pede o balão de borda a borda da gaveta, a 12 px de cada lado. Por isso ele fica mais estreito,
com mais linhas, e muda de lugar conforme o estado da faixa.

**Origem:** sessão CH-07 · CH-08 · local (loja em http://localhost:8082)

#### Impacto

- **Nível:** Cosmético. A regra se lê inteira, e o balão fica dentro da gaveta (CA-22 cumprido)
- **Persona mais atingida:** PER-01 Luana (390 × 844) — outras: nenhuma
- **Jornada e passo:** J-01, passo 2 (lê a regra do frete grátis no ⓘ)
- **Frequência:** sempre (3 leituras, em dois estados da faixa e em duas sessões)
- **Contorno:** nenhum necessário
- **Gravidade proposta na sessão:** low — mantida

#### Ambiente

- **URL:** http://localhost:8082 (gaveta da sacola sobre `/produtos/joia-afetiva-arvore-da-vida-flores-com-leite-materno-e-cabelo`)
- **Tela:** Sacola (gaveta) · **Componente:** faixa do frete grátis — balão do ⓘ "Sobre o frete grátis"
- **Branch / build:** `feature/99` (worktree `store__feature-99`), dev server; build não exposto
- **Browser:** Chromium headless (playwright-cli 0.1.24, DPR 1) · **Viewport:** 390 × 844
- **Rede:** local; cotação interceptada com a fixture A · **Idioma:** pt-BR

#### Passos

1. Na loja `http://localhost:8082`, anônima, a 390 × 844, ponha uma peça abaixo de R$ 450 na sacola
2. Na gaveta, toque no ⓘ "Sobre o frete grátis" da faixa "Faltam R$ X para o frete grátis"
3. Meça o balão contra as bordas da gaveta
4. Aumente a quantidade até passar de R$ 450, calcule com 01310-100 e repita os passos 2 e 3 na faixa "Frete grátis
   liberado"

#### Esperado

O balão fica logo abaixo da faixa, a 12 px de cada borda da gaveta, com 366 px de largura a 390.

**Fonte:**

- `spec.md` › Design › "O ⓘ" ("Balão `role="tooltip"`, a 12px de cada borda da gaveta");
- protótipo `Black Friday - Sacola v2.html` › `bf-sacola-v2.css` `.inf-t` (`left:12px; right:12px`);
- TC-UI-001;
- TC-CFR-003 passo 4.

#### Observado

- **Faixa abaixo:** o balão tem 288 px de largura e fica a 86 px da borda esquerda e a 16 px da direita.
- **Faixa liberada:** o mesmo balão de 288 px fica a 41 px da esquerda e a 61 px da direita.
- Cor, texto, tipografia, raio e padding batem com o desenho.

#### Evidência

- `screenshots/CH-07-02-balao-info.png`: o balão na faixa abaixo
- `screenshots/CH-07-06-liberado-balao.png`: o balão na faixa liberada, em outra posição
- `screenshots/CH-08-05-balao-390.png`: a mesma medida na sessão de CFR (x 86–374)

#### Ocorrências

| Sessão | Persona      | Passo                  | Evidência                                   |
| ------ | ------------ | ---------------------- | ------------------------------------------- |
| CH-07  | PER-01 Luana | 02 (faixa abaixo)      | `screenshots/CH-07-02-balao-info.png`       |
| CH-07  | PER-01 Luana | 06 (faixa liberada)    | `screenshots/CH-07-06-liberado-balao.png`   |
| CH-08  | PER-01 Luana | 05 (faixa abaixo)      | `screenshots/CH-08-05-balao-390.png`        |

#### Design × implementado

| Propriedade                       | Protótipo        | Observado                                     | Confere |
| --------------------------------- | ---------------- | --------------------------------------------- | ------- |
| Largura a 390                     | 366 px           | 288 px                                        | não     |
| Distância da borda esquerda       | 12 px            | 86 px (abaixo) · 41 px (liberado)             | não     |
| Distância da borda direita        | 12 px            | 16 px (abaixo) · 61 px (liberado)             | não     |
| Fundo · texto                     | `ink` · `on-primary` | `#23303a` · `#f7f3ec`                     | sim     |
| Tipografia                        | 12,5px/18        | 12,5px/18                                     | sim     |
| Raio · padding                    | md · 10px 12px   | 12 px · 10px 12px                             | sim     |

#### Relacionados

- **TC:** TC-UI-001 (e TC-CFR-003 passo 4, que passou pela meta "dentro da gaveta")
- **Charter:** CH-07, CH-08
- **Critério:** CA-14, CA-22 (PRD 99); M-03
- **Protótipo:** Claude Design `4abe021d-…` › `Black Friday - Sacola v2.html` › faixa · `.inf-t`
- **Bugs:** BUG-005 (a mesma faixa do frete grátis)

### BUG-005 — [Sacola · faixa do frete grátis] A faixa “Frete grátis liberado” mede 40 px, o protótipo pede 42 px

### BUG-005 · [Sacola · faixa do frete grátis] A faixa “Frete grátis liberado” mede 40 px, o protótipo pede 42 px

#### Resumo

Com a sacola acima de R$ 450 e um CEP de São Paulo, Luana vê a faixa dourada "Frete grátis liberado". O fundo, o selo e
o texto estão como no desenho. Só a altura fica 2 px menor: 40 px em vez de 42 px, porque a linha mede 20 px (a altura
do selo) em vez da mínima de 22 px.

**Origem:** sessão CH-07 · local (loja em http://localhost:8082)

#### Impacto

- **Nível:** Cosmético. São 2 px de altura, sem efeito na leitura nem na jornada
- **Persona mais atingida:** PER-01 Luana (390 × 844) — outras: nenhuma
- **Jornada e passo:** J-01, passo 3 (vê o frete grátis liberado)
- **Frequência:** sempre (2 leituras)
- **Contorno:** nenhum necessário
- **Gravidade proposta na sessão:** low — mantida

#### Ambiente

- **URL:** http://localhost:8082 (gaveta da sacola)
- **Tela:** Sacola (gaveta) · **Componente:** faixa do frete grátis — estado "Frete grátis liberado"
- **Branch / build:** `feature/99` (worktree `store__feature-99`), dev server; build não exposto
- **Browser:** Chromium headless (playwright-cli 0.1.24, DPR 1) · **Viewport:** 390 × 844
- **Rede:** local; cotação interceptada com a fixture A · **Idioma:** pt-BR

#### Passos

1. Na loja `http://localhost:8082`, anônima, a 390 × 844, ponha na sacola uma peça de R$ 259,90 com quantidade 2
2. Na gaveta, digite 01310-100 e toque em "Calcular"
3. Meça a faixa "Frete grátis liberado"

#### Esperado

A linha com altura mínima de 22 px e padding de 10px 20px, o que dá uma faixa de 42 px.

**Fonte:** protótipo `Black Friday - Sacola v2.html` › `bf-sacola-v2.css` `.fg2-l{min-height:22px}` e `.fg2.ok`;
`spec.md` › Design › "A faixa do frete grátis"; TC-UI-001

#### Observado

A faixa mede 40 px e a linha 20 px. Fundo `#b8945f`, padding 10/20, selo de 20 px e texto 13 700 `ink` batem.

#### Evidência

- `screenshots/CH-07-06-liberado-balao.png`: a faixa "Frete grátis liberado" a 390

#### Design × implementado

| Propriedade           | Protótipo        | Observado        | Confere |
| --------------------- | ---------------- | ---------------- | ------- |
| Altura mínima da linha | 22 px           | 20 px            | não     |
| Altura da faixa       | 42 px            | 40 px            | não     |
| Fundo                 | `accent` `#b8945f` | `#b8945f`      | sim     |
| Padding               | 10px 20px        | 10px 20px        | sim     |
| Selo                  | 20 px, `ink` com ✓ `accent` | 20 px, `ink` com ✓ `accent` | sim |
| Texto                 | 13px 700 `ink`   | 13px 700 `ink`   | sim     |

#### Relacionados

- **TC:** TC-UI-001
- **Charter:** CH-07
- **Critério:** CA-16 (PRD 99); M-01, M-02
- **Protótipo:** Claude Design `4abe021d-…` › `Black Friday - Sacola v2.html` › faixa liberada · `.fg2-l`
- **Bugs:** BUG-004 (a mesma faixa do frete grátis)

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `apps/store/src/widgets/cart-drawer/ui/FreeShippingBand.tsx` (os quatro desenhos, o desenho alcançado) | VOCÊ ALTERA | | faixa liberada com 42 px (linha de 22 px) |
| `apps/store/src/shared/ui/InfoTip.tsx` (o `PopoverContent`: largura e `collisionPadding`) | VOCÊ ALTERA | | o balão dentro da gaveta, 12 px de cada borda |
| `freeShippingState`, `freeShippingRuleText` (`@estrelinha/core/shipping`) | JÁ EXISTE. Consuma; não altere | | |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-004 · [Sacola · ⓘ do frete grátis] O balão abre com 288 px preso ao ⓘ, e não a 12 px de cada borda da gaveta · low
- **Bug**: BUG-005 · [Sacola · faixa do frete grátis] A faixa “Frete grátis liberado” mede 40 px, o protótipo pede 42 px · low
- **Lote**: mesmo componente — a faixa do frete grátis (`apps/store/src/widgets/cart-drawer/ui/FreeShippingBand.tsx`, com o balão do `apps/store/src/shared/ui/InfoTip.tsx`, que só a faixa usa); os dois contra `bf-sacola-v2.css`
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA
- A régua é o protótipo v2 (`Black Friday - Sacola v2.html`, `bf-sacola-v2.css`, projeto Claude Design `4abe021d-d77e-4fe7-affd-524180315fa3`) e o CA-22 do PRD 99 (o balão dentro da largura da gaveta em 390 × 844). As medidas citadas nos bugs vêm do protótipo, conferidas na sessão CH-07.
- O comportamento do ⓘ (abrir no toque, fechar fora e no Esc, foco, `role=tooltip`, alvo de 44 px) não muda (tarefa 02).
- jsdom não mede layout: prove pela classe/prop declarada (token exato) — molde de `apps/backoffice/src/widgets/store-movement/ui/__tests__/infoGutter.test.tsx`; o reteste mede no navegador.

### Testes

- componente: o `PopoverContent` do ⓘ declara a largura e o `collisionPadding` que deixam 12 px de cada borda da gaveta (token exato) (BUG-004).
- componente: a faixa no desenho "liberado" declara a altura de linha de 22 px (token exato) (BUG-005).

### Obrigações

- `accentText`, `contrast`, `touchTarget` e `freeShippingSingleOwner` verdes; `shared/ui/__tests__/InfoTip*.test.tsx` e `widgets/cart-drawer/ui/__tests__/FreeShippingBand.test.tsx` verdes.

### Não faça

- Não altere `CartDrawer.tsx` nem `CartShipping.tsx` (são da tarefa 13).
- Não mude o texto da faixa nem a regra do frete grátis.

### Pronto quando

- [ ] BUG-004: o balão a 390 × 844 fica dentro da gaveta, 12 px de cada borda
- [ ] BUG-005: a faixa "Frete grátis liberado" com 42 px
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
