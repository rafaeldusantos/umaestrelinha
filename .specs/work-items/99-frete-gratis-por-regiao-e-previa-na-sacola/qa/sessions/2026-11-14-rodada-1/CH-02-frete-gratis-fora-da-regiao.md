# Sessão CH-02 · O frete grátis para quem está fora da região da campanha

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-02-frete-gratis-fora-da-regiao.md` · exploratório · P0 |
| Status      | done                                                                   |
| Persona     | PER-02 Cida · conta: `cliente-salvador` — `QA_CLIENTE_SALVADOR_USUARIO` (código lido no Mailpit) |
| Tour · modo | Money · com tour                                                       |
| Rodada      | exploração                                                             |
| Orçamento   | 52 ações de browser de 50 (as 2 acima do teto são a saída da conta, obrigatória ao encerrar) |
| Ambiente    | http://localhost:8082 · build não exposto · Chromium (playwright-cli, headless) · viewports 390 × 844 · 1440 × 900 |
| Paridade    | cotação interceptada com a fixture A (PAC R$ 21,40 · SEDEX R$ 38,90, a mesma para qualquer CEP) com CORS; `https://*.supabase.co/**` e `**/g/collect*` bloqueados; ViaCEP real |

## Missão

Como Cida, de Salvador, achar qualquer jeito de a loja prometer ou conceder frete grátis a um CEP fora do Sul e do
Sudeste — ou de cobrar na tela um frete diferente do que o Total diz —, na gaveta e no checkout.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrou com a conta pelo código do e-mail; em Joias afetivas abriu o "Pingente Afetivo Bebê na Barriga com Cabelo" (R$ 279,90) e pôs 1 na sacola | Gaveta sem CEP: "Faltam R$ 170,10 para o frete grátis" + ⓘ, barra "R$ 279,90 / R$ 450,00", lista "Complete o frete grátis" com sugestões; Total R$ 279,90 | `screenshots/CH-02-01-abaixo-sem-cep-lista.png` |
| 02 | Calculou com 40020-000 (abaixo da faixa) | A faixa virou a linha neutra "Frete grátis só para Sul e Sudeste" + ⓘ, sem barra e sem "Faltam"; a lista de sugestões sumiu; PAC marcado R$ 21,40 sem "Grátis"; "Frete · PAC R$ 21,40"; Total R$ 301,30 | `screenshots/CH-02-02-ba-abaixo-linha-neutra.png` |
| 03 | Subiu para 2 peças (R$ 559,80), ainda com 40020-000, e tocou no ⓘ | A linha neutra continua (nenhum "Faltam", nenhum "liberado", nenhuma lista); PAC R$ 21,40 cobrado; Total R$ 581,20. ⓘ: "Para este CEP, o frete é o da cotação. Compras a partir de R$ 450,00 têm frete grátis para entregas no Sul (PR, SC, RS) e no Sudeste (SP, RJ, MG, ES). A região é conferida pelo CEP." — sem a cidade (A-1). Na rede, `GET viacep.com.br/ws/40020000/json → 200` | `screenshots/CH-02-03-ba-acima-tooltip.png` |
| 04 | Tocou "Trocar CEP" (fica sem CEP, acima da faixa) e tocou no ⓘ | "Frete grátis para Sul e Sudeste" + ⓘ, sem barra; nenhum "liberado" na gaveta; Total R$ 559,80 sem linha de frete. ⓘ: "… A região é conferida pelo CEP. Informe o CEP abaixo para confirmar." | `screenshots/CH-02-04-sem-cep-acima-tooltip.png` |
| 05 | Calculou com 00000-000 | A faixa ficou "Frete grátis para Sul e Sudeste" (como sem CEP), nenhum "liberado"; PAC R$ 21,40 cobrado; Total R$ 581,20 | — |
| 06 | Trocou para 39999-999 (borda de MG) | "Frete grátis liberado"; PAC "Grátis" (R$ 21,40 riscado); "Frete · PAC Grátis"; Total R$ 559,80 | — |
| 07 | Tocou "Finalizar Pedido" | Checkout com o CEP 39999-999 "Trazido da sua sacola", PAC "Grátis" marcado, Resumo fechado "2 itens · frete grátis R$ 520,61" (PIX 7 %); "Não localizamos esse CEP. Preencha o endereço à mão…" (CEP fictício — esperado) | — |
| 08 | No bloco Entrega, trocou o CEP para 40020-000 | Sem recarregar: a escolha foi desfeita (nenhuma opção marcada), PAC sem "Grátis", Resumo "2 itens R$ 520,61". Rua, Bairro, Cidade e UF continuam vazios e a mensagem "Não localizamos esse CEP" continua — 1ª ocorrência de A-2 | — |
| 09 | Escolheu o PAC e abriu o Resumo | Resumo: "Frete grátis só para Sul e Sudeste"; Subtotal R$ 559,80; Desconto PIX (7%) −R$ 39,19; "Frete · Correios PAC R$ 21,40"; Total R$ 542,01; "no cartão: 4x de R$ 145,30" (= R$ 581,20, o Total da gaveta) | `screenshots/CH-02-05-checkout-ba-pac.png` · `screenshots/CH-02-06-checkout-resumo-ba.png` |
| 10 | Trocou o CEP para 01310-100 e escolheu o PAC | "Frete grátis liberado"; PAC "Grátis"; Resumo "frete grátis"; Total R$ 520,61 (caiu R$ 21,40). Endereço preenchido pela busca: Avenida Paulista, Bela Vista, São Paulo, SP (`GET viacep …/01310100 → 200`) | — |
| 11 | Trocou o CEP de volta para 40020-000 | Resumo volta a "Frete grátis só para Sul e Sudeste". Os campos continuam **Avenida Paulista, Bela Vista, São Paulo, SP** com o CEP de Salvador, e aparece "Não localizamos esse CEP. Preencha o endereço à mão — a cotação segue pelo CEP informado."; na rede, nenhuma busca do endereço para 40020000 depois da troca — 2ª ocorrência de A-2 | `screenshots/CH-02-07-checkout-ba-endereco.png` |
| 12 | Tocou "Voltar à sacola" | Gaveta com "Frete para 40020-000" e a linha neutra; nenhuma opção marcada (a escolha foi desfeita no checkout); Total R$ 559,80 | — |
| 13 | "Tem um cupom?" → QAFRETE → **duplo toque** em "Aplicar" | "QAFRETE aplicado · Frete grátis"; PAC e SEDEX "Grátis"; a linha "Frete grátis só para Sul e Sudeste" sumiu; cupom aplicado uma vez só | `screenshots/CH-02-08-cupom-ba.png` |
| 14 | "Remover cupom" | A linha "Frete grátis só para Sul e Sudeste" voltou; PAC R$ 21,40 e SEDEX R$ 38,90 sem "Grátis" | — |
| 15 | Passou para 1440 × 900, com a gaveta aberta e 40020-000, e tocou no ⓘ | A mesma linha neutra; ⓘ de novo "Para este CEP, o frete é o da cotação. …" — 2ª ocorrência de A-1 | `screenshots/CH-02-09-1440-tooltip-ba.png` |
| 16 | Saiu da conta em `/conta` | O diálogo "Entrar ou criar conta" voltou | — |

