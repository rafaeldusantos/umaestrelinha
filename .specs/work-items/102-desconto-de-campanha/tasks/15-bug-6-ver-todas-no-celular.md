## 15 · [apps/store] BUG-006 — [Home · bloco da campanha] Sem “Ver todas” no celular — cliente que chega pelo celular

**Status:** done

`BUG-006` — 102 · fix task da QA, rodada 1 (`qa/qa-result.md`, lote L6)

**Objetivo.** O bloco da campanha na Home tem "Ver todas" (para `/ofertas`) também no celular.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines · Feature-Sliced Design / Alias de import; `apps/store/CLAUDE.md` (tokens, página do produto, carrinho, checkout); `DESIGN.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** nada desta rodada; as tarefas 01–09 (`done`) deixaram a campanha no ar.

**Onde mora.** Home · bloco da campanha (`apps/store/src/widgets/campaign-offers/ui/CampaignOffers.tsx`). Localização feita só para saber onde o bug mora — a causa é do diagnóstico de quem executa.

### Critérios de aceite

### BUG-006 — [Home · bloco da campanha] Sem “Ver todas” no celular — cliente que chega pelo celular

#### Resumo

A Marina chega pelo celular, rola a Home até o bloco da campanha e vê os cartões de percentual e a fileira "Algumas das
peças em oferta". Não há "Ver todas" em lugar nenhum: para ver todas as peças em oferta, ela precisa entrar por um
percentual e depois tocar no chip "Todas" da vitrine.

**Origem:** sessão CH-03 · loja local do worktree `store__feature-102`

#### Impacto

- **Nível:** Cosmético, subido a Fricção — fica na Home, a superfície de primeira impressão, e tira a entrada direta
  para a vitrine inteira
- **Persona mais atingida:** PER-02 Marina — outras: nenhuma
- **Jornada e passo:** J-03, passo 1 (rolar até o bloco)
- **Frequência:** sempre — o link não está na árvore de acessibilidade da Home em 390 × 844
- **Contorno:** tocar num cartão de percentual e, em `/ofertas`, no chip "Todas"
- **Gravidade proposta na sessão:** medium — mantida. Veio como `intermitente (1 de 1)`, mas a ausência é estrutural:
  o registro da implementação diz que o "Ver todas" do bloco só aparece a partir de 768 px

#### Ambiente

- **URL:** `http://localhost:8092/`
- **Tela:** Home · **Componente:** bloco da campanha ("Joias em oferta") — fileira "Algumas das peças em oferta"
- **Branch / build:** `feature/102`, HEAD `a1c6ea53`, Vite de dev do worktree
- **Browser:** Chromium headless (agent-browser 0.39.1) · **Viewport:** 390 × 844 (1440 × 900 não conferido)
- **Rede:** local, sem limitação · **Idioma:** pt-BR

#### Passos

1. Sem login, com uma campanha em vigência com peças marcadas e o bloco "Joias em oferta" ligado na Home, abrir
   `http://localhost:8092/` em 390 × 844
2. Rolar até o bloco da campanha e a fileira "Algumas das peças em oferta"
3. Procurar "Ver todas"

#### Esperado

"Ver todas" presente e alcançável ao lado do subtítulo "Algumas das peças em oferta", levando a `/ofertas`.

**Fonte:** `spec.md` › Design › Home · "Joias em oferta" (Subtítulo "Algumas das peças em oferta" + "Ver todas", sem
restrição de largura); `spec.md` H-10 ("Ver todas" a `/ofertas`); TC-FUNC-018 passo 3 e a variação "Ver todas no
celular"

#### Observado

A fileira tem só "Anterior"/"Próximo" e os 4 cartões. Não há link nem texto "Ver todas" na Home em 390 × 844. O
`implement-log.md` registra a escolha (decisão 5 da T07): o "Ver todas" é o link do carrossel, visível só a partir de
768 px, como nas outras fileiras da Home.

#### Evidência

- `screenshots/CH-03-02-bloco-home.png` — o bloco e a fileira sem "Ver todas" em 390 × 844

#### Design × implementado

| Propriedade                         | Protótipo (via `spec.md` › Design)               | Observado em 390 × 844 | Confere |
| ----------------------------------- | ------------------------------------------------ | ---------------------- | ------- |
| "Ver todas" ao lado do subtítulo    | presente, sem restrição de largura               | ausente                | não     |
| Subtítulo "Algumas das peças em oferta" | presente                                     | presente               | sim     |
| Fileira de cartões com a faixa      | rola de lado                                     | rola de lado           | sim     |

#### Relacionados

- **TC:** TC-FUNC-018 (passo 3)
- **Charter:** CH-03
- **Critério:** R-04 (PRD UC-07)
- **Protótipo:** Claude Design `4abe021d-d77e-4fe7-affd-524180315fa3`, `Black Friday - Home.html` (não lido nesta rodada; a
  régua é a transcrição do `spec.md`)
- **Bugs:** nenhum

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-006 · [Home · bloco da campanha] Sem “Ver todas” no celular — cliente que chega pelo celular · medium
- **Fechamento**: a tarefa fecha com o fix do bug; o bug segue `open` até o reteste do QA
- Decisão do Gate 1 da QA (`item.md`, linha `QA · Gate 1 — plano`): "Ver todas" da Home é esperado também no celular. Hoje o link só aparece a partir de `md` (premissa registrada no `implement-log.md` da T07). O destino é `/ofertas`; alvo de toque ≥ 44 px (`TAP_44`), sem rolagem horizontal em 390 e com a fonte a 200 %.

### Testes

Teste antes do código: cada caso abaixo reprova antes do conserto e passa depois.
- Teste do `CampaignOffers`: o link "Ver todas" para `/ofertas` existe sem classe que o esconda abaixo de `md` (régua por token exato), e atende ao alvo de 44 px; vermelho antes do conserto.

### Obrigações

- Rode, em cada workspace tocado, a suíte (`pnpm --filter @estrelinha/<w> test --testTimeout=20000`, sem o `--`, exit capturado fora de pipe), `npx tsc --noEmit -p <projeto>` e `npx eslint .` no app; compare com as baselines do `CLAUDE.md` (sem regressão). Mudança em `packages/core` roda também a suíte da loja e a do painel (os guardas de lá varrem os dois apps).
- Os guardas do repositório (`touchTarget`, `contrast`, `accentText`, os de dono único) continuam verdes sem afrouxar asserção.
- `packages/core/src/payment/**` só muda se o diagnóstico mostrar que a causa está lá; mudando, a suíte de `payment` não perde caso.

### Não faça

- Não altere dado do banco local para "consertar" a massa (pedidos, marcações, campanhas da QA): corrija a escrita.
- Não mexa no `status` nem no corpo de `qa/issues/BUG-006.md` — é da QA.
- Não amplie o escopo para as sugestões de backlog do `qa-result.md`.
- Não commite: o orquestrador commita.

### Pronto quando

- O teste novo reprovava antes e passa depois; a suíte, os tipos e o lint dos workspaces tocados sem regressão.
- O comportamento esperado do BUG-006 foi visto funcionando no app local (relate como conferiu).

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
