# Sessão CH-01 · O número da loja e o funil batem com o que a cliente faz

| Campo       | Valor |
| ----------- | ----- |
| Charter     | `test-plans/charters/CH-01-numero-e-funil.md` · exploratório · P0 |
| Status      | done |
| Persona     | PER-01 Adri · conta: `admin-atelie` (credencial do arquivo de credenciais do QA local, nunca o valor) · clientes `anonima` em 3 contextos isolados |
| Tour · modo | Feature · por cenário (J-01 e J-02, passos 4–6) |
| Rodada      | exploração (segunda tentativa; a primeira ficou `blocked` por ambiente — loja em dev) |
| Orçamento   | ~70 ações de browser de 70 |
| Ambiente    | app http://localhost:8084 (dev) · loja http://localhost:8082 (build, `vite preview`) · build não exposto · Chromium headless (Playwright MCP) · viewports 390 × 844 e 320 × 568 |
| Paridade    | banco local com `production_host = localhost`; contextos da loja com `navigator.webdriver` neutralizado e UA de iPhone; `*.supabase.co` e `**/g/collect*` bloqueados (as imagens da Home e o GA abortam no console, esperado); navegação das clientes por URL direta (`goto`) em vez de toque, o que equivale a uma carga de página |

## Missão

Confirmar que, a cada coisa que a cliente faz na loja, a Adri vê no cartão do Início e na Loja ao vivo o mesmo
número de pessoas, e o funil dividindo essas pessoas sem contar ninguém duas vezes.

## Passos