**Edge cases tentados:**

- 00000-000 (CEP de nenhuma região): comportou-se como sem CEP, sem "liberado" — ok.
- 39999-999 (borda do Sudeste): "liberado" e PAC "Grátis" — ok. O 40000-000 não foi tentado (orçamento); 40020-000 cobre a BA.
- Sacola abaixo da faixa com CEP da BA e subida acima: a linha neutra nunca virou "Faltam R$ X" — ok.
- Duplo toque em "Aplicar" no cupom: aplicado uma vez — ok.
- Trocar o CEP no checkout MG → BA → SP → BA: frete e Total acompanham sem recarregar; o endereço não acompanha (A-2).
- Voltar do checkout para a gaveta depois de trocar o CEP lá: a gaveta mostra o CEP novo — ok.

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-012 | pass | 04, 05 | `screenshots/CH-02-04-sem-cep-acima-tooltip.png` | passos 1–2 e a variação 00000-000 conferidos; o passo 3 (checkout sem CEP) e a variação CEP incompleto não foram executados (orçamento) |
| TC-FUNC-013 | fail | 02, 03, 09, 15 | `screenshots/CH-02-03-ba-acima-tooltip.png` | passos 1 e 3 ok (linha neutra, frete somado, mesmo PAC cobrado no checkout); passo 2 falha: o ⓘ diz "Para este CEP" e não "Para Salvador/BA" ⇒ A-1. Variações abaixo da faixa e 39999-999 ok |
| TC-FUNC-014 | pass | 08–12 | `screenshots/CH-02-05-checkout-ba-pac.png` | a escolha é desfeita, o "Grátis" some, o PAC soma R$ 21,40 e volta a "Grátis" com 01310-100, sem recarregar. Desvio: a ida ao checkout partiu de 39999-999 (MG) em vez de 01310-100; o SP entrou no passo 3. Variação "volta à gaveta" ok; "duas abas" não executada. O endereço que não acompanha a troca está em A-2 |
| TC-FUNC-015 | pass | 13, 14 | `screenshots/CH-02-08-cupom-ba.png` | passos 1 e 3 e o duplo toque ok; o passo 2 (checkout com o cupom) e a variação dentro da região não foram executados (orçamento) |
| TC-FUNC-016 | pass | 01, 02, 03 | `screenshots/CH-02-01-abaixo-sem-cep-lista.png` · `screenshots/CH-02-02-ba-abaixo-linha-neutra.png` | a lista aparece sem CEP e some com 40020-000 (abaixo e acima da faixa); o passo 3 (voltar com 01310-100 abaixo da faixa) e a conferência da busca de catálogo na rede não foram feitos |
| TC-JOURNEY-002 | pass | 01–04, 09 | `screenshots/CH-02-06-checkout-resumo-ba.png` | nenhuma tela disse "liberado" fora da região; o checkout cobra o PAC R$ 21,40 para 40020-000; Total no cartão R$ 581,20 = Total da gaveta (no PIX R$ 542,01, com os 7 % que a loja anuncia "aplicado no checkout"). A chegada ao checkout com a BA foi pela troca de CEP, não direto da gaveta; o caminho de abandono e o 1440 do checkout não foram executados |

