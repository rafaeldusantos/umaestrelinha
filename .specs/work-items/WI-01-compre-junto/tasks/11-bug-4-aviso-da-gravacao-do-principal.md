## 11 · [apps/store] BUG-004 — [Página do produto] Com a gravação do pingente acima do limite, falta o aviso do conjunto

**Status:** done

`CA-04.3` — WI-01

**Objetivo.** Com adicional marcado e a gravação do **principal** acima do limite, a página mostra o aviso do botão "A gravação passou do limite. Ajuste o texto para continuar.", como já mostra quando o excesso está na gravação de um adicional. O aviso some sozinho quando a gravação volta ao limite ou quando nenhum adicional fica marcado.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` da raiz › O "defeito 01", › Os guardas, › Convenções, › Baselines; `apps/store/CLAUDE.md` › Página do produto. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** as tarefas 03 e 04 (o bloco e o botão único `useBuyAction`). Confira que existem.

### Critérios de aceite

### BUG-004 — [Página do produto] Com a gravação do pingente acima do limite, falta o aviso do conjunto

# BUG-004 · [Página do produto] Com a gravação do pingente acima do limite, falta o aviso do conjunto

## Resumo

A cliente monta o conjunto e passa do limite na gravação do pingente (13 caracteres com limite de 12). O
botão da barra fixa vira "Revisar a gravação", desabilitado, e o campo do pingente diz "A gravação tem 13
caracteres e o limite desta peça é 12.". Ela entende o que fazer. Mas o aviso que a costura prevê para
esse estado, "A gravação passou do limite. Ajuste o texto para continuar.", não aparece. O mesmo aviso
aparece quando o excesso está na gravação da corrente.

**Origem:** sessão CH-02 · ambiente local (dev server, Supabase local)

## Impacto

- **Nível:** Cosmético
- **Persona mais atingida:** PER-01 Marina — outras: nenhuma
- **Jornada e passo:** J-02, passo 1 (preenche a gravação do pingente e marca a corrente com gravação)
- **Frequência:** sempre (1 observação direta; o estado é determinístico)
- **Contorno:** nenhum necessário; o campo do pingente explica o limite e o botão fica bloqueado
- **Gravidade proposta na sessão:** low — mantida

## Ambiente

- **URL:** http://localhost:8082/produtos/qa-pingente-estrela
- **Tela:** página do produto · **Componente:** aviso de erro do botão de compra (barra fixa)
- **Branch / build:** feature/WI-01 (HEAD 415af2b5) · dev server Vite
- **Browser:** Chromium headless (Playwright MCP), versão não registrada · **Viewport:** 390 × 844
- **Rede:** local · **Idioma:** pt-BR

## Passos

1. Anônima, sacola vazia, abrir http://localhost:8082/produtos/qa-pingente-estrela em 390 × 844
2. Escolher Prata 925 e "Com gravação: Sim". Em "QA Correntes" › "Ver os 2 modelos", escolher QA Corrente
   Cartier · 45 cm · Sim, marcar e gravar "Pedro"
3. Na gravação do pingente, digitar "Lúcia Mariana" (13 caracteres; o limite é 12)

## Esperado

O botão fica bloqueado e a página mostra "A gravação passou do limite. Ajuste o texto para continuar.".

**Fonte:** costura › Loja › Estados ("gravação do principal acima do limite ('A gravação passou do
limite. Ajuste o texto para continuar.')"); TC-FUNC-014 passo 2

## Observado

O botão da barra fixa fica "Revisar a gravação", desabilitado. Junto do campo do pingente aparece "A
gravação tem 13 caracteres e o limite desta peça é 12.". O aviso "A gravação passou do limite. Ajuste o
texto para continuar." não aparece. Ele aparece, como alerta, quando o excesso é na gravação da corrente e
a cliente toca "Levar o conjunto" (passo 05 da sessão).

## Evidência

- Sem screenshot: o estado foi lido no snapshot de acessibilidade do passo 06 do log
  `sessions/CH-02-do-conjunto-ao-pedido.md`. O reteste deve capturar a tela

## Relacionados

- **TC:** TC-FUNC-014
- **Charter:** CH-02
- **Critério:** CA-04.3
- **Protótipo:** loja, `Produto - Compre Junto.html`
- **Bugs:** nenhum

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `useBuyAction` (`apps/store/src/entities/product/model/useBuyAction.ts`) | JÁ EXISTE. Dono único do aviso do botão (`notice`), lido pela coluna (`ProductInfo.tsx`, `role="alert"`); é aqui que o caso muda | `purchase`, `buyTogether` (sem mudança) | `notice` = "A gravação passou do limite. Ajuste o texto para continuar." quando há adicional marcado e `purchase.engravingRefusal` não é nulo |
| `ProductInfo` (`apps/store/src/entities/product/ui/ProductInfo.tsx`) | JÁ EXISTE. Desenha `buy.notice`; não altere | | |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-004 · [Página do produto] Com a gravação do pingente acima do limite, falta o aviso do conjunto · low
- **Fechamento**: a tarefa fecha com o fix do bug; ele segue `open` até o reteste do QA
- **Causa raiz (a conferir)**: `useBuyAction` (`apps/store/src/entities/product/model/useBuyAction.ts:61-68`) só monta o aviso para a tentativa com adicional incompleto (`attempted && incomplete > 0`); a recusa da gravação do principal nunca chega ao `notice`, e o toque no botão com ela vai direto a `purchase.add()` sem marcar tentativa.
- **Direção escolhida (premissa do orquestrador, sem humano)**: com adicional marcado (`bundle`) e `purchase.engravingRefusal` presente, o `notice` é a frase da costura, **na hora** (sem exigir toque), porque o botão já muda para "Revisar a gravação" na hora e os passos do bug não tocam o botão. A recusa do principal tem precedência sobre a frase de adicional incompleto (é ela que bloqueia o botão). **Sem adicional marcado, nada muda** (a página sem conjunto segue como antes do WI: a recusa junto do campo e o botão "Revisar a gravação"). O aviso do adicional com gravação recusada (só depois do toque) não muda.

### Testes

- página real (`ProductPageLevarConjunto.test.tsx`): adicional completo marcado + gravação do principal acima do limite ⇒ `role="alert"` com "A gravação passou do limite. Ajuste o texto para continuar.", antes de qualquer toque, e nada entra ao tocar
- o aviso some quando a gravação do principal volta ao limite
- sem adicional marcado, com a gravação do principal acima do limite, nenhum `role="alert"` com a frase (o comportamento de antes)
- o aviso do adicional com gravação recusada continua só depois do toque (o caso existente segue verde)

### Não faça

- Não mexa nos outros bugs da QA (BUG-005..013)
- Não escreva a frase em outro lugar além de `useBuyAction`
- Não mude a recusa junto do campo nem o rótulo "Revisar a gravação"

### Pronto quando

- [ ] o aviso aparece com adicional marcado e gravação do principal acima do limite, e some quando a causa some
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
