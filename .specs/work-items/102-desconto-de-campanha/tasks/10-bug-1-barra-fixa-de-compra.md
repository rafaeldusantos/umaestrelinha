## 10 · [apps/store] BUG-001 — [Página do produto · celular] Tocar em “Adicionar à sacola” na barra fixa não acrescenta a peça

**Status:** done

`BUG-001` — 102 · fix task da QA, rodada 1 (`qa/qa-result.md`, lote L1)

**Objetivo.** No celular, tocar em "Adicionar à sacola" na barra fixa da página do produto põe a peça na sacola, com ou sem campanha.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines · Feature-Sliced Design / Alias de import; `apps/store/CLAUDE.md` (tokens, página do produto, carrinho, checkout); `DESIGN.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** nada desta rodada; as tarefas 01–09 (`done`) deixaram a campanha no ar.

**Onde mora.** Página do produto · barra fixa de compra (`apps/store/src/widgets/product-buy-bar/ui/ProductBuyBar.tsx`, ação em `apps/store/src/entities/product/model/useBuyAction.ts`). Localização feita só para saber onde o bug mora — a causa é do diagnóstico de quem executa.

### Critérios de aceite

### BUG-001 — [Página do produto · celular] Tocar em “Adicionar à sacola” na barra fixa não acrescenta a peça

#### Resumo

A cliente, no celular, abre uma peça, decide comprar e toca em "Adicionar à sacola" na barra fixa de baixo. Nada
acontece: nenhum aviso, a gaveta da sacola não abre e o contador não muda. Ao abrir a sacola, ela está vazia (ou só
com o que já havia). Ela esperava ver a peça na sacola. Isso acontece também com uma peça fora da campanha, e não
acontece no computador.

**Origem:** sessões CH-03 e CH-04 · loja local do worktree `store__feature-102`

#### Impacto

- **Nível:** Bloqueia a conclusão
- **Persona mais atingida:** PER-02 Marina (só toque, celular) — outras: PER-03 Helena (monta a sacola no celular)
- **Jornada e passo:** J-04, passo 1 (acrescentar a peça à sacola); J-03, depois do passo de abrir a peça
- **Frequência:** sempre — 6 de 6 toques em 390 × 844 (M-A duas vezes no CH-03; M-A duas vezes, M-E e M-A com a
  sacola já preenchida no CH-04)
- **Contorno:** nenhum para quem só usa o toque. Na sessão, a peça só entrou focando o botão e apertando Enter (teclado),
  ou em 1440 × 900
- **Gravidade proposta na sessão:** critical — mantida. A sessão não separou por completo um defeito da página de uma
  limitação do toque simulado do driver (ver Observado); como o toque funciona em 1440 e o teclado funciona em 390 na
  mesma página, o bug fica registrado pelo que a persona vê, e o reteste confirma com toque real

#### Ambiente

- **URL:** `http://localhost:8092/produtos/pulseira-afetiva-com-leite-materno-em-prata-925` (M-A) e
  `http://localhost:8092/produtos/pulseira-afetiva-oval-com-leite-materno-em-prata-925` (M-E, fora da campanha)
- **Tela:** Página do produto · **Componente:** barra fixa de compra ("Adicionar à sacola")
- **Branch / build:** `feature/102`, HEAD `a1c6ea53`, Vite de dev do worktree
- **Browser:** Chromium headless (agent-browser 0.39.1) · **Viewport:** 390 × 844 (em 1440 × 900 não acontece)
- **Rede:** local, sem limitação; `*.supabase.co` e `**/g/collect*` bloqueados por rota · **Idioma:** pt-BR

#### Passos

1. Sem login, com a sacola vazia, abrir a loja em 390 × 844 em
   `http://localhost:8092/produtos/pulseira-afetiva-oval-com-leite-materno-em-prata-925`
2. Fechar o aviso de cookies e manter a cor padrão
3. Tocar em "Adicionar à sacola" na barra fixa de baixo
4. Tocar no ícone "Sacola"

#### Esperado

A peça entra na sacola, com retorno visível (gaveta ou contador). No caso de uma peça da campanha (M-A), a linha
mostra R$ 308,00, o cheio R$ 385,00 riscado e o selo em linha.

**Fonte:** TC-JOURNEY-002 passo 1; TC-FUNC-004 passo 4; TC-FUNC-005 passo 1; PRD CA-03, UC-05

#### Observado

Nenhuma reação ao toque: sem toast, sem gaveta, sem contador. A gaveta "Sua sacola" abre vazia, só com "Explorar
joias" (ou com os itens de antes, mantendo "Sacola, 2 itens"). Console sem erro; nenhuma requisição falhou depois do
toque. Na mesma página e no mesmo viewport, focar o botão e apertar Enter acrescenta a peça; em 1440 × 900, o toque
acrescenta.

#### Evidência

