## 04 · [store (monorepo)] BUG-002 — [Menu da loja › Cor do texto] Apagar o código não tira a cor: a anterior segue valendo e volta ao campo
**Status:** done

`C-06, C-07` — WI 104 · fix task (QA rodada 1)

**Objetivo.** No bloco "Cor do texto" do editor do item, apagar o código de uma superfície significa "sem cor" ali: o seletor e a recusa da cor apagada somem, o código não volta, e Salvar grava aquela superfície sem cor.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `apps/backoffice/CLAUDE.md` (em especial `› Molde dos formulários`, `› A ponte da prévia (feature 25, e o segundo canal da 39)` e `› /admin/menu — o menu montado pela dona (feature 86, AD-068)`), `packages/core/CLAUDE.md`, e, do `CLAUDE.md` da raiz (grande demais para ler inteiro), as seções `CLAUDE.md › Feature-Sliced Design`, `CLAUDE.md › O "defeito 01": dois donos do mesmo dado`, `CLAUDE.md › Convenções que valem em todo o repositório`, `CLAUDE.md › Os guardas — o que trava o quê` e `CLAUDE.md › Baselines — o gate de qualquer feature`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** 03 (mesmo editor, `MenuItemEditor.tsx`): rode depois dela e confira o estado em que ela deixou o arquivo.

### Critérios de aceite

### BUG-002 — [Menu da loja › Cor do texto] Apagar o código não tira a cor: a anterior segue valendo e volta ao campo

#### Resumo

No editor de um item principal, a dona digitou uma cor na lista do celular e depois apagou o código inteiro, esperando que o item voltasse à cor padrão. O campo ficou vazio, mas o quadradinho do seletor continuou na cor antiga e a frase de recusa daquela cor ficou na tela. Quando ela mexeu no outro campo, o código apagado voltou sozinho. O campo vazio dá a entender que não há cor, mas o editor continua com a cor anterior.

**Origem:** sessão CH-02 · ambiente local (painel `:8083`, Supabase local)

#### Impacto

- **Nível:** Fricção
- **Persona mais atingida:** PER-01 Adri, a dona. Outras: nenhuma
- **Jornada e passo:** J-01, passo 4 (escolher a cor), no ramo de quem desiste da cor apagando o código (variação "campo vazio" de TC-FUNC-006)
- **Frequência:** sempre (2 de 2: apagar por preenchimento vazio e apagar pelo teclado)
- **Contorno:** "Usar a cor padrão", ao lado do campo. Ele funciona (TC-FUNC-007), e a frase de formato do editor aponta para ele
- **Gravidade proposta na sessão:** low. Divergiu: o campo vazio que não esvazia a cor confunde a dona sobre o que vai ser gravado, e isso é Fricção, não Cosmético. Não subiu o degrau de jornada P0 porque acontece fora do caminho principal: o ramo de desistir da cor (J-01c) usa "Usar a cor padrão", que funciona e está ao lado

#### Ambiente

- **URL:** http://localhost:8083/admin/menu
- **Tela:** Menu da loja (painel) · **Componente:** bloco "Cor do texto" do editor do item, campo "Na lista do celular (fundo branco)"
- **Branch / build:** `feature/104`, HEAD `94a09c43`, segundo o `qa-report.md`. A sessão não expôs o build
- **Browser:** Chromium (agent-browser, headless) · **Viewport:** 1440 × 900
- **Rede:** local · **Idioma:** pt-BR

#### Passos

1. Entre no painel como a dona (conta `admin`) e abra Loja › Menu da loja (`/admin/menu`)
2. No item principal "Personalizados" (sem cor nas duas superfícies), abra Ações › "Editar nome, ícone e banners"
3. Em "Na lista do celular (fundo branco)", digite `#E8C77A`. Aparece a recusa "A cor do texto na lista do celular mede 1,6:1 …"
4. Apague todo o código desse campo
5. Digite qualquer caractere no campo "Na barra do computador (fundo escuro)"

#### Esperado

O campo vazio quer dizer "sem cor" naquela superfície. O seletor e a recusa da cor apagada somem, o código não volta, e Salvar grava a lista sem cor.

