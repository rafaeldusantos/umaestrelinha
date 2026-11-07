# Sessão CH-06 · A dona confere no painel do pedido e na Adesão quanto houve de desconto

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-06-pedido-no-painel-e-adesao.md` · exploratório · P1 |
| Status      | done                                                                   |
| Persona     | PER-07 convidada anônima na loja (só para produzir a massa M-07) · PER-02 Adri no painel, conta `admin-painel` = usuário de desenvolvimento de `supabase/seed.sql` (seção 5, só local), premissa da thread; `QA_ADMIN_PAINEL_*` não definidas |
| Tour · modo | Feature · por cenário                                                  |
| Rodada      | confirmação (rodada 3)                                                 |
| Orçamento   | 20 ações de browser de 13 (parte A: 16, dentro do teto de 20 dela; parte B: 4, com a variação do cancelamento pedida pela thread depois do orçamento). O excesso é o checkout de convidada em três etapas e a leitura da Adesão antes e depois |
| Ambiente    | loja http://localhost:8082 · painel http://localhost:8083 (worktree feature/92) · Chromium (Playwright MCP, headless) · 1440×900 |
| Paridade    | banco local; edge functions locais com chaves externas inválidas (o PIX não gera código, esperado); `*.supabase.co` e `**/g/collect*` bloqueados por rota |

## Missão

Rodada de confirmação: refazer só o TC-FUNC-032, que ficou `blocked` por massa nas rodadas 1 e 2. Parte A:
produzir pela tela a massa M-07 — (1) um pedido com a corrente comprada pelo catálogo, com P na sacola, com o
desconto casado e sem a marca "acompanha"; (2) um pedido com a marca, cancelado. A thread aprova o pagamento do
pedido (1) e a parte B lê a Adesão.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Na loja, abriu a QA Pingente Estrela e pôs na sacola pelo botão principal, sem marcar nada no bloco Compre Junto | os três "Levar junto" desmarcados; sacola com 1 item, R$ 259,90 (Prata 925 · Não) | — |
| 02 | Abriu a QA Corrente Cartier pela página dela e pôs na sacola | sacola: Cartier "de R$ 119,90 por R$ 107,91", com a linha "Acompanha o QA Pingente Estrela · 10% a menos" e "Falta 1 para cada peça sair a R$ 83,93". Subtotal R$ 379,80 · Desconto do Compre Junto −R$ 11,99 · Total R$ 367,81 | `screenshots/CH-06-r3-01-sacola-corrente-pelo-catalogo.png` |
| 03 | Checkout como convidada `rt3.ch06.1794078718810@exemplo.invalid`, CEP 90010-000 nº 100, Correios Frete padrão, PIX, CPF; **sem** marcar a oferta do checkout | botão "Pagar R$ 361,96 com PIX" | `screenshots/CH-06-r3-02-checkout-antes-de-pagar.png` |
| 04 | Pagou com PIX | `/pedido/aa150914-…/pagamento`: **#0385**, aguardando pagamento, R$ 361,96, "Não foi possível gerar o código agora" (Mercado Pago local com chave inválida — esperado) | `screenshots/CH-06-r3-03-pagamento-pedido-1.png` |
| 05 | No painel, entrou como admin e abriu o #0383 (Sonia Reteste, rt2.sonia…, Pendente/Pendente) | Berloque "Acompanha o QA Pingente Estrela", R$ 69,90 → R$ 66,41; Subtotal R$ 329,80 · CJ −R$ 3,49 · PIX −R$ 22,84 · Frete R$ 19,90 · Total R$ 323,37 | — |
| 06 | "Cancelar pedido" → motivo "QA WI 92 rodada 3 — massa M-07" → "Confirmar cancelamento" | diálogo avisa que não estorna nem repõe estoque e que nenhum e-mail sai ("Pedido cancelado" desligado). O #0383 passa a **Cancelado** | `screenshots/CH-06-r3-04-pedido-0383-cancelado.png` |
| 07 | Abriu o #0385 no painel para conferir a massa | Cartier R$ 119,90 → R$ 107,91 **sem** "Acompanha" (a marca não foi gravada, como M-07 pede). Subtotal R$ 379,80 · CJ −R$ 11,99 · PIX −R$ 25,75 · Frete R$ 19,90 · Total R$ 361,96 — fecha (367,81 × 7% = 25,75), igual à loja | `screenshots/CH-06-r3-05-pedido-0385-painel.png` |
| 08 | *(parte B, depois de a thread aprovar o #0385 por `apply_payment_approval`)* Abriu a Adesão, 30 dias (botão "30 dias" selecionado) | 4 pedidos com Compre Junto, "50% dos **8** pedidos pagos" · 6 peças · R$ 405,53 · Por joia: QA Pingente Estrela 4 · 6 · R$ 405,53 · desconto concedido R$ 113,87 · peça que mais sai QA Berloque Coração · Prata 925. Contra a rodada 2: o denominador subiu de 7 para 8 (o #0385 pago entrou como pedido pago) e as peças levadas junto **não** mudaram — a Cartier do #0385, posta pelo catálogo, não conta | `screenshots/CH-06-r3-06-adesao-30d-antes.png` |
| 09 | Abriu o #0365 (Helena QA, **Pago**, QA Berloque Coração "Acompanha o QA Pingente Estrela", R$ 69,90 → R$ 48,93) e cancelou pelo "Cancelar pedido", com motivo; o diálogo não tem opção de aviso e diz que nenhum e-mail sai | #0365 **Cancelado** | `screenshots/CH-06-r3-07-pedido-0365-cancelado.png` |
| 10 | Releu a Adesão, 30 dias | 3 pedidos, "43% dos 7 pedidos pagos" · 5 peças · R$ 356,60 · Por joia: QA Pingente Estrela 3 · 5 · R$ 356,60 · desconto concedido R$ 92,90. Fecha: perdeu exatamente o #0365 — 1 pedido, 1 peça, R$ 48,93 (405,53 − 48,93 = 356,60) e R$ 20,97 de desconto (69,90 − 48,93; 113,87 − 20,97 = 92,90); o denominador voltou a 7 | `screenshots/CH-06-r3-08-adesao-30d-depois.png` |
| 11 | Tentou sair pelo menu "Conta e saída" | o botão não foi encontrado pelo nome em 1440 (a r2 saiu por ele); a ação estourou o tempo. Fechei o browser (perfil do MCP em memória) | — |

**Edge cases tentados:** nenhum (rodada de confirmação; a parte A só produz massa).

Observação, não achado: a sacola escreve "Acompanha o QA Pingente Estrela · 10% a menos" na corrente posta pelo
catálogo, enquanto o pedido gravado não leva a marca. A frase da sacola explica o desconto; a marca do pedido
é a do bloco. Fica registrado para quem ler a Adesão ao lado da sacola.

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-032 | pass | 01–10 | `screenshots/CH-06-r3-06-adesao-30d-antes.png`, `screenshots/CH-06-r3-08-adesao-30d-depois.png` | o #0385 pago (corrente pelo catálogo, com desconto, sem a marca) entra só no denominador de pedidos pagos, nunca nas peças levadas junto; a variação "pedido cancelado com a marca" (#0365, pago e cancelado) sai da Adesão inteira, com o valor e o desconto concedido descontados a centavo |

Contagem: pass 1 · fail 0 · blocked 0 · skip 0

## Achados

nada

## Spec-gaps

nada (rodada de confirmação)

## Fora da cobertura

- A variação com o #0383 (com a marca, cancelado **sem** ter sido pago) não discrimina nada: a Adesão não contaria um pendente de qualquer jeito. Quem prova a regra do cancelamento é o #0365, que estava pago.
- Os períodos de 7 e 90 dias não foram refeitos (rodada de confirmação; orçamento já excedido).
- A saída da conta pela tela não aconteceu (passo 11): o browser foi fechado com o perfil em memória.

## Debrief

- **Surpresas:** nenhuma de produto. O orçamento de 13 ações ficou curto: o checkout de convidada tem três etapas, e a variação do cancelamento pedia duas leituras da Adesão.
- **Próximo charter:** nada pendente no CH-06; o TC-FUNC-032 fecha.
- **Padrão novo:** nada.
- **Limpeza:** a sessão criou o #0385 (convidada `rt3.ch06.1794078718810@exemplo.invalid`; a thread o marcou como pago) e cancelou o #0383 e o #0365, os dois massa de QA de rodadas anteriores. A Adesão de 30 dias passa a mostrar 3 pedidos / 5 peças / R$ 356,60 — a próxima rodada deve partir desse número, não do da r2.
