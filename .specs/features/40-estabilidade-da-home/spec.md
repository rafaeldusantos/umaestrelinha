# Estabilidade da home — Specification

## Problem Statement

Uma auditoria Lighthouse contra `umaestrelinha-store-five.vercel.app` em **2026-09-06**, perfil
móvel (Moto G Power, Slow 4G simulado, 4× CPU), fechou a loja em **performance 72** e
**acessibilidade 96**. Os 30% de TBT já valem nota cheia — o que sobra está concentrado em duas
métricas e num único item de contraste:

| Métrica | Peso | Valor | Nota |
| --- | --- | --- | --- |
| TBT | 30% | 50 ms | 1,00 |
| **CLS** | **25%** | **0,244** | **0,51** |
| **LCP** | **25%** | **3,9 s** | **0,53** |
| FCP | 10% | 2,6 s | 0,64 |
| SI | 10% | 3,2 s | 0,91 |

**As quatro causas são defeitos de código, e cada uma tem um dono identificado no traço.**

### 1. As fileiras da home nascem com altura zero

`ProductCarousel` abre com `if (products.length === 0) return null`. Enquanto a consulta carrega,
`products` é `undefined` → `[]` → a fileira **não desenha nada**. As quatro fileiras nascem com
altura zero, o rodapé sobe para dentro da viewport, e quando os produtos chegam cada fileira estoura
para ~600 px e empurra o rodapé para baixo.

O relatório nomeia exatamente isso: o elemento que desloca é o `<footer>`, com score
`0,244228432563791` — **o CLS total inteiro**. O deslocamento só é tão grande porque o rodapé
*estava visível* enquanto a página era curta; é a distância que ele percorre que domina o cálculo.

### 2. O elemento do LCP nasce em opacidade zero

O elemento do LCP é o `<p>` do hero. Em `HeroBanner.tsx` ele é um `motion.p` cujo variant é
`hidden: { opacity: 0, y: 20 }`, sob um contêiner com `staggerChildren: 0.1`. Sendo o terceiro
filho, ele só **começa** a aparecer 0,2 s depois do mount e leva mais 0,45 s para chegar a
`opacity: 1`. O Chrome não considera pintado um elemento em opacidade zero — a animação de entrada
está, literalmente, adiando o LCP. O relatório mede `elementRenderDelay` de **2005 ms** contra
`timeToFirstByte` de **25 ms**.

