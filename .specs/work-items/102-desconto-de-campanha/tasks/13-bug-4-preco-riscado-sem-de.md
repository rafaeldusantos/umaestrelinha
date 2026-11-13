## 13 · [apps/store] BUG-004 — [Página do produto] Leitor de tela lê o preço riscado sem “De” — dois preços seguidos

**Status:** done

`BUG-004` — 102 · fix task da QA, rodada 1 (`qa/qa-result.md`, lote L4)

**Objetivo.** Na página do produto, o leitor de tela lê o preço riscado como "De R$ X".

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines · Feature-Sliced Design / Alias de import; `apps/store/CLAUDE.md` (tokens, página do produto, carrinho, checkout); `DESIGN.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** nada desta rodada; as tarefas 01–09 (`done`) deixaram a campanha no ar.

**Onde mora.** Página do produto · bloco de preço (`apps/store/src/entities/product/ui/ProductInfo.tsx`; o cartão `ProductCard.tsx` já tem o "De"). Localização feita só para saber onde o bug mora — a causa é do diagnóstico de quem executa.

### Critérios de aceite

### BUG-004 — [Página do produto] Leitor de tela lê o preço riscado sem “De” — dois preços seguidos

#### Resumo

A Rosa, que usa leitor de tela, abre uma peça da campanha para saber quanto vai pagar. No bloco de preço ela ouve
"R$ 346,50, R$ 385,00, R$ 322,24 no Pix": nada diz que R$ 385,00 é o preço antigo. Nos cartões de `/ofertas` e da
Home, o mesmo riscado é lido "De R$ 385,00". Na página da peça, onde ela decide, não.

**Origem:** sessão CH-08 · loja local do worktree `store__feature-102`

#### Impacto

- **Nível:** Dano à confiança
- **Persona mais atingida:** PER-04 Rosa (leitor de tela, sai se o anúncio do preço é incompreensível) — outras:
  nenhuma
- **Jornada e passo:** J-03, a página da peça (entender o preço antes de decidir)
- **Frequência:** sempre — o texto do bloco de preço é fixo na página; uma leitura na sessão
- **Contorno:** nenhum pela página; o cartão da vitrine lê "De"
- **Gravidade proposta na sessão:** high — mantida. O achado veio marcado como `intermitente (1 de 1)` só por falta de
  uma segunda leitura; é texto fixo da página, lido da árvore de acessibilidade, a mesma leitura que nos cartões encontra
  o "De" — a evidência basta

#### Ambiente

- **URL:** `http://localhost:8092/produtos/pulseira-afetiva-com-leite-materno-em-prata-925`
- **Tela:** Página do produto · **Componente:** bloco de preço
- **Branch / build:** `feature/102`, HEAD `a1c6ea53`, Vite de dev do worktree
- **Browser:** Chromium headless (agent-browser 0.39.1), leitura pela árvore de acessibilidade · **Viewport:** 390 × 844
  (fonte a 100 % e 200 %)
- **Rede:** local, sem limitação · **Idioma:** pt-BR

#### Passos

1. Sem login, com uma campanha em vigência (na sessão, "Dia das Mães") e a peça
   "Pulseira Afetiva Lisa com Leite Materno em Prata 925" marcada com 10 %, abrir
   `http://localhost:8092/produtos/pulseira-afetiva-com-leite-materno-em-prata-925` em 390 × 844
2. Esperar o preço com desconto (R$ 346,50)
3. Ler o bloco de preço com o leitor de tela (ou pela árvore de acessibilidade)

#### Esperado

O preço riscado é anunciado como "De R$ 385,00" (o "De " só para leitor de tela), como nos cartões.

**Fonte:** `spec.md` › Design › Selo · em linha ("De R$ X (riscado) · 4x de R$ Y sem juros" — "De " só para leitor
de tela); PRD UC-05; TC-CFR-001 (meta "preço riscado lido com 'De R$ X'"); `personas.md`, PER-04, risco 2

#### Observado

O texto do bloco de preço é "R$ 346,50R$ 385,00R$ 322,24no Pix". O "R$ 385,00" tem `text-decoration: line-through` e
não há "De" antes dele, nem visível nem só para leitor de tela. Nos cartões de `/ofertas`, a mesma leitura dá
"De R$ 385,00 R$ 346,50". A sessão não conferiu `aria-label` no contêiner do preço.

#### Evidência

- `screenshots/CH-08-04-pdp-ma-200-390.png` — a página da M-A com o preço e o riscado (fonte a 200 %)

#### Relacionados

- **TC:** nenhum (o TC-CFR-001 confere o "De" nos cartões, onde passa)
- **Charter:** CH-08
- **Critério:** CA-03 (a página do produto), R-07
- **Protótipo:** —
- **Bugs:** nenhum

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-004 · [Página do produto] Leitor de tela lê o preço riscado sem “De” — dois preços seguidos · high
- **Fechamento**: a tarefa fecha com o fix do bug; o bug segue `open` até o reteste do QA
- CFR do plano (TC-CFR-001): o preço riscado tem "De" para leitor de tela, como no cartão. O `ProductInfo.tsx` tem um `sr-only "De "` num dos ramos do preço (por volta da linha 123) — confira qual ramo a peça de campanha percorre e por que a árvore de acessibilidade lida no CH-08 não o trouxe; vale para a peça de campanha e para o "de/por" cadastrado.

### Testes

Teste antes do código: cada caso abaixo reprova antes do conserto e passa depois.
- Teste do `ProductInfo` (ou da página real) que lê o nome acessível/texto do preço riscado, com peça de campanha e com "de/por" cadastrado: começa com "De R$"; vermelho antes do conserto.

### Obrigações

- Rode, em cada workspace tocado, a suíte (`pnpm --filter @estrelinha/<w> test --testTimeout=20000`, sem o `--`, exit capturado fora de pipe), `npx tsc --noEmit -p <projeto>` e `npx eslint .` no app; compare com as baselines do `CLAUDE.md` (sem regressão). Mudança em `packages/core` roda também a suíte da loja e a do painel (os guardas de lá varrem os dois apps).
- Os guardas do repositório (`touchTarget`, `contrast`, `accentText`, os de dono único) continuam verdes sem afrouxar asserção.
- `packages/core/src/payment/**` só muda se o diagnóstico mostrar que a causa está lá; mudando, a suíte de `payment` não perde caso.

### Não faça

- Não altere dado do banco local para "consertar" a massa (pedidos, marcações, campanhas da QA): corrija a escrita.
- Não mexa no `status` nem no corpo de `qa/issues/BUG-004.md` — é da QA.
- Não amplie o escopo para as sugestões de backlog do `qa-result.md`.
- Não commite: o orquestrador commita.

### Pronto quando

- O teste novo reprovava antes e passa depois; a suíte, os tipos e o lint dos workspaces tocados sem regressão.
- O comportamento esperado do BUG-004 foi visto funcionando no app local (relate como conferiu).

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
