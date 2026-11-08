## 14 · [apps/mobile-adm] BUG-004, BUG-005, BUG-012, BUG-013 — Montar pedido · casca (cabeçalho fixo com o indicador, barra fixa)

**Status:** done

`BUG-004, BUG-005, BUG-012, BUG-013` — 94

**Objetivo.** O cabeçalho com o indicador e a barra fixa cabem na tela a 200 % de fonte sem esconder o campo digitado, a barra mostra o total no passo das peças, e o indicador e a barra seguem o desenho do protótipo.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines; `apps/mobile-adm/CLAUDE.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** 11 (`pages/MontarPedidoPage.tsx`). Confira que existe antes de começar.

### Critérios de aceite

### BUG-004 — [Montagem] A 200 % de fonte, cabeçalho e barra fixos cobrem a tela e escondem o campo digitado — fonte grande

#### Resumo

À noite a Adri usa a fonte do sistema a 200 %. Ao montar o pedido de uma cliente nova, ela toca no Nome, no
E-mail ou no WhatsApp e o teclado abre: o cabeçalho "Montar pedido · Passo 1 de 4 · Cliente" e a barra fixa
com "Continuar" ocupam juntos a tela inteira, um sobre o outro, e o campo em que ela digita fica atrás dos
dois. Num celular pequeno (320 × 568) não sobra área de conteúdo mesmo sem o teclado.

**Origem:** sessão CH-08 · ambiente local

#### Impacto

- **Nível:** Dano à confiança — ela digita nome, e-mail e WhatsApp sem ver o que escreve
- **Persona mais atingida:** PER-03 Adri com a fonte grande — outras: nenhuma
- **Jornada e passo:** J-01, passo 1 (dados da cliente nova)
- **Frequência:** sempre a 200 % (2 de 2: 390 × 500 com teclado simulado e 320 × 568 sem teclado); a 130 % sobram 124 px e 280 px
- **Contorno:** baixar a fonte do sistema durante a montagem
- **Gravidade proposta na sessão:** high — mantida

#### Ambiente

- **URL:** `http://localhost:8084/pedidos/montar` (passo 1)
- **Tela:** Montar pedido · **Componente:** cabeçalho fixo do passo e barra fixa ("Nenhuma peça ainda — Continuar")
- **Branch / build:** `feature/94` @ `09b5b575`
- **Browser:** Chromium headless (Playwright MCP) · **Viewport:** 390 × 500 (390 × 844 com o teclado aberto) e 320 × 568; fonte da raiz a 200 %
- **Rede:** local · **Idioma:** pt-BR

#### Passos

1. Com a fonte a 200 % (no browser: `font-size: 200%` no `<html>`) e o celular em 390 × 844, entre no app do
   ateliê com a conta de administração, em `/pedidos`
2. Toque em "Montar pedido" e em "Cliente nova"
3. Abra o teclado (viewport 390 × 500) tocando em "Nome", "E-mail" ou "WhatsApp"

#### Esperado

O campo focado e o botão da barra ficam visíveis com o teclado aberto; aceitável o campo visível depois de rolar.
Sem rolagem lateral.

**Fonte:** TC-CFR-001 › Metas ("barra fixa com o teclado aberto"); TC-PERSONA-002; `CLAUDE.md` › Convenções
(mobile primeiro, prova a 130/200 %, "CTA fixo brigando"); personas.md › PER-03, item 1

#### Observado

A 200 %: o cabeçalho é `sticky` e vai de 0 a 313 px; a barra é `fixed` e vai de 275 a 500 px. Os dois se
sobrepõem e o campo focado (202–298) fica atrás de ambos; rolar não resolve. Em 320 × 568 sem teclado:
cabeçalho 0–353, barra 343–568 (−10 px livres). Sem rolagem lateral em nenhum caso.

#### Evidência

- `screenshots/CH-08-05-teclado-200-campo-coberto.png` — 390 × 500 a 200 % com "E-mail" focado
- `screenshots/CH-08-07-320-200-sem-area-visivel.png` — 320 × 568 a 200 %, sem área de conteúdo

#### Ocorrências

