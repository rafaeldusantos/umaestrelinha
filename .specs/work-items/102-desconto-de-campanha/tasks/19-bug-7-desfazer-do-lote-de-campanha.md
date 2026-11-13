## 19 · [apps/backoffice] BUG-007 — [Edição em massa · campanha] O aviso do lote não tem “Desfazer” — a dona não volta um lote errado

**Status:** done

`BUG-007` — 102 · fix task da QA, rodada 2 (`qa/qa-result.md`, lote L4)

**Objetivo.** O aviso do lote de campanha da edição em massa traz "Desfazer", que devolve as marcações de campanha que as peças tinham antes do lote.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines · Feature-Sliced Design; `apps/backoffice/CLAUDE.md`; `packages/core/CLAUDE.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** nada desta rodada. A tarefa 03 (`done`) entregou a seção Campanha da edição em massa e declarou o desvio (`implement-log.md`, T03 · 6): "o desfazer cobre só o patch de `products`; a marcação de campanha não volta pelo toast".

**Onde mora.** Painel · Produtos: `apps/backoffice/src/pages/admin/AdminProductsPage.tsx` (o aviso do lote e o "Desfazer" de hoje, só do patch de `products`), `apps/backoffice/src/features/bulk-edit/model/useUndoBuffer.ts` e `apps/backoffice/src/features/bulk-edit/model/bulkCampaign.ts` (o lote de campanha). Localização feita só para saber onde o bug mora — a causa é do diagnóstico de quem executa.

### Critérios de aceite

### BUG-007 — [Edição em massa · campanha] O aviso do lote não tem “Desfazer” — a dona não volta um lote errado

#### Resumo

A dona seleciona as quatro peças que estão na "Natal" com 15 %, abre a edição em massa e aplica "Natal: 10%". O lote
grava, e o aviso diz só "4 peça(s) na Natal com 10%", com um botão de fechar. Não há "Desfazer" no aviso nem em
outro lugar da tela. Ela esperava tocar em "Desfazer" e ver as quatro peças de volta a "Natal · 15%", como o produto
decidiu (Q-01, resposta A). Sem ele, um lote errado só se desfaz remarcando as peças. Quando as peças tinham
percentuais diferentes, ela precisa lembrar o que cada uma tinha.

**Origem:** sessão CH-02 (rodada 2, confirmação) · painel local do worktree `store__feature-102`

#### Impacto

- **Nível:** Perda de dados, rebaixado um degrau. O lote sobrescreve as marcações que a dona configurou peça a peça,
  e a tela não oferece o caminho de volta que a Q-01 (A) prometeu. O degrau a menos vem do caso observado: as quatro
  peças tinham o mesmo percentual, e a dona as devolveu com mais um lote, partindo da lista filtrada. Com marcações
  diferentes entre as peças, o estado anterior só volta se ela lembrar dele
- **Persona mais atingida:** PER-01 Adri — outras: nenhuma
- **Jornada e passo:** J-02, passos 2–4 (marcar em lote; desfazer o lote errado)
- **Frequência:** sempre (2 de 2 lotes de campanha)
- **Contorno:** filtrar a lista pela campanha e pelo percentual antes do lote, anotar, e remarcar com outro lote ou
  peça a peça
- **Gravidade proposta na sessão:** high. Mantida. O plano lia esse risco como fricção. A sessão mostrou que o
  lote grava sem caminho de volta pela tela, e a resposta do produto à Q-01 tornou o Desfazer parte do escopo.
  O `session-summary.md` do WI registra o comportamento como desvio declarado da T03 ("a marcação de campanha não
  volta pelo toast"). O Gate 3 pode rever o nível

#### Ambiente

- **URL:** `http://localhost:8093/admin/produtos?campanha=<Natal>&percentual=15`
- **Tela:** Painel · Produtos (lista) · **Componente:** edição em massa, seção Campanha, e o aviso do lote
- **Branch / build:** `feature/102`, HEAD `36196100`, Vite de dev do worktree
- **Browser:** Chromium headless (agent-browser 0.39.1) · **Viewport:** 1440 × 900
- **Rede:** local, sem limitação · **Idioma:** pt-BR

#### Passos

1. Entrar no painel como `admin-loja`. Precisa existir uma campanha agendada ("Natal", 10 % e 15 %) com quatro peças
   marcadas a 15 %. Abrir Campanhas › "Natal" e tocar em "Ver as peças"
2. Na lista filtrada "Campanha: Natal · 15%", marcar "Selecionar a página" e tocar em "Editar em massa"
3. Ligar "Campanha", escolher "Natal" e "Natal: 10%"
4. Tocar em "Aplicar a 4 produto(s)" e ler o aviso do lote

#### Esperado

