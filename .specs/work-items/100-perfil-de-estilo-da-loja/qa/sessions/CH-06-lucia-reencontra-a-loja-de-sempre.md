# Sessão CH-06 · Lúcia reencontra a loja de sempre no perfil Padrão

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-06-lucia-reencontra-a-loja-de-sempre.md` · exploratório · P0 |
| Status      | done                                                                   |
| Persona     | PER-04 Lúcia · conta: anonima (sacola e checkout não pedem login; nenhuma entrada na `cliente-qa` nesta rodada) |
| Tour · modo | Feature · por cenário (J-04), worktree × referência. Rodada 3 de confirmação: só a parte do TC-REG-001 que ficou `blocked` na r2 (sacola com a peça e checkout) |
| Rodada      | confirmação                                                            |
| Orçamento   | 18 ações de browser de 35, mais o `close`. Uma volta ao browser = uma ação (os comandos encadeados numa volta contam como uma) |
| Ambiente    | http://localhost:8182 (worktree) × http://localhost:8092 (referência, commit-base, mesmo banco) · build não exposto · Chromium (agent-browser 0.39.1) · viewports 390 × 844 · 1440 × 900 |
| Paridade    | `*.supabase.co*` e `**/g/collect*` abortados por rota antes do primeiro `open`. Perfil salvo: S0 (chave ausente = Padrão), só lido. Faixa de avisos girando nas duas lojas (conteúdo do banco). Sacola só no browser da sessão, descartada no `close` |

## Missão

Como a cliente que volta e conhece a loja de cor, achar qualquer tom, transparência, sombra ou marca que esteja
diferente da loja de antes do Work Item quando a dona não ligou nada.

## Método

O mesmo da r1 e da r2: **um** `eval` por tela em cada loja, que conta os valores computados distintos de `color`,
`background-color`, `border-*-color` (só com borda > 0), `box-shadow`, `fill`/`stroke` (SVG), `outline-color`
(só com outline) e gradientes dos elementos visíveis. Na gaveta da sacola, a leitura é do próprio `dialog` e do
que está dentro dele. Os dois conjuntos foram comparados com `diff` (worktree × referência), contagens incluídas.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | No celular (390), abrir "Joia Afetiva com Dente de Leite" no worktree, fechar o aviso de cookies, escolher a opção "Folheado a ouro (Prata 925)" e tocar "Adicionar à sacola" (barra fixa) | Nada acontece: sem aviso, a gaveta abre vazia ("Explorar joias"), nada gravado na sacola. Mesmo com a opção escolhida e o aviso de cookies fechado | — |
| 02 | Passar a tela para 1440 e tocar o "Adicionar à sacola" do bloco principal (worktree) | A gaveta abre com a peça, "COMPLETE O FRETE GRÁTIS", cupom e "Finalizar Pedido" | `screenshots/CH-06-01-sacola-1440-wt.png` |
| 03 | Repetir os passos 01 e 02 na referência (:8092), mesma peça e opção | Igual: em 390 a sacola fica vazia; em 1440 a peça entra | `screenshots/CH-06-01-sacola-1440-ref.png` |
| 04 | Comparar a sacola com a peça em 1440 e em 390 (a mesma gaveta, viewport trocado com ela aberta) | **Idênticas** nas duas lojas, 22 valores, contagens incluídas: fundo `rgb(241, 235, 225)`, botões `rgb(52, 73, 94)` com texto branco, bordas `rgb(230, 223, 212)` e `rgb(140, 128, 115)`, transparências `rgba(241, 235, 225, 0.3)` e `0.4`, sombra `rgba(0,0,0,.1) 0 10px 15px -3px, rgba(0,0,0,.1) 0 4px 6px -4px`, ícone com stroke `rgb(160, 126, 76)` | `screenshots/CH-06-01-sacola-1440-{wt,ref}.png` · `screenshots/CH-06-02-sacola-390-{wt,ref}.png` |
| 05 | Tocar "Finalizar Pedido" e ver o checkout em 390 (sem preencher nada) | "Finalizar compra", Contato / Entrega / Pagamento, oferta "Leva junto", "Pagar R$ 167,31 com PIX" desabilitado. **Idêntico** nas duas lojas, 27 valores | `screenshots/CH-06-03-checkout-390-{wt,ref}.png` |
| 06 | Digitar um e-mail incompleto ("lucia@") e sair do campo com Tab, em 390 | Nenhuma mensagem de erro aparece ao sair do campo (nas duas lojas); o foco vai ao WhatsApp com o anel `rgb(250, 248, 245) 0 0 0 2px, rgb(53, 74, 95) 0 0 0 4px`. **Idêntico** nas duas lojas, 29 valores. Campo limpo e página recarregada depois | — |
| 07 | Ver o checkout em 1440 (notebook) | **Idêntico** nas duas lojas, 29 valores (bordas `rgb(140, 128, 115)`, `rgb(230, 223, 212)`, `rgb(35, 48, 58)`, `rgb(52, 73, 94)`, `rgb(84, 97, 107)`, `rgba(255, 255, 255, 0.35)`; textos `rgba(255, 255, 255, 0.55)` e `0.7`). Nenhum toque em "Pagar com PIX" | `screenshots/CH-06-04-checkout-1440-{wt,ref}.png` |

**Edge cases tentados:** foco (Tab) num campo do checkout — anel de foco igual nas duas lojas (passo 06). Campo com erro: o checkout não mostra erro ao sair do campo (nas duas lojas), então a borda de erro `field` não apareceu sem tocar "Continuar"/enviar — ver Fora da cobertura

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-SMOKE-001 | skip | — | — | pass na rodada 2 |
| TC-REG-001 | pass | 02–07 | `screenshots/CH-06-01-sacola-1440-*.png` · `screenshots/CH-06-02-sacola-390-*.png` · `screenshots/CH-06-03-checkout-390-*.png` · `screenshots/CH-06-04-checkout-1440-*.png` | As telas que faltavam (sacola com a peça e checkout, 390 e 1440) estão **iguais** à referência, contagens incluídas. Somando r1 e r2 (Home, menu, categoria, produto, 404, `/conta`, `/pedido/:id`, gaveta vazia), nenhuma diferença de cor, sombra, transparência ou marca em nenhuma tela medida. A peça entrou na sacola pelo botão principal em 1440; o botão da barra fixa em 390 não funciona nas duas lojas (A-1, anterior ao WI) |

Contagem: pass 1 · fail 0 · blocked 0 · skip 1

## Achados

### A-1 · [Produto · celular] "Adicionar à sacola" da barra fixa não põe a peça na sacola — a cliente no celular não consegue comprar

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-04 Lúcia                                                          |
| Jornada e passo     | J-04 (sacola com a peça) · passos 01 e 03 do log                      |
| TC                  | —                                                                     |
| Gravidade proposta  | high — no celular a cliente toca o botão e nada acontece, sem aviso; só consegue com a tela larga. **Anterior ao WI 100**: a referência (:8092, commit-base) faz igual, então não é regressão deste WI |
| Reproduziu          | sim — nesta rodada 1 vez no worktree e 1 na referência; na r2, 4 vezes (2 peças, as duas lojas) |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Sem login, browser novo, viewport 390 × 844, abrir `http://localhost:8182/produtos/joia-afetiva-com-dente-de-leite` (ou `:8092`)
2. Fechar o aviso de cookies e marcar a opção "Folheado a ouro (Prata 925)"
3. Tocar "Adicionar à sacola" na barra fixa do rodapé e abrir "Sacola"