| Sessão | Persona | Passo | Evidência |
| ------ | ------- | ----- | --------- |
| CH-08  | PER-03  | 05–06 (390 × 500, teclado) | `screenshots/CH-08-05-teclado-200-campo-coberto.png` |
| CH-08  | PER-03  | 07 (320 × 568, sem teclado) | `screenshots/CH-08-07-320-200-sem-area-visivel.png` |

#### Relacionados

- **TC:** TC-CFR-001, TC-PERSONA-002
- **Charter:** CH-08
- **Critério:** UC-02
- **Bugs:** BUG-005, BUG-012, BUG-013 (a mesma casca: barra e cabeçalho)

### BUG-005 — [Montagem · barra fixa] O total fica "—" no passo das peças, com peças na sacola

#### Resumo

Enquanto monta a sacola, a Adri olha a barra fixa para saber quanto está dando. A barra já diz "Itens · 2
peças · frete à parte", mas no lugar do valor mostra "—". O total só aparece quando ela chega ao passo 3
(Descontos).

**Origem:** sessão CH-01 (e visto no CH-02 e no CH-09) · ambiente local

#### Impacto

- **Nível:** Fricção
- **Persona mais atingida:** PER-01 Adri no WhatsApp — outras: nenhuma
- **Jornada e passo:** J-01/J-02, passo 3 (acrescentar as peças)
- **Frequência:** sempre
- **Contorno:** seguir ao passo 3 para ver o total
- **Gravidade proposta na sessão:** low — subiu para medium: a spec escreve o total na barra e ela o usa para
  acertar o valor com a cliente na conversa; não subiu mais porque o valor aparece um passo adiante sem ação dela

#### Ambiente

- **URL:** `http://localhost:8084/pedidos/montar` (passo 2)
- **Tela:** Montar pedido · Passo 2 Peças · **Componente:** barra fixa (total)
- **Branch / build:** `feature/94` @ `09b5b575`
- **Browser:** Chromium headless (Playwright MCP) · **Viewport:** 390 × 844
- **Rede:** local · **Idioma:** pt-BR

#### Passos

1. Entre no app do ateliê com a conta de administração, em `/pedidos`, e toque em "Montar pedido"
2. Escolha uma cliente cadastrada e toque em "Continuar"
3. Acrescente uma peça
4. Olhe a barra fixa

#### Esperado

"Itens · 1 peça · frete à parte" com o total; "—" só sem peças.

**Fonte:** spec › Design › Montar pedido — casca ("Itens · N peças · frete à parte" … "com o total (sem peças
'—')"); TC-FUNC-002 passo 7

#### Observado

"Itens · 1 peça · frete à parte" (e "· 2 peças") com o valor "—"; o total só aparece em "Passo 3 de 4 ·
Descontos" (R$ 459,80 com duas peças).

#### Evidência

- `screenshots/CH-01-05-duplo-toque-duas-linhas.png` — a barra com "—" e duas peças na sacola
- `screenshots/CH-09-15-sacola.png` — a barra com "—" e uma peça

#### Ocorrências

| Sessão | Persona | Passo | Evidência |
| ------ | ------- | ----- | --------- |
| CH-01  | PER-01  | 07–09, 18 | `screenshots/CH-01-05-duplo-toque-duas-linhas.png` |
| CH-02  | PER-01  | debrief (passo 2 depois de acrescentar) | — |
| CH-09  | PER-01  | 15 | `screenshots/CH-09-15-sacola.png` |

#### Relacionados

- **TC:** TC-FUNC-002, TC-PERSONA-001
- **Charter:** CH-01
- **Critério:** UC-02
- **Bugs:** BUG-013 (a mesma barra, divergências de desenho), BUG-004

### BUG-012 — [Montagem · indicador de passos] Sem os nomes dos passos e sem o destaque do passo atual

#### Resumo

No topo da montagem, a Adri vê quatro barras, sem "Cliente / Peças / Descontos / Revisar" embaixo; o passo
atual tem a mesma cor dos já feitos. O subtítulo "Passo n de 4 · Nome" continua orientando.

**Origem:** sessão CH-09 · ambiente local

#### Impacto

