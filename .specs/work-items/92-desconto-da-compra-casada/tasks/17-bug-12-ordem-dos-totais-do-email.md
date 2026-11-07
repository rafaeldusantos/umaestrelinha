## 17 · [functions] BUG-012 — [E-mail · Pedido recebido] Os totais do e-mail põem o Frete antes dos descontos, fora da ordem do painel

**Status:** done

`BUG-012` — 92

**Objetivo.** O bug BUG-012 da rodada 1 da QA deixa de acontecer: o que a tela mostra passa a ser o que o critério de aceite de cada bug diz que é esperado.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines; `packages/core/CLAUDE.md` (inteiro); `supabase/CLAUDE.md` › edge functions, e-mail; `.specs/LESSONS.md` › L-013, L-014, L-015. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** as tarefas 01–08 (`done`, commitadas) — o desconto do Compre Junto já está na árvore. Confira que existe antes de começar.

### Critérios de aceite

### BUG-012 — [E-mail · Pedido recebido] Os totais do e-mail põem o Frete antes dos descontos, fora da ordem do painel

#### Resumo

O e-mail "Pedido recebido" de um pedido com o desconto do Compre Junto e cupom traz a peça certa ("Compre Junto · 15% a menos", com o cheio riscado), e a conta fecha. Os totais, porém, põem o Frete logo depois do Subtotal, antes dos descontos, e não na ordem do painel decidida no Gate 1.

**Origem:** sessão CH-03 · prévia da aba Notificações, no ambiente local

#### Impacto

- **Nível:** Cosmético. A conta fecha. A ordem não afeta o que a cliente pagou nem a confiança no valor
- **Persona mais atingida:** PER-04 Helena
- **Jornada e passo:** J-03, passo 7 (e-mail)
- **Frequência:** sempre (1 de 1 na prévia do #0363). A confirmação do mesmo pedido repete a ordem (BUG-011)
- **Contorno:** nenhum necessário
- **Gravidade proposta na sessão:** medium. Aqui desce para low, pelo mesmo motivo do BUG-011

#### Ambiente

- **URL:** http://localhost:8083/admin/configuracoes/notificacoes (prévia com o `order_id`)
- **Tela:** e-mail "Pedido recebido" · **Componente:** totais do e-mail
- **Branch / build:** `feature/92`, dev server Vite, `send-notification` servida no local
- **Browser:** Chromium headless (Playwright MCP) · **Viewport:** 1440 × 900
- **Rede:** local (envio real desligado) · **Idioma:** pt-BR

#### Passos

1. Ter um pedido com o desconto do Compre Junto e cupom. Por exemplo: o pingente QA Pingente Estrela com o QA Berloque Coração pelo bloco, o cupom QA92CUPOM15 e PIX (#0363, `5b1f1fcb-951f-4b24-a4a7-4e384f4c30c2` no banco local)
2. No painel (`admin-painel`), abrir `/admin/configuracoes/notificacoes` e informar o UUID do pedido em "ID do pedido (UUID)"
3. Abrir "Pedido recebido", ver a prévia e ler os totais

#### Esperado

Subtotal · Desconto do Compre Junto · Cupom · Desconto PIX · Frete · Total.

**Fonte:** decisão Q-01 do Gate 1 (2026-11-04); TC-INT-004 ("O Frete antes dos descontos é bug"); o painel do mesmo pedido

#### Observado

"Subtotal R$ 329,80 · Frete R$ 19,90 · Desconto do Compre Junto −R$ 10,48 · Cupom −R$ 47,90 · Desconto PIX −R$ 19,00 · Total R$ 272,32".

#### Evidência

- `screenshots/CH-03-34-email-previa-0363-1440.png`: a prévia do e-mail com o Frete em 2º
- `screenshots/CH-03-33-painel-0363-1440.png`: o painel do mesmo pedido, com o Frete antes do Total

#### Relacionados

- **TC:** TC-INT-004
- **Charter:** CH-03
- **Critério:** CA-05.2
- **Bugs:** BUG-011 (loja) e BUG-010 (app), com o mesmo padrão

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| `supabase/functions/send-notification/render/layout.ts` — onde o sintoma aparece (localizado pelo planejamento, não diagnosticado) | VOCÊ ALTERA, se a causa estiver aqui | — | — |

Só o que ESTA tarefa cria ou consome. `JÁ EXISTE` é afirmação a conferir no código. A causa é do seu diagnóstico: se ela morar fora destes arquivos, siga até ela e diga no retorno.

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-012 · [E-mail · Pedido recebido] Os totais do e-mail põem o Frete antes dos descontos, fora da ordem do painel · low
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA
- **D-38** (spec.md, Decisões): A ordem do resumo nas três pontas — a ordem do painel do pedido (descontos e PIX antes do Frete) vale; a loja (confirmação, Minha conta, e-mail) e o app passam a segui-la — revisa D-36; a diferença é bug da loja e do app. O preço por item (unidade × total da linha) não muda

### Testes

- o comportamento esperado de BUG-012 (a reprodução do bug, que hoje dá o obtido, passa a dar o esperado) — escreva o teste antes do conserto e veja-o reprovar; no nível mais baixo que alcance o defeito (unidade em `core` quando a regra mora lá; componente ou página real quando o defeito é de fiação ou de tela)

### Não faça

- não mude o `status` nem o corpo dos arquivos de `qa/issues/` — reteste e fechamento são da QA
- não corrija outro bug da rodada que não esteja nesta tarefa (BUG-001..013 têm cada um a sua fix task)
- não toque na Adesão por causa da P-01 (`qa/decisoes-produto.md`): o destino é um WI novo
- não altere `packages/core/src/payment/**` sem que o diagnóstico mostre que a causa está lá; se estiver, diga no retorno

### Pronto quando

- [ ] a reprodução de BUG-012 dá o **Esperado** do bug, provado por um teste que reprovou antes do conserto
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
