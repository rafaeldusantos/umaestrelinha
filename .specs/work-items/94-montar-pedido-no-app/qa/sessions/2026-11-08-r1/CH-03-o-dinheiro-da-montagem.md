# Sessão CH-03 · O dinheiro da montagem: estoque, promoção, cupom, combinado e preço travado

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-03-o-dinheiro-da-montagem.md` · exploratório · P0 |
| Status      | done                                                                   |
| Persona     | PER-01 Adri no WhatsApp · conta: `admin-atelie`                        |
| Tour · modo | Money · por técnica (valor limite)                                     |
| Rodada      | exploração                                                             |
| Orçamento   | 50 ações de browser de 50                                              |
| Ambiente    | http://localhost:8084 (app do ateliê, branch feature/94) · build não exposto · Chromium headless (Playwright MCP) · viewport 390 × 844 |
| Paridade    | Supabase e edge functions locais; `*.supabase.co` bloqueado; Mercado Pago não configurado |

## Missão

Achar qualquer jeito de o total do pedido montado divergir do que a Adri viu na revisão: estoque estourado,
promoção perdida, cupom de primeira compra aceito para quem já comprou, combinado que zera ou fica negativo,
duas propostas no duplo toque, ou link criado com o preço velho.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrou e abriu "Montar pedido"; buscou "Marta" e escolheu Marta Lúcia (já comprou); "Continuar" | Passo 2 de 4 · Peças | — |
| 02 | Buscou "QA", abriu "QA Corrente Cartier" (categoria da promoção progressiva) | Folha na primeira variação "45 cm · Não · 9 em estoque"; "A foto troca com a variação escolhida."; quatro variações com estoque; sem etiqueta de promoção (sacola vazia, a promoção pede 2+ peças) | — |
| 03 | Subiu a quantidade até 10 na variação de 9 | No 10: "Só há 9 em estoque." (alert) e "Acrescentar · R$ 1.199,00" desligado. O contador deixa passar de 9, mas a recusa aparece na hora | — |
| 04 | Voltou a 8 e acrescentou | Toast "Peça acrescentada." / "QA Corrente Cartier · 45 cm · Não"; linha "8 × R$ 119,90", etiqueta "QA92 Progressiva Cartier · 30%", R$ 959,20. A busca "QA" foi apagada depois de acrescentar (a lista voltou ao catálogo todo) | — |
| 05 | Buscou "Cartier", reabriu a mesma peça e pediu 2 na mesma variação (8 já na sacola) | "QA92 Progressiva Cartier · 30% nesta peça" na folha; "Só há 9 em estoque." e "Acrescentar · R$ 239,80" desligado — o teto soma a sacola | `screenshots/CH-03-04-teto-soma-sacola.png` |
| 06 | Fechou a folha e seguiu ao passo 3 | Resumo: "Subtotal · 8 peças R$ 959,20", "Promoção − R$ 287,76", "Itens R$ 671,44", "No PIX: R$ 624,44 nos itens (7% de desconto). Frete à parte."; a barra com R$ 671,44 | — |
| 07 | "Aplicar" sem código; depois "qa94primeira" (Marta já comprou); depois "PROVA89" (inativo) | "Digite o código do cupom."; o campo virou "QA94PRIMEIRA" e "Cupom válido apenas no primeiro pedido." (prévia `422`); "Cupom desativado." | — |
| 08 | Digitou " qa92cupom15 " (minúsculas, espaço antes e depois) e Enter | Cartão "QA92CUPOM15 · 15% de desconto · Remover" e o aviso "A promoção vigente vale mais e não acumula com este cupom — o cupom não entra no total."; o resumo segue sem linha de cupom (Itens R$ 671,44) | — |
| 09 | Ligou "Desconto combinado" (pelo rótulo), "Em reais" 671,00 (deixa R$ 0,44 nos itens) e colou um motivo de 121 caracteres | "Conferindo o resumo…" e depois "O desconto não pode zerar o pedido." sob o valor; o resumo sem o combinado (Itens R$ 671,44, nunca negativo); motivo cortado em 120 ("120/120") | `screenshots/CH-03-09-combinado-nao-zera.png` |
| 10 | Tocou em "Continuar" com o combinado recusado | Fica no passo 3; a barra mostra "O desconto não pode zerar o pedido." Orçamento quase no fim: saiu da conta e fechou | — |

**Edge cases tentados:** quantidade acima do estoque na folha (passa: recusa na hora); teto somando a sacola (passa); cupom vazio (passa); cupom em minúsculas e com espaços (passa: normaliza); cupom de primeira compra para quem já comprou (passa); cupom inativo (texto da loja "Cupom desativado."); peça em promoção + cupom (o cupom não acumula, com aviso); combinado que deixaria R$ 0,44 (passa: recusa e fica fora da conta); motivo com 121 caracteres (passa: para em 120); "Continuar" com o combinado recusado (bloqueia com o motivo na barra).

## Casos

| TC     | Veredito | Passo | Evidência | Nota |
| ------ | -------- | ----- | --------- | ---- |
| TC-FUNC-017 | pass | 02–05 | `screenshots/CH-03-04-teto-soma-sacola.png` | parcial: os passos 1 e 4 (o teto que soma a sacola, com "Só há 9 em estoque." e o botão desligado); a troca de foto e a variação esgotada não exercitadas (a peça usada não tinha esgotada nem foto por variação no snapshot); o duplo toque já é bug do CH-01 |
| TC-FUNC-020 | pass | 04–06 | `screenshots/CH-03-04-teto-soma-sacola.png` | parcial, com a promoção progressiva da massa (30 %, não 15 %): "QA92 Progressiva Cartier · 30% nesta peça" na folha, "· 30%" na linha da sacola, linha "Promoção" (−) no resumo; botão da folha sem a promoção (R$ 239,80 = 2 × 119,90); a promoção vencida não exercitada |
| TC-FUNC-021 | pass | 07–08 | — | parcial: vazio, primeira compra com cliente que já comprou, minúsculas com espaço; o cupom de 15 % não entra no resumo porque a sacola tem promoção (não acumula — ver spec-gap); inexistente, frete grátis, cliente nova, sem e-mail e troca de cliente não exercitados (orçamento) |
| TC-FUNC-022 | pass | 09–10 | `screenshots/CH-03-09-combinado-nao-zera.png` | parcial: o combinado que deixaria os itens abaixo de R$ 1,00 é recusado logo e fica fora da conta; motivo para em 120; o motivo vazio e o % (100 / 99,99) não exercitados |
| TC-FUNC-023 | skip | 06–09 | — | a ordem promoção → cupom → combinado não pôde ser vista: o cupom não acumula com a promoção e o único combinado tentado foi o recusado; mudanças rápidas e rede caída fora por orçamento |
| TC-FUNC-025 | skip | — | — | orçamento; o duplo toque em "Criar link" passou no CH-01 e o voltar já é bug registrado |
| TC-FUNC-026 | skip | — | — | orçamento esgotou antes da troca de preço no painel; nenhum preço foi alterado |

Contagem: pass 4 · fail 0 · blocked 0 · skip 3

## Achados

nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta |
| ----------------------- | ------------ | --------------- |
| Com peça em promoção na sacola, o cupom fica "aplicado" (cartão com código, "15% de desconto" e "Remover") mas não entra no total, com o aviso "A promoção vigente vale mais e não acumula com este cupom — o cupom não entra no total." O TC-FUNC-021/023 espera a linha "Cupom CODIGO" e a ordem promoção → cupom → combinado; nenhuma fonte do WI diz o que fazer quando os dois não acumulam | 08 | mudança |
| Depois de "Acrescentar", o termo da busca de joias some e a lista volta ao catálogo inteiro; para pôr outra peça da mesma busca é preciso redigitar | 04 | polimento |
| O contador de quantidade da folha passa do estoque (chegou a 10 com 9) — a recusa aparece e o botão desliga, mas o "Uma a mais" segue ligado | 03 | polimento |
| O resumo diz "No PIX: … (7% de desconto)"; o TC-FUNC-023 escreve 5 %. A taxa parece vir da configuração da loja — conferir qual a fonte vale | 06 | pré-existente |

## Fora da cobertura

- TC-FUNC-026 (preço que mudou enquanto montava) e o edge "promoção que venceu no meio" — orçamento de 50 ações esgotou antes de abrir o painel; nenhum preço foi alterado
- TC-FUNC-025 ("Criar link" uma vez, F5 durante "Criando o link…", function fora) — orçamento; nenhum link criado nesta sessão
- Cupons: código inexistente, frete grátis (QA92FRETE), primeira compra com cliente nova (Juliana Prates Ch02), cliente nova sem e-mail, trocar a cliente depois do cupom — orçamento
- Combinado em %, 100 %, 99,99 %, motivo vazio, combinado válido no resumo — orçamento
- Rede caindo no recálculo e mudanças rápidas de quantidade — orçamento
- Promoção vencida sem etiqueta — orçamento; massa da promoção vencida não localizada
- Troca de foto e variação esgotada na folha — a peça usada não as tinha

## Debrief

- **Surpresas:** a regra de não acumular cupom com promoção apareceu no app com aviso próprio, o que impede ver a ordem do resumo com a massa do charter (a promoção progressiva domina toda peça da categoria)
- **Próximo charter:** uma rodada só de TC-FUNC-026 e TC-FUNC-025 (preço trocado no painel e "Criar link"), e outra de cupons com sacola sem promoção (frete grátis, primeira compra com cliente nova e sem e-mail, ordem cupom → combinado no resumo)
- **Padrão novo:** usar o duplo toque no "Uma a mais" para chegar ao limite de estoque com menos ações
