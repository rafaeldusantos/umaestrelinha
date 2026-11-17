# Sessão CH-05 · Peças escolhidas que deixam de valer, e a troca de campanha — rodada 2

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-05-pecas-que-deixam-de-valer.md` · exploratório · P1 |
| Status      | done                                                                   |
| Persona     | PER-01 Adri · conta: admin-loja — `QA_ADMIN_LOJA_*` (loja conferida como visitante, sessão `CH-05-r2-anon`, sem login) |
| Tour · modo | Interrupt · por técnica — transição de estado                          |
| Rodada      | confirmação                                                            |
| Orçamento   | 45 ações de browser de 45 (contando open, click, fill e reload; snapshots, esperas e screenshots à parte) |
| Ambiente    | painel http://localhost:8083 · loja http://localhost:8082 · build não exposto · Chromium (agent-browser, headless) · viewports painel 1440 × 900, loja 390 × 844 · rotas abortadas: `**/*.supabase.co/**`, `**/g/collect*` (e, só nos passos 09–10, `**/rest/v1/product_campaigns*`) |
| Paridade    | Supabase local com massa sintética (manifesto do WI 103); fotos do Storage hospedado bloqueadas |

## Missão

Achar qualquer jeito de a cliente ver no bloco uma peça que não está mais em oferta, de a loja completar a vaga
com uma peça que a dona não escolheu, ou de a dona perder a curadoria sem aviso quando uma peça muda fora do
editor. (Rodada de confirmação: só TC-FUNC-016, TC-FUNC-017, TC-FUNC-019 e o entorno das correções de BUG-005 e
BUG-006.)

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrar no painel; abrir B-1 ("Dia das Mães", P-3, P-1, P-2, ligado); acrescentar P-FORA e P-APAG3 pela busca; Salvar | "Salvo", "5 de 12": P-3, P-1, P-2, P-FORA, P-APAG3 | — |
| 02 | Produtos → buscar P-FORA → Ações → Desativar | P-FORA vira "Rascunho" | — |
| 03 | Produtos → buscar P-APAG3 → Ações → Excluir → confirmar "Excluir produto?" | a peça sai do catálogo | — |
| 04 | Home do painel, linha de B-1 | **"2 das 5 saíram do ar: “Anel Afetivo Coração com Leite Materno em Aço Inoxidável” e “QA103 Peça descartável 3”. A loja as pula enquanto elas não voltarem."** — a apagada agora conta e é nomeada (BUG-006 corrigido) | `screenshots/CH-05-r2-01-linha-2-das-5.png` |
| 05 | Loja como visitante (390 × 844), Home | fileira de B-1 com 3 peças: P-3, P-1, P-2 — nem P-FORA nem P-APAG3, nenhuma outra no lugar | `screenshots/CH-05-r2-02-loja-3-pecas-390.png` |
| 06 | Reabrir o editor de B-1 | "Alterações não salvas", "4 de 12"; "“QA103 Peça descartável 3” foi apagada do catálogo e saiu da lista." + "A remoção vale quando você salvar."; P-FORA na lista marcada "fora do ar"; a mesma frase "2 das 5 saíram do ar…" nomeando as duas | `screenshots/CH-05-r2-03-editor-apagada-nomeada.png` |
| 07 | Salvar | "Salvo"; a frase cai para "1 das 4 saiu do ar: “…Leite Materno em Aço Inoxidável”…" (o aviso da apagada continua na tela depois de salvo — já anotado na rodada 1) | — |
| 08 | No rascunho, remover P-3, P-1 e P-2 (sobra só P-FORA, fora do ar); ler a prévia em Celular e depois em Computador; Cancelar | "1 de 12", "1 das 1 saiu do ar…". Prévia: selo "DIA DAS MÃES", título, descrição e os cartões "10 % de desconto · Ver as peças →" e "15 % de desconto · Ver as peças →"; **sem** "Algumas das peças em oferta" nem fileira, nenhuma peça da campanha no lugar. Igual em Computador. Cancelar leva à lista; a linha de B-1 segue "1 das 4 saiu do ar" | `screenshots/CH-05-r2-04-previa-so-cartoes.png` |
| 09 | Abortar `**/rest/v1/product_campaigns*` e abrir o editor de B-1 | "4 de 12", as 4 peças intactas, sem "Alterações não salvas"; "Não foi possível conferir as peças da campanha. Nenhuma peça saiu da lista, e a busca volta quando a leitura der certo. ler as peças da campanha: TypeError: Failed to fetch" e o botão "Tentar de novo" (BUG-005 corrigido) | `screenshots/CH-05-r2-05-editor-falha-leitura.png` |
| 10 | Ainda com o bloqueio, "Tentar de novo"; depois tirar o bloqueio | Com o bloqueio, volta a "Conferindo as peças marcadas na campanha…" (o botão some enquanto tenta). Tirado o bloqueio, a conferência termina sozinha: "18 na campanha", "4 de 12", "1 das 4 saiu do ar…", nada alterado — nada foi gravado | — |
| 11 | Produtos → P-FORA → Ações → Ativar; recarregar a loja como visitante (variação "republicar") | P-FORA "Ativo"; na loja a fileira de B-1 volta a 4: P-3, P-1, P-2, P-FORA — no lugar dela. No editor, a frase "saiu do ar" some ("4 de 12") | `screenshots/CH-05-r2-06-loja-p-fora-volta-390.png` |
| 12 | (devolução da massa) Remover P-FORA de B-1; Salvar; recarregar o editor | "Salvo"; recarregado: "Dia das Mães", título "Joias para guardar quem a gente ama", "3 de 12": P-3, P-1, P-2, sem "Alterações não salvas" | — |
| 13 | Sair da conta; fechar os dois browsers | volta a `/admin/login` | — |

**Edge cases tentados:** só o entorno das correções — "Tentar de novo" com a leitura ainda bloqueada e depois
liberada (passo 10); a variação "republicar" do TC-FUNC-016 (passo 11); a variação "prévia em Computador" do
TC-FUNC-019 (passo 08)

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-016 | pass | 02–07, 11 | `screenshots/CH-05-r2-01-linha-2-das-5.png` · `screenshots/CH-05-r2-02-loja-3-pecas-390.png` · `screenshots/CH-05-r2-03-editor-apagada-nomeada.png` · `screenshots/CH-05-r2-06-loja-p-fora-volta-390.png` | BUG-006 corrigido: "2 das 5" nomeando a despublicada e a apagada. Variação "republicar": P-FORA volta ao lugar dela e a contagem cai |
| TC-FUNC-017 | pass | 09–10 | `screenshots/CH-05-r2-05-editor-falha-leitura.png` | BUG-005 corrigido: nada sai, não abre alterado, e o editor diz que não conseguiu conferir, com "Tentar de novo". A mensagem traz no fim o texto técnico "ler as peças da campanha: TypeError: Failed to fetch" (ver Debrief) |
| TC-FUNC-019 | pass | 08 | `screenshots/CH-05-r2-04-previa-so-cartoes.png` | Celular e Computador: só os cartões de 10 % e 15 %, sem fileira; Cancelar devolve o salvo |

Contagem: pass 3 · fail 0 · blocked 0 · skip 0

## Achados

nada

## Spec-gaps

nada

## Fora da cobertura

- O fim do "Tentar de novo" com a leitura ainda bloqueada (passo 10): o bloqueio foi tirado enquanto o editor
  ainda estava em "Conferindo…", então não se viu se a falha volta a ser dita na segunda tentativa — orçamento
- A loja logo depois do Cancelar do TC-FUNC-019 não foi recarregada; a linha de B-1 e o editor recarregado
  mostram o salvo intacto — orçamento

## Debrief

- **Surpresas:** a mensagem de falha do TC-FUNC-017 termina com o texto técnico "ler as peças da campanha:
  TypeError: Failed to fetch", que Adri não tem como entender; nenhuma fonte diz o texto da mensagem, e esta
  rodada não registra spec-gap — fica anotado para a triagem decidir. Depois de "Tentar de novo" com o bloqueio
  ativo, o editor volta a "Conferindo…" e fica nele por um tempo (novas tentativas em curso)
- **Próximo charter:** nada
- **Padrão novo:** nada

Estado final da massa: B-1 salvo, ligado, "Dia das Mães", título "Joias para guardar quem a gente ama", peças P-3,
P-1, P-2 nessa ordem (conferido no editor recarregado). P-1, P-2 e P-3 nunca saíram do ar nesta sessão. P-FORA
"Ativo" (republicada; aparece na loja como visitante). P-APAG3 "QA103 Peça descartável 3" excluída. B-2, B-3 e
campanhas não tocados.