- **Nível:** Cosmético
- **Persona mais atingida:** PER-01 Adri no WhatsApp — outras: nenhuma
- **Jornada e passo:** UC-02, todos os passos da montagem
- **Frequência:** sempre
- **Contorno:** o subtítulo diz o passo
- **Gravidade proposta na sessão:** low — mantida

#### Ambiente

- **URL:** `http://localhost:8084/pedidos/montar`
- **Tela:** Montar pedido · **Componente:** cabeçalho — indicador de passos, título e subtítulo
- **Branch / build:** `feature/94` @ `09b5b575`
- **Browser:** Chromium headless (Playwright MCP) · **Viewport:** 390 × 844
- **Rede:** local · **Idioma:** pt-BR

#### Passos

1. Entre no app do ateliê com a conta de administração, em `/pedidos`, e toque em "Montar pedido"
2. Olhe a faixa de quatro barras sob o cabeçalho, nos passos 1, 3 e 4

#### Esperado

Cada segmento com a barra (4 px) e o rótulo visível (12 px); o atual em `--estrelinha-accent`, os feitos em
primária, os demais em line; título 17 px, subtítulo 12 px.

**Fonte:** protótipo `Montar Pedido.dc.html`, Montar pedido — casca (`steps`); spec › Design › casca
("Indicador com 4 segmentos rotulados")

#### Observado

Só as barras (6 px), rótulos só no `aria-label`; passo atual em primária `#34495e`; título 20 px, subtítulo 14 px.

#### Evidência

- `screenshots/CH-09-05-passo1-sem-resultado.png` — o indicador no passo 1

#### Design × implementado

| Propriedade | Protótipo | Observado | Confere |
| ----------- | --------- | --------- | ------- |
| Rótulos dos passos | visíveis, 12 px | ausentes (só `aria-label`) | não |
| Cor do passo atual | `--estrelinha-accent` | `#34495e` | não |
| Altura da barra | 4 px | 6 px | não |
| Título / subtítulo | 17 / 12 px | 20 / 14 px | não |

#### Relacionados

- **TC:** TC-UI-001
- **Charter:** CH-09
- **Critério:** UC-02
- **Protótipo:** Claude Design `a780eec8-…` › `Montar Pedido.dc.html`, casca
- **Bugs:** BUG-004 (o mesmo cabeçalho a 200 %)

### BUG-013 — [Montagem · barra fixa] Motivo sem a cor de espera, botão estreito e a recusa do combinado fora da barra

#### Resumo

Na barra fixa da montagem, o motivo do bloqueio aparece em tinta comum, e o botão "Continuar"/"Criar link" é
estreito. No passo 3, com um desconto combinado que zeraria o pedido, "O desconto não pode zerar o pedido." só
aparece sob o campo — a barra não mostra motivo nenhum até a Adri tocar em "Continuar".

**Origem:** sessão CH-09 (e o mesmo comportamento no CH-01 e no CH-03) · ambiente local

#### Impacto

- **Nível:** Cosmético
- **Persona mais atingida:** PER-01 Adri no WhatsApp — outras: nenhuma
- **Jornada e passo:** UC-02/UC-07, passos 1 e 3
- **Frequência:** sempre
- **Contorno:** o erro aparece sob o campo; tocar em "Continuar" o leva à barra
- **Gravidade proposta na sessão:** low — mantida

#### Ambiente

- **URL:** `http://localhost:8084/pedidos/montar`
- **Tela:** Montar pedido · **Componente:** barra fixa (motivo do bloqueio e botão)
- **Branch / build:** `feature/94` @ `09b5b575`
- **Browser:** Chromium headless (Playwright MCP) · **Viewport:** 390 × 844
- **Rede:** local · **Idioma:** pt-BR

#### Passos

1. Entre no app do ateliê com a conta de administração, em `/pedidos`, e toque em "Montar pedido"
2. Olhe a barra no passo 1 sem cliente ("Escolha a cliente para continuar.")
3. Escolha a cliente, acrescente uma peça e siga ao passo 3
4. Ligue "Desconto combinado", "Em %", 100, e olhe a barra antes de tocar em "Continuar"

#### Esperado

Motivo em `--estrelinha-wait`, 13 px, acima do total; no passo 3, "O desconto não pode zerar o pedido." aparece
logo na barra; botão com 190 px.