Contagem: pass 5 · fail 1 · blocked 0 · skip 0

## Achados

### A-1 · [Gaveta · ⓘ do frete grátis] Com o CEP de Salvador, o ⓘ diz "Para este CEP" em vez de "Para Salvador/BA" — para Cida

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-02 Cida                                                           |
| Jornada e passo     | J-02, passo 4 (toca no ⓘ) · passos 03 e 15 do log                     |
| TC                  | TC-FUNC-013                                                           |
| Gravidade proposta  | low — o texto ainda diz que o frete é o da cotação e a regra inteira; só não nomeia a cidade dela |
| Reproduziu          | sim (2 de 2)                                                          |
| Viewport            | 390 × 844 e 1440 × 900                                                |

**Passos para reproduzir** — de um estado limpo:

1. Logada como `cliente-salvador`, em `http://localhost:8082`, com a cotação interceptada pela fixture A
2. Põe na sacola peças que somem R$ 450,00 ou mais (ex.: 2 × "Pingente Afetivo Bebê na Barriga com Cabelo", R$ 559,80)
3. Na gaveta, calcula com 40020-000 e toca no ⓘ ao lado de "Frete grátis só para Sul e Sudeste"

**Esperado:** "Para Salvador/BA, o frete é o da cotação." seguido da regra inteira — **fonte:** TC-FUNC-013 passo 2;
J-02 passo 4 (PRD 99 CA-17, `spec.md` › Design › "CEP fora da campanha")

**Observado:** "Para este CEP, o frete é o da cotação. Compras a partir de R$ 450,00 têm frete grátis para entregas no
Sul (PR, SC, RS) e no Sudeste (SP, RJ, MG, ES). A região é conferida pelo CEP." A gaveta mostra só "Frete para
40020-000", sem cidade, embora a busca do endereço tenha respondido.

**Evidência:**

- `screenshots/CH-02-03-ba-acima-tooltip.png` — o ⓘ aberto a 390
- `screenshots/CH-02-09-1440-tooltip-ba.png` — o mesmo texto a 1440
- console: nada
- rede: `GET https://viacep.com.br/ws/40020000/json/ → 200` antes do ⓘ

