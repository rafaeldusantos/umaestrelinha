# Sessão CH-06 · O pedido montado com entrega fora da região (continuação)

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-06-pedido-montado-fora-da-regiao.md` · exploratório · P0 |
| Status      | done (o orçamento acabou antes do pagamento; ver Fora da cobertura) |
| Persona     | PER-02 Cida · conta: `cliente-salvador` — `QA_CLIENTE_SALVADOR_USUARIO` |
| Tour · modo | Money · por cenário (J-04) |
| Rodada      | exploração |
| Orçamento   | 50 ações de browser de 50 |
| Ambiente    | http://localhost:8082 · build não exposto · Chromium (playwright-cli, sessão `CH-06c`, headless, perfil em memória) · viewport 390 × 844 |
| Paridade    | cotação interceptada com a fixture A (com CORS); `https://*.supabase.co/**` e `**/g/collect*` abortados; Mercado Pago com chave inválida; código de login lido no Mailpit local |

Continuação da primeira sessão (`sessions/CH-06-pedido-montado-fora-da-regiao.md`), que não é sobrescrita.

## Missão

Como Cida, pagando pelo link que a Adri mandou, procurar qualquer caminho em que o pedido montado conceda o frete
grátis para Salvador — na tela ou no pedido que nasce — ou em que ele mexa na sacola que ela tinha montado.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrar na conta pelo código de 6 dígitos | "Olá, Marina"; Pedidos: "Você ainda não fez nenhum pedido." | — |
| 02 | Abrir a peça Pingente Afetivo Dois Corações com Leite Materno (R$ 209,90) e tocar "Adicionar à sacola" com a página no topo | O toque não adicionou nada e não deu retorno; a gaveta abriu com "Sua sacola está vazia". Depois de rolar a página, o mesmo botão adicionou a peça e a gaveta abriu com ela (atrito já conhecido, fora da superfície da Mudança) | — |
| 03 | Calcular 40020-000 na gaveta | "Faltam R$ 240,10 para o frete grátis" · "Frete grátis só para Sul e Sudeste" · "Frete para 40020-000" · PAC R$ 21,40 marcado · SEDEX R$ 38,90 · Frete · PAC R$ 21,40 · Total R$ 231,30 | `screenshots/CH-06c-01-sacola-40020.png` |
| 04 | Abrir o link do pedido montado (P-0046) | "Seu pedido", R$ 490,00; CEP vazio (só o placeholder 00000-000), Rua/Bairro/Cidade/UF vazios; "Informe o CEP para ver as opções de envio."; "Pagar R$ 455,70 com PIX" desabilitado | — |
| 05 | Informar 01310-100 | Bela Vista · São Paulo · SP preenchidos; "PAC · Correios … **Grátis** ~~R$ 21,40~~"; SEDEX R$ 38,90; nenhuma opção marcada; "Pagar R$ 455,70 com PIX" desabilitado | — |
| 06 | Trocar o CEP para 40020-000 e informar o número 100 | status: "Não localizamos esse CEP. Preencha o endereço à mão — a cotação segue pelo CEP informado." Rua **Avenida Paulista**, Bairro **Bela Vista**, Cidade **São Paulo**, UF **SP** continuam preenchidos (do CEP anterior), agora editáveis. Opções: "PAC · Correios … R$ 21,40" (sem "Grátis") e SEDEX R$ 38,90 | — |
| 07 | Escolher o PAC | PAC marcado; Resumo: Subtotal R$ 490,00 · Frete R$ 21,40 · Desconto PIX −R$ 34,30 · Total **R$ 477,10** (subiu de R$ 455,70); "Continuar" habilitado; "Pagar R$ 477,10 com PIX" ainda desabilitado | — |
| 08 | Tocar "Pagar R$ 477,10 com PIX" | O botão está desabilitado: o pagamento só abre depois de "Continuar" (etapa seguinte). O orçamento acabou aqui | — |

O browser foi fechado (perfil em memória, nada em disco); a saída da conta foi o fechamento da sessão, sem o "Sair"
pela tela — não sobrou ação no orçamento. Nenhum pedido nasceu: o link P-0046 **não foi consumido**.

**Edge cases tentados:**

- Troca de CEP dentro → fora da região depois da cotação do primeiro (passos 05–07): o "Grátis" saiu e o frete entrou
  no Total.
- Troca para um CEP que a busca do endereço não localiza: o endereço do CEP anterior fica nos campos (ver Spec-gaps).

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-INT-001 | skip | 05 · 07 | — | passo 1: o "Grátis" do PAC com 01310-100 visto, sem escolher a opção; passo 2 passou (PAC R$ 21,40 cobrado, Total R$ 455,70 → R$ 477,10); passo 3 (o pedido que nasce, na tela de pagamento e em `/conta`) não alcançado — orçamento |
| TC-FUNC-017 | skip | 03 · 04 | `screenshots/CH-06c-01-sacola-40020.png` | passo 1 passou de novo (formulário vazio, sem o 40020-000 da sacola); passos 2 e 3 (seguir ao pagamento; gaveta intacta) não alcançados — orçamento |

Contagem: pass 0 · fail 0 · blocked 0 · skip 2

## Achados

nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| No `/pedido-montado`, trocar o CEP de 01310-100 para 40020-000 mostra "Não localizamos esse CEP. Preencha o endereço à mão…", mas Rua/Bairro/Cidade/UF continuam com o endereço de São Paulo/SP (Avenida Paulista, Bela Vista), e o pedido pode seguir com CEP de Salvador e UF SP. A tela cotou pelo CEP (PAC cobrado); nenhuma fonte define o que o servidor usa para decidir a região quando CEP e UF não batem — vale a próxima sessão pagar nesse estado e ler o Total do pedido que nasce | 06 | pré-existente |

## Fora da cobertura

- TC-INT-001 passo 3 (tocar "Continuar", depois "Pagar … com PIX", e ler o Total na tela de pagamento e em `/conta`) e o
  "escolher" do passo 1 (o Total com o PAC grátis marcado) — orçamento: 50 de 50. O login, a peça (o toque que não pegou
  no topo) e o cálculo na gaveta gastaram 36 ações
- TC-FUNC-017 passos 2 e 3 (seguir ao pagamento; voltar à gaveta e ver peça, 40020-000 e PAC intactos) — orçamento
- Recarregar `/pedido-montado` no meio do preenchimento, duplo toque em pagar, voltar do navegador depois do pagamento,
  segunda aba com a gaveta — orçamento
- O "Sair" pela tela — orçamento; a sessão foi encerrada fechando o browser (perfil em memória)
- Massa: P-0046 continua disponível; nenhum pedido `pending` foi criado

## Debrief

- **Surpresas:** o pagamento do pedido montado tem uma etapa "Continuar" antes do "Pagar … com PIX" — o botão de pagar
  fica desabilitado até ela. E a busca do endereço não localizou 40020-000 e deixou o endereço de São Paulo nos campos
- **Próximo charter:** terceira sessão do CH-06 partindo direto de `/pedido-montado` (a sacola com 40020-000 pode ser
  montada depois, para o TC-FUNC-017 passo 3), com o roteiro: CEP 40020-000 → número → PAC → "Continuar" → "Pagar com
  PIX" → `/conta`; incluir o caso CEP 40020-000 com UF SP herdada. Orçamento: o login sozinho custa ~15 ações nesta CLI
- **Padrão novo:** trocar o CEP para um que a busca não localiza, depois de um que ela localizou — o endereço antigo fica