- `screenshots/CH-04-02-toque-sem-efeito-390.png` — M-A em 390 depois do toque, com o contador parado em "Sacola, 2 itens"
- `screenshots/CH-03-07-sacola-ma.png` — a sacola vazia depois de dois toques em "Adicionar à sacola" na M-A

#### Ocorrências

| Sessão | Persona       | Passo                                                         | Evidência                                         |
| ------ | ------------- | ------------------------------------------------------------- | ------------------------------------------------- |
| CH-03  | PER-02 Marina | passo 07 do log — M-A, dois toques                            | `screenshots/CH-03-07-sacola-ma.png`              |
| CH-04  | PER-03 Helena | passos 01–02 do log — M-A, M-E (comum) e M-A com sacola cheia | `screenshots/CH-04-02-toque-sem-efeito-390.png`   |

#### Relacionados

- **TC:** TC-JOURNEY-002 (passo 1), TC-FUNC-004 (passo 4), TC-FUNC-005 (passo 1)
- **Charter:** CH-03, CH-04
- **Critério:** CA-03
- **Protótipo:** —
- **Bugs:** nenhum. No CH-04, o toque na lixeira da gaveta da sacola em 390 também fechou a gaveta sem tirar a peça
  (uma ocorrência só — fica como risco residual no `qa-result.md`)

#### Histórico

| Rodada | Data | De → para | O que se viu | Evidência |
| ------ | ---- | --------- | ------------ | --------- |
| 1 (exploração) | 2026-11-13 | — → open | registrado no Gate 3 como `critical`, com a ressalva do árbitro: a correção começa reproduzindo o toque de verdade (emulação de toque ou celular real, não só o clique do agent-browser); se não reproduzir com toque real, o caminho é `cannot-reproduce` no reteste, não uma correção às cegas. O reteste confere também a lixeira da gaveta da sacola | screenshots/CH-04-02-toque-sem-efeito-390.png |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-001 · [Página do produto · celular] Tocar em “Adicionar à sacola” na barra fixa não acrescenta a peça · critical
- **Fechamento**: a tarefa fecha com o fix do bug; o bug segue `open` até o reteste do QA
- **Reproduza com toque real antes de mexer** (ressalva do árbitro no Gate 3, registrada no Histórico do BUG-001): o toque falhou no `agent-browser` headless em 390 × 844, e pelo teclado e em 1440 funcionou. Reproduza com emulação de toque (Playwright `hasTouch: true`/`isMobile: true`, `page.tap`) ou com o DevTools em modo dispositivo. Reproduziu ⇒ corrija pela causa, com teste que falha antes. **Não reproduziu com toque real** ⇒ não corrija às cegas: feche a tarefa como `fechou com divergência`, com a evidência da tentativa (o que rodou, o resultado), para o reteste do QA decidir `cannot-reproduce`.
- O reteste confere também a lixeira da gaveta da sacola em 390 (CH-04, uma ocorrência: o toque fechou a gaveta sem tirar a peça). Se a causa for a mesma (camada sobre o alvo, `pointer-events`, gesto do Vaul/Radix fechando antes do clique), corrija as duas; se não, registre e não amplie o escopo.

### Testes

Teste antes do código: cada caso abaixo reprova antes do conserto e passa depois.
- Teste de componente da barra (e da página real, `ProductPage`, se o fio passar por ela) que dispara a sequência de eventos de toque (`pointerdown`/`pointerup`/`click`, ou `fireEvent.touchStart`/`touchEnd` + `click`) e asserta que a peça entrou na sacola (estado do `useCart`), vermelho antes do conserto.
- Prova em navegador com toque emulado em 390 × 844: a peça entra na sacola (M-A, peça de campanha, e M-E, peça comum).

### Obrigações

- Rode, em cada workspace tocado, a suíte (`pnpm --filter @estrelinha/<w> test --testTimeout=20000`, sem o `--`, exit capturado fora de pipe), `npx tsc --noEmit -p <projeto>` e `npx eslint .` no app; compare com as baselines do `CLAUDE.md` (sem regressão). Mudança em `packages/core` roda também a suíte da loja e a do painel (os guardas de lá varrem os dois apps).
- Os guardas do repositório (`touchTarget`, `contrast`, `accentText`, os de dono único) continuam verdes sem afrouxar asserção.
- `packages/core/src/payment/**` só muda se o diagnóstico mostrar que a causa está lá; mudando, a suíte de `payment` não perde caso.

### Não faça

- Não altere dado do banco local para "consertar" a massa (pedidos, marcações, campanhas da QA): corrija a escrita.
- Não mexa no `status` nem no corpo de `qa/issues/BUG-001.md` — é da QA.
- Não amplie o escopo para as sugestões de backlog do `qa-result.md`.
- Não commite: o orquestrador commita.

### Pronto quando

- O teste novo reprovava antes e passa depois; a suíte, os tipos e o lint dos workspaces tocados sem regressão.
- O comportamento esperado do BUG-001 foi visto funcionando no app local (relate como conferiu).

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