O aviso do lote traz "Desfazer". Tocá-lo devolve as quatro peças a "Natal · 15%", na lista do painel e na aba Preço e
estoque, e o filtro "Natal · 10%" fica vazio.

**Fonte:** resposta (A) do humano à Q-01, 2026-11-13: o Desfazer da edição em massa devolve também as marcações de
campanha. PRD UC-04 (R-01). TC-FUNC-021, variação "Desfazer — percentual que tinham". Charter CH-02, "Deve tentar" 4

#### Observado

O lote grava: o filtro "Natal · 15%" fica com "Nenhum produto encontrado". O aviso mostra "4 peça(s) na Natal com
15%" (no lote de volta) ou o equivalente com 10 %, e só o botão de fechar. No primeiro lote, a sessão esperou 25 s e
o texto "Desfazer" não apareceu. Não há outro caminho de desfazer na tela.

#### Evidência

- `screenshots/CH-02-r2-03-lote-natal-10.png`: a seção de campanha da edição em massa, com a prévia "4 peça(s)
  entram na Natal com 10%"
- `screenshots/CH-02-r2-04-toast-lote-sem-desfazer.png`: o aviso do lote, sem "Desfazer"
- `screenshots/CH-02-r2-05-mg-15-restaurado.png`: as quatro peças devolvidas a "Natal · 15%" com um segundo lote

#### Ocorrências

| Sessão | Persona     | Passo                                         | Evidência                                              |
| ------ | ----------- | --------------------------------------------- | ------------------------------------------------------ |
| CH-02  | PER-01 Adri | passo 06 do log, lote Natal → 10 % (sem "Desfazer" em 25 s) | —                                        |
| CH-02  | PER-01 Adri | passo 07 do log, lote Natal → 15 % (aviso lido na hora)     | `screenshots/CH-02-r2-04-toast-lote-sem-desfazer.png` |

#### Relacionados

- **TC:** TC-FUNC-021 (variações "Desfazer — percentual que tinham" e "Desfazer — sem campanha")
- **Charter:** CH-02
- **Critério:** R-01 (PRD UC-04), Q-01 (A)
- **Protótipo:** —
- **Bugs:** nenhum

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-007 · [Edição em massa · campanha] O aviso do lote não tem “Desfazer” — a dona não volta um lote errado · high
- **Fechamento**: a tarefa fecha com o fix do bug; o bug segue `open` até o reteste do QA
- Q-01 (A), resposta do humano no Gate 1 da QA (2026-11-13): o Desfazer da edição em massa devolve também as marcações de campanha. O plano já registrava que o comportamento contrário "passa a ser bug". Este conserto revoga o desvio T03 · 6.
- Desfazer devolve o estado anterior de cada peça: o percentual que ela tinha na campanha, ou nenhuma marcação se não tinha — inclusive quando as peças tinham percentuais diferentes. Lote que tirou peças da campanha ("Tirar da …") volta com as marcações de antes.
- A gravação da marcação continua pelas portas que já existem (RPC/escrita de `product_campaigns` da T01–T03); nada de segunda escrita da marcação fora delas.

### Testes

Teste antes do código: cada caso abaixo reprova antes do conserto e passa depois.
- Caso da página real (`AdminProductsPage`) com o lote "Natal: 10 %" sobre quatro peças a 15 %: o aviso tem "Desfazer", e tocá-lo devolve as quatro a 15 % (escrita conferida no dublê); vermelho antes do conserto.
- Caso com peças de percentuais diferentes e uma sem marcação: o Desfazer devolve cada uma ao que tinha.
- Caso do "Tirar da campanha" em lote + Desfazer.

### Obrigações

- Rode, em cada workspace tocado, a suíte (`pnpm --filter @estrelinha/<w> test --testTimeout=20000`, sem o `--`, exit capturado fora de pipe), `npx tsc --noEmit -p <projeto>` e `npx eslint .` no app; compare com as baselines do `CLAUDE.md` (sem regressão). Mudança em `packages/core` roda também a suíte da loja e a do painel (os guardas de lá varrem os dois apps); mudança em `supabase/functions` roda a suíte de `functions`.
- Os guardas do repositório continuam verdes sem afrouxar asserção.

### Não faça

- Não altere dado do banco local para "consertar" a massa (pedidos #0603–#0608, marcações, campanhas da QA): corrija a escrita para valer daqui para frente.
- Não mexa no `status` nem no corpo de `qa/issues/BUG-007.md` — é da QA.
- Não amplie o escopo para as sugestões de backlog do `qa-result.md`.
- Não commite: o orquestrador commita.

### Pronto quando

- O teste novo reprovava antes e passa depois; a suíte, os tipos e o lint dos workspaces tocados sem regressão.
- O comportamento esperado do BUG-007 foi visto funcionando no app local (relate como conferiu).

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
