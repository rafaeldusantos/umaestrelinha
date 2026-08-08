# Validação de UI — implementação × artboards do Paper — 2026-07-28

Comparação nó por nó dos 10 artboards indicados, contra a loja rodando em `http://localhost:8080`.
**Valores lidos por `get_screenshot`/`get_jsx` do Paper e por snapshot de acessibilidade + screenshot de
viewport da loja — nunca de olho no pixel.**

Companion do relatório do ciclo: `2026-07-28-checkout-08-09.md`.

## Placar

| Nó | Artboard | Veredito |
| -- | -------- | -------- |
| `BB5-0` | Mobile · status bar | ✅ N/A — chrome do sistema, não é UI da loja |
| `BBG-0` | Mobile · header do checkout | ❌ **Divergente** |
| `BBQ-0` | Mobile · barra de resumo | ✅ Confere |
| `BC0-0` | Mobile · conteúdo dos blocos | ⚠️ **2 divergências** |
| `AXJ-0` | Desktop · header do checkout | ⏳ Não comparado |
| `AYB-0` | Desktop · corpo do checkout | ⏳ Não comparado |
| `B5R-0` | PIX · header | ⛔ Inalcançável |
| `B6F-0` | PIX · corpo | ⛔ Inalcançável |
| `B7M-0` | Confirmação · header | ⛔ Inalcançável |
| `B8A-0` | Confirmação · corpo | ⛔ Inalcançável |

**4 de 10 comparados.** Os 4 inalcançáveis dependem do `create-payment`, que devolve HTTP 503
`name resolution failed` no container do edge runtime — nunca renderizaram. Os 2 de desktop não foram
comparados por escolha de prioridade: a premissa do projeto é mobile (~90% do tráfego) e o orçamento da
sessão foi gasto onde o tráfego está. Ficam para a próxima rodada.

---

## `BBG-0` — header mobile ❌ Divergente

| | Paper (board 07) | Implementado |
| --- | --- | --- |
| Conteúdo | `←` + **"Finalizar compra"** + `🔒 SEGURO` | logo Nanita + `🔒 Ambiente seguro` |
| Título da página | dentro do header | H1 separado, **abaixo** da barra de resumo |
| Voltar | seta no header | link "← Voltar ao carrinho" abaixo do H1 |

Registrado como `BUG-20260728-header-mobile-diverge-do-board` (Cosmetic). O custo é vertical: em 390px o
header gasta a largura com o logo e o título + link duplicam o espaço que o board economizava.

> Nota: o logo implementado usa **avatar glacê + wordmark geleia**, que é o correto do `DESIGN.md` §5
> para fundo branco — e o oposto do que o board `03 · Home Desktop` faz. A implementação está certa e o
> board da home é que está fora da regra (achado já levantado no ciclo de desenho).

## `BBQ-0` — barra de resumo mobile ✅ Confere

Paper: `🛍 Resumo · 4 itens · frete grátis` + `R$ 46,55` + chevron.
Implementado: `🛍 Resumo · 3 itens` + `R$ 19,67` + chevron, colapsável (`expanded=false`).

Forma, ordem e afordância batem. A diferença de conteúdo é dado (3 itens em vez de 4) mais o segmento
`· frete grátis`, que é condicional — no meu carrinho o frete não era grátis, então **não é possível
afirmar divergência**. Fica para a rodada com `MELHOR_ENVIO_TOKEN` preenchido e carrinho acima do
threshold.

## `BC0-0` — conteúdo dos blocos mobile ⚠️ 2 divergências

**Confere:** disco numerado em tinta com o número; eyebrow em caixa alta (`CONTATO`, `ENTREGA`,
`PAGAMENTO`); "Alterar" à direita no bloco colapsado; card do PIX com badge `−5%`; ordem
Contato → Entrega → Pagamento → bump → CTA; **zero pílula geleia dentro dos blocos** (a única da tela é
o CTA, conforme `DESIGN.md` §8).

### Divergência 1 — o card de cartão não mostra o valor da parcela

| Paper | Implementado |
| ----- | ------------ |
| `Cartão de crédito` / **"Até 3x de R$ 16,34 sem juros"** | `Cartão de crédito` / **"Até 6x sem juros"** |

O `6x` contra `3x` é só dado (`max_installments = 6` nas settings). O que falta é **o valor da parcela** —
que é justamente o número pelo qual quem parcela decide. Impacto: Friction para o Léo (ticket maior),
não bloqueia.

### Divergência 2 — o campo de CPF perdeu a justificativa ❗

| Paper | Implementado |
| ----- | ------------ |
| `CPF do pagador · **exigido pelo banco**` | `CPF do pagador` |

Essa não é cosmética: **PGD-01 exige** o campo "acompanhado da justificativa de por que é pedido". É a
pergunta que a persona Bia faz em voz alta ao ver o campo — *"por que vocês querem meu CPF?"* — e a
resposta saiu da tela.

### Não verificável nesta rodada

- **Duas opções de frete com data** (`Correios PAC · Grátis · R$ 14,90 riscado` / `Correios SEDEX ·
  R$ 24,80`) e o link `+1 opção de envio ⌄`: sem `MELHOR_ENVIO_TOKEN` só existe a opção única de
  fallback. O layout de múltiplas opções **não foi exercitado**.
- **Card do endereço** (fundo sugar, pin, "Editar"): o bloco estava colapsado nos meus screenshots.
- **Order bump** (superfície tinta, "SÓ AQUI" em manteiga, thumb glacê): `order_bump_enabled` é `false`
  por padrão e não foi ligado nesta sessão.

## `B5R-0` · `B6F-0` · `B7M-0` · `B8A-0` — PIX e confirmação ⛔ Inalcançáveis

As quatro telas ficam depois do `create-payment`, que devolve **HTTP 503 `name resolution failed`** —
o container do edge runtime não resolve DNS para `api.mercadopago.com`
(`BUG-20260728-edge-runtime-sem-dns`). A tela travou em "Gerando código PIX..." e nunca avançou.

**Nada sobre elas é afirmado aqui.** Em particular, seguem sem comparação visual:
o valor em destaque e o contador `mm:ss` na tela do PIX (`B6F-0`), e a mascote `wink` + a timeline
monocromática de 4 estágios na confirmação (`B8A-0`).

## `AXJ-0` · `AYB-0` — desktop ⏳ Não comparados

Alcançáveis (o checkout funciona até o CTA em qualquer viewport), mas deixados de fora por prioridade
declarada: mobile é ~90% do tráfego e é onde o orçamento da sessão foi gasto. Próxima rodada, em 1440px,
com a sessão `CH-cartao-parcelado-desktop`.

---

## O que a comparação mudou de opinião

Duas coisas que eu teria errado sem os artboards abertos ao lado:

1. **A justificativa do CPF** parecia detalhe de copy até eu ver o board — é requisito de spec
   (PGD-01) e é a resposta a uma objeção concreta da primeira compra.
2. **O valor da parcela** no card de cartão não está em nenhum AC da spec, mas está no board. É o tipo
   de coisa que se perde entre o desenho e o código sem ninguém notar, porque nenhum teste falha.

Ambas entram na próxima rodada como cenários novos, não como bugs de UI genéricos.
