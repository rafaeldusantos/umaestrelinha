# J-02 · Descobrir a campanha pelo celular, vindo do anúncio, e chegar às ofertas

**Valor:** quem cai direto num produto sabe que há Black Friday e chega às ofertas em um toque.
**Persona:** PER-02 Bia (principal) · —
**Prioridade:** P0
**Critérios de origem:** CA-01, RN-01, UC-01, CA-02, CA-04, RN-07, CA-07
**Charters:** CH-02 · **TC:** TC-JOURNEY-001, TC-FUNC-011, TC-FUNC-012, TC-FUNC-013, TC-FUNC-014, TC-UI-001

## Entrada

| Origem | URL / caminho | Estado de partida |
| --- | --- | --- |
| deep link (anúncio) | `/produtos/<slug de um produto de C2>` | sem sessão, sacola vazia |

## Passos

| # | A persona… | Deve ver | Em até | Fricção prevista | TC |
| -- | --- | --- | --- | --- | --- |
| 1 | abre o link | a faixa ouro acima do cabeçalho, aviso em até duas linhas, sem rolagem lateral | 4 s | a faixa chega e empurra a página (fricção 2) | TC-JOURNEY-001, TC-UI-001 |
| 2 | lê os avisos | troca a cada ~6 s; segurando o dedo, para | 20 s | troca no meio da leitura (fricção 1) | TC-FUNC-012 |
| 3 | toca no aviso | o aviso inteiro é o link; o sem destino é só texto | 3 s | toca na palavra "errada" (fricção 3) | TC-FUNC-013 |
| 4 | rola a categoria | a faixa sobe com a página; o cabeçalho só recolhe depois | — | — | TC-FUNC-014, TC-FUNC-011 |

**Tempo total esperado:** ~30 s — no limite da paciência da persona (30 s).

## Objetivo

- **Observável:** a Bia na categoria da campanha (C1), tendo partido do produto
- **Efeitos colaterais:** —

## Saída

- **Natural:** navega pelas peças da categoria

## Desvios e abandono

| Ramo | No passo | Quando | A persona… | Deve acontecer | TC |
| --- | --- | --- | --- | --- | --- |
| J-02a | 1 | a rede está lenta e a página demora | já começa a rolar | nada se desloca quando a faixa chega | TC-CFR-001 |
| J-02b | 4 | ignora a faixa e vai pagar | põe na sacola e abre o checkout | o checkout e o pedido montado sem faixa | TC-FUNC-011 |

## Fronteiras

nenhuma

## Modos de falha

- A faixa não aparece fora da Home — a campanha não chega a quem vem do anúncio.
- A página rola para o lado no celular por causa da faixa.
