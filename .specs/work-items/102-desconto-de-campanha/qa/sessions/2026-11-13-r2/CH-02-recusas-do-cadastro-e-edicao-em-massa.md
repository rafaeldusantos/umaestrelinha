# Sessão CH-02 · Recusas do cadastro e a edição em massa — rodada 2 (confirmação), segunda metade

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-02-recusas-do-cadastro-e-edicao-em-massa.md` · exploratório · P1 |
| Status      | done (parcial: TC-UI-004 ficou sem execução por orçamento) |
| Persona     | PER-01 Adri · conta: `admin-loja` (conta de dev do seed, seção 5; `QA_ADMIN_LOJA_*` não definidas) |
| Tour · modo | Garbage · transição de estado — rodada de confirmação, sem exploração livre |
| Rodada      | confirmação — segunda metade do CH-02 dividido no Gate 3 (edição em massa, Desfazer, CA-08, 390) |
| Orçamento   | ~62 ações de browser de 50 — o teto foi passado na hora de reproduzir o achado A-1 e de restaurar as 4 peças de M-G a 15 % e conferir; a exploração parou aí |
| Ambiente    | http://localhost:8093/admin · build não exposto · Chromium (agent-browser 0.39.1) · viewport 1440 × 900 |
| Paridade    | `*.supabase.co` e `**/g/collect*` bloqueados por rota; conta de dev local |

## Missão

Como a dona com pressa, achar qualquer entrada no cadastro de campanha que grave sem motivo ou recuse sem dizer
por quê, qualquer jeito de a marcação em lote numa campanha agendada aparecer na loja antes da hora, e qualquer
lote que o Desfazer não devolva por inteiro.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrou no painel e abriu Campanhas | Natal · 01/12 a 24/12/2026 · 10 % 15 % · 4 peças · Agendada; Dia das Mães Em vigência; Black Friday Encerrada. A coluna "Peças" da lista é só o número (não é atalho para as peças) | — |
| 02 | Abriu a edição da Natal | Cabeçalho "Agendada · 01/12 a 24/12/2026 · 4 peças marcadas" e o link "Ver as peças"; pílulas: 10 % "nenhuma peça", 15 % "4 peças" | — |
| 03 | Tocou em "Tirar 15%" | Alerta: "4 peças usam 15%. Mude essas peças para outro percentual (ou tire da campanha) antes de tirar o 15%." com o link "Ver as peças com 15%"; o 15 % continuou na lista. Nada foi salvo na Natal | `screenshots/CH-02-r2-01-recusa-tirar-15.png` |
| 04 | Seguiu "Ver as peças com 15%" | `/admin/produtos?campanha=<Natal>&percentual=15`, filtros "Campanha: Natal" e "Percentual da campanha: 15%", chip "Campanha: Natal · 15%", 4 linhas — as 4 peças de M-G, cada uma com "Natal · 15%" na linha | `screenshots/CH-02-r2-02-filtro-natal-15.png` |
| 05 | Selecionou a página (4) e abriu "Editar em massa"; ligou "Campanha" | Seção com "Campanha das peças" (opções: Dia das Mães, Natal — a Black Friday encerrada não é oferecida) e depois "Percentual na campanha" (Natal: 10% · Natal: 15% · Tirar da Natal). Prévia: "4 peça(s) entram na Natal com 10%; o preço de sempre não muda." | `screenshots/CH-02-r2-03-lote-natal-10.png` |
| 06 | Aplicou Natal → 10 % e procurou o "Desfazer" no aviso | O lote gravou (a lista filtrada por Natal · 15 % ficou "Nenhum produto encontrado"); esperando o texto "Desfazer" por 25 s, ele não apareceu | — |
| 07 | Para reproduzir e restaurar: filtrou Natal · 10 % (as 4 de M-G com "Natal · 10%"), selecionou as 4, edição em massa Natal → 15 %, aplicou e leu o aviso na hora | Aviso "4 peça(s) na Natal com 15%" com só um botão de fechar, **sem "Desfazer"** | `screenshots/CH-02-r2-04-toast-lote-sem-desfazer.png` |
| 08 | Conferiu o estado final pelo filtro Natal · 15 % | As 4 peças de M-G com "Natal · 15%" — estado de partida restaurado | `screenshots/CH-02-r2-05-mg-15-restaurado.png` |
| 09 | Saiu da conta (Sua conta → Sair) e fechou o browser | Voltou a `/admin/login` | — |

**Edge cases tentados:** nada além do caminho dos TC (orçamento — ver Fora da cobertura).

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-FUNC-010 | pass | 02–04 | `screenshots/CH-02-r2-01-recusa-tirar-15.png` · `screenshots/CH-02-r2-02-filtro-natal-15.png` | Passos 1–3 conferidos com o texto literal. Passo 4 (tirar o 10 %) não executado para não arriscar alteração efetiva na Natal; as variações "uma peça só", "acrescentar" e "na Black Friday" não foram feitas |
| TC-FUNC-021 | fail | 04–07 | `screenshots/CH-02-r2-04-toast-lote-sem-desfazer.png` | ⇒ A-1. Passaram: filtro por campanha e percentual, "Ver as peças" (na edição — a lista de campanhas não tem o atalho), seção de campanha da edição em massa e o lote Natal → 10 %/15 %. Falha: o aviso do lote não tem "Desfazer", então as variações "Desfazer — percentual que tinham" e "tirar em lote + Desfazer" não são executáveis. "Tirar da Natal" em lote não foi aplicado (sem Desfazer, só gastaria orçamento para restaurar). Passo 6 (aba Preço e estoque da peça) não conferido |
| TC-UI-004 | skip | — | — | Orçamento esgotado antes das telas em 390 × 844 |

Contagem: pass 1 · fail 1 · blocked 0 · skip 1

## Achados

### A-1 · [Edição em massa · Campanha] O aviso do lote de campanha não tem "Desfazer" — a dona não consegue voltar um lote errado

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-02, passos 2–4 (marcar em lote / desfazer) · passos 06 e 07 do log  |
| TC                  | TC-FUNC-021 (variações "Desfazer — percentual que tinham" e "tirar em lote") |
| Gravidade proposta  | high — um lote errado sobre peças com marcações diferentes não tem volta pela tela: a dona precisa lembrar e remarcar peça a peça o percentual que cada uma tinha, e a missão do charter ("lote que o Desfazer não devolva") fica sem caminho |
| Reproduziu          | sim (2 de 2) — no 1º lote (Natal → 10 %) o texto "Desfazer" não apareceu em 25 s de espera; no 2º (Natal → 15 %) o aviso foi lido na hora: só texto e o botão de fechar |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:

1. Como `admin-loja`, abrir `http://localhost:8093/admin/campanhas`, abrir "Natal" e tocar em "Ver as peças" (ou abrir `/admin/produtos` filtrada por Campanha: Natal · 15 %) — as 4 peças de M-G
2. Marcar "Selecionar a página", tocar em "Editar em massa", ligar "Campanha", escolher "Natal" e "Natal: 10%"
3. Tocar em "Aplicar a 4 produto(s)" e olhar o aviso

