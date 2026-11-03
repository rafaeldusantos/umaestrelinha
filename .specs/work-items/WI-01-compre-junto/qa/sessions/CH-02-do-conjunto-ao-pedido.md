# Sessão CH-02 · Do conjunto ao pedido: gravações, valor cobrado e a marca "acompanha"

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-02-do-conjunto-ao-pedido.md` · exploratório · P0 |
| Status      | done                                                                   |
| Persona     | PER-01 Marina · conta: anonima                                         |
| Tour · modo | Money · com tour (rodada de confirmação: só TC-FUNC-014 e o entorno do BUG-004) |
| Rodada      | confirmação (rodada 2) · 2026-11-03                                    |
| Orçamento   | 17 ações de browser de 25                                              |
| Ambiente    | http://localhost:8082 (dev server do worktree feature/WI-01, Supabase local :54441) · build não exposto · Chromium headless (Playwright MCP) · viewport 390 × 844 |
| Paridade    | dado sintético (massa M-01/M-02); `*.supabase.co` e `**/g/collect*` bloqueados por rota; storage zerado antes e depois |

## Missão

Procurar qualquer jeito de o conjunto chegar ao pedido com valor diferente do que a cliente viu, com gravação na peça errada, com uma peça a mais ou a menos, ou sem a marca de que a corrente acompanha a joia. Nesta rodada: confirmar TC-FUNC-014 (que falhou na rodada 1 por BUG-004) e o entorno da correção.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Abrir QA Pingente Estrela anônima, sacola vazia; escolher Prata 925 · Com gravação: Sim | Campo "O que gravar" do pingente com "0 / 12" | — |
| 02 | Em QA Correntes › "Ver os 2 modelos", escolher QA Corrente Cartier · 45 cm · Sim e marcar | Linha marcada a R$ 139,90; campo da corrente "0 / 30"; "Total do conjunto: R$ 419,80, R$ 390,41 no Pix"; barra fixa "Conjunto · 2 peças" · "Levar o conjunto" | — |
| 03 | Gravar na corrente "Pedro e Lúcia para sempre juntos" (32 / 30) e tocar "Levar o conjunto" | Junto do campo: "Cabem até 30 caracteres nesta peça. Tire 2 para continuar."; alerta "A gravação passou do limite. Ajuste o texto para continuar."; nada entra na sacola. O total cai para R$ 279,90 com a barra ainda "Conjunto · 2 peças" (o mesmo comportamento observado na rodada 1, A-1) | `screenshots/R2-CH-02-01-limite-corrente.png` |
| 04 | Corrigir a corrente para "Pedro" e gravar "Lúcia Mariana" (13 / 12) no pingente | O alerta "A gravação passou do limite. Ajuste o texto para continuar." aparece na hora, sem toque; barra fixa "Revisar a gravação", desabilitada (`disabled` e `aria-disabled=true`); junto do campo "A gravação tem 13 caracteres e o limite desta peça é 12."; total R$ 419,80. A frase "Essa combinação está indisponível no momento." também aparece (N-1 do reteste, só observado) | `screenshots/R2-CH-02-02-limite-pingente.png` |
| 05 | Voltar o pingente a "Lúcia Marian" (12) | O alerta some; botão volta a "Levar o conjunto", habilitado; a frase "indisponível" some; total R$ 419,80 · R$ 390,41 no Pix | — |
| 06 | Repetir 13 caracteres e voltar a 12 (segunda reprodução) | Alerta e "Revisar a gravação" voltam; somem ao corrigir — mesmo comportamento | `screenshots/R2-CH-02-03-corrigido.png` |
| 07 | Tocar "Levar o conjunto" | Sacola abre com 2 linhas: QA Pingente Estrela R$ 279,90 · Prata 925 · Sim · "Gravação: Lúcia Marian" · qtd 1; QA Corrente Cartier R$ 139,90 · "Acompanha o QA Pingente Estrela" · 45 cm · Sim · "Gravação: Pedro" · qtd 1. Subtotal (2 itens) R$ 419,80 = Total R$ 419,80, igual ao total do bloco. Sem rolagem lateral (scrollWidth 390) | `screenshots/R2-CH-02-04-sacola.png` |

**Edge cases tentados:** gravação exatamente no limite (12 no pingente) aceita; ir e voltar acima/abaixo do limite duas vezes. Nenhum pedido criado (instrução da rodada).

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-014 | pass | 03–07 | `screenshots/R2-CH-02-01-limite-corrente.png`, `R2-CH-02-02-limite-pingente.png`, `R2-CH-02-04-sacola.png` | Passo 1: recusa junto do campo da corrente, nada entra. Passo 2: botão bloqueado e o aviso previsto aparece (BUG-004 confirmado corrigido). Passo 3: corrigido, as duas peças entram, cada gravação na sua linha. Variação "exatamente no limite": aceita |

Contagem: pass 1 · fail 0 · blocked 0 · skip 0

## Achados

nada — nenhuma regressão e nenhum achado novo critical/high.

Observações (não viram bug nesta rodada):

- **O-1** (já visto na rodada 1 como A-1): com a gravação da corrente acima do limite (32 / 30), o "Total do conjunto" desce para R$ 279,90 (só o pingente) enquanto a barra fixa segue "Conjunto · 2 peças" e a linha da corrente segue marcada a R$ 139,90. Volta a R$ 419,80 ao corrigir. Comportamento inalterado desde a rodada 1; não entra na sacola nesse estado. Passo 03.
- **O-2** (N-1 do reteste): com a gravação do pingente acima do limite, aparece "Essa combinação está indisponível no momento." junto do alerta de gravação; some ao corrigir. Passo 04.

## Spec-gaps

nada

## Fora da cobertura

- Os demais TC do charter (TC-JOURNEY-002, TC-FUNC-008/009/012/016/018/019/023, TC-INT-001) — passaram na rodada 1 e não são tocados pela correção do BUG-004; rodada de confirmação.
- Checkout, PIX, confirmação e painel — instrução da rodada: não criar pedido novo.
- 1440 × 900 — já conferido no reteste do BUG-004; esta sessão ficou em 390 × 844.

## Debrief

- **Surpresas:** nada
- **Próximo charter:** nada
- **Padrão novo:** nada
