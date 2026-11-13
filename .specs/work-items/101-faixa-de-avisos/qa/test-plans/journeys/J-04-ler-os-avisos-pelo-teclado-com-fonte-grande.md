# J-04 · Ler os avisos pelo teclado, com fonte grande e movimento reduzido

**Valor:** a Marta lê a campanha no próprio ritmo e abre o aviso, sem mouse e sem nada correndo na tela.
**Persona:** PER-03 Marta (principal) · —
**Prioridade:** P1
**Critérios de origem:** RN-04, RN-05, RN-07, CA-02, CA-06, CA-07
**Charters:** CH-07 · **TC:** TC-CFR-001, TC-CFR-002, TC-CFR-003, TC-CFR-004

## Entrada

| Origem | URL / caminho | Estado de partida |
| --- | --- | --- |
| direta | `/` (Home) | sem sessão; movimento reduzido; fonte a 200 % |

## Passos

| # | A persona… | Deve ver | Em até | Fricção prevista | TC |
| -- | --- | --- | --- | --- | --- |
| 1 | abre a Home em rede lenta | nada pula enquanto carrega | 6 s | a faixa empurra a página | TC-CFR-001 |
| 2 | aperta Tab desde o topo | o foco entra na faixa antes do cabeçalho, visível sobre o ouro | 5 s | foco invisível (fricção 3) | TC-CFR-002 |
| 3 | percorre as setas e o aviso | nomes "Aviso anterior", "Próximo aviso"; região "Avisos da loja" | 10 s | — | TC-CFR-002 |
| 4 | escuta/lê sem que a faixa anuncie sozinha | nenhum anúncio a cada troca | 10 s | — | TC-CFR-002 |
| 5 | espera com movimento reduzido | a faixa não gira; as setas trocam | 20 s | continua girando (fricção 1) | TC-CFR-003 |
| 6 | no celular, com a fonte a 200 % | o link inteiro, sem rolagem lateral | 5 s | link cortado (fricção 2) | TC-CFR-004 |
| 7 | aciona o link com Enter | abre o destino | 3 s | — | TC-CFR-002 |

**Tempo total esperado:** ~60 s — presa à tarefa.

## Objetivo

- **Observável:** a Marta na página do aviso que escolheu, tendo lido os avisos sem que corressem
- **Efeitos colaterais:** —

## Saída

- **Natural:** segue pelo teclado na página de destino

## Desvios e abandono

| Ramo | No passo | Quando | A persona… | Deve acontecer | TC |
| --- | --- | --- | --- | --- | --- |
| J-04a | 6 | o aviso mais longo não cabe em duas linhas a 200 % | não acha o link | a faixa cresce além de duas linhas (Q-01, respondida: a altura fixa vale só na fonte padrão) e o link fica inteiro e alcançável, sem texto cortado ou sobreposto | TC-CFR-004 |

## Fronteiras

nenhuma

## Modos de falha

- A faixa gira com o movimento reduzido ligado — a Marta não consegue ler nada.
- O foco entra na faixa e não se vê onde está.