**Fonte:** protótipo `Montar Pedido.dc.html` (`hasBlock`, `showBlock`); spec › Design › casca ("o motivo do
bloqueio (cor de espera)"; "'O desconto não pode zerar o pedido.' aparece logo")

#### Observado

Motivo em tinta `#23303a`, 14 px; com o combinado em 100 % a barra não mostra motivo (só o erro abaixo do campo),
e o motivo chega à barra depois do toque em "Continuar" (CH-03 passo 10); "Continuar" 119 px, "Criar link" 113 px.

#### Evidência

- `screenshots/CH-09-05-passo1-sem-resultado.png` — o motivo do passo 1 na barra
- `screenshots/CH-09-17-combinado-zera.png` — o combinado em 100 % sem motivo na barra

#### Design × implementado

| Propriedade | Protótipo | Observado | Confere |
| ----------- | --------- | --------- | ------- |
| Cor do motivo | `--estrelinha-wait` | `#23303a` | não |
| Tamanho do motivo | 13 px | 14 px | não |
| Recusa do combinado na barra | logo | só depois de tocar em "Continuar" | não |
| Largura do botão | 190 px | 119 / 113 px | não |

#### Relacionados

- **TC:** TC-UI-001
- **Charter:** CH-09
- **Critério:** UC-02, UC-07
- **Protótipo:** Claude Design `a780eec8-…` › `Montar Pedido.dc.html`, casca
- **Bugs:** BUG-005 (a mesma barra, total "—"), BUG-004

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `apps/mobile-adm/src/pages/MontarPedidoPage.tsx` (cabeçalho, indicador e barra) | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/features/order-proposal/model/montagem.ts` | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/features/order-proposal/model/useResumoDaMontagem.ts` | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/features/order-proposal/ui/PassoDosDescontos.tsx` (só a recusa do combinado que vai para a barra) | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-004 · [Montagem] A 200 % de fonte, cabeçalho e barra fixos cobrem a tela e escondem o campo digitado — fonte grande · high
- **Bug**: BUG-005 · [Montagem · barra fixa] O total fica "—" no passo das peças, com peças na sacola · medium
- **Bug**: BUG-012 · [Montagem · indicador de passos] Sem os nomes dos passos e sem o destaque do passo atual · low
- **Bug**: BUG-013 · [Montagem · barra fixa] Motivo sem a cor de espera, botão estreito e a recusa do combinado fora da barra · low
- **Lote**: mesma tela, a casca de `pages/MontarPedidoPage.tsx` — o cabeçalho `sticky` e a barra `fixed`; BUG-004 é o tamanho dos dois juntos, os outros três são a barra e o indicador
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA
- Spec › Design › Montar pedido — casca: "Itens · N peças · frete à parte" com o total (sem peças "—"); o motivo do bloqueio fica escrito na barra (MON-12).
- `CLAUDE.md` (raiz) › Convenções: mobile primeiro, CTA fixo brigando com a barra do sistema, prova a 130 % e 200 %.

### Testes

- o total aparece na barra no passo das peças assim que há peça na sacola; "—" só sem peças — componente/página (vitest)
- o indicador com os nomes dos passos e o atual destacado (`aria-current`) — componente/página (vitest)
- o motivo na barra com a cor de espera e a recusa do combinado dentro da barra — componente/página (vitest)
- a 200 % o cabeçalho e a barra não se sobrepõem — régua de classe (jsdom não mede layout; a medida fica para o reteste) — componente/página (vitest)

### Não faça

- mudar a tipografia do total da barra (tarefa 20)
- mexer no voltar e no histórico (tarefa 11)
- mexer na folha "Colar texto" (tarefa 13)
- tocar arquivo fora da posse desta tarefa sem registrar no retorno; outras tarefas da mesma onda rodam ao mesmo tempo na mesma árvore

### Pronto quando

- [ ] BUG-004: o **Esperado** do bug acontece seguindo os **Passos** dele
- [ ] BUG-005: o **Esperado** do bug acontece seguindo os **Passos** dele
- [ ] BUG-012: o **Esperado** do bug acontece seguindo os **Passos** dele
- [ ] BUG-013: o **Esperado** do bug acontece seguindo os **Passos** dele
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
