# J-02 · Preparar a próxima campanha marcando várias peças de uma vez

**Valor:** a dona deixa o Natal pronto antes do dia, marcando uma coleção inteira de uma vez, sem a loja mostrar
nada antes da hora.
**Persona:** PER-01 Adri (principal) · —
**Prioridade:** P1
**Critérios de origem:** CA-02, CA-08, CA-14, CA-15 (painel), R-01
**Charters:** CH-02 · **TC:** TC-FUNC-002, TC-FUNC-010, TC-FUNC-021, TC-UI-004

## Entrada

| Origem            | URL / caminho          | Estado de partida                                    |
| ----------------- | ---------------------- | ---------------------------------------------------- |
| navegação interna | `/admin/campanhas`     | logada como `admin-loja`; a Black Friday em vigência |

## Passos

| # | A persona… | Deve ver | Em até | Fricção prevista | TC |
| - | ---------- | -------- | ------ | ---------------- | -- |
| 1 | cria "Natal", 01/12/2026 00:00 a 24/12/2026 23:59, percentuais 10 e 15, ligada | a lista com "Natal · Agendada" | 60 s | — | TC-FUNC-002 |
| 2 | em `/admin/produtos`, seleciona as peças de M-G e abre a edição em massa | a seção de campanha: primeiro a campanha, depois o percentual | 15 s | campanha e percentual em dois passos | TC-FUNC-021 |
| 3 | aplica "Natal: 15 %" | as linhas com o percentual; a confirmação do lote | 10 s | — | TC-FUNC-021 |
| 4 | filtra a lista pela campanha Natal e por 15 % | só as peças de M-G | 10 s | — | TC-FUNC-021 |
| 5 | abre "Natal" e tenta tirar o 15 % | a recusa com a contagem e o link "Ver as peças com 15%" | 10 s | — | TC-FUNC-010 |

**Tempo total esperado:** ~3 min.

## Objetivo

- **Observável:** a lista de produtos filtrada por "Natal · 15 %" mostra M-G; a campanha Natal segue "Agendada" e
  a loja não mostra nada dela.
- **Efeitos colaterais:** a contagem de peças da campanha Natal sobe.

## Saída

- **Natural:** a dona volta à lista de campanhas.

## Desvios e abandono

| Ramo  | No passo | Quando | A persona… | Deve acontecer | TC |
| ----- | -------- | ------ | ---------- | -------------- | -- |
| J-02a | 1 | põe o Natal começando em 25/11, cruzando a Black Friday | lê a recusa e corrige a data | "A vigência cruza a da campanha “Black Friday” (…)"; nada gravado | TC-FUNC-002 |
| J-02b | 5 | a recusa de tirar 15 % aparece | segue "Ver as peças com 15%" | a lista de produtos já filtrada pela campanha e pelo percentual | TC-FUNC-010 |

## Fronteiras

nenhuma.

## Modos de falha

- A edição em massa aplica na Black Friday (em vigência) em vez de no Natal, e as peças aparecem em oferta na loja
- O filtro da lista ignora a campanha e mostra o catálogo inteiro
