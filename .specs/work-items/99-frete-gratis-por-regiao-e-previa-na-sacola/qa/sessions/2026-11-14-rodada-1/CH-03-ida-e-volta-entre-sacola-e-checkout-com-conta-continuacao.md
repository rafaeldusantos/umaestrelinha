# Sessão CH-03 (continuação) · Ida e volta entre a sacola e o checkout, com conta, retirada e fonte grande

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-03-ida-e-volta-entre-sacola-e-checkout-com-conta.md` · exploratório · P1 |
| Status      | done (orçamento esgotado depois do foco 1; focos 2 a 5 não alcançados) |
| Persona     | PER-04 Teresa · conta: `cliente-com-endereco` — `QA_CLIENTE_COM_ENDERECO_USUARIO` |
| Tour · modo | Back-Button · por cenário (J-05) |
| Rodada      | exploração |
| Orçamento   | 50 ações de browser de 50 |
| Ambiente    | http://localhost:8082 · build não exposto · Chromium headless (`playwright-cli -s=CH-03c`, 0.1.24) · viewport 390 × 844 com a fonte da raiz a 200 % (init script a cada carregamento) |
| Paridade    | cotação interceptada com a fixture A (com CORS); `https://*.supabase.co/**` e `**/g/collect*` abortados (imagens hospedadas quebradas, previsto); código de login lido da caixa do Mailpit local (pela API da caixa, não pela tela, para poupar ações) |

Continuação da sessão `sessions/CH-03-ida-e-volta-entre-sacola-e-checkout-com-conta.md`. Foco desta sessão, na ordem
do briefing: (1) reproduzir A-1 e localizar em que passo a rua troca; (2) TC-FUNC-008 passo 1; (3) TC-FUNC-009;
(4) ramo J-05a do TC-JOURNEY-003; (5) o resto de Fora da cobertura. Só o foco 1 coube.

## Missão

Como Teresa, com a fonte a 200 % e indo e voltando entre a sacola e o checkout, descobrir se o CEP que ela calculou,
a forma de envio que escolheu (entrega ou retirada) e o endereço salvo dela sobrevivem a cada voltar, recarregar e
mudança de quantidade — sem nada cortado na tela.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Abrir a Home deslogada, tocar "Entrar", e-mail da conta, "Enviar código", código de 6 dígitos, "Verificar código" | Entrou: `/conta` com "Olá…" | — |
| 02 | Abrir "Pingente Afetivo Barquinho com Cabelo" (R$ 209,90) | Com o aviso de cookies aberto, a árvore de acessibilidade não mostra o conteúdo da página (o `main` aparece vazio); depois de "Aceitar", a página aparece inteira, com "Frete grátis acima de R$ 450,00 · para Sul e Sudeste" | — |
| 03 | Pôr a peça na sacola pelo "Adicionar à sacola" da barra fixa | O toque não pegou ("element is outside of the viewport" a 390 × 844 com a fonte a 200 %); duas tentativas gastas. A peça entrou acionando o botão direto (ver Fora da cobertura) | — |
| 04 | Ler a gaveta | "Faltam R$ 240,10 para o frete grátis", campo "CEP para calcular o frete e o prazo", "Subtotal (1 item)", "Finalizar Pedido" | — |
| 05 | Calcular com 90010-000 | "Frete para 90010-000 · Porto Alegre/RS", "Trocar CEP"; PAC R$ 21,40 marcado, SEDEX R$ 38,90; grupo "Retirar em" com o escritório (Rua Jandyr Maya Faillace, Jardim Leopoldina, Porto Alegre/RS · Grátis), não marcado | — |
| 06 | Escolher a retirada e "Finalizar Pedido" | `/checkout`: Entrega com **"Rua dos Andradas, 1234, apto 501"**, CEP 90010-000, a retirada marcada; "Resumo · 1 item R$ 195,21" | — (snapshot) |
| 07 | Voltar pelo navegador e abrir a sacola pelo cabeçalho | Página do produto; a gaveta mostra "Frete: Retirada no escritório, grátis, para o CEP 90010-000. Ver as opções" — escolha e CEP mantidos | — |
| 08 | "Ver as opções", escolher o PAC ("Frete: PAC, R$ 21,40, para o CEP 90010-000"), "Finalizar Pedido" — **sem recarregar** | `/checkout`: PAC marcado, "Resumo · 1 item R$ 216,61", e a Entrega já mostra **"Rua Siqueira Campos, 1234, apto 501 · Centro Histórico · Porto Alegre/RS · CEP 90010-000"** (A-1) | `screenshots/CH-03c-08-checkout-pac-sem-recarregar.png` |
| 09 | Sair da conta | Não feito — orçamento esgotado; o browser foi fechado (perfil só em memória, nada em disco) | — |

