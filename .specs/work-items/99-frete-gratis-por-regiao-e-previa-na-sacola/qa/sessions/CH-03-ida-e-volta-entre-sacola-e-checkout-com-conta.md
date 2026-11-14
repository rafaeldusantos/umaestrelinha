# Sessão CH-03 · Ida e volta entre a sacola e o checkout, com conta, retirada e fonte grande

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-03-ida-e-volta-entre-sacola-e-checkout-com-conta.md` · exploratório · P1 |
| Status      | done |
| Persona     | PER-04 Teresa · conta: `cliente-com-endereco` — `QA_CLIENTE_COM_ENDERECO_USUARIO` |
| Tour · modo | Back-Button · por cenário (J-05) — só os passos dos TC e o entorno da correção |
| Rodada      | confirmação (rodada 2, depois da fix task 12 — BUG-001) |
| Orçamento   | 25 ações de browser de 25 |
| Ambiente    | http://localhost:8092 (worktree store__feature-99) · build não exposto · Chromium headless (`playwright-cli -s=CH-03`, 0.1.24) · 390 × 844 com a fonte da raiz a 200 % (init script a cada carregamento) |
| Paridade    | cotação interceptada com a fixture A (com CORS); `https://*.supabase.co/**` e `**/g/collect*` abortados; código de login lido na caixa do Mailpit local pela API da caixa (não pela tela, para poupar ações); "Adicionar à sacola" acionado direto no elemento (o clique do driver dá "element is outside of the viewport" a 200 % — atrito conhecido) |

## Missão

Como Teresa, com a fonte a 200 % e indo e voltando entre a sacola e o checkout, descobrir se o CEP que ela calculou,
a forma de envio que escolheu (entrega ou retirada) e o endereço salvo dela sobrevivem a cada voltar, recarregar e
mudança de quantidade — sem nada cortado na tela.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01–06 | Entrar pela tela de acesso à conta com o e-mail e o código de 6 dígitos | "Olá, Helena" — logada como a conta da persona | — |
| 07–08 | Aceitar os cookies; abrir "Pingente Afetivo Barquinho com Cabelo" | Produto R$ 209,90; "Frete grátis acima de R$ 450,00 · para Sul e Sudeste" | — |
| 09–10 | "Adicionar à sacola" (o clique na barra falhou fora da tela; acionado direto) | Gaveta "Sua sacola": "Faltam R$ 240,10 para o frete grátis", campo de CEP | — |
| 11–12 | Calcular com 90010-000 | "Frete para 90010-000 · Porto Alegre/RS"; PAC R$ 21,40 marcado, SEDEX R$ 38,90; "Retirar em" com o escritório, Grátis | — |
| 13–14 | Escolher a retirada e "Finalizar Pedido" (1ª ida) | `/checkout`: "Rua dos Andradas, 1234, apto 501", CEP 90010-000, retirada marcada; Resumo R$ 195,21 | — (snapshot) |
| 15–16 | Voltar pelo navegador; abrir a sacola pelo cabeçalho | Produto; gaveta com "Frete: Retirada no escritório, grátis, para o CEP 90010-000. Ver as opções" | — |
| 17–19 | "Ver as opções", escolher o PAC, "Finalizar Pedido" (2ª ida, sem recarregar) — o passo onde BUG-001 aparecia | `/checkout`: **"Rua dos Andradas, 1234, apto 501"**, CEP 90010-000, PAC marcado, Resumo R$ 216,61 | `screenshots/CH-03-r2-19-checkout-pac-segunda-ida.png` |
| 20 | Recarregar o checkout | Mesma rua, CEP 90010-000, PAC marcado, R$ 216,61 | — (snapshot) |
| 21–22 | Voltar pelo navegador; abrir a sacola | "Frete: PAC, R$ 21,40, para o CEP 90010-000. Ver as opções" — escolha mantida | — |
| 23–24 | Abrir `/checkout` de novo (3ª ida) e tocar "Alterar" na Entrega | Formulário aberto: CEP 90010000, "Trazido da sua sacola · Centro Histórico — Porto Alegre/RS", Rua dos Andradas, Número 1234, Complemento apto 501, Bairro/Cidade/UF preenchidos; PAC marcado | — (snapshot) |
| 25 | Trocar o CEP no checkout por um que não existe (99999-999 + Enter) — o caminho que a correção também mexeu | Status "Não localizamos esse CEP. Preencha o endereço à mão — a cotação segue pelo CEP informado."; Rua, Bairro, Cidade e UF esvaziados e liberados para digitar; Número "1234" e Complemento "apto 501" mantidos | `screenshots/CH-03-r2-25-checkout-cep-nao-encontrado.png` |
| — | Sair da conta | Não feito pela tela — orçamento no teto; dados da sessão apagados (`delete-data`) e o browser fechado (perfil só em memória, nada em disco) | — |

