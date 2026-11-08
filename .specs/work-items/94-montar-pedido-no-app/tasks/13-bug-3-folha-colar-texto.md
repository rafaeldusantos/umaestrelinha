## 13 · [apps/mobile-adm] BUG-003 — [Folha "Colar texto"] Cancelar durante a leitura não fecha, e a leitura troca o que a Adri digitou

**Status:** done

`BUG-003` — 94

**Objetivo.** "Cancelar" fecha a folha também durante a leitura, e a leitura que volta depois de cancelada não toca no que a Adri digitou.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines; `apps/mobile-adm/CLAUDE.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** 11 (`pages/MontarPedidoPage.tsx` passa pelo voltar antes). Confira que existe antes de começar.

### Critérios de aceite

### BUG-003 — [Folha "Colar texto"] Cancelar durante a leitura não fecha, e a leitura troca o que a Adri digitou

#### Resumo

A Adri já tinha digitado o nome e o e-mail da cliente nova, colou um texto e tocou em "Ler o texto". Enquanto
aparece "Lendo o texto…", ela desiste e toca em "Cancelar" (e depois Esc). O botão está ligado, mas nada
acontece. Segundos depois a leitura volta, a folha fecha sozinha e o nome e o e-mail que ela digitou são
trocados pelos do texto que ela pediu para não ler.

**Origem:** sessão CH-02 · ambiente local, `customer-parse` com a Claude API real, resposta segurada 4–6 s no browser

#### Impacto

- **Nível:** Dano à confiança
- **Persona mais atingida:** PER-01 Adri no WhatsApp — outras: nenhuma
- **Jornada e passo:** J-01, passo 2 (colar e ler o texto)
- **Frequência:** sempre que ela cancela durante a leitura (2 de 2); a leitura real leva ~3 s
- **Contorno:** "Desfazer" depois que a leitura volta — só se ela notar que os campos mudaram
- **Gravidade proposta na sessão:** medium, com a nota "pode subir para high" — subiu: o controle parece
  responder e não responde, e o resultado muda dados que ela digitou na jornada P0

#### Ambiente

- **URL:** `http://localhost:8084/pedidos/montar` (passo 1, Cliente nova)
- **Tela:** Montar pedido · Passo 1 Cliente · **Componente:** folha "Colar o texto da conversa", botão "Cancelar"
- **Branch / build:** `feature/94` @ `09b5b575`
- **Browser:** Chromium headless (Playwright MCP) · **Viewport:** 390 × 844
- **Rede:** local; a resposta da `customer-parse` foi segurada 4–6 s para dar tempo de tocar · **Idioma:** pt-BR

#### Passos

1. Entre no app do ateliê com a conta de administração, em `/pedidos`, toque em "Montar pedido" e em "Cliente nova"
2. Digite "Ju" em Nome e "ju.manual@exemplo.invalid" em E-mail
3. Toque em "Colar texto da conversa", cole "Sou a Paula Lima, paula.lima@exemplo.invalid, zap 51 98765-4321,
   Rua dos Andradas 100, cep 90020-008" e toque em "Ler o texto" (com a rede lenta)
4. Enquanto aparece "Lendo o texto…", toque em "Cancelar"; depois tecle Esc
5. Espere a resposta da leitura

#### Esperado

A folha tem "Cancelar" e ele está ligado durante a leitura: tocar nele fecha a folha e os campos ficam como a
Adri deixou ("Ju" e o e-mail digitado) — nada do que ela já fez se perde. A spec só desliga "Ler o texto"
durante a leitura, não "Cancelar".

**Fonte:** spec › Design › Folha · Colar texto ("Botões: 'Cancelar' … e 'Ler o texto' (desligado vazio e durante
a leitura, 'Lendo o texto…')"); PRD › Ler os dados de uma mensagem; charter CH-02 (edge case "fechar a folha
durante 'Lendo o texto…'")

#### Observado

"Cancelar" habilitado (sem `disabled` nem `aria-disabled`); o toque não fecha a folha, Esc também não. Quando a
leitura volta (`POST /functions/v1/customer-parse → 200`), a folha fecha sozinha, Nome vira "Paula Lima" e o
e-mail digitado vira "paula.lima@exemplo.invalid", com as marcas "Lido do texto — confira." e o aviso de leitura.

#### Evidência

- `screenshots/CH-02-09-cancelar-ignorado.png` — os campos preenchidos pela leitura que ela tentou cancelar

#### Ocorrências

| Sessão | Persona | Passo | Evidência |
| ------ | ------- | ----- | --------- |
| CH-02  | PER-01  | 12 (atraso 4 s, "Cancelar") | — |
| CH-02  | PER-01  | 13 (atraso 6 s, "Cancelar" e Esc) | `screenshots/CH-02-09-cancelar-ignorado.png` |

#### Relacionados

- **TC:** nenhum (edge case do charter)
- **Charter:** CH-02
- **Critério:** UC-05
- **Bugs:** nenhum

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `apps/mobile-adm/src/features/order-proposal/ui/FolhaColarTexto.tsx` | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/features/order-proposal/model/useLeituraDoTexto.ts` | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/pages/MontarPedidoPage.tsx` (só a fiação da folha) | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-003 · [Folha "Colar texto"] Cancelar durante a leitura não fecha, e a leitura troca o que a Adri digitou · high
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA
- Spec › Design › Folha · Colar texto: "Ler o texto" desligado vazio e durante a leitura; "Cancelar" não é desligado.
- UC-05: nada é gravado pela leitura; nada do que ela já fez se perde.

### Testes

- "Cancelar" durante "Lendo o texto…" fecha a folha — componente/página (vitest)
- a resposta da leitura que chega depois do cancelar não muda nenhum campo nem mostra o aviso de leitura — componente/página (vitest)

### Não faça

- mudar o contador "0 / 2000" (tarefa 22)
- mexer no cabeçalho, na barra e no voltar da montagem (tarefas 11 e 14)
- tocar arquivo fora da posse desta tarefa sem registrar no retorno; outras tarefas da mesma onda rodam ao mesmo tempo na mesma árvore

### Pronto quando

- [ ] BUG-003: o **Esperado** do bug acontece seguindo os **Passos** dele
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu, vermelho antes do fix
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho do arquivo de instruções do repositório

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
