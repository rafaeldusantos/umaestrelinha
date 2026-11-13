## 16 · [packages/core · apps/store · supabase/functions] BUG-008 — [Cupom] QA10 desconta a peça de campanha que tem “de/por” — sacola, checkout e pedido

**Status:** done

`BUG-008` — 102 · fix task da QA, rodada 2 (`qa/qa-result.md`, lote L1)

**Objetivo.** O cupom nunca desconta peça de campanha — inclusive a que já tinha "de/por" —, na sacola, no checkout, no servidor e no pedido gravado; a recusa e a base elegível são as mesmas da M-A.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines · Feature-Sliced Design / Alias de import; `apps/store/CLAUDE.md` (carrinho, checkout, pedido); `packages/core/CLAUDE.md` › Dinheiro; `supabase/CLAUDE.md` (edge functions, servir no local com `--env-file` de chaves inválidas). Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** nada desta rodada. A tarefa 11 (`done`, BUG-002) mudou o preço da peça com "de/por" para o menor entre o "por" e o "de" com o desconto; o defeito aparece justamente nessa peça.

**Onde mora.** Regra pura de cupom e campanha em `packages/core/src/payment/pricing.ts` (o predicado de "linha de campanha" e a base do cupom) e `packages/core/src/coupons/rules.ts`; na loja, o que monta a linha da sacola com a campanha (`apps/store/src/entities/cart/lib/campaignPricing.ts`) e o cupom da sacola/checkout; no servidor, `supabase/functions/checkout/` (que relê o preço e grava o pedido). Localização feita só para saber onde o bug mora — a causa é do diagnóstico de quem executa.

### Critérios de aceite

### BUG-008 — [Cupom] QA10 desconta a peça de campanha que tem “de/por” — sacola, checkout e pedido

#### Resumo

A cliente põe na sacola a M-C, uma peça da "Dia das Mães" que já tinha "de/por" e sai a R$ 336,60, e aplica o cupom
`QA10`. A loja aceita o cupom: "QA10 aplicado −R$ 33,66". Com uma peça comum junto, o cupom desconta as duas, na
sacola, no checkout e no pedido gravado. Com a M-A, que também é peça de campanha, a loja recusa o mesmo cupom e
desconta só a peça comum. A regra que a cliente vê muda de uma peça em oferta para outra, e a loja dá o desconto da
campanha e o do cupom somados na M-C.

**Origem:** sessão CH-04 (rodada 2, confirmação) · loja local do worktree `store__feature-102`

#### Impacto

- **Nível:** Dano à confiança
- **Persona mais atingida:** PER-01 Adri (a loja dá o desconto da campanha e o do cupom somados, contra a regra que
  ela configurou; R$ 33,66 a mais por unidade de M-C, no pedido gravado). Outras: PER-03 Helena (o cupom vale numa
  peça em oferta e é recusado na outra)
