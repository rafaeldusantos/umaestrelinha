# Sessão CH-03 · Ida e volta entre a sacola e o checkout, com conta, retirada e fonte grande

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-03-ida-e-volta-entre-sacola-e-checkout-com-conta.md` · exploratório · P1 |
| Status      | done (orçamento esgotado antes de TC-FUNC-009, do ramo J-05a e do teclado) |
| Persona     | PER-04 Teresa · conta: `cliente-com-endereco` — `QA_CLIENTE_COM_ENDERECO_USUARIO` |
| Tour · modo | Back-Button · por cenário (J-05) |
| Rodada      | exploração |
| Orçamento   | 61 ações de browser de 50 (estourou: contei mal as leituras de snapshot, espera e screenshot durante a sessão; encerrei assim que percebi) |
| Ambiente    | http://localhost:8082 · build não exposto · Chromium headless (`playwright-cli -s=CH-03`, 0.1.24) · viewport 390 × 844 com a fonte da raiz a 200 % (reaplicada a cada carregamento por um init script) |
| Paridade    | cotação interceptada com a fixture A (com CORS); `https://*.supabase.co/**` e `**/g/collect*` abortados (imagens hospedadas quebradas, previsto); login por código lido no Mailpit local |

## Missão

Como Teresa, com a fonte a 200 % e indo e voltando entre a sacola e o checkout, descobrir se o CEP que ela calculou,
a forma de envio que escolheu (entrega ou retirada) e o endereço salvo dela sobrevivem a cada voltar, recarregar e
mudança de quantidade — sem nada cortado na tela.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Ler a barra de confiança da Home, deslogada | "Envio garantido · grátis acima de R$ 450 · para Sul e Sudeste"; a faixa do topo também diz "Frete grátis · acima de R$ 450,00 para Sul e Sudeste" | `screenshots/CH-03-01-barra-confianca.png` |
| 02 | Tocar "Entrar" (aviso de login da loja) | Diálogo "Acesso à conta": "Entrar ou criar conta · Para acompanhar seus pedidos e favoritos", Google, e-mail, "Enviar código". O diálogo **não** anuncia frete grátis (nem com nem sem região) | `screenshots/CH-03-02-aviso-login.png` |
| 03 | Entrar com o e-mail da conta e o código de 6 dígitos do Mailpit | Entrou: `/conta`, "Olá, Helena" | — |
| 04 | Abrir "Pingente Afetivo Barquinho com Cabelo" (R$ 209,90) e calcular o frete na página com 01310-100 | Linha "Frete grátis acima de R$ 450,00 · para Sul e Sudeste"; PAC R$ 21,40 e SEDEX R$ 38,90, nenhuma "Grátis" nem riscada | `screenshots/CH-03-03-produto-frete.png` |
| 05 | Pôr a peça na sacola | Gaveta abre: "Faltam R$ 240,10 para o frete grátis", "R$ 209,90 / R$ 450,00", campo de CEP, Subtotal e Total R$ 209,90 | — |
| 06 | Calcular na gaveta com 90010-000 | "Frete para 90010-000 · Porto Alegre/RS", "Trocar CEP"; grupo "Envio a domicílio" (PAC marcado, SEDEX) e grupo "Retirar em" (Escritório - Uma Estrelinha - Rua Jandyr Maya Faillace, Jardim Leopoldina, Porto Alegre/RS · Grátis), retirada **não** marcada; "Frete · PAC R$ 21,40", Total R$ 231,30 | `screenshots/CH-03-04-gaveta-90010.png` |
| 07 | Escolher a retirada | A lista recolhe num botão "Frete: Retirada no escritório, grátis, para o CEP 90010-000. Ver as opções"; resumo "Retirada no escritório · Grátis"; Total R$ 209,90 | `screenshots/CH-03-05-retirada-escolhida.png` |
| 08 | "Finalizar Pedido" | `/checkout`: bloco Entrega recolhido com "Rua dos Andradas, 1234, apto 501 · Centro Histórico · Porto Alegre/RS · CEP 90010-000", a retirada marcada; botão do Resumo "1 item R$ 195,21" (com o Pix, sem frete) | `screenshots/CH-03-06-checkout-retirada.png` |
| 09 | Voltar pelo navegador | Volta à página do produto, gaveta fechada; reabrindo a sacola: "Frete: Retirada no escritório, grátis, para o CEP 90010-000", Total R$ 209,90 — a escolha e o CEP sobreviveram | — |
| 10 | Abrir as opções, escolher o PAC, "Finalizar Pedido" | `/checkout`: CEP 90010-000, PAC marcado, Resumo "1 item R$ 216,61" | `screenshots/CH-03-07-checkout-pac.png` |
| 11 | Recarregar o checkout | CEP 90010-000 e PAC continuam, Resumo R$ 216,61, fonte a 200 % — mas a rua do endereço agora é **"Rua Siqueira Campos, 1234, apto 501 · Centro Histórico · Porto Alegre/RS"** (A-1) | `screenshots/CH-03-08-checkout-recarregado.png` |
| 12 | Sair da conta | Não achei "Sair" em `/conta` nem no "Abrir menu" a 390 px; parei aí por orçamento e fechei o browser (perfil só em memória, nada em disco) | — |

