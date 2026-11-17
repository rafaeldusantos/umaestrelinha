# Sessão CH-06 · A virada: o bloco preparado entra sozinho no início e sai no fim

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-06-virada-da-campanha.md` · exploratório · P0 |
| Status      | done                                                                   |
| Persona     | PER-01 Adri · conta: admin-loja — `QA_ADMIN_LOJA_*` (loja conferida como anônima, em sessões de browser separadas, sem login) |
| Tour · modo | Locale (fuso do aparelho diferente do da loja) · por cenário (J-03, passo 7, e ramo J-03c) |
| Rodada      | exploração                                                             |
| Orçamento   | ~79 ações de browser de 70 (contando navegação, recarga, clique, digitação e tecla; snapshots, esperas e screenshots fora). O estouro veio dos campos de hora da campanha, que só aceitam tecla a tecla (~13 ações), e de ter de desligar C-VIR para conseguir religar "Dia das Mães" (passo 20) |
| Ambiente    | painel http://localhost:8083 · loja http://localhost:8082 · build não exposto · Chromium (agent-browser 0.39.1) · viewports painel 1440 × 900, loja 390 × 844 |
| Paridade    | Supabase local; `*.supabase.co` e `/g/collect` bloqueados. Fuso emulado pela variável `TZ` no lançamento do Chromium de cada sessão anônima (conferido na página: `Asia/Tokyo` → 12:13 de 17/11; `America/Manaus` → 23:13 de 16/11, quando eram 00:13 em Brasília). A virada foi real, pelo relógio do banco local |

## Missão

Provar que o bloco preparado para uma campanha que ainda não começou entra na Home no minuto do início e sai no
minuto do fim, sem a dona tocar no painel, pelo relógio do banco e não pelo do aparelho — e que o painel diz, em
cada momento, por que cada bloco aparece ou não.

Horários (Brasília, 17/11/2026): **T0 = 00:20**, fim **00:30**. Sessões de loja: `CH-06-anon` (fuso do sistema, Brasília), `CH-06-tz` (Asia/Tokyo, adiantado), `CH-06-tz2` (America/Manaus, atrasado).

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Partida: loja anônima (390) | B-1 "Joias para guardar quem a gente ama", Dia das Mães, P-3, P-1, P-2 | — |
| 02 | Em `/admin/campanhas`, abrir "Dia das Mães" (13/11/2026 16:20 a 30/11/2026 23:59, ligada), desligar e salvar (00:11) | Lista: "Dia das Mães · Desligada" | — |
| 03 | Recarregar a loja anônima | B-1 sumiu; nenhum bloco de ofertas, nenhum espaço reservado | `screenshots/CH-06-01-loja-sem-b1-390.png` |
| 04 | Ler a linha de B-1 em `/admin/home` | "Campanha “Dia das Mães” · desligada" + "A campanha escolhida está desligada, e o bloco não aparece na loja enquanto ela não for ligada." — o estado da linha diz **"No ar"** (achado já registrado) | `screenshots/CH-06-02-linha-b1-desligada.png` |
| 05 | Abrir o editor de B-1 e o seletor; Cancelar | "Dia das Mães · Desligada · 13/11 a 30/11/2026" marcada; única outra opção "Natal" desabilitada ("já está no 17º bloco"); "Dia das Mães" não aparece duplicada como opção nova | `screenshots/CH-06-03-editor-b1-desligada.png` |
| 06 | Criar C-VIR "QA103 Virada" (selo "QA103 VIRADA", 10 %, ligada, 17/11 00:20 a 17/11 00:30) | Os campos de hora/minuto não aceitam `fill` nem digitação contínua — só tecla a tecla (dígito por dígito) ou setas. Gravada às 00:12; lista: "17/11 a 17/11/2026 · 10% · 0 · Agendada" | — |
| 07 | Editor de B-3 (sem campanha): escolher "QA103 Virada · Agendada", título "Virada QA", salvar | Mostrou **"Salvo"**. Aviso no editor: "Nenhuma peça está marcada nesta campanha. Sem peça marcada, o bloco não tem o que mostrar." | — |
| 08 | Ligar B-3 na lista | "Campanha “QA103 Virada” · agendada — começa em 17/11 às 00:20" + "A campanha escolhida ainda não começou. O bloco aparece na loja quando ela entrar em vigência." — estado "No ar" (achado já registrado) | `screenshots/CH-06-04-linha-b3-agendada.png` |
| 09 | 00:13 · loja anônima (Brasília) recarregada | Sem bloco de ofertas | `screenshots/CH-06-05-loja-antes-t0-390.png` |
| 10 | 00:13 · loja com fuso de Tóquio (relógio do aparelho já em 12:13 de 17/11, "depois" de 00:20) | Sem bloco de ofertas | `screenshots/CH-06-06-loja-toquio-antes-t0-390.png` |
| 11 | 00:13 · loja com fuso de Manaus (23:13 de 16/11) | Sem bloco de ofertas | — |
| 12 | 00:21 · aba de Tóquio aberta desde 00:13, **sem recarregar** | Continua sem bloco (a página não se atualiza sozinha) | — |
| 13 | 00:21 · recarregar Tóquio | B-3 aparece (último bloco antes do rodapé): selo "QA103 VIRADA", título "Virada QA", "Peças selecionadas com 10% de desconto…", link "Ver as peças com 10% de desconto"; sem cartões (C-VIR não tem peças) | `screenshots/CH-06-07-loja-toquio-t0-390.png` |
| 14 | 00:21 · recarregar Brasília e Manaus | B-3 igual nas duas | `screenshots/CH-06-08-loja-brasilia-t0-390.png` · `screenshots/CH-06-09-loja-manaus-t0-390.png` |
| 15 | 00:21 · recarregar `/admin/home` | Linha de B-3: "Campanha “QA103 Virada” · em vigência até 17/11 às 00:30" | `screenshots/CH-06-10-linha-b3-em-vigencia.png` |
| 16 | 00:22 · religar "Dia das Mães" com C-VIR em vigência | Recusado, `alert`: "A vigência cruza a da campanha “QA103 Virada” (17/11 a 17/11). Só uma campanha ligada pode valer por vez: mude as datas ou desligue a outra." Saí sem salvar; "Dia das Mães" seguiu Desligada | `screenshots/CH-06-11-religar-dm-recusado.png` |
| 17 | 00:31 · aba de Manaus (recarregada às 00:21), **sem recarregar** | Ainda mostra "Virada QA" — a página aberta não tira o bloco sozinha | — |
| 18 | 00:31 · recarregar Brasília, Tóquio e Manaus | B-3 sumiu nas três; nenhum bloco de ofertas | `screenshots/CH-06-12-loja-brasilia-fim-390.png` · `screenshots/CH-06-13-loja-toquio-fim-390.png` |
| 19 | 00:31 · `/admin/home`: linha e editor de B-3; Cancelar | Linha: "Campanha “QA103 Virada” · encerrada em 17/11" + "A campanha escolhida já terminou, e o bloco não aparece na loja. Escolha outra campanha." (estado "No ar", achado já registrado). Editor: "QA103 Virada · Encerrada · 17/11 a 17/11/2026" marcada, aparece uma vez só, não como opção nova; "Natal" desabilitada | `screenshots/CH-06-14-linha-b3-encerrada.png` · `screenshots/CH-06-15-editor-b3-encerrada.png` |
| 20 | Religar "Dia das Mães" (datas conferidas: 13/11/2026 a 30/11/2026, 16:20 e 23:59, iguais às de partida) | **Recusado de novo**, mesma mensagem: C-VIR, já encerrada mas ainda ligada, "cruza" a vigência. Desliguei C-VIR (criada nesta sessão) e religuei "Dia das Mães": gravou. Lista: "Dia das Mães · Em vigência"; "QA103 Virada · Encerrada" | — |
| 21 | Recarregar a loja anônima | B-1 voltou: "Joias para guardar quem a gente ama", P-3 (15 %), P-1 (15 %), P-2 (10 %) | `screenshots/CH-06-16-loja-b1-voltou-390.png` |
| 22 | Recarregar `/admin/home` | B-1: "Campanha “Dia das Mães” · em vigência até 30/11 às 23:59"; B-3: "Campanha “QA103 Virada” · encerrada em 17/11", ligado | `screenshots/CH-06-17-linhas-finais.png` |
| 23 | Sair da conta; fechar as quatro sessões de browser | Voltou a `/admin/login` | — |

**Edge cases tentados:**

- Fuso adiantado (Asia/Tokyo) antes de T0, em T0 + 1 e no fim: a loja segue o banco, não o aparelho
- Fuso atrasado (America/Manaus) antes de T0, em T0 + 1 e no fim: idem
- Home aberta desde antes de T0 sem recarregar (Tóquio, passo 12): não mostra o bloco até recarregar. Home aberta durante a vigência sem recarregar (Manaus, passo 17): continua mostrando o bloco depois do fim até recarregar. Anotado, sem julgar (🟡 do plano)
- Recarregar o painel durante a virada: a linha acompanha (agendada → em vigência → encerrada)
- Religar "Dia das Mães" com C-VIR em vigência: recusado (passo 16) — é da WI 102, sem achado

**Estado final da massa:** "Dia das Mães" **ligada**, Em vigência, 13/11/2026 16:20 a 30/11/2026 23:59 (as mesmas datas de partida). C-VIR "QA103 Virada" **desligada** e encerrada (17/11 00:20 a 00:30, 10 %, 0 peças) — precisou ser desligada para o cadastro aceitar religar "Dia das Mães". B-3 (18º bloco) **ligado**, título "Virada QA", apontando para C-VIR, linha "encerrada em 17/11", fora da loja. B-1 e B-2 sem alteração.

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-JOURNEY-003 | pass | 09–18 | `screenshots/CH-06-05-loja-antes-t0-390.png` · `screenshots/CH-06-07-loja-toquio-t0-390.png` · `screenshots/CH-06-08-loja-brasilia-t0-390.png` · `screenshots/CH-06-10-linha-b3-em-vigencia.png` · `screenshots/CH-06-12-loja-brasilia-fim-390.png` | Antes de T0 sem bloco (Brasília, Tóquio, Manaus); em T0 + 1 B-3 com "Virada QA" e 10 % nos três fusos; linha "em vigência"; em T0 + 11 sumiu nos três. "Os cartões de 10 %" não se veem: C-VIR não tem peça marcada, como o charter a define (ver Spec-gaps). Variação fuso atrasado: pass. Variação Home aberta: anotada nos edge cases |
| TC-FUNC-021 | pass | 02–05, 19–22 | `screenshots/CH-06-01-loja-sem-b1-390.png` · `screenshots/CH-06-02-linha-b1-desligada.png` · `screenshots/CH-06-03-editor-b1-desligada.png` · `screenshots/CH-06-14-linha-b3-encerrada.png` · `screenshots/CH-06-15-editor-b3-encerrada.png` · `screenshots/CH-06-16-loja-b1-voltou-390.png` | Loja tira o bloco desligado e o encerrado; linha e editor dizem "desligada"/"encerrada" e por que não aparece; a campanha atual aparece escolhida com o estado e não como opção nova. O estado da linha diz "No ar" nos três casos — achado já registrado, não repetido. No passo 5, religar foi recusado enquanto C-VIR estava ligada (regra da WI 102 — ver Spec-gaps); depois de desligar C-VIR, B-1 voltou como estava. Variação recarregar o painel: B-1 "em vigência até 30/11 às 23:59" — pass |

Contagem: pass 2 · fail 0 · blocked 0 · skip 0

## Achados

nada

Já registrados, vistos de novo (não perseguidos): o estado "No ar" na linha de bloco que não aparece na loja — B-1 com "Dia das Mães" desligada (passo 04), B-3 agendada (passo 08) e B-3 encerrada (passo 19). O "Salvo" que pode faltar no editor **apareceu** desta vez, ao gravar B-3 (passo 07).

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| Bloco cuja campanha não tem nenhuma peça marcada aparece na loja durante a vigência com selo, título, descrição "Peças selecionadas com 10% de desconto…" e o link "Ver as peças com 10% de desconto", sem nenhum cartão — enquanto o editor diz "Sem peça marcada, o bloco não tem o que mostrar." Nenhuma fonte diz se o bloco sem peças aparece | 07, 13–14 | polimento |
| Campanha já encerrada, mas ainda ligada, impede ligar outra cuja vigência cruza a dela no passado: depois de "QA103 Virada" terminar, religar "Dia das Mães" é recusado com "A vigência cruza a da campanha “QA103 Virada” (17/11 a 17/11)…". A dona só religa desligando antes a campanha que já acabou. Regra do cadastro (WI 102) | 20 | pré-existente |
| Os campos de hora e minuto da campanha não aceitam colar/preencher o valor nem digitação contínua — só dígito a dígito ou setas (cadastro da WI 102) | 06 | pré-existente |

## Fora da cobertura

- Os cartões de 10 % no bloco B-3 — C-VIR, como o charter a define, não tem peças; o selo e o preço nas páginas de peça estão fora do escopo do charter
- O relógio do sistema operacional — o browser só emulou o fuso
- Orçamento: a sessão passou do teto (~79 de 70) para devolver "Dia das Mães" ligada, como o briefing exige; nada do charter ficou sem conferir

## Debrief

- **Surpresas:** religar "Dia das Mães" depois do fim de C-VIR foi recusado — a campanha encerrada ainda "ocupa" a vigência enquanto estiver ligada; precisei desligar C-VIR. O próximo charter que criar campanha curta para virada deve prever esse passo
- **Próximo charter:** nada
- **Padrão novo:** lançar a sessão anônima com `TZ=<fuso>` no ambiente do agent-browser emula o fuso do aparelho por sessão (conferido com `Intl…timeZone`) — serve ao tour Locale
