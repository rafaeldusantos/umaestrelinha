# Sessão CH-04 · Um bloco por campanha: o novo, o da próxima, a colisão e a campanha apagada

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-04-varios-blocos-e-bloco-sem-campanha.md` · exploratório · P1 |
| Status      | done                                                                   |
| Persona     | PER-01 Adri · conta: admin-loja — `QA_ADMIN_LOJA_*` (loja conferida como anônima, em outra sessão de browser) |
| Tour · modo | Multi-Tab · por cenário (J-03, passos 1–6, ramos J-03a e J-03b)        |
| Rodada      | exploração                                                             |
| Orçamento   | ~68 ações de browser de 70                                             |
| Ambiente    | painel http://localhost:8083 · loja http://localhost:8082 · build não exposto · Chromium (agent-browser 0.39.1) · viewports painel 1440 × 900, loja 390 × 844 e 1440 × 900 |
| Paridade    | Supabase local; `*.supabase.co` e `/g/collect` bloqueados (fotos do Storage hospedado podem faltar) |

## Missão

Achar qualquer jeito de a Home ficar com dois blocos da mesma campanha, de um bloco sem campanha aparecer na loja,
ou de a dona perder o que escreveu quando outra aba grava antes — preparando o bloco da "Natal" como a dona faria.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Em `/admin/home`, acrescentar "Joias em oferta" pela bandeja (com B-1 já na Home, 4º bloco) | A bandeja oferece o bloco; o clique cria B-2 e abre direto o editor dele. De volta à lista (Cancelar): B-2 é o 17º bloco, "Joias em oferta · sem campanha", **Desligada**, com a frase "O bloco está sem campanha e não aparece na loja. Escolha uma campanha." | `screenshots/CH-04-01-b2-nasce-desligado.png` |
| 02 | Ligar B-2 pelo interruptor | A frase continua, mas o estado da linha passa a **"No ar"** (A-1) | `screenshots/CH-04-02-b2-ligado-no-ar.png` |
| 03 | Recarregar a loja (anônima, 390) | Só B-1 ("Joias para guardar quem a gente ama", Dia das Mães, P-3, P-1, P-2); nada de B-2 nem espaço reservado | `screenshots/CH-04-03-loja-so-b1-390.png` |
| 04 | Abrir B-2, escrever "Natal QA" no título e salvar sem campanha | Não grava; `alert` "O bloco está sem campanha e não aparece na loja. Escolha uma campanha."; o título continua no campo; "Alterações não salvas" | `screenshots/CH-04-04-recusa-sem-campanha.png` |
| 05 | No seletor, tentar "Dia das Mães" com clique e com teclado (foco em "Natal", ↑ ↑) | "Dia das Mães" desabilitada com "Esta campanha já está no 4º bloco da Home, “Joias para guardar quem a gente ama”. Cada campanha tem um bloco só."; nem o clique nem as setas a escolhem. "QA103 Desligada" não é oferecida | `screenshots/CH-04-04-recusa-sem-campanha.png` |
| 06 | Escolher "Natal" | Aviso "A campanha começa em 01/12 às 00:00. A prévia e a loja mostram o bloco a partir daí."; a prévia não mostra B-2 (só B-1); a busca de peças abre com "4 na campanha" | `screenshots/CH-04-05-natal-aviso-previa.png` |
| 07 | Acrescentar "Colar Afetivo Redonda…" (P-AGE) e "Colar Afetivo Pata…" (P-AMBAS) e salvar | "2 de 12"; o aviso continua; a tela segue com **"Alterações não salvas"** e nenhum "Salvo" (A-2); a rede mostra a gravação concluída | `screenshots/CH-04-06-b2-salvo-sem-recibo.png` |
| 08 | Ler a linha de B-2 em `/admin/home` | "Campanha “Natal” · agendada — começa em 01/12 às 00:00" + "A campanha escolhida ainda não começou. O bloco aparece na loja quando ela entrar em vigência." — e o estado **"No ar"** (A-1) | `screenshots/CH-04-07-linha-b2-natal-agendada.png` |
| 09 | Recarregar a loja em 390 e em 1440 | Só B-1; nenhum "Natal QA" nem selo de Natal | `screenshots/CH-04-08-loja-so-b1-1440.png` |
| 10 | Em `/admin/campanhas`, criar C-X "QA103 Ano Novo" (selo "ANO NOVO", 26/12/2026 00:00 a 31/12/2026 23:59, 10 %, ligada, sem peças) | Gravada; na lista como "26/12 a 31/12/2026 · Agendada" | — |
| 11 | Acrescentar B-3 pela bandeja (aba A, editor de B-3) | Editor de B-3 sem campanha; "Dia das Mães" (4º) e "Natal" (17º, “Natal QA”) desabilitadas; C-X disponível | — |
| 12 | Aba B: abrir o editor de B-2 (mesma janela, outra aba) | Reabertura confirma a gravação do passo 07: "Natal QA", "Natal", 2 de 12. C-X disponível | — |
| 13 | Aba A: escolher C-X e salvar | "Alterações não salvas" some; aviso de início em 26/12; nenhum texto "Salvo" no snapshot 2,5 s depois | `screenshots/CH-04-09-abaA-b3-cx-gravado.png` |
| 14 | Aba B, sem recarregar: trocar "Natal" por C-X (ainda oferecida) e salvar | Não grava (`PATCH home_sections → 409`); `alert` "Esta campanha já está no 18º bloco da Home, “QA103 Ano Novo”. Cada campanha tem um bloco só."; o rascunho fica: título "Natal QA", C-X marcada, a frase de que as duas peças de Natal saíram da lista "quando você salvar". Nenhum `DELETE` nas peças de B-2 | `screenshots/CH-04-10-abaB-recusa-colisao.png` |
| 15 | Duplo clique no Salvar da aba B | Mesma recusa, um `alert` só; nada gravado | — |
| 16 | Cancelar na aba B e recarregar `/admin/home` | B-2 "Natal" (agendada) e B-3 "QA103 Ano Novo" (agendada, Desligada) | `screenshots/CH-04-11-linhas-b2-natal-b3-cx.png` |
| 17 | Apagar C-X em `/admin/campanhas/<id>` → "Apagar campanha" → diálogo "Apagar a campanha?" → Apagar | C-X some do cadastro. O diálogo não menciona que um bloco da Home usa a campanha | — |
| 18 | Ler a linha de B-3 em `/admin/home` | "Joias em oferta · sem campanha", Desligada, "O bloco está sem campanha e não aparece na loja. Escolha uma campanha." — a mesma frase do passo 01 | `screenshots/CH-04-12-b3-apos-apagar-cx.png` |
| 19 | Abrir B-3 | Mesma frase; "Dia das Mães" e "Natal" desabilitadas (4º e 17º); a busca de peças indisponível com "Escolha a campanha do bloco para buscar as peças…" | `screenshots/CH-04-13-editor-b3-sem-campanha.png` |
| 20 | Cancelar, ligar B-3 e recarregar a loja (390) | Linha de B-3 vira "No ar" (A-1); a loja continua de pé, só com B-1 | `screenshots/CH-04-14-loja-so-b1-apos-apagar-390.png` |
| 21 | Desligar B-3 de novo e recarregar o painel | B-3 sem campanha, Desligada (estado de entrega para o CH-06) | — |

**Edge cases tentados:**

- Duplo clique no Salvar da aba B (colisão): uma recusa, nada gravado
- Teclado no seletor (setas sobre a opção desabilitada): não a escolhe
- Ligar e desligar B-3 sem campanha (um ciclo): a gravação otimista se manteve depois de recarregar; loja não mudou
- Lista de campanhas velha na aba B (C-X ocupada pela aba A): o servidor recusa com a frase do seletor

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-009 | pass | 01–04 | `screenshots/CH-04-01-b2-nasce-desligado.png` · `CH-04-04-recusa-sem-campanha.png` | nasce desligado, frase certa, recusa sem campanha com título mantido; o estado "No ar" depois de ligar contradiz a frase — A-1 |
| TC-FUNC-010 | pass | 05 | `screenshots/CH-04-04-recusa-sem-campanha.png` | posição (4º) e título de B-1; clique e teclado não escolhem. Variação "mover B-1" não feita |
| TC-FUNC-011 | pass | 06–07, 12 | `screenshots/CH-04-05-natal-aviso-previa.png` · `CH-04-06-b2-salvo-sem-recibo.png` | aviso e prévia sem B-2; gravou (confirmado na reabertura), mas sem "Salvo" — A-2 |
| TC-FUNC-012 | pass | 08–09 | `screenshots/CH-04-07-linha-b2-natal-agendada.png` · `CH-04-08-loja-so-b1-1440.png` | linha com campanha, estado e motivo; loja em 390 e 1440 só com B-1. Estado "No ar" — A-1 |
| TC-FUNC-013 | pass | 13–16 | `screenshots/CH-04-10-abaB-recusa-colisao.png` · `CH-04-11-linhas-b2-natal-b3-cx.png` | recusa como `alert` com posição e título de B-3 (o nome da campanha, B-3 sem título); rascunho mantido; B-2 segue "Natal". Na aba A o "Salvo" não foi visto (o indicador de não salvo sumiu). Variação "recarregar a aba B depois da recusa" não feita |
| TC-FUNC-014 | pass | 17–20 | `screenshots/CH-04-12-b3-apos-apagar-cx.png` · `CH-04-13-editor-b3-sem-campanha.png` · `CH-04-14-loja-so-b1-apos-apagar-390.png` | mesma frase do bloco recém-nascido; variação "B-3 ligado" feita: loja só com B-1 |

Contagem: pass 6 · fail 0 · blocked 0 · skip 0

## Achados

### A-1 · [Painel · lista da Home] bloco "Joias em oferta" que não aparece na loja é marcado "No ar" — a dona

Já registrado por outra sessão (linha de bloco sem campanha "No ar"); esta sessão mostra que vale também para o
bloco com campanha **agendada**.

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-03, passos 2 e 5 (ler a linha) · passos 02, 08 e 20 do log          |
| TC                  | TC-FUNC-009, TC-FUNC-012                                              |
| Gravidade proposta  | high — a mesma linha diz "No ar" e "não aparece na loja"; a dona não sabe em qual confiar |
| Reproduziu          | sim (3 de 3: B-2 sem campanha, B-2 com "Natal", B-3 sem campanha)     |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:

1. Entrar no painel como `admin-loja` e abrir `/admin/home`
2. Na bandeja, acrescentar "Joias em oferta"; Cancelar no editor
3. Ligar o bloco novo pelo interruptor da linha

**Esperado:** a linha diz que o bloco não aparece na loja, sem um estado que diga o contrário — **fonte:** PRD
CA-02.3/CA-02.4 · TC-FUNC-009 passo 2 · TC-FUNC-012 passo 1

**Observado:** estado "No ar" ao lado de "O bloco está sem campanha e não aparece na loja. Escolha uma campanha."
(e, com "Natal", ao lado de "A campanha escolhida ainda não começou. O bloco aparece na loja quando ela entrar em
vigência.")

**Evidência:**

- `screenshots/CH-04-02-b2-ligado-no-ar.png` — B-2 sem campanha, ligado, "No ar"
- `screenshots/CH-04-07-linha-b2-natal-agendada.png` — B-2 com "Natal", "No ar"
- console: nada
- rede: nada

### A-2 · [Painel · editor do bloco] gravar com peças não dá recibo: fica "Alterações não salvas" — a dona

Já registrado por outra sessão; visto de novo.

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-03, passo 4 (salvar) · passo 07 do log                              |
| TC                  | TC-FUNC-011                                                           |
| Gravidade proposta  | high — paciência zero para "salvou?" sem resposta; o indicador diz o contrário do que aconteceu |
| Reproduziu          | sim nesta sessão 1 de 1 (não repetido para poupar orçamento; já reproduzido por outra sessão) |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:

1. Painel como `admin-loja`, abrir o editor de um bloco "Joias em oferta" com campanha "Natal"
2. Escrever um título, acrescentar duas peças e clicar em "Salvar seção"

**Esperado:** "Salvo" — **fonte:** TC-FUNC-011 passo 2 · PRD CA-01.5

**Observado:** o cabeçalho continua "Alterações não salvas", sem "Salvo"; reabrir o bloco mostra tudo gravado. No
B-3 (sem peças, passo 13) o indicador sumiu, mas o "Salvo" também não foi capturado.

**Evidência:**

- `screenshots/CH-04-06-b2-salvo-sem-recibo.png` — "Alterações não salvas" depois de gravar
- console: nada
- rede: `DELETE home_section_items → 204` · `POST home_section_items → 201` · `GET home_sections → 200`

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| B-3 sem campanha pede "Escolha uma campanha" quando todas as campanhas oferecidas estão desabilitadas (ocupadas); a tela não diz que é preciso criar uma campanha ou liberar outro bloco | 19 | polimento |
| O diálogo "Apagar a campanha?" não avisa que um bloco da Home usa a campanha e vai ficar sem campanha | 17 | polimento |

## Fora da cobertura

- Variação do TC-FUNC-010 (mover B-1 e reler a posição) — orçamento
- Variação do TC-FUNC-013 (recarregar a aba B com a recusa na tela) e o edge case "recarregar com o aviso de colisão" — orçamento
- Variação do TC-FUNC-011 (voltar a uma campanha em vigência livre) — não há campanha em vigência livre na massa
- Edge cases "mesma URL em duas abas", "sair na aba A com o editor aberto na B", "remover B-3 e desfazer no confirm" e várias alternâncias seguidas do interruptor — orçamento
- O "Salvo" do passo 13 (aba A): se apareceu como toast e sumiu antes do snapshot, não foi capturado

## Debrief

- **Surpresas:** clicar no bloco da bandeja já cria o bloco e abre o editor (o bloco existe mesmo se a dona
  Cancelar). A campanha "Natal" tem 4 peças marcadas no cadastro e no editor ("4 na campanha"), não 5 como diz a
  massa do ambiente. A trava "um bloco por campanha" se segura no servidor (409) mesmo com a lista velha na aba.
- **Próximo charter:** nada além do já planejado (CH-06 usa B-3 sem campanha)
- **Padrão novo:** nada

Estado final da massa: B-2 (17º bloco) ligado, "Natal", título "Natal QA", 2 peças (Colar Afetivo Redonda…, Colar
Afetivo Pata…). B-3 (18º bloco) desligado e sem campanha. C-X "QA103 Ano Novo" apagada. B-1 intocado.
