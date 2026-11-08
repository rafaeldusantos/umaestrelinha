## 17 · [apps/mobile-adm] BUG-009, BUG-011, BUG-015 — Pedido montado · Histórico, faixa de estado e ações

**Status:** done

`BUG-009, BUG-011, BUG-015` — 94

**Objetivo.** O Histórico do pedido montado diz o que aconteceu com o link, a faixa da Concluída tem o tom de concluído com "Ver o pedido" à mão, e o cartão do link, a mensagem, o histórico e as ações da Aberta seguem o protótipo.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines; `apps/mobile-adm/CLAUDE.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

### Critérios de aceite

### BUG-009 — [Pedido montado · Histórico] Renovar, cancelar e concluir gravam linhas sem o que aconteceu com o link

#### Resumo

Dias depois de renovar ou cancelar um pedido montado, a Adri abre o histórico para lembrar o que fez. As linhas
dizem só "Prazo renovado" e "Cancelado" — nada de "link novo, o anterior parou de funcionar", nem "por você". Na
concluída, a linha diz "Concluído pela cliente" sem o número do pedido. Na hora, o toast avisou; o histórico
não guarda o aviso.

**Origem:** sessões CH-06 e CH-09 · ambiente local

#### Impacto

- **Nível:** Cosmético
- **Persona mais atingida:** PER-02 Adri interrompida — outras: nenhuma
- **Jornada e passo:** J-04, ramos J-04a/J-04b (renovar, cancelar)
- **Frequência:** sempre
- **Contorno:** a faixa do estado e o link mostrado na tela dizem o estado atual
- **Gravidade proposta na sessão:** low — mantida

#### Ambiente

- **URL:** `http://localhost:8084/pedidos/montados/<id>`
- **Tela:** Pedido montado · **Componente:** Histórico
- **Branch / build:** `feature/94` @ `09b5b575`
- **Browser:** Chromium headless (Playwright MCP) · **Viewport:** 390 × 844
- **Rede:** local · **Idioma:** pt-BR

#### Passos

1. Entre no app do ateliê com a conta de administração e abra `/pedidos?visao=montados`
2. Abra um pedido montado Expirado, toque em "Renovar prazo" e confirme "Renovar"; olhe o Histórico
3. Abra um pedido montado Aberto, toque em "Cancelar este pedido" e confirme "Cancelar pedido"; olhe o Histórico
4. Abra um pedido montado Concluído; olhe o Histórico

#### Esperado

As linhas da costura: "Prazo renovado · link novo, o anterior parou de funcionar", "Cancelado por você",
"Concluído pela cliente · pedido #0262" e "Aberto pela cliente".

**Fonte:** spec › Design › Pedido montado (app), lista do Histórico; TC-FUNC-028 passos 3 e 5; protótipo `Montar Pedido.dc.html`, Pedido montado

#### Observado

| Linha            | Costura / protótipo                                     | Observado                |
| ---------------- | ------------------------------------------------------- | ------------------------ |
| renovar          | "Prazo renovado · link novo, o anterior parou de funcionar" | "Prazo renovado"     |
| cancelar         | "Cancelado por você"                                    | "Cancelado"              |
| concluída        | "Concluído pela cliente · pedido #0262"                 | "Concluído pela cliente" |
| aberto pela loja | "Aberto pela cliente"                                   | "Visto pela cliente"     |

#### Evidência

- `screenshots/CH-06-10-renovado.png` — o histórico de P-0009 depois de renovar
- `screenshots/CH-06-12-cancelado.png` — o histórico de P-0033 depois de cancelar
- `screenshots/CH-09-03-concluida.png` — o histórico de uma concluída

#### Ocorrências

| Sessão | Persona | Passo | Evidência |
| ------ | ------- | ----- | --------- |
| CH-06  | PER-02  | 11 (renovar) | `screenshots/CH-06-10-renovado.png` |
| CH-06  | PER-02  | 12 (cancelar) | `screenshots/CH-06-12-cancelado.png` |
| CH-09  | PER-01  | 03 (concluída) | `screenshots/CH-09-03-concluida.png` |

#### Relacionados

- **TC:** TC-FUNC-028, TC-UI-001
- **Charter:** CH-06, CH-09
- **Critério:** UC-09
- **Protótipo:** Claude Design `a780eec8-…` › `Montar Pedido.dc.html`, Pedido montado
- **Bugs:** BUG-015 (o mesmo Histórico, marcadores de desenho)

### BUG-011 — [Pedido montado · Concluída] A faixa não tem o tom de concluído e "Ver o pedido" fica no fim da rolagem