| #  | A persona tentou | Viu | Evidência |
| -- | ---------------- | --- | --------- |
| 01 | (insumo da 1ª tentativa) abrir o Início e a Loja ao vivo sem nenhuma visita no dia | cartão: "Nenhuma visita registrada ainda. O contador só conta na loja em localhost.", sem número, sem "Ninguém na loja agora", sem mini gráfico; Loja ao vivo só com "Agora na loja" (mesma frase) e "Acessos" | `screenshots/CH-01-01-inicio-sem-visita.png` · `CH-01-02-ao-vivo-sem-visita.png` · `CH-01-03-inicio-320.png` |
| 04 | entrar no app e abrir o Início (390), antes de qualquer cliente | reproduziu o estado do passo 01: o cartão com "Nenhuma visita registrada ainda. O contador só conta na loja em localhost." e "Visitas, hoje, 0" na faixa | `screenshots/CH-01-04-inicio-sem-visita-r2.png` |
| 05 | cliente A (contexto c1) abre a Home, aceita cookies e abre a joia "Placa Afetiva Árvore da Vida com Cabelo"; a Adri espera no Início sem tocar | em ~60 s o cartão passou sozinho a "1 pessoa"; nome acessível "Agora na loja, 1 pessoa. Abrir loja ao vivo"; nenhuma linha do funil; 15 barras, a última dourada; ponto dourado sem animação; cartão 358 × 92 (largura inteira do conteúdo) | `screenshots/CH-01-05-inicio-1-pessoa.png` |
| 06 | toca no cartão | Loja ao vivo abre com os seis blocos (Agora na loja, O que estão fazendo, Joias sendo vistas agora, De onde vieram, No celular, Acessos); número 1 dourado sobre fundo escuro, "pessoa nos últimos 5 minutos"; 30 barras, a última dourada, legendas "30 min atrás" e "agora"; funil Olhando 1 · Sacola 0 · Checkout 0 · Compraram 0; barra de Olhando no trilho inteiro (324/324); sem nota de checkout; "Conta só quem aceitou cookies de estatística." no pé; sem rolagem lateral (scrollWidth 390) | `screenshots/CH-01-06-ao-vivo-1-olhando.png` |
| 07 | cliente A põe a joia na sacola e fecha a gaveta, fica na página da joia | depois da leitura: Olhando 0 · Com joia na sacola 1 · Checkout 0 | — |
| 08 | cliente B (c2) abre outra joia, aceita cookies, põe na sacola; a Adri volta ao Início por "Voltar" | Loja ao vivo: 2 "pessoas nos últimos 5 minutos", Sacola 2; Início: "Agora na loja, 2 pessoas", linha "2 com joias na sacola" | `screenshots/CH-01-07-inicio-2-sacola.png` |
| 09 | cliente A abre `/checkout` | cartão do Início: "2 pessoas", "1 com joia na sacola · 1 no checkout" | — |
| 10 | cliente C (c3) abre uma terceira joia e aceita cookies (sem sacola); a Adri toca no cartão | Loja ao vivo: 3 pessoas; Olhando 1 · Sacola 1 · Checkout 1 (soma 3); as três barras com 107 px de 324 (um terço); Compraram sem barra; a nota "Alguém está no checkout agora. Se a compra não fechar e o e-mail já tiver sido preenchido, a sacola fica em Carrinhos abandonados, no painel." literal, sem prazo nem exclamação | `screenshots/CH-01-08-ao-vivo-3-funil-nota.png` |
| 11 | cliente A volta pelo navegador do checkout para a joia (com sacola); cliente C abre `/pedido/<id>/pagamento` de um pedido pendente existente (#0280) | Olhando 0 · Sacola 2 · Checkout 1 · total 3; a nota continua (C no checkout) | — |
| 12 | cliente C abre `/pedido/<id>` (detalhe); cliente B recarrega a página da joia 5 vezes | Olhando 1 · Sacola 2 · Checkout 0 · total 3 (B continua uma pessoa só); a nota sumiu | `screenshots/CH-01-09-ao-vivo-sem-checkout.png` |
| 13 | volta ao Início pelo voltar do navegador; estreita para 320 × 568 | Início com o cartão "Agora na loja, 3 pessoas. Abrir loja ao vivo"; 288 de largura, 151,5 de altura, sem rolagem lateral (scrollWidth 320) | `screenshots/CH-01-10-inicio-320-3-pessoas.png` |
| 14 | toca na barra de agora do mini gráfico (dentro do cartão) | abre `/ao-vivo` | — |
| 15 | recarrega o Início e sai da conta | cartão já com "3 pessoas" na carga; "Sair" leva a `/login` | — |

**Edge cases tentados:**

- Recarregar a página da joia 5 vezes (cliente B): continua uma pessoa, total 3 — ok
- Voltar pelo navegador do checkout para a joia com sacola (cliente A): sai de "No checkout", entra em "Com joia na sacola" — ok
- Aceitar os cookies depois de já estar na joia (clientes B e C): passaram a contar sem trocar de rota — ok
- Abrir a Loja ao vivo pelo cartão e voltar pelo "Voltar" e pelo voltar do navegador — ok nos dois
- Viewport 320 × 568 no cartão do Início — ok, sem rolagem lateral
- Toque no mini gráfico abre a Loja ao vivo — ok

## Casos

| TC | Veredito | Passo | Evidência | Nota |
| -- | -------- | ----- | --------- | ---- |
| TC-SMOKE-001 | pass | 05–08 | `screenshots/CH-01-06-ao-vivo-1-olhando.png` | os seis blocos com presença; volta por "Voltar" ok. Variação 1440 não feita (orçamento) |
| TC-JOURNEY-001 | pass | 04–08 | `screenshots/CH-01-05-inicio-1-pessoa.png` · `CH-01-07-inicio-2-sacola.png` | passos 2–5 ok (1 pessoa sozinho em ~60 s; Loja ao vivo 1; barra de agora dourada à direita; 2 pessoas na tela e no cartão). Passo 1 não alcançado no estado pedido: antes da primeira cliente não havia visita no dia e o cartão mostrou a frase de "nenhuma visita" (ver Spec-gaps), não "Ninguém na loja agora" |
| TC-FUNC-001 | pass | 05, 07–09 | `screenshots/CH-01-05-inicio-1-pessoa.png` · `CH-01-07-inicio-2-sacola.png` | passos 1–4 ok; ponto parado. Passo 5 (todas saem, esperar 5 min) não feito — orçamento |
| TC-FUNC-002 | pass | 05, 13, 14 | `screenshots/CH-01-10-inicio-320-3-pessoas.png` | nomes acessíveis com 1 e 3 pessoas literais; largura inteira, altura ≥ 44; toque no gráfico abre `/ao-vivo`. Variação de teclado não feita |
| TC-FUNC-003 | pass | 06, 08 | `screenshots/CH-01-06-ao-vivo-1-olhando.png` | 1 dourado sobre escuro, 30 barras, legendas, última dourada; 2 e 3 "pessoas nos últimos 5 minutos". Passo 4 (sair e esperar 6 min) não feito — orçamento |
| TC-FUNC-004 | pass | 10–12 | `screenshots/CH-01-08-ao-vivo-3-funil-nota.png` | 1 + 1 + 1 = 3, barras de um terço; variação "volta do checkout" ok. Passo 5 não feito — orçamento |
| TC-FUNC-005 | pass | 09, 11, 12 | `screenshots/CH-01-09-ao-vivo-sem-checkout.png` | `/checkout` e `/pedido/<id>/pagamento` contam "No checkout"; `/pedido/<id>` sai dele. Passo 2 (pedido montado) `blocked` por massa: nenhum link `/pedido-montado#<token>` alcançável pela tela. O pedido usado no pagamento é de outra cliente (#0280) — a contagem foi pela rota, não pelo conteúdo da tela |
| TC-FUNC-006 | pass | 06, 10, 12 | `screenshots/CH-01-08-ao-vivo-3-funil-nota.png` | sem nota sem checkout; nota literal com alguém no checkout, sem prazo nem exclamação; some quando a cliente sai |
| TC-FUNC-007 | blocked | 06 | `screenshots/CH-01-06-ao-vivo-1-olhando.png` | massa: não há pedido pago nos últimos 30 min no banco local (Vendas hoje 0); "Compraram (últimos 30 min)" mostrou 0 e sem barra — parte visível conferida |
| TC-FUNC-008 | pass | 06 | `screenshots/CH-01-06-ao-vivo-1-olhando.png` | "Conta só quem aceitou cookies de estatística." presente, também na 1ª tentativa sem ninguém. Variação 200 % não feita |

Contagem: pass 9 · fail 0 · blocked 1 · skip 0

## Achados

nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta |
| ----------------------- | ------------ | --------------- |
| Com nenhuma visita registrada no dia, o cartão do Início diz "Nenhuma visita registrada ainda. O contador só conta na loja em localhost." — sem número, sem "Ninguém na loja agora" e sem o mini gráfico — e a Loja ao vivo mostra só "Agora na loja" (com a mesma frase) e "Acessos", sem os blocos B–E. Os TC (TC-JOURNEY-001 passo 1, TC-FUNC-001 passo 5, a variação de TC-FUNC-003) e o charter pedem "Ninguém na loja agora" com o gráfico visível; nenhuma fonte lida diz o que o cartão mostra quando o dia ainda não tem visita. A frase cita "localhost", o que em produção seria o domínio — mas a Adri lê um texto técnico de configuração no lugar do cartão. Reproduziu nas duas tentativas (2 de 2) | 01, 04 | mudança |
| Em `/pedido/<id>/pagamento` de um pedido que não é da cliente, a presença conta "No checkout" pela rota, mesmo que a tela mostre recusa ou outro conteúdo; nenhuma fonte define se o pagamento de um pedido alheio conta | 11 | polimento |

## Fora da cobertura

- Os estados de saída: "Ninguém na loja agora" depois que todas fecham a aba (TC-FUNC-001 passo 5, TC-FUNC-003 passo 4, TC-FUNC-004 passo 5) — pedem de 5 a 6 min de espera; não cabiam no orçamento de 70 ações (cada espera conta no máximo 30 s)
- Pedido montado (`/pedido-montado#<token>`, TC-FUNC-005 passo 2 e a variação "sacola + pedido montado") — massa: o link não é alcançável pela tela
- "Compraram" com pedido pago nos últimos 30 min (TC-FUNC-007) — massa ausente no banco local
- Navegar rápido por cinco páginas (variação de TC-JOURNEY-001) — orçamento
- Variações de 1440, teclado (TC-FUNC-002) e fonte 200 % (TC-FUNC-008) — orçamento
- Restaurar `store_settings.analytics.production_host` ao fim da rodada — é do orquestrador (a sessão não acessa o banco)

## Debrief

- **Surpresas:** os números bateram em todas as transições, inclusive com a cliente aceitando os cookies depois de já estar na joia; o atraso real ficou entre 20 e 60 s
- **Próximo charter:** uma sessão curta só para os estados de saída (todas fecham a aba, esperar 6 min) e para "Compraram" com massa semeada; e o pedido montado com um link gerado pelo painel
- **Padrão novo:** três contextos isolados com o mesmo preparo (UA, `webdriver`, bloqueios) por `browser_tabs` + `isolatedContext` deixam conduzir o funil inteiro numa sessão só
