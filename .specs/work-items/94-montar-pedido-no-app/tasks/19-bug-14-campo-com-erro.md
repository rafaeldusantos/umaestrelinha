## 19 · [apps/mobile-adm] BUG-014 — [Campo de texto com erro] CEP não achado e cupom recusado não marcam o campo como erro

**Status:** done

`BUG-014` — 94

**Objetivo.** O CEP não achado e o cupom recusado marcam o campo como erro — texto e borda de erro, `aria-invalid` e `aria-describedby`.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines; `apps/mobile-adm/CLAUDE.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** 14 e 21 (os mesmos arquivos). Confira que existe antes de começar.

### Critérios de aceite

### BUG-014 — [Campo de texto com erro] CEP não achado e cupom recusado não marcam o campo como erro

#### Resumo

Quando o CEP não é achado ou o cupom é recusado, a Adri lê a mensagem embaixo do campo, mas o campo continua
com a borda normal. No CEP a mensagem vem em tinta comum, e nenhum dos dois campos fica ligado à mensagem para o
leitor de tela.

**Origem:** sessão CH-09 · ambiente local

#### Impacto

- **Nível:** Cosmético
- **Persona mais atingida:** PER-03 Adri com a fonte grande — outras: PER-01
- **Jornada e passo:** UC-04 (passo 1, CEP) e UC-07 (passo 3, cupom)
- **Frequência:** sempre
- **Contorno:** a mensagem aparece abaixo do campo
- **Gravidade proposta na sessão:** low — mantida

#### Ambiente

- **URL:** `http://localhost:8084/pedidos/montar`
- **Tela:** Montar pedido, passos 1 e 3 · **Componente:** campo de texto com erro (CEP do endereço, código do cupom)
- **Branch / build:** `feature/94` @ `09b5b575`
- **Browser:** Chromium headless (Playwright MCP) · **Viewport:** 390 × 844
- **Rede:** local · **Idioma:** pt-BR

#### Passos

1. Entre no app do ateliê com a conta de administração, em `/pedidos`, toque em "Montar pedido" e em "Cliente nova"
2. Digite o CEP `99999-999`
3. Em outra montagem, no passo 3, digite o cupom `naoexiste99` e toque em "Aplicar"

#### Esperado

O campo no estado de erro (texto e borda de erro), como o `TextField` com `error` do protótipo.

**Fonte:** protótipo `Montar Pedido.dc.html` (`errs.cep`, `cp.err`)

#### Observado

CEP: "Não achei este CEP. Confira, ou preencha o endereço à mão." em tinta, borda `#8c8073` normal, sem
`aria-invalid` nem `aria-describedby`. Cupom: "Cupom inválido." em `role=alert` na cor de alerta `#7e2f2b`, mas o
campo sem borda de erro nem `aria-invalid`.

#### Evidência

- `screenshots/CH-09-09-cep-nao-achado.png` — o CEP não achado
- `screenshots/CH-09-16-cupom-recusado.png` — o cupom recusado

#### Design × implementado

| Propriedade | Protótipo | Observado | Confere |
| ----------- | --------- | --------- | ------- |
| Borda do campo com erro | borda de erro | `#8c8073` (normal) | não |
| Cor da mensagem do CEP | cor de erro | tinta | não |
| Ligação campo ↔ mensagem | estado de erro | sem `aria-invalid`/`aria-describedby` | não |

#### Relacionados

- **TC:** TC-UI-001
- **Charter:** CH-09
- **Critério:** UC-04, UC-07
- **Protótipo:** Claude Design `a780eec8-…` › `Montar Pedido.dc.html`, Passo 1 e Passo 3
- **Bugs:** nenhum

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `apps/mobile-adm/src/features/order-proposal/ui/CampoDaMontagem.tsx` | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/features/order-proposal/ui/FormularioDeEndereco.tsx` (o campo do CEP) | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/features/order-proposal/ui/PassoDosDescontos.tsx` (o campo do cupom) | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-014 · [Campo de texto com erro] CEP não achado e cupom recusado não marcam o campo como erro · low
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA
- `apps/mobile-adm/src/shared/ui/campo.ts` é usado por outras telas do app: não o altere; o estado de erro mora no campo da montagem.

### Testes

- o CEP não achado deixa o campo com `aria-invalid`, `aria-describedby` apontando a frase e a borda de erro — componente/página (vitest)
- o cupom recusado, o mesmo — componente/página (vitest)

### Não faça

- alterar `shared/ui/campo.ts`
- mudar a estrutura do formulário de endereço (tarefa 21)
- tocar arquivo fora da posse desta tarefa sem registrar no retorno; outras tarefas da mesma onda rodam ao mesmo tempo na mesma árvore

### Pronto quando

- [ ] BUG-014: o **Esperado** do bug acontece seguindo os **Passos** dele
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