**Fonte:** TC-FUNC-006, variação "campo vazio" ("sem cor naquela superfície, sem recusa"); `plan.md` C-06 ("cor não escolhida naquela superfície = como hoje")

#### Observado

No passo 4, o campo fica vazio e mostra o texto de exemplo "PADRÃO". O seletor de cor ao lado continua em `#e8c77a`, e a frase "A cor do texto na lista do celular mede 1,6:1 sobre o fundo branco: o nome fica difícil de ler. Escolha uma cor mais escura (o mínimo é 4,5:1)." continua na tela. No passo 5, o campo da lista volta a mostrar `#E8C77A`. A sessão não salvou com o campo vazio. Ninguém conferiu o que Salvar gravaria nesse estado.

#### Evidência

- `screenshots/CH-02-06-formato-silencioso.png`: o campo da lista vazio ("PADRÃO"), com o seletor ainda dourado e a frase de recusa de 1,6:1 na tela

#### Perspectiva da persona

Adri não entende de código hex. Para ela, apagar o que está escrito é o jeito óbvio de tirar a cor. Quando o código volta sozinho, ou a recusa de uma cor que ela já apagou continua na tela, ela não sabe o que vai ser gravado e precisa descobrir o botão "Usar a cor padrão".

**Risco de abandono:** baixo. O botão que resolve está ao lado, e a frase de formato do editor aponta para ele.

#### Relacionados

- **TC:** TC-FUNC-006
- **Charter:** CH-02
- **Critério:** C-06, C-07
- **Protótipo:** nenhum ("Seguir sem design")
- **Bugs:** nenhum

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `MenuLabelColorField` (`features/store-menu/ui/MenuLabelColorField.tsx`) — campo hex + seletor nativo + "Usar a cor padrão"; `''` = a cor padrão | VOCÊ ALTERA | `value`, `onChange` | o campo vazio é "sem cor": seletor no padrão, sem recusa |
| `MenuItemEditor` (`features/store-menu/ui/MenuItemEditor.tsx`) — o estado `corBarra`/`corFolha` e o Salvar (`labelColors = { bar: corBarra \|\| null, sheet: corFolha \|\| null }`) | VOCÊ ALTERA, se a causa estiver aí | — | Salvar com o campo vazio grava `null` naquela superfície |
| `menuLabelColorRefusal`, `menuLabelColorSurfaceRefusal`, `MENU_LABEL_HEX` (`packages/core/src/menu/labelColor.ts`) | JÁ EXISTE. Consuma; não altere | — | — |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-002 · [Menu da loja › Cor do texto] Apagar o código não tira a cor: a anterior segue valendo e volta ao campo · medium
- **Fechamento**: a tarefa fecha com o fix do bug; o bug segue `open` até o reteste do QA
- Decisão do humano no Gate 3 da QA (2026-11-17): "resolver todos os bugs" — este medium é corrigido nesta etapa, não vai ao backlog.
- `plan.md` C-06: "cor não escolhida naquela superfície = como hoje". Item sem cor não leva a chave `labelColors` (plan.md › Decisões): o documento sem cor lê igual ao de antes.
- "Usar a cor padrão" continua funcionando como hoje (TC-FUNC-007 passou).

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| O campo de cor e o seu estado | `features/store-menu/ui/MenuLabelColorField.tsx` › o próprio componente (o `valida`/`recusa` e o botão "Usar a cor padrão") |

### Testes

- Componente (painel): digitar uma cor e apagar o código inteiro deixa o campo vazio, sem recusa visível e com o seletor no padrão daquela superfície.
- Componente (painel): depois de apagar, digitar no OUTRO campo não devolve o código apagado.
- Componente (painel): Salvar com o campo apagado entrega `null` naquela superfície (e, sem cor nas duas, nenhuma cor no item).

### Obrigações

- `fieldBorder`/`touchTarget`/`adminTokens`: o campo e o botão seguem os tokens e o alvo ≥ 44 px de hoje.

### Não faça

- Não altere `packages/core/src/menu/labelColor.ts` nem a régua de contraste.
- Não toque a prévia nem a ponte (tarefa 03).
- Não mexa na loja (`apps/store/**`).

### Pronto quando

- [ ] apagar o código deixa a superfície sem cor, sem recusa e sem o código voltar; Salvar grava sem cor ali
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