**Esperado:** o aviso do lote traz "Desfazer", e tocá-lo devolve as 4 peças a "Natal · 15%" (lista do painel e aba Preço e estoque); o filtro Natal · 10 % fica vazio — **fonte:** TC-FUNC-021, variação "Desfazer — percentual que tinham"; resposta (A) do humano a Q-01, 2026-11-13 (o Desfazer da edição em massa devolve também as marcações de campanha); charter CH-02, Deve tentar 4.

**Observado:** o lote grava e o aviso mostra só "4 peça(s) na Natal com 15%" (ou o equivalente com 10 %) e um botão de fechar, sem ação "Desfazer". Não há outro caminho de desfazer na tela.

**Evidência:**

- `screenshots/CH-02-r2-04-toast-lote-sem-desfazer.png` — o aviso do lote sem "Desfazer"
- `screenshots/CH-02-r2-05-mg-15-restaurado.png` — o estado restaurado à mão (as 4 em Natal · 15 %)
- console: não coletado
- rede: não coletado

**Não conferido:** se o aviso de um lote de outro campo (preço, estoque, tags) tem "Desfazer" — a massa da sessão não permite alterar esses campos. Se tiver, o lote de campanha perdeu o Desfazer que a edição em massa já oferecia.

## Spec-gaps

nada (rodada de confirmação). Sugestões de backlog, sem achado:

- A prévia do lote diz "4 peça(s) entram na Natal com 10%" quando as peças já estão na Natal com 15 % — não avisa que o percentual delas muda de 15 para 10 %
- A lista de campanhas não tem atalho para as peças: a coluna "Peças" é só o número; o "Ver as peças" existe só na edição da campanha
- Texto "peça(s)" / "produto(s)" no aviso e no botão, em vez de singular/plural

## Fora da cobertura

- TC-UI-004 (lista e edição de Campanhas e a seção de campanha da edição em massa em 390 × 844; alvos ≥ 44 px; fonte a 200 %) — orçamento esgotado
- TC-FUNC-021: "Tirar da Natal" em lote, o Desfazer de qualquer lote (não existe na tela — A-1), duplo clique em "Aplicar", filtro sem resultado com mensagem (visto de passagem: "Nenhum produto encontrado"), filtro e edição em massa em 390, passo 6 (aba Preço e estoque da peça de M-G)
- TC-FUNC-010 passo 4 e variações — orçamento, e para não salvar alteração na Natal
- Entorno das recusas do cadastro (TC-FUNC-002, BUG-005) — são do retester nesta rodada
- Console e rede no passo do achado — não coletados

## Debrief

- **Surpresas:** o aviso do lote de campanha não tem "Desfazer"; o lote Natal → 10 % gravou de fato, e as 4 peças de M-G precisaram ser devolvidas a 15 % pela própria edição em massa (estado final conferido: as 4 em Natal · 15 %)
- **Próximo charter:** TC-UI-004 em 390 × 844 numa sessão própria (só leitura, não precisa de lote); reteste de A-1 com as duas variações de Desfazer e "Tirar da Natal" em lote, com orçamento para restaurar a massa
- **Padrão novo:** nada
