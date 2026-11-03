## 20 · [apps/backoffice] BUG-013 — [Painel · Compre Junto, aba Adesão] Cartão do recorte sem título e rótulos fora do protótipo

**Status:** done

`CA-06.4` — WI-01

**Objetivo.** O cartão do recorte da aba Adesão (`/admin/compre-junto/adesao`), a nota da régua e os cartões do celular passam a seguir o protótipo do painel (`cj-admin-listas.jsx` › `Adesao`, projeto Claude Design "Uma Estrelinha - Backoffice"): título do recorte à esquerda e alternador à direita, alternador com "Por joia" / "Por lista", ícone ⓘ de 14 px antes da nota da régua, e "Mais sai: X" na última linha dos cartões de 390.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` da raiz › O "defeito 01", › Os guardas, › Convenções, › Baselines; `apps/backoffice/CLAUDE.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** a tarefa 06 (`apps/backoffice/src/features/buy-together-adoption/ui/AdoptionReport.tsx`) e a 19 (subtítulo e contagem da aba, já feitos). Confira que existem.

### Critérios de aceite

### BUG-013 — [Painel · Compre Junto, aba Adesão] Cartão do recorte sem título e rótulos fora do protótipo

O envelope completo está em `qa/issues/BUG-013.md`. A tabela "Design × implementado" dele é o critério, linha a linha:

| # | Protótipo (o que passa a valer) |
| - | ------------------------------- |
| D34 | o cartão do recorte com um título (`h2`) à esquerda — `Por joia principal` no recorte por joia, `Por lista` no recorte por lista — e o alternador à direita, na mesma linha, embrulhando (`flex-wrap`) quando não couber em 390; o cartão (`section`) nomeado pelo título (`aria-labelledby`) |
| D35 | o alternador diz `Por joia` / `Por lista` |
| D36 | a nota da régua (`RULE_NOTE`) com o ícone ⓘ (`Info` do lucide, 14 px, `aria-hidden`) antes do texto, na mesma linha |
| D37 | última linha dos cartões do celular: `Mais sai: X` (a coluna da tabela do computador continua `Peça que mais sai`, como no protótipo) |

O que já conferia (indicadores, linhas de apoio, régua, colunas, barra de valor) não muda.

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `Recortes` e `AdoptionReport` (`apps/backoffice/src/features/buy-together-adoption/ui/AdoptionReport.tsx`) | JÁ EXISTE | as mesmas props | D34–D37 |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-013 · [Painel · Compre Junto, aba Adesão] Cartão do recorte sem título e rótulos fora do protótipo · low
- **Causa raiz**: `AdoptionReport.tsx` (`Recortes`) pôs o nome longo do recorte no próprio alternador e não escreveu o título do cartão; a nota da régua saiu como `<p>` só com o texto; a linha do cartão do celular reaproveitou o rótulo da coluna da tabela.
- **Fechamento**: a tarefa fecha com o fix do bug; ele segue `open` até o reteste do QA
- **Premissa (orquestrador, sem humano)**: o alternador continua sendo o `Tabs` do design system (papel `tab`, alvo `min-h-11`), como hoje; o protótipo usa um grupo de botões `aria-pressed`, mas trocar o componente não é pedido pelo bug e mudaria o padrão do painel. Raio de alcance: só a aba Adesão; nenhum componente de `shared/ui` muda.
- **Fora desta tarefa**: o índice das listas (BUG-012, feito), os demais bugs da QA.

### Testes

- pela Adesão real (`apps/backoffice/src/pages/admin/AdminBuyTogetherAdoption.test.tsx`):
  - o cartão do recorte tem o título `Por joia principal` (heading) e o cartão é nomeado por ele; ao trocar para "Por lista", o título passa a `Por lista`
  - o alternador tem as abas `Por joia` e `Por lista` (nenhuma aba chamada `Por joia principal`)
  - a nota da régua tem um ícone `svg` com `aria-hidden` antes do texto, de 14 px
  - o cartão do celular diz `Mais sai: <peça>`, e não `Peça que mais sai:`; a coluna da tabela continua `Peça que mais sai`
- as asserções antigas que cravavam o nome da aba `Por joia principal` ou a linha `Peça que mais sai:` dos cartões são reescritas pelo valor novo (mudança de VALOR), nenhuma afrouxada

### Não faça

- Não mexa no índice das listas nem no cabeçalho/abas da página (BUG-012)
- Não mude componentes de `shared/ui` nem de `packages/ui`
- Não afrouxe guarda nenhum

### Pronto quando

- [ ] a Adesão mostra D34–D37
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu, que reprovou antes do código
- [ ] as suítes do painel (`pnpm --filter @estrelinha/backoffice test --testTimeout=20000`) e da loja (`pnpm --filter @estrelinha/store test --testTimeout=20000`, os guardas varrem o painel) passando, exit 0 fora de pipe
- [ ] `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` com 0 erros e `npx eslint` nos arquivos tocados sem erro novo
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