#### Resumo

A Adri abre um pedido montado que a cliente concluiu. A faixa do topo tem a mesma cor da faixa de um cancelado,
e a ação principal, "Ver o pedido #N", não está num rodapé fixo: fica no fim da página, depois do Histórico,
abaixo da dobra.

**Origem:** sessão CH-09 · ambiente local

#### Impacto

- **Nível:** Cosmético
- **Persona mais atingida:** PER-01 Adri no WhatsApp — outras: nenhuma
- **Jornada e passo:** UC-09, pedido montado Concluído
- **Frequência:** sempre (toda concluída da lista)
- **Contorno:** rolar até o fim
- **Gravidade proposta na sessão:** low — mantida

#### Ambiente

- **URL:** `http://localhost:8084/pedidos/montados/<id da P-0014>`
- **Tela:** Pedido montado (Concluída) · **Componente:** faixa de estado e ação "Ver o pedido"
- **Branch / build:** `feature/94` @ `09b5b575`
- **Browser:** Chromium headless (Playwright MCP) · **Viewport:** 390 × 844
- **Rede:** local · **Idioma:** pt-BR

#### Passos

1. Entre no app do ateliê com a conta de administração e abra `/pedidos?visao=montados`
2. Toque num pedido montado Concluído (P-0014)
3. Olhe a faixa do topo e procure "Ver o pedido #0366"

#### Esperado

Rodapé fixo (fundo surface, borda superior) com o botão primário "Ver o pedido #N"; faixa em
`--estrelinha-done-soft` com texto `--estrelinha-done`, raio 12.

**Fonte:** protótipo `Montar Pedido.dc.html`, Pedido montado (`pr.temRodape`, `pr.concluida`); spec › Design ›
Pedido montado (app) ("Concluída 'Ver o pedido #0262'")

#### Observado

O botão está no fluxo, depois do Histórico (bottom 984 px numa tela de 844); a faixa em `#f1ebe1` com texto
`#23303a`, raio 20 — igual à faixa da Cancelada.

#### Evidência

- `screenshots/CH-09-03-concluida.png` — faixa e botão no fim da página
- `screenshots/CH-09-04-cancelada.png` — a faixa da Cancelada, com o mesmo tom

#### Design × implementado

| Propriedade | Protótipo | Observado | Confere |
| ----------- | --------- | --------- | ------- |
| Posição de "Ver o pedido" | rodapé fixo | no fluxo, depois do Histórico | não |
| Fundo da faixa | `--estrelinha-done-soft` | `#f1ebe1` | não |
| Texto da faixa | `--estrelinha-done` | `#23303a` | não |
| Raio da faixa | 12 | 20 | não |
| Texto da faixa | "<nome> concluiu no link. O pedido #N segue na fila…" | igual | sim |

#### Relacionados

- **TC:** TC-UI-001
- **Charter:** CH-09
- **Critério:** UC-09
- **Protótipo:** Claude Design `a780eec8-…` › `Montar Pedido.dc.html`, Pedido montado
- **Bugs:** BUG-015 (a mesma tela, estado Aberta)

### BUG-015 — [Pedido montado · Aberta] Cartão do link, mensagem, histórico e ações com outro desenho

#### Resumo

No pedido montado aberto, o cartão escuro do link, a mensagem do WhatsApp, o Histórico e os botões de ação têm
desenho diferente do protótipo: título grande no lugar do sobretítulo, caixa do link sem borda e em fonte
monoespaçada, botões com outras cores, mensagem sem caixa, histórico sem a linha do tempo, "Editar" e "Cancelar"
lado a lado. Os textos e o funcionamento estão certos.

**Origem:** sessão CH-09 · ambiente local

#### Impacto

- **Nível:** Cosmético
- **Persona mais atingida:** PER-01 Adri no WhatsApp — outras: nenhuma
- **Jornada e passo:** J-04, passo 2 (reabrir o pedido montado e copiar o link)
- **Frequência:** sempre
- **Contorno:** nenhum necessário
- **Gravidade proposta na sessão:** low — mantida

#### Ambiente

- **URL:** `http://localhost:8084/pedidos/montados/<id da P-0034>`
- **Tela:** Pedido montado (Aberta) · **Componente:** cartão do link, cartão da mensagem do WhatsApp, Histórico, ações
- **Branch / build:** `feature/94` @ `09b5b575`
- **Browser:** Chromium headless (Playwright MCP) · **Viewport:** 390 × 844
- **Rede:** local · **Idioma:** pt-BR