É a mesma regra que a `38` já escreveu para os cards (`PRF-03`: "card entre os primeiros seis SHALL
NOT nascer em opacidade zero") — o hero ficou de fora.

### 3. A árvore de categorias tem quatro donos por carregamento

`useProducts` busca a árvore de categorias **dentro** do próprio `queryFn`, e a chave é
`['products', slug, limit]`. Quatro fileiras ⇒ **quatro requisições idênticas** de
`categories?select=id,parent_id,slug`, cada uma com preflight CORS próprio, e cada fileira só pede
seus produtos depois que *a sua* cópia da árvore volta. Medido no traço:

```
 583ms  categories?select=*&order=sort_order.asc  ->  884ms   (o header - ja traz id/parent_id/slug)
1007ms  4x categories?select=id,parent_id,slug    -> 1301, 1898, 2143, 2356ms
1304ms  products fileira 1 -> 1607
1908ms  products fileira 2 -> 2259     <- cada uma espera A SUA arvore
2145ms  products fileira 3 -> 2841
2358ms  products fileira 4 -> 3010
```

A cauda de conteúdo fecha em **3,0 s**. E o dado já estava em cache às **884 ms**: `useCategories`
(chave `['categories']`, montado pelo header em toda rota da loja) traz a tabela inteira, `id`,
`parent_id` e `slug` inclusos. É o **"defeito 01"** do projeto na forma mais cara: o mesmo dado com
dois donos, um deles multiplicado por quatro.

### 4. O verde do WhatsApp não é legível

`WhatsAppFloat` desenha o nome da loja em `text-[hsl(142_70%_38%)]` sobre branco — `#1da54f`,
**3,22:1**. Texto de 11 px semibold não é *large text*, então a régua é 4,5:1. É o **único item com
peso** que segura a acessibilidade em 96.

O guarda `contrast.test.ts` não pegou porque o valor é **arbitrário** (`text-[hsl(...)]`), não um
token — a varredura cobre tokens sobre `ground`/`ground-deep`/`surface`. Mesma forma da lição do
`fieldBorder`: a regra existia, o teste existia, e os dois nunca se encontraram.

## Goals

1. **CLS 0,244 → ~0.** Nenhum bloco da home nasce com altura zero para depois estourar.
2. **LCP sem animação bloqueante.** Conteúdo acima da dobra nunca nasce em opacidade zero.
3. **A árvore de categorias tem um dono.** Uma consulta por carregamento, compartilhada, em vez de
   quatro cópias em cascata.
4. **Acessibilidade 100.** O contraste do teaser passa, e um guarda impede a reincidência por valor
   arbitrário.

Estimativa: **72 → ~88–92**. É estimativa — a nota móvel do Lighthouse varia entre execuções, e o
gate desta feature é o comportamento medido (deslocamento, número de requisições, opacidade
inicial), não o número da nota.

## Out of Scope

| Fora | Por quê |
| --- | --- |
| Reduzir `index.js` (141 KB) e `supabase-js` (57 KB, 80% não usado) | Vale ~3,5 pontos de FCP e mexe no client de dados. Feature própria — fica registrado como dívida |
| Trocar framer-motion por animação CSS no hero | O ganho aqui é a opacidade, não a biblioteca. Trocar o motor é mudança de risco desproporcional |
| `cache-control` de 1 h nos 3.618 objetos do Storage | Já é dívida declarada da `38`; peso 0 no Lighthouse, e é passe de dados, não código |
| `label-content-name-mismatch` (3 botões) | Peso **0** — não muda a nota. Registrado no backlog: quebra comando de voz de verdade |
| O deslocamento do painel **aberto** do WhatsApp | Acontece depois de um gesto, e o CLS exclui 500 ms após entrada do usuário |

## Assumptions & Open Questions

| Questão | Resolução | Razão | Confirmado |
| --- | --- | --- | --- |
| Como reservar a altura da fileira sem medir layout | Esqueleto que **reusa as classes de caixa do `ProductCard`** (`aspect-[4/5]`, `mt-4`, `gap-[5px]`, `min-h-[40px]`) | jsdom devolve 0 para toda medida de layout — nenhum teste pode assertar altura. Reusar as classes torna a igualdade **estrutural**, e um guarda que lê os dois arquivos do disco a torna verificável | y (assunção) |
| De onde sai a árvore de categorias | `useCategories` (`['categories']`), promovida a **fábrica de opções de query** reusável | O header já a busca em toda rota da loja, e ela já traz `id`/`parent_id`/`slug`. Criar uma consulta enxuta nova economizaria bytes mas **acrescentaria uma requisição** que hoje não precisa existir | y (assunção) |
| O hero perde a animação de entrada? | Não — perde só a **opacidade**. O deslize (`y`) continua | `transform` não impede a pintura, então não adia o LCP. A entrada continua existindo, mais discreta — o que combina com o registro da marca | **y** (usuário, 2026-09-06) |
| Qual verde substitui o `38%` | `hsl(142 71% 30%)` — **4,88:1** | É o verde que o projeto **já usa** em `ProductInfo.tsx` para "em estoque". Trocar fecha o item e unifica os dois verdes da loja num só | y (assunção) |
| A classe do nome é a mesma nos dois lados? | **Não, e é deliberado**: o card usa `min-h-[40px]`, o esqueleto usa `h-[40px]` | O card precisa de `min-h` porque o nome pode ocupar **uma** linha e ainda assim tem de reservar duas — é o que faz os preços de uma fileira empatarem (`COR-09`). O esqueleto tem conteúdo de tamanho fixo, então declara a altura exata. Forçar a mesma classe inventaria uma regra que o desenho não tem, e o guarda modela o **par** | y (achado na verificação, 2026-09-06) |

## User Stories

### P1: A home não salta enquanto carrega ⭐ MVP

**Como** quem abre a loja no celular,
**quero** que a página não empurre o conteúdo enquanto os produtos chegam,
**para** não perder o que estava lendo nem tocar no lugar errado.

#### Acceptance Criteria

1. **PRF-17** — WHEN uma fileira de coleção está **carregando** THEN ela SHALL desenhar a seção
   completa — mesmo `tone`, mesmo título, mesma grade — com um card de esqueleto por vaga, em vez de
   não desenhar nada.
2. **PRF-17** — WHEN a consulta termina **sem produto nenhum** THEN a fileira SHALL continuar
   devolvendo `null`, sem esqueleto e sem título — o comportamento de hoje.
3. **PRF-17** — WHEN o esqueleto do card é desenhado THEN ele SHALL declarar **as mesmas classes de
   caixa** do `ProductCard` — `aspect-[4/5]` na foto, `mt-4`/`gap-[5px]` no bloco de texto e
   `min-h-[40px]` no título —, porque é a igualdade dessas classes que garante a mesma altura.
4. **PRF-17** — WHEN o `ProductCard` mudar qualquer uma dessas classes de caixa sem que o esqueleto
   acompanhe THEN a suíte SHALL falhar, por um guarda que lê **os dois arquivos do disco** e compara.
5. **PRF-18** — WHEN a bolha de mensagem do `WhatsAppFloat` entra sozinha (2,2 s após a montagem)
   THEN a caixa do contêiner fixo SHALL NOT mudar de tamanho — a bolha SHALL sair do fluxo,
   ancorada acima do botão.

### P2: O texto do hero aparece assim que a página pinta ⭐ MVP

**Como** quem abre a loja numa rede lenta,
**quero** ler a promessa da marca no primeiro quadro em que ela existe,
**para** não olhar para um espaço vazio enquanto uma animação decide começar.

#### Acceptance Criteria

1. **PRF-19** — WHEN o bloco de conteúdo do hero é montado THEN nenhum de seus filhos animados
   SHALL nascer em `opacity: 0`.
2. **PRF-19** — WHEN a entrada do hero é animada THEN ela SHALL usar **apenas `transform`**
   (deslize em `y`), que não impede a pintura e portanto não adia o LCP.
3. **PRF-19** — WHEN alguém devolver `opacity` ao variant de entrada do hero THEN a suíte SHALL
   falhar, por um guarda que lê `HeroBanner.tsx` do disco.

### P3: A árvore de categorias é buscada uma vez ⭐ MVP

**Como** quem abre a home,
**quero** que as quatro fileiras peçam seus produtos ao mesmo tempo,
**para** que a página feche em um round-trip e não em quatro.

#### Acceptance Criteria

1. **PRF-20** — WHEN `useProducts` precisa da árvore de categorias THEN ele SHALL obtê-la pela
   **mesma chave de React Query** que o header já usa (`['categories']`), e SHALL NOT emitir consulta
   própria a `categories`.
2. **PRF-20** — WHEN a home monta quatro fileiras THEN a rede SHALL registrar **uma** requisição a
   `categories` no total — a do header —, e não cinco.
3. **PRF-20** — WHEN a forma de buscar categorias mudar THEN ela SHALL mudar **num lugar só**: uma
   fábrica de opções de query exportada, consumida pelo hook e por `useProducts`.
4. **PRF-20** — WHEN qualquer arquivo de `apps/store/**` fora dessa fábrica construir um
   `from('categories').select(...)` de árvore THEN a suíte SHALL falhar.
5. **PRF-20** — WHEN o slug pedido não casa com categoria nenhuma THEN `useProducts` SHALL continuar
   devolvendo vazio (`URL-04`), e SHALL NOT cair no catálogo inteiro.

### P4: O único texto ilegível da home passa a ser legível ⭐ MVP

**Como** quem enxerga pouco contraste,
**quero** ler o nome da loja na bolha do WhatsApp,
**para** saber quem está falando comigo.

#### Acceptance Criteria

1. **A11Y-01** — WHEN o nome da loja é desenhado na bolha do WhatsApp THEN ele SHALL medir **no
   mínimo 4,5:1** contra o branco da bolha.
2. **A11Y-02** — WHEN um arquivo de `apps/store/**` declarar uma cor de texto **arbitrária**
   (`text-[hsl(...)]`, `text-[#...]`, `text-[rgb(...)]`) THEN a suíte SHALL falhar, a menos que o
   valor esteja num allowlist curto com a razão de contraste **medida e registrada** ao lado.
3. **A11Y-02** — WHEN o guarda roda THEN ele SHALL ter **âncora de contagem**: varrer zero arquivo
   SHALL reprovar.

## Non-Functional Requirements

- **Sem regressão de baseline.** Lint 27/5 e tipos 0·0·0 permanecem; testes só sobem.
- **`packages/core/src/payment/**` não é tocado** — conferido por `git diff --name-only` no gate.
- **Mobile primeiro.** A prova final é em viewport 390×844, com rede lenta simulada.