### A-2 · [Checkout · Entrega] Trocar o CEP para o de Salvador não busca o endereço: fica o endereço do CEP anterior (São Paulo/SP) e "Não localizamos esse CEP" — para Cida

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-02 Cida                                                           |
| Jornada e passo     | J-02, ramo J-02a (corrige o CEP no checkout) · passos 08 e 11 do log  |
| TC                  | — (entorno do TC-FUNC-014)                                            |
| Gravidade proposta  | high — com o CEP de Salvador, o formulário continua "Avenida Paulista, Bela Vista, São Paulo, SP" e diz que o CEP não existe; se ela não reparar, o pedido sai com um endereço misturado, e se reparar, desconfia da loja |
| Reproduziu          | sim (2 de 2)                                                          |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Logada como `cliente-salvador` (sem endereço salvo), com a fixture A; sacola com peças ≥ R$ 450
2. Na gaveta, calcula com 40020-000 (a gaveta busca o endereço desse CEP); depois "Trocar CEP" e calcula com outro
   CEP (na sessão: 00000-000 e 39999-999)
3. "Finalizar Pedido"; no bloco Entrega, troca o CEP para 01310-100 — Rua, Bairro, Cidade e UF se preenchem
   (Avenida Paulista, Bela Vista, São Paulo, SP)
4. Troca o CEP para 40020-000

**Esperado:** o endereço acompanha o CEP, como acontece com 01310-100 (os campos se preenchem com o endereço de
Salvador/BA, ou se limpam), e a mensagem "Não localizamos esse CEP" não aparece para um CEP que a busca encontra —
**fonte:** o próprio checkout com 01310-100 (passo 10 do log); TC-FUNC-014 / J-02a (o CEP corrigido no checkout vale
para a entrega). A forma exata do preenchimento não está escrita no PRD 99 — a triagem pode reclassificar.

**Observado:** com 40020-000 no campo CEP, os campos continuam "Avenida Paulista", "Bela Vista", "São Paulo", "SP", e
o status diz "Não localizamos esse CEP. Preencha o endereço à mão — a cotação segue pelo CEP informado." Na 1ª
ocorrência (vindo de 39999-999), os campos ficaram vazios com a mesma mensagem. Frete, "Grátis" e Total acompanharam
a troca corretamente.

**Evidência:**

- `screenshots/CH-02-07-checkout-ba-endereco.png` — CEP 40020-000 com o endereço de São Paulo e a mensagem
- console: nada
- rede: depois da troca para 40020000 no checkout, nenhuma `GET viacep.com.br/ws/40020000/json/` (a única foi a da
  gaveta, passo 03); para 01310100, `GET viacep … → 200`

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| Na página do produto, a 390 × 844, o "Adicionar à sacola" só fica tocável depois de rolar a página (antes, o botão não está na área visível e o toque não acontece) | 01 | pré-existente |

## Fora da cobertura

- TC-FUNC-012 passo 3 (checkout sem CEP) e a variação CEP incompleto — orçamento.
- CEP 40000-000 (borda do Nordeste) — orçamento; 40020-000 cobriu a BA.
- TC-FUNC-015 passo 2 (checkout com o QAFRETE) e a variação dentro da região — orçamento.
- TC-FUNC-016 passo 3 (a lista volta com 01310-100 abaixo da faixa) e a prova pela rede de que o catálogo não é
  buscado — orçamento.
- J-02 passo 5 direto da gaveta com a BA (a sessão chegou ao checkout com MG e trocou lá), o caminho de abandono
  (fechar a aba e voltar) e a repetição gaveta × checkout a 1440 (só o ⓘ foi conferido a 1440) — orçamento.
- Checkout em duas abas e "trocar o CEP da gaveta de SP para BA com o frete escolhido" — orçamento.
- "Calculando" (cotação lenta) — o `route` não atrasa resposta; fora do alcance desta sessão.

## Debrief

- **Surpresas:** a troca de CEP no checkout mantém o endereço do CEP anterior quando o novo CEP já tinha sido
  buscado na gaveta (A-2) — a regra do frete acompanha, o endereço não.
- **Próximo charter:** troca de CEP no checkout com e sem busca prévia na gaveta, para isolar A-2 (inclui a conta com
  endereço salvo do CH-03); e o que vai ao pedido quando o CEP e a cidade divergem (CH-06).
- **Padrão novo:** repetir no checkout um CEP já calculado na gaveta (CEP "visto antes") — achou A-2.