**Edge cases tentados:**

- Ida e volta sacola ↔ checkout três vezes (retirada → PAC → reabrir), com CEP igual ao salvo: o endereço salvo inteiro em todas.
- Recarregar o checkout com a escolha vinda da gaveta: CEP, PAC e endereço mantidos.
- Troca de CEP no checkout para um CEP não encontrado (entorno da correção).

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-008 | pass | 13–20, 23–24 | `screenshots/CH-03-r2-19-checkout-pac-segunda-ida.png` | Passo 2 (CEP igual ao salvo) confere em três idas e depois de recarregar: rua, número e complemento do salvo, com a opção da gaveta. Passo 1 (01310-100) não exercido nesta rodada — orçamento (ver Fora da cobertura) |
| TC-JOURNEY-003 | pass | 01–20 | `screenshots/CH-03-r2-19-checkout-pac-segunda-ida.png` | Passos 1–4: retirada "Grátis" na gaveta, checkout com retirada, volta, PAC, checkout com o PAC e o endereço salvo inteiro, recarregar mantém. Legibilidade a 200 % julgada só pelo snapshot (sem reler a imagem); ramo de abandono e variação de teclado não refeitos |

Contagem: pass 2 · fail 0 · blocked 0 · skip 0

## Achados

nada — BUG-001 não reproduziu (a rua continua "Rua dos Andradas" na 2ª e na 3ª ida e depois de recarregar). Nenhuma regressão nem achado critical/high.

## Spec-gaps

nada (rodada de confirmação)

## Fora da cobertura

- TC-FUNC-008 passo 1 (gaveta com 01310-100 → checkout com o CEP da gaveta, "Trazido da sua sacola … São Paulo/SP", foco no Número, salvo não entra) — o orçamento de 25 acabou; faltava 1 ação para chegar ao checkout por esse caminho.
- TC-FUNC-020 (skip na rodada 1) e TC-FUNC-009/011 — fora do pedido desta rodada e sem orçamento.
- Troca retirada ↔ PAC na ordem inversa (PAC → retirada) e voltar → avançar → voltar — orçamento.
- Variação teclado em 1440 × 900 do TC-JOURNEY-003 — orçamento.
- Sair da conta pela tela — orçamento; a sessão foi apagada e o browser fechado.
- Sugestão de backlog (não é bug, nem regressão): no CEP não encontrado (passo 25), o Número "1234" e o Complemento "apto 501" do endereço anterior ficam no formulário enquanto Rua/Bairro/Cidade/UF esvaziam — Teresa pode enviar um número de outro endereço sem perceber. Nenhuma fonte lida define o comportamento; impacto baixo, o formulário fica aberto e pede a rua à mão.

## Debrief

- **Surpresas:** nada — a correção segura a rua do salvo em todas as idas; o login e o botão da barra fixa ainda consomem cerca de 10 das 25 ações.
- **Próximo charter:** se houver nova rodada, partir já logada da gaveta para o TC-FUNC-008 passo 1 (01310-100) e o TC-FUNC-020.
- **Padrão novo:** nada.