#### Passos

1. Entre no app do ateliê com a conta de administração e abra `/pedidos?visao=montados`
2. Toque num pedido montado Aberto (P-0034)
3. Compare o cartão do link, a mensagem do WhatsApp, o Histórico e as ações com o protótipo

#### Esperado

Ver a tabela abaixo.

**Fonte:** protótipo `Montar Pedido.dc.html`, Pedido montado

#### Observado

Ver a tabela abaixo. O contraste do cartão passa (~12,2:1 nos textos, 7,7:1 no botão do WhatsApp — CH-08).

#### Evidência

- `screenshots/CH-09-02-aberta.png` — o pedido montado aberto
- `screenshots/CH-09-04-cancelada.png` — o histórico sem marcadores

#### Design × implementado

| Propriedade | Protótipo | Observado | Confere |
| ----------- | --------- | --------- | ------- |
| "Link para X" | sobretítulo 11 px, 600, maiúsculas | Libre Baskerville 16 px, 700, normal | não |
| Caixa do link | borda `on-ink-border`, fonte do corpo | sem borda, monoespaçada | não |
| "Enviar pelo WhatsApp" | `--estrelinha-whatsapp`, texto tinta, display 700 15 px | `#075e54`, texto `#ffffff`, Outfit 500 16 px | não |
| "Copiar link" | `on-ink-surface` translúcido, borda, texto on-primary | `#f7f3ec` sólido, sem borda, texto tinta | não |
| Nota de validade | 13 px 300 | 12 px 400 | não |
| Padding do cartão | 18 px | 16 px | não |
| Mensagem do WhatsApp | caixa `ground-deep`, raio 12 | sem caixa | não |
| Histórico | ponto (accent no mais recente) e linha do tempo | só texto | não |
| Editar / Cancelar | `secondary` / `ghost` centrado | sólido tinta / contorno `#7e2f2b`, lado a lado | não |

#### Relacionados

- **TC:** TC-UI-001
- **Charter:** CH-09
- **Critério:** UC-09
- **Protótipo:** Claude Design `a780eec8-…` › `Montar Pedido.dc.html`, Pedido montado
- **Bugs:** BUG-009 (textos do mesmo Histórico), BUG-011 (a mesma tela, Concluída)

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `apps/mobile-adm/src/pages/PedidoMontadoPage.tsx` | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/features/order-proposal/model/frases.ts` | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/features/order-proposal/ui/CartaoDoLink.tsx` | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |
| `apps/mobile-adm/src/features/order-proposal/ui/SeloDoMontado.tsx` | JÁ EXISTE. Posse desta tarefa: altere só o necessário ao fix | — | o fix |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-009 · [Pedido montado · Histórico] Renovar, cancelar e concluir gravam linhas sem o que aconteceu com o link · low
- **Bug**: BUG-011 · [Pedido montado · Concluída] A faixa não tem o tom de concluído e "Ver o pedido" fica no fim da rolagem · low
- **Bug**: BUG-015 · [Pedido montado · Aberta] Cartão do link, mensagem, histórico e ações com outro desenho · low
- **Lote**: mesma tela, `pages/PedidoMontadoPage.tsx`; BUG-009 e BUG-015 tocam o mesmo Histórico, BUG-011 e BUG-015 as ações por estado
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA
- D-35: o selo "Aberta — vista pela cliente" é desvio decidido na costura — não volte ao texto do protótipo.
- D-36: a observação não é editável na proposta concluída.

### Testes

- as quatro linhas do Histórico com o texto da costura (renovar, cancelar, concluída com o número do pedido, aberto pela cliente) — componente/página (vitest)
- a faixa da Concluída com o tom de concluído e "Ver o pedido #NNNN" antes do fim da rolagem — componente/página (vitest)
- o cartão do link, a mensagem e as ações da Aberta na ordem e no desenho do protótipo — componente/página (vitest)

### Não faça

- mudar o sinal do desconto (tarefa 22)
- mudar a medida da foto da peça (tarefa 23)
- mexer na function `order-proposals`
- tocar arquivo fora da posse desta tarefa sem registrar no retorno; outras tarefas da mesma onda rodam ao mesmo tempo na mesma árvore

### Pronto quando

- [ ] BUG-009: o **Esperado** do bug acontece seguindo os **Passos** dele
- [ ] BUG-011: o **Esperado** do bug acontece seguindo os **Passos** dele
- [ ] BUG-015: o **Esperado** do bug acontece seguindo os **Passos** dele
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
