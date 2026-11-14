# Sessão CH-04 · A cotação que não responde

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-04-cotacao-que-nao-responde.md` · exploratório · P1 |
| Status      | done                                                                   |
| Persona     | PER-01 Luana · conta: anonima                                          |
| Tour · modo | Network · com tour                                                     |
| Rodada      | exploração                                                             |
| Orçamento   | 25 ações de browser de 25                                              |
| Ambiente    | http://localhost:8082 · build não exposto · Chromium (playwright-cli 0.1.24, headless, perfil em memória) · viewport 390 × 844 |
| Paridade    | cotação do Melhor Envio interceptada: primeiro abortada (`context.route(...).abort()` pelo `run-code`, porque o `route` da cli não tem `--abort`), depois a fixture A com os cabeçalhos CORS; `https://*.supabase.co/**` e `**/g/collect*` abortados; ViaCEP liberado |

## Missão

Como Luana, com a rede ruim do celular, ver o que a sacola diz quando a consulta do frete falha ou não traz opção, e
se ela ainda consegue seguir para o checkout sem que a sacola invente um frete.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Abriu a página do Pingente Afetivo Barquinho com Cabelo, aceitou os cookies e, depois de rolar até ele, tocou "Adicionar à sacola" | A gaveta abriu com 1 peça (R$ 209,90), "Faltam R$ 240,10 para o frete grátis", campo "CEP para calcular o frete", Subtotal e Total R$ 209,90. O primeiro toque, sem rolar, não adicionou (atrito já conhecido do botão abaixo da dobra) | — |
| 02 | Com a cotação abortada, digitou 01310-100 e tocou "Calcular" | "Frete para 01310-100 · São Paulo/SP" + "Trocar CEP"; alerta "Não consegui consultar o frete agora. Tente de novo — ou siga para o checkout, onde ele é calculado outra vez." com o botão "Tentar de novo". Total continua R$ 209,90 (= Subtotal). Nenhuma linha de frete, nenhum "Frete padrão". "Finalizar Pedido" ativo | `screenshots/CH-04-01-falha-cotacao.png` |
| 03 | Tocou "Finalizar Pedido" | O checkout abriu em `/checkout` normalmente ("Finalizar compra", Contato, Entrega, Pagamento) | `screenshots/CH-04-02-checkout-apos-falha.png` |
| 04 | Abriu a Entrega ("Preencher") | CEP 01310-100 já preenchido, com "Trazido da sua sacola · Bela Vista — São Paulo/SP"; rua, bairro, cidade e UF vindos do CEP. Em Forma de envio, o checkout cotou de novo e caiu no comportamento de antes: "Não foi possível consultar os prazos agora. O pedido segue com o frete padrão da loja." (SHP-05, fora do escopo) | `screenshots/CH-04-03-checkout-frete-padrao.png` |
| 05 | Voltou (botão voltar do browser) à página do produto; liberou a rota (fixture A, com CORS) e reabriu a sacola | A gaveta já recotou sozinha ao abrir: "Frete: PAC, R$ 21,40, para o CEP 01310-100. Ver as opções", "Chega entre 25 e 27 de novembro", linha de frete R$ 21,40, Total R$ 231,30 — o PAC (o mais barato) marcado sem toque. O alerta de falha não estava mais lá, então o "Tentar de novo" não chegou a ser tocado | `screenshots/CH-04-04-recotou-pac.png` |

**Edge cases tentados:** ida ao checkout depois da falha e volta à sacola (o CEP sobrevive à ida e volta; a sacola
recota ao reabrir). Os demais da lista do charter não couberam no orçamento (ver Fora da cobertura).

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-010 | skip | 02–05 | `screenshots/CH-04-01-falha-cotacao.png` · `CH-04-02-checkout-apos-falha.png` · `CH-04-04-recotou-pac.png` | Incompleto por orçamento. Passo 1 do TC confere (mensagem exata, "Tentar de novo", Total sem frete, nenhum "Frete padrão"); passo 2 confere (o checkout abre); passo 3 confere só em parte (as opções aparecem e o PAC vem marcado, mas pela recotação ao reabrir a gaveta, sem o toque em "Tentar de novo"); passo 4 (resposta `[]` com 90010-000) não executado |

Contagem: pass 0 · fail 0 · blocked 0 · skip 1

## Achados

nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| Ao voltar do checkout e reabrir a gaveta, a sacola recota sozinha para o CEP guardado e troca o alerta de falha pelas opções, sem precisar do "Tentar de novo". Nenhuma fonte diz se a falha deve persistir ou se a gaveta recota ao reabrir; para a Luana o efeito é bom | 05 | polimento |

## Fora da cobertura

- Toque em "Tentar de novo" com a rota liberada (passo 3 do TC, deve tentar 2) — a gaveta recotou sozinha ao reabrir; repetir a falha na mesma abertura e tocar "Tentar de novo" não coube no orçamento.
- Resposta `[]` com 90010-000 e a mensagem "Nenhuma opção de frete disponível para este CEP…" (passo 4 do TC, deve tentar 3) — orçamento esgotado.
- Edge cases: offline no meio do cálculo, duplo toque em "Tentar de novo", recarregar com a falha na tela, falha com o frete já escolhido antes (D-21) — orçamento esgotado.
- Resposta lenta (o "calculando") — o `route` da cli não atrasa resposta; fora do escopo do charter.
- 1440 × 900 — orçamento.

## Debrief

- **Surpresas:** o `route` do playwright-cli 0.1.24 não tem `--abort`; a falha saiu por `context.route(...).abort()` no `run-code` e voltou com `context.unroute` antes do `route` da fixture. Ao abrir o checkout, o Resumo já mostrava R$ 215,11 antes da Entrega ser preenchida (o Pix de R$ 195,21 mais o que parece ser o frete padrão de R$ 19,90) — é o checkout (SHP-05), fora do escopo, não conferido.
- **Próximo charter:** uma sessão curta só para o que ficou de fora: "Tentar de novo" na mesma abertura da gaveta (com duplo toque), a resposta `[]` com 90010-000, recarregar com a falha na tela e a falha na segunda consulta com o frete já escolhido (D-21). Cerca de 15 ações, a partir da gaveta com a peça e a rota abortada desde o começo.
- **Padrão novo:** nada