**Edge cases tentados:**

- Voltar do checkout pelo navegador com a retirada vinda da gaveta (passo 07): escolha e CEP mantidos.
- Segunda ida ao checkout depois de trocar a escolha na gaveta, sem recarregar (passo 08): a rua troca já aqui.

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-008 | fail | 06, 08 | `screenshots/CH-03c-08-checkout-pac-sem-recarregar.png` | A-1, reproduzido. Exercido só o passo 2 (CEP igual ao salvo): entra inteiro na primeira ida, a rua troca na segunda. Passo 1 (01310-100) não feito — orçamento |
| TC-JOURNEY-003 | fail | 01–08 | `screenshots/CH-03c-08-checkout-pac-sem-recarregar.png` | Passo 3 ("o checkout com o PAC; o endereço salvo inteiro") falha: A-1. Passo 4 (recarregar) não refeito; ramo J-05a e teclado não feitos — orçamento |

Contagem: pass 0 · fail 2 · blocked 0 · skip 0

## Achados

### A-1 · [Checkout · Entrega] Na segunda ida da sacola ao checkout (retirada → PAC), a rua do endereço salvo vira "Rua Siqueira Campos" — Teresa receberia na rua errada

Mesmo achado A-1 da primeira sessão, agora reproduzido e localizado: a troca acontece **na segunda ida ao checkout**,
antes de qualquer recarregar.

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-04 Teresa                                                         |
| Jornada e passo     | J-05, passo 3 (seguir ao checkout, voltar, escolher o PAC, seguir de novo) · passos 06–08 do log |
| TC                  | TC-FUNC-008, TC-JOURNEY-003                                           |
| Gravidade proposta  | critical — o endereço de entrega dela passa a ter uma rua que não é a dela (número e complemento mantidos), num bloco que abre recolhido: ela não percebe e o pedido sairia para o endereço errado |
| Reproduziu          | sim (2 de 2 — primeira sessão e esta)                                  |
| Viewport            | 390 × 844, fonte da raiz a 200 %                                      |

**Passos para reproduzir** — de um estado limpo:

1. Conta `cliente-com-endereco` (endereço salvo: Rua dos Andradas, 1234, apto 501, Centro Histórico, Porto Alegre/RS, 90010-000), sacola vazia, cotação interceptada com a fixture A; logada, abrir `/produtos/pingente-afetivo-barquinho-com-cabelo`
2. "Adicionar à sacola"; na gaveta, CEP 90010-000 → "Calcular"; escolher a retirada no escritório; "Finalizar Pedido" → o checkout mostra "Rua dos Andradas, 1234, apto 501"
3. Voltar pelo navegador; abrir a sacola; tocar "Frete: Retirada no escritório… Ver as opções"; escolher o PAC; "Finalizar Pedido"
4. Sem recarregar: o bloco Entrega mostra "Rua Siqueira Campos, 1234, apto 501 · Centro Histórico · Porto Alegre/RS · CEP 90010-000"

