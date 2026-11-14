# J-03 · Escolher e levar uma joia ao checkout pelo celular, com a loja de Black Friday

**Valor:** a cliente compra no perfil de campanha lendo tudo — preço, desconto, frete — como leria no Padrão.
**Persona:** PER-02 Bia (principal) · PER-05 Marta (secundária, no CFR)
**Prioridade:** P0
**Critérios de origem:** RN-01, RN-03, RN-04, RN-06, RN-08, CA-02, CA-04
**Charters:** CH-04 (caminho feliz) · CH-03 (J-03a) · CH-08 (CFR) · **TC:** TC-JOURNEY-002, TC-PERSONA-001,
TC-FUNC-009, TC-FUNC-010, TC-FUNC-011, TC-FUNC-007, TC-FUNC-008, TC-CFR-001, TC-CFR-002

## Entrada

| Origem  | URL / caminho              | Estado de partida                                                          |
| ------- | -------------------------- | -------------------------------------------------------------------------- |
| direta  | `http://localhost:8082/`   | perfil salvo = Black Friday; sacola vazia; sem login (entra na conta no passo 7); a conta `cliente-qa` já tem o pedido PIX pendente criado pela thread antes do L1 (manifesto da massa) |

## Passos

| # | A persona…                                         | Deve ver                                                                              | Em até | Fricção prevista                                 | TC              |
| - | -------------------------------------------------- | ------------------------------------------------------------------------------------- | ------ | ------------------------------------------------ | --------------- |
| 1 | abre a Home                                        | cabeçalho quase preto, ouro nos detalhes, os blocos de sempre; a marca no tom escuro  | 4 s    | primeira pintura em ardósia                      | TC-JOURNEY-002, TC-FUNC-011 |
| 2 | entra numa categoria pelo menu                     | os cartões, com o selo "-X%" em ouro e os outros selos como sempre                    | 4 s    | selo de oferta igual aos outros                  | TC-FUNC-009     |
| 3 | abre um produto em oferta                          | o selo "-X%" da galeria em ouro com texto escuro; preço e parcelas legíveis           | 4 s    | parcelas ilegíveis                               | TC-FUNC-009     |
| 4 | põe na sacola                                      | a sacola abre; a barra do frete grátis preenchida em ouro forte                       | 3 s    | barra invisível sobre o branco                   | TC-FUNC-010     |
| 5 | vai ao checkout                                    | os blocos do checkout legíveis; a marca do cabeçalho do checkout no tom escuro        | 4 s    | botão primário sem contraste                     | TC-JOURNEY-002, TC-FUNC-011 |
| 6 | para antes de pagar                                | —                                                                                     | —      | —                                                | —               |
| 7 | entra em `/conta` com o código do e-mail           | a conta legível no perfil                                                             | 30 s   | —                                                | TC-PERSONA-001  |
| 8 | abre a confirmação do pedido dela (`/pedido/:id` do manifesto) | a confirmação legível no perfil, sem tocar em "Pagar com PIX"             | 5 s    | —                                                | TC-PERSONA-001  |

**Tempo total esperado:** ~60 s de telas — Bia aceita 30 s por tela.

## Objetivo

- **Observável:** do passo 1 ao 5, toda tela pinta com o perfil Black Friday e nenhum texto fica abaixo do piso de
  legibilidade; a sacola mantém a peça; a conta e a confirmação do pedido já existente também legíveis
- **Efeitos colaterais:** nenhum — a sessão não paga nem cria pedido; só abre o pedido que a thread criou

## Saída

- **Natural:** Bia está no checkout com a peça, pronta para pagar (a sessão para ali), e confere a conta e o pedido dela

## Desvios e abandono

| Ramo  | No passo | Quando                                                                 | A persona…                                          | Deve acontecer                                                                     | TC                       |
| ----- | -------- | ---------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------ |
| J-03a | 1        | a aba da loja foi aberta antes da troca e o HTML veio com o perfil anterior | deixa a página parada, sai e volta à aba, depois troca de página | a página fica no perfil anterior enquanto está parada; ao trocar de página passa ao salvo e não volta | TC-FUNC-007, TC-FUNC-008 |
| J-03b | 1        | rede lenta na primeira visita                                          | espera a página                                     | a primeira pintura já é preto e ouro — nunca ardósia antes                         | TC-CFR-001               |

## Fronteiras

Nenhuma fora do monorepo. Depende da configuração `store_settings` e, na produção, do HTML servido pela função `api/page`
(simulado localmente por interceptação do documento — ver Ambiente da execução).

## Modos de falha

- Texto ilegível num passo do checkout (a cliente não consegue terminar)
- O desconto se confunde com os outros selos e a oferta passa despercebida
- A cor muda diante da cliente
