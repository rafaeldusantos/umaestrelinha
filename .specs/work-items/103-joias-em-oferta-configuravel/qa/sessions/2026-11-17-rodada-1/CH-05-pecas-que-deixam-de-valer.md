# Sessão CH-05 · Peças escolhidas que deixam de valer, e a troca de campanha

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-05-pecas-que-deixam-de-valer.md` · exploratório · P1 |
| Status      | done                                                                   |
| Persona     | PER-01 Adri · conta: admin-loja — `QA_ADMIN_LOJA_*` (loja conferida como visitante, sessão `CH-05-anon`, sem login) |
| Tour · modo | Interrupt · por técnica — transição de estado                          |
| Rodada      | exploração                                                             |
| Orçamento   | ~190 comandos de browser contando cada snapshot, espera e screenshot (~70 de interação) de 70 — estourado; a exploração parou na troca de campanha (TC-FUNC-020) e o que veio depois foi só a devolução da massa que o briefing exige |
| Ambiente    | painel http://localhost:8083 · loja http://localhost:8082 · build não exposto · Chromium (agent-browser 0.39.1, headless) · viewports painel 1440 × 900, loja 390 × 844 · rotas abortadas: `**/*.supabase.co/**`, `**/g/collect*` (e, só no passo 13–14, `**/rest/v1/product_campaigns*`) |
| Paridade    | Supabase local com massa sintética (manifesto do WI 103); fotos do Storage hospedado bloqueadas |

## Missão

Achar qualquer jeito de a cliente ver no bloco uma peça que não está mais em oferta, de a loja completar a vaga
com uma peça que a dona não escolheu, ou de a dona perder a curadoria sem aviso quando uma peça muda fora do
editor.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Abrir B-1 (P-3, P-1, P-2, "Dia das Mães") e acrescentar P-TIRA, P-FORA, P-APAG, P-NB e P-AMBAS pela busca | P-NB entra marcada "sem desconto" e o editor diz: "O desconto da campanha não baixa o preço de “QA103 Peça já em promoção”, e ela não aparece no bloco nem na vitrine da campanha." Nota de condução: com cinco cliques seguidos, o de P-APAG não pegou (a lista da busca se redesenhava); um segundo clique a acrescentou. Ficou "8 de 12" | — |
| 02 | Salvar | Sem "Salvo" no botão; o cabeçalho segue "Alterações não salvas" (achado já registrado por outra sessão). A gravação se confirma pela linha | `screenshots/CH-05-01-editor-salvo-p-nb.png` |
| 03 | Voltar à lista da Home e ler a linha de B-1 | "Campanha “Dia das Mães” · em vigência até 30/11 às 23:59", "No ar", e a mesma frase sobre P-NB | — |
| 04 | Na loja (visitante, 390 × 844), contar a fileira de B-1 | 7 peças: P-3, P-1, P-2, P-TIRA, P-FORA, P-AMBAS, P-APAG — P-NB não está, nenhuma outra no lugar | `screenshots/CH-05-02-loja-sem-p-nb-390.png` |
| 05 | Em Produtos, abrir P-TIRA → "Preços & variações", em "Dia das Mães" escolher "Nenhum" e Salvar | "Produto atualizado · As alterações já estão na loja." | — |
| 06 | Recarregar a loja | 6 peças: P-TIRA sumiu, as outras na ordem, nenhuma no lugar | `screenshots/CH-05-03-loja-sem-p-tira-390.png` |
| 07 | Reabrir B-1 | "7 de 12" sem P-TIRA; "“Anel Afetivo Coração com Cinzas de Cremação em Aço Inoxidável” não está marcada na campanha escolhida e saiu da lista." + "A remoção vale quando você salvar."; cabeçalho "Alterações não salvas" | `screenshots/CH-05-04-editor-p-tira-saiu.png` |
| 08 | Com o editor alterado, ir para Campanhas pelo menu e voltar pelo botão Voltar do browser (edge case) | Sai sem perguntar nada (spec-gap); ao voltar, o aviso e a pendência estão de novo | — |
| 09 | Salvar | "Salvo" no botão — mas o aviso "…saiu da lista." + "A remoção vale quando você salvar." continua na tela depois de salvo (spec-gap) | `screenshots/CH-05-05-salvo-aviso-persiste.png` |
| 10 | Recarregar o editor | "7 de 12", sem aviso, sem "Alterações não salvas" | — |
| 11 | Em Produtos, Ações de P-FORA → Desativar; recarregar a loja; ler a linha de B-1 | P-FORA vira "Rascunho". Loja: 5 peças, P-FORA sumiu, nenhuma no lugar. Linha: "1 das 7 saiu do ar: “Anel Afetivo Coração com Leite Materno em Aço Inoxidável”. A loja a pula enquanto ela não voltar." | — |
| 12 | Ações de P-APAG → Excluir → confirmar "Excluir produto?"; recarregar a loja; ler a linha; reabrir B-1 | Loja: 4 peças (P-3, P-1, P-2, P-AMBAS), P-APAG sumiu. **Linha: "1 das 6 saiu do ar: “…Leite Materno em Aço…”"** — a apagada não é contada nem nomeada (A-2). Editor: "6 de 12", "“QA103 Peça descartável” foi apagada do catálogo e saiu da lista." + "A remoção vale quando você salvar.", P-FORA na lista com "fora do ar", e a mesma contagem "1 das 6", abre alterado | `screenshots/CH-05-06-loja-sem-fora-e-apag-390.png` · `screenshots/CH-05-07-editor-apagada-contagem.png` |
| 13 | Salvar; depois bloquear `**/rest/v1/product_campaigns*` e recarregar o editor de B-1 | "Salvo". Com o bloqueio: as 6 peças continuam, nada de "Alterações não salvas" — mas o editor fica em "Conferindo as peças marcadas na campanha…" sem fim (mais de 50 s), sem dizer que não conseguiu conferir (A-1). Rede: `HEAD /rest/v1/product_campaigns` abortado, repetido; console sem erro | `screenshots/CH-05-08-editor-sem-leitura-campanha.png` |
| 14 | Recarregar com o bloqueio de novo (segunda reprodução); tirar o bloqueio e recarregar | Igual: "Conferindo…" depois de 25 s. Sem o bloqueio: "18 na campanha", 6 peças, nada alterado — nada foi gravado | — |
| 15 | Trocar a campanha para "Natal" | "Alterações não salvas", "1 de 12": fica só P-AMBAS; "“…Colméia…”, “…6 Corações…”, “…Amor Mãe e Bebê…”, “…Coração com Leite Materno em Aço…” e “QA103 Peça já em promoção” não estão marcadas na campanha escolhida e saíram da lista." + "A remoção vale quando você salvar."; "4 na campanha" | `screenshots/CH-05-09-troca-para-natal.png` |
| 16 | Cancelar; reabrir B-1 | Cancelar leva à lista da Home sem perguntar. Reaberto: "Dia das Mães" marcada, as 6 peças na ordem de antes | — |
| 17 | (devolução da massa) Remover P-FORA, P-NB e P-AMBAS; Salvar; recarregar | "Salvo"; reaberto: "Dia das Mães", título "Joias para guardar quem a gente ama", "3 de 12": P-3, P-1, P-2 | — |
| 18 | (devolução da massa) Produtos → Rascunhos → Ações de P-FORA → Ativar; abrir a peça e a Home na loja como visitante | A página de P-FORA abre na loja; a fileira de B-1 mostra P-3, P-1, P-2 | — |
| 19 | Sair da conta; fechar os dois browsers | Volta a `/admin/login` | — |

**Edge cases tentados:**

- Ir para outra página com o editor alterado e voltar (Voltar do browser): a pendência volta — ok; sai sem pedir confirmação (spec-gap)
- Recarregar o editor depois de salvar a remoção: o aviso não se repete — ok
- Falha de leitura das marcações (rota abortada), duas vezes: nada sai da lista, não abre alterado, mas sem aviso de falha — A-1
- Cinco cliques seguidos na busca: um se perdeu enquanto a lista se redesenhava (não reproduzido; anotado como condução)

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-015 | pass | 05–10 | `screenshots/CH-05-03-loja-sem-p-tira-390.png` · `screenshots/CH-05-04-editor-p-tira-saiu.png` | Variação "sair e voltar": ok. Variação "Cancelar e reabrir" não tentada. O aviso fica na tela depois de "Salvo" (spec-gap) |
| TC-FUNC-016 | fail | 11–12 | `screenshots/CH-05-06-loja-sem-fora-e-apag-390.png` · `screenshots/CH-05-07-editor-apagada-contagem.png` | A-2: a linha conta "1 das 6" e não conta nem nomeia a apagada. Loja, nome de P-FORA na linha e nomes no editor ok. Variação "republicar": P-FORA foi republicada já fora de B-1 (devolução da massa), a volta à fileira não foi conferida |
| TC-FUNC-017 | fail | 13–14 | `screenshots/CH-05-08-editor-sem-leitura-campanha.png` | A-1: nenhuma peça sai e não abre alterado (ok), mas o editor não diz que não conseguiu conferir: fica em "Conferindo…" |
| TC-FUNC-018 | pass | 01–04 | `screenshots/CH-05-01-editor-salvo-p-nb.png` · `screenshots/CH-05-02-loja-sem-p-nb-390.png` | Editor, linha e loja ok. Variação `/ofertas` não conferida |
| TC-FUNC-019 | skip | — | — | Orçamento estourado antes; ver Fora da cobertura |
| TC-FUNC-020 | pass | 15–16 | `screenshots/CH-05-09-troca-para-natal.png` | P-AMBAS fica, as outras 5 saem nomeadas; Cancelar desfaz (conferido ao reabrir). Passo 3 (loja logo depois de Cancelar) não recarregado na hora; a loja do passo 18 está como o salvo. Variação ida e volta não tentada |

Contagem: pass 3 · fail 2 · blocked 0 · skip 1

## Achados

### A-1 · [Painel · editor do bloco] Sem conseguir ler as marcações da campanha, o editor fica em "Conferindo…" para sempre e nunca diz que não conferiu — Adri não sabe que a lista não foi verificada

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-04, ramo J-04a (abrir o editor) · passos 13–14 do log               |
| TC                  | TC-FUNC-017                                                           |
| Gravidade proposta  | medium — nada se perde (nenhuma peça sai, não abre alterado), mas a dona fica olhando um "Conferindo…" sem fim, sem saber que a conferência falhou nem o que fazer; pode salvar achando que as peças foram conferidas |
| Reproduziu          | sim (2 de 2)                                                          |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:

1. Entrar no painel como `admin-loja`, com B-1 ("Joias em oferta", "Dia das Mães") tendo peças escolhidas
2. Fazer as requisições `**/rest/v1/product_campaigns*` falharem (rota abortada no browser)
3. Abrir `/admin/home/<id de B-1>` e esperar mais de 25 s

**Esperado:** nenhuma peça sai da lista e o editor diz que não conseguiu conferir a campanha — **fonte:** PRD CA-04.3; spec.md D-08; TC-FUNC-017 passo 1

**Observado:** a lista fica intacta ("6 de 12") e o cabeçalho sem "Alterações não salvas" (correto), mas sob as peças fica "Conferindo as peças marcadas na campanha…" indefinidamente (mais de 50 s na primeira vez, 25 s na segunda), sem mensagem de falha nem forma de tentar de novo.

**Evidência:**

- `screenshots/CH-05-08-editor-sem-leitura-campanha.png` — o editor parado em "Conferindo…" com as 6 peças
- console: nada
- rede: `HEAD /rest/v1/product_campaigns` abortada (várias vezes, com os OPTIONS)

### A-2 · [Painel · linha de B-1 na Home] A peça escolhida apagada some da contagem "N das M saíram do ar" — a lista não avisa que ela saiu

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-04, passo 4 (ler a linha) · passo 12 do log                         |
| TC                  | TC-FUNC-016                                                           |
| Gravidade proposta  | low — a cliente não vê a peça e o editor nomeia a apagada ao abrir, mas na lista da Home a dona não fica sabendo que uma das escolhidas sumiu: a conta já vem sem ela |
| Reproduziu          | sim (2 de 2 — na linha da lista e na mesma frase dentro do editor)    |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:

1. Como `admin-loja`, ter B-1 salvo com P-3, P-1, P-2, P-FORA, P-NB, P-AMBAS, P-APAG (7)
2. Desativar P-FORA em `/admin/produtos`: a linha de B-1 diz "1 das 7 saiu do ar: “…Leite Materno em Aço…”"
3. Excluir P-APAG em `/admin/produtos` e voltar a `/admin/home`

**Esperado:** a linha conta as duas que saíram ("2 das 7…"), nomeando a despublicada e a apagada — **fonte:** PRD CA-04.1, CA-04.3; TC-FUNC-016 passo 5

**Observado:** "1 das 6 saiu do ar: “Anel Afetivo Coração com Leite Materno em Aço Inoxidável”. A loja a pula enquanto ela não voltar." — o total caiu de 7 para 6 e a apagada não aparece. Ao abrir o editor, ele diz "“QA103 Peça descartável” foi apagada do catálogo e saiu da lista." (correto), mas repete "1 das 6".

**Evidência:**

- `screenshots/CH-05-07-editor-apagada-contagem.png` — o aviso da apagada ao lado da contagem "1 das 6"
- console: nada
- rede: nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| Depois de "Salvo", o aviso "…saiu da lista." + "A remoção vale quando você salvar." continua na tela até recarregar | 09 | polimento |
| Sair do editor com alterações (link do menu, Cancelar) não pede confirmação; a remoção automática volta ao reabrir, então nada se perde | 08, 16 | pré-existente |

## Fora da cobertura

- TC-FUNC-019 (remover P-1..P-3 e ver só os cartões de percentual na prévia) — orçamento estourado
- Variações: `/ofertas` sem P-NB (TC-FUNC-018); republicar P-FORA e vê-la voltar à fileira (TC-FUNC-016 — republicada já fora de B-1); Cancelar e reabrir com a pendência (TC-FUNC-015); ida e volta Dia das Mães → Natal → Dia das Mães (TC-FUNC-020); variação sem rede (TC-FUNC-017) — orçamento
- Edge cases: fechar a aba com a remoção pendente; recarregar o editor logo depois de tirar a peça noutra aba — orçamento
- A loja recarregada logo depois do Cancelar da troca de campanha (TC-FUNC-020 passo 3): conferido só ao reabrir o editor e na loja do passo 18

## Debrief

- **Surpresas:** o "Salvo" apareceu nas gravações que só removiam peças (passos 09, 13, 17) e faltou na que acrescentava (passo 02) — combina com o achado já registrado. A falha da leitura da campanha não derruba o editor, só o deixa parado
- **Próximo charter:** a resposta lenta (não abortada) de `product_campaigns` — com outro driver — para ver se "Conferindo…" tem limite; TC-FUNC-019 e as variações não cobertas
- **Padrão novo:** apagar a peça depois de despublicar outra, e ler a contagem da linha — achou A-2

Estado final da massa: B-1 salvo, ligado ("No ar"), "Dia das Mães", título "Joias para guardar quem a gente ama", P-3, P-1, P-2 nessa ordem (conferido no editor recarregado e na loja como visitante). P-TIRA fora de "Dia das Mães" ("Nenhum"). P-FORA republicada (Ativar; a página abre na loja como visitante). P-APAG excluída. P-NB, P-AMBAS e "Natal" não alterados.
