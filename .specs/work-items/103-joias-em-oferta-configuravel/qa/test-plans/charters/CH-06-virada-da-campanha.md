# CH-06 · A virada: o bloco preparado entra sozinho no início e sai no fim

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P0                                                                            |
| Persona      | PER-01 Adri                                                                   |
| Tour         | Locale (fuso do aparelho diferente do da loja)                                |
| Modo         | por cenário (J-03, passo 7, e o ramo J-03c)                                   |
| Time-box     | 90 min · orçamento: 70 ações (a espera da virada não gasta ação)              |
| Mudança      | a loja mostra o bloco só quando a campanha dele é a que o banco entrega como vigente — nunca pelo relógio do aparelho; a linha diz o estado de cada bloco; o seletor mostra a campanha atual mesmo desligada ou encerrada, com o estado — CA-02.1, CA-02.2, CA-02.3, RNF-03 |
| Viewport     | 1440 × 900 (painel); a loja em 390 × 844                                      |
| Massa        | **desliga** C-VIG e **religa** no fim; **cria** C-VIR ("QA103 Virada"); **altera** B-3 (C-VIR, título "Virada QA"); só lê B-1 |
| Driver       | `—` (emulação de fuso; sem ela, a variação de fuso fica `skip`)               |
| Entrada      | `/admin/campanhas` no painel (`:8083`) · logada como `admin-loja`; outra aba da loja (`:8082`) **sem** login |
| Jornadas     | J-03                                                                          |
| TC           | TC-JOURNEY-003, TC-FUNC-021 — 2 TC em 70 ações                                |

## Missão

Provar que o bloco preparado para uma campanha que ainda não começou entra na Home no minuto do início e sai no
minuto do fim, sem a dona tocar no painel, pelo relógio do banco e não pelo do aparelho — e que o painel diz, em
cada momento, por que cada bloco aparece ou não.

## Deve tentar

1. **Desligar "Dia das Mães"** em `/admin/campanhas` (só se pode ligar uma campanha por vigência, e "QA103 Virada"
   precisa caber). Na loja: B-1 some. No painel: a linha de B-1 diz desligada e que não vai aparecer; no editor de
   B-1, "Dia das Mães" aparece como a escolhida, com o estado "Desligada"; não salvar
2. **Criar C-VIR** "QA103 Virada": ligada, 10 %, começo T0 = o próximo minuto cheio + 8 min, fim T0 + 10 min
   (anote T0 e o fim, horário de Brasília). No editor de B-3 (sem campanha, do CH-04 — se não existir, acrescente
   pela bandeja): escolher "QA103 Virada", título "Virada QA", salvar, ligar B-3. Linha: agendada, não vai aparecer
3. **Antes de T0**, na loja: sem bloco de ofertas. Emular na aba da loja um fuso adiantado (ex.: `Asia/Tokyo`) e
   recarregar: continua sem bloco
4. **Em T0 + 1 min**, recarregar a loja (com o fuso emulado e sem): B-3 aparece com "Virada QA" e 10 %. Linha de
   B-3: em vigência
5. **Em T0 + 11 min**, recarregar: B-3 some. Linha de B-3: encerrada, não vai aparecer; no editor de B-3, "QA103
   Virada" como escolhida, com o estado "Encerrada", e fora das opções para escolher de novo
6. **Religar "Dia das Mães"** e conferir na loja que B-1 voltou, como o CH-01 o deixou. Tirar a emulação de fuso

## Edge cases sugeridos

- Fuso atrasado (ex.: `America/Manaus`) no passo 4
- Deixar a Home da loja aberta desde antes de T0 e só olhar depois (sem recarregar) — anotar o que vê, sem julgar
  (ver 🟡 do plano)
- Recarregar o painel durante a virada (a linha acompanha?)
- Religar "Dia das Mães" antes de "QA103 Virada" acabar (o cadastro deve recusar — anote o que diz, sem achado: é
  da 102)

## Fora do escopo

- o cadastro de campanhas como comportamento (recusas, datas): é da WI 102
- o selo e o preço da "QA103 Virada" nas páginas de peça (ela não tem peças)
- B-2 ("Natal") e as peças de B-1
- o relógio do sistema operacional (o browser só emula fuso)