**Esperado:** a peça entra na sacola, como acontece com o botão do bloco principal em 1440 (passo 02) — **fonte:** J-04 (sacola com a peça), TC-REG-001 passo 1

**Observado:** nenhum aviso; a gaveta abre com "Explorar joias" (sacola vazia) e nada é gravado na sacola do browser. Na mesma página, em 1440, o botão do bloco principal põe a peça na sacola

**Evidência:**

- sem screenshot do estado vazio nesta rodada; a gaveta vazia em 390 está em `screenshots/2026-11-14-r2/CH-06-03-gaveta-vazia-{wt,ref}.png`
- console: nada (nenhum erro)
- rede: não lida

## Spec-gaps

nada

## Fora da cobertura

- Borda de erro (`field`) no checkout: sair do campo com um e-mail incompleto não mostra erro em nenhuma das duas lojas, e o "Continuar" fica desabilitado; chegar ao erro pediria enviar o formulário, que a rodada não faz. As bordas dos campos em estado normal e com foco foram comparadas e estão iguais
- A barra de progresso do frete grátis com valor perto do limite: a sacola tinha uma peça de R$ 167,31; o bloco "COMPLETE O FRETE GRÁTIS" foi comparado como apareceu (igual), sem montar outros valores
- A causa do A-1 não foi investigada (caixa-preta); se é do ambiente local ou do código, fica para a triagem

## Debrief

- **Surpresas:** o botão principal em 1440 resolve o que travou a r2; o da barra fixa em 390 continua sem efeito nas duas lojas (A-1). Depois de "Fechar aviso de cookies" (sem aceitar), a preferência gravada no browser ficou com estatísticas ligadas — não investigado, rodada de confirmação; fica como sugestão para a triagem olhar fora do WI 100
- **Próximo charter:** nada para o WI 100. Fora dele, o A-1 merece uma sessão de compra pelo celular
- **Padrão novo:** quando um botão fixo de celular não responde, trocar o viewport para o desktop com a página aberta, adicionar ali e voltar ao celular com a gaveta aberta permite comparar o celular sem depender do botão
