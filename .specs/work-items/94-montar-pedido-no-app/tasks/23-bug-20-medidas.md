## 23 · [apps/mobile-adm] BUG-020 — [Medidas] Foto da peça no pedido montado, raios, espaços e botões secundários fora do protótipo

**Status:** done

`BUG-020` — 94

**Objetivo.** A foto da peça no pedido montado, os raios, os espaços e os botões secundários seguem as medidas do protótipo.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines; `apps/mobile-adm/CLAUDE.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** 17, 19 e 22 (os mesmos arquivos). Confira que existe antes de começar.

### Critérios de aceite

### BUG-020 — [Medidas] Foto da peça no pedido montado, raios, espaços e botões secundários fora do protótipo

#### Resumo

Algumas medidas fixadas no protótipo saíram com outro valor: a foto da peça no pedido montado é maior, o
segmento escolhido tem raio menor, o seletor "Em reais / Em %" desligado não tem borda, o cartão de Montados tem
espaço interno menor, e os botões secundários das folhas ("Manter", "Continuar montando", "Cancelar") não têm
contorno.

**Origem:** sessão CH-09 · ambiente local

#### Impacto

- **Nível:** Cosmético
- **Persona mais atingida:** PER-01 Adri no WhatsApp — outras: nenhuma
- **Jornada e passo:** UC-01, UC-02, UC-07, UC-09
- **Frequência:** sempre
- **Contorno:** nenhum necessário
- **Gravidade proposta na sessão:** low — mantida

#### Ambiente

- **URL:** `http://localhost:8084/pedidos?visao=montados`, `/pedidos/montar`, `/pedidos/montados/<id>`
- **Tela:** Montados, Montar pedido, Pedido montado · **Componente:** medidas (foto da peça, segmentado, cartão de
  Montados, botões secundários das folhas)
- **Branch / build:** `feature/94` @ `09b5b575`
- **Browser:** Chromium headless (Playwright MCP) · **Viewport:** 390 × 844
- **Rede:** local · **Idioma:** pt-BR

#### Passos

1. Entre no app do ateliê com a conta de administração e abra `/pedidos?visao=montados`; olhe o espaço interno
   de um cartão
2. Abra um pedido montado aberto; olhe a foto da peça; toque em "Cancelar este pedido" e olhe "Manter"
3. Toque em "Montar pedido"; no passo 3, olhe o seletor "Em reais / Em %"; feche a montagem com algo preenchido
   e olhe "Continuar montando"

#### Esperado

Ver a tabela abaixo.

**Fonte:** protótipo `Montar Pedido.dc.html`; spec › Design › Pedido montado (app) ("foto 48×60")

#### Observado

Ver a tabela abaixo.

#### Evidência

- `screenshots/CH-09-02-aberta.png` — a foto da peça 56 × 70
- `screenshots/CH-09-20-folha-cancelar.png` — "Manter" sem contorno
- `screenshots/CH-09-17-combinado-zera.png` — o seletor "Em reais / Em %"
- `screenshots/CH-09-01-montados.png` — o cartão de Montados

#### Design × implementado

| Propriedade | Protótipo | Observado | Confere |
| ----------- | --------- | --------- | ------- |
| Foto da peça no pedido montado | 48 × 60 | 56 × 70 | não |
| Raio do segmento escolhido | 8 | 6 | não |
| Opção desligada de "Em reais / Em %" | borda 2 px field | sem borda | não |
| `gap` interno do cartão de Montados | 10 px | 8 px | não |
| Botões secundários das folhas | `secondary` (com contorno) | sem contorno | não |

#### Relacionados

- **TC:** TC-UI-001
- **Charter:** CH-09
- **Critério:** UC-01, UC-02, UC-07, UC-09
- **Protótipo:** Claude Design `a780eec8-…` › `Montar Pedido.dc.html`
- **Bugs:** BUG-011 (o raio das faixas, registrado lá)

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `apps/mobile-adm/src/pages/PedidoMontadoPage.tsx` (a foto da peça) | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/features/order-proposal/ui/PassoDosDescontos.tsx` (o segmento Em reais / Em %) | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/widgets/proposal-list/ui/ListaDeMontados.tsx` (o cartão) | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/features/order-proposal/ui/FolhaDeConfirmacao.tsx e as folhas da montagem` (o botão secundário) | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-020 · [Medidas] Foto da peça no pedido montado, raios, espaços e botões secundários fora do protótipo · low
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA
- Alvo de toque ≥ 44 px continua valendo (`touchTarget`, `TAP_44`) ao trocar a medida dos botões.

### Testes

- cada medida da tabela do bug pela classe (token exato) — componente/página (vitest)

### Não faça

- alterar `packages/ui`
- mudar texto (tarefa 22) ou tipografia (tarefa 20)
- tocar arquivo fora da posse desta tarefa sem registrar no retorno; outras tarefas da mesma onda rodam ao mesmo tempo na mesma árvore

### Pronto quando

- [ ] BUG-020: o **Esperado** do bug acontece seguindo os **Passos** dele
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
