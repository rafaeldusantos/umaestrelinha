# Sessão CH-01 · A prévia de frete na sacola, dentro da região da campanha

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-01-previa-de-frete-na-sacola-dentro-da-regiao.md` · exploratório · P0 |
| Status      | done (orçamento esgotado antes de alcançar a gaveta com itens) |
| Persona     | PER-01 Luana · conta: anonima |
| Tour · modo | Feature · por cenário (J-01) — rodada de confirmação, sem tour |
| Rodada      | confirmação (rodada 2) |
| Orçamento   | 25 ações de browser de 25 |
| Ambiente    | http://localhost:8092 (worktree store__feature-99) · build não exposto · Chromium (`playwright-cli -s=CH-01`, headless) · viewport 390 × 844 (1440 × 900 não alcançado) |
| Paridade    | cotação interceptada com a fixture A (200 + CORS); `https://*.supabase.co/**` e `**/g/collect*` abortados |

## Missão

Como Luana, no celular, confirmar que dá para saber o frete de São Paulo e se o frete grátis vale para ela ainda na
sacola, e chegar ao checkout com o mesmo Total e sem digitar o CEP de novo — procurando qualquer promessa da gaveta
que o checkout desmente.

Nesta rodada: só o TC-FUNC-006 (SP 01310-100 e RS 90010-000, acima de R$ 450, gaveta × checkout, 390 e 1440) e o
entorno das correções da faixa, do ⓘ e do rodapé da gaveta.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Preparar: abrir o browser, 390 × 844, rota da cotação (fixture A + CORS), bloqueio do Storage hospedado e do GA4 (4 ações) | rota listada em `route-list` | — |
| 02 | Abrir a Home | vitrine com as peças; "Pingente Afetivo Dois Corações com Leite Materno" a R$ 209,90 | — |
| 03 | Abrir a peça de R$ 209,90 | página do produto; "Frete grátis acima de R$ 450,00 · para Sul e Sudeste"; "Adicionar à sacola" abaixo da dobra | — |
| 04 | Tocar "Adicionar à sacola" | nenhuma gaveta, nenhum aviso no snapshot seguinte; banner de cookies na tela | — |
| 05 | Aceitar cookies e abrir a Sacola pelo cabeçalho | gaveta "Sua sacola": "Sua sacola está vazia" | — |
| 06 | Fechar a gaveta (Esc) e tocar "Adicionar à sacola" de novo | o driver recusou: "Ref e1001 not found" — o clique **não foi executado** (ref envelhecida pelo Esc) | — |
| 07 | Novo snapshot e tocar "Adicionar à sacola" | nenhuma gaveta, nenhum aviso | — |
| 08 | Ler o console | só os avisos do React Router e os erros das imagens do Storage bloqueado | — |
| 09 | Abrir a Sacola pelo cabeçalho | "Sua sacola está vazia" | `screenshots/CH-01-r2-01-sacola-vazia-apos-adicionar.png` |
| 10 | Ler o sessionStorage da sessão | "No sessionStorage items found" | — |
| 11 | Esc e tocar "Adicionar à sacola" (3ª tentativa) | o driver recusou de novo: "Ref e1001 not found" — o clique não foi executado | — |
| 12 | Snapshot | página do produto, sem gaveta; orçamento esgotado (25 de 25) | — |

**Edge cases tentados:** nada (rodada de confirmação)

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-006 | blocked | 04–12 | `screenshots/CH-01-r2-01-sacola-vazia-apos-adicionar.png` | a peça não chegou à sacola nesta sessão (ver A-1, não confirmado) e o orçamento acabou antes do CEP; SP, RS, ⓘ, checkout e 1440 × 900 não conferidos |

Contagem: pass 0 · fail 0 · blocked 1 · skip 0

## Achados

### A-1 · [Produto → Sacola] "Adicionar à sacola" não põe a peça na sacola — NÃO confirmado (pode ser do condutor)

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Luana                                                          |
| Jornada e passo     | J-01, passo 1 (pôr a peça na sacola) · passos 04–12 do log            |
| TC                  | TC-FUNC-006 (pré-condição)                                            |
| Gravidade proposta  | critical se confirmado — a persona não compra nada; até lá, sem gravidade |
| Reproduziu          | intermitente — 2 toques que o driver aceitou (passos 04 e 07), ambos sem efeito; 2 toques recusados pelo driver (06 e 11). A saída dos passos 04 e 07 não foi lida, então não há prova de que o clique chegou ao botão |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Anônima, aba nova, http://localhost:8092/ em 390 × 844, com a rota da cotação e os bloqueios do ambiente
2. Abre "Pingente Afetivo Dois Corações com Leite Materno" (R$ 209,90, "Folheado a ouro (Prata 925)" já marcado)
3. Rola até "Adicionar à sacola" e toca
4. Abre "Sacola" no cabeçalho

**Esperado:** a peça na sacola (a gaveta abre ou a contagem sobe) — **fonte:** J-01 passo 1; a rodada 1 (sessão CH-01 continuação) pôs a mesma peça na sacola em 8082/8092.

**Observado:** "Sua sacola está vazia · Escolha uma peça — eu embalo com carinho."; sessionStorage da sessão vazio; nenhum aviso na região "Notifications"; console sem erro além das imagens bloqueadas.

**Evidência:**

- `screenshots/CH-01-r2-01-sacola-vazia-apos-adicionar.png` — gaveta vazia depois dos toques
- console: nada (só React Router e imagens do Storage hospedado bloqueado)
- rede: não lida

**Nota para a triagem:** não abrir bug a partir deste bloco. O reteste deve primeiro tocar "Adicionar à sacola" com
o snapshot fresco e **ler a saída do clique**; só se a sacola continuar vazia é regressão (critical).

## Spec-gaps

nada (rodada de confirmação)

## Fora da cobertura

- TC-FUNC-006 inteiro: SP 01310-100 e RS 90010-000 acima de R$ 450, "Frete grátis liberado", PAC "Grátis" com o valor riscado, Total sem frete, ⓘ com a região, checkout com o mesmo Total — orçamento (25 ações) gasto antes de a peça chegar à sacola
- Comparação gaveta × checkout em 1440 × 900 — orçamento
- Entorno das correções (faixa FreeShippingBand, balão do ⓘ, rodapé da gaveta CartShipping/CartDrawer) — exige a gaveta com itens; não alcançado
- Rede da tentativa de adicionar — orçamento

## Debrief

- **Surpresas:** a peça não apareceu na sacola; parte dos toques foi recusada pelo driver por ref envelhecida (Esc muda o DOM) e a saída dos que ele aceitou foi descartada — a sessão não sabe se o defeito é da tela ou do condutor
- **Próximo charter:** repetir esta confirmação com orçamento cheio (~40 ações): snapshot fresco antes de cada clique e a saída do clique lida; se a peça entrar, TC-FUNC-006 SP + RS e 1440 × 900
- **Padrão novo:** no `playwright-cli`, nunca descartar a saída do `click` — o "Ref not found" só aparece ali