**Edge cases tentados:**

- Voltar do checkout pelo navegador com a escolha vinda da gaveta (passo 09): estado mantido.
- Recarregar o checkout com a escolha vinda da gaveta (passo 11): CEP e opção mantidos; a rua mudou (A-1).

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-020 | pass | 01, 02, 04 | `screenshots/CH-03-01-barra-confianca.png` · `CH-03-02-aviso-login.png` · `CH-03-03-produto-frete.png` | A região aparece na barra e na página do produto; o aviso de login não anuncia frete grátis, então não há promessa sem região. A peça é de R$ 209,90 — o "mesmo se passar de R$ 450" não foi exercido |
| TC-FUNC-011 | pass | 06, 07, 08 | `screenshots/CH-03-04-gaveta-90010.png` · `CH-03-05-retirada-escolhida.png` · `CH-03-06-checkout-retirada.png` | Retirada marcada no bloco Entrega; o Resumo ficou recolhido (não abri), mas o total R$ 195,21 é a peça com Pix sem frete. Variações (CEP fora do RS, trocar CEP com a retirada) não feitas |
| TC-FUNC-008 | fail | 08, 11 | `screenshots/CH-03-06-checkout-retirada.png` · `CH-03-08-checkout-recarregado.png` | A-1. Passo 2 (CEP igual ao salvo) entrou inteiro na primeira ida; depois da volta + PAC + recarregar, a rua deixou de ser a salva. Passo 1 (01310-100) não feito — orçamento |
| TC-FUNC-009 | skip | — | — | Orçamento esgotado antes da troca para a fixture B |
| TC-JOURNEY-003 | fail | 01–11 | `screenshots/CH-03-07-checkout-pac.png` · `CH-03-08-checkout-recarregado.png` | Passos 1 a 4 concluídos (CEP e PAC sobrevivem ao recarregar), mas o objetivo "o checkout com o endereço salvo" falha: A-1. Variação teclado (1440) não feita |

Contagem: pass 2 · fail 2 · blocked 0 · skip 1

## Achados

### A-1 · [Checkout · Entrega] Depois de voltar à sacola, trocar retirada por PAC e recarregar, a rua do endereço salvo vira "Rua Siqueira Campos" — Teresa receberia na rua errada

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-04 Teresa                                                         |
| Jornada e passo     | J-05, passos 5–6 (seguir ao checkout, voltar, recarregar) · passos 08–11 do log |
| TC                  | TC-FUNC-008, TC-JOURNEY-003                                           |
| Gravidade proposta  | critical — o endereço salvo dela é corrompido sem pedido (rua trocada, número e complemento mantidos), num bloco que abre recolhido: ela não percebe e o pedido sairia para um endereço que não existe |
| Reproduziu          | intermitente (visto 1 vez; a segunda tentativa não coube no orçamento) |
| Viewport            | 390 × 844, fonte da raiz a 200 %                                      |

**Passos para reproduzir** — de um estado limpo:

1. Conta `cliente-com-endereco` (endereço salvo: Rua dos Andradas, 1234, apto 501, Centro Histórico, Porto Alegre/RS, 90010-000), sacola vazia, cotação interceptada com a fixture A; logada, abrir `/produtos/pingente-afetivo-barquinho-com-cabelo`
2. "Adicionar à sacola"; na gaveta, CEP 90010-000 → "Calcular"; escolher a retirada no escritório; "Finalizar Pedido" → o checkout mostra "Rua dos Andradas, 1234, apto 501"
3. Voltar pelo navegador; abrir a sacola; tocar "Frete: Retirada no escritório… Ver as opções"; escolher o PAC; "Finalizar Pedido"
4. Recarregar o checkout → o bloco Entrega mostra "Rua Siqueira Campos, 1234, apto 501 · Centro Histórico · Porto Alegre/RS · CEP 90010-000"

**Esperado:** com o CEP da gaveta igual ao do endereço salvo, o endereço salvo entra inteiro (rua, número, complemento) e o bloco abre recolhido; recarregar mantém o CEP e a escolha — **fonte:** TC-FUNC-008 passo 2 e variação "Recarregar"; `spec.md` D-11 (1); PRD 97 CA-09; TC-JOURNEY-003 passo 3 ("o endereço salvo inteiro").

**Observado:** no passo 08 do log a rua era "Rua dos Andradas"; no passo 11 (depois de voltar, trocar para PAC, seguir e recarregar) o bloco recolhido mostra "Rua Siqueira Campos, 1234, apto 501" — a rua parece vir da busca do CEP, com o número e o complemento do endereço salvo. Não sei se a troca aconteceu já no passo 10 (antes de recarregar) ou só no recarregar: a screenshot `CH-03-07-checkout-pac.png` mostra a tela do passo 10.

**Evidência:**

- `screenshots/CH-03-06-checkout-retirada.png` — primeira ida: Rua dos Andradas, retirada marcada
- `screenshots/CH-03-07-checkout-pac.png` — segunda ida, com o PAC (antes de recarregar)
- `screenshots/CH-03-08-checkout-recarregado.png` — depois de recarregar: Rua Siqueira Campos, 1234, apto 501
- console: nada além das imagens do host hospedado bloqueado (`net::ERR_FAILED` em `*.supabase.co/storage/...`, previsto)
- rede: nada coletado

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| Na gaveta, o botão de diminuir a quantidade se chama "Remover Pingente Afetivo Barquinho com Cabelo" e o de tirar da sacola, "Remover Pingente Afetivo Barquinho com Cabelo da sacola" — dois nomes quase iguais para quem navega pelo nome acessível | 05 | pré-existente |

## Fora da cobertura

- TC-FUNC-009 inteiro (fixture B, mudar a quantidade, cruzar a faixa, resposta sem SEDEX) — orçamento esgotado.
- Ramo J-05a / TC-FUNC-008 passo 1 (01310-100, "Trazido da sua sacola", foco no Número) — orçamento.
- Segunda reprodução de A-1 e o ponto exato em que a rua muda (passo 10 ou 11) — orçamento.
- Variação teclado em 1440 × 900 (Tab, Enter, setas, Espaço) — orçamento.
- Voltar → avançar → voltar; `/checkout` numa aba nova sem rascunho; remover a peça e pôr outra; sair da conta com o checkout aberto em outra aba — orçamento.
- O Resumo expandido do checkout ("Retirada no escritório" como linha) — não abri; conferido só pelo total.
- Variações do TC-FUNC-011 (CEP fora do RS, trocar CEP com a retirada escolhida) — orçamento.
- Sair da conta: não achei o "Sair" em `/conta` nem no menu a 390 px dentro do orçamento; o browser foi fechado (perfil só em memória). Não é achado — não investiguei.
- Resposta lenta da cotação ("calculando") — o `route` não atrasa; previsto no ambiente.

## Debrief

- **Surpresas:** a rua do endereço salvo trocada depois da ida e volta (A-1); o aviso de login da loja não fala de frete grátis nenhum.
- **Próximo charter:** retomar o CH-03 numa sessão nova começando por A-1 (reproduzir e localizar se a troca vem do voltar + PAC ou do recarregar), depois TC-FUNC-009 com a fixture B, o ramo J-05a e o teclado em 1440.
- **Padrão novo:** recarregar o checkout depois de uma segunda ida pela gaveta com o CEP igual ao salvo — candidato a passo fixo do tour Back-Button em checkout com endereço salvo.