- **Jornada e passo:** J-04, passo 3 (aplicar o cupom) até o pedido; J-04a (sacola só com oferta)
- **Frequência:** sempre (3 de 3: sacola só com M-C, cupom reaplicado do zero e pedido #0607)
- **Contorno:** nenhum
- **Gravidade proposta na sessão:** high. Mantida, no mesmo nível do BUG-002, que somava a campanha ao "de/por" na
  mesma peça

#### Ambiente

- **URL:** `http://localhost:8092/produtos/pulseira-esferas-leite-materno-prata-925`, gaveta da sacola, checkout,
  `/pedido/:id`
- **Tela:** Sacola, Checkout e Pedido · **Componente:** cupom (campo e linha "Cupom QA10")
- **Branch / build:** `feature/102`, HEAD `36196100`, Vite de dev do worktree
- **Browser:** Chromium headless (agent-browser 0.39.1), toque real pelo CDP · **Viewport:** 390 × 844 (sacola) e
  1440 × 900 (checkout)
- **Rede:** local, sem limitação · **Idioma:** pt-BR

#### Passos

1. Sem login, com a sacola vazia e a "Dia das Mães" em vigência (M-C marcada com 10 %), abrir
   `http://localhost:8092/produtos/pulseira-esferas-leite-materno-prata-925`. É a M-C: "de" R$ 374,00, "por"
   R$ 349,90, R$ 336,60 na campanha. Tocar em "Adicionar à sacola"
2. Na sacola, aplicar o cupom `QA10`
3. Acrescentar a peça comum `/produtos/pulseira-afetiva-oval-com-leite-materno-em-prata-925` (M-E, R$ 340,00) e ler
   a linha do cupom
4. Ir ao checkout, pagar com PIX como convidada e abrir `/pedido/:id`

#### Esperado

O cupom não vale para a peça de campanha. Só com a M-C na sacola, ele é recusado com "Este cupom não vale para peças
da Dia das Mães.", como acontece com a M-A. Com M-E + M-C, ele desconta só os 10 % da M-E (−R$ 34,00) na sacola, no
checkout e no pedido. A M-C só sairia do recorte da campanha se o "de/por" vencesse o preço da campanha. Aqui vence a
campanha: R$ 336,60 < R$ 349,90.

**Fonte:** PRD CA-16, RN-16, D-06; `spec.md` I-04; TC-FUNC-015 passo 1; TC-FUNC-014 passo 2

#### Observado

- Sacola só com a M-C: "QA10 aplicado −R$ 33,66", Total R$ 302,94. O cupom continua quando a M-E sai e é aceito de
  novo quando é tirado e reaplicado
- Sacola com M-E + M-C: "QA10 aplicado −R$ 67,66" (10 % de R$ 340,00 + R$ 336,60)
- Checkout: "Cupom QA10 −R$ 67,66"; Total R$ 586,21
- Pedido #0607 gravado: "Cupom QA10 −R$ 67,66", Total R$ 586,21
- Com a M-A no lugar da M-C (pedido #0606), o cupom desconta só a M-E (−R$ 34,00)

Na rodada 1, TC-FUNC-015 passou só com a M-A, e o cupom não foi aplicado com a M-C. Não dá para saber se isso já
acontecia antes da correção do BUG-002, que mudou o preço da M-C.

#### Evidência

- `screenshots/CH-04-r2-02-sacola-ma-me-qa10-390.png`: com a M-A, o cupom desconta só a M-E (−R$ 34,00), o
  comportamento esperado
- `screenshots/CH-04-r2-06-qa10-sobre-mc-390.png`: o cupom com −R$ 67,66 numa sacola com a M-C
- `screenshots/CH-04-r2-07-checkout-mc-me-1440.png`: o checkout com "Cupom QA10 −R$ 67,66"
- `screenshots/CH-04-r2-08-pedido-0607-cupom-na-mc.png`: o pedido #0607 gravado com o cupom sobre a M-C
- `screenshots/CH-04-r2-09-so-mc-qa10-mantido-390.png`: a sacola só com a M-C, com o cupom mantido
- `screenshots/CH-04-r2-10-so-mc-qa10-reaplicado-390.png`: o cupom reaplicado do zero e aceito

#### Ocorrências

| Sessão | Persona       | Passo                                         | Evidência                                                     |
| ------ | ------------- | --------------------------------------------- | ------------------------------------------------------------- |
| CH-04  | PER-03 Helena | passos 07, 09 e 10: M-E + M-C, até o pedido #0607 | `screenshots/CH-04-r2-07-checkout-mc-me-1440.png`, `screenshots/CH-04-r2-08-pedido-0607-cupom-na-mc.png` |
| CH-04  | PER-03 Helena | passo 11: só a M-C, cupom mantido              | `screenshots/CH-04-r2-09-so-mc-qa10-mantido-390.png`          |
| CH-04  | PER-03 Helena | passo 12: só a M-C, cupom reaplicado           | `screenshots/CH-04-r2-10-so-mc-qa10-reaplicado-390.png`       |

#### Relacionados

- **TC:** TC-FUNC-015 (falhou); TC-FUNC-014 (mesma regra, rodado só com a M-A)
- **Charter:** CH-04
- **Critério:** CA-16
- **Protótipo:** —
- **Bugs:** BUG-002 (o preço da mesma peça com "de/por"; a correção dele pode ter mudado como a loja decide se a
  peça é de campanha)

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-008 · [Cupom] QA10 desconta a peça de campanha que tem “de/por” — sacola, checkout e pedido · high
- **Fechamento**: a tarefa fecha com o fix do bug; o bug segue `open` até o reteste do QA
- RN-16 / CA-16 / D-06 / `spec.md` I-04: o cupom só vale sobre a base elegível; peça de campanha fica fora dela, e o cupom que só teria peça de campanha é recusado com "Este cupom não vale para peças da {campanha}.". O cupom de frete grátis continua passando (I-04).
- `spec.md` I-02: uma peça é "de campanha" quando a campanha baixa o preço dela. Para a M-C, o preço com a campanha (R$ 336,60) é menor que o "por" de hoje (R$ 349,90) — a campanha vence, então a peça é de campanha e fica fora do cupom. A comparação é contra o preço sem a campanha (o "por" de tabela), nunca contra o próprio preço já descontado.
- O mesmo dono decide no navegador e no servidor (RN-04, defeito 01): o conserto passa pela regra de `core`, e a function `checkout` (e a `mercado-pago`, se recalcula) dão o mesmo veredito — o pedido gravado não pode levar o cupom sobre a peça de campanha.

### Testes

Teste antes do código: cada caso abaixo reprova antes do conserto e passa depois.
- Caso de `core` (pricing/cupom) com a linha "de" R$ 374,00 / "por" R$ 349,90 a 10 % (preço R$ 336,60) + uma linha comum de R$ 340,00 e o cupom de 10 %: o cupom desconta só R$ 34,00; vermelho antes do conserto. O par com a M-A (R$ 385,00 a 10 %) continua verde.
- Caso só com a linha "de/por" de campanha e o cupom de 10 %: recusa com o motivo da campanha (a mesma recusa da M-A).
- Caso da function `checkout` com o corpo da sacola acima: o pedido gravado leva cupom R$ 34,00, não R$ 67,66.

### Obrigações

- Rode, em cada workspace tocado, a suíte (`pnpm --filter @estrelinha/<w> test --testTimeout=20000`, sem o `--`, exit capturado fora de pipe), `npx tsc --noEmit -p <projeto>` e `npx eslint .` no app; compare com as baselines do `CLAUDE.md` (sem regressão). Mudança em `packages/core` roda também a suíte da loja e a do painel (os guardas de lá varrem os dois apps); mudança em `supabase/functions` roda a suíte de `functions`.
- Os guardas do repositório continuam verdes sem afrouxar asserção.

### Não faça

- Não altere dado do banco local para "consertar" a massa (pedidos #0603–#0608, marcações, campanhas da QA): corrija a escrita para valer daqui para frente.
- Não mexa no `status` nem no corpo de `qa/issues/BUG-008.md` — é da QA.
- Não amplie o escopo para as sugestões de backlog do `qa-result.md`.
- Não commite: o orquestrador commita.

### Pronto quando

- O teste novo reprovava antes e passa depois; a suíte, os tipos e o lint dos workspaces tocados sem regressão.
- O comportamento esperado do BUG-008 foi visto funcionando no app local (relate como conferiu).

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