**Esperado:** com o CEP da gaveta igual ao do endereço salvo, o endereço salvo entra inteiro (rua, número, complemento) e o bloco abre recolhido, com a opção da gaveta — **fonte:** TC-FUNC-008 passo 2; `spec.md` D-11 (1); PRD 97 CA-09; TC-JOURNEY-003 passo 3 ("o checkout com o PAC; o endereço salvo inteiro").

**Observado:** primeira ida (passo 06): "Rua dos Andradas, 1234, apto 501". Segunda ida (passo 08), sem recarregar: "Rua Siqueira Campos, 1234, apto 501 · Centro Histórico · Porto Alegre/RS · CEP 90010-000", PAC marcado, Resumo R$ 216,61. A rua parece vir da busca do CEP, com o número e o complemento do salvo. Na primeira sessão, o recarregar manteve a rua trocada. Não isolei se o gatilho é a segunda ida em si ou a troca retirada → PAC.

**Evidência:**

- `screenshots/CH-03c-08-checkout-pac-sem-recarregar.png` — segunda ida, antes de recarregar: Rua Siqueira Campos, 1234, apto 501
- primeira ida (passo 06) registrada pelo snapshot: "Rua dos Andradas, 1234, apto 501", retirada marcada (sem screenshot — orçamento); na primeira sessão, `screenshots/CH-03-06-checkout-retirada.png`
- console: só os `net::ERR_FAILED` das imagens do host hospedado bloqueado (previsto)
- rede: nada coletado

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| Com o aviso de cookies aberto, o conteúdo da página do produto some da árvore de acessibilidade (o `main` vem vazio) até "Aceitar" — quem navega pelo nome acessível não alcança a página enquanto o aviso estiver aberto | 02 | pré-existente |

## Fora da cobertura

- TC-FUNC-008 passo 1 (01310-100, "Trazido da sua sacola", foco no Número) — orçamento.
- TC-FUNC-009 inteiro (fixture B, quantidade, faixa cruzada, resposta sem SEDEX) — orçamento.
- Ramo J-05a do TC-JOURNEY-003 e a variação teclado em 1440 × 900 — orçamento.
- Isolar o gatilho de A-1 (segunda ida sem trocar a opção × troca retirada → PAC × PAC → retirada) — orçamento.
- Recarregar depois do passo 08 — não refeito (a primeira sessão já mostrou a rua trocada depois de recarregar).
- O resto da lista da primeira sessão: voltar → avançar → voltar; `/checkout` em aba nova sem rascunho; remover a peça e pôr outra; sair com o checkout aberto em outra aba; variações do TC-FUNC-011; Resumo expandido — orçamento.
- "Adicionar à sacola" da barra fixa a 390 × 844 com a fonte a 200 %: o clique do driver falhou com "element is outside of the viewport" (duas vezes) e a peça entrou acionando o botão direto. Não confirmei pela screenshot se a barra fica de fato fora da tela para a persona — não investigado; o atrito conhecido é o botão principal abaixo da dobra.
- Sair da conta — orçamento; browser fechado com perfil só em memória.
- Resposta lenta da cotação ("calculando") — o `route` não atrasa; previsto no ambiente.

## Debrief

- **Surpresas:** a rua troca já na segunda ida ao checkout, não no recarregar; o aviso de cookies esconde a página inteira da árvore de acessibilidade; cerca de 15 ações foram gastas no login, no aviso de cookies e no botão da barra fixa antes de chegar à gaveta.
- **Próximo charter:** retomar o CH-03 numa terceira sessão já partindo da gaveta, com "Aceitar" os cookies no primeiro passo: TC-FUNC-008 passo 1, TC-FUNC-009 (fixture B), J-05a e teclado em 1440; para A-1, duas variações curtas (segunda ida sem trocar a opção; PAC → retirada) para isolar o gatilho.
- **Padrão novo:** segunda ida ao checkout depois de mudar a escolha na gaveta, com CEP igual ao salvo — candidato a passo fixo do tour Back-Button em checkout com endereço salvo.
